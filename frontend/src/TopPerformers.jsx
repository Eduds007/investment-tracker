import { useEffect, useState } from 'react'
import axios from 'axios'

const CLASSE_LABELS = {
  SALDO: 'Saldo',
  RESERVA: 'Reserva',
  ETF: 'ETF',
  FII: 'FII',
  CRIPTO: 'Cripto',
  ACAO: 'Ações',
}

export default function TopPerformers({ refreshKey = 0 }) {
  const [melhores, setMelhores] = useState([])
  const [piores, setPiores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios.get('http://localhost:8000/api/posicoes/')
      .then(res => {
        const data = res.data || []
        // agrupa por ativo
        const byAtivo = new Map()
        data.forEach(item => {
          const ativo = (item.ativo || '').toString().trim()
          if (!ativo) return
          if (!byAtivo.has(ativo)) byAtivo.set(ativo, [])
          byAtivo.get(ativo).push(item)
        })

        const result = []
        byAtivo.forEach((list, ativo) => {
          const entries = list
            .map(item => ({ date: new Date(`${item.data}T00:00:00`), item }))
            .filter(entry => Number.isFinite(entry.date.getTime()))
            .sort((a, b) => a.date - b.date)

          if (entries.length < 2) return // sem histórico suficiente para calcular variação

          const newest = entries[entries.length - 1]
          const targetDate = new Date(newest.date)
          targetDate.setFullYear(targetDate.getFullYear() - 1)

          // Usa o registro mais próximo em/antes de 12 meses atrás; fallback para o mais antigo.
          let base = null
          entries.forEach(entry => {
            if (entry.date <= targetDate) base = entry
          })
          if (!base) base = entries[0]
          if (base === newest) return

          const firstVal = parseFloat(base.item.valor)
          const lastVal = parseFloat(newest.item.valor)
          if (!firstVal) return

          const variacao = ((lastVal - firstVal) / firstVal) * 100
          result.push({
            ativo,
            classe: newest.item.classe_ativo,
            valorAtual: lastVal,
            variacao,
          })
        })

        const ordenado = [...result].sort((a, b) => b.variacao - a.variacao)
        setMelhores(ordenado.slice(0, 5))
        setPiores(ordenado.slice(-5).reverse())
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Erro ao carregar ranking de ativos')
        setLoading(false)
      })
  }, [refreshKey])

  const fmtPct = (n) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
  const fmtMoeda = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (loading) return <div className="p-4 bg-black text-white rounded-lg border border-gray-800">Carregando ranking...</div>
  if (error) return <div className="p-4 bg-black text-red-400 rounded-lg border border-gray-800">{error}</div>

  const Lista = ({ titulo, itens }) => (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-200">{titulo}</h3>
      {itens.length ? (
        <ol className="space-y-2">
          {itens.map((item, idx) => (
            <li
              key={item.ativo}
              className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-center text-xs font-bold text-gray-500">{idx + 1}</span>
                <div>
                  <p className="font-medium text-white">{item.ativo}</p>
                  <p className="text-xs text-gray-500">
                    {CLASSE_LABELS[item.classe] || item.classe} · {fmtMoeda(item.valorAtual)}
                  </p>
                </div>
              </div>
              <span className={`font-semibold ${item.variacao >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {item.variacao >= 0 ? '+' : ''}{fmtPct(item.variacao)}%
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-gray-500">Sem dados suficientes.</p>
      )}
    </div>
  )

  return (
    <div className="bg-black text-white p-4 rounded-lg border border-gray-800">
      <h2 className="text-xl font-semibold mb-1">Top 5 melhores e piores ativos</h2>
      <p className="mb-4 text-sm text-gray-400">Variação do valor de cada ativo (12m x último registro)</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Lista titulo="🏆 Melhores" itens={melhores} />
        <Lista titulo="📉 Piores" itens={piores} />
      </div>
    </div>
  )
}

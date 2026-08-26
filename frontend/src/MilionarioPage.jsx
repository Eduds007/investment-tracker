import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Line } from 'react-chartjs-2'

const META_MILHAO = 1000000
const MAX_MESES_SIMULACAO = 1200 // 100 anos

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// Reconstrói o total de patrimônio ao final de cada mês, "carregando" o último
// valor conhecido de cada ativo (nem todo ativo é atualizado todo mês).
function buildMonthlyTotals(posicoes, monthsBack) {
  const byAtivo = new Map()
  posicoes.forEach((p) => {
    const valor = Number(p.valor)
    if (!p.data || Number.isNaN(valor)) return
    const list = byAtivo.get(p.ativo) || []
    list.push({ data: p.data, valor })
    byAtivo.set(p.ativo, list)
  })
  byAtivo.forEach((list) => list.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0)))

  const hoje = new Date()
  const meses = []
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    meses.push(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1))
  }

  return meses.map((mesRef) => {
    const cutoff = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0)
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    let total = 0
    byAtivo.forEach((list) => {
      let valor = null
      for (const item of list) {
        if (item.data <= cutoffStr) valor = item.valor
        else break
      }
      if (valor !== null) total += valor
    })

    return {
      key: monthKey(mesRef),
      label: mesRef.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      total,
    }
  })
}

function simularProjecao(patrimonioAtual, aporteMensal, rendimentoMensal) {
  if (patrimonioAtual >= META_MILHAO) {
    return { status: 'ja_milionario' }
  }

  const taxaMensal = patrimonioAtual > 0 ? rendimentoMensal / patrimonioAtual : 0

  if (aporteMensal <= 0 && taxaMensal <= 0) {
    return { status: 'impossivel' }
  }

  let saldo = patrimonioAtual
  let meses = 0
  const pontos = [{ meses: 0, saldo }]
  const passoAmostragem = Math.max(1, Math.round(MAX_MESES_SIMULACAO / 60))

  while (saldo < META_MILHAO && meses < MAX_MESES_SIMULACAO) {
    saldo = saldo * (1 + taxaMensal) + aporteMensal
    meses += 1
    if (meses % passoAmostragem === 0 || saldo >= META_MILHAO) {
      pontos.push({ meses, saldo })
    }
  }

  if (saldo < META_MILHAO) {
    return { status: 'limite_excedido' }
  }

  return { status: 'ok', meses, taxaMensal, pontos }
}

export default function MilionarioPage({ refreshKey = 0 }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [patrimonioAtual, setPatrimonioAtual] = useState(0)
  const [aporteMedio, setAporteMedio] = useState(0)
  const [rendimentoMedio, setRendimentoMedio] = useState(0)
  const [detalheMensal, setDetalheMensal] = useState([])

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
    []
  )

  useEffect(() => {
    setLoading(true)
    setError('')

    Promise.all([
      axios.get('http://localhost:8000/api/posicoes/'),
      axios.get('http://localhost:8000/api/dividendos/'),
    ])
      .then(([posRes, divRes]) => {
        const posicoes = posRes.data || []
        const dividendos = divRes.data || []

        if (!posicoes.length) {
          setError('Nenhuma posição registrada ainda. Registre suas posições para calcular a projeção.')
          setLoading(false)
          return
        }

        const meses = buildMonthlyTotals(posicoes, 13)
        const patrimonioAtualCalc = meses[meses.length - 1]?.total || 0

        const dividendosPorMes = {}
        dividendos.forEach((d) => {
          if (!d.data) return
          const dt = new Date(`${d.data}T00:00:00`)
          const chave = monthKey(dt)
          dividendosPorMes[chave] = (dividendosPorMes[chave] || 0) + Number(d.valor)
        })

        const deltas = []
        for (let i = 1; i < meses.length; i += 1) {
          const delta = meses[i].total - meses[i - 1].total
          const divMes = dividendosPorMes[meses[i].key] || 0
          deltas.push({
            key: meses[i].key,
            label: meses[i].label,
            delta,
            rendimento: divMes,
            aporte: delta - divMes,
          })
        }

        const aporteMedioCalc = deltas.length
          ? deltas.reduce((sum, d) => sum + d.aporte, 0) / deltas.length
          : 0
        const rendimentoMedioCalc = deltas.length
          ? deltas.reduce((sum, d) => sum + d.rendimento, 0) / deltas.length
          : 0

        setPatrimonioAtual(patrimonioAtualCalc)
        setAporteMedio(aporteMedioCalc)
        setRendimentoMedio(rendimentoMedioCalc)
        setDetalheMensal(deltas)
        setLoading(false)
      })
      .catch(() => {
        setError('Erro ao carregar dados para o cálculo.')
        setLoading(false)
      })
  }, [refreshKey])

  const projecao = useMemo(
    () => simularProjecao(patrimonioAtual, aporteMedio, rendimentoMedio),
    [patrimonioAtual, aporteMedio, rendimentoMedio]
  )

  const taxaMensalPct = patrimonioAtual > 0 ? (rendimentoMedio / patrimonioAtual) * 100 : 0

  const anos = projecao.status === 'ok' ? Math.floor(projecao.meses / 12) : 0
  const mesesResto = projecao.status === 'ok' ? projecao.meses % 12 : 0
  const dataAlvo =
    projecao.status === 'ok'
      ? new Date(new Date().getFullYear(), new Date().getMonth() + projecao.meses, 1).toLocaleDateString('pt-BR', {
          month: 'long',
          year: 'numeric',
        })
      : null

  const chartData =
    projecao.status === 'ok'
      ? {
          labels: projecao.pontos.map((p) => `${(p.meses / 12).toFixed(1)}a`),
          datasets: [
            {
              label: 'Patrimônio projetado',
              data: projecao.pontos.map((p) => p.saldo),
              borderColor: '#22c55e',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.2,
              fill: true,
            },
            {
              label: 'Meta (R$ 1.000.000)',
              data: projecao.pontos.map(() => META_MILHAO),
              borderColor: '#f59e0b',
              borderDash: [6, 6],
              borderWidth: 1.5,
              pointRadius: 0,
              fill: false,
            },
          ],
        }
      : null

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#d1d5db' } },
      tooltip: {
        callbacks: {
          label: (context) => ` ${currencyFormatter.format(context.parsed.y || 0)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: { color: '#374151' },
        ticks: { color: '#d1d5db', callback: (value) => currencyFormatter.format(Number(value)) },
      },
      x: {
        grid: { color: '#374151' },
        ticks: { color: '#d1d5db' },
      },
    },
  }

  if (loading) return <div className="p-4 text-white">Carregando dados...</div>
  if (error) return <div className="p-4 text-red-400">{error}</div>

  return (
    <div className="w-full space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-800 bg-black p-4">
          <p className="text-sm text-gray-400">Patrimônio atual</p>
          <p className="mt-2 text-2xl font-bold text-white">{currencyFormatter.format(patrimonioAtual)}</p>
        </div>

        <div className="rounded-lg border border-gray-800 bg-black p-4">
          <p className="text-sm text-gray-400">Aporte médio mensal (12m)</p>
          <p className={`mt-2 text-2xl font-bold ${aporteMedio >= 0 ? 'text-sky-400' : 'text-red-400'}`}>
            {currencyFormatter.format(aporteMedio)}
          </p>
          <p className="mt-1 text-xs text-gray-500">Variação de patrimônio no mês menos os dividendos recebidos</p>
        </div>

        <div className="rounded-lg border border-gray-800 bg-black p-4">
          <p className="text-sm text-gray-400">Rendimento médio mensal (12m)</p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{currencyFormatter.format(rendimentoMedio)}</p>
          <p className="mt-1 text-xs text-gray-500">≈ {taxaMensalPct.toFixed(2)}% ao mês sobre o patrimônio atual</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-black p-6 text-center">
        {projecao.status === 'ja_milionario' && (
          <>
            <p className="text-lg text-gray-300">🎉</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">Você já é milionário!</p>
            <p className="mt-1 text-sm text-gray-400">
              Seu patrimônio atual de {currencyFormatter.format(patrimonioAtual)} já ultrapassa a meta de{' '}
              {currencyFormatter.format(META_MILHAO)}.
            </p>
          </>
        )}

        {projecao.status === 'impossivel' && (
          <>
            <p className="text-3xl font-bold text-red-400">Nesse ritmo, não dá para prever</p>
            <p className="mt-2 text-sm text-gray-400">
              Nos últimos 12 meses o aporte médio e o rendimento médio ficaram próximos de zero ou negativos.
              Aumente seus aportes ou rendimentos para gerar uma projeção.
            </p>
          </>
        )}

        {projecao.status === 'limite_excedido' && (
          <>
            <p className="text-3xl font-bold text-yellow-400">Mais de 100 anos</p>
            <p className="mt-2 text-sm text-gray-400">
              No ritmo atual de aportes e rendimentos, você não atingiria R$ 1.000.000 em menos de um século.
            </p>
          </>
        )}

        {projecao.status === 'ok' && (
          <>
            <p className="text-sm text-gray-400">Faltam</p>
            <p className="mt-1 text-4xl font-bold text-white">
              {anos} {anos === 1 ? 'ano' : 'anos'}
              {mesesResto > 0 ? ` e ${mesesResto} ${mesesResto === 1 ? 'mês' : 'meses'}` : ''}
            </p>
            <p className="mt-2 text-sm text-gray-400">para você se tornar milionário (previsão: {dataAlvo})</p>
          </>
        )}
      </div>

      {chartData && (
        <div className="rounded-lg border border-gray-800 bg-black p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Projeção de patrimônio</h2>
            <p className="mt-1 text-sm text-gray-400">
              Simulação mês a mês aplicando o rendimento médio como taxa sobre o saldo e somando o aporte médio,
              até atingir R$ 1.000.000.
            </p>
          </div>
          <div className="h-[380px] w-full">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {detalheMensal.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-black p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Detalhamento dos últimos 12 meses</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="min-w-full divide-y divide-gray-800 text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-2 text-left">Mês</th>
                  <th className="px-4 py-2 text-right">Variação de patrimônio</th>
                  <th className="px-4 py-2 text-right">Dividendos (rendimento)</th>
                  <th className="px-4 py-2 text-right">Aporte estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-black">
                {detalheMensal.map((d) => (
                  <tr key={d.key} className="hover:bg-gray-900/50">
                    <td className="px-4 py-2 text-gray-300">{d.label}</td>
                    <td className={`px-4 py-2 text-right ${d.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {currencyFormatter.format(d.delta)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300">{currencyFormatter.format(d.rendimento)}</td>
                    <td className={`px-4 py-2 text-right ${d.aporte >= 0 ? 'text-sky-400' : 'text-red-400'}`}>
                      {currencyFormatter.format(d.aporte)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

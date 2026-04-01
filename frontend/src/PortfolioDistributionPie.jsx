import { useEffect, useState } from 'react'
import { Pie } from 'react-chartjs-2'
import axios from 'axios'

const LABELS = {
  SALDO: 'Saldo',
  RESERVA: 'Reserva',
  ETF: 'ETF',
  FII: 'FII',
  CRIPTO: 'Cripto',
  ACAO: 'Ações',
}

const COLORS = {
  SALDO: '#60a5fa',
  RESERVA: '#f59e0b',
  ETF: '#a78bfa',
  FII: '#34d399',
  CRIPTO: '#fb7185',
  ACAO: '#38bdf8',
}

export default function PortfolioDistributionPie() {
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    axios
      .get('http://localhost:8000/api/posicoes/')
      .then((res) => {
        const posicoes = res.data || []
        const latestByAtivo = new Map()

        posicoes.forEach((pos) => {
          const ativo = pos.ativo || 'Sem ativo'
          const dataAtual = new Date(`${pos.data}T00:00:00`)
          const current = latestByAtivo.get(ativo)

          if (!current || dataAtual > current.data) {
            latestByAtivo.set(ativo, {
              data: dataAtual,
              classe: pos.classe_ativo || 'OUTROS',
              valor: Number(pos.valor),
            })
          }
        })

        const totalsByClasse = new Map()
        latestByAtivo.forEach((item) => {
          const classe = item.classe || 'OUTROS'
          totalsByClasse.set(classe, (totalsByClasse.get(classe) || 0) + item.valor)
        })

        const entries = Array.from(totalsByClasse.entries())
          .map(([classe, total]) => ({
            classe,
            label: LABELS[classe] || classe,
            total,
            color: COLORS[classe] || '#94a3b8',
          }))
          .sort((a, b) => b.total - a.total)

        setChartData({
          labels: entries.map((item) => item.label),
          datasets: [
            {
              data: entries.map((item) => item.total),
              backgroundColor: entries.map((item) => item.color),
              borderColor: '#111827',
              borderWidth: 2,
            },
          ],
        })
      })
      .catch(() => {
        setError('Erro ao carregar a distribuição da carteira.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#d1d5db',
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = Number(context.raw || 0)
            const total = context.dataset.data.reduce((sum, item) => sum + Number(item || 0), 0)
            const percent = total > 0 ? (value / total) * 100 : 0
            return `${context.label}: R$ ${value.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} (${percent.toFixed(1)}%)`
          },
        },
      },
    },
  }

  if (loading) return <div className="p-4 text-white">Carregando distribuição da carteira...</div>
  if (error) return <div className="p-4 text-red-400">{error}</div>

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-800 bg-black p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Distribuição da carteira por classe</h2>
        <p className="mt-1 text-sm text-gray-400">
          Considera a última posição registrada de cada ativo para montar a fatia de cada classe.
        </p>
      </div>

      <div className="min-h-[20rem] flex-1 w-full">
        {chartData ? <Pie data={chartData} options={options} /> : null}
      </div>
    </div>
  )
}
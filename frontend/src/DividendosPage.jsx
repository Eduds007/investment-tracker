import { useEffect, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import axios from 'axios'
import DividendoModal from './DividendoModal'

export default function DividendosPage() {
  const [chartData, setChartData] = useState(null)
  const [yieldChartData, setYieldChartData] = useState(null)
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const handleDividendoCreated = () => {
    setRefreshKey((prev) => prev + 1)
  }

  useEffect(() => {
    setLoading(true)
    setError('')

    Promise.all([
      axios.get('http://localhost:8000/api/dividendos/'),
      axios.get('http://localhost:8000/api/posicoes/'),
    ])
      .then(([divRes, posRes]) => {
        const dividendos = divRes.data || []
        const posicoes = posRes.data || []
        const totalsByAtivo = new Map()
        const dividendosPorAtivo = new Set()
        const posicoesPorAtivo = new Map()

        // Pegar data atual e contar 12 meses para trás
        const today = new Date()
        const months = []
        for (let i = 11; i >= 0; i--) {
          const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
          months.push({
            year: date.getFullYear(),
            month: date.getMonth(),
            label: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
            total: 0,
          })
        }

        posicoes
          .filter((pos) => pos.classe_ativo === 'ACAO')
          .forEach((pos) => {
            const ativoNome = pos.ativo || 'Sem ativo'
            if (!posicoesPorAtivo.has(ativoNome)) {
              posicoesPorAtivo.set(ativoNome, [])
            }

            posicoesPorAtivo.get(ativoNome).push({
              data: new Date(`${pos.data}T00:00:00`),
              valor: Number(pos.valor),
            })
          })

        posicoesPorAtivo.forEach((items) => {
          items.sort((a, b) => a.data - b.data)
        })

        // Agrupar dividendos por mês
        dividendos.forEach((div) => {
          const divDate = new Date(`${div.data}T00:00:00`)
          const ativoNome = div.ativo || 'Sem ativo'
          const valor = Number(div.valor)
          dividendosPorAtivo.add(ativoNome)

          const currentAtivo = totalsByAtivo.get(ativoNome) || {
            ativo: ativoNome,
            total: 0,
            quantidade: 0,
          }

          currentAtivo.total += valor
          currentAtivo.quantidade += 1
          totalsByAtivo.set(ativoNome, currentAtivo)

          const found = months.find(
            (m) => m.year === divDate.getFullYear() && m.month === divDate.getMonth()
          )
          if (found) {
            found.total += valor
          }
        })

        const rankingData = Array.from(totalsByAtivo.values())
          .map((item) => ({
            ...item,
            media: item.quantidade > 0 ? item.total / item.quantidade : 0,
          }))
          .sort((a, b) => b.total - a.total)

        const yieldData = months.map((month) => {
          const monthEnd = new Date(month.year, month.month + 1, 1)
          const windowStart = new Date(month.year, month.month - 11, 1)

          const dividendosJanela = dividendos.filter((div) => {
            const divDate = new Date(`${div.data}T00:00:00`)
            return divDate >= windowStart && divDate < monthEnd
          })

          const totalDividendosJanela = dividendosJanela.reduce(
            (sum, div) => sum + Number(div.valor),
            0
          )

          let patrimonioAcoesDividendadoras = 0
          dividendosPorAtivo.forEach((ativoNome) => {
            const historico = posicoesPorAtivo.get(ativoNome) || []
            const posicaoMaisRecente = [...historico]
              .reverse()
              .find((item) => item.data < monthEnd)

            if (posicaoMaisRecente) {
              patrimonioAcoesDividendadoras += posicaoMaisRecente.valor
            }
          })

          return {
            label: month.label,
            yield: patrimonioAcoesDividendadoras > 0
              ? (totalDividendosJanela / patrimonioAcoesDividendadoras) * 100
              : 0,
          }
        })

        // Média móvel de 12 meses considerando apenas os meses já existentes até cada ponto
        const movingAverage12m = months.map((_, idx) => {
          const start = Math.max(0, idx - 11)
          const window = months.slice(start, idx + 1)
          const total = window.reduce((sum, m) => sum + m.total, 0)
          return total / window.length
        })

        setChartData({
          labels: months.map((m) => m.label),
          datasets: [
            {
              type: 'line',
              label: 'Média móvel 12m',
              data: movingAverage12m,
              borderColor: '#f59e0b',
              backgroundColor: '#f59e0b',
              borderWidth: 2,
              pointRadius: 2,
              tension: 0.25,
              yAxisID: 'y',
            },
            {
              type: 'bar',
              label: 'Dividendos (R$)',
              data: months.map((m) => m.total),
              backgroundColor: '#10b981',
              borderColor: '#059669',
              borderWidth: 1,
            },
            
          ],
        })
        setYieldChartData({
          labels: yieldData.map((item) => item.label),
          datasets: [
            {
              label: 'Dividend Yield geral da carteira (%)',
              data: yieldData.map((item) => item.yield),
              borderColor: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              borderWidth: 2,
              pointRadius: 3,
              tension: 0.3,
              fill: true,
            },
          ],
        })
        setRanking(rankingData)
      })
      .catch(() => {
        setError('Erro ao carregar dividendos.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [refreshKey])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#d1d5db',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#d1d5db',
          callback: (value) => `R$ ${value.toLocaleString('pt-BR')}`,
        },
      },
      x: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#d1d5db',
        },
      },
    },
  }

  const yieldChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#d1d5db',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#d1d5db',
          callback: (value) => `${Number(value).toFixed(2)}%`,
        },
      },
      x: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#d1d5db',
        },
      },
    },
  }

  const topRanking = ranking.slice(0, 10)

  if (loading) return <div className="p-4 text-white">Carregando dividendos...</div>
  if (error) return <div className="p-4 text-red-400">{error}</div>

  return (
    <div className="w-full">
      <div className="mb-8 flex justify-end">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Novo dividendo
        </button>
      </div>

      <div className="rounded-lg border border-gray-800 bg-black p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">Dividendos - Últimos 12 meses</h2>
          <p className="mt-1 text-sm text-gray-400">
            Histórico consolidado dos pagamentos recebidos ao longo do tempo.
          </p>
        </div>

        <div className="h-96 w-full">
          {chartData ? <Bar data={chartData} options={chartOptions} /> : null}
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-gray-800 bg-black p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">Dividend Yield geral da carteira</h2>
          <p className="mt-1 text-sm text-gray-400">
            Média móvel de 12 meses calculada pela soma dos dividendos distribuídos no período sobre o valor patrimonial das ações que pagaram dividendos.
          </p>
        </div>

        <div className="h-96 w-full">
          {yieldChartData ? <Line data={yieldChartData} options={yieldChartOptions} /> : null}
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-gray-800 bg-black p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Ranking de dividendos por ação</h2>
            <p className="mt-1 text-sm text-gray-400">
              Ações que mais distribuíram dividendos no histórico disponível.
            </p>
          </div>
          <div className="text-sm text-gray-400">
            {ranking.length} ativo{ranking.length === 1 ? '' : 's'} com pagamentos registrados
          </div>
        </div>

        {topRanking.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-800">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-950">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Posição
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Ação
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Total recebido
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Pagamentos
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Média por pagamento
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-black">
                {topRanking.map((item, index) => (
                  <tr key={item.ativo} className="hover:bg-gray-950/60">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-200">#{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{item.ativo}</td>
                    <td className="px-4 py-3 text-right text-sm text-emerald-400">
                      {currencyFormatter.format(item.total)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-200">{item.quantidade}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">
                      {currencyFormatter.format(item.media)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-700 px-4 py-8 text-center text-sm text-gray-400">
            Nenhum dividendo registrado ainda para montar o ranking.
          </div>
        )}
      </div>

      <DividendoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleDividendoCreated}
      />
    </div>
  )
}

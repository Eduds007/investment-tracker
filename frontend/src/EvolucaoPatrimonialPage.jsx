import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Line } from 'react-chartjs-2'

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
  OUTROS: '#94a3b8',
}

export default function EvolucaoPatrimonialPage({ refreshKey = 0 }) {
  const [series, setSeries] = useState([])
  const [allocation, setAllocation] = useState([])
  const [allocationDate, setAllocationDate] = useState('')
  const [detalhesPorClasse, setDetalhesPorClasse] = useState({})
  const [selectedClasse, setSelectedClasse] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
    []
  )

  useEffect(() => {
    setLoading(true)
    setError('')

    axios
      .get('http://localhost:8000/api/posicoes/')
      .then((res) => {
        const posicoes = res.data || []
        const totalsByDate = new Map()
        const latestByAtivo = new Map()

        posicoes.forEach((pos) => {
          const rawDate = pos.data
          const value = Number(pos.valor)
          if (!rawDate || Number.isNaN(value)) return

          totalsByDate.set(rawDate, (totalsByDate.get(rawDate) || 0) + value)

          const ativo = pos.ativo || 'Sem ativo'
          const posDate = new Date(`${rawDate}T00:00:00`)
          const current = latestByAtivo.get(ativo)

          if (!current || posDate > current.data) {
            latestByAtivo.set(ativo, {
              ativo,
              data: posDate,
              rawDate,
              classe: pos.classe_ativo || 'OUTROS',
              valor: value,
            })
          }
        })

        const parsed = Array.from(totalsByDate.entries())
          .map(([rawDate, total]) => {
            const parsedDate = new Date(`${rawDate}T00:00:00`)
            return {
              rawDate,
              total,
              parsedDate,
              label: parsedDate.toLocaleDateString('pt-BR', {
                month: 'short',
                year: '2-digit',
              }),
            }
          })
          .sort((a, b) => a.parsedDate - b.parsedDate)

        const totalsByClasse = new Map()
        const detailsByClasse = {}
        let latestRawDate = ''

        latestByAtivo.forEach((item) => {
          const classe = item.classe || 'OUTROS'
          totalsByClasse.set(classe, (totalsByClasse.get(classe) || 0) + item.valor)

          if (!detailsByClasse[classe]) {
            detailsByClasse[classe] = []
          }

          detailsByClasse[classe].push({
            ativo: item.ativo,
            valor: item.valor,
          })

          if (!latestRawDate || item.rawDate > latestRawDate) {
            latestRawDate = item.rawDate
          }
        })

        const totalAllocation = Array.from(totalsByClasse.values()).reduce((sum, value) => sum + value, 0)
        const allocationEntries = Array.from(totalsByClasse.entries())
          .map(([classe, total]) => ({
            classe,
            label: LABELS[classe] || classe,
            total,
            percent: totalAllocation > 0 ? (total / totalAllocation) * 100 : 0,
            color: COLORS[classe] || COLORS.OUTROS,
          }))
          .sort((a, b) => b.total - a.total)

        Object.keys(detailsByClasse).forEach((classe) => {
          detailsByClasse[classe].sort((a, b) => b.valor - a.valor)
        })

        setSeries(parsed)
        setAllocation(allocationEntries)
        setAllocationDate(latestRawDate)
        setDetalhesPorClasse(detailsByClasse)
        setSelectedClasse((prev) => prev || allocationEntries[0]?.classe || '')
      })
      .catch(() => {
        setError('Erro ao carregar evolução patrimonial.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [refreshKey])

  const first = series[0]
  const last = series[series.length - 1]
  const variacaoAbsoluta = first && last ? last.total - first.total : 0
  const variacaoPercentual = first && first.total !== 0 ? (variacaoAbsoluta / first.total) * 100 : 0
  const allocationDateLabel = allocationDate
    ? new Date(`${allocationDate}T00:00:00`).toLocaleDateString('pt-BR')
    : '--'
  const detalhesSelecionados = selectedClasse ? detalhesPorClasse[selectedClasse] || [] : []
  const totalClasseSelecionada = detalhesSelecionados.reduce((sum, item) => sum + item.valor, 0)

  const chartData = {
    labels: series.map((item) => item.label),
    datasets: [
      {
        label: 'Patrimônio total',
        data: series.map((item) => item.total),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.22,
        fill: true,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#d1d5db',
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${currencyFormatter.format(context.parsed.y || 0)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#d1d5db',
          callback: (value) => currencyFormatter.format(Number(value)),
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

  if (loading) return <div className="p-4 text-white">Carregando evolução patrimonial...</div>
  if (error) return <div className="p-4 text-red-400">{error}</div>

  return (
    <div className="w-full space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-800 bg-black p-4">
          <p className="text-sm text-gray-400">Patrimônio atual</p>
          <p className="mt-2 text-2xl font-bold text-white">{currencyFormatter.format(last?.total || 0)}</p>
        </div>

        <div className="rounded-lg border border-gray-800 bg-black p-4">
          <p className="text-sm text-gray-400">Início do histórico</p>
          <p className="mt-2 text-2xl font-bold text-white">{currencyFormatter.format(first?.total || 0)}</p>
        </div>

        <div className="rounded-lg border border-gray-800 bg-black p-4">
          <p className="text-sm text-gray-400">Variação no período</p>
          <p className={`mt-2 text-2xl font-bold ${variacaoAbsoluta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {currencyFormatter.format(variacaoAbsoluta)}
          </p>
          <p className="mt-1 text-sm text-gray-400">{variacaoPercentual.toFixed(2)}%</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-gray-800 bg-black p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Evolução patrimonial</h2>
            <p className="mt-1 text-sm text-gray-400">
              Soma de todos os ativos da carteira em cada data registrada no histórico de posições.
            </p>
          </div>

          <div className="h-[420px] w-full">{series.length ? <Line data={chartData} options={chartOptions} /> : null}</div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-black p-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Janela de posições por área</h2>
              <p className="mt-1 text-sm text-gray-400">
                Alocação atual de valor por classe de ativo, com base na última posição registrada de cada ativo.
              </p>
            </div>
            <p className="text-sm text-gray-400">Base em: {allocationDateLabel}</p>
          </div>

          <div className="space-y-4">
            {allocation.map((item) => (
              <div key={item.classe} className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-white">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{currencyFormatter.format(item.total)}</p>
                    <p className="text-xs text-gray-400">{item.percent.toFixed(2)}%</p>
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}

            {!allocation.length ? (
              <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4 text-sm text-gray-400">
                Nenhum dado de posição disponível para calcular a alocação por área.
              </div>
            ) : null}
          </div>
        </div>
      </div>

        {allocation.length ? (
          <div className="rounded-lg border border-gray-800 bg-black p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm text-gray-400">Detalhamento por área</p>
                <h3 className="text-lg font-semibold text-white">Ver o que há em cada área</h3>
              </div>

              <div className="w-full sm:w-72">
                <label htmlFor="classe-select" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Área
                </label>
                <select
                  id="classe-select"
                  value={selectedClasse}
                  onChange={(event) => setSelectedClasse(event.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  {allocation.map((item) => (
                    <option key={item.classe} value={item.classe}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {detalhesSelecionados.map((item) => {
                const pctClasse = totalClasseSelecionada > 0 ? (item.valor / totalClasseSelecionada) * 100 : 0
                return (
                  <div key={`${selectedClasse}-${item.ativo}`} className="rounded-md border border-gray-800 bg-gray-950/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-white">{item.ativo}</span>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{currencyFormatter.format(item.valor)}</p>
                        <p className="text-xs text-gray-400">{pctClasse.toFixed(2)}% da área</p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {!detalhesSelecionados.length ? (
                <div className="rounded-md border border-gray-800 bg-gray-950/60 p-3 text-sm text-gray-400">
                  Não há ativos nesta área para a data-base selecionada.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
    </div>
  )
}
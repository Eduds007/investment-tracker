import { useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import axios from 'axios'
import IndiceModal from './IndiceModal'

const COMPOSITE_PARTS = [
  { key: 'reserva', label: 'Reserva de emergência', source: 'INFLACAO' },
  { key: 'cripto', label: 'Cripto', source: 'BTC' },
  { key: 'internacional', label: 'Internacional', source: 'SP500' },
  { key: 'acoes', label: 'Ações', source: 'BOVESPA' },
  { key: 'fii', label: 'FII', source: 'IFIX' },
]

const DEFAULT_WEIGHTS = {
  reserva: 30,
  cripto: 5,
  internacional: 20,
  acoes: 20,
  fii: 25,
}

export default function IndicesPage() {
  const [indicesData, setIndicesData] = useState([])
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleIndiceCreated = () => {
    setRefreshKey((prev) => prev + 1)
  }

  useEffect(() => {
    setLoading(true)
    setError('')

    axios
      .get('http://localhost:8000/api/indices/')
      .then((res) => {
        const data = res.data || []

        // Agrupar por nome do índice
        const byIndice = new Map()
        data.forEach((item) => {
          const indice = (item.nome || '').toString().trim()
          if (!indice) return
          if (!byIndice.has(indice)) byIndice.set(indice, [])
          byIndice.get(indice).push(item)
        })

        // Preparar dados para gráficos
        const result = []
        byIndice.forEach((list, indice) => {
          // Ordenar por data
          const sorted = [...list].sort((a, b) => new Date(a.data) - new Date(b.data))
          result.push({
            nome: indice,
            dados: sorted,
          })
        })

        result.sort((a, b) => a.nome.localeCompare(b.nome))
        setIndicesData(result)
      })
      .catch(() => {
        setError('Erro ao carregar índices.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [refreshKey])

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(`${dateStr}T00:00:00`)
    return date.toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit' })
  }

  const formatNumber = (value) => {
    const num = Number(value || 0)
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const handleWeightChange = (key, value) => {
    const parsed = Number(value)
    const safeValue = Number.isFinite(parsed) ? Math.max(0, parsed) : 0
    setWeights((prev) => ({ ...prev, [key]: safeValue }))
  }

  const totalWeight = useMemo(
    () => COMPOSITE_PARTS.reduce((sum, part) => sum + Number(weights[part.key] || 0), 0),
    [weights]
  )

  const composite = useMemo(() => {
    if (!indicesData.length) return null

    const seriesByName = new Map(indicesData.map((entry) => [entry.nome.toUpperCase(), entry.dados]))

    const sourceSeries = {}
    for (const part of COMPOSITE_PARTS) {
      const list = seriesByName.get(part.source) || []
      if (!list.length) return null
      sourceSeries[part.source] = list
    }

    const dateSets = COMPOSITE_PARTS.map((part) => {
      const list = sourceSeries[part.source]
      return new Set(list.map((item) => item.data))
    })

    const commonDates = [...dateSets[0]].filter((date) => dateSets.every((set) => set.has(date))).sort(
      (a, b) => new Date(a) - new Date(b)
    )

    if (!commonDates.length) return null

    const valueLookup = {}
    COMPOSITE_PARTS.forEach((part) => {
      valueLookup[part.source] = new Map(
        sourceSeries[part.source].map((item) => [item.data, Number(item.valor)])
      )
    })

    const baseValues = {}
    COMPOSITE_PARTS.forEach((part) => {
      baseValues[part.source] = Number(valueLookup[part.source].get(commonDates[0]) || 0)
    })

    const normalizedDivisor = totalWeight > 0 ? totalWeight : 1
    const values = commonDates.map((date) => {
      let compositeValue = 0

      COMPOSITE_PARTS.forEach((part) => {
        const current = Number(valueLookup[part.source].get(date) || 0)
        const base = baseValues[part.source]
        const relative = base > 0 ? current / base : 1
        const weight = Number(weights[part.key] || 0) / normalizedDivisor
        compositeValue += weight * relative * 100
      })

      return {
        data: date,
        valor: compositeValue,
      }
    })

    return {
      dados: values,
      inicio: values[0]?.valor || 0,
      ultimo: values[values.length - 1]?.valor || 0,
    }
  }, [indicesData, weights, totalWeight])

  const getChartData = (dados) => {
    return {
      labels: dados.map((item) => formatDate(item.data)),
      datasets: [
        {
          label: 'Valor',
          data: dados.map((item) => Number(item.valor)),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
        },
      ],
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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

  if (loading) return <div className="p-4 text-white">Carregando índices...</div>
  if (error) return <div className="p-4 text-red-400">{error}</div>

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-end">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Novo índice
        </button>
      </div>

      <div className="space-y-8">
        <div className="rounded-lg border border-gray-800 bg-black p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white">Índice composto</h2>
            <p className="mt-1 text-sm text-gray-400">
              Combinação ponderada de Reserva (Inflação), Cripto (BTC), Internacional (S&P500), Ações (Bovespa) e FII (IFIX).
            </p>
          </div>

          <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {COMPOSITE_PARTS.map((part) => (
              <label key={part.key} className="rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-sm text-gray-300">
                <span className="mb-2 block font-medium text-white">{part.label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={weights[part.key]}
                    onChange={(event) => handleWeightChange(part.key, event.target.value)}
                    className="w-full rounded-md border border-gray-700 bg-black px-2 py-1.5 text-sm text-white"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
              </label>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
            <span className={`font-medium ${Math.abs(totalWeight - 100) < 0.001 ? 'text-emerald-400' : 'text-amber-300'}`}>
              Total dos pesos: {formatNumber(totalWeight)}%
            </span>
            {composite ? (
              <>
                <span className="text-gray-300">Base: {formatNumber(composite.inicio)}</span>
                <span className="text-gray-300">Último: {formatNumber(composite.ultimo)}</span>
              </>
            ) : null}
          </div>

          <div className="h-96 w-full">
            {composite ? (
              <Line
                data={{
                  labels: composite.dados.map((item) => formatDate(item.data)),
                  datasets: [
                    {
                      label: 'Índice Composto (base 100)',
                      data: composite.dados.map((item) => item.valor),
                      borderColor: '#f59e0b',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      fill: true,
                      tension: 0.35,
                      pointRadius: 2,
                      pointBackgroundColor: '#f59e0b',
                      pointBorderColor: '#fff',
                      pointBorderWidth: 1,
                    },
                  ],
                }}
                options={chartOptions}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-700 text-sm text-gray-400">
                Dados insuficientes para montar o índice composto.
              </div>
            )}
          </div>
        </div>

        {indicesData.map((indice) => (
          <div key={indice.nome} className="rounded-lg border border-gray-800 bg-black p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">{indice.nome}</h2>
              <p className="text-sm text-gray-400">{indice.dados.length} registros</p>
            </div>

            <div className="h-96 w-full">
              <Line data={getChartData(indice.dados)} options={chartOptions} />
            </div>
          </div>
        ))}
      </div>

      <IndiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleIndiceCreated}
      />
    </div>
  )
}

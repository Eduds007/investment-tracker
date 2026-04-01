import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import axios from 'axios'
import IndiceModal from './IndiceModal'

export default function IndicesPage() {
  const [indicesData, setIndicesData] = useState([])
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

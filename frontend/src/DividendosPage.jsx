import { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import axios from 'axios'
import DividendoModal from './DividendoModal'

export default function DividendosPage() {
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleDividendoCreated = () => {
    setRefreshKey((prev) => prev + 1)
  }

  useEffect(() => {
    setLoading(true)
    setError('')

    axios
      .get('http://localhost:8000/api/dividendos/')
      .then((res) => {
        const dividendos = res.data || []

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

        // Agrupar dividendos por mês
        dividendos.forEach((div) => {
          const divDate = new Date(`${div.data}T00:00:00`)
          const found = months.find(
            (m) => m.year === divDate.getFullYear() && m.month === divDate.getMonth()
          )
          if (found) {
            found.total += Number(div.valor)
          }
        })

        setChartData({
          labels: months.map((m) => m.label),
          datasets: [
            {
              label: 'Dividendos (R$)',
              data: months.map((m) => m.total),
              backgroundColor: '#10b981',
              borderColor: '#059669',
              borderWidth: 1,
            },
          ],
        })
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
        </div>

        <div className="h-96 w-full">
          {chartData ? <Bar data={chartData} options={chartOptions} /> : null}
        </div>
      </div>

      <DividendoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleDividendoCreated}
      />
    </div>
  )
}

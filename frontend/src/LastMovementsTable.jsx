import { useEffect, useState } from 'react'
import axios from 'axios'

export default function LastMovementsTable({ refreshKey = 0 }) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    axios.get('http://localhost:8000/api/aportes/')
      .then((res) => {
        const sorted = (res.data || [])
          .slice()
          .sort((a, b) => {
            const byDate = new Date(b.data) - new Date(a.data)
            if (byDate !== 0) return byDate
            return (b.id || 0) - (a.id || 0)
          })

        setMovements(sorted.slice(0, 5))
      })
      .catch(() => {
        setError('Erro ao carregar os ultimos movimentos.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [refreshKey])

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR')
  }

  const formatCurrency = (value) => {
    const numeric = Number(value || 0)
    return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className="mb-8 rounded-lg border border-gray-800 bg-black p-4 text-white">
      <h2 className="mb-4 text-xl font-semibold text-white">Ultimos 5 movimentos</h2>

      {loading ? <p className="text-sm text-gray-300">Carregando movimentos...</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {!loading && !error ? (
        movements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-800 text-sm">
              <thead>
                <tr className="bg-gray-900 text-left text-gray-100">
                  <th className="border border-gray-800 p-2">Data</th>
                  <th className="border border-gray-800 p-2">Tipo</th>
                  <th className="border border-gray-800 p-2">Local</th>
                  <th className="border border-gray-800 p-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement, idx) => (
                  <tr key={movement.id} className={idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-950'}>
                    <td className="border border-gray-800 p-2">{formatDate(movement.data)}</td>
                    <td className={`border border-gray-800 p-2 font-medium ${movement.tipo === 'SAQUE' ? 'text-red-400' : 'text-green-400'}`}>
                      {movement.tipo === 'SAQUE' ? 'Saque' : 'Aporte'}
                    </td>
                    <td className="border border-gray-800 p-2">{movement.lugar || '-'}</td>
                    <td className="border border-gray-800 p-2 text-right">{formatCurrency(movement.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-300">Nenhum movimento encontrado.</p>
        )
      ) : null}
    </div>
  )
}
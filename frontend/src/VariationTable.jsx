import { useEffect, useState } from 'react'
import axios from 'axios'

export default function VariationTable() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios.get('http://localhost:8000/api/indices/')
      .then(res => {
        const data = res.data || []
        // agrupa por nome do índice
        const byIndice = new Map()
        data.forEach(item => {
          const indice = (item.nome || '').toString().trim()
          if (!indice) return
          if (!byIndice.has(indice)) byIndice.set(indice, [])
          byIndice.get(indice).push(item)
        })
        const result = []
        byIndice.forEach((list, indice) => {
          // usa a data para pegar o mais antigo e o mais recente
          let oldest = null
          let newest = null
          list.forEach(item => {
            const d = new Date(item.data)
            if (!oldest || d < oldest.date) oldest = { date: d, item }
            if (!newest || d > newest.date) newest = { date: d, item }
          })

          if (!oldest || !newest) return
          const isInflacao = ['inflacao', 'inflação', 'ipca'].includes(indice.toLowerCase())
          const firstVal = parseFloat(oldest.item.valor)
          const lastVal = parseFloat(newest.item.valor)
          if (!isInflacao && !firstVal) return

          let variation = 0
          if (isInflacao) {
            // juros compostos mês a mês
            const sortedAsc = [...list].sort((a, b) => new Date(a.data) - new Date(b.data))
            let factor = 1
            sortedAsc.forEach(it => {
              const rate = parseFloat(it.valor)
              if (Number.isFinite(rate)) {
                factor *= 1 + rate / 100
              }
            })
            variation = (factor - 1) * 100
          } else {
            variation = ((lastVal - firstVal) / firstVal) * 100
          }
          console.log(indice)
          result.push({ indice, primeiro: firstVal, ultimo: lastVal, variacao: variation, isInflacao })
        })
        // ordena pelo nome do índice
        result.sort((a, b) => a.indice.localeCompare(b.indice))
        setRows(result)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Erro ao carregar variações')
        setLoading(false)
      })
  }, [])

  const fmt = (n) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  if (loading) return <div className="p-4 bg-black text-white">Carregando variações...</div>
  if (error) return <div className="p-4 bg-black text-red-400">{error}</div>

  return (
    <div className="bg-black text-white p-4 rounded-lg border border-gray-800">
      <h2 className="text-xl font-semibold mb-4 text-white">Variação por índice (1º x último registro)</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-800 text-sm">
          <thead>
            <tr className="bg-gray-900 text-gray-100">
              <th className="border border-gray-800 p-2 text-left">Índice</th>
              <th className="border border-gray-800 p-2 text-right">Primeiro</th>
              <th className="border border-gray-800 p-2 text-right">Último</th>
              <th className="border border-gray-800 p-2 text-right">Variação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${row.indice}-${idx}`} className={idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-950'}>
                <td className="border border-gray-800 p-2">{row.indice || '—'}</td>
                <td className="border border-gray-800 p-2 text-right">{row.isInflacao ? `${fmt(row.primeiro)}%` : `R$ ${fmt(row.primeiro)}`}</td>
                <td className="border border-gray-800 p-2 text-right">{row.isInflacao ? `${fmt(row.ultimo)}%` : `R$ ${fmt(row.ultimo)}`}</td>
                <td className={`border border-gray-800 p-2 text-right ${row.variacao >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {fmt(row.variacao)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

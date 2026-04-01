import { useState, useEffect } from 'react'
import axios from 'axios'

export default function AportesSummary({ refreshKey = 0 }) {
  const [summary, setSummary] = useState({
    compra: 0,
    saque: 0,
    liquido: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    axios.get('http://localhost:8000/api/aportes/')
      .then(res => {
        console.log('Aportes recebidos:', res.data.length)
        
        let totalCompra = 0
        let totalSaque = 0
        
        res.data.forEach(aporte => {
          const valor = parseFloat(aporte.valor)
          if (aporte.tipo === 'COMPRA') {
            totalCompra += valor
          } else if (aporte.tipo === 'SAQUE') {
            totalSaque += valor
          }
        })
        
        const liquido = totalCompra - totalSaque
        
        setSummary({
          compra: totalCompra,
          saque: totalSaque,
          liquido: liquido
        })
        setLoading(false)
      })
      .catch(err => {
        console.error('Erro ao carregar aportes:', err)
        setLoading(false)
      })
  }, [refreshKey])

  const formatarMoeda = (valor) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  if (loading) {
    return <div className="p-4">Carregando aportes...</div>
  }

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <div className="rounded-lg border border-emerald-900 bg-emerald-950 p-4">
        <h3 className="mb-2 text-sm font-semibold text-emerald-300">Aportes (Compras)</h3>
        <p className="text-2xl font-bold text-emerald-200">
          {formatarMoeda(summary.compra)}
        </p>
      </div>
      
      <div className="rounded-lg border border-rose-900 bg-rose-950 p-4">
        <h3 className="mb-2 text-sm font-semibold text-rose-300">Saques</h3>
        <p className="text-2xl font-bold text-rose-200">
          {formatarMoeda(summary.saque)}
        </p>
      </div>
      
      <div className="rounded-lg border border-sky-900 bg-sky-950 p-4">
        <h3 className="mb-2 text-sm font-semibold text-sky-300">Líquido (Compra - Saque)</h3>
        <p className={`text-2xl font-bold ${summary.liquido >= 0 ? 'text-sky-200' : 'text-rose-200'}`}>
          {formatarMoeda(summary.liquido)}
        </p>
      </div>
    </div>
  )
}

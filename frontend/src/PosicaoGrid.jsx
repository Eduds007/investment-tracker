import { useState, useEffect } from 'react'
import axios from 'axios'

export default function PosicaoGrid() {
  const [posicoes, setPosicoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [datas, setDatas] = useState([])
  const [ativos, setAtivos] = useState([])

  useEffect(() => {
    console.log('Fetching posicoes...')
    axios.get('http://localhost:8000/api/posicoes/')
      .then(res => {
        console.log('Posicoes recebidas:', res.data.length)
        setPosicoes(res.data)
        
        // Extract unique dates and assets
        const datasSet = new Set()
        const ativosSet = new Set()
        
        res.data.forEach(p => {
          datasSet.add(p.data)
          ativosSet.add(p.ativo)
        })
        
        // Sort dates in descending order (newest first)
        const datasArray = Array.from(datasSet).sort((a, b) => new Date(b) - new Date(a))
        const ativosArray = Array.from(ativosSet).sort()
        
        console.log('Datas:', datasArray.length, 'Ativos:', ativosArray.length)
        
        setDatas(datasArray)
        setAtivos(ativosArray)
        setLoading(false)
      })
      .catch(err => {
        console.error('Erro ao carregar posições:', err)
        setLoading(false)
      })
  }, [])

  const getValor = (data, ativo) => {
    const posicao = posicoes.find(p => p.data === data && p.ativo === ativo)
    return posicao ? parseFloat(posicao.valor).toFixed(2) : '-'
  }

  const formatarData = (dataStr) => {
    const date = new Date(dataStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR')
  }

  if (loading) {
    return <div className="p-4">Carregando...</div>
  }

  return (
    <div className="w-full p-4 overflow-x-auto">
      <h2 className="text-2xl font-bold mb-4">Grid de Posições</h2>
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 p-2 sticky left-0 z-10 bg-gray-300">Data</th>
            {ativos.map((ativo, idx) => (
              <th 
                key={idx} 
                className="border border-gray-300 p-2 text-center min-w-24"
              >
                {ativo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datas.map((data, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-300 p-2 font-semibold sticky left-0 z-10 bg-gray-100">
                {formatarData(data)}
              </td>
              {ativos.map((ativo, colIdx) => {
                const valor = getValor(data, ativo)
                return (
                  <td 
                    key={colIdx}
                    className="border border-gray-300 p-2 text-right"
                  >
                    {valor === '-' ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      <span className="font-medium">
                        R$ {valor.replace('.', ',')}
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 text-gray-600 text-sm">
        Total de datas: {datas.length} | Total de ativos: {ativos.length}
      </div>
    </div>
  )
}

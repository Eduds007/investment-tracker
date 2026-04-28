import { useEffect, useState } from 'react'
import axios from 'axios'

const TIPO_CONFIG = {
  posicao:  { label: 'Posição',   cor: 'bg-blue-600',   texto: 'text-blue-300'  },
  indice:   { label: 'Índice',    cor: 'bg-purple-600', texto: 'text-purple-300' },
  dividendo:{ label: 'Dividendo', cor: 'bg-green-600',  texto: 'text-green-300'  },
}

const CLASSE_COR = {
  ACAO:    'text-yellow-400',
  FII:     'text-orange-400',
  ETF:     'text-cyan-400',
  CRIPTO:  'text-pink-400',
  RESERVA: 'text-teal-400',
  SALDO:   'text-gray-400',
  INDICE:  'text-purple-400',
  DIVIDENDO:'text-green-400',
}

function fmt(valor, tipo) {
  if (tipo === 'indice') return valor.toLocaleString('pt-BR', { maximumFractionDigits: 4 })
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function UltimosRegistrosPage({ refreshKey }) {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busca, setBusca]       = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    axios.get('http://localhost:8000/api/ultimos-registros/?limit=200')
      .then(res => setRegistros(res.data.registros || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [refreshKey])

  const filtrados = registros.filter(r => {
    if (filtroTipo !== 'todos' && r.tipo !== filtroTipo) return false
    if (busca && !r.nome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  // Agrupa por data
  const porData = filtrados.reduce((acc, r) => {
    if (!acc[r.data]) acc[r.data] = []
    acc[r.data].push(r)
    return acc
  }, {})
  const datas = Object.keys(porData).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-white">Últimos Registros</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {['todos', 'posicao', 'indice', 'dividendo'].map(t => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filtroTipo === t
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-600 text-gray-300 hover:bg-gray-800'
              }`}
            >
              {t === 'todos' ? 'Todos' : TIPO_CONFIG[t].label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-gray-400">Carregando...</p>}
      {error   && <p className="text-red-400">Erro: {error}</p>}

      {!loading && !error && datas.length === 0 && (
        <p className="text-gray-400">Nenhum registro encontrado.</p>
      )}

      {datas.map(data => (
        <div key={data} className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
          <div className="border-b border-gray-700 bg-gray-800 px-4 py-2">
            <span className="text-sm font-semibold text-gray-200">
              {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
              })}
            </span>
            <span className="ml-2 text-xs text-gray-500">
              {porData[data].length} registro{porData[data].length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="divide-y divide-gray-800">
            {porData[data].map((r, i) => {
              const cfg = TIPO_CONFIG[r.tipo]
              return (
                <div key={`${r.tipo}-${r.id}-${i}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors">
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold text-white ${cfg.cor}`}>
                    {cfg.label}
                  </span>
                  <span className={`flex-1 font-medium ${CLASSE_COR[r.classe] ?? 'text-gray-200'}`}>
                    {r.nome}
                    {r.subtipo && <span className="ml-1 text-xs text-gray-500">({r.subtipo})</span>}
                  </span>
                  {r.classe && r.classe !== 'INDICE' && r.classe !== 'DIVIDENDO' && (
                    <span className="text-xs text-gray-500 shrink-0">{r.classe}</span>
                  )}
                  <span className="shrink-0 font-mono text-sm text-white">
                    {fmt(r.valor, r.tipo)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

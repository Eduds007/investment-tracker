import { useEffect, useState } from 'react'
import axios from 'axios'

const TIPO_CONFIG = {
  posicao:  { label: 'Posição',   cor: 'bg-blue-600',   texto: 'text-blue-300'  },
  indice:   { label: 'Índice',    cor: 'bg-purple-600', texto: 'text-purple-300' },
  dividendo:{ label: 'Dividendo', cor: 'bg-green-600',  texto: 'text-green-300'  },
}

const ACAO_CONFIG = {
  COMPRA:       { label: 'Compra',      cor: 'bg-emerald-900/50 text-emerald-300 border-emerald-700' },
  VENDA:        { label: 'Venda',       cor: 'bg-red-900/50 text-red-300 border-red-700' },
  ATUALIZACAO:  { label: 'Atualização', cor: 'bg-blue-900/50 text-blue-300 border-blue-700' },
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

const ENDPOINT = {
  posicao:   (id) => `http://localhost:8000/api/posicoes/${id}/`,
  indice:    (id) => `http://localhost:8000/api/indices/${id}/`,
  dividendo: (id) => `http://localhost:8000/api/dividendos/${id}/`,
}

function EditableRow({ r, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [valor, setValor]     = useState(String(r.valor))
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)

  const cfg = TIPO_CONFIG[r.tipo]
  const acaoCfg = r.tipo === 'posicao' ? ACAO_CONFIG[r.acao] : null

  const handleSave = async () => {
    const novo = parseFloat(valor)
    if (!novo || novo <= 0) return
    setSaving(true)
    try {
      await axios.patch(ENDPOINT[r.tipo](r.id), { valor: novo })
      onUpdate(r, novo)
      setEditing(false)
    } catch {
      alert('Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Deletar ${r.nome} (${r.data})?`)) return
    setDeleting(true)
    try {
      await axios.delete(ENDPOINT[r.tipo](r.id))
      onDelete(r)
    } catch {
      alert('Erro ao deletar registro.')
      setDeleting(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setValor(String(r.valor)); setEditing(false) }
  }

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3 hover:bg-gray-800/50 transition-colors">
    <div className="flex items-center gap-3">
      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold text-white ${cfg.cor}`}>
        {cfg.label}
      </span>
      {acaoCfg && (
        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold ${acaoCfg.cor}`}>
          {acaoCfg.label}
        </span>
      )}
      <span className={`flex-1 font-medium ${CLASSE_COR[r.classe] ?? 'text-gray-200'}`}>
        {r.nome}
        {r.subtipo && <span className="ml-1 text-xs text-gray-500">({r.subtipo})</span>}
      </span>
      {r.classe && r.classe !== 'INDICE' && r.classe !== 'DIVIDENDO' && (
        <span className="text-xs text-gray-500 shrink-0">{r.classe}</span>
      )}



      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="shrink-0 rounded p-1 text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40"
        title="Deletar"
      >
        {deleting ? '…' : '✕'}
      </button>
    </div>

    {r.tipo === 'posicao' && (
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 pl-1 text-xs text-gray-500">
        <span>Quantidade: <span className="text-gray-300">{r.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}</span></span>
        <span>Preço médio: <span className="text-gray-300">{fmt(r.preco_medio, 'posicao')}</span></span>
        <span>Valor total: <span className="text-gray-300">{fmt(r.valor, 'posicao')}</span></span>
      </div>
    )}
    </div>
  )
}

export default function UltimosRegistrosPage({ refreshKey }) {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busca, setBusca]         = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    axios.get('http://localhost:8000/api/ultimos-registros/?limit=200')
      .then(res => setRegistros(res.data.registros || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [refreshKey])

  const handleDelete = (r) =>
    setRegistros(prev => prev.filter(x => !(x.tipo === r.tipo && x.id === r.id)))

  const handleUpdate = (r, novoValor) =>
    setRegistros(prev => prev.map(x =>
      x.tipo === r.tipo && x.id === r.id ? { ...x, valor: novoValor } : x
    ))

  const filtrados = registros.filter(r => {
    if (filtroTipo !== 'todos' && r.tipo !== filtroTipo) return false
    if (busca && !r.nome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

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
            {porData[data].map((r, i) => (
              <EditableRow
                key={`${r.tipo}-${r.id}-${i}`}
                r={r}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

import { useEffect, useState } from 'react'
import axios from 'axios'

const TIPO_CONFIG = {
  posicao:  { label: 'Posição',   cor: 'bg-blue-600',   texto: 'text-blue-300'  },
  indice:   { label: 'Índice',    cor: 'bg-purple-600', texto: 'text-purple-300' },
  dividendo:{ label: 'Dividendo', cor: 'bg-green-600',  texto: 'text-green-300'  },
}

const MOVIMENTACAO_CONFIG = {
  COMPRA:      { label: 'Compra',      cor: 'bg-emerald-600' },
  VENDA:       { label: 'Venda',       cor: 'bg-red-600'     },
  ATUALIZACAO: { label: 'Atualização', cor: 'bg-blue-600'    },
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

function fmtMoeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

const ENDPOINT = {
  posicao:   (id) => `http://localhost:8000/api/posicoes/${id}/`,
  indice:    (id) => `http://localhost:8000/api/indices/${id}/`,
  dividendo: (id) => `http://localhost:8000/api/dividendos/${id}/`,
}

function EditableRow({ r, onDelete, onUpdate }) {
  const isPosicao = r.tipo === 'posicao'

  const [editing, setEditing]           = useState(false)
  const [valor, setValor]               = useState(String(r.valor))
  const [ativoNome, setAtivoNome]       = useState(r.nome)
  const [quantidade, setQuantidade]     = useState(r.quantidade != null ? String(r.quantidade) : '')
  const [precoUnitario, setPrecoUnitario] = useState(r.preco_unitario != null ? String(r.preco_unitario) : '')
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [erro, setErro]         = useState(null)

  const movCfg = isPosicao ? MOVIMENTACAO_CONFIG[r.tipo_movimentacao] : null
  const cfg = movCfg ?? TIPO_CONFIG[r.tipo]

  const startEdit = () => {
    setValor(String(r.valor))
    setAtivoNome(r.nome)
    setQuantidade(r.quantidade != null ? String(r.quantidade) : '')
    setPrecoUnitario(r.preco_unitario != null ? String(r.preco_unitario) : '')
    setErro(null)
    setEditing(true)
  }

  const handleSave = async () => {
    const novo = parseFloat(valor)
    if (!novo || novo <= 0) return
    if (isPosicao && !ativoNome.trim()) return
    setSaving(true)
    setErro(null)
    try {
      const payload = { valor: novo }
      if (isPosicao) {
        payload.ativo_nome = ativoNome.trim().toUpperCase()
        payload.quantidade = quantidade !== '' ? parseFloat(quantidade) : null
        payload.preco_unitario = precoUnitario !== '' ? parseFloat(precoUnitario) : null
      }
      const res = await axios.patch(ENDPOINT[r.tipo](r.id), payload)
      const atualizado = isPosicao
        ? {
            valor: Number(res.data.valor),
            nome: res.data.ativo,
            classe: res.data.classe_ativo,
            quantidade: res.data.quantidade != null ? Number(res.data.quantidade) : null,
            preco_unitario: res.data.preco_unitario != null ? Number(res.data.preco_unitario) : null,
            preco_medio: res.data.preco_medio != null ? Number(res.data.preco_medio) : null,
          }
        : { valor: Number(res.data.valor) }
      onUpdate(r, atualizado)
      setEditing(false)
    } catch (err) {
      setErro(err.response?.data?.ativo_nome || err.response?.data?.error || 'Erro ao salvar.')
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
    if (e.key === 'Escape') setEditing(false)
  }

  const inputClass = "rounded border border-blue-500 bg-gray-800 px-2 py-0.5 text-right font-mono text-sm text-white focus:outline-none"

  return (
    <div className="flex flex-col gap-1 px-4 py-3 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center gap-3">
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold text-white ${cfg.cor}`}>
          {cfg.label}
        </span>

        {editing && isPosicao ? (
          <input
            type="text"
            value={ativoNome}
            onChange={e => setAtivoNome(e.target.value)}
            placeholder="Ticker"
            className="w-28 rounded border border-blue-500 bg-gray-800 px-2 py-0.5 text-sm text-white focus:outline-none"
          />
        ) : (
          <span className="flex-1 min-w-0">
            <span className={`font-medium ${CLASSE_COR[r.classe] ?? 'text-gray-200'}`}>
              {r.nome}
              {r.subtipo && <span className="ml-1 text-xs text-gray-500">({r.subtipo})</span>}
            </span>
            {isPosicao && r.quantidade != null && (
              <span className="block text-xs text-gray-500">
                Qtd: {Number(r.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 8 })}
                {r.preco_unitario != null && <> · Preço: {fmtMoeda(r.preco_unitario)}</>}
                {r.preco_medio != null && <> · Preço médio: {fmtMoeda(r.preco_medio)}</>}
              </span>
            )}
          </span>
        )}

        {!editing && r.classe && r.classe !== 'INDICE' && r.classe !== 'DIVIDENDO' && (
          <span className="text-xs text-gray-500 shrink-0">{r.classe}</span>
        )}

        {editing ? (
          <div className="flex flex-1 flex-wrap items-center justify-end gap-1">
            {isPosicao && (
              <input
                type="number"
                min="0"
                step="any"
                value={quantidade}
                onChange={e => setQuantidade(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Qtd"
                className={`w-20 ${inputClass}`}
              />
            )}
            {isPosicao && (
              <input
                type="number"
                min="0"
                step="0.0001"
                value={precoUnitario}
                onChange={e => setPrecoUnitario(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Preço"
                className={`w-24 ${inputClass}`}
              />
            )}
            <input
              autoFocus={!isPosicao}
              type="number"
              min="0.0001"
              step="0.01"
              value={valor}
              onChange={e => setValor(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Valor"
              className={`w-28 ${inputClass}`}
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
            >
              {saving ? '…' : '✓'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded px-2 py-0.5 text-xs text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <span className="font-mono text-sm text-white">{fmt(r.valor, r.tipo)}</span>
            <button
              type="button"
              onClick={startEdit}
              className="rounded p-1 text-gray-500 hover:text-blue-400 hover:bg-blue-900/20 transition-colors"
              title="Editar"
            >
              ✎
            </button>
          </div>
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
      {erro && <p className="text-xs text-red-400">{erro}</p>}
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

  const handleUpdate = (r, patch) =>
    setRegistros(prev => prev.map(x =>
      x.tipo === r.tipo && x.id === r.id ? { ...x, ...patch } : x
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

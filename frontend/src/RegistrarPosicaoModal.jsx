import { useState, useEffect } from 'react'
import axios from 'axios'

const TIPOS = [
  { value: 'COMPRA',      label: 'Registrar Compra',   desc: 'Soma ao último valor conhecido do ativo' },
  { value: 'VENDA',       label: 'Registrar Venda',    desc: 'Subtrai do último valor conhecido do ativo' },
  { value: 'ATUALIZACAO', label: 'Atualizar Posição',  desc: 'Define o valor absoluto atual do ativo' },
]

const CLASSES = [
  { value: 'ACAO',    label: "Ações" },
  { value: 'FII',     label: 'FII' },
  { value: 'ETF',     label: "ETF's" },
  { value: 'CRIPTO',  label: 'Criptos' },
  { value: 'RESERVA', label: 'Reserva de Emergência' },
  { value: 'SALDO',   label: 'Saldo' },
]

const today = () => new Date().toISOString().split('T')[0]

export default function RegistrarPosicaoModal({ isOpen, onClose, onSuccess }) {
  const [tipo, setTipo] = useState('ATUALIZACAO')
  const [data, setData] = useState(today())
  const [ativoNome, setAtivoNome] = useState('')
  const [ativoClasse, setAtivoClasse] = useState('ACAO')
  const [valor, setValor] = useState('')
  const [ativos, setAtivos] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    axios.get('http://localhost:8000/api/ativos/').then(res => setAtivos(res.data || [])).catch(() => {})
  }, [isOpen])

  // Preenche classe automaticamente ao selecionar ativo existente
  const handleAtivoChange = (nome) => {
    setAtivoNome(nome)
    const found = ativos.find(a => a.nome === nome.toUpperCase())
    if (found) setAtivoClasse(found.classe_ativo)
  }

  const canSubmit = data && ativoNome.trim() && parseFloat(valor) > 0 && !submitting

  const handleSubmit = async () => {
    setSubmitting(true)
    setErro(null)
    try {
      const res = await axios.post('http://localhost:8000/api/registrar-posicao/', {
        data,
        ativo_nome: ativoNome.trim().toUpperCase(),
        ativo_classe: ativoClasse,
        tipo,
        valor: parseFloat(valor),
      })
      onSuccess()
      const labelTipo = { COMPRA: 'Compra', VENDA: 'Venda', ATUALIZACAO: 'Atualização' }[tipo]
      setSucesso(`${labelTipo} de ${res.data.ativo} registrada: R$ ${Number(res.data.valor_novo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
      setAtivoNome('')
      setValor('')
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao registrar.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const tipoInfo = TIPOS.find(t => t.value === tipo)
  const ativosExistentes = ativos.map(a => a.nome)
  const isNovoAtivo = ativoNome && !ativosExistentes.includes(ativoNome.toUpperCase())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-bold text-white">Registrar Movimentação</h2>

        {/* Seletor de tipo */}
        <div className="mb-5 grid grid-cols-3 gap-2">
          {TIPOS.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => { setTipo(t.value); setSucesso(null); setErro(null) }}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                tipo === t.value
                  ? t.value === 'COMPRA'  ? 'border-emerald-500 bg-emerald-900/50 text-emerald-300'
                  : t.value === 'VENDA'   ? 'border-red-500 bg-red-900/50 text-red-300'
                  :                         'border-blue-500 bg-blue-900/50 text-blue-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="mb-5 text-xs text-gray-500">{tipoInfo.desc}</p>

        {/* Data */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-gray-400">Data</label>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Ativo */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-gray-400">
            Ativo {isNovoAtivo && <span className="text-yellow-400">(novo)</span>}
          </label>
          <input
            type="text"
            list="ativos-list"
            value={ativoNome}
            onChange={e => handleAtivoChange(e.target.value)}
            placeholder="Ex: BBAS3, BOVA11, BTC"
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <datalist id="ativos-list">
            {ativos.map(a => <option key={a.id} value={a.nome} />)}
          </datalist>
        </div>

        {/* Classe — só mostra se ativo for novo */}
        {isNovoAtivo && (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-gray-400">Classe do novo ativo</label>
            <select
              value={ativoClasse}
              onChange={e => setAtivoClasse(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        )}

        {/* Valor */}
        <div className="mb-5">
          <label className="mb-1 block text-xs font-medium text-gray-400">
            {tipo === 'ATUALIZACAO' ? 'Novo valor total (R$)' : tipo === 'COMPRA' ? 'Valor comprado (R$)' : 'Valor vendido (R$)'}
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {sucesso && (
          <p className="mb-4 rounded-lg border border-emerald-700 bg-emerald-900/30 px-3 py-2 text-xs text-emerald-400">
            ✓ {sucesso}
          </p>
        )}
        {erro && <p className="mb-4 rounded-lg border border-red-700 bg-red-900/30 px-3 py-2 text-xs text-red-400">{erro}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setSucesso(null); setErro(null); onClose() }}
            className="flex-1 rounded-lg border border-gray-600 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
              tipo === 'COMPRA'  ? 'bg-emerald-600 hover:bg-emerald-500'
            : tipo === 'VENDA'  ? 'bg-red-600 hover:bg-red-500'
            :                      'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {submitting ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

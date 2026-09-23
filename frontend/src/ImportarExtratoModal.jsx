import { useState } from 'react'
import axios from 'axios'

export default function ImportarExtratoModal({ isOpen, onClose, onSuccess }) {
  const [arquivo, setArquivo] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)

  const canSubmit = arquivo && !submitting

  const handleSubmit = async () => {
    setSubmitting(true)
    setErro(null)
    setSucesso(null)
    try {
      const formData = new FormData()
      formData.append('arquivo', arquivo)
      const res = await axios.post('http://localhost:8000/api/importar-extrato/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onSuccess()
      setSucesso(
        `Extrato de ${res.data.mes_referencia} importado: ` +
        `${res.data.posicoes_criadas} posição(ões) nova(s), ` +
        `${res.data.posicoes_atualizadas} atualizada(s), ` +
        `${res.data.dividendos_criados} dividendo(s) novo(s).`
      )
      setArquivo(null)
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao importar o extrato.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <h2 className="mb-2 text-lg font-bold text-white">Importar Extrato Mensal</h2>
        <p className="mb-5 text-xs text-gray-500">
          Envie o "Relatório mensal consolidado" em PDF (baixado em investidor.B3.com.br).
          O Claude lê o documento e grava as posições e dividendos direto no banco automaticamente.
        </p>

        <div className="mb-5">
          <label className="mb-1 block text-xs font-medium text-gray-400">Arquivo PDF</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={e => { setArquivo(e.target.files?.[0] || null); setSucesso(null); setErro(null) }}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-500"
          />
        </div>

        {submitting && (
          <p className="mb-4 rounded-lg border border-blue-700 bg-blue-900/30 px-3 py-2 text-xs text-blue-300">
            Lendo o documento e gravando os registros... isso pode levar até 1 minuto.
          </p>
        )}
        {sucesso && (
          <p className="mb-4 rounded-lg border border-emerald-700 bg-emerald-900/30 px-3 py-2 text-xs text-emerald-400">
            ✓ {sucesso}
          </p>
        )}
        {erro && <p className="mb-4 rounded-lg border border-red-700 bg-red-900/30 px-3 py-2 text-xs text-red-400">{erro}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setSucesso(null); setErro(null); setArquivo(null); onClose() }}
            className="flex-1 rounded-lg border border-gray-600 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  )
}

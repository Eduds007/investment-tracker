import { useMemo, useState } from 'react'
import axios from 'axios'

const initialForm = {
  data: new Date().toISOString().slice(0, 10),
  ativo: '',
  valor: '',
  tipo: 'Dividendo',
}

export default function DividendoModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    const valor = Number(form.valor)
    return Boolean(form.data && form.ativo.trim() && Number.isFinite(valor) && valor > 0)
  }, [form])

  if (!isOpen) return null

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleClose = () => {
    if (submitting) return
    setError('')
    setForm(initialForm)
    onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) {
      setError('Preencha todos os campos obrigatorios e informe um valor maior que zero.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await axios.post('http://localhost:8000/api/dividendos/', {
        data: form.data,
        ativo: form.ativo.trim(),
        valor: Number(form.valor),
        tipo: form.tipo || null,
      })
      setForm(initialForm)
      onSuccess()
      onClose()
    } catch (err) {
      const apiError = err?.response?.data
      if (typeof apiError === 'string') {
        setError(apiError)
      } else {
        setError('Nao foi possivel salvar o registro. Verifique os campos e tente novamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Novo dividendo</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
          >
            Fechar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-1 text-left text-sm text-gray-700">
            Data
            <input
              type="date"
              name="data"
              value={form.data}
              onChange={handleChange}
              className="rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-left text-sm text-gray-700">
            Ativo
            <input
              type="text"
              name="ativo"
              value={form.ativo}
              onChange={handleChange}
              placeholder="Ex: BBAS3, BOVA11, ITUB4"
              className="rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-left text-sm text-gray-700">
            Valor (R$)
            <input
              type="number"
              min="0.01"
              step="0.01"
              name="valor"
              value={form.valor}
              onChange={handleChange}
              placeholder="Ex: 150.50"
              className="rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-left text-sm text-gray-700">
            Tipo (opcional)
            <input
              type="text"
              name="tipo"
              value={form.tipo}
              onChange={handleChange}
              placeholder="Ex: Dividendo, JCP, Aluguel"
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

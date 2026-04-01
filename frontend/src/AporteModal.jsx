import { useMemo, useState } from 'react'
import axios from 'axios'

const initialForm = {
  data: new Date().toISOString().slice(0, 10),
  tipo: 'COMPRA',
  valor: '',
  lugar: '',
  descricao: '',
}

export default function AporteModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    const valor = Number(form.valor)
    return Boolean(form.data && form.tipo && form.lugar.trim() && Number.isFinite(valor) && valor > 0)
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
      setError('Preencha os campos obrigatorios e informe um valor maior que zero.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await axios.post('http://localhost:8000/api/aportes/', {
        ...form,
        valor: Number(form.valor),
        lugar: form.lugar.trim(),
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
          <h2 className="text-xl font-semibold text-gray-900">Novo aporte ou saque</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
          >
            Fechar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              Tipo
              <select
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="COMPRA">Aporte (Compra)</option>
                <option value="SAQUE">Saque</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-left text-sm text-gray-700">
            Valor (R$)
            <input
              type="number"
              min="0.01"
              step="0.01"
              name="valor"
              value={form.valor}
              onChange={handleChange}
              placeholder="Ex: 1500.00"
              className="rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-left text-sm text-gray-700">
            Local
            <input
              type="text"
              name="lugar"
              value={form.lugar}
              onChange={handleChange}
              placeholder="Ex: Inter, Clear, Nubank"
              className="rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-left text-sm text-gray-700">
            Descricao (opcional)
            <textarea
              name="descricao"
              value={form.descricao}
              onChange={handleChange}
              rows={3}
              className="rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Observacao sobre o movimento"
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
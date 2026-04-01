import { useState, useEffect } from 'react'

export default function SettingsModal({ isOpen, onClose }) {
  const [metaPatrimonio, setMetaPatrimonio] = useState(100000)
  const [metaDividendos, setMetaDividendos] = useState(1000)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMetaPatrimonio(parseFloat(localStorage.getItem('metaPatrimonio') || '100000'))
    setMetaDividendos(parseFloat(localStorage.getItem('metaDividendos') || '1000'))
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    setSaving(true)
    localStorage.setItem('metaPatrimonio', metaPatrimonio)
    localStorage.setItem('metaDividendos', metaDividendos)
    setTimeout(() => {
      setSaving(false)
      onClose()
      window.location.reload()
    }, 500)
  }

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">⚙️ Configurações</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
          >
            Fechar
          </button>
        </div>

        <div className="space-y-4">
          <label className="flex flex-col gap-2 text-left text-sm text-gray-700">
            <span className="font-semibold">Meta de Patrimônio (R$)</span>
            <input
              type="number"
              value={metaPatrimonio}
              onChange={(e) => setMetaPatrimonio(parseFloat(e.target.value) || 0)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-lg focus:border-blue-500 focus:outline-none"
              placeholder="Ex: 100000"
            />
            <span className="text-xs text-gray-500">
              Valor alvo total de patrimônio em ativos
            </span>
          </label>

          <label className="flex flex-col gap-2 text-left text-sm text-gray-700">
            <span className="font-semibold">Meta de Dividendos Mensais (R$)</span>
            <input
              type="number"
              value={metaDividendos}
              onChange={(e) => setMetaDividendos(parseFloat(e.target.value) || 0)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-lg focus:border-blue-500 focus:outline-none"
              placeholder="Ex: 1000"
            />
            <span className="text-xs text-gray-500">
              Média mensal de dividendos que deseja receber
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

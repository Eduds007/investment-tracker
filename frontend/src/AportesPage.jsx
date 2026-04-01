import { useState } from 'react'
import AportesSummary from './AportesSummary'
import AporteModal from './AporteModal'
import LastMovementsTable from './LastMovementsTable'

export default function AportesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshAportesKey, setRefreshAportesKey] = useState(0)

  const handleAporteCreated = () => {
    setRefreshAportesKey((prev) => prev + 1)
  }

  return (
    <>
      <div className="mb-8 flex justify-end">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Novo aporte/saque
        </button>
      </div>

      <AportesSummary refreshKey={refreshAportesKey} />

      <div className="mt-8">
        <LastMovementsTable refreshKey={refreshAportesKey} />
      </div>

      <AporteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAporteCreated}
      />
    </>
  )
}

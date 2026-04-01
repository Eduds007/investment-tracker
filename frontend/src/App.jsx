import { useState } from 'react'
import { Chart, registerables } from 'chart.js'
import AportesSummary from './AportesSummary'
import AporteModal from './AporteModal'
import LastMovementsTable from './LastMovementsTable'
import VariationTable from './VariationTable'
Chart.register(...registerables)

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshAportesKey, setRefreshAportesKey] = useState(0)

  const handleAporteCreated = () => {
    setRefreshAportesKey((prev) => prev + 1)
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Novo aporte/saque
        </button>
      </div>
      
      <AportesSummary refreshKey={refreshAportesKey} />

      <LastMovementsTable refreshKey={refreshAportesKey} />
      
      <VariationTable />

      <AporteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAporteCreated}
      />
      
    </div>
  )
}
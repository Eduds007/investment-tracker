import { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import DashboardPage from './DashboardPage'
import AportesPage from './AportesPage'
import IndicesPage from './IndicesPage'
import DividendosPage from './DividendosPage'
import EvolucaoPatrimonialPage from './EvolucaoPatrimonialPage'
import RecomendadoresPage from './RecomendadoresPage'
import SettingsModal from './SettingsModal'

Chart.register(...registerables)

export default function App() {
  const location = useLocation()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const isDashboard = location.pathname === '/'
  const isAportes = location.pathname === '/aportes'
  const isIndices = location.pathname === '/indices'
  const isDividendos = location.pathname === '/dividendos'
  const isPatrimonio = location.pathname === '/patrimonio'
  const isRecomendadores = location.pathname === '/recomendadores'

  const getTitle = () => {
    if (isDashboard) return 'Dashboard'
    if (isAportes) return 'Aportes'
    if (isIndices) return 'Evolução de Índices'
    if (isDividendos) return 'Dividendos'
    if (isPatrimonio) return 'Evolução Patrimonial'
    if (isRecomendadores) return 'Recomendadores de Ações'
    return 'Investimentos'
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col items-center justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold">{getTitle()}</h1>
          <div className="flex gap-2 sm:ml-6">
            <Link
              to="/"
              className={`rounded-lg px-4 py-2 text-sm font-medium ${isDashboard ? 'bg-blue-600 text-white' : 'border border-gray-600 text-gray-300 hover:bg-gray-800'}`}
            >
              Dashboard
            </Link>
            <Link
              to="/aportes"
              className={`rounded-lg px-4 py-2 text-sm font-medium ${isAportes ? 'bg-blue-600 text-white' : 'border border-gray-600 text-gray-300 hover:bg-gray-800'}`}
            >
              Aportes
            </Link>
            <Link
              to="/indices"
              className={`rounded-lg px-4 py-2 text-sm font-medium ${isIndices ? 'bg-blue-600 text-white' : 'border border-gray-600 text-gray-300 hover:bg-gray-800'}`}
            >
              Índices
            </Link>
            <Link
              to="/dividendos"
              className={`rounded-lg px-4 py-2 text-sm font-medium ${isDividendos ? 'bg-blue-600 text-white' : 'border border-gray-600 text-gray-300 hover:bg-gray-800'}`}
            >
              Dividendos
            </Link>
            <Link
              to="/patrimonio"
              className={`rounded-lg px-4 py-2 text-sm font-medium ${isPatrimonio ? 'bg-blue-600 text-white' : 'border border-gray-600 text-gray-300 hover:bg-gray-800'}`}
            >
              Patrimônio
            </Link>
            <Link
              to="/recomendadores"
              className={`rounded-lg px-4 py-2 text-sm font-medium ${isRecomendadores ? 'bg-blue-600 text-white' : 'border border-gray-600 text-gray-300 hover:bg-gray-800'}`}
            >
              Recomendações
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-600 text-xl text-gray-300 hover:bg-gray-800 hover:text-white"
          title="Configurações"
        >
          ⚙️
        </button>
      </div>

      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/aportes" element={<AportesPage />} />
        <Route path="/indices" element={<IndicesPage />} />
        <Route path="/dividendos" element={<DividendosPage />} />
        <Route path="/patrimonio" element={<EvolucaoPatrimonialPage />} />
        <Route path="/recomendadores" element={<RecomendadoresPage />} />
      </Routes>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}
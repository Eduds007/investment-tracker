import { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import DashboardPage from './DashboardPage'
import IndicesPage from './IndicesPage'
import DividendosPage from './DividendosPage'
import EvolucaoPatrimonialPage from './EvolucaoPatrimonialPage'
import RecomendadoresPage from './RecomendadoresPage'
import UltimosRegistrosPage from './UltimosRegistrosPage'
import SettingsModal from './SettingsModal'
import RegistrarPosicaoModal from './RegistrarPosicaoModal'

Chart.register(...registerables)

export default function App() {
  const location = useLocation()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const is = (path) => location.pathname === path

  const navClass = (path) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${is(path) ? 'bg-blue-600 text-white' : 'border border-gray-600 text-gray-300 hover:bg-gray-800'}`

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col items-center justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold text-white">EduFinanceiro</h1>
          <div className="flex gap-2 sm:ml-6">
            <Link to="/"              className={navClass('/')}>Dashboard</Link>
            <Link to="/indices"       className={navClass('/indices')}>Índices</Link>
            <Link to="/dividendos"    className={navClass('/dividendos')}>Dividendos</Link>
            <Link to="/patrimonio"    className={navClass('/patrimonio')}>Patrimônio</Link>
            <Link to="/recomendadores" className={navClass('/recomendadores')}>Recomendações</Link>
            <Link to="/registros"     className={navClass('/registros')}>Registros</Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            + Registrar Movimentação
          </button>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-600 text-xl text-gray-300 hover:bg-gray-800 hover:text-white"
            title="Configurações"
          >
            ⚙️
          </button>
        </div>
      </div>

      <RegistrarPosicaoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => setRefreshKey(k => k + 1)}
      />

      <Routes>
        <Route path="/"              element={<DashboardPage refreshKey={refreshKey} />} />
        <Route path="/indices"       element={<IndicesPage />} />
        <Route path="/dividendos"    element={<DividendosPage refreshKey={refreshKey} />} />
        <Route path="/patrimonio"    element={<EvolucaoPatrimonialPage refreshKey={refreshKey} />} />
        <Route path="/recomendadores" element={<RecomendadoresPage refreshKey={refreshKey} />} />
        <Route path="/registros"      element={<UltimosRegistrosPage refreshKey={refreshKey} />} />
      </Routes>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}

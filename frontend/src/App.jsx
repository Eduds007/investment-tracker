import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import DashboardPage from './DashboardPage'
import IndicesPage from './IndicesPage'
import DividendosPage from './DividendosPage'

Chart.register(...registerables)

export default function App() {
  const location = useLocation()
  const isDashboard = location.pathname === '/'
  const isIndices = location.pathname === '/indices'
  const isDividendos = location.pathname === '/dividendos'

  const getTitle = () => {
    if (isDashboard) return 'Dashboard'
    if (isIndices) return 'Evolução de Índices'
    if (isDividendos) return 'Dividendos'
    return 'Investimentos'
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
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
          </div>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/indices" element={<IndicesPage />} />
        <Route path="/dividendos" element={<DividendosPage />} />
      </Routes>
    </div>
  )
}
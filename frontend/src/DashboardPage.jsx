import DashboardSummary from './DashboardSummary'
import VariationTable from './VariationTable'
import PortfolioDistributionPie from './PortfolioDistributionPie'
import TopPerformers from './TopPerformers'

export default function DashboardPage({ refreshKey = 0 }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:auto-rows-[minmax(0,auto)]">
      <div className="lg:row-span-2 h-full">
        <DashboardSummary refreshKey={refreshKey} />
      </div>

      <div className="lg:row-span-2 h-full">
        <PortfolioDistributionPie refreshKey={refreshKey} />
      </div>

      <div className="lg:col-span-2">
        <TopPerformers refreshKey={refreshKey} />
      </div>

      <div className="lg:col-span-2">
        <VariationTable refreshKey={refreshKey} />
      </div>
    </div>
  )
}

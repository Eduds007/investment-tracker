import DashboardSummary from './DashboardSummary'
import VariationTable from './VariationTable'
import PortfolioDistributionPie from './PortfolioDistributionPie'

export default function DashboardPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:auto-rows-[minmax(0,auto)]">
      <div className="lg:row-span-2 h-full">
        <DashboardSummary />
      </div>

      <div className="lg:row-span-2 h-full">
        <PortfolioDistributionPie />
      </div>

      <div className="lg:col-span-2">
        <VariationTable />
      </div>
    </div>
  )
}

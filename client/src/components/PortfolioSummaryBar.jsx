import StatCard from './StatCard'
import { mockPortfolio } from '../mock/data'

function fmt(n) {
  return '₹' + n.toLocaleString('en-IN')
}

export default function PortfolioSummaryBar() {
  // Swap: const { data } = useQuery('portfolio', () => api.get('/api/portfolio'))
  const data = mockPortfolio

  const pnlColor = data.unrealizedPnl >= 0 ? 'profit' : 'loss'
  const dayColor = data.dailyChange >= 0 ? 'profit' : 'loss'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="MTM Value"
        value={fmt(data.totalMtm)}
        subValue="mark-to-market"
      />
      <StatCard
        label="Cash Balance"
        value={fmt(data.cashBalance)}
        subValue="available to trade"
      />
      <StatCard
        label="Unrealized P&L"
        value={(data.unrealizedPnl >= 0 ? '+' : '') + fmt(data.unrealizedPnl)}
        subValue="open positions"
        color={pnlColor}
      />
      <StatCard
        label="Daily Change"
        value={(data.dailyChange >= 0 ? '+' : '') + data.dailyChange.toFixed(2) + '%'}
        subValue="vs yesterday's close"
        color={dayColor}
      />
    </div>
  )
}

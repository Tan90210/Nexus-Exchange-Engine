import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'
import TopBar from '../components/TopBar'
import TabNav from '../components/TabNav'
import PortfolioSummaryBar from '../components/PortfolioSummaryBar'
import HoldingsTable from '../components/HoldingsTable'
import PriceChart from '../components/PriceChart'
import OrderForm from '../components/OrderForm'
import OrderPreview from '../components/OrderPreview'
import TradeHistoryLog from '../components/TradeHistoryLog'
import AdminView from '../components/AdminView'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('trader')
  const [selectedAssetId, setSelectedAssetId] = useState(null)
  const [lastTrade, setLastTrade] = useState(null)

  // OrderForm state lifted up so OrderPreview can do live calculations
  const [orderSide, setOrderSide] = useState('BUY')
  const [orderType, setOrderType] = useState('MARKET')
  const [orderAssetId, setOrderAssetId] = useState(null)
  const [orderQty, setOrderQty] = useState('')
  const [orderLimitPrice, setOrderLimitPrice] = useState('')

  // Single portfolio query shared across the whole dashboard
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api.get('/api/portfolio').then((r) => r.data),
    staleTime: 30_000,
  })

  // Derive the assets list from real holdings (same shape as old mockAssets)
  const assets = portfolio?.holdings.map((h) => ({
    assetId: h.assetId,
    symbol: h.symbol,
    name: h.name,
    currentPrice: h.currentPrice,
  })) ?? []

  // Once we have real assets, seed the selected IDs from the first asset
  useEffect(() => {
    if (assets.length > 0 && selectedAssetId === null) {
      setSelectedAssetId(assets[0].assetId)
      setOrderAssetId(assets[0].assetId)
    }
  }, [assets.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTradeSuccess(result, side, asset) {
    setLastTrade({ ...result, side, symbol: asset.symbol, qty: orderQty })
  }

  return (
    <div className="min-h-screen bg-bg">
      <TopBar />

      <div className="pt-14">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="p-6 space-y-6">
          {activeTab === 'trader' ? (
            <>
              {/* Summary bar — uses its own internal query (same cache key, no extra request) */}
              <PortfolioSummaryBar />

              {/* Holdings + Chart (2/3 + 1/3) */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <HoldingsTable
                    selectedAssetId={selectedAssetId}
                    onSelectAsset={(id) => {
                      setSelectedAssetId(id)
                      setOrderAssetId(id)
                    }}
                  />
                </div>
                <div>
                  <PriceChart selectedAssetId={selectedAssetId} />
                </div>
              </div>

              {/* Order Form + Order Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <OrderForm
                  assets={assets}
                  portfolio={portfolio}
                  isLoading={isLoading}
                  // Controlled state — lifted up for live OrderPreview
                  side={orderSide}
                  orderType={orderType}
                  assetId={orderAssetId}
                  qty={orderQty}
                  limitPrice={orderLimitPrice}
                  onSideChange={setOrderSide}
                  onOrderTypeChange={setOrderType}
                  onAssetChange={(id) => {
                    setOrderAssetId(id)
                    setSelectedAssetId(id)
                  }}
                  onQtyChange={setOrderQty}
                  onLimitPriceChange={setOrderLimitPrice}
                  onTradeSuccess={handleTradeSuccess}
                />
                <OrderPreview
                  side={orderSide}
                  orderType={orderType}
                  assetId={orderAssetId}
                  qty={orderQty}
                  limitPrice={orderLimitPrice}
                  lastTrade={lastTrade}
                  assets={assets}
                  portfolio={portfolio}
                />
              </div>

              {/* Trade History — stays on mock until P2 ships /api/audit */}
              <TradeHistoryLog />
            </>
          ) : (
            <AdminView />
          )}
        </main>
      </div>
    </div>
  )
}

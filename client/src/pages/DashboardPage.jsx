import { useState } from 'react'
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
  const [selectedAssetId, setSelectedAssetId] = useState(1)
  const [lastTrade, setLastTrade] = useState(null)

  // OrderForm state lifted up for OrderPreview live calculation
  const [orderSide, setOrderSide] = useState('BUY')
  const [orderType, setOrderType] = useState('MARKET')
  const [orderAssetId, setOrderAssetId] = useState(1)
  const [orderQty, setOrderQty] = useState('')
  const [orderLimitPrice, setOrderLimitPrice] = useState('')

  function handleTradeSuccess(result, side, asset) {
    setLastTrade({ ...result, side, symbol: asset.symbol, qty: orderQty })
  }

  return (
    <div className="min-h-screen bg-bg">
      <TopBar />

      {/* Main content below fixed TopBar */}
      <div className="pt-14">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="p-6 space-y-6">
          {activeTab === 'trader' ? (
            <>
              {/* Summary */}
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

              {/* Order Form + Order Preview (1/2 + 1/2) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <OrderForm
                  onTradeSuccess={handleTradeSuccess}
                />
                <OrderPreview
                  side={orderSide}
                  orderType={orderType}
                  assetId={orderAssetId}
                  qty={orderQty}
                  limitPrice={orderLimitPrice}
                  lastTrade={lastTrade}
                />
              </div>

              {/* Trade History */}
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

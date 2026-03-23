import { useState } from 'react'
import { mockPortfolio, mockAssets } from '../mock/data'

function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function OrderForm({ onTradeSuccess }) {
  const [side, setSide] = useState('BUY')
  const [orderType, setOrderType] = useState('MARKET')
  const [assetId, setAssetId] = useState(1)
  const [qty, setQty] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedAsset = mockAssets.find((a) => a.assetId === assetId) || mockAssets[0]

  function isValid() {
    const q = parseInt(qty)
    if (!q || q <= 0) return false
    if (orderType === 'LIMIT') {
      const lp = parseFloat(limitPrice)
      if (!lp || lp <= 0) return false
    }
    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    // Swap: await api.post('/api/trades', { assetId, type: side, qty: parseInt(qty), orderType, limitPrice: parseFloat(limitPrice) })
    await new Promise((r) => setTimeout(r, 700))
    const mockResult = {
      tradeId: Math.floor(Math.random() * 900) + 100,
      status: 'COMMITTED',
      executedPrice: selectedAsset.currentPrice + (Math.random() * 10 - 5),
      totalValue: parseInt(qty) * selectedAsset.currentPrice,
    }
    setLoading(false)
    setQty('')
    setLimitPrice('')
    onTradeSuccess && onTradeSuccess(mockResult, side, selectedAsset)
  }

  return (
    <div className="surface rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <p className="mono text-xs text-text-muted tracking-widest">PLACE ORDER</p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* BUY / SELL toggle */}
        <div className="grid grid-cols-2 gap-2">
          {['BUY', 'SELL'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`mono text-xs font-medium py-2.5 tracking-widest rounded-sm border transition-colors ${
                side === s
                  ? s === 'BUY'
                    ? 'bg-profit/10 border-profit text-profit'
                    : 'bg-loss/10 border-loss text-loss'
                  : 'border-border text-text-muted hover:text-text-primary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Order type */}
        <div className="grid grid-cols-2 gap-2">
          {['MARKET', 'LIMIT'].map((ot) => (
            <button
              key={ot}
              type="button"
              onClick={() => setOrderType(ot)}
              className={`mono text-xs py-2 tracking-widest rounded-sm border transition-colors ${
                orderType === ot
                  ? 'border-info text-info bg-info/10'
                  : 'border-border text-text-muted hover:text-text-primary'
              }`}
            >
              {ot}
            </button>
          ))}
        </div>

        {/* Asset selector */}
        <div>
          <label className="block mono text-xs text-text-muted mb-1.5 tracking-wider">ASSET</label>
          <select
            value={assetId}
            onChange={(e) => setAssetId(parseInt(e.target.value))}
            className="w-full px-3 py-2.5 text-sm rounded-sm mono"
          >
            {mockAssets.map((a) => (
              <option key={a.assetId} value={a.assetId}>
                {a.symbol} — {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block mono text-xs text-text-muted mb-1.5 tracking-wider">QUANTITY</label>
          <input
            type="number"
            min="1"
            step="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2.5 text-sm rounded-sm mono"
          />
        </div>

        {/* Limit price (LIMIT only) */}
        {orderType === 'LIMIT' && (
          <div>
            <label className="block mono text-xs text-text-muted mb-1.5 tracking-wider">LIMIT PRICE (₹)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder={selectedAsset.currentPrice.toFixed(2)}
              className="w-full px-3 py-2.5 text-sm rounded-sm mono"
            />
          </div>
        )}

        {error && <p className="mono text-xs text-loss">{error}</p>}

        <button
          type="submit"
          disabled={!isValid() || loading}
          className={`w-full mono text-sm font-medium py-3 rounded-sm tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            side === 'BUY'
              ? 'bg-profit text-black hover:bg-green-400'
              : 'bg-loss text-white hover:bg-red-400'
          }`}
        >
          {loading ? 'EXECUTING...' : `PLACE ${side} ORDER →`}
        </button>
      </form>
    </div>
  )
}

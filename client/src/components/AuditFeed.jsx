import { useEffect, useRef, useState } from 'react'
import { mockAudit } from '../mock/data'

function truncateHash(hash) {
  return hash.slice(0, 6) + '...' + hash.slice(-4)
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' })
}

export default function AuditFeed() {
  // Swap: use polling or websocket to get live audit entries
  const [entries, setEntries] = useState(mockAudit.entries.slice(0, 10))
  const [live, setLive] = useState(true)
  const feedRef = useRef(null)

  // Simulate new entries coming in
  useEffect(() => {
    if (!live) return
    const interval = setInterval(() => {
      const newEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        tradeId: Math.floor(Math.random() * 900) + 100,
        userId: Math.floor(Math.random() * 7) + 1,
        side: Math.random() > 0.5 ? 'BUY' : 'SELL',
        assetSymbol: ['RELI', 'TCS', 'INFY', 'HDFC', 'WIPRO'][Math.floor(Math.random() * 5)],
        qty: Math.floor(Math.random() * 100) + 1,
        price: 1000 + Math.random() * 3000,
        txHash: '0x' + Math.random().toString(16).slice(2, 12) + Math.random().toString(16).slice(2, 12),
        verified: true,
      }
      setEntries((prev) => [newEntry, ...prev.slice(0, 49)])
    }, 4000)
    return () => clearInterval(interval)
  }, [live])

  return (
    <div className="surface rounded-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <p className="mono text-xs text-text-muted tracking-widest">AUDIT FEED</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLive((l) => !l)}
            className={`mono text-xs tracking-wider px-2 py-0.5 border rounded-sm transition-colors ${
              live ? 'border-warn/50 text-warn bg-warn/10' : 'border-border text-text-muted'
            }`}
          >
            {live ? '● LIVE' : '○ PAUSED'}
          </button>
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="overflow-y-auto flex-1 divide-y divide-border">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="px-4 py-2.5 hover:bg-bg/50 transition-colors"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={`mono text-xs font-medium ${entry.side === 'BUY' ? 'text-profit' : 'text-loss'}`}>
                  {entry.side}
                </span>
                <span className="mono text-xs text-info">{entry.assetSymbol}</span>
                <span className="mono text-xs text-text-muted">{entry.qty}@</span>
                <span className="mono text-xs text-text-primary">
                  ₹{Number(entry.price).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="mono text-xs text-info" title={entry.txHash}>
                  {truncateHash(entry.txHash)}
                </span>
                {entry.verified && (
                  <span className="text-profit text-xs" title="Verified">✓</span>
                )}
              </div>
            </div>
            <p className="mono text-xs text-text-muted mt-0.5">{formatTime(entry.timestamp)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

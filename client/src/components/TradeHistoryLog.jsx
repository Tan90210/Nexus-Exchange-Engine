import { useState } from 'react'
import { mockAudit } from '../mock/data'

const PAGE_SIZE = 10

function truncateHash(hash) {
  if (!hash) return ''
  return hash.slice(0, 6) + '...' + hash.slice(-4)
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' })
}

export default function TradeHistoryLog() {
  // Swap: const { data } = useQuery(['audit', page], () => api.get(`/api/audit?page=${page}&limit=${PAGE_SIZE}`))
  const allEntries = mockAudit.entries
  const total = mockAudit.total

  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(allEntries.length / PAGE_SIZE)
  const entries = allEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="surface rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <p className="mono text-xs text-text-muted tracking-widest">TRADE HISTORY</p>
        <p className="mono text-xs text-text-muted">{total} total entries</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              {['Timestamp', 'Tx Hash', 'Asset', 'Side', 'Qty', 'Price'].map((h) => (
                <th key={h} className="text-left px-5 py-3 mono text-xs text-text-muted tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-border hover:bg-bg/50 transition-colors">
                <td className="px-5 py-3 mono text-xs text-text-muted whitespace-nowrap">
                  {formatTime(entry.timestamp)}
                </td>
                <td className="px-5 py-3 mono text-xs text-info" title={entry.txHash}>
                  {truncateHash(entry.txHash)}
                </td>
                <td className="px-5 py-3 mono text-xs text-info font-medium">
                  {entry.assetSymbol}
                </td>
                <td className="px-5 py-3">
                  <span className={entry.side === 'BUY' ? 'badge-profit' : 'badge-loss'}>
                    {entry.side}
                  </span>
                </td>
                <td className="px-5 py-3 mono text-xs text-text-primary">{entry.qty}</td>
                <td className="px-5 py-3 mono text-xs text-text-primary">
                  ₹{Number(entry.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-3 border-t border-border flex items-center justify-between">
        <span className="mono text-xs text-text-muted">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="mono text-xs text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed tracking-wider"
          >
            ← PREV
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="mono text-xs text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed tracking-wider"
          >
            NEXT →
          </button>
        </div>
      </div>
    </div>
  )
}

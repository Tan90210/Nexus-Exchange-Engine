import StatCard from './StatCard'
import AuditFeed from './AuditFeed'
import { mockSystemHealth, mockActiveLocks } from '../mock/data'

export default function AdminView() {
  // Swap: const { data: health } = useQuery('health', () => api.get('/api/admin/health'))
  const health = mockSystemHealth
  // Swap: const { data: locks } = useQuery('locks', () => api.get('/api/admin/locks'))
  const locks = mockActiveLocks

  return (
    <div className="space-y-6">
      {/* System Health */}
      <div>
        <p className="mono text-xs text-text-muted tracking-widest mb-3">SYSTEM HEALTH</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Throughput"
            value={`${health.throughput}/s`}
            subValue="trades per second"
          />
          <StatCard
            label="Deadlocks"
            value={health.deadlockCount.toString()}
            subValue="detected today"
            color={health.deadlockCount > 0 ? 'warn' : 'default'}
          />
          <StatCard
            label="Rollback Rate"
            value={`${health.rollbackRate}%`}
            subValue="of all transactions"
            color={health.rollbackRate > 5 ? 'loss' : 'default'}
          />
          <StatCard
            label="Connections"
            value={`${health.activeConnections} / ${health.maxConnections}`}
            subValue="active pool usage"
            color={health.activeConnections >= health.maxConnections ? 'warn' : 'default'}
          />
        </div>
      </div>

      {/* Locks + Audit side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Locks */}
        <div className="surface rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="mono text-xs text-text-muted tracking-widest">ACTIVE LOCKS</p>
            {locks.length > 0 && (
              <span className="badge-warn">{locks.length} ACTIVE</span>
            )}
          </div>

          {locks.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="mono text-xs text-text-muted tracking-widest">NO ACTIVE LOCKS</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['User', 'Asset', 'Lock Type', 'Duration'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 mono text-xs text-text-muted tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {locks.map((lock, i) => {
                  const isLong = lock.durationMs > 2000
                  return (
                    <tr
                      key={i}
                      className={`border-b border-border ${isLong ? 'bg-warn/5' : ''}`}
                    >
                      <td className={`px-5 py-3 mono text-xs ${isLong ? 'text-warn' : 'text-text-muted'}`}>
                        {lock.user}
                      </td>
                      <td className="px-5 py-3 mono text-xs text-info">{lock.asset}</td>
                      <td className="px-5 py-3 mono text-xs text-text-muted">{lock.lockType}</td>
                      <td className={`px-5 py-3 mono text-xs ${isLong ? 'text-warn' : 'text-text-muted'}`}>
                        {lock.durationMs}ms{isLong ? ' ⚠' : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Audit Feed */}
        <div className="h-80">
          <AuditFeed />
        </div>
      </div>
    </div>
  )
}

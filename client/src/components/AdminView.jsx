import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'
import StatCard from './StatCard'
import AuditFeed from './AuditFeed'

export default function AdminView() {
  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/api/admin/stats').then(r => r.data),
    refetchInterval: 3000
  })

  const locksQuery = useQuery({
    queryKey: ['admin-locks'],
    queryFn: () => api.get('/api/admin/locks').then(r => r.data),
    refetchInterval: 2000
  })

  const stats = statsQuery.data
  const locks = locksQuery.data ?? []
  const isLoading = statsQuery.isLoading || locksQuery.isLoading

  if (isLoading && !stats) return (
    <div className="surface rounded-sm p-8 flex items-center justify-center animate-pulse">
      <span className="mono text-xs text-text-muted">LOADING SYSTEM MONITOR...</span>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* System Health */}
      <div>
        <p className="mono text-xs text-text-muted tracking-widest mb-3">SYSTEM INFRASTRUCTURE</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Service Status"
            value={stats?.status || 'OFFLINE'}
            subValue="express server"
            color={stats?.status === 'HEALTHY' ? 'profit' : 'loss'}
          />
          <StatCard
            label="App Uptime"
            value={`${Math.floor((stats?.uptime || 0) / 60)}m ${Math.floor((stats?.uptime || 0) % 60)}s`}
            subValue="active session"
          />
          <StatCard
            label="Active Pool"
            value={(stats?.connections || 0).toString()}
            subValue="DB connections"
            color={(stats?.connections || 0) > 5 ? 'warn' : 'default'}
          />
          <StatCard
            label="Idle Pool"
            value={(stats?.idleConnections || 0).toString()}
            subValue="available seats"
          />
        </div>
      </div>

      {/* Locks + Audit side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Locks */}
        <div className="surface rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="mono text-xs text-text-muted tracking-widest">DATABASE LOCKS</p>
            {locks.length > 0 && (
              <span className="badge-warn">{locks.length} ACTIVE</span>
            )}
          </div>

          {locks.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="mono text-xs text-text-muted tracking-widest">NO ACTIVE INNODB TRANSACTIONS</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['TRX ID', 'State', 'Started', 'Query'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 mono text-xs text-text-muted tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {locks.map((lock, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-5 py-3 mono text-xs text-text-muted font-medium">
                      {lock.trx_id}
                    </td>
                    <td className="px-5 py-3 mono text-xs">
                      <span className="badge-warn">{lock.trx_state}</span>
                    </td>
                    <td className="px-5 py-3 mono text-xs text-text-muted">
                      {new Date(lock.trx_started).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3 mono text-xs text-info truncate max-w-[150px]" title={lock.trx_query}>
                      {lock.trx_query || 'COMMIT/WAITING'}
                    </td>
                  </tr>
                ))}
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

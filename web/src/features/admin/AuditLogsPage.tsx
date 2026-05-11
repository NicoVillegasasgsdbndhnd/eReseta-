import DataTable, { type Column } from '@/components/common/DataTable'
import PageHeader from '@/components/common/PageHeader'
import { mockAuditLogs } from '@/mocks/data'
import type { ActivityLog } from '@/mocks/types'

const ACTION_COLORS: Record<string, string> = {
  CREATE:  'bg-emerald-50 text-emerald-700',
  UPDATE:  'bg-blue-50 text-blue-700',
  DELETE:  'bg-red-50 text-red-600',
  VERIFY:  'bg-indigo-50 text-indigo-700',
  DISPENSE:'bg-purple-50 text-purple-700',
  VIEW:    'bg-slate-100 text-slate-500',
}

const columns: Column<ActivityLog>[] = [
  {
    key: 'user',
    header: 'User',
    render: (row) => (
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
          {row.user?.name?.charAt(0) ?? '?'}
        </div>
        <div>
          <p className="font-semibold text-slate-700 text-sm">{row.user?.name ?? `User #${row.user_id}`}</p>
          <p className="text-xs text-slate-400 font-mono">{row.ip_address}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'action',
    header: 'Action',
    render: (row) => (
      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${ACTION_COLORS[row.action] ?? 'bg-slate-100 text-slate-600'}`}>
        {row.action}
      </span>
    ),
  },
  {
    key: 'target',
    header: 'Target',
    render: (row) => (
      <div>
        <p className="text-sm text-slate-700 font-medium">{row.target_type}</p>
        <p className="text-xs text-slate-400">{row.target_id > 0 ? `#${row.target_id}` : 'System'}</p>
      </div>
    ),
  },
  {
    key: 'timestamp',
    header: 'Timestamp',
    render: (row) => (
      <div>
        <p className="text-sm text-slate-700">
          {new Date(row.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
        </p>
        <p className="text-xs text-slate-400">
          {new Date(row.created_at).toLocaleTimeString('en-PH', { timeStyle: 'medium' })}
        </p>
      </div>
    ),
  },
]

export default function AuditLogsPage() {
  const sortedLogs = [...mockAuditLogs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Complete system activity log for security and compliance monitoring"
      />

      {/* Summary strip */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {Object.entries(ACTION_COLORS).map(([action, color]) => {
          const count = mockAuditLogs.filter((l) => l.action === action).length
          if (count === 0) return null
          return (
            <div key={action} className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-1.5 shadow-sm" style={{ border: '1px solid hsl(214 20% 90%)' }}>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${color}`}>{action}</span>
              <span className="text-xs font-semibold text-slate-700">{count}</span>
            </div>
          )
        })}
      </div>

      <DataTable<ActivityLog>
        data={sortedLogs}
        columns={columns}
        searchPlaceholder="Search by user, action, or resource…"
        searchFn={(row, q) =>
          (row.user?.name ?? '').toLowerCase().includes(q) ||
          row.action.toLowerCase().includes(q) ||
          row.target_type.toLowerCase().includes(q) ||
          row.ip_address.toLowerCase().includes(q)
        }
        emptyMessage="No audit log entries found."
      />
    </>
  )
}

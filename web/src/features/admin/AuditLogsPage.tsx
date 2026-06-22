import { useState, useMemo } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAuditLogs } from '@/features/dashboard/queries'
import type { ActivityLog } from '@/mocks/types'

type TabRole = 'patient' | 'doctor' | 'pharmacist' | 'staff'

const TABS: {
  role: TabRole
  label: string
  color: string
  avatarBg: string
  avatarText: string
}[] = [
  { role: 'patient',    label: 'Patient',    color: 'hsl(201 100% 36%)', avatarBg: 'hsl(201 60% 92%)', avatarText: 'hsl(201 100% 28%)' },
  { role: 'doctor',     label: 'Doctor',     color: 'hsl(258 80% 56%)',  avatarBg: 'hsl(258 60% 93%)', avatarText: 'hsl(258 80% 38%)' },
  { role: 'pharmacist', label: 'Pharmacist', color: 'hsl(152 50% 38%)',  avatarBg: 'hsl(152 50% 90%)', avatarText: 'hsl(152 50% 26%)' },
  { role: 'staff',      label: 'Staff',      color: 'hsl(27 90% 50%)',   avatarBg: 'hsl(27 90% 92%)',  avatarText: 'hsl(27 90% 32%)' },
]

const ACTION_META: Record<string, { bg: string; color: string }> = {
  CREATE:      { bg: 'bg-emerald-50', color: 'text-emerald-700' },
  UPDATE:      { bg: 'bg-blue-50',    color: 'text-blue-700'    },
  DELETE:      { bg: 'bg-red-50',     color: 'text-red-600'     },
  READ:        { bg: 'bg-slate-100',  color: 'text-slate-600'   },
  BREAK_GLASS: { bg: 'bg-rose-50',    color: 'text-rose-600'    },
}

const SUMMARY_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'READ', 'BREAK_GLASS'] as const

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function actionSummary(logs: ActivityLog[]) {
  return SUMMARY_ACTIONS
    .map((a) => ({ action: a as string, count: logs.filter((l) => l.action === a).length }))
    .filter((a) => a.count > 0)
}

export default function AuditLogsPage() {
  const [activeTab, setActiveTab]         = useState<TabRole>('patient')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  const { data, isLoading } = useAuditLogs()

  const allLogs = useMemo(
    () =>
      (data?.data ?? [])
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [data],
  )

  // Group logs by user for the active role tab
  const usersForRole = useMemo(() => {
    const map = new Map<number, { name: string; logs: ActivityLog[] }>()
    allLogs
      .filter((l) => l.user?.role === activeTab)
      .forEach((log) => {
        if (!map.has(log.user_id)) {
          map.set(log.user_id, { name: log.user?.name ?? `User #${log.user_id}`, logs: [] })
        }
        map.get(log.user_id)!.logs.push(log)
      })
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }))
  }, [allLogs, activeTab])

  const activeTabMeta = TABS.find((t) => t.role === activeTab)!

  // Logs for the drilled-in user
  const selectedUserData = selectedUserId !== null
    ? usersForRole.find((u) => u.id === selectedUserId) ?? null
    : null

  function handleTabChange(role: TabRole) {
    setActiveTab(role)
    setSelectedUserId(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          System activity log by role for security and compliance monitoring
        </p>
      </div>

      {/* ── Role tab cards ── */}
      <div className="grid grid-cols-4 gap-3">
        {TABS.map((tab) => {
          const count = allLogs.filter((l) => l.user?.role === tab.role).length
          const isActive = activeTab === tab.role
          return (
            <button
              key={tab.role}
              onClick={() => handleTabChange(tab.role)}
              className="bg-white rounded-xl px-5 py-4 text-left transition-all hover:shadow-md"
              style={{
                border: isActive ? `2px solid ${tab.color}` : '1px solid hsl(210 18% 88%)',
                backgroundColor: isActive ? `color-mix(in srgb, ${tab.color} 6%, white)` : 'white',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: tab.avatarBg, color: tab.avatarText }}
                >
                  {tab.label.charAt(0)}
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isActive
                      ? `color-mix(in srgb, ${tab.color} 12%, white)`
                      : 'hsl(210 14% 95%)',
                    color: isActive ? tab.color : 'hsl(215 16% 55%)',
                  }}
                >
                  {count}
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: isActive ? tab.color : 'hsl(215 30% 22%)' }}>
                {tab.label}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {count === 1 ? '1 log entry' : `${count} log entries`}
              </p>
            </button>
          )
        })}
      </div>

      {/* ── Content panel ── */}
      {selectedUserData === null ? (
        /* ── User list for active role ── */
        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          {/* Panel header */}
          <div
            className="px-5 py-3.5 flex items-center justify-between"
            style={{ borderBottom: '1px solid hsl(210 18% 93%)', backgroundColor: 'hsl(210 14% 98%)' }}
          >
            <p className="text-sm font-semibold text-slate-700">
              {activeTabMeta.label}s
            </p>
            <span className="text-xs text-slate-400">{usersForRole.length} user{usersForRole.length !== 1 ? 's' : ''}</span>
          </div>

          {usersForRole.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-semibold text-slate-500">No {activeTabMeta.label.toLowerCase()} activity yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Actions performed by {activeTabMeta.label.toLowerCase()} accounts will appear here.
              </p>
            </div>
          ) : (
            <div>
              {usersForRole.map((user, i) => {
                const summary = actionSummary(user.logs)
                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                    style={{
                      borderBottom:
                        i < usersForRole.length - 1 ? '1px solid hsl(210 18% 93%)' : 'none',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ backgroundColor: activeTabMeta.avatarBg, color: activeTabMeta.avatarText }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Name + action summary */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {summary.map(({ action, count }) => {
                          const meta = ACTION_META[action]
                          return (
                            <span
                              key={action}
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}
                            >
                              {action} {count}
                            </span>
                          )
                        })}
                      </div>
                    </div>

                    {/* Total count + arrow cue */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-700">{user.logs.length}</p>
                      <p className="text-xs text-slate-400">entries</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── Individual user log detail ── */
        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          {/* Detail header */}
          <div
            className="px-5 py-3.5 flex items-center gap-3"
            style={{ borderBottom: '1px solid hsl(210 18% 93%)', backgroundColor: 'hsl(210 14% 98%)' }}
          >
            <button
              onClick={() => setSelectedUserId(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <span className="text-slate-300">|</span>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: activeTabMeta.avatarBg, color: activeTabMeta.avatarText }}
            >
              {selectedUserData.name.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm font-semibold text-slate-700 flex-1 truncate">{selectedUserData.name}</p>
            <div className="flex items-center gap-2">
              {actionSummary(selectedUserData.logs).map(({ action, count }) => {
                const meta = ACTION_META[action]
                return (
                  <span key={action} className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                    {action} {count}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Log table header */}
          <div
            className="grid px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide"
            style={{
              gridTemplateColumns: '1fr 90px 180px 100px 110px',
              borderBottom: '1px solid hsl(210 18% 93%)',
              backgroundColor: 'hsl(210 14% 98%)',
            }}
          >
            <span>User</span>
            <span>Action</span>
            <span>Target</span>
            <span>IP Address</span>
            <span className="text-right">Time</span>
          </div>

          {/* Log rows */}
          {selectedUserData.logs.map((log, i) => {
            const meta = ACTION_META[log.action] ?? { bg: 'bg-slate-100', color: 'text-slate-600' }
            return (
              <div
                key={log.id}
                style={{ borderBottom: i < selectedUserData.logs.length - 1 ? '1px solid hsl(210 18% 93%)' : 'none' }}
              >
              <div
                className="grid items-center px-5 py-3.5 hover:bg-slate-50 transition-colors"
                style={{ gridTemplateColumns: '1fr 90px 180px 100px 110px' }}
              >
                {/* User */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: activeTabMeta.avatarBg, color: activeTabMeta.avatarText }}
                  >
                    {selectedUserData.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-700 text-sm truncate">{selectedUserData.name}</p>
                    <p className="text-xs text-slate-400">{activeTabMeta.label}</p>
                  </div>
                </div>

                {/* Action */}
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase w-fit ${meta.bg} ${meta.color}`}>
                  {log.action}
                </span>

                {/* Target */}
                <div>
                  <p className="text-sm text-slate-700 font-medium">{log.target_type}</p>
                  <p className="text-xs text-slate-400">{log.target_id > 0 ? `#${log.target_id}` : 'System'}</p>
                </div>

                {/* IP */}
                <p className="text-xs text-slate-400 font-mono">{log.ip_address ?? '—'}</p>

                {/* Timestamp */}
                <div className="text-right">
                  <p className="text-sm text-slate-700">
                    {new Date(log.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                  </p>
                  <p className="text-xs text-slate-400">{timeAgo(log.created_at)}</p>
                </div>
              </div>
              {log.context && (
                <p className="px-5 pb-3 -mt-1 text-xs text-rose-600 flex items-start gap-1.5">
                  <span className="font-semibold shrink-0">Justification:</span>
                  <span className="italic">{log.context}</span>
                </p>
              )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

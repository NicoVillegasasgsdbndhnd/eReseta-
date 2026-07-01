import { useState, useMemo } from 'react'
import { ArrowLeft, ArrowRight, Loader2, ScrollText, Search, ShieldAlert } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAuditLogs } from '@/features/dashboard/queries'
import type { ActivityLog } from '@/mocks/types'

const INK = 'hsl(215 30% 14%)'
const BORDER = 'hsl(210 18% 88%)'

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

const ACTION_META: Record<string, { bg: string; color: string; label: string }> = {
  CREATE:           { bg: 'bg-emerald-50', color: 'text-emerald-700', label: 'Create' },
  UPDATE:           { bg: 'bg-blue-50',    color: 'text-blue-700',    label: 'Update' },
  DELETE:           { bg: 'bg-red-50',     color: 'text-red-600',     label: 'Delete' },
  READ:             { bg: 'bg-slate-100',  color: 'text-slate-600',   label: 'Read' },
  BREAK_GLASS:      { bg: 'bg-rose-50',    color: 'text-rose-600',    label: 'Break-Glass' },
  READ_BREAK_GLASS: { bg: 'bg-rose-50',    color: 'text-rose-600',    label: 'Break-Glass Read' },
  CONSENT_GIVEN:    { bg: 'bg-teal-50',    color: 'text-teal-700',    label: 'Consent Given' },
  CONSENT_WITHDRAWN:{ bg: 'bg-amber-50',   color: 'text-amber-700',   label: 'Consent Withdrawn' },
  TERMS_ACCEPTED:   { bg: 'bg-slate-100',  color: 'text-slate-600',   label: 'Terms Accepted' },
}

/** Prettify any action to a clean label (falls back to Title-Casing unknown codes). */
function actionLabel(action: string): string {
  return ACTION_META[action]?.label ?? action.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Security-sensitive actions get extra visual weight in the audit trail.
const SENSITIVE_ACTIONS = new Set(['BREAK_GLASS', 'READ_BREAK_GLASS', 'DELETE'])

const SUMMARY_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'READ', 'BREAK_GLASS', 'READ_BREAK_GLASS'] as const

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
  const [activeTab, setActiveTab]           = useState<TabRole>('patient')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [search, setSearch]                 = useState('')

  const { data, isLoading } = useAuditLogs()

  const allLogs = useMemo(
    () =>
      (data?.data ?? [])
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [data],
  )

  const sensitiveCount = allLogs.filter((l) => SENSITIVE_ACTIONS.has(l.action)).length

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

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return usersForRole
    return usersForRole.filter((u) => u.name.toLowerCase().includes(q))
  }, [usersForRole, search])

  const activeTabMeta = TABS.find((t) => t.role === activeTab)!

  // Logs for the drilled-in user
  const selectedUserData = selectedUserId !== null
    ? usersForRole.find((u) => u.id === selectedUserId) ?? null
    : null

  function handleTabChange(role: TabRole) {
    setActiveTab(role)
    setSelectedUserId(null)
    setSearch('')
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
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: 'hsl(215 30% 14% / 0.06)' }}>
            <ScrollText size={22} style={{ color: INK }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>Audit Logs</h1>
            <p className="mt-0.5 text-sm text-slate-500">Immutable activity trail by role — for security and compliance monitoring.</p>
          </div>
        </div>
        {sensitiveCount > 0 && (
          <span className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2 text-sm font-bold text-rose-600 ring-1 ring-rose-100">
            <ShieldAlert size={16} />
            {sensitiveCount} sensitive event{sensitiveCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* ── Role filter ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TABS.map((tab) => {
          const count = allLogs.filter((l) => l.user?.role === tab.role).length
          const isActive = activeTab === tab.role
          return (
            <button
              key={tab.role}
              onClick={() => handleTabChange(tab.role)}
              className="flex items-center gap-2.5 rounded-xl bg-white px-4 py-3 text-left shadow-sm transition-all hover:shadow-md"
              style={{
                border: isActive ? `1.5px solid ${tab.color}` : `1px solid ${BORDER}`,
                backgroundColor: isActive ? `color-mix(in srgb, ${tab.color} 6%, white)` : 'white',
              }}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tab.color }} />
              <span className="flex-1 text-sm font-bold" style={{ color: isActive ? tab.color : 'hsl(215 30% 22%)' }}>
                {tab.label}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-black tabular-nums"
                style={{
                  backgroundColor: isActive ? `color-mix(in srgb, ${tab.color} 14%, white)` : 'hsl(210 14% 95%)',
                  color: isActive ? tab.color : 'hsl(215 16% 55%)',
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Content panel ── */}
      {selectedUserData === null ? (
        /* ── User list for active role ── */
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
          {/* Panel header + search */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
            style={{ borderBottom: '1px solid hsl(210 18% 93%)', backgroundColor: 'hsl(210 14% 98%)' }}
          >
            <p className="text-sm font-bold text-slate-700">
              {activeTabMeta.label}s
              <span className="ml-2 text-xs font-medium text-slate-400">{usersForRole.length} user{usersForRole.length !== 1 ? 's' : ''}</span>
            </p>
            {usersForRole.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${activeTabMeta.label.toLowerCase()}s…`}
                  className="h-9 bg-white pl-9 text-sm"
                />
              </div>
            )}
          </div>

          {usersForRole.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <ScrollText size={26} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-600">No {activeTabMeta.label.toLowerCase()} activity yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Actions performed by {activeTabMeta.label.toLowerCase()} accounts will appear here.
              </p>
            </div>
          ) : visibleUsers.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">No {activeTabMeta.label.toLowerCase()}s match “{search}”.</div>
          ) : (
            <div>
              {visibleUsers.map((user, i) => {
                const summary = actionSummary(user.logs)
                const hasSensitive = user.logs.some((l) => SENSITIVE_ACTIONS.has(l.action))
                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                    style={{ borderBottom: i < visibleUsers.length - 1 ? '1px solid hsl(210 18% 93%)' : 'none' }}
                  >
                    {/* Avatar */}
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                      style={{ backgroundColor: activeTabMeta.avatarBg, color: activeTabMeta.avatarText }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Name + action summary */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-slate-800">{user.name}</p>
                        {hasSensitive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                            <ShieldAlert size={10} /> sensitive
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {summary.map(({ action, count }) => {
                          const meta = ACTION_META[action] ?? { bg: 'bg-slate-100', color: 'text-slate-600' }
                          return (
                            <span key={action} className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${meta.bg} ${meta.color}`}>
                              {actionLabel(action)} {count}
                            </span>
                          )
                        })}
                      </div>
                    </div>

                    {/* Total count + arrow cue */}
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-slate-700 tabular-nums">{user.logs.length}</p>
                      <p className="text-xs text-slate-400">entries</p>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-slate-300" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── Individual user log detail ── */
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
          {/* Detail header */}
          <div
            className="flex flex-wrap items-center gap-3 px-5 py-3.5"
            style={{ borderBottom: '1px solid hsl(210 18% 93%)', backgroundColor: 'hsl(210 14% 98%)' }}
          >
            <button
              onClick={() => setSelectedUserId(null)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <span className="text-slate-300">|</span>
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: activeTabMeta.avatarBg, color: activeTabMeta.avatarText }}
            >
              {selectedUserData.name.charAt(0).toUpperCase()}
            </div>
            <p className="flex-1 truncate text-sm font-bold text-slate-700">{selectedUserData.name}</p>
            <div className="flex flex-wrap items-center gap-2">
              {actionSummary(selectedUserData.logs).map(({ action, count }) => {
                const meta = ACTION_META[action] ?? { bg: 'bg-slate-100', color: 'text-slate-600' }
                return (
                  <span key={action} className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.bg} ${meta.color}`}>
                    {actionLabel(action)} {count}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Log table header */}
          <div
            className="hidden px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400 md:grid"
            style={{
              gridTemplateColumns: '1fr 100px 180px 110px 110px',
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
            const sensitive = SENSITIVE_ACTIONS.has(log.action)
            return (
              <div
                key={log.id}
                style={{
                  borderBottom: i < selectedUserData.logs.length - 1 ? '1px solid hsl(210 18% 93%)' : 'none',
                  borderLeft: sensitive ? '3px solid hsl(350 80% 60%)' : '3px solid transparent',
                  backgroundColor: sensitive ? 'hsl(350 100% 99%)' : undefined,
                }}
              >
                <div
                  className="grid grid-cols-2 items-center gap-2 px-5 py-3.5 transition-colors hover:bg-slate-50 md:grid-cols-[1fr_140px_180px_110px_110px] md:gap-0"
                >
                  {/* User */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ backgroundColor: activeTabMeta.avatarBg, color: activeTabMeta.avatarText }}
                    >
                      {selectedUserData.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-700">{selectedUserData.name}</p>
                      <p className="text-xs text-slate-400">{activeTabMeta.label}</p>
                    </div>
                  </div>

                  {/* Action */}
                  <span className={`w-fit whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.bg} ${meta.color}`}>
                    {actionLabel(log.action)}
                  </span>

                  {/* Target */}
                  <div>
                    <p className="text-sm font-medium text-slate-700">{log.target_type}</p>
                    <p className="text-xs text-slate-400">{log.target_id > 0 ? `#${log.target_id}` : 'System'}</p>
                  </div>

                  {/* IP */}
                  <p className="font-mono text-xs text-slate-400">{log.ip_address ?? '—'}</p>

                  {/* Timestamp */}
                  <div className="md:text-right">
                    <p className="text-sm text-slate-700">
                      {new Date(log.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                    </p>
                    <p className="text-xs text-slate-400">{timeAgo(log.created_at)}</p>
                  </div>
                </div>
                {log.context && (
                  <p className="-mt-1 flex items-start gap-1.5 px-5 pb-3 text-xs text-rose-600">
                    <span className="shrink-0 font-semibold">Justification:</span>
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

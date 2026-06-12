import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Link2, Copy, Check, Boxes, Radio } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import { Panel } from '@/features/dashboard/DashboardKit'
import { useBlockchainActivity, type BlockchainEvent } from './queries'

const EVENT_STYLE: Record<string, string> = {
  ISSUED:    'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  VERIFIED:  'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
  DISPENSED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
}

function TxId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable */ }
  }
  return (
    <button
      onClick={copy}
      title={value}
      className="inline-flex items-center gap-1.5 font-mono text-xs text-teal-700 hover:underline"
    >
      <Link2 size={11} />
      {value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value}
      {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} className="text-slate-400" />}
    </button>
  )
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5" style={{ border: '1px solid var(--color-border)' }}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-2xl font-extrabold text-slate-800 tabular-nums mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function BlockchainExplorerPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useBlockchainActivity()

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
  }
  if (isError || !data) {
    return <div className="text-center py-20 text-sm text-red-500">Failed to load blockchain activity.</div>
  }

  const { status, stats, recent } = data
  const online = status.enabled && status.online

  return (
    <>
      <PageHeader
        title="Blockchain Explorer"
        description="Live Hyperledger Fabric ledger activity — prescription lifecycle anchored on-chain"
      />

      {/* Network status banner */}
      <div
        className="rounded-2xl p-5 mb-4 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(195 38% 12%) 0%, hsl(184 44% 16%) 55%, hsl(168 58% 22%) 100%)' }}
      >
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(168 80% 45% / 0.45), transparent 70%)' }} />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.16)' }}>
              <Boxes size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`relative flex h-2.5 w-2.5`}>
                  {online && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${online ? 'bg-emerald-400' : 'bg-red-400'}`} />
                </span>
                <p className="font-display text-lg font-bold leading-none">
                  {online ? 'Network online' : status.enabled ? 'Gateway unreachable' : 'Ledger disabled'}
                </p>
              </div>
              <p className="text-xs text-white/65 mt-1 font-mono">
                {status.channel} · {status.chaincode} · {status.gateway_url}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/70">
            <Radio size={13} /> Live · refreshes every 3s
          </div>
        </div>
      </div>

      {/* Anchoring stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Prescriptions anchored" value={stats.anchored_prescriptions} sub={`of ${stats.total_prescriptions} total`} />
        <StatCard label="Events on-chain" value={stats.anchored_events} sub={`of ${stats.total_events} lifecycle events`} />
        <StatCard label="Pending anchor" value={Math.max(0, stats.total_events - stats.anchored_events)} sub="awaiting ledger write" />
        <StatCard label="Coverage" value={stats.total_events ? `${Math.round((stats.anchored_events / stats.total_events) * 100)}%` : '—'} sub="events anchored" />
      </div>

      {/* Live feed */}
      <Panel title="Live ledger activity">
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No prescription lifecycle events yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((e: BlockchainEvent) => (
              <div key={e.id} className="flex items-center gap-3 py-3 first:pt-0">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 w-24 text-center ${EVENT_STYLE[e.event_type] ?? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}>
                  {e.event_type.toLowerCase()}
                </span>
                <div className="flex-1 min-w-0">
                  {e.prescription_id ? (
                    <button
                      onClick={() => navigate(`/prescriptions/${e.prescription_id}`)}
                      title="View this prescription's blockchain audit trail"
                      className="text-sm font-mono font-semibold text-slate-700 hover:text-teal-700 hover:underline text-left"
                    >
                      {e.reference_no ?? '—'}
                    </button>
                  ) : (
                    <p className="text-sm font-mono font-semibold text-slate-700">{e.reference_no ?? '—'}</p>
                  )}
                  <p className="text-xs text-slate-400 truncate">
                    {e.actor ?? 'system'} · {new Date(e.occurred_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="shrink-0">
                  {e.blockchain_tx_id
                    ? <TxId value={e.blockchain_tx_id} />
                    : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">pending</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          MySQL is the source of truth; the ledger mirrors the issue → verify → dispense lifecycle.
          A <span className="font-semibold text-amber-700">pending</span> event is recorded in the DB and will anchor on-chain once the gateway processes its queued job.
        </p>
      </Panel>
    </>
  )
}

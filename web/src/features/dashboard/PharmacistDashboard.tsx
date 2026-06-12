import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ScrollText, Package, CheckCircle, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '@/features/auth/authStore'
import { useDashboardSummary, usePrescriptionActivity } from './queries'
import { Greeting, ActionRow, StatStrip, Panel, ViewAllLink, TEAL } from './DashboardKit'

const CHART_TOOLTIP_STYLE = { backgroundColor: '#fff', border: '1px solid hsl(40 22% 88%)', borderRadius: '10px', fontSize: '12px' }

export default function PharmacistDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: summary, isLoading } = useDashboardSummary()
  const { data: rxActivity } = usePrescriptionActivity()

  const byStatus = rxActivity?.by_status ?? {}
  const barData = [
    { status: 'Issued', count: byStatus['issued'] ?? 0 },
    { status: 'Verified', count: byStatus['verified'] ?? 0 },
    { status: 'Dispensed', count: byStatus['dispensed'] ?? 0 },
  ]
  const queue = (rxActivity?.recent ?? []).filter((rx) => rx.status === 'issued' || rx.status === 'verified')
  const dispensed = (rxActivity?.recent ?? []).filter((rx) => rx.status === 'dispensed')

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
  }

  return (
    <div className="space-y-8">
      <Greeting name={user?.name} subtitle="here's your pharmacy queue." />

      <ActionRow
        actions={[
          { title: 'Verify queue', subtitle: `${summary?.awaiting_verification ?? 0} awaiting`, icon: ShieldCheck, to: '/verify-queue', primary: true },
          { title: 'Dispense history', subtitle: 'Past dispenses', icon: ScrollText, to: '/dispense-history' },
          { title: 'Medicines', subtitle: 'Manage availability', icon: Package, to: '/medicines' },
        ]}
      />

      <StatStrip
        stats={[
          { label: 'Awaiting verification', value: summary?.awaiting_verification ?? 0, to: '/verify-queue' },
          { label: 'Ready to dispense', value: summary?.ready_to_dispense ?? 0, to: '/verify-queue' },
          { label: 'Dispensed today', value: summary?.dispensed_today ?? 0, to: '/dispense-history' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Prescription status overview">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={36}>
              <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'hsl(168 79% 37% / 0.06)' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill={TEAL} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Verification queue" action={<ViewAllLink label="View queue" onClick={() => navigate('/verify-queue')} />}>
          {queue.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle size={24} className="mx-auto mb-2 text-emerald-400" />
              <p className="text-sm text-slate-500">Queue is empty — all clear!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {queue.slice(0, 5).map((rx, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-semibold text-slate-700">{rx.reference_no}</p>
                    <p className="text-xs text-slate-500 truncate">{rx.patient}</p>
                  </div>
                  {rx.status === 'issued' ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Pending</span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'hsl(168 79% 37% / 0.12)', color: TEAL }}>Ready</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Recent dispenses" action={<ViewAllLink onClick={() => navigate('/dispense-history')} />}>
        {dispensed.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No dispenses yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {dispensed.slice(0, 4).map((rx, i) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono font-semibold text-slate-700">{rx.reference_no}</p>
                  <p className="text-xs text-slate-500">{rx.patient}</p>
                </div>
                <p className="text-xs text-slate-500">{new Date(rx.issued_at).toLocaleDateString('en-PH', { dateStyle: 'short' })}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, ClipboardList, Pill, Loader2 } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import { useDashboardSummary, usePrescriptionActivity } from './queries'
import { useAppointments } from '@/features/appointments/queries'
import { useAllPatientRecords } from '@/features/patients/queries'
import { useAuthStore } from '@/features/auth/authStore'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  sub?: string
  subColor?: string
  chip?: string
  chipColor?: string
  onClick?: () => void
}

function KpiCard({ icon, label, value, sub, subColor = 'hsl(215 16% 55%)', chip, chipColor, onClick }: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm p-5 relative overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      style={{ border: '1px solid hsl(210 18% 88%)' }}
    >
      {chip && (
        <span
          className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full border"
          style={chipColor
            ? { backgroundColor: chipColor + '15', color: chipColor, borderColor: chipColor + '30' }
            : { backgroundColor: 'hsl(210 14% 95%)', color: 'hsl(215 16% 55%)', borderColor: 'hsl(210 18% 88%)' }}
        >
          {chip}
        </span>
      )}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 opacity-20">{icon}</div>
        <div>
          <p className="text-3xl font-bold" style={{ color: 'hsl(215 30% 14%)' }}>{value}</p>
          <p className="text-xs mt-1" style={{ color: 'hsl(215 16% 50%)' }}>{label}</p>
          {sub && <p className="text-xs mt-0.5 font-medium" style={{ color: subColor }}>{sub}</p>}
        </div>
      </div>
    </div>
  )
}

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: summary, isLoading } = useDashboardSummary()
  const { data: rxActivity } = usePrescriptionActivity()
  const { data: apptData } = useAppointments()
  const { data: recordsData } = useAllPatientRecords()

  const appointments = apptData?.data ?? []
  const upcoming = appointments
    .filter((a) => a.status === 'scheduled' || a.status === 'confirmed')
    .slice(0, 5)

  const recentConsultations = (recordsData?.data ?? []).slice(0, 3)

  const dateStr = new Date().toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  })
  const lastName = user?.name.split(' ').pop() ?? user?.name ?? 'Doctor'

  const rxIssued = rxActivity?.by_status?.issued ?? (summary?.prescriptions_issued ?? 0)
  const pendingApprovals = summary?.pending_verifications ?? summary?.pending_appointments ?? 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Greeting header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
            {greeting()}, Dr. {lastName}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(215 16% 45%)' }}>
            {dateStr} · DEAMHI
          </p>
        </div>
        <button
          onClick={() => navigate('/consultations')}
          className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg shadow-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'hsl(201 100% 36%)' }}
        >
          Start consultation
        </button>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          icon={<Calendar size={28} className="text-blue-500" />}
          label="Today's appointments"
          value={summary?.todays_appointments ?? appointments.filter((a) => {
            const today = new Date().toDateString()
            return new Date(a.scheduled_at).toDateString() === today
          }).length}
          sub={upcoming.length === 0 ? '— None scheduled' : `${upcoming.length} upcoming`}
          chip="Today"
          onClick={() => navigate('/appointments')}
        />
        <KpiCard
          icon={<ClipboardList size={28} className="text-amber-500" />}
          label="Pending approvals"
          value={pendingApprovals}
          sub={pendingApprovals > 0 ? '⚠ Needs review' : 'All clear'}
          subColor={pendingApprovals > 0 ? 'hsl(38 92% 50%)' : 'hsl(152 50% 38%)'}
          chip={pendingApprovals > 0 ? 'Action' : undefined}
          chipColor={pendingApprovals > 0 ? 'hsl(38 92% 50%)' : undefined}
          onClick={() => navigate('/appointments')}
        />
        <KpiCard
          icon={<Pill size={28} className="text-cyan-500" />}
          label="Prescriptions issued"
          value={rxIssued}
          sub="↑ vs yesterday"
          subColor="hsl(152 50% 38%)"
          onClick={() => navigate('/prescriptions')}
        />
      </div>

      {/* ── Two-column ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming appointments */}
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: 'hsl(215 30% 14%)' }}>Upcoming appointments</p>
            <button
              onClick={() => navigate('/appointments')}
              className="text-xs font-medium hover:underline"
              style={{ color: 'hsl(201 100% 36%)' }}
            >
              View all
            </button>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'hsl(215 16% 55%)' }}>
              No upcoming appointments.
            </p>
          ) : (
            <div className="space-y-1">
              {upcoming.map((a) => (
                <div
                  key={a.id}
                  onClick={() => navigate(`/appointments/${a.id}`)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 30%)' }}
                  >
                    {(a.patient?.user?.name ?? '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'hsl(215 30% 14%)' }}>
                      {a.patient?.user?.name}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(215 16% 50%)' }}>
                      {new Date(a.scheduled_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent consultations */}
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: 'hsl(215 30% 14%)' }}>Recent consultations</p>
            <button
              onClick={() => navigate('/consultations')}
              className="text-xs font-medium hover:underline"
              style={{ color: 'hsl(201 100% 36%)' }}
            >
              View all
            </button>
          </div>
          {recentConsultations.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'hsl(215 16% 55%)' }}>
              No consultations yet.
            </p>
          ) : (
            <div className="space-y-1">
              {recentConsultations.map((r) => (
                <div
                  key={r.id}
                  onClick={() => navigate(`/patients/${r.patient_id}`)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 30%)' }}
                  >
                    {(r.patient?.user?.name ?? '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'hsl(215 30% 14%)' }}>
                      {r.patient?.user?.name}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(215 16% 50%)' }}>
                      {new Date(r.visit_date).toLocaleDateString('en-PH', { dateStyle: 'medium' })} · {r.diagnosis}
                    </p>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: 'hsl(201 60% 92%)', color: 'hsl(201 100% 30%)' }}
                  >
                    1 visit
                  </span>
                </div>
              ))}
            </div>
          )}
          {pendingApprovals > 0 && (
            <p className="text-xs mt-4 pt-3" style={{ borderTop: '1px solid hsl(210 18% 93%)', color: 'hsl(38 80% 50%)' }}>
              {pendingApprovals} pending approval{pendingApprovals !== 1 ? 's' : ''} waiting
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

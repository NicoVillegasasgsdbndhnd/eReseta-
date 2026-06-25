import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Calendar,
  ClipboardList,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  Pill,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import { useDashboardSummary, usePrescriptionActivity } from './queries'
import { useAppointments } from '@/features/appointments/queries'
import { useAllPatientRecords } from '@/features/patients/queries'
import { useAuthStore } from '@/features/auth/authStore'
import type { Appointment, PatientRecord } from '@/mocks/types'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function patientDisplayName(appt: Appointment): string {
  return appt.display_name ?? appt.patient?.user?.name ?? appt.guest_name ?? (appt.patient_id ? `Patient #${appt.patient_id}` : 'Guest patient')
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getVisitWindow(value: string) {
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60000)
  if (minutes < -60) return 'Visit time passed'
  if (minutes < 0) return 'Starting now'
  if (minutes < 60) return `${Math.max(minutes, 0)} min left`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} left`

  const days = Math.round(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} left`
}

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  sub: string
  tone: 'blue' | 'emerald' | 'amber' | 'violet'
  onClick?: () => void
}

const KPI_TONES: Record<KpiCardProps['tone'], { bg: string; fg: string }> = {
  blue: { bg: 'hsl(201 80% 94%)', fg: 'hsl(201 100% 34%)' },
  emerald: { bg: 'hsl(152 55% 94%)', fg: 'hsl(152 58% 32%)' },
  amber: { bg: 'hsl(42 100% 94%)', fg: 'hsl(35 92% 42%)' },
  violet: { bg: 'hsl(260 70% 95%)', fg: 'hsl(260 55% 48%)' },
}

function KpiCard({ icon, label, value, sub, tone, onClick }: KpiCardProps) {
  const colors = KPI_TONES[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl bg-white p-4 text-left shadow-sm transition-all ${onClick ? 'hover:-translate-y-0.5 hover:shadow-md' : ''}`}
      style={{ border: '1px solid hsl(210 18% 88%)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: colors.bg, color: colors.fg }}
        >
          {icon}
        </span>
        <span className="text-right">
          <span className="block text-2xl font-bold leading-none tabular-nums" style={{ color: 'hsl(215 30% 14%)' }}>
            {value}
          </span>
          <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 52%)' }}>
            {label}
          </span>
        </span>
      </div>
      <p className="mt-3 truncate text-xs" style={{ color: 'hsl(215 16% 48%)' }}>
        {sub}
      </p>
    </button>
  )
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl bg-slate-50 px-4 py-8 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
        {icon}
      </span>
      <p className="text-sm font-bold" style={{ color: 'hsl(215 30% 14%)' }}>{title}</p>
      <p className="mt-1 max-w-xs text-xs" style={{ color: 'hsl(215 16% 52%)' }}>{subtitle}</p>
    </div>
  )
}

function QueueRow({ appointment }: { appointment: Appointment }) {
  const navigate = useNavigate()
  const patientName = patientDisplayName(appointment)
  const isGuest = appointment.is_guest ?? appointment.patient_id === null
  const canStart = !!appointment.patient_id

  return (
    <div
      className="grid gap-3 rounded-xl bg-white p-3 shadow-sm transition-all hover:shadow-md md:grid-cols-[minmax(0,1.2fr)_140px_120px_auto]"
      style={{ border: '1px solid hsl(210 18% 88%)' }}
    >
      <button
        type="button"
        onClick={() => navigate(`/appointments/${appointment.id}`)}
        className="flex min-w-0 items-center gap-3 text-left"
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 30%)' }}
        >
          {patientName.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
            {patientName}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs" style={{ color: 'hsl(215 16% 50%)' }}>
            {appointment.type === 'follow_up' ? 'Follow-up' : 'Consultation'}
            {isGuest && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Guest
              </span>
            )}
          </span>
        </span>
      </button>

      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'hsl(215 30% 14%)' }}>
        <Clock3 size={16} className="text-sky-700" />
        {formatTime(appointment.scheduled_at)}
      </div>

      <div className="flex items-center">
        <StatusBadge status={appointment.status} cancelledBy={appointment.cancelled_by} />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => navigate(`/appointments/${appointment.id}`)}
          className="rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-slate-50"
          style={{ color: 'hsl(201 100% 34%)' }}
        >
          View
        </button>
        <button
          type="button"
          onClick={() => canStart ? navigate('/consultations', { state: { patientId: appointment.patient_id } }) : navigate(`/appointments/${appointment.id}`)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'hsl(201 100% 36%)' }}
        >
          {canStart ? 'Start' : 'Review'}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

function ConsultationRow({ record }: { record: PatientRecord }) {
  const navigate = useNavigate()
  const patientName = record.patient?.user?.name ?? `Patient #${record.patient_id}`

  return (
    <button
      type="button"
      onClick={() => navigate(`/patients/${record.patient_id}`)}
      className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-slate-50"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
        style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 30%)' }}
      >
        {patientName.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
          {patientName}
        </span>
        <span className="mt-0.5 block truncate text-xs" style={{ color: 'hsl(215 16% 50%)' }}>
          {formatDate(record.visit_date)} - {record.diagnosis || 'No diagnosis recorded'}
        </span>
      </span>
      <ArrowRight size={15} className="shrink-0 text-slate-300" />
    </button>
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
  const todayStr = new Date().toDateString()
  const todays = appointments
    .filter((a) =>
      new Date(a.scheduled_at).toDateString() === todayStr &&
      a.status !== 'served' &&
      a.status !== 'cancelled',
    )
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  const nextAppointment = todays[0]
  const recentConsultations = (recordsData?.data ?? []).slice(0, 4)
  const dateStr = new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const lastName = user?.name.split(' ').pop() ?? user?.name ?? 'Doctor'
  const specialization = user?.doctor?.specialization ?? 'Physician'
  const department = user?.doctor?.hospital_department ?? 'DEAMHI Hospital'
  const rxIssued = rxActivity?.by_status?.issued ?? (summary?.prescriptions_issued ?? 0)
  const pendingApprovals = summary?.pending_verifications ?? summary?.pending_appointments ?? 0
  const waitingCount = todays.filter((a) => ['scheduled', 'confirmed', 'rescheduled'].includes(a.status)).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div
        className="overflow-hidden rounded-xl bg-white shadow-sm"
        style={{ border: '1px solid hsl(210 18% 88%)' }}
      >
        <div
          className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]"
          style={{ background: 'linear-gradient(135deg, hsl(201 100% 36%) 0%, hsl(205 92% 30%) 58%, hsl(152 48% 35%) 100%)' }}
        >
          <div className="min-w-0 text-white">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
              <ShieldCheck size={14} />
              Doctor dashboard
            </div>
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
              {greeting()}, Dr. {lastName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm" style={{ color: 'rgba(255,255,255,0.78)' }}>
              {dateStr} - {specialization} - {department}
            </p>
            <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => navigate('/consultations')}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90"
                style={{ color: 'hsl(201 100% 34%)' }}
              >
                <Stethoscope size={16} />
                Start consultation
              </button>
              <button
                type="button"
                onClick={() => navigate('/appointments')}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}
              >
                <Calendar size={16} />
                View schedule
              </button>
              <button
                type="button"
                onClick={() => navigate('/records')}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}
              >
                <FileText size={16} />
                Patient records
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'hsl(215 16% 48%)' }}>
              Next in queue
            </p>
            {nextAppointment ? (
              <div className="mt-4">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold"
                    style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 30%)' }}
                  >
                    {patientDisplayName(nextAppointment).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
                      {patientDisplayName(nextAppointment)}
                    </p>
                    <p className="text-sm" style={{ color: 'hsl(215 16% 48%)' }}>
                      {formatTime(nextAppointment.scheduled_at)} - {getVisitWindow(nextAppointment.scheduled_at)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/appointments/${nextAppointment.id}`)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'hsl(201 100% 36%)' }}
                >
                  Open visit
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-slate-50 p-5 text-center">
                <Clock3 size={24} className="mx-auto text-slate-300" />
                <p className="mt-2 text-sm font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
                  No active queue
                </p>
                <p className="mt-1 text-xs" style={{ color: 'hsl(215 16% 52%)' }}>
                  Your next patient will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Calendar size={20} />}
          label="Today"
          value={summary?.todays_appointments ?? todays.length}
          sub={todays.length === 0 ? 'No patients scheduled' : `${waitingCount} waiting in queue`}
          tone="blue"
          onClick={() => navigate('/appointments')}
        />
        <KpiCard
          icon={<Users size={20} />}
          label="Queue"
          value={waitingCount}
          sub={nextAppointment ? `Next: ${formatTime(nextAppointment.scheduled_at)}` : 'No active visit'}
          tone="emerald"
          onClick={() => navigate('/appointments')}
        />
        <KpiCard
          icon={<ClipboardList size={20} />}
          label="Approvals"
          value={pendingApprovals}
          sub={pendingApprovals > 0 ? 'Needs review' : 'All clear'}
          tone="amber"
          onClick={() => navigate('/appointments')}
        />
        <KpiCard
          icon={<Pill size={20} />}
          label="Rx issued"
          value={rxIssued}
          sub="Total prescriptions"
          tone="violet"
          onClick={() => navigate('/prescriptions')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)] xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <section
          className="rounded-xl bg-white p-5 shadow-sm"
          style={{ border: '1px solid hsl(210 18% 88%)' }}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
                Today's patient queue
              </p>
              <p className="mt-1 text-xs" style={{ color: 'hsl(215 16% 50%)' }}>
                Open visit details, review guest bookings, or begin consultations from one list.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/appointments')}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-slate-50"
              style={{ color: 'hsl(201 100% 34%)' }}
            >
              Full schedule
            </button>
          </div>

          {todays.length === 0 ? (
            <EmptyState
              icon={<Calendar size={22} />}
              title="No patients scheduled today"
              subtitle="Appointments assigned to you for today will appear here."
            />
          ) : (
            <div className="space-y-2">
              {todays.map((appointment) => (
                <QueueRow key={appointment.id} appointment={appointment} />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4 sm:space-y-5">
          <section
            className="rounded-xl bg-white p-5 shadow-sm"
            style={{ border: '1px solid hsl(210 18% 88%)' }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
                  Recent consultations
                </p>
                <p className="mt-1 text-xs" style={{ color: 'hsl(215 16% 50%)' }}>
                  Latest records you can revisit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/consultations')}
                className="shrink-0 text-xs font-semibold hover:underline"
                style={{ color: 'hsl(201 100% 34%)' }}
              >
                View all
              </button>
            </div>

            {recentConsultations.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={22} />}
                title="No consultations yet"
                subtitle="Completed visit records will show in this area."
              />
            ) : (
              <div className="divide-y" style={{ borderColor: 'hsl(210 18% 93%)' }}>
                {recentConsultations.map((record) => (
                  <ConsultationRow key={record.id} record={record} />
                ))}
              </div>
            )}
          </section>

          <section
            className="rounded-xl bg-white p-5 shadow-sm"
            style={{ border: '1px solid hsl(210 18% 88%)' }}
          >
            <p className="text-base font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
              Clinical shortcuts
            </p>
            <div className="mt-4 grid gap-2">
              {[
                { label: 'Write prescription', icon: Pill, to: '/prescriptions/new' },
                { label: 'Patient records', icon: FileText, to: '/records' },
                { label: 'Availability', icon: Clock3, to: '/appointments/availability' },
                { label: 'Consultations', icon: Stethoscope, to: '/consultations' },
              ].map(({ label, icon: Icon, to }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => navigate(to)}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-slate-100"
                  style={{ color: 'hsl(215 30% 14%)' }}
                >
                  <span className="flex items-center gap-2">
                    <Icon size={16} className="text-sky-700" />
                    {label}
                  </span>
                  <ArrowRight size={15} className="text-slate-400" />
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs" style={{ color: 'hsl(152 58% 30%)' }}>
              <MapPin size={15} />
              DEAMHI Hospital active location
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  Pill,
  Plus,
  Receipt,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import { useDashboardSummary } from './queries'
import { useAppointments } from '@/features/appointments/queries'
import { usePrescriptions } from '@/features/prescriptions/queries'
import { useAuthStore } from '@/features/auth/authStore'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function visitWindow(value: string, nowMs: number) {
  const minutes = Math.round((new Date(value).getTime() - nowMs) / 60000)
  if (minutes < -60) return 'Visit time passed'
  if (minutes < 0) return 'Starting now'
  if (minutes < 60) return `${minutes} min left`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} left`

  const days = Math.round(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} left`
}

export default function PatientDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [nowMs] = useState(() => Date.now())
  const { data: summary, isLoading } = useDashboardSummary()
  const { data: apptData } = useAppointments()
  const { data: rxData } = usePrescriptions()

  const appointments = apptData?.data ?? []
  const prescriptions = rxData?.data ?? []

  const upcomingAppts = appointments
    .filter((a) => a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'rescheduled')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  const activeRx = prescriptions.filter((rx) => rx.status === 'issued' || rx.status === 'verified')
  const nextVisit = upcomingAppts[0]

  const firstName = user?.name.split(' ')[0] ?? 'Patient'
  const dateStr = new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section
        className="overflow-hidden rounded-xl bg-white shadow-sm"
        style={{ border: '1px solid hsl(210 18% 88%)' }}
      >
        <div
          className="grid gap-5 p-6 md:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]"
          style={{ background: 'linear-gradient(135deg, hsl(201 100% 36%) 0%, hsl(205 92% 30%) 58%, hsl(152 48% 35%) 100%)' }}
        >
          <div className="min-w-0 text-white">
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
            >
              <ShieldCheck size={14} />
              Personal health portal
            </div>
            <h1 className="text-3xl font-bold leading-tight">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-2 max-w-xl text-sm" style={{ color: 'rgba(255,255,255,0.76)' }}>
              {dateStr}. Keep your DEAMHI appointments, prescriptions, and visit history in one calm place.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { label: 'Upcoming', value: summary?.upcoming_appointments ?? upcomingAppts.length },
                { label: 'Active Rx', value: activeRx.length },
                { label: 'Pending bills', value: summary?.pending_bills ?? 0 },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg px-4 py-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)' }}
                >
                  <p className="text-2xl font-bold leading-none">{item.value}</p>
                  <p className="mt-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-lg">
            {nextVisit ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Next visit</p>
                    <p className="mt-1 text-xl font-bold leading-tight text-slate-900">
                      {nextVisit.doctor?.user?.name ?? `Doctor #${nextVisit.doctor_id}`}
                    </p>
                    <p className="text-sm text-slate-500">{nextVisit.doctor?.specialization ?? 'Physician'}</p>
                  </div>
                  <StatusBadge status={nextVisit.status} cancelledBy={nextVisit.cancelled_by} />
                </div>
                <div className="space-y-3">
                  {[
                    {
                      icon: CalendarDays,
                      text: new Date(nextVisit.scheduled_at).toLocaleDateString('en-PH', { dateStyle: 'full' }),
                    },
                    {
                      icon: Clock3,
                      text: `${new Date(nextVisit.scheduled_at).toLocaleTimeString('en-PH', { timeStyle: 'short' })} · ${visitWindow(nextVisit.scheduled_at, nowMs)}`,
                    },
                    { icon: MapPin, text: 'DEAMHI Hospital' },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                        <Icon size={16} />
                      </span>
                      <span className="font-medium">{text}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate(`/appointments/${nextVisit.id}`)}
                  className="mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'hsl(201 100% 36%)' }}
                >
                  View visit details
                </button>
              </>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center text-center">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <CalendarDays size={22} />
                </span>
                <p className="text-lg font-bold text-slate-900">No active visit yet</p>
                <p className="mt-1 max-w-xs text-sm text-slate-500">Book a consultation when you are ready.</p>
                <button
                  onClick={() => navigate('/appointments/new')}
                  className="mt-5 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'hsl(201 100% 36%)' }}
                >
                  <Plus size={16} />
                  Book appointment
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: <CalendarDays size={20} />,
            label: 'Appointments',
            value: appointments.length,
            sub: `${upcomingAppts.length} upcoming`,
            path: '/appointments',
            color: 'text-sky-700',
            bg: 'bg-sky-50',
          },
          {
            icon: <Pill size={20} />,
            label: 'Prescriptions',
            value: prescriptions.length,
            sub: `${activeRx.length} active`,
            path: '/prescriptions',
            color: 'text-emerald-700',
            bg: 'bg-emerald-50',
          },
          {
            icon: <Receipt size={20} />,
            label: 'Billing',
            value: summary?.pending_bills ?? 0,
            sub: 'pending payments',
            path: '/profile',
            color: 'text-amber-700',
            bg: 'bg-amber-50',
          },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-4 rounded-xl bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ border: '1px solid hsl(210 18% 88%)' }}
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
              {item.icon}
            </span>
            <span>
              <span className="block text-2xl font-bold leading-none text-slate-900">{item.value}</span>
              <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</span>
              <span className="mt-0.5 block text-xs text-slate-400">{item.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl bg-white p-5 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Upcoming visits</p>
              <p className="text-xs text-slate-500">Your next clinic schedules</p>
            </div>
            <button
              onClick={() => navigate('/appointments/new')}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              <Plus size={14} />
              Book
            </button>
          </div>
          {upcomingAppts.length === 0 ? (
            <div className="rounded-lg bg-slate-50 py-10 text-center">
              <CalendarDays size={24} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-400">No upcoming appointments</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingAppts.slice(0, 4).map((appt) => (
                <button
                  key={appt.id}
                  onClick={() => navigate(`/appointments/${appt.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-50"
                  style={{ border: '1px solid hsl(210 18% 92%)' }}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                    <Stethoscope size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900">{appt.doctor?.user?.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {new Date(appt.scheduled_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </span>
                  <StatusBadge status={appt.status} cancelledBy={appt.cancelled_by} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Recent prescriptions</p>
              <p className="text-xs text-slate-500">Active and recent medicine records</p>
            </div>
            <button
              onClick={() => navigate('/prescriptions')}
              className="text-xs font-semibold text-sky-700 hover:underline"
            >
              View all
            </button>
          </div>
          {prescriptions.length === 0 ? (
            <div className="rounded-lg bg-slate-50 py-10 text-center">
              <Pill size={24} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-400">No prescriptions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prescriptions.slice(0, 4).map((rx) => (
                <button
                  key={rx.id}
                  onClick={() => navigate(`/prescriptions/${rx.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-50"
                  style={{ border: '1px solid hsl(210 18% 92%)' }}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <FileText size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-sm font-bold text-slate-900">{rx.reference_no}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {rx.items.slice(0, 2).map((i) => i.drug_name).join(', ')}
                      {rx.items.length > 2 ? ` +${rx.items.length - 2}` : ''}
                    </span>
                  </span>
                  <StatusBadge status={rx.status} />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

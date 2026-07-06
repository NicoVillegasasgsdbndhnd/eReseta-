import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import type { Appointment } from '@/mocks/types'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function patientDisplayName(a: Appointment): string {
  return a.display_name ?? a.patient?.user?.name ?? a.guest_name ?? (a.patient_id ? `Patient #${a.patient_id}` : 'Guest patient')
}

function isGuestAppointment(a: Appointment): boolean {
  return a.is_guest ?? a.patient_id === null
}

function appointmentTimingBadge(a: Appointment, nowMs: number) {
  if (!['scheduled', 'confirmed', 'rescheduled'].includes(a.status)) return null

  const minutesPast = Math.floor((nowMs - new Date(a.scheduled_at).getTime()) / 60000)
  if (minutesPast < 0) return null
  if (minutesPast >= 60) return { label: 'No show', className: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' }
  return { label: 'Delayed', className: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' }
}

function localIso(d: Date): string {
  const y  = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

function buildCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1).getDay()
  const count = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < first; i++) cells.push(null)
  for (let d = 1; d <= count; d++) cells.push(new Date(year, month, d))
  return cells
}

interface Props {
  appointments: Appointment[]
  onSelectAppointment: (id: number) => void
}





export default function AppointmentCalendar({ appointments, onSelectAppointment }: Props) {
  const [viewMonth, setViewMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string>(() => localIso(new Date()))
  const [nowMs] = useState(() => Date.now())

  const todayIso = localIso(new Date())



  const byDate = useMemo(() => {
    const m = new Map<string, Appointment[]>()
    for (const a of appointments) {
      if (a.status === 'cancelled' || a.status === 'served') continue
      const key = localIso(new Date(a.scheduled_at))
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(a)
    }
    for (const list of m.values()) {
      list.sort((x, y) => new Date(x.scheduled_at).getTime() - new Date(y.scheduled_at).getTime())
    }
    return m
  }, [appointments])

  const yr = viewMonth.getFullYear()
  const mo = viewMonth.getMonth()
  const cells = buildCells(yr, mo)
  const selectedList = byDate.get(selectedDate) ?? []

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-5">
      {/* Calendar */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm lg:col-span-2" style={{ border: '1px solid hsl(201 45% 84%)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5" style={{ background: 'linear-gradient(135deg, hsl(201 76% 95%) 0%, hsl(168 48% 94%) 100%)', borderBottom: '1px solid hsl(201 42% 86%)' }}>
          <div>
            <p className="text-base font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
              {MONTHS[mo]} {yr}
            </p>
            <p className="mt-0.5 text-xs font-medium" style={{ color: 'hsl(215 16% 48%)' }}>
              Active appointments by calendar date
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMonth(new Date(yr, mo - 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/75 transition-colors hover:bg-white"
              style={{ color: 'hsl(215 16% 45%)', border: '1px solid hsl(201 42% 84%)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setViewMonth(new Date())}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              Today
            </button>
            <button
              onClick={() => setViewMonth(new Date(yr, mo + 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/75 transition-colors hover:bg-white"
              style={{ color: 'hsl(215 16% 45%)', border: '1px solid hsl(201 42% 84%)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="px-3 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
        <div className="mb-2 grid grid-cols-7 rounded-lg bg-slate-50 py-1">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="text-center text-[11px] font-semibold py-1" style={{ color: 'hsl(215 16% 55%)' }}>
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />
            const iso        = localIso(day)
            const count      = byDate.get(iso)?.length ?? 0
            const isToday    = iso === todayIso
            const isSelected = iso === selectedDate

            return (
              <button
                key={iso}
                onClick={() => setSelectedDate(iso)}
                className="relative flex aspect-square min-h-11 flex-col justify-between rounded-lg p-1.5 text-left transition-all hover:bg-sky-50 sm:p-2"
                style={
                  isSelected
                    ? { background: 'linear-gradient(135deg, hsl(201 100% 36%) 0%, hsl(168 68% 38%) 100%)', boxShadow: '0 8px 18px hsl(201 60% 45% / 0.22)' }
                    : count > 0
                      ? { border: '1px solid hsl(201 45% 82%)', backgroundColor: 'hsl(201 70% 97%)' }
                      : { border: '1px solid hsl(210 18% 92%)', backgroundColor: 'white' }
                }
              >
                <span
                  className="self-end text-xs"
                  style={{
                    color: isSelected ? 'white' : isToday ? 'hsl(201 100% 36%)' : 'hsl(215 30% 20%)',
                    fontWeight: isToday || isSelected ? 700 : 400,
                  }}
                >
                  {day.getDate()}
                </span>
                {count > 0 && (
                  <span className="mt-auto flex items-center gap-1 text-[9px] font-bold sm:text-[10px]" style={{ color: isSelected ? 'white' : 'hsl(201 100% 32%)' }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isSelected ? 'white' : 'hsl(201 100% 36%)' }} />
                    {count} app{count !== 1 ? 's' : ''}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        </div>
      </div>

      {/* Selected-day list */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid hsl(201 45% 84%)' }}>
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, hsl(205 92% 30%) 0%, hsl(201 100% 36%) 100%)' }}>
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            <CalendarDays size={15} />
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </p>
          <p className="mt-1 text-xs text-white/75">
            {selectedList.length} appointment{selectedList.length !== 1 ? 's' : ''}
          </p>
        </div>

        {selectedList.length === 0 ? (
          <div className="p-5">
            <div className="rounded-xl px-4 py-10 text-center" style={{ backgroundColor: 'hsl(201 70% 97%)', border: '1px dashed hsl(201 45% 80%)' }}>
              <CalendarDays size={26} className="mx-auto text-sky-300" />
              <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(215 16% 48%)' }}>
                No appointments this day.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {selectedList.map((a) => (
              (() => {
                const timingBadge = appointmentTimingBadge(a, nowMs)
                return (
                  <button
                    key={a.id}
                    onClick={() => onSelectAppointment(a.id)}
                    className="flex w-full items-center gap-3 rounded-lg bg-white p-2.5 text-left shadow-sm transition-colors hover:bg-sky-50"
                    style={{ border: '1px solid hsl(201 35% 86%)' }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 30%)' }}
                    >
                      {patientDisplayName(a).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'hsl(215 30% 14%)' }}>
                          {patientDisplayName(a)}
                        </p>
                        {isGuestAppointment(a) && (
                          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Guest
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: 'hsl(215 16% 50%)' }}>
                        {new Date(a.scheduled_at).toLocaleTimeString('en-PH', { timeStyle: 'short' })}
                      </p>
                    </div>
                    {timingBadge ? (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${timingBadge.className}`}>
                        {timingBadge.label}
                      </span>
                    ) : (
                      <StatusBadge status={a.status} />
                    )}
                  </button>
                )
              })()
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

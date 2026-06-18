import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import type { Appointment } from '@/mocks/types'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

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

/**
 * Month calendar for a doctor's appointments (mentor review): each day shows a count
 * badge; clicking a day lists that day's patients below.
 */
export default function AppointmentCalendar({ appointments, onSelectAppointment }: Props) {
  const [viewMonth, setViewMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string>(() => localIso(new Date()))

  const todayIso = localIso(new Date())

  // Bucket active appointments by local date. Cancelled and served drop off — served
  // consultations move to the patient record (mentor review).
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      {/* Calendar */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
            {MONTHS[mo]} {yr}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMonth(new Date(yr, mo - 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
              style={{ color: 'hsl(215 16% 45%)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setViewMonth(new Date())}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              style={{ color: 'hsl(201 100% 36%)' }}
            >
              Today
            </button>
            <button
              onClick={() => setViewMonth(new Date(yr, mo + 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
              style={{ color: 'hsl(215 16% 45%)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="text-center text-[11px] font-semibold py-1" style={{ color: 'hsl(215 16% 55%)' }}>
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
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
                className="relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all hover:bg-slate-50"
                style={
                  isSelected
                    ? { backgroundColor: 'hsl(201 60% 95%)', boxShadow: '0 0 0 2px hsl(201 100% 36%)' }
                    : { border: '1px solid hsl(210 18% 92%)' }
                }
              >
                <span
                  className="text-sm"
                  style={{
                    color: isToday ? 'hsl(201 100% 36%)' : 'hsl(215 30% 20%)',
                    fontWeight: isToday || isSelected ? 700 : 400,
                  }}
                >
                  {day.getDate()}
                </span>
                {count > 0 && (
                  <span
                    className="mt-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                    style={{ backgroundColor: 'hsl(201 100% 36%)' }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected-day list */}
      <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <p className="flex items-center gap-2 text-sm font-bold mb-1" style={{ color: 'hsl(215 30% 14%)' }}>
          <CalendarDays size={15} style={{ color: 'hsl(201 100% 36%)' }} />
          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', {
            weekday: 'long', month: 'long', day: 'numeric',
          })}
        </p>
        <p className="text-xs mb-4" style={{ color: 'hsl(215 16% 50%)' }}>
          {selectedList.length} appointment{selectedList.length !== 1 ? 's' : ''}
        </p>

        {selectedList.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'hsl(215 16% 60%)' }}>
            No appointments this day.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedList.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelectAppointment(a.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-slate-50 transition-colors"
                style={{ border: '1px solid hsl(210 18% 92%)' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 30%)' }}
                >
                  {(a.patient?.user?.name ?? 'P').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'hsl(215 30% 14%)' }}>
                    {a.patient?.user?.name ?? `Patient #${a.patient_id}`}
                  </p>
                  <p className="text-xs" style={{ color: 'hsl(215 16% 50%)' }}>
                    {new Date(a.scheduled_at).toLocaleTimeString('en-PH', { timeStyle: 'short' })}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, Ban, Plus } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import { useAuthStore } from '@/features/auth/authStore'
import {
  useDoctors, useDoctorLeaves, useAddDoctorLeave, useRemoveDoctorLeave, useAddMonthLeave,
  type DoctorLeave,
} from '@/features/doctors/queries'
import { useAppointments } from './queries'

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '13:00', '14:00', '15:00', '16:00',
]

function getWeekDays(base: Date): Date[] {
  const monday = new Date(base)
  const day = monday.getDay()
  const diff = day === 0 ? -6 : 1 - day
  monday.setDate(monday.getDate() + diff)
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function DoctorAvailabilityPage() {
  const { user } = useAuthStore()
  const { data: doctorsData } = useDoctors()
  const { data: apptData } = useAppointments()
  const doctors = doctorsData?.data ?? []
  const appointments = apptData?.data ?? []

  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null)
  const [weekBase, setWeekBase] = useState(new Date())


  const ownDoctorId =
    user?.role === 'staff' ? user?.assigned_doctor?.id ?? null
    : user?.role === 'doctor' ? user?.doctor?.id ?? null
    : null
  const effectiveDoctorId = selectedDoctorId ?? ownDoctorId ?? doctors[0]?.id ?? null
  const doctor = doctors.find((d) => d.id === effectiveDoctorId)


  const canManageLeave =
    user?.role === 'admin' ||
    (user?.role === 'doctor' && user?.doctor?.id === effectiveDoctorId) ||
    (user?.role === 'staff' && user?.assigned_doctor?.id === effectiveDoctorId)

  const { data: leaves } = useDoctorLeaves(effectiveDoctorId)
  const addLeave = useAddDoctorLeave(effectiveDoctorId ?? 0)
  const removeLeave = useRemoveDoctorLeave(effectiveDoctorId ?? 0)
  const monthLeave = useAddMonthLeave(effectiveDoctorId ?? 0)
  // Whole-day leaves grey the day; partial (per-hour) leaves are listed separately.
  const leaveByDate = new Map((leaves ?? []).filter((l) => l.start_time === null).map((l) => [l.date.slice(0, 10), l.id]))
  const partialLeaves = (leaves ?? []).filter((l) => l.start_time !== null)

  const [hourlyDate, setHourlyDate] = useState('')
  const [hourlyStart, setHourlyStart] = useState('')
  const [hourlyEnd, setHourlyEnd] = useState('')

  const toggleLeave = (dateStr: string) => {
    if (!effectiveDoctorId) return
    const existing = leaveByDate.get(dateStr)
    if (existing) removeLeave.mutate(existing)
    else addLeave.mutate({ date: dateStr })
  }

  const addHourlyLeave = () => {
    if (!hourlyDate || !hourlyStart || !hourlyEnd) return
    addLeave.mutate(
      { date: hourlyDate, start_time: hourlyStart, end_time: hourlyEnd },
      { onSuccess: () => { setHourlyStart(''); setHourlyEnd('') } },
    )
  }

  const leaveWholeMonth = () => {
    const m = `${weekBase.getFullYear()}-${String(weekBase.getMonth() + 1).padStart(2, '0')}`
    monthLeave.mutate({ month: m })
  }

  const nextHour = (time: string): string => `${String(Number(time.slice(0, 2)) + 1).padStart(2, '0')}:00`

  // A partial (per-hour) leave that covers a specific hour slot on a given date.
  const partialLeaveAt = (dateStr: string, time: string): DoctorLeave | undefined =>
    partialLeaves.find((l) =>
      l.date.slice(0, 10) === dateStr &&
      (l.start_time ?? '').slice(0, 5) <= time &&
      time < (l.end_time ?? '').slice(0, 5),
    )

  // Click a slot to toggle an hourly leave for that hour. Whole-day leave stays on the day button;
  // booked slots aren't touched (cancel the appointment first).
  const handleCellClick = (day: Date, time: string, isPast: boolean, booked: boolean) => {
    if (!canManageLeave || !effectiveDoctorId || isPast || booked) return
    const dateStr = isoDate(day)
    if (leaveByDate.has(dateStr)) return
    const partial = partialLeaveAt(dateStr, time)
    if (partial) removeLeave.mutate(partial.id)
    else addLeave.mutate({ date: dateStr, start_time: time, end_time: nextHour(time) })
  }

  const days = getWeekDays(weekBase)
  const today = isoDate(new Date())

  const isBooked = (doctorId: number, date: Date, time: string): boolean => {
    const dateStr = isoDate(date)
    return appointments.some((a) => {
      if (a.doctor_id !== doctorId) return false
      if (a.status === 'cancelled') return false
      const apptDate = new Date(a.scheduled_at)
      return isoDate(apptDate) === dateStr && apptDate.toTimeString().slice(0, 5) === time
    })
  }

  const prevWeek = () => {
    const d = new Date(weekBase)
    d.setDate(d.getDate() - 7)
    setWeekBase(d)
  }
  const nextWeek = () => {
    const d = new Date(weekBase)
    d.setDate(d.getDate() + 7)
    setWeekBase(d)
  }

  const weekLabel = days.length
    ? `${days[0].toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${days[5].toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : ''

  let totalSlots = 0
  let bookedSlots = 0
  if (effectiveDoctorId) {
    days.forEach((day) => {
      TIME_SLOTS.forEach((time) => {
        totalSlots++
        if (isBooked(effectiveDoctorId, day, time)) bookedSlots++
      })
    })
  }

  return (
    <>
      <PageHeader
        title="Doctor Availability"
        description="Weekly schedule grid showing available and booked time slots per physician"
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="bg-white rounded-xl shadow-sm px-3 py-2 flex items-center gap-2" style={{ border: '1px solid var(--color-border)' }}>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Physician</span>
          <select
            value={effectiveDoctorId ?? ''}
            onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
            className="text-sm font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.user?.name} — {d.specialization}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm flex items-center gap-1 px-2 py-1.5" style={{ border: '1px solid var(--color-border)' }}>
          <button onClick={prevWeek} className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-700 px-2">{weekLabel}</span>
          <button onClick={nextWeek} className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300 inline-block" />
            Available ({totalSlots - bookedSlots})
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block" />
            Booked ({bookedSlots})
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm bg-slate-300 border border-slate-400 inline-block" />
            On leave
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm bg-slate-50 border border-slate-200 inline-block" />
            Past
          </div>
        </div>
      </div>

      {canManageLeave && effectiveDoctorId && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4" style={{ border: '1px solid var(--color-border)' }}>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Hourly leave — date</label>
              <input type="date" value={hourlyDate} min={today} onChange={(e) => setHourlyDate(e.target.value)} className="h-9 text-sm rounded-md px-2" style={{ border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">From</label>
              <input type="time" value={hourlyStart} onChange={(e) => setHourlyStart(e.target.value)} className="h-9 text-sm rounded-md px-2" style={{ border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">To</label>
              <input type="time" value={hourlyEnd} onChange={(e) => setHourlyEnd(e.target.value)} className="h-9 text-sm rounded-md px-2" style={{ border: '1px solid var(--color-border)' }} />
            </div>
            <button
              type="button"
              onClick={addHourlyLeave}
              disabled={!hourlyDate || !hourlyStart || !hourlyEnd || addLeave.isPending}
              className="h-9 rounded-md px-3 text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              <Plus size={13} className="inline -mt-0.5" /> Add hourly leave
            </button>
            <button
              type="button"
              onClick={leaveWholeMonth}
              disabled={monthLeave.isPending}
              className="ml-auto h-9 rounded-md px-3 text-xs font-semibold disabled:opacity-50"
              style={{ border: '1px solid var(--color-border)', color: 'hsl(0 70% 45%)' }}
            >
              <Ban size={13} className="inline -mt-0.5" /> Leave whole {weekBase.toLocaleDateString('en-PH', { month: 'long' })}
            </button>
          </div>
          {partialLeaves.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {partialLeaves.map((l) => (
                <span key={l.id} className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                  {l.date.slice(0, 10)} · {l.start_time?.slice(0, 5)}–{l.end_time?.slice(0, 5)}
                  <button type="button" onClick={() => removeLeave.mutate(l.id)} className="font-bold text-amber-500 hover:text-amber-700">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {doctor && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-center gap-4" style={{ border: '1px solid var(--color-border)' }}>
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
            {doctor.user?.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{doctor.user?.name}</p>
            <p className="text-xs text-slate-500">{doctor.specialization} · PRC {doctor.license_no}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="text-center px-3 py-1.5 rounded-lg bg-emerald-50">
              <p className="text-lg font-bold text-emerald-700">{totalSlots - bookedSlots}</p>
              <p className="text-[10px] text-emerald-600 font-semibold">Available</p>
            </div>
            <div className="text-center px-3 py-1.5 rounded-lg bg-red-50">
              <p className="text-lg font-bold text-red-600">{bookedSlots}</p>
              <p className="text-[10px] text-red-500 font-semibold">Booked</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div className="grid" style={{ gridTemplateColumns: '80px repeat(6, 1fr)' }}>
          <div className="p-3 bg-slate-50" style={{ borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }} />
          {days.map((day, i) => {
            const dayIso = isoDate(day)
            const isToday = dayIso === today
            const isPastDay = day < new Date(new Date().setHours(0, 0, 0, 0))
            const onLeave = leaveByDate.has(dayIso)
            return (
              <div
                key={i}
                className={`p-3 text-center ${onLeave ? 'bg-slate-100' : isToday ? 'bg-teal-50' : 'bg-slate-50'}`}
                style={{ borderBottom: '1px solid var(--color-border)', borderRight: i < 5 ? '1px solid var(--color-border)' : undefined }}
              >
                <p className={`text-xs font-semibold ${isToday ? 'text-teal-600' : 'text-slate-500'}`}>{DAY_LABELS[i]}</p>
                <p className={`text-sm font-bold mt-0.5 ${isToday ? 'text-teal-700' : 'text-slate-700'}`}>
                  {day.toLocaleDateString('en-PH', { day: 'numeric', month: 'short' })}
                </p>
                {isToday && <span className="text-[9px] font-bold text-teal-600 uppercase tracking-wide">Today</span>}
                {canManageLeave && !isPastDay && (
                  <button
                    onClick={() => toggleLeave(dayIso)}
                    disabled={addLeave.isPending || removeLeave.isPending}
                    className={`mt-1.5 w-full flex items-center justify-center gap-1 text-[10px] font-semibold px-1.5 py-1 rounded-md transition-colors disabled:opacity-50 ${
                      onLeave
                        ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                    }`}
                    title={onLeave ? 'Remove leave (allow bookings)' : 'Block this day (doctor on leave)'}
                  >
                    {onLeave ? <><Ban size={10} /> On leave</> : <><Plus size={10} /> Mark leave</>}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {TIME_SLOTS.map((time) => (
          <div key={time} className="grid" style={{ gridTemplateColumns: '80px repeat(6, 1fr)', borderTop: '1px solid var(--color-border)' }}>
            <div
              className="flex items-center justify-center p-2 bg-slate-50"
              style={{ borderRight: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                <Clock size={10} />
                {time}
              </div>
            </div>

            {days.map((day, i) => {
              const dateStr = isoDate(day)
              const isPast = day < new Date(new Date().setHours(0, 0, 0, 0))
              const wholeDayLeave = leaveByDate.has(dateStr)
              const onLeave = wholeDayLeave || !!partialLeaveAt(dateStr, time)
              const booked = effectiveDoctorId ? isBooked(effectiveDoctorId, day, time) : false
              // Available or partial-leave hours are clickable to toggle leave; whole-day/booked/past are not.
              const clickable = canManageLeave && !isPast && !booked && !wholeDayLeave

              let cellClass = 'bg-emerald-50'
              let icon = <CheckCircle size={14} className="text-emerald-500" />
              let label = 'Available'
              let textClass = 'text-emerald-700'

              if (isPast) {
                cellClass = 'bg-slate-50'
                icon = <span className="w-3.5 h-3.5 rounded-full bg-slate-200 inline-block" />
                label = 'Past'
                textClass = 'text-slate-300'
              } else if (onLeave) {
                cellClass = 'bg-slate-200'
                icon = <Ban size={14} className="text-slate-500" />
                label = 'On leave'
                textClass = 'text-slate-600'
              } else if (booked) {
                cellClass = 'bg-red-50'
                icon = <XCircle size={14} className="text-red-400" />
                label = 'Booked'
                textClass = 'text-red-500'
              }

              const hoverClass = clickable
                ? `cursor-pointer ${onLeave ? 'hover:bg-slate-300' : 'hover:bg-emerald-100'}`
                : ''
              const title = !canManageLeave ? ''
                : booked ? 'Booked — cancel the appointment before marking leave'
                : wholeDayLeave ? 'Whole day on leave — use the day button above'
                : isPast ? ''
                : onLeave ? 'Click to remove this hourly leave'
                : 'Click to mark this hour as leave'

              return (
                <div
                  key={i}
                  onClick={clickable ? () => handleCellClick(day, time, isPast, booked) : undefined}
                  title={title}
                  className={`flex flex-col items-center justify-center gap-1 py-3 transition-colors ${cellClass} ${hoverClass}`}
                  style={{ borderRight: i < 5 ? '1px solid var(--color-border)' : undefined }}
                >
                  {icon}
                  <span className={`text-[10px] font-semibold ${textClass}`}>{label}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 mt-3 text-center">
        {canManageLeave && <><span className="font-semibold text-slate-600">Tip:</span> click any open slot to mark that hour as leave (click again to undo) · </>}
        Lunch break (12:00–13:00) not shown · Weekends not available · Times in PHT
      </p>
    </>
  )
}

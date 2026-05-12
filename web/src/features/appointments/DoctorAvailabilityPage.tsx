import { useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import { mockDoctors, mockAppointments } from '@/mocks/data'

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

function isBooked(doctorId: number, date: Date, time: string): boolean {
  const dateStr = isoDate(date)
  return mockAppointments.some((a) => {
    if (a.doctor_id !== doctorId) return false
    if (a.status === 'cancelled') return false
    const apptDate = new Date(a.scheduled_at)
    return (
      isoDate(apptDate) === dateStr &&
      apptDate.toTimeString().slice(0, 5) === time
    )
  })
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function DoctorAvailabilityPage() {
  const [selectedDoctor, setSelectedDoctor] = useState(mockDoctors[0].id)
  const [weekBase, setWeekBase] = useState(new Date())
  const days = getWeekDays(weekBase)
  const today = isoDate(new Date())

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

  const doctor = mockDoctors.find((d) => d.id === selectedDoctor)!

  const weekLabel = `${days[0].toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${days[5].toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`

  // Count availability stats for the week
  let totalSlots = 0
  let bookedSlots = 0
  days.forEach((day) => {
    TIME_SLOTS.forEach((time) => {
      totalSlots++
      if (isBooked(selectedDoctor, day, time)) bookedSlots++
    })
  })

  return (
    <>
      <PageHeader
        title="Doctor Availability"
        description="Weekly schedule grid showing available and booked time slots per physician"
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Doctor selector */}
        <div className="bg-white rounded-xl shadow-sm px-3 py-2 flex items-center gap-2" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Physician</span>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(Number(e.target.value))}
            className="text-sm font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
          >
            {mockDoctors.map((d) => (
              <option key={d.id} value={d.id}>{d.user?.name} — {d.specialization}</option>
            ))}
          </select>
        </div>

        {/* Week navigator */}
        <div className="bg-white rounded-xl shadow-sm flex items-center gap-1 px-2 py-1.5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <button onClick={prevWeek} className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-700 px-2">{weekLabel}</span>
          <button onClick={nextWeek} className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Stats */}
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
            <span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-300 inline-block" />
            Past
          </div>
        </div>
      </div>

      {/* Doctor summary */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-center gap-4" style={{ border: '1px solid hsl(214 20% 90%)' }}>
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
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

      {/* Calendar grid */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid hsl(214 20% 90%)' }}>
        {/* Header row */}
        <div className="grid" style={{ gridTemplateColumns: '80px repeat(6, 1fr)' }}>
          <div className="p-3 bg-slate-50" style={{ borderBottom: '1px solid hsl(214 20% 90%)', borderRight: '1px solid hsl(214 20% 90%)' }} />
          {days.map((day, i) => {
            const isToday = isoDate(day) === today
            return (
              <div
                key={i}
                className={`p-3 text-center ${isToday ? 'bg-blue-50' : 'bg-slate-50'}`}
                style={{ borderBottom: '1px solid hsl(214 20% 90%)', borderRight: i < 5 ? '1px solid hsl(214 20% 90%)' : undefined }}
              >
                <p className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>{DAY_LABELS[i]}</p>
                <p className={`text-sm font-bold mt-0.5 ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
                  {day.toLocaleDateString('en-PH', { day: 'numeric', month: 'short' })}
                </p>
                {isToday && <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wide">Today</span>}
              </div>
            )
          })}
        </div>

        {/* Time slot rows */}
        {TIME_SLOTS.map((time) => (
          <div key={time} className="grid" style={{ gridTemplateColumns: '80px repeat(6, 1fr)', borderTop: '1px solid hsl(214 20% 93%)' }}>
            {/* Time label */}
            <div
              className="flex items-center justify-center p-2 bg-slate-50"
              style={{ borderRight: '1px solid hsl(214 20% 90%)' }}
            >
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                <Clock size={10} />
                {time}
              </div>
            </div>

            {/* Day cells */}
            {days.map((day, i) => {
              const isPast = day < new Date(new Date().setHours(0, 0, 0, 0))
              const booked = isBooked(selectedDoctor, day, time)

              let cellClass = 'bg-emerald-50 hover:bg-emerald-100'
              let icon = <CheckCircle size={14} className="text-emerald-500" />
              let label = 'Available'
              let textClass = 'text-emerald-700'

              if (isPast) {
                cellClass = 'bg-slate-50'
                icon = <span className="w-3.5 h-3.5 rounded-full bg-slate-200 inline-block" />
                label = 'Past'
                textClass = 'text-slate-300'
              } else if (booked) {
                cellClass = 'bg-red-50'
                icon = <XCircle size={14} className="text-red-400" />
                label = 'Booked'
                textClass = 'text-red-500'
              }

              return (
                <div
                  key={i}
                  className={`flex flex-col items-center justify-center gap-1 py-3 transition-colors ${cellClass}`}
                  style={{ borderRight: i < 5 ? '1px solid hsl(214 20% 93%)' : undefined }}
                >
                  {icon}
                  <span className={`text-[10px] font-semibold ${textClass}`}>{label}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-3 text-center">
        Lunch break (12:00–13:00) not shown · Weekends not available · Times in PHT
      </p>
    </>
  )
}

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Loader2 } from 'lucide-react'
import { useAppointments } from '@/features/appointments/queries'
import type { Appointment } from '@/mocks/types'

const TIME_SLOTS = Array.from({ length: 19 }, (_, i) => {
  const h = Math.floor(i / 2) + 8
  const m = (i % 2) * 30
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

const SLOT_STYLE: Record<string, { row: string; dot: string }> = {
  confirmed:   { row: 'bg-blue-50 text-blue-700 border-l-2 border-l-blue-400',     dot: 'bg-blue-500' },
  scheduled:   { row: 'bg-amber-50 text-amber-700 border-l-2 border-l-amber-400', dot: 'bg-amber-500' },
  served:      { row: 'bg-emerald-50 text-emerald-700 border-l-2 border-l-emerald-400', dot: 'bg-emerald-500' },
  rescheduled: { row: 'bg-violet-50 text-violet-700 border-l-2 border-l-violet-400', dot: 'bg-violet-500' },
  cancelled:   { row: 'bg-red-50 text-red-500 border-l-2 border-l-red-300',       dot: 'bg-red-400' },
}

function getApptsForSlot(appts: Appointment[], slot: string): Appointment[] {
  const [slotH, slotM] = slot.split(':').map(Number)
  return appts.filter((a) => {
    const d = new Date(a.scheduled_at)
    const h = d.getHours()
    const m = d.getMinutes()
    if (h !== slotH) return false
    return slotM === 0 ? m < 30 : m >= 30
  })
}

export default function StaffDashboard() {
  const navigate = useNavigate()
  const { data: apptData, isLoading } = useAppointments()

  const todayAppts = useMemo(() => {
    const today = new Date().toDateString()
    return (apptData?.data ?? []).filter(
      (a) => new Date(a.scheduled_at).toDateString() === today,
    )
  }, [apptData])

  const confirmedCount   = todayAppts.filter((a) => a.status === 'confirmed').length
  const unconfirmedCount = todayAppts.filter((a) => a.status === 'scheduled').length
  const servedCount      = todayAppts.filter((a) => a.status === 'served').length
  const doctorsOnDuty    = new Set(todayAppts.map((a) => a.doctor_id)).size

  const todayLabel = new Date().toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'hsl(215 30% 14%)' }}>
            Today's schedule
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(215 16% 45%)' }}>{todayLabel}</p>
        </div>
        <button
          onClick={() => navigate('/appointments/new')}
          className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg shadow-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'hsl(201 100% 36%)' }}
        >
          <Plus size={15} />
          New appointment
        </button>
      </div>

      {/* ── Main layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* ── Timeline ── */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: 'hsl(215 30% 14%)' }}>Appointment timeline</p>
            <button
              onClick={() => navigate('/appointments')}
              className="text-xs font-medium hover:underline"
              style={{ color: 'hsl(201 100% 36%)' }}
            >
              Full schedule →
            </button>
          </div>

          <div className="space-y-1">
            {TIME_SLOTS.map((slot) => {
              const slotAppts = getApptsForSlot(todayAppts, slot)
              return (
                <div key={slot} className="flex items-start gap-4 py-1">
                  <span
                    className="text-xs font-mono w-12 pt-0.5 shrink-0 select-none"
                    style={{ color: 'hsl(215 16% 55%)' }}
                  >
                    {slot}
                  </span>
                  <div className="flex-1 space-y-1">
                    {slotAppts.length === 0 ? (
                      <p className="text-xs py-1" style={{ color: 'hsl(215 16% 75%)' }}>No appointment</p>
                    ) : (
                      slotAppts.map((appt) => {
                        const style = SLOT_STYLE[appt.status] ?? SLOT_STYLE.scheduled
                        const patientLast = (appt.patient?.user?.name ?? '—').split(' ').pop()
                        const doctorLast  = (appt.doctor?.user?.name ?? '—').split(' ').pop()
                        const statusLabel = appt.status === 'scheduled' ? 'Unconfirmed'
                          : appt.status.charAt(0).toUpperCase() + appt.status.slice(1)
                        return (
                          <div
                            key={appt.id}
                            onClick={() => navigate(`/appointments/${appt.id}`)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${style.row}`}
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                            <span className="text-xs font-medium">
                              {patientLast}, {appt.patient?.user?.name?.split(' ')[0]} · Dr. {doctorLast} · {statusLabel}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Summary ── */}
        <div className="bg-white rounded-xl shadow-sm p-5 self-start" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'hsl(215 30% 14%)' }}>Today's summary</p>
          <div className="space-y-3">
            {[
              { label: 'Total appointments', value: todayAppts.length,  color: 'hsl(215 30% 14%)' },
              { label: 'Confirmed',          value: confirmedCount,      color: 'hsl(152 50% 38%)' },
              { label: 'Unconfirmed',        value: unconfirmedCount,    color: 'hsl(38 92% 50%)' },
              { label: 'Served',             value: servedCount,         color: 'hsl(215 16% 50%)' },
              { label: 'Doctors on duty',    value: doctorsOnDuty || '—', color: 'hsl(215 30% 14%)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid hsl(210 18% 93%)' }}>
                <span className="text-sm" style={{ color: 'hsl(215 16% 50%)' }}>{label}</span>
                <span className="text-sm font-bold" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

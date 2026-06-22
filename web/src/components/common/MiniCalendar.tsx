import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTHS, WEEKDAYS, buildCalendarCells, toLocalIso } from '@/lib/slots'

interface MiniCalendarProps {
  value:         string
  onChange:      (iso: string) => void
  viewMonth:     Date
  onMonthChange: (d: Date) => void
  blockedDates?: Set<string>
}

/** Month-grid date picker: past + blocked (leave) days disabled, capped 6 months ahead. */
export default function MiniCalendar({ value, onChange, viewMonth, onMonthChange, blockedDates }: MiniCalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = toLocalIso(today)

  const yr    = viewMonth.getFullYear()
  const mo    = viewMonth.getMonth()
  const cells = buildCalendarCells(yr, mo)

  const isThisMonth = yr === today.getFullYear() && mo === today.getMonth()

  const goPrev = () => {
    if (!isThisMonth) onMonthChange(new Date(yr, mo - 1, 1))
  }
  const goNext = () => {
    const n   = new Date(yr, mo + 1, 1)
    const max = new Date(today.getFullYear(), today.getMonth() + 6, 1)
    if (n <= max) onMonthChange(n)
  }

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={isThisMonth}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          style={{ color: 'hsl(215 16% 45%)' }}
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
          {MONTHS[mo]} {yr}
        </p>
        <button
          type="button"
          onClick={goNext}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
          style={{ color: 'hsl(215 16% 45%)' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center text-[11px] font-semibold py-1" style={{ color: 'hsl(215 16% 55%)' }}>
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />

          const iso        = toLocalIso(day)
          const isPast     = day < today
          const isToday    = iso === todayIso
          const isSelected = iso === value
          const isBlocked  = blockedDates?.has(iso) ?? false

          let circleBg    = 'transparent'
          let circleColor = 'hsl(215 30% 14%)'
          let fontWeight  = '400'
          let boxShadow   = 'none'

          if (isSelected) {
            circleBg    = 'hsl(201 100% 36%)'
            circleColor = 'white'
            fontWeight  = '600'
          } else if (isPast || isBlocked) {
            circleColor = 'hsl(215 16% 75%)'
          } else if (isToday) {
            circleColor = 'hsl(201 100% 36%)'
            fontWeight  = '700'
            boxShadow   = '0 0 0 2px hsl(201 100% 36%)'
          }

          return (
            <button
              key={iso}
              type="button"
              disabled={isPast || isBlocked}
              onClick={() => onChange(iso)}
              title={isBlocked ? 'Doctor on leave' : undefined}
              className={`flex flex-col items-center py-0.5 rounded-lg hover:bg-slate-50 disabled:hover:bg-transparent transition-colors ${isBlocked ? 'line-through' : ''}`}
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ backgroundColor: circleBg, color: circleColor, fontWeight, boxShadow }}
              >
                {day.getDate()}
              </span>
              {/* Availability dot on future bookable dates; red dot marks leave days */}
              {!isPast && !isSelected && (
                <span
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ backgroundColor: isBlocked ? 'hsl(0 70% 60%)' : 'hsl(201 100% 55%)', opacity: 0.6 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

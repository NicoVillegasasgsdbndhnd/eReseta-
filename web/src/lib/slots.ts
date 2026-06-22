// Shared appointment time-slot + calendar helpers, used by both the authenticated
// patient booking page and the public guest booking page.

export const AM_SLOTS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30']
export const PM_SLOTS = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00']
export const ALL_SLOTS = [...AM_SLOTS, ...PM_SLOTS]

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
export const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

/** 24h "HH:MM" → "h:MM AM/PM". */
export function formatTime(v: string): string {
  const [h, m] = v.split(':').map(Number)
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** Local YYYY-MM-DD (avoids UTC-offset drift in the PH timezone). */
export function toLocalIso(d: Date): string {
  const y  = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

/** Month grid cells (leading blanks as null) for a given year/month. */
export function buildCalendarCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1).getDay()
  const count = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < first; i++) cells.push(null)
  for (let d = 1; d <= count; d++) cells.push(new Date(year, month, d))
  return cells
}

/** All bookable slots for a date, hiding already-past times when the date is today. */
export function visibleSlotsForDate(dateIso: string): string[] {
  const todayIso = toLocalIso(new Date())
  if (dateIso !== todayIso) return ALL_SLOTS
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  return ALL_SLOTS.filter((slot) => {
    const [h, m] = slot.split(':').map(Number)
    return h * 60 + m > nowMins
  })
}

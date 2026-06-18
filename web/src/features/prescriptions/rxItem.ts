// Shared prescription-item model + helpers (Epic O): structured dosing with auto-compute.
// Quantity = frequency-per-day × duration-in-days. Filling any 2 fills the 3rd.

export interface RxItem {
  drug_name: string
  brand_name: string | null
  dosage: string
  dosageOptions: string[]      // parsed from the catalog medicine's `strength`
  quantity: string             // kept as strings for inputs ('' allowed)
  freqPerDay: string           // times per day
  durationValue: string
  durationUnit: 'day' | 'week' | 'month'
  instructions: string
}

export const emptyRxItem = (): RxItem => ({
  drug_name: '', brand_name: null, dosage: '', dosageOptions: [],
  quantity: '', freqPerDay: '', durationValue: '', durationUnit: 'day', instructions: '',
})

const UNIT_DAYS: Record<RxItem['durationUnit'], number> = { day: 1, week: 7, month: 30 }

/** Split a catalog `strength` field ("500 mg, 250 mg") into selectable dosage options. */
export function parseDosageOptions(strength: string | null | undefined): string[] {
  if (!strength) return []
  return strength.split(/[,/]/).map((s) => s.trim()).filter(Boolean)
}

/** Fill whichever of {quantity, frequency, duration} is empty from the other two. */
export function autoCompute(it: RxItem): RxItem {
  const qty  = Number(it.quantity)
  const freq = Number(it.freqPerDay)
  const durV = Number(it.durationValue)
  const days = durV * UNIT_DAYS[it.durationUnit]

  const hasQty  = it.quantity !== '' && qty > 0
  const hasFreq = it.freqPerDay !== '' && freq > 0
  const hasDur  = it.durationValue !== '' && durV > 0

  // quantity empty → qty = freq × days
  if (!hasQty && hasFreq && hasDur) {
    return { ...it, quantity: String(Math.max(1, Math.round(freq * days))) }
  }
  // frequency empty → freq = qty / days
  if (hasQty && !hasFreq && hasDur && days > 0) {
    return { ...it, freqPerDay: String(Math.max(1, Math.round(qty / days))) }
  }
  // duration empty → days = qty / freq (expressed in days)
  if (hasQty && hasFreq && !hasDur && freq > 0) {
    return { ...it, durationValue: String(Math.max(1, Math.round(qty / freq))), durationUnit: 'day' }
  }
  return it
}

export function rxItemComplete(it: RxItem): boolean {
  return !!it.drug_name && !!it.dosage
    && Number(it.quantity) > 0 && Number(it.freqPerDay) > 0 && Number(it.durationValue) > 0
}

export function rxItemTouched(it: RxItem): boolean {
  return !!(it.drug_name || it.dosage || it.quantity || it.freqPerDay || it.durationValue)
}

/** Normalize one editor item into the existing prescription API payload shape. */
export function toRxPayload(it: RxItem) {
  const freq = Number(it.freqPerDay) || 0
  const durV = Number(it.durationValue) || 0
  const unit = it.durationUnit
  return {
    drug_name:    it.drug_name,
    dosage:       it.dosage,
    quantity:     Number(it.quantity) || 0,
    frequency:    freq ? `${freq}x daily` : '',
    duration:     durV ? `${durV} ${unit}${durV > 1 ? 's' : ''}` : '',
    instructions: it.instructions || null,
  }
}

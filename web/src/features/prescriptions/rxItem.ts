// Shared prescription-item model + helpers (Epic O auto-compute + structured units/frequency).
// Quantity auto-computes from doses-per-day × duration-in-days; fill any 2 of
// {quantity, frequency, duration} → the 3rd fills in.

export type DurationUnit = 'day' | 'week' | 'month'
export type FreqUnit = 'day' | 'week' | 'hour'

// Quantity = how much to DISPENSE → count / volume only (strength like mg/g lives in `dosage`).
export const QUANTITY_UNITS = ['tablet', 'capsule', 'mL', 'bottle', 'sachet', 'vial', 'ampule', 'tube', 'drop', 'piece'] as const
const COUNTABLE_QTY = new Set(['tablet', 'capsule', 'bottle', 'sachet', 'vial', 'ampule', 'tube', 'drop', 'piece'])

export interface RxItem {
  drug_name: string
  brand_name: string | null
  dosage: string
  dosageOptions: string[]      // parsed from the catalog medicine's `strength`
  form: string | null          // catalog dosage_form → drives which quantity units are offered
  quantity: string             // kept as strings for inputs ('' allowed)
  quantity_unit: string
  freqValue: string            // numeric amount, interpreted per freqUnit
  freqUnit: FreqUnit
  durationValue: string
  durationUnit: DurationUnit
  instructions: string
}

export const emptyRxItem = (): RxItem => ({
  drug_name: '', brand_name: null, dosage: '', dosageOptions: [],
  form: null, quantity: '', quantity_unit: 'tablet',
  freqValue: '', freqUnit: 'day',
  durationValue: '', durationUnit: 'day',
  instructions: '',
})

const UNIT_DAYS: Record<DurationUnit, number> = { day: 1, week: 7, month: 30 }

/** Split a catalog `strength` field ("500 mg, 250 mg") into selectable dosage options. */
export function parseDosageOptions(strength: string | null | undefined): string[] {
  if (!strength) return []
  return strength.split(/[,/]/).map((s) => s.trim()).filter(Boolean)
}

// Keyword → quantity units a form is dispensed in. A catalog entry can list several forms in one
// string (Paracetamol = "tablet, syrup, …, suppository"), so we union every match. Unknown/custom
// form → the full list, so a free-typed drug is never trapped.
const FORM_UNIT_RULES: { kw: string; units: string[] }[] = [
  { kw: 'suppositor', units: ['piece'] },
  { kw: 'patch',      units: ['piece'] },
  { kw: 'inhaler',    units: ['piece'] },
  { kw: 'aerosol',    units: ['piece'] },
  { kw: 'nebule',     units: ['mL', 'piece'] },
  { kw: 'drop',       units: ['mL', 'bottle', 'drop'] },
  { kw: 'ampul',      units: ['ampule', 'mL'] },
  { kw: 'ampoule',    units: ['ampule', 'mL'] },
  { kw: 'injection',  units: ['vial', 'ampule', 'mL'] },
  { kw: 'vial',       units: ['vial', 'mL'] },
  { kw: 'cream',      units: ['tube'] },
  { kw: 'ointment',   units: ['tube'] },
  { kw: 'gel',        units: ['tube'] },
  { kw: 'lotion',     units: ['mL', 'bottle'] },
  { kw: 'emulsion',   units: ['mL', 'bottle'] },
  { kw: 'syrup',      units: ['mL', 'bottle'] },
  { kw: 'suspension', units: ['mL', 'bottle'] },
  { kw: 'solution',   units: ['mL', 'bottle'] },
  { kw: 'elixir',     units: ['mL', 'bottle'] },
  { kw: 'powder',     units: ['sachet', 'vial', 'bottle'] },
  { kw: 'capsule',    units: ['capsule', 'piece'] },
  { kw: 'tablet',     units: ['tablet', 'piece'] },
]

export function quantityUnitsForForm(form: string | null | undefined): readonly string[] {
  if (!form) return QUANTITY_UNITS
  const f = form.toLowerCase()
  const set = new Set<string>()
  for (const { kw, units } of FORM_UNIT_RULES) {
    if (f.includes(kw)) units.forEach((u) => set.add(u))
  }
  if (set.size === 0) return QUANTITY_UNITS
  return QUANTITY_UNITS.filter((u) => set.has(u))
}

/** Doses per day implied by the frequency value + unit. */
function dosesPerDay(it: RxItem): number {
  const f = Number(it.freqValue)
  if (!(f > 0)) return 0
  if (it.freqUnit === 'hour') return 24 / f   // every f hours
  if (it.freqUnit === 'week') return f / 7    // f times per week
  return f                                    // f times per day
}

/** Fill whichever of {quantity, frequency, duration} is empty from the other two. */
export function autoCompute(it: RxItem): RxItem {
  const qty  = Number(it.quantity)
  const dpd  = dosesPerDay(it)
  const durV = Number(it.durationValue)
  const days = durV * UNIT_DAYS[it.durationUnit]

  const hasQty  = it.quantity !== '' && qty > 0
  const hasFreq = it.freqValue !== '' && dpd > 0
  const hasDur  = it.durationValue !== '' && durV > 0

  // quantity empty → qty = dosesPerDay × days
  if (!hasQty && hasFreq && hasDur) {
    return { ...it, quantity: String(Math.max(1, Math.round(dpd * days))) }
  }
  // frequency empty → times/day = qty / days
  if (hasQty && !hasFreq && hasDur && days > 0) {
    return { ...it, freqValue: String(Math.max(1, Math.round(qty / days))), freqUnit: 'day' }
  }
  // duration empty → days = qty / dosesPerDay
  if (hasQty && hasFreq && !hasDur && dpd > 0) {
    return { ...it, durationValue: String(Math.max(1, Math.round(qty / dpd))), durationUnit: 'day' }
  }
  return it
}

export function rxItemComplete(it: RxItem): boolean {
  return !!it.drug_name && !!it.dosage && !!it.quantity_unit
    && Number(it.quantity) > 0 && Number(it.freqValue) > 0 && Number(it.durationValue) > 0
}

export function rxItemTouched(it: RxItem): boolean {
  return !!(it.drug_name || it.dosage || it.quantity || it.freqValue || it.durationValue)
}

/** Compose a human-readable frequency string from the value + unit. */
export function composeFrequency(value: string, unit: FreqUnit): string {
  const n = Number(value)
  if (!(n > 0)) return ''
  if (unit === 'hour') return `every ${value} hour${n === 1 ? '' : 's'}`
  const word = n === 1 ? 'time' : 'times'
  return unit === 'week' ? `${value} ${word} weekly` : `${value} ${word} daily`
}

/** Pluralize a countable quantity unit (mL/etc. stay as-is). */
export function pluralizeQty(qty: number, unit: string): string {
  return COUNTABLE_QTY.has(unit) && qty !== 1 ? `${unit}s` : unit
}

/** Normalize one editor item into the existing prescription API payload shape. */
export function toRxPayload(it: RxItem) {
  const durV = Number(it.durationValue) || 0
  const unit = it.durationUnit
  return {
    drug_name:     it.drug_name,
    dosage:        it.dosage,
    quantity:      Number(it.quantity) || 0,
    quantity_unit: it.quantity_unit || null,
    frequency:     composeFrequency(it.freqValue, it.freqUnit),
    duration:      durV ? `${durV} ${unit}${durV > 1 ? 's' : ''}` : '',
    instructions:  it.instructions || null,
  }
}

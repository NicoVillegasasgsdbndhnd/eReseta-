



export type DurationUnit = 'day' | 'week' | 'month'
export type FreqUnit = 'day' | 'week' | 'hour'


export const QUANTITY_UNITS = ['tablet', 'capsule', 'mL', 'bottle', 'sachet', 'vial', 'ampule', 'tube', 'drop', 'piece'] as const
const COUNTABLE_QTY = new Set(['tablet', 'capsule', 'bottle', 'sachet', 'vial', 'ampule', 'tube', 'drop', 'piece'])

export interface RxItem {
  drug_name: string
  medicine_id: number | null   // the chosen generic (strict catalog pick)
  brand_name: string | null
  dosage: string
  dosageOptions: string[]      // distinct strengths across the generic's brands
  form: string | null          // catalog dosage_form → drives which quantity units are offered
  quantity: string             // kept as strings for inputs ('' allowed)
  quantity_unit: string
  freqValue: string            // numeric amount, interpreted per freqUnit
  freqUnit: FreqUnit
  durationValue: string
  durationUnit: DurationUnit
  instructions: string
  derived: DoseField | null    // which of qty/freq/duration is currently auto-computed
}


export type DoseField = 'quantity' | 'freqValue' | 'durationValue'

export const emptyRxItem = (): RxItem => ({
  drug_name: '', medicine_id: null, brand_name: null, dosage: '', dosageOptions: [],
  form: null, quantity: '', quantity_unit: 'tablet',
  freqValue: '', freqUnit: 'day',
  durationValue: '', durationUnit: 'day',
  instructions: '',
  derived: null,
})

const UNIT_DAYS: Record<DurationUnit, number> = { day: 1, week: 7, month: 30 }


export function parseDosageOptions(strength: string | null | undefined): string[] {
  if (!strength) return []
  return strength.split(/[,/]/).map((s) => s.trim()).filter(Boolean)
}




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


const LIQUID_UNITS = new Set(['mL', 'bottle', 'vial', 'ampule', 'drop'])

const isLiquidDosage = (d: string) => /ml/i.test(d) || d.includes('/')






export function dosageForUnit(options: string[], unit: string, current: string): string {
  if (options.length === 0) return current
  const wantLiquid = LIQUID_UNITS.has(unit)
  if (current && isLiquidDosage(current) === wantLiquid) return current
  return options.find((d) => isLiquidDosage(d) === wantLiquid) ?? current
}


function dosesPerDay(it: RxItem): number {
  const f = Number(it.freqValue)
  if (!(f > 0)) return 0
  if (it.freqUnit === 'hour') return 24 / f   // every f hours
  if (it.freqUnit === 'week') return f / 7    // f times per week
  return f                                    // f times per day
}

const UNIT_KEY: Record<DoseField, 'freqUnit' | 'durationUnit' | null> = {
  quantity: null, freqValue: 'freqUnit', durationValue: 'durationUnit',
}


function valueFor(it: RxItem, target: DoseField): { value: string; unit?: FreqUnit | DurationUnit } | null {
  const qty  = Number(it.quantity)
  const dpd  = dosesPerDay(it)
  const durV = Number(it.durationValue)
  const days = durV * UNIT_DAYS[it.durationUnit]

  if (target === 'quantity'      && dpd > 0 && days > 0) return { value: String(Math.max(1, Math.round(dpd * days))) }
  if (target === 'freqValue'     && qty > 0 && days > 0) return { value: String(Math.max(1, Math.round(qty / days))), unit: 'day' }
  if (target === 'durationValue' && qty > 0 && dpd > 0)  return { value: String(Math.max(1, Math.round(qty / dpd))),  unit: 'day' }
  return null
}






export function recompute(it: RxItem, changed: DoseField | 'freqUnit' | 'durationUnit'): RxItem {

  if (changed === it.derived) return { ...it, derived: null }

  if ((changed === 'freqUnit' && it.derived === 'freqValue') ||
      (changed === 'durationUnit' && it.derived === 'durationValue')) {
    return it
  }

  const fields: DoseField[] = ['quantity', 'freqValue', 'durationValue']
  const blanks = fields.filter((f) => it[f] === '')



  const fallback: DoseField = changed === 'quantity' ? 'durationValue' : 'quantity'
  let target: DoseField | null = it.derived ?? (blanks.length === 1 ? blanks[0] : fallback)
  if (target === changed) target = null   // never overwrite what was just typed
  if (!target) return it

  const computed = valueFor(it, target)
  if (!computed) return it

  const unitKey = UNIT_KEY[target]
  return {
    ...it,
    [target]: computed.value,
    ...(unitKey && computed.unit ? { [unitKey]: computed.unit } : {}),
    derived: target,
  }
}

export function rxItemComplete(it: RxItem): boolean {
  return !!it.drug_name && !!it.medicine_id && !!it.dosage && !!it.quantity_unit
    && Number(it.quantity) > 0 && Number(it.freqValue) > 0 && Number(it.durationValue) > 0
}

export function rxItemTouched(it: RxItem): boolean {
  return !!(it.drug_name || it.dosage || it.quantity || it.freqValue || it.durationValue)
}


export function composeFrequency(value: string, unit: FreqUnit): string {
  const n = Number(value)
  if (!(n > 0)) return ''
  if (unit === 'hour') return `every ${value} hour${n === 1 ? '' : 's'}`
  const word = n === 1 ? 'time' : 'times'
  return unit === 'week' ? `${value} ${word} weekly` : `${value} ${word} daily`
}


export function pluralizeQty(qty: number, unit: string): string {
  return COUNTABLE_QTY.has(unit) && qty !== 1 ? `${unit}s` : unit
}


export function toRxPayload(it: RxItem) {
  const durV = Number(it.durationValue) || 0
  const unit = it.durationUnit
  return {
    drug_name:     it.drug_name,
    medicine_id:   it.medicine_id,
    dosage:        it.dosage,
    quantity:      Number(it.quantity) || 0,
    quantity_unit: it.quantity_unit || null,
    frequency:     composeFrequency(it.freqValue, it.freqUnit),
    duration:      durV ? `${durV} ${unit}${durV > 1 ? 's' : ''}` : '',
    instructions:  it.instructions || null,
  }
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Pill, Save, Loader2, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAllPatientRecords } from '@/features/patients/queries'
import MedicineCombobox from '@/features/medicines/MedicineCombobox'
import { useCreatePrescription } from './queries'

// ── Structured unit options (doctor types a number, then picks a unit) ──
// Quantity = how much to DISPENSE → count or volume only. Mass/strength (mg, g, %, IU, mg/mL)
// belongs to Dosage, not here, so it's deliberately excluded.
const QUANTITY_UNITS = ['tablet', 'capsule', 'mL', 'bottle', 'sachet', 'vial', 'ampule', 'tube', 'drop', 'piece'] as const
const COUNTABLE_QTY = new Set(['tablet', 'capsule', 'bottle', 'sachet', 'vial', 'ampule', 'tube', 'drop', 'piece'])

// Keyword → quantity units that form can be dispensed in. A catalog entry may list SEVERAL forms in
// one string (e.g. Paracetamol = "tablet, syrup, ..., suppository, ampul"), so we union every match.
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

/**
 * Quantity units that make sense for a catalog dosage form. Keyword-based (the PNF strings are noisy:
 * "film coated tablet", "powder for solution for injection", multi-form lists). Unions all matches and
 * returns them in canonical order. A custom / unknown form returns the full list so a free-typed drug
 * is never trapped.
 */
function quantityUnitsForForm(form: string | null | undefined): readonly string[] {
  if (!form) return QUANTITY_UNITS
  const f = form.toLowerCase()
  const set = new Set<string>()
  for (const { kw, units } of FORM_UNIT_RULES) {
    if (f.includes(kw)) units.forEach((u) => set.add(u))
  }
  if (set.size === 0) return QUANTITY_UNITS
  return QUANTITY_UNITS.filter((u) => set.has(u))
}

const FREQ_UNITS = [
  { value: 'day',  label: 'times / day' },
  { value: 'week', label: 'times / week' },
  { value: 'hour', label: 'hour interval' },
] as const

const DURATION_UNITS = [
  { value: 'day',   label: 'day(s)' },
  { value: 'week',  label: 'week(s)' },
  { value: 'month', label: 'month(s)' },
] as const

type FreqUnit = (typeof FREQ_UNITS)[number]['value']
type DurUnit = (typeof DURATION_UNITS)[number]['value']

interface MedItem {
  drug_name: string
  dosage: string
  /** Catalog dosage form of the picked medicine (null when free-typed) — drives the quantity units. */
  form: string | null
  quantity: string
  quantity_unit: string
  freq_amount: string
  freq_unit: FreqUnit
  dur_amount: string
  dur_unit: DurUnit
  instructions: string
}

const EMPTY_ITEM: MedItem = {
  drug_name: '', dosage: '', form: null, quantity: '', quantity_unit: 'tablet',
  freq_amount: '', freq_unit: 'day',
  dur_amount: '', dur_unit: 'day',
  instructions: '',
}

// ── Compose human-readable strings persisted to the existing string columns ──
function pluralizeQty(qty: number, unit: string): string {
  if (COUNTABLE_QTY.has(unit) && qty !== 1) return `${unit}s`
  return unit
}

function composeFrequency(amount: string, unit: FreqUnit): string {
  if (!amount) return ''
  const n = Number(amount)
  if (unit === 'hour') return `every ${amount} hour${n === 1 ? '' : 's'}`
  const word = n === 1 ? 'time' : 'times'
  return unit === 'week' ? `${amount} ${word} weekly` : `${amount} ${word} daily`
}

function composeDuration(amount: string, unit: DurUnit): string {
  if (!amount) return ''
  const n = Number(amount)
  return `${amount} ${unit}${n === 1 ? '' : 's'}`
}

// ── Regimen math: does the dispensed quantity cover frequency × duration? ──
// Only meaningful for discrete solid forms where ~1 unit is taken per dose.
const DOSE_COUNTABLE = new Set(['tablet', 'capsule', 'piece', 'sachet'])
const DURATION_DAYS: Record<DurUnit, number> = { day: 1, week: 7, month: 30 }

/** Minimum number of units the course needs (1 unit per dose), or null if not computable. */
function requiredDoses(it: MedItem): number | null {
  const days = Number(it.dur_amount) * DURATION_DAYS[it.dur_unit]
  const f = Number(it.freq_amount)
  if (!(days > 0) || !(f > 0)) return null
  let doses: number
  if (it.freq_unit === 'hour') doses = (24 / f) * days        // every f hours
  else if (it.freq_unit === 'week') doses = f * (days / 7)    // f times per week
  else doses = f * days                                       // f times per day
  if (!isFinite(doses) || doses <= 0) return null
  return Math.ceil(doses)
}

/** Error string when the quantity is too small to cover the regimen, else null. */
function regimenError(it: MedItem): string | null {
  if (!DOSE_COUNTABLE.has(it.quantity_unit)) return null
  const qty = Number(it.quantity)
  if (!(qty > 0)) return null
  const need = requiredDoses(it)
  if (need == null) return null
  if (qty < need) {
    return `Needs at least ${need} ${pluralizeQty(need, it.quantity_unit)} for ${composeFrequency(it.freq_amount, it.freq_unit)} for ${composeDuration(it.dur_amount, it.dur_unit)}.`
  }
  return null
}

export default function NewPrescriptionPage() {
  const navigate = useNavigate()
  const { data: recordsData } = useAllPatientRecords()
  const createPrescription = useCreatePrescription()

  const [patientRecordId, setPatientRecordId] = useState('')
  const [items, setItems] = useState<MedItem[]>([{ ...EMPTY_ITEM }])
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const records = recordsData?.data ?? []
  const selectedRecord = records.find((r) => String(r.id) === patientRecordId) ?? null

  const updateItem = (index: number, field: keyof MedItem, value: string) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  // Atomic multi-field update (used when picking a catalog medicine sets several fields at once).
  const patchItem = (index: number, patch: Partial<MedItem>) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, ...patch } : item))
  }

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }])

  const removeItem = (index: number) => {
    if (items.length === 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const isValid = patientRecordId && items.every((it) =>
    it.drug_name && it.dosage &&
    Number(it.quantity) > 0 && it.quantity_unit &&
    Number(it.freq_amount) > 0 && it.freq_unit &&
    Number(it.dur_amount) > 0 && it.dur_unit &&
    !regimenError(it),
  )

  const handleSubmit = async () => {
    if (!isValid) return
    setError(null)
    try {
      const rx = await createPrescription.mutateAsync({
        patient_record_id: Number(patientRecordId),
        items: items.map((it) => ({
          drug_name: it.drug_name,
          dosage: it.dosage,
          quantity: Number(it.quantity),
          quantity_unit: it.quantity_unit,
          frequency: composeFrequency(it.freq_amount, it.freq_unit),
          duration: composeDuration(it.dur_amount, it.dur_unit),
          instructions: it.instructions || null,
        })),
      })
      navigate(`/prescriptions/${rx.id}`)
    } catch {
      setError('Failed to create prescription. Please try again.')
    }
  }

  // Shared styles for the inline unit <select> sitting next to a number input.
  const selectCls = 'h-9 rounded-lg border text-sm text-slate-700 bg-white px-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const selectStyle = { borderColor: 'hsl(214 20% 90%)' }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/prescriptions')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 bg-white rounded-lg px-3 py-1.5 shadow-sm transition-colors"
          style={{ border: '1px solid hsl(214 20% 90%)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h2 className="text-base font-bold text-slate-800">Issue New Prescription</h2>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Visit Record</p>
          <select
            value={patientRecordId}
            onChange={(e) => setPatientRecordId(e.target.value)}
            aria-label="Patient visit record"
            className="w-full h-10 rounded-lg border text-sm text-slate-700 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: 'hsl(214 20% 90%)' }}
          >
            <option value="">Select a patient visit record…</option>
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {r.patient?.user?.name} — {r.diagnosis} ({new Date(r.visit_date).toLocaleDateString('en-PH', { dateStyle: 'medium' })})
              </option>
            ))}
          </select>
          {records.length === 0 && (
            <p className="text-xs text-slate-400 mt-2">No visit records found. Create a consultation first.</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Pill size={15} className="text-blue-600" />
              <p className="text-sm font-semibold text-slate-700">Medications</p>
            </div>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus size={13} className="mr-1" /> Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, i) => {
              const shaded = i % 2 === 1 // subtle neutral alternation so each item reads as its own block
              const rxError = regimenError(item)
              return (
              <div
                key={i}
                className="p-4 rounded-lg relative transition-colors"
                style={{
                  border: `1px solid ${shaded ? 'hsl(214 18% 89%)' : 'hsl(214 20% 92%)'}`,
                  backgroundColor: shaded ? 'hsl(214 16% 96.5%)' : 'hsl(0 0% 100%)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: 'hsl(201 60% 92%)', color: 'hsl(201 100% 28%)' }}
                  >
                    Item {i + 1}
                  </span>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Drug name — searchable dropdown, browsable without typing */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Drug Name (generic)</label>
                    <MedicineCombobox
                      value={item.drug_name}
                      // Free-typing a name clears the catalog form, so all quantity units reopen.
                      onValueChange={(v) => patchItem(i, { drug_name: v, form: null })}
                      onSelect={(med) => {
                        // Pull the catalog's authoritative strength (carries its own unit: mg, mcg,
                        // %, IU, mg/mL, …) and the dosage form, which restricts the quantity units.
                        const strength = med.strength?.split(',')[0]?.trim()
                        const allowed = quantityUnitsForForm(med.dosage_form)
                        patchItem(i, {
                          drug_name: med.generic_name,
                          form: med.dosage_form ?? null,
                          ...(strength ? { dosage: strength } : {}),
                          // Keep the current unit if it's still valid for this form, else snap to the first.
                          quantity_unit: allowed.includes(item.quantity_unit) ? item.quantity_unit : allowed[0],
                        })
                      }}
                      placeholder="Pick from the catalog or type a custom name"
                    />
                  </div>

                  {/* Dosage (strength) — auto-fills from the catalog, still editable. Free text on
                      purpose: strengths vary too much for a dropdown (mg, mcg, %, IU, mg/5 mL, combos). */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Dosage (strength)</label>
                    <Input
                      value={item.dosage}
                      onChange={(e) => updateItem(i, 'dosage', e.target.value)}
                      placeholder="e.g. 500 mg · 250 mg/5 mL · 0.05%"
                      aria-label={`Dosage for item ${i + 1}`}
                      className="h-9 text-sm border-slate-200"
                    />
                  </div>

                  {/* Quantity — number + unit */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Quantity</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                        placeholder="0"
                        aria-label={`Quantity for item ${i + 1}`}
                        className="h-9 text-sm border-slate-200 flex-1 min-w-0"
                      />
                      <select
                        value={item.quantity_unit}
                        onChange={(e) => updateItem(i, 'quantity_unit', e.target.value)}
                        aria-label={`Quantity unit for item ${i + 1}`}
                        className={selectCls}
                        style={selectStyle}
                      >
                        {/* Only units valid for the picked drug's form (all units for a custom name). */}
                        {quantityUnitsForForm(item.form).map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Frequency — number + unit */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Frequency</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={item.freq_amount}
                        onChange={(e) => updateItem(i, 'freq_amount', e.target.value)}
                        placeholder="0"
                        aria-label={`Frequency amount for item ${i + 1}`}
                        className="h-9 text-sm border-slate-200 flex-1 min-w-0"
                      />
                      <select
                        value={item.freq_unit}
                        onChange={(e) => updateItem(i, 'freq_unit', e.target.value)}
                        aria-label={`Frequency unit for item ${i + 1}`}
                        className={selectCls}
                        style={selectStyle}
                      >
                        {FREQ_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Duration — number + unit */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Duration</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={item.dur_amount}
                        onChange={(e) => updateItem(i, 'dur_amount', e.target.value)}
                        placeholder="0"
                        aria-label={`Duration amount for item ${i + 1}`}
                        className="h-9 text-sm border-slate-200 flex-1 min-w-0"
                      />
                      <select
                        value={item.dur_unit}
                        onChange={(e) => updateItem(i, 'dur_unit', e.target.value)}
                        aria-label={`Duration unit for item ${i + 1}`}
                        className={selectCls}
                        style={selectStyle}
                      >
                        {DURATION_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Instructions (optional)</label>
                    <Textarea
                      value={item.instructions}
                      onChange={(e) => updateItem(i, 'instructions', e.target.value)}
                      placeholder="e.g. Take after meals"
                      rows={2}
                      aria-label={`Instructions for item ${i + 1}`}
                      className="text-sm border-slate-200 resize-none"
                    />
                  </div>
                </div>

                {rxError && (
                  <p
                    className="mt-3 text-xs font-medium text-red-600 bg-red-50 rounded-lg px-3 py-2 flex items-start gap-1.5"
                    style={{ border: '1px solid hsl(0 80% 90%)' }}
                  >
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    {rxError}
                  </p>
                )}
              </div>
              )
            })}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg" style={{ border: '1px solid hsl(0 80% 90%)' }}>
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/prescriptions')}>Cancel</Button>
          <button
            disabled={!isValid}
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: 'hsl(201 100% 36%)' }}
          >
            <Save size={14} /> Issue Prescription
          </button>
        </div>
      </div>

      {/* ── Confirmation dialog ── */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'hsl(201 60% 92%)' }}>
                <AlertTriangle size={18} style={{ color: 'hsl(201 100% 36%)' }} />
              </div>
              <div>
                <DialogTitle className="text-slate-800 font-bold text-base">Issue Prescription</DialogTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Please review the prescription details before confirming. This action will be recorded and cannot be undone.
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Summary */}
          <div className="space-y-3 my-1">
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'hsl(210 14% 97%)', border: '1px solid hsl(210 18% 90%)' }}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Patient</p>
              <p className="text-sm font-semibold text-slate-800">{selectedRecord?.patient?.user?.name ?? '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">{selectedRecord?.diagnosis ?? '—'}</p>
            </div>

            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'hsl(210 14% 97%)', border: '1px solid hsl(210 18% 90%)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Pill size={12} style={{ color: 'hsl(201 100% 36%)' }} />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Medications ({items.length})</p>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => {
                  const qty = Number(item.quantity)
                  return (
                    <div key={i} className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-700">{item.drug_name || '—'}</span>
                      <span className="text-xs text-slate-400 shrink-0 text-right">
                        {item.dosage} · {qty} {pluralizeQty(qty, item.quantity_unit)} · {composeFrequency(item.freq_amount, item.freq_unit)} · {composeDuration(item.dur_amount, item.dur_unit)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-1">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={createPrescription.isPending}
              className="border-slate-200 text-slate-600"
            >
              Go Back
            </Button>
            <button
              onClick={async () => { await handleSubmit(); setShowConfirm(false) }}
              disabled={createPrescription.isPending}
              className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              {createPrescription.isPending
                ? <><Loader2 size={14} className="animate-spin" /> Issuing…</>
                : <><Save size={14} /> Confirm & Issue</>}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

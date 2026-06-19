import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import MedicineCombobox from '@/features/medicines/MedicineCombobox'
import { type RxItem, type FreqUnit, autoCompute, parseDosageOptions, quantityUnitsForForm } from './rxItem'

interface Props {
  item: RxItem
  index: number
  canRemove: boolean
  onChange: (item: RxItem) => void
  onRemove: () => void
}

const FREQ_UNITS: { value: FreqUnit; label: string }[] = [
  { value: 'day',  label: 'times / day' },
  { value: 'week', label: 'times / week' },
  { value: 'hour', label: 'hour interval' },
]

/**
 * One medication row (Epic O): brand-aware generic picker, dosage dropdown sourced from the
 * medicine's strength (manual override via datalist), and structured quantity (with a form-aware
 * unit) / frequency (per day, per week, or every-N-hours) / duration that auto-compute (fill any
 * 2 → the 3rd).
 */
export default function PrescriptionItemEditor({ item, index, canRemove, onChange, onRemove }: Props) {
  // Apply a field change, then auto-fill the missing dosing field.
  const patch = (changes: Partial<RxItem>) => onChange(autoCompute({ ...item, ...changes }))
  const dosageListId = `dosage-opts-${index}`
  const unitOptions = quantityUnitsForForm(item.form)
  const selectCls = 'h-9 rounded-lg border text-sm bg-white px-1.5'
  const selectStyle = { borderColor: 'hsl(210 18% 88%)' }

  return (
    <div className="p-3 rounded-lg" style={{ border: '1px solid hsl(210 18% 90%)', backgroundColor: 'hsl(210 20% 98%)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'hsl(215 16% 50%)' }}>
          Medication {index + 1}
        </span>
        {canRemove && (
          <button onClick={onRemove} className="text-slate-300 hover:text-red-500 transition-colors" aria-label={`Remove medication ${index + 1}`}>
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {/* Generic (brand-aware), browsable without typing */}
        <MedicineCombobox
          value={item.drug_name}
          onValueChange={(v) => onChange({ ...item, drug_name: v, form: null })}
          onSelect={(med) => {
            const opts = parseDosageOptions(med.strength)
            const allowed = quantityUnitsForForm(med.dosage_form)
            onChange({
              ...item,
              drug_name: med.generic_name,
              brand_name: med.brand_name ?? null,
              form: med.dosage_form ?? null,
              dosageOptions: opts,
              dosage: item.dosage || opts[0] || '',
              quantity_unit: allowed.includes(item.quantity_unit) ? item.quantity_unit : allowed[0],
            })
          }}
          placeholder="Search generic or brand (e.g. Amoxicillin / Amoxil)"
        />
        {item.brand_name && (
          <p className="text-xs" style={{ color: 'hsl(201 90% 40%)' }}>Brand: {item.brand_name}</p>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {/* Dosage — dropdown from strength, but still type-able (datalist) */}
          <div>
            <Input
              value={item.dosage}
              onChange={(e) => onChange({ ...item, dosage: e.target.value })}
              placeholder="Dosage (e.g. 500 mg)"
              list={item.dosageOptions.length ? dosageListId : undefined}
              className="h-9 text-sm"
            />
            {item.dosageOptions.length > 0 && (
              <datalist id={dosageListId}>
                {item.dosageOptions.map((d) => <option key={d} value={d} />)}
              </datalist>
            )}
          </div>

          {/* Quantity — number + form-aware unit */}
          <div className="flex items-center gap-1.5">
            <Input
              type="number" min={1}
              value={item.quantity}
              onChange={(e) => patch({ quantity: e.target.value })}
              placeholder="Qty"
              aria-label={`Quantity for medication ${index + 1}`}
              className="h-9 text-sm flex-1 min-w-0"
            />
            <select
              value={item.quantity_unit}
              onChange={(e) => onChange({ ...item, quantity_unit: e.target.value })}
              aria-label={`Quantity unit for medication ${index + 1}`}
              className={selectCls}
              style={selectStyle}
            >
              {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {/* Frequency — number + unit (per day / per week / every N hours) */}
          <div className="flex items-center gap-1.5">
            <Input
              type="number" min={1}
              value={item.freqValue}
              onChange={(e) => patch({ freqValue: e.target.value })}
              placeholder="Freq"
              aria-label={`Frequency for medication ${index + 1}`}
              className="h-9 text-sm flex-1 min-w-0"
            />
            <select
              value={item.freqUnit}
              onChange={(e) => patch({ freqUnit: e.target.value as FreqUnit })}
              aria-label={`Frequency unit for medication ${index + 1}`}
              className={selectCls}
              style={selectStyle}
            >
              {FREQ_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>

          {/* Duration — value + unit */}
          <div className="flex items-center gap-1.5">
            <Input
              type="number" min={1}
              value={item.durationValue}
              onChange={(e) => patch({ durationValue: e.target.value })}
              placeholder="Duration"
              aria-label={`Duration for medication ${index + 1}`}
              className="h-9 text-sm flex-1 min-w-0"
            />
            <select
              value={item.durationUnit}
              onChange={(e) => patch({ durationUnit: e.target.value as RxItem['durationUnit'] })}
              aria-label={`Duration unit for medication ${index + 1}`}
              className={selectCls}
              style={selectStyle}
            >
              <option value="day">day(s)</option>
              <option value="week">week(s)</option>
              <option value="month">month(s)</option>
            </select>
          </div>

          <Input
            value={item.instructions}
            onChange={(e) => onChange({ ...item, instructions: e.target.value })}
            placeholder="Instructions (optional)"
            className="col-span-2 h-9 text-sm"
          />
        </div>
        <p className="text-[11px]" style={{ color: 'hsl(215 16% 60%)' }}>
          Tip: fill any two of quantity / frequency / duration — the third fills in automatically.
        </p>
      </div>
    </div>
  )
}

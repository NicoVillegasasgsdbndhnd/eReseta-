import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import MedicineCombobox from '@/features/medicines/MedicineCombobox'
import { type RxItem, autoCompute, parseDosageOptions } from './rxItem'

interface Props {
  item: RxItem
  index: number
  canRemove: boolean
  onChange: (item: RxItem) => void
  onRemove: () => void
}

/**
 * One medication row (Epic O): brand-aware generic picker, dosage dropdown sourced from the
 * medicine's strength (with manual override via datalist), and structured quantity / frequency /
 * duration that auto-compute (fill any 2 → the 3rd).
 */
export default function PrescriptionItemEditor({ item, index, canRemove, onChange, onRemove }: Props) {
  // Apply a field change, then auto-fill the missing dosing field.
  const patch = (changes: Partial<RxItem>) => onChange(autoCompute({ ...item, ...changes }))
  const dosageListId = `dosage-opts-${index}`

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
        {/* Generic (brand-aware) */}
        <MedicineCombobox
          value={item.drug_name}
          onValueChange={(v) => onChange({ ...item, drug_name: v })}
          onSelect={(med) => {
            const opts = parseDosageOptions(med.strength)
            onChange({
              ...item,
              drug_name: med.generic_name,
              brand_name: med.brand_name ?? null,
              dosageOptions: opts,
              dosage: item.dosage || opts[0] || '',
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

          {/* Quantity */}
          <Input
            type="number" min={1}
            value={item.quantity}
            onChange={(e) => patch({ quantity: e.target.value })}
            placeholder="Quantity (e.g. 21)"
            className="h-9 text-sm"
          />

          {/* Frequency — per day */}
          <div className="flex items-center gap-1.5">
            <Input
              type="number" min={1}
              value={item.freqPerDay}
              onChange={(e) => patch({ freqPerDay: e.target.value })}
              placeholder="Freq"
              className="h-9 text-sm"
            />
            <span className="text-xs whitespace-nowrap" style={{ color: 'hsl(215 16% 50%)' }}>× / day</span>
          </div>

          {/* Duration — value + unit */}
          <div className="flex items-center gap-1.5">
            <Input
              type="number" min={1}
              value={item.durationValue}
              onChange={(e) => patch({ durationValue: e.target.value })}
              placeholder="Duration"
              className="h-9 text-sm"
            />
            <select
              value={item.durationUnit}
              onChange={(e) => patch({ durationUnit: e.target.value as RxItem['durationUnit'] })}
              className="h-9 rounded-lg border text-sm bg-white px-1.5"
              style={{ borderColor: 'hsl(210 18% 88%)' }}
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

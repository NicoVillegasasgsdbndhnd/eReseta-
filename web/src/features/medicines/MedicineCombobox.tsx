import { useEffect, useRef, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Medicine } from '@/mocks/types'
import { useMedicineSearch } from './queries'

interface Props {
  value: string
  onValueChange: (value: string) => void
  onSelect: (medicine: Medicine) => void
  placeholder?: string
}

/**
 * Type-ahead picker over the generic medicines catalog. Additive: it drives a plain text value, so
 * a doctor can still free-type a name the catalog doesn't have. Picking a result fills the generic
 * name (and lets the parent pre-fill the dosage from the medicine's strength).
 */
export default function MedicineCombobox({ value, onValueChange, onSelect, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [debounced, setDebounced] = useState(value)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 250)
    return () => clearTimeout(t)
  }, [value])

  const term = debounced.trim()
  const { data, isFetching } = useMedicineSearch(debounced, { enabled: open && term.length >= 1 })
  const results = data?.data ?? []

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <Input
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? 'Search generic medicine…'}
          className="h-9 text-sm border-slate-200 pl-8"
          autoComplete="off"
        />
        {isFetching && (
          <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-300" />
        )}
      </div>

      {open && term.length >= 1 && (
        <div
          className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg bg-white shadow-lg"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {results.length === 0 && !isFetching && (
            <p className="px-3 py-2.5 text-xs text-slate-500">
              No generic medicine found — you can type a custom name.
            </p>
          )}
          {results.map((med) => (
            <button
              type="button"
              key={med.id}
              onClick={() => {
                onSelect(med)
                setOpen(false)
              }}
              className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">
                  {med.generic_name}
                  {med.brand_name && (
                    <span className="ml-1.5 text-xs font-normal text-sky-600">({med.brand_name})</span>
                  )}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {[med.strength, med.dosage_form, med.route].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <span
                className={
                  'shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ' +
                  (med.is_available ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')
                }
              >
                {med.is_available ? 'Available' : 'Out of stock'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

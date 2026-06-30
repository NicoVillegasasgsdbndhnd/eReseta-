import { useEffect, useRef, useState } from 'react'
import { Search, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Medicine } from '@/mocks/types'
import { useMedicineSearch } from './queries'

interface Props {
  value: string
  onSelect: (medicine: Medicine) => void
  onClear: () => void
  placeholder?: string
}

/**
 * Strict generic picker over DEAMHI's catalog. The committed value (`value`) only ever comes from
 * selecting a catalog entry — typing merely drives the search, so a doctor can never submit a drug
 * the hospital doesn't stock. The pharmacist resolves the actual brand at dispensing.
 */
export default function MedicineCombobox({ value, onSelect, onClear, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const { data, isFetching } = useMedicineSearch(debounced, { availableOnly: true, enabled: open })
  const results = data?.data ?? []

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // When a generic is already chosen, show it as a read-only chip with a clear button.
  if (value && !open) {
    return (
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          onClick={() => { setQuery(''); setDebounced(''); setOpen(true) }}
          className="flex h-9 w-full items-center justify-between rounded-lg bg-white px-3 text-left text-sm font-medium text-slate-700"
          style={{ border: '1px solid hsl(210 18% 88%)' }}
        >
          <span className="truncate">{value}</span>
          <X
            size={15}
            className="shrink-0 text-slate-400 hover:text-red-500"
            onClick={(e) => { e.stopPropagation(); onClear() }}
          />
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <Input
          value={query}
          autoFocus={open}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? 'Search generic medicine…'}
          className="h-9 text-sm border-slate-200 pl-8"
          autoComplete="off"
        />
        {isFetching && (
          <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-300" />
        )}
      </div>

      {open && (
        <div
          className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg bg-white shadow-lg"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {debounced.trim().length === 0 && (
            <p className="px-3 py-2 text-[11px] font-medium text-slate-400 border-b" style={{ borderColor: 'var(--color-border)' }}>
              Browse the DEAMHI formulary or type to search.
            </p>
          )}
          {results.length === 0 && !isFetching && (
            <p className="px-3 py-2.5 text-xs text-slate-500">No matching generic in the DEAMHI catalog.</p>
          )}
          {results.map((med) => (
            <button
              type="button"
              key={med.id}
              onClick={() => { onSelect(med); setOpen(false) }}
              className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{med.generic_name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {[med.dosage_form, (med.strengths && med.strengths.length ? med.strengths.slice(0, 3).join(' / ') : null)]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </p>
              </div>
              {!!med.brand_count && (
                <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  {med.brand_count} brand{med.brand_count === 1 ? '' : 's'}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { DiagnosticTest } from '@/mocks/types'
import { useDiagnosticTestSearch } from './queries'

interface Props {
  value: string
  onValueChange: (value: string) => void
  onSelect: (test: DiagnosticTest) => void
  placeholder?: string
}

/**
 * Type-ahead picker over the admin-managed diagnostic test catalog (available tests only).
 * Mirrors MedicineCombobox: drives a plain text value so a doctor can free-type a test the
 * catalog doesn't list; picking a result fills the name and exposes the catalog id.
 */
export default function DiagnosticTestCombobox({ value, onValueChange, onSelect, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [debounced, setDebounced] = useState(value)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 250)
    return () => clearTimeout(t)
  }, [value])

  const term = debounced.trim()
  const { data, isFetching } = useDiagnosticTestSearch(debounced, {
    availableOnly: true,
    enabled: open && term.length >= 1,
  })
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
          placeholder={placeholder ?? 'Search test (e.g. Chest X-ray)…'}
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
              No catalog test found — you can type a custom test name.
            </p>
          )}
          {results.map((test) => (
            <button
              type="button"
              key={test.id}
              onClick={() => {
                onSelect(test)
                setOpen(false)
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50"
            >
              <p className="text-sm font-medium text-slate-700 truncate">{test.name}</p>
              {test.category && (
                <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600 capitalize">
                  {test.category}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

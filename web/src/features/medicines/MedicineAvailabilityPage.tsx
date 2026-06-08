import { useEffect, useState } from 'react'
import { Pill, Loader2, Search, CheckCircle2, XCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useMedicineSearch, useToggleMedicineAvailability } from './queries'

export default function MedicineAvailabilityPage() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [pendingId, setPendingId] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search)
      setPage(1)
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useMedicineSearch(debounced, { page })
  const toggle = useToggleMedicineAvailability()
  const medicines = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Pill size={18} className="text-teal-600" />
        <h2 className="text-base font-bold text-slate-800">Medicine Availability</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4" style={{ border: '1px solid var(--color-border)' }}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search generic medicine…"
            className="h-10 pl-9 text-sm border-slate-200"
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Toggle a medicine's stock status. Doctors see an available / out-of-stock badge while prescribing.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-slate-300" />
          </div>
        ) : medicines.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-16">No medicines found.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {medicines.map((med) => (
              <li key={med.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{med.generic_name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {[med.strength, med.dosage_form, med.route].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={toggle.isPending && pendingId === med.id}
                  onClick={() => {
                    setPendingId(med.id)
                    toggle.mutate({ id: med.id, is_available: !med.is_available })
                  }}
                  className={cn(
                    'flex items-center gap-1.5 shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors',
                    med.is_available
                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      : 'bg-red-50 text-red-500 hover:bg-red-100',
                  )}
                >
                  {med.is_available ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  {med.is_available ? 'Available' : 'Out of stock'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-sm px-3 py-1.5 rounded-lg bg-white shadow-sm disabled:opacity-40"
            style={{ border: '1px solid var(--color-border)' }}
          >
            Previous
          </button>
          <span className="text-xs text-slate-400">Page {meta.current_page} of {meta.last_page}</span>
          <button
            disabled={page >= meta.last_page}
            onClick={() => setPage((p) => p + 1)}
            className="text-sm px-3 py-1.5 rounded-lg bg-white shadow-sm disabled:opacity-40"
            style={{ border: '1px solid var(--color-border)' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Pill, Loader2, Search, CheckCircle2, XCircle, ChevronDown, Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Medicine, MedicineBrand } from '@/mocks/types'
import { useMedicineSearch, useToggleMedicineAvailability, useToggleBrandAvailability } from './queries'

function AvailabilityPill({
  available,
  onClick,
  disabled,
}: {
  available: boolean
  onClick: (e: React.MouseEvent) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50',
        available ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 text-red-500 hover:bg-red-100',
      )}
    >
      {available ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {available ? 'Available' : 'Out of stock'}
    </button>
  )
}

function GenericRow({ med }: { med: Medicine }) {
  const [open, setOpen] = useState(false)
  const toggleGeneric = useToggleMedicineAvailability()
  const toggleBrand = useToggleBrandAvailability()
  const brands: MedicineBrand[] = med.brands ?? []

  // The generic's own dosage_form is a single value and misleads on mixed-form generics
  // (e.g. Acetylcysteine spans ampule/syrup/sachet/tablet). Derive the label from the actual
  // brands: one shared form → show it; several → "multiple forms"; brands not loaded → fall back.
  const brandForms = [...new Set(brands.map((b) => b.dosage_form).filter(Boolean))]
  const formLabel =
    brandForms.length > 1 ? 'multiple forms' : brandForms[0] ?? med.dosage_form

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <ChevronDown size={15} className={cn('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{med.generic_name}</p>
            <p className="truncate text-xs text-slate-500">
              {[formLabel, `${med.brand_count ?? brands.length} brand${(med.brand_count ?? brands.length) === 1 ? '' : 's'}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <AvailabilityPill
          available={med.is_available}
          disabled={toggleGeneric.isPending}
          onClick={(e) => { e.stopPropagation(); toggleGeneric.mutate({ id: med.id, is_available: !med.is_available }) }}
        />
      </button>

      {open && (
        <div className="bg-slate-50/70 px-4 pb-3 pt-1">
          {brands.length === 0 ? (
            <p className="px-2 py-2 text-xs text-slate-400">No brands listed for this generic.</p>
          ) : (
            <ul className="space-y-1.5">
              {brands.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Package size={13} className="shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-700">{b.brand_name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {[b.strength, b.packaging, b.hospital_code].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                  </div>
                  <AvailabilityPill
                    available={b.is_available}
                    disabled={toggleBrand.isPending}
                    onClick={(e) => { e.stopPropagation(); toggleBrand.mutate({ id: b.id, is_available: !b.is_available }) }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}

export default function MedicineAvailabilityPage() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search)
      setPage(1)
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useMedicineSearch(debounced, { page })
  const medicines = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-2">
        <Pill size={18} className="text-teal-600" />
        <h2 className="text-base font-bold text-slate-800">Medicine Availability</h2>
      </div>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid var(--color-border)' }}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search generic or brand…"
            className="h-10 border-slate-200 pl-9 text-sm"
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Expand a generic to manage its brands. Toggle stock at the generic level (hides all brands while prescribing)
          or per brand. Doctors prescribe the generic; pharmacists dispense an available brand.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid var(--color-border)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-slate-300" />
          </div>
        ) : medicines.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">No medicines found.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {medicines.map((med) => <GenericRow key={med.id} med={med} />)}
          </ul>
        )}
      </div>

      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg bg-white px-3 py-1.5 text-sm shadow-sm disabled:opacity-40"
            style={{ border: '1px solid var(--color-border)' }}
          >
            Previous
          </button>
          <span className="text-xs text-slate-500">Page {meta.current_page} of {meta.last_page}</span>
          <button
            disabled={page >= meta.last_page}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg bg-white px-3 py-1.5 text-sm shadow-sm disabled:opacity-40"
            style={{ border: '1px solid var(--color-border)' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  Pill, Search, CheckCircle2, XCircle, ChevronDown, Package,
  PackageSearch, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Medicine, MedicineBrand } from '@/mocks/types'
import { useMedicineSearch, useToggleMedicineAvailability, useToggleBrandAvailability } from './queries'

const BORDER = { border: '1px solid var(--color-border)' }

function AvailabilityPill({
  available,
  onClick,
  disabled,
  label,
}: {
  available: boolean
  onClick: (e: React.MouseEvent) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`${label} — currently ${available ? 'available' : 'out of stock'}. Tap to mark ${available ? 'out of stock' : 'available'}.`}
      className={cn(
        'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        available
          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:ring-emerald-400'
          : 'bg-red-50 text-red-600 hover:bg-red-100 focus-visible:ring-red-400',
      )}
    >
      {available ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {available ? 'Available' : 'Out of stock'}
    </button>
  )
}

/** Tiny "X of Y in stock" chip — lets the pharmacist gauge brand availability without expanding. */
function StockRatio({ inStock, total }: { inStock: number; total: number }) {
  if (total === 0) return null
  const all = inStock === total
  const none = inStock === 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        none ? 'bg-red-50 text-red-600' : all ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
      )}
      title={`${inStock} of ${total} brands in stock`}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', none ? 'bg-red-500' : all ? 'bg-emerald-500' : 'bg-amber-500')} />
      {inStock}/{total} in stock
    </span>
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
  const formLabel = brandForms.length > 1 ? 'multiple forms' : brandForms[0] ?? med.dosage_form
  const brandCount = med.brand_count ?? brands.length
  const inStock = brands.filter((b) => b.is_available).length

  return (
    <li className={cn('relative', !med.is_available && 'bg-red-50/30')}>
      {/* Left accent bar flags out-of-stock generics for fast scanning down a long list. */}
      {!med.is_available && <span className="absolute inset-y-0 left-0 w-1 bg-red-400" aria-hidden />}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <ChevronDown size={15} className={cn('shrink-0 text-slate-400 transition-transform duration-200', open && 'rotate-180')} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{med.generic_name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs text-slate-500">
                {[formLabel, `${brandCount} brand${brandCount === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
              </span>
              {brandCount > 0 && <StockRatio inStock={inStock} total={brandCount} />}
            </div>
          </div>
        </div>
        <AvailabilityPill
          label={med.generic_name}
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
                  style={BORDER}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-teal-50 text-teal-600">
                      <Package size={13} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-700">{b.brand_name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {[b.strength, b.dosage_form, b.packaging, b.hospital_code].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                  </div>
                  <AvailabilityPill
                    label={b.brand_name}
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

/** Skeleton rows reserve the list's space during load so the layout doesn't jump when data lands. */
function SkeletonRow() {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="h-3.5 w-3.5 rounded bg-slate-100" />
        <div className="space-y-2">
          <div className="h-3.5 w-40 rounded bg-slate-100" />
          <div className="h-2.5 w-24 rounded bg-slate-100" />
        </div>
      </div>
      <div className="h-7 w-24 rounded-lg bg-slate-100" />
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
  const total = meta?.total ?? medicines.length

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600">
          <Pill size={20} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Medicine Availability</h2>
          <p className="text-xs text-slate-500">Toggle what the pharmacy can dispense — by generic or by brand.</p>
        </div>
      </div>

      {/* Search + guidance */}
      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm" style={BORDER}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search generic or brand…"
            aria-label="Search medicines"
            className="h-10 border-slate-200 pl-9 text-sm"
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Expand a generic to manage its brands. A generic toggle hides all its brands while prescribing.
          </p>
          {!isLoading && (
            <span className="shrink-0 text-xs font-medium text-slate-400">
              {debounced ? `${total} match${total === 1 ? '' : 'es'}` : `${total} generics`}
            </span>
          )}
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={BORDER}>
        {isLoading ? (
          <ul className="animate-pulse divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </ul>
        ) : medicines.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
              <PackageSearch size={22} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-600">No medicines found</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {debounced ? `Nothing matches “${debounced}”. Try a different generic or brand.` : 'The catalog is empty.'}
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {medicines.map((med) => <GenericRow key={med.id} med={med} />)}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex cursor-pointer items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            style={BORDER}
          >
            <ChevronLeft size={15} /> Previous
          </button>
          <span className="text-xs text-slate-500">Page {meta.current_page} of {meta.last_page}</span>
          <button
            disabled={page >= meta.last_page}
            onClick={() => setPage((p) => p + 1)}
            className="flex cursor-pointer items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            style={BORDER}
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

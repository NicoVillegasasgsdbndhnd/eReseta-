import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownUp,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FilePlus,
  FileText,
  Loader2,
  Pill,
  Search,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import StatusBadge from '@/components/common/StatusBadge'
import { useAuthStore } from '@/features/auth/authStore'
import { usePrescriptions } from './queries'
import type { Prescription } from '@/mocks/types'

const BLUE = 'hsl(201 100% 36%)'
const INK = 'hsl(215 30% 14%)'
const BORDER = 'hsl(210 18% 88%)'

type RxSort = 'recent' | 'patient' | 'status' | 'items'

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Issued', value: 'issued' },
  { label: 'Verified', value: 'verified' },
  { label: 'Dispensed', value: 'dispensed' },
  { label: 'Expired', value: 'expired' },
]

const SORT_OPTIONS: { label: string; value: RxSort }[] = [
  { label: 'Newest issued', value: 'recent' },
  { label: 'Patient A-Z', value: 'patient' },
  { label: 'Status', value: 'status' },
  { label: 'Most items', value: 'items' },
]

function patientName(rx: Prescription) {
  return rx.patient_record?.patient?.user?.name ?? '-'
}

function formatIssuedDate(value: string) {
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function medicationPreview(rx: Prescription) {
  const names = rx.items.slice(0, 2).map((item) => item.drug_name).join(', ')
  if (!names) return 'No medicine items'
  return rx.items.length > 2 ? `${names} +${rx.items.length - 2} more` : names
}

export default function PrescriptionsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data, isLoading, isError } = usePrescriptions()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState<RxSort>('recent')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })

  const prescriptions = data?.data ?? []
  const isPatient = user?.role === 'patient'
  const activePrescriptions = prescriptions.filter((rx) => rx.status === 'issued' || rx.status === 'verified')
  const dispensedPrescriptions = prescriptions.filter((rx) => rx.status === 'dispensed')
  const latestPrescription = prescriptions[0]

  const filteredPrescriptions = useMemo(() => {
    const query = search.trim().toLowerCase()

    return prescriptions
      .filter((rx) => {
        if (statusFilter && rx.status !== statusFilter) return false
        if (!query) return true

        return (
          rx.reference_no.toLowerCase().includes(query) ||
          patientName(rx).toLowerCase().includes(query) ||
          (rx.doctor?.user?.name ?? '').toLowerCase().includes(query) ||
          (rx.patient_record?.diagnosis ?? '').toLowerCase().includes(query) ||
          rx.items.some((item) => item.drug_name.toLowerCase().includes(query))
        )
      })
      .sort((a, b) => {
        if (sortBy === 'patient') return patientName(a).localeCompare(patientName(b))
        if (sortBy === 'status') return a.status.localeCompare(b.status) || new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
        if (sortBy === 'items') return b.items.length - a.items.length || new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
        return new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
      })
  }, [prescriptions, search, sortBy, statusFilter])

  // Lifecycle counts for the filter pills (over the loaded set the page filters client-side).
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { '': prescriptions.length, issued: 0, verified: 0, dispensed: 0, expired: 0 }
    for (const rx of prescriptions) counts[rx.status] = (counts[rx.status] ?? 0) + 1
    return counts
  }, [prescriptions])

  // Group the (already filtered + sorted) list by patient — one accordion row per patient.
  const patientGroups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; rxs: Prescription[] }>()
    for (const rx of filteredPrescriptions) {
      const id = rx.patient_record?.patient?.id
      const key = id != null ? `p${id}` : `n:${patientName(rx)}`
      if (!map.has(key)) map.set(key, { key, name: patientName(rx), rxs: [] })
      map.get(key)!.rxs.push(rx)
    }
    return Array.from(map.values())
  }, [filteredPrescriptions])

  if (isPatient) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
        <section
          className="overflow-hidden rounded-xl bg-white shadow-sm"
          style={{ border: '1px solid hsl(210 18% 88%)' }}
        >
          <div
            className="grid gap-5 p-4 sm:p-6 md:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]"
            style={{ background: 'linear-gradient(135deg, hsl(201 100% 36%) 0%, hsl(205 92% 30%) 58%, hsl(152 48% 35%) 100%)' }}
          >
            <div className="min-w-0 text-white">
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
              >
                <Pill size={14} />
                My prescription records
              </div>
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Your medicines, clearly organized.</h1>
              <p className="mt-2 max-w-xl text-sm" style={{ color: 'rgba(255,255,255,0.76)' }}>
                Review active prescriptions, check dispensing status, and open your printable DEAMHI Hospital Rx.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { label: 'Total Rx', value: prescriptions.length },
                  { label: 'Active', value: activePrescriptions.length },
                  { label: 'Dispensed', value: dispensedPrescriptions.length },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg px-4 py-2"
                    style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)' }}
                  >
                    <p className="text-2xl font-bold leading-none">{item.value}</p>
                    <p className="mt-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-lg">
              {latestPrescription ? (
                <>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Latest prescription</p>
                      <p className="mt-1 font-mono text-xl font-bold leading-tight text-slate-900">{latestPrescription.reference_no}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(latestPrescription.issued_at).toLocaleDateString('en-PH', { dateStyle: 'long' })}
                      </p>
                    </div>
                    <StatusBadge status={latestPrescription.status} />
                  </div>
                  <div className="space-y-2">
                    {latestPrescription.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                          <Pill size={14} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{item.drug_name}</p>
                          <p className="text-xs text-slate-500">{item.dosage} | {item.frequency}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate(`/prescriptions/${latestPrescription.id}`)}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: 'hsl(201 100% 36%)' }}
                  >
                    Open Hospital Rx
                  </button>
                </>
              ) : (
                <div className="flex min-h-56 flex-col items-center justify-center text-center">
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <FileText size={22} />
                  </span>
                  <p className="text-lg font-bold text-slate-900">No prescriptions yet</p>
                  <p className="mt-1 max-w-xs text-sm text-slate-500">Your digital prescriptions will appear here after a consultation.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : isError ? (
          <div className="text-center py-20 text-sm text-red-500">Failed to load prescriptions.</div>
        ) : prescriptions.length === 0 ? (
          <div className="rounded-xl bg-white px-6 py-14 text-center shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
            <Pill size={28} className="mx-auto text-slate-300" />
            <p className="mt-3 text-base font-bold text-slate-900">No prescription records</p>
            <p className="mt-1 text-sm text-slate-500">Your prescriptions will be listed after a DEAMHI physician issues them.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {prescriptions.map((rx) => (
              <button
                key={rx.id}
                onClick={() => navigate(`/prescriptions/${rx.id}`)}
                className="rounded-xl bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ border: '1px solid hsl(210 18% 88%)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-base font-bold text-slate-900">{rx.reference_no}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Issued {new Date(rx.issued_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                    </p>
                  </div>
                  <StatusBadge status={rx.status} />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3 sm:gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <Stethoscope size={16} className="mb-2 text-sky-700" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Doctor</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900">{rx.doctor?.user?.name ?? '-'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <CalendarDays size={16} className="mb-2 text-emerald-700" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diagnosis</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900">{rx.patient_record?.diagnosis ?? '-'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <ShieldCheck size={16} className="mb-2 text-violet-700" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{rx.items.length} medicine{rx.items.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {rx.items.slice(0, 3).map((item) => (
                    <span key={item.id} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {item.drug_name}
                    </span>
                  ))}
                  {rx.items.length > 3 && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      +{rx.items.length - 3} more
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: 'hsl(201 100% 36% / 0.1)' }}>
            <Pill size={22} style={{ color: BLUE }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>Prescriptions</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {prescriptions.length} prescription{prescriptions.length === 1 ? '' : 's'}
              {latestPrescription ? ` · latest issued ${formatIssuedDate(latestPrescription.issued_at)}` : ''}
              {' · '}click a row to open the Hospital Rx.
            </p>
          </div>
        </div>
        {user?.role === 'doctor' && (
          <button
            onClick={() => navigate('/prescriptions/new')}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white shadow-sm transition-colors hover:brightness-95"
            style={{ backgroundColor: BLUE }}
          >
            <FilePlus size={17} />
            New Prescription
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white py-16 text-center text-sm text-red-500 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
          Failed to load prescriptions. Check that the API is reachable and try again.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
            <div className="relative min-w-full flex-1 sm:min-w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reference, patient, diagnosis, or medicine..."
                className="h-9 pl-9 text-sm"
              />
            </div>
            <div className="mobile-scroll-x flex gap-2 sm:flex-wrap sm:overflow-visible sm:p-0">
              {STATUS_FILTERS.map((filter) => {
                const active = statusFilter === filter.value
                const count = statusCounts[filter.value] ?? 0
                return (
                  <button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={
                      active
                        ? { backgroundColor: BLUE, borderColor: BLUE, color: 'white' }
                        : { backgroundColor: 'white', borderColor: BORDER, color: 'hsl(215 16% 42%)' }
                    }
                  >
                    {filter.label}
                    <span
                      className="rounded-full px-1.5 text-[10px] font-bold tabular-nums"
                      style={active ? { backgroundColor: 'rgba(255,255,255,0.25)' } : { backgroundColor: 'hsl(210 16% 93%)', color: 'hsl(215 16% 42%)' }}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <ArrowDownUp size={15} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as RxSort)}
                className="h-9 w-full rounded-lg border bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-sky-400 sm:w-auto"
                style={{ borderColor: BORDER }}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredPrescriptions.length === 0 ? (
            <div className="rounded-xl bg-white px-6 py-14 text-center shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
              <Pill size={28} className="mx-auto text-slate-300" />
              <p className="mt-3 text-base font-bold text-slate-900">No prescriptions found</p>
              <p className="mt-1 text-sm text-slate-500">Try another search term or status filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {patientGroups.map((g) => {
                const open = expanded.has(g.key)
                const latest = g.rxs[0]
                return (
                  <div key={g.key} className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
                    <button
                      onClick={() => toggle(g.key)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-sky-50 sm:px-5"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: 'hsl(201 100% 36% / 0.1)' }}>
                        <User size={20} style={{ color: BLUE }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold" style={{ color: INK }}>{g.name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {g.rxs.length} prescription{g.rxs.length === 1 ? '' : 's'} · latest {formatIssuedDate(latest.issued_at)}
                        </p>
                      </div>
                      <StatusBadge status={latest.status} />
                      <span className="hidden shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 sm:inline-flex">
                        {g.rxs.length} Rx
                      </span>
                      <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </button>

                    {open && (
                      <div className="border-t border-slate-100 bg-slate-50/50">
                        <div
                          className="hidden grid-cols-[minmax(150px,1fr)_minmax(200px,1.4fr)_0.8fr_0.7fr_40px] items-center gap-4 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid"
                        >
                          <span>Reference</span>
                          <span>Medications</span>
                          <span>Issued</span>
                          <span>Status</span>
                          <span />
                        </div>
                        <div className="divide-y divide-slate-100">
                          {g.rxs.map((rx) => (
                            <button
                              key={rx.id}
                              onClick={() => navigate(`/prescriptions/${rx.id}`)}
                              title="Open prescription"
                              className="grid w-full gap-3 px-5 py-3 text-left transition-colors hover:bg-white md:grid-cols-[minmax(150px,1fr)_minmax(200px,1.4fr)_0.8fr_0.7fr_40px] md:items-center md:gap-4"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-mono text-sm font-bold text-slate-900">{rx.reference_no}</p>
                                <p className="mt-0.5 truncate text-xs text-slate-500">{rx.patient_record?.diagnosis ?? 'No diagnosis'}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">{medicationPreview(rx)}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{rx.items.length} medicine{rx.items.length !== 1 ? 's' : ''}</p>
                              </div>
                              <p className="text-sm font-semibold text-slate-800">{formatIssuedDate(rx.issued_at)}</p>
                              <div><StatusBadge status={rx.status} /></div>
                              <ChevronRight size={18} className="ml-auto text-slate-300" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

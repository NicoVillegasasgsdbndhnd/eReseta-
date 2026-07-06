import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Eye,
  FileCheck2,
  Loader2,
  PackageCheck,
  Pill,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { usePrescriptions } from './queries'
import type { Prescription, PrescriptionEvent } from '@/mocks/types'

type DateFilter = 'all' | 'today' | 'week'

const INK = 'hsl(215 30% 14%)'
const BORDER = 'hsl(210 18% 88%)'

function patientName(rx: Prescription) {
  return rx.patient_record?.patient?.user?.name ?? 'Unnamed patient'
}

function doctorName(rx: Prescription) {
  return rx.doctor?.user?.name ?? 'Unassigned doctor'
}

function dispenseEvent(rx: Prescription): PrescriptionEvent | undefined {
  return rx.events?.find((event) => event.event_type === 'DISPENSED')
}

function dispenseDate(rx: Prescription): Date {
  return new Date(dispenseEvent(rx)?.occurred_at ?? rx.updated_at ?? rx.issued_at)
}

function formatDispensedAt(rx: Prescription) {
  return dispenseDate(rx).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function withinLastDays(date: Date, days: number) {
  const start = new Date()
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)
  return date >= start
}

interface PatientGroup {
  key: string
  name: string
  rxs: Prescription[]
}

export default function DispenseHistoryPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const { data, isLoading } = usePrescriptions({ status: 'dispensed' })
  const dispensed = data?.data ?? []

  const todayCount = dispensed.filter((rx) => isSameDay(dispenseDate(rx), new Date())).length
  const weekCount = dispensed.filter((rx) => withinLastDays(dispenseDate(rx), 7)).length
  const totalItems = dispensed.reduce((sum, rx) => sum + rx.items.length, 0)

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    return dispensed.filter((rx) => {
      const date = dispenseDate(rx)
      const matchesDate =
        dateFilter === 'all' ||
        (dateFilter === 'today' && isSameDay(date, new Date())) ||
        (dateFilter === 'week' && withinLastDays(date, 7))

      if (!matchesDate) return false
      if (!term) return true

      return [
        rx.reference_no,
        patientName(rx),
        doctorName(rx),
        rx.patient_record?.diagnosis ?? '',
        ...rx.items.map((item) => `${item.drug_name} ${item.dosage}`),
      ].some((value) => value.toLowerCase().includes(term))
    })
  }, [dateFilter, dispensed, search])


  const groups: PatientGroup[] = useMemo(() => {
    const map = new Map<string, PatientGroup>()
    for (const rx of visible) {
      const id = rx.patient_record?.patient?.id
      const key = id != null ? `p${id}` : `n:${patientName(rx)}`
      if (!map.has(key)) map.set(key, { key, name: patientName(rx), rxs: [] })
      map.get(key)!.rxs.push(rx)
    }
    const arr = Array.from(map.values()).map((g) => ({
      ...g,
      rxs: [...g.rxs].sort((a, b) => dispenseDate(b).getTime() - dispenseDate(a).getTime()),
    }))

    arr.sort((a, b) => dispenseDate(b.rxs[0]).getTime() - dispenseDate(a.rxs[0]).getTime())
    return arr
  }, [visible])

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
        <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
          <div className="p-5 sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <FileCheck2 size={13} />
              Pharmacy release ledger
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: INK }}>
              Dispensed Logs
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Completed prescription releases, grouped by patient. Expand a patient to see each
              dispensed prescription and open its digital Rx slip.
            </p>
          </div>

          <div className="grid grid-cols-3 border-t border-slate-100 bg-slate-50/80 lg:min-w-[430px] lg:border-l lg:border-t-0">
            {[
              { label: 'Today', value: todayCount, icon: CalendarDays, color: 'text-blue-700' },
              { label: 'Last 7 days', value: weekCount, icon: ShieldCheck, color: 'text-cyan-700' },
              { label: 'Items released', value: totalItems, icon: Pill, color: 'text-emerald-700' },
            ].map((item) => (
              <div key={item.label} className="border-r border-slate-100 p-4 last:border-r-0 sm:p-5">
                <item.icon size={18} className={item.color} />
                <p className="mt-4 text-2xl font-black tabular-nums text-slate-900">{item.value}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reference, patient, doctor, diagnosis, or medicine..."
              className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 text-sm shadow-none focus-visible:bg-white"
            />
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'today', label: 'Today' },
              { key: 'week', label: '7 days' },
            ].map((item) => {
              const active = dateFilter === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setDateFilter(item.key as DateFilter)}
                  className={`h-9 rounded-lg px-3 text-xs font-bold transition-colors ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {dispensed.length === 0 ? (
        <section className="rounded-2xl bg-white p-12 text-center shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <PackageCheck size={28} className="text-emerald-500" />
          </div>
          <p className="font-bold text-slate-800">No dispensed prescriptions yet</p>
          <p className="mt-1 text-sm text-slate-500">Completed releases will appear here after pharmacy dispensing.</p>
        </section>
      ) : groups.length === 0 ? (
        <section className="rounded-2xl bg-white p-10 text-center shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
          <Search size={26} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">No matching dispense records</p>
          <p className="mt-1 text-xs text-slate-500">Adjust the date filter or search term to see more history.</p>
        </section>
      ) : (
        <section className="space-y-3">
          {groups.map((g) => {
            const open = expanded.has(g.key)
            return (
              <div key={g.key} className="overflow-hidden rounded-2xl bg-white shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
                <button
                  onClick={() => toggle(g.key)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50 sm:p-5"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <User size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold" style={{ color: INK }}>{g.name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {g.rxs.length} dispensed prescription{g.rxs.length === 1 ? '' : 's'} · last released {formatDispensedAt(g.rxs[0])}
                    </p>
                  </div>
                  <span className="hidden shrink-0 items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100 sm:inline-flex">
                    {g.rxs.length} Rx
                  </span>
                  <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 p-3 sm:p-4">
                    {g.rxs.map((rx) => {
                      const medicines = rx.items.slice(0, 3).map((item) => item.drug_name).join(', ')
                      const extra = Math.max(rx.items.length - 3, 0)
                      return (
                        <div
                          key={rx.id}
                          className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-sm"
                          style={{ border: `1px solid ${BORDER}` }}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            <Pill size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-black text-slate-900">{rx.reference_no}</span>
                              <span className="text-[11px] text-slate-400">{formatDispensedAt(rx)}</span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {medicines || 'No medicine items'}{extra > 0 ? ` +${extra} more` : ''} · {rx.items.length} item{rx.items.length === 1 ? '' : 's'}
                            </p>
                          </div>
                          <button
                            onClick={() => navigate(`/prescriptions/${rx.id}`, { state: { from: '/dispense-history' } })}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
                          >
                            <Eye size={14} />
                            View
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}

      {groups.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-xs text-slate-500 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
          <span>
            {groups.length} patient{groups.length === 1 ? '' : 's'} · {visible.length} release record{visible.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={() => navigate('/verify-queue')}
            className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline"
          >
            Back to Rx Queue
            <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

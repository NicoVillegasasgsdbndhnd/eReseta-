import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Eye,
  FileCheck2,
  Loader2,
  PackageCheck,
  Pill,
  Search,
  ShieldCheck,
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

function DispenseRow({ rx, onOpen }: { rx: Prescription; onOpen: () => void }) {
  const medicines = rx.items.slice(0, 3).map((item) => item.drug_name).join(', ')
  const extraCount = Math.max(rx.items.length - 3, 0)

  return (
    <button
      onClick={onOpen}
      className="grid w-full gap-4 rounded-2xl bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md sm:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)_auto] sm:items-center sm:p-5"
      style={{ border: `1px solid ${BORDER}` }}
    >
      <div className="flex min-w-0 gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <PackageCheck size={19} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-black text-slate-900">{rx.reference_no}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
              <CheckCircle2 size={12} />
              Dispensed
            </span>
          </div>
          <p className="mt-2 truncate text-base font-bold" style={{ color: INK }}>{patientName(rx)}</p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {doctorName(rx)} · {rx.patient_record?.diagnosis || 'No diagnosis noted'}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 px-3 py-3">
        <div className="flex items-start gap-2">
          <Pill size={15} className="mt-0.5 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-700">
              {medicines || 'No medicine items'}{extraCount > 0 ? ` +${extraCount} more` : ''}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {rx.items.length} item{rx.items.length === 1 ? '' : 's'} · Released {formatDispensedAt(rx)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="text-right">
          <p className="text-xs font-bold text-slate-700">{formatDispensedAt(rx)}</p>
          <p className="text-[11px] text-slate-400">Release time</p>
        </div>
        <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition-colors group-hover:bg-slate-50">
          <Eye size={14} />
          View
        </span>
      </div>
    </button>
  )
}

export default function DispenseHistoryPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
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
              Dispense History
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review completed prescription releases, confirm medication counts, and trace the final pharmacy handoff for each patient.
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
      ) : visible.length === 0 ? (
        <section className="rounded-2xl bg-white p-10 text-center shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
          <Search size={26} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">No matching dispense records</p>
          <p className="mt-1 text-xs text-slate-500">Adjust the date filter or search term to see more history.</p>
        </section>
      ) : (
        <section className="space-y-3">
          {visible.map((rx) => (
            <DispenseRow
              key={rx.id}
              rx={rx}
              onOpen={() => navigate(`/prescriptions/${rx.id}`, { state: { from: '/dispense-history' } })}
            />
          ))}
        </section>
      )}

      {visible.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-xs text-slate-500 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
          <span>{visible.length} release record{visible.length === 1 ? '' : 's'} shown</span>
          <button
            onClick={() => navigate('/verify-queue')}
            className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline"
          >
            Back to verify queue
            <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

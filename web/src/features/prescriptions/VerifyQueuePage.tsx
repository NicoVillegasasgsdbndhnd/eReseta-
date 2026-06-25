import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  Loader2,
  PackageCheck,
  Pill,
  Search,
  ShieldCheck,
} from 'lucide-react'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Input } from '@/components/ui/input'
import { usePrescriptions, useVerifyPrescription, useDispensePrescription } from './queries'
import type { Prescription } from '@/mocks/types'

type QueueFilter = 'all' | 'issued' | 'verified'

const INK = 'hsl(215 30% 14%)'
const BORDER = 'hsl(210 18% 88%)'

function patientName(rx: Prescription) {
  return rx.patient_record?.patient?.user?.name ?? 'Unnamed patient'
}

function doctorName(rx: Prescription) {
  return rx.doctor?.user?.name ?? 'Unassigned doctor'
}

function statusMeta(status: Prescription['status']) {
  if (status === 'issued') {
    return {
      label: 'Needs verification',
      action: 'Verify',
      icon: Clock3,
      badge: 'bg-amber-50 text-amber-700 ring-amber-100',
      button: 'bg-amber-600 hover:bg-amber-700',
    }
  }

  return {
    label: 'Ready to dispense',
    action: 'Dispense',
    icon: ShieldCheck,
    badge: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
    button: 'bg-[hsl(168_79%_37%)] hover:bg-[hsl(168_79%_31%)]',
  }
}

function issuedLabel(value: string) {
  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function QueueRow({
  rx,
  onOpen,
  onAction,
}: {
  rx: Prescription
  onOpen: () => void
  onAction: () => void
}) {
  const isIssued = rx.status === 'issued'
  const meta = statusMeta(rx.status)
  const StatusIcon = meta.icon
  const medicinePreview = rx.items.slice(0, 2).map((item) => item.drug_name).join(', ')
  const extraCount = Math.max(rx.items.length - 2, 0)
  const rowTint = isIssued ? 'bg-amber-50/35' : 'bg-cyan-50/35'
  const iconTint = isIssued ? 'bg-amber-50 text-amber-700' : 'bg-cyan-50 text-cyan-700'

  return (
    <div className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md" style={{ border: `1px solid ${BORDER}` }}>
      <div className={`grid gap-4 p-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)_auto] sm:items-center sm:p-5 ${rowTint}`}>
        <div className="flex min-w-0 gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconTint}`}>
            <StatusIcon size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-black text-slate-900">{rx.reference_no}</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${meta.badge}`}>
                {meta.label}
              </span>
            </div>
            <p className="mt-2 truncate text-base font-bold" style={{ color: INK }}>
              {patientName(rx)}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {doctorName(rx)} · {rx.patient_record?.diagnosis || 'No diagnosis noted'}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white/80 px-3 py-3 shadow-sm ring-1 ring-slate-200/70">
          <div className="flex items-start gap-2">
            <Pill size={15} className="mt-0.5 shrink-0 text-slate-400" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-700">
                {medicinePreview || 'No medicine items'}
                {extraCount > 0 ? ` +${extraCount} more` : ''}
              </p>
              <p className="mt-1 text-xs text-slate-500">{rx.items.length} item{rx.items.length === 1 ? '' : 's'} · Issued {issuedLabel(rx.issued_at)}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 sm:justify-end">
          <button
            onClick={onOpen}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 sm:flex-none"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <Eye size={14} />
            View
          </button>
          <button
            onClick={onAction}
            className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold text-white transition-colors sm:flex-none ${meta.button}`}
          >
            {isIssued ? <ShieldCheck size={14} /> : <PackageCheck size={14} />}
            {meta.action}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VerifyQueuePage() {
  const navigate = useNavigate()
  const [actionTarget, setActionTarget] = useState<Prescription | null>(null)
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [search, setSearch] = useState('')

  const { data, isLoading } = usePrescriptions()
  const verifyMutation = useVerifyPrescription()
  const dispenseMutation = useDispensePrescription()

  const allPrescriptions = data?.data ?? []
  const queue = allPrescriptions.filter((rx) => rx.status === 'issued' || rx.status === 'verified')
  const issuedCount = queue.filter((rx) => rx.status === 'issued').length
  const verifiedCount = queue.filter((rx) => rx.status === 'verified').length

  const visibleQueue = useMemo(() => {
    const term = search.trim().toLowerCase()

    return queue.filter((rx) => {
      const matchesFilter = filter === 'all' || rx.status === filter
      if (!matchesFilter) return false
      if (!term) return true

      return [
        rx.reference_no,
        patientName(rx),
        doctorName(rx),
        rx.patient_record?.diagnosis ?? '',
        ...rx.items.map((item) => `${item.drug_name} ${item.dosage}`),
      ].some((value) => value.toLowerCase().includes(term))
    })
  }, [filter, queue, search])

  const handleAction = async () => {
    if (!actionTarget) return
    if (actionTarget.status === 'issued') {
      await verifyMutation.mutateAsync(actionTarget.id)
    } else {
      await dispenseMutation.mutateAsync(actionTarget.id)
    }
    setActionTarget(null)
  }

  const isActing = verifyMutation.isPending || dispenseMutation.isPending

  return (
    <>
      <div className="space-y-5">
        <section className="rounded-2xl bg-white shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
          <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
            <div className="p-5 sm:p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
                <ShieldCheck size={13} />
                Pharmacist queue
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: INK }}>
                Verification Queue
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Verify newly issued prescriptions, then release verified prescriptions to dispensing once the medication is prepared.
              </p>
            </div>

            <div className="grid grid-cols-3 border-t border-slate-100 bg-slate-50/80 lg:min-w-[420px] lg:border-l lg:border-t-0">
              {[
                { label: 'To verify', value: issuedCount, color: 'text-amber-600' },
                { label: 'To dispense', value: verifiedCount, color: 'text-cyan-600' },
                { label: 'Total queue', value: queue.length, color: 'text-slate-900' },
              ].map((item) => (
                <div key={item.label} className="border-r border-slate-100 p-4 last:border-r-0 sm:p-5">
                  <p className={`text-2xl font-black tabular-nums ${item.color}`}>{item.value}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
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
                    { key: 'issued', label: 'Verify' },
                    { key: 'verified', label: 'Dispense' },
                  ].map((item) => {
                    const active = filter === item.key
                    return (
                      <button
                        key={item.key}
                        onClick={() => setFilter(item.key as QueueFilter)}
                        className={`h-9 rounded-lg px-3 text-xs font-bold transition-colors ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-slate-300" />
              </div>
            ) : queue.length === 0 ? (
              <div className="rounded-2xl bg-white p-12 text-center shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 size={28} className="text-emerald-500" />
                </div>
                <p className="font-bold text-slate-800">Queue is empty</p>
                <p className="mt-1 text-sm text-slate-500">All prescriptions have been processed.</p>
              </div>
            ) : visibleQueue.length === 0 ? (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
                <Filter size={26} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">No matching prescriptions</p>
                <p className="mt-1 text-xs text-slate-500">Adjust the filter or search term to see more queue items.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleQueue.map((rx) => (
                  <QueueRow
                    key={rx.id}
                    rx={rx}
                    onOpen={() => navigate(`/prescriptions/${rx.id}`, { state: { from: '/verify-queue' } })}
                    onAction={() => setActionTarget(rx)}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
              <p className="text-sm font-bold text-slate-900">Workflow guide</p>
              <div className="mt-4 space-y-3">
                {[
                  ['1', 'Verify issued Rx', 'Check patient, diagnosis, medicines, and blockchain record readiness.'],
                  ['2', 'Prepare medication', 'Use verified prescriptions only before release.'],
                  ['3', 'Mark dispensed', 'Complete the release after the patient receives the medicines.'],
                ].map(([step, title, copy]) => (
                  <div key={step} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-700">
                      {step}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-500">{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate('/dispense-history')}
              className="flex w-full items-center justify-between rounded-2xl bg-white p-5 text-left shadow-sm transition-colors hover:bg-slate-50"
              style={{ border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <PackageCheck size={20} />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Dispense history</p>
                  <p className="text-xs text-slate-500">Review completed releases</p>
                </div>
              </div>
              <ArrowRight size={17} className="text-slate-400" />
            </button>
          </aside>
        </section>
      </div>

      <ConfirmDialog
        open={!!actionTarget}
        onOpenChange={(o) => !o && setActionTarget(null)}
        title={actionTarget?.status === 'issued' ? 'Verify Prescription' : 'Dispense Prescription'}
        description={
          actionTarget?.status === 'issued'
            ? `Verify ${actionTarget?.reference_no}? This action will be recorded immutably on the Hyperledger Fabric blockchain.`
            : `Mark ${actionTarget?.reference_no} as dispensed? The patient will receive their medications.`
        }
        confirmLabel={actionTarget?.status === 'issued' ? 'Verify & Record' : 'Mark as Dispensed'}
        loading={isActing}
        onConfirm={handleAction}
      />
    </>
  )
}

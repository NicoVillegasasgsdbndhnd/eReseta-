import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePrescriptions, useVerifyPrescription, useDispensePrescription } from './queries'
import type { Prescription } from '@/mocks/types'

type QueueFilter = 'all' | 'to_dispense' | 'partial'

const INK = 'hsl(215 30% 14%)'
const BORDER = 'hsl(210 18% 88%)'

// A verified Rx with some (but not all) quantity already handed over is mid-dispense.
function isPartialRx(rx: Prescription): boolean {
  return rx.status === 'verified' && rx.items.some((it) => (it.dispensed_quantity ?? 0) > 0)
}

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
  // A verified Rx with some (but not all) quantity already given out is mid-dispense.
  const isPartial = !isIssued && rx.items.some((item) => (item.dispensed_quantity ?? 0) > 0)
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
              {isPartial && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                  Partially dispensed
                </span>
              )}
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
  const [dispenseTarget, setDispenseTarget] = useState<Prescription | null>(null)
  const [dispenseQty, setDispenseQty] = useState<Record<number, number>>({})
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [search, setSearch] = useState('')

  const { data, isLoading } = usePrescriptions()
  const verifyMutation = useVerifyPrescription()
  const dispenseMutation = useDispensePrescription()

  const allPrescriptions = data?.data ?? []
  const queue = allPrescriptions.filter((rx) => rx.status === 'issued' || rx.status === 'verified')
  // "To dispense" folds in items still needing verification; "Partial" = mid-dispense.
  const toDispenseCount = queue.filter((rx) => !isPartialRx(rx)).length
  const partialCount = queue.filter((rx) => isPartialRx(rx)).length

  const visibleQueue = useMemo(() => {
    const term = search.trim().toLowerCase()

    return queue.filter((rx) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'to_dispense' && !isPartialRx(rx)) ||
        (filter === 'partial' && isPartialRx(rx))
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

  const handleVerify = async () => {
    if (!actionTarget) return
    await verifyMutation.mutateAsync(actionTarget.id)
    setActionTarget(null)
  }

  // Dispense opens a per-item quantity dialog. The input is the amount to hand over THIS round;
  // it defaults to whatever still remains (ordered − already dispensed).
  const remainingOf = (it: { quantity: number; dispensed_quantity?: number | null }) =>
    Math.max(0, it.quantity - (it.dispensed_quantity ?? 0))

  const openDispense = (rx: Prescription) => {
    setDispenseQty(Object.fromEntries(rx.items.map((it) => [it.id, remainingOf(it)])))
    setDispenseTarget(rx)
  }

  const handleDispense = async () => {
    if (!dispenseTarget) return
    const items = dispenseTarget.items.map((it) => ({
      id: it.id,
      dispensed_quantity: dispenseQty[it.id] ?? remainingOf(it),
    }))
    await dispenseMutation.mutateAsync({ id: dispenseTarget.id, items })
    setDispenseTarget(null)
  }

  // Will this round fully complete the prescription (→ moves to Dispense History)?
  const dispenseWillComplete =
    !!dispenseTarget &&
    dispenseTarget.items.every((it) => (it.dispensed_quantity ?? 0) + (dispenseQty[it.id] ?? 0) >= it.quantity)

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
                Rx Queue
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Verify newly issued prescriptions and dispense them to patients. Partially dispensed
                prescriptions stay here until every medicine is fully released.
              </p>
            </div>

            <div className="grid grid-cols-3 border-t border-slate-100 bg-slate-50/80 lg:min-w-[420px] lg:border-l lg:border-t-0">
              {[
                { label: 'To dispense', value: toDispenseCount, color: 'text-cyan-600' },
                { label: 'Partial dispense', value: partialCount, color: 'text-amber-600' },
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

                <div className="relative shrink-0">
                  <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value as QueueFilter)}
                    className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm font-semibold text-slate-700 focus-visible:bg-white focus-visible:outline-none lg:w-52"
                  >
                    <option value="all">All</option>
                    <option value="to_dispense">To Dispense</option>
                    <option value="partial">Partial Dispense</option>
                  </select>
                  <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                    onAction={() => (rx.status === 'verified' ? openDispense(rx) : setActionTarget(rx))}
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
        title="Verify Prescription"
        description={`Verify ${actionTarget?.reference_no}? This action will be recorded immutably on the Hyperledger Fabric blockchain.`}
        confirmLabel="Verify & Record"
        loading={verifyMutation.isPending}
        onConfirm={handleVerify}
      />

      {/* Dispense = per-item quantity dialog (partial dispensing). Pharmacist may reduce the
          amount actually given (e.g. the patient can only buy part of it), never exceed the order. */}
      <Dialog open={!!dispenseTarget} onOpenChange={(o) => !o && setDispenseTarget(null)}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-slate-800 font-bold">Dispense {dispenseTarget?.reference_no}</DialogTitle>
            <DialogDescription className="text-slate-500 mt-1">
              Enter how much to give the patient now. You can reduce it (e.g. they can only buy part) —
              the prescription stays in the queue until everything is dispensed. The doctor's order is unchanged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {dispenseTarget?.items.map((it) => {
              const ordered = it.quantity
              const already = it.dispensed_quantity ?? 0
              const remaining = Math.max(0, ordered - already)
              const val = dispenseQty[it.id] ?? remaining
              return (
                <div key={it.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{it.drug_name}</p>
                    <p className="text-xs text-slate-500">
                      {it.dosage} · ordered {ordered}{it.quantity_unit ? ` ${it.quantity_unit}` : ''}
                      {already > 0 && (
                        <span className="text-amber-600"> · already {already} · remaining {remaining}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      min={0}
                      max={remaining}
                      value={val}
                      disabled={remaining === 0}
                      onChange={(e) => {
                        const n = Math.max(0, Math.min(remaining, Number(e.target.value) || 0))
                        setDispenseQty((prev) => ({ ...prev, [it.id]: n }))
                      }}
                      className="h-9 w-20 text-center text-sm"
                    />
                    <span className="text-xs text-slate-400">/ {remaining}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {dispenseWillComplete ? (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700" style={{ border: '1px solid hsl(152 40% 82%)' }}>
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
              <span>This <b>fully dispenses</b> the prescription — it will be marked dispensed, moved to <b>Dispense History</b>, and recorded on the blockchain.</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700" style={{ border: '1px solid hsl(38 90% 80%)' }}>
              <Clock3 size={15} className="mt-0.5 shrink-0" />
              <span><b>Partial dispense</b> — the prescription stays in this queue with the remaining amount; it completes (and anchors on-chain) only once everything is dispensed.</span>
            </div>
          )}

          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setDispenseTarget(null)}
              disabled={dispenseMutation.isPending}
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDispense}
              disabled={dispenseMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {dispenseMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              {dispenseWillComplete ? 'Complete & Dispense' : 'Dispense Partial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

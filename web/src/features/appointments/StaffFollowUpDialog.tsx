import { useEffect, useState } from 'react'
import { CalendarClock, Search, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePatients } from '@/features/patients/queries'
import { useCreateFollowUp } from './queries'

function isoDatePlusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const PRESETS = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
]


export default function StaffFollowUpDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [patient, setPatient] = useState<{ id: number; name: string } | null>(null)
  const [date, setDate] = useState(isoDatePlusDays(14))
  const [time, setTime] = useState('09:00')
  const [reason, setReason] = useState('')

  const createFollowUp = useCreateFollowUp()

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250)
    return () => clearTimeout(t)
  }, [search])

  const { data: patientsData, isFetching } = usePatients(debounced ? { search: debounced } : undefined)
  const patients = patientsData?.data ?? []

  const reset = () => {
    setSearch(''); setDebounced(''); setPatient(null)
    setDate(isoDatePlusDays(14)); setTime('09:00'); setReason('')
  }

  const close = (o: boolean) => { if (!o) reset(); onOpenChange(o) }

  const canSubmit = !!patient && !!date && !!time && !createFollowUp.isPending

  const submit = async () => {
    if (!patient) return
    try {
      await createFollowUp.mutateAsync({
        patient_id: patient.id,
        scheduled_at: `${date}T${time}:00`,
        reason: reason || undefined,
      })
      toast.success(`Follow-up booked for ${patient.name}`)
      close(false)
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.errors?.scheduled_at?.[0] ?? err.response?.data?.message ?? 'Could not book the follow-up.')
        : 'Could not book the follow-up.'
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock size={17} className="text-sky-600" /> New follow-up
          </DialogTitle>
          <DialogDescription>Book a return visit for a patient on your doctor's calendar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</label>
            {patient ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="truncate text-sm font-medium text-slate-700">{patient.name}</span>
                <button onClick={() => setPatient(null)} className="text-xs font-semibold text-sky-600 hover:underline">Change</button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient by name…" className="h-9 pl-9 text-sm" />
                </div>
                {debounced && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200">
                    {isFetching ? (
                      <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-slate-300" /></div>
                    ) : patients.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-slate-400">No patients found.</p>
                    ) : (
                      patients.slice(0, 8).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setPatient({ id: p.id, name: p.user?.name ?? `Patient #${p.id}` })}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-sky-50"
                        >
                          <span className="truncate text-slate-700">{p.user?.name ?? `Patient #${p.id}`}</span>
                          <Check size={13} className="shrink-0 text-transparent" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Date presets + pickers */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESETS.map((p) => {
                const active = date === isoDatePlusDays(p.days)
                return (
                  <button
                    key={p.days}
                    onClick={() => setDate(isoDatePlusDays(p.days))}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${active ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</label>
                <Input type="date" min={isoDatePlusDays(1)} value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time</label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason <span className="font-normal normal-case">(optional)</span></label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Re-check blood pressure…" className="h-9 text-sm" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
          <Button className="bg-sky-600 text-white hover:bg-sky-700" disabled={!canSubmit} onClick={submit}>
            {createFollowUp.isPending ? 'Booking…' : 'Book follow-up'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

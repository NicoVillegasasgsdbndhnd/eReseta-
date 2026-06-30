import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, Lock, Hammer, ShieldCheck, Loader2, ArrowLeft, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePatient } from '@/features/patients/queries'
import { useChartBreakGlass, useRecordConsent } from './queries'

type ReasonCode = 'needs_break_glass' | 'needs_consent'

/**
 * Hard-gate screen for the patient record tab (RA 10173). The record exists but all clinical tabs
 * are masked. A doctor without a care relationship can "break the glass" (emergency, logged); a
 * non-doctor must capture the patient's DPA consent first.
 */
export default function ChartAccessGate({
  patientId,
  reasonCode,
  message,
}: {
  patientId: string | number
  reasonCode: ReasonCode
  message?: string
}) {
  const navigate = useNavigate()
  const { data: patient } = usePatient(patientId)
  const patientName = patient?.user?.name ?? 'This patient'

  const [showBreakGlass, setShowBreakGlass] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [reason, setReason] = useState('')
  const [consentNotes, setConsentNotes] = useState('')

  const breakGlass = useChartBreakGlass(patientId)
  const recordConsent = useRecordConsent(patientId)

  const submitBreakGlass = async () => {
    if (reason.trim().length < 10) return
    await breakGlass.mutateAsync(reason.trim()) // success → chart query invalidates, page re-renders unlocked
    setShowBreakGlass(false)
  }

  const submitConsent = async () => {
    await recordConsent.mutateAsync({ status: 'given', notes: consentNotes.trim() || undefined })
    setShowConsent(false)
  }

  const isDoctor = reasonCode === 'needs_break_glass'

  return (
    <>
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <button onClick={() => navigate('/records')} className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} /> Back to records
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Lock size={28} className="text-slate-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Medical records locked</h2>
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{patientName}</span> exists in the system, but their clinical
          records are protected under the Data Privacy Act (RA 10173).
        </p>
        {message && (
          <p className="mx-auto mt-3 max-w-md rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600" style={{ border: '1px solid hsl(210 18% 90%)' }}>
            {message}
          </p>
        )}

        {/* masked tab strip */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {['Demographics', 'Encounters', 'Medications', 'Lab & Imaging'].map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-400" style={{ border: '1px solid hsl(210 18% 92%)' }}>
              <Lock size={11} /> {t}
            </span>
          ))}
        </div>

        <div className="mt-6">
          {isDoctor ? (
            <button
              onClick={() => setShowBreakGlass(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition-colors hover:bg-red-700"
            >
              <Hammer size={17} /> Break-Glass: Access for Emergency Care
            </button>
          ) : (
            <button
              onClick={() => setShowConsent(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
            >
              <ShieldCheck size={17} /> Record DPA Consent
            </button>
          )}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          {isDoctor
            ? 'Emergency access is granted for 24 hours and recorded as a security alert for admin review.'
            : 'Consent is clinic-mediated — the patient must be present or consent recorded on their behalf.'}
        </p>
      </div>

      {/* Break-glass forced-justification modal */}
      <Dialog open={showBreakGlass} onOpenChange={(o) => !o && setShowBreakGlass(false)}>
        <DialogContent className="sm:max-w-lg rounded-2xl border border-slate-100 bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-red-700">
              <ShieldAlert size={18} /> Emergency Break-Glass Access
            </DialogTitle>
            <DialogDescription className="mt-1 text-slate-500">
              You are not the attending doctor for this patient. State the clinical justification — this
              grants 24-hour access and is logged as an un-deletable security alert.
            </DialogDescription>
          </DialogHeader>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder='e.g. "Patient admitted to ER unconscious; urgent allergy history required."'
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
          />
          <p className="text-[11px] text-slate-400">Minimum 10 characters. {reason.trim().length}/10</p>

          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setShowBreakGlass(false)} disabled={breakGlass.isPending} className="border-slate-200 text-slate-600">
              Cancel
            </Button>
            <Button onClick={submitBreakGlass} disabled={breakGlass.isPending || reason.trim().length < 10} className="bg-red-600 text-white hover:bg-red-700">
              {breakGlass.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Grant Emergency Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DPA consent modal (matches the mockup) */}
      <Dialog open={showConsent} onOpenChange={(o) => !o && setShowConsent(false)}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-slate-100 bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-slate-800">
              <ShieldCheck size={18} className="text-blue-600" /> DPA Consent — Patient User
            </DialogTitle>
            <DialogDescription className="mt-1 text-slate-500">
              Record Data Privacy Act consent. Required before a non-doctor can view this patient's records.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            <Info size={14} /> No Consent on Record
          </div>

          <label className="mt-1 block text-xs font-semibold text-slate-600">
            Notes <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={consentNotes}
            onChange={(e) => setConsentNotes(e.target.value)}
            rows={2}
            placeholder="Notes about this consent capture…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
          />

          <p className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] leading-5 text-blue-700">
            Consent is clinic-mediated. The patient must be present or consent recorded on their behalf per clinic protocol.
          </p>

          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setShowConsent(false)} disabled={recordConsent.isPending} className="border-slate-200 text-slate-600">
              Close
            </Button>
            <Button onClick={submitConsent} disabled={recordConsent.isPending} className="bg-blue-600 text-white hover:bg-blue-700">
              {recordConsent.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Record Consent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

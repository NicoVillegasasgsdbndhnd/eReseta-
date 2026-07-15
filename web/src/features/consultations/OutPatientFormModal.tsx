import { ArrowLeft, Printer, X } from 'lucide-react'
import DeamhiOutPatientForm, { type FormPatient } from './DeamhiOutPatientForm'
import type { PatientRecord } from '@/mocks/types'

// Reusable viewer for the DEAMHI Out-Patient form: shows it on-screen in a dialog with a Print
// button. Printing reuses the global .op-print-area rule (form rendered off-screen, isolated on print).
// closeLabel defaults to "Close"; pass "Back" (e.g. after completing a consultation) for a back action.
export default function OutPatientFormModal({
  record,
  patient,
  onClose,
  closeLabel = 'Close',
}: {
  record: PatientRecord | null
  patient: FormPatient
  onClose: () => void
  closeLabel?: string
}) {
  if (!record) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 no-print" onClick={onClose}>
        <div
          className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="sticky top-0 z-10 flex items-center justify-end gap-2 bg-white/95 px-3 py-2 backdrop-blur"
            style={{ borderBottom: '1px solid hsl(214 20% 90%)' }}
          >
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              <Printer size={14} /> Print
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
            >
              {closeLabel === 'Close' ? <X size={14} /> : <ArrowLeft size={14} />} {closeLabel}
            </button>
          </div>
          <DeamhiOutPatientForm record={record} patient={patient} />
        </div>
      </div>

      {/* Off-screen copy that the browser prints (isolated by the .op-print-area rule) */}
      <div className="op-print-area">
        <DeamhiOutPatientForm record={record} patient={patient} />
      </div>
    </>
  )
}

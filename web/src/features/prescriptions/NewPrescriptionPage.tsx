import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pill, Save, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAllPatientRecords } from '@/features/patients/queries'
import PrescriptionItemEditor from './PrescriptionItemEditor'
import { type RxItem, emptyRxItem, rxItemComplete, toRxPayload } from './rxItem'
import { useCreatePrescription } from './queries'

export default function NewPrescriptionPage() {
  const navigate = useNavigate()
  const { data: recordsData } = useAllPatientRecords()
  const createPrescription = useCreatePrescription()

  const [patientRecordId, setPatientRecordId] = useState('')
  const [items, setItems] = useState<RxItem[]>([emptyRxItem()])
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const records = recordsData?.data ?? []
  const selectedRecord = records.find((r) => String(r.id) === patientRecordId) ?? null

  const setItemAt = (index: number, item: RxItem) =>
    setItems((prev) => prev.map((it, i) => (i === index ? item : it)))

  const addItem = () => setItems((prev) => [...prev, emptyRxItem()])

  const removeItem = (index: number) => {
    if (items.length === 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const isValid = !!patientRecordId && items.every(rxItemComplete)

  const handleSubmit = async () => {
    if (!isValid) return
    setError(null)
    try {
      const rx = await createPrescription.mutateAsync({
        patient_record_id: Number(patientRecordId),
        items: items.map(toRxPayload),
      })
      navigate(`/prescriptions/${rx.id}`)
    } catch {
      setError('Failed to create prescription. Please try again.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/prescriptions')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 bg-white rounded-lg px-3 py-1.5 shadow-sm transition-colors"
          style={{ border: '1px solid hsl(214 20% 90%)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h2 className="text-base font-bold text-slate-800">Issue New Prescription</h2>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Visit Record</p>
          <select
            value={patientRecordId}
            onChange={(e) => setPatientRecordId(e.target.value)}
            aria-label="Patient visit record"
            className="w-full h-10 rounded-lg border text-sm text-slate-700 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: 'hsl(214 20% 90%)' }}
          >
            <option value="">Select a patient visit record…</option>
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {r.patient?.user?.name} — {r.diagnosis} ({new Date(r.visit_date).toLocaleDateString('en-PH', { dateStyle: 'medium' })})
              </option>
            ))}
          </select>
          {records.length === 0 && (
            <p className="text-xs text-slate-400 mt-2">No visit records found. Create a consultation first.</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Pill size={15} className="text-blue-600" />
              <p className="text-sm font-semibold text-slate-700">Medications</p>
            </div>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus size={13} className="mr-1" /> Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, i) => (
              <PrescriptionItemEditor
                key={i}
                item={item}
                index={i}
                canRemove={items.length > 1}
                onChange={(it) => setItemAt(i, it)}
                onRemove={() => removeItem(i)}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg" style={{ border: '1px solid hsl(0 80% 90%)' }}>
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/prescriptions')}>Cancel</Button>
          <button
            disabled={!isValid}
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: 'hsl(201 100% 36%)' }}
          >
            <Save size={14} /> Issue Prescription
          </button>
        </div>
      </div>

      {/* ── Confirmation dialog ── */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'hsl(201 60% 92%)' }}>
                <AlertTriangle size={18} style={{ color: 'hsl(201 100% 36%)' }} />
              </div>
              <div>
                <DialogTitle className="text-slate-800 font-bold text-base">Issue Prescription</DialogTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Please review the prescription details before confirming. This action will be recorded and cannot be undone.
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Summary */}
          <div className="space-y-3 my-1">
            {/* Patient */}
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'hsl(210 14% 97%)', border: '1px solid hsl(210 18% 90%)' }}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Patient</p>
              <p className="text-sm font-semibold text-slate-800">{selectedRecord?.patient?.user?.name ?? '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">{selectedRecord?.diagnosis ?? '—'}</p>
            </div>

            {/* Medications */}
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'hsl(210 14% 97%)', border: '1px solid hsl(210 18% 90%)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Pill size={12} style={{ color: 'hsl(201 100% 36%)' }} />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Medications ({items.length})</p>
              </div>
              <div className="space-y-1.5">
                {items.map((item, i) => {
                  const p = toRxPayload(item)
                  return (
                  <div key={i} className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-700">{item.drug_name || '—'}</span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {[p.dosage, `${p.quantity} pcs`, p.frequency, p.duration].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-1">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={createPrescription.isPending}
              className="border-slate-200 text-slate-600"
            >
              Go Back
            </Button>
            <button
              onClick={async () => { await handleSubmit(); setShowConfirm(false) }}
              disabled={createPrescription.isPending}
              className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              {createPrescription.isPending
                ? <><Loader2 size={14} className="animate-spin" /> Issuing…</>
                : <><Save size={14} /> Confirm & Issue</>}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

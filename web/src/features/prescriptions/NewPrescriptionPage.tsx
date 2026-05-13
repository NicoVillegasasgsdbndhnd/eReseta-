import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Pill, Save, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useAllPatientRecords } from '@/features/patients/queries'
import { useCreatePrescription } from './queries'

interface MedItem {
  drug_name: string
  dosage: string
  quantity: number
  frequency: string
  duration: string
  instructions: string
}

const EMPTY_ITEM: MedItem = {
  drug_name: '', dosage: '', quantity: 1,
  frequency: '', duration: '', instructions: '',
}

export default function NewPrescriptionPage() {
  const navigate = useNavigate()
  const { data: recordsData } = useAllPatientRecords()
  const createPrescription = useCreatePrescription()

  const [patientRecordId, setPatientRecordId] = useState('')
  const [items, setItems] = useState<MedItem[]>([{ ...EMPTY_ITEM }])
  const [error, setError] = useState<string | null>(null)

  const records = recordsData?.data ?? []

  const updateItem = (index: number, field: keyof MedItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }])

  const removeItem = (index: number) => {
    if (items.length === 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const isValid = patientRecordId &&
    items.every((it) => it.drug_name && it.dosage && it.quantity > 0 && it.frequency && it.duration)

  const handleSubmit = async () => {
    if (!isValid) return
    setError(null)
    try {
      const rx = await createPrescription.mutateAsync({
        patient_record_id: Number(patientRecordId),
        items: items.map((it) => ({
          ...it,
          quantity: Number(it.quantity),
          instructions: it.instructions || null,
        })),
      })
      navigate(`/prescriptions/${rx.id}`)
    } catch {
      setError('Failed to create prescription. Please try again.')
    }
  }

  return (
    <div className="max-w-2xl">
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
              <div
                key={i}
                className="p-4 rounded-lg relative"
                style={{ border: '1px solid hsl(214 20% 93%)', backgroundColor: 'hsl(214 20% 98%)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Item {i + 1}</span>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Drug Name</label>
                    <Input
                      value={item.drug_name}
                      onChange={(e) => updateItem(i, 'drug_name', e.target.value)}
                      placeholder="e.g. Amoxicillin"
                      className="h-9 text-sm border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Dosage</label>
                    <Input
                      value={item.dosage}
                      onChange={(e) => updateItem(i, 'dosage', e.target.value)}
                      placeholder="e.g. 500mg"
                      className="h-9 text-sm border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Quantity</label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                      className="h-9 text-sm border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Frequency</label>
                    <Input
                      value={item.frequency}
                      onChange={(e) => updateItem(i, 'frequency', e.target.value)}
                      placeholder="e.g. TID (3x daily)"
                      className="h-9 text-sm border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Duration</label>
                    <Input
                      value={item.duration}
                      onChange={(e) => updateItem(i, 'duration', e.target.value)}
                      placeholder="e.g. 7 days"
                      className="h-9 text-sm border-slate-200"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Instructions (optional)</label>
                    <Textarea
                      value={item.instructions}
                      onChange={(e) => updateItem(i, 'instructions', e.target.value)}
                      placeholder="e.g. Take after meals"
                      rows={2}
                      className="text-sm border-slate-200 resize-none"
                    />
                  </div>
                </div>
              </div>
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
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!isValid || createPrescription.isPending}
            onClick={handleSubmit}
          >
            {createPrescription.isPending ? (
              <><Loader2 size={14} className="mr-1.5 animate-spin" /> Issuing…</>
            ) : (
              <><Save size={14} className="mr-1.5" /> Issue Prescription</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus, Stethoscope, CheckCircle2, Search, Pill, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useAllPatientRecords, useCreatePatientRecord } from '@/features/patients/queries'
import { useAppointments, useUpdateAppointmentStatus } from '@/features/appointments/queries'
import { useCreatePrescription } from '@/features/prescriptions/queries'
import MedicineCombobox from '@/features/medicines/MedicineCombobox'
import { useAuthStore } from '@/features/auth/authStore'
import type { PatientRecord } from '@/mocks/types'

interface MedItem {
  drug_name: string
  dosage: string
  quantity: number
  frequency: string
  duration: string
  instructions: string
}

const EMPTY_MED: MedItem = {
  drug_name: '', dosage: '', quantity: 1, frequency: '', duration: '', instructions: '',
}

const EMPTY_FORM = {
  patient_id: '',
  appointment_id: '',
  visit_date: new Date().toISOString().split('T')[0],
  chief_complaint: '',
  diagnosis: '',
  notes: '',
}

type TimeFilter = 'all' | 'recent' | 'month'

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-white rounded-xl p-5 flex-1" style={{ border: '1px solid hsl(210 18% 88%)' }}>
      <p className="text-3xl font-bold" style={{ color: 'hsl(215 30% 14%)' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'hsl(215 16% 50%)' }}>{label}</p>
    </div>
  )
}

export default function ConsultationsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isStaff = user?.role === 'staff'

  const [showForm, setShowForm]     = useState(false)
  const [formData, setFormData]     = useState(EMPTY_FORM)
  const [meds, setMeds]             = useState<MedItem[]>([])
  const [search, setSearch]         = useState('')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')

  const { data: recordsData }    = useAllPatientRecords()
  const { data: appointmentsData } = useAppointments({ status: 'confirmed' })
  const createRecord  = useCreatePatientRecord()
  const createPrescription = useCreatePrescription()
  const updateStatus  = useUpdateAppointmentStatus()

  const records = recordsData?.data ?? []

  // One row per patient
  const uniquePatients = useMemo(() => {
    const seen = new Set<number>()
    const visitCount: Record<number, number> = {}
    for (const r of records) visitCount[r.patient_id] = (visitCount[r.patient_id] ?? 0) + 1
    return records.reduce<(PatientRecord & { visit_count: number })[]>((acc, r) => {
      if (!seen.has(r.patient_id)) {
        seen.add(r.patient_id)
        acc.push({ ...r, visit_count: visitCount[r.patient_id] })
      }
      return acc
    }, [])
  }, [records])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let result = uniquePatients

    if (q) {
      result = result.filter(
        (r) =>
          (r.patient?.user?.name ?? '').toLowerCase().includes(q) ||
          r.diagnosis.toLowerCase().includes(q),
      )
    }

    if (timeFilter === 'recent') {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 7)
      result = result.filter((r) => new Date(r.visit_date) >= cutoff)
    } else if (timeFilter === 'month') {
      const now = new Date()
      result = result.filter((r) => {
        const d = new Date(r.visit_date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
    }

    return result
  }, [uniquePatients, search, timeFilter])

  // A consultation can only be started for a patient whose confirmed appointment is TODAY
  // (mentor review: "doctor cannot start a record if the time is not today"). Selecting one
  // auto-fills the visit date from that appointment.
  const todayIso = new Date().toISOString().split('T')[0]
  const confirmedPatients = useMemo(() => {
    const seen = new Set<number>()
    return (appointmentsData?.data ?? []).reduce<{ id: number; name: string; appointment_id: number; date: string }[]>(
      (acc, appt) => {
        const apptDate = new Date(appt.scheduled_at).toISOString().split('T')[0]
        if (appt.patient && apptDate === todayIso && !seen.has(appt.patient_id)) {
          seen.add(appt.patient_id)
          acc.push({ id: appt.patient_id, name: appt.patient.user?.name ?? '', appointment_id: appt.id, date: apptDate })
        }
        return acc
      },
      [],
    )
  }, [appointmentsData, todayIso])

  // Stat derivations
  const totalPatients     = new Set(records.map((r) => r.patient_id)).size
  const totalConsultations = records.length
  const mostRecentVisit   = records.length > 0
    ? new Date(Math.max(...records.map((r) => new Date(r.visit_date).getTime())))
        .toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    : '—'

  const handlePatientChange = (patientId: string) => {
    const match = confirmedPatients.find((p) => p.id === Number(patientId))
    setFormData((prev) => ({
      ...prev,
      patient_id: patientId,
      appointment_id: match ? String(match.appointment_id) : '',
      // Auto-fill the visit date from the chosen appointment (today).
      visit_date: match ? match.date : prev.visit_date,
    }))
  }

  // ── Inline prescription (Epic H) — optional; doctor prescribes in the same screen ──
  const updateMed = (i: number, field: keyof MedItem, value: string | number) =>
    setMeds((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)))
  const addMed    = () => setMeds((prev) => [...prev, { ...EMPTY_MED }])
  const removeMed = (i: number) => setMeds((prev) => prev.filter((_, idx) => idx !== i))

  const medComplete = (m: MedItem) =>
    !!m.drug_name && !!m.dosage && Number(m.quantity) > 0 && !!m.frequency && !!m.duration
  const validMeds   = meds.filter(medComplete)
  // A row the doctor started but left incomplete blocks submit (avoid silent drops).
  const medsIncomplete = meds.some((m) => (m.drug_name || m.dosage || m.frequency || m.duration) && !medComplete(m))

  const isValid   = !!formData.patient_id && !!formData.chief_complaint && !!formData.diagnosis && !medsIncomplete
  const isPending = createRecord.isPending || createPrescription.isPending || updateStatus.isPending

  const resetForm = () => { setShowForm(false); setFormData(EMPTY_FORM); setMeds([]) }

  const handleServed = async () => {
    if (!isValid) return
    const { appointment_id, ...recordPayload } = formData
    const record = await createRecord.mutateAsync(recordPayload)

    // Prescription is optional — a notes-only consultation is valid (Epic I). If meds were
    // added, issue the prescription against the just-created visit record.
    if (validMeds.length > 0 && record?.id) {
      await createPrescription.mutateAsync({
        patient_record_id: record.id,
        items: validMeds.map((m) => ({ ...m, quantity: Number(m.quantity), instructions: m.instructions || null })),
      })
    }

    if (appointment_id) await updateStatus.mutateAsync({ id: Number(appointment_id), status: 'served' })
    resetForm()
  }

  const TIME_PILLS: { label: string; value: TimeFilter }[] = [
    { label: 'All',        value: 'all' },
    { label: 'Recent',     value: 'recent' },
    { label: 'This month', value: 'month' },
  ]

  return (
    <>
      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'hsl(215 30% 14%)' }}>
            Consultations
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(215 16% 45%)' }}>
            Patient visit records and clinical notes
          </p>
        </div>
        {!isStaff && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'hsl(201 100% 36%)' }}
          >
            <FilePlus size={15} />
            New Record
          </button>
        )}
      </div>

      {/* ── 3 stat cards ── */}
      <div className="flex gap-4 mb-6">
        <StatCard value={totalPatients}      label="Total patients seen" />
        <StatCard value={totalConsultations} label="Total consultations" />
        <StatCard value={mostRecentVisit}    label="Most recent visit" />
      </div>

      {/* ── New consultation form ── */}
      {showForm && !isStaff && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6" style={{ border: '1px solid hsl(201 60% 88%)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope size={16} className="text-blue-600" />
            <p className="font-semibold text-sm" style={{ color: 'hsl(215 30% 14%)' }}>New Consultation Record</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 50%)' }}>Patient</label>
              <select
                className="w-full h-9 rounded-lg border text-sm bg-white px-3 focus:outline-none focus:ring-2"
                style={{ borderColor: 'hsl(210 18% 88%)' }}
                value={formData.patient_id}
                onChange={(e) => handlePatientChange(e.target.value)}
              >
                <option value="">Select patient…</option>
                {confirmedPatients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {confirmedPatients.length === 0 && (
                <p className="text-xs" style={{ color: 'hsl(215 16% 55%)' }}>No confirmed appointments for today.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 50%)' }}>Visit Date</label>
              {/* Auto-filled from the appointment (today) and locked — a record is started on the visit day. */}
              <Input type="date" value={formData.visit_date} readOnly disabled title="Set automatically from today's appointment" />
            </div>
          </div>
          <div className="space-y-1.5 mb-4">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 50%)' }}>Chief Complaint</label>
            <Textarea
              placeholder="e.g. Headache for 3 days, fever, body aches…"
              rows={2}
              value={formData.chief_complaint}
              onChange={(e) => setFormData((p) => ({ ...p, chief_complaint: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 mb-4">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 50%)' }}>Diagnosis</label>
            <Textarea
              placeholder="e.g. Stage 1 Hypertension; rule out secondary causes…"
              rows={2}
              value={formData.diagnosis}
              onChange={(e) => setFormData((p) => ({ ...p, diagnosis: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 mb-4">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 50%)' }}>Clinical Notes</label>
            <Textarea
              placeholder="Findings, treatment plan, follow-up instructions…"
              rows={5}
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          {/* ── Prescription (optional, Epic H) — prescribe in the same screen as the notes ── */}
          <div className="mb-4 pt-4" style={{ borderTop: '1px dashed hsl(210 18% 85%)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'hsl(215 30% 14%)' }}>
                <Pill size={15} style={{ color: 'hsl(201 100% 36%)' }} />
                Prescription <span className="text-xs font-normal" style={{ color: 'hsl(215 16% 60%)' }}>(optional)</span>
              </p>
              <Button variant="outline" size="sm" onClick={addMed}>
                <Plus size={13} className="mr-1" /> Add medication
              </Button>
            </div>

            {meds.length === 0 ? (
              <p className="text-xs" style={{ color: 'hsl(215 16% 55%)' }}>
                No medication added — you can complete the consultation with notes only, or add a prescription here.
              </p>
            ) : (
              <div className="space-y-3">
                {meds.map((m, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{ border: '1px solid hsl(210 18% 90%)', backgroundColor: 'hsl(210 20% 98%)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'hsl(215 16% 50%)' }}>Medication {i + 1}</span>
                      <button onClick={() => removeMed(i)} className="text-slate-300 hover:text-red-500 transition-colors" aria-label={`Remove medication ${i + 1}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="col-span-2">
                        <MedicineCombobox
                          value={m.drug_name}
                          onValueChange={(v) => updateMed(i, 'drug_name', v)}
                          onSelect={(med) => {
                            updateMed(i, 'drug_name', med.generic_name)
                            const firstStrength = med.strength?.split(',')[0]?.trim()
                            if (firstStrength && !m.dosage) updateMed(i, 'dosage', firstStrength)
                          }}
                          placeholder="Search generic (e.g. Amoxicillin) or type a custom name"
                        />
                      </div>
                      <Input value={m.dosage} onChange={(e) => updateMed(i, 'dosage', e.target.value)} placeholder="Dosage (e.g. 500mg)" className="h-9 text-sm" />
                      <Input type="number" min={1} value={m.quantity} onChange={(e) => updateMed(i, 'quantity', e.target.value)} placeholder="Quantity" className="h-9 text-sm" />
                      <Input value={m.frequency} onChange={(e) => updateMed(i, 'frequency', e.target.value)} placeholder="Frequency (e.g. 3x daily)" className="h-9 text-sm" />
                      <Input value={m.duration} onChange={(e) => updateMed(i, 'duration', e.target.value)} placeholder="Duration (e.g. 7 days)" className="h-9 text-sm" />
                      <Input value={m.instructions} onChange={(e) => updateMed(i, 'instructions', e.target.value)} placeholder="Instructions (optional)" className="col-span-2 h-9 text-sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {medsIncomplete && (
              <p className="text-xs text-red-500 mt-2">Finish or remove the incomplete medication (drug, dosage, quantity, frequency and duration are required).</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending || !isValid} onClick={handleServed}>
              <CheckCircle2 size={14} className="mr-1.5" />
              {isPending ? 'Saving…' : validMeds.length > 0 ? `Served + Issue Rx (${validMeds.length})` : 'Served'}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Search + filters ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient or diagnosis…"
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {TIME_PILLS.map((p) => (
            <button
              key={p.value}
              onClick={() => setTimeFilter(p.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors"
              style={
                timeFilter === p.value
                  ? { backgroundColor: 'hsl(201 100% 36%)', color: 'white', borderColor: 'hsl(201 100% 36%)' }
                  : { backgroundColor: 'white', color: 'hsl(215 16% 40%)', borderColor: 'hsl(210 18% 88%)' }
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        {/* Header */}
        <div
          className="grid text-xs font-semibold uppercase tracking-wide px-5 py-3"
          style={{ color: 'hsl(215 16% 50%)', borderBottom: '1px solid hsl(210 18% 92%)', gridTemplateColumns: '2fr 1.2fr 1.5fr 0.8fr' }}
        >
          <span>Patient</span>
          <span>Latest Visit</span>
          <span>Last Diagnosis</span>
          <span>Visits</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: 'hsl(215 16% 55%)' }}>
            No consultation records yet.
          </div>
        ) : (
          filtered.map((row) => (
            <div
              key={row.patient_id}
              onDoubleClick={() => navigate(`/patients/${row.patient_id}`)}
              className="grid items-center px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
              style={{ borderBottom: '1px solid hsl(210 18% 93%)', gridTemplateColumns: '2fr 1.2fr 1.5fr 0.8fr' }}
              title="Double-click to view patient"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 30%)' }}
                >
                  {(row.patient?.user?.name ?? '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'hsl(215 30% 14%)' }}>
                    {row.patient?.user?.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'hsl(215 16% 50%)' }}>
                    {row.patient?.user?.email}
                  </p>
                </div>
              </div>

              <p className="text-sm" style={{ color: 'hsl(215 30% 14%)' }}>
                {new Date(row.visit_date).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
              </p>

              <p className="text-sm truncate" style={{ color: 'hsl(215 30% 20%)' }}>
                {isStaff
                  ? <span className="tracking-widest font-mono" style={{ color: 'hsl(215 16% 75%)' }}>••••••••</span>
                  : row.diagnosis}
              </p>

              <div>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: 'hsl(201 60% 92%)', color: 'hsl(201 100% 30%)' }}
                >
                  {row.visit_count} {row.visit_count === 1 ? 'visit' : 'visits'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

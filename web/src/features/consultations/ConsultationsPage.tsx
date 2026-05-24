import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus, Stethoscope, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/common/PageHeader'
import { useAllPatientRecords, useCreatePatientRecord } from '@/features/patients/queries'
import { useAppointments, useUpdateAppointmentStatus } from '@/features/appointments/queries'
import { useAuthStore } from '@/features/auth/authStore'
import type { PatientRecord } from '@/mocks/types'

const EMPTY_FORM = {
  patient_id: '',
  appointment_id: '',
  visit_date: new Date().toISOString().split('T')[0],
  chief_complaint: '',
  diagnosis: '',
  notes: '',
}

export default function ConsultationsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isStaff = user?.role === 'staff'
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [search, setSearch] = useState('')

  const { data: recordsData } = useAllPatientRecords()
  const { data: appointmentsData } = useAppointments({ status: 'confirmed' })
  const createRecord = useCreatePatientRecord()
  const updateStatus = useUpdateAppointmentStatus()

  const records = recordsData?.data ?? []

  // One row per patient — keep first occurrence (latest visit_date since API returns latest first)
  const uniquePatients = useMemo(() => {
    const seen = new Set<number>()
    const visitCount: Record<number, number> = {}
    for (const r of records) {
      visitCount[r.patient_id] = (visitCount[r.patient_id] ?? 0) + 1
    }
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
    if (!q) return uniquePatients
    return uniquePatients.filter(
      (r) =>
        (r.patient?.user?.name ?? '').toLowerCase().includes(q) ||
        r.diagnosis.toLowerCase().includes(q),
    )
  }, [uniquePatients, search])

  // Only patients with a confirmed appointment with this doctor
  const confirmedPatients = useMemo(() => {
    const seen = new Set<number>()
    return (appointmentsData?.data ?? []).reduce<{ id: number; name: string; appointment_id: number }[]>((acc, appt) => {
      if (appt.patient && !seen.has(appt.patient_id)) {
        seen.add(appt.patient_id)
        acc.push({ id: appt.patient_id, name: appt.patient.user?.name ?? '', appointment_id: appt.id })
      }
      return acc
    }, [])
  }, [appointmentsData])

  const handlePatientChange = (patientId: string) => {
    const match = confirmedPatients.find((p) => p.id === Number(patientId))
    setFormData((prev) => ({
      ...prev,
      patient_id: patientId,
      appointment_id: match ? String(match.appointment_id) : '',
    }))
  }

  const isValid = !!formData.patient_id && !!formData.chief_complaint && !!formData.diagnosis
  const isPending = createRecord.isPending || updateStatus.isPending

  const handleServed = async () => {
    if (!isValid) return
    const { appointment_id, ...recordPayload } = formData
    await createRecord.mutateAsync(recordPayload)
    if (appointment_id) {
      await updateStatus.mutateAsync({ id: Number(appointment_id), status: 'served' })
    }
    setShowForm(false)
    setFormData(EMPTY_FORM)
  }

  return (
    <>
      <PageHeader
        title="Consultations"
        description="Patient visit records and clinical notes"
        action={
          !isStaff && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowForm(true)}>
              <FilePlus size={15} className="mr-1.5" /> New Record
            </Button>
          )
        }
      />

      {showForm && !isStaff && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6" style={{ border: '1px solid hsl(214 60% 88%)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope size={16} className="text-blue-600" />
            <p className="font-semibold text-sm">New Consultation Record</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Patient</label>
              <select
                className="w-full h-9 rounded-md border text-sm bg-white px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: 'hsl(214 20% 90%)' }}
                value={formData.patient_id}
                onChange={(e) => handlePatientChange(e.target.value)}
              >
                <option value="">Select patient…</option>
                {confirmedPatients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {confirmedPatients.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">No confirmed appointments yet.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Visit Date</label>
              <Input
                type="date"
                value={formData.visit_date}
                onChange={(e) => setFormData((p) => ({ ...p, visit_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5 mb-4">
            <label className="text-sm font-medium">Chief Complaint</label>
            <Input
              placeholder="e.g. Headache for 3 days, fever"
              value={formData.chief_complaint}
              onChange={(e) => setFormData((p) => ({ ...p, chief_complaint: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 mb-4">
            <label className="text-sm font-medium">Diagnosis</label>
            <Input
              placeholder="e.g. Stage 1 Hypertension"
              value={formData.diagnosis}
              onChange={(e) => setFormData((p) => ({ ...p, diagnosis: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 mb-4">
            <label className="text-sm font-medium">Clinical Notes</label>
            <Textarea
              placeholder="Findings, treatment plan, follow-up instructions…"
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-3">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isPending || !isValid}
              onClick={handleServed}
            >
              <CheckCircle2 size={14} className="mr-1.5" />
              {isPending ? 'Saving…' : 'Served'}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setFormData(EMPTY_FORM) }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-3 max-w-4xl mx-auto">
        <div className="relative max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient or diagnosis…"
            className="w-full h-7 pl-7 pr-3 text-xs rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ border: '1px solid hsl(214 20% 90%)' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid hsl(214 20% 90%)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid hsl(214 20% 93%)' }}>
              {['Patient', 'Latest Visit', 'Last Diagnosis', 'Visits'].map((h) => (
                <th key={h} className="text-left font-semibold uppercase tracking-wide text-slate-400 px-4 py-1.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-slate-400 py-8">No consultation records yet.</td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.patient_id}
                  onDoubleClick={() => navigate(`/patients/${row.patient_id}`)}
                  className="border-b last:border-0 hover:bg-slate-50 transition-colors cursor-pointer"
                  style={{ borderColor: 'hsl(214 20% 93%)' }}
                  title="Double-click to view patient"
                >
                  <td className="px-4 py-2">
                    <p className="font-semibold text-slate-800">{row.patient?.user?.name}</p>
                    <p className="text-slate-400">{row.patient?.user?.email}</p>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {new Date(row.visit_date).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                  </td>
                  <td className="px-4 py-2 font-medium text-slate-700">
                    {isStaff
                      ? <span className="tracking-widest text-slate-300 select-none font-mono">••••••••••</span>
                      : row.diagnosis}
                  </td>
                  <td className="px-4 py-2">
                    <span className="font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full" style={{ border: '1px solid hsl(214 60% 88%)' }}>
                      {row.visit_count} {row.visit_count === 1 ? 'visit' : 'visits'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

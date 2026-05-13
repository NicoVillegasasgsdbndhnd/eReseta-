import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/common/PageHeader'
import DataTable, { type Column } from '@/components/common/DataTable'
import { useAllPatientRecords, useCreatePatientRecord } from '@/features/patients/queries'
import { usePatients } from '@/features/patients/queries'
import type { PatientRecord } from '@/mocks/types'

export default function ConsultationsPage() {
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    patient_id: '',
    visit_date: new Date().toISOString().split('T')[0],
    chief_complaint: '',
    diagnosis: '',
    notes: '',
  })

  const { data: recordsData } = useAllPatientRecords()
  const { data: patientsData } = usePatients()
  const createRecord = useCreatePatientRecord()

  const records = recordsData?.data ?? []
  const patients = patientsData?.data ?? []

  const columns: Column<PatientRecord>[] = [
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.patient?.user?.name}</p>
          <p className="text-xs text-slate-400">{row.patient?.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'visit_date',
      header: 'Visit Date',
      render: (row) => (
        <span className="text-sm">
          {new Date(row.visit_date).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
        </span>
      ),
    },
    {
      key: 'diagnosis',
      header: 'Diagnosis',
      render: (row) => <span className="text-sm font-medium">{row.diagnosis}</span>,
    },
    {
      key: 'complaint',
      header: 'Chief Complaint',
      render: (row) => (
        <span className="text-sm text-slate-500 line-clamp-1">{row.chief_complaint}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-32',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/patients/${row.patient_id}`)}>
          View Patient
        </Button>
      ),
    },
  ]

  const handleSave = async () => {
    if (!formData.patient_id || !formData.chief_complaint || !formData.diagnosis) return
    await createRecord.mutateAsync(formData)
    setShowForm(false)
    setFormData({ patient_id: '', visit_date: new Date().toISOString().split('T')[0], chief_complaint: '', diagnosis: '', notes: '' })
  }

  return (
    <>
      <PageHeader
        title="Consultations"
        description="Patient visit records and clinical notes"
        action={
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowForm(true)}>
            <FilePlus size={15} className="mr-1.5" /> New Record
          </Button>
        }
      />

      {showForm && (
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
                onChange={(e) => setFormData((p) => ({ ...p, patient_id: e.target.value }))}
              >
                <option value="">Select patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.user?.name}</option>
                ))}
              </select>
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={createRecord.isPending || !formData.patient_id}
              onClick={handleSave}
            >
              {createRecord.isPending ? 'Saving…' : 'Save Record'}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <DataTable<PatientRecord>
        data={records}
        columns={columns}
        searchPlaceholder="Search by patient or diagnosis…"
        searchFn={(row, q) =>
          (row.patient?.user?.name ?? '').toLowerCase().includes(q) ||
          row.diagnosis.toLowerCase().includes(q) ||
          row.chief_complaint.toLowerCase().includes(q)
        }
        emptyMessage="No consultation records yet."
      />
    </>
  )
}

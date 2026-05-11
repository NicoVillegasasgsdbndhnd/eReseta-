import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/common/PageHeader'
import DataTable, { type Column } from '@/components/common/DataTable'
import { mockPatientRecords, mockPatients } from '@/mocks/data'
import type { PatientRecord } from '@/mocks/types'

export default function ConsultationsPage() {
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const records = mockPatientRecords.filter((r) => r.doctor_id === 1)

  const columns: Column<PatientRecord>[] = [
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.patient?.user?.name}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">{row.patient?.user?.email}</p>
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
        <span className="text-sm text-[var(--color-muted-foreground)] line-clamp-1">{row.chief_complaint}</span>
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
    setSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
    setShowForm(false)
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
        <Card className="p-5 mb-6 border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope size={16} className="text-blue-600" />
            <p className="font-semibold text-sm">New Consultation Record</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Patient</label>
              <select className="w-full h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select patient…</option>
                {mockPatients.map((p) => (
                  <option key={p.id} value={p.id}>{p.user?.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Visit Date</label>
              <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          <div className="space-y-1.5 mb-4">
            <label className="text-sm font-medium">Chief Complaint</label>
            <Input placeholder="e.g. Headache for 3 days, fever" />
          </div>
          <div className="space-y-1.5 mb-4">
            <label className="text-sm font-medium">Diagnosis</label>
            <Input placeholder="e.g. Stage 1 Hypertension" />
          </div>
          <div className="space-y-1.5 mb-4">
            <label className="text-sm font-medium">Clinical Notes</label>
            <Textarea placeholder="Findings, treatment plan, follow-up instructions…" rows={4} />
          </div>
          <div className="flex gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save Record'}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
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

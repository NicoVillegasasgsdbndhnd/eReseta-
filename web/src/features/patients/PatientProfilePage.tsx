import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Calendar, Pill, Receipt, Phone, MapPin, CreditCard } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import StatusBadge from '@/components/common/StatusBadge'
import { mockPatients, mockPatientRecords, mockPrescriptions, mockBillingRecords } from '@/mocks/data'

function InfoRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid hsl(214 20% 95%)' }}>
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className={`text-sm text-slate-700 font-semibold ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}

export default function PatientProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const patient = mockPatients.find((p) => p.id === Number(id))

  if (!patient) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center max-w-md" style={{ border: '1px solid hsl(214 20% 90%)' }}>
        <p className="font-semibold text-slate-700 mb-2">Patient not found</p>
        <button onClick={() => navigate('/patients')} className="text-sm text-blue-600 hover:underline">← Back to Patients</button>
      </div>
    )
  }

  const records      = mockPatientRecords.filter((r) => r.patient_id === patient.id)
  const prescriptions = mockPrescriptions.filter((p) => p.patient_record?.patient_id === patient.id)
  const billing       = mockBillingRecords.filter((b) => b.patient_id === patient.id)
  const age = Math.floor((Date.now() - new Date(patient.dob).getTime()) / 31_557_600_000)

  return (
    <div className="max-w-4xl">
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 bg-white rounded-lg px-3 py-1.5 shadow-sm transition-colors"
          style={{ border: '1px solid hsl(214 20% 90%)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h2 className="text-lg font-bold text-slate-800">Patient Profile</h2>
      </div>

      {/* Hero card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-4 flex items-center gap-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-sm">
          {patient.user?.name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-bold text-slate-800">{patient.user?.name}</h3>
            <StatusBadge status={patient.user?.status ?? 'active'} />
          </div>
          <div className="flex flex-wrap gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <User size={11} />
              <span>{age} years old · {patient.sex === 'male' ? 'Male' : 'Female'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Phone size={11} />
              <span>{patient.contact}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <CreditCard size={11} />
              <span className="font-mono">{patient.philhealth_no ?? 'No PhilHealth'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin size={11} />
              <span>{patient.address}</span>
            </div>
          </div>
        </div>
        <div className="hidden md:flex gap-3 text-center shrink-0">
          {[
            { label: 'Visits', value: records.length },
            { label: 'Rx', value: prescriptions.length },
            { label: 'Bills', value: billing.length },
          ].map((s) => (
            <div key={s.label} className="px-4 py-2 rounded-lg bg-slate-50" style={{ border: '1px solid hsl(214 20% 90%)' }}>
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="mb-4 bg-white shadow-sm h-10" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <TabsTrigger value="info" className="gap-1.5 text-xs"><User size={13} /> Demographics</TabsTrigger>
          <TabsTrigger value="records" className="gap-1.5 text-xs"><Calendar size={13} /> Visits ({records.length})</TabsTrigger>
          <TabsTrigger value="prescriptions" className="gap-1.5 text-xs"><Pill size={13} /> Prescriptions ({prescriptions.length})</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5 text-xs"><Receipt size={13} /> Billing ({billing.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Personal Information</p>
            <InfoRow label="Full Name" value={patient.user?.name} />
            <InfoRow label="Email Address" value={patient.user?.email} />
            <InfoRow label="Phone Number" value={patient.contact} />
            <InfoRow label="Date of Birth" value={new Date(patient.dob).toLocaleDateString('en-PH', { dateStyle: 'long' })} />
            <InfoRow label="Sex" value={patient.sex === 'male' ? 'Male' : 'Female'} />
            <InfoRow label="Home Address" value={patient.address} />
            <InfoRow label="PhilHealth No." value={patient.philhealth_no} mono />
            <InfoRow label="Registered" value={new Date(patient.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })} />
          </div>
        </TabsContent>

        <TabsContent value="records">
          {records.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center" style={{ border: '1px solid hsl(214 20% 90%)' }}>
              <p className="text-sm text-slate-400">No visit records on file.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((r) => (
                <div key={r.id} className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-slate-800">{r.diagnosis}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(r.visit_date).toLocaleDateString('en-PH', { dateStyle: 'long' })} · {r.doctor?.user?.name}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg" style={{ border: '1px solid hsl(214 20% 93%)' }}>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Chief Complaint</p>
                    <p className="text-sm text-slate-700">{r.chief_complaint}</p>
                  </div>
                  {r.notes && (
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{r.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prescriptions">
          {prescriptions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center" style={{ border: '1px solid hsl(214 20% 90%)' }}>
              <p className="text-sm text-slate-400">No prescriptions on file.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-mono font-bold text-slate-800">{rx.reference_no}</p>
                    <StatusBadge status={rx.status} />
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Issued {new Date(rx.issued_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })} by {rx.doctor?.user?.name}
                  </p>
                  <div className="space-y-1.5">
                    {rx.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span className="font-medium text-slate-700">{item.drug_name} {item.dosage}</span>
                        <span className="text-slate-400">— {item.frequency} × {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="billing">
          {billing.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center" style={{ border: '1px solid hsl(214 20% 90%)' }}>
              <p className="text-sm text-slate-400">No billing records on file.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {billing.map((b) => (
                <div key={b.id} className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between" style={{ border: '1px solid hsl(214 20% 90%)' }}>
                  <div>
                    <p className="font-semibold text-slate-800">Billing #{b.id}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Appointment #{b.appointment_id} · {new Date(b.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-slate-800">₱{b.amount.toLocaleString()}</p>
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

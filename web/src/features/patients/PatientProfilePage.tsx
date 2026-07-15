import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Calendar, Pill, Receipt, Phone, MapPin, CreditCard, ClipboardList, Loader2, Pencil, Save, X, FlaskConical, Printer } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import StatusBadge from '@/components/common/StatusBadge'
import { usePatient, usePatientRecords, useUpdatePatientRecord } from './queries'
import { VITALS, PE_SYSTEMS } from '@/features/consultations/clinicalForm'
import DeamhiOutPatientForm from '@/features/consultations/DeamhiOutPatientForm'
import { usePrescriptions } from '@/features/prescriptions/queries'
import { useBillingRecords, useCreatePaymentLink, useMarkPaid } from '@/features/admin/queries'
import { useAuthStore } from '@/features/auth/authStore'
import { formatPeso } from '@/lib/utils'
import type { PrescriptionStatus, BillingStatus, PatientRecord } from '@/mocks/types'

function InfoRow({ label, value, mono, redacted }: { label: string; value: string | null | undefined; mono?: boolean; redacted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      {redacted
        ? <span className="tracking-widest text-slate-300 select-none font-mono">••••••••••</span>
        : <span className={`text-sm text-slate-700 font-semibold ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
      }
    </div>
  )
}

export default function PatientProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { user: authUser } = useAuthStore()
  const isDoctor = authUser?.role === 'doctor'


  const isStaff = false
  const R = <span className="tracking-widest text-slate-300 select-none font-mono">••••••••••</span>

  const { data: patient, isLoading } = usePatient(id)
  const { data: recordsData } = usePatientRecords(patient?.id)
  const updateRecord = useUpdatePatientRecord(patient?.id)


  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ chief_complaint: '', diagnosis: '', notes: '' })
  const [today] = useState(() => new Date())

  // Print the DEAMHI Out-Patient form for one record: render it off-screen, print, then clear.
  const [printRecord, setPrintRecord] = useState<PatientRecord | null>(null)
  useEffect(() => {
    if (!printRecord) return
    window.print()
    setPrintRecord(null)
  }, [printRecord])
  const startEdit = (r: { id: number; chief_complaint: string; diagnosis: string; notes: string | null }) => {
    setEditingId(r.id)
    setEditForm({ chief_complaint: r.chief_complaint, diagnosis: r.diagnosis, notes: r.notes ?? '' })
  }
  const saveEdit = async () => {
    if (editingId == null) return
    await updateRecord.mutateAsync({ id: editingId, data: { ...editForm, notes: editForm.notes || null } })
    setEditingId(null)
  }
  const { data: prescriptionsData } = usePrescriptions({ patient_id: id })
  const { data: billingData } = useBillingRecords({ patient_id: id })
  const paymentLinkMutation = useCreatePaymentLink()
  const markPaidMutation = useMarkPaid()

  const handlePayNow = async (billingId: number) => {
    const result = await paymentLinkMutation.mutateAsync(billingId)
    window.open(result.checkout_url, '_blank')
  }

  const records = recordsData ?? []
  const prescriptions = prescriptionsData?.data ?? []
  const billing = billingData?.data ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center max-w-md" style={{ border: '1px solid var(--color-border)' }}>
        <p className="font-semibold text-slate-700 mb-2">Patient not found</p>
        <button onClick={() => navigate(isDoctor ? '/consultations' : '/patients')} className="text-sm text-teal-600 hover:underline">← Back</button>
      </div>
    )
  }

  const age = patient.dob
    ? Math.floor((today.getTime() - new Date(patient.dob).getTime()) / 31_557_600_000)
    : null

  const statBoxes = isDoctor
    ? [
        { label: 'Visits', value: records.length },
        { label: 'Rx', value: prescriptions.length },
      ]
    : [
        { label: 'Visits', value: records.length },
        { label: 'Rx', value: prescriptions.length },
        { label: 'Bills', value: billing.length },
      ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(isDoctor ? '/consultations' : '/patients')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 bg-white rounded-lg px-3 py-1.5 shadow-sm transition-colors"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h2 className="text-lg font-bold text-slate-800">Patient Profile</h2>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-4 flex items-center gap-5" style={{ border: '1px solid var(--color-border)' }}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-500 flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-sm">
          {patient.user?.name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-bold text-slate-800">{patient.user?.name}</h3>
            <StatusBadge status={patient.user?.status ?? 'active'} />
            {patient.patient_code && (
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {patient.patient_code}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 mt-2">
            {age !== null && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <User size={11} />
                {isStaff ? R : <span>{age} years old · {patient.sex === 'male' ? 'Male' : 'Female'}</span>}
              </div>
            )}
            {patient.contact && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Phone size={11} />
                {isStaff ? R : <span>{patient.contact}</span>}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <CreditCard size={11} />
              {isStaff ? R : <span className="font-mono">{patient.philhealth_no ?? 'No PhilHealth'}</span>}
            </div>
            {patient.address && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin size={11} />
                {isStaff ? R : <span>{patient.address}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="hidden md:flex gap-3 text-center shrink-0">
          {statBoxes.map((s) => (
            <div key={s.label} className="px-4 py-2 rounded-lg bg-slate-50" style={{ border: '1px solid var(--color-border)' }}>
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="mb-4 bg-white shadow-sm h-10" style={{ border: '1px solid var(--color-border)' }}>
          <TabsTrigger value="info" className="gap-1.5 text-xs">
            <User size={13} /> Demographics
          </TabsTrigger>
          <TabsTrigger value="visits" className="gap-1.5 text-xs">
            <Calendar size={13} /> Visits ({records.length})
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="gap-1.5 text-xs">
            <Pill size={13} /> Prescriptions ({prescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="clinical" className="gap-1.5 text-xs">
            <ClipboardList size={13} /> Clinical Records ({records.length})
          </TabsTrigger>
          {!isDoctor && (
            <TabsTrigger value="billing" className="gap-1.5 text-xs">
              <Receipt size={13} /> Billing ({billing.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Demographics */}
        <TabsContent value="info">
          <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Personal Information</p>
            <InfoRow label="Full Name" value={patient.user?.name} />
            <InfoRow label="Email Address" value={isStaff ? undefined : patient.user?.email} redacted={isStaff} />
            <InfoRow label="Phone Number" value={isStaff ? undefined : patient.contact} redacted={isStaff} />
            <InfoRow
              label="Date of Birth"
              value={isStaff ? undefined : (patient.dob ? new Date(patient.dob).toLocaleDateString('en-PH', { dateStyle: 'long' }) : undefined)}
              redacted={isStaff}
            />
            <InfoRow label="Sex" value={isStaff ? undefined : (patient.sex === 'male' ? 'Male' : 'Female')} redacted={isStaff} />
            <InfoRow label="Home Address" value={isStaff ? undefined : patient.address} redacted={isStaff} />
            <InfoRow label="PhilHealth No." value={isStaff ? undefined : patient.philhealth_no} mono redacted={isStaff} />
            <InfoRow label="Registered" value={isStaff ? undefined : new Date(patient.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })} redacted={isStaff} />
          </div>
        </TabsContent>

        {/* Visits — date + attending doctor */}
        <TabsContent value="visits">
          {records.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center" style={{ border: '1px solid var(--color-border)' }}>
              <p className="text-sm text-slate-500">No visit records on file.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-5 py-3">#</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-5 py-3">Visit Date</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-5 py-3">Attending Physician</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-5 py-3">Diagnosis</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const isMine = isDoctor && r.doctor?.user_id === authUser?.id
                    return (
                      <tr
                        key={r.id}
                        className="border-b last:border-0 hover:bg-slate-50"
                        style={{
                          borderColor: 'var(--color-border)',
                          ...(isMine ? { backgroundColor: 'hsl(168 60% 96%)' } : {}),
                        }}
                      >
                        <td className="py-3 pl-3 pr-1">
                          {isMine && (
                            <div className="w-1 h-6 rounded-full bg-teal-500 mx-auto" title="Your record" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{i + 1}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {new Date(r.visit_date).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                        </td>
                        <td className={`px-4 py-3 ${isMine ? 'font-semibold text-teal-700' : 'text-slate-700'}`}>
                          {r.doctor?.user?.name ?? '—'}
                          {isMine && <span className="ml-1.5 text-[10px] font-semibold bg-teal-100 text-teal-600 px-1.5 py-0.5 rounded-full">You</span>}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {isStaff ? <span className="tracking-widest text-slate-300 select-none font-mono">••••••••••</span> : r.diagnosis}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Prescriptions */}
        <TabsContent value="prescriptions">
          {prescriptions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center" style={{ border: '1px solid var(--color-border)' }}>
              <p className="text-sm text-slate-500">No prescriptions on file.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-mono font-bold text-slate-800">{rx.reference_no}</p>
                    <StatusBadge status={rx.status as PrescriptionStatus} />
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Issued {new Date(rx.issued_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })} by {rx.doctor?.user?.name}
                  </p>
                  <div className="space-y-1.5">
                    {rx.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                        {isStaff
                          ? <span className="tracking-widest text-slate-300 select-none font-mono">••••••••••••••••••</span>
                          : <>
                              <span className="font-medium text-slate-700">{item.drug_name} {item.dosage}</span>
                              <span className="text-slate-500">— {item.frequency} × {item.quantity}</span>
                            </>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Clinical Records — chief complaint, diagnosis, notes */}
        <TabsContent value="clinical">
          {records.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center" style={{ border: '1px solid var(--color-border)' }}>
              <p className="text-sm text-slate-500">No clinical records on file.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((r) => {
                const isMine = isDoctor && r.doctor?.user_id === authUser?.id
                return (
                <div
                  key={r.id}
                  className="bg-white rounded-xl shadow-sm p-5"
                  style={{
                    border: isMine ? '1px solid hsl(168 45% 75%)' : '1px solid var(--color-border)',
                    ...(isMine ? { backgroundColor: 'hsl(168 60% 96%)' } : {}),
                  }}
                >
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex-1 min-w-0">
                      {editingId === r.id ? (
                        <input
                          value={editForm.diagnosis}
                          onChange={(e) => setEditForm((f) => ({ ...f, diagnosis: e.target.value }))}
                          placeholder="Diagnosis"
                          className="w-full text-sm font-bold text-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
                          style={{ border: '1px solid var(--color-border)' }}
                        />
                      ) : (
                        <p className="font-bold text-slate-800">{r.diagnosis}</p>
                      )}
                      <p className="text-xs mt-0.5">
                        <span className="text-slate-500">{new Date(r.visit_date).toLocaleDateString('en-PH', { dateStyle: 'long' })} · </span>
                        <span className={isMine ? 'font-semibold text-teal-700' : 'text-slate-500'}>
                          {r.doctor?.user?.name}
                          {isMine && <span className="ml-1.5 text-[10px] font-semibold bg-teal-100 text-teal-600 px-1.5 py-0.5 rounded-full">You</span>}
                        </span>
                      </p>
                    </div>
                    {editingId !== r.id && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isStaff && (
                          <button
                            onClick={() => setPrintRecord(r)}
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                            title="Print DEAMHI Out-Patient form"
                          >
                            <Printer size={12} /> Print
                          </button>
                        )}
                        {isDoctor && (
                          <button
                            onClick={() => startEdit(r)}
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
                            title="Edit this record"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(40 33% 98%)', border: '1px solid var(--color-border)' }}>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Chief Complaint</p>
                      {isStaff
                        ? <span className="tracking-widest text-slate-300 select-none font-mono">••••••••••••••</span>
                        : editingId === r.id
                          ? <Textarea value={editForm.chief_complaint} onChange={(e) => setEditForm((f) => ({ ...f, chief_complaint: e.target.value }))} rows={2} className="text-sm" />
                          : <p className="text-sm text-slate-700">{r.chief_complaint}</p>
                      }
                    </div>
                    {!isStaff && r.vital_signs && VITALS.some(([k]) => r.vital_signs?.[k]) && (
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(40 33% 98%)', border: '1px solid var(--color-border)' }}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Vital Signs</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                          {VITALS.filter(([k]) => r.vital_signs?.[k]).map(([k, label]) => (
                            <span key={k}><span className="text-slate-500">{label}:</span> <span className="font-medium">{r.vital_signs?.[k]}</span></span>
                          ))}
                        </div>
                      </div>
                    )}
                    {!isStaff && r.physical_exam && (
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(40 33% 98%)', border: '1px solid var(--color-border)' }}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Physical Examination</p>
                        {(() => {
                          const abnormal = PE_SYSTEMS.filter(([k]) => (r.physical_exam?.[k]?.status ?? 'Normal') !== 'Normal')
                          if (abnormal.length === 0) return <p className="text-sm text-slate-500">All systems normal.</p>
                          return (
                            <ul className="text-sm text-slate-700 space-y-0.5">
                              {abnormal.map(([k, label]) => {
                                const e = r.physical_exam?.[k]
                                return (
                                  <li key={k}>
                                    <span className="font-medium">{label}:</span> {e?.status}{e?.notes ? ` — ${e.notes}` : ''}
                                  </li>
                                )
                              })}
                            </ul>
                          )
                        })()}
                      </div>
                    )}
                    {(r.notes || editingId === r.id) && (
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(40 33% 98%)', border: '1px solid var(--color-border)' }}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Clinical Notes</p>
                        {isStaff
                          ? <span className="tracking-widest text-slate-300 select-none font-mono">••••••••••••••••••••</span>
                          : editingId === r.id
                            ? <Textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={4} className="text-sm" placeholder="Clinical notes…" />
                            : <p className="text-sm text-slate-700 leading-relaxed">{r.notes}</p>
                        }
                      </div>
                    )}

                    {editingId === r.id && (
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={updateRecord.isPending || !editForm.diagnosis || !editForm.chief_complaint}
                          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-50"
                        >
                          <Save size={14} /> {updateRecord.isPending ? 'Saving…' : 'Save changes'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    )}

                    {/* Prescription / procedure for THIS visit — grouped with the notes (mentor review) */}
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(201 60% 98%)', border: '1px solid var(--color-border)' }}>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        <Pill size={12} /> Prescription / Procedure
                      </p>
                      {isStaff ? (
                        <span className="tracking-widest text-slate-300 select-none font-mono">••••••••••••••••</span>
                      ) : (r.prescriptions?.length ?? 0) === 0 ? (
                        <p className="text-sm italic" style={{ color: 'hsl(215 16% 60%)' }}>
                          No prescription or procedure for this visit — notes only.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {r.prescriptions!.map((rx) => (
                            <div key={rx.id} className="rounded-lg bg-white p-2.5" style={{ border: '1px solid var(--color-border)' }}>
                              <div className="flex items-center justify-between mb-1.5">
                                <button
                                  onClick={() => navigate(`/prescriptions/${rx.id}`)}
                                  className="font-mono text-xs font-bold text-teal-700 hover:underline"
                                >
                                  {rx.reference_no}
                                </button>
                                <StatusBadge status={rx.status as PrescriptionStatus} />
                              </div>
                              <div className="space-y-1">
                                {rx.items.map((item) => (
                                  <div key={item.id} className="flex items-center gap-2 text-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                                    <span className="font-medium text-slate-700">{item.drug_name} {item.dosage}</span>
                                    <span className="text-slate-500">— {item.frequency} × {item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Diagnostic / lab orders for THIS visit (Phase 4) */}
                    {!isStaff && (r.diagnostic_orders?.length ?? 0) > 0 && (
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(201 40% 98%)', border: '1px solid var(--color-border)' }}>
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                          <FlaskConical size={12} /> Diagnostic / Lab Orders
                        </p>
                        <div className="space-y-2.5">
                          {r.diagnostic_orders!.map((order) => (
                            <div key={order.id} className="rounded-lg bg-white p-2.5" style={{ border: '1px solid var(--color-border)' }}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-mono text-xs font-bold text-sky-700">{order.reference_no}</span>
                                <StatusBadge status={order.status} />
                              </div>
                              <div className="space-y-1">
                                {order.items.map((item) => (
                                  <div key={item.id} className="flex items-center gap-2 text-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                                    <span className="font-medium text-slate-700">{item.test_name}</span>
                                    {item.clinical_reason && <span className="text-slate-500">— {item.clinical_reason}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )})}
            </div>
          )}
        </TabsContent>

        {/* Billing — admin only */}
        {!isDoctor && (
          <TabsContent value="billing">
            {billing.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-10 text-center" style={{ border: '1px solid var(--color-border)' }}>
                <p className="text-sm text-slate-500">No billing records on file.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {billing.map((b) => (
                  <div key={b.id} className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between gap-4" style={{ border: '1px solid var(--color-border)' }}>
                    <div>
                      <p className="font-semibold text-slate-800">Billing #{b.id}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Appointment #{b.appointment_id} · {new Date(b.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                      </p>
                      {b.paid_at && (
                        <p className="text-xs text-emerald-600 mt-0.5">
                          Paid {new Date(b.paid_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-lg text-slate-800">{formatPeso(b.amount) ?? '₱0.00'}</p>
                        <StatusBadge status={b.status as BillingStatus} />
                      </div>
                      {b.status === 'pending' && (
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => handlePayNow(b.id)}
                            disabled={paymentLinkMutation.isPending}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-60"
                          >
                            Pay Now
                          </button>
                          {authUser?.role === 'admin' && (
                            <button
                              onClick={() => markPaidMutation.mutate(b.id)}
                              disabled={markPaidMutation.isPending}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-60"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Off-screen printable DEAMHI Out-Patient form (rendered only while printing) */}
      {printRecord && patient && (
        <div className="op-print-area">
          <DeamhiOutPatientForm record={printRecord} patient={patient} />
        </div>
      )}
    </div>
  )
}

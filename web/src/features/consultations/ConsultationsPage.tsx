import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FilePlus, Stethoscope, CheckCircle2, Search, Pill, Plus, Trash2, FlaskConical, AlertTriangle, CalendarDays, CalendarClock, Users, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useAllPatientRecords, useCreatePatientRecord, usePatients } from '@/features/patients/queries'
import { useAppointments, useUpdateAppointmentStatus } from '@/features/appointments/queries'
import { useCreatePrescription, usePatientRxSafety } from '@/features/prescriptions/queries'
import { checkDrug, type RxWarning } from '@/features/prescriptions/rxSafety'
import { useCreateDiagnosticOrder } from '@/features/diagnostics/queries'
import PrescriptionItemEditor from '@/features/prescriptions/PrescriptionItemEditor'
import { type RxItem, emptyRxItem, rxItemComplete, rxItemTouched, toRxPayload } from '@/features/prescriptions/rxItem'
import DiagnosticTestPicker from '@/features/diagnostics/DiagnosticTestPicker'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useAuthStore } from '@/features/auth/authStore'
import type { PatientRecord } from '@/mocks/types'

interface TestItem {
  test_name: string
  diagnostic_test_id: number | null
  clinical_reason: string
}

const EMPTY_TEST: TestItem = { test_name: '', diagnostic_test_id: null, clinical_reason: '' }

const EMPTY_FORM = {
  patient_id: '',
  appointment_id: '',
  visit_date: new Date().toISOString().split('T')[0],
  chief_complaint: '',
  diagnosis: '',
  notes: '',
  restriction_category: '',
  restricted_specialization: '',
  follow_up_enabled: false,
  follow_up_date: '',
  follow_up_time: '09:00',
  follow_up_reason: '',
}

// Quick-pick intervals for the doctor's follow-up date (days from today).
const FOLLOW_UP_PRESETS: { label: string; days: number }[] = [
  { label: '1 week',  days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
]

function isoDatePlusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// Restricted-data categories a doctor can flag a record with (mentor break-glass requirement).
const RESTRICTIONS: { value: string; label: string }[] = [
  { value: '',                  label: 'None — standard record' },
  { value: 'mental_health',     label: 'Mental Health / Psychotherapy' },
  { value: 'genetic',           label: 'Genetic Testing' },
  { value: 'substance_abuse',   label: 'Substance Abuse Treatment' },
  { value: 'vip',               label: 'VIP / Break-Glass' },
  { value: 'patient_requested', label: 'Patient-Requested Restriction' },
]

type TimeFilter = 'all' | 'recent' | 'month'

// When true, the New Record queue lists a doctor's appointments from ANY day (not just today) so
// consultation records + prescriptions can be created without waiting for the appointment date.
// Enabled per request so doctors can consult/prescribe even before the scheduled slot.
// (The original mentor rule was "doctor cannot start a record if the time is not today".)
const ALLOW_ANY_DAY_CONSULTATION = true

export default function ConsultationsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const isStaff = user?.role === 'staff'

  const [showForm, setShowForm]     = useState(false)
  const [formData, setFormData]     = useState(EMPTY_FORM)
  const [meds, setMeds]             = useState<RxItem[]>([])
  const [tests, setTests]           = useState<TestItem[]>([])
  const [search, setSearch]         = useState('')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [showAllergyConfirm, setShowAllergyConfirm] = useState(false)

  // Booking auto-reserves (status 'scheduled') and the mentor removed the confirm step, so the
  // consultation queue is simply TODAY's appointments that aren't already served/cancelled.
  const todayIso = new Date().toISOString().split('T')[0]
  const { data: recordsData }    = useAllPatientRecords()
  // TESTING BYPASS only: source the consultation patient list from ALL registered patients
  // (no appointment/schedule needed). Reverts with the 86fbf00 testing bypass.
  const { data: allPatientsData } = usePatients()
  const { data: appointmentsData } = useAppointments(ALLOW_ANY_DAY_CONSULTATION ? undefined : { date: todayIso })
  const createRecord  = useCreatePatientRecord()
  const createPrescription = useCreatePrescription()
  const createDiagnosticOrder = useCreateDiagnosticOrder()
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

  // A consultation can only be started for a patient with an appointment TODAY (mentor review:
  // "doctor cannot start a record if the time is not today") that hasn't been served/cancelled.
  // Selecting one auto-fills the visit date from that appointment.
  const confirmedPatients = useMemo(() => {
    // TESTING BYPASS: with ALLOW_ANY_DAY_CONSULTATION on, any registered patient is consultable
    // (no appointment / schedule requirement). appointment_id = 0 → the "mark served" step is
    // skipped. Reverting the bypass restores the appointment-based queue below.
    if (ALLOW_ANY_DAY_CONSULTATION) {
      return (allPatientsData?.data ?? []).map((p) => ({
        id: p.id,
        name: p.user?.name ?? '',
        appointment_id: 0,
        date: todayIso,
      }))
    }
    const seen = new Set<number>()
    const consultable = new Set(['scheduled', 'confirmed', 'rescheduled'])
    return (appointmentsData?.data ?? []).reduce<{ id: number; name: string; appointment_id: number; date: string }[]>(
      (acc, appt) => {
        const apptDate = new Date(appt.scheduled_at).toISOString().split('T')[0]
        const dayOk = ALLOW_ANY_DAY_CONSULTATION || apptDate === todayIso
        // Guest appointments (no account yet) cannot start a consultation.
        if (appt.patient && appt.patient_id != null && dayOk && consultable.has(appt.status) && !seen.has(appt.patient_id)) {
          seen.add(appt.patient_id)
          acc.push({ id: appt.patient_id, name: appt.patient.user?.name ?? '', appointment_id: appt.id, date: apptDate })
        }
        return acc
      },
      [],
    )
  }, [appointmentsData, allPatientsData, todayIso])

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
      // appointment_id 0 (testing bypass: no appointment) → '' so the "mark served" step is skipped.
      appointment_id: match && match.appointment_id ? String(match.appointment_id) : '',
      // Auto-fill the visit date from the chosen appointment (today).
      visit_date: match ? match.date : prev.visit_date,
    }))
  }

  // Deep-link from the appointment detail's "Start Consultation" button: open the New Record
  // form with that patient pre-selected. Waits until the patient is in the consultable queue
  // (appointments loaded), then runs once.
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current || isStaff) return
    const pid = (location.state as { patientId?: number } | null)?.patientId
    if (!pid) return
    if (confirmedPatients.some((p) => p.id === pid)) {
      setShowForm(true)
      handlePatientChange(String(pid))
      prefilled.current = true
    }
  }, [confirmedPatients, isStaff, location.state])

  // ── Inline prescription (Epic H + O) — optional; doctor prescribes in the same screen ──
  const setMedAt   = (i: number, item: RxItem) => setMeds((prev) => prev.map((m, idx) => (idx === i ? item : m)))
  const addMed     = () => setMeds((prev) => [...prev, emptyRxItem()])
  const removeMed  = (i: number) => setMeds((prev) => prev.filter((_, idx) => idx !== i))

  const validMeds  = meds.filter(rxItemComplete)
  // A row the doctor started but left incomplete blocks submit (avoid silent drops).
  const medsIncomplete = meds.some((m) => rxItemTouched(m) && !rxItemComplete(m))

  // ── Prescribing safety (allergy + duplicate/interaction) ──────────────────────────────────
  const { data: rxSafety } = usePatientRxSafety(formData.patient_id || undefined)
  const rxWarnings: RxWarning[] = useMemo(() => {
    if (!rxSafety) return []
    return meds.flatMap((m) => (m.drug_name ? checkDrug(m.drug_name, rxSafety.known_allergies, rxSafety.active_medications) : []))
  }, [meds, rxSafety])
  const allergyWarnings = rxWarnings.filter((w) => w.level === 'allergy')

  // ── Inline diagnostic order (Phase 4) — optional; order tests in the same screen ──
  const updateTest = (i: number, field: keyof TestItem, value: string | number | null) =>
    setTests((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)))
  const addTest    = () => setTests((prev) => [...prev, { ...EMPTY_TEST }])
  const removeTest = (i: number) => setTests((prev) => prev.filter((_, idx) => idx !== i))
  const validTests = tests.filter((t) => !!t.test_name.trim())

  const followUpValid = !formData.follow_up_enabled || (!!formData.follow_up_date && !!formData.follow_up_time)
  const isValid   = !!formData.patient_id && !!formData.chief_complaint && !!formData.diagnosis && !medsIncomplete && followUpValid
  const isPending = createRecord.isPending || createPrescription.isPending || createDiagnosticOrder.isPending || updateStatus.isPending

  const resetForm = () => { setShowForm(false); setFormData(EMPTY_FORM); setMeds([]); setTests([]) }

  const handleServed = () => {
    if (!isValid) return
    // Allergy conflicts require an explicit override (clinical judgment) via a confirm modal.
    if (allergyWarnings.length > 0) {
      setShowAllergyConfirm(true)
      return
    }
    void submitConsultation()
  }

  const submitConsultation = async () => {
    setShowAllergyConfirm(false)
    const {
      appointment_id, restriction_category, restricted_specialization,
      follow_up_enabled, follow_up_date, follow_up_time, follow_up_reason,
      ...rest
    } = formData
    const recordPayload = {
      ...rest,
      // Only send restriction fields when a category is chosen (else the record is standard).
      ...(restriction_category
        ? { restriction_category, restricted_specialization: restricted_specialization || null }
        : {}),
      // When the doctor scheduled a return visit, book it in the same save (backend creates a
      // follow_up appointment linked to this consultation).
      ...(follow_up_enabled && follow_up_date
        ? { follow_up_at: `${follow_up_date}T${follow_up_time || '09:00'}:00`, follow_up_reason: follow_up_reason || null }
        : {}),
    }
    const record = await createRecord.mutateAsync(recordPayload)

    // Prescription is optional — a notes-only consultation is valid (Epic I). If meds were
    // added, issue the prescription against the just-created visit record.
    if (validMeds.length > 0 && record?.id) {
      await createPrescription.mutateAsync({
        patient_record_id: record.id,
        items: validMeds.map(toRxPayload),
      })
    }

    // Diagnostic test order — also optional, same visit record (Phase 4).
    if (validTests.length > 0 && record?.id) {
      await createDiagnosticOrder.mutateAsync({
        patient_record_id: record.id,
        items: validTests.map((t) => ({
          test_name: t.test_name.trim(),
          diagnostic_test_id: t.diagnostic_test_id,
          clinical_reason: t.clinical_reason || null,
        })),
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
      <div className="mb-5 overflow-hidden rounded-xl shadow-sm" style={{ border: '1px solid hsl(201 55% 82%)', background: 'linear-gradient(135deg, hsl(201 74% 96%) 0%, hsl(168 48% 95%) 100%)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white" style={{ backgroundColor: 'hsl(201 100% 36%)' }}>
              <Stethoscope size={14} />
              Consultation workspace
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'hsl(215 30% 14%)' }}>
              Consultations
            </h1>
            <p className="mt-1 max-w-2xl text-sm" style={{ color: 'hsl(215 16% 45%)' }}>
              Create clinical notes, issue prescriptions, order diagnostic tests, and review patient visit history.
            </p>
          </div>
          {!isStaff && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              <FilePlus size={15} />
              New Record
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/70 bg-white/35 px-5 py-3 text-sm">
          <div className="inline-flex items-center gap-2">
            <Users size={15} className="text-sky-700" />
            <span className="font-bold text-slate-900">{totalPatients}</span>
            <span className="font-medium text-slate-600">patients seen</span>
          </div>
          <div className="hidden h-4 w-px bg-slate-300/70 sm:block" />
          <div className="inline-flex items-center gap-2">
            <ClipboardList size={15} className="text-emerald-700" />
            <span className="font-bold text-slate-900">{totalConsultations}</span>
            <span className="font-medium text-slate-600">consultations</span>
          </div>
          <div className="hidden h-4 w-px bg-slate-300/70 sm:block" />
          <div className="inline-flex items-center gap-2">
            <CalendarDays size={15} className="text-amber-700" />
            <span className="font-medium text-slate-600">most recent</span>
            <span className="font-bold text-slate-900">{mostRecentVisit}</span>
          </div>
        </div>
      </div>

      {/* ── New consultation form ── */}
      {showForm && !isStaff && (
        <div className="mb-6 overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid hsl(201 60% 88%)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{ background: 'linear-gradient(135deg, hsl(201 74% 96%) 0%, hsl(168 48% 95%) 100%)', borderBottom: '1px solid hsl(201 45% 86%)' }}>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <Stethoscope size={17} />
              </span>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'hsl(215 30% 14%)' }}>New Consultation Record</p>
                <p className="text-xs" style={{ color: 'hsl(215 16% 50%)' }}>Document the visit, then optionally add Rx or diagnostics.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold" style={{ color: 'hsl(201 100% 34%)', border: '1px solid hsl(201 45% 84%)' }}>
              <CalendarDays size={13} />
              {new Date(formData.visit_date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div className="p-5">
            <div className="mb-4 grid gap-4 md:grid-cols-2">
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
                <p className="text-xs" style={{ color: 'hsl(215 16% 55%)' }}>
                  {ALLOW_ANY_DAY_CONSULTATION ? 'No reservable appointments found.' : 'No reserved appointments for today.'}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 50%)' }}>Visit Date</label>
              {/* Auto-filled from the appointment (today) and locked — a record is started on the visit day. */}
              <Input type="date" value={formData.visit_date} readOnly disabled title="Set automatically from today's appointment" />
            </div>
          </div>

          {/* Known-allergies banner — visible the moment a patient is selected. */}
          {rxSafety?.known_allergies && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 mb-4" style={{ border: '1px solid hsl(0 80% 88%)', backgroundColor: 'hsl(0 90% 98%)' }}>
              <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700"><span className="font-bold">Known allergies:</span> {rxSafety.known_allergies}</p>
            </div>
          )}

            <div className="mb-4 rounded-xl bg-slate-50 p-4" style={{ border: '1px solid hsl(210 18% 92%)' }}>
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
          </div>

          {/* Confidentiality — flag a record as restricted; it's then filtered out of the main
              timeline and only an authorized specialist (or break-glass) can read it. */}
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 50%)' }}>Confidentiality</label>
              <select
                className="w-full h-9 rounded-lg border text-sm bg-white px-3 focus:outline-none focus:ring-2"
                style={{ borderColor: 'hsl(210 18% 88%)' }}
                value={formData.restriction_category}
                onChange={(e) => setFormData((p) => ({ ...p, restriction_category: e.target.value }))}
              >
                {RESTRICTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {formData.restriction_category && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 50%)' }}>Restrict to specialization <span className="font-normal normal-case">(optional)</span></label>
                <Input
                  placeholder="e.g. Psychiatry — leave blank for break-glass only"
                  value={formData.restricted_specialization}
                  onChange={(e) => setFormData((p) => ({ ...p, restricted_specialization: e.target.value }))}
                />
              </div>
            )}
          </div>

          {/* ── Prescription (optional, Epic H) — prescribe in the same screen as the notes ── */}
          <div className="mb-4 rounded-xl bg-slate-50 p-4" style={{ border: '1px solid hsl(210 18% 92%)' }}>
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
                  <PrescriptionItemEditor
                    key={i}
                    item={m}
                    index={i}
                    canRemove
                    onChange={(item) => setMedAt(i, item)}
                    onRemove={() => removeMed(i)}
                  />
                ))}
              </div>
            )}
            {medsIncomplete && (
              <p className="text-xs text-red-500 mt-2">Finish or remove the incomplete medication (drug, dosage, quantity, frequency and duration are required).</p>
            )}

            {/* Safety warnings — allergy conflicts + duplicate/same-class therapy (non-blocking). */}
            {rxWarnings.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {rxWarnings.map((w, i) => {
                  const isAllergy = w.level === 'allergy'
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg px-3 py-2"
                      style={isAllergy
                        ? { border: '1px solid hsl(0 80% 86%)', backgroundColor: 'hsl(0 90% 98%)' }
                        : { border: '1px solid hsl(38 90% 82%)', backgroundColor: 'hsl(42 100% 97%)' }}
                    >
                      <AlertTriangle size={14} className={`${isAllergy ? 'text-red-500' : 'text-amber-500'} shrink-0 mt-0.5`} />
                      <p className={`text-xs ${isAllergy ? 'text-red-700' : 'text-amber-700'}`}>
                        <span className="font-bold">{w.drug}{isAllergy ? ' — ALLERGY' : w.level === 'duplicate' ? ' — DUPLICATE' : ' — INTERACTION'}:</span> {w.message}
                      </p>
                    </div>
                  )
                })}
                <p className="text-[11px] text-slate-400">Review before issuing — you can still proceed using clinical judgment.</p>
              </div>
            )}
          </div>

          {/* ── Diagnostic tests (optional, Phase 4) — order labs/imaging in the same screen ── */}
          <div className="mb-4 rounded-xl bg-slate-50 p-4" style={{ border: '1px solid hsl(210 18% 92%)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'hsl(215 30% 14%)' }}>
                <FlaskConical size={15} style={{ color: 'hsl(201 100% 36%)' }} />
                Diagnostic tests <span className="text-xs font-normal" style={{ color: 'hsl(215 16% 60%)' }}>(optional)</span>
              </p>
              <Button variant="outline" size="sm" onClick={addTest}>
                <Plus size={13} className="mr-1" /> Order a test
              </Button>
            </div>

            {tests.length === 0 ? (
              <p className="text-xs" style={{ color: 'hsl(215 16% 55%)' }}>
                No test ordered — add lab/imaging requests (e.g. CBC, Chest X-ray) if needed.
              </p>
            ) : (
              <div className="space-y-3">
                {tests.map((t, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{ border: '1px solid hsl(210 18% 90%)', backgroundColor: 'hsl(201 40% 98%)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'hsl(215 16% 50%)' }}>Test {i + 1}</span>
                      <button onClick={() => removeTest(i)} className="text-slate-300 hover:text-red-500 transition-colors" aria-label={`Remove test ${i + 1}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      <DiagnosticTestPicker
                        value={t.test_name}
                        onValueChange={(v) => { updateTest(i, 'test_name', v); updateTest(i, 'diagnostic_test_id', null) }}
                        onSelect={(test) => { updateTest(i, 'test_name', test.name); updateTest(i, 'diagnostic_test_id', test.id) }}
                      />
                      <Input value={t.clinical_reason} onChange={(e) => updateTest(i, 'clinical_reason', e.target.value)} placeholder="Clinical reason / indication (optional)" className="h-9 text-sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Follow-up (optional) — doctor schedules the return visit right here ── */}
          <div className="mb-4 rounded-xl bg-slate-50 p-4" style={{ border: '1px solid hsl(210 18% 92%)' }}>
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'hsl(215 30% 14%)' }}>
                <CalendarClock size={15} style={{ color: 'hsl(201 100% 36%)' }} />
                Schedule follow-up <span className="text-xs font-normal" style={{ color: 'hsl(215 16% 60%)' }}>(optional)</span>
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-sky-600"
                checked={formData.follow_up_enabled}
                onChange={(e) => setFormData((p) => ({
                  ...p,
                  follow_up_enabled: e.target.checked,
                  // Default to 2 weeks out the first time it's turned on.
                  follow_up_date: e.target.checked && !p.follow_up_date ? isoDatePlusDays(14) : p.follow_up_date,
                }))}
              />
            </label>

            {formData.follow_up_enabled && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {FOLLOW_UP_PRESETS.map((preset) => {
                    const active = formData.follow_up_date === isoDatePlusDays(preset.days)
                    return (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, follow_up_date: isoDatePlusDays(preset.days) }))}
                        className="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
                        style={active
                          ? { backgroundColor: 'hsl(201 100% 36%)', color: 'white', borderColor: 'hsl(201 100% 36%)' }
                          : { backgroundColor: 'white', color: 'hsl(215 16% 40%)', borderColor: 'hsl(210 18% 88%)' }}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 50%)' }}>Date</label>
                    <Input
                      type="date"
                      min={isoDatePlusDays(1)}
                      value={formData.follow_up_date}
                      onChange={(e) => setFormData((p) => ({ ...p, follow_up_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 50%)' }}>Time</label>
                    <Input
                      type="time"
                      value={formData.follow_up_time}
                      onChange={(e) => setFormData((p) => ({ ...p, follow_up_time: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 50%)' }}>Reason <span className="font-normal normal-case">(optional)</span></label>
                  <Input
                    placeholder="e.g. Re-check blood pressure, review lab results…"
                    value={formData.follow_up_reason}
                    onChange={(e) => setFormData((p) => ({ ...p, follow_up_reason: e.target.value }))}
                  />
                </div>
                <p className="text-[11px] text-slate-400">Books a follow-up appointment on your calendar when you complete the consultation.</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending || !isValid} onClick={handleServed}>
              <CheckCircle2 size={14} className="mr-1.5" />
              {isPending
                ? 'Saving…'
                : `Complete${validMeds.length > 0 ? ` + Rx (${validMeds.length})` : ''}${validTests.length > 0 ? ` + Tests (${validTests.length})` : ''}`}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
          </div>
        </div>
      )}

      {/* ── Search + filters ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
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
          style={{ color: 'hsl(215 16% 50%)', backgroundColor: 'hsl(201 70% 97%)', borderBottom: '1px solid hsl(210 18% 92%)', gridTemplateColumns: '2fr 1.2fr 1.5fr 0.8fr' }}
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
              onDoubleClick={() => navigate(`/records/${row.patient_id}`)}
              className="grid items-center px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
              style={{ borderBottom: '1px solid hsl(210 18% 93%)', gridTemplateColumns: '2fr 1.2fr 1.5fr 0.8fr' }}
              title="Double-click to view patient record"
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
                {row.diagnosis}
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

      {/* Allergy-conflict override — explicit confirmation before issuing a conflicting Rx. */}
      <ConfirmDialog
        open={showAllergyConfirm}
        onOpenChange={setShowAllergyConfirm}
        variant="destructive"
        title="Allergy conflict"
        description={`This patient's records flag a possible allergy to ${allergyWarnings.map((w) => w.drug).join(', ')}. Issue this prescription anyway?`}
        confirmLabel="Override & issue"
        loading={createRecord.isPending || createPrescription.isPending}
        onConfirm={() => void submitConsultation()}
      />
    </>
  )
}

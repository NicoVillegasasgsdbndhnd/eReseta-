import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownUp,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FolderOpen,
  Loader2,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAllPatientRecords, usePatients } from '@/features/patients/queries'
import { useAuthStore } from '@/features/auth/authStore'
import type { Patient, PatientRecord } from '@/mocks/types'

const AVATAR_COLORS = [
  { bg: 'hsl(201 60% 90%)', fg: 'hsl(201 100% 30%)' },
  { bg: 'hsl(258 50% 92%)', fg: 'hsl(258 60% 45%)' },
  { bg: 'hsl(152 45% 88%)', fg: 'hsl(152 55% 28%)' },
  { bg: 'hsl(27 85% 90%)',  fg: 'hsl(27 90% 38%)' },
]

type SortKey = 'recent' | 'name' | 'visits' | 'newest' | 'age'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Latest visit' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'visits', label: 'Most visits' },
  { value: 'newest', label: 'Newest patient' },
  { value: 'age', label: 'Age' },
]

interface PatientSummary {
  patient: Patient
  records: PatientRecord[]
  name: string
  patientCode: string
  age: number | null
  sex: string
  latestVisit: string | null
  latestDiagnosis: string | null
  lastUpdated: string
}

function calculateAge(dob?: string | null) {
  if (!dob) return null
  const birthDate = new Date(dob)
  if (Number.isNaN(birthDate.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDelta = today.getMonth() - birthDate.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1
  return age
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function patientName(patient: Patient) {
  return patient.user?.name ?? `Patient #${patient.id}`
}

function buildRecordMap(records: PatientRecord[]) {
  const map = new Map<number, PatientRecord[]>()
  records.forEach((record) => {
    const list = map.get(record.patient_id) ?? []
    list.push(record)
    map.set(record.patient_id, list)
  })

  map.forEach((list) => {
    list.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
  })

  return map
}

export default function PatientRecordsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('recent')
  const { data, isLoading } = usePatients(search ? { search } : undefined)
  const { data: recordsData, isLoading: recordsLoading } = useAllPatientRecords()
  const patients = data?.data ?? []
  const records = recordsData?.data ?? []
  const canCreate = user?.role === 'staff' || user?.role === 'admin'

  const summaries = useMemo<PatientSummary[]>(() => {
    const byPatient = buildRecordMap(records)

    return patients
      .map((patient) => {
        const patientRecords = byPatient.get(patient.id) ?? []
        const latest = patientRecords[0]
        return {
          patient,
          records: patientRecords,
          name: patientName(patient),
          patientCode: patient.patient_code ?? `Patient #${patient.id}`,
          age: calculateAge(patient.dob),
          sex: patient.sex ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1) : '-',
          latestVisit: latest?.visit_date ?? null,
          latestDiagnosis: latest?.diagnosis ?? null,
          lastUpdated: latest?.updated_at ?? patient.updated_at,
        }
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        if (sortBy === 'visits') return b.records.length - a.records.length || a.name.localeCompare(b.name)
        if (sortBy === 'newest') return new Date(b.patient.created_at).getTime() - new Date(a.patient.created_at).getTime()
        if (sortBy === 'age') return (b.age ?? -1) - (a.age ?? -1)
        return new Date(b.latestVisit ?? 0).getTime() - new Date(a.latestVisit ?? 0).getTime()
      })
  }, [patients, records, sortBy])

  const withVisits = summaries.filter((summary) => summary.records.length > 0).length
  const latestVisit = summaries.reduce<string | null>((latest, summary) => {
    if (!summary.latestVisit) return latest
    if (!latest) return summary.latestVisit
    return new Date(summary.latestVisit).getTime() > new Date(latest).getTime() ? summary.latestVisit : latest
  }, null)

  return (
    <div className="space-y-5">
      <div
        className="overflow-hidden rounded-xl shadow-sm"
        style={{ border: '1px solid hsl(201 55% 82%)', background: 'linear-gradient(135deg, hsl(201 74% 96%) 0%, hsl(168 48% 95%) 100%)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white" style={{ backgroundColor: 'hsl(201 100% 36%)' }}>
              <FolderOpen size={14} />
              Chart directory
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patient Records</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Review patient charts, latest visits, and clinical history. Every chart access is logged for compliance.
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => navigate('/patients/new')}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              <UserPlus size={15} />
              New Patient
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/70 bg-white/35 px-5 py-3 text-sm">
          <div className="inline-flex items-center gap-2">
            <Users size={15} className="text-sky-700" />
            <span className="font-bold text-slate-900">{summaries.length}</span>
            <span className="font-medium text-slate-600">patients</span>
          </div>
          <div className="hidden h-4 w-px bg-slate-300/70 sm:block" />
          <div className="inline-flex items-center gap-2">
            <ClipboardList size={15} className="text-emerald-700" />
            <span className="font-bold text-slate-900">{withVisits}</span>
            <span className="font-medium text-slate-600">with visits</span>
          </div>
          <div className="hidden h-4 w-px bg-slate-300/70 sm:block" />
          <div className="inline-flex items-center gap-2">
            <CalendarDays size={15} className="text-amber-700" />
            <span className="font-medium text-slate-600">latest visit</span>
            <span className="font-bold text-slate-900">{formatDate(latestVisit)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <div className="relative min-w-64 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient by name..."
            className="h-9 pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowDownUp size={15} className="text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="h-9 rounded-lg border bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-sky-400"
            style={{ borderColor: 'hsl(210 18% 88%)' }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading || recordsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : summaries.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <FolderOpen size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">No patients found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div
            className="hidden grid-cols-[minmax(220px,1.5fr)_0.7fr_0.8fr_minmax(180px,1.2fr)_0.7fr_40px] items-center gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid"
            style={{ backgroundColor: 'hsl(201 70% 97%)', borderBottom: '1px solid hsl(210 18% 92%)' }}
          >
            <span>Patient</span>
            <span>Age / Sex</span>
            <span>Latest Visit</span>
            <span>Last Diagnosis</span>
            <span>Visits</span>
            <span />
          </div>

          <div className="divide-y divide-slate-100">
            {summaries.map((summary, index) => {
              const color = AVATAR_COLORS[index % AVATAR_COLORS.length]
              return (
                <button
                  key={summary.patient.id}
                  onClick={() => navigate(`/records/${summary.patient.id}`)}
                  className="grid w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-sky-50 md:grid-cols-[minmax(220px,1.5fr)_0.7fr_0.8fr_minmax(180px,1.2fr)_0.7fr_40px] md:items-center md:gap-4"
                  title="Open patient chart"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold"
                      style={{ backgroundColor: color.bg, color: color.fg }}
                    >
                      {summary.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{summary.name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{summary.patientCode}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {summary.age !== null ? `${summary.age} yrs` : '-'}
                    </p>
                    <p className="text-xs text-slate-500">{summary.sex}</p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">{formatDate(summary.latestVisit)}</p>
                    <p className="text-xs text-slate-500">Updated {formatDate(summary.lastUpdated)}</p>
                  </div>

                  <p className="line-clamp-2 text-sm text-slate-700">
                    {summary.latestDiagnosis ?? 'No diagnosis recorded yet'}
                  </p>

                  <div>
                    <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                      {summary.records.length} {summary.records.length === 1 ? 'visit' : 'visits'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 md:justify-end">
                    {summary.records.some((record) => record.restriction_category) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 md:hidden">
                        <ShieldCheck size={11} />
                        Restricted
                      </span>
                    )}
                    <ChevronRight size={18} className="ml-auto text-slate-300" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

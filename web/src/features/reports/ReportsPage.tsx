import { useState } from 'react'
import { BarChart3, CalendarDays, Pill, Download, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import StatusBadge from '@/components/common/StatusBadge'
import { useAppointmentReport, usePrescriptionReport } from './queries'
import type { AppointmentStatus, PrescriptionStatus } from '@/mocks/types'

const BLUE = 'hsl(201 100% 36%)'
const INK = 'hsl(215 30% 14%)'
const BORDER = 'hsl(210 18% 88%)'

type ReportType = 'appointments' | 'prescriptions'

const APPT_STATUSES = ['scheduled', 'confirmed', 'served', 'rescheduled', 'cancelled']
const RX_STATUSES = ['issued', 'verified', 'dispensed', 'expired']

function fmtDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}
function fmtDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-PH', { dateStyle: 'medium' })
}

// Client-side CSV export of the currently-filtered report rows (audit-friendly, no server round-trip).
function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function MetricChip({ label, value, tint = 'text-slate-800' }: { label: string; value: string | number; tint?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
      <span className={`text-sm font-black tabular-nums ${tint}`}>{value}</span>
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </span>
  )
}

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>('appointments')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')

  const params = { from: from || undefined, to: to || undefined, status: status || undefined }
  const apptQ = useAppointmentReport(type === 'appointments' ? params : undefined)
  const rxQ = usePrescriptionReport(type === 'prescriptions' ? params : undefined)

  const isLoading = type === 'appointments' ? apptQ.isLoading : rxQ.isLoading
  const isError = type === 'appointments' ? apptQ.isError : rxQ.isError

  const statusOptions = type === 'appointments' ? APPT_STATUSES : RX_STATUSES
  const hasFilters = !!(from || to || status)

  function clearFilters() {
    setFrom(''); setTo(''); setStatus('')
  }

  function handleExport() {
    const stamp = new Date().toISOString().split('T')[0]
    if (type === 'appointments') {
      const rows = apptQ.data?.appointments ?? []
      downloadCsv(
        `appointments-report-${stamp}.csv`,
        ['Patient', 'Doctor', 'Scheduled', 'Type', 'Status'],
        rows.map((a) => [a.patient, a.doctor, fmtDateTime(a.scheduled_at), a.type === 'follow_up' ? 'Follow-up' : 'Consultation', a.status]),
      )
    } else {
      const rows = rxQ.data?.prescriptions ?? []
      downloadCsv(
        `prescriptions-report-${stamp}.csv`,
        ['Reference', 'Patient', 'Doctor', 'Items', 'Issued', 'Status'],
        rows.map((rx) => [rx.reference_no, rx.patient, rx.doctor, rx.items_count, fmtDate(rx.issued_at), rx.status]),
      )
    }
  }

  const apptSummary = apptQ.data?.summary
  const rxSummary = rxQ.data?.summary
  const total = type === 'appointments' ? apptSummary?.total ?? 0 : rxSummary?.total ?? 0
  const byStatus = (type === 'appointments' ? apptSummary?.by_status : rxSummary?.by_status) ?? {}
  const canExport = total > 0

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: 'hsl(201 100% 36% / 0.1)' }}>
            <BarChart3 size={22} style={{ color: BLUE }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>Reports</h1>
            <p className="mt-0.5 text-sm text-slate-500">Filterable operational records for DEAMHI — narrow by date or status, then export as CSV for audit.</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={!canExport}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white shadow-sm transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: BLUE }}
        >
          <Download size={17} />
          Export CSV
        </button>
      </div>

      {/* ── Controls ── */}
      <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          {/* Report type segmented */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            {[
              { key: 'appointments' as const, label: 'Appointments', icon: CalendarDays },
              { key: 'prescriptions' as const, label: 'Prescriptions', icon: Pill },
            ].map((t) => {
              const active = type === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => { setType(t.key); setStatus('') }}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <t.icon size={15} />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px] text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">To</label>
              <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px] text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-9 rounded-lg border bg-white px-3 text-sm font-semibold capitalize text-slate-700 outline-none focus:border-sky-400"
                style={{ borderColor: BORDER }}
              >
                <option value="">All statuses</option>
                {statusOptions.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white py-16 text-center text-sm text-red-500 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
          Failed to load the report. Check that the API is reachable and try again.
        </div>
      ) : (
        <>
          {/* ── Summary chips ── */}
          <div className="flex flex-wrap items-center gap-2">
            <MetricChip label="Total records" value={total} tint="text-blue-700" />
            {type === 'appointments' && (
              <MetricChip label="Served rate" value={`${apptSummary?.served_rate ?? 0}%`} tint="text-emerald-600" />
            )}
            {Object.entries(byStatus).map(([s, count]) => (
              <span key={s} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
                <StatusBadge status={s as AppointmentStatus | PrescriptionStatus} />
                <span className="text-sm font-bold tabular-nums text-slate-700">{count}</span>
              </span>
            ))}
          </div>

          {/* ── Records table ── */}
          {total === 0 ? (
            <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
              <BarChart3 size={28} className="mx-auto text-slate-300" />
              <p className="mt-3 text-base font-bold text-slate-800">No records match these filters</p>
              <p className="mt-1 text-sm text-slate-500">Widen the date range or clear the status filter.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr style={{ backgroundColor: 'hsl(201 70% 97%)', borderBottom: `1px solid ${BORDER}` }}>
                      {(type === 'appointments'
                        ? ['Patient', 'Doctor', 'Scheduled', 'Type', 'Status']
                        : ['Reference', 'Patient', 'Doctor', 'Items', 'Issued', 'Status']
                      ).map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {type === 'appointments'
                      ? apptQ.data!.appointments.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-800">{a.patient ?? '—'}</td>
                            <td className="px-4 py-3 text-slate-600">{a.doctor ?? '—'}</td>
                            <td className="px-4 py-3 text-slate-600">{fmtDateTime(a.scheduled_at)}</td>
                            <td className="px-4 py-3 text-slate-600">{a.type === 'follow_up' ? 'Follow-up' : 'Consultation'}</td>
                            <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                          </tr>
                        ))
                      : rxQ.data!.prescriptions.map((rx) => (
                          <tr key={rx.reference_no} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">{rx.reference_no}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{rx.patient ?? '—'}</td>
                            <td className="px-4 py-3 text-slate-600">{rx.doctor ?? '—'}</td>
                            <td className="px-4 py-3 tabular-nums text-slate-600">{rx.items_count}</td>
                            <td className="px-4 py-3 text-slate-600">{fmtDate(rx.issued_at)}</td>
                            <td className="px-4 py-3"><StatusBadge status={rx.status} /></td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

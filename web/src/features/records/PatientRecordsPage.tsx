import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, FolderOpen, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { usePatients } from '@/features/patients/queries'

const AVATAR_COLORS = [
  { bg: 'hsl(201 60% 90%)', fg: 'hsl(201 100% 30%)' },
  { bg: 'hsl(258 50% 92%)', fg: 'hsl(258 60% 45%)' },
  { bg: 'hsl(152 45% 88%)', fg: 'hsl(152 55% 28%)' },
  { bg: 'hsl(27 85% 90%)',  fg: 'hsl(27 90% 38%)' },
]

export default function PatientRecordsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data, isLoading } = usePatients(search ? { search } : undefined)
  const patients = data?.data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Patient Records</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Open a patient to view their chart. Every record access is logged for compliance.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patient by name…"
          className="pl-9 h-9 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <FolderOpen size={28} className="mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-500 mt-3">No patients found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((p, i) => {
            const name = p.user?.name ?? `Patient #${p.id}`
            const c = AVATAR_COLORS[i % AVATAR_COLORS.length]
            return (
              <button
                key={p.id}
                onDoubleClick={() => navigate(`/records/${p.id}`)}
                onClick={() => navigate(`/records/${p.id}`)}
                className="group bg-white rounded-xl shadow-sm p-5 text-left transition-all hover:shadow-md flex items-center gap-4"
                style={{ border: '1px solid hsl(210 18% 88%)' }}
                title="Open patient chart"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                  style={{ backgroundColor: c.bg, color: c.fg }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {p.patient_code ?? `Patient #${p.id}`}
                  </p>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

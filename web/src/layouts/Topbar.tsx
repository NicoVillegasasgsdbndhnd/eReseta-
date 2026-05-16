import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/authStore'
import type { Role, StaffRequest } from '@/mocks/types'
import { Bell, LogOut, CheckCircle2, XCircle, UserCheck } from 'lucide-react'
import api from '@/lib/api'

const ROLE_LABELS: Record<Role, string> = {
  patient:    'Patient',
  doctor:     'Physician',
  pharmacist: 'Pharmacist',
  admin:      'Admin',
  staff:      'Staff',
}

const ROLE_COLORS: Record<Role, string> = {
  patient:    'bg-blue-100 text-blue-700',
  doctor:     'bg-indigo-100 text-indigo-700',
  pharmacist: 'bg-emerald-100 text-emerald-700',
  admin:      'bg-amber-100 text-amber-700',
  staff:      'bg-violet-100 text-violet-700',
}

export default function Topbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: requestsData } = useQuery({
    queryKey: ['staff-requests'],
    queryFn: () => api.get<{ data: StaffRequest[] }>('/staff-requests').then((r) => r.data),
    enabled: user?.role === 'doctor',
    refetchInterval: 30_000,
  })

  const pendingRequests = requestsData?.data ?? []

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/staff-requests/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-requests'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: number) => api.post(`/staff-requests/${id}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-requests'] }),
  })

  const handleLogout = () => {
    logout()
    queryClient.clear()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between h-14 px-6 bg-white shrink-0" style={{ borderBottom: '1px solid hsl(214 20% 90%)', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04)' }}>
      <div className="hidden sm:block">
        <p className="text-sm font-semibold text-slate-700">Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital</p>
        <p className="text-xs text-slate-400 leading-none mt-0.5">Integrated Hospital Information System</p>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notification bell */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen((o) => !o)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={17} />
          </button>
          {pendingRequests.length > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white px-0.5">
              {pendingRequests.length}
            </span>
          )}

          {bellOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-lg z-50 overflow-hidden" style={{ border: '1px solid hsl(214 20% 90%)' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid hsl(214 20% 93%)' }}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notifications</p>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400">No new notifications.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                          <UserCheck size={14} className="text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{req.staff_user.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Requesting authorization to manage your appointments and consultations.
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">{req.staff_user.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveMutation.mutate(req.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60"
                        >
                          <CheckCircle2 size={12} /> Approve
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(req.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 transition-colors disabled:opacity-60"
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.name.charAt(0)}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-slate-700 leading-none">{user?.name}</p>
            {user && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}

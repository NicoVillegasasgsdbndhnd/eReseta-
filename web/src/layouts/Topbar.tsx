import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import { Bell, LogOut, CheckCircle2, XCircle, UserCheck, Pill } from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'
import type { Role, StaffRequest } from '@/mocks/types'
import api from '@/lib/api'

const ROLE_LABELS: Record<Role, string> = {
  patient: 'Patient', doctor: 'Physician', pharmacist: 'Pharmacist', admin: 'Admin', staff: 'Staff',
}

const PAGE_TITLES: Array<[string, string]> = [
  ['/dashboard', 'Dashboard'], ['/appointments', 'Appointments'], ['/consultations', 'Consultations'],
  ['/prescriptions', 'Prescriptions'], ['/patients', 'Patients'], ['/medicines', 'Medicines'],
  ['/verify-queue', 'Verify Queue'], ['/dispense-history', 'Dispense History'],
  ['/reports', 'Reports'], ['/users', 'Users'], ['/profile', 'Profile'],
]

export default function Topbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const pageTitle = PAGE_TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? 'eReseta+'
  const { user, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setBellOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey)
    }
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
    <header
      className="flex items-center justify-between h-16 px-6 bg-white/90 backdrop-blur shrink-0"
      style={{ borderBottom: '1px solid var(--color-border)', boxShadow: '0 1px 2px rgba(16,42,46,0.05)' }}
    >
      {/* Mobile brand (the sidebar is hidden below md) */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
          <Pill size={16} className="text-white" />
        </div>
        <span className="font-display font-semibold text-[var(--color-foreground)]">eReseta+</span>
      </div>
      {/* Route-aware page title (desktop) */}
      <div className="hidden md:block">
        <p className="text-base font-semibold text-[var(--color-foreground)] leading-tight">{pageTitle}</p>
        <p className="text-[11px] text-slate-500 leading-none mt-0.5">DEAMHI · eReseta+</p>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen((o) => !o)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label={pendingRequests.length > 0 ? `Notifications (${pendingRequests.length} pending)` : 'Notifications'}
            aria-haspopup="menu"
            aria-expanded={bellOpen}
          >
            <Bell size={17} />
          </button>
          {pendingRequests.length > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white px-0.5" style={{ backgroundColor: 'var(--color-accent)' }}>
              {pendingRequests.length}
            </span>
          )}

          {bellOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg z-50 overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid hsl(40 22% 92%)' }}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notifications</p>
              </div>
              {pendingRequests.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-500">No new notifications.</div>
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
                          <p className="text-xs text-slate-500 mt-0.5">Requesting authorization to manage your appointments and consultations.</p>
                          <p className="text-[10px] text-slate-500 mt-1">{req.staff_user.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveMutation.mutate(req.id)} disabled={approveMutation.isPending || rejectMutation.isPending} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60">
                          <CheckCircle2 size={12} /> Approve
                        </button>
                        <button onClick={() => rejectMutation.mutate(req.id)} disabled={approveMutation.isPending || rejectMutation.isPending} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 transition-colors disabled:opacity-60">
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

        <Link to="/profile" className="flex items-center gap-2.5 rounded-lg pl-1 pr-2 py-1 hover:bg-slate-100 transition-colors">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: 'var(--color-primary)' }}>
            {user?.name.charAt(0)}
          </div>
          <div className="hidden md:block leading-none text-left">
            <p className="text-sm font-semibold text-slate-700">{user?.name}</p>
            {user && <p className="text-[10px] text-slate-500 mt-0.5">{ROLE_LABELS[user.role]}</p>}
          </div>
        </Link>

        <button onClick={handleLogout} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors" aria-label="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}

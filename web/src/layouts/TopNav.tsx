import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/authStore'
import type { Role, StaffRequest } from '@/mocks/types'
import type { AppointmentRequest } from '@/features/appointments/queries'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  CalendarDays, ClipboardList, Pill, ShieldCheck, ShieldAlert, ScrollText,
  Users, BarChart2, FileText, Bell, LogOut, CheckCircle2, XCircle,
  UserCheck, Boxes, Link2, FlaskConical, FolderOpen, Inbox,
} from 'lucide-react'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  patient: [
    { label: 'Appointments',  to: '/appointments',  icon: <CalendarDays size={15} /> },
    { label: 'My Records',    to: '/my-records',    icon: <FolderOpen size={15} /> },
    { label: 'Prescriptions', to: '/prescriptions', icon: <Pill size={15} /> },
    { label: 'Privacy',       to: '/privacy-access', icon: <ShieldCheck size={15} /> },
  ],
  doctor: [
    { label: 'Appointments',  to: '/appointments',  icon: <CalendarDays size={15} /> },
    { label: 'Consultations', to: '/consultations', icon: <ClipboardList size={15} /> },
    { label: 'Patient Records', to: '/records',      icon: <FolderOpen size={15} /> },
    { label: 'Prescriptions', to: '/prescriptions', icon: <Pill size={15} /> },
  ],
  pharmacist: [
    { label: 'Rx Queue',       to: '/verify-queue',     icon: <ShieldCheck size={15} /> },
    { label: 'Dispensed Logs', to: '/dispense-history', icon: <ScrollText size={15} /> },
    { label: 'Medicines',        to: '/medicines',        icon: <Boxes size={15} /> },
  ],
  admin: [
    { label: 'Patients',      to: '/patients',      icon: <Users size={15} /> },
    { label: 'Prescriptions', to: '/prescriptions', icon: <Pill size={15} /> },
    { label: 'Medicines',     to: '/medicines',     icon: <Boxes size={15} /> },
    { label: 'Test Catalog',  to: '/diagnostic-tests', icon: <FlaskConical size={15} /> },
    { label: 'Blockchain',    to: '/blockchain',    icon: <Link2 size={15} /> },
    { label: 'Reports',       to: '/reports',       icon: <BarChart2 size={15} /> },
    { label: 'Users',         to: '/users',         icon: <FileText size={15} /> },
    { label: 'Audit Logs',    to: '/audit-logs',    icon: <ScrollText size={15} /> },
    { label: 'Security Alerts', to: '/security-alerts', icon: <ShieldAlert size={15} /> },
  ],
  staff: [
    { label: 'Appointments',  to: '/appointments',  icon: <CalendarDays size={15} /> },
    { label: 'Requests',      to: '/appointment-requests', icon: <Inbox size={15} /> },
    { label: 'Patient Records', to: '/records',      icon: <FolderOpen size={15} /> },
  ],
}

const ROLE_LABELS: Record<Role, string> = {
  patient:    'Patient',
  doctor:     'Physician',
  pharmacist: 'Pharmacist',
  admin:      'Admin',
  staff:      'Staff',
}

const ROLE_COLORS: Record<Role, string> = {
  patient:    'bg-blue-50 text-blue-700',
  doctor:     'bg-cyan-50 text-cyan-700',
  pharmacist: 'bg-emerald-50 text-emerald-700',
  admin:      'bg-amber-50 text-amber-700',
  staff:      'bg-slate-100 text-slate-600',
}

export default function TopNav() {
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

  const { data: appointmentRequestsData } = useQuery({
    queryKey: ['appointment-requests', 'pending', 'nav'],
    queryFn: () =>
      api
        .get<{ data: AppointmentRequest[] }>('/appointment-requests', { params: { status: 'pending' } })
        .then((r) => r.data),
    enabled: user?.role === 'staff',
    refetchInterval: 30_000,
  })

  const pendingRequests = requestsData?.data ?? []
  const pendingAppointmentRequests = appointmentRequestsData?.data ?? []

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/staff-requests/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-requests'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: number) => api.post(`/staff-requests/${id}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-requests'] }),
  })

  const handleLogout = async () => {
    await logout()
    queryClient.clear()
    navigate('/', { replace: true })
  }

  if (!user) return null

  const items = NAV_ITEMS[user.role]

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center bg-white px-3 shrink-0 sm:h-16 sm:px-6"
      style={{ borderBottom: '1px solid hsl(210 18% 88%)', boxShadow: '0 1px 4px 0 rgba(0,0,0,0.05)' }}
    >
      {/* ── Left: Logo + Nav ── */}
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-8">
        {/* Logo → Dashboard */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 shrink-0 group"
          aria-label="Go to dashboard"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-opacity group-hover:opacity-85"
            style={{ backgroundColor: 'hsl(201 100% 36%)' }}
          >
            <Pill size={16} className="text-white" />
          </div>
          <span className="text-base font-bold tracking-tight" style={{ color: 'hsl(215 30% 14%)' }}>
            eReseta<span style={{ color: 'hsl(201 100% 36%)' }}>+</span>
          </span>
        </Link>

        {/* Divider */}
        <div className="hidden h-5 w-px shrink-0 bg-slate-200 lg:block" />

        {/* Feature nav links */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 whitespace-nowrap',
                  isActive
                    ? 'text-[hsl(201_100%_36%)] bg-[hsl(201_100%_36%_/_0.07)]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-[hsl(201_100%_36%)]' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  {item.label}
                  {item.to === '/appointment-requests' && pendingAppointmentRequests.length > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-4 h-4 rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold leading-3 text-white flex items-center justify-center">
                      {pendingAppointmentRequests.length}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Right: Bell + Avatar + Logout ── */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Notification bell */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen((o) => !o)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={16} />
          </button>
          {pendingRequests.length > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[15px] h-[15px] rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white px-0.5"
              style={{ backgroundColor: 'hsl(0 72% 51%)' }}
            >
              {pendingRequests.length}
            </span>
          )}

          {bellOpen && (
            <div
              className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg z-50 overflow-hidden"
              style={{ border: '1px solid hsl(210 18% 88%)' }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid hsl(210 18% 92%)' }}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notifications</p>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400">No new notifications.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
                          <UserCheck size={14} className="text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{req.staff_user.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Requesting authorization to manage your appointments and consultations.
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">{req.staff_user.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveMutation.mutate(req.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg text-white transition-colors disabled:opacity-60"
                          style={{ backgroundColor: 'hsl(152 50% 38%)' }}
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

        <div className="mx-1 h-5 w-px bg-slate-200" />

        {/* Avatar → Profile */}
        <Link
          to="/profile"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group"
          aria-label="Go to profile"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: 'hsl(201 100% 36%)' }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold leading-none" style={{ color: 'hsl(215 30% 14%)' }}>
              {user.name}
            </p>
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block', ROLE_COLORS[user.role])}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        </Link>

        {/* Terms & Privacy (review the agreement you accepted) */}
        <Link
          to="/terms-view"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          aria-label="Terms & Privacy"
          title="Terms & Privacy"
        >
          <FileText size={16} />
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}

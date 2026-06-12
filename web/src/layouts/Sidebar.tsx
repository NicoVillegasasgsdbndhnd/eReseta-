import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Users, FileText,
  Pill, ClipboardList, BarChart2, ShieldCheck, ScrollText,
  UserCircle, Building2, Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/features/auth/authStore'
import type { Role } from '@/mocks/types'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  patient: [
    { label: 'Dashboard',     to: '/dashboard',     icon: <LayoutDashboard size={17} /> },
    { label: 'Appointments',  to: '/appointments',  icon: <CalendarDays size={17} /> },
    { label: 'Prescriptions', to: '/prescriptions', icon: <Pill size={17} /> },
    { label: 'Profile',       to: '/profile',       icon: <UserCircle size={17} /> },
  ],
  doctor: [
    { label: 'Dashboard',     to: '/dashboard',     icon: <LayoutDashboard size={17} /> },
    { label: 'Appointments',  to: '/appointments',  icon: <CalendarDays size={17} /> },
    { label: 'Consultations', to: '/consultations', icon: <ClipboardList size={17} /> },
    { label: 'Prescriptions', to: '/prescriptions', icon: <Pill size={17} /> },
    { label: 'Profile',       to: '/profile',       icon: <UserCircle size={17} /> },
  ],
  pharmacist: [
    { label: 'Dashboard',        to: '/dashboard',        icon: <LayoutDashboard size={17} /> },
    { label: 'Verify Queue',     to: '/verify-queue',     icon: <ShieldCheck size={17} /> },
    { label: 'Dispense History', to: '/dispense-history', icon: <ScrollText size={17} /> },
    { label: 'Medicines',        to: '/medicines',        icon: <Package size={17} /> },
    { label: 'Profile',          to: '/profile',          icon: <UserCircle size={17} /> },
  ],
  admin: [
    { label: 'Dashboard',     to: '/dashboard',     icon: <LayoutDashboard size={17} /> },
    { label: 'Patients',      to: '/patients',      icon: <Users size={17} /> },
    { label: 'Prescriptions', to: '/prescriptions', icon: <Pill size={17} /> },
    { label: 'Medicines',     to: '/medicines',     icon: <Package size={17} /> },
    { label: 'Reports',       to: '/reports',       icon: <BarChart2 size={17} /> },
    { label: 'Users',         to: '/users',         icon: <FileText size={17} /> },
    { label: 'Profile',       to: '/profile',       icon: <UserCircle size={17} /> },
  ],
  staff: [
    { label: 'Dashboard',     to: '/dashboard',     icon: <LayoutDashboard size={17} /> },
    { label: 'Appointments',  to: '/appointments',  icon: <CalendarDays size={17} /> },
    { label: 'Consultations', to: '/consultations', icon: <ClipboardList size={17} /> },
    { label: 'Profile',       to: '/profile',       icon: <UserCircle size={17} /> },
  ],
}

const ROLE_LABELS: Record<Role, string> = {
  patient:    'Patient',
  doctor:     'Physician',
  pharmacist: 'Pharmacist',
  admin:      'Administrator',
  staff:      'Staff',
}

export default function Sidebar() {
  const { user } = useAuthStore()
  if (!user) return null

  const items = NAV_ITEMS[user.role]

  return (
    <aside className="flex flex-col w-64 min-h-screen shrink-0" style={{ backgroundColor: '#0f172a' }}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <Pill size={18} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-base leading-none tracking-tight">eReseta+</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,1)' }}>DEAMHI</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(100,116,139,1)' }}>
          Navigation
        </p>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-white/8 text-slate-400 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-white' : 'text-slate-500'}>
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(100,116,139,1)' }}>{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <Building2 size={11} style={{ color: 'rgba(100,116,139,1)' }} />
          <p className="text-[10px]" style={{ color: 'rgba(100,116,139,1)' }}>eReseta+ v1.0</p>
        </div>
      </div>
    </aside>
  )
}

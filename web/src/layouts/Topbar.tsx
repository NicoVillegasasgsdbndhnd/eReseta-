import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import type { Role } from '@/mocks/types'
import { Bell, LogOut } from 'lucide-react'

const ROLE_LABELS: Record<Role, string> = {
  patient:    'Patient',
  doctor:     'Physician',
  pharmacist: 'Pharmacist',
  admin:      'Admin',
  it_admin:   'IT Admin',
}

const ROLE_COLORS: Record<Role, string> = {
  patient:    'bg-blue-100 text-blue-700',
  doctor:     'bg-indigo-100 text-indigo-700',
  pharmacist: 'bg-emerald-100 text-emerald-700',
  admin:      'bg-amber-100 text-amber-700',
  it_admin:   'bg-rose-100 text-rose-700',
}

export default function Topbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between h-14 px-6 bg-white shrink-0" style={{ borderBottom: '1px solid hsl(214 20% 90%)', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04)' }}>
      {/* Hospital name */}
      <div className="hidden sm:block">
        <p className="text-sm font-semibold text-slate-700">Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital</p>
        <p className="text-xs text-slate-400 leading-none mt-0.5">Integrated Hospital Information System</p>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notification bell */}
        <div className="relative">
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={17} />
          </button>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* User info */}
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

        {/* Logout */}
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

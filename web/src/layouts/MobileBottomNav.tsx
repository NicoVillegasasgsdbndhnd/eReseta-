import { NavLink } from 'react-router-dom'
import { CalendarDays, ClipboardList, FolderOpen, Pill, UserRound } from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'
import { cn } from '@/lib/utils'

const ITEMS = {
  patient: [
    { label: 'Appts', to: '/appointments', icon: CalendarDays },
    { label: 'Records', to: '/my-records', icon: FolderOpen },
    { label: 'Rx', to: '/prescriptions', icon: Pill },
    { label: 'Profile', to: '/profile', icon: UserRound },
  ],
  doctor: [
    { label: 'Appts', to: '/appointments', icon: CalendarDays },
    { label: 'Consults', to: '/consultations', icon: ClipboardList },
    { label: 'Records', to: '/records', icon: FolderOpen },
    { label: 'Rx', to: '/prescriptions', icon: Pill },
  ],
} as const

export default function MobileBottomNav() {
  const { user } = useAuthStore()
  if (user?.role !== 'patient' && user?.role !== 'doctor') return null

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1.5 shadow-[0_-10px_28px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
      aria-label="Mobile primary navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {ITEMS[user.role].map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-h-12 flex-col items-center justify-center rounded-xl px-2 text-[11px] font-bold transition-colors',
                isActive
                  ? 'bg-sky-50 text-[hsl(201_100%_34%)]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-[hsl(201_100%_34%)]' : 'text-slate-400'} />
                <span className="mt-0.5 truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

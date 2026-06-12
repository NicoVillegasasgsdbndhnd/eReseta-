import { NavLink } from 'react-router-dom'
import { Pill, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/features/auth/authStore'
import { NAV_ITEMS, ROLE_LABELS } from './nav'

// Desktop sidebar (hidden on mobile — see BottomNav for the mobile tab bar).
export default function Sidebar() {
  const { user } = useAuthStore()
  if (!user) return null

  const items = NAV_ITEMS[user.role]

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen shrink-0" style={{ backgroundColor: 'var(--color-ink)' }}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)] flex items-center justify-center shrink-0">
          <Pill size={18} className="text-white" />
        </div>
        <div>
          <p className="font-display font-semibold text-white text-lg leading-none tracking-tight">eReseta+</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,1)' }}>DEAMHI</p>
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
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'hover:bg-white/8 text-slate-400 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={17} className={isActive ? 'text-white' : 'text-slate-500'} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold shrink-0">
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

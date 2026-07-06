import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/features/auth/authStore'
import { NAV_ITEMS } from './nav'



export default function BottomNav() {
  const { user } = useAuthStore()
  const [moreOpen, setMoreOpen] = useState(false)
  if (!user) return null

  const items = NAV_ITEMS[user.role]
  const MAX = 4
  const tabs = items.length > MAX ? items.slice(0, MAX - 1) : items
  const overflow = items.length > MAX ? items.slice(MAX - 1) : []

  return (
    <>
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="absolute bottom-[4.25rem] inset-x-3 rounded-2xl bg-white shadow-xl p-2"
            style={{ border: '1px solid var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {overflow.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                    isActive ? 'text-[var(--color-primary)]' : 'text-slate-600 hover:bg-slate-100',
                  )
                }
                style={({ isActive }) => (isActive ? { backgroundColor: 'hsl(168 79% 37% / 0.12)' } : undefined)}
              >
                <it.icon size={18} />
                {it.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex bg-white/95 backdrop-blur"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        {tabs.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium',
                isActive ? 'text-[var(--color-primary)]' : 'text-slate-500',
              )
            }
          >
            {({ isActive }) => (
              <>
                <it.icon size={20} className={isActive ? 'text-[var(--color-primary)]' : 'text-slate-500'} />
                <span>{it.short ?? it.label}</span>
              </>
            )}
          </NavLink>
        ))}
        {overflow.length > 0 && (
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium',
              moreOpen ? 'text-[var(--color-primary)]' : 'text-slate-500',
            )}
          >
            <MoreHorizontal size={20} />
            <span>More</span>
          </button>
        )}
      </nav>
    </>
  )
}

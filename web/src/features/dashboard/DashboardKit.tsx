import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export const TEAL = 'hsl(168 79% 37%)'
export const TEAL_TINT = 'hsl(168 79% 37% / 0.1)'

export function greetingWord() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
export function todayLabel() {
  return new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function Greeting({ name, subtitle }: { name?: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-foreground)]">{greetingWord()}, {name}</h1>
      <p className="text-sm text-slate-500 mt-1">{todayLabel()}{subtitle ? ` · ${subtitle}` : ''}</p>
    </div>
  )
}

export interface Action { title: string; subtitle?: string; icon: LucideIcon; to: string; primary?: boolean }

export function ActionRow({ actions }: { actions: Action[] }) {
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {actions.map((a) => (
        <button
          key={a.title}
          onClick={() => navigate(a.to)}
          className={cn(
            'group flex items-center gap-3 rounded-2xl p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5',
            a.primary ? 'text-white' : 'bg-white text-slate-800',
          )}
          style={a.primary ? { backgroundColor: TEAL } : { border: '1px solid var(--color-border)' }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: a.primary ? 'rgba(255,255,255,0.2)' : TEAL_TINT }}
          >
            <a.icon size={20} style={{ color: a.primary ? '#fff' : TEAL }} />
          </div>
          <div>
            <p className="font-semibold text-sm">{a.title}</p>
            {a.subtitle && <p className={cn('text-xs', a.primary ? 'text-white/80' : 'text-slate-400')}>{a.subtitle}</p>}
          </div>
        </button>
      ))}
    </div>
  )
}

export interface Stat { label: string; value: number | string; to?: string }

export function StatStrip({ stats }: { stats: Stat[] }) {
  const navigate = useNavigate()
  return (
    <div
      className={cn(
        'grid rounded-2xl bg-white shadow-sm overflow-hidden',
        stats.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
      )}
      style={{ border: '1px solid var(--color-border)' }}
    >
      {stats.map((s, i) => (
        <button
          key={s.label}
          onClick={() => s.to && navigate(s.to)}
          className={cn('flex flex-col gap-1 p-5 text-left transition-colors', s.to && 'hover:bg-slate-50', i > 0 && 'border-l')}
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="text-xs font-medium text-slate-400">{s.label}</span>
          <span className="text-2xl font-extrabold text-slate-800">{s.value}</span>
        </button>
      ))}
    </div>
  )
}

export function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5" style={{ border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        {action}
      </div>
      {children}
    </div>
  )
}

export function ViewAllLink({ onClick, label = 'View all' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="text-xs font-medium hover:underline" style={{ color: TEAL }}>
      {label}
    </button>
  )
}

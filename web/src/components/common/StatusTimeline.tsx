import { Check, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  label: string
  date?: string
  actor?: string
  completed: boolean
  current?: boolean
}

export default function StatusTimeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="relative space-y-6" style={{ paddingLeft: '1.75rem', borderLeft: '2px solid var(--color-border)', marginLeft: '0.75rem' }}>
      {steps.map((step, i) => (
        <li key={i} className="relative" style={{ marginLeft: '-1.75rem', paddingLeft: '1.75rem' }}>
          {/* Dot */}
          <span
            className={cn(
              'absolute left-0 top-0.5 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full ring-4 ring-white',
              step.completed
                ? 'bg-emerald-500'
                : step.current
                  ? 'bg-teal-500'
                  : 'bg-slate-200',
            )}
          >
            {step.completed
              ? <Check size={10} className="text-white" strokeWidth={3} />
              : <Clock size={10} className={step.current ? 'text-white' : 'text-slate-400'} />
            }
          </span>

          <div className="pl-2">
            <p className={cn(
              'text-sm font-semibold leading-none mb-1',
              step.completed || step.current ? 'text-slate-800' : 'text-slate-400',
            )}>
              {step.label}
            </p>
            {step.date && (
              <time className="text-xs text-slate-400">
                {new Date(step.date).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
              </time>
            )}
            {step.actor && (
              <p className="text-xs text-slate-400 mt-0.5">by {step.actor}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

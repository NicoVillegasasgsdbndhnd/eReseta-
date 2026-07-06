import { Check, X } from 'lucide-react'



export const PASSWORD_RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'A lowercase letter',    test: (v) => /[a-z]/.test(v) },
  { label: 'An uppercase letter',   test: (v) => /[A-Z]/.test(v) },
  { label: 'A number',              test: (v) => /[0-9]/.test(v) },
  { label: 'A symbol',              test: (v) => /[^A-Za-z0-9]/.test(v) },
]

export function isStrongPassword(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value))
}


export default function PasswordRequirements({ value, className = '' }: { value: string; className?: string }) {
  return (
    <ul className={`grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 ${className}`}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value)
        return (
          <li key={rule.label} className="flex items-center gap-1.5 text-xs">
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${
                ok ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {ok ? <Check size={10} strokeWidth={3} /> : <X size={9} strokeWidth={3} />}
            </span>
            <span className={ok ? 'font-medium text-emerald-600' : 'text-slate-500'}>{rule.label}</span>
          </li>
        )
      })}
    </ul>
  )
}

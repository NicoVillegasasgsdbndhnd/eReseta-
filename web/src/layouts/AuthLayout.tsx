import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { CalendarCheck, ClipboardCheck, Loader2, Pill, ShieldCheck } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: 'hsl(204 52% 96%)' }}>
      <div
        className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-xl sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.08fr_0.92fr]"
        style={{ border: '1px solid hsl(210 18% 86%)' }}
      >
        <section className="relative hidden overflow-hidden bg-[hsl(201_100%_32%)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(135deg, rgba(255,255,255,0.26), transparent 42%), radial-gradient(circle at 20% 20%, rgba(255,255,255,0.24), transparent 28%)',
            }}
          />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                <Pill size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold">eReseta+</p>
                <p className="text-sm text-white/70">DEAMHI hospital system</p>
              </div>
            </div>

            <div className="mt-16 max-w-lg">
              <p className="text-sm font-semibold uppercase text-cyan-100">
                Clinical access portal
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-tight">
                Secure care coordination for appointments, records, and prescriptions.
              </h1>
              <p className="mt-4 text-base leading-7 text-white/72">
                Built for DEAMHI workflows so staff, physicians, pharmacy, and patients can move through the day with less friction.
              </p>
            </div>
          </div>

          <div className="relative grid grid-cols-3 gap-3">
            {[
              { label: 'Appointments', icon: CalendarCheck },
              { label: 'Patient records', icon: ClipboardCheck },
              { label: 'Role-secure', icon: ShieldCheck },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="rounded-xl bg-white/10 p-4 ring-1 ring-white/15">
                <Icon size={20} className="text-cyan-100" />
                <p className="mt-3 text-xs font-semibold text-white/80">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <main className="flex min-h-full flex-col justify-between px-6 py-7 sm:px-10 lg:px-12">
          <div className="flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(201_100%_36%)] text-white">
                <Pill size={18} />
              </div>
              <div>
                <p className="font-bold text-slate-900">eReseta+</p>
                <p className="text-xs text-slate-500">DEAMHI</p>
              </div>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            <Suspense fallback={<div className="flex items-center justify-center py-10"><Loader2 size={22} className="animate-spin text-slate-300" /></div>}>
              <Outlet />
            </Suspense>
          </div>

          <p className="text-center text-xs text-slate-400">(c) 2026 DEAMHI - eReseta+ v1.0</p>
        </main>
      </div>
    </div>
  )
}

import { Outlet } from 'react-router-dom'
import { Pill, ShieldCheck, Activity } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'hsl(210 30% 97%)' }}>
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10"
        style={{ backgroundColor: '#0f172a' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Pill size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-none">eReseta+</p>
            <p className="text-xs mt-0.5 text-slate-400">DEAMHI</p>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white leading-snug mb-4">
            Prescription management,<br/>
            <span className="text-blue-400">reimagined.</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Blockchain-secured prescriptions for Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital. Traceable from doctor to patient.
          </p>

          <div className="space-y-4">
            {[
              { icon: <ShieldCheck size={16} />, text: 'Blockchain-verified prescriptions' },
              { icon: <Activity size={16} />, text: 'End-to-end audit trail' },
              { icon: <Pill size={16} />, text: 'Integrated pharmacy workflow' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400">
                  {f.icon}
                </div>
                <p className="text-sm text-slate-300">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">
          © 2026 DEAMHI · eReseta+ v1.0 · All rights reserved
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 justify-center mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Pill size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800">eReseta+</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

import { Outlet } from 'react-router-dom'
import { Pill } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'hsl(201 60% 96%)' }}
    >
      {/* Centered card */}
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: 'hsl(201 100% 36%)' }}
          >
            <Pill size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'hsl(215 30% 14%)' }}>
            eReseta<span style={{ color: 'hsl(201 100% 36%)' }}>+</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(215 16% 45%)' }}>
            Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital
          </p>
        </div>

        {/* Form card */}
        <div
          className="bg-white rounded-2xl p-8"
          style={{ boxShadow: '0 4px 24px 0 rgba(0,119,182,0.10), 0 1px 4px 0 rgba(0,0,0,0.06)' }}
        >
          <Outlet />
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'hsl(215 16% 55%)' }}>
          © 2026 DEAMHI · eReseta+ v1.0
        </p>
      </div>
    </div>
  )
}

import { Link, NavLink, Outlet } from 'react-router-dom'
import { Pill, MapPin, Clock, Phone } from 'lucide-react'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
    isActive ? 'text-[hsl(201_100%_30%)]' : 'text-slate-600 hover:text-slate-900'
  }`

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'hsl(210 14% 97%)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 bg-white/90 backdrop-blur"
        style={{ borderBottom: '1px solid hsl(210 18% 88%)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              <Pill size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
              eReseta<span style={{ color: 'hsl(201 100% 36%)' }}>+</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>Home</NavLink>
            <NavLink to="/doctors" className={navLinkClass}>Doctors</NavLink>
            <NavLink to="/book" className={navLinkClass}>Book</NavLink>
            <Link
              to="/login"
              className="ml-2 text-sm font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              Log in
            </Link>
          </nav>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white mt-12" style={{ borderTop: '1px solid hsl(210 18% 88%)' }}>
        <div className="max-w-6xl mx-auto px-6 py-10 grid gap-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'hsl(201 100% 36%)' }}
              >
                <Pill size={16} className="text-white" />
              </div>
              <span className="font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
                eReseta<span style={{ color: 'hsl(201 100% 36%)' }}>+</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital Inc. (DEAMHI) — modern, secure
              healthcare with blockchain-traceable e-prescriptions.
            </p>
          </div>

          <div className="text-sm text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800 mb-2">Visit us</p>
            <p className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" /> Antipolo City, Rizal, Philippines</p>
            <p className="flex items-start gap-2"><Clock size={15} className="mt-0.5 shrink-0 text-slate-400" /> Mon–Sat · 8:00 AM – 5:00 PM</p>
            <p className="flex items-start gap-2"><Phone size={15} className="mt-0.5 shrink-0 text-slate-400" /> (02) 8000-0000</p>
          </div>

          <div className="text-sm text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800 mb-2">Quick links</p>
            <Link to="/doctors" className="block hover:text-slate-900">Our doctors</Link>
            <Link to="/book" className="block hover:text-slate-900">Request an appointment</Link>
            <Link to="/login" className="block hover:text-slate-900">Patient log in</Link>
          </div>
        </div>
        <div className="text-center text-xs text-slate-400 py-4" style={{ borderTop: '1px solid hsl(210 18% 92%)' }}>
          © {new Date().getFullYear()} DEAMHI · eReseta+. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

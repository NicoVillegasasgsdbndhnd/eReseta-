import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Menu, Pill, UserCircle, X } from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/services', label: 'Services' },
  { to: '/doctors', label: 'Doctors' },
  { to: '/about', label: 'About' },
]

const footerServices = [
  'Appointment Booking',
  'Medical Records',
  'Digital E-Prescriptions',
  'Doctor Consultations',
  'Pharmacy Verification',
]

function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
        <Pill size={20} strokeWidth={2.2} />
      </span>
      <span className={`text-xl font-bold ${inverted ? 'text-white' : 'text-slate-900'}`}>
        eReseta<span className={inverted ? 'text-blue-300' : 'text-blue-600'}>+</span>
      </span>
    </Link>
  )
}

function PublicNavLink({ to, label, end, onClick }: { to: string; label: string; end?: boolean; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
          isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

export default function PublicLayout() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white text-slate-900">
      <header
        className={`sticky top-0 z-40 border-b border-blue-100 bg-white/95 backdrop-blur transition-shadow duration-200 ${
          isScrolled ? 'shadow-sm' : ''
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Brand />

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <PublicNavLink key={item.to} {...item} />
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <Link
                to="/profile"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-blue-100 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-blue-50"
              >
                <UserCircle size={18} className="text-blue-600" />
                <span className="max-w-32 truncate">{user.name}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex min-h-11 items-center rounded-lg border border-blue-100 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-blue-50"
              >
                Log in
              </Link>
            )}
            <Link
              to="/book"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <CalendarDays size={17} />
              Book appointment
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-blue-100 text-slate-700 transition-colors hover:bg-blue-50 md:hidden"
            aria-label="Open navigation menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Close navigation menu"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-blue-100 px-5">
              <Brand />
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-blue-50"
                aria-label="Close navigation menu"
                onClick={() => setIsMenuOpen(false)}
              >
                <X size={22} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-5 py-6" aria-label="Mobile navigation">
              {navItems.map((item) => (
                <PublicNavLink key={item.to} {...item} onClick={() => setIsMenuOpen(false)} />
              ))}
            </nav>
            <div className="mt-auto grid gap-3 border-t border-blue-100 p-5">
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-blue-100 px-4 text-sm font-semibold text-slate-700"
              >
                Log in
              </Link>
              <Link
                to="/book"
                onClick={() => setIsMenuOpen(false)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
              >
                <CalendarDays size={17} />
                Book appointment
              </Link>
            </div>
          </div>
        </div>
      )}

      <main className="min-h-dvh w-full overflow-x-hidden">
        <Outlet />
      </main>

      <footer className="bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <Brand inverted />
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              The digital health system for DEAMHI Hospital, San Nicolas, Concepcion, Tarlac.
            </p>
            <p className="mt-6 text-xs text-slate-500">(c) 2026 DEAMHI. All rights reserved.</p>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Services</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-400">
              {footerServices.map((service) => (
                <Link key={service} to="/services" className="transition-colors hover:text-white">
                  {service}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Hospital</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-400">
              <Link to="/about" className="transition-colors hover:text-white">About DEAMHI</Link>
              <Link to="/doctors" className="transition-colors hover:text-white">Our Doctors</Link>
              <Link to="/about" className="transition-colors hover:text-white">Contact Us</Link>
              <span>Location: San Nicolas, Concepcion, Tarlac</span>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Help & Legal</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-400">
              <Link to="/faq" className="transition-colors hover:text-white">FAQ</Link>
              <Link to="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link>
              <Link to="/privacy" className="transition-colors hover:text-white">Terms of Service</Link>
              <Link to="/about" className="transition-colors hover:text-white">Contact Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

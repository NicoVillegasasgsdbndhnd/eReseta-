import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottomNav'
import { useAuthStore } from '@/features/auth/authStore'

export default function AppLayout() {
  const { user } = useAuthStore()
  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-background)' }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
            <Outlet />
          </div>
        </main>
      </div>
      {/* Mobile-only bottom tab bar */}
      <BottomNav />
    </div>
  )
}

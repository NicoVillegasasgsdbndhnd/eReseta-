import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import TopNav from './TopNav'
import MobileBottomNav from './MobileBottomNav'
import { useAuthStore } from '@/features/auth/authStore'

export default function AppLayout() {
  const { user } = useAuthStore()
  if (!user) return null

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'hsl(210 14% 97%)' }}>
      <TopNav />
      <main className="flex-1 overflow-x-hidden px-3 pb-[calc(env(safe-area-inset-bottom)+5.75rem)] pt-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        {/* Lazy-loaded route chunks resolve here. */}
        <Suspense fallback={<div className="flex items-center justify-center py-24"><Loader2 size={26} className="animate-spin text-slate-300" /></div>}>
          <Outlet />
        </Suspense>
      </main>
      <MobileBottomNav />
    </div>
  )
}

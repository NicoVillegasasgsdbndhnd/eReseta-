import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import { useAuthStore } from '@/features/auth/authStore'

export default function AppLayout() {
  const { user } = useAuthStore()
  if (!user) return null

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'hsl(210 14% 97%)' }}>
      <TopNav />
      <main className="flex-1 px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}

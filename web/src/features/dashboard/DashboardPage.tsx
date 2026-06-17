import { useAuthStore } from '@/features/auth/authStore'
import AdminDashboard from './AdminDashboard'
import DoctorDashboard from './DoctorDashboard'
import PharmacistDashboard from './PharmacistDashboard'
import PatientDashboard from './PatientDashboard'
import StaffDashboard from './StaffDashboard'

export default function DashboardPage() {
  const { user } = useAuthStore()

  if (!user) return null

  if (user.role === 'admin') return <AdminDashboard />
  if (user.role === 'doctor') return <DoctorDashboard />
  if (user.role === 'pharmacist') return <PharmacistDashboard />
  if (user.role === 'staff') return <StaffDashboard />
  return <PatientDashboard />
}

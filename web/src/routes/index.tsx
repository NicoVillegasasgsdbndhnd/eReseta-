import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '@/layouts/AppLayout'
import AuthLayout from '@/layouts/AuthLayout'
import { useAuthStore } from '@/features/auth/authStore'

// Auth pages
import LoginPage from '@/features/auth/LoginPage'
import RegisterPage from '@/features/auth/RegisterPage'
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage'

// Dashboard
import DashboardPage from '@/features/dashboard/DashboardPage'

// Appointments
import AppointmentsPage from '@/features/appointments/AppointmentsPage'
import AppointmentDetailPage from '@/features/appointments/AppointmentDetailPage'
import BookAppointmentPage from '@/features/appointments/BookAppointmentPage'
import DoctorAvailabilityPage from '@/features/appointments/DoctorAvailabilityPage'

// Patients
import PatientsPage from '@/features/patients/PatientsPage'
import PatientProfilePage from '@/features/patients/PatientProfilePage'
import PatientFormPage from '@/features/patients/PatientFormPage'

// Prescriptions
import PrescriptionsPage from '@/features/prescriptions/PrescriptionsPage'
import PrescriptionDetailPage from '@/features/prescriptions/PrescriptionDetailPage'
import VerifyQueuePage from '@/features/prescriptions/VerifyQueuePage'
import DispenseHistoryPage from '@/features/prescriptions/DispenseHistoryPage'

// Consultations
import ConsultationsPage from '@/features/consultations/ConsultationsPage'

// Reports
import ReportsPage from '@/features/reports/ReportsPage'

// Admin
import UsersPage from '@/features/admin/UsersPage'
import AuditLogsPage from '@/features/admin/AuditLogsPage'

// Profile
import ProfilePage from '@/features/profile/ProfilePage'

// ── Auth guards ───────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// ── Router ────────────────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  // ── Auth ──────────────────────────────────────────────────────────────────
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <RequireGuest><LoginPage /></RequireGuest> },
      { path: '/register', element: <RequireGuest><RegisterPage /></RequireGuest> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },

  // ── Authenticated app ──────────────────────────────────────────────────────
  {
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // Dashboard
      { path: '/dashboard', element: <DashboardPage /> },

      // Appointments
      { path: '/appointments', element: <AppointmentsPage /> },
      { path: '/appointments/new', element: <BookAppointmentPage /> },
      { path: '/appointments/availability', element: <DoctorAvailabilityPage /> },
      { path: '/appointments/:id', element: <AppointmentDetailPage /> },

      // Consultations (doctor)
      { path: '/consultations', element: <ConsultationsPage /> },

      // Patients (doctor / admin)
      { path: '/patients', element: <PatientsPage /> },
      { path: '/patients/new', element: <PatientFormPage /> },
      { path: '/patients/:id/edit', element: <PatientFormPage /> },
      { path: '/patients/:id', element: <PatientProfilePage /> },

      // Prescriptions
      { path: '/prescriptions', element: <PrescriptionsPage /> },
      { path: '/prescriptions/:id', element: <PrescriptionDetailPage /> },

      // Pharmacist
      { path: '/verify-queue', element: <VerifyQueuePage /> },
      { path: '/dispense-history', element: <DispenseHistoryPage /> },

      // Reports
      { path: '/reports', element: <ReportsPage /> },

      // Admin / IT Admin
      { path: '/users', element: <UsersPage /> },
      { path: '/audit-logs', element: <AuditLogsPage /> },

      // Profile (all roles)
      { path: '/profile', element: <ProfilePage /> },
    ],
  },

  // ── Fallback ───────────────────────────────────────────────────────────────
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])

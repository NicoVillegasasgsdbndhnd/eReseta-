import { createBrowserRouter, Navigate } from 'react-router-dom'
import type { Role } from '@/mocks/types'
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
import NewPrescriptionPage from '@/features/prescriptions/NewPrescriptionPage'
import VerifyQueuePage from '@/features/prescriptions/VerifyQueuePage'
import DispenseHistoryPage from '@/features/prescriptions/DispenseHistoryPage'

// Medicines
import MedicineAvailabilityPage from '@/features/medicines/MedicineAvailabilityPage'

// Diagnostics
import DiagnosticTestsPage from '@/features/diagnostics/DiagnosticTestsPage'

// Consultations
import ConsultationsPage from '@/features/consultations/ConsultationsPage'
import PatientRecordsPage from '@/features/records/PatientRecordsPage'
import PatientChartPage from '@/features/records/PatientChartPage'
import MyRecordsPage from '@/features/records/MyRecordsPage'

// Reports
import ReportsPage from '@/features/reports/ReportsPage'

// Admin
import UsersPage from '@/features/admin/UsersPage'
import AuditLogsPage from '@/features/admin/AuditLogsPage'

// Blockchain
import BlockchainExplorerPage from '@/features/blockchain/BlockchainExplorerPage'

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

function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
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

      // Consultations (doctor + staff)
      { path: '/consultations', element: <RequireRole roles={['doctor', 'staff']}><ConsultationsPage /></RequireRole> },

      // Patient self-service read-only records (own chart only)
      { path: '/my-records',          element: <RequireRole roles={['patient']}><MyRecordsPage /></RequireRole> },

      // Patient Records hub (all doctors + staff/admin) — chart reads are audited
      { path: '/records',             element: <RequireRole roles={['doctor', 'staff', 'admin']}><PatientRecordsPage /></RequireRole> },
      { path: '/records/:patientId',  element: <RequireRole roles={['doctor', 'staff', 'admin']}><PatientChartPage /></RequireRole> },

      // Patients (admin for list; admin + staff for create/edit; admin + doctor + staff for profile)
      { path: '/patients',          element: <RequireRole roles={['admin']}><PatientsPage /></RequireRole> },
      { path: '/patients/new',      element: <RequireRole roles={['admin', 'staff']}><PatientFormPage /></RequireRole> },
      { path: '/patients/:id/edit', element: <RequireRole roles={['admin', 'staff']}><PatientFormPage /></RequireRole> },
      { path: '/patients/:id',      element: <RequireRole roles={['admin', 'doctor', 'staff']}><PatientProfilePage /></RequireRole> },

      // Prescriptions (not accessible to staff)
      { path: '/prescriptions',      element: <RequireRole roles={['admin', 'doctor', 'pharmacist', 'patient']}><PrescriptionsPage /></RequireRole> },
      { path: '/prescriptions/new',  element: <RequireRole roles={['admin', 'doctor', 'pharmacist', 'patient']}><NewPrescriptionPage /></RequireRole> },
      { path: '/prescriptions/:id',  element: <RequireRole roles={['admin', 'doctor', 'pharmacist', 'patient']}><PrescriptionDetailPage /></RequireRole> },

      // Pharmacist only
      { path: '/verify-queue',    element: <RequireRole roles={['pharmacist']}><VerifyQueuePage /></RequireRole> },
      { path: '/dispense-history',element: <RequireRole roles={['pharmacist']}><DispenseHistoryPage /></RequireRole> },

      // Medicines availability (pharmacist + admin)
      { path: '/medicines',       element: <RequireRole roles={['pharmacist', 'admin']}><MedicineAvailabilityPage /></RequireRole> },

      // Diagnostic test catalog (admin)
      { path: '/diagnostic-tests', element: <RequireRole roles={['admin']}><DiagnosticTestsPage /></RequireRole> },

      // Admin only
      { path: '/reports',    element: <RequireRole roles={['admin']}><ReportsPage /></RequireRole> },
      { path: '/users',      element: <RequireRole roles={['admin']}><UsersPage /></RequireRole> },
      { path: '/audit-logs', element: <RequireRole roles={['admin']}><AuditLogsPage /></RequireRole> },
      { path: '/blockchain', element: <RequireRole roles={['admin']}><BlockchainExplorerPage /></RequireRole> },

      // Profile (all roles)
      { path: '/profile', element: <ProfilePage /> },
    ],
  },

  // ── Fallback ───────────────────────────────────────────────────────────────
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])

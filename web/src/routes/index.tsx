import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import type { Role } from '@/mocks/types'
import AppLayout from '@/layouts/AppLayout'
import AuthLayout from '@/layouts/AuthLayout'
import { useAuthStore } from '@/features/auth/authStore'

// Pages are lazy-loaded so each route ships as its own chunk — the initial bundle only carries
// the shell + the first page the user lands on (optimization: smaller first load per role).

// Auth pages
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'))

// Dashboard
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))

// Appointments
const AppointmentsPage = lazy(() => import('@/features/appointments/AppointmentsPage'))
const AppointmentDetailPage = lazy(() => import('@/features/appointments/AppointmentDetailPage'))
const BookAppointmentPage = lazy(() => import('@/features/appointments/BookAppointmentPage'))
const DoctorAvailabilityPage = lazy(() => import('@/features/appointments/DoctorAvailabilityPage'))

// Patients
const PatientsPage = lazy(() => import('@/features/patients/PatientsPage'))
const PatientProfilePage = lazy(() => import('@/features/patients/PatientProfilePage'))
const PatientFormPage = lazy(() => import('@/features/patients/PatientFormPage'))

// Prescriptions
const PrescriptionsPage = lazy(() => import('@/features/prescriptions/PrescriptionsPage'))
const PrescriptionDetailPage = lazy(() => import('@/features/prescriptions/PrescriptionDetailPage'))
const NewPrescriptionPage = lazy(() => import('@/features/prescriptions/NewPrescriptionPage'))
const VerifyQueuePage = lazy(() => import('@/features/prescriptions/VerifyQueuePage'))
const DispenseHistoryPage = lazy(() => import('@/features/prescriptions/DispenseHistoryPage'))

// Medicines
const MedicineAvailabilityPage = lazy(() => import('@/features/medicines/MedicineAvailabilityPage'))

// Diagnostics
const DiagnosticTestsPage = lazy(() => import('@/features/diagnostics/DiagnosticTestsPage'))

// Consultations
const ConsultationsPage = lazy(() => import('@/features/consultations/ConsultationsPage'))
const PatientRecordsPage = lazy(() => import('@/features/records/PatientRecordsPage'))
const PatientChartPage = lazy(() => import('@/features/records/PatientChartPage'))
const MyRecordsPage = lazy(() => import('@/features/records/MyRecordsPage'))

// Reports
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'))

// Admin
const UsersPage = lazy(() => import('@/features/admin/UsersPage'))
const AuditLogsPage = lazy(() => import('@/features/admin/AuditLogsPage'))

// Blockchain
const BlockchainExplorerPage = lazy(() => import('@/features/blockchain/BlockchainExplorerPage'))

// Profile
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))

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

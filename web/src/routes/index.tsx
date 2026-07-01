import { lazy } from 'react'
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom'
import type { Role } from '@/mocks/types'
import AppLayout from '@/layouts/AppLayout'
import AuthLayout from '@/layouts/AuthLayout'
import { useAuthStore } from '@/features/auth/authStore'

// Pages are lazy-loaded so each route ships as its own chunk - the initial bundle only carries
// the shell + the first page the user lands on (optimization: smaller first load per role).
const PublicLayout = lazy(() => import('@/features/public/PublicLayout'))
const HomePage = lazy(() => import('@/features/public/HomePage'))
const DoctorsPage = lazy(() => import('@/features/public/DoctorsPage'))
const BookPage = lazy(() => import('@/features/public/BookPage'))
const ServicesPage = lazy(() => import('@/features/public/ServicesPage'))
const AboutPage = lazy(() => import('@/features/public/AboutPage'))
const FaqPage = lazy(() => import('@/features/public/FaqPage'))
const PrivacyPage = lazy(() => import('@/features/public/PrivacyPage'))

// Auth pages
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'))

// Dashboard
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))

// Appointments
const AppointmentsPage = lazy(() => import('@/features/appointments/AppointmentsPage'))
const AppointmentDetailPage = lazy(() => import('@/features/appointments/AppointmentDetailPage'))
const AppointmentRequestsPage = lazy(() => import('@/features/appointments/AppointmentRequestsPage'))
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

// Admin security
const SecurityAlertsPage = lazy(() => import('@/features/admin/SecurityAlertsPage'))

// Patient privacy portal
const PatientPrivacyPage = lazy(() => import('@/features/records/PatientPrivacyPage'))

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
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  // Account-at-visit patients must replace their temporary password before using the app.
  if (user?.must_change_password && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />
  }
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

// The public home is the app root; authenticated users are sent to their dashboard.
function PublicHome() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <HomePage />
}

// Unknown routes: authed → dashboard, guests → public home.
function FallbackRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return <Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />
}

// ── Router ────────────────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  // ── Public landing site (no auth) ──────────────────────────────────────────
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <PublicHome /> },
      { path: '/services', element: <ServicesPage /> },
      { path: '/doctors', element: <DoctorsPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/book', element: <BookPage /> },
      { path: '/faq', element: <FaqPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
    ],
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <RequireGuest><LoginPage /></RequireGuest> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },

  // ── Authenticated app ──────────────────────────────────────────────────────
  {
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      // Dashboard
      { path: '/dashboard', element: <DashboardPage /> },

      // Appointments
      { path: '/appointments', element: <AppointmentsPage /> },
      { path: '/appointments/new', element: <RequireRole roles={['patient', 'admin']}><BookAppointmentPage /></RequireRole> },
      { path: '/appointments/availability', element: <DoctorAvailabilityPage /> },
      { path: '/appointments/:id', element: <AppointmentDetailPage /> },

      // Guest appointment requests (staff review queue)
      { path: '/appointment-requests', element: <RequireRole roles={['staff']}><AppointmentRequestsPage /></RequireRole> },

      // Consultations are clinical work owned by doctors.
      { path: '/consultations', element: <RequireRole roles={['doctor']}><ConsultationsPage /></RequireRole> },

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
      { path: '/prescriptions/new',  element: <RequireRole roles={['doctor']}><NewPrescriptionPage /></RequireRole> },
      { path: '/prescriptions/:id',  element: <RequireRole roles={['admin', 'doctor', 'pharmacist', 'patient']}><PrescriptionDetailPage /></RequireRole> },
      { path: '/privacy-access',     element: <RequireRole roles={['patient']}><PatientPrivacyPage /></RequireRole> },

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
      { path: '/security-alerts', element: <RequireRole roles={['admin']}><SecurityAlertsPage /></RequireRole> },
      { path: '/blockchain', element: <RequireRole roles={['admin']}><BlockchainExplorerPage /></RequireRole> },

      // Profile (all roles)
      { path: '/profile', element: <ProfilePage /> },
    ],
  },

  // ── Fallback ───────────────────────────────────────────────────────────────
  { path: '*', element: <FallbackRedirect /> },
])

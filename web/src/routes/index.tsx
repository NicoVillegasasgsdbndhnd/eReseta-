import { lazy } from 'react'
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom'
import type { Role } from '@/mocks/types'
import AppLayout from '@/layouts/AppLayout'
import AuthLayout from '@/layouts/AuthLayout'
import { useAuthStore } from '@/features/auth/authStore'



const PublicLayout = lazy(() => import('@/features/public/PublicLayout'))
const HomePage = lazy(() => import('@/features/public/HomePage'))
const DoctorsPage = lazy(() => import('@/features/public/DoctorsPage'))
const BookPage = lazy(() => import('@/features/public/BookPage'))
const ServicesPage = lazy(() => import('@/features/public/ServicesPage'))
const AboutPage = lazy(() => import('@/features/public/AboutPage'))
const FaqPage = lazy(() => import('@/features/public/FaqPage'))
const PrivacyPage = lazy(() => import('@/features/public/PrivacyPage'))


const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'))


const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))


const AppointmentsPage = lazy(() => import('@/features/appointments/AppointmentsPage'))
const AppointmentDetailPage = lazy(() => import('@/features/appointments/AppointmentDetailPage'))
const AppointmentRequestsPage = lazy(() => import('@/features/appointments/AppointmentRequestsPage'))
const BookAppointmentPage = lazy(() => import('@/features/appointments/BookAppointmentPage'))
const DoctorAvailabilityPage = lazy(() => import('@/features/appointments/DoctorAvailabilityPage'))


const PatientsPage = lazy(() => import('@/features/patients/PatientsPage'))
const PatientProfilePage = lazy(() => import('@/features/patients/PatientProfilePage'))
const PatientFormPage = lazy(() => import('@/features/patients/PatientFormPage'))


const PrescriptionsPage = lazy(() => import('@/features/prescriptions/PrescriptionsPage'))
const PrescriptionDetailPage = lazy(() => import('@/features/prescriptions/PrescriptionDetailPage'))
const NewPrescriptionPage = lazy(() => import('@/features/prescriptions/NewPrescriptionPage'))
const VerifyQueuePage = lazy(() => import('@/features/prescriptions/VerifyQueuePage'))
const DispenseHistoryPage = lazy(() => import('@/features/prescriptions/DispenseHistoryPage'))


const MedicineAvailabilityPage = lazy(() => import('@/features/medicines/MedicineAvailabilityPage'))


const DiagnosticTestsPage = lazy(() => import('@/features/diagnostics/DiagnosticTestsPage'))


const PatientPrivacyPage = lazy(() => import('@/features/records/PatientPrivacyPage'))


const CompliancePage = lazy(() => import('@/features/admin/CompliancePage'))


const AcceptTermsPage = lazy(() => import('@/features/legal/AcceptTermsPage'))
const CompleteProfilePage = lazy(() => import('@/features/profile/CompleteProfilePage'))
const TermsReviewPage = lazy(() => import('@/features/legal/TermsReviewPage'))
const TermsPage = lazy(() => import('@/features/public/TermsPage'))


const ConsultationsPage = lazy(() => import('@/features/consultations/ConsultationsPage'))
const PatientRecordsPage = lazy(() => import('@/features/records/PatientRecordsPage'))
const PatientChartPage = lazy(() => import('@/features/records/PatientChartPage'))
const MyRecordsPage = lazy(() => import('@/features/records/MyRecordsPage'))


const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'))


const UsersPage = lazy(() => import('@/features/admin/UsersPage'))
const AuditLogsPage = lazy(() => import('@/features/admin/AuditLogsPage'))


const BlockchainExplorerPage = lazy(() => import('@/features/blockchain/BlockchainExplorerPage'))


const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))


function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (user?.must_change_password && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />
  }

  if (user && user.terms_accepted === false && !user.must_change_password && location.pathname !== '/accept-terms') {
    return <Navigate to="/accept-terms" replace />
  }

  // Patients must complete their profile (home address, emergency contact, allergies) after activating.
  if (
    user && user.role === 'patient' && user.profile_complete === false &&
    !user.must_change_password && user.terms_accepted !== false &&
    location.pathname !== '/complete-profile'
  ) {
    return <Navigate to="/complete-profile" replace />
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


function PublicHome() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <HomePage />
}


function FallbackRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return <Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />
}


export const router = createBrowserRouter([

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
      { path: '/terms', element: <TermsPage /> },
    ],
  },


  { path: '/accept-terms', element: <RequireAuth><AcceptTermsPage /></RequireAuth> },
  { path: '/complete-profile', element: <RequireAuth><CompleteProfilePage /></RequireAuth> },


  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <RequireGuest><LoginPage /></RequireGuest> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },


  {
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [

      { path: '/dashboard', element: <DashboardPage /> },


      { path: '/appointments', element: <AppointmentsPage /> },
      { path: '/appointments/new', element: <RequireRole roles={['patient', 'admin']}><BookAppointmentPage /></RequireRole> },
      { path: '/appointments/availability', element: <DoctorAvailabilityPage /> },
      { path: '/appointments/:id', element: <AppointmentDetailPage /> },


      { path: '/appointment-requests', element: <RequireRole roles={['staff']}><AppointmentRequestsPage /></RequireRole> },


      { path: '/consultations', element: <RequireRole roles={['doctor']}><ConsultationsPage /></RequireRole> },


      { path: '/my-records',          element: <RequireRole roles={['patient']}><MyRecordsPage /></RequireRole> },


      { path: '/records',             element: <RequireRole roles={['doctor', 'staff', 'admin']}><PatientRecordsPage /></RequireRole> },
      { path: '/records/:patientId',  element: <RequireRole roles={['doctor', 'staff', 'admin']}><PatientChartPage /></RequireRole> },


      { path: '/patients',          element: <RequireRole roles={['admin']}><PatientsPage /></RequireRole> },
      { path: '/patients/new',      element: <RequireRole roles={['admin', 'staff']}><PatientFormPage /></RequireRole> },
      { path: '/patients/:id/edit', element: <RequireRole roles={['admin', 'staff']}><PatientFormPage /></RequireRole> },
      { path: '/patients/:id',      element: <RequireRole roles={['admin', 'doctor', 'staff']}><PatientProfilePage /></RequireRole> },


      { path: '/prescriptions',      element: <RequireRole roles={['admin', 'doctor', 'pharmacist', 'patient']}><PrescriptionsPage /></RequireRole> },
      { path: '/prescriptions/new',  element: <RequireRole roles={['doctor']}><NewPrescriptionPage /></RequireRole> },
      { path: '/prescriptions/:id',  element: <RequireRole roles={['admin', 'doctor', 'pharmacist', 'patient']}><PrescriptionDetailPage /></RequireRole> },
      { path: '/privacy-access',     element: <RequireRole roles={['patient']}><PatientPrivacyPage /></RequireRole> },


      { path: '/verify-queue',    element: <RequireRole roles={['pharmacist']}><VerifyQueuePage /></RequireRole> },
      { path: '/dispense-history',element: <RequireRole roles={['pharmacist']}><DispenseHistoryPage /></RequireRole> },


      { path: '/medicines',       element: <RequireRole roles={['pharmacist', 'admin']}><MedicineAvailabilityPage /></RequireRole> },


      { path: '/diagnostic-tests', element: <RequireRole roles={['admin']}><DiagnosticTestsPage /></RequireRole> },


      { path: '/reports',    element: <RequireRole roles={['admin']}><ReportsPage /></RequireRole> },
      { path: '/users',      element: <RequireRole roles={['admin']}><UsersPage /></RequireRole> },
      { path: '/audit-logs', element: <RequireRole roles={['admin']}><AuditLogsPage /></RequireRole> },
      { path: '/compliance', element: <RequireRole roles={['admin']}><CompliancePage /></RequireRole> },
      { path: '/blockchain', element: <RequireRole roles={['admin']}><BlockchainExplorerPage /></RequireRole> },


      { path: '/profile', element: <ProfilePage /> },
      { path: '/terms-view', element: <TermsReviewPage /> },
    ],
  },


  { path: '*', element: <FallbackRedirect /> },
])

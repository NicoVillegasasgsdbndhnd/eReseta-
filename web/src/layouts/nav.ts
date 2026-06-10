import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, CalendarDays, Users, FileText, Pill,
  ClipboardList, BarChart2, ShieldCheck, ScrollText, Package, Boxes,
} from 'lucide-react'
import type { Role } from '@/mocks/types'

export interface NavItem {
  label: string
  short?: string // compact label for the mobile bottom bar
  to: string
  icon: LucideIcon
}

// Primary destinations per role (Profile lives in the top bar's user menu).
export const NAV_ITEMS: Record<Role, NavItem[]> = {
  patient: [
    { label: 'Dashboard',     short: 'Home',  to: '/dashboard',     icon: LayoutDashboard },
    { label: 'Appointments',  short: 'Appts', to: '/appointments',  icon: CalendarDays },
    { label: 'Prescriptions', short: 'Rx',    to: '/prescriptions', icon: Pill },
  ],
  doctor: [
    { label: 'Dashboard',     short: 'Home',     to: '/dashboard',     icon: LayoutDashboard },
    { label: 'Appointments',  short: 'Appts',    to: '/appointments',  icon: CalendarDays },
    { label: 'Consultations', short: 'Consults', to: '/consultations', icon: ClipboardList },
    { label: 'Prescriptions', short: 'Rx',       to: '/prescriptions', icon: Pill },
  ],
  pharmacist: [
    { label: 'Dashboard',        short: 'Home',     to: '/dashboard',        icon: LayoutDashboard },
    { label: 'Verify Queue',     short: 'Verify',   to: '/verify-queue',     icon: ShieldCheck },
    { label: 'Dispense History', short: 'Dispense', to: '/dispense-history', icon: ScrollText },
    { label: 'Medicines',        short: 'Meds',     to: '/medicines',        icon: Package },
  ],
  admin: [
    { label: 'Dashboard',     short: 'Home', to: '/dashboard',     icon: LayoutDashboard },
    { label: 'Patients',      to: '/patients',      icon: Users },
    { label: 'Prescriptions', short: 'Rx', to: '/prescriptions', icon: Pill },
    { label: 'Medicines',     short: 'Meds', to: '/medicines',     icon: Package },
    { label: 'Reports',       to: '/reports',       icon: BarChart2 },
    { label: 'Blockchain',    short: 'Chain', to: '/blockchain', icon: Boxes },
    { label: 'Users',         to: '/users',         icon: FileText },
  ],
  staff: [
    { label: 'Dashboard',     short: 'Home',     to: '/dashboard',     icon: LayoutDashboard },
    { label: 'Appointments',  short: 'Appts',    to: '/appointments',  icon: CalendarDays },
    { label: 'Consultations', short: 'Consults', to: '/consultations', icon: ClipboardList },
  ],
}

export const ROLE_LABELS: Record<Role, string> = {
  patient: 'Patient', doctor: 'Physician', pharmacist: 'Pharmacist', admin: 'Administrator', staff: 'Staff',
}

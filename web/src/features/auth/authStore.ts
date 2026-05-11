import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Role, User } from '@/mocks/types'

// Dev-only mock users — one per role
const MOCK_USERS: Record<Role, User> = {
  patient: {
    id: 1, name: 'Juan dela Cruz', email: 'patient@deamhi.test',
    phone: '09171234567', address: 'Manila', role: 'patient',
    status: 'active', created_at: '', updated_at: '',
  },
  doctor: {
    id: 2, name: 'Dr. Maria Santos', email: 'doctor@deamhi.test',
    phone: '09181234567', address: 'Quezon City', role: 'doctor',
    status: 'active', created_at: '', updated_at: '',
  },
  pharmacist: {
    id: 3, name: 'Ana Reyes', email: 'pharmacist@deamhi.test',
    phone: '09191234567', address: 'Makati', role: 'pharmacist',
    status: 'active', created_at: '', updated_at: '',
  },
  admin: {
    id: 4, name: 'Admin User', email: 'admin@deamhi.test',
    phone: '09201234567', address: 'Pasig', role: 'admin',
    status: 'active', created_at: '', updated_at: '',
  },
  it_admin: {
    id: 5, name: 'IT Admin', email: 'it@deamhi.test',
    phone: '09211234567', address: 'Taguig', role: 'it_admin',
    status: 'active', created_at: '', updated_at: '',
  },
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  // Dev tool
  switchRole: (role: Role) => void
  // Real auth actions (wired to API in Phase 4)
  setAuth: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: MOCK_USERS.admin,
      token: 'mock-token',
      isAuthenticated: true,

      switchRole: (role) =>
        set({ user: MOCK_USERS[role], token: 'mock-token', isAuthenticated: true }),

      setAuth: (user, token) => {
        localStorage.setItem('auth_token', token)
        set({ user, token, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('auth_token')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    { name: 'ereseta-auth' },
  ),
)

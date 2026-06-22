import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/mocks/types'
import api from '@/lib/api'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  setAuth: (user: User, token: string) => void
  setUser: (user: User) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post<{ token: string; user: User }>('/auth/login', {
          email,
          password,
        })
        set({ user: data.user, token: data.token, isAuthenticated: true })
      },

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true })
      },

      setUser: (user) => set({ user }),

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // ignore — clear local state regardless
        }
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    { name: 'ereseta-auth' },
  ),
)

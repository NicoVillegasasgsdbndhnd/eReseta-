import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('ereseta-auth')
    if (stored) {
      const parsed = JSON.parse(stored) as { state?: { token?: string } }
      if (parsed.state?.token) {
        config.headers.Authorization = `Bearer ${parsed.state.token}`
      }
    }
  } catch {
    // ignore malformed storage
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // A 401 from the login/register endpoints means "bad credentials" — let the auth page show
    // its own inline message. Only treat a 401 on other endpoints as an expired session, which
    // warrants clearing the token and bouncing to /login.
    const url: string = error.config?.url ?? ''
    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register')
    if (error.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('ereseta-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

/**
 * Pull a human-readable message out of an axios error: the API's `message`, else the first
 * validation error, else a generic fallback. Used by the global mutation error toast.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (typeof error === 'object' && error !== null) {
    const e = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
    const message = e.response?.data?.message
    if (message) return message
    const errors = e.response?.data?.errors
    if (errors) {
      const first = Object.values(errors)[0]
      if (Array.isArray(first) && first[0]) return first[0]
    }
  }
  return fallback
}

export default api

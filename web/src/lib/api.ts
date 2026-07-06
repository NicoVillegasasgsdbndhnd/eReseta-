import axios from 'axios'

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

  if (typeof window === 'undefined') return configured

  const pageHost = window.location.hostname
  const isLocalPage = pageHost === 'localhost' || pageHost === '127.0.0.1'



  if (!isLocalPage && configured.includes('localhost:8000')) {
    return `http://${pageHost}:8000/api`
  }

  return configured
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
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

  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {



    const url: string = error.config?.url ?? ''
    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register')
    if (error.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('ereseta-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)





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

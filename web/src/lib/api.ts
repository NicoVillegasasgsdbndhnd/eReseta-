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
    if (error.response?.status === 401) {
      localStorage.removeItem('ereseta-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { toast } from 'sonner'
import './index.css'
import App from './App'
import { getApiErrorMessage } from '@/lib/api'

const queryClient = new QueryClient({



  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.skipGlobalError) return
      toast.error(getApiErrorMessage(error))
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

// A deploy while the app is open deletes the old hashed page chunks; the next navigation then
// fails to load one. Reload once to pick up the new build instead of showing an error.
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'ereseta-chunk-reload'
  if (sessionStorage.getItem(KEY)) return
  sessionStorage.setItem(KEY, '1')
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

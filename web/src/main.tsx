import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { toast } from 'sonner'
import './index.css'
import App from './App'
import { getApiErrorMessage } from '@/lib/api'

const queryClient = new QueryClient({
  // App-wide failure feedback: any mutation (booking, saving a consult, verifying an Rx, …) that
  // rejects surfaces the API's error message as a toast, unless it opts out via meta.skipGlobalError
  // (e.g. forms that show the error inline). 401s are already handled by the axios interceptor.
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

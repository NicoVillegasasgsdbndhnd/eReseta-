import { useMutation, useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export interface TermsSection {
  heading: string
  body: string
}

export interface Terms {
  version: string
  variant: 'patient' | 'employee' | 'admin'
  title: string
  intro: string
  sections: TermsSection[]
  accepted?: boolean
  accepted_at?: string | null
}

/** The current agreement for the authenticated user's role + accepted flag. */
export function useMyTerms() {
  return useQuery({
    queryKey: ['my-terms'],
    queryFn: () => api.get<Terms>('/me/terms').then((r) => r.data),
  })
}

/** Record acceptance of the current terms version. */
export function useAcceptTerms() {
  return useMutation({
    mutationFn: () => api.post<{ accepted: boolean; version: string }>('/me/terms/accept').then((r) => r.data),
  })
}

/** Public (unauthenticated) patient agreement — for the guest /terms page. */
export function usePublicTerms() {
  return useQuery({
    queryKey: ['public-terms'],
    queryFn: () => api.get<Terms>('/public/terms').then((r) => r.data),
  })
}

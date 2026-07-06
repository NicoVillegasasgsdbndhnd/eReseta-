import { useMutation, useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export interface TermsSection {
  heading: string
  body: string
}

export interface Terms {
  version: string
  variant: 'patient' | 'employee' | 'admin'
  effective_date: string
  title: string
  intro: string
  sections: TermsSection[]
  accepted?: boolean
  accepted_at?: string | null
}


export function useMyTerms() {
  return useQuery({
    queryKey: ['my-terms'],
    queryFn: () => api.get<Terms>('/me/terms').then((r) => r.data),
  })
}


export function useAcceptTerms() {
  return useMutation({
    mutationFn: () => api.post<{ accepted: boolean; version: string }>('/me/terms/accept').then((r) => r.data),
  })
}


export function usePublicTerms() {
  return useQuery({
    queryKey: ['public-terms'],
    queryFn: () => api.get<Terms>('/public/terms').then((r) => r.data),
  })
}

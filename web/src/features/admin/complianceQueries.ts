import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export interface ConsentRegisterRow {
  patient_id: number
  patient_name: string | null
  status: 'given' | 'withdrawn' | 'none'
  recorded_at: string | null
  recorded_by: string | null
}

export interface TermsAcceptanceRow {
  id: number
  name: string
  role: string | null
  accepted_version: string | null
  accepted_at: string | null
  up_to_date: boolean
}


export function useConsentRegister() {
  return useQuery({
    queryKey: ['consent-register'],
    queryFn: () =>
      api.get<{ data: ConsentRegisterRow[]; summary: { given: number; withdrawn: number; none: number } }>(
        '/compliance/consent-register',
      ).then((r) => r.data),
  })
}


export function useTermsAcceptanceRegister() {
  return useQuery({
    queryKey: ['terms-acceptance-register'],
    queryFn: () =>
      api.get<{ current_version: string; data: TermsAcceptanceRow[]; summary: { up_to_date: number; pending: number } }>(
        '/compliance/terms-acceptance',
      ).then((r) => r.data),
  })
}

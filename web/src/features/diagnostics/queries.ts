import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { DiagnosticOrder, DiagnosticTest, Paginated } from '@/mocks/types'

// ── Catalog ────────────────────────────────────────────────────────────────
export function useDiagnosticTestSearch(
  search: string,
  options?: { availableOnly?: boolean; category?: string; page?: number; perPage?: number; enabled?: boolean },
) {
  return useQuery({
    queryKey: ['diagnostic-tests', { search, availableOnly: options?.availableOnly, category: options?.category, page: options?.page, perPage: options?.perPage }],
    queryFn: () =>
      api
        .get<Paginated<DiagnosticTest>>('/diagnostic-tests', {
          params: {
            search: search || undefined,
            available_only: options?.availableOnly ? 1 : undefined,
            category: options?.category || undefined,
            page: options?.page,
            per_page: options?.perPage,
          },
        })
        .then((r) => r.data),
    enabled: options?.enabled ?? true,
  })
}

/** Full imaging catalog (≤250) for the Modality → Area cascade picker. */
export function useImagingCatalog(enabled = true) {
  return useDiagnosticTestSearch('', { availableOnly: true, category: 'imaging', perPage: 250, enabled })
}

export function useAddDiagnosticTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; category?: string; modality?: string; body_region?: string }) =>
      api.post<DiagnosticTest>('/diagnostic-tests', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diagnostic-tests'] }),
  })
}

export function useToggleDiagnosticTestAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, is_available }: { id: number; is_available: boolean }) =>
      api.put<DiagnosticTest>(`/diagnostic-tests/${id}/availability`, { is_available }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diagnostic-tests'] }),
  })
}

export function useDeleteDiagnosticTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/diagnostic-tests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diagnostic-tests'] }),
  })
}

// ── Orders ─────────────────────────────────────────────────────────────────
export function useCreateDiagnosticOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) =>
      api.post<DiagnosticOrder>('/diagnostic-orders', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diagnostic-orders'] }),
  })
}

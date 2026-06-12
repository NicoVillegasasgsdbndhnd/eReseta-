import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Medicine, Paginated } from '@/mocks/types'

export function useMedicineSearch(
  search: string,
  options?: { availableOnly?: boolean; page?: number; enabled?: boolean },
) {
  return useQuery({
    queryKey: ['medicines', { search, availableOnly: options?.availableOnly, page: options?.page }],
    queryFn: () =>
      api
        .get<Paginated<Medicine>>('/medicines', {
          params: {
            search: search || undefined,
            available_only: options?.availableOnly ? 1 : undefined,
            page: options?.page,
          },
        })
        .then((r) => r.data),
    enabled: options?.enabled ?? true,
  })
}

export function useToggleMedicineAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, is_available }: { id: number; is_available: boolean }) =>
      api.put<Medicine>(`/medicines/${id}/availability`, { is_available }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicines'] }),
  })
}

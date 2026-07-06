import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Medicine, MedicineBrand, Paginated } from '@/mocks/types'

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


export function useMedicineBrands(medicineId: number | null | undefined, availableOnly = true) {
  return useQuery({
    queryKey: ['medicine-brands', medicineId, availableOnly],
    queryFn: () =>
      api
        .get<MedicineBrand[]>(`/medicines/${medicineId}/brands`, {
          params: { available_only: availableOnly ? 1 : undefined },
        })
        .then((r) => r.data),
    enabled: !!medicineId,
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

export function useToggleBrandAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, is_available }: { id: number; is_available: boolean }) =>
      api.put<MedicineBrand>(`/medicine-brands/${id}/availability`, { is_available }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicines'] })
      qc.invalidateQueries({ queryKey: ['medicine-brands'] })
    },
  })
}

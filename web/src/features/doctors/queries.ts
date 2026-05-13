import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Doctor, Paginated } from '@/mocks/types'

export function useDoctors() {
  return useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.get<Paginated<Doctor>>('/doctors').then((r) => r.data),
  })
}

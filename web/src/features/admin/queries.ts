import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Paginated, User } from '@/mocks/types'

export function useUsers(params?: { role?: string; search?: string; page?: number }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => api.get<Paginated<User>>('/users', { params }).then((r) => r.data),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post<User>('/users', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser(id: number | string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.put<User>(`/users/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

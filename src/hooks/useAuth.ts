import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { getSession, logout as logoutFn } from '@/lib/auth.server'

export type AppRole = 'admin' | 'advisor' | 'student'

export function useAuth() {
  const getSessionFn = useServerFn(getSession)
  const logoutServerFn = useServerFn(logoutFn)
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: () => getSessionFn(),
    staleTime: 30_000,
    retry: false,
  })

  const roles: AppRole[] = user ? [user.role] : []

  const signOut = async () => {
    await logoutServerFn()
    queryClient.setQueryData(['session'], null)
    window.location.href = '/'
  }

  return {
    user: user ?? null,
    session: user ? { user } : null,
    roles,
    isAdmin: user?.role === 'admin',
    isAdvisor: user?.role === 'advisor',
    isStudent: user?.role === 'student',
    loading: isLoading,
    signOut,
  }
}

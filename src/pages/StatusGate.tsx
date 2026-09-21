import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

type Props = { role?: 'teacher' | 'student'; children: React.ReactNode }

export function StatusGate({ role, children }: Props) {
  const { session, profile, loading } = useAuth()
  const loc = useLocation()

  if (loading) return null
  if (!session) return <Navigate to="/identificacao" replace state={{ from: loc }} />

  // If we have session, use JWT metadata to check role
  const userMeta = session.user?.user_metadata as any
  const jwtRole = userMeta?.role as 'teacher' | 'student' | undefined

  // If no profile is loaded but we have a session and valid role, allow access
  // Profile will be loaded on-demand in the component
  if (!profile) {
    if (!jwtRole) return <Navigate to="/identificacao" replace state={{ from: loc }} />
    // Allow access if JWT role matches expected role
    if (role && jwtRole !== role) {
      return <Navigate to={jwtRole === 'teacher' ? '/professor' : '/aluno'} replace />
    }
    // Render but profile-dependent checks won't work
    return <>{children}</>
  }

  if (profile.account_status === 'deactivated') return <Navigate to="/bloqueado?motivo=desativada" replace />
  if (profile.account_status === 'deleting') return <Navigate to="/bloqueado?motivo=exclusao" replace />

  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'teacher' ? '/professor' : '/aluno'} replace />
  }

  if (profile.role === 'student') {
    if (profile.link_status === 'pending') return <Navigate to="/aguardando" replace />
    if (profile.link_status === 'none' || profile.link_status === 'ended') {
      if (loc.pathname !== '/aluno/encontrar-professor')
        return <Navigate to="/aluno/encontrar-professor" replace />
    }
    if (profile.link_status === 'suspended') return <Navigate to="/bloqueado?motivo=suspenso" replace />
  }

  return <>{children}</>
}

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

type Props = { role?: 'teacher' | 'student'; children: React.ReactNode }

export function StatusGate({ role, children }: Props) {
  const { session, profile, loading } = useAuth()
  const loc = useLocation()

  if (loading) return null
  if (!session) return <Navigate to="/identificacao" replace state={{ from: loc }} />

  // Never gate on user_metadata: the user can write their own with
  // auth.updateUser. Without a profile the account_status and link_status
  // checks below cannot run, so there is no safe way to render here.
  if (!profile) return <Navigate to="/identificacao" replace state={{ from: loc }} />

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

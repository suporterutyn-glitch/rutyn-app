import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { RutynLogo } from '@/components/RutynLogo'

export function SplashPage() {
  const nav = useNavigate()
  const { loading, session, profile } = useAuth()

  useEffect(() => {
    if (loading) return

    if (!session || !profile) {
      nav('/identificacao', { replace: true })
    } else if (profile.role === 'teacher') {
      nav('/professor', { replace: true })
    } else if (profile.link_status === 'pending') {
      nav('/aguardando', { replace: true })
    } else if (profile.link_status === 'none' || profile.link_status === 'ended') {
      nav('/aluno/encontrar-professor', { replace: true })
    } else {
      nav('/aluno', { replace: true })
    }
  }, [loading, session, profile, nav])

  return (
    <div className="app-shell app-bg-pro flex items-center justify-center">
      <div className="relative z-10 flex flex-col items-center gap-4">
        <RutynLogo size={125} className="animate-logo-breathe" />
      </div>
    </div>
  )
}

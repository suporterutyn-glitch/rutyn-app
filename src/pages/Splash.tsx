import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

export function SplashPage() {
  const nav = useNavigate()
  const { loading, session, profile } = useAuth()

  useEffect(() => {
    if (loading) return

    // Wait 800ms to ensure session is loaded from localStorage
    const t = setTimeout(() => {
      if (!session) {
        nav('/identificacao', { replace: true })
      } else if (profile) {
        // Profile loaded, use it
        if (profile.role === 'teacher') nav('/professor', { replace: true })
        else if (profile.link_status === 'pending') nav('/aguardando', { replace: true })
        else if (profile.link_status === 'none' || profile.link_status === 'ended')
          nav('/aluno/encontrar-professor', { replace: true })
        else nav('/aluno', { replace: true })
      } else {
        // No profile loaded, use JWT metadata
        const userMeta = session.user?.user_metadata as any
        const jwtRole = userMeta?.role as 'teacher' | 'student' | undefined
        if (jwtRole === 'teacher') nav('/professor', { replace: true })
        else if (jwtRole === 'student') nav('/aluno', { replace: true })
        else nav('/identificacao', { replace: true })
      }
    }, 800)
    return () => clearTimeout(t)
  }, [loading, session, profile, nav])

  return (
    <div className="app-shell app-bg-pro flex items-center justify-center">
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-[125px] h-[125px] rounded-full bg-gradient-to-tr from-[#3A3A3A] to-[#050505] flex items-center justify-center animate-logo-breathe">
          <span className="text-brand-light text-rt-42 font-black tracking-tight">R</span>
        </div>
        <div className="text-white font-black text-rt-32 tracking-tight">rutyn</div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { RutynLogo } from '@/components/RutynLogo'

const MINIMO_MS = 2000

export function SplashPage() {
  const nav = useNavigate()
  const { loading, session, profile } = useAuth()
  // El modulo pide que la splash se vea al menos 2s: sin esto parpadea y se va.
  const [tiempoMinimoCumplido, setTiempoMinimoCumplido] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setTiempoMinimoCumplido(true), MINIMO_MS)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    if (loading || !tiempoMinimoCumplido) return

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
  }, [loading, tiempoMinimoCumplido, session, profile, nav])

  return (
    <div className="app-shell app-bg-pro flex items-center justify-center">
      <div className="relative z-10 flex items-center justify-center">
        <span
          aria-hidden
          className="absolute w-[115px] h-[115px] rounded-full border border-brand rutyn-splash-wave"
        />
        <span
          aria-hidden
          className="absolute w-[115px] h-[115px] rounded-full border border-brand rutyn-splash-wave"
          style={{ animationDelay: '1.2s' }}
        />
        <RutynLogo size={115} className="rutyn-splash-pulse" />
      </div>
    </div>
  )
}

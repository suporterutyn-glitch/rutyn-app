import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { guardarCodigo, usarCodigo, mensajeConvite } from '@/lib/convite'

/** /c/:codigo — link de invitación del profesor. */
export function ConviteLinkPage() {
  const { codigo = '' } = useParams()
  const { session, profile, loading, refresh } = useAuth()
  const { t } = useTranslation()
  const nav = useNavigate()
  const [aviso, setAviso] = useState<{ msg: string; destino: string } | null>(null)

  useEffect(() => {
    if (loading) return
    guardarCodigo(codigo)
    if (!session) { nav('/cadastro/aluno', { replace: true }); return }
    if (!profile) return
    if (profile.role === 'teacher') { setAviso({ msg: t('signupStudent:linkTeacher'), destino: '/professor' }); return }
    void (async () => {
      const r = await usarCodigo(codigo)
      await refresh()
      if (r === 'ok') nav('/aluno', { replace: true })
      else setAviso({ msg: t(mensajeConvite(r)), destino: '/aluno' })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, profile?.id])

  return (
    <div className="app-shell app-bg-pro flex items-center justify-center min-h-dvh">
      <div className="w-10 h-10 rounded-full border-4 border-brand/30 border-t-brand animate-spin" />
      {aviso && <FeedbackDialog kind="error" message={aviso.msg} onClose={() => nav(aviso.destino, { replace: true })} />}
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'

type Props = {
  emailInicial: string
  onCancel: () => void
  onEnviado: (mensaje: string) => void
}

export function RecuperarSenhaDialog({ emailInicial, onCancel, onEnviado }: Props) {
  const { t } = useTranslation()
  const [email, setEmail] = useState(emailInicial)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function enviar() {
    const limpio = email.trim()
    if (!limpio || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
      setError(t('login:invalidEmail'))
      return
    }
    setError(null)
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(limpio, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    setLoading(false)
    // Nunca se revela si el correo existe: seria un modo de descubrir cuentas.
    onEnviado(t('recover:sent'))
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-6" onClick={onCancel}>
      <div
        className="w-full max-w-[420px] rounded-[24px] bg-[#F0F0EA] px-6 pt-6 pb-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('recover:title')}
      >
        <h2 className="text-ink-dark text-rt-20 mb-3">{t('recover:title')}</h2>
        <p className="text-ink-muted text-rt-14 leading-snug mb-5">{t('recover:subtitle')}</p>

        <div className="relative">
          <span className="absolute -top-2 left-3 px-1 bg-[#F0F0EA] text-rt-11 text-ink-placeholder">
            {t('email')}
          </span>
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={
              'w-full h-14 rounded-[6px] border bg-transparent px-4 text-rt-15 text-ink-dark outline-none ' +
              (error ? 'border-danger' : 'border-grey-400 focus:border-brand')
            }
          />
        </div>
        {error && <div className="text-[10px] text-danger mt-1">{error}</div>}

        <div className="flex items-center justify-end gap-2 mt-6">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-ink-muted text-rt-15">
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={loading}
            className="min-w-[128px] h-11 rounded-[22px] bg-brand text-white text-rt-15 font-medium flex items-center justify-center"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              t('recover:send')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

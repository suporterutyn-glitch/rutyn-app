import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { mensajeError } from '@/lib/errores'

const ESPERA = 60 // Supabase no reenvía al mismo correo antes de 60 s.

/**
 * Paso final del registro: el usuario escribe el código de 6 dígitos que le llegó al correo.
 * Sin ese código la cuenta no queda activa, así nadie se registra con un correo que no es suyo.
 */
export function VerificarCorreo({ email, onVerificado, onCambiar, reenviarAlAbrir = false }: {
  email: string
  onVerificado: (s: Session) => void | Promise<void>
  /** Volver al formulario para corregir el correo. */
  onCambiar?: () => void
  /** Llega desde el login (cuenta sin confirmar): se manda un código nuevo al abrir. */
  reenviarAlAbrir?: boolean
}) {
  const { t } = useTranslation()
  const [codigo, setCodigo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [espera, setEspera] = useState(ESPERA)

  useEffect(() => {
    if (espera <= 0) return
    const id = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [espera])

  async function reenviar() {
    setError(null); setAviso(null)
    const { error: e } = await supabase.auth.resend({ type: 'signup', email })
    if (e) { setError(mensajeError(e)); return }
    setAviso(t('general:verify.resent'))
    setEspera(ESPERA)
  }

  useEffect(() => {
    if (reenviarAlAbrir) void reenviar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    if (codigo.length !== 6) return
    setOcupado(true); setError(null); setAviso(null)
    const { data, error: fallo } = await supabase.auth.verifyOtp({ email, token: codigo, type: 'signup' })
    if (fallo || !data.session) { setOcupado(false); setError(t('general:verify.wrong')); return }
    await onVerificado(data.session)
    setOcupado(false)
  }

  return (
    <form onSubmit={confirmar} className="flex flex-col gap-4 text-center">
      <div>
        <h2 className="text-ink-dark font-bold text-rt-18">{t('general:verify.title')}</h2>
        <p className="text-ink-muted text-rt-13 mt-2">{t('general:verify.sent')}</p>
        <p className="text-ink-dark font-semibold text-rt-14 break-all">{email}</p>
      </div>
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        aria-label={t('general:verify.code')}
        placeholder="••••••"
        className="w-full h-14 rounded-[12px] bg-white border border-[#DADADA] focus:border-brand outline-none text-center text-ink-dark text-[26px] font-bold tracking-[0.4em]"
      />
      {error && <div className="text-danger text-rt-12 font-semibold">{error}</div>}
      {aviso && <div className="text-brand text-rt-12 font-semibold">{aviso}</div>}
      <button type="submit" disabled={ocupado || codigo.length !== 6} className="btn-primary-pill disabled:opacity-50">
        {ocupado ? t('loading') : t('general:verify.confirm')}
      </button>
      <button type="button" disabled={espera > 0} onClick={reenviar} className="text-[#4C6524] font-semibold text-rt-13 disabled:text-ink-placeholder">
        {espera > 0 ? t('general:verify.resendIn', { s: espera }) : t('general:verify.resend')}
      </button>
      <p className="text-ink-placeholder text-rt-11">{t('general:verify.spam')}</p>
      {onCambiar && (
        <button type="button" onClick={onCambiar} className="text-ink-muted underline text-rt-12">{t('general:verify.change')}</button>
      )}
    </form>
  )
}

import { VerificarCorreo } from '@/components/VerificarCorreo'
import { useEffect, useState } from 'react'
import { RutynLogo } from '@/components/RutynLogo'
import { SelectorIdioma } from '@/components/SelectorIdioma'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { OfflineBanner } from '@/components/OfflineBanner'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { RecuperarSenhaDialog } from '@/components/RecuperarSenhaDialog'
import { mensajeError } from '@/lib/errores'

const CLAVE_EMAIL = 'rutyn.savedEmail'

// Si llegó al login desde una pantalla que pide sesión (por ejemplo /admin), vuelve ahí al entrar.
function destinoTrasLogin() {
  try {
    const d = sessionStorage.getItem('rutyn.despues')
    sessionStorage.removeItem('rutyn.despues')
    if (d && d.startsWith('/') && !d.startsWith('//')) return d
  } catch { /* sin almacenamiento: va al inicio */ }
  return '/'
}

export function LoginPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [saveEmail, setSaveEmail] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errEmail, setErrEmail] = useState<string | null>(null)
  const [errPassword, setErrPassword] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)
  const [recuperarAbierto, setRecuperarAbierto] = useState(false)

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_EMAIL)
      if (guardado) {
        setEmail(guardado)
        setSaveEmail(true)
      }
    } catch {
      // almacenamiento bloqueado: se entra igual, solo sin recordar el correo
    }
  }, [])

  function validar() {
    let ok = true
    setErrEmail(null)
    setErrPassword(null)
    if (!email.trim()) {
      setErrEmail(t('login:typeEmail'))
      ok = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrEmail(t('login:invalidEmail'))
      ok = false
    }
    if (!password) {
      setErrPassword(t('login:typePassword'))
      ok = false
    }
    return ok
  }

  const [porConfirmar, setPorConfirmar] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    if (!validar()) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error && /email not confirmed/i.test(error.message)) {
      // Se registró pero no puso el código: se le manda uno nuevo y lo confirma acá mismo.
      setPorConfirmar(email.trim())
      return
    }
    if (error) {
      // Supabase responde siempre en ingles; el modulo pide el mensaje traducido.
      setFeedback({ kind: 'error', message: mensajeError(error) })
      return
    }
    try {
      if (saveEmail) localStorage.setItem(CLAVE_EMAIL, email.trim())
      else localStorage.removeItem(CLAVE_EMAIL)
    } catch {
      // sin almacenamiento no se recuerda, pero el login ya fue exitoso
    }
    nav(destinoTrasLogin(), { replace: true })
  }

  const lineaError = 'border-b-2 border-danger'

  return (
    <div className="app-shell app-bg-pro flex flex-col">
      <OfflineBanner />
      {porConfirmar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-[380px] bg-surface-light rounded-[20px] p-6">
            <VerificarCorreo email={porConfirmar} reenviarAlAbrir onVerificado={() => nav(destinoTrasLogin(), { replace: true })} onCambiar={() => setPorConfirmar(null)} />
          </div>
        </div>
      )}
      <div className="relative z-10 flex flex-col min-h-dvh">
        <SelectorIdioma className="absolute right-4 top-[calc(env(safe-area-inset-top)+12px)]" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-8">
          <RutynLogo size={90} />
          <div className="text-white font-black text-rt-22 tracking-tight text-center">
            {t('identification:welcome')}
          </div>
        </div>

        <div className="bg-surface-light rounded-t-[10px] px-6 pt-8 pb-[calc(env(safe-area-inset-bottom)+24px)]">
          <form onSubmit={submit} noValidate className="flex flex-col gap-6">
            <div>
              <label className="block text-rt-11 text-ink-placeholder font-semibold">{t('email')}</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={'input-light-underline ' + (errEmail ? lineaError : '')}
              />
              {errEmail && <div className="text-[10px] text-danger mt-1">{errEmail}</div>}
            </div>

            <div className="relative">
              <label className="block text-rt-11 text-ink-placeholder font-semibold">{t('password')}</label>
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={'input-light-underline pr-8 ' + (errPassword ? lineaError : '')}
              />
              <button
                type="button"
                className="absolute right-0 top-[26px] text-brand"
                onClick={() => setShowPw((v) => !v)}
                aria-label={t('general:showPassword')}
              >
                {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errPassword && <div className="text-[10px] text-danger mt-1">{errPassword}</div>}
            </div>

            <div className="flex justify-end -mt-3">
              <button
                type="button"
                onClick={() => setRecuperarAbierto(true)}
                className="text-rt-11 font-bold text-brand-ink"
              >
                {t('login:forgot')}
              </button>
            </div>

            <label className="flex items-center gap-2 text-rt-13 text-ink-dark -mt-2">
              <input
                type="checkbox"
                checked={saveEmail}
                onChange={(e) => setSaveEmail(e.target.checked)}
                className="accent-brand w-6 h-6"
              />
              <span>{t('login:savePassword')}</span>
            </label>

            <button type="submit" disabled={loading} className="btn-primary-pill">
              {loading ? (
                <span className="inline-block w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                t('login:enter')
              )}
            </button>

            <div className="text-center pt-2">
              <Link to="/identificacao" className="text-rt-16 font-bold text-brand-ink">
                {t('login:signUp')}
              </Link>
            </div>
          </form>
        </div>
      </div>

      {recuperarAbierto && (
        <RecuperarSenhaDialog
          emailInicial={email}
          onCancel={() => setRecuperarAbierto(false)}
          onEnviado={(mensaje) => {
            setRecuperarAbierto(false)
            setFeedback({ kind: 'success', message: mensaje })
          }}
        />
      )}

      {feedback && (
        <FeedbackDialog
          kind={feedback.kind}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}
    </div>
  )
}

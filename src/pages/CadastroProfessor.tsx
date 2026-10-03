import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { WhatsAppInput } from '@/components/WhatsAppInput'
import { RutynLogo } from '@/components/RutynLogo'
import { SelectSheet } from '@/components/SelectSheet'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { countryByCode } from '@/lib/countries'
import { idiomaDe } from '@/lib/catalogos'
import { mensajeError } from '@/lib/errores'
import { enIframe, abrirFuera } from '@/lib/embed'
import { VerificarCorreo } from '@/components/VerificarCorreo'
import type { Session } from '@supabase/supabase-js'

export function CadastroProfessorPage() {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  // Incrustado en la landing (rutyn.com.br): lo que sale del formulario abre la app completa, fuera del iframe.
  const embebido = enIframe() || new URLSearchParams(window.location.search).get('embed') === '1'
  const caja = useRef<HTMLDivElement>(null)
  // Incrustado: fondo transparente y la landing ajusta el alto del iframe al formulario.
  useEffect(() => {
    if (!embebido) return
    document.documentElement.classList.add('embed')
    const el = caja.current
    if (!el) return
    const avisar = () => window.parent.postMessage({ rutynAltura: Math.ceil(el.getBoundingClientRect().height) }, '*')
    const ro = new ResizeObserver(avisar)
    ro.observe(el)
    avisar()
    return () => ro.disconnect()
  }, [embebido])
  const lang = idiomaDe(i18n.language)
  const [porConfirmar, setPorConfirmar] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const [countryCode, setCountryCode] = useState(lang === 'es' ? 'UY' : 'BR')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<'M' | 'F' | 'X' | ''>('')
  const [accept, setAccept] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!accept) { setError(t('general:acceptTerms')); return }
    if (!gender) { setError(t('general:chooseGender')); return }
    if (password !== confirmPassword) { setError(t('signupTeacher:passwordMismatch')); return }
    setError(null)
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'teacher',
          full_name: name,
          country: countryCode,
          phone: `${countryByCode(countryCode)?.dial}${phone}`,
          gender,
          language: lang,
        },
      },
    })
    setLoading(false)
    if (error) { setError(mensajeError(error)); return }

    // Correo ya registrado: Supabase no lo dice con un error, devuelve un usuario sin identidades.
    if (data.user && !data.session && data.user.identities?.length === 0) { setError(t('general:verify.exists')); return }
    if (data.session) { entrar(data.session); return }
    // Falta confirmar el correo con el código que se acaba de enviar.
    setPorConfirmar(email.trim())
  }

  function entrar(s: Session) {
    if (embebido) {
      // La sesión viaja en el hash: la app la toma al abrir (detectSessionInUrl).
      abrirFuera(`/professor?lang=${lang}#access_token=${s.access_token}&refresh_token=${s.refresh_token}&expires_in=${s.expires_in}&expires_at=${s.expires_at}&token_type=bearer&type=signup`)
      return
    }
    nav('/professor', { replace: true })
  }

  return (
    <div className={embebido ? 'w-full' : 'app-shell app-bg-pro flex flex-col'}>
      <div ref={caja} className={embebido ? 'flex flex-col' : 'relative z-10 flex flex-col min-h-dvh'}>
        {!embebido && <div className="relative px-6 pt-[calc(env(safe-area-inset-top)+8px)] pb-5">
          {!embebido && <button
            onClick={() => nav(-1)}
            aria-label={t('back')}
            className="absolute left-2 top-[calc(env(safe-area-inset-top)+8px)] w-9 h-9 flex items-center justify-center text-white"
          >
            <ArrowLeft size={20} />
          </button>}
          <div className="flex flex-col items-center gap-2.5 pt-2">
            <RutynLogo size={70} />
            <div className="text-white font-bold text-rt-16">{t('signupTeacher:greeting')}</div>
          </div>
        </div>}

        <div className={embebido
          ? 'bg-surface-light rounded-[20px] px-6 pt-6 pb-6'
          : 'flex-1 bg-surface-light rounded-t-[10px] px-6 pt-5 pb-[calc(env(safe-area-inset-bottom)+24px)]'}>
          {embebido ? (
            <div className="text-center mb-5">
              <h1 className="text-ink-dark font-bold text-rt-22">{t('signupTeacher:embedTitle')}</h1>
              <p className="text-brand font-semibold text-rt-13 mt-1">{t('signupTeacher:embedSub')}</p>
            </div>
          ) : (
            <h1 className="text-center text-brand font-bold text-rt-18 mb-4">{t('signupTeacher:fillData')}</h1>
          )}
          {porConfirmar && <VerificarCorreo email={porConfirmar} onVerificado={entrar} onCambiar={() => setPorConfirmar(null)} />}
          <form onSubmit={submit} className={'flex-col ' + (porConfirmar ? 'hidden ' : 'flex ') + (embebido ? 'gap-3' : 'gap-6')}>
            <div>
              <label className="block text-rt-11 text-ink-placeholder font-semibold">{t('signupTeacher:fullName')}</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={embebido ? t('signupTeacher:fullName') : undefined} className="input-light-underline" />
            </div>

            <WhatsAppInput countryCode={countryCode} onCountry={setCountryCode} value={phone} onChange={setPhone} lang={lang} placeholder={embebido ? 'WhatsApp' : undefined} />

            <div>
              <label className="block text-rt-11 text-ink-placeholder font-semibold">{t('email')}</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={embebido ? t('email') : undefined} className="input-light-underline" />
            </div>

            <div className="relative">
              <label className="block text-rt-11 text-ink-placeholder font-semibold">{t('password')}</label>
              <input type={showPw ? 'text' : 'password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={embebido ? t('password') : undefined} className="input-light-underline pr-8" />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-0 bottom-2 text-brand" aria-label={t('general:showPassword')}>
                {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="relative">
              <label className="block text-rt-11 text-ink-placeholder font-semibold">{t('signupTeacher:confirmPassword')}</label>
              <input
                type={showPw2 ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={embebido ? t('signupTeacher:confirmPassword') : undefined}
                className="input-light-underline pr-8"
              />
              <button type="button" onClick={() => setShowPw2((v) => !v)} className="absolute right-0 bottom-2 text-brand" aria-label={t('general:showPassword')}>
                {showPw2 ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <SelectSheet
              label={t('signupTeacher:gender')}
              title={t('signupTeacher:gender')}
              value={gender}
              onChange={setGender}
              options={[
                { value: 'M', label: t('gender:male') },
                { value: 'F', label: t('gender:female') },
                { value: 'X', label: t('gender:other') },
              ]}
            />

            <div className="flex items-start gap-2 text-rt-11 text-ink-muted">
              <input
                type="checkbox"
                checked={accept}
                onChange={(e) => setAccept(e.target.checked)}
                className="accent-brand mt-0.5 w-6 h-6 shrink-0"
                aria-label={t('signupTeacher:acceptPrefix') + t('signupTeacher:termsLink')}
              />
              <span className="pt-1">
                {t('signupTeacher:acceptPrefix')}
                <button
                  type="button"
                  onClick={() => (embebido ? window.open(window.location.origin + '/termos', '_blank') : nav('/termos'))}
                  className="text-brand font-semibold underline text-left"
                >
                  {t('signupTeacher:termsLink')}
                </button>
              </span>
            </div>

            <div className="mt-2 flex flex-col gap-3">
              <button type="submit" disabled={loading} className="btn-primary-pill">
                {loading ? t('loading') : t('signupTeacher:register')}
              </button>

              {/* En la landing solo se registra: el login está en la app. */}
              {!embebido && (
                <button type="button" onClick={() => nav('/login')} className="text-[#4C6524] font-bold text-rt-16">
                  {t('signupTeacher:doLogin')}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
      {error && (
        <FeedbackDialog kind="error" message={error} onClose={() => setError(null)} />
      )}
    </div>
  )
}

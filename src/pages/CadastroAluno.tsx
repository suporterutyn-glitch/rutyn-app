import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { WhatsAppInput } from '@/components/WhatsAppInput'
import { RutynLogo } from '@/components/RutynLogo'
import { countryByCode } from '@/lib/countries'

export function CadastroAlunoPage() {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const lang = (i18n.language.startsWith('es') ? 'es' : 'pt') as 'pt' | 'es'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const [countryCode, setCountryCode] = useState(lang === 'es' ? 'UY' : 'BR')
  const [phone, setPhone] = useState('')
  const [hasTeacher, setHasTeacher] = useState(false)
  const [teacherEmail, setTeacherEmail] = useState('')
  const [accept, setAccept] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!accept) { setError('Aceite os termos'); return }
    if (password !== confirmPassword) { setError(t('signupTeacher:passwordMismatch')); return }
    setError(null)
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'student',
          full_name: name,
          country: countryCode,
          phone: `${countryByCode(countryCode)?.dial}${phone}`,
          language: lang,
          teacher_email: hasTeacher ? teacherEmail : null,
        },
      },
    })
    setLoading(false)
    if (error) { setError(error.message); return }

    // Ensure profile has student role
    if (data.user) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'student' })
        .eq('id', data.user.id)
      if (updateError) console.error('Error updating profile role:', updateError)
    }

    if (data.session) nav(hasTeacher ? '/aguardando' : '/aluno/encontrar-professor', { replace: true })
    else nav('/login', { replace: true })
  }

  return (
    <div className="app-shell app-bg-pro flex flex-col">
      <div className="relative z-10 flex flex-col min-h-dvh">
        <div className="relative px-6 pt-[calc(env(safe-area-inset-top)+8px)] pb-5">
          <button
            onClick={() => nav(-1)}
            aria-label={t('back')}
            className="absolute left-2 top-[calc(env(safe-area-inset-top)+8px)] w-9 h-9 flex items-center justify-center text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col items-center gap-2.5 pt-2">
            <RutynLogo size={70} />
            <div className="text-white font-bold text-rt-16">{t('signupStudent:greeting')}</div>
          </div>
        </div>

        <div className="flex-1 bg-surface-light rounded-t-[10px] px-6 pt-5 pb-[calc(env(safe-area-inset-bottom)+24px)]">
          <h1 className="text-center text-brand font-bold text-rt-18 mb-4">{t('signupTeacher:fillData')}</h1>
          <form onSubmit={submit} className="flex flex-col gap-6">
            <div>
              <label className="block text-rt-11 text-ink-placeholder font-semibold">{t('signupTeacher:fullName')}</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="input-light-underline" />
            </div>

            <WhatsAppInput countryCode={countryCode} onCountry={setCountryCode} value={phone} onChange={setPhone} lang={lang} />

            <div>
              <label className="block text-rt-11 text-ink-placeholder font-semibold">{t('email')}</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-light-underline" />
            </div>

            <div className="relative">
              <label className="block text-rt-11 text-ink-placeholder font-semibold">{t('password')}</label>
              <input type={showPw ? 'text' : 'password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input-light-underline pr-8" />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-0 bottom-2 text-brand" aria-label="Mostrar senha">
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
                className="input-light-underline pr-8"
              />
              <button type="button" onClick={() => setShowPw2((v) => !v)} className="absolute right-0 bottom-2 text-brand" aria-label="Mostrar senha">
                {showPw2 ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <label className="flex items-center gap-2 text-rt-13 text-ink-dark">
              <input type="checkbox" checked={hasTeacher} onChange={(e) => setHasTeacher(e.target.checked)} className="accent-brand" />
              <span>{t('signupStudent:hasTeacher')}</span>
            </label>

            {hasTeacher && (
              <div>
                <label className="block text-rt-11 text-ink-placeholder font-semibold">{t('signupStudent:teacherEmail')}</label>
                <input type="email" required value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} className="input-light-underline" />
              </div>
            )}

            <label className="flex items-start gap-2 text-rt-11 text-ink-muted">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="accent-brand mt-0.5" />
              <span>{t('signupTeacher:acceptTerms')}</span>
            </label>

            {error && <div className="text-rt-11 text-danger">{error}</div>}

            <div className="mt-2 flex flex-col gap-3">
              <button type="submit" disabled={loading} className="btn-primary-pill">
                {loading ? t('loading') : t('signupTeacher:register')}
              </button>

              <button
                type="button"
                onClick={() => nav('/login')}
                className="text-[#4C6524] font-bold text-rt-16"
              >
                {t('signupTeacher:doLogin')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase, errorDeLinkRecuperacion } from '@/lib/supabase'

export function RedefinirSenhaPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (errorDeLinkRecuperacion) return
    // getSession espera a que supabase procese el token del link.
    void supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (pw.length < 6) { setError(t('general:rs.tooShort')); return }
    if (pw !== pw2) { setError(t('general:rs.mismatch')); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setSaving(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => nav('/', { replace: true }), 1500)
  }

  return (
    <div className="app-shell app-bg-pro flex flex-col">
      <div className="relative z-10 flex flex-col min-h-dvh px-6 pt-[calc(env(safe-area-inset-top)+16px)]">
        <button onClick={() => nav('/login')} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>

        <div className="flex-1 flex flex-col justify-center gap-6">
          <h1 className="text-white text-rt-22 font-bold">{t('general:rs.title')}</h1>

          {!ready ? (
            <div className="flex flex-col gap-4">
              <p className="text-white/80 text-rt-13">
                {errorDeLinkRecuperacion === 'otp_expired'
                  ? t('general:rs.expired')
                  : errorDeLinkRecuperacion
                    ? t('general:rs.invalid')
                    : t('general:rs.openLink')}
              </p>
              {errorDeLinkRecuperacion && (
                <button onClick={() => nav('/login', { replace: true })} className="btn-save">{t('general:rs.backToLogin')}</button>
              )}
            </div>
          ) : done ? (
            <div className="card-dark p-4 flex items-center gap-3 border-brand/40">
              <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xl">✓</div>
              <div className="text-white text-rt-14">{t('general:rs.done')}</div>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="relative">
                <label className="block text-white text-rt-13 font-semibold mb-2">{t('general:rs.newPassword')}</label>
                <input
                  type={show ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="input-dark pr-10"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-11 text-brand" aria-label={t('general:showPassword')}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div>
                <label className="block text-white text-rt-13 font-semibold mb-2">{t('general:rs.confirmPassword')}</label>
                <input
                  type={show ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  className="input-dark"
                  autoComplete="new-password"
                />
              </div>


              <button type="submit" disabled={saving} className="btn-save mt-4">
                {saving ? t('loading') : t('general:rs.save')}
              </button>
            </form>
          )}
        </div>
      </div>
      {error && (
        <FeedbackDialog kind="error" message={error} onClose={() => setError(null)} />
      )}
    </div>
  )
}

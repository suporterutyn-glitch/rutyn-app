import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { OfflineBanner } from '@/components/OfflineBanner'

export function LoginPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    nav('/', { replace: true })
  }

  async function signInWith(provider: 'google' | 'apple') {
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })
  }

  return (
    <div className="app-shell app-bg-pro flex flex-col">
      <OfflineBanner />
      <div className="relative z-10 flex flex-col min-h-dvh">
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6">
          <div className="w-[90px] h-[90px] rounded-full bg-gradient-to-tr from-[#3A3A3A] to-[#050505] flex items-center justify-center">
            <span className="text-brand-light text-rt-32 font-black">R</span>
          </div>
          <div className="text-white font-black text-rt-29 tracking-tight">rutyn</div>
        </div>

        <div className="bg-surface-light rounded-t-[10px] px-6 pt-8 pb-[calc(env(safe-area-inset-bottom)+24px)]">
          <form onSubmit={submit} className="flex flex-col gap-6">
            <div>
              <label className="block text-rt-11 text-ink-placeholder font-semibold">{t('email')}</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-light-underline"
                placeholder=""
                required
              />
            </div>
            <div className="relative">
              <label className="block text-rt-11 text-ink-placeholder font-semibold">{t('password')}</label>
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-light-underline pr-8"
                required
              />
              <button
                type="button"
                className="absolute right-0 bottom-2 text-brand"
                onClick={() => setShowPw((v) => !v)}
                aria-label="Mostrar senha"
              >
                {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="flex justify-end">
              <Link to="/esqueci-senha" className="text-rt-11 font-bold text-brand-ink">
                {t('login:forgot')}
              </Link>
            </div>

            {error && <div className="text-rt-11 text-danger">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary-pill">
              {loading ? t('loading') : t('login:enter')}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-ink-underline" />
              <span className="text-ink-muted text-rt-11">ou</span>
              <div className="flex-1 h-px bg-ink-underline" />
            </div>

            <button type="button" className="btn-google" onClick={() => signInWith('google')}>
              <span className="text-lg font-bold">G</span>
              <span>{t('login:google')}</span>
            </button>

            <button type="button" className="btn-apple" onClick={() => signInWith('apple')}>
              <span className="text-xl"></span>
              <span>{t('login:apple')}</span>
            </button>

            <div className="text-center pt-2">
              <Link to="/identificacao" className="text-rt-16 font-bold text-brand-ink">
                {t('login:signUp')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'

export function EsqueciSenhaPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/redefinir-senha` })
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="app-shell app-bg-pro flex flex-col">
      <div className="relative z-10 flex flex-col min-h-dvh px-6 pt-[calc(env(safe-area-inset-top)+16px)]">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex flex-col justify-center gap-6">
          <h1 className="text-white text-rt-22 font-bold">{t('recover:title')}</h1>
          {sent ? (
            <p className="text-white/80 text-rt-14">{t('recover:sent')}</p>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <label className="text-white text-rt-13 font-semibold">{t('email')}</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-dark" />
              <button className="btn-save mt-4" disabled={loading}>
                {loading ? t('loading') : t('recover:send')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

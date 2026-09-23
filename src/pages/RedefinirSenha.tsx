import { useEffect, useState } from 'react'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'

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
    // Supabase detectSessionInUrl processa o hash automaticamente
    // e dispara PASSWORD_RECOVERY. Aguardamos a sessão ficar disponível.
    void (async () => {
      const { data } = await supabase.auth.getSession()
      setReady(!!data.session)
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (pw.length < 6) { setError('Senha muito curta (mínimo 6 caracteres)'); return }
    if (pw !== pw2) { setError('Senhas não coincidem'); return }
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
          <h1 className="text-white text-rt-22 font-bold">Redefinir senha</h1>

          {!ready ? (
            <p className="text-white/80 text-rt-13">Abra o link enviado ao seu e-mail para redefinir a senha.</p>
          ) : done ? (
            <div className="card-dark p-4 flex items-center gap-3 border-brand/40">
              <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xl">✓</div>
              <div className="text-white text-rt-14">Senha atualizada com sucesso.</div>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="relative">
                <label className="block text-white text-rt-13 font-semibold mb-2">Nova senha</label>
                <input
                  type={show ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="input-dark pr-10"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-11 text-brand" aria-label="Mostrar senha">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div>
                <label className="block text-white text-rt-13 font-semibold mb-2">Confirmar senha</label>
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
                {saving ? t('loading') : 'Salvar nova senha'}
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

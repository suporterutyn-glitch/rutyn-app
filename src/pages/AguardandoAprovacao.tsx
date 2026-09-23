import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Hourglass, Info, Search, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const PLAZO_DIAS = 30

type Professor = { full_name: string | null; email: string | null; avatar_url: string | null }

export function AguardandoAprovacaoPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { profile, refresh, signOut } = useAuth()
  const [checking, setChecking] = useState(false)
  const [professor, setProfessor] = useState<Professor | null>(null)

  // El plazo cuenta desde la creación de la cuenta, no desde que se abre la pantalla.
  const creado = profile?.created_at ? new Date(profile.created_at).getTime() : null
  const diasPasados = creado ? Math.floor((Date.now() - creado) / 86400000) : 0
  const daysLeft = Math.max(0, PLAZO_DIAS - diasPasados)
  const urgent = daysLeft <= 7

  useEffect(() => {
    if (profile?.link_status === 'active') nav('/aluno', { replace: true })
  }, [profile, nav])

  useEffect(() => {
    if (!profile?.teacher_id) { setProfessor(null); return }
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', profile.teacher_id)
        .maybeSingle()
      setProfessor((data as Professor | null) ?? null)
    })()
  }, [profile?.teacher_id])

  async function check() {
    setChecking(true)
    await refresh()
    setChecking(false)
  }

  const primerNombre = professor?.full_name?.trim().split(/\s+/)[0] ?? ''

  return (
    <div className="app-shell app-bg-pro flex flex-col">
      <div className="relative z-10 flex flex-col min-h-dvh px-6 pt-[calc(env(safe-area-inset-top)+40px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <div className="flex justify-center mb-7">
          <div className="w-[200px] h-[200px] rounded-full bg-surface-raised border-[3px] border-warning flex items-center justify-center animate-logo-breathe shadow-[0_0_40px_rgba(255,152,0,0.35)]">
            <Hourglass size={72} className="text-warning" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-white text-rt-26 font-bold text-center mb-4">{t('waiting:title')}</h1>
        <p className="text-center text-white/70 text-rt-14 leading-relaxed mb-7">
          {t('waiting:created')}
        </p>

        {professor && (
          <div className="card-dark p-4 flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-surface-raised border border-brand/50 flex items-center justify-center overflow-hidden shrink-0">
              {professor.avatar_url ? (
                <img src={professor.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={26} className="text-brand" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-brand text-rt-13 font-semibold">{t('waiting:requestedTeacher')}</div>
              <div className="text-white text-rt-18 font-bold truncate">{professor.full_name}</div>
              <div className="text-white/50 text-rt-13 truncate">{professor.email}</div>
            </div>
            <span className="shrink-0 text-rt-12 font-semibold px-3 py-1.5 rounded-btn-pill bg-warning/25 text-warning">
              {t('waiting:pending')}
            </span>
          </div>
        )}

        <div
          className={
            'rounded-card p-4 flex items-start gap-3 mb-6 ' +
            (urgent ? 'bg-danger/20 text-danger' : 'bg-warning/15 text-warning')
          }
        >
          <Info size={20} className="shrink-0 mt-0.5" />
          <p className="text-rt-14 leading-snug">{t('waiting:subtitle', { days: daysLeft })}</p>
        </div>

        <div className="flex flex-col gap-3 mt-auto">
          <button className="btn-save gap-2" onClick={() => nav('/aluno/encontrar-professor')}>
            <Search size={20} />
            {t('waiting:change')}
          </button>
          <button className="btn-outline-white gap-2" onClick={check} disabled={checking}>
            <Hourglass size={20} />
            {checking
              ? t('loading')
              : professor
                ? t('waiting:waitFor', { name: primerNombre })
                : t('waiting:check')}
          </button>
          <button className="text-white/50 text-rt-14 font-medium py-2" onClick={signOut}>
            {t('waiting:logout')}
          </button>
        </div>
      </div>
    </div>
  )
}

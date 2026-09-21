import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'

export function AguardandoAprovacaoPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { profile, refresh, signOut } = useAuth()
  const [checking, setChecking] = useState(false)

  const created = profile ? new Date().getTime() : Date.now()
  const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - created) / 86400000))
  const urgent = daysLeft <= 7

  useEffect(() => {
    if (profile?.link_status === 'active') nav('/aluno', { replace: true })
  }, [profile, nav])

  async function check() {
    setChecking(true)
    await refresh()
    setChecking(false)
  }

  return (
    <div className="app-shell app-bg-pro flex flex-col">
      <div className="relative z-10 flex flex-col min-h-dvh px-6 pt-[calc(env(safe-area-inset-top)+32px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <h1 className="text-white text-rt-22 font-bold text-center mb-6">{t('waiting:title')}</h1>

        <div className="card-dark p-5 flex flex-col items-center gap-3 mb-6">
          <div className="w-20 h-20 rounded-full bg-surface-raised" />
          <div className="text-white text-rt-16 font-bold">Professor solicitado</div>
          <span className="text-rt-9 font-semibold uppercase px-2 py-1 rounded-xs bg-warning text-black">Pendente</span>
        </div>

        <p className={'text-center text-rt-14 mb-6 ' + (urgent ? 'text-danger' : 'text-white/80')}>
          {t('waiting:subtitle', { days: daysLeft })}
        </p>

        <div className="flex flex-col gap-3 mt-auto">
          <button className="btn-save" onClick={check} disabled={checking}>
            {checking ? t('loading') : t('waiting:check')}
          </button>
          <button className="btn-outline-white" onClick={() => nav('/aluno/encontrar-professor')}>
            {t('waiting:change')}
          </button>
          <button className="text-white/70 text-rt-13 font-semibold py-2" onClick={signOut}>
            {t('waiting:logout')}
          </button>
        </div>
      </div>
    </div>
  )
}

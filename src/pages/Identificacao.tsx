import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserCircle2 } from 'lucide-react'
import { LanguageToggle } from '@/components/LanguageToggle'
import { OfflineBanner } from '@/components/OfflineBanner'

export function IdentificacaoPage() {
  const nav = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="app-shell app-bg-pro flex flex-col">
      <OfflineBanner />
      <div className="relative z-10 flex flex-col min-h-dvh px-6 pt-[env(safe-area-inset-top)]">
        <div className="flex justify-end pt-4">
          <LanguageToggle />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-[110px] h-[110px] rounded-full bg-gradient-to-tr from-[#3A3A3A] to-[#050505] flex items-center justify-center">
            <span className="text-brand-light text-rt-40 font-black">R</span>
          </div>
          <div className="text-white font-black text-rt-32 tracking-tight">rutyn</div>
          <div className="text-white/70 text-rt-13">{t('identification:tagline')}</div>
        </div>

        <div className="flex flex-col gap-4 pb-[calc(env(safe-area-inset-bottom)+32px)]">
          <button
            className="btn-primary-pill gap-3"
            onClick={() => nav('/cadastro/professor')}
          >
            <UserCircle2 size={32} strokeWidth={1.5} />
            <span>{t('identification:imTeacher')}</span>
            <span className="w-8" />
          </button>

          <button
            className="btn-outline-white"
            onClick={() => nav('/cadastro/aluno')}
          >
            <UserCircle2 size={32} strokeWidth={1.5} />
            <span>{t('identification:imStudent')}</span>
          </button>

          <button
            className="text-white/80 text-rt-13 font-semibold underline"
            onClick={() => nav('/login')}
          >
            {t('identification:login')}
          </button>
        </div>
      </div>
    </div>
  )
}

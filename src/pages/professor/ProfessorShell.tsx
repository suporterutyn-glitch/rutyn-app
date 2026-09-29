import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { tomarIntencion } from '@/lib/intencionCompra'
import { FolderKanban, Users, Home, MessageCircle, Wallet, Crown, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { OfflineBanner } from '@/components/OfflineBanner'
import { ProfessorBottomNav } from '@/components/professor/BottomNav'
import { BarraLateral } from '@/components/BarraLateral'

export function ProfessorShell() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const loc = useLocation()
  useEffect(() => {
    const i = tomarIntencion()
    if (i && loc.pathname !== '/professor/assinatura') {
      nav(`/professor/assinatura?comprar=1&plan=${i.plan}&seats=${i.seats}`, { replace: true })
    }
  }, [])
  return (
    <div className="app-shell app-panel app-bg-pro">
      <BarraLateral
        base="/professor"
        principales={[
          { to: '/professor', icon: Home, label: t('professor:tabs.home'), exacto: true },
          { to: '/professor/alunos', icon: Users, label: t('professor:tabs.students') },
          { to: '/professor/projetos', icon: FolderKanban, label: t('professor:tabs.projects') },
          { to: '/professor/mensagens', icon: MessageCircle, label: t('professor:tabs.messages') },
          { to: '/professor/financeiro', icon: Wallet, label: t('professor:tabs.financial') },
        ]}
        cuenta={[
          { to: '/professor/convites', icon: Mail, label: t('navegacion:invites') },
          { to: '/professor/assinatura', icon: Crown, label: t('navegacion:subscription') },
        ]}
      />
      <OfflineBanner />
      <main className="app-main relative min-h-dvh pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-10">
        <Outlet />
      </main>
      <ProfessorBottomNav />
    </div>
  )
}

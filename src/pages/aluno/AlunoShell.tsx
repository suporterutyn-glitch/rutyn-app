import { Outlet } from 'react-router-dom'
import { Dumbbell, Salad, Home, MessageCircle, ClipboardList, Receipt } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { OfflineBanner } from '@/components/OfflineBanner'
import { AlunoBottomNav } from '@/components/aluno/BottomNav'
import { BarraLateral } from '@/components/BarraLateral'

export function AlunoShell() {
  const { t } = useTranslation()
  return (
    <div className="app-shell app-panel app-bg">
      <BarraLateral
        base="/aluno"
        principales={[
          { to: '/aluno', icon: Home, label: t('aluno:tabs.home'), exacto: true },
          { to: '/aluno/treinos', icon: Dumbbell, label: t('aluno:tabs.workouts') },
          { to: '/aluno/nutricao', icon: Salad, label: t('aluno:tabs.nutrition') },
          { to: '/aluno/chat', icon: MessageCircle, label: t('aluno:tabs.chat') },
          { to: '/aluno/avaliacao', icon: ClipboardList, label: t('aluno:tabs.assessment') },
        ]}
        cuenta={[{ to: '/aluno/mensalidade', icon: Receipt, label: t('navegacion:monthly') }]}
      />
      <OfflineBanner />
      <main className="app-main min-h-dvh pb-[calc(105px+env(safe-area-inset-bottom))] lg:pb-10">
        <Outlet />
      </main>
      <AlunoBottomNav />
    </div>
  )
}

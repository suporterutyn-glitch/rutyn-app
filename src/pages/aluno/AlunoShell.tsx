import { Outlet } from 'react-router-dom'
import { OfflineBanner } from '@/components/OfflineBanner'
import { AlunoBottomNav } from '@/components/aluno/BottomNav'

export function AlunoShell() {
  return (
    <div className="app-shell app-bg">
      <OfflineBanner />
      <div className="min-h-dvh pb-[calc(105px+env(safe-area-inset-bottom))]">
        <Outlet />
      </div>
      <AlunoBottomNav />
    </div>
  )
}

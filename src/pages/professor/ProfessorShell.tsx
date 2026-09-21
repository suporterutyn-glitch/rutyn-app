import { Outlet } from 'react-router-dom'
import { OfflineBanner } from '@/components/OfflineBanner'
import { ProfessorBottomNav } from '@/components/professor/BottomNav'

export function ProfessorShell() {
  return (
    <div className="app-shell app-bg-pro">
      <OfflineBanner />
      <div className="relative min-h-dvh pb-[calc(80px+env(safe-area-inset-bottom))]">
        <Outlet />
      </div>
      <ProfessorBottomNav />
    </div>
  )
}

import { useAuth } from '@/lib/auth'
import { LanguageToggle } from '@/components/LanguageToggle'

export function ProfessorHomePlaceholder() {
  const { profile, signOut } = useAuth()
  return (
    <div className="app-shell app-bg-pro">
      <div className="relative z-10 flex flex-col min-h-dvh px-4 pt-[calc(env(safe-area-inset-top)+16px)] gap-4">
        <div className="flex items-center justify-between">
          <div className="text-white text-rt-20 font-bold">Olá, {profile?.full_name?.split(' ')[0] ?? 'Professor'}</div>
          <LanguageToggle />
        </div>
        <div className="card-dark p-4 text-white text-rt-14">
          Fase 1 concluída · área do professor será construída na fase 2.
        </div>
        <button className="btn-outline-white mt-auto mb-6" onClick={signOut}>Sair</button>
      </div>
    </div>
  )
}

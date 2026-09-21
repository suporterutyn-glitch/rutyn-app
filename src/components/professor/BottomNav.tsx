import { NavLink, useLocation } from 'react-router-dom'
import { FolderKanban, Users, Home, MessageCircle, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function ProfessorBottomNav() {
  const loc = useLocation()
  const { t } = useTranslation()
  const items = [
    { to: '/professor/projetos', icon: FolderKanban, label: t('professor:tabs.projects') },
    { to: '/professor/alunos', icon: Users, label: t('professor:tabs.students') },
    { to: '/professor', icon: Home, label: t('professor:tabs.home'), center: true },
    { to: '/professor/mensagens', icon: MessageCircle, label: t('professor:tabs.messages') },
    { to: '/professor/financeiro', icon: Wallet, label: t('professor:tabs.financial') },
  ]
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app bg-nav rounded-b-nav"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="h-[5px] bg-brand-h" />
      <ul className="flex items-end justify-around h-[75px] px-2">
        {items.map((it) => {
          const isHome = it.to === '/professor'
          const active = isHome ? loc.pathname === '/professor' : loc.pathname.startsWith(it.to)
          const Icon = it.icon
          if (it.center) {
            return (
              <li key={it.to} className="flex-1 flex items-start justify-center -mt-6">
                <NavLink
                  to={it.to}
                  end
                  className={
                    'w-[60px] h-[60px] rounded-full bg-brand-d shadow-nav-center flex items-center justify-center ' +
                    (active ? '' : 'opacity-60')
                  }
                >
                  <Icon size={26} className="text-white" strokeWidth={2.2} />
                </NavLink>
              </li>
            )
          }
          return (
            <li key={it.to} className="flex-1">
              <NavLink to={it.to} end={false} className="flex flex-col items-center gap-1 py-3">
                <Icon size={22} className={active ? 'text-brand' : 'text-ink-muted'} strokeWidth={active ? 2.4 : 1.8} />
                <span className={'text-[10px] font-semibold ' + (active ? 'text-brand' : 'text-ink-muted')}>{it.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

import { NavLink, useLocation } from 'react-router-dom'
import { Dumbbell, Salad, Home, MessageCircle, ClipboardList } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AlunoBottomNav() {
  const loc = useLocation()
  const { t } = useTranslation()
  const items = [
    { to: '/aluno/treinos', icon: Dumbbell, label: t('aluno:tabs.workouts') },
    { to: '/aluno/nutricao', icon: Salad, label: t('aluno:tabs.nutrition') },
    { to: '/aluno', icon: Home, label: t('aluno:tabs.home'), center: true },
    { to: '/aluno/chat', icon: MessageCircle, label: t('aluno:tabs.chat') },
    { to: '/aluno/avaliacao', icon: ClipboardList, label: t('aluno:tabs.assessment') },
  ]
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app bg-surface-nav rounded-b-nav"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="h-[5px] bg-brand-h" />
      <ul className="flex items-end justify-around h-[85px] px-2">
        {items.map((it) => {
          const isHome = it.to === '/aluno'
          const active = isHome ? loc.pathname === '/aluno' : loc.pathname.startsWith(it.to)
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

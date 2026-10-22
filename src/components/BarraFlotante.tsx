import { NavLink, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

export type ItemBarra = { to: string; icon: LucideIcon; label: string; center?: boolean }

/**
 * Barra inferior flotante (estilo Instagram): una píldora separada de los bordes,
 * semitransparente y con desenfoque, así el contenido se ve pasar por detrás.
 */
export function BarraFlotante({ items, inicio }: { items: ItemBarra[]; inicio: string }) {
  const loc = useLocation()
  return (
    <nav
      className="lg:hidden fixed left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[406px] md:max-w-[520px] z-20"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
    >
      <ul className="flex items-center justify-around h-[64px] px-1.5 rounded-full bg-surface-nav/80 backdrop-blur-xl border border-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
        {items.map((it) => {
          const active = it.to === inicio ? loc.pathname === inicio : loc.pathname.startsWith(it.to)
          const Icon = it.icon
          if (it.center) {
            return (
              <li key={it.to} className="flex-1 flex justify-center">
                <NavLink
                  to={it.to}
                  end
                  aria-label={it.label}
                  className={
                    'w-[50px] h-[50px] rounded-full bg-brand-d shadow-nav-center flex items-center justify-center transition active:scale-95 ' +
                    (active ? '' : 'opacity-70')
                  }
                >
                  <Icon size={24} className="text-white" strokeWidth={2.2} />
                </NavLink>
              </li>
            )
          }
          return (
            <li key={it.to} className="flex-1 flex justify-center">
              <NavLink
                to={it.to}
                end={false}
                className={
                  'flex flex-col items-center justify-center gap-0.5 w-full max-w-[72px] h-[52px] rounded-full transition active:scale-95 ' +
                  (active ? 'bg-black/10' : '')
                }
              >
                <Icon size={21} className={active ? 'text-[#4E7F23]' : 'text-ink-muted'} strokeWidth={active ? 2.4 : 1.8} />
                <span className={'text-[9.5px] font-semibold leading-none ' + (active ? 'text-[#4E7F23]' : 'text-ink-muted')}>{it.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

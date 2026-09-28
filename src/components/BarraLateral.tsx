import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Bell, Settings, UserRound, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { RutynLogo } from '@/components/RutynLogo'
import { LanguageToggle } from '@/components/LanguageToggle'

export type ItemNav = { to: string; icon: LucideIcon; label: string; exacto?: boolean }

/**
 * Navegación de escritorio (≥1024px) estilo SaaS: en el celular estas mismas
 * rutas viven en la barra inferior y en los íconos de la cabecera de Inicio.
 */
export function BarraLateral({ principales, cuenta, base }: { principales: ItemNav[]; cuenta: ItemNav[]; base: string }) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const loc = useLocation()
  const [sinLeer, setSinLeer] = useState(0)

  // Se recuenta al cambiar de pantalla: al abrir Notificaciones quedan leídas.
  useEffect(() => {
    if (!profile?.id) return
    let vivo = true
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).is('read_at', null)
      .then(({ count }) => { if (vivo) setSinLeer(count ?? 0) })
    return () => { vivo = false }
  }, [profile?.id, loc.pathname])

  const extras: ItemNav[] = [
    { to: `${base}/notificacoes`, icon: Bell, label: t('navegacion:notifications') },
    ...cuenta,
    { to: `${base}/perfil`, icon: UserRound, label: t('navegacion:profile'), exacto: true },
    { to: `${base}/configuracoes`, icon: Settings, label: t('navegacion:settings') },
  ]

  const enlace = (it: ItemNav) => {
    const activo = it.exacto ? loc.pathname === it.to : loc.pathname === it.to || loc.pathname.startsWith(it.to + '/')
    const Icon = it.icon
    const esAvisos = it.to.endsWith('/notificacoes')
    return (
      <li key={it.to}>
        <NavLink
          to={it.to}
          end={it.exacto}
          className={
            'flex items-center gap-3 h-11 px-3 rounded-[10px] text-rt-14 font-semibold transition-colors ' +
            (activo ? 'bg-brand/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/5')
          }
        >
          <Icon size={20} className={activo ? 'text-brand' : ''} strokeWidth={activo ? 2.4 : 1.9} />
          <span className="flex-1 truncate">{it.label}</span>
          {esAvisos && sinLeer > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
              {sinLeer > 99 ? '99+' : sinLeer}
            </span>
          )}
        </NavLink>
      </li>
    )
  }

  const nombre = profile?.full_name ?? ''
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[var(--lado-w)] flex-col bg-[#141414] border-r border-white/[0.06]">
      <div className="flex items-center gap-3 px-5 h-[72px] shrink-0">
        <RutynLogo size={36} />
        <span className="text-white text-rt-20 font-extrabold tracking-tight">Rutyn</span>
      </div>
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 pb-4">
        <div className="px-3 pt-2 pb-2 text-white/35 text-rt-11 font-bold uppercase tracking-wider">{t('navegacion:main')}</div>
        <ul className="flex flex-col gap-1">{principales.map(enlace)}</ul>
        <div className="px-3 pt-6 pb-2 text-white/35 text-rt-11 font-bold uppercase tracking-wider">{t('navegacion:account')}</div>
        <ul className="flex flex-col gap-1">{extras.map(enlace)}</ul>
      </nav>
      <div className="shrink-0 border-t border-white/[0.06] p-4 flex items-center gap-3">
        <NavLink to={`${base}/perfil`} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-surface-raised overflow-hidden flex items-center justify-center shrink-0">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-white text-rt-15 font-bold">{nombre.charAt(0).toUpperCase()}</span>}
          </div>
          <div className="min-w-0">
            <div className="text-white text-rt-13 font-semibold truncate">{nombre}</div>
            <div className="text-white/45 text-rt-11">{t(base === '/professor' ? 'navegacion:teacher' : 'navegacion:student')}</div>
          </div>
        </NavLink>
        <LanguageToggle />
      </div>
    </aside>
  )
}

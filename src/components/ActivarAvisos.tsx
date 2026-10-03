import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BellRing, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { asegurarPush, isPushSupported, subscribeToPush } from '@/lib/push'

const CLAVE = 'rutyn_avisos_oculto'

/**
 * Tarjeta en la home para activar las notificaciones del celular. Solo aparece si el dispositivo
 * las soporta y todavía no se le preguntó. En iPhone eso pasa recién con la app instalada.
 */
export function ActivarAvisos() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [permiso, setPermiso] = useState<NotificationPermission>(() => (isPushSupported() ? Notification.permission : 'denied'))
  const [oculto, setOculto] = useState(() => { try { return localStorage.getItem(CLAVE) === '1' } catch { return false } })
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Si ya dio permiso (en este u otro momento), se asegura de que este dispositivo esté registrado.
  useEffect(() => { if (profile?.id) void asegurarPush(profile.id) }, [profile?.id])

  if (!profile?.id || !isPushSupported() || permiso !== 'default' || oculto) return null

  async function activar() {
    setOcupado(true); setError(null)
    const r = await subscribeToPush(profile!.id)
    setOcupado(false)
    setPermiso(Notification.permission)
    if (!r.ok && Notification.permission === 'default') setError(r.error ?? null)
  }

  function ocultar() {
    try { localStorage.setItem(CLAVE, '1') } catch { /* sin almacenamiento: vuelve a aparecer */ }
    setOculto(true)
  }

  return (
    <div className="relative mb-5 rounded-card border border-brand/50 bg-brand/10 p-4 flex items-center gap-3">
      <span className="w-11 h-11 rounded-[12px] bg-brand flex items-center justify-center shrink-0"><BellRing size={22} className="text-white" /></span>
      <div className="flex-1 min-w-0">
        <div className="text-white text-rt-14 font-bold">{t('general:alerts.title')}</div>
        <div className="text-white/70 text-rt-12">{error ?? t(profile.role === 'teacher' ? 'general:alerts.teacher' : 'general:alerts.student')}</div>
      </div>
      <button disabled={ocupado} onClick={() => void activar()} className="shrink-0 h-9 px-4 rounded-btn-pill bg-brand text-white text-rt-12 font-bold disabled:opacity-60">
        {t('general:alerts.on')}
      </button>
      <button onClick={ocultar} aria-label={t('general:install.hide')} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-surface-raised border border-surface-line flex items-center justify-center">
        <X size={12} className="text-white/70" />
      </button>
    </div>
  )
}

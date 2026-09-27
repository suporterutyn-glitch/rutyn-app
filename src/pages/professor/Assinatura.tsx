import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Minus, Plus, Sparkles, UserPen } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { BASIC, PRECIO_PLAN, monedaPlan, precioPlan, planVisible, type PlanVisible } from '@/lib/plans'
import { localeDe } from '@/lib/fechas'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { mensajeError } from '@/lib/errores'

type Accion = { action: 'checkout'; plan: 'basic' | 'pro'; seats?: number } | { action: 'cancel' | 'resume' | 'portal' }

export function AssinaturaPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const { profile, refresh } = useAuth()
  const moneda = monedaPlan(profile?.country)
  const P = PRECIO_PLAN[moneda]
  const fmt = (v: number) => precioPlan(v, moneda)
  const actual = planVisible(profile?.plan)
  const pago = actual !== 'free'
  const [activos, setActivos] = useState(0)
  const pedidos = Number(params.get('seats')) || 0
  const [seats, setSeats] = useState(() => clamp(pedidos || profile?.plan_seats || BASIC.min))
  const [enviando, setEnviando] = useState(false)
  const [confirmar, setConfirmar] = useState<null | { accion: Accion; titulo: string; detalle: string }>(null)
  const [aviso, setAviso] = useState<null | { kind: 'error' | 'success'; message: string }>(null)

  const fin = profile?.plan_expires_at ? new Date(profile.plan_expires_at).toLocaleDateString(localeDe()) : ''
  const minSeats = Math.max(BASIC.min, activos)

  useEffect(() => {
    if (!profile?.id) return
    void supabase.rpc('alumnos_activos', { p_teacher: profile.id }).then(({ data }) => {
      const n = (data as number) ?? 0
      setActivos(n)
      setSeats((s) => clamp(Math.max(s, n)))
    })
  }, [profile?.id])

  // Vuelta del Checkout: el webhook puede tardar unos segundos en activar el plan.
  useEffect(() => {
    if (params.get('ok') !== '1') return
    setParams({}, { replace: true })
    let vueltas = 0
    const id = setInterval(async () => {
      vueltas++
      const { data } = await supabase.from('profiles').select('plan').eq('id', profile?.id ?? '').maybeSingle()
      const listo = planVisible(data?.plan) !== 'free'
      if (listo) await refresh()
      if (listo || vueltas >= 8) {
        clearInterval(id)
        setAviso({ kind: 'success', message: t(listo ? 'planes:success' : 'planes:processing') })
      }
    }, 1500)
    return () => clearInterval(id)
  }, [])

  async function ejecutar(accion: Accion) {
    setConfirmar(null)
    setEnviando(true)
    const { data, error } = await supabase.functions.invoke('stripe-create-checkout', { body: accion })
    const fallo = (data as any)?.error ?? (error ? await leerError(error) : null)
    if (fallo) { setEnviando(false); setAviso({ kind: 'error', message: mensajeError(fallo) }); return }
    const url = (data as any)?.url as string | undefined
    if (url) { window.location.href = url; return }
    await refresh()
    setEnviando(false)
    setAviso({ kind: 'success', message: t('planes:changed') })
  }

  const perfilIncompleto = !profile?.profile_complete
  const irACompletar = () => nav('/professor/perfil/completar?volver=/professor/assinatura')

  function elegir(plan: 'basic' | 'pro') {
    if (perfilIncompleto) { irACompletar(); return }
    const accion: Accion = { action: 'checkout', plan, ...(plan === 'basic' ? { seats } : {}) }
    if (pago) setConfirmar({ accion, titulo: t('planes:changeQ'), detalle: t('planes:changeDetail') })
    else void ejecutar(accion)
  }

  const esBasicActual = actual === 'basic' && (profile?.plan_seats ?? BASIC.min) === seats
  const cancelado = !!profile?.plan_cancel_at_period_end

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-8">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center text-white" aria-label={t('back')}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">{t('planes:title')}</h1>
      </div>

      {perfilIncompleto && (
        <button onClick={irACompletar} className="w-full mb-5 rounded-card bg-warning-card p-4 flex items-center gap-3 text-left">
          <span className="w-10 h-10 rounded-lg bg-white/25 flex items-center justify-center shrink-0"><UserPen size={20} className="text-black" /></span>
          <span className="flex-1">
            <span className="block text-black text-rt-14 font-bold">{t('planes:completeTitle')}</span>
            <span className="block text-black/75 text-rt-12 mt-0.5">{t('planes:completeBody')}</span>
          </span>
        </button>
      )}

      {pago && (
        <div className="rounded-card p-4 mb-5 bg-plan-premium border border-brand">
          <div className="text-white/80 text-rt-11 font-semibold uppercase tracking-wider">{t('planes:current')}</div>
          <div className="text-white text-rt-20 font-bold mt-1">
            {t(`planes:name.${actual}`)}
            {actual === 'basic' && <span className="text-white/80 text-rt-14 font-normal"> · {t('planes:basic.total', { n: profile?.plan_seats ?? BASIC.min, price: fmt((profile?.plan_seats ?? BASIC.min) * P.alumno) })}</span>}
            {actual === 'pro' && <span className="text-white/80 text-rt-14 font-normal"> · {fmt(P.pro)}{t('planes:perMonth')}</span>}
          </div>
          <div className="text-white/80 text-rt-12 mt-1">{t('planes:activeNow', { count: activos })}</div>
          {profile?.plan_status === 'past_due'
            ? <div className="text-warning text-rt-12 font-semibold mt-1">{t('planes:pastDue')}</div>
            : fin && <div className="text-white/70 text-rt-12 mt-1">{t(cancelado ? 'planes:ends' : 'planes:renews', { date: fin })}</div>}
          <div className="flex gap-2 mt-3">
            <button disabled={enviando} onClick={() => void ejecutar({ action: 'portal' })} className="flex-1 h-10 rounded-btn-pill bg-white/15 text-white text-rt-13 font-semibold">
              {t('planes:managePayment')}
            </button>
            {cancelado ? (
              <button disabled={enviando} onClick={() => void ejecutar({ action: 'resume' })} className="flex-1 h-10 rounded-btn-pill bg-white text-grey-900 text-rt-13 font-bold">
                {t('planes:resume')}
              </button>
            ) : (
              <button disabled={enviando} onClick={() => setConfirmar({ accion: { action: 'cancel' }, titulo: t('planes:cancelQ'), detalle: t('planes:cancelDetail', { date: fin }) })} className="flex-1 h-10 rounded-btn-pill bg-black/25 text-white/90 text-rt-13 font-semibold">
                {t('planes:cancel')}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="text-white text-rt-22 font-bold mb-1">{t('planes:choose')}</div>
      {!pago && <div className="text-white/70 text-rt-13 mb-4">{t('planes:activeNow', { count: activos })}</div>}

      <div className="flex flex-col gap-3 mb-6 mt-3">
        <Tarjeta plan="free" actual={actual} titulo={t('planes:name.free')} bajada={t('planes:free.tagline')}
          precio={t('planes:name.free')} rasgos={[t('planes:free.f1'), t('planes:free.f2')]}>
          <Boton activo={actual === 'free'} texto={actual === 'free' ? t('planes:currentPlan') : t('planes:toFree')} tono="claro"
            onClick={() => !cancelado && setConfirmar({ accion: { action: 'cancel' }, titulo: t('planes:cancelQ'), detalle: t('planes:cancelDetail', { date: fin }) })}
            deshabilitado={enviando || cancelado} />
        </Tarjeta>

        <Tarjeta plan="basic" actual={actual} titulo={t('planes:name.basic')} bajada={t('planes:basic.tagline')}
          precio={<>{fmt(P.alumno)} <span className="text-rt-13 text-white/70 font-normal">{t('planes:perStudent')}{t('planes:perMonth')}</span></>}
          rasgos={[t('planes:basic.min', { n: BASIC.min }), t('planes:basic.f1'), t('planes:basic.f2')]}>
          <div className="rounded-[14px] bg-black/25 p-3 mb-3">
            <div className="text-white/80 text-rt-12 mb-2">{t('planes:basic.howMany')}</div>
            <div className="flex items-center justify-between">
              <button onClick={() => setSeats((s) => Math.max(minSeats, s - 1))} disabled={seats <= minSeats}
                className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center disabled:opacity-30" aria-label="-">
                <Minus size={18} />
              </button>
              <div className="text-center">
                <div className="text-white text-rt-29 font-bold leading-none">{seats}</div>
                <div className="text-brand-light text-rt-13 font-semibold mt-1">{fmt(seats * P.alumno)}{t('planes:perMonth')}</div>
              </div>
              <button onClick={() => setSeats((s) => Math.min(BASIC.max, s + 1))} disabled={seats >= BASIC.max}
                className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center disabled:opacity-30" aria-label="+">
                <Plus size={18} />
              </button>
            </div>
            {seats >= 25 && (
              <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-tone-purple-tag/40 px-3 py-2 text-white text-rt-12">
                <Sparkles size={16} className="shrink-0" />
                <span>{t('planes:proHint', { price: fmt(P.pro) })}</span>
              </div>
            )}
          </div>
          <Boton activo={esBasicActual} deshabilitado={enviando || esBasicActual}
            texto={esBasicActual ? t('planes:currentPlan') : actual === 'basic' ? t('planes:change', { n: seats }) : pago ? t('planes:switchTo', { plan: t('planes:name.basic') }) : t('planes:subscribe')}
            onClick={() => elegir('basic')} />
        </Tarjeta>

        <Tarjeta plan="pro" actual={actual} destacado={t('planes:bestValue')} titulo={t('planes:name.pro')} bajada={t('planes:pro.tagline')}
          precio={<>{fmt(P.pro)}<span className="text-rt-13 text-white/70 font-normal">{t('planes:perMonth')}</span></>}
          rasgos={[t('planes:pro.f1'), t('planes:pro.f2', { price: fmt(P.alumno) }), t('planes:pro.f3')]}>
          <Boton activo={actual === 'pro'} deshabilitado={enviando || actual === 'pro'}
            texto={actual === 'pro' ? t('planes:currentPlan') : pago ? t('planes:switchTo', { plan: t('planes:name.pro') }) : t('planes:subscribe')}
            onClick={() => elegir('pro')} />
        </Tarjeta>
      </div>

      <div className="text-white/50 text-rt-11 text-center">{t('planes:note', { currency: t(moneda === 'brl' ? 'planes:currencyBrl' : 'planes:currencyUsd') })}</div>

      {confirmar && (
        <ConfirmDialog
          message={confirmar.titulo}
          detail={confirmar.detalle}
          confirmLabel={confirmar.accion.action === 'cancel' ? t('planes:cancel') : t('planes:confirm')}
          tone={confirmar.accion.action === 'cancel' ? 'danger' : undefined}
          onConfirm={() => void ejecutar(confirmar.accion)}
          onCancel={() => setConfirmar(null)}
        />
      )}
      {aviso && <FeedbackDialog kind={aviso.kind} message={aviso.message} onClose={() => setAviso(null)} />}
    </div>
  )
}

function clamp(n: number) {
  return Math.min(BASIC.max, Math.max(BASIC.min, Math.round(n)))
}

/** supabase.functions.invoke esconde el cuerpo en los errores HTTP. */
async function leerError(error: any): Promise<unknown> {
  try { return (await error?.context?.json?.())?.error ?? error } catch { return error }
}

function Tarjeta({ plan, actual, titulo, bajada, precio, rasgos, destacado, children }: {
  plan: PlanVisible; actual: PlanVisible; titulo: string; bajada: string; precio: React.ReactNode
  rasgos: string[]; destacado?: string; children: React.ReactNode
}) {
  const { t } = useTranslation()
  const activo = plan === actual
  return (
    <div className={
      'rounded-card p-4 border ' +
      (activo ? 'bg-plan-premium border-brand shadow-glow-lg' :
       plan === 'pro' ? 'bg-surface-card border-tone-purple-tag' : 'bg-surface-card border-surface-divider')
    }>
      <div className="flex items-center justify-between mb-0.5">
        <div className="text-white text-rt-18 font-bold">{titulo}</div>
        {activo ? <span className="text-rt-9 font-bold px-2 py-0.5 rounded-xs bg-brand text-white">{t('planes:current')}</span>
          : destacado && <span className="text-rt-9 font-bold tracking-[0.5px] px-2 py-0.5 rounded-xs bg-tone-purple-tag text-white">{destacado}</span>}
      </div>
      <div className="text-white/60 text-rt-12 mb-2">{bajada}</div>
      <div className="text-white text-rt-29 font-bold leading-none mb-3">{precio}</div>
      <ul className="flex flex-col gap-1 mb-4">
        {rasgos.map((f) => (
          <li key={f} className="flex items-center gap-2 text-white/90 text-rt-12">
            <Check size={14} className="text-brand-light shrink-0" /> {f}
          </li>
        ))}
      </ul>
      {children}
    </div>
  )
}

function Boton({ texto, activo, deshabilitado, onClick, tono }: {
  texto: string; activo: boolean; deshabilitado?: boolean; onClick: () => void; tono?: 'claro'
}) {
  return (
    <button onClick={onClick} disabled={deshabilitado}
      className={'w-full h-11 rounded-btn-pill font-bold text-rt-14 disabled:cursor-default ' +
        (activo ? 'bg-white/20 text-white' : tono === 'claro' ? 'bg-white/95 text-danger-strong disabled:opacity-60' : 'bg-purchase text-white shadow-glow disabled:opacity-60')}>
      {texto}
    </button>
  )
}

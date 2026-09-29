import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, UserPen } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { BASIC, MAX_BASIC, PRECIO_PLAN, monedaPlan, precioBasico, precioPlan, planVisible, type PlanVisible } from '@/lib/plans'
import { localeDe } from '@/lib/fechas'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { mensajeError } from '@/lib/errores'

type Accion = { action: 'checkout'; plan: 'basic' | 'pro'; seats?: number } | { action: 'cancel' | 'resume' | 'portal' }

export function AssinaturaPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const { profile, refresh, congeladaDesde } = useAuth()
  const moneda = monedaPlan(profile?.country)
  const P = PRECIO_PLAN[moneda]
  const fmt = (v: number) => precioPlan(v, moneda)
  const actual = planVisible(profile?.plan)
  const pago = actual !== 'free'
  const [activos, setActivos] = useState(0)
  const pedidos = Number(params.get('seats')) || 0
  const [n, setN] = useState(() => pedidos || (actual === 'pro' ? MAX_BASIC[moneda] + 1 : profile?.plan_seats || 1))
  const [enviando, setEnviando] = useState(false)
  const [confirmar, setConfirmar] = useState<null | { accion: Accion; titulo: string; detalle: string }>(null)
  const [aviso, setAviso] = useState<null | { kind: 'error' | 'success'; message: string }>(null)

  const fin = profile?.plan_expires_at ? new Date(profile.plan_expires_at).toLocaleDateString(localeDe()) : ''
  // Bajar por debajo de los alumnos vinculados no se puede: primero hay que eliminar.
  const sobran = Math.max(0, activos - n)
  const elegido: PlanVisible = n <= 1 ? 'free' : n <= MAX_BASIC[moneda] ? 'basic' : 'pro'
  const total = elegido === 'free' ? 0 : elegido === 'pro' ? P.pro : precioBasico(n, moneda)

  useEffect(() => {
    if (!profile?.id) return
    // Activos y suspendidos: los dos ocupan lugar en el plan.
    void supabase.from('profiles').select('id', { count: 'exact', head: true })
      .eq('teacher_id', profile.id).eq('role', 'student').in('link_status', ['active', 'suspended'])
      .then(({ count }) => {
        const v = count ?? 0
        setActivos(v)
        setN((x) => Math.max(x, v))
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
    const agendado = (data as any)?.scheduled ? new Date((data as any).at).toLocaleDateString(localeDe()) : null
    setAviso({ kind: 'success', message: agendado ? t('planes:scheduled', { date: agendado }) : t('planes:changed') })
  }

  const perfilIncompleto = !profile?.profile_complete
  // Al volver de completar el perfil se retoma la compra elegida y se va directo al checkout.
  const irACompletar = (eleccion?: { plan: 'basic' | 'pro'; cantidad: number }) => {
    const q = eleccion ? `?comprar=1&plan=${eleccion.plan}&seats=${eleccion.cantidad}` : window.location.search
    nav('/professor/perfil/completar?volver=' + encodeURIComponent('/professor/assinatura' + q))
  }

  function elegir(plan: 'basic' | 'pro', cantidad: number) {
    if (perfilIncompleto) { irACompletar({ plan, cantidad }); return }
    const accion: Accion = { action: 'checkout', plan, ...(plan === 'basic' ? { seats: cantidad } : {}) }
    const baja = (actual === 'pro' && plan === 'basic') || (actual === 'basic' && plan === 'basic' && cantidad < (profile?.plan_seats ?? 0))
    if (pago) setConfirmar({ accion, titulo: t('planes:changeQ'), detalle: baja ? t('planes:downDetail', { date: fin }) : t('planes:changeDetail') })
    else void ejecutar(accion)
  }

  // Viene de la landing con un plan elegido: se va directo al checkout (solo si todavía no paga).
  useEffect(() => {
    if (params.get('comprar') !== '1' || !profile?.id) return
    const plan = params.get('plan') === 'pro' ? 'pro' : 'basic'
    const cant = clamp(Number(params.get('seats')) || BASIC.min, moneda)
    if (perfilIncompleto) { irACompletar(); return }
    setParams({}, { replace: true })
    if (pago) return
    setN(cant)
    elegir(plan, cant)
  }, [profile?.id])

  const cancelado = !!profile?.plan_cancel_at_period_end
  const esActual = elegido === actual && (elegido !== 'basic' || (profile?.plan_seats ?? BASIC.min) === n)

  function elegirCalculado() {
    if (elegido === 'free') {
      setConfirmar({ accion: { action: 'cancel' }, titulo: t('planes:cancelQ'), detalle: t('planes:cancelDetail', { date: fin }) })
      return
    }
    elegir(elegido, n)
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-8">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center text-white" aria-label={t('back')}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">{t('planes:title')}</h1>
      </div>

      {congeladaDesde && (
        <div className="mb-5 p-4 rounded-card bg-danger/15 border border-danger">
          <div className="text-danger text-rt-15 font-bold">{t('planes:frozen.teacherTitle')}</div>
          <div className="text-white/85 text-rt-13 mt-1">
            {t('planes:frozen.teacherBody', {
              since: new Date(congeladaDesde).toLocaleDateString(localeDe()),
              until: new Date(new Date(congeladaDesde).getTime() + 60 * 86400000).toLocaleDateString(localeDe()),
            })}
          </div>
          {profile?.stripe_customer_id && (
            <button disabled={enviando} onClick={() => void ejecutar({ action: 'portal' })} className="btn-save mt-3">{t('planes:frozen.payNow')}</button>
          )}
        </div>
      )}

      {perfilIncompleto && (
        <button onClick={() => irACompletar()} className="w-full mb-5 rounded-card bg-warning-card p-4 flex items-center gap-3 text-left">
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
            {actual === 'basic' && <span className="text-white/80 text-rt-14 font-normal"> · {t('planes:basic.total', { n: profile?.plan_seats ?? BASIC.min, price: fmt(precioBasico(profile?.plan_seats ?? BASIC.min, moneda)) })}</span>}
            {actual === 'pro' && <span className="text-white/80 text-rt-14 font-normal"> · {fmt(P.pro)}{t('planes:perMonth')}</span>}
          </div>
          <div className="text-white/80 text-rt-12 mt-1">{t('planes:activeNow', { count: activos })}</div>
          {profile?.plan_status === 'past_due'
            ? <div className="text-warning text-rt-12 font-semibold mt-1">{t('planes:pastDue')}</div>
            : fin && <div className="text-white/70 text-rt-12 mt-1">{t(cancelado ? 'planes:ends' : 'planes:renews', { date: fin })}</div>}
          {profile?.plan_pending_at && (
            <div className="mt-2 text-warning text-rt-12 font-semibold">
              {t('planes:pending', {
                date: new Date(profile.plan_pending_at).toLocaleDateString(localeDe()),
                plan: t(`planes:name.${planVisible(profile.plan_pending_plan)}`),
                n: profile.plan_pending_seats ?? '∞',
              })}
            </div>
          )}
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

      <div className="text-white text-rt-22 font-bold mb-3">{t('planes:choose')}</div>

      <div className="rounded-card p-5 mb-4 bg-surface-card border border-brand/40 max-w-xl lg:mx-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white text-rt-14 font-semibold">{t('planes:basic.howMany')}</span>
          <span className="text-brand text-rt-24 font-bold">{n}</span>
        </div>
        <input
          type="range" min={1} max={100} value={n}
          onChange={(e) => setN(Number(e.target.value))}
          className="w-full accent-brand"
          aria-label={t('planes:basic.howMany')}
        />
        {activos > 1 && <div className="text-white/50 text-rt-11 mt-1">{t('planes:activeNow', { count: activos })}</div>}

        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div><div className="text-white/60 text-rt-11">{t('planes:calc.plan')}</div><div className="text-white text-rt-16 font-bold">{t(`planes:name.${elegido}`)}</div></div>
          <div><div className="text-white/60 text-rt-11">{t('planes:calc.month')}</div><div className="text-white text-rt-16 font-bold">{fmt(total)}</div></div>
          <div><div className="text-white/60 text-rt-11">{t('planes:calc.each')}</div><div className="text-white text-rt-16 font-bold">{fmt(total ? total / n : 0)}</div></div>
        </div>

        {sobran > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-danger/10 border border-danger text-rt-12">
            <div className="text-danger font-semibold">{t('planes:mustDelete', { count: sobran, total: activos, n })}</div>
            <button onClick={() => nav('/professor/alunos')} className="mt-2 text-white underline text-rt-12 font-semibold">{t('planes:goStudents')}</button>
          </div>
        )}

        <button
          disabled={enviando || esActual || sobran > 0 || (elegido === 'free' && cancelado)}
          onClick={elegirCalculado}
          className="btn-save mt-5 disabled:opacity-50"
        >
          {esActual ? t('planes:currentPlan')
            : elegido === 'free' ? t('planes:toFree')
            : t('planes:calc.choose', { price: fmt(total) })}
        </button>
        <div className="text-white/50 text-rt-11 text-center mt-2">
          {elegido === 'free' ? t('planes:free.f1')
            : elegido === 'pro' ? t('planes:pro.f1')
            : `${t('planes:basic.includes', { n: BASIC.incluidos })} · ${t('planes:basic.extra', { price: fmt(P.extra) })}`}
        </div>
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

function clamp(n: number, moneda: 'usd' | 'brl') {
  return Math.min(MAX_BASIC[moneda], Math.max(BASIC.min, Math.round(n)))
}

/** supabase.functions.invoke esconde el cuerpo en los errores HTTP. */
async function leerError(error: any): Promise<unknown> {
  try { return (await error?.context?.json?.())?.error ?? error } catch { return error }
}

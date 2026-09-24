import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { PLAN_LIMITS, PLAN_LABEL, PLAN_PRICES, currencyOf, formatMoney } from '@/lib/plans'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FeedbackDialog } from '@/components/FeedbackDialog'

type Plan = 'free' | 'pro' | 'master' | 'elite'

const FEATURES: Record<Plan, string[]> = {
  free: ['prof:plan.f_basic'],
  pro: ['prof:plan.f_marketplace', 'prof:plan.f_support'],
  master: ['prof:plan.f_allPro', 'prof:plan.f_featured'],
  elite: ['prof:plan.f_allMaster', 'prof:plan.f_insights'],
}

export function AssinaturaPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { profile, refresh } = useAuth()
  const currency = currencyOf(profile?.country)
  const [pro, master, elite] = PLAN_PRICES[currency] ?? [0, 0, 0]
  const current = profile?.plan ?? 'free'
  const [confirmandoFree, setConfirmandoFree] = useState(false)
  const [errorCheckout, setErrorCheckout] = useState<string | null>(null)

  async function voltarParaFree() {
    if (!profile?.id) return
    setConfirmandoFree(false)
    const { error } = await supabase.from('profiles').update({ plan: 'free', plan_expires_at: null }).eq('id', profile.id)
    if (error) { setErrorCheckout(error.message); return }
    await refresh()
    nav(-1)
  }

  async function selectPlan(p: Plan) {
    if (!profile?.id) return
    if (p === 'free') {
      if (current === 'free') return
      setConfirmandoFree(true)
      return
    }
    // Planos pagos → Stripe Checkout via Edge Function
    const { data, error } = await supabase.functions.invoke('stripe-create-checkout', { body: { plan: p } })
    if (error || (data as any)?.error) {
      setErrorCheckout((data as any)?.error ?? error?.message ?? t('prof:plan.checkoutError'))
      return
    }
    const url = (data as any)?.url as string | undefined
    if (url) window.location.href = url
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-8">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">{t('prof:plan.title')}</h1>
      </div>

      <div className="text-white text-rt-22 font-bold mb-1">{t('prof:plan.choose')}</div>
      <div className="text-white/70 text-rt-13 mb-6">{t('general:extra.pricesIn', { c: currency })}</div>

      <div className="flex flex-col gap-3 mb-6">
        <PlanCard plan="free" price={0} currency={currency} active={current === 'free'} onPick={() => selectPlan('free')} />
        <PlanCard plan="pro" price={pro} currency={currency} active={current === 'pro'} onPick={() => selectPlan('pro')} />
        <PlanCard plan="master" price={master} currency={currency} active={current === 'master'} popular onPick={() => selectPlan('master')} />
        <PlanCard plan="elite" price={elite} currency={currency} active={current === 'elite'} onPick={() => selectPlan('elite')} />
      </div>

      <div className="text-white/50 text-rt-11 text-center">
        {t('prof:plan.monthlyNote')}
      </div>
      {confirmandoFree && (
        <ConfirmDialog
          message={t('prof:plan.cancelQ')}
          detail={t('prof:plan.cancelDetail')}
          confirmLabel={t('prof:plan.backFree')}
          tone="danger"
          onConfirm={() => void voltarParaFree()}
          onCancel={() => setConfirmandoFree(false)}
        />
      )}

      {errorCheckout && (
        <FeedbackDialog kind="error" message={errorCheckout} onClose={() => setErrorCheckout(null)} />
      )}
    </div>
  )
}

function PlanCard({
  plan, price, currency, active, popular, onPick,
}: {
  plan: Plan; price: number; currency: string; active: boolean; popular?: boolean; onPick: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className={
      'rounded-card p-4 border ' +
      (active ? 'bg-plan-premium border-brand shadow-glow-lg' :
       plan === 'free' ? 'bg-plan-free border-danger-wine' :
       'bg-surface-card border-surface-divider')
    }>
      <div className="flex items-center justify-between mb-2">
        <div className="text-white text-rt-18 font-bold">{PLAN_LABEL[plan]}</div>
        {popular && <span className="text-rt-9 font-bold tracking-[0.5px] px-2 py-0.5 rounded-xs bg-tone-purple-tag text-white">{t('prof:plan.popular')}</span>}
        {active && !popular && <span className="text-rt-9 font-bold px-2 py-0.5 rounded-xs bg-brand text-white">{t('prof:plan.current')}</span>}
      </div>
      <div className="text-white text-rt-32 font-bold leading-none mb-1">
        {price === 0 ? t('prof:plan.free') : formatMoney(price, currency)}
        {price > 0 && <span className="text-rt-13 text-white/70 font-normal"> /{t('general:extra.perMonth')}</span>}
      </div>
      <div className="text-white/80 text-rt-13 mb-3">{t('prof:plan.f_upTo', { n: PLAN_LIMITS[plan] })}</div>
      <ul className="flex flex-col gap-1 mb-4">
        {FEATURES[plan].map((f) => (
          <li key={f} className="flex items-center gap-2 text-white/90 text-rt-12">
            <Check size={14} className="text-brand-light" /> {t(f)}
          </li>
        ))}
      </ul>
      <button
        onClick={onPick}
        disabled={active}
        className={
          'w-full h-11 rounded-btn-pill text-white font-bold text-rt-14 ' +
          (active ? 'bg-white/20 cursor-default' :
           plan === 'free' ? 'bg-white/95 !text-danger-strong' :
           'bg-purchase shadow-glow')
        }
      >
        {active ? t('prof:plan.currentPlan') : plan === 'free' ? t('prof:plan.backFree') : t('prof:plan.subscribe')}
      </button>
    </div>
  )
}

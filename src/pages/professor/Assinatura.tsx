import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { PLAN_LIMITS, PLAN_LABEL, PLAN_PRICES, currencyOf, formatMoney } from '@/lib/plans'

type Plan = 'free' | 'pro' | 'master' | 'elite'

const FEATURES: Record<Plan, string[]> = {
  free: ['Até 2 alunos', 'Todas as funções básicas'],
  pro: ['Até 25 alunos', 'Marketplace ativo', 'Suporte prioritário'],
  master: ['Até 50 alunos', 'Todos os recursos Pro', 'Perfil em destaque'],
  elite: ['Até 100 alunos', 'Todos os recursos Master', 'Insights avançados'],
}

export function AssinaturaPage() {
  const nav = useNavigate()
  const { profile, refresh } = useAuth()
  const currency = currencyOf(profile?.country)
  const [pro, master, elite] = PLAN_PRICES[currency] ?? [0, 0, 0]
  const current = profile?.plan ?? 'free'

  async function selectPlan(p: Plan) {
    if (!profile?.id) return
    if (p === 'free') {
      if (current === 'free') return
      if (!confirm('Cancelar plano pago e voltar para Free?')) return
      await supabase.from('profiles').update({ plan: 'free', plan_expires_at: null }).eq('id', profile.id)
      await refresh()
      nav(-1)
      return
    }
    // Planos pagos → Stripe Checkout via Edge Function
    const { data, error } = await supabase.functions.invoke('stripe-create-checkout', { body: { plan: p } })
    if (error || (data as any)?.error) {
      alert((data as any)?.error ?? error?.message ?? 'Erro ao criar checkout')
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
        <h1 className="text-white text-rt-20 font-bold">Plano</h1>
      </div>

      <div className="text-white text-rt-22 font-bold mb-1">Escolha seu plano</div>
      <div className="text-white/70 text-rt-13 mb-6">Preços na sua moeda ({currency}). Cobrança mensal via provedor.</div>

      <div className="flex flex-col gap-3 mb-6">
        <PlanCard plan="free" price={0} currency={currency} active={current === 'free'} onPick={() => selectPlan('free')} />
        <PlanCard plan="pro" price={pro} currency={currency} active={current === 'pro'} onPick={() => selectPlan('pro')} />
        <PlanCard plan="master" price={master} currency={currency} active={current === 'master'} popular onPick={() => selectPlan('master')} />
        <PlanCard plan="elite" price={elite} currency={currency} active={current === 'elite'} onPick={() => selectPlan('elite')} />
      </div>

      <div className="text-white/50 text-rt-11 text-center">
        Assinatura mensal. Pode cancelar a qualquer momento.
      </div>
    </div>
  )
}

function PlanCard({
  plan, price, currency, active, popular, onPick,
}: {
  plan: Plan; price: number; currency: string; active: boolean; popular?: boolean; onPick: () => void
}) {
  return (
    <div className={
      'rounded-card p-4 border ' +
      (active ? 'bg-plan-premium border-brand shadow-glow-lg' :
       plan === 'free' ? 'bg-plan-free border-danger-wine' :
       'bg-surface-card border-divider')
    }>
      <div className="flex items-center justify-between mb-2">
        <div className="text-white text-rt-18 font-bold">{PLAN_LABEL[plan]}</div>
        {popular && <span className="text-rt-9 font-bold tracking-[0.5px] px-2 py-0.5 rounded-xs bg-tone-purple-tag text-white">MAIS POPULAR</span>}
        {active && !popular && <span className="text-rt-9 font-bold px-2 py-0.5 rounded-xs bg-brand text-white">ATUAL</span>}
      </div>
      <div className="text-white text-rt-32 font-bold leading-none mb-1">
        {price === 0 ? 'Grátis' : formatMoney(price, currency)}
        {price > 0 && <span className="text-rt-13 text-white/70 font-normal"> /mês</span>}
      </div>
      <div className="text-white/80 text-rt-13 mb-3">Até {PLAN_LIMITS[plan]} alunos</div>
      <ul className="flex flex-col gap-1 mb-4">
        {FEATURES[plan].map((f) => (
          <li key={f} className="flex items-center gap-2 text-white/90 text-rt-12">
            <Check size={14} className="text-brand-light" /> {f}
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
        {active ? 'Plano atual' : plan === 'free' ? 'Voltar para Free' : 'Assinar'}
      </button>
    </div>
  )
}

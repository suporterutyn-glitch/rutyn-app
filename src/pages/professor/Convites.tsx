import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, MessageSquare, User as UserIcon, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { currencyOf, formatMoney } from '@/lib/plans'
import { EmptyState, FullScreenSheet, Field } from './projetos/RoutinesTab'
import { PLAN_LIMITS } from '@/lib/plans'

type Invite = {
  id: string
  student_id: string
  status: string
  format: string | null
  amount: number | null
  frequency: number | null
  weekdays: number[] | null
  model: string | null
  objectives: string[] | null
  last_offer_by: string | null
  profiles?: { full_name: string | null; email: string | null; avatar_url: string | null }
}

export function ConvitesPage() {
  const nav = useNavigate()
  const { profile, refresh } = useAuth()
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCount, setActiveCount] = useState(0)

  const planLimit = PLAN_LIMITS[profile?.plan ?? 'free'] ?? 2
  const currency = currencyOf(profile?.country)
  const [counterOf, setCounterOf] = useState<Invite | null>(null)

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const [{ data: inv }, { count }] = await Promise.all([
      supabase.from('invites').select('*,profiles!invites_student_id_fkey(full_name,email,avatar_url)').eq('teacher_id', profile.id).in('status', ['pending', 'countered']).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('teacher_id', profile.id).eq('link_status', 'active'),
    ])
    setInvites((inv as Invite[]) ?? [])
    setActiveCount(count ?? 0)
    setLoading(false)
  }
  useEffect(() => { void load() }, [profile?.id])

  async function accept(inv: Invite) {
    if (activeCount >= planLimit) {
      alert('Limite de alunos atingido. Faça upgrade do plano.')
      nav('/professor/assinatura')
      return
    }
    // Vincula aluno + cria 1ª mensalidade
    const dueDay = 5
    const today = new Date()
    const due = new Date(today.getFullYear(), today.getMonth(), dueDay)
    if (due <= today) due.setMonth(due.getMonth() + 1)

    await supabase.from('invites').update({ status: 'accepted' }).eq('id', inv.id)
    await supabase.from('profiles').update({ teacher_id: profile!.id, link_status: 'active' }).eq('id', inv.student_id)
    await supabase.from('charges').insert({
      teacher_id: profile!.id, student_id: inv.student_id,
      format: (inv.format ?? 'monthly'), amount: Number(inv.amount ?? 0),
      due_date: due.toISOString().slice(0, 10), status: 'pending',
    })
    await supabase.from('notifications').insert({
      user_id: inv.student_id, type: 'invite', title: 'Proposta aceita!',
      body: `${profile!.full_name ?? 'Seu professor'} aceitou sua proposta.`,
    })
    await refresh()
    await load()
  }

  async function reject(inv: Invite) {
    await supabase.from('invites').update({ status: 'rejected' }).eq('id', inv.id)
    await supabase.from('notifications').insert({
      user_id: inv.student_id, type: 'invite', title: 'Proposta recusada',
      body: `${profile!.full_name ?? 'O professor'} recusou sua proposta.`,
    })
    await load()
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">Convites Recebidos</h1>
      </div>

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : invites.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Nenhum convite" body="Você não tem convites pendentes." />
      ) : (
        <ul className="flex flex-col gap-3">
          {invites.map((inv) => (
            <li key={inv.id} className="card-dark p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center overflow-hidden">
                  {inv.profiles?.avatar_url ? <img src={inv.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : <UserIcon size={22} className="text-grey-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-rt-14 font-bold truncate">{inv.profiles?.full_name ?? inv.profiles?.email ?? 'Aluno'}</div>
                  {inv.status === 'countered' && <div className="text-warning text-rt-11">Contraproposta enviada</div>}
                </div>
              </div>

              <div className="text-white text-rt-13 mb-2">
                <strong>{formatMoney(Number(inv.amount ?? 0), currency)}</strong> · {inv.format === 'monthly' ? 'Mensal' : 'Por hora'} · {inv.frequency}x/sem · {inv.model}
              </div>
              {inv.objectives && inv.objectives.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {inv.objectives.map((o) => <span key={o} className="text-rt-9 px-2 py-0.5 rounded-tag bg-surface-raised text-white/80">{o}</span>)}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => reject(inv)} className="flex-1 h-10 rounded-btn-pill bg-danger-wine text-white text-rt-13 font-semibold min-w-[80px]">Recusar</button>
                <button onClick={() => setCounterOf(inv)} className="flex-1 h-10 rounded-btn-pill border-[1.5px] border-warning text-warning text-rt-13 font-semibold min-w-[110px] flex items-center justify-center gap-1">
                  <RefreshCw size={14} /> Contrapor
                </button>
                <button onClick={() => accept(inv)} className="flex-1 h-10 rounded-btn-pill bg-brand text-white text-rt-13 font-semibold min-w-[90px] flex items-center justify-center gap-1">
                  <Check size={16} /> Aceitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {counterOf && (
        <CounterSheet
          invite={counterOf}
          currency={currency}
          onClose={() => setCounterOf(null)}
          onSent={() => { setCounterOf(null); void load() }}
        />
      )}
    </div>
  )
}

function CounterSheet({ invite, currency, onClose, onSent }: {
  invite: Invite; currency: string; onClose: () => void; onSent: () => void
}) {
  const { profile } = useAuth()
  const [amount, setAmount] = useState(String(invite.amount ?? ''))
  const [format, setFormat] = useState<'monthly' | 'hourly'>((invite.format as any) ?? 'monthly')
  const [freq, setFreq] = useState(invite.frequency ?? 3)
  const [saving, setSaving] = useState(false)

  async function send() {
    if (!profile?.id) return
    setSaving(true)
    await supabase.from('invites').update({
      amount: Number(amount) || 0,
      format, frequency: freq,
      status: 'countered', last_offer_by: 'teacher',
    }).eq('id', invite.id)
    await supabase.from('notifications').insert({
      user_id: invite.student_id, type: 'invite',
      title: 'Contraproposta recebida',
      body: `${profile.full_name ?? 'Seu professor'} enviou uma contraproposta.`,
    })
    setSaving(false)
    onSent()
  }

  return (
    <FullScreenSheet title="Contraproposta" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <div className="card-dark p-3 text-white/70 text-rt-12">
          Proposta do aluno: <strong className="text-white">{formatMoney(Number(invite.amount ?? 0), currency)}</strong> · {invite.frequency}x/sem
        </div>
        <Field label="Formato">
          <div className="flex gap-2">
            {(['monthly', 'hourly'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFormat(f)} className={
                'flex-1 h-10 rounded-btn-pill border text-rt-12 font-semibold ' +
                (format === f ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-grey-400')
              }>{f === 'monthly' ? 'Mensal' : 'Por hora'}</button>
            ))}
          </div>
        </Field>
        <Field label={`Novo valor (${currency})`}>
          <input inputMode="decimal" className="input-dark" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Frequência semanal">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button key={n} type="button" onClick={() => setFreq(n)} className={
                'w-9 h-9 rounded-full text-rt-12 font-semibold ' +
                (freq === n ? 'bg-brand text-white' : 'bg-surface-raised text-grey-400')
              }>{n}x</button>
            ))}
          </div>
        </Field>
      </div>
      <div className="mt-8">
        <button onClick={send} disabled={saving || !amount} className="btn-save">
          {saving ? 'Enviando…' : 'Enviar contraproposta'}
        </button>
      </div>
    </FullScreenSheet>
  )
}

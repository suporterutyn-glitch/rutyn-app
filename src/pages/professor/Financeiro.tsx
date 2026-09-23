import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Wallet, CheckCircle2, X, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { currencyOf, formatMoney } from '@/lib/plans'
import { EmptyState, FullScreenSheet, Field } from './projetos/RoutinesTab'

type Charge = {
  id: string
  student_id: string
  amount: number
  due_date: string
  status: 'pending' | 'awaiting' | 'paid' | 'rejected' | 'suspended'
  format: 'monthly' | 'hourly'
  paid_at: string | null
  student_declared_at: string | null
  profiles?: { full_name: string | null; email: string | null }
}

type StudentOpt = { id: string; full_name: string | null; email: string | null }

const STATUS_LABEL: Record<Charge['status'], string> = {
  pending: 'PENDENTE', awaiting: 'AGUARDANDO', paid: 'PAGO', rejected: 'RECUSADO', suspended: 'SUSPENSO',
}

const STATUS_COLORS: Record<Charge['status'], { bg: string; text: string }> = {
  pending: { bg: 'bg-warning', text: 'text-black' },
  awaiting: { bg: 'bg-info', text: 'text-white' },
  paid: { bg: 'bg-brand', text: 'text-white' },
  rejected: { bg: 'bg-danger', text: 'text-white' },
  suspended: { bg: 'bg-danger-deep', text: 'text-white' },
}

export function FinanceiroPage() {
  const { profile } = useAuth()
  const [charges, setCharges] = useState<Charge[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | Charge['status']>('all')
  const [showCobrar, setShowCobrar] = useState(false)
  const [proposalOf, setProposalOf] = useState<Charge | null>(null)
  const nav = useNavigate()

  const currency = currencyOf(profile?.country)

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('charges')
      .select('id,student_id,amount,due_date,status,format,paid_at,student_declared_at,profiles!charges_student_id_fkey(full_name,email)')
      .eq('teacher_id', profile.id)
      .order('due_date', { ascending: false })
    setCharges((data as unknown as Charge[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [profile?.id])

  const filtered = filter === 'all' ? charges : charges.filter((c) => c.status === filter)
  const totalPeriod = charges
    .filter((c) => c.status === 'paid' && c.paid_at && new Date(c.paid_at).getMonth() === new Date().getMonth())
    .reduce((s, c) => s + Number(c.amount), 0)

  async function markPaid(c: Charge) {
    await supabase.from('charges').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', c.id)
    await load()
  }
  async function reject(c: Charge) {
    await supabase.from('charges').update({ status: 'pending', student_declared_at: null }).eq('id', c.id)
    await load()
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-white text-rt-20 font-bold">Financeiro</h1>
        <button onClick={() => nav('/professor/dados-bancarios')} className="text-brand text-rt-11 font-semibold">
          Dados bancários
        </button>
      </div>

      <div className="rounded-card bg-surface-nav p-4 mb-4">
        <div className="text-grey-600 text-rt-11 font-semibold uppercase tracking-wider">Recebido no mês</div>
        <div className="text-grey-900 text-rt-32 font-bold">{formatMoney(totalPeriod, currency)}</div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {(['all', 'pending', 'awaiting', 'paid', 'suspended'] as const).map((f) => {
          const on = filter === f
          const label = f === 'all' ? 'Todos' : f === 'pending' ? 'Pendente' : f === 'awaiting' ? 'Aguardando' : f === 'paid' ? 'Pago' : 'Suspenso'
          return (
            <button key={f} onClick={() => setFilter(f)} className={
              'shrink-0 px-3 h-8 rounded-card border text-rt-12 font-semibold ' +
              (on ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-grey-400')
            }>{label}</button>
          )
        })}
      </div>

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Wallet} title="Sem cobranças" body="Cobre seu primeiro aluno para começar." />
      ) : (
        <ul className="flex flex-col gap-3 mb-4">
          {filtered.map((c) => (
            <li key={c.id} className="card-dark p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-white text-rt-14 font-bold truncate">
                  {c.profiles?.full_name ?? c.profiles?.email ?? 'Aluno'}
                </div>
                <span className={'text-rt-9 font-bold px-2 py-0.5 rounded-tag ' + STATUS_COLORS[c.status].bg + ' ' + STATUS_COLORS[c.status].text}>
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
              <div className="flex items-center justify-between text-rt-13">
                <div className="text-white/60">
                  Vence: {new Date(c.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
                <div className="text-brand font-bold">{formatMoney(Number(c.amount), currency)}</div>
              </div>
              {c.status === 'awaiting' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => markPaid(c)} className="flex-1 h-10 rounded-btn-pill bg-charge text-white text-rt-13 font-semibold flex items-center justify-center gap-1">
                    <CheckCircle2 size={16} /> Confirmar
                  </button>
                  <button onClick={() => reject(c)} className="w-11 h-10 rounded-btn-pill border border-danger-wine text-danger-wine flex items-center justify-center">
                    <X size={18} />
                  </button>
                </div>
              )}
              {c.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => markPaid(c)} className="flex-1 h-10 rounded-btn-pill bg-charge text-white text-rt-13 font-semibold flex items-center justify-center gap-1">
                    <CheckCircle2 size={16} /> Marcar paga
                  </button>
                  <button onClick={() => setProposalOf(c)} className="h-10 px-3 rounded-btn-pill border border-warning text-warning text-rt-13 font-semibold flex items-center justify-center gap-1">
                    <RefreshCw size={14} /> Alterar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <button onClick={() => setShowCobrar(true)} className="w-full h-12 rounded-md bg-charge text-white text-rt-14 font-semibold flex items-center justify-center gap-2 shadow-glow">
        <Send size={18} /> Cobrar Aluno
      </button>

      {showCobrar && <CobrarSheet currency={currency} onClose={() => setShowCobrar(false)} onCreated={() => { setShowCobrar(false); void load() }} />}
      {proposalOf && <ProposalSheet charge={proposalOf} currency={currency} onClose={() => setProposalOf(null)} onSent={() => setProposalOf(null)} />}
    </div>
  )
}

function ProposalSheet({ charge, currency, onClose, onSent }: { charge: Charge; currency: string; onClose: () => void; onSent: () => void }) {
  const { profile } = useAuth()
  const [newAmount, setNewAmount] = useState(String(charge.amount))
  const [newFormat, setNewFormat] = useState<'monthly' | 'hourly'>((charge.format as any) ?? 'monthly')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function send() {
    if (!profile?.id) return
    setSaving(true)
    await supabase.from('charge_change_proposals').insert({
      teacher_id: profile.id, student_id: charge.student_id,
      new_format: newFormat, new_amount: Number(newAmount) || 0,
      reason: reason || null,
    })
    await supabase.from('notifications').insert({
      user_id: charge.student_id, type: 'payment',
      title: 'Proposta de alteração de mensalidade',
      body: `${profile.full_name ?? 'Seu professor'} propôs ${formatMoney(Number(newAmount) || 0, currency)}/${newFormat === 'monthly' ? 'mês' : 'hora'}.`,
    })
    setSaving(false)
    onSent()
  }

  return (
    <FullScreenSheet title="Propor alteração" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <div className="card-dark p-3 text-white/70 text-rt-12">
          Cobrança atual: <strong className="text-white">{formatMoney(Number(charge.amount), currency)}</strong> ({charge.format === 'monthly' ? 'mensal' : 'por hora'})
        </div>
        <Field label="Novo formato">
          <div className="flex gap-2">
            {(['monthly', 'hourly'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setNewFormat(f)} className={
                'flex-1 h-10 rounded-btn-pill border text-rt-12 font-semibold ' +
                (newFormat === f ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-grey-400')
              }>{f === 'monthly' ? 'Mensal' : 'Por hora'}</button>
            ))}
          </div>
        </Field>
        <Field label={`Novo valor (${currency})`}>
          <input inputMode="decimal" className="input-dark" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
        </Field>
        <Field label="Motivo (opcional)">
          <textarea className="input-dark h-20 py-3 resize-none" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
      <div className="mt-8">
        <button onClick={send} disabled={saving || !newAmount} className="btn-save">
          {saving ? 'Enviando…' : 'Enviar proposta ao aluno'}
        </button>
      </div>
    </FullScreenSheet>
  )
}

function CobrarSheet({ currency, onClose, onCreated }: { currency: string; onClose: () => void; onCreated: () => void }) {
  const { profile } = useAuth()
  const [students, setStudents] = useState<StudentOpt[]>([])
  const [studentId, setStudentId] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState(nextMonthISO())
  const [format, setFormat] = useState<'monthly' | 'hourly'>('monthly')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase.from('profiles').select('id,full_name,email').eq('teacher_id', profile.id).eq('link_status', 'active').order('full_name')
      setStudents((data as StudentOpt[]) ?? [])
    })()
  }, [profile?.id])

  async function save() {
    if (!profile?.id || !studentId || !amount) return
    setSaving(true)
    await supabase.from('charges').insert({
      teacher_id: profile.id,
      student_id: studentId,
      format,
      amount: Number(amount),
      due_date: dueDate,
      status: 'pending',
    })
    setSaving(false)
    onCreated()
  }

  return (
    <FullScreenSheet title="Cobrar Aluno" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <Field label="Aluno">
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="input-dark">
            <option value="">Selecione…</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>)}
          </select>
        </Field>
        <Field label="Formato">
          <div className="flex gap-2">
            {(['monthly', 'hourly'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFormat(f)} className={
                'flex-1 h-10 rounded-btn-pill border text-rt-12 font-semibold ' +
                (format === f ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-grey-400')
              }>
                {f === 'monthly' ? 'Mensal' : 'Por hora'}
              </button>
            ))}
          </div>
        </Field>
        <Field label={`Valor (${currency})`}>
          <input inputMode="decimal" className="input-dark" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </Field>
        <Field label="Data de vencimento">
          <input type="date" className="input-dark" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>
      <div className="mt-8">
        <button className="btn-save" disabled={saving || !studentId || !amount} onClick={save}>
          {saving ? 'Enviando…' : 'Enviar cobrança'}
        </button>
      </div>
    </FullScreenSheet>
  )
}

function nextMonthISO() {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

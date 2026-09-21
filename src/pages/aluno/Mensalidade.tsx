import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { currencyOf, formatMoney } from '@/lib/plans'

type Charge = { id: string; amount: number; due_date: string; status: string }
type Teacher = { full_name: string | null; bank_holder: string | null; bank_name: string | null; bank_agency: string | null; bank_account: string | null; pix_key: string | null; country: string | null }
type Proposal = { id: string; new_amount: number; new_format: string; reason: string | null; teacher_id: string }

export function MensalidadePage() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const [charge, setCharge] = useState<Charge | null>(null)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [declaring, setDeclaring] = useState(false)
  const [proposal, setProposal] = useState<Proposal | null>(null)

  useEffect(() => {
    if (!profile?.id || !profile.teacher_id) return
    void (async () => {
      const [{ data: c }, { data: t }, { data: p }] = await Promise.all([
        supabase.from('charges').select('id,amount,due_date,status').eq('student_id', profile.id).in('status', ['pending', 'awaiting']).order('due_date').limit(1).maybeSingle(),
        supabase.from('profiles').select('full_name,bank_holder,bank_name,bank_agency,bank_account,pix_key,country').eq('id', profile.teacher_id).single(),
        supabase.from('charge_change_proposals').select('id,new_amount,new_format,reason,teacher_id').eq('student_id', profile.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      setCharge(c as Charge)
      setTeacher(t as Teacher)
      setProposal(p as Proposal | null)
    })()
  }, [profile?.id, profile?.teacher_id])

  async function respondProposal(accept: boolean) {
    if (!proposal || !profile?.id) return
    await supabase.from('charge_change_proposals').update({
      status: accept ? 'accepted' : 'rejected', responded_at: new Date().toISOString(),
    }).eq('id', proposal.id)
    await supabase.from('notifications').insert({
      user_id: proposal.teacher_id, type: 'payment',
      title: accept ? 'Aluno aceitou a alteração' : 'Aluno recusou a alteração',
      body: `${profile.full_name ?? 'Aluno'} ${accept ? 'aceitou' : 'recusou'} a proposta de alteração da cobrança.`,
    })
    setProposal(null)
  }

  async function copy(v: string, label: string) {
    await navigator.clipboard.writeText(v)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  async function declarePaid() {
    if (!charge?.id) return
    setDeclaring(true)
    await supabase.from('charges').update({ status: 'awaiting', student_declared_at: new Date().toISOString() }).eq('id', charge.id)
    setCharge({ ...charge, status: 'awaiting' })
    setDeclaring(false)
  }

  const currency = currencyOf(teacher?.country ?? profile?.country)

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">Mensalidade</h1>
      </div>

      {proposal && (
        <div className="card-dark p-4 mb-4 border-warning/60">
          <div className="text-warning text-rt-11 uppercase font-semibold tracking-wide mb-1">Proposta de alteração</div>
          <div className="text-white text-rt-18 font-bold mt-1">
            {formatMoney(Number(proposal.new_amount), currency)}
            <span className="text-rt-13 text-white/70 font-normal"> / {proposal.new_format === 'monthly' ? 'mês' : 'hora'}</span>
          </div>
          {proposal.reason && <div className="text-white/70 text-rt-12 mt-1">{proposal.reason}</div>}
          <div className="flex gap-2 mt-3">
            <button onClick={() => respondProposal(false)} className="flex-1 h-10 rounded-btn-pill bg-danger-wine text-white text-rt-13 font-semibold">Recusar</button>
            <button onClick={() => respondProposal(true)} className="flex-1 h-10 rounded-btn-pill bg-brand text-white text-rt-13 font-bold">Aceitar</button>
          </div>
        </div>
      )}

      {!charge ? (
        <div className="card-dark p-6 text-center text-white/70 text-rt-13">Nenhuma cobrança pendente 🎉</div>
      ) : (
        <>
          <div className={
            'rounded-card p-4 mb-4 border ' +
            (charge.status === 'awaiting' ? 'bg-pay-awaiting border-info/40' : 'bg-pay-pending border-danger-wine/40')
          }>
            <div className="text-white/70 text-rt-11 uppercase tracking-wide font-semibold">
              {charge.status === 'awaiting' ? 'Aguardando confirmação' : 'Vence em'}
            </div>
            <div className="text-white text-rt-32 font-bold leading-none mt-1">
              {formatMoney(Number(charge.amount), currency)}
            </div>
            <div className="text-white/80 text-rt-13 mt-1">
              {new Date(charge.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
            </div>
          </div>

          {teacher && (
            <div className="card-dark p-4 mb-4">
              <div className="text-white/60 text-rt-11 uppercase font-semibold tracking-wide mb-2">
                Dados para pagamento
              </div>
              {teacher.pix_key && (
                <CopyRow label="Chave PIX" value={teacher.pix_key} copied={copied === 'pix'} onCopy={() => copy(teacher.pix_key!, 'pix')} />
              )}
              {teacher.bank_holder && <InfoRow label="Titular" value={teacher.bank_holder} />}
              {teacher.bank_name && <InfoRow label="Banco" value={teacher.bank_name} />}
              {teacher.bank_agency && <InfoRow label="Agência" value={teacher.bank_agency} />}
              {teacher.bank_account && (
                <CopyRow label="Conta" value={teacher.bank_account} copied={copied === 'account'} onCopy={() => copy(teacher.bank_account!, 'account')} />
              )}
            </div>
          )}

          {charge.status === 'pending' ? (
            <button className="btn-save" disabled={declaring} onClick={declarePaid}>
              {declaring ? 'Enviando…' : 'Já Paguei'}
            </button>
          ) : (
            <div className="card-dark p-4 flex items-center gap-3 border-info/40">
              <CheckCircle2 className="text-info" />
              <div className="text-white text-rt-13">Aguardando o professor confirmar o pagamento.</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-surface-line-strong last:border-0">
      <span className="text-white/60 text-rt-12">{label}</span>
      <span className="text-white text-rt-13 font-semibold">{value}</span>
    </div>
  )
}

function CopyRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface-line-strong last:border-0 gap-2">
      <div className="flex-1 min-w-0">
        <div className="text-white/60 text-rt-11">{label}</div>
        <div className="text-white text-rt-13 font-mono truncate">{value}</div>
      </div>
      <button onClick={onCopy} className="w-9 h-9 rounded-lg bg-brand/15 border border-brand flex items-center justify-center text-brand">
        {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
      </button>
    </div>
  )
}

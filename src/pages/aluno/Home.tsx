import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { currencyOf, formatMoney } from '@/lib/plans'
import { AnnouncementModal } from '@/components/AnnouncementModal'
import { Bell, Droplet, Calendar, ClipboardCheck, Dumbbell, MessageSquare, Plus, Minus, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'
import { LanguageToggle } from '@/components/LanguageToggle'

type Charge = { id: string; amount: number; due_date: string; status: string }
type Hydration = { ml: number; target_ml: number }

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function AlunoHome() {
  const { profile } = useAuth()
  const { t } = useTranslation()
  const nav = useNavigate()
  const [counter, setCounter] = useState<{ id: string; amount: number; format: string; frequency: number; teacher: string } | null>(null)
  const [charge, setCharge] = useState<Charge | null>(null)
  const [hydration, setHydration] = useState<Hydration>({ ml: 0, target_ml: 2500 })
  const [newRoutines, setNewRoutines] = useState(0)
  const [unread, setUnread] = useState(0)
  const [weekDays, setWeekDays] = useState<boolean[]>([false, false, false, false, false, false, false])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Aluno'
  const today = todayISO()

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const [chargeRes, hydRes, srRes, notifRes] = await Promise.all([
        supabase.from('charges').select('id,amount,due_date,status').eq('student_id', profile.id).order('due_date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('hydration_days').select('ml,target_ml').eq('student_id', profile.id).eq('day', today).maybeSingle(),
        supabase.from('student_routines').select('id', { count: 'exact', head: true }).eq('student_id', profile.id).eq('completed_workouts', 0).eq('is_hidden', false),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).is('read_at', null),
      ])
      setCharge((chargeRes.data as Charge) ?? null)
      setHydration((hydRes.data as Hydration) ?? { ml: 0, target_ml: 2500 })
      setNewRoutines(srRes.count ?? 0)
      setUnread(notifRes.count ?? 0)

      // Verifica contraproposta pendente
      const { data: inv } = await supabase.from('invites')
        .select('id,amount,format,frequency,teacher_id,profiles!invites_teacher_id_fkey(full_name)')
        .eq('student_id', profile.id).eq('status', 'countered').eq('last_offer_by', 'teacher').maybeSingle()
      if (inv) setCounter({
        id: inv.id, amount: Number(inv.amount ?? 0), format: (inv as any).format,
        frequency: (inv as any).frequency ?? 0,
        teacher: (inv as any).profiles?.full_name ?? 'Seu professor',
      })

      // frequência semanal: só simulado por ora (fase 5)
      const wd = new Date().getDay()
      const days = [false, false, false, false, false, false, false]
      days[wd] = true
      setWeekDays(days)
    })()
  }, [profile?.id, today])

  async function drink(delta: number) {
    if (!profile?.id) return
    const next = Math.max(0, hydration.ml + delta)
    setHydration({ ...hydration, ml: next })
    await supabase.from('hydration_days').upsert({
      student_id: profile.id, day: today, ml: next, target_ml: hydration.target_ml,
    }, { onConflict: 'student_id,day' })
  }

  const hydPct = Math.min(100, Math.round((hydration.ml / hydration.target_ml) * 100))
  const chargeUrgent = charge && daysUntil(charge.due_date) <= 5

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-white text-rt-20 font-bold">{t('aluno:hello', { name: firstName })}</div>
          <div className="text-white/60 text-rt-11 mt-0.5">{t('aluno:welcome')}</div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <button onClick={() => nav('/aluno/configuracoes')} className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center" aria-label="Configurações">
            <Settings size={20} className="text-white" />
          </button>
          <button onClick={() => nav('/aluno/notificacoes')} className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center relative">
            <Bell size={20} className="text-white" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger-soft shadow-badge-red text-white text-[9px] font-bold flex items-center justify-center">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Card de mensalidade */}
      <div className={
        'rounded-card p-4 mb-3 border ' +
        (!charge ? 'bg-pay-ok border-brand/40' :
         charge.status === 'awaiting' ? 'bg-pay-awaiting border-info/40' :
         charge.status === 'suspended' ? 'bg-pay-suspended border-warning/40' :
         chargeUrgent ? 'bg-pay-pending border-danger-wine/40' :
         'bg-pay-ok border-brand/40')
      }>
        <div className="text-white text-rt-18 font-bold leading-tight">
          {(!charge || charge.status === 'paid') && t('aluno:paymentOk')}
          {charge?.status === 'awaiting' && t('aluno:paymentAwaiting')}
          {charge?.status === 'suspended' && t('aluno:paymentSuspended')}
          {charge?.status === 'pending' && (chargeUrgent
            ? t('aluno:paymentDueOn', { date: formatDate(charge.due_date) })
            : t('aluno:paymentNext', { date: formatDate(charge.due_date) }))}
        </div>
        {charge?.status === 'pending' && chargeUrgent && (
          <button
            className="mt-3 h-9 rounded-btn-pill bg-white/95 text-danger-wine text-rt-13 font-bold px-6"
            onClick={() => nav('/aluno/mensalidade')}
          >
            {t('aluno:iPaid')}
          </button>
        )}
      </div>

      {/* Grid 2x2 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Hidratação */}
        <div className="card-dark border-brand/25 p-3 flex flex-col justify-between h-32">
          <div className="flex items-start justify-between">
            <div className="text-white text-rt-13 font-semibold">{t('aluno:hydration')}</div>
            <Droplet size={18} className="text-info-light" />
          </div>
          <div>
            <div className="text-white text-rt-18 font-bold leading-none">{hydration.ml} <span className="text-rt-11 text-white/60">/ {hydration.target_ml}ml</span></div>
            <div className="h-1.5 bg-surface-raised rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-water" style={{ width: `${hydPct}%` }} />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => drink(-250)} className="flex-1 h-7 rounded-md bg-surface-raised flex items-center justify-center text-white">
                <Minus size={14} />
              </button>
              <button onClick={() => drink(250)} className="flex-1 h-7 rounded-md bg-info-light flex items-center justify-center text-white">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Frequência */}
        <div className="card-dark border-brand/25 p-3 flex flex-col justify-between h-32">
          <div className="flex items-start justify-between">
            <div className="text-white text-rt-13 font-semibold">{t('aluno:frequency')}</div>
            <Calendar size={18} className="text-brand" />
          </div>
          <div className="flex justify-between">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-grey-400">{d}</span>
                <div className={
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ' +
                  (weekDays[i] ? 'bg-brand text-white' : 'bg-surface-raised text-grey-500')
                }>
                  {weekDays[i] ? '✓' : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Treinos novos */}
        <button
          onClick={() => nav('/aluno/treinos')}
          className="card-dark border-brand/25 p-3 flex flex-col justify-between h-28 text-left active:scale-[0.98]"
        >
          <div className="flex items-start justify-between">
            <div className="text-white text-rt-13 font-semibold leading-tight whitespace-pre-line">{t('aluno:newWorkouts')}</div>
            <Dumbbell size={18} className="text-brand" />
          </div>
          <div className="text-white text-rt-32 font-bold leading-none">{newRoutines}</div>
        </button>

        {/* Avaliação */}
        <button
          onClick={() => nav('/aluno/avaliacao')}
          className="card-dark border-brand/25 p-3 flex flex-col justify-between h-28 text-left active:scale-[0.98]"
        >
          <div className="flex items-start justify-between">
            <div className="text-white text-rt-13 font-semibold leading-tight whitespace-pre-line">{t('aluno:physicalAss')}</div>
            <ClipboardCheck size={18} className="text-assess" />
          </div>
          <div className="text-white/60 text-rt-11">{t('aluno:tapToSee')}</div>
        </button>
      </div>

      {/* Mensagens */}
      <button
        onClick={() => nav('/aluno/chat')}
        className={
          'w-full rounded-card p-4 flex items-center gap-3 mb-6 text-left ' +
          (unread > 0 ? 'bg-[#3A1A1A]/90 border border-tone-rose/40' : 'card-dark border-brand/25')
        }
      >
        <div className={'w-11 h-11 rounded-lg flex items-center justify-center ' + (unread > 0 ? 'bg-[#4A2020]' : 'bg-surface-input')}>
          <MessageSquare size={20} className={unread > 0 ? 'text-tone-rose' : 'text-brand'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-rt-14 font-bold">{unread > 0 ? t('aluno:unreadMessages') : t('aluno:messages')}</div>
          <div className="text-white/60 text-rt-11">{unread > 0 ? `${unread}` : t('aluno:talkTeacher')}</div>
        </div>
        {unread > 0 && <div className="w-2.5 h-2.5 rounded-full bg-tone-rose" />}
      </button>

      {counter && (
        <CounterModal
          counter={counter}
          currency={currencyOf(profile?.country)}
          onAccept={async () => {
            if (!profile?.id) return
            const cur = counter
            setCounter(null)
            const { data: inv } = await supabase.from('invites').select('teacher_id').eq('id', cur.id).single()
            if (!inv?.teacher_id) return
            const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
            await supabase.from('invites').update({ status: 'accepted' }).eq('id', cur.id)
            await supabase.from('profiles').update({ teacher_id: inv.teacher_id, link_status: 'active' }).eq('id', profile.id)
            await supabase.from('charges').insert({
              teacher_id: inv.teacher_id, student_id: profile.id,
              format: cur.format, amount: cur.amount, due_date: dueDate, status: 'pending',
            })
            await supabase.from('notifications').insert({
              user_id: inv.teacher_id, type: 'invite', title: 'Proposta aceita!',
              body: `${profile.full_name ?? 'Aluno'} aceitou sua contraproposta.`,
            })
            nav('/aluno', { replace: true })
            location.reload()
          }}
          onClose={() => setCounter(null)}
        />
      )}

      <AnnouncementModal />
    </div>
  )
}

function CounterModal({ counter, currency, onAccept, onClose }: {
  counter: { id: string; amount: number; format: string; frequency: number; teacher: string }
  currency: string; onAccept: () => Promise<void>; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div className="w-full max-w-sm rounded-card bg-surface-raised p-5" onClick={(e) => e.stopPropagation()}>
        <div className="text-white text-rt-16 font-bold mb-1">Proposta do Professor</div>
        <div className="text-white/70 text-rt-12 mb-4">{counter.teacher} enviou uma contraproposta:</div>
        <div className="card-dark p-3 mb-4">
          <div className="text-brand text-rt-22 font-bold">{formatMoney(counter.amount, currency)}</div>
          <div className="text-white/70 text-rt-12">
            {counter.format === 'monthly' ? 'Mensal' : 'Por hora'} · {counter.frequency}x/semana
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-11 rounded-btn-pill border border-grey-700 text-grey-400 text-rt-13 font-semibold">
            Depois
          </button>
          <button onClick={onAccept} className="flex-1 h-11 rounded-btn-pill bg-brand text-white text-rt-13 font-bold">
            Aceitar
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}
function daysUntil(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

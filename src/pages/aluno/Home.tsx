import { useEffect, useState } from 'react'
import { localeDe } from '@/lib/fechas'
import { useNavigate } from 'react-router-dom'
import { currencyOf, formatMoney } from '@/lib/plans'
import { AnnouncementModal } from '@/components/AnnouncementModal'
import { ActivarAvisos } from '@/components/ActivarAvisos'
import { InstalarApp } from '@/components/InstalarApp'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { Bell, MessageSquare, Settings, Wallet, Dumbbell, ClipboardCheck, Calendar, Droplet, Flame } from 'lucide-react'
import { VasoAgua, DialogHidratacion } from './HomeCards'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'
import { LanguageToggle } from '@/components/LanguageToggle'
import { aviso } from '@/lib/avisos'
import { mensajeError } from '@/lib/errores'

type Charge = { id: string; amount: number; due_date: string; status: string; format: string | null }
type Hydration = { ml: number; target_ml: number }

/** Portugués: segunda a domingo. El diseño muestra S T Q Q S S D. */
const DIAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function AlunoHome() {
  const { profile, congeladaDesde } = useAuth()
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const [counter, setCounter] = useState<{ id: string; amount: number; format: string; frequency: number; teacher: string } | null>(null)
  const [charge, setCharge] = useState<Charge | null>(null)
  const [hydration, setHydration] = useState<Hydration>({ ml: 0, target_ml: 2500 })
  const [newRoutines, setNewRoutines] = useState(0)
  const [unread, setUnread] = useState(0)
  // Lunes a domingo, como en el diseño (S T Q Q S S D en portugués).
  const [weekDays, setWeekDays] = useState<boolean[]>([false, false, false, false, false, false, false])
  const [semanasEntrenadas, setSemanasEntrenadas] = useState(0)
  const [assessments, setAssessments] = useState(0)
  const [treinosDelMes, setTreinosDelMes] = useState(0)
  // La agenda es compartida: lo que el profesor marca para el alumno lo ve el alumno.
  const [compromisos, setCompromisos] = useState<{ id: string; title: string; starts_at: string; kind: string; location: string | null }[]>([])
  const [metaHidratacion, setMetaHidratacion] = useState(false)
  const [errorConvite, setErrorConvite] = useState<string | null>(null)

  const firstName = profile?.full_name?.split(' ')[0] ?? t('inicio:student')
  const today = todayISO()

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const [chargeRes, ultimoRes, hydRes, srRes, notifRes] = await Promise.all([
        // Primero la más vieja sin pagar; si no hay, la última (ya paga).
        supabase.from('charges').select('id,amount,due_date,status,format').eq('student_id', profile.id).in('status', ['pending', 'awaiting', 'suspended']).order('due_date').limit(1).maybeSingle(),
        supabase.from('charges').select('id,amount,due_date,status,format').eq('student_id', profile.id).order('due_date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('hydration_days').select('ml,target_ml').eq('student_id', profile.id).eq('day', today).maybeSingle(),
        supabase.from('student_routines').select('id', { count: 'exact', head: true }).eq('student_id', profile.id).eq('completed_workouts', 0).eq('is_hidden', false),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).is('read_at', null),
      ])
      setCharge(((chargeRes.data ?? ultimoRes.data) as Charge) ?? null)
      // Sin registro de hoy, la meta es la que definió el profesor.
      setHydration((hydRes.data as Hydration) ?? { ml: 0, target_ml: profile.hydration_goal_ml ?? 2500 })
      setNewRoutines(srRes.count ?? 0)
      setUnread(notifRes.count ?? 0)

      // Verifica contraproposta pendente
      const { data: inv } = await supabase.from('invites')
        .select('id,amount,format,frequency,teacher_id,profiles!invites_teacher_id_fkey(full_name)')
        .eq('student_id', profile.id).eq('status', 'countered').eq('last_offer_by', 'teacher').maybeSingle()
      if (inv) setCounter({
        id: inv.id, amount: Number(inv.amount ?? 0), format: (inv as any).format,
        frequency: (inv as any).frequency ?? 0,
        teacher: (inv as any).profiles?.full_name ?? t('inicio:yourTeacher'),
      })

      // Frecuencia real: sesiones de esta semana, de lunes a domingo.
      const hoy = new Date()
      const diaSemana = (hoy.getDay() + 6) % 7 // 0 = lunes
      const lunes = new Date(hoy)
      lunes.setDate(hoy.getDate() - diaSemana)
      lunes.setHours(0, 0, 0, 0)

      const { data: sesiones } = await supabase
        .from('workout_sessions')
        .select('started_at')
        .eq('student_id', profile.id)
        .gte('started_at', lunes.toISOString())

      const days = [false, false, false, false, false, false, false]
      for (const s of (sesiones as { started_at: string }[]) ?? []) {
        const d = new Date(s.started_at)
        days[(d.getDay() + 6) % 7] = true
      }
      setWeekDays(days)
      setSemanasEntrenadas(days.filter(Boolean).length)

      const { count: nAssess } = await supabase
        .from('assessments')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', profile.id)
      setAssessments(nAssess ?? 0)

      const { data: citas } = await supabase
        .from('appointments')
        .select('id,title,starts_at,kind,location')
        .eq('student_id', profile.id)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(5)
      setCompromisos((citas as { id: string; title: string; starts_at: string; kind: string; location: string | null }[]) ?? [])

      const primeroDelMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      const { count: nTreinos } = await supabase
        .from('workout_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', profile.id)
        .gte('started_at', primeroDelMes.toISOString())
      setTreinosDelMes(nTreinos ?? 0)
    })()
  }, [profile?.id, today])

  async function drink(delta: number) {
    if (!profile?.id) return
    const next = Math.max(0, hydration.ml + delta)
    // El aviso salta al cruzar la meta, no cada vez que se suma estando encima.
    if (hydration.ml < hydration.target_ml && next >= hydration.target_ml) setMetaHidratacion(true)
    setHydration({ ...hydration, ml: next })
    await supabase.from('hydration_days').upsert({
      student_id: profile.id, day: today, ml: next, target_ml: hydration.target_ml,
    }, { onConflict: 'student_id,day' })
  }

  const hydPct = Math.min(100, Math.round((hydration.ml / hydration.target_ml) * 100))
  const diasVencimiento = charge ? daysUntil(charge.due_date) : null
  const vencida = charge?.status === 'pending' && diasVencimiento !== null && diasVencimiento < 0
  const porHora = charge?.format === 'hourly'

  const estadoPago: 'ok' | 'pendiente' | 'aguardando' | 'suspendido' =
    !charge || charge.status === 'paid' ? 'ok'
      : charge.status === 'awaiting' ? 'aguardando'
        : charge.status === 'suspended' ? 'suspendido'
          : 'pendiente'

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+16px)] lg:px-0 lg:pt-4">
      {congeladaDesde && (
        <div className="mb-5 p-4 rounded-card bg-danger/15 border border-danger">
          <div className="text-danger text-rt-15 font-bold">{t('planes:frozen.studentTitle')}</div>
          <div className="text-white/80 text-rt-13 mt-1">{t('planes:frozen.studentBody')}</div>
        </div>
      )}
      <InstalarApp />
      <ActivarAvisos />
      {/* Mismo encabezado que la home del profesor */}
      <div className="flex items-center justify-between mb-5">
        <div className="min-w-0">
          <div className="text-white text-rt-20 lg:text-rt-28 font-bold truncate">{t('aluno:hello', { name: firstName })}</div>
          <div className="text-white/60 text-rt-11 mt-0.5 truncate">{t('aluno:welcome')}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="lg:hidden"><LanguageToggle /></div>
          <button onClick={() => nav('/aluno/configuracoes')} className="lg:hidden w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center" aria-label={t('inicio:settings')}>
            <Settings size={20} className="text-white" />
          </button>
          <button onClick={() => nav('/aluno/notificacoes')} className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center relative" aria-label={t('inicio:notifications')}>
            <Bell size={20} className="text-white" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger-soft shadow-badge-red text-white text-[9px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-3 lg:gap-4">
      {/* Mensalidade: misma forma que el card de plano del profesor */}
      <div className={
        'rounded-card p-4 mb-3 md:mb-0 ' +
        (estadoPago === 'ok' ? 'bg-pay-ok'
          : estadoPago === 'aguardando' ? 'bg-pay-awaiting'
            : estadoPago === 'suspendido' ? 'bg-pay-suspended'
              : 'bg-pay-pending')
      }>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-white/80 text-rt-11 font-semibold uppercase tracking-wider">
              {t('aluno:monthlyFee')}
            </div>
            <div className="text-white text-rt-20 font-bold mt-1">
              {estadoPago === 'ok'
                ? t('aluno:paymentOk')
                : formatMoney(Number(charge!.amount), currencyOf(profile?.country))}
            </div>
            <div className="text-white/80 text-rt-11 mt-1">
              {estadoPago === 'ok'
                ? t('aluno:paymentNone')
                : estadoPago === 'aguardando'
                  ? t('aluno:paymentAwaiting')
                  : estadoPago === 'suspendido'
                    ? t('aluno:paymentSuspended')
                    : `${t('aluno:paymentDueOn', { date: formatDate(charge!.due_date, i18n.language) })} · ${
                      porHora ? t('aluno:paymentHourly')
                        : vencida ? t('aluno:paymentOverdue')
                          : t('aluno:paymentMonthOf', { month: nombreMes(charge!.due_date, i18n.language) })}`}
            </div>
          </div>
          <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Wallet size={22} className="text-white" />
          </div>
        </div>

        {estadoPago === 'pendiente' && (
          <button
            onClick={() => nav('/aluno/mensalidade')}
            className="w-full mt-3 h-9 rounded-btn-pill bg-white/95 flex items-center justify-center text-danger-wine text-rt-13 font-bold"
          >
            {t('aluno:iPaid')}
          </button>
        )}
        {estadoPago === 'suspendido' && (
          <button
            onClick={() => nav('/aluno/mensalidade')}
            className="w-full mt-3 h-9 rounded-btn-pill bg-white/20 flex items-center justify-center text-white text-rt-13 font-bold"
          >
            {t('aluno:paymentSeeData')}
          </button>
        )}
      </div>

      {/* Hidratação: es la única tarjeta con botones, por eso va a lo ancho */}
      <div className="card-dark p-4 mb-3 md:mb-0 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Droplet size={18} className="text-info-light" />
            <span className="text-white text-rt-15 font-bold">{t('aluno:hydration')}</span>
          </div>
          <div className="mt-2">
            <span className="text-white text-rt-29 font-bold leading-none">{hydration.ml}</span>
            <span className="text-white/60 text-rt-12"> / {hydration.target_ml}ml</span>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => drink(-250)}
              disabled={hydration.ml === 0}
              className="flex-1 h-9 rounded-btn-pill bg-surface-raised text-white/80 text-rt-12 font-bold disabled:opacity-40"
            >
              - 250ml
            </button>
            <button
              onClick={() => drink(250)}
              className="flex-1 h-9 rounded-btn-pill border-[1.5px] border-brand text-white text-rt-12 font-bold"
            >
              + 250ml
            </button>
          </div>
        </div>
        <VasoAgua pct={hydPct} />
      </div>

      </div>

      {/* Grid 2x2, idéntico al del profesor */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 lg:gap-4 mb-3 md:my-3 lg:my-4">
        <DashCard title={t('aluno:newWorkouts')} value={String(newRoutines)} icon={Dumbbell} onClick={() => nav('/aluno/treinos')} />
        <DashCard title={t('aluno:physicalAss')} value={String(assessments)} icon={ClipboardCheck} onClick={() => nav('/aluno/avaliacao')} />
        <DashCard title={t('aluno:messages')} value={String(unread)} icon={MessageSquare} onClick={() => nav('/aluno/chat')} />
        <DashCard title={t('aluno:doneWorkouts')} value={String(treinosDelMes)} icon={Flame} onClick={() => nav('/aluno/treinos')} />
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
      {/* Agenda: mismos compromisos que ve el profesor */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2 px-1">
          <Calendar size={18} className="text-brand" />
          <span className="text-white text-rt-15 font-bold">{t('aluno:agenda')}</span>
        </div>
        {compromisos.length === 0 ? (
          <div className="card-dark p-4 text-white/60 text-rt-13">{t('aluno:noAppointments')}</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {compromisos.map((c) => {
              const d = new Date(c.starts_at)
              return (
                <li key={c.id} className="card-dark p-3 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-md bg-surface-input flex flex-col items-center justify-center shrink-0">
                    <div className="text-white text-rt-14 font-bold leading-none">{d.getDate()}</div>
                    <div className="text-white/60 text-rt-9 uppercase">
                      {d.toLocaleDateString(localeDe(), { month: 'short' }).replace('.', '')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-rt-14 font-semibold truncate">{c.title}</div>
                    <div className="text-white/60 text-rt-11">
                      {d.toLocaleTimeString(localeDe(), { hour: '2-digit', minute: '2-digit' })}
                      {c.location ? ` · 📍 ${c.location}` : ''}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Frequência de treinos: sección como la Agenda del profesor */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 px-1">
          <Calendar size={18} className="text-brand" />
          <span className="text-white text-rt-15 font-bold">{t('aluno:frequencyTitleInline')}</span>
        </div>
        <div className="card-dark p-4">
          <div className="flex justify-between">
            {DIAS.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-rt-10 text-white/50">{d}</span>
                <div className={
                  'w-8 h-8 rounded-full flex items-center justify-center text-rt-12 font-bold ' +
                  (weekDays[i] ? 'bg-brand text-white' : 'bg-surface-raised text-grey-500')
                }>
                  {weekDays[i] ? '✓' : '—'}
                </div>
              </div>
            ))}
          </div>
          <div className="text-white/50 text-rt-12 mt-3">
            {t('aluno:frequencySub', { n: semanasEntrenadas })}
          </div>
        </div>
      </div>
      </div>

      {metaHidratacion && (
        <DialogHidratacion
          titulo={t('aluno:hydrationDone')}
          cuerpo={t('aluno:hydrationDoneBody')}
          onClose={() => setMetaHidratacion(false)}
        />
      )}

      {counter && (
        <CounterModal
          counter={counter}
          currency={currencyOf(profile?.country)}
          onAccept={async () => {
            if (!profile?.id) return
            const cur = counter
            const { data: inv } = await supabase.from('invites').select('teacher_id').eq('id', cur.id).single()
            if (!inv?.teacher_id) return

            // El vínculo va por función: la escritura directa sobre el perfil
            // la filtra RLS sin devolver error (ver migración 20260923060000).
            const { error } = await supabase.rpc('aceptar_convite', { convite_id: cur.id })
            if (error) { setErrorConvite(mensajeError(error)); return }
            setCounter(null)

            await supabase.from('notifications').insert({
              user_id: inv.teacher_id, type: 'invite',
              ...aviso('counterAccepted', { who: profile.full_name }),
            })
            nav('/aluno', { replace: true })
            location.reload()
          }}
          onClose={() => setCounter(null)}
        />
      )}

      {errorConvite && (
        <FeedbackDialog kind="error" message={errorConvite} onClose={() => setErrorConvite(null)} />
      )}

      <AnnouncementModal />
    </div>
  )
}

function CounterModal({ counter, currency, onAccept, onClose }: {
  counter: { id: string; amount: number; format: string; frequency: number; teacher: string }
  currency: string; onAccept: () => Promise<void>; onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div className="w-full max-w-sm rounded-card bg-surface-raised p-5" onClick={(e) => e.stopPropagation()}>
        <div className="text-white text-rt-16 font-bold mb-1">{t('inicio:counterTitle')}</div>
        <div className="text-white/70 text-rt-12 mb-4">{t('inicio:counterSent', { name: counter.teacher })}</div>
        <div className="card-dark p-3 mb-4">
          <div className="text-brand text-rt-22 font-bold">{formatMoney(counter.amount, currency)}</div>
          <div className="text-white/70 text-rt-12">
            {counter.format === 'monthly' ? t('inicio:monthly') : t('inicio:hourly')} · {t('inicio:perWeek', { n: counter.frequency })}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-11 rounded-btn-pill border border-grey-700 text-grey-400 text-rt-13 font-semibold">
            {t('inicio:later')}
          </button>
          <button onClick={onAccept} className="flex-1 h-11 rounded-btn-pill bg-brand text-white text-rt-13 font-bold">
            {t('inicio:accept')}
          </button>
        </div>
      </div>
    </div>
  )
}

function nombreMes(iso: string, lang: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(localeDe(lang), { month: 'long' })
}
function formatDate(iso: string, lang: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(localeDe(lang), { day: '2-digit', month: '2-digit' })
}
function daysUntil(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

/** Mismo card del dashboard del profesor: así las dos homes se leen igual. */
function DashCard({ title, value, icon: Icon, onClick }: {
  title: string
  value: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="card-dark p-3 flex flex-col justify-between h-24 text-left active:scale-[0.98] transition"
    >
      <div className="flex items-start justify-between">
        <div className="text-white text-rt-13 font-semibold leading-tight whitespace-pre-line">{title}</div>
        <Icon size={18} className="text-brand" />
      </div>
      <div className="text-white text-rt-29 font-bold leading-none">{value}</div>
    </button>
  )
}

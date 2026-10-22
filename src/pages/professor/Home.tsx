import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Bell, Plus, ChevronRight, Zap, RefreshCw, ClipboardCheck, MessageSquare, Users, Settings, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { LanguageToggle } from '@/components/LanguageToggle'
import { AnnouncementModal } from '@/components/AnnouncementModal'
import { ActivarAvisos } from '@/components/ActivarAvisos'
import { InstalarApp } from '@/components/InstalarApp'
import { WeekCalendar } from '@/components/WeekCalendar'
import { localeDe } from '@/lib/fechas'
import { currencyOf, limiteDePlan, planVisible } from '@/lib/plans'

type Stats = {
  active_students: number
  pending_invites: number
  month_received: number
  unread_notifications: number
}

type Appt = { id: string; title: string; starts_at: string; kind: string; location?: string; student_name?: string }


function formatMoney(v: number, currency: string) {
  try {
    return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'es-UY', { style: 'currency', currency, maximumFractionDigits: 2 }).format(v)
  } catch { return `${v.toFixed(2)}` }
}

export function ProfessorHome() {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [allAppointments, setAllAppointments] = useState<Appt[]>([])
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [showMoreAppointments, setShowMoreAppointments] = useState(false)

  const currency = currencyOf(profile?.country)
  const plan = planVisible(profile?.plan)
  const planLimit = limiteDePlan(profile)
  const firstName = profile?.full_name?.split(' ')[0] ?? t('prof:home.teacher')

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const [{ data: statsRow }, { data: appts }] = await Promise.all([
        supabase.from('v_teacher_stats').select('*').eq('teacher_id', profile.id).single(),
        supabase
          .from('appointments')
          .select('id,title,starts_at,kind,location,student_name')
          .eq('teacher_id', profile.id)
          // También los de las últimas semanas: el calendario deja mirar días pasados.
          .gte('starts_at', new Date(Date.now() - 60 * 86400000).toISOString())
          .order('starts_at', { ascending: true }),
      ])
      setStats(statsRow ?? { active_students: 0, pending_invites: 0, month_received: 0, unread_notifications: 0 })
      void cargarPendientes(profile.id)
      setAllAppointments((appts as Appt[]) ?? [])
      setLoading(false)
    })()
  }, [profile?.id])

  // Tarjetas del inicio con datos reales: rutinas por cambiar, anamnesis por revisar y mensajes sin leer.
  type Pendiente = { id: string; titulo: string; detalle: string; to: string }
  const [pend, setPend] = useState<{ rutinas: Pendiente[]; evals: Pendiente[]; msgs: Pendiente[] }>({ rutinas: [], evals: [], msgs: [] })
  const [lista, setLista] = useState<{ titulo: string; items: Pendiente[] } | null>(null)
  type FilaAnam = { id: string; alumno: string; nombre: string; estado: 'pending' | 'in_progress' | 'completed'; nueva: boolean; fecha: string; to: string }
  const [anamTodas, setAnamTodas] = useState<FilaAnam[]>([])
  const [verAnam, setVerAnam] = useState(false)

  async function cargarPendientes(tid: string) {
    const hoy = new Date().toISOString().slice(0, 10)
    const [{ data: alumnos }, { data: rutinas }, { data: anams }, { data: convs }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email').eq('teacher_id', tid).eq('link_status', 'active'),
      supabase.from('student_routines').select('id,student_id,name,completed_workouts,estimated_workouts,ends_on,is_hidden').eq('teacher_id', tid),
      supabase.from('anamnesis_answers').select('id,student_id,status,created_at,submitted_at,template_name,template_name_es,template_name_en,completed_by,teacher_seen_at').eq('teacher_id', tid).order('created_at', { ascending: false }),
      supabase.from('conversations').select('id,student_id,last_message,last_message_at,last_sender_id,teacher_last_read_at').eq('teacher_id', tid),
    ])
    const nombres = new Map(((alumnos as { id: string; full_name: string | null; email: string | null }[]) ?? []).map((a) => [a.id, a.full_name || a.email || '—']))
    const activo = (id: string) => nombres.has(id)
    const fecha = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(localeDe(i18n.language))
    const lang = i18n.language.slice(0, 2)
    const vistos = new Set<string>()
    const rutinasPend: Pendiente[] = []
    for (const r of (rutinas as { id: string; student_id: string; name: string; completed_workouts: number | null; estimated_workouts: number | null; ends_on: string | null; is_hidden: boolean | null }[]) ?? []) {
      if (r.is_hidden || !activo(r.student_id) || vistos.has(r.student_id)) continue
      const hechos = r.completed_workouts ?? 0, total = r.estimated_workouts ?? 0
      const porCantidad = total > 0 && hechos >= total
      const porFecha = !!r.ends_on && r.ends_on < hoy
      if (!porCantidad && !porFecha) continue
      vistos.add(r.student_id)
      rutinasPend.push({ id: r.id, titulo: nombres.get(r.student_id)!, detalle: `${r.name} · ${porCantidad ? t('prof:home.cardRoutineDone', { done: hechos, total }) : t('prof:home.cardRoutineEnded', { date: fecha(r.ends_on!) })}`, to: `/professor/alunos/${r.student_id}?tab=rotinas` })
    }
    type A = { id: string; student_id: string; status: FilaAnam['estado']; created_at: string; submitted_at: string | null; template_name: string | null; template_name_es: string | null; template_name_en: string | null; completed_by: string | null; teacher_seen_at: string | null }
    const nombreA = (a: A) => (lang === 'es' && a.template_name_es) || (lang === 'en' && a.template_name_en) || a.template_name || ''
    const esNueva = (a: A) => a.status === 'completed' && a.completed_by !== 'teacher' && !a.teacher_seen_at
    setAnamTodas(((anams as A[]) ?? []).filter((a) => activo(a.student_id)).map((a) => ({
      id: a.id, alumno: nombres.get(a.student_id)!, nombre: nombreA(a), estado: a.status, nueva: esNueva(a),
      fecha: new Date(a.submitted_at ?? a.created_at).toLocaleDateString(localeDe(i18n.language)),
      to: `/professor/avaliacoes/${a.student_id}?anamnesis=${a.id}`,
    })))
    const evals: Pendiente[] = ((anams as A[]) ?? [])
      .filter((a) => esNueva(a) && activo(a.student_id))
      .map((a) => ({ id: a.id, titulo: nombres.get(a.student_id)!, detalle: t('prof:home.cardAnamDone', { name: (lang === 'es' && a.template_name_es) || (lang === 'en' && a.template_name_en) || a.template_name || '' }), to: `/professor/avaliacoes/${a.student_id}?anamnesis=${a.id}` }))
    const msgs: Pendiente[] = ((convs as { id: string; student_id: string; last_message: string | null; last_message_at: string | null; last_sender_id: string | null; teacher_last_read_at: string | null }[]) ?? [])
      .filter((c) => c.last_message_at && c.last_sender_id && c.last_sender_id !== tid && (!c.teacher_last_read_at || c.teacher_last_read_at < c.last_message_at) && activo(c.student_id))
      .map((c) => ({ id: c.id, titulo: nombres.get(c.student_id)!, detalle: c.last_message?.startsWith('::') ? t('prof:home.cardUnread') : (c.last_message ?? t('prof:home.cardUnread')), to: `/professor/mensagens/${c.id}` }))
    setPend({ rutinas: rutinasPend, evals, msgs })
  }

  // Una sola: va directo. Varias: lista para elegir. Ninguna: a la sección.
  function abrirPendientes(titulo: string, items: Pendiente[], porDefecto: string) {
    if (items.length === 1) nav(items[0].to)
    else if (items.length > 1) setLista({ titulo, items })
    else nav(porDefecto)
  }

  const activeStudents = stats?.active_students ?? 0
  const pendingInvites = stats?.pending_invites ?? 0
  const received = Number(stats?.month_received ?? 0)
  const unread = stats?.unread_notifications ?? 0
  const profileIncomplete = !profile?.profile_complete

  // Filter appointments for selected date and calculate dates with events
  const appointmentsForDate = useMemo(() => {
    return allAppointments.filter((appt) => {
      const apptDate = new Date(appt.starts_at)
      return (
        apptDate.getDate() === selectedDate.getDate() &&
        apptDate.getMonth() === selectedDate.getMonth() &&
        apptDate.getFullYear() === selectedDate.getFullYear()
      )
    })
  }, [allAppointments, selectedDate])

  const datesWithEvents = useMemo(() => {
    const dates = new Set<string>()
    allAppointments.forEach((appt) => dates.add(new Date(appt.starts_at).toDateString()))
    return dates
  }, [allAppointments])

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+16px)] lg:px-0 lg:pt-4">
      <InstalarApp />
      <ActivarAvisos />
      {/* Header */}
      <div className="flex items-center justify-between mb-5 lg:mb-7">
        <div>
          <div className="text-white text-rt-20 lg:text-rt-28 font-bold">{t('professor:hello', { name: firstName })}</div>
          <div className="text-white/60 text-rt-11 mt-0.5">{t('professor:welcomeBack')}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="lg:hidden"><LanguageToggle /></div>
          <button
            onClick={() => nav('/professor/configuracoes')}
            className="lg:hidden w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center"
            aria-label={t('prof:home.settings')}
          >
            <Settings size={20} className="text-white" />
          </button>
          <button
            onClick={() => nav('/professor/notificacoes')}
            className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center relative"
            aria-label={t('prof:home.notifications')}
          >
            <Bell size={20} className="text-white" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Plano incompleto (cartão warning) */}
      {profileIncomplete && (
        <button
          onClick={() => nav('/professor/perfil/completar')}
          className="w-full mb-3 rounded-card bg-warning-card p-4 flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-white/25 flex items-center justify-center">
            <Zap size={20} className="text-black" />
          </div>
          <div className="flex-1">
            <div className="text-black text-rt-14 font-bold">{t('professor:incompleteProfile')}</div>
            <div className="text-black/70 text-rt-11">{t('professor:completeProfileSub')}</div>
          </div>
          <ChevronRight size={20} className="text-black/70" />
        </button>
      )}

      <div className="md:grid md:grid-cols-2 md:gap-3 lg:gap-4 md:mb-3 lg:mb-4">
      {/* Card do plano */}
      <div
        onClick={() => nav('/professor/assinatura')}
        className={
          'rounded-card px-3 py-2.5 lg:px-4 lg:py-3 mb-3 md:mb-0 cursor-pointer flex items-center gap-3 ' +
          (plan === 'free' ? 'bg-plan-free' : 'bg-plan-premium')
        }
      >
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Users size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white/80 text-rt-10 font-semibold uppercase tracking-wider leading-none">{t('professor:plan')}</div>
          <div className="text-white text-rt-15 font-bold mt-1 leading-tight truncate">
            {t(`planes:name.${plan}`)}
            {plan === 'free' ? '' : ' ✓'}
            <span className="text-white/80 text-rt-11 font-normal"> · {planLimit === null ? t('planes:activeCount', { n: activeStudents }) : `${activeStudents} / ${planLimit}`}</span>
          </div>
        </div>
        {plan === 'free' && (
          <div className="shrink-0 h-8 px-3 rounded-btn-pill bg-white/95 flex items-center justify-center text-danger-strong text-rt-12 font-bold">
            {t('professor:planUpgrade')}
          </div>
        )}
      </div>

      {/* Convites recebidos (destaque laranja) */}
      {pendingInvites > 0 && (
        <button
          onClick={() => nav('/professor/convites')}
          className="w-full mb-3 rounded-card bg-warning p-4 flex items-center gap-3 text-left"
        >
          <div className="text-black text-rt-29 font-bold min-w-[40px] text-center">{pendingInvites}</div>
          <div className="flex-1">
            <div className="text-black text-rt-14 font-bold">{t('professor:pendingInvites')}</div>
            <div className="text-black/70 text-rt-11">{t('chat:tapToChat')}</div>
          </div>
          <ChevronRight size={20} className="text-black/70" />
        </button>
      )}

      {/* Recebidos do mês */}
      <div className="rounded-card bg-revenue p-4 lg:p-6 mb-3 md:mb-0 flex flex-col justify-center">
        <div className="text-white/80 text-rt-11 font-semibold uppercase tracking-wider">{t('professor:monthReceived')}</div>
        <div className="text-white text-rt-42 font-bold mt-1 leading-none">
          {loading ? '—' : formatMoney(received, currency)}
        </div>
      </div>
      </div>

      {/* Grid 2x2 de cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 lg:gap-4 mb-4 lg:mb-6">
        <DashCard title={t('professor:activeStudents')} value={activeStudents.toString()} icon={Users} onClick={() => nav('/professor/alunos')} />
        <DashCard title={t('professor:changeWorkouts')} value={String(pend.rutinas.length)} icon={RefreshCw} onClick={() => abrirPendientes(t('professor:changeWorkouts'), pend.rutinas, '/professor/alunos')} />
        <DashCard title={t('professor:assessments')} value={String(pend.evals.length)} icon={ClipboardCheck} onClick={() => setVerAnam(true)} />
        <DashCard title={t('professor:messages')} value={String(pend.msgs.length)} icon={MessageSquare} onClick={() => abrirPendientes(t('professor:messages'), pend.msgs, '/professor/mensagens')} />
      </div>

      {/* Calendar and Agenda */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
      {/* Un solo bloque: mes, avisar a alumnos y nuevo compromiso arriba; la semana se desliza con el dedo. */}
      <WeekCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        datesWithEvents={datesWithEvents}
        acciones={<>
          <button
            className="w-9 h-9 rounded-lg bg-surface-raised flex items-center justify-center"
            aria-label={t('prof:home.notifyStudents')}
            onClick={() => nav('/professor/notificar')}
          >
            <Send size={17} className="text-brand" strokeWidth={2.2} />
          </button>
          <button
            className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center"
            aria-label={t('prof:home.addAppointment')}
            onClick={() => nav('/professor/compromisso/novo')}
          >
            <Plus size={19} className="text-white" strokeWidth={2.4} />
          </button>
        </>}
      />

      <div className="mb-6">

        {loading ? (
          <div className="card-dark p-4 text-white/60 text-rt-13">{t('loading')}</div>
        ) : appointmentsForDate.length === 0 ? (
          <div className="card-dark p-4 text-white/60 text-rt-13">{t('professor:noAppointments')}</div>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {appointmentsForDate.slice(0, showMoreAppointments ? appointmentsForDate.length : 3).map((a) => {
                const d = new Date(a.starts_at)
                const timeStr = d.toLocaleTimeString(localeDe(), { hour: '2-digit', minute: '2-digit' })
                return (
                  <li key={a.id} onClick={() => nav(`/professor/compromisso/${a.id}`)} className="card-dark p-3 flex items-start gap-3 cursor-pointer active:opacity-80">
                    <div className="text-brand text-rt-15 font-bold min-w-[50px]">{timeStr}</div>
                    <div className="w-px bg-brand" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-rt-14 font-semibold">{a.title}</div>
                      {a.student_name && (
                        <div className="text-white/80 text-rt-12">{a.student_name}</div>
                      )}
                      {a.location && (
                        <div className="text-white/60 text-rt-11">📍 {a.location}</div>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-white/50 self-center shrink-0" aria-label={t('prof:appt.editTitle')} />
                  </li>
                )
              })}
            </ul>
            {appointmentsForDate.length > 3 && (
              <button
                onClick={() => setShowMoreAppointments(!showMoreAppointments)}
                className="w-full text-center text-brand text-rt-13 font-semibold py-2 mt-2"
              >
                {showMoreAppointments ? t('prof:home.seeLess') : t('prof:home.seeMore')}
              </button>
            )}
          </>
        )}
      </div>

      </div>

      <AnnouncementModal />

      {verAnam && (
        <div className="fixed inset-0 z-[60] popup-fondo bg-black/70" onClick={() => setVerAnam(false)}>
          <div className="popup-caja bg-surface-card p-5 max-h-[85dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white text-rt-18 font-bold">{t('professor:assessments')}</h2>
              <button onClick={() => setVerAnam(false)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white" aria-label={t('common:close')}><X size={18} /></button>
            </div>
            {/* El inicio es solo para lo nuevo: las anamnesis ya vistas quedan en Evaluaciones de cada alumno. */}
            {!anamTodas.some((a) => a.nueva) && <p className="text-white/60 text-rt-13 py-4 text-center">{t('prof:home.evalEmpty')}</p>}
            {[{ titulo: t('prof:home.evalNew'), filas: anamTodas.filter((a) => a.nueva) }].filter((g) => g.filas.length > 0).map((g) => (
              <div key={g.titulo} className="mb-4 last:mb-0">
                <div className="text-white/50 text-rt-11 font-semibold uppercase tracking-wide mb-2">{g.titulo}</div>
                <ul className="flex flex-col gap-2">
                  {g.filas.map((a) => (
                    <li key={g.titulo + a.id} className={'rounded-[12px] border p-3 ' + (a.nueva ? 'bg-brand/10 border-brand/40' : 'bg-surface-raised border-surface-line')}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-rt-14 font-semibold truncate">{a.nombre}</div>
                          <div className="text-white/70 text-rt-12 truncate">{a.alumno} · {a.fecha}</div>
                        </div>
                        <span className={'shrink-0 text-rt-10 font-semibold px-2 py-0.5 rounded-tag ' + (a.estado === 'completed' ? 'bg-brand/20 text-brand' : a.estado === 'in_progress' ? 'bg-[#42A5F5]/20 text-[#90CAF9]' : 'bg-warning/20 text-warning')}>
                          {t(`prof:home.evalStatus.${a.estado}`)}
                        </span>
                      </div>
                      <button onClick={() => { setVerAnam(false); nav(a.to) }} className="mt-2.5 w-full h-9 rounded-[10px] bg-brand text-white text-rt-12 font-semibold">
                        {t('prof:home.evalSeeAnswers')}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {lista && (
        <div className="fixed inset-0 z-[60] popup-fondo bg-black/70" onClick={() => setLista(null)}>
          <div className="popup-caja bg-surface-card p-5 max-h-[80dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white text-rt-18 font-bold">{lista.titulo}</h2>
              <button onClick={() => setLista(null)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white" aria-label={t('common:close')}><X size={18} /></button>
            </div>
            <ul className="flex flex-col gap-2">
              {lista.items.map((it) => (
                <li key={it.id}>
                  <button onClick={() => { setLista(null); nav(it.to) }} className="w-full rounded-[12px] bg-surface-raised border border-surface-line px-4 py-3 flex items-center gap-3 text-left active:scale-[0.99]">
                    <span className="flex-1 min-w-0">
                      <span className="block text-white text-rt-14 font-semibold truncate">{it.titulo}</span>
                      <span className="block text-white/60 text-rt-12 truncate">{it.detalle}</span>
                    </span>
                    <ChevronRight size={18} className="text-white/40 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function DashCard({
  title,
  value,
  icon: Icon,
  onClick,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="card-dark p-3 lg:p-5 flex flex-col justify-between h-24 lg:h-32 text-left hover:border-brand/50 active:scale-[0.98] transition"
    >
      <div className="flex items-start justify-between">
        <div className="text-white text-rt-13 font-semibold leading-tight">{title}</div>
        <Icon size={18} className="text-brand" />
      </div>
      <div className="text-white text-rt-29 font-bold leading-none">{value}</div>
    </button>
  )
}


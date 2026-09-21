import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Plus, Calendar, ChevronRight, Zap, RefreshCw, ClipboardCheck, MessageSquare, Users, Settings, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { LanguageToggle } from '@/components/LanguageToggle'
import { AnnouncementModal } from '@/components/AnnouncementModal'

type Stats = {
  active_students: number
  pending_invites: number
  month_received: number
  unread_notifications: number
}

type Appt = { id: string; title: string; starts_at: string; kind: string }

const PLAN_LIMITS: Record<string, number> = { free: 2, pro: 25, master: 50, elite: 100 }
const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', master: 'Master', elite: 'Elite' }

function formatMoney(v: number, currency: string) {
  try {
    return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'es-UY', { style: 'currency', currency, maximumFractionDigits: 2 }).format(v)
  } catch { return `${v.toFixed(2)}` }
}

const COUNTRY_CURRENCY: Record<string, string> = {
  BR: 'BRL', PT: 'EUR', ES: 'EUR', UY: 'UYU', AR: 'ARS', BO: 'BOB', PY: 'PYG',
  CL: 'CLP', CO: 'COP', PE: 'PEN', EC: 'USD', VE: 'USD',
}

export function ProfessorHome() {
  const { profile } = useAuth()
  const { t } = useTranslation()
  const nav = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [appointments, setAppointments] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)

  const currency = COUNTRY_CURRENCY[profile?.country ?? 'BR'] ?? 'BRL'
  const plan = profile?.plan ?? 'free'
  const planLimit = PLAN_LIMITS[plan] ?? 2
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Professor'

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const [{ data: statsRow }, { data: appts }] = await Promise.all([
        supabase.from('v_teacher_stats').select('*').eq('teacher_id', profile.id).single(),
        supabase
          .from('appointments')
          .select('id,title,starts_at,kind')
          .eq('teacher_id', profile.id)
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(3),
      ])
      setStats(statsRow ?? { active_students: 0, pending_invites: 0, month_received: 0, unread_notifications: 0 })
      setAppointments((appts as Appt[]) ?? [])
      setLoading(false)
    })()
  }, [profile?.id])

  const activeStudents = stats?.active_students ?? 0
  const pendingInvites = stats?.pending_invites ?? 0
  const received = Number(stats?.month_received ?? 0)
  const unread = stats?.unread_notifications ?? 0
  const profileIncomplete = !profile?.profile_complete

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-white text-rt-20 font-bold">{t('professor:hello', { name: firstName })}</div>
          <div className="text-white/60 text-rt-11 mt-0.5">{t('professor:welcomeBack')}</div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <button
            onClick={() => nav('/professor/configuracoes')}
            className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center"
            aria-label="Configurações"
          >
            <Settings size={20} className="text-white" />
          </button>
          <button
            onClick={() => nav('/professor/notificacoes')}
            className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center relative"
            aria-label="Notificações"
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

      {/* Card do plano */}
      <div
        onClick={() => nav('/professor/assinatura')}
        className={
          'rounded-card p-4 mb-3 cursor-pointer ' +
          (plan === 'free' ? 'bg-plan-free' : 'bg-plan-premium')
        }
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-white/80 text-rt-11 font-semibold uppercase tracking-wider">{t('professor:plan')}</div>
            <div className="text-white text-rt-20 font-bold mt-1">
              {PLAN_LABEL[plan]}
              {plan === 'free' ? '' : ' ✓'}
            </div>
            <div className="text-white/80 text-rt-11 mt-1">
              {activeStudents} / {planLimit}
            </div>
          </div>
          <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
            <Users size={22} className="text-white" />
          </div>
        </div>
        {plan === 'free' && (
          <div className="mt-3 h-9 rounded-btn-pill bg-white/95 flex items-center justify-center text-danger-strong text-rt-13 font-bold">
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
      <div className="rounded-card bg-revenue p-4 mb-3">
        <div className="text-white/80 text-rt-11 font-semibold uppercase tracking-wider">{t('professor:monthReceived')}</div>
        <div className="text-white text-rt-42 font-bold mt-1 leading-none">
          {loading ? '—' : formatMoney(received, currency)}
        </div>
      </div>

      {/* Grid 2x2 de cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <DashCard title={t('professor:activeStudents')} value={activeStudents.toString()} icon={Users} onClick={() => nav('/professor/alunos')} />
        <DashCard title={t('professor:changeWorkouts')} value="0" icon={RefreshCw} onClick={() => nav('/professor/alunos')} />
        <DashCard title={t('professor:assessments')} value="0" icon={ClipboardCheck} onClick={() => nav('/professor/alunos')} />
        <DashCard title={t('professor:messages')} value="0" icon={MessageSquare} onClick={() => nav('/professor/mensagens')} />
      </div>

      {/* Agenda */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="text-white text-rt-15 font-bold flex items-center gap-2">
            <Calendar size={18} className="text-brand" />
            {t('professor:schedule')}
          </div>
          <div className="flex gap-2">
            <button
              className="w-[30px] h-[30px] rounded-md bg-surface-raised flex items-center justify-center"
              aria-label="Notificar alunos"
              onClick={() => nav('/professor/notificar')}
            >
              <Send size={16} className="text-brand" strokeWidth={2.2} />
            </button>
            <button
              className="w-[30px] h-[30px] rounded-md bg-brand flex items-center justify-center"
              aria-label="Adicionar compromisso"
              onClick={() => nav('/professor/compromisso/novo')}
            >
              <Plus size={18} className="text-white" strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card-dark p-4 text-white/60 text-rt-13">{t('loading')}</div>
        ) : appointments.length === 0 ? (
          <div className="card-dark p-4 text-white/60 text-rt-13">{t('professor:noAppointments')}</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {appointments.map((a) => {
              const d = new Date(a.starts_at)
              return (
                <li key={a.id} className="card-dark p-3 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-md bg-surface-input flex flex-col items-center justify-center">
                    <div className="text-white text-rt-14 font-bold leading-none">{d.getDate()}</div>
                    <div className="text-white/60 text-rt-9 uppercase">
                      {d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-rt-14 font-semibold truncate">{a.title}</div>
                    <div className="text-white/60 text-rt-11">
                      {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <AnnouncementModal />
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
      className="card-dark p-3 flex flex-col justify-between h-24 text-left active:scale-[0.98] transition"
    >
      <div className="flex items-start justify-between">
        <div className="text-white text-rt-13 font-semibold leading-tight">{title}</div>
        <Icon size={18} className="text-brand" />
      </div>
      <div className="text-white text-rt-29 font-bold leading-none">{value}</div>
    </button>
  )
}


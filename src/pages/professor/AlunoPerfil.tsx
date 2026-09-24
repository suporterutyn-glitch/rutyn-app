import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, User as UserIcon, MessageCircle, MoreVertical, Pause, Play, UserMinus, FileText, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { currencyOf, formatMoney } from '@/lib/plans'
import { ConfirmDialog, ConfirmConMotivo } from '@/components/ConfirmDialog'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { ProgressaoCarga } from '@/components/ProgressaoCarga'

type StudentProfile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  link_status: string
  avatar_url: string | null
}

type SR = { id: string; name: string; objective: string | null; completed_workouts: number; estimated_workouts: number; is_hidden: boolean }
type SD = { id: string; name: string }
type Charge = { id: string; amount: number; due_date: string; status: string }

const TABS = [
  { key: 'perfil', label: 'Perfil' },
  { key: 'rotinas', label: 'Rotinas' },
  { key: 'dietas', label: 'Dietas' },
  { key: 'avaliacoes', label: 'Avaliações' },
  { key: 'desempenho', label: 'Desempenho' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function AlunoPerfilPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { profile: me } = useAuth()
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [tab, setTab] = useState<TabKey>('perfil')
  const [routines, setRoutines] = useState<SR[]>([])
  const [diets, setDiets] = useState<SD[]>([])
  const [charge, setCharge] = useState<Charge | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmando, setConfirmando] = useState<'suspender' | 'remover' | null>(null)
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [verProgresso, setVerProgresso] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  async function load() {
    if (!id) return
    const [{ data: p }, { data: sr }, { data: sd }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('student_routines').select('id,name,objective,completed_workouts,estimated_workouts,is_hidden').eq('student_id', id).order('created_at', { ascending: false }),
      supabase.from('student_diets').select('id,name').eq('student_id', id).order('created_at', { ascending: false }),
      supabase.from('charges').select('id,amount,due_date,status').eq('student_id', id).order('due_date', { ascending: false }).limit(1).maybeSingle(),
    ])
    setStudent((p as StudentProfile) ?? null)
    setRoutines((sr as SR[]) ?? [])
    setDiets((sd as SD[]) ?? [])
    setCharge((c as Charge) ?? null)
  }
  useEffect(() => { void load() }, [id])

  // Lo que el alumno realmente hizo: sesiones, carga movida y esfuerzo.
  useEffect(() => {
    if (!id) return
    void (async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('id,started_at,duration_seconds,effort_1_5,data')
        .eq('student_id', id)
        .order('started_at', { ascending: false })
        .limit(30)
      setSesiones((data as Sesion[]) ?? [])
    })()
  }, [id])

  async function suspend() {
    if (!id) return
    setConfirmando(null)
    const { error } = await supabase.rpc('gestionar_vinculo_aluno', { aluno_id: id, accion: 'suspender', mensaje: null })
    if (error) { setErrorAccion(error.message); return }
    await supabase.from('notifications').insert({ user_id: id, type: 'warning', title: 'Sua conta foi suspensa', body: 'Fale com seu professor para regularizar.' })
    await load(); setMenuOpen(false)
  }
  async function reactivate() {
    if (!id) return
    const { error } = await supabase.rpc('gestionar_vinculo_aluno', { aluno_id: id, accion: 'reactivar' })
    if (error) { setErrorAccion(error.message); return }
    await load(); setMenuOpen(false)
  }
  async function remove(reason: string) {
    if (!id) return
    setConfirmando(null)
    // El motivo se guarda con el vínculo: es lo que el alumno ve al entrar.
    const { error } = await supabase.rpc('gestionar_vinculo_aluno', { aluno_id: id, accion: 'desvincular', mensaje: reason || null })
    if (error) { setErrorAccion(error.message); return }
    await supabase.from('notifications').insert({
      user_id: id, type: 'warning',
      title: 'Removido da lista',
      body: `${me?.full_name ?? 'Seu professor'} te removeu.${reason ? ` Motivo: ${reason}` : ''}`,
    })
    nav('/professor/alunos', { replace: true })
  }

  const suspended = student?.link_status === 'suspended'

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-4 relative">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold flex-1">Perfil do Aluno</h1>
        <button onClick={() => setMenuOpen((v) => !v)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <MoreVertical size={20} />
        </button>
        {menuOpen && (
          <div className="absolute top-11 right-0 w-56 bg-surface-raised rounded-card border border-surface-line-strong z-30 py-1">
            {suspended ? (
              <button onClick={reactivate} className="w-full flex items-center gap-2 px-4 py-3 text-white text-rt-13 hover:bg-white/5">
                <Play size={16} className="text-brand" /> Reativar aluno
              </button>
            ) : (
              <button onClick={() => { setMenuOpen(false); setConfirmando('suspender') }} className="w-full flex items-center gap-2 px-4 py-3 text-white text-rt-13 hover:bg-white/5">
                <Pause size={16} className="text-warning" /> Suspender
              </button>
            )}
            <button onClick={() => { setMenuOpen(false); nav(`/professor/anamnese/${id}`) }} className="w-full flex items-center gap-2 px-4 py-3 text-white text-rt-13 hover:bg-white/5">
              <FileText size={16} className="text-brand-assess" /> Anamneses
            </button>
            <button onClick={() => { setMenuOpen(false); setConfirmando('remover') }} className="w-full flex items-center gap-2 px-4 py-3 text-danger text-rt-13 hover:bg-white/5">
              <UserMinus size={16} /> Remover da lista
            </button>
          </div>
        )}
      </div>

      <div className={'card-dark p-4 mb-4 flex items-center gap-3 ' + (suspended ? 'border-warning/40' : '')}>
        <div className={'w-16 h-16 rounded-full bg-surface-raised border-2 flex items-center justify-center overflow-hidden ' + (suspended ? 'border-warning' : 'border-brand')}>
          {student?.avatar_url ? <img src={student.avatar_url} alt="" className="w-full h-full object-cover" /> : <UserIcon size={28} className="text-grey-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-rt-17 font-bold truncate">{student?.full_name ?? '...'}</div>
          <div className="text-grey-500 text-rt-11 truncate">{student?.email}</div>
          {suspended && <span className="text-warning text-rt-10 font-bold uppercase">Suspenso</span>}
        </div>
        {student?.phone && (
          <a href={`https://wa.me/${student.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
            className="w-10 h-10 rounded-full bg-brand/15 border border-brand flex items-center justify-center text-brand" aria-label="WhatsApp">
            <MessageCircle size={18} />
          </a>
        )}
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const on = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={
              'shrink-0 px-3 h-8 rounded-card border text-rt-12 font-semibold ' +
              (on ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-grey-400')
            }>{t.label}</button>
          )
        })}
      </div>

      {tab === 'perfil' && (
        <div className="flex flex-col gap-3">
          {charge && (
            <div className="card-dark p-4">
              <div className="text-white/60 text-rt-11 uppercase font-semibold tracking-wide">Última cobrança</div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-white text-rt-15 font-bold">
                  {formatMoney(Number(charge.amount), currencyOf(me?.country))}
                </div>
                <span className={
                  'text-rt-9 font-bold px-2 py-0.5 rounded-tag ' +
                  (charge.status === 'paid' ? 'bg-brand text-white' :
                   charge.status === 'awaiting' ? 'bg-info text-white' :
                   charge.status === 'suspended' ? 'bg-danger-deep text-white' : 'bg-warning text-black')
                }>{ETIQUETA_COBRANCA[charge.status] ?? charge.status}</span>
              </div>
              <div className="text-white/60 text-rt-11 mt-1">Vence {new Date(charge.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
            </div>
          )}
          <button onClick={() => nav('/professor/financeiro')} className="btn-outline-white h-11 rounded-btn-pill">
            Ver financeiro
          </button>
        </div>
      )}

      {tab === 'rotinas' && (
        <div className="flex flex-col gap-2">
          {routines.length === 0 ? (
            <div className="card-dark p-4 text-white/60 text-rt-13">Nenhuma rotina atribuída.</div>
          ) : routines.map((r) => (
            <div key={r.id} className="card-dark p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-rt-13 font-bold truncate">{r.name}</div>
                  <div className="text-white/60 text-rt-11">{r.completed_workouts}/{r.estimated_workouts} treinos</div>
                </div>
                {r.is_hidden && <span className="text-alert-orange text-rt-9 font-bold px-2 py-0.5 rounded-tag border border-alert-orange">Oculto</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'dietas' && (
        <div className="flex flex-col gap-2">
          {diets.length === 0 ? (
            <div className="card-dark p-4 text-white/60 text-rt-13">Nenhuma dieta atribuída.</div>
          ) : diets.map((d) => (
            <div key={d.id} className="card-dark p-3">
              <div className="text-white text-rt-13 font-bold">{d.name}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'desempenho' && (
        <DesempenhoAluno
          sesiones={sesiones}
          onVerExercicio={(nombre) => setVerProgresso(nombre)}
        />
      )}

      {verProgresso && id && (
        <ProgressaoCarga
          studentId={id}
          nombreExercicio={verProgresso}
          onCerrar={() => setVerProgresso(null)}
        />
      )}

      {tab === 'avaliacoes' && (
        <div className="flex flex-col gap-2">
          <button onClick={() => nav(`/professor/avaliacoes/${id}`)} className="btn-primary-pill">
            Abrir avaliação física
          </button>
          <button onClick={() => nav(`/professor/anamnese/${id}`)} className="btn-outline-white h-11 rounded-btn-pill">
            Anamneses
          </button>
        </div>
      )}

      {confirmando === 'suspender' && (
        <ConfirmDialog
          message="Suspender este aluno?"
          detail="Ele perde acesso aos treinos até você reativá-lo."
          confirmLabel="Suspender"
          onConfirm={() => void suspend()}
          onCancel={() => setConfirmando(null)}
        />
      )}

      {confirmando === 'remover' && (
        <ConfirmConMotivo
          message="Remover este aluno da sua lista?"
          detail="Ele deixa de ser seu aluno. Você pode contar o motivo."
          placeholder="Motivo (opcional)"
          confirmLabel="Remover"
          onConfirm={(motivo) => void remove(motivo)}
          onCancel={() => setConfirmando(null)}
        />
      )}

      {errorAccion && (
        <FeedbackDialog kind="error" message={errorAccion} onClose={() => setErrorAccion(null)} />
      )}
    </div>
  )
}

/** El estado viene en inglés desde la base; acá se muestra en portugués. */
const ETIQUETA_COBRANCA: Record<string, string> = {
  pending: 'Pendente',
  awaiting: 'Aguardando',
  paid: 'Pago',
  suspended: 'Suspenso',
}

type SerieHecha = { done?: boolean; load?: string; reps?: number }
type ExHecho = { name: string; series?: SerieHecha[] }
type Sesion = {
  id: string
  started_at: string
  duration_seconds: number
  effort_1_5: number | null
  data?: { exercises?: ExHecho[]; effort_note?: string | null }
}

const ESFUERZO: Record<number, { emoji: string; texto: string }> = {
  1: { emoji: '😌', texto: 'Leve' },
  2: { emoji: '🙂', texto: 'Tranquilo' },
  3: { emoji: '😐', texto: 'Moderado' },
  4: { emoji: '😓', texto: 'Puxado' },
  5: { emoji: '🥵', texto: 'Muito intenso' },
}

/** Carga total movida en una sesión: carga x repetições de cada série feita. */
function volumeDaSessao(s: Sesion): number {
  return (s.data?.exercises ?? []).reduce((total, ex) => (
    total + (ex.series ?? []).reduce((n, sr) => (
      n + (sr.done ? (Number(sr.load) || 0) * (Number(sr.reps) || 0) : 0)
    ), 0)
  ), 0)
}

/**
 * Lo que el profesor no tenía: qué hizo el alumno en cada treino, cuánto peso
 * movió, cuánto le costó y con qué carga viene trabajando cada ejercicio.
 */
function DesempenhoAluno({ sesiones, onVerExercicio }: {
  sesiones: Sesion[]
  onVerExercicio: (nombre: string) => void
}) {
  if (sesiones.length === 0) {
    return (
      <div className="card-dark p-6 text-center">
        <div className="text-white text-rt-15 font-bold mb-1">Sem treinos registrados</div>
        <div className="text-white/60 text-rt-12">
          Quando o aluno concluir um treino, aparecem aqui as cargas e o esforço.
        </div>
      </div>
    )
  }

  // Ejercicios distintos, para poder abrir la progresión de cada uno.
  const exercicios = Array.from(new Set(
    sesiones.flatMap((s) => (s.data?.exercises ?? []).map((e) => e.name)),
  ))

  const volumeTotal = sesiones.reduce((n, s) => n + volumeDaSessao(s), 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="card-dark p-3">
          <div className="text-white text-rt-13 font-semibold">Treinos feitos</div>
          <div className="text-white text-rt-29 font-bold mt-2">{sesiones.length}</div>
        </div>
        <div className="card-dark p-3">
          <div className="text-white text-rt-13 font-semibold">Peso total movido</div>
          <div className="text-white text-rt-29 font-bold mt-2">{Math.round(volumeTotal)}<span className="text-rt-14"> kg</span></div>
        </div>
      </div>

      {exercicios.length > 0 && (
        <div>
          <div className="text-white text-rt-15 font-bold mb-2">Progressão de carga</div>
          <ul className="flex flex-col gap-2">
            {exercicios.map((nombre) => (
              <li key={nombre}>
                <button
                  onClick={() => onVerExercicio(nombre)}
                  className="w-full card-dark p-3 flex items-center gap-3 text-left active:scale-[0.99]"
                >
                  <TrendingUp size={18} className="text-brand shrink-0" />
                  <span className="flex-1 text-white text-rt-14 truncate">{nombre}</span>
                  <span className="text-brand text-rt-12">ver</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="text-white text-rt-15 font-bold mb-2">Últimos treinos</div>
        <ul className="flex flex-col gap-2">
          {sesiones.map((s) => {
            const esfuerzo = s.effort_1_5 ? ESFUERZO[s.effort_1_5] : null
            const min = Math.round(s.duration_seconds / 60)
            return (
              <li key={s.id} className="card-dark p-3">
                <div className="flex items-center gap-2">
                  <span className="text-white text-rt-14 font-semibold flex-1">
                    {new Date(s.started_at).toLocaleDateString('pt-BR')}
                  </span>
                  {esfuerzo && (
                    <span className="text-rt-12 text-white/70">{esfuerzo.emoji} {esfuerzo.texto}</span>
                  )}
                </div>
                <div className="text-white/60 text-rt-12 mt-1">
                  {min} min · {Math.round(volumeDaSessao(s))} kg movidos
                </div>
                {s.data?.effort_note && (
                  <p className="text-white/70 text-rt-12 italic mt-2 leading-[1.4]">“{s.data.effort_note}”</p>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, User as UserIcon, MessageCircle, MoreVertical, Pause, Play, UserMinus, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

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

  async function suspend() {
    if (!id || !confirm('Suspender este aluno? Ele perde acesso aos treinos.')) return
    await supabase.from('profiles').update({ link_status: 'suspended' }).eq('id', id)
    await supabase.from('notifications').insert({ user_id: id, type: 'warning', title: 'Sua conta foi suspensa', body: 'Fale com seu professor para regularizar.' })
    await load(); setMenuOpen(false)
  }
  async function reactivate() {
    if (!id) return
    await supabase.from('profiles').update({ link_status: 'active' }).eq('id', id)
    await load(); setMenuOpen(false)
  }
  async function remove() {
    if (!id) return
    const reason = prompt('Motivo (opcional):') ?? ''
    if (!confirm('Remover este aluno da sua lista?')) return
    await supabase.from('profiles').update({ teacher_id: null, link_status: 'ended' }).eq('id', id)
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
              <button onClick={suspend} className="w-full flex items-center gap-2 px-4 py-3 text-white text-rt-13 hover:bg-white/5">
                <Pause size={16} className="text-warning" /> Suspender
              </button>
            )}
            <button onClick={() => { setMenuOpen(false); nav(`/professor/anamnese/${id}`) }} className="w-full flex items-center gap-2 px-4 py-3 text-white text-rt-13 hover:bg-white/5">
              <FileText size={16} className="text-brand-assess" /> Anamneses
            </button>
            <button onClick={remove} className="w-full flex items-center gap-2 px-4 py-3 text-danger text-rt-13 hover:bg-white/5">
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
                  R$ {Number(charge.amount).toFixed(2)}
                </div>
                <span className={
                  'text-rt-9 font-bold px-2 py-0.5 rounded-tag ' +
                  (charge.status === 'paid' ? 'bg-brand text-white' :
                   charge.status === 'awaiting' ? 'bg-info text-white' :
                   charge.status === 'suspended' ? 'bg-danger-deep text-white' : 'bg-warning text-black')
                }>{charge.status.toUpperCase()}</span>
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
    </div>
  )
}

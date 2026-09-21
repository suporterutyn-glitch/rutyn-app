import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, CheckCircle2, Play } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { EmptyState } from '@/pages/professor/projetos/RoutinesTab'

type SR = {
  id: string
  name: string
  objective: string | null
  starts_on: string | null
  ends_on: string | null
  estimated_workouts: number
  completed_workouts: number
  is_hidden: boolean
}

function isVisible(r: SR): boolean {
  if (r.is_hidden) return false
  const today = new Date().toISOString().slice(0, 10)
  if (r.starts_on && today < r.starts_on) return false
  if (r.ends_on && today > r.ends_on) return false
  return true
}

export function TreinosPage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const [items, setItems] = useState<SR[]>([])
  const [loading, setLoading] = useState(true)
  const [ongoing, setOngoing] = useState<{ id: string; startedAt: number } | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase
        .from('student_routines')
        .select('id,name,objective,starts_on,ends_on,estimated_workouts,completed_workouts,is_hidden')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false })
      setItems(((data as SR[]) ?? []).filter(isVisible))
      setLoading(false)

      // Detecta treino em andamento no localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) ?? ''
        const m = k.match(/^sr-(.+)-started$/)
        if (m) {
          const ts = Number(localStorage.getItem(k))
          if (ts && (data as SR[])?.some((r) => r.id === m[1])) {
            setOngoing({ id: m[1], startedAt: ts })
            break
          }
        }
      }
    })()
  }, [profile?.id])

  function resumeMinutes() {
    if (!ongoing) return 0
    return Math.floor((Date.now() - ongoing.startedAt) / 60000)
  }
  function discardOngoing() {
    if (!ongoing) return
    localStorage.removeItem(`sr-${ongoing.id}-started`)
    localStorage.removeItem(`sr-${ongoing.id}-progress`)
    setOngoing(null)
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <h1 className="text-white text-rt-20 font-bold mb-4">Meus Treinos</h1>

      {ongoing && (
        <div className="rounded-card bg-brand/15 border border-brand p-3 mb-4 flex items-center gap-3 animate-pulse-highlight">
          <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center">
            <Play size={16} className="text-white" fill="white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-rt-13 font-bold">Treino em andamento</div>
            <div className="text-white/60 text-rt-11">Iniciado há {resumeMinutes()} min</div>
          </div>
          <button onClick={() => nav(`/aluno/treinos/${ongoing.id}/execucao`)} className="h-9 px-3 rounded-btn-pill bg-brand text-white text-rt-12 font-bold">
            Retomar
          </button>
          <button onClick={discardOngoing} className="text-danger text-rt-11 font-semibold px-2">Descartar</button>
        </div>
      )}
      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Dumbbell} title="Nenhum treino disponível" body="Seu professor ainda não atribuiu uma rotina para você." />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((r) => {
            const pct = r.estimated_workouts > 0 ? Math.min(100, Math.round((r.completed_workouts / r.estimated_workouts) * 100)) : 0
            const done = r.estimated_workouts > 0 && r.completed_workouts >= r.estimated_workouts
            const atual = r.completed_workouts > 0 && !done
            return (
              <li key={r.id}>
                <Link to={`/aluno/treinos/${r.id}`} className="card-dark p-4 block active:scale-[0.99] transition">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-11 h-11 rounded-lg bg-surface-input flex items-center justify-center">
                      {done ? <CheckCircle2 size={22} className="text-brand" /> : <Dumbbell size={20} className="text-brand" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-rt-14 font-bold truncate">{r.name}</div>
                      <div className="text-white/60 text-rt-11 truncate">{r.objective ?? 'Sem descrição'}</div>
                    </div>
                    {atual && <span className="text-rt-9 font-bold px-2 py-0.5 rounded-tag bg-brand/15 text-brand border border-brand/30">ATUAL</span>}
                    {done && <span className="text-rt-9 font-bold px-2 py-0.5 rounded-tag bg-brand text-white">CONCLUÍDO</span>}
                  </div>
                  {r.estimated_workouts > 0 && (
                    <div>
                      <div className="flex justify-between text-rt-10 mb-1">
                        <span className="text-white/60">{r.completed_workouts} / {r.estimated_workouts} treinos</span>
                        <span className="text-brand font-semibold">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-raised overflow-hidden">
                        <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

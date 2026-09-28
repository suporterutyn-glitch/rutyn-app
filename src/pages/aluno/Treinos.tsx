import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, CheckCircle2, Play, Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { objetivosTreino, gruposMusculares, etiquetaDe } from '@/lib/catalogos'
import { MiniaturaMedia, type Media } from '@/components/MediaExercicio'
import { LanguageToggle } from '@/components/LanguageToggle'
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
  data: { exercises?: (Media & { muscle_group?: string | null })[] } | null
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
  const { t, i18n } = useTranslation()
  const [items, setItems] = useState<SR[]>([])
  const [loading, setLoading] = useState(true)
  const [ongoing, setOngoing] = useState<{ id: string; startedAt: number } | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase
        .from('student_routines')
        .select('id,name,objective,starts_on,ends_on,estimated_workouts,completed_workouts,is_hidden,data')
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

  // Progreso global del plan, como en el diseño ("9/36 Treinos").
  const hechosTotal = items.reduce((n, r) => n + (r.completed_workouts ?? 0), 0)
  const estimadosTotal = items.reduce((n, r) => n + (r.estimated_workouts ?? 0), 0)
  const pctTotal = estimadosTotal > 0 ? Math.min(100, Math.round((hechosTotal / estimadosTotal) * 100)) : 0

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      {/* Mismo encabezado que el resto de las pantallas del alumno */}
      <div className="flex items-center justify-between mb-5">
        <div className="min-w-0">
          <div className="text-white text-rt-20 font-bold truncate">
            {t('aluno:hello', { name: profile?.full_name?.split(' ')[0] ?? t('treino:student') })}
          </div>
          <div className="text-white/60 text-rt-11 mt-0.5 truncate">{t('aluno:myWorkouts')}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LanguageToggle />
          <button onClick={() => nav('/aluno/notificacoes')} className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center" aria-label={t('treino:notifications')}>
            <Bell size={20} className="text-white" />
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex items-end justify-between gap-4 mb-3">
          <div className="text-white text-rt-15">{t('aluno:pickWorkout')}</div>
          <div className="flex-1 max-w-[180px]">
            <div className="text-white/70 text-rt-11 text-right mb-1">
              {t('aluno:workoutsCount', { done: hechosTotal, total: estimadosTotal })}
            </div>
            <div className="h-1.5 rounded-full bg-surface-raised overflow-hidden">
              <div className="h-full bg-brand" style={{ width: `${pctTotal}%` }} />
            </div>
          </div>
        </div>
      )}

      {ongoing && (
        <div className="rounded-card bg-brand/15 border border-brand p-3 mb-4 flex items-center gap-3 animate-pulse-highlight">
          <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center">
            <Play size={16} className="text-white" fill="white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-rt-13 font-bold">{t('treino:inProgress')}</div>
            <div className="text-white/60 text-rt-11">{t('treino:startedAgo', { n: resumeMinutes() })}</div>
          </div>
          <button onClick={() => nav(`/aluno/treinos/${ongoing.id}/execucao`)} className="h-9 px-3 rounded-btn-pill bg-brand text-white text-rt-12 font-bold">{t('treino:resumeWorkout')}</button>
          <button onClick={discardOngoing} className="text-danger text-rt-11 font-semibold px-2">{t('treino:discard')}</button>
        </div>
      )}
      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">{t('treino:loading')}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Dumbbell} title={t('aluno:noWorkouts')} body={t('aluno:noWorkoutsSub')} />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 items-start gap-3">
          {items.map((r) => {
            const done = r.estimated_workouts > 0 && r.completed_workouts >= r.estimated_workouts
            const atual = r.completed_workouts > 0 && !done
            return (
              <li key={r.id}>
                <Link
                  to={`/aluno/treinos/${r.id}`}
                  className={
                    'card-dark p-3 flex items-center gap-3 active:scale-[0.99] transition ' +
                    (done || atual ? 'border-brand' : '')
                  }
                >
                  <MiniaturaMedia media={r.data?.exercises?.[0] ?? {}} tamano={64} />

                  <div className="flex-1 min-w-0">
                    <div className="text-white text-rt-15 font-bold leading-tight">{r.name}</div>
                    {/* Como en el diseño: los grupos musculares que trabaja el treino. */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {Array.from(new Set((r.data?.exercises ?? []).map((e) => e.muscle_group).filter(Boolean) as string[]))
                        .slice(0, 4)
                        .map((g) => (
                          <span key={g} className="text-rt-11 px-2.5 py-1 rounded-btn-pill border border-grey-700 text-white/70">
                            {etiquetaDe(gruposMusculares, g, i18n.language) || g}
                          </span>
                        ))}
                      {!(r.data?.exercises ?? []).some((e) => e.muscle_group) && r.objective && (
                        <span className="text-rt-11 px-2.5 py-1 rounded-btn-pill border border-grey-700 text-white/70">
                          {etiquetaDe(objetivosTreino, r.objective, i18n.language)}
                        </span>
                      )}
                    </div>
                  </div>

                  {atual && (
                    <span className="px-3 py-1.5 rounded-btn-pill bg-brand text-white text-rt-12 font-semibold shrink-0">
                      {t('aluno:current')}
                    </span>
                  )}
                  {done && (
                    <span className="px-3 py-1.5 rounded-btn-pill border border-brand text-brand text-rt-12 font-semibold shrink-0 flex items-center gap-1">
                      <CheckCircle2 size={14} /> {t('aluno:doneLabel')}
                    </span>
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

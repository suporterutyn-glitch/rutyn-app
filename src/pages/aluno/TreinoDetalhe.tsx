import { useEffect, useState } from 'react'
import { nombreEjercicio } from '@/lib/nombreEjercicio'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DragSlider } from '@/components/DragSlider'
import { BannerMedia, MiniaturaMedia } from '@/components/MediaExercicio'
import { useTranslation } from 'react-i18next'
import { objetivosTreino, gruposMusculares, etiquetaDe } from '@/lib/catalogos'
import { localeDe } from '@/lib/fechas'

type SR = {
  id: string
  name: string
  objective: string | null
  data: {
    exercises?: Array<{
      name: string
      name_pt?: string | null
      name_es?: string | null
      name_en?: string | null
      muscle_group?: string | null
      thumbnail_url?: string | null
      video_url?: string | null
      media_type?: string | null
      /** number = snapshot viejo; array = con repeticiones, carga y descanso. */
      series: number | Array<{ reps?: string; load?: string; rest?: string }>
    }>
  }
  completed_workouts: number
  estimated_workouts: number
}

type Session = { started_at: string; duration_seconds: number; data: any }

export function TreinoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { t, i18n } = useTranslation()
  const [routine, setRoutine] = useState<SR | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    if (!id) return
    void (async () => {
      const [{ data: r }, { data: s }] = await Promise.all([
        supabase.from('student_routines').select('*').eq('id', id).single(),
        supabase.from('workout_sessions').select('started_at,duration_seconds,data').eq('student_routine_id', id).order('started_at').limit(20),
      ])
      setRoutine(r as SR)
      setSessions((s as Session[]) ?? [])
    })()
  }, [id])

  const exercises = routine?.data?.exercises ?? []

  // Progressão: volume total (sum load*reps das concluídas) por sessão
  const points = sessions.map((s) => {
    const exs = (s.data?.exercises ?? []) as Array<{ series?: Array<{ done?: boolean; load?: string; reps?: number }> }>
    let vol = 0
    exs.forEach((e) => (e.series ?? []).forEach((sr) => {
      if (sr.done) vol += (Number(sr.load) || 0) * (Number(sr.reps) || 0)
    }))
    return { date: s.started_at, vol }
  })

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-32">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold truncate">{routine?.name ?? '...'}</h1>
      </div>

      {routine?.objective && (
        <div className="text-white/70 text-rt-13 mb-4">
          {etiquetaDe(objetivosTreino, routine.objective, i18n.language)}
        </div>
      )}

      <div className="text-white text-rt-15 font-bold mb-2">{t('treino:exercises')}</div>
      {exercises.length === 0 ? (
        <div className="card-dark p-4 text-white/60 text-rt-13">{t('treino:noExercises')}</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {exercises.map((e, i) => {
            const cantidad = Array.isArray(e.series) ? e.series.length : e.series
            const cargas = Array.isArray(e.series)
              ? e.series.map((sr) => sr.load).filter((x) => x && x.trim() !== '')
              : []
            return (
              <li key={i} className="card-dark p-3">
                <div className="flex items-start gap-3">
                <MiniaturaMedia media={e} tamano={64} />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-rt-15 font-semibold leading-tight">{nombreEjercicio(e, i18n.language)}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {e.muscle_group && <Chip>{etiquetaDe(gruposMusculares, e.muscle_group, i18n.language) || e.muscle_group}</Chip>}
                    <Chip>{t('treino:series', { count: cantidad })}</Chip>
                    {cargas.length > 0 && (
                      <Chip><span className="font-bold">KG</span> - {cargas.join('/')}</Chip>
                    )}
                  </div>
                </div>
                </div>
                {(e.video_url || e.media_type) && (
                  <div className="mt-3">
                    <BannerMedia media={e} alto={150} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {points.length >= 2 && (
        <div className="card-dark p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-brand" />
            <span className="text-white text-rt-13 font-bold">{t('treino:volumeProgress')}</span>
          </div>
          <ProgressChart points={points} />
        </div>
      )}

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app px-4 pb-4"
           style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 116px)' }}>
        <div className="h-[5px] rounded-full bg-brand-h mb-2" />
        <DragSlider
          label={t('treino:dragToStart')}
          onConfirm={() => nav(`/aluno/treinos/${id}/execucao`)}
        />
      </div>
    </div>
  )
}

function ProgressChart({ points }: { points: { date: string; vol: number }[] }) {
  const W = 300, H = 120, P = 16
  const max = Math.max(...points.map((p) => p.vol), 1)
  const step = points.length > 1 ? (W - P * 2) / (points.length - 1) : 0
  const coords = points.map((p, i) => {
    const x = P + i * step
    const y = H - P - ((p.vol / max) * (H - P * 2))
    return { x, y, vol: p.vol }
  })
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
  const area = `${path} L${coords[coords.length - 1].x},${H - P} L${coords[0].x},${H - P} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32">
      <defs>
        <linearGradient id="volArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7CB342" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7CB342" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#volArea)" />
      <path d={path} stroke="#7CB342" strokeWidth="2" fill="none" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3" fill="#91C145" />
      ))}
      <text x={P} y={H - 2} fontSize="9" fill="#9E9E9E">
        {new Date(points[0].date).toLocaleDateString(localeDe(), { day: '2-digit', month: '2-digit' })}
      </text>
      <text x={W - P} y={H - 2} fontSize="9" fill="#9E9E9E" textAnchor="end">
        {new Date(points[points.length - 1].date).toLocaleDateString(localeDe(), { day: '2-digit', month: '2-digit' })}
      </text>
      <text x={W - P} y={12} fontSize="10" fill="#7CB342" textAnchor="end" fontWeight="700">
        {Math.round(coords[coords.length - 1].vol).toLocaleString(localeDe())} kg
      </text>
    </svg>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-rt-11 px-2.5 py-1 rounded-btn-pill border border-grey-700 text-white/70">
      {children}
    </span>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, Play, Pause, RotateCcw, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DragSlider } from '@/components/DragSlider'

type Serie = { done: boolean; load: string; reps: number }
type Exercise = { name: string; series: Serie[] }

const DEFAULT_REST = 90 // seconds

export function TreinoExecucaoPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()

  const [name, setName] = useState('Treino')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [rest, setRest] = useState(0)
  const [restRunning, setRestRunning] = useState(false)
  const timerRef = useRef<number | null>(null)
  const restRef = useRef<number | null>(null)

  useEffect(() => {
    if (!id) return
    void (async () => {
      const { data } = await supabase.from('student_routines').select('name,data').eq('id', id).single()
      setName((data?.name as string) ?? 'Treino')
      const src = (data?.data?.exercises as Array<{ name: string; series: number }>) ?? []
      const local = localStorage.getItem(`sr-${id}-progress`)
      if (local) {
        try { setExercises(JSON.parse(local)); return } catch { /* ignore */ }
      }
      setExercises(src.length > 0
        ? src.map((e) => ({ name: e.name, series: Array.from({ length: e.series }, () => ({ done: false, load: '', reps: 10 })) }))
        : [{ name: 'Exercício exemplo', series: Array.from({ length: 3 }, () => ({ done: false, load: '', reps: 10 })) }])
    })()
  }, [id])

  useEffect(() => {
    if (!id) return
    // Se já tem sessão iniciada salva, retoma o cronômetro
    const started = Number(localStorage.getItem(`sr-${id}-started`))
    if (started) {
      setElapsed(Math.floor((Date.now() - started) / 1000))
    } else {
      localStorage.setItem(`sr-${id}-started`, String(Date.now()))
    }
    timerRef.current = window.setInterval(() => setElapsed((v) => v + 1), 1000)
    return () => { if (timerRef.current) window.clearInterval(timerRef.current) }
  }, [id])

  useEffect(() => {
    if (!restRunning) { if (restRef.current) window.clearInterval(restRef.current); return }
    restRef.current = window.setInterval(() => {
      setRest((v) => {
        if (v <= 1) {
          setRestRunning(false)
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          return 0
        }
        return v - 1
      })
    }, 1000)
    return () => { if (restRef.current) window.clearInterval(restRef.current) }
  }, [restRunning])

  // Autosave para offline resiliente
  useEffect(() => {
    if (!id || exercises.length === 0) return
    const t = window.setTimeout(() => {
      localStorage.setItem(`sr-${id}-progress`, JSON.stringify(exercises))
    }, 800)
    return () => window.clearTimeout(t)
  }, [id, exercises])

  const active = exercises[activeIdx]
  const totalSeries = exercises.reduce((n, e) => n + e.series.length, 0)
  const doneSeries = exercises.reduce((n, e) => n + e.series.filter((s) => s.done).length, 0)

  function toggleSerie(sIdx: number) {
    setExercises((prev) => {
      const next = [...prev]
      next[activeIdx] = { ...next[activeIdx], series: next[activeIdx].series.map((s, i) => i === sIdx ? { ...s, done: !s.done } : s) }
      return next
    })
    if (!active.series[sIdx].done) {
      setRest(DEFAULT_REST)
      setRestRunning(true)
    }
  }

  function updateSerie(sIdx: number, patch: Partial<Serie>) {
    setExercises((prev) => {
      const next = [...prev]
      next[activeIdx] = { ...next[activeIdx], series: next[activeIdx].series.map((s, i) => i === sIdx ? { ...s, ...patch } : s) }
      return next
    })
  }

  async function finish() {
    if (!id) return
    const { data: sr } = await supabase.from('student_routines').select('completed_workouts,student_id').eq('id', id).single()
    if (sr) {
      await supabase.from('workout_sessions').insert({
        student_id: sr.student_id,
        student_routine_id: id,
        duration_seconds: elapsed,
        data: { exercises },
      })
      await supabase.from('student_routines').update({ completed_workouts: (sr.completed_workouts ?? 0) + 1 }).eq('id', id)
    }
    localStorage.removeItem(`sr-${id}-progress`)
    localStorage.removeItem(`sr-${id}-started`)
    nav(`/aluno/treinos/${id}/resumo?dur=${elapsed}&series=${doneSeries}&total=${totalSeries}`)
  }

  return (
    <div className="app-shell bg-surface-app">
      <div className="min-h-dvh flex flex-col text-white">
        {/* Header sticky */}
        <div className="sticky top-0 z-20 bg-surface-app shadow-header px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 flex items-center gap-3">
          <button
            onClick={() => {
              if (confirm('Abandonar treino?')) nav(-1)
            }}
            className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center"
          >
            <X size={20} />
          </button>
          <div className="flex-1">
            <div className="text-rt-11 uppercase tracking-wider text-white/60 font-semibold">Tempo de Treino</div>
            <div className="text-rt-32 font-bold leading-none">{fmt(elapsed)}</div>
          </div>
          <div className="text-right">
            <div className="text-rt-11 text-white/60">{doneSeries}/{totalSeries}</div>
            <div className="text-rt-11 text-brand font-semibold">séries</div>
          </div>
        </div>

        <div className="flex-1 px-4 py-4">
          <h1 className="text-rt-20 font-bold mb-1">{name}</h1>
          <div className="text-white/60 text-rt-13 mb-4">{active?.name}</div>

          {/* Séries */}
          <div className="flex flex-col gap-2">
            {active?.series.map((s, i) => (
              <div key={i} className={
                'rounded-card p-3 flex items-center gap-3 ' +
                (s.done ? 'bg-white text-grey-900' : 'bg-surface-raised text-white')
              }>
                <button
                  onClick={() => toggleSerie(i)}
                  className={
                    'w-7 h-7 rounded-full flex items-center justify-center border-2 ' +
                    (s.done ? 'bg-brand border-brand' : 'border-grey-500')
                  }
                >
                  {s.done && <span className="text-white text-rt-14">✓</span>}
                </button>
                <div className="text-rt-32 font-bold min-w-[40px]">{i + 1}</div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <label className="flex flex-col">
                    <span className={'text-[10px] font-semibold uppercase ' + (s.done ? 'text-grey-600' : 'text-white/60')}>Carga</span>
                    <input
                      inputMode="decimal"
                      value={s.load}
                      onChange={(e) => updateSerie(i, { load: e.target.value })}
                      placeholder="kg"
                      className={
                        'text-rt-22 font-bold w-full bg-transparent outline-none border-b ' +
                        (s.done ? 'border-grey-300' : 'border-brand/40')
                      }
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className={'text-[10px] font-semibold uppercase ' + (s.done ? 'text-grey-600' : 'text-white/60')}>Reps</span>
                    <input
                      inputMode="numeric"
                      value={s.reps}
                      onChange={(e) => updateSerie(i, { reps: Number(e.target.value) || 0 })}
                      className={
                        'text-rt-22 font-bold w-full bg-transparent outline-none border-b ' +
                        (s.done ? 'border-grey-300' : 'border-brand/40')
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Nav exercícios */}
          {exercises.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
              {exercises.map((e, i) => (
                <button key={i} onClick={() => setActiveIdx(i)} className={
                  'shrink-0 px-3 h-8 rounded-card text-rt-12 font-semibold ' +
                  (i === activeIdx ? 'bg-brand text-white' : 'bg-surface-raised text-grey-400')
                }>
                  {i + 1}. {e.name.slice(0, 14)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timer descanso + slider */}
        <div className="sticky bottom-0 bg-surface-app px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-header">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[2px] font-semibold text-white/60">Descanso</div>
              <div className={
                'text-rt-32 font-bold leading-none ' +
                (rest === 0 && restRunning === false ? 'text-white' : rest > 0 ? 'text-brand' : 'text-danger')
              }>
                {fmt(rest)}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setRest(DEFAULT_REST); setRestRunning(true) }}
                className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center"
                aria-label="Iniciar"
              >
                {restRunning ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white" />}
              </button>
              <button onClick={() => setRest((r) => r + 30)} className="h-10 px-3 rounded-lg bg-surface-raised text-white text-rt-11 font-semibold flex items-center gap-1">
                <Plus size={14} /> 30s
              </button>
              <button onClick={() => { setRest(0); setRestRunning(false) }} className="w-10 h-10 rounded-lg bg-grey-800 flex items-center justify-center" aria-label="Reset">
                <RotateCcw size={16} className="text-grey-400" />
              </button>
            </div>
          </div>
          <DragSlider label="Arraste para finalizar" onConfirm={finish} />
        </div>
      </div>
    </div>
  )
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

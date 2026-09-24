import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, Play, Pause, RotateCcw, Dumbbell, TimerOff, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DragSlider } from '@/components/DragSlider'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { alarmaDescanso, prepararAlarma } from '@/lib/alarma'
import { BannerMedia } from '@/components/MediaExercicio'
import { ProgressaoCarga } from '@/components/ProgressaoCarga'
import { useAuth } from '@/lib/auth'

type Serie = { done: boolean; load: string; reps: number; rest: number }
type Exercise = {
  name: string
  series: Serie[]
  muscle_group?: string | null
  thumbnail_url?: string | null
  video_url?: string | null
  media_type?: string | null
}

/** Series viejas (snapshot anterior) o sin descanso escrito. */
const DEFAULT_REST = 90 // segundos

/** "90s", "1m30", "75" -> segundos. Lo que el profesor escribe es texto libre. */
function segundosDeDescanso(txt: string | undefined): number {
  if (!txt) return DEFAULT_REST
  const limpio = txt.trim().toLowerCase()
  const min = limpio.match(/^(\d+)\s*m(?:in)?\s*(\d+)?/)
  if (min) return Number(min[1]) * 60 + Number(min[2] ?? 0)
  const seg = limpio.match(/(\d+)/)
  return seg ? Number(seg[1]) : DEFAULT_REST
}

export function TreinoExecucaoPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()

  const [, setName] = useState('Treino')
  const [confirmarSaida, setConfirmarSaida] = useState(false)
  // Desmarcar una serie ya hecha y terminar con series pendientes se confirman
  // (capturas 025, 026 y 027): las dos cosas se hacen sin querer.
  const [desmarcando, setDesmarcando] = useState<number | null>(null)
  const [confirmarIncompleto, setConfirmarIncompleto] = useState(false)
  const [tiempoAgotado, setTiempoAgotado] = useState(false)
  const [verProgresso, setVerProgresso] = useState(false)
  const { profile } = useAuth()
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
      type SerieSnap = { reps?: string; load?: string; rest?: string }
      type ExSnap = {
        name: string
        muscle_group?: string | null
        thumbnail_url?: string | null
        video_url?: string | null
        media_type?: string | null
        /** number = snapshot viejo (solo la cantidad); array = con parámetros. */
        series: number | SerieSnap[]
      }
      const src = (data?.data?.exercises as ExSnap[]) ?? []
      const local = localStorage.getItem(`sr-${id}-progress`)
      if (local) {
        try { setExercises(JSON.parse(local)); return } catch { /* ignore */ }
      }

      // El alumno arranca con lo que el profesor prescribió, no con valores fijos.
      const armadas: Exercise[] = src.map((e) => ({
        name: e.name,
        muscle_group: e.muscle_group ?? null,
        thumbnail_url: e.thumbnail_url ?? null,
        video_url: e.video_url ?? null,
        media_type: e.media_type ?? null,
        series: Array.isArray(e.series)
          ? e.series.map((sr) => ({
            done: false,
            load: sr.load ?? '',
            reps: Number(String(sr.reps ?? '').match(/\d+/)?.[0] ?? 10),
            rest: segundosDeDescanso(sr.rest),
          }))
          : Array.from({ length: e.series }, () => ({ done: false, load: '', reps: 10, rest: DEFAULT_REST })),
      }))

      setExercises(armadas.length > 0
        ? armadas
        : [{ name: 'Exercício exemplo', series: Array.from({ length: 3 }, () => ({ done: false, load: '', reps: 10, rest: DEFAULT_REST })) }])
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
          alarmaDescanso()
          setTiempoAgotado(true)
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
      // El descanso es el que prescribió el profesor para esa serie.
      prepararAlarma()
      setRest(active.series[sIdx].rest ?? DEFAULT_REST)
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

  /** Marcar es directo; desmarcar pregunta, porque borra trabajo hecho. */
  function pedirToggle(sIdx: number) {
    if (active?.series[sIdx]?.done) setDesmarcando(sIdx)
    else toggleSerie(sIdx)
  }

  function pedirFinalizar() {
    if (doneSeries < totalSeries) { setConfirmarIncompleto(true); return }
    void finish()
  }

  async function finish() {
    if (!id) return
    const { data: sr } = await supabase.from('student_routines').select('completed_workouts,student_id').eq('id', id).single()

    // El id de la sesión viaja al resumen: ahí se guarda la percepción de
    // esfuerzo y se calculan los totales sin volver a pasar todo por la URL.
    let sesionId: string | null = null
    if (sr) {
      const { data: nueva } = await supabase.from('workout_sessions').insert({
        student_id: sr.student_id,
        student_routine_id: id,
        duration_seconds: elapsed,
        data: { exercises },
      }).select('id').single()
      sesionId = (nueva as { id: string } | null)?.id ?? null
      await supabase.from('student_routines').update({ completed_workouts: (sr.completed_workouts ?? 0) + 1 }).eq('id', id)
    }
    localStorage.removeItem(`sr-${id}-progress`)
    localStorage.removeItem(`sr-${id}-started`)
    nav(`/aluno/treinos/${id}/resumo?dur=${elapsed}&series=${doneSeries}&total=${totalSeries}${sesionId ? `&sid=${sesionId}` : ''}`)
  }

  const serieActiva = active?.series.findIndex((x) => !x.done) ?? -1
  const cargasPrescritas = (active?.series ?? []).map((x) => x.load).filter((x) => x && x.trim() !== '')

  return (
    <div className="app-shell bg-surface-app">
      <div className="min-h-dvh flex flex-col text-white">
        {/* Descanso arriba, como en el diseño: es lo que se mira entre series */}
        <div className="sticky top-0 z-20 bg-surface-app shadow-header px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
          <div className="flex items-start gap-3">
            <button
              onClick={() => setConfirmarSaida(true)}
              className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center shrink-0"
              aria-label="Sair"
            >
              <X size={20} />
            </button>

            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[2px] font-semibold text-white/60">Descanso</div>
              <div className="flex items-center gap-2 mt-1">
                <div className={
                  'h-11 min-w-[88px] px-3 rounded-[10px] border-[1.5px] flex items-center justify-center text-rt-22 font-bold ' +
                  (rest > 0 ? 'border-brand text-white' : 'border-grey-700 text-white/60')
                }>
                  {fmt(rest)}
                </div>
                <button
                  onClick={() => {
                    if (rest === 0) setRest(active?.series.find((x) => !x.done)?.rest ?? DEFAULT_REST)
                    setRestRunning((v) => !v)
                  }}
                  className="w-11 h-11 rounded-[10px] bg-brand flex items-center justify-center"
                  aria-label={restRunning ? 'Pausar' : 'Iniciar'}
                >
                  {restRunning ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white" fill="white" />}
                </button>
                <button
                  onClick={() => { setRest(0); setRestRunning(false) }}
                  className="w-11 h-11 rounded-[10px] bg-surface-raised flex items-center justify-center"
                  aria-label="Zerar"
                >
                  <RotateCcw size={18} className="text-grey-400" />
                </button>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block px-2.5 py-1 rounded-btn-pill bg-brand/20 text-brand text-rt-12 font-bold">
                {doneSeries}/{totalSeries}
              </span>
              <div className="text-[10px] uppercase tracking-wider text-white/60 font-semibold mt-2">Tempo de treino</div>
              <div className="text-rt-22 font-bold leading-none">{fmt(elapsed)}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-4">
          {/* Ficha del ejercicio: lo que el profesor prescribió, a la vista */}
          <div className="card-dark p-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-[12px] bg-surface-input flex items-center justify-center overflow-hidden shrink-0">
                {active?.thumbnail_url
                  ? <img src={active.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  : <Dumbbell size={24} className="text-brand" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <div className="text-white text-rt-16 font-bold leading-tight flex-1">{active?.name}</div>
                  <button
                    type="button"
                    onClick={() => setVerProgresso(true)}
                    aria-label="Progressão de carga"
                    className="w-9 h-9 rounded-[8px] bg-surface-input flex items-center justify-center shrink-0"
                  >
                    <TrendingUp size={18} className="text-brand" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {active?.muscle_group && <ChipEx>{active.muscle_group}</ChipEx>}
                  <ChipEx>{active?.series.length} {active?.series.length === 1 ? 'Série' : 'Séries'}</ChipEx>
                  {active?.series[0]?.reps ? <ChipEx>{active.series[0].reps} Rep</ChipEx> : null}
                  {cargasPrescritas.length > 0 && (
                    <ChipEx><span className="font-bold">KG</span> - {cargasPrescritas.join('/')}</ChipEx>
                  )}
                </div>
              </div>
            </div>

            {active && (active.video_url || active.media_type) && (
              <div className="mt-3">
                <BannerMedia media={active} alto={150} />
              </div>
            )}
          </div>

          {/* Séries */}
          <div className="flex flex-col gap-2">
            {active?.series.map((s, i) => (
              <div key={i} className="rounded-card overflow-hidden flex items-stretch bg-surface-raised">
                <div className={
                  'w-14 flex items-center justify-center text-rt-32 font-bold shrink-0 ' +
                  (s.done ? 'bg-brand text-white' : 'bg-black/60 text-white')
                }>
                  {i + 1}
                </div>

                <div className="flex-1 p-3 grid grid-cols-3 gap-2">
                  <CampoSerie
                    label="Reps"
                    value={String(s.reps)}
                    onChange={(v) => updateSerie(i, { reps: Number(v) || 0 })}
                    inputMode="numeric"
                  />
                  <CampoSerie
                    label="Carga"
                    value={s.load}
                    onChange={(v) => updateSerie(i, { load: v })}
                    inputMode="decimal"
                  />
                  <CampoSerie
                    label="Desc. (s)"
                    value={String(s.rest ?? DEFAULT_REST)}
                    onChange={(v) => updateSerie(i, { rest: Number(v) || 0 })}
                    inputMode="numeric"
                  />
                </div>

                <button
                  onClick={() => pedirToggle(i)}
                  className="w-14 flex items-center justify-center shrink-0"
                  aria-label={s.done ? 'Desmarcar série' : 'Marcar série'}
                >
                  <span className={
                    'w-8 h-8 rounded-full border-2 flex items-center justify-center ' +
                    (s.done ? 'bg-brand border-brand text-white' : 'border-grey-500')
                  }>
                    {s.done && '✓'}
                  </span>
                </button>
              </div>
            ))}
          </div>

          {serieActiva >= 0 && (
            <button
              onClick={() => toggleSerie(serieActiva)}
              className="w-full h-12 rounded-card bg-brand text-white text-rt-15 font-bold mt-3"
            >
              Finalizar Série {serieActiva + 1}
            </button>
          )}

          {/* Nav exercícios */}
          {exercises.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
              {exercises.map((e, i) => {
                const listo = e.series.every((x) => x.done)
                return (
                  <button key={i} onClick={() => setActiveIdx(i)} className={
                    'shrink-0 px-3 h-9 rounded-btn-pill text-rt-12 font-semibold flex items-center gap-1 ' +
                    (i === activeIdx ? 'bg-brand text-white' : listo ? 'bg-brand/20 text-brand' : 'bg-surface-raised text-grey-400')
                  }>
                    {listo && '✓'} {i + 1}. {e.name.slice(0, 14)}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-surface-app px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-header">
          <DragSlider label="Finalizar treinamento" onConfirm={pedirFinalizar} />
        </div>
      </div>

      {verProgresso && profile?.id && active && (
        <ProgressaoCarga
          studentId={profile.id}
          nombreExercicio={active.name}
          media={active}
          chips={[
            active.muscle_group ?? '',
            `${active.series.length} Séries`,
            active.series[0]?.reps ? `${active.series[0].reps} Rep` : '',
          ].filter(Boolean)}
          onCerrar={() => setVerProgresso(false)}
        />
      )}

      {tiempoAgotado && (
        <AvisoTiempoAgotado
          onVolver={() => setTiempoAgotado(false)}
          onMasTiempo={(segundos) => {
            setTiempoAgotado(false)
            setRest(segundos)
            setRestRunning(true)
          }}
        />
      )}

      {desmarcando !== null && (
        <ConfirmDialog
          message="Desmarcar esta série?"
          detail="Ela volta a contar como pendente."
          confirmLabel="Desmarcar"
          tone="danger"
          onConfirm={() => { toggleSerie(desmarcando); setDesmarcando(null) }}
          onCancel={() => setDesmarcando(null)}
        />
      )}

      {confirmarIncompleto && (
        <ConfirmDialog
          message={doneSeries === 0 ? 'Treino sem séries concluídas' : 'Treino incompleto'}
          detail={
            doneSeries === 0
              ? 'Você não marcou nenhuma série. Finalizar assim mesmo?'
              : `Faltam ${totalSeries - doneSeries} de ${totalSeries} séries. Finalizar assim mesmo?`
          }
          confirmLabel="Finalizar"
          cancelLabel="Continuar treino"
          tone="danger"
          onConfirm={() => { setConfirmarIncompleto(false); void finish() }}
          onCancel={() => setConfirmarIncompleto(false)}
        />
      )}

      {confirmarSaida && (
        <ConfirmDialog
          message="Abandonar treino?"
          detail="O progresso desta sessão não será salvo."
          confirmLabel="Abandonar"
          cancelLabel="Continuar"
          tone="danger"
          onConfirm={() => nav(-1)}
          onCancel={() => setConfirmarSaida(false)}
        />
      )}
    </div>
  )
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function ChipEx({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-rt-11 px-2.5 py-1 rounded-btn-pill border border-grey-700 text-white/70">{children}</span>
  )
}

function CampoSerie({ label, value, onChange, inputMode }: {
  label: string
  value: string
  onChange: (v: string) => void
  inputMode: 'numeric' | 'decimal'
}) {
  return (
    <label className="flex flex-col min-w-0">
      <span className="text-[10px] font-semibold uppercase text-white/50 truncate">{label}</span>
      <input
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-rt-18 font-bold w-full bg-transparent outline-none border-b border-brand/40 text-white"
      />
    </label>
  )
}

/** Print 024 del módulo 13: se acabó el descanso. */
function AvisoTiempoAgotado({ onVolver, onMasTiempo }: {
  onVolver: () => void
  onMasTiempo: (segundos: number) => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/70">
      <div className="w-full max-w-[350px] rounded-[16px] bg-surface-card border border-danger/60 px-6 pt-8 pb-6">
        <div className="flex justify-center">
          <span className="w-[100px] h-[100px] rounded-full border-2 border-danger flex items-center justify-center shadow-[0_0_30px_rgba(229,57,53,0.35)]">
            <TimerOff size={44} className="text-danger" />
          </span>
        </div>
        <h2 className="text-white text-rt-22 font-bold text-center tracking-[1px] uppercase mt-5">
          Tempo esgotado!
        </h2>
        <p className="text-white/70 text-rt-14 text-center mt-2">Hora de voltar ao treino</p>

        <button
          onClick={onVolver}
          className="w-full h-[54px] rounded-btn-pill bg-brand text-white text-rt-16 font-bold tracking-[1px] uppercase mt-6 shadow-glow"
        >
          Voltar ao treino
        </button>

        <p className="text-white/50 text-rt-13 text-center mt-5">Precisa de mais tempo?</p>
        <div className="flex gap-2 mt-2">
          {[
            { l: '+30s', s: 30 },
            { l: '+1 min', s: 60 },
            { l: '+2 min', s: 120 },
          ].map((o) => (
            <button
              key={o.l}
              onClick={() => onMasTiempo(o.s)}
              className="flex-1 h-11 rounded-[10px] border border-grey-600 text-white text-rt-14"
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

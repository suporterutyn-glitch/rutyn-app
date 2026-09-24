import { useEffect, useRef, useState } from 'react'
import { nombreEjercicio } from '@/lib/nombreEjercicio'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X, Play, Pause, RotateCcw, TimerOff, TrendingUp, Check, SkipForward, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DragSlider } from '@/components/DragSlider'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { alarmaDescanso, prepararAlarma } from '@/lib/alarma'
import { BannerMedia, MiniaturaMedia } from '@/components/MediaExercicio'
import { ProgressaoCarga } from '@/components/ProgressaoCarga'
import { gruposMusculares, etiquetaDe } from '@/lib/catalogos'
import { useAuth } from '@/lib/auth'

type Serie = { done: boolean; load: string; reps: string; rest: number }
type Exercise = {
  /** Clave estable (historial de cargas); para mostrar se usa el nombre del idioma. */
  name: string
  name_pt?: string | null
  name_es?: string | null
  name_en?: string | null
  series: Serie[]
  muscle_group?: string | null
  thumbnail_url?: string | null
  video_url?: string | null
  media_type?: string | null
  group_type?: string | null
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

/** Descanso: la hora en que termina, no un contador. Así no se atrasa con la pantalla bloqueada. */
type Descanso = { terminaEn: number | null; pausadoCon: number | null; total: number }

export function TreinoExecucaoPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()

  const [confirmarSaida, setConfirmarSaida] = useState(false)
  const [desmarcando, setDesmarcando] = useState<{ ex: number; serie: number } | null>(null)
  const [confirmarIncompleto, setConfirmarIncompleto] = useState(false)
  const [tiempoAgotado, setTiempoAgotado] = useState(false)
  const [verProgresso, setVerProgresso] = useState<number | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [inicio, setInicio] = useState<number>(() => Date.now())
  const [ahora, setAhora] = useState(() => Date.now())
  const [descanso, setDescanso] = useState<Descanso>({ terminaEn: null, pausadoCon: null, total: 0 })
  const [pantallaDescanso, setPantallaDescanso] = useState(false)
  const refs = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    if (!id) return
    // Una sesión de hace más de 6 horas es un treino abandonado: se empieza de cero.
    // Antes de cualquier await: el reloj reescribe la hora de inicio enseguida.
    const empezo = Number(localStorage.getItem(`sr-${id}-started`))
    if (empezo && Date.now() - empezo > 6 * 3600 * 1000) localStorage.removeItem(`sr-${id}-progress`)
    void (async () => {
      const { data } = await supabase.from('student_routines').select('name,data').eq('id', id).single()
      type SerieSnap = { reps?: string; load?: string; rest?: string }
      type ExSnap = {
        name: string
        name_pt?: string | null
        name_es?: string | null
        name_en?: string | null
        muscle_group?: string | null
        thumbnail_url?: string | null
        video_url?: string | null
        media_type?: string | null
        group_type?: string | null
        /** number = snapshot viejo (solo la cantidad); array = con parámetros. */
        series: number | SerieSnap[]
      }
      const src = (data?.data?.exercises as ExSnap[]) ?? []
      const local = localStorage.getItem(`sr-${id}-progress`)
      let armadas: Exercise[] | null = null
      if (local) {
        try {
          armadas = (JSON.parse(local) as Exercise[]).map((e) => ({ ...e, series: e.series.map((x) => ({ ...x, reps: String(x.reps ?? '') })) }))
        } catch { /* ignore */ }
      }
      // El alumno arranca con lo que el profesor prescribió, no con valores fijos.
      armadas ??= src.map((e) => ({
        name: e.name,
        name_pt: e.name_pt ?? null,
        name_es: e.name_es ?? null,
        name_en: e.name_en ?? null,
        muscle_group: e.muscle_group ?? null,
        thumbnail_url: e.thumbnail_url ?? null,
        video_url: e.video_url ?? null,
        media_type: e.media_type ?? null,
        group_type: e.group_type ?? null,
        series: Array.isArray(e.series)
          ? e.series.map((sr) => ({ done: false, load: sr.load ?? '', reps: String(sr.reps ?? '').trim() || '10', rest: segundosDeDescanso(sr.rest) }))
          : Array.from({ length: e.series }, () => ({ done: false, load: '', reps: '10', rest: DEFAULT_REST })),
      }))
      setExercises(armadas)
      const pendiente = armadas.findIndex((e) => e.series.some((x) => !x.done))
      setActiveIdx(pendiente >= 0 ? pendiente : 0)
    })()
  }, [id])

  // El tiempo de treino también sale de la hora de inicio guardada.
  useEffect(() => {
    if (!id) return
    const guardado = Number(localStorage.getItem(`sr-${id}-started`))
    if (guardado && Date.now() - guardado <= 6 * 3600 * 1000) setInicio(guardado)
    else localStorage.setItem(`sr-${id}-started`, String(inicio))
    const t = window.setInterval(() => setAhora(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [id])

  const elapsed = Math.max(0, Math.floor((ahora - inicio) / 1000))
  const restante = descanso.terminaEn !== null
    ? Math.max(0, Math.ceil((descanso.terminaEn - ahora) / 1000))
    : descanso.pausadoCon ?? 0
  const corriendo = descanso.terminaEn !== null

  // Fin del descanso: alarma y aviso, una sola vez.
  useEffect(() => {
    if (descanso.terminaEn !== null && ahora >= descanso.terminaEn) {
      setDescanso({ terminaEn: null, pausadoCon: null, total: 0 })
      setPantallaDescanso(false)
      alarmaDescanso()
      setTiempoAgotado(true)
    }
  }, [ahora, descanso.terminaEn])

  // Autosave para offline resiliente
  useEffect(() => {
    if (!id || exercises.length === 0) return
    const t = window.setTimeout(() => localStorage.setItem(`sr-${id}-progress`, JSON.stringify(exercises)), 800)
    return () => window.clearTimeout(t)
  }, [id, exercises])

  const totalSeries = exercises.reduce((n, e) => n + e.series.length, 0)
  const doneSeries = exercises.reduce((n, e) => n + e.series.filter((s) => s.done).length, 0)
  const todoHecho = totalSeries > 0 && doneSeries === totalSeries

  /** Próxima serie pendiente: primero en el ejercicio activo, después en los siguientes. */
  function proxima(desdeEx = activeIdx): { ex: number; serie: number } | null {
    const base = Math.max(0, desdeEx)
    for (let k = 0; k < exercises.length; k++) {
      const i = (base + k) % exercises.length
      const j = exercises[i].series.findIndex((x) => !x.done)
      if (j >= 0) return { ex: i, serie: j }
    }
    return null
  }
  const siguiente = proxima()
  const descansoSugerido = siguiente ? exercises[siguiente.ex].series[siguiente.serie].rest : DEFAULT_REST

  function iniciarDescanso(seg: number) {
    prepararAlarma()
    setDescanso({ terminaEn: Date.now() + seg * 1000, pausadoCon: null, total: seg })
    setPantallaDescanso(true)
  }
  function pausarOReanudar() {
    if (corriendo) setDescanso((d) => ({ ...d, terminaEn: null, pausadoCon: restante }))
    else if (descanso.pausadoCon) setDescanso((d) => ({ ...d, terminaEn: Date.now() + (d.pausadoCon ?? 0) * 1000, pausadoCon: null }))
    else iniciarDescanso(descansoSugerido)
  }
  function ajustar(seg: number) {
    setDescanso((d) => d.terminaEn !== null
      ? { ...d, terminaEn: Math.max(Date.now() + 1000, d.terminaEn + seg * 1000), total: Math.max(1, d.total + seg) }
      : { ...d, pausadoCon: Math.max(1, (d.pausadoCon ?? 0) + seg), total: Math.max(1, d.total + seg) })
  }
  function cortarDescanso() {
    setDescanso({ terminaEn: null, pausadoCon: null, total: 0 })
    setPantallaDescanso(false)
  }

  function marcar(ex: number, serie: number, valor: boolean) {
    setExercises((prev) => prev.map((e, i) => (i !== ex ? e : { ...e, series: e.series.map((x, j) => (j === serie ? { ...x, done: valor } : x)) })))
  }

  function updateSerie(ex: number, sIdx: number, patch: Partial<Serie>) {
    setExercises((prev) => prev.map((e, i) => (i !== ex ? e : { ...e, series: e.series.map((s, j) => (j === sIdx ? { ...s, ...patch } : s)) })))
  }

  /** Termina la serie, arranca el descanso y, si el ejercicio quedó completo, pasa al siguiente. */
  function completarSerie(ex: number, serie: number) {
    const s = exercises[ex].series[serie]
    marcar(ex, serie, true)
    const quedanEnEjercicio = exercises[ex].series.some((x, j) => j !== serie && !x.done)
    const quedanEnTreino = exercises.some((e, i) => e.series.some((x, j) => !x.done && !(i === ex && j === serie)))
    if (quedanEnTreino) iniciarDescanso(s.rest ?? DEFAULT_REST)
    if (!quedanEnEjercicio) {
      const sig = exercises.findIndex((e, i) => i > ex && e.series.some((x) => !x.done))
      const destino = sig >= 0 ? sig : exercises.findIndex((e, i) => i !== ex && e.series.some((x) => !x.done))
      if (destino >= 0) {
        setActiveIdx(destino)
        window.setTimeout(() => refs.current[destino]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
      }
    }
  }

  function tocarCirculo(ex: number, serie: number) {
    if (exercises[ex].series[serie].done) setDesmarcando({ ex, serie })
    else completarSerie(ex, serie)
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
    olvidarSesion(id)
    nav(`/aluno/treinos/${id}/resumo?dur=${elapsed}&series=${doneSeries}&total=${totalSeries}${sesionId ? `&sid=${sesionId}` : ''}`)
  }

  const grupo = (g?: string | null) => (g ? etiquetaDe(gruposMusculares, g, i18n.language) || g : '')
  const exProgreso = verProgresso !== null ? exercises[verProgresso] : null

  return (
    <div className="app-shell bg-surface-app">
      <div className="h-dvh flex flex-col text-white">
        {/* Descanso arriba, siempre visible: solo la lista de ejercicios se desplaza. */}
        <div className="shrink-0 z-20 bg-surface-app shadow-header px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
          <div className="flex items-start gap-3">
            <button onClick={() => setConfirmarSaida(true)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center shrink-0" aria-label={t('treino:exit')}>
              <X size={20} />
            </button>

            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[2px] font-semibold text-white/60">{t('treino:rest')}</div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => { if (corriendo || descanso.pausadoCon) setPantallaDescanso(true) }}
                  className={'h-11 min-w-[88px] px-3 rounded-[10px] border-[1.5px] flex items-center justify-center text-rt-22 font-bold tabular-nums ' +
                    (corriendo ? 'border-brand text-brand bg-brand/10' : descanso.pausadoCon ? 'border-warning text-warning' : 'border-grey-700 text-white/60')}
                  aria-label={t('treino:openRest')}
                >
                  {fmt(corriendo || descanso.pausadoCon ? restante : descansoSugerido)}
                </button>
                <button onClick={pausarOReanudar} className="w-11 h-11 rounded-[10px] bg-brand flex items-center justify-center" aria-label={corriendo ? t('treino:pause') : t('treino:start')}>
                  {corriendo ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white" fill="white" />}
                </button>
                <button onClick={cortarDescanso} className="w-11 h-11 rounded-[10px] bg-surface-raised flex items-center justify-center" aria-label={t('treino:reset')}>
                  <RotateCcw size={18} className="text-grey-400" />
                </button>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block px-2.5 py-1 rounded-btn-pill bg-brand/20 text-brand text-rt-12 font-bold">{doneSeries}/{totalSeries}</span>
              <div className="text-[10px] uppercase tracking-wider text-white/60 font-semibold mt-2">{t('treino:workoutTime')}</div>
              <div className="text-rt-22 font-bold leading-none tabular-nums">{fmt(elapsed)}</div>
            </div>
          </div>
        </div>

        {/* Un ejercicio debajo del otro; el activo abierto con sus series. */}
        <ul className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {exercises.length === 0 && (
            <li className="py-16 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></li>
          )}
          {exercises.map((e, ei) => {
            const listo = e.series.every((x) => x.done)
            const activo = ei === activeIdx
            const cargas = e.series.map((x) => x.load).filter((x) => x && x.trim() !== '')
            const pendiente = e.series.findIndex((x) => !x.done)
            const grupoTipo = e.group_type === 'biset' ? 'Bi-set' : e.group_type === 'triset' ? 'Tri-set' : null
            return (
              <li key={ei} ref={(el) => { refs.current[ei] = el }} className={'card-dark p-3 scroll-mt-3 shrink-0 ' + (activo ? 'border-brand' : listo ? 'border-brand/40 opacity-80' : '')}>
                <button type="button" onClick={() => setActiveIdx(activo ? -1 : ei)} className="w-full flex items-start gap-3 text-left">
                  <MiniaturaMedia media={e} tamano={activo ? 64 : 52} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-grey-500 text-rt-11 font-semibold">{ei + 1}/{exercises.length}</span>
                      {grupoTipo && <span className={'text-rt-10 font-bold px-2 py-0.5 rounded-btn-pill ' + (e.group_type === 'biset' ? 'bg-group-biset/20 text-group-biset' : 'bg-group-triset/20 text-group-triset')}>{grupoTipo}</span>}
                    </div>
                    <div className="text-white text-rt-16 font-bold leading-tight mt-0.5">{nombreEjercicio(e, i18n.language)}</div>
                    {listo && !activo ? (
                      <div className="flex items-center gap-1.5 mt-1.5 text-brand text-rt-12 font-semibold"><Check size={15} /> {t('treino:completed')}</div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {e.muscle_group && <ChipEx>{grupo(e.muscle_group)}</ChipEx>}
                        <ChipEx>{t('treino:series', { count: e.series.length })}</ChipEx>
                        {e.series[0]?.reps ? <ChipEx>{t('treino:rep', { reps: e.series[0].reps })}</ChipEx> : null}
                        {cargas.length > 0 && <ChipEx><span className="font-bold">KG</span> - {cargas.join('/')}</ChipEx>}
                      </div>
                    )}
                  </div>
                  {activo ? (
                    <span role="button" tabIndex={0} onClick={(ev) => { ev.stopPropagation(); setVerProgresso(ei) }} aria-label={t('treino:loadProgress')}
                      className="w-9 h-9 rounded-[8px] bg-surface-input flex items-center justify-center shrink-0">
                      <TrendingUp size={18} className="text-brand" />
                    </span>
                  ) : (
                    <ChevronDown size={20} className="text-grey-500 shrink-0 mt-1" />
                  )}
                </button>

                {activo && (
                  <>
                    {(e.video_url || e.media_type) && <div className="mt-3"><BannerMedia media={e} alto={150} /></div>}
                    <div className="flex flex-col gap-2 mt-3">
                      {e.series.map((s, i) => (
                        <div key={i} className="rounded-card overflow-hidden flex items-stretch bg-surface-raised">
                          <div className={'w-14 flex items-center justify-center text-rt-32 font-bold shrink-0 ' + (s.done ? 'bg-brand text-white' : 'bg-black/60 text-white')}>{i + 1}</div>
                          <div className="flex-1 p-3 grid grid-cols-3 gap-2">
                            <CampoSerie label={t('treino:reps')} value={s.reps} onChange={(v) => updateSerie(ei, i, { reps: v })} inputMode="text" />
                            <CampoSerie label={t('treino:load')} value={s.load} onChange={(v) => updateSerie(ei, i, { load: v })} inputMode="decimal" />
                            <CampoSerie label={t('treino:restSec')} value={String(s.rest ?? DEFAULT_REST)} onChange={(v) => updateSerie(ei, i, { rest: Number(v.replace(/\D/g, '')) || 0 })} inputMode="numeric" />
                          </div>
                          <button onClick={() => tocarCirculo(ei, i)} className="w-14 flex items-center justify-center shrink-0" aria-label={s.done ? t('treino:unmarkSeries') : t('treino:markSeries')}>
                            <span className={'w-8 h-8 rounded-full border-2 flex items-center justify-center ' + (s.done ? 'bg-brand border-brand text-white' : 'border-grey-500')}>{s.done && '✓'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                    {pendiente >= 0 && (
                      <button onClick={() => completarSerie(ei, pendiente)} className="w-full h-12 rounded-card bg-brand text-white text-rt-15 font-bold mt-3">
                        {t('treino:finishSeries', { n: pendiente + 1 })}
                      </button>
                    )}
                  </>
                )}
              </li>
            )
          })}

          {exercises.length > 0 && (
            <li className="pt-2 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              {todoHecho && <p className="text-brand text-rt-13 font-semibold text-center mb-3">{t('treino:allDone')}</p>}
              <DragSlider label={t('treino:finishWorkout')} onConfirm={pedirFinalizar} />
            </li>
          )}
        </ul>
      </div>

      {pantallaDescanso && (
        <PantallaDescanso
          restante={restante}
          total={descanso.total}
          corriendo={corriendo}
          proximo={siguiente ? t('treino:nextSeries', { n: siguiente.serie + 1, name: nombreEjercicio(exercises[siguiente.ex], i18n.language) }) : null}
          onPausar={pausarOReanudar}
          onAjustar={ajustar}
          onSaltar={cortarDescanso}
          onOcultar={() => setPantallaDescanso(false)}
        />
      )}

      {exProgreso && profile?.id && (
        <ProgressaoCarga
          studentId={profile.id}
          nombreExercicio={exProgreso.name}
          titulo={nombreEjercicio(exProgreso, i18n.language)}
          media={exProgreso}
          chips={[grupo(exProgreso.muscle_group), t('treino:series', { count: exProgreso.series.length }), exProgreso.series[0]?.reps ? t('treino:rep', { reps: exProgreso.series[0].reps }) : ''].filter(Boolean)}
          onCerrar={() => setVerProgresso(null)}
        />
      )}

      {tiempoAgotado && (
        <AvisoTiempoAgotado
          onVolver={() => setTiempoAgotado(false)}
          onMasTiempo={(segundos) => { setTiempoAgotado(false); iniciarDescanso(segundos) }}
        />
      )}

      {desmarcando !== null && (
        <ConfirmDialog
          message={t('treino:unmarkQ')}
          detail={t('treino:unmarkDetail')}
          confirmLabel={t('treino:unmark')}
          tone="danger"
          onConfirm={() => { marcar(desmarcando.ex, desmarcando.serie, false); setDesmarcando(null) }}
          onCancel={() => setDesmarcando(null)}
        />
      )}

      {confirmarIncompleto && (
        <ConfirmDialog
          message={doneSeries === 0 ? t('treino:noSeriesDone') : t('treino:incomplete')}
          detail={doneSeries === 0 ? t('treino:noSeriesDoneDetail') : t('treino:incompleteDetail', { left: totalSeries - doneSeries, total: totalSeries })}
          confirmLabel={t('treino:finish')}
          cancelLabel={t('treino:keepTraining')}
          tone="danger"
          onConfirm={() => { setConfirmarIncompleto(false); void finish() }}
          onCancel={() => setConfirmarIncompleto(false)}
        />
      )}

      {confirmarSaida && (
        <ConfirmDialog
          message={t('treino:abandonQ')}
          detail={t('treino:abandonDetail')}
          confirmLabel={t('treino:abandon')}
          cancelLabel={t('treino:resume')}
          tone="danger"
          onConfirm={() => { if (id) olvidarSesion(id); nav(-1) }}
          onCancel={() => setConfirmarSaida(false)}
        />
      )}
    </div>
  )
}

function olvidarSesion(id: string) {
  localStorage.removeItem(`sr-${id}-progress`)
  localStorage.removeItem(`sr-${id}-started`)
}

function fmt(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  const mm = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return h > 0 ? `${h}:${mm}` : mm
}

/** Pantalla de descanso entre series: cuenta regresiva grande y lo que viene después. */
function PantallaDescanso({ restante, total, corriendo, proximo, onPausar, onAjustar, onSaltar, onOcultar }: {
  restante: number
  total: number
  corriendo: boolean
  proximo: string | null
  onPausar: () => void
  onAjustar: (seg: number) => void
  onSaltar: () => void
  onOcultar: () => void
}) {
  const { t } = useTranslation()
  const r = 110
  const c = 2 * Math.PI * r
  const frac = total > 0 ? Math.min(1, restante / total) : 0
  return (
    <div className="fixed inset-0 z-[60] bg-surface-app/[0.97] flex flex-col items-center justify-center px-6 text-white">
      <div className="text-rt-13 uppercase tracking-[3px] font-semibold text-white/60">{t('treino:rest')}</div>
      <div className="relative mt-6" style={{ width: 260, height: 260 }}>
        <svg width="260" height="260" className="-rotate-90">
          <circle cx="130" cy="130" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
          <circle cx="130" cy="130" r={r} fill="none" stroke={corriendo ? '#7CB342' : '#FFA726'} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: 'stroke-dashoffset .25s linear' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[56px] font-bold tabular-nums leading-none">{fmt(restante)}</span>
          {!corriendo && <span className="text-warning text-rt-13 font-semibold mt-2">{t('treino:paused')}</span>}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-8">
        <button onClick={() => onAjustar(-15)} className="w-16 h-12 rounded-[12px] bg-surface-raised text-white text-rt-15 font-semibold">-15s</button>
        <button onClick={onPausar} aria-label={corriendo ? t('treino:pause') : t('treino:resume')} className="w-16 h-16 rounded-full bg-brand flex items-center justify-center">
          {corriendo ? <Pause size={28} className="text-white" /> : <Play size={28} className="text-white" fill="white" />}
        </button>
        <button onClick={() => onAjustar(15)} className="w-16 h-12 rounded-[12px] bg-surface-raised text-white text-rt-15 font-semibold">+15s</button>
      </div>

      {proximo && (
        <div className="mt-8 text-center">
          <div className="text-white/50 text-rt-12 uppercase tracking-wider">{t('treino:next')}</div>
          <div className="text-white text-rt-16 font-semibold mt-1">{proximo}</div>
        </div>
      )}

      <button onClick={onSaltar} className="mt-8 h-12 px-6 rounded-btn-pill border border-grey-600 text-white text-rt-14 font-semibold flex items-center gap-2">
        <SkipForward size={18} /> {t('treino:skipRest')}
      </button>
      <button onClick={onOcultar} className="mt-3 text-white/60 text-rt-13">{t('treino:seeWorkout')}</button>
    </div>
  )
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
  inputMode: 'numeric' | 'decimal' | 'text'
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
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/70">
      <div className="w-full max-w-[350px] rounded-[16px] bg-surface-card border border-danger/60 px-6 pt-8 pb-6">
        <div className="flex justify-center">
          <span className="w-[100px] h-[100px] rounded-full border-2 border-danger flex items-center justify-center shadow-[0_0_30px_rgba(229,57,53,0.35)]">
            <TimerOff size={44} className="text-danger" />
          </span>
        </div>
        <h2 className="text-white text-rt-22 font-bold text-center tracking-[1px] uppercase mt-5">
          {t('treino:timeUp')}
        </h2>
        <p className="text-white/70 text-rt-14 text-center mt-2">{t('treino:backToTraining')}</p>

        <button
          onClick={onVolver}
          className="w-full h-[54px] rounded-btn-pill bg-brand text-white text-rt-16 font-bold tracking-[1px] uppercase mt-6 shadow-glow"
        >
          {t('treino:backButton')}
        </button>

        <p className="text-white/50 text-rt-13 text-center mt-5">{t('treino:needMore')}</p>
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

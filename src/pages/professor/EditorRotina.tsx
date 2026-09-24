import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Dumbbell, GripVertical, Users, Link2, ChevronDown, MoreVertical, Unlink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { EmptyState, FullScreenSheet, Field } from './projetos/RoutinesTab'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FilaSerie } from '@/components/professor/SeriesParametros'
import { normalizarParams } from '@/lib/parametros'
import { useArrastreLista, moverEnLista } from '@/lib/reordenar'
import { objetivosTreino, gruposMusculares, etiquetaDe } from '@/lib/catalogos'
import { BannerMedia, MiniaturaMedia, useMediaDeExercicios, type Media } from '@/components/MediaExercicio'
import { AdicionarExercicios, type EjercicioCatalogo } from './projetos/AdicionarExercicios'
import { useTranslation } from 'react-i18next'
import { asignarRutina, sincronizarRutinaAlumno } from '@/lib/asignacion'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { nombreEjercicio } from '@/lib/nombreEjercicio'

type Routine = { id: string; name: string; objective: string | null; student_id?: string | null }
type Ex = {
  id?: string
  routine_id: string
  exercise_id: string | null
  exercise_name_snapshot: string | null
  position: number
  group_type: 'single' | 'biset' | 'triset'
  notes: string | null
  series?: Serie[]
}
type Serie = { id?: string; routine_exercise_id?: string; position: number; params: Record<string, string>; notes?: string | null }

export function EditorRotinaPage() {
  const { id } = useParams<{ id: string }>()
  return <EditorRotina routineId={id} />
}

/**
 * El editor vive dentro de la tarjeta de la rutina en Meus Projetos
 * (prints 017 a 027) y también como pantalla propia, para poder entrar
 * directo por URL. `embebido` es la diferencia: sin encabezado ni barra fija.
 */
export function EditorRotina({ routineId, embebido = false }: { routineId?: string; embebido?: boolean }) {
  const id = routineId
  const nav = useNavigate()
  const { profile } = useAuth()
  const { t, i18n } = useTranslation()
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [borrandoExercicio, setBorrandoExercicio] = useState<string | null>(null)
  const [exs, setExs] = useState<Ex[]>([])
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  // 'Clonar' desde la lista de Meus Projetos entra directo a esta hoja.
  const [params] = useSearchParams()
  const [assignOpen, setAssignOpen] = useState(params.get('clonar') === '1')
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)
  const mediaPorExercicio = useMediaDeExercicios(exs.map((e) => e.exercise_id))
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({})
  const [todosAbiertos, setTodosAbiertos] = useState(false)
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [grupoAbierto, setGrupoAbierto] = useState<{ tipo: string; ids: string[] } | null>(null)

  // Reordenar ejercicios arrastrando por la manija.
  const arrastre = useArrastreLista<string>((desde, hasta) => void reordenarExercicios(desde, hasta))

  async function reordenarSeries(re: Ex, desdeId: string, hastaId: string) {
    const orden = (re.series ?? []).slice().sort((a, b) => a.position - b.position)
    const i = orden.findIndex((x) => x.id === desdeId)
    const j = orden.findIndex((x) => x.id === hastaId)
    if (i < 0 || j < 0) return
    const nuevo = moverEnLista(orden, i, j)
    setExs((prev) => prev.map((x) => (x.id === re.id ? { ...x, series: nuevo.map((sr, n) => ({ ...sr, position: n })) } : x)))
    for (let n = 0; n < nuevo.length; n++) {
      const { error } = await supabase.from('series').update({ position: n }).eq('id', nuevo[n].id!)
      if (error) { setErrorGuardado(error.message); return }
    }
  }

  async function reordenarExercicios(desdeId: string, hastaId: string) {
    const orden = exs.slice().sort((a, b) => a.position - b.position)
    const i = orden.findIndex((x) => x.id === desdeId)
    const j = orden.findIndex((x) => x.id === hastaId)
    if (i < 0 || j < 0) return
    const nuevo = moverEnLista(orden, i, j)
    setExs(nuevo.map((x, n) => ({ ...x, position: n })))
    // Una escritura por fila: son pocas y así no hace falta una función nueva.
    for (let n = 0; n < nuevo.length; n++) {
      const { error } = await supabase.from('routine_exercises').update({ position: n }).eq('id', nuevo[n].id!)
      if (error) { setErrorGuardado(error.message); return }
    }
  }
  const catalogo = useMediaDeExercicios(exs.map((e) => e.exercise_id))

  function chipsDe(re: Ex): string[] {
    const info = re.exercise_id ? catalogo[re.exercise_id] : null
    return info?.muscle_group ? [etiquetaDe(gruposMusculares, info.muscle_group, i18n.language) || info.muscle_group] : []
  }

  /**
   * Bi-set con 2, tri-set con 3 (prints 021 y 022). Los elegidos comparten un
   * group_id nuevo: es lo que después los dibuja dentro del mismo marco.
   */
  async function agruparSeleccion() {
    const tipo = seleccion.length === 2 ? 'biset' : 'triset'
    const grupo = crypto.randomUUID()
    const { error } = await supabase.from('routine_exercises')
      .update({ group_type: tipo, group_id: grupo })
      .in('id', seleccion)
    if (error) { setErrorGuardado(error.message); return }
    setSeleccion([])
    await load()
  }

  async function borrarSeleccion() {
    const { error } = await supabase.from('routine_exercises').delete().in('id', seleccion)
    if (error) { setErrorGuardado(error.message); return }
    setSeleccion([])
    await load()
  }

  async function desagruparExercicio(exId: string) {
    const { error } = await supabase.from('routine_exercises')
      .update({ group_type: 'single', group_id: null }).eq('id', exId)
    if (error) { setErrorGuardado(error.message); return }
    await load()
  }

  async function load() {
    if (!id) return
    setLoading(true)
    const [{ data: r }, { data: re }] = await Promise.all([
      supabase.from('routines').select('id,name,objective,student_id').eq('id', id).single(),
      supabase.from('routine_exercises').select('*,series(*)').eq('routine_id', id).order('position'),
    ])
    setRoutine(r as Routine)
    // ordena séries
    const list = ((re as any[]) ?? []).map((x) => ({
      ...x,
      series: ((x.series ?? []) as Serie[]).sort((a, b) => a.position - b.position),
    }))
    setExs(list as Ex[])
    setLoading(false)
    // Rutina de un alumno: cada cambio le llega a su app.
    if ((r as Routine | null)?.student_id) void sincronizarRutinaAlumno(id)
  }

  useEffect(() => { void load() }, [id])

  async function addExercises(cats: EjercicioCatalogo[]) {
    if (!id) return
    for (let i = 0; i < cats.length; i++) {
      // El snapshot congela el nombre en el idioma en que lo eligió el profesor.
      const { data, error } = await supabase.from('routine_exercises').insert({
        routine_id: id,
        exercise_id: cats[i].id,
        exercise_name_snapshot: nombreEjercicio(cats[i], i18n.language),
        position: exs.length + i,
        group_type: 'single',
      }).select('*').single()
      if (error || !data) { setErrorGuardado(error?.message ?? t('projetos:rot.addError')); break }
      await supabase.from('series').insert(Array.from({ length: 3 }, (_, n) => ({
        routine_exercise_id: data.id,
        position: n,
        params: { reps: '10', load: '', rest: '90s' },
      })))
    }
    setPickerOpen(false)
    await load()
  }

  async function removeExercise(exId: string) {
    setBorrandoExercicio(null)
    await supabase.from('routine_exercises').delete().eq('id', exId)
    await load()
  }

  async function cycleGroup(exId: string, cur: 'single' | 'biset' | 'triset') {
    const next = cur === 'single' ? 'biset' : cur === 'biset' ? 'triset' : 'single'
    await supabase.from('routine_exercises').update({ group_type: next }).eq('id', exId)
    await load()
  }

  async function addSerie(re: Ex) {
    const pos = (re.series?.length ?? 0)
    await supabase.from('series').insert({
      routine_exercise_id: re.id,
      position: pos,
      params: { reps: '10', load: '', rest: '90s' },
    })
    await load()
  }

  async function updateSerieParams(sId: string, params: any) {
    // También en memoria: el snapshot que se manda al alumno se arma con este
    // estado, y si no se actualiza viaja lo que había al abrir la pantalla.
    setExs((prev) => prev.map((ex) => ({
      ...ex,
      series: (ex.series ?? []).map((sr) => (sr.id === sId ? { ...sr, params } : sr)),
    })))
    const { error } = await supabase.from('series').update({ params }).eq('id', sId)
    if (error) setErrorGuardado(error.message)
  }

  async function updateSerieNotas(sId: string, notes: string) {
    setExs((prev) => prev.map((ex) => ({
      ...ex,
      series: (ex.series ?? []).map((sr) => (sr.id === sId ? { ...sr, notes } : sr)),
    })))
    const { error } = await supabase.from('series').update({ notes }).eq('id', sId)
    if (error) setErrorGuardado(error.message)
  }

  /** Copia parámetros y observación al final, como pide el diseño. */
  async function duplicarSerie(re: Ex, s: Serie) {
    const pos = re.series?.length ?? 0
    const { error } = await supabase.from('series').insert({
      routine_exercise_id: re.id,
      position: pos,
      params: s.params ?? {},
      notes: s.notes ?? null,
    })
    if (error) { setErrorGuardado(error.message); return }
    await load()
  }

  async function removeSerie(sId: string) {
    await supabase.from('series').delete().eq('id', sId)
    await load()
  }

  return (
    <div className={embebido ? '' : 'pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-32'}>
      {!embebido && (
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-rt-20 font-bold truncate">{routine?.name ?? '...'}</h1>
            {routine?.objective && (
              <div className="text-white/60 text-rt-11">
                {etiquetaDe(objetivosTreino, routine.objective, i18n.language)}
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">{t('projetos:rot.loading')}</div>
      ) : exs.length === 0 ? (
        <EmptyState icon={Dumbbell} title={t('projetos:rot.noExercises')} body={t('projetos:rot.noExercisesBody')} />
      ) : (
        <>
          {seleccion.length > 0 ? (
            <div className="flex items-center gap-2 mb-3">
              {(seleccion.length === 2 || seleccion.length === 3) && (
                <button
                  onClick={() => void agruparSeleccion()}
                  className="h-10 px-5 rounded-btn-pill bg-danger text-white text-rt-14 font-semibold"
                >
                  {seleccion.length === 2 ? 'Bi-set' : 'Tri-set'}
                </button>
              )}
              <button
                onClick={() => void borrarSeleccion()}
                className="h-10 px-5 rounded-btn-pill bg-danger text-white text-rt-14 font-semibold"
              >
                {t('projetos:c.delete')}
              </button>
              <button onClick={() => setSeleccion([])} className="ml-auto text-white/70 text-rt-14">
                {t('projetos:c.cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setTodosAbiertos((v) => !v)}
              className="block ml-auto text-brand text-rt-13 font-semibold mb-2"
            >
              {todosAbiertos ? t('projetos:rot.collapseAll') : t('projetos:rot.expandAll')}
            </button>
          )}

          <ul className="flex flex-col gap-3">
            {agrupar(exs).map((bloque, bi) => {
              if (bloque.tipo === 'single') {
                const re = bloque.exercicios[0]
                return (
                  <li key={re.id}>
                    <TarjetaExercicio
                      re={re}
                      abierto={abiertos[re.id!] ?? todosAbiertos}
                      media={re.exercise_id ? (mediaPorExercicio[re.exercise_id] ?? {}) : {}}
                      chips={chipsDe(re)}
                      lang={i18n.language}
                      arrastre={arrastre}
                      seleccionado={seleccion.includes(re.id!)}
                      onSeleccionar={() => setSeleccion((p) => p.includes(re.id!) ? p.filter((x) => x !== re.id) : [...p, re.id!])}
                      onAlternar={() => setAbiertos((p) => ({ ...p, [re.id!]: !(p[re.id!] ?? todosAbiertos) }))}
                      onGrupo={() => cycleGroup(re.id!, re.group_type)}
                      onBorrar={() => setBorrandoExercicio(re.id!)}
                      onSerieParams={updateSerieParams}
                      onSerieNotas={updateSerieNotas}
                      onDuplicarSerie={(sr) => duplicarSerie(re, sr)}
                      onBorrarSerie={removeSerie}
                      onNuevaSerie={() => addSerie(re)}
                      onReordenarSeries={(a, b) => void reordenarSeries(re, a, b)}
                    />
                  </li>
                )
              }

              const esBiset = bloque.tipo === 'biset'
              return (
                <li
                  key={'g' + bi}
                  className={
                    'rounded-card border-2 overflow-hidden ' +
                    (esBiset ? 'border-group-biset' : 'border-group-triset')
                  }
                >
                  <div className={
                    'flex items-center gap-2 px-3 py-2 ' +
                    (esBiset ? 'bg-group-biset/15' : 'bg-group-triset/15')
                  }>
                    <Link2 size={16} className={esBiset ? 'text-group-biset' : 'text-group-triset'} />
                    <span className={'text-rt-14 font-bold flex-1 ' + (esBiset ? 'text-group-biset' : 'text-group-triset')}>
                      {esBiset ? 'Bi-set' : 'Tri-set'}
                    </span>
                    <button
                      onClick={() => setGrupoAbierto({ tipo: bloque.tipo, ids: bloque.exercicios.map((x) => x.id!) })}
                      aria-label={t('projetos:rot.groupOptions')}
                      className="w-7 h-7 flex items-center justify-center"
                    >
                      <MoreVertical size={16} className={esBiset ? 'text-group-biset' : 'text-group-triset'} />
                    </button>
                  </div>

                  <ul className="flex flex-col gap-2 p-2">
                    {bloque.exercicios.map((re) => (
                      <li key={re.id}>
                        <TarjetaExercicio
                          re={re}
                          abierto={abiertos[re.id!] ?? todosAbiertos}
                          media={re.exercise_id ? (mediaPorExercicio[re.exercise_id] ?? {}) : {}}
                          chips={chipsDe(re)}
                          lang={i18n.language}
                          arrastre={arrastre}
                      seleccionado={seleccion.includes(re.id!)}
                          onSeleccionar={() => setSeleccion((p) => p.includes(re.id!) ? p.filter((x) => x !== re.id) : [...p, re.id!])}
                          onAlternar={() => setAbiertos((p) => ({ ...p, [re.id!]: !(p[re.id!] ?? todosAbiertos) }))}
                          onGrupo={() => cycleGroup(re.id!, re.group_type)}
                          onBorrar={() => setBorrandoExercicio(re.id!)}
                          onSerieParams={updateSerieParams}
                          onSerieNotas={updateSerieNotas}
                          onDuplicarSerie={(sr) => duplicarSerie(re, sr)}
                          onBorrarSerie={removeSerie}
                          onNuevaSerie={() => addSerie(re)}
                          onReordenarSeries={(a, b) => void reordenarSeries(re, a, b)}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <div className={embebido
        ? 'flex gap-2 mt-3'
        : 'fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+96px)] flex gap-2 bg-surface-app/95 backdrop-blur'}>
        <button onClick={() => setPickerOpen(true)} className="flex-1 h-12 rounded-btn-pill bg-brand text-white text-rt-14 font-semibold flex items-center justify-center gap-2">
          <Plus size={18} /> {t('projetos:rot.addExercise')}
        </button>
        {profile && exs.length > 0 && !routine?.student_id && (
          <button onClick={() => setAssignOpen(true)} className="flex-1 h-12 rounded-btn-pill bg-charge text-white text-rt-14 font-semibold flex items-center justify-center gap-2">
            <Users size={18} /> {t('projetos:rot.assign')}
          </button>
        )}
      </div>

      {grupoAbierto && (
        <HojaOpcionesGrupo
          tipo={grupoAbierto.tipo}
          onDesfazer={async () => {
            for (const id of grupoAbierto.ids) await desagruparExercicio(id)
            setGrupoAbierto(null)
          }}
          onCerrar={() => setGrupoAbierto(null)}
        />
      )}

      {pickerOpen && (
        <AdicionarExercicios
          yaEnRutina={exs.map((e) => e.exercise_id).filter(Boolean) as string[]}
          onCerrar={() => setPickerOpen(false)}
          onAgregar={addExercises}
        />
      )}
      {errorGuardado && (
        <FeedbackDialog kind="error" message={errorGuardado} onClose={() => setErrorGuardado(null)} />
      )}
      {assignOpen && routine && <AssignSheet routine={routine} onClose={() => setAssignOpen(false)} />}
      {borrandoExercicio && (
        <ConfirmDialog
          message={t('projetos:rot.removeExQ')}
          detail={t('projetos:rot.removeExDetail')}
          confirmLabel={t('projetos:c.remove')}
          tone="danger"
          onConfirm={() => void removeExercise(borrandoExercicio)}
          onCancel={() => setBorrandoExercicio(null)}
        />
      )}
    </div>
  )
}

function AssignSheet({ routine, onClose }: { routine: Routine; onClose: () => void }) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [students, setStudents] = useState<{ id: string; full_name: string | null; email: string | null }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [startsOn, setStartsOn] = useState(new Date().toISOString().slice(0, 10))
  const [endsOn, setEndsOn] = useState(new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10))
  const [freq, setFreq] = useState(3)
  const [days, setDays] = useState<number[]>([1, 3, 5])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase.from('profiles')
        .select('id,full_name,email').eq('teacher_id', profile.id).eq('link_status', 'active').order('full_name')
      setStudents((data as any) ?? [])
    })()
  }, [profile?.id])

  function toggle(id: string) {
    const n = new Set(selected)
    if (n.has(id)) n.delete(id); else n.add(id)
    setSelected(n)
  }
  function toggleDay(d: number) {
    if (days.includes(d)) setDays(days.filter((x) => x !== d))
    else if (days.length < freq) setDays([...days, d].sort())
  }

  function estimateWorkouts() {
    const s = new Date(startsOn + 'T00:00:00')
    const e = new Date(endsOn + 'T00:00:00')
    let n = 0
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      if (days.includes(d.getDay())) n++
    }
    return n
  }

  async function assign() {
    if (!profile?.id || selected.size === 0) return
    setSaving(true)
    const periodo = { starts_on: startsOn, ends_on: endsOn, weekdays: days.slice(0, freq), frequency: freq }
    try {
      for (const sid of selected) {
        await asignarRutina({ rutinaId: routine.id, alumnoId: sid, profesorId: profile.id, profesorNombre: profile.full_name ?? null, periodo })
      }
    } catch (e) {
      setSaving(false)
      setError((e as Error).message)
      return
    }
    setSaving(false)
    onClose()
  }

  return (
    <FullScreenSheet title={t('projetos:rot.assignTitle')} onClose={onClose}>
      <div className="flex flex-col gap-6">
        <Field label={t('projetos:rot.studentsN', { n: selected.size })}>
          {students.length === 0 ? (
            <div className="text-white/60 text-rt-13">{t('projetos:rot.noActive')}</div>
          ) : (
            <ul className="flex flex-col gap-2 max-h-56 overflow-y-auto">
              {students.map((s) => (
                <li key={s.id}>
                  <button onClick={() => toggle(s.id)} className={
                    'w-full flex items-center gap-3 p-3 rounded-card border ' +
                    (selected.has(s.id) ? 'bg-brand/20 border-brand' : 'bg-transparent border-grey-700')
                  }>
                    <div className={'w-5 h-5 rounded-sm border-2 flex items-center justify-center ' + (selected.has(s.id) ? 'bg-brand border-brand' : 'border-grey-500')}>
                      {selected.has(s.id) && <span className="text-white text-[10px]">✓</span>}
                    </div>
                    <span className="text-white text-rt-13 flex-1 text-left truncate">{s.full_name ?? s.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('projetos:rot.start')}><input type="date" className="input-dark" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></Field>
          <Field label={t('projetos:rot.end')}><input type="date" className="input-dark" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} /></Field>
        </div>
        <Field label={t('projetos:rot.weeklyFreq')}>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button key={n} type="button" onClick={() => { setFreq(n); if (days.length > n) setDays(days.slice(0, n)) }} className={
                'w-9 h-9 rounded-full text-rt-12 font-semibold ' +
                (freq === n ? 'bg-brand text-white' : 'bg-surface-raised text-grey-400')
              }>{n}x</button>
            ))}
          </div>
        </Field>
        <Field label={t('projetos:rot.daysN', { n: days.length, total: freq })}>
          <div className="flex gap-2">
            {t('projetos:rot.weekInitials').split(',').map((l, i) => (
              <button key={i} type="button" onClick={() => toggleDay(i)} className={
                'flex-1 h-10 rounded-lg text-rt-12 font-semibold ' +
                (days.includes(i) ? 'bg-brand text-white' : 'bg-surface-raised text-grey-400')
              }>{l}</button>
            ))}
          </div>
        </Field>
        <div className="card-dark p-3 text-white/70 text-rt-12">
          {t('projetos:rot.estimate')} <strong className="text-brand">{estimateWorkouts()}</strong> {t('projetos:rot.workoutsInPeriod')}
        </div>
      </div>
      <div className="mt-8">
        <button className="btn-save" disabled={saving || selected.size === 0 || days.length !== freq} onClick={assign}>
          {saving ? t('projetos:rot.assigning') : t('projetos:rot.assign')}
        </button>
      </div>
      {error && <FeedbackDialog kind="error" message={error} onClose={() => setError(null)} />}
    </FullScreenSheet>
  )
}


type Bloque = { tipo: 'single' | 'biset' | 'triset'; exercicios: Ex[] }

/**
 * Los ejercicios agrupados en bi-set/tri-set van juntos dentro de un marco de
 * color (prints 017 y 018). Se agrupan por group_id; los sueltos van solos.
 */
function agrupar(exs: Ex[]): Bloque[] {
  const orden = exs.slice().sort((a, b) => a.position - b.position)
  const salida: Bloque[] = []
  for (const ex of orden) {
    const gid = (ex as Ex & { group_id?: string | null }).group_id
    const ultimo = salida[salida.length - 1]
    const mismoGrupo = ex.group_type !== 'single'
      && gid
      && ultimo
      && ultimo.tipo === ex.group_type
      && (ultimo.exercicios[0] as Ex & { group_id?: string | null }).group_id === gid
    if (mismoGrupo) ultimo.exercicios.push(ex)
    else salida.push({ tipo: ex.group_type, exercicios: [ex] })
  }
  return salida
}

/** Ejercicio dentro de la rotina: colapsado muestra nombre y chips; abierto, media y series. */
function TarjetaExercicio({
  re, abierto, media, chips, lang, seleccionado, arrastre,
  onSeleccionar, onAlternar, onGrupo, onBorrar,
  onSerieParams, onSerieNotas, onDuplicarSerie, onBorrarSerie, onNuevaSerie,
  onReordenarSeries,
}: {
  re: Ex
  abierto: boolean
  media: Media
  chips: string[]
  lang: string
  seleccionado: boolean
  arrastre: ReturnType<typeof useArrastreLista<string>>
  onSeleccionar: () => void
  onAlternar: () => void
  onGrupo: () => void
  onBorrar: () => void
  onSerieParams: (sId: string, params: Record<string, string>) => void
  onSerieNotas: (sId: string, notas: string) => void
  onDuplicarSerie: (s: Serie) => void
  onBorrarSerie: (sId: string) => void
  onNuevaSerie: () => void
  onReordenarSeries: (desdeId: string, hastaId: string) => void
}) {
  const { t } = useTranslation()
  const arrastreSeries = useArrastreLista<string>(onReordenarSeries)
  return (
    <div
      ref={(el) => arrastre.registrar(re.id!, el)}
      onPointerMove={arrastre.alMover}
      onPointerUp={arrastre.alSoltar}
      className={
        'card-dark p-3 transition ' +
        (seleccionado ? 'border-brand ' : '') +
        (arrastre.arrastrando === re.id ? 'opacity-50 ' : '') +
        (arrastre.encima === re.id && arrastre.arrastrando !== re.id ? 'border-brand border-dashed ' : '')
      }
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onPointerDown={arrastre.alBajar(re.id!)}
          aria-label={t('projetos:rot.drag')}
          className="shrink-0 touch-none cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={16} className="text-grey-600" />
        </button>
        <button
          type="button"
          onClick={onSeleccionar}
          aria-label={seleccionado ? t('projetos:c.unmark') : t('projetos:c.mark')}
          className={
            'w-6 h-6 rounded-[6px] border-2 flex items-center justify-center shrink-0 text-rt-12 ' +
            (seleccionado ? 'bg-brand border-brand text-white' : 'border-grey-600')
          }
        >
          {seleccionado && '✓'}
        </button>
        <MiniaturaMedia media={media} tamano={48} />
        <div className="flex-1 min-w-0">
          <div className="text-white text-rt-14 font-semibold truncate">
            {nombreEjercicio({ name: re.exercise_name_snapshot ?? t('projetos:rot.exercise'), ...(media as { name_pt?: string | null; name_es?: string | null; name_en?: string | null }) }, lang)}
          </div>
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {chips.map((c) => (
                <span key={c} className="text-rt-10 px-2 py-0.5 rounded-tag bg-surface-raised text-white/70">{c}</span>
              ))}
            </div>
          )}
        </div>
        <button onClick={onGrupo} className="w-7 h-7 rounded-md bg-surface-input flex items-center justify-center shrink-0" title={t('projetos:rot.toggleGroup')}>
          <Link2 size={14} className="text-brand" />
        </button>
        <button onClick={onBorrar} className="w-7 h-7 rounded-md bg-surface-input flex items-center justify-center shrink-0" aria-label={t('projetos:rot.deleteEx')}>
          <Trash2 size={14} className="text-danger" />
        </button>
        <button onClick={onAlternar} className="w-7 h-7 flex items-center justify-center shrink-0" aria-label={abierto ? 'Recolher' : 'Expandir'}>
          <ChevronDown size={18} className={'text-grey-500 transition-transform ' + (abierto ? 'rotate-180' : '')} />
        </button>
      </div>

      {abierto && (
        <div className="mt-3 pt-3 border-t border-surface-line">
          <BannerMedia media={media} />

          <div className="flex items-baseline gap-2 mt-4 mb-2">
            <span className="text-white text-rt-14 font-semibold">{t('projetos:rot.series')}</span>
            <span className="text-grey-500 text-rt-11 italic">{t('projetos:rot.dragHint')}</span>
          </div>

          <div className="flex flex-col gap-4">
            {re.series?.slice().sort((a, b) => a.position - b.position).map((sr, si) => (
              <FilaSerie
                key={sr.id}
                id={sr.id}
                arrastre={arrastreSeries}
                numero={si + 1}
                params={normalizarParams(sr.params)}
                observacion={sr.notes ?? ''}
                lang={lang}
                onParams={(np) => onSerieParams(sr.id!, np)}
                onObservacion={(v) => onSerieNotas(sr.id!, v)}
                onDuplicar={() => onDuplicarSerie(sr)}
                onEliminar={() => onBorrarSerie(sr.id!)}
              />
            ))}
          </div>

          <button onClick={onNuevaSerie} className="text-brand text-rt-14 font-semibold underline mt-4">
            {t('projetos:rot.addSeries')}
          </button>
        </div>
      )}
    </div>
  )
}

/** Print 032: las opciones del grupo se abren desde los tres puntos. */
function HojaOpcionesGrupo({ tipo, onDesfazer, onCerrar }: {
  tipo: string
  onDesfazer: () => void
  onCerrar: () => void
}) {
  const { t } = useTranslation()
  const etiqueta = tipo === 'biset' ? 'Bi-set' : 'Tri-set'
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onCerrar}>
      <div
        className="w-full max-w-app rounded-t-[20px] bg-surface-raised pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-1 rounded-full bg-grey-600 mx-auto mb-4" />
        <button
          onClick={onDesfazer}
          className="w-full flex items-center gap-4 px-6 py-4 text-left"
        >
          <Unlink size={22} className="text-white" />
          <span className="text-white text-rt-16">{t('projetos:rot.undoGroup', { group: etiqueta })}</span>
        </button>
      </div>
    </div>
  )
}

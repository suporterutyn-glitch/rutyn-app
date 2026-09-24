import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { diasCortos } from '@/lib/fechas'
import { Plus, X, Check, Dumbbell, Search, CalendarCheck, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { RoutineCard } from '@/pages/professor/projetos/RoutineCard'
import { EditorRotina } from '@/pages/professor/EditorRotina'
import { EmptyState, FullScreenSheet } from '@/pages/professor/projetos/RoutinesTab'
import { CajaSelector, HojaRadio } from '@/components/professor/SelectorRadio'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { dificultades, objetivosTreino } from '@/lib/catalogos'
import { asignarRutina, crearRutinaAlumno, estimarTreinos, periodoPorDefecto, sincronizarRutinaAlumno } from '@/lib/asignacion'
import type { AlumnoCtx } from '@/pages/professor/projetos/DietsTab'

type Asignada = {
  id: string
  routine_id: string
  name: string
  objective: string | null
  starts_on: string
  ends_on: string | null
  weekdays: number[]
  frequency: number
  is_hidden: boolean
  estimated_workouts: number
  completed_workouts: number
  position: number
  routines: { id: string; name: string; objective: string | null; difficulty: string | null } | null
}
type Aviso = { kind: 'error' | 'success'; message: string }


/** Aba Rotinas del perfil del alumno: sus rutinas editables con período y progreso. */
export function RotinasAluno({ alumno }: { alumno: AlumnoCtx }) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [items, setItems] = useState<Asignada[] | null>(null)
  const [expandida, setExpandida] = useState<string | null>(null)
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [agregando, setAgregando] = useState(false)
  const [formulario, setFormulario] = useState<Asignada | 'nueva' | null>(null)
  const [clonando, setClonando] = useState<Asignada | null>(null)
  const [borrando, setBorrando] = useState<Asignada[] | null>(null)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [contrato, setContrato] = useState<{ weekdays: number[]; frequency: number } | null>(null)

  async function load() {
    const { data, error } = await supabase.from('student_routines')
      .select('*,routines!student_routines_routine_id_fkey(id,name,objective,difficulty)')
      .eq('student_id', alumno.id).not('routine_id', 'is', null)
      .order('position').order('created_at')
    if (error) setAviso({ kind: 'error', message: error.message })
    setItems((data as Asignada[]) ?? [])
  }
  useEffect(() => { void load() }, [alumno.id])

  useEffect(() => {
    void supabase.from('invites').select('weekdays,frequency').eq('student_id', alumno.id).eq('status', 'accepted')
      .order('updated_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        const dias = ((data?.weekdays as unknown[]) ?? []).map(Number).filter((n) => n >= 0 && n <= 6)
        if (dias.length > 0) setContrato({ weekdays: dias, frequency: data?.frequency ?? dias.length })
      })
  }, [alumno.id])

  const hechos = (items ?? []).reduce((n, r) => n + (r.completed_workouts ?? 0), 0)
  const total = (items ?? []).reduce((n, r) => n + (r.estimated_workouts ?? 0), 0)
  const todas = (items ?? []).length > 0 && (items ?? []).every((r) => seleccion.includes(r.id))

  async function guardarComoModelo(r: Asignada) {
    const { error } = await supabase.rpc('copiar_rotina', { rotina_id: r.routine_id, para_alumno: null, nuevo_nombre: r.name })
    setAviso(error ? { kind: 'error', message: error.message } : { kind: 'success', message: t('projetos:ra.savedTemplate') })
  }

  async function duplicar(r: Asignada) {
    if (!profile?.id) return
    try {
      await asignarRutina({
        rutinaId: r.routine_id, alumnoId: alumno.id, profesorId: profile.id, profesorNombre: profile.full_name ?? null,
        nombre: t('projetos:ra.copyName', { name: r.name }), periodo: { starts_on: r.starts_on, ends_on: r.ends_on, weekdays: r.weekdays, frequency: r.frequency },
      })
      await load()
    } catch (e) { setAviso({ kind: 'error', message: (e as Error).message }) }
  }

  async function borrar() {
    if (!borrando) return
    // Borrar la rutina borra también su asignación (y lo que ve el alumno).
    const { error } = await supabase.from('routines').delete().in('id', borrando.map((r) => r.routine_id))
    setBorrando(null)
    if (error) { setAviso({ kind: 'error', message: error.message }); return }
    setSeleccion([])
    await load()
  }

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => setAgregando(true)} className="flex-[2] h-11 rounded-[16px] bg-gradient-to-r from-[#7CB342] to-[#558B2F] text-white text-rt-14 font-semibold flex items-center justify-center gap-2">
          <Plus size={18} /> {t('projetos:ra.addRoutine')}
        </button>
        <div className="flex-1 text-right">
          <div className="text-white/80 text-rt-14 font-medium">{t('projetos:ra.workouts', { done: hechos, total })}</div>
          <div className="h-1.5 mt-1 rounded-full border border-white/50 overflow-hidden">
            <div className="h-full bg-brand" style={{ width: `${total ? Math.min(100, (hechos / total) * 100) : 0}%` }} />
          </div>
        </div>
      </div>

      {seleccion.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setBorrando((items ?? []).filter((r) => seleccion.includes(r.id)))} className="h-9 px-5 rounded-[20px] bg-[#D32F2F] text-white text-rt-13 font-semibold">{t('projetos:ra.delete')}</button>
          <button onClick={() => setSeleccion(todas ? [] : (items ?? []).map((r) => r.id))} className="text-grey-400 text-rt-13">{todas ? 'Desselecionar tudo' : 'Selecionar tudo'}</button>
        </div>
      )}

      {items === null ? (
        <div className="py-10 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={Dumbbell} title={t('projetos:ra.noAssigned')} body={t('projetos:ra.addFor', { name: alumno.nombre })} />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((r) => (
            <li key={r.id}>
              <RoutineCard
                rotina={{ id: r.routine_id, name: r.routines?.name ?? r.name, objective: r.routines?.objective ?? r.objective, difficulty: r.routines?.difficulty ?? null, is_favorite: false }}
                deAlumno
                progreso={r.estimated_workouts ? `${r.completed_workouts}/${r.estimated_workouts}` : undefined}
                oculta={r.is_hidden}
                seleccionada={seleccion.includes(r.id)}
                modoSeleccion={seleccion.length > 0}
                onToggleSeleccion={() => setSeleccion((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))}
                onFavorito={() => void guardarComoModelo(r)}
                onClonar={() => setClonando(r)}
                onDuplicar={() => void duplicar(r)}
                onEditar={() => setFormulario(r)}
                onExcluir={() => setBorrando([r])}
                expandida={expandida === r.id}
                onExpandir={() => setExpandida((v) => (v === r.id ? null : r.id))}
              />
              {expandida === r.id && (
                <div className="mt-2 pl-2 border-l-2 border-brand/40">
                  <EditorRotina routineId={r.routine_id} embebido />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {agregando && (
        <AdicionarRotina
          alumno={alumno}
          contrato={contrato}
          onCerrar={() => setAgregando(false)}
          onCrear={() => { setAgregando(false); setFormulario('nueva') }}
          onListo={() => { setAgregando(false); void load() }}
          onError={(m) => setAviso({ kind: 'error', message: m })}
        />
      )}
      {formulario && (
        <FormRotinaAluno
          alumno={alumno}
          asignada={formulario === 'nueva' ? undefined : formulario}
          contrato={contrato}
          posicion={items?.length ?? 0}
          onCerrar={() => setFormulario(null)}
          onListo={(nuevaId) => { setFormulario(null); void load().then(() => { if (nuevaId) setExpandida(nuevaId) }) }}
        />
      )}
      {clonando && <ClonarRotina r={clonando} origen={alumno.id} onCerrar={() => setClonando(null)} onResultado={(a) => { setClonando(null); setAviso(a) }} />}
      {borrando && (
        <ConfirmDialog
          message={borrando.length === 1 ? t('projetos:ra.removeOne') : t('projetos:ra.removeMany', { n: borrando.length })}
          detail={borrando.length === 1 ? t('projetos:ra.removeOneDetail', { name: borrando[0].name, student: alumno.nombre }) : t('projetos:ra.removeManyDetail', { student: alumno.nombre })}
          confirmLabel={t('projetos:ra.remove')}
          tone="danger"
          onConfirm={() => void borrar()}
          onCancel={() => setBorrando(null)}
        />
      )}
      {aviso && <FeedbackDialog kind={aviso.kind} message={aviso.message} onClose={() => setAviso(null)} />}
    </div>
  )
}

function AdicionarRotina({ alumno, contrato, onCerrar, onCrear, onListo, onError }: {
  alumno: AlumnoCtx
  contrato: { weekdays: number[]; frequency: number } | null
  onCerrar: () => void
  onCrear: () => void
  onListo: () => void
  onError: (m: string) => void
}) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [modelos, setModelos] = useState<{ id: string; name: string; routine_exercises: { id: string }[] }[] | null>(null)
  const [elegida, setElegida] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  useEffect(() => {
    if (!profile?.id) return
    void supabase.from('routines').select('id,name,routine_exercises(id)').eq('owner_id', profile.id).is('student_id', null).order('name')
      .then(({ data }) => setModelos((data as any[]) ?? []))
  }, [profile?.id])

  async function agregar() {
    if (!elegida || !profile?.id) return
    setEnviando(true)
    try {
      const p = periodoPorDefecto()
      await asignarRutina({
        rutinaId: elegida, alumnoId: alumno.id, profesorId: profile.id, profesorNombre: profile.full_name ?? null,
        periodo: contrato ? { ...p, weekdays: contrato.weekdays, frequency: contrato.frequency } : p,
      })
      onListo()
    } catch (e) {
      setEnviando(false)
      onError(t('projetos:ra.addError', { msg: (e as Error).message }))
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#1E1E1E] flex flex-col">
      <div className="max-w-app w-full mx-auto flex flex-col flex-1 min-h-0 pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="px-5 flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-white text-rt-20 font-bold">{t('projetos:ra.addRoutine')}</h1>
            <p className="text-grey-500 text-rt-13">{t('projetos:ra.addSub', { name: alumno.nombre })}</p>
          </div>
          <button onClick={onCerrar} aria-label={t('projetos:ra.close')} className="w-9 h-9 rounded-full bg-[#333333] flex items-center justify-center"><X size={20} className="text-white" /></button>
        </div>
        <div className="px-5 mt-5">
          <button onClick={onCrear} className="w-full h-12 rounded-[12px] bg-gradient-to-b from-[#91C145] to-[#5A8F2F] text-white text-rt-15 font-semibold flex items-center justify-center gap-2">
            <Plus size={20} /> {t('projetos:ra.createNew')}
          </button>
          <div className="flex items-center gap-3 my-5 text-grey-500 text-rt-12"><span className="flex-1 h-px bg-grey-700" />{t('projetos:ra.orExisting')}<span className="flex-1 h-px bg-grey-700" /></div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {modelos === null ? (
            <div className="py-10 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></div>
          ) : modelos.length === 0 ? (
            <p className="text-center text-white/60 text-rt-13 py-8">{t('projetos:ra.noTemplates')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {modelos.map((r) => {
                const on = elegida === r.id
                return (
                  <li key={r.id}>
                    <button onClick={() => setElegida(on ? null : r.id)} className={'w-full rounded-[12px] p-4 flex items-center gap-3 text-left border ' + (on ? 'bg-brand/15 border-brand' : 'bg-[#2D2D2D] border-[#3A3A3A]')}>
                      <span className="w-12 h-12 rounded-[10px] bg-[#1E1E1E] flex items-center justify-center shrink-0"><Dumbbell size={20} className="text-grey-400" /></span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-white text-rt-15 font-semibold truncate">{r.name}</span>
                        <span className="block text-grey-500 text-rt-12">{t('projetos:ra.nExercises', { n: r.routine_exercises.length })}</span>
                      </span>
                      <span className={'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ' + (on ? 'bg-brand border-brand' : 'border-grey-500')}>{on && <Check size={14} className="text-white" />}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] border-t border-grey-800">
          <button disabled={!elegida || enviando} onClick={() => void agregar()}
            className={'w-full h-[54px] rounded-[12px] text-rt-15 font-bold ' + (elegida ? 'bg-gradient-to-b from-[#91C145] to-[#5A8F2F] text-white' : 'bg-grey-700 text-white/60')}>
            {enviando ? t('projetos:ra.adding') : t('projetos:ra.addSelected')}
          </button>
        </div>
      </div>
    </div>
  )
}

function FormRotinaAluno({ alumno, asignada, contrato, posicion, onCerrar, onListo }: {
  alumno: AlumnoCtx
  asignada?: Asignada
  contrato: { weekdays: number[]; frequency: number } | null
  posicion: number
  onCerrar: () => void
  onListo: (nuevaId?: string) => void
}) {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation()
  const DIAS = diasCortos(i18n.language)
  const lang = i18n.language
  const def = periodoPorDefecto()
  const [nombres, setNombres] = useState<string[]>([asignada?.routines?.name ?? asignada?.name ?? ''])
  const [dificultad, setDificultad] = useState(asignada?.routines?.difficulty ?? '')
  const [objetivo, setObjetivo] = useState(asignada?.routines?.objective ?? asignada?.objective ?? '')
  const [inicio, setInicio] = useState(asignada?.starts_on ?? def.starts_on)
  const [fin, setFin] = useState(asignada?.ends_on ?? def.ends_on ?? '')
  const [dias, setDias] = useState<number[]>(asignada?.weekdays ?? contrato?.weekdays ?? def.weekdays)
  const [manual, setManual] = useState(Boolean(asignada) || !contrato)
  const [oculta, setOculta] = useState(asignada?.is_hidden ?? false)
  const [resetear, setResetear] = useState(false)
  const [abriendo, setAbriendo] = useState<'dificuldade' | 'objetivo' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const periodo = { starts_on: inicio, ends_on: fin || null, weekdays: dias.slice().sort(), frequency: dias.length }
  const estimados = estimarTreinos(periodo)
  const validos = nombres.map((n) => n.trim()).filter(Boolean)

  async function guardar() {
    if (validos.length === 0) { setError(t('projetos:ra.nameReq')); return }
    if (dias.length === 0) { setError(t('projetos:ra.dayReq')); return }
    if (fin && fin < inicio) { setError(t('projetos:ra.endAfter')); return }
    if (!profile?.id) return
    setError(null)
    setGuardando(true)
    try {
      if (asignada) {
        const { error: e1 } = await supabase.from('routines').update({ name: validos[0], difficulty: dificultad || null, objective: objetivo || null }).eq('id', asignada.routine_id)
        if (e1) throw e1
        const { error: e2 } = await supabase.from('student_routines').update({
          ...periodo, estimated_workouts: estimados, is_hidden: oculta, ...(resetear ? { completed_workouts: 0 } : {}),
        }).eq('id', asignada.id)
        if (e2) throw e2
        await sincronizarRutinaAlumno(asignada.routine_id)
        onListo()
      } else {
        let primera: string | undefined
        for (let i = 0; i < validos.length; i++) {
          const id = await crearRutinaAlumno({ alumnoId: alumno.id, profesorId: profile.id, nombre: validos[i], difficulty: dificultad || null, objective: objetivo || null, periodo, posicion: posicion + i })
          primera ??= id
        }
        onListo()
      }
    } catch (e) {
      setGuardando(false)
      setError(t('projetos:ra.saveError', { msg: (e as Error).message }))
    }
  }

  const campo = 'w-full h-[52px] px-4 rounded-[12px] bg-[#252525] border border-[#333333] text-white text-rt-15 placeholder:text-grey-600 outline-none focus:border-brand [color-scheme:dark]'

  return (
    <FullScreenSheet title={asignada ? t('projetos:ra.editTitle') : t('projetos:ra.newTitle')} onClose={onCerrar}>
      {error && <div className="mb-5 rounded-[10px] bg-danger/10 border border-danger/30 px-3 py-2.5 text-[#EF5350] text-rt-13">{error}</div>}
      <div className="flex flex-col gap-6">
        <div>
          <label className="block text-white text-rt-13 font-semibold mb-2">{nombres.length > 1 ? t('projetos:ra.names') : t('projetos:ra.name')}</label>
          <div className="flex flex-col gap-2">
            {nombres.map((n, i) => (
              <div key={i} className="flex gap-2">
                <input className={campo} value={n} onChange={(e) => setNombres((p) => p.map((x, k) => (k === i ? e.target.value : x)))} placeholder={t('projetos:ra.namePh', { letter: String.fromCharCode(65 + i) })} />
                {i > 0 && <button onClick={() => setNombres((p) => p.filter((_, k) => k !== i))} aria-label={t('projetos:ra.removeName')}><X size={18} className="text-[#EF5350]" /></button>}
              </div>
            ))}
          </div>
          {!asignada && (
            <button onClick={() => setNombres((p) => [...p, ''])} className="mt-2 text-brand text-rt-13 font-semibold flex items-center gap-1"><Plus size={16} /> {t('projetos:ra.addAnother')}</button>
          )}
        </div>
        <CajaSelector label={t('projetos:c.difficulty')} valor={dificultad} placeholder={t('projetos:c.beginnerPh')} lista={dificultades} lang={lang} onAbrir={() => setAbriendo('dificuldade')} />
        <CajaSelector label={t('projetos:c.objective')} valor={objetivo} placeholder={t('projetos:c.hypertrophyPh')} lista={objetivosTreino} lang={lang} onAbrir={() => setAbriendo('objetivo')} />

        <div className="border-t border-grey-800 pt-6">
          <h3 className="text-white text-rt-17 font-bold">{t('projetos:ra.period')}</h3>
          <p className="text-grey-500 text-rt-12 mt-1 mb-4">{t('projetos:ra.periodSub')}</p>
          <label className="block text-white text-rt-13 font-semibold mb-2">{t('projetos:ra.startDate')}</label>
          <input type="date" className={campo} value={inicio} onChange={(e) => setInicio(e.target.value)} />
          <label className="block text-white text-rt-13 font-semibold mb-2 mt-4">{t('projetos:ra.endDate')}</label>
          <input type="date" className={campo} value={fin} onChange={(e) => setFin(e.target.value)} />
          <label className="block text-white text-rt-13 font-semibold mb-2 mt-4">{t('projetos:ra.days')}</label>
          {!manual && contrato ? (
            <div className="rounded-[12px] bg-[#252525] border border-[#333333] p-4 flex items-center gap-3">
              <CalendarCheck size={20} className="text-brand" />
              <span className="flex-1">
                <span className="block text-white text-rt-14">{t('projetos:ra.fromContract', { days: contrato.weekdays.map((d) => DIAS[d]).join(', ') })}</span>
                <span className="block text-grey-500 text-rt-12">{t('projetos:ra.perWeek', { n: contrato.frequency })}</span>
              </span>
              <button onClick={() => setManual(true)} className="text-brand text-rt-13 font-semibold">{t('projetos:ra.change')}</button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              {DIAS.map((l, i) => (
                <button key={i} type="button" onClick={() => setDias((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))}
                  className={'flex-1 h-10 rounded-[10px] text-rt-12 font-semibold ' + (dias.includes(i) ? 'bg-brand text-white' : 'bg-[#252525] text-grey-400')}>{l}</button>
              ))}
            </div>
          )}
          <div className="mt-4 rounded-[12px] border border-brand/40 bg-brand/10 px-4 py-3 flex items-center gap-2 text-brand text-rt-14 font-semibold">
            <Dumbbell size={18} /> {t('projetos:ra.estimated', { n: estimados })}{!fin && t('projetos:ra.noEnd')}
          </div>
        </div>

        {asignada && (
          <div className="border-t border-grey-800 pt-6">
            <h3 className="text-white text-rt-17 font-bold mb-3">{t('projetos:ra.actions')}</h3>
            <button onClick={() => setOculta((v) => !v)} className="w-full h-12 rounded-[12px] bg-[#252525] border border-[#333333] px-4 flex items-center gap-3 text-white text-rt-14">
              {oculta ? <Eye size={18} className="text-brand" /> : <EyeOff size={18} className="text-grey-400" />}
              {oculta ? t('projetos:ra.show') : t('projetos:ra.hide')}
            </button>
            <button onClick={() => setResetear((v) => !v)} className={'w-full h-12 mt-2 rounded-[12px] border px-4 flex items-center gap-3 text-rt-14 ' + (resetear ? 'bg-danger/10 border-danger/40 text-[#EF5350]' : 'bg-[#252525] border-[#333333] text-white')}>
              <RotateCcw size={18} /> {resetear ? t('projetos:ra.resetPending', { n: asignada.completed_workouts }) : t('projetos:ra.reset')}
            </button>
          </div>
        )}
      </div>
      <div className="mt-8">
        <button onClick={() => void guardar()} disabled={guardando} className="w-full h-[54px] rounded-[27px] bg-gradient-to-b from-[#91C145] to-[#5A8F2F] text-white text-rt-16 font-bold disabled:opacity-60">
          {guardando ? t('projetos:c.saving') : asignada ? t('projetos:ra.save') : validos.length > 1 ? t('projetos:ra.createN', { n: validos.length }) : t('projetos:ra.create')}
        </button>
      </div>
      {abriendo === 'dificuldade' && <HojaRadio lista={dificultades} valor={dificultad} lang={lang} onElegir={(id) => { setDificultad(id); setAbriendo(null) }} onCerrar={() => setAbriendo(null)} />}
      {abriendo === 'objetivo' && <HojaRadio lista={objetivosTreino} valor={objetivo} lang={lang} onElegir={(id) => { setObjetivo(id); setAbriendo(null) }} onCerrar={() => setAbriendo(null)} />}
    </FullScreenSheet>
  )
}

function ClonarRotina({ r, origen, onCerrar, onResultado }: { r: Asignada; origen: string; onCerrar: () => void; onResultado: (a: Aviso) => void }) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [alumnos, setAlumnos] = useState<{ id: string; full_name: string | null; email: string | null }[] | null>(null)
  const [busca, setBusca] = useState('')
  const [marcados, setMarcados] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  useEffect(() => {
    if (!profile?.id) return
    void supabase.from('profiles').select('id,full_name,email').eq('teacher_id', profile.id).eq('link_status', 'active').neq('id', origen).order('full_name')
      .then(({ data }) => setAlumnos((data as any[]) ?? []))
  }, [profile?.id])
  const lista = (alumnos ?? []).filter((a) => `${a.full_name ?? ''} ${a.email ?? ''}`.toLowerCase().includes(busca.trim().toLowerCase()))

  async function clonar() {
    if (!profile?.id) return
    setEnviando(true)
    let ok = 0
    for (const id of marcados) {
      try {
        await asignarRutina({ rutinaId: r.routine_id, alumnoId: id, profesorId: profile.id, profesorNombre: profile.full_name ?? null,
          periodo: { starts_on: r.starts_on, ends_on: r.ends_on, weekdays: r.weekdays, frequency: r.frequency } })
        ok++
      } catch { /* se informa abajo */ }
    }
    const fallos = marcados.length - ok
    onResultado(fallos === 0 ? { kind: 'success', message: t('projetos:ra.clonedN', { n: ok }) } : { kind: 'error', message: t('projetos:ra.clonedPartial', { ok, fail: fallos }) })
  }

  return (
    <FullScreenSheet title={t('projetos:ra.cloneTitle')} onClose={onCerrar}>
      <p className="text-grey-500 text-rt-13 -mt-6 mb-4">{t('projetos:ra.cloneSub', { name: r.name })}</p>
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t('projetos:ra.searchStudent')} className="w-full h-[50px] pl-10 pr-3 rounded-[12px] bg-[#2D2D2D] text-white text-rt-14 outline-none" />
      </div>
      {alumnos === null ? <div className="py-8 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></div>
        : lista.length === 0 ? <p className="text-white/60 text-rt-13 text-center py-6">{t('projetos:ra.noOthers')}</p> : (
          <ul className="flex flex-col gap-2">
            {lista.map((a) => {
              const on = marcados.includes(a.id)
              return (
                <li key={a.id}>
                  <button onClick={() => setMarcados((p) => (on ? p.filter((x) => x !== a.id) : [...p, a.id]))} className={'w-full rounded-[12px] p-3 flex items-center gap-3 text-left border ' + (on ? 'bg-brand/15 border-brand' : 'bg-[#2D2D2D] border-transparent')}>
                    <span className={'w-6 h-6 rounded-[6px] border-2 flex items-center justify-center ' + (on ? 'bg-brand border-brand' : 'border-grey-500')}>{on && <Check size={14} className="text-white" />}</span>
                    <span className="flex-1 min-w-0"><span className="block text-white text-rt-14 font-semibold truncate">{a.full_name ?? a.email}</span><span className="block text-grey-500 text-rt-12 truncate">{a.email}</span></span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      <div className="mt-8">
        <button disabled={marcados.length === 0 || enviando} onClick={() => void clonar()} className={'w-full h-[54px] rounded-[12px] text-white text-rt-15 font-bold ' + (marcados.length ? 'bg-gradient-to-b from-[#91C145] to-[#5A8F2F]' : 'bg-grey-700')}>
          {enviando ? t('projetos:ra.cloning') : marcados.length ? t('projetos:ra.cloneFor', { n: marcados.length }) : t('projetos:ra.pickStudent')}
        </button>
      </div>
    </FullScreenSheet>
  )
}

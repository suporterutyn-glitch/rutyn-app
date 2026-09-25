import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ListPlus, PlusCircle, Search, Check, Dumbbell, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { CajaSelector, HojaRadio } from '@/components/professor/SelectorRadio'
import { dificultades, objetivosTreino, etiquetaDe } from '@/lib/catalogos'
import { nombreEjercicio, type ConTraducciones } from '@/lib/nombreEjercicio'
import { FullScreenSheet } from './RoutinesTab'
import { detalleError } from '@/lib/errores'

type Ej = { id: string } & ConTraducciones
type Rutina = { id: string; name: string; objective: string | null; is_favorite: boolean | null; routine_exercises: { exercise_id: string | null }[] }

/** Agrega los ejercicios que falten, al final de la rutina, con una serie vacía cada uno. */
async function agregarARutina(rutinaId: string, ejercicios: Ej[], yaEstan: Set<string>, desde: number, lang: string) {
  const nuevos = ejercicios.filter((e) => !yaEstan.has(e.id))
  for (let i = 0; i < nuevos.length; i++) {
    const { data, error } = await supabase.from('routine_exercises').insert({
      routine_id: rutinaId,
      exercise_id: nuevos[i].id,
      exercise_name_snapshot: nombreEjercicio(nuevos[i], lang),
      position: desde + i,
      group_type: 'single',
    }).select('id').single()
    if (error) throw error
    const { error: e2 } = await supabase.from('series').insert({ routine_exercise_id: data.id, position: 0, params: {} })
    if (e2) throw e2
  }
  return nuevos.length
}

export function CombinarExercicios({ ejercicios, onCerrar, onListo, onError }: {
  ejercicios: Ej[]
  onCerrar: () => void
  onListo: (mensaje: string) => void
  onError: (mensaje: string) => void
}) {
  const { t } = useTranslation()
  const [paso, setPaso] = useState<'opciones' | 'nueva' | 'existente'>('opciones')
  const n = ejercicios.length

  if (paso === 'nueva') return <NuevaRutina ejercicios={ejercicios} onCerrar={onCerrar} onListo={onListo} onError={onError} />
  if (paso === 'existente') return <RutinaExistente ejercicios={ejercicios} onCerrar={onCerrar} onListo={onListo} onError={onError} />

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onCerrar}>
      <div className="w-full max-w-app rounded-t-[20px] bg-[#1E1E1E] p-6 pb-[calc(env(safe-area-inset-bottom)+20px)]" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-grey-600 mx-auto mb-5" />
        <h2 className="text-white text-rt-20 font-bold text-center">{t('projetos:comb.title')}</h2>
        <p className="text-[#BDBDBD] text-rt-14 text-center mt-1">
          {t('projetos:comb.selected', { count: n })}
        </p>
        <div className="flex flex-col gap-4 mt-8">
          <Opcion icono={PlusCircle} titulo={t('projetos:comb.newRoutine')} sub={t('projetos:comb.newRoutineSub')} onClick={() => setPaso('nueva')} />
          <Opcion icono={ListPlus} titulo={t('projetos:comb.existing')} sub={t('projetos:comb.existingSub')} onClick={() => setPaso('existente')} />
        </div>
        <button onClick={onCerrar} className="w-full mt-6 text-[#9E9E9E] text-rt-14">{t('projetos:c.cancel')}</button>
      </div>
    </div>
  )
}

function Opcion({ icono: Icono, titulo, sub, onClick }: {
  icono: React.ComponentType<{ size?: number; className?: string }>
  titulo: string
  sub: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="w-full rounded-[16px] bg-[#252525] border border-brand/30 p-5 flex items-center gap-4 text-left">
      <span className="w-[50px] h-[50px] rounded-[12px] bg-brand/15 flex items-center justify-center shrink-0">
        <Icono size={26} className="text-brand" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-white text-rt-15 font-semibold">{titulo}</span>
        <span className="block text-[#9E9E9E] text-rt-12 mt-0.5">{sub}</span>
      </span>
      <ChevronRight size={20} className="text-[#757575]" />
    </button>
  )
}

function NuevaRutina({ ejercicios, onCerrar, onListo, onError }: {
  ejercicios: Ej[]
  onCerrar: () => void
  onListo: (m: string) => void
  onError: (m: string) => void
}) {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation()
  const [nombre, setNombre] = useState('')
  const [dificultad, setDificultad] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [marcados, setMarcados] = useState<string[]>(ejercicios.map((e) => e.id))
  const [abriendo, setAbriendo] = useState<'dificuldade' | 'objetivo' | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function crear() {
    if (!profile?.id || !nombre.trim() || marcados.length === 0) return
    setGuardando(true)
    try {
      const { data, error } = await supabase.from('routines')
        .insert({ owner_id: profile.id, name: nombre.trim(), difficulty: dificultad || null, objective: objetivo || null })
        .select('id').single()
      if (error) throw error
      const n = await agregarARutina(data.id, ejercicios.filter((e) => marcados.includes(e.id)), new Set(), 0, i18n.language)
      onListo(t('projetos:comb.created', { name: nombre.trim(), n }))
    } catch (e) {
      setGuardando(false)
      onError(t('projetos:comb.createError', { msg: detalleError((e as Error)) }))
    }
  }

  return (
    <FullScreenSheet title={t('projetos:comb.combineTitle')} onClose={onCerrar}>
      <div className="flex flex-col gap-6">
        <div>
          <label className="block text-white text-rt-15 font-bold mb-2">{t('projetos:c.routineName')}</label>
          <input
            className="w-full h-[60px] px-4 rounded-[14px] bg-surface-input border border-surface-line text-white text-rt-15 placeholder:text-grey-600 outline-none focus:border-brand"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={t('general:ui.workoutName')}
          />
        </div>
        <CajaSelector label={t('projetos:c.difficulty')} valor={dificultad} placeholder={t('projetos:c.beginnerPh')} lista={dificultades} lang={i18n.language} onAbrir={() => setAbriendo('dificuldade')} />
        <CajaSelector label={t('projetos:c.objective')} valor={objetivo} placeholder={t('projetos:c.hypertrophyPh')} lista={objetivosTreino} lang={i18n.language} onAbrir={() => setAbriendo('objetivo')} />
        <ul className="flex flex-col gap-2">
          {ejercicios.map((e) => {
            const on = marcados.includes(e.id)
            return (
              <li key={e.id}>
                <button
                  onClick={() => setMarcados((p) => (on ? p.filter((x) => x !== e.id) : [...p, e.id]))}
                  className={'w-full flex items-center gap-3 p-3 rounded-[12px] border ' + (on ? 'border-brand bg-brand/10' : 'border-grey-700')}
                >
                  <span className={'w-5 h-5 rounded-[4px] border-2 flex items-center justify-center ' + (on ? 'bg-brand border-brand' : 'border-grey-500')}>
                    {on && <Check size={13} className="text-white" />}
                  </span>
                  <span className="text-white text-rt-13 text-left flex-1">{nombreEjercicio(e, i18n.language)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="mt-8">
        <button className="btn-save" disabled={guardando || !nombre.trim() || marcados.length === 0} onClick={() => void crear()}>
          {guardando ? t('projetos:comb.creating') : t('projetos:comb.createWith', { n: marcados.length })}
        </button>
      </div>
      {abriendo === 'dificuldade' && (
        <HojaRadio lista={dificultades} valor={dificultad} lang={i18n.language} onElegir={(id) => { setDificultad(id); setAbriendo(null) }} onCerrar={() => setAbriendo(null)} />
      )}
      {abriendo === 'objetivo' && (
        <HojaRadio lista={objetivosTreino} valor={objetivo} lang={i18n.language} onElegir={(id) => { setObjetivo(id); setAbriendo(null) }} onCerrar={() => setAbriendo(null)} />
      )}
    </FullScreenSheet>
  )
}

function RutinaExistente({ ejercicios, onCerrar, onListo, onError }: {
  ejercicios: Ej[]
  onCerrar: () => void
  onListo: (m: string) => void
  onError: (m: string) => void
}) {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation()
  const [rutinas, setRutinas] = useState<Rutina[] | null>(null)
  const [busca, setBusca] = useState('')
  const [elegida, setElegida] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase.from('routines')
        .select('id,name,objective,is_favorite,routine_exercises(exercise_id)')
        .eq('owner_id', profile.id).is('student_id', null).order('name')
      setRutinas((data as Rutina[]) ?? [])
    })()
  }, [profile?.id])

  const lista = (rutinas ?? []).filter((r) => r.name.toLowerCase().includes(busca.trim().toLowerCase()))

  async function agregar() {
    const r = rutinas?.find((x) => x.id === elegida)
    if (!r) return
    setEnviando(true)
    try {
      const ya = new Set(r.routine_exercises.map((x) => x.exercise_id).filter(Boolean) as string[])
      const n = await agregarARutina(r.id, ejercicios, ya, r.routine_exercises.length, i18n.language)
      const repetidos = ejercicios.length - n
      onListo(
        n === 0
          ? t('projetos:comb.allExist', { name: r.name })
          : t('projetos:comb.added', { n, name: r.name }) + (repetidos > 0 ? t('projetos:comb.existed', { n: repetidos }) : ''),
      )
    } catch (e) {
      setEnviando(false)
      onError(t('projetos:comb.addError', { msg: detalleError((e as Error)) }))
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onCerrar}>
      <div className="w-full max-w-app h-[85dvh] rounded-t-[20px] bg-[#1E1E1E] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 pb-3">
          <div className="w-10 h-1 rounded-full bg-grey-600 mx-auto mb-4" />
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h2 className="text-white text-rt-20 font-bold">{t('projetos:comb.selectRoutine')}</h2>
              <p className="text-[#BDBDBD] text-rt-13">{t('projetos:comb.addNEx', { n: ejercicios.length })}</p>
            </div>
            <button onClick={onCerrar} aria-label={t('projetos:c.close')} className="w-9 h-9 rounded-full bg-[#333333] flex items-center justify-center">
              <X size={18} className="text-white" />
            </button>
          </div>
          <div className="relative mt-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={t('projetos:comb.searchRoutine')}
              className="w-full h-[46px] pl-10 pr-3 rounded-[12px] bg-[#252525] border border-[#333333] text-white text-rt-14 outline-none focus:border-brand"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5">
          {rutinas === null ? (
            <div className="py-10 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></div>
          ) : rutinas.length === 0 ? (
            <p className="text-center py-10 text-white/60 text-rt-13">{t('projetos:comb.noRoutines')}<br />{t('projetos:comb.createFirst')}</p>
          ) : lista.length === 0 ? (
            <p className="text-center py-10 text-white/60 text-rt-13">{t('projetos:comb.notFound')}<br />{t('projetos:c.tryOther')}</p>
          ) : (
            <ul className="flex flex-col gap-3 pb-4">
              {lista.map((r) => {
                const on = elegida === r.id
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => setElegida(on ? null : r.id)}
                      className={'w-full rounded-[14px] p-4 flex items-center gap-3 text-left border ' + (on ? 'bg-brand/15 border-2 border-brand' : 'bg-[#252525] border-[#333333]')}
                    >
                      <span className={'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ' + (on ? 'bg-brand border-brand' : 'border-grey-500')}>
                        {on && <Check size={14} className="text-white" />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-white text-rt-15 font-semibold truncate">{r.name}</span>
                        <span className="flex items-center gap-3 text-[#9E9E9E] text-rt-11 mt-0.5">
                          <span className="flex items-center gap-1"><Dumbbell size={13} /> {t('projetos:comb.nExercises', { n: r.routine_exercises.length })}</span>
                          {r.objective && <span>{etiquetaDe(objetivosTreino, r.objective, i18n.language)}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
          <button
            disabled={!elegida || enviando}
            onClick={() => void agregar()}
            className={'w-full h-[54px] rounded-[27px] text-white text-rt-15 font-bold ' + (elegida ? 'bg-gradient-to-b from-[#7CB342] to-[#94E143]' : 'bg-[#616161]')}
          >
            {enviando ? '…' : elegida ? t('projetos:comb.addToRoutine') : t('projetos:comb.pickRoutine')}
          </button>
        </div>
      </div>
    </div>
  )
}

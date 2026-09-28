import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dumbbell, MoreVertical, Pencil, Trash2, Calculator, Timer, Footprints, Volume2, Heart, CalendarDays, Activity, PersonStanding, Minus, ChevronsDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { detalleError } from '@/lib/errores'
import { localeDe, hoyLocal } from '@/lib/fechas'
import { edadDesde, leerNumero } from '@/lib/assessment'
import { nombreEjercicio } from '@/lib/nombreEjercicio'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { HojaRadio } from '@/components/professor/SelectorRadio'
import {
  rm1, PORCENTAJES_RM, vo2max, claseVO2, claseMuscular, formatoPlancha, PROTOCOLOS,
  type Protocolo, type PruebaMuscular, type Sexo,
} from '@/lib/evaluacionCalculos'
import type { Ficha } from './Evaluacion'
import { AreaTexto, CajaInfo, Campo, CampoFecha, InsigniaClase, ModalEdicion, Numero, Selector, Texto, Vacio } from './ui'

export type PruebaRM = { id: string; exercise_id: string | null; exercise_name: string; load_kg: number; reps: number; tested_on: string }
export type PruebaAerobica = {
  id: string; protocol: Protocolo; distance_m: number | null; time_min: number | null; final_hr: number | null
  weight_kg: number | null; level: number | null; shuttles: number | null; tested_on: string; notes: string | null
}
export type PruebaMusc = { id: string; situps: number | null; plank_s: number | null; pushups: number | null; squats: number | null; tested_on: string; notes: string | null }
export type Autor = { nombre: string | null; rol: 'teacher' | 'student' }
type Base = { studentId: string; teacherId: string; fichaId: string; autor: Autor }

const hoy = hoyLocal
const dos = (n: number) => n.toFixed(2)

/** El selo de la ficha muestra quién hizo el último cambio en cualquier sección. */
async function marcarAutor(fichaId: string, autor: Autor) {
  await supabase.from('assessments').update({ updated_by_name: autor.nombre, updated_by_role: autor.rol }).eq('id', fichaId)
}

function Fecha({ fecha }: { fecha: string }) {
  const { t, i18n } = useTranslation()
  return (
    <div className="flex items-center justify-center gap-1.5 text-white/40 text-rt-12">
      <CalendarDays size={14} /> {t('evaluacion:doneOn', { date: new Date(fecha + 'T00:00:00').toLocaleDateString(localeDe(i18n.language)) })}
    </div>
  )
}

function TablaRM({ uno }: { uno: number }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-[8px] bg-[#1E1E1E] overflow-hidden">
      <div className="flex justify-between px-3 py-2 bg-[#8BC34A]/10 text-white/70 text-rt-11 font-semibold">
        <span>{t('evaluacion:percent')}</span><span>{t('evaluacion:loadKg')}</span>
      </div>
      {PORCENTAJES_RM.map((p) => (
        <div key={p} className="flex justify-between px-3 py-1.5 border-t border-[#2D2D2D]/50 text-rt-13">
          <span className={p === 100 ? 'text-[#8BC34A] font-semibold' : 'text-white/80'}>{p === 100 ? 'Rep.Max' : `Rep.${p}`}</span>
          <span className={p === 100 ? 'text-[#8BC34A] font-bold' : 'text-white'}>{dos(uno * p / 100)}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------- 1RM ----------------

export function SeccionRM({ pruebas, puedeEditar, onNueva, onEditar, onBorrar }: {
  pruebas: PruebaRM[]; puedeEditar: boolean; onNueva: () => void; onEditar: (p: PruebaRM) => void; onBorrar: (p: PruebaRM) => void
}) {
  const { t, i18n } = useTranslation()
  const [menu, setMenu] = useState<string | null>(null)
  if (pruebas.length === 0) {
    return <Vacio icono={Dumbbell} texto={t('evaluacion:rmEmpty')} accion={puedeEditar ? t('evaluacion:rmAddTest') : undefined} onAccion={onNueva} />
  }
  return (
    <div className="flex flex-col gap-4">
      {pruebas.map((p) => {
        const uno = rm1(Number(p.load_kg), p.reps) ?? 0
        return (
          <div key={p.id} className="rounded-[12px] bg-[#252525] border border-[#2D2D2D] p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-white text-rt-14 font-semibold">{p.exercise_name}</div>
                <div className="text-white/60 text-rt-12">{t('evaluacion:rmLine', { kg: Number(p.load_kg).toLocaleString(i18n.language), reps: p.reps })}</div>
              </div>
              {puedeEditar && (
                <div className="relative">
                  <button onClick={() => setMenu(menu === p.id ? null : p.id)} aria-label={t('evaluacion:options')} className="p-1 text-white/50"><MoreVertical size={20} /></button>
                  {menu === p.id && (
                    <div className="absolute right-0 top-8 z-10 min-w-[140px] rounded-[10px] bg-[#2D2D2D] shadow-lg py-1">
                      <button onClick={() => { setMenu(null); onEditar(p) }} className="w-full flex items-center gap-2 px-3 py-2 text-white text-rt-13"><Pencil size={16} className="text-white/70" />{t('evaluacion:edit')}</button>
                      <button onClick={() => { setMenu(null); onBorrar(p) }} className="w-full flex items-center gap-2 px-3 py-2 text-[#EF5350] text-rt-13"><Trash2 size={16} />{t('evaluacion:delete')}</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <TablaRM uno={uno} />
          </div>
        )
      })}
      {puedeEditar && (
        <button onClick={onNueva} className="h-11 rounded-[12px] border border-[#8BC34A]/30 text-[#8BC34A] text-rt-13 font-medium">+ {t('evaluacion:rmAddExercise')}</button>
      )}
    </div>
  )
}

export function ModalRM({ prueba, base, onCerrar, onGuardado }: { prueba: PruebaRM | null; base: Base; onCerrar: () => void; onGuardado: () => void }) {
  const { t, i18n } = useTranslation()
  const [nombre, setNombre] = useState(prueba?.exercise_name ?? '')
  const [carga, setCarga] = useState(prueba ? String(Number(prueba.load_kg)) : '')
  const [reps, setReps] = useState(prueba ? String(prueba.reps) : '')
  const [catalogo, setCatalogo] = useState<{ id: string; nombre: string }[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const lista = useRef(`rm-ejercicios-${Math.random().toString(36).slice(2)}`).current

  useEffect(() => {
    void supabase.from('exercises').select('id,name,name_pt,name_es,name_en').then(({ data }) => {
      setCatalogo(((data as any[]) ?? []).map((e) => ({ id: e.id, nombre: nombreEjercicio(e, i18n.language) })).sort((a, b) => a.nombre.localeCompare(b.nombre)))
    })
  }, [])

  const c = leerNumero(carga), r = leerNumero(reps)
  const uno = c && r && !Number.isNaN(c) && !Number.isNaN(r) && Number.isInteger(r) ? rm1(c, r) : null

  async function guardar() {
    setError('')
    if (!nombre.trim()) { setError(t('evaluacion:rmNeedName')); return }
    if (!uno || !c || !r) { setError(t('evaluacion:rmNeedLoad')); return }
    setGuardando(true)
    const exercise_id = catalogo.find((e) => e.nombre.toLowerCase() === nombre.trim().toLowerCase())?.id ?? null
    const fila = { exercise_name: nombre.trim(), exercise_id, load_kg: c, reps: r }
    const { error: err } = prueba
      ? await supabase.from('assessment_rm_tests').update(fila).eq('id', prueba.id)
      : await supabase.from('assessment_rm_tests').insert({ ...fila, tested_on: hoy(), student_id: base.studentId, teacher_id: base.teacherId })
    if (err) { setGuardando(false); setError(t('evaluacion:saveError', { msg: detalleError(err) })); return }
    await marcarAutor(base.fichaId, base.autor)
    setGuardando(false)
    onGuardado()
  }

  return (
    <ModalEdicion titulo={prueba ? t('evaluacion:rmEditTitle') : t('evaluacion:sec.rm')} subtitulo="Epley" guardando={guardando} error={error} onGuardar={() => void guardar()} onCerrar={onCerrar}>
      <Campo etiqueta={t('evaluacion:rmExercise')}>
        <Texto valor={nombre} onChange={setNombre} placeholder={t('evaluacion:rmExercisePh')} lista={lista} />
        <datalist id={lista}>{catalogo.map((e) => <option key={e.id} value={e.nombre} />)}</datalist>
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta={t('evaluacion:rmLoad')}><Numero valor={carga} onChange={setCarga} sufijo="kg" placeholder="44" /></Campo>
        <Campo etiqueta={t('evaluacion:rmReps')}><Numero valor={reps} onChange={setReps} placeholder="10" entero /></Campo>
      </div>
      {uno && (
        <div className="rounded-[12px] bg-[#252525] p-3 flex flex-col gap-3 mt-2">
          <div className="flex items-center gap-2 text-white text-rt-14 font-semibold"><Calculator size={18} className="text-[#8BC34A]" />{t('evaluacion:rmTable')}</div>
          <TablaRM uno={uno} />
        </div>
      )}
    </ModalEdicion>
  )
}

export function BorrarRM({ prueba, fichaId, autor, onCerrar, onBorrado }: { prueba: PruebaRM; fichaId: string; autor: Autor; onCerrar: () => void; onBorrado: () => void }) {
  const { t } = useTranslation()
  return (
    <ConfirmDialog
      message={t('evaluacion:rmDeleteTitle')}
      detail={t('evaluacion:rmDeleteBody', { name: prueba.exercise_name })}
      confirmLabel={t('evaluacion:delete')}
      tone="danger"
      onCancel={onCerrar}
      onConfirm={async () => {
        const { error } = await supabase.from('assessment_rm_tests').delete().eq('id', prueba.id)
        if (!error) await marcarAutor(fichaId, autor)
        onBorrado()
      }}
    />
  )
}

// ---------------- Resistencia aeróbica ----------------

const ICONO_PROTOCOLO: Record<Protocolo, typeof Timer> = { cooper12: Timer, cooper6: Timer, rockport: Footprints, beep: Volume2 }

export function SeccionAerobica({ prueba, ficha, puedeEditar, onEditar }: { prueba: PruebaAerobica | null; ficha: Ficha; puedeEditar: boolean; onEditar: () => void }) {
  const { t, i18n } = useTranslation()
  if (!prueba) {
    return <Vacio icono={Activity} texto={t('evaluacion:aeroEmpty')} accion={puedeEditar ? t('evaluacion:aeroRegister') : undefined} onAccion={onEditar} />
  }
  const edad = edadDesde(ficha.birth_date)
  const vo2 = vo2max(prueba.protocol, prueba, ficha.sex as Sexo | null, edad)
  const clase = claseVO2(vo2, ficha.sex as Sexo | null, edad)
  const Icono = ICONO_PROTOCOLO[prueba.protocol]
  const [valor, unidad] = prueba.protocol === 'rockport'
    ? [Number(prueba.time_min).toLocaleString(i18n.language), t('evaluacion:unitMin')]
    : prueba.protocol === 'beep'
      ? [`${prueba.level}.${prueba.shuttles ?? 0}`, t('evaluacion:unitLevel')]
      : [String(Number(prueba.distance_m)), t('evaluacion:unitMeters')]
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[12px] bg-[#252525] p-4 flex flex-col items-center gap-2">
        <div className="self-start flex items-center gap-2">
          <span className="w-8 h-8 rounded-[8px] bg-[#8BC34A]/15 flex items-center justify-center"><Icono size={18} className="text-[#8BC34A]" /></span>
          <span className="text-white text-rt-14">{t(`evaluacion:proto.${prueba.protocol}`)}</span>
        </div>
        <div className="text-[#8BC34A] text-[48px] leading-none font-bold mt-2">{valor} <span className="text-white/55 text-rt-16 font-normal">{unidad}</span></div>
        {prueba.protocol === 'rockport' && prueba.final_hr && <div className="text-white/60 text-rt-12">{t('evaluacion:finalHr', { n: prueba.final_hr })}</div>}
        {clase && <InsigniaClase clase={clase} />}
      </div>
      <div className="rounded-[12px] bg-[#252525] p-4 flex items-center justify-between">
        <div>
          <div className="text-white/60 text-rt-12">{t('evaluacion:vo2Est')}</div>
          <div className="text-white text-rt-24 font-bold">{vo2 != null ? vo2.toFixed(1) : '-'} <span className="text-white/55 text-rt-12 font-normal">ml/kg/min</span></div>
        </div>
        <span className="w-12 h-12 rounded-[12px] bg-[#8BC34A]/15 flex items-center justify-center"><Heart size={28} className="text-[#8BC34A]" /></span>
      </div>
      {(!ficha.birth_date || !ficha.sex) && <p className="text-white/40 text-rt-11 text-center">{t('evaluacion:needBirthForClass')}</p>}
      <Fecha fecha={prueba.tested_on} />
      <div className="text-center text-white/30 text-rt-10">{t('evaluacion:protocolLine', { name: t(`evaluacion:protoLong.${prueba.protocol}`) })}</div>
    </div>
  )
}

export function ModalAerobico({ prueba, ficha, base, onCerrar, onGuardado }: { prueba: PruebaAerobica | null; ficha: Ficha; base: Base; onCerrar: () => void; onGuardado: () => void }) {
  const { t, i18n } = useTranslation()
  const txt = (v: number | null | undefined) => (v == null ? '' : String(Number(v)))
  const [protocolo, setProtocolo] = useState<Protocolo>(prueba?.protocol ?? 'cooper12')
  const [distancia, setDistancia] = useState(txt(prueba?.distance_m))
  const [tiempo, setTiempo] = useState(txt(prueba?.time_min))
  const [fc, setFc] = useState(txt(prueba?.final_hr))
  const [peso, setPeso] = useState(txt(prueba?.weight_kg ?? ficha.weight_kg))
  const [nivel, setNivel] = useState(txt(prueba?.level))
  const [shuttles, setShuttles] = useState(txt(prueba?.shuttles))
  const [fecha, setFecha] = useState(hoy())
  const [notas, setNotas] = useState(prueba?.notes ?? '')
  const [eligiendo, setEligiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const n = (s: string) => { const v = leerNumero(s); return v == null || Number.isNaN(v) ? null : v }
  const datos = { distance_m: n(distancia), time_min: n(tiempo), final_hr: n(fc), weight_kg: n(peso), level: n(nivel), shuttles: n(shuttles) }
  const edad = edadDesde(ficha.birth_date)
  const vo2 = vo2max(protocolo, datos, ficha.sex as Sexo | null, edad)
  const clase = claseVO2(vo2, ficha.sex as Sexo | null, edad)
  const completo = protocolo === 'rockport' ? !!(datos.time_min && datos.final_hr && datos.weight_kg)
    : protocolo === 'beep' ? !!datos.level && Number.isInteger(datos.level) : !!datos.distance_m

  async function guardar() {
    setError('')
    if (!completo) { setError(t('evaluacion:fillRequired')); return }
    setGuardando(true)
    const fila = {
      protocol: protocolo, tested_on: fecha || hoy(), notes: notas.trim() || null,
      distance_m: protocolo.startsWith('cooper') ? datos.distance_m : null,
      time_min: protocolo === 'rockport' ? datos.time_min : null,
      final_hr: protocolo === 'rockport' && datos.final_hr ? Math.round(datos.final_hr) : null,
      weight_kg: protocolo === 'rockport' ? datos.weight_kg : null,
      level: protocolo === 'beep' ? datos.level : null,
      shuttles: protocolo === 'beep' && datos.shuttles != null ? Math.round(datos.shuttles) : null,
    }
    // Cada registro queda en el historial; la sección muestra el más reciente.
    const { error: err } = await supabase.from('assessment_aerobic_tests').insert({ ...fila, student_id: base.studentId, teacher_id: base.teacherId })
    if (err) { setGuardando(false); setError(t('evaluacion:saveError', { msg: detalleError(err) })); return }
    await marcarAutor(base.fichaId, base.autor)
    setGuardando(false)
    onGuardado()
  }

  const lang = i18n.language
  return (
    <ModalEdicion
      titulo={t('evaluacion:sec.aerobica')} subtitulo={t(`evaluacion:proto.${protocolo}`)}
      guardando={guardando} error={error} onGuardar={() => void guardar()} onCerrar={onCerrar}
      extra={eligiendo && (
        <HojaRadio lista={PROTOCOLOS.map((p) => { const x = t(`evaluacion:protoLong.${p}`); return { id: p, pt: x, es: x, en: x } })} valor={protocolo} lang={lang}
          onElegir={(id) => { setProtocolo(id as Protocolo); setEligiendo(false) }} onCerrar={() => setEligiendo(false)} />
      )}
    >
      <Campo etiqueta={t('evaluacion:protocol')}><Selector valor={t(`evaluacion:protoLong.${protocolo}`)} onClick={() => setEligiendo(true)} /></Campo>
      <CajaInfo>{t(`evaluacion:protoInfo.${protocolo}`)}</CajaInfo>
      {protocolo === 'cooper12' && <Campo etiqueta={t('evaluacion:dist12')}><Numero valor={distancia} onChange={setDistancia} sufijo={t('evaluacion:unitMeters')} placeholder="2400" /></Campo>}
      {protocolo === 'cooper6' && <Campo etiqueta={t('evaluacion:dist6')}><Numero valor={distancia} onChange={setDistancia} sufijo={t('evaluacion:unitMeters')} placeholder="1200" /></Campo>}
      {protocolo === 'rockport' && (
        <>
          <Campo etiqueta={t('evaluacion:mileTime')}><Numero valor={tiempo} onChange={setTiempo} sufijo={t('evaluacion:unitMin')} placeholder="15,0" /></Campo>
          <Campo etiqueta={t('evaluacion:finalHrField')}><Numero valor={fc} onChange={setFc} sufijo="bpm" placeholder="140" entero /></Campo>
          <Campo etiqueta={t('evaluacion:bodyWeight')}><Numero valor={peso} onChange={setPeso} sufijo="kg" placeholder="75,0" /></Campo>
        </>
      )}
      {protocolo === 'beep' && (
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta={t('evaluacion:levelReached')}><Numero valor={nivel} onChange={setNivel} placeholder="8" entero /></Campo>
          <Campo etiqueta={t('evaluacion:shuttlesField')}><Numero valor={shuttles} onChange={setShuttles} placeholder="5" entero /></Campo>
        </div>
      )}
      <Campo etiqueta={t('evaluacion:testDate')}><CampoFecha valor={fecha} onChange={setFecha} min="2020-01-01" /></Campo>
      <Campo etiqueta={t('evaluacion:notes')}><AreaTexto valor={notas} onChange={setNotas} placeholder={t('evaluacion:notesPh')} /></Campo>
      {vo2 != null && (
        <div className="rounded-[12px] bg-[#252525] p-4 flex flex-col gap-2">
          <div className="text-white text-rt-14 font-semibold">{t('evaluacion:results')}</div>
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-rt-13">{t('evaluacion:vo2Est')}</span>
            <span className="text-[#8BC34A] text-rt-18 font-bold">{vo2.toFixed(1)} <span className="text-white/55 text-rt-12 font-normal">ml/kg/min</span></span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-rt-13">{t('evaluacion:classification')}</span>
            {clase ? <InsigniaClase clase={clase} /> : <span className="text-white/40 text-rt-12">{t('evaluacion:needBirthForClass')}</span>}
          </div>
        </div>
      )}
    </ModalEdicion>
  )
}

// ---------------- Resistencia muscular ----------------

const ICONO_MUSC: Record<PruebaMuscular, typeof Timer> = { situps: ChevronsDown, plank_s: Minus, pushups: Dumbbell, squats: PersonStanding }

export function SeccionMuscular({ prueba, ficha, puedeEditar, onEditar }: { prueba: PruebaMusc | null; ficha: Ficha; puedeEditar: boolean; onEditar: () => void }) {
  const { t } = useTranslation()
  if (!prueba) {
    return <Vacio icono={PersonStanding} texto={t('evaluacion:muscEmpty')} accion={puedeEditar ? t('evaluacion:muscRegister') : undefined} onAccion={onEditar} />
  }
  const edad = edadDesde(ficha.birth_date)
  const pruebas: PruebaMuscular[] = ['situps', 'plank_s', 'pushups', ...(prueba.squats != null ? ['squats' as const] : [])]
  return (
    <div className="flex flex-col gap-3">
      {pruebas.map((k) => {
        const v = prueba[k]
        const clase = claseMuscular(k, v, ficha.sex as Sexo | null, edad)
        return (
          <div key={k} className="rounded-[12px] bg-[#252525] p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-white/60 text-rt-12">{t(`evaluacion:musc.${k}`)}</div>
              <div className="text-[#8BC34A] text-[32px] leading-tight font-bold">
                {v == null ? '-' : k === 'plank_s' ? formatoPlancha(v, t('evaluacion:unitSec')) : v}
                {v != null && k !== 'plank_s' && <span className="text-white/50 text-rt-14 font-normal"> reps</span>}
              </div>
            </div>
            {clase && <InsigniaClase clase={clase} />}
          </div>
        )
      })}
      <Fecha fecha={prueba.tested_on} />
    </div>
  )
}

export function ModalMuscular({ prueba, base, onCerrar, onGuardado }: { prueba: PruebaMusc | null; base: Base; onCerrar: () => void; onGuardado: () => void }) {
  const { t } = useTranslation()
  const txt = (v: number | null | undefined) => (v == null ? '' : String(v))
  const [valores, setValores] = useState<Record<PruebaMuscular, string>>({
    situps: txt(prueba?.situps), plank_s: txt(prueba?.plank_s), pushups: txt(prueba?.pushups), squats: txt(prueba?.squats),
  })
  const [fecha, setFecha] = useState(hoy())
  const [notas, setNotas] = useState(prueba?.notes ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const ph: Record<PruebaMuscular, string> = { situps: '35', plank_s: '60', pushups: '25', squats: '40' }

  async function guardar() {
    setError('')
    const num = (s: string) => (s.trim() ? Number(s) : null)
    const fila = { situps: num(valores.situps), plank_s: num(valores.plank_s), pushups: num(valores.pushups), squats: num(valores.squats) }
    if (Object.values(fila).every((v) => v == null)) { setError(t('evaluacion:muscNeedOne')); return }
    setGuardando(true)
    const { error: err } = await supabase.from('assessment_muscular_tests').insert({
      ...fila, tested_on: fecha || hoy(), notes: notas.trim() || null, student_id: base.studentId, teacher_id: base.teacherId,
    })
    if (err) { setGuardando(false); setError(t('evaluacion:saveError', { msg: detalleError(err) })); return }
    await marcarAutor(base.fichaId, base.autor)
    setGuardando(false)
    onGuardado()
  }

  return (
    <ModalEdicion titulo={t('evaluacion:sec.muscular')} guardando={guardando} error={error} onGuardar={() => void guardar()} onCerrar={onCerrar}>
      <CajaInfo>{t('evaluacion:muscInfo')}</CajaInfo>
      {(['situps', 'plank_s', 'pushups', 'squats'] as PruebaMuscular[]).map((k) => {
        const Icono = ICONO_MUSC[k]
        return (
          <label key={k} className="rounded-[12px] bg-[#252525] p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-[10px] bg-[#8BC34A]/15 flex items-center justify-center shrink-0"><Icono size={20} className="text-[#8BC34A]" /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-white/70 text-rt-12">{t(`evaluacion:muscField.${k}`)}</span>
              <span className="flex items-baseline gap-1">
                <input inputMode="numeric" value={valores[k]} placeholder={ph[k]}
                  onChange={(e) => setValores({ ...valores, [k]: e.target.value.replace(/[^\d]/g, '') })}
                  className="w-24 bg-transparent text-white text-rt-18 font-bold outline-none placeholder:text-grey-600" />
                <span className="text-white/50 text-rt-12">{k === 'plank_s' ? t('evaluacion:unitSeconds') : 'reps'}</span>
              </span>
            </span>
          </label>
        )
      })}
      <Campo etiqueta={t('evaluacion:testDate')}><CampoFecha valor={fecha} onChange={setFecha} min="2020-01-01" /></Campo>
      <Campo etiqueta={t('evaluacion:notes')}><AreaTexto valor={notas} onChange={setNotas} placeholder={t('evaluacion:notesMuscPh')} /></Campo>
    </ModalEdicion>
  )
}

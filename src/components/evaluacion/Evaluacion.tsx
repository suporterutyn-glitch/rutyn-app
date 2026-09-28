import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  User, Dumbbell, Activity, PersonStanding, Ruler, Camera, PieChart, TrendingUp, ClipboardList,
  ChevronLeft, ChevronsUpDown, ChevronsDownUp, Pencil, Lock, LockOpen, Eye, EyeOff, UserPlus, GraduationCap,
  Hand, AlertCircle, Users,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { localeDe, hoyLocal } from '@/lib/fechas'
import { detalleError } from '@/lib/errores'
import { bmi, bmiClass, maxHR, edadDesde } from '@/lib/assessment'
import { ModalFicha } from './ModalFicha'
import { SeccionFotos, firmarUrls, type FotoEval } from './Fotos'
import { SeccionCarga } from './Carga'
import { SeccionPerimetria, ModalPerimetria, SeccionGrasa, ModalGrasa, type RegistroPerimetria, type RegistroGrasa } from './Composicion'
import { SeccionRM, ModalRM, BorrarRM, SeccionAerobica, ModalAerobico, SeccionMuscular, ModalMuscular, type PruebaRM, type PruebaAerobica, type PruebaMusc } from './Pruebas'

export const SECCIONES = ['perfil', 'rm', 'aerobica', 'muscular', 'perimetria', 'fotos', 'gordura', 'carga', 'anamnese'] as const
export type Seccion = typeof SECCIONES[number]
const IMPLEMENTADAS: Seccion[] = [...SECCIONES]
const SOLO_LECTURA: Seccion[] = ['carga']
const SIN_EDITAR: Seccion[] = ['fotos', 'carga']

const ICONO: Record<Seccion, typeof User> = {
  perfil: User, rm: Dumbbell, aerobica: Activity, muscular: PersonStanding, perimetria: Ruler,
  fotos: Camera, gordura: PieChart, carga: TrendingUp, anamnese: ClipboardList,
}

export type Ficha = {
  id: string
  student_id: string
  teacher_id: string
  birth_date: string | null
  sex: 'M' | 'F' | null
  weight_kg: number | null
  height_cm: number | null
  goals: string | null
  injuries: string | null
  pathologies: string | null
  medications: string | null
  meals_per_day: number | null
  workouts_per_week: number | null
  work_type: string | null
  activity_level: string | null
  smoker: boolean
  student_visible_sections: string[]
  student_editable_sections: string[]
  updated_at: string | null
  updated_by_name: string | null
  updated_by_role: 'teacher' | 'student' | null
}

type Anamnesis = { id: string; created_at: string; submitted_at: string | null; anamnesis_templates: { name: string; name_es: string | null; name_en: string | null } | null }

/** Ficha de evaluación física del alumno. La misma pantalla para profesor (edita todo y define permisos) y alumno (ve lo visible, edita lo liberado). */
export function Evaluacion({ studentId, teacherId, modo }: { studentId: string; teacherId: string; modo: 'profesor' | 'alumno' }) {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'sin' | 'error'>('cargando')
  const [error, setError] = useState('')
  const [abiertas, setAbiertas] = useState<Seccion[]>([])
  const [editando, setEditando] = useState<Seccion | null>(null)
  const [rms, setRms] = useState<PruebaRM[]>([])
  const [rmEditando, setRmEditando] = useState<PruebaRM | null>(null)
  const [rmBorrando, setRmBorrando] = useState<PruebaRM | null>(null)
  const [aerobica, setAerobica] = useState<PruebaAerobica | null>(null)
  const [muscular, setMuscular] = useState<PruebaMusc | null>(null)
  const [perimetria, setPerimetria] = useState<RegistroPerimetria[]>([])
  const [grasa, setGrasa] = useState<RegistroGrasa | null>(null)
  const [fotos, setFotos] = useState<FotoEval[]>([])
  const [anamnesis, setAnamnesis] = useState<Anamnesis[]>([])
  const esProfe = modo === 'profesor'

  async function cargar() {
    setEstado((e) => (e === 'listo' ? e : 'cargando'))
    let { data, error: err } = await supabase.from('assessments').select('*')
      .eq('student_id', studentId).eq('teacher_id', teacherId).maybeSingle()
    if (!err && !data && esProfe) {
      // El profesor abre la ficha por primera vez: se crea vacía (todo visible, nada editable).
      // "Crear si no existe": dos cargas simultáneas no chocan contra el índice único.
      const c = await supabase.from('assessments').upsert(
        { student_id: studentId, teacher_id: teacherId, taken_at: hoyLocal() },
        { onConflict: 'student_id,teacher_id', ignoreDuplicates: true },
      )
      const r = c.error ? c : await supabase.from('assessments').select('*').eq('student_id', studentId).eq('teacher_id', teacherId).maybeSingle()
      data = (r as { data: unknown }).data as typeof data; err = r.error
    }
    if (err) { setError(detalleError(err)); setEstado('error'); return }
    if (!data) { setEstado('sin'); return }
    setFicha(data as Ficha)
    setEstado('listo')
    const f = (tabla: string) => supabase.from(tabla).select('*').eq('student_id', studentId).eq('teacher_id', teacherId)
    const [an, rm, ae, mu, pe, gr, fo] = await Promise.all([
      supabase.from('anamnesis_answers').select('id,created_at,submitted_at,anamnesis_templates(name,name_es,name_en)')
        .eq('student_id', studentId).eq('teacher_id', teacherId).order('created_at', { ascending: false }),
      f('assessment_rm_tests').order('created_at'),
      f('assessment_aerobic_tests').order('tested_on', { ascending: false }).order('created_at', { ascending: false }).limit(1),
      f('assessment_muscular_tests').order('tested_on', { ascending: false }).order('created_at', { ascending: false }).limit(1),
      f('assessment_perimetry').order('measured_on').limit(200),
      f('assessment_bodyfat').order('tested_on', { ascending: false }).order('created_at', { ascending: false }).limit(1),
      f('assessment_photos'),
    ])
    setAnamnesis((an.data as unknown as Anamnesis[]) ?? [])
    setRms((rm.data as PruebaRM[]) ?? [])
    setAerobica(((ae.data as PruebaAerobica[]) ?? [])[0] ?? null)
    setMuscular(((mu.data as PruebaMusc[]) ?? [])[0] ?? null)
    setPerimetria((pe.data as RegistroPerimetria[]) ?? [])
    setGrasa(((gr.data as RegistroGrasa[]) ?? [])[0] ?? null)
    setFotos(await firmarUrls((fo.data as FotoEval[]) ?? []))
  }
  useEffect(() => { void cargar() }, [studentId, teacherId])

  if (estado === 'cargando') {
    return <div className="py-12 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></div>
  }
  if (estado === 'error') {
    return (
      <div className="py-12 flex flex-col items-center gap-4 text-center">
        <AlertCircle size={56} className="text-[#EF5350]" />
        <p className="text-white/70 text-rt-14">{t('evaluacion:loadError', { msg: error })}</p>
        <button onClick={() => void cargar()} className="px-6 h-11 rounded-[16px] bg-gradient-to-r from-[#7CB342] to-[#558B2F] text-white text-rt-14 font-semibold">{t('evaluacion:retry')}</button>
      </div>
    )
  }
  if (estado === 'sin' || !ficha) {
    return <p className="py-12 text-center text-white/70 text-rt-14">{t('evaluacion:noEvaluation')}</p>
  }

  const visibles = SECCIONES.filter((s) => IMPLEMENTADAS.includes(s) && (esProfe || ficha.student_visible_sections.includes(s)))
  const puedeEditar = (s: Seccion) => !SOLO_LECTURA.includes(s) && (esProfe || ficha.student_editable_sections.includes(s))
  const todasAbiertas = visibles.every((s) => abiertas.includes(s))

  async function cambiarPermiso(s: Seccion, campo: 'student_visible_sections' | 'student_editable_sections') {
    if (!ficha) return
    const lista = ficha[campo]
    const nueva = lista.includes(s) ? lista.filter((x) => x !== s) : [...lista, s]
    setFicha({ ...ficha, [campo]: nueva })
    const { error: err } = await supabase.from('assessments').update({ [campo]: nueva }).eq('id', ficha.id)
    if (err) { setFicha({ ...ficha }); setError(detalleError(err)) }
  }

  const base = { studentId, teacherId, fichaId: ficha.id, autor: { nombre: profile?.full_name ?? null, rol: (esProfe ? 'teacher' : 'student') as 'teacher' | 'student' } }
  const fecha = ficha.updated_by_role && ficha.updated_at ? new Date(ficha.updated_at).toLocaleDateString(localeDe(i18n.language)) : null
  const autor = ficha.updated_by_name || (ficha.updated_by_role === 'student' ? t('evaluacion:student') : t('evaluacion:teacher'))

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-[#7CB342]/15 border border-[#7CB342]/30">
          {ficha.updated_by_role === 'student' ? <User size={16} className="text-[#8BC34A] shrink-0" /> : <GraduationCap size={16} className="text-[#8BC34A] shrink-0" />}
          <span className="truncate text-[#8BC34A] text-rt-11 font-medium">{fecha ? t('evaluacion:by', { date: fecha, name: autor }) : t('evaluacion:noChanges')}</span>
        </div>
        <button
          onClick={() => setAbiertas(todasAbiertas ? [] : [...visibles])}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] bg-[#252525] border border-[#333333] text-[#8BC34A] text-rt-12 font-medium"
        >
          {todasAbiertas ? <ChevronsDownUp size={16} /> : <ChevronsUpDown size={16} />}
          {todasAbiertas ? t('evaluacion:collapse') : t('evaluacion:expand')}
        </button>
      </div>
      {esProfe && (
        <div className="flex items-center gap-1.5 mt-2 text-white/30 text-rt-11">
          <Hand size={14} /> {t('evaluacion:swipeHint')}
        </div>
      )}

      <div className="flex flex-col gap-4 mt-5">
        {visibles.map((s) => (
          <TarjetaSeccion
            key={s}
            seccion={s}
            esProfe={esProfe}
            abierta={abiertas.includes(s)}
            onAlternar={() => setAbiertas((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))}
            visibleAlumno={ficha.student_visible_sections.includes(s)}
            alumnoEdita={ficha.student_editable_sections.includes(s)}
            puedeEditar={puedeEditar(s)}
            subtitulo={s === 'rm' ? 'Epley' : s === 'aerobica' && aerobica ? t(`evaluacion:proto.${aerobica.protocol}`) : undefined}
            onEditar={['perfil', 'rm', 'aerobica', 'muscular', 'perimetria', 'gordura'].includes(s) ? () => { setRmEditando(null); setEditando(s) } : undefined}
            onPermisoEditar={() => void cambiarPermiso(s, 'student_editable_sections')}
            onPermisoVer={() => void cambiarPermiso(s, 'student_visible_sections')}
          >
            {s === 'perfil' && <SeccionPerfil ficha={ficha} puedeEditar={puedeEditar('perfil')} onEditar={() => setEditando('perfil')} />}
            {s === 'rm' && <SeccionRM pruebas={rms} puedeEditar={puedeEditar('rm')} onNueva={() => { setRmEditando(null); setEditando('rm') }} onEditar={(p) => { setRmEditando(p); setEditando('rm') }} onBorrar={setRmBorrando} />}
            {s === 'aerobica' && <SeccionAerobica prueba={aerobica} ficha={ficha} puedeEditar={puedeEditar('aerobica')} onEditar={() => setEditando('aerobica')} />}
            {s === 'muscular' && <SeccionMuscular prueba={muscular} ficha={ficha} puedeEditar={puedeEditar('muscular')} onEditar={() => setEditando('muscular')} />}
            {s === 'perimetria' && <SeccionPerimetria registros={perimetria} ficha={ficha} puedeEditar={puedeEditar('perimetria')} onEditar={() => setEditando('perimetria')} />}
            {s === 'gordura' && <SeccionGrasa registro={grasa} ficha={ficha} puedeEditar={puedeEditar('gordura')} onEditar={() => setEditando('gordura')} />}
            {s === 'fotos' && <SeccionFotos fotos={fotos} base={base} puedeEditar={puedeEditar('fotos')} onCambio={() => void cargar()} />}
            {s === 'carga' && <SeccionCarga studentId={studentId} />}
            {s === 'anamnese' && <SeccionAnamnesis lista={anamnesis} esProfe={esProfe} studentId={studentId} />}
          </TarjetaSeccion>
        ))}
      </div>

      {editando === 'rm' && (
        <ModalRM prueba={rmEditando} base={base} onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); void cargar() }} />
      )}
      {editando === 'aerobica' && (
        <ModalAerobico prueba={aerobica} ficha={ficha} base={base} onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); void cargar() }} />
      )}
      {editando === 'muscular' && (
        <ModalMuscular prueba={muscular} base={base} onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); void cargar() }} />
      )}
      {editando === 'perimetria' && (
        <ModalPerimetria ultimo={perimetria[perimetria.length - 1] ?? null} base={base} onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); void cargar() }} />
      )}
      {editando === 'gordura' && (
        <ModalGrasa registro={grasa} ficha={ficha} base={base} onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); void cargar() }} />
      )}
      {rmBorrando && (
        <BorrarRM prueba={rmBorrando} fichaId={ficha.id} autor={base.autor} onCerrar={() => setRmBorrando(null)} onBorrado={() => { setRmBorrando(null); void cargar() }} />
      )}
      {editando === 'perfil' && (
        <ModalFicha
          ficha={ficha}
          autor={{ nombre: profile?.full_name ?? null, rol: esProfe ? 'teacher' : 'student' }}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); void cargar() }}
        />
      )}
    </div>
  )
}

function TarjetaSeccion({
  seccion, esProfe, abierta, onAlternar, visibleAlumno, alumnoEdita, puedeEditar, onEditar, onPermisoEditar, onPermisoVer, children, subtitulo,
}: {
  seccion: Seccion; esProfe: boolean; abierta: boolean; onAlternar: () => void; subtitulo?: string
  visibleAlumno: boolean; alumnoEdita: boolean; puedeEditar: boolean
  onEditar?: () => void; onPermisoEditar: () => void; onPermisoVer: () => void; children: ReactNode
}) {
  const { t } = useTranslation()
  const Icono = ICONO[seccion]
  const botones = (SIN_EDITAR.includes(seccion) || !onEditar ? 0 : 1) + (SOLO_LECTURA.includes(seccion) ? 0 : 1) + 1
  const ancho = botones * 80
  const [dx, setDx] = useState(0)
  const [abiertoSwipe, setAbiertoSwipe] = useState(false)
  const inicio = useRef<{ x: number; y: number; base: number } | null>(null)
  const arrastro = useRef(false)

  function bajar(e: React.PointerEvent) {
    if (!esProfe) return
    inicio.current = { x: e.clientX, y: e.clientY, base: abiertoSwipe ? -ancho : 0 }
    arrastro.current = false
  }
  function mover(e: React.PointerEvent) {
    const i = inicio.current
    if (!i) return
    const mx = e.clientX - i.x
    if (!arrastro.current && Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(e.clientY - i.y)) {
      arrastro.current = true
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
    if (arrastro.current) setDx(Math.max(-ancho, Math.min(0, i.base + mx)))
  }
  function soltar() {
    const i = inicio.current
    inicio.current = null
    if (!i || !arrastro.current) return
    const abrir = dx < -ancho / 2
    setAbiertoSwipe(abrir)
    setDx(abrir ? -ancho : 0)
  }
  function tocar() {
    if (arrastro.current) { arrastro.current = false; return }
    if (abiertoSwipe) { setAbiertoSwipe(false); setDx(0); return }
    onAlternar()
  }
  const cerrarSwipe = () => { setAbiertoSwipe(false); setDx(0) }

  return (
    <div className={'rounded-[16px] border overflow-hidden ' + (esProfe && !visibleAlumno ? 'opacity-50 border-white/10 bg-[#1E1E1E]' : 'border-[#2D2D2D] bg-[#1E1E1E]')}>
      <div className="relative">
        {esProfe && (
          <div className="absolute inset-y-0 right-0 flex" style={{ width: ancho }} aria-label={t('evaluacion:permissionsOf', { section: t(`evaluacion:sec.${seccion}`) })}>
            {onEditar && !SIN_EDITAR.includes(seccion) && (
              <BotonSwipe icono={Pencil} color="#8BC34A" fondo="bg-[#8BC34A]/15" texto={t('evaluacion:actEdit')} onClick={() => { cerrarSwipe(); onEditar() }} />
            )}
            {!SOLO_LECTURA.includes(seccion) && (
              <BotonSwipe
                icono={alumnoEdita ? LockOpen : Lock} color={alumnoEdita ? '#8BC34A' : '#757575'} fondo={alumnoEdita ? 'bg-[#8BC34A]/10' : 'bg-[#2D2D2D]'}
                texto={alumnoEdita ? t('evaluacion:actCanEdit') : t('evaluacion:actCantEdit')} onClick={() => { cerrarSwipe(); onPermisoEditar() }}
              />
            )}
            <BotonSwipe
              icono={visibleAlumno ? Eye : EyeOff} color={visibleAlumno ? '#42A5F5' : '#757575'} fondo={visibleAlumno ? 'bg-[#42A5F5]/10' : 'bg-[#2D2D2D]'}
              texto={visibleAlumno ? t('evaluacion:actVisible') : t('evaluacion:actHidden')} onClick={() => { cerrarSwipe(); onPermisoVer() }}
            />
          </div>
        )}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={abierta}
          onPointerDown={bajar}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          onClick={tocar}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAlternar() } }}
          className={'relative bg-[#1E1E1E] flex items-center gap-3 px-4 select-none touch-pan-y ' + (esProfe ? 'h-20' : 'h-16')}
          style={{ transform: `translateX(${dx}px)`, transition: inicio.current && arrastro.current ? 'none' : 'transform 200ms ease-out' }}
        >
          <span className="w-9 h-9 rounded-[8px] bg-[#8BC34A]/15 flex items-center justify-center shrink-0">
            <Icono size={20} className="text-[#8BC34A]" />
          </span>
          <span className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="flex flex-col">
              <span className="text-white text-rt-16 font-semibold">{t(`evaluacion:sec.${seccion}`)}</span>
              {subtitulo && <span className="text-[#8BC34A]/80 text-rt-12">{subtitulo}</span>}
            </span>
            {esProfe && alumnoEdita && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-[#8BC34A]/15 text-[#8BC34A] text-[9px] font-semibold"><Users size={12} />{t('evaluacion:badgeEdits')}</span>
            )}
            {esProfe && !visibleAlumno && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-[#FFA726]/15 text-[#FFA726] text-[9px] font-semibold"><EyeOff size={12} />{t('evaluacion:badgeHidden')}</span>
            )}
          </span>
          {!esProfe && puedeEditar && onEditar && (
            <button onClick={(e) => { e.stopPropagation(); onEditar() }} aria-label={t('evaluacion:actEdit')} className="p-1">
              <Pencil size={20} className="text-[#8BC34A]" />
            </button>
          )}
          <ChevronLeft size={24} className={'text-grey-500 shrink-0 transition-transform ' + (abierta ? '-rotate-90' : abiertoSwipe ? 'rotate-180' : '')} />
        </div>
      </div>
      {abierta && <div className="border-t border-[#333333] p-4">{children}</div>}
    </div>
  )
}

function BotonSwipe({ icono: Icono, color, fondo, texto, onClick }: { icono: typeof User; color: string; fondo: string; texto: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={'w-20 h-full flex flex-col items-center justify-center gap-1 px-1 ' + fondo}>
      <Icono size={20} style={{ color }} />
      <span className="text-[8px] font-bold leading-tight text-center uppercase" style={{ color }}>{texto}</span>
    </button>
  )
}

function SeccionPerfil({ ficha, puedeEditar, onEditar }: { ficha: Ficha; puedeEditar: boolean; onEditar: () => void }) {
  const { t } = useTranslation()
  const edad = edadDesde(ficha.birth_date)
  const imc = bmi(ficha.weight_kg, ficha.height_cm)
  const clase = imc ? bmiClass(imc) : null
  const fc = maxHR(edad)
  const vacia = !ficha.birth_date && !ficha.weight_kg && !ficha.height_cm && !ficha.goals

  if (vacia) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <UserPlus size={48} className="text-white/30" />
        <p className="text-white/50 text-rt-14">{t('evaluacion:emptyProfile')}</p>
        {puedeEditar && (
          <button onClick={onEditar} className="flex items-center gap-1 text-[#8BC34A] text-rt-14 font-semibold mt-1">
            <Pencil size={16} /> {t('evaluacion:fillData')}
          </button>
        )}
      </div>
    )
  }

  const nada = (v: string | null, vacio: string) => (v && v.trim() ? v : vacio)
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-x-3 gap-y-4">
        <Dato etiqueta={t('evaluacion:age')} valor={edad != null ? String(edad) : '-'} unidad={edad != null ? t('evaluacion:years', { n: '' }).trim() : ''} />
        <Dato etiqueta={t('evaluacion:goals')} valor={nada(ficha.goals, t('evaluacion:notInformed'))} className="col-span-2" />
        <Dato etiqueta={t('evaluacion:weight')} valor={ficha.weight_kg != null ? String(Number(ficha.weight_kg)) : '-'} unidad="kg" />
        <Dato etiqueta={t('evaluacion:height')} valor={ficha.height_cm != null ? String(Number(ficha.height_cm)) : '-'} unidad="cm" className="col-span-2" />
        <Dato etiqueta={t('evaluacion:injuries')} valor={nada(ficha.injuries, t('evaluacion:noneF'))} />
        <Dato etiqueta={t('evaluacion:pathologies')} valor={nada(ficha.pathologies, t('evaluacion:noneF'))} className="col-span-2" />
        <Dato etiqueta={t('evaluacion:medications')} valor={nada(ficha.medications, t('evaluacion:noneM'))} className="col-span-3" />
        <Dato etiqueta={t('evaluacion:meals')} valor={ficha.meals_per_day != null ? String(ficha.meals_per_day) : '-'} />
        <Dato etiqueta={t('evaluacion:workoutsWeek')} valor={ficha.workouts_per_week != null ? t('evaluacion:perWeek', { n: ficha.workouts_per_week }) : '-'} className="col-span-2" />
        <Dato etiqueta={t('evaluacion:workType')} valor={ficha.work_type ? t(`evaluacion:work.${ficha.work_type}`) : '-'} />
        <Dato etiqueta={t('evaluacion:activity')} valor={ficha.activity_level ? t(`evaluacion:level.${ficha.activity_level}`) : '-'} className="col-span-2" />
        <div>
          <div className="text-white/60 text-rt-12">{t('evaluacion:smoker')}</div>
          <div className={'text-rt-16 font-medium ' + (ficha.smoker ? 'text-[#FFA726]' : 'text-[#8BC34A]')}>{ficha.smoker ? t('evaluacion:yes') : t('evaluacion:no')}</div>
        </div>
      </div>
      <div className="h-px bg-[#2D2D2D]" />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[12px] bg-[#252525] p-3 min-h-[120px] flex flex-col gap-2">
          <span className="text-white/60 text-rt-12">{t('evaluacion:imc')}</span>
          <span className="text-[#8BC34A] text-rt-24 font-bold">{imc ? imc.toFixed(2) : '-'}</span>
          {clase && (
            <span className="self-start px-2 py-0.5 rounded-[12px] text-rt-11 font-semibold border" style={{ color: clase.color, background: clase.color + '26', borderColor: clase.color + '4D' }}>
              {t(clase.label)}
            </span>
          )}
        </div>
        <div className="rounded-[12px] bg-[#252525] p-3 min-h-[120px] flex flex-col gap-2">
          <span className="text-white/60 text-rt-12">{t('evaluacion:hrMax')}</span>
          <span className="text-[#8BC34A] text-rt-24 font-bold">{fc ?? '-'} {fc ? <span className="text-white/50 text-rt-12 font-normal">{t('evaluacion:bpm')}</span> : null}</span>
        </div>
      </div>
    </div>
  )
}

function Dato({ etiqueta, valor, unidad, className = '' }: { etiqueta: string; valor: string; unidad?: string; className?: string }) {
  return (
    <div className={'min-w-0 ' + className}>
      <div className="text-white/60 text-rt-12">{etiqueta}</div>
      <div className="text-white text-rt-16 font-medium break-words">
        {valor}{unidad && valor !== '-' ? <span className="text-white/50 text-rt-12 font-normal"> {unidad}</span> : null}
      </div>
    </div>
  )
}

function SeccionAnamnesis({ lista, esProfe, studentId }: { lista: Anamnesis[]; esProfe: boolean; studentId: string }) {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const lang = i18n.language
  const nombre = (a: Anamnesis) => {
    const m = a.anamnesis_templates
    if (!m) return '—'
    return (lang.startsWith('es') && m.name_es) || (lang.startsWith('en') && m.name_en) || m.name
  }
  return (
    <div className="flex flex-col gap-3">
      {lista.length === 0 && <p className="text-white/50 text-rt-13 text-center py-2">{t('evaluacion:anamneseEmpty')}</p>}
      {lista.map((a) => (
        <button
          key={a.id}
          onClick={() => nav(esProfe ? `/professor/anamnese/${studentId}` : `/aluno/anamnese/${a.id}`)}
          className="w-full rounded-[12px] bg-[#252525] border border-[#333333] p-3 flex items-center gap-3 text-left"
        >
          <ClipboardList size={20} className="text-[#8BC34A] shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-white text-rt-14 font-semibold truncate">{nombre(a)}</span>
            <span className="block text-white/50 text-rt-11">
              {new Date(a.created_at).toLocaleDateString(localeDe(lang))} · {a.submitted_at ? t('evaluacion:tapToView') : esProfe ? t('evaluacion:anamnesePending') : t('evaluacion:tapToFill')}
            </span>
          </span>
          <span className={'px-2 py-0.5 rounded-[10px] text-rt-10 font-semibold ' + (a.submitted_at ? 'bg-[#8BC34A]/15 text-[#8BC34A]' : 'bg-[#FFA726]/15 text-[#FFA726]')}>
            {a.submitted_at ? t('evaluacion:anamneseDone') : t('evaluacion:anamnesePending')}
          </span>
        </button>
      ))}
      {esProfe && (
        <button onClick={() => nav(`/professor/anamnese/${studentId}`)} className="h-11 rounded-[12px] border border-dashed border-[#8BC34A]/50 text-[#8BC34A] text-rt-13 font-semibold">
          {t('evaluacion:anamneseManage')}
        </button>
      )}
    </div>
  )
}

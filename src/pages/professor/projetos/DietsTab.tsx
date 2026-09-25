import { useEffect, useRef, useState } from 'react'
import { coincide, textosDieta } from '@/lib/busqueda'
import { useTranslation } from 'react-i18next'
import { Droplet, Plus, Star, ChevronLeft, GripVertical, UtensilsCrossed, AlertCircle, X, Search, Check, PlusCircle, ChevronRight, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Filtro } from '../MeusProjetos'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CajaSelector, HojaRadio } from '@/components/professor/SelectorRadio'
import { objetivosDieta, etiquetaDe } from '@/lib/catalogos'
import { useDeslizar } from '@/lib/deslizar'
import { useArrastreLista, moverEnLista } from '@/lib/reordenar'
import { EmptyState, FixedBottomActions, FullScreenSheet } from './RoutinesTab'
import { FranjaMacros } from './RecipesTab'
import { sinAcentos } from './FoodsTab'
import { EditorDietaInline } from './dietas/EditorDietaInline'
import { SelecionarRefeicoes, type RefeicaoElegida } from './dietas/SelecionarRefeicoes'
import { SELECT_DIETA, macrosDieta, duplicarDieta, type Dieta } from './dietas/datos'
import { asignarDieta, crearDietaAlumno, sincronizarDietaAlumno } from '@/lib/asignacion'
import { mensajeError, detalleError } from '@/lib/errores'

type Aviso = { kind: 'error' | 'success'; message: string }

export type AlumnoCtx = { id: string; nombre: string }

export function DietsTab({ query, filtro, alumno }: { query: string; filtro: Filtro; alumno?: AlumnoCtx }) {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [items, setItems] = useState<Dieta[]>([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [expandidas, setExpandidas] = useState<string[]>([])
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [formulario, setFormulario] = useState<Dieta | 'nueva' | null>(null)
  const [clonando, setClonando] = useState<Dieta | null>(null)
  const [borrando, setBorrando] = useState<Dieta[] | null>(null)
  const [destacada, setDestacada] = useState<string | null>(null)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [agregando, setAgregando] = useState(false)
  const refs = useRef(new Map<string, HTMLLIElement>())

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const base = supabase.from('diets').select(SELECT_DIETA).eq('owner_id', profile.id)
    const { data, error } = await (alumno ? base.eq('student_id', alumno.id) : base.is('student_id', null))
      .order('position', { ascending: true, nullsFirst: false }).order('created_at')
    setErrorCarga(error ? mensajeError(error) : null)
    setItems((data as Dieta[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [profile?.id, alumno?.id])

  async function recargarUna(id: string) {
    const { data } = await supabase.from('diets').select(SELECT_DIETA).eq('id', id).single()
    if (data) setItems((p) => p.map((d) => (d.id === id ? (data as Dieta) : d)))
    // Dieta del alumno: cada cambio le llega a su app.
    if (alumno) await sincronizarDietaAlumno(id)
  }

  const palabras = sinAcentos(query.trim()).split(/\s+/).filter(Boolean)
  const filtered = items
    .filter((d) => (filtro === 'favoritos' ? d.is_favorite : true))
    .filter((d) => coincide(query, textosDieta(d, d.meals, d.meals.flatMap((m) => m.meal_foods.map((a) => ({ name: a.food_name_snapshot, name_pt: a.food_name_snapshot, name_es: a.name_es, name_en: a.name_en, category: a.category }))))))
  const todas = filtered.length > 0 && filtered.every((d) => seleccion.includes(d.id))

  // El reordenamiento usa ids, no índices: con búsqueda activa no mueve la dieta equivocada.
  const arrastre = useArrastreLista<string>((desde, hasta) => void reordenar(desde, hasta))
  async function reordenar(desde: string, hasta: string) {
    const nuevo = moverEnLista(items, items.findIndex((d) => d.id === desde), items.findIndex((d) => d.id === hasta))
    setItems(nuevo)
    for (let i = 0; i < nuevo.length; i++) {
      if (nuevo[i].position !== i) await supabase.from('diets').update({ position: i }).eq('id', nuevo[i].id)
    }
  }

  async function favorito(d: Dieta) {
    setItems((p) => p.map((x) => (x.id === d.id ? { ...x, is_favorite: !x.is_favorite } : x)))
    const { error } = await supabase.from('diets').update({ is_favorite: !d.is_favorite }).eq('id', d.id)
    if (error) { setAviso({ kind: 'error', message: t('projetos:die.favError') }); void load() }
  }

  async function duplicar(d: Dieta) {
    if (!profile?.id) return
    try {
      if (alumno) await asignarDieta({ dieta: { ...d, name: t('projetos:die.copyName', { name: d.name }) }, alumnoId: alumno.id, profesorId: profile.id, profesorNombre: profile.full_name ?? null })
      else await duplicarDieta(d, profile.id, items.length)
      setAviso({ kind: 'success', message: t('projetos:die.duplicated') })
      await load()
    } catch {
      setAviso({ kind: 'error', message: t('projetos:die.duplicateError') })
    }
  }

  async function borrar() {
    if (!borrando) return
    const ids = borrando.map((d) => d.id)
    const { error } = await supabase.from('diets').delete().in('id', ids)
    setBorrando(null)
    if (error) { setAviso({ kind: 'error', message: mensajeError(error) }); return }
    setSeleccion((p) => p.filter((x) => !ids.includes(x)))
    await load()
  }

  async function creada(id: string) {
    setFormulario(null)
    await load()
    setExpandidas((p) => [...p, id])
    setDestacada(id)
    window.setTimeout(() => refs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
    window.setTimeout(() => setDestacada(null), 1200)
  }

  return (
    <div className="pb-24">
      {alumno && (
        <button onClick={() => setAgregando(true)} className="w-full h-11 mb-3 rounded-[16px] bg-gradient-to-r from-[#7CB342] to-[#558B2F] text-white text-rt-14 font-semibold flex items-center justify-center gap-2">
          <Plus size={18} /> {t('projetos:die.addDiet')}
        </button>
      )}
      {seleccion.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 mb-3 bg-surface-app/95 backdrop-blur flex items-center gap-2">
          <button onClick={() => setBorrando(items.filter((d) => seleccion.includes(d.id)))} className="px-5 py-2.5 rounded-[20px] bg-[#D32F2F] text-white text-rt-13 font-semibold">{t('projetos:die.delete')}</button>
          <button onClick={() => setSeleccion(todas ? [] : filtered.map((d) => d.id))} className="ml-auto text-rt-13 text-grey-400">{todas ? 'Desselecionar tudo' : 'Selecionar tudo'}</button>
        </div>
      )}

      {loading ? (
        <div className="py-10 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></div>
      ) : errorCarga ? (
        <div className="flex flex-col items-center gap-2 py-12">
          <AlertCircle size={48} className="text-danger" />
          <span className="text-grey-400 text-rt-16">{t('projetos:die.loadError')}</span>
          <button onClick={() => void load()} className="mt-2 px-5 h-10 rounded-btn-pill bg-brand text-white text-rt-13 font-semibold">{t('projetos:die.tryAgain')}</button>
        </div>
      ) : filtered.length === 0 ? (
        palabras.length > 0
          ? <EmptyState icon={UtensilsCrossed} title={t('projetos:die.notFound')} body={t('projetos:die.tryOther')} />
          : filtro === 'favoritos'
            ? <EmptyState icon={UtensilsCrossed} title={t('projetos:die.noFav')} body={t('projetos:die.noFavBody')} />
            : alumno
              ? <EmptyState icon={UtensilsCrossed} title={t('projetos:die.noAssigned')} body={t('projetos:die.addFor', { name: alumno.nombre })} />
              : <EmptyState icon={UtensilsCrossed} title={t('projetos:die.none')} body={t('projetos:die.createFirst')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((d) => (
            <li
              key={d.id}
              ref={(el) => { if (el) refs.current.set(d.id, el); else refs.current.delete(d.id); arrastre.registrar(d.id, el) }}
              onPointerMove={arrastre.alMover}
              onPointerUp={arrastre.alSoltar}
              className={'rounded-[16px] overflow-hidden border transition ' +
                (seleccion.includes(d.id) ? 'border-2 border-brand bg-brand/10 ' : 'border-brand/30 bg-[#1E1E1E] ') +
                (arrastre.arrastrando === d.id ? 'scale-[1.02] shadow-2xl opacity-90 ' : '') +
                (arrastre.encima === d.id && arrastre.arrastrando !== d.id ? 'border-dashed border-brand ' : '') +
                (destacada === d.id ? 'shadow-[0_0_24px_rgba(124,179,66,0.4)] scale-[1.02] ' : '')}
            >
              <FranjaMacros m={macrosDieta(d)} />
              <CabeceraDieta
                d={d}
                deAlumno={Boolean(alumno)}
                lang={lang}
                expandida={expandidas.includes(d.id)}
                seleccionada={seleccion.includes(d.id)}
                onGrip={arrastre.alBajar(d.id)}
                onExpandir={() => setExpandidas((p) => (p.includes(d.id) ? p.filter((x) => x !== d.id) : [...p, d.id]))}
                onMarcar={() => setSeleccion((p) => (p.includes(d.id) ? p.filter((x) => x !== d.id) : [...p, d.id]))}
                onFavorito={() => void favorito(d)}
                onClonar={() => setClonando(d)}
                onDuplicar={() => void duplicar(d)}
                onEditar={() => setFormulario(d)}
                onExcluir={() => setBorrando([d])}
              />
              {expandidas.includes(d.id) && <EditorDietaInline dieta={d} onRecargar={() => recargarUna(d.id)} />}
            </li>
          ))}
        </ul>
      )}

      {!alumno && (
        <FixedBottomActions>
          <button className="w-full h-12 rounded-[12px] bg-[#2D2D2D] border border-[#616161] text-white text-rt-14 font-semibold flex items-center justify-center gap-2" onClick={() => setFormulario('nueva')}>
            <Plus size={18} /> {t('projetos:die.createNew')}
          </button>
        </FixedBottomActions>
      )}
      {alumno && <MetaHidratacao alumno={alumno} onAviso={setAviso} />}
      {agregando && alumno && (
        <AdicionarDieta
          alumno={alumno}
          onCerrar={() => setAgregando(false)}
          onCrear={() => { setAgregando(false); setFormulario('nueva') }}
          onListo={(id) => { setAgregando(false); void creada(id) }}
          onError={(m) => setAviso({ kind: 'error', message: m })}
        />
      )}

      {formulario && (
        <DietSheet
          dieta={formulario === 'nueva' ? undefined : formulario}
          alumno={alumno}
          posicion={items.length}
          onClose={() => setFormulario(null)}
          onCreada={(id) => void creada(id)}
          onEditada={() => { setFormulario(null); void load() }}
        />
      )}
      {clonando && <ClonarDieta dieta={clonando} onCerrar={() => setClonando(null)} onResultado={(a) => { setClonando(null); setAviso(a) }} />}
      {borrando && (
        <ConfirmDialog
          message={alumno ? (borrando.length === 1 ? t('projetos:die.removeOne') : t('projetos:die.removeMany')) : borrando.length === 1 ? t('projetos:die.deleteOne') : t('projetos:die.deleteMany')}
          detail={borrando.length === 1 ? t('projetos:die.confirmOne', { name: borrando[0].name }) : t('projetos:die.confirmMany', { n: borrando.length })}
          confirmLabel={alumno ? t('projetos:die.remove') : t('projetos:die.delete')}
          tone="danger"
          onConfirm={() => void borrar()}
          onCancel={() => setBorrando(null)}
        />
      )}
      {aviso && <FeedbackDialog kind={aviso.kind} message={aviso.message} onClose={() => setAviso(null)} />}
    </div>
  )
}

function CabeceraDieta({ d, deAlumno, lang, expandida, seleccionada, onGrip, onExpandir, onMarcar, onFavorito, onClonar, onDuplicar, onEditar, onExcluir }: {
  d: Dieta
  deAlumno: boolean
  lang: string
  expandida: boolean
  seleccionada: boolean
  onGrip: (e: React.PointerEvent) => void
  onExpandir: () => void
  onMarcar: () => void
  onFavorito: () => void
  onClonar: () => void
  onDuplicar: () => void
  onEditar: () => void
  onExcluir: () => void
}) {
  const { t } = useTranslation()
  const { dx, abierto, handlers, cerrar, fueArrastre } = useDeslizar(280)
  return (
    <div className="relative overflow-hidden border-t border-[#333333]">
      <div className="absolute inset-y-0 right-0 flex w-[280px]">
        {([[t('projetos:die.clone'), '#424242', onClonar], [t('projetos:die.duplicate'), '#616161', onDuplicar], [t('projetos:die.edit'), '#757575', onEditar], [deAlumno ? t('projetos:die.removeUp') : t('projetos:die.deleteUp'), '#B71C1C', onExcluir]] as const).map(([etq, c, fn]) => (
          <button key={etq} onClick={() => { cerrar(); fn() }} className="flex-1 text-white text-[9px] font-semibold" style={{ background: c }}>{etq}</button>
        ))}
      </div>
      <div
        {...handlers}
        style={{ transform: `translateX(${dx}px)` }}
        className="relative bg-[#1E1E1E] h-[72px] px-3 flex items-center gap-2.5 transition-transform touch-pan-y select-none"
      >
        <button onClick={onMarcar} aria-label={seleccionada ? t('projetos:c.unmark') : t('projetos:c.mark')}
          className={'w-[22px] h-[22px] rounded-[4px] border-[1.5px] flex items-center justify-center shrink-0 text-rt-12 ' + (seleccionada ? 'bg-brand border-brand text-white' : 'border-grey-500')}>
          {seleccionada && '✓'}
        </button>
        <button onPointerDown={onGrip} aria-label={t('projetos:die.drag')} className="touch-none cursor-grab shrink-0"><GripVertical size={18} className="text-grey-600" /></button>
        <button onClick={() => { if (fueArrastre()) return; if (abierto) { cerrar(); return } onExpandir() }} className="flex-1 min-w-0 text-left">
          <span className="block text-white text-rt-14 font-bold truncate">{d.name}</span>
          {d.goal && <span className="inline-block mt-1 text-rt-10 px-2 py-0.5 rounded-[10px] bg-[#2D2D2D] text-grey-400">{etiquetaDe(objetivosDieta, d.goal, lang)}</span>}
        </button>
        {!deAlumno && (
          <button onClick={onFavorito} aria-label={t('projetos:c.favorite')} className="shrink-0 p-0.5">
            <Star size={22} className={d.is_favorite ? 'text-brand fill-brand' : 'text-brand'} />
          </button>
        )}
        <button onClick={() => (abierto ? cerrar() : onExpandir())} aria-label={expandida ? 'Recolher' : 'Expandir'} className="shrink-0">
          <ChevronLeft size={20} className={'text-grey-500 transition-transform ' + (abierto ? 'rotate-180' : expandida ? '-rotate-90' : '')} />
        </button>
      </div>
    </div>
  )
}

function DietSheet({ dieta, alumno, posicion, onClose, onCreada, onEditada }: {
  dieta?: Dieta
  alumno?: AlumnoCtx
  posicion: number
  onClose: () => void
  onCreada: (id: string) => void
  onEditada: () => void
}) {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [nombre, setNombre] = useState(dieta?.name ?? '')
  const [objetivo, setObjetivo] = useState(dieta?.goal ?? 'maintenance')
  const [comidas, setComidas] = useState<RefeicaoElegida[]>([])
  const [abriendo, setAbriendo] = useState<'objetivo' | 'comidas' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    if (!nombre.trim()) { setError(t('projetos:die.nameReq')); return }
    if (!profile?.id) return
    setGuardando(true)
    // Editar cambia solo nombre y objetivo: las refeições se editan en el card
    // (en el app original, editar borraba los alimentos).
    if (dieta) {
      const { error: e } = await supabase.from('diets').update({ name: nombre.trim(), goal: objetivo }).eq('id', dieta.id)
      if (!e && alumno) await sincronizarDietaAlumno(dieta.id)
      setGuardando(false)
      if (e) { setError(t('projetos:die.saveError', { msg: detalleError(e) })); return }
      onEditada()
      return
    }
    if (alumno) {
      try {
        const id = await crearDietaAlumno({ alumnoId: alumno.id, profesorId: profile.id, nombre: nombre.trim(), goal: objetivo })
        if (comidas.length > 0) {
          const { error: e2 } = await supabase.from('meals').insert(comidas.map((c, i) => ({ diet_id: id, name: c.name, time_of_day: c.time, meal_type: c.meal_type, position: i })))
          if (e2) throw e2
          await sincronizarDietaAlumno(id)
        }
        setGuardando(false)
        onCreada(id)
      } catch (e2) {
        setGuardando(false)
        setError(t('projetos:die.saveError', { msg: (e2 as Error).message }))
      }
      return
    }
    const { data, error: e } = await supabase.from('diets').insert({ owner_id: profile.id, name: nombre.trim(), goal: objetivo, position: posicion }).select('id').single()
    if (e) { setGuardando(false); setError(t('projetos:die.saveError', { msg: detalleError(e) })); return }
    if (comidas.length > 0) {
      const { error: e2 } = await supabase.from('meals').insert(comidas.map((c, i) => ({ diet_id: data.id, name: c.name, time_of_day: c.time, meal_type: c.meal_type, position: i })))
      if (e2) { setGuardando(false); setError(t('projetos:die.saveMealsError', { msg: e2.message })); return }
    }
    setGuardando(false)
    onCreada(data.id)
  }

  return (
    <FullScreenSheet title={dieta ? t('projetos:die.editTitle') : t('projetos:die.newTitle')} onClose={onClose}>
      {error && (
        <div className="mb-5 rounded-[10px] bg-danger/10 border border-danger/30 px-3 py-2.5 flex items-center gap-2 text-[#EF5350] text-rt-12">
          <AlertCircle size={16} /><span className="flex-1">{error}</span><button onClick={() => setError(null)} aria-label={t('projetos:c.close')}><X size={14} /></button>
        </div>
      )}
      <div className="flex flex-col gap-6">
        <div>
          <label className="block text-white text-rt-13 font-semibold mb-2">{t('projetos:die.name')}</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={t('projetos:die.namePh')}
            className="w-full h-[52px] px-4 rounded-[12px] bg-[#252525] border border-[#333333] text-white text-rt-15 placeholder:text-grey-600 outline-none focus:border-brand" />
        </div>
        <CajaSelector label={t('projetos:c.objective')} valor={objetivo} placeholder={t('projetos:die.maintenancePh')} lista={objetivosDieta} lang={lang} onAbrir={() => setAbriendo('objetivo')} />
        {!dieta && (
          <div>
            <label className="block text-white text-rt-13 font-semibold mb-2">{t('projetos:die.meal')}</label>
            <button onClick={() => setAbriendo('comidas')} className="w-full h-[52px] px-4 rounded-[12px] bg-[#252525] flex items-center gap-2">
              <PlusCircle size={20} className={comidas.length ? 'text-brand' : 'text-grey-500'} />
              <span className={'flex-1 text-left text-rt-14 ' + (comidas.length ? 'text-brand' : 'text-grey-500')}>{comidas.length ? t('projetos:die.addMore') : t('projetos:die.selectMeals')}</span>
              <ChevronRight size={18} className="text-grey-500" />
            </button>
            {comidas.length > 0 && (
              <div className="mt-3 rounded-[12px] bg-[#252525] border border-[#333333] p-3">
                <div className="flex justify-between mb-2">
                  <span className="text-grey-400 text-rt-12">{t('projetos:die.nMealsSelected', { n: comidas.length })}</span>
                  <button onClick={() => setComidas([])} className="text-[#EF5350] text-rt-12 font-semibold">{t('projetos:c.clear')}</button>
                </div>
                <ul className="flex flex-col gap-2">
                  {comidas.map((c) => (
                    <li key={c.meal_type} className="rounded-[8px] bg-[#1E1E1E] border border-[#333333] px-3 py-2 flex items-center gap-2">
                      <span className={'w-7 h-7 rounded-[6px] flex items-center justify-center ' + (c.personalizada ? 'bg-brand/10' : 'bg-[#333333]')}>
                        {c.personalizada ? <Star size={14} className="text-brand" /> : <UtensilsCrossed size={14} className="text-grey-400" />}
                      </span>
                      <span className="flex-1 text-white text-rt-13">{c.name}</span>
                      <span className="flex items-center gap-1 text-rt-11 px-2 py-0.5 rounded-[6px] bg-[#333333] text-white"><Clock size={11} />{c.time}</span>
                      <button onClick={() => setComidas((p) => p.filter((x) => x.meal_type !== c.meal_type))} aria-label={t('projetos:die.removeMeal')}><X size={16} className="text-[#EF5350]" /></button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-8">
        <button onClick={() => void guardar()} disabled={guardando} className="w-full h-[54px] rounded-[27px] bg-gradient-to-b from-[#91C145] to-[#5A8F2F] text-white text-rt-16 font-bold shadow-[0_6px_16px_rgba(124,179,66,0.3)] disabled:opacity-60">
          {guardando ? t('projetos:c.saving') : dieta ? t('projetos:die.save') : t('projetos:die.create')}
        </button>
      </div>
      {abriendo === 'objetivo' && <HojaRadio lista={objetivosDieta} valor={objetivo} lang={lang} onElegir={(id) => { setObjetivo(id); setAbriendo(null) }} onCerrar={() => setAbriendo(null)} />}
      {abriendo === 'comidas' && (
        <SelecionarRefeicoes
          bloqueados={comidas.map((c) => c.meal_type)}
          onCerrar={() => setAbriendo(null)}
          onElegir={(r) => { setComidas((p) => [...p, ...r].sort((a, b) => a.time.localeCompare(b.time))); setAbriendo(null) }}
        />
      )}
    </FullScreenSheet>
  )
}

const COLORES = ['#7CB342', '#42A5F5', '#AB47BC', '#FF7043', '#26A69A']

function ClonarDieta({ dieta, onCerrar, onResultado }: { dieta: Dieta; onCerrar: () => void; onResultado: (a: Aviso) => void }) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [alumnos, setAlumnos] = useState<{ id: string; full_name: string | null; email: string | null; link_status: string }[] | null>(null)
  const [busca, setBusca] = useState('')
  const [marcados, setMarcados] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    void supabase.from('profiles').select('id,full_name,email,link_status').eq('teacher_id', profile.id).in('link_status', ['active', 'suspended'])
      .order('full_name').then(({ data }) => setAlumnos(((data as any[]) ?? []).sort((a, b) => (a.link_status === 'active' ? 0 : 1) - (b.link_status === 'active' ? 0 : 1))))
  }, [profile?.id])

  const q = sinAcentos(busca.trim())
  const lista = (alumnos ?? []).filter((a) => !q || sinAcentos(`${a.full_name ?? ''} ${a.email ?? ''}`).includes(q))
  const todos = lista.length > 0 && lista.every((a) => marcados.includes(a.id))

  async function clonar() {
    if (!profile?.id) return
    setEnviando(true)
    let ok = 0
    const nombres: string[] = []
    for (const id of marcados) {
      // Cada alumno recibe su copia editable; asignarDieta también le avisa.
      try {
        await asignarDieta({ dieta, alumnoId: id, profesorId: profile.id, profesorNombre: profile.full_name ?? null })
      } catch { continue }
      ok++
      nombres.push(alumnos?.find((a) => a.id === id)?.full_name ?? '')
    }
    const fallos = marcados.length - ok
    onResultado(fallos === 0
      ? { kind: 'success', message: ok === 1 ? t('projetos:die.clonedOne', { name: nombres[0] }) : t('projetos:die.clonedMany', { n: ok }) }
      : ok > 0 ? { kind: 'error', message: t('projetos:die.clonedPartial', { ok, fail: fallos }) } : { kind: 'error', message: t('projetos:die.cloneError') })
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#1E1E1E] flex flex-col">
      <div className="max-w-app w-full mx-auto flex flex-col flex-1 min-h-0 pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="px-5 flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-white text-rt-20 font-bold">{t('projetos:die.cloneTitle')}</h1>
            <p className="text-grey-500 text-rt-13">{t('projetos:die.cloneSub', { name: dieta.name })}</p>
          </div>
          <button onClick={onCerrar} aria-label={t('projetos:c.close')} className="w-9 h-9 rounded-full bg-[#333333] flex items-center justify-center"><X size={20} className="text-white" /></button>
        </div>
        <div className="relative mx-5 mt-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t('projetos:die.searchStudent')} className="w-full h-[50px] pl-10 pr-3 rounded-[12px] bg-[#2D2D2D] text-white text-rt-14 outline-none" />
        </div>
        <div className="flex items-center px-5 mt-3">
          {marcados.length > 0 && <span className="px-3 py-1 rounded-btn-pill bg-brand/20 text-brand text-rt-12 font-semibold">{t('projetos:die.nSelected', { n: marcados.length })}</span>}
          <button onClick={() => setMarcados(todos ? [] : lista.map((a) => a.id))} className="ml-auto text-brand text-rt-13 font-semibold">{todos ? t('projetos:die.deselectAll') : t('projetos:die.selectAll')}</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4">
          {alumnos === null ? (
            <div className="py-10 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></div>
          ) : lista.length === 0 ? (
            <p className="text-center text-white/60 text-rt-13 py-10">{t('projetos:die.noStudents')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {lista.map((a, i) => {
                const on = marcados.includes(a.id)
                return (
                  <li key={a.id}>
                    <button onClick={() => setMarcados((p) => (on ? p.filter((x) => x !== a.id) : [...p, a.id]))}
                      className={'w-full rounded-[12px] p-3 flex items-center gap-3 text-left border ' + (on ? 'bg-brand/15 border-brand' : 'bg-[#2D2D2D] border-transparent')}>
                      <span className={'w-6 h-6 rounded-[6px] border-2 flex items-center justify-center shrink-0 ' + (on ? 'bg-brand border-brand' : 'border-grey-500')}>{on && <Check size={14} className="text-white" />}</span>
                      <span className="w-12 h-12 rounded-full flex items-center justify-center text-rt-18 font-bold shrink-0"
                        style={on ? { background: 'rgba(124,179,66,0.2)', color: '#7CB342' } : { background: COLORES[i % COLORES.length], color: 'white' }}>
                        {(a.full_name ?? a.email ?? '?').charAt(0).toUpperCase()}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="text-white text-rt-15 font-semibold truncate">{a.full_name ?? a.email}</span>
                          <span className={'w-2.5 h-2.5 rounded-full shrink-0 ' + (a.link_status === 'active' ? 'bg-brand' : 'bg-danger')} />
                        </span>
                        <span className="block text-grey-500 text-rt-12 truncate">{a.email}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] border-t border-grey-800">
          <button disabled={marcados.length === 0 || enviando} onClick={() => void clonar()}
            className={'w-full h-[54px] rounded-[12px] text-white text-rt-15 font-bold ' + (marcados.length ? 'bg-gradient-to-b from-[#91C145] to-[#5A8F2F]' : 'bg-grey-700')}>
            {enviando ? t('projetos:die.cloning') : marcados.length ? t('projetos:die.cloneFor', { n: marcados.length }) : t('projetos:die.pickStudent')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** 'Adicionar Dieta' en el alumno: crear una nueva o copiar un modelo de Meus Projetos. */
function AdicionarDieta({ alumno, onCerrar, onCrear, onListo, onError }: {
  alumno: AlumnoCtx
  onCerrar: () => void
  onCrear: () => void
  onListo: (id: string) => void
  onError: (m: string) => void
}) {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation()
  const [modelos, setModelos] = useState<Dieta[] | null>(null)
  const [elegida, setElegida] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  useEffect(() => {
    if (!profile?.id) return
    void supabase.from('diets').select(SELECT_DIETA).eq('owner_id', profile.id).is('student_id', null)
      .order('position', { ascending: true, nullsFirst: false }).then(({ data }) => setModelos((data as Dieta[]) ?? []))
  }, [profile?.id])

  async function agregar() {
    const d = modelos?.find((x) => x.id === elegida)
    if (!d || !profile?.id) return
    setEnviando(true)
    try {
      onListo(await asignarDieta({ dieta: d, alumnoId: alumno.id, profesorId: profile.id, profesorNombre: profile.full_name ?? null }))
    } catch (e) {
      setEnviando(false)
      onError(t('projetos:die.addError', { msg: detalleError((e as Error)) }))
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#1E1E1E] flex flex-col">
      <div className="max-w-app w-full mx-auto flex flex-col flex-1 min-h-0 pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="px-5 flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-white text-rt-20 font-bold">{t('projetos:die.addDiet')}</h1>
            <p className="text-grey-500 text-rt-13">{t('projetos:die.addSub', { name: alumno.nombre })}</p>
          </div>
          <button onClick={onCerrar} aria-label={t('projetos:c.close')} className="w-9 h-9 rounded-full bg-[#333333] flex items-center justify-center"><X size={20} className="text-white" /></button>
        </div>
        <div className="px-5 mt-5">
          <button onClick={onCrear} className="w-full h-12 rounded-[12px] bg-gradient-to-b from-[#91C145] to-[#5A8F2F] text-white text-rt-15 font-semibold flex items-center justify-center gap-2">
            <Plus size={20} /> {t('projetos:die.createDiet')}
          </button>
          <div className="flex items-center gap-3 my-5 text-grey-500 text-rt-12"><span className="flex-1 h-px bg-grey-700" />{t('projetos:die.orExisting')}<span className="flex-1 h-px bg-grey-700" /></div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {modelos === null ? (
            <div className="py-10 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></div>
          ) : modelos.length === 0 ? (
            <p className="text-center text-white/60 text-rt-13 py-8">{t('projetos:die.noTemplates')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {modelos.map((d) => {
                const on = elegida === d.id
                const m = macrosDieta(d)
                return (
                  <li key={d.id}>
                    <button onClick={() => setElegida(on ? null : d.id)} className={'w-full rounded-[12px] p-4 flex items-center gap-3 text-left border ' + (on ? 'bg-brand/15 border-brand' : 'bg-[#2D2D2D] border-[#3A3A3A]')}>
                      <span className="w-12 h-12 rounded-[10px] bg-[#1E1E1E] flex items-center justify-center shrink-0"><UtensilsCrossed size={20} className="text-grey-400" /></span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-white text-rt-15 font-semibold truncate">{d.name}</span>
                        <span className="block text-grey-500 text-rt-12">{t('projetos:die.mealsKcal', { n: d.meals.length, kcal: Math.round(m.kcal) })}{d.goal ? ` · ${etiquetaDe(objetivosDieta, d.goal, i18n.language)}` : ''}</span>
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
            {enviando ? t('projetos:die.adding') : t('projetos:die.addSelected')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Botón de la gota: el profesor define la meta diaria de agua del alumno. */
function MetaHidratacao({ alumno, onAviso }: { alumno: AlumnoCtx; onAviso: (a: Aviso) => void }) {
  const { t } = useTranslation()
  const [abierto, setAbierto] = useState(false)
  const [actual, setActual] = useState<number | null>(null)
  const [valor, setValor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<number | null>(null)

  useEffect(() => {
    void supabase.from('profiles').select('hydration_goal_ml').eq('id', alumno.id).single()
      .then(({ data }) => setActual((data?.hydration_goal_ml as number | undefined) ?? 2500))
  }, [alumno.id])

  function pedir() {
    const ml = Number(valor.replace(/\D/g, ''))
    if (!ml || ml < 500 || ml > 10000) { setError(t('projetos:die.hydRange')); return }
    setError(null)
    setConfirmando(ml)
  }

  async function guardar(ml: number) {
    setConfirmando(null)
    const { error: e } = await supabase.rpc('definir_meta_hidratacao', { aluno_id: alumno.id, meta_ml: ml })
    if (e) { onAviso({ kind: 'error', message: mensajeError(e) }); return }
    setActual(ml)
    setAbierto(false)
    setValor('')
    onAviso({ kind: 'success', message: t('projetos:die.hydUpdated', { ml }) })
  }

  return (
    <>
      <div className="fixed inset-x-0 mx-auto w-full max-w-app px-4 z-30 flex items-center justify-end pointer-events-none [&>*]:pointer-events-auto" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}>
        {abierto && (
          <div className="mr-[-28px] pr-9 pl-4 h-14 rounded-l-full bg-white flex items-center gap-2 shadow-lg">
            <div className="flex flex-col">
              <span className="text-[#1565C0] text-rt-11 font-semibold">{t('projetos:die.hydTitle')}</span>
              {error ? <span className="text-danger text-[10px]">{error}</span> : <span className="text-grey-500 text-[10px]">{t('projetos:die.hydCurrent', { ml: actual ?? '…' })}</span>}
            </div>
            <input
              autoFocus
              inputMode="numeric"
              value={valor}
              onChange={(e) => setValor(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') pedir() }}
              placeholder={String(actual ?? 2500)}
              className="w-[70px] h-9 px-2 rounded-[8px] border border-[#90CAF9] text-black text-rt-14 outline-none"
            />
            <span className="text-grey-500 text-rt-12">ml</span>
            <button onClick={pedir} aria-label={t('projetos:die.hydConfirm')} className="w-9 h-9 rounded-full bg-[#1E88E5] flex items-center justify-center">
              <Check size={18} className="text-white" />
            </button>
          </div>
        )}
        <button
          onClick={() => { setAbierto((v) => !v); setError(null) }}
          aria-label={t('projetos:die.hydButton')}
          className="relative w-14 h-14 rounded-full bg-white border-2 border-grey-300 flex items-center justify-center shadow-lg"
        >
          {abierto ? <X size={22} className="text-grey-600" /> : <Droplet size={26} className="text-[#1E88E5] fill-[#1E88E5]" />}
        </button>
      </div>
      {confirmando !== null && (
        <ConfirmDialog
          message={t('projetos:die.hydChangeTitle')}
          detail={t('projetos:die.hydChangeDetail', { name: alumno.nombre, from: actual ?? 2500, to: confirmando })}
          confirmLabel={t('projetos:die.confirm')}
          onConfirm={() => void guardar(confirmando)}
          onCancel={() => setConfirmando(null)}
        />
      )}
    </>
  )
}

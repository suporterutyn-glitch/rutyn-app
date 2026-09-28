import { useEffect, useRef, useState } from 'react'
import { coincide, textosAlimento } from '@/lib/busqueda'
import { Plus, Star, Pencil, Egg, Wheat, Droplet, Leaf, Ban, Pill, UtensilsCrossed } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import type { Filtro } from '../MeusProjetos'
import { useFavoritos } from '@/lib/favoritos'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CajaSelector, HojaRadio } from '@/components/professor/SelectorRadio'
import { categoriasAlimento, unidadesAlimento, abreviaturaUnidad, etiquetaDe, type Catalogo } from '@/lib/catalogos'
import { nombreEjercicio as nombreEnIdioma } from '@/lib/nombreEjercicio'
import { useAuth } from '@/lib/auth'
import { EmptyState, FixedBottomActions, FullScreenSheet } from './RoutinesTab'
import { CombinarAlimentos } from './CombinarAlimentos'
import { mensajeError, detalleError } from '@/lib/errores'

export type Food = {
  id: string
  trainer_id: string | null
  name: string
  name_pt: string | null
  name_es: string | null
  name_en: string | null
  portion: string | null
  portion_qty: number | null
  unit: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fats_g: number | null
  category: string | null
}

export const ESTILO_CATEGORIA: Record<string, { icono: typeof Egg; color: string; textoBadge: string }> = {
  protein: { icono: Egg, color: '#E57373', textoBadge: 'text-white' },
  carb: { icono: Wheat, color: '#FFD54F', textoBadge: 'text-black' },
  fat: { icono: Droplet, color: '#81C784', textoBadge: 'text-white' },
  supplement: { icono: Pill, color: '#BA68C8', textoBadge: 'text-white' },
  calories: { icono: Leaf, color: '#64B5F6', textoBadge: 'text-white' },
  none: { icono: Ban, color: '#4B5D73', textoBadge: 'text-white' },
}

export function sinAcentos(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Palabras en cualquier orden, sin acentos, contra el nombre en PT, ES y EN. */
/** Nombre en cualquier idioma o categoría ('proteína', 'carbs'...). */
export function coincideBusqueda(f: Pick<Food, 'name' | 'name_pt' | 'name_es' | 'name_en' | 'category'>, busca: string) {
  return coincide(busca, textosAlimento(f))
}

/** Macros llevados a 100 g/ml para poder comparar alimentos con porciones distintas (por unidad, tal cual). */
export function por100(f: Food) {
  const q = Number(f.portion_qty ?? 100)
  const k = (f.unit === 'uni' || !q) ? 1 : 100 / q
  return { kcal: Number(f.calories ?? 0) * k, p: Number(f.protein_g ?? 0) * k, c: Number(f.carbs_g ?? 0) * k, g: Number(f.fats_g ?? 0) * k }
}

const FILTROS_MACRO: { id: string; cumple: (m: ReturnType<typeof por100>) => boolean }[] = [
  { id: 'highProtein', cumple: (m) => m.p >= 8 && m.kcal > 0 && (m.p * 4) / m.kcal >= 0.3 },
  { id: 'lowCarb', cumple: (m) => m.c <= 5 },
  { id: 'lowFat', cumple: (m) => m.g <= 3 },
  { id: 'lowCalorie', cumple: (m) => m.kcal <= 100 },
]

const ORDENES: Catalogo[] = [
  { id: 'name', pt: 'Nome (A-Z)', es: 'Nombre (A-Z)', en: 'Name (A-Z)' },
  { id: 'protein', pt: 'Mais proteína', es: 'Más proteína', en: 'Most protein' },
  { id: 'carbs', pt: 'Mais carboidrato', es: 'Más carbohidrato', en: 'Most carbs' },
  { id: 'fat', pt: 'Mais gordura', es: 'Más grasa', en: 'Most fat' },
  { id: 'kcalAsc', pt: 'Menos calorias', es: 'Menos calorías', en: 'Fewest calories' },
  { id: 'kcalDesc', pt: 'Mais calorias', es: 'Más calorías', en: 'Most calories' },
]

export function porcionDe(f: Food) {
  return `${Number(f.portion_qty ?? 100)}${abreviaturaUnidad(f.unit)}`
}

export function FoodsTab({ query, filtro }: { query: string; filtro: Filtro }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { profile } = useAuth()
  const [items, setItems] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editando, setEditando] = useState<Food | null>(null)
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [categoria, setCategoria] = useState('')
  const [macros, setMacros] = useState<string[]>([])
  const [orden, setOrden] = useState('name')
  const [eligiendoOrden, setEligiendoOrden] = useState(false)
  const [combinando, setCombinando] = useState(false)
  const [borrando, setBorrando] = useState<{ propios: Food[]; enUso: { food: Food; dietas: string[] }[] } | null>(null)
  const [aviso, setAviso] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)
  const { esFavorito, alternar, error: errorFav, limpiarError } = useFavoritos('food')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('foods').select('*').order('name')
    if (error) setAviso({ kind: 'error', message: t('projetos:al.loadError', { msg: detalleError(error) }) })
    setItems((data as Food[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const filtered = items
    .filter((f) => (filtro === 'favoritos' ? esFavorito(f.id) : true))
    .filter((f) => (filtro === 'minhas' ? f.trainer_id === profile?.id : true))
    .filter((f) => !categoria || (f.category ?? 'none') === categoria)
    .filter((f) => coincideBusqueda(f, query))
    .filter((f) => macros.every((id) => FILTROS_MACRO.find((x) => x.id === id)!.cumple(por100(f))))
    .sort((a, b) => {
      const ma = por100(a), mb = por100(b)
      const d = orden === 'protein' ? mb.p - ma.p : orden === 'carbs' ? mb.c - ma.c : orden === 'fat' ? mb.g - ma.g
        : orden === 'kcalAsc' ? ma.kcal - mb.kcal : orden === 'kcalDesc' ? mb.kcal - ma.kcal : 0
      return d || nombreEnIdioma(a, lang).localeCompare(nombreEnIdioma(b, lang))
    })

  const categoriasPresentes = categoriasAlimento.map((c) => c.id).filter((id) => items.some((f) => (f.category ?? 'none') === id))
  const enSeleccion = seleccion.length > 0
  const todosMarcados = filtered.length > 0 && filtered.every((f) => seleccion.includes(f.id))

  function alternarSeleccion(id: string) {
    setSeleccion((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  async function pedirBorrado() {
    const propios = items.filter((f) => seleccion.includes(f.id) && f.trainer_id === profile?.id)
    if (propios.length === 0) {
      setAviso({ kind: 'error', message: t('projetos:al.cantDeleteApp') })
      return
    }
    const { data } = await supabase
      .from('meal_foods')
      .select('food_id, meals(diets(name))')
      .in('food_id', propios.map((f) => f.id))
    const porFood = new Map<string, Set<string>>()
    for (const r of (data as any[]) ?? []) {
      const nombre = r.meals?.diets?.name
      if (!nombre) continue
      if (!porFood.has(r.food_id)) porFood.set(r.food_id, new Set())
      porFood.get(r.food_id)!.add(nombre)
    }
    setBorrando({
      propios,
      enUso: propios.filter((f) => porFood.has(f.id)).map((f) => ({ food: f, dietas: Array.from(porFood.get(f.id)!) })),
    })
  }

  async function borrar() {
    if (!borrando) return
    const ids = borrando.propios.map((f) => f.id)
    if (borrando.enUso.length > 0) {
      const { error } = await supabase.from('meal_foods').delete().in('food_id', ids)
      if (error) { setBorrando(null); setAviso({ kind: 'error', message: mensajeError(error) }); return }
    }
    const { error } = await supabase.from('foods').delete().in('id', ids)
    const ignorados = seleccion.length - ids.length
    const forzado = borrando.enUso.length > 0
    setBorrando(null)
    if (error) { setAviso({ kind: 'error', message: mensajeError(error) }); return }
    setSeleccion([])
    setAviso({
      kind: 'success',
      message: (forzado ? t('projetos:al.deletedForced', { n: ids.length }) : t('projetos:al.deletedOk', { n: ids.length }))
        + (ignorados > 0 ? t('projetos:al.kept', { n: ignorados }) : ''),
    })
    await load()
  }

  return (
    <div className="pb-24">
      {enSeleccion && (
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 mb-3 bg-surface-app/95 backdrop-blur flex items-center gap-2">
          <button onClick={() => setCombinando(true)} className="px-5 py-2.5 rounded-[20px] bg-brand text-white text-rt-13 font-semibold">{t('projetos:c.combine')}</button>
          <button onClick={() => void pedirBorrado()} className="px-5 py-2.5 rounded-[20px] bg-[#D32F2F] text-white text-rt-13 font-semibold">{t('projetos:c.delete')}</button>
          <button onClick={() => setSeleccion(todosMarcados ? [] : filtered.map((f) => f.id))} className="ml-auto text-rt-13 text-grey-400">
            {todosMarcados ? t('projetos:c.deselectAll') : t('projetos:c.selectAll')}
          </button>
        </div>
      )}

      <div className="-mx-4 px-4 mb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {[{ id: '', etiqueta: t('projetos:al.allCategories') }, ...categoriasPresentes.map((id) => ({ id, etiqueta: etiquetaDe(categoriasAlimento, id, lang) }))].map((c) => (
          <button
            key={c.id || 'todas'}
            type="button"
            onClick={() => { setCategoria(c.id); setSeleccion([]) }}
            aria-pressed={categoria === c.id}
            className={'shrink-0 px-3.5 py-1.5 rounded-[16px] text-rt-12 font-semibold border transition ' +
              (categoria === c.id ? 'bg-brand border-brand text-white' : 'bg-[#1E1E1E] border-[#424242] text-grey-400')}
          >
            {c.etiqueta}
          </button>
        ))}
      </div>

      <div className="-mx-4 px-4 mb-3 flex gap-2 overflow-x-auto no-scrollbar items-center">
        {FILTROS_MACRO.map((m) => {
          const activo = macros.includes(m.id)
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={activo}
              onClick={() => { setMacros((p) => (activo ? p.filter((x) => x !== m.id) : [...p, m.id])); setSeleccion([]) }}
              className={'shrink-0 px-3 py-1.5 rounded-[16px] text-rt-12 font-semibold border transition ' +
                (activo ? 'bg-[#64B5F6] border-[#64B5F6] text-black' : 'bg-transparent border-[#424242] text-grey-400')}
            >
              {t(`projetos:al.macro.${m.id}`)}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setEligiendoOrden(true)}
          className={'shrink-0 px-3 py-1.5 rounded-[16px] text-rt-12 font-semibold border ' + (orden !== 'name' ? 'border-brand text-brand' : 'border-[#424242] text-grey-400')}
        >
          {t('projetos:al.sortBy')}: {etiquetaDe(ORDENES, orden, lang)}
        </button>
      </div>
      {macros.length > 0 && (
        <div className="text-grey-500 text-rt-11 mb-3 -mt-1">{t('projetos:al.per100Note')}</div>
      )}
      {eligiendoOrden && (
        <HojaRadio lista={ORDENES} valor={orden} lang={lang} onElegir={(id) => { setOrden(id); setEligiendoOrden(false) }} onCerrar={() => setEligiendoOrden(false)} />
      )}

      {loading ? (
        <div className="py-10 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></div>
      ) : filtered.length === 0 ? (
        query.trim()
          ? <EmptyState icon={UtensilsCrossed} title={t('projetos:al.notFound')} body={t('projetos:al.tryOther')} />
          : filtro === 'favoritos'
            ? <EmptyState icon={UtensilsCrossed} title={t('projetos:al.noFav')} body={t('projetos:al.noFavBody')} />
            : filtro === 'minhas'
              ? <EmptyState icon={UtensilsCrossed} title={t('projetos:al.noOwn')} body={t('projetos:al.createFirst')} />
              : <EmptyState icon={UtensilsCrossed} title={t('projetos:al.none')} body={t('projetos:al.createFirst')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((f) => (
            <TarjetaAlimento
              key={f.id}
              f={f}
              lang={lang}
              propio={f.trainer_id === profile?.id}
              favorito={esFavorito(f.id)}
              seleccionado={seleccion.includes(f.id)}
              enSeleccion={enSeleccion}
              onMarcar={() => alternarSeleccion(f.id)}
              onFavorito={() => void alternar(f.id)}
              onEditar={() => setEditando(f)}
            />
          ))}
        </ul>
      )}

      <FixedBottomActions>
        <button
          className="w-full h-12 rounded-[12px] bg-[#2D2D2D] border border-[#616161] text-white text-rt-14 font-semibold flex items-center justify-center gap-2"
          onClick={() => setShowNew(true)}
        >
          <Plus size={18} /> {t('projetos:al.createNew')}
        </button>
      </FixedBottomActions>

      {showNew && <FoodSheet onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); void load() }} />}
      {editando && <FoodSheet alimento={editando} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); void load() }} />}
      {combinando && (
        <CombinarAlimentos
          alimentos={items.filter((f) => seleccion.includes(f.id))}
          onCerrar={() => setCombinando(false)}
          onListo={(m) => { setCombinando(false); setSeleccion([]); setAviso({ kind: 'success', message: m }) }}
          onError={(m) => setAviso({ kind: 'error', message: m })}
        />
      )}
      {borrando && (borrando.enUso.length === 0 ? (
        <ConfirmDialog
          message={t('projetos:al.deleteTitle')}
          detail={t('projetos:al.deleteDetail', { n: borrando.propios.length })}
          confirmLabel={t('projetos:c.delete')}
          tone="danger"
          onConfirm={() => void borrar()}
          onCancel={() => setBorrando(null)}
        />
      ) : (
        <ConfirmDialog
          message={t('projetos:al.inUse')}
          detail={t('projetos:al.inUseDetail')}
          confirmLabel={t('projetos:al.deleteAnyway')}
          tone="danger"
          onConfirm={() => void borrar()}
          onCancel={() => setBorrando(null)}
        >
          <ul className="max-h-48 overflow-y-auto flex flex-col gap-3">
            {borrando.enUso.map(({ food, dietas }) => (
              <li key={food.id}>
                <div className="text-white text-rt-13 font-semibold">{nombreEnIdioma(food, lang)}</div>
                <div className="text-white/60 text-rt-11">{t('projetos:al.usedIn', { n: dietas.length })}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {dietas.slice(0, 3).map((d) => <span key={d} className="text-rt-10 px-2 py-0.5 rounded-[8px] bg-[#333333] text-white/80">{d}</span>)}
                </div>
              </li>
            ))}
          </ul>
        </ConfirmDialog>
      ))}
      {aviso && <FeedbackDialog kind={aviso.kind} message={aviso.message} onClose={() => setAviso(null)} />}
      {errorFav && <FeedbackDialog kind="error" message={errorFav} onClose={limpiarError} />}
    </div>
  )
}

export function IconoCategoria({ categoria, tamano = 60 }: { categoria: string | null; tamano?: number }) {
  const e = ESTILO_CATEGORIA[categoria ?? 'none'] ?? ESTILO_CATEGORIA.none
  const Icono = e.icono
  return (
    <span className="rounded-[10px] flex items-center justify-center shrink-0" style={{ width: tamano, height: tamano, background: e.color + '33' }}>
      <Icono size={Math.round(tamano * 0.47)} style={{ color: e.color }} />
    </span>
  )
}

export function MiniMacros({ kcal, p, c, g }: { kcal: number; p: number; c: number; g: number }) {
  const { t } = useTranslation()
  return (
    <span className="flex flex-wrap gap-x-2 text-rt-10 font-semibold">
      <span className="text-[#64B5F6]">{Math.round(kcal)} kcal</span>
      <span className="text-[#E57373]">{p.toFixed(1)}g {t('projetos:al.pAbbr')}</span>
      <span className="text-[#FFD54F]">{c.toFixed(1)}g {t('projetos:al.cAbbr')}</span>
      <span className="text-[#81C784]">{g.toFixed(1)}g {t('projetos:al.fAbbr')}</span>
    </span>
  )
}

function TarjetaAlimento({ f, lang, propio, favorito, seleccionado, enSeleccion, onMarcar, onFavorito, onEditar }: {
  f: Food
  lang: string
  propio: boolean
  favorito: boolean
  seleccionado: boolean
  enSeleccion: boolean
  onMarcar: () => void
  onFavorito: () => void
  onEditar: () => void
}) {
  const { t } = useTranslation()
  const timer = useRef<number | null>(null)
  const largo = useRef(false)
  function bajar() {
    largo.current = false
    timer.current = window.setTimeout(() => { largo.current = true; onMarcar() }, 500)
  }
  function soltar() { if (timer.current) window.clearTimeout(timer.current) }
  const est = ESTILO_CATEGORIA[f.category ?? 'none'] ?? ESTILO_CATEGORIA.none

  return (
    <li
      onPointerDown={bajar}
      onPointerUp={soltar}
      onPointerLeave={soltar}
      onPointerCancel={soltar}
      onContextMenu={(ev) => ev.preventDefault()}
      onClick={() => { if (largo.current) { largo.current = false; return } if (enSeleccion) onMarcar() }}
      className={'rounded-[16px] p-3 flex items-center gap-3 border select-none transition ' +
        (seleccionado ? 'bg-brand/15 border-brand' : 'bg-[#1E1E1E] border-brand/30')}
    >
      <button
        type="button"
        onClick={(ev) => { ev.stopPropagation(); onMarcar() }}
        aria-label={seleccionado ? t('projetos:c.unmark') : t('projetos:c.mark')}
        className={'w-[22px] h-[22px] rounded-[4px] border-[1.5px] flex items-center justify-center shrink-0 text-rt-12 ' +
          (seleccionado ? 'bg-brand border-brand text-white' : 'border-grey-500')}
      >
        {seleccionado && '✓'}
      </button>
      <IconoCategoria categoria={f.category} />
      <div className="flex-1 min-w-0">
        <div className="text-white text-rt-14 font-semibold leading-snug line-clamp-2">{nombreEnIdioma(f, lang)}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-grey-500 text-rt-11">{porcionDe(f)}</span>
          <span className={'text-rt-10 font-semibold px-2 py-0.5 rounded-[12px] ' + est.textoBadge} style={{ background: est.color }}>
            {etiquetaDe(categoriasAlimento, f.category ?? 'none', lang)}
          </span>
        </div>
        <div className="mt-1">
          <MiniMacros kcal={Number(f.calories ?? 0)} p={Number(f.protein_g ?? 0)} c={Number(f.carbs_g ?? 0)} g={Number(f.fats_g ?? 0)} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 shrink-0">
        <button type="button" onClick={(ev) => { ev.stopPropagation(); onFavorito() }} aria-label={t('projetos:c.favorite')} className="p-0.5">
          <Star size={24} className={favorito ? 'text-[#FFC107] fill-[#FFC107]' : 'text-grey-500'} />
        </button>
        {propio && (
          <button type="button" onClick={(ev) => { ev.stopPropagation(); onEditar() }} aria-label={t('projetos:al.edit')} className="p-0.5">
            <Pencil size={22} className="text-brand" />
          </button>
        )}
      </div>
    </li>
  )
}

function numero(txt: string) {
  return txt.replace(/[^\d.,]/g, '')
}
function aNumero(txt: string) {
  const n = Number(txt.replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

export function FoodSheet({ alimento, onClose, onSaved }: {
  alimento?: Food
  onClose: () => void
  onSaved: (f: Food) => void
}) {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const cad = (n: number | null | undefined) => (n == null ? '' : String(Number(n)))
  const [nombre, setNombre] = useState(alimento?.name_pt ?? alimento?.name ?? '')
  const [nombreEs, setNombreEs] = useState(alimento?.name_es ?? '')
  const [categoria, setCategoria] = useState(alimento?.category ?? '')
  const [unidad, setUnidad] = useState(alimento?.unit ?? 'g')
  const [porcion, setPorcion] = useState(cad(alimento?.portion_qty))
  const [kcal, setKcal] = useState(cad(alimento?.calories))
  const [prot, setProt] = useState(cad(alimento?.protein_g))
  const [carb, setCarb] = useState(cad(alimento?.carbs_g))
  const [gord, setGord] = useState(cad(alimento?.fats_g))
  const [abriendo, setAbriendo] = useState<'categoria' | 'unidad' | null>(null)
  const [errores, setErrores] = useState<{ nombre?: string; porcion?: string; banner?: string }>({})
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    const e: typeof errores = {}
    if (!nombre.trim()) e.nombre = t('projetos:al.nameReq')
    const q = aNumero(porcion)
    if (!porcion.trim()) e.porcion = t('projetos:al.portionReq')
    else if (!(q > 0)) e.porcion = t('projetos:al.invalid')
    if (!categoria) e.banner = t('projetos:al.pickCategory')
    setErrores(e)
    if (Object.keys(e).length > 0 || !user?.id) return

    const campos = {
      name: nombre.trim(),
      name_pt: nombre.trim(),
      name_es: nombreEs.trim() || null,
      category: categoria,
      unit: unidad,
      portion_qty: q,
      portion: `${q}${abreviaturaUnidad(unidad).trim()}`,
      calories: aNumero(kcal) || 0,
      protein_g: aNumero(prot) || 0,
      carbs_g: aNumero(carb) || 0,
      fats_g: aNumero(gord) || 0,
    }
    setGuardando(true)
    const { data, error } = alimento
      ? await supabase.from('foods').update(campos).eq('id', alimento.id).select('*').single()
      : await supabase.from('foods').insert({ trainer_id: user.id, ...campos }).select('*').single()
    setGuardando(false)
    if (error) { setErrores({ banner: t('projetos:al.saveError', { msg: detalleError(error) }) }); return }
    onSaved(data as Food)
  }

  const claseCampo = (err?: string) =>
    'w-full h-[52px] px-4 rounded-[12px] bg-[#252525] border text-white text-rt-15 placeholder:text-grey-600 outline-none ' +
    (err ? 'border-danger' : 'border-[#333333] focus:border-brand')

  return (
    <FullScreenSheet title={alimento ? t('projetos:al.editTitle') : t('projetos:al.newTitle')} onClose={onClose}>
      {errores.banner && (
        <div className="mb-5 rounded-[12px] bg-danger/15 border border-danger/40 px-4 py-3 text-[#EF9A9A] text-rt-13">{errores.banner}</div>
      )}
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-white text-rt-13 font-semibold mb-2">{t('projetos:al.name')}</label>
          <input className={claseCampo(errores.nombre)} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={t('projetos:al.namePh')} />
          {errores.nombre && <div className="text-danger text-rt-11 mt-1">{errores.nombre}</div>}
        </div>
        <div>
          <label className="block text-white text-rt-13 font-semibold mb-2">{t('projetos:al.nameEs')}</label>
          <input className={claseCampo()} value={nombreEs} onChange={(e) => setNombreEs(e.target.value)} placeholder={t('projetos:al.nameEsPh')} />
        </div>
        <CajaSelector label={t('projetos:al.category')} valor={categoria} placeholder={t('projetos:al.pickCategory')} lista={categoriasAlimento} lang={lang} onAbrir={() => setAbriendo('categoria')} />
        <CajaSelector label={t('projetos:al.unit')} valor={unidad} placeholder={t('projetos:al.unitPh')} lista={unidadesAlimento} lang={lang} onAbrir={() => setAbriendo('unidad')} />
        <div>
          <label className="block text-white text-rt-13 font-semibold mb-2">{t('projetos:al.portion')}</label>
          <input inputMode="decimal" className={claseCampo(errores.porcion)} value={porcion} onChange={(e) => setPorcion(numero(e.target.value))} placeholder={t('projetos:al.portionPh')} />
          {errores.porcion && <div className="text-danger text-rt-11 mt-1">{errores.porcion}</div>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([[t('projetos:al.kcalLabel'), kcal, setKcal], [t('projetos:al.protLabel'), prot, setProt], [t('projetos:al.carbLabel'), carb, setCarb], [t('projetos:al.fatLabel'), gord, setGord]] as const).map(([l, v, set]) => (
            <div key={l}>
              <label className="block text-white text-rt-13 font-semibold mb-2">{l}</label>
              <input inputMode="decimal" className={claseCampo()} value={v} onChange={(e) => set(numero(e.target.value))} placeholder="0" />
            </div>
          ))}
        </div>
        <p className="text-white/50 text-rt-11">{t('projetos:al.macrosNote')}</p>
      </div>
      <div className="mt-8">
        <button className="btn-save" disabled={guardando} onClick={() => void guardar()}>
          {guardando ? t('projetos:c.saving') : alimento ? t('projetos:al.save') : t('projetos:al.create')}
        </button>
      </div>
      {abriendo === 'categoria' && (
        <HojaRadio lista={categoriasAlimento} valor={categoria} lang={lang} onElegir={(id) => { setCategoria(id); setAbriendo(null) }} onCerrar={() => setAbriendo(null)} />
      )}
      {abriendo === 'unidad' && (
        <HojaRadio lista={unidadesAlimento} valor={unidad} lang={lang} onElegir={(id) => { setUnidad(id); setAbriendo(null) }} onCerrar={() => setAbriendo(null)} />
      )}
    </FullScreenSheet>
  )
}

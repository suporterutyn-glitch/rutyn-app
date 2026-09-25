import { useEffect, useState } from 'react'
import { coincide, textosReceta } from '@/lib/busqueda'
import { useTranslation } from 'react-i18next'
import { Plus, BookOpen, Star, ChevronLeft, Copy, Pencil, Trash2, UtensilsCrossed, Timer, Lightbulb, X, Camera, Video, Link2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Filtro } from '../MeusProjetos'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CajaSelector, HojaRadio } from '@/components/professor/SelectorRadio'
import { categoriasReceita, tiposPreparo, temposReceita, utensiliosReceita, abreviaturaUnidad, etiquetaDe } from '@/lib/catalogos'
import { nombreEjercicio as nombreEnIdioma } from '@/lib/nombreEjercicio'
import { macrosDe, sumarMacros, type Macros } from '@/lib/nutricion'
import { useDeslizar } from '@/lib/deslizar'
import { EmptyState, FixedBottomActions, FullScreenSheet } from './RoutinesTab'
import { type Food } from './FoodsTab'
import { AdicionarAlimentos, type AlimentoElegido } from './AdicionarAlimentos'
import { SubirArchivo } from './ExercisesTab'
import { mensajeError } from '@/lib/errores'

type Ingrediente = { id?: string; food_id: string | null; food_name_snapshot: string | null; quantity: number; unit: string | null; position: number; foods: Food | null }
export type Receita = {
  id: string
  owner_id: string
  name: string
  category: string
  prep_type: string
  time_estimate: string
  utensils: string[]
  steps: string[]
  tips: string | null
  cover_url: string | null
  video_url: string | null
  is_favorite: boolean
  created_at: string
  recipe_ingredients: Ingrediente[]
}

export const SELECT_RECEITA = '*,recipe_ingredients(*,foods(*))'

export function macrosReceita(r: Pick<Receita, 'recipe_ingredients'>): Macros {
  return sumarMacros(r.recipe_ingredients.map((i) => (i.foods ? macrosDe(i.foods, Number(i.quantity)) : { kcal: 0, p: 0, c: 0, g: 0 })))
}

function nombreIngrediente(i: Ingrediente, lang: string) {
  return i.foods ? nombreEnIdioma(i.foods, lang) : (i.food_name_snapshot ?? '')
}

export function FranjaMacros({ m }: { m: Macros }) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-4 text-center py-2 bg-[#252525]">
      {([[t('projetos:rec.kcal'), Math.round(m.kcal), '#64B5F6'], [t('projetos:rec.proteins'), m.p.toFixed(1) + 'g', '#E57373'], [t('projetos:rec.carbs'), m.c.toFixed(1) + 'g', '#FFD54F'], [t('projetos:rec.fats'), m.g.toFixed(1) + 'g', '#81C784']] as const).map(([l, v, c]) => (
        <div key={l}><div className="text-rt-14 font-bold" style={{ color: c }}>{v}</div><div className="text-grey-500 text-rt-9">{l}</div></div>
      ))}
    </div>
  )
}

export function RecipesTab({ query, filtro }: { query: string; filtro: Filtro }) {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [items, setItems] = useState<Receita[]>([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [formAbierto, setFormAbierto] = useState<Receita | 'nueva' | null>(null)
  const [expandidas, setExpandidas] = useState<string[]>([])
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [borrando, setBorrando] = useState<Receita[] | null>(null)
  const [aviso, setAviso] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const { data, error } = await supabase.from('recipes').select(SELECT_RECEITA).eq('owner_id', profile.id).order('created_at')
    setErrorCarga(Boolean(error))
    setItems((data as Receita[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [profile?.id])

  const filtered = items
    .filter((r) => (filtro === 'favoritos' ? r.is_favorite : true))
    .filter((r) => coincide(query, textosReceta(r, r.recipe_ingredients.map((i) => i.foods ?? { name: i.food_name_snapshot }))))

  async function favorito(r: Receita) {
    setItems((p) => p.map((x) => (x.id === r.id ? { ...x, is_favorite: !x.is_favorite } : x)))
    const { error } = await supabase.from('recipes').update({ is_favorite: !r.is_favorite }).eq('id', r.id)
    if (error) { setAviso({ kind: 'error', message: mensajeError(error) }); void load() }
  }

  async function duplicar(r: Receita) {
    const { id: _id, recipe_ingredients, created_at: _c, is_favorite: _f, ...resto } = r
    const { data, error } = await supabase.from('recipes').insert({ ...resto, name: t('general:ui.copy', { name: r.name }), is_favorite: false }).select('id').single()
    if (error) { setAviso({ kind: 'error', message: mensajeError(error) }); return }
    if (recipe_ingredients.length > 0) {
      await supabase.from('recipe_ingredients').insert(recipe_ingredients.map((i) => ({
        recipe_id: data.id, food_id: i.food_id, food_name_snapshot: i.food_name_snapshot, quantity: i.quantity, unit: i.unit, position: i.position,
      })))
    }
    setAviso({ kind: 'success', message: t('projetos:rec.duplicated') })
    await load()
  }

  async function borrar() {
    if (!borrando) return
    const ids = borrando.map((r) => r.id)
    const { error } = await supabase.from('recipes').delete().in('id', ids)
    setBorrando(null)
    if (error) { setAviso({ kind: 'error', message: mensajeError(error) }); return }
    setSeleccion((p) => p.filter((x) => !ids.includes(x)))
    await load()
  }

  return (
    <div className="pb-24">
      {seleccion.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2.5 mb-3 bg-brand/10 backdrop-blur flex items-center gap-3">
          <span className="text-brand text-rt-13 font-semibold flex-1">{t('projetos:rec.nSelected', { n: seleccion.length })}</span>
          <button onClick={() => setBorrando(items.filter((r) => seleccion.includes(r.id)))} className="px-4 py-1.5 rounded-[8px] bg-danger/10 border border-danger/30 text-[#EF5350] text-rt-13 font-semibold">{t('projetos:c.delete')}</button>
          <button onClick={() => setSeleccion([])} className="text-grey-400 text-rt-13">{t('projetos:c.cancel')}</button>
        </div>
      )}

      {loading ? (
        <div className="py-10 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></div>
      ) : errorCarga ? (
        <div className="flex flex-col items-center gap-2 py-12">
          <AlertCircle size={48} className="text-grey-500" />
          <span className="text-white/70 text-rt-14">{t('projetos:rec.loadError')}</span>
          <button onClick={() => void load()} className="text-brand text-rt-13 font-semibold">{t('projetos:rec.tryAgain')}</button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title={t('projetos:rec.notFound')} body={t('projetos:rec.createFirst')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((r) => (
            <TarjetaReceita
              key={r.id}
              r={r}
              lang={lang}
              expandida={expandidas.includes(r.id)}
              seleccionada={seleccion.includes(r.id)}
              onExpandir={() => setExpandidas((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))}
              onMarcar={() => setSeleccion((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))}
              onFavorito={() => void favorito(r)}
              onDuplicar={() => void duplicar(r)}
              onEditar={() => setFormAbierto(r)}
              onExcluir={() => setBorrando([r])}
            />
          ))}
        </ul>
      )}

      <FixedBottomActions>
        <button className="w-full h-12 rounded-[12px] bg-[#2D2D2D] border border-[#616161] text-white text-rt-14 font-semibold flex items-center justify-center gap-2" onClick={() => setFormAbierto('nueva')}>
          <Plus size={18} /> {t('projetos:rec.newRecipe')}
        </button>
      </FixedBottomActions>

      {formAbierto && (
        <RecipeSheet
          receita={formAbierto === 'nueva' ? undefined : formAbierto}
          onClose={() => setFormAbierto(null)}
          onSaved={() => { setFormAbierto(null); void load() }}
        />
      )}
      {borrando && (
        <ConfirmDialog
          message={borrando.length === 1 ? t('projetos:rec.removeOne') : t('projetos:rec.deleteMany', { n: borrando.length })}
          detail={borrando.length === 1 ? t('projetos:rec.deleteOneDetail', { name: borrando[0].name }) : t('projetos:rec.cantUndo')}
          confirmLabel={t('projetos:c.delete')}
          tone="danger"
          onConfirm={() => void borrar()}
          onCancel={() => setBorrando(null)}
        />
      )}
      {aviso && <FeedbackDialog kind={aviso.kind} message={aviso.message} onClose={() => setAviso(null)} />}
    </div>
  )
}

function TarjetaReceita({ r, lang, expandida, seleccionada, onExpandir, onMarcar, onFavorito, onDuplicar, onEditar, onExcluir }: {
  r: Receita
  lang: string
  expandida: boolean
  seleccionada: boolean
  onExpandir: () => void
  onMarcar: () => void
  onFavorito: () => void
  onDuplicar: () => void
  onEditar: () => void
  onExcluir: () => void
}) {
  const { t } = useTranslation()
  const { dx, abierto, handlers, cerrar, fueArrastre } = useDeslizar(210)
  const m = macrosReceita(r)
  const pasos = r.steps.filter((s) => s.trim())
  return (
    <li className={'rounded-[16px] overflow-hidden border ' + (seleccionada ? 'border-2 border-brand bg-brand/[0.08]' : 'border-brand/30 bg-[#1E1E1E]')}>
      <FranjaMacros m={m} />
      <div className="relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 flex w-[210px]">
          {([['projetos:rec.duplicate', Copy, 'bg-[#616161]', onDuplicar], ['projetos:rec.edit', Pencil, 'bg-[#757575]', onEditar], ['projetos:rec.delete', Trash2, 'bg-[#B71C1C]', onExcluir]] as const).map(([etq, I, c, fn]) => (
            <button key={etq} onClick={() => { cerrar(); fn() }} className={'flex-1 flex flex-col items-center justify-center gap-1 text-white ' + c}>
              <I size={18} /><span className="text-[9px] font-semibold">{t(etq)}</span>
            </button>
          ))}
        </div>
        <div
          {...handlers}
          onClick={() => { if (fueArrastre()) return; if (abierto) { cerrar(); return } onExpandir() }}
          style={{ transform: `translateX(${dx}px)` }}
          className="relative bg-[#1E1E1E] px-4 py-3.5 flex items-center gap-3 transition-transform touch-pan-y select-none cursor-pointer min-h-[95px]"
        >
          <button onClick={(e) => { e.stopPropagation(); onMarcar() }} aria-label={seleccionada ? t('projetos:c.unmark') : t('projetos:c.mark')}
            className={'w-[22px] h-[22px] rounded-[6px] border-2 flex items-center justify-center shrink-0 text-rt-12 ' + (seleccionada ? 'bg-brand border-brand text-white' : 'border-grey-500')}>
            {seleccionada && '✓'}
          </button>
          {r.cover_url && <img src={r.cover_url} alt="" className="w-14 h-14 rounded-[10px] object-cover shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="text-white text-rt-15 font-semibold truncate">{r.name}</div>
            <div className="flex gap-1.5 mt-1">
              <span className="text-rt-10 px-2 py-0.5 rounded-[8px] bg-[#333333] text-grey-400 truncate">{etiquetaDe(categoriasReceita, r.category, lang)}</span>
              <span className="text-rt-10 px-2 py-0.5 rounded-[8px] bg-[#333333] text-grey-400 shrink-0">{etiquetaDe(temposReceita, r.time_estimate, lang)}</span>
            </div>
            <div className="text-grey-500 text-rt-11 mt-1">{t('projetos:rec.counts', { i: r.recipe_ingredients.length, s: pasos.length })}</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onFavorito() }} aria-label={t('projetos:c.favorite')} className="p-0.5 shrink-0">
            <Star size={22} className={r.is_favorite ? 'text-[#FFD54F] fill-[#FFD54F]' : 'text-grey-500'} />
          </button>
          <ChevronLeft size={20} className={'text-grey-500 shrink-0 transition-transform ' + (expandida ? '-rotate-90' : '')} />
        </div>
      </div>
      {expandida && <DetalleReceita r={r} lang={lang} />}
    </li>
  )
}

export function DetalleReceita({ r, lang }: { r: Pick<Receita, 'prep_type' | 'time_estimate' | 'utensils' | 'recipe_ingredients' | 'steps' | 'tips' | 'video_url'>; lang: string }) {
  const { t } = useTranslation()
  const pasos = r.steps.filter((s) => s.trim())
  return (
    <div className="px-4 pb-4 pt-1 flex flex-col gap-4 border-t border-[#333333]">
      <div className="flex gap-2 mt-3">
        <span className="flex items-center gap-1 text-rt-11 px-2.5 py-1 rounded-[10px] bg-brand/10 text-brand"><UtensilsCrossed size={13} />{etiquetaDe(tiposPreparo, r.prep_type, lang)}</span>
        <span className="flex items-center gap-1 text-rt-11 px-2.5 py-1 rounded-[10px] bg-brand/10 text-brand"><Timer size={13} />{etiquetaDe(temposReceita, r.time_estimate, lang)}</span>
      </div>
      {r.utensils.length > 0 && (
        <div>
          <div className="text-grey-400 text-rt-12 font-semibold mb-1.5">{t('projetos:rec.utensils')}</div>
          <div className="flex flex-wrap gap-1.5">{r.utensils.map((u) => <span key={u} className="text-rt-11 px-2.5 py-1 rounded-[12px] bg-[#333333] text-white/80">{etiquetaDe(utensiliosReceita, u, lang)}</span>)}</div>
        </div>
      )}
      <div>
        <div className="text-grey-400 text-rt-12 font-semibold mb-1.5">{t('projetos:rec.ingredientsN', { n: r.recipe_ingredients.length })}</div>
        <ul className="flex flex-col gap-1">
          {r.recipe_ingredients.slice().sort((a, b) => a.position - b.position).map((i, n) => (
            <li key={i.id ?? n} className="flex items-center gap-2">
              <span className="w-[5px] h-[5px] rounded-full bg-brand shrink-0" />
              <span className="flex-1 text-white text-rt-12">{Number(i.quantity)}{abreviaturaUnidad(i.unit ?? i.foods?.unit)} {nombreIngrediente(i, lang)}</span>
              {i.foods && <span className="text-grey-500 text-rt-10">{Math.round(macrosDe(i.foods, Number(i.quantity)).kcal)} kcal</span>}
            </li>
          ))}
        </ul>
      </div>
      {pasos.length > 0 && (
        <div>
          <div className="text-grey-400 text-rt-12 font-semibold mb-1.5">{t('projetos:rec.stepsN', { n: pasos.length })}</div>
          <ol className="flex flex-col gap-2">
            {pasos.map((p, n) => (
              <li key={n} className="flex gap-2.5">
                <span className="w-[22px] h-[22px] rounded-full bg-brand/15 text-brand text-rt-11 font-bold flex items-center justify-center shrink-0">{n + 1}</span>
                <span className="text-white text-rt-12 leading-relaxed">{p}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {r.tips && (
        <div className="rounded-[8px] bg-[#FFD54F]/[0.08] border border-[#FFD54F]/20 p-3 flex gap-2">
          <Lightbulb size={16} className="text-[#FFD54F] shrink-0 mt-0.5" /><span className="text-white/80 text-rt-12">{r.tips}</span>
        </div>
      )}
      {r.video_url && (
        <a href={r.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand text-rt-12 font-semibold"><Video size={16} /> {t('projetos:rec.watchVideo')}</a>
      )}
    </div>
  )
}

type IngForm = { food: Food; cantidad: number }

function RecipeSheet({ receita, onClose, onSaved }: { receita?: Receita; onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [nombre, setNombre] = useState(receita?.name ?? '')
  const [categoria, setCategoria] = useState(receita?.category ?? 'outro')
  const [preparo, setPreparo] = useState(receita?.prep_type ?? 'facil')
  const [tiempo, setTiempo] = useState(receita?.time_estimate ?? 'lt30')
  const [utensilios, setUtensilios] = useState<string[]>(receita?.utensils ?? [])
  const [ings, setIngs] = useState<IngForm[]>(() =>
    (receita?.recipe_ingredients ?? []).slice().sort((a, b) => a.position - b.position)
      .filter((i) => i.foods).map((i) => ({ food: i.foods!, cantidad: Number(i.quantity) })))
  const [pasos, setPasos] = useState<string[]>(receita?.steps.length ? receita.steps : [''])
  const [dicas, setDicas] = useState(receita?.tips ?? '')
  const [foto, setFoto] = useState(receita?.cover_url ?? '')
  const esYoutube = (u: string) => /youtu\.?be/.test(u)
  const [pestanaVideo, setPestanaVideo] = useState<'youtube' | 'subir'>(receita?.video_url && !esYoutube(receita.video_url) ? 'subir' : 'youtube')
  const [video, setVideo] = useState(receita?.video_url ?? '')
  const [abriendo, setAbriendo] = useState<'categoria' | 'preparo' | 'tiempo' | null>(null)
  const [agregandoIng, setAgregandoIng] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<{ nombre?: string; banner?: string }>({})

  const totales = sumarMacros(ings.map((i) => macrosDe(i.food, i.cantidad)))

  async function guardar() {
    if (!nombre.trim()) { setError({ nombre: t('projetos:rec.nameReq'), banner: t('projetos:rec.fillRequired') }); return }
    if (!profile?.id) return
    setError({})
    setGuardando(true)
    const campos = {
      name: nombre.trim(),
      category: categoria,
      prep_type: preparo,
      time_estimate: tiempo,
      utensils: utensilios,
      steps: pasos.map((p) => p.trim()).filter(Boolean),
      tips: dicas.trim() || null,
      cover_url: foto || null,
      video_url: video.trim() || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error: e1 } = receita
      ? await supabase.from('recipes').update(campos).eq('id', receita.id).select('id').single()
      : await supabase.from('recipes').insert({ owner_id: profile.id, ...campos }).select('id').single()
    if (e1) { setGuardando(false); setError({ banner: t('projetos:rec.saveError', { msg: e1.message }) }); return }
    // Los ingredientes se reescriben: son pocos y así el orden queda como en el formulario.
    if (receita) await supabase.from('recipe_ingredients').delete().eq('recipe_id', receita.id)
    if (ings.length > 0) {
      const { error: e2 } = await supabase.from('recipe_ingredients').insert(ings.map((i, n) => ({
        recipe_id: data.id, food_id: i.food.id, food_name_snapshot: nombreEnIdioma(i.food, 'pt'),
        quantity: i.cantidad, unit: i.food.unit ?? 'g', position: n,
      })))
      if (e2) { setGuardando(false); setError({ banner: t('projetos:rec.saveIngError', { msg: e2.message }) }); return }
    }
    setGuardando(false)
    onSaved()
  }

  const campo = 'w-full px-4 rounded-[12px] bg-[#252525] border border-[#333333] text-white text-rt-15 placeholder:text-grey-600 outline-none focus:border-brand'

  return (
    <FullScreenSheet title={receita ? t('projetos:rec.editTitle') : t('projetos:rec.newRecipe')} onClose={onClose}>
      {error.banner && <div className="mb-5 rounded-[12px] bg-danger/15 border border-danger/40 px-4 py-3 text-[#EF9A9A] text-rt-13">{error.banner}</div>}
      <div className="flex flex-col gap-6">
        <div>
          <label className="block text-white text-rt-13 font-semibold mb-2">{t('projetos:rec.name')}</label>
          <input className={campo + ' h-[52px] ' + (error.nombre ? 'border-danger' : '')} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={t('projetos:rec.namePh')} />
          {error.nombre && <div className="text-danger text-rt-11 mt-1">{error.nombre}</div>}
        </div>
        <CajaSelector label={t('projetos:rec.category')} valor={categoria} placeholder={t('projetos:rec.otherPh')} lista={categoriasReceita} lang={lang} onAbrir={() => setAbriendo('categoria')} />
        <CajaSelector label={t('projetos:rec.prepType')} valor={preparo} placeholder={t('projetos:rec.easyPh')} lista={tiposPreparo} lang={lang} onAbrir={() => setAbriendo('preparo')} />
        <CajaSelector label={t('projetos:rec.time')} valor={tiempo} placeholder="< 30 min" lista={temposReceita} lang={lang} onAbrir={() => setAbriendo('tiempo')} />

        <div>
          <label className="block text-white text-rt-13 font-semibold mb-2">{t('projetos:rec.utensilsNeeded')}</label>
          <div className="flex flex-wrap gap-2">
            {utensiliosReceita.map((u) => {
              const on = utensilios.includes(u.id)
              return (
                <button key={u.id} type="button" onClick={() => setUtensilios((p) => (on ? p.filter((x) => x !== u.id) : [...p, u.id]))}
                  className={'px-3.5 py-2 rounded-[20px] border text-rt-12 ' + (on ? 'bg-brand/15 border-brand text-brand font-semibold' : 'bg-[#252525] border-[#333333] text-grey-400')}>
                  {etiquetaDe(utensiliosReceita, u.id, lang)}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-white text-rt-13 font-semibold mb-2">{t('projetos:rec.ingredients')}</label>
          {ings.length > 0 && (
            <>
              <div className="rounded-[12px] overflow-hidden mb-2"><FranjaMacros m={totales} /></div>
              <ul className="flex flex-col gap-2 mb-2">
                {ings.map((i) => (
                  <li key={i.food.id} className="rounded-[10px] bg-[#252525] border border-[#333333] px-3 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-rt-13 font-medium truncate">{nombreEnIdioma(i.food, lang)}</div>
                      <div className="text-grey-500 text-rt-11">{i.cantidad}{abreviaturaUnidad(i.food.unit)} • {Math.round(macrosDe(i.food, i.cantidad).kcal)} kcal</div>
                    </div>
                    <button type="button" onClick={() => setIngs((p) => p.filter((x) => x.food.id !== i.food.id))} aria-label={t('projetos:rec.removeIng')}><X size={18} className="text-[#EF5350]" /></button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <button type="button" onClick={() => setAgregandoIng(true)} className="w-full h-12 rounded-[12px] bg-[#252525] border border-brand/30 text-brand text-rt-14 font-semibold flex items-center justify-center gap-2">
            <Plus size={18} /> {t('projetos:rec.addIng')}
          </button>
        </div>

        <div>
          <label className="block text-white text-rt-13 font-semibold mb-2">{t('projetos:rec.steps')}</label>
          <ul className="flex flex-col gap-2 mb-2">
            {pasos.map((p, n) => (
              <li key={n} className="rounded-[10px] bg-[#252525] border border-[#333333] p-2.5 flex items-start gap-2.5">
                <span className="w-7 h-7 rounded-full bg-brand/15 text-brand text-rt-12 font-bold flex items-center justify-center shrink-0">{n + 1}</span>
                <textarea rows={2} value={p} onChange={(e) => setPasos((x) => x.map((y, k) => (k === n ? e.target.value : y)))} placeholder={t('projetos:rec.stepPh', { n: n + 1 })}
                  className="flex-1 bg-transparent text-white text-rt-13 outline-none resize-none placeholder:text-grey-600" />
                <button type="button" onClick={() => setPasos((x) => x.filter((_, k) => k !== n))} aria-label={t('projetos:rec.removeStep')}><X size={18} className="text-[#EF5350]" /></button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setPasos((x) => [...x, ''])} className="w-full h-12 rounded-[12px] bg-[#252525] border border-brand/30 text-brand text-rt-14 font-semibold flex items-center justify-center gap-2">
            <Plus size={18} /> {t('projetos:rec.addStep')}
          </button>
        </div>

        <div>
          <label className="block text-white text-rt-13 font-semibold mb-2">{t('projetos:rec.tips')}</label>
          <textarea rows={3} className={campo + ' py-3 resize-none'} value={dicas} onChange={(e) => setDicas(e.target.value)} placeholder={t('projetos:rec.tipsPh')} />
        </div>

        {foto ? (
          <SubirArchivo etiqueta={t('projetos:rec.photo')} accept="image/*" url={foto} textoActual={t('projetos:rec.photoCurrent')} textoElegir="" imagen onSubiendo={setSubiendo} onSubido={setFoto} onError={(m) => setError({ banner: m })} />
        ) : (
          <div>
            <label className="block text-white text-rt-13 font-semibold mb-2">{t('projetos:rec.photo')}</label>
            <div className="rounded-[12px] bg-[#252525] p-5 flex flex-col items-center gap-2">
              <Camera size={40} className="text-grey-500" />
              <span className="text-grey-500 text-rt-12">{t('projetos:rec.pickPhoto')}</span>
              <SubirArchivo etiqueta="" accept="image/*" url="" textoActual="" textoElegir={t('projetos:rec.select')} imagen onSubiendo={setSubiendo} onSubido={setFoto} onError={(m) => setError({ banner: m })} />
            </div>
          </div>
        )}

        <div>
          <label className="block text-white text-rt-13 font-semibold mb-2">{t('projetos:rec.video')}</label>
          <div className="rounded-[12px] bg-[#252525] p-3">
            <div className="flex gap-2 mb-3">
              {([['youtube', t('projetos:rec.youtube'), Link2], ['subir', t('projetos:rec.upload'), Video]] as const).map(([id, txt, I]) => (
                <button key={id} type="button" onClick={() => { if (id !== pestanaVideo) setVideo(''); setPestanaVideo(id) }}
                  className={'flex-1 h-10 rounded-[10px] border text-rt-12 font-semibold flex items-center justify-center gap-1.5 ' + (pestanaVideo === id ? 'bg-brand/15 border-brand text-brand' : 'border-[#333333] text-grey-400')}>
                  <I size={15} />{txt}
                </button>
              ))}
            </div>
            {pestanaVideo === 'youtube' ? (
              <input className={campo + ' h-12 bg-[#1E1E1E]'} value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            ) : (
              <SubirArchivo etiqueta="" accept="video/*" url={video} textoActual={t('projetos:rec.videoCurrent')} textoElegir={t('projetos:rec.pickVideo')} onSubiendo={setSubiendo} onSubido={setVideo} onError={(m) => setError({ banner: m })} />
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button className="btn-save" disabled={guardando || subiendo} onClick={() => void guardar()}>
          {subiendo ? t('projetos:rec.uploading') : guardando ? t('projetos:c.saving') : receita ? t('projetos:rec.save') : t('projetos:rec.create')}
        </button>
      </div>

      {abriendo === 'categoria' && <HojaRadio lista={categoriasReceita} valor={categoria} lang={lang} onElegir={(id) => { setCategoria(id); setAbriendo(null) }} onCerrar={() => setAbriendo(null)} />}
      {abriendo === 'preparo' && <HojaRadio lista={tiposPreparo} valor={preparo} lang={lang} onElegir={(id) => { setPreparo(id); setAbriendo(null) }} onCerrar={() => setAbriendo(null)} />}
      {abriendo === 'tiempo' && <HojaRadio lista={temposReceita} valor={tiempo} lang={lang} onElegir={(id) => { setTiempo(id); setAbriendo(null) }} onCerrar={() => setAbriendo(null)} />}
      {agregandoIng && (
        <AdicionarAlimentos
          bloqueados={ings.map((i) => i.food.id)}
          onCerrar={() => setAgregandoIng(false)}
          onAgregar={(elegidos: AlimentoElegido[]) => {
            setIngs((p) => [...p, ...elegidos.map((e) => ({ food: e.food, cantidad: e.cantidad }))])
            setAgregandoIng(false)
          }}
        />
      )}
    </FullScreenSheet>
  )
}

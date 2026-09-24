import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Minus, Search, X, Ban, Star, Check, ChevronDown, UtensilsCrossed } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useFavoritos } from '@/lib/favoritos'
import { HojaRadio } from '@/components/professor/SelectorRadio'
import { categoriasAlimento, abreviaturaUnidad, etiquetaDe } from '@/lib/catalogos'
import { nombreEjercicio as nombreEnIdioma } from '@/lib/nombreEjercicio'
import { pasoDe, redondear, macrosDe } from '@/lib/nutricion'
import { ESTILO_CATEGORIA, FoodSheet, coincideBusqueda, porcionDe, type Food } from './FoodsTab'

export type AlimentoElegido = { food: Food; cantidad: number }

/** Hoja 'Adicionar Alimentos': alimentos con cantidad para una refeição o una receita. */
export function AdicionarAlimentos({ bloqueados, onCerrar, onAgregar, extraArriba }: {
  bloqueados: string[]
  onCerrar: () => void
  onAgregar: (elegidos: AlimentoElegido[]) => Promise<void> | void
  /** Contenido opcional arriba de la lista (el toggle Alimentos/Receitas de las dietas). */
  extraArriba?: React.ReactNode
}) {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [items, setItems] = useState<Food[] | null>(null)
  const [pestana, setPestana] = useState<'todos' | 'favoritos' | 'meus'>('todos')
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [abriendoCat, setAbriendoCat] = useState(false)
  const [elegidos, setElegidos] = useState<AlimentoElegido[]>([])
  const [editandoCantidad, setEditandoCantidad] = useState<{ id: string; final: boolean } | null>(null)
  const [definiendo, setDefiniendo] = useState(false)
  const [creando, setCreando] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const { esFavorito, alternar } = useFavoritos('food')

  async function cargar() {
    const { data } = await supabase.from('foods').select('*').order('name')
    setItems((data as Food[]) ?? [])
  }
  useEffect(() => { void cargar() }, [])

  const ya = useMemo(() => new Set(bloqueados), [bloqueados])
  const lista = (items ?? [])
    .filter((f) => (pestana === 'favoritos' ? esFavorito(f.id) : pestana === 'meus' ? f.trainer_id === profile?.id : true))
    .filter((f) => !categoria || (f.category ?? 'none') === categoria)
    .filter((f) => coincideBusqueda(f, busca))
    .sort((a, b) => nombreEnIdioma(a, lang).localeCompare(nombreEnIdioma(b, lang)))

  function alternarElegido(f: Food) {
    setElegidos((p) => p.some((e) => e.food.id === f.id)
      ? p.filter((e) => e.food.id !== f.id)
      : [...p, { food: f, cantidad: Number(f.portion_qty ?? 100) }])
  }

  async function finalizar(lista = elegidos) {
    setAgregando(true)
    await onAgregar(lista)
    setAgregando(false)
  }

  const n = elegidos.length
  const editando = editandoCantidad ? elegidos.find((e) => e.food.id === editandoCantidad.id) : null

  return (
    <div className="fixed inset-0 z-40 bg-[#1E1E1E] flex flex-col">
      <div className="max-w-app w-full mx-auto flex flex-col flex-1 min-h-0 pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="px-5 flex items-center justify-between">
          <h1 className="text-white text-rt-20 font-bold">{t('projetos:aa.title')}</h1>
          <button onClick={onCerrar} aria-label={t('projetos:c.close')} className="w-9 h-9 rounded-full bg-[#333333] flex items-center justify-center"><X size={20} className="text-white" /></button>
        </div>
        {extraArriba}
        <div className="flex gap-2 px-5 mt-4 overflow-x-auto no-scrollbar">
          {([['todos', t('projetos:c.all')], ['favoritos', t('projetos:c.favorites')], ['meus', t('projetos:aa.myFoods')]] as const).map(([id, txt]) => (
            <button key={id} onClick={() => setPestana(id)}
              className={'shrink-0 px-5 h-10 rounded-btn-pill border text-rt-13 font-semibold ' + (pestana === id ? 'bg-brand border-brand text-white' : 'bg-[#2D2D2D] border-[#616161] text-white/80')}>
              {txt}
            </button>
          ))}
        </div>
        <div className="flex gap-2 px-5 mt-4">
          <button onClick={() => setCreando(true)} aria-label={t('projetos:aa.newFood')} className="w-12 h-12 rounded-[12px] bg-brand flex items-center justify-center shrink-0"><Plus size={24} className="text-white" /></button>
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t('projetos:aa.searchPh')}
              className="w-full h-12 pl-10 pr-9 rounded-[12px] bg-[#252525] border border-[#333333] text-white text-rt-14 outline-none focus:border-brand" />
            {busca && <button onClick={() => setBusca('')} aria-label={t('projetos:c.clearSearch')} className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-500"><X size={16} /></button>}
          </div>
        </div>
        <div className="flex items-center gap-2 px-5 mt-3">
          <button onClick={() => setAbriendoCat(true)} className="flex-1 h-11 px-3 rounded-[12px] bg-[#252525] border border-[#333333] flex items-center gap-1">
            <span className={'flex-1 text-left text-rt-12 ' + (categoria ? 'text-white' : 'text-[#757575]')}>{categoria ? etiquetaDe(categoriasAlimento, categoria, lang) : t('projetos:aa.categories')}</span>
            <ChevronDown size={16} className="text-[#757575]" />
          </button>
          <button onClick={() => { setCategoria(''); setBusca('') }} className="text-[#EF5350] text-rt-14 font-semibold px-1">{t('projetos:c.clear')}</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4">
          {items === null ? (
            <div className="py-10 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></div>
          ) : lista.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12"><UtensilsCrossed size={48} className="text-[#616161]" /><span className="text-white/60 text-rt-13">{t('projetos:aa.notFound')}</span></div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {lista.map((f) => {
                const bloqueado = ya.has(f.id)
                const elegido = elegidos.find((e) => e.food.id === f.id)
                const est = ESTILO_CATEGORIA[f.category ?? 'none'] ?? ESTILO_CATEGORIA.none
                return (
                  <li key={f.id} onClick={() => { if (!bloqueado) alternarElegido(f) }}
                    className={'rounded-[12px] bg-[#252525] p-3 flex items-center gap-3 ' + (elegido ? 'border-2 border-brand' : 'border border-[#333333]') + (bloqueado ? ' opacity-40' : ' cursor-pointer')}>
                    {bloqueado
                      ? <span className="w-6 h-6 rounded-[6px] bg-[#424242] flex items-center justify-center shrink-0"><Ban size={14} className="text-grey-400" /></span>
                      : <span className={'w-6 h-6 rounded-[6px] border-2 flex items-center justify-center shrink-0 ' + (elegido ? 'bg-brand border-brand' : 'border-[#757575]')}>{elegido && <Check size={14} className="text-white" />}</span>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white text-rt-13 font-semibold truncate">{nombreEnIdioma(f, lang)}</span>
                        <span className={'shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-[10px] ' + est.textoBadge} style={{ background: est.color }}>{etiquetaDe(categoriasAlimento, f.category ?? 'none', lang)}</span>
                      </div>
                      <div className="text-rt-10 mt-0.5">{bloqueado ? <span className="text-[#EF9A9A]">{t('projetos:aa.alreadyAdded')}</span> : <span className="text-grey-500">{porcionDe(f)}</span>}</div>
                      <div className="flex gap-2 text-rt-10 font-bold mt-0.5">
                        <span className="text-[#64B5F6]">{Math.round(Number(f.calories ?? 0))} kcal</span>
                        <span className="text-[#E57373]">{Number(f.protein_g ?? 0).toFixed(1)}g {t('projetos:al.pAbbr')}</span>
                        <span className="text-[#FFD54F]">{Number(f.carbs_g ?? 0).toFixed(1)}g {t('projetos:al.cAbbr')}</span>
                        <span className="text-[#81C784]">{Number(f.fats_g ?? 0).toFixed(1)}g {t('projetos:al.fAbbr')}</span>
                      </div>
                    </div>
                    {elegido && (
                      <button onClick={(ev) => { ev.stopPropagation(); setEditandoCantidad({ id: f.id, final: false }) }}
                        className="shrink-0 px-2.5 py-1.5 rounded-[8px] bg-[#333333] text-brand text-rt-12 font-semibold">
                        {elegido.cantidad}{abreviaturaUnidad(f.unit)}
                      </button>
                    )}
                    {!bloqueado && (
                      <button onClick={(ev) => { ev.stopPropagation(); void alternar(f.id) }} aria-label={t('projetos:c.favorite')} className="shrink-0 p-0.5">
                        <Star size={20} className={esFavorito(f.id) ? 'text-brand fill-brand' : 'text-grey-500'} />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {n > 0 && (
          <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-[#1E1E1E] shadow-[0_-6px_16px_rgba(0,0,0,0.4)]">
            <button
              disabled={agregando}
              onClick={() => (n === 1 ? setEditandoCantidad({ id: elegidos[0].food.id, final: true }) : setDefiniendo(true))}
              className="w-full h-[54px] rounded-[27px] bg-gradient-to-b from-[#91C145] to-[#5A8F2F] text-white text-rt-16 font-bold"
            >
              {n === 1 ? t('projetos:aa.defineOne') : t('projetos:aa.defineMany', { n })}
            </button>
          </div>
        )}
      </div>

      {abriendoCat && (
        <HojaRadio lista={categoriasAlimento} valor={categoria} lang={lang} onElegir={(id) => { setCategoria(id); setAbriendoCat(false) }} onCerrar={() => setAbriendoCat(false)} />
      )}
      {editando && editandoCantidad && (
        <HojaCantidad
          titulo={nombreEnIdioma(editando.food, lang)}
          unidad={editando.food.unit}
          inicial={editando.cantidad}
          boton={editandoCantidad.final ? t('projetos:aa.add') : t('projetos:aa.confirm')}
          onCerrar={() => setEditandoCantidad(null)}
          onListo={(cantidad) => {
            const sig = elegidos.map((e) => (e.food.id === editando.food.id ? { ...e, cantidad } : e))
            setElegidos(sig)
            const final = editandoCantidad.final
            setEditandoCantidad(null)
            if (final) void finalizar(sig)
          }}
        />
      )}
      {definiendo && (
        <DefinirCantidades
          elegidos={elegidos}
          lang={lang}
          onCerrar={() => setDefiniendo(false)}
          onListo={(sig) => { setElegidos(sig); setDefiniendo(false); void finalizar(sig) }}
        />
      )}
      {creando && (
        <FoodSheet
          onClose={() => setCreando(false)}
          onSaved={(f) => {
            setCreando(false)
            void cargar()
            setElegidos((p) => [...p, { food: f, cantidad: Number(f.portion_qty ?? 100) }])
            setEditandoCantidad({ id: f.id, final: true })
          }}
        />
      )}
    </div>
  )
}

function Stepper({ valor, unidad, onCambiar, grande }: { valor: string; unidad: string | null; onCambiar: (v: string) => void; grande?: boolean }) {
  const { t } = useTranslation()
  const { paso, minimo, decimales } = pasoDe(unidad)
  const num = Number(valor.replace(',', '.'))
  const mover = (d: number) => {
    const base = Number.isFinite(num) ? num : minimo
    onCambiar(String(redondear(Math.max(minimo, base + d * paso), decimales)))
  }
  const btn = grande ? 'w-12 h-12 rounded-[12px]' : 'w-8 h-8 rounded-[8px]'
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => mover(-1)} aria-label={t('projetos:aa.decrease')} className={btn + ' bg-[#333333] flex items-center justify-center shrink-0'}><Minus size={grande ? 22 : 16} className="text-white" /></button>
      <div className={'flex items-center justify-center gap-1 bg-[#252525] border border-[#333333] rounded-[12px] focus-within:border-brand ' + (grande ? 'flex-1 h-14' : 'w-[100px] h-9 bg-[#1E1E1E]')}>
        <input inputMode="decimal" value={valor} onChange={(e) => onCambiar(e.target.value.replace(/[^\d.,]/g, ''))}
          className={'bg-transparent text-white text-center outline-none min-w-0 ' + (grande ? 'text-[28px] font-bold w-28' : 'text-rt-14 font-semibold w-14')} />
        <span className="text-grey-500 text-rt-13">{abreviaturaUnidad(unidad).trim()}</span>
      </div>
      <button type="button" onClick={() => mover(1)} aria-label={t('projetos:aa.increase')} className={btn + ' bg-brand flex items-center justify-center shrink-0'}><Plus size={grande ? 22 : 16} className="text-white" /></button>
    </div>
  )
}

/** Cantidad válida (> 0) o la anterior: un valor inválido se ignora. */
function valida(txt: string, anterior: number) {
  const n = Number(txt.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : anterior
}

export function HojaCantidad({ titulo, unidad, inicial, boton, onCerrar, onListo }: {
  titulo: string
  unidad: string | null
  inicial: number
  boton: string
  onCerrar: () => void
  onListo: (cantidad: number) => void
}) {
  const { t } = useTranslation()
  const [valor, setValor] = useState(String(inicial))
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onCerrar}>
      <div className="w-full max-w-app rounded-t-[16px] bg-[#1E1E1E] p-6 pb-[calc(env(safe-area-inset-bottom)+20px)]" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-grey-600 mx-auto mb-4" />
        <h2 className="text-white text-rt-18 font-bold">{t('projetos:aa.quantity')}</h2>
        <p className="text-grey-500 text-rt-14 mb-5">{titulo}</p>
        <Stepper valor={valor} unidad={unidad} onCambiar={setValor} grande />
        <button onClick={() => onListo(valida(valor, inicial))}
          className="w-full h-12 mt-6 rounded-[12px] bg-gradient-to-b from-[#91C145] to-[#5A8F2F] text-white text-rt-16 font-bold">{boton}</button>
      </div>
    </div>
  )
}

function DefinirCantidades({ elegidos, lang, onCerrar, onListo }: {
  elegidos: AlimentoElegido[]
  lang: string
  onCerrar: () => void
  onListo: (sig: AlimentoElegido[]) => void
}) {
  const { t } = useTranslation()
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(elegidos.map((e) => [e.food.id, String(e.cantidad)])))
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onCerrar}>
      <div className="w-full max-w-app max-h-[80dvh] rounded-t-[16px] bg-[#1E1E1E] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 pb-3">
          <div className="w-10 h-1 rounded-full bg-grey-600 mx-auto mb-4" />
          <h2 className="text-white text-rt-18 font-bold">{t('projetos:aa.defineTitle')}</h2>
          <p className="text-grey-500 text-rt-12">{t('projetos:aa.nSelected', { n: elegidos.length })}</p>
        </div>
        <ul className="flex-1 overflow-y-auto px-5 flex flex-col gap-2">
          {elegidos.map(({ food }) => (
            <li key={food.id} className="rounded-[12px] bg-[#252525] border border-[#333333] p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-white text-rt-13 font-semibold truncate">{nombreEnIdioma(food, lang)}</div>
                <div className="text-grey-500 text-rt-10">{t('projetos:aa.kcalPer', { kcal: Math.round(macrosDe(food, Number(food.portion_qty ?? 100)).kcal), portion: porcionDe(food) })}</div>
              </div>
              <Stepper valor={valores[food.id]} unidad={food.unit} onCambiar={(v) => setValores((p) => ({ ...p, [food.id]: v }))} />
            </li>
          ))}
        </ul>
        <div className="p-5 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button
            onClick={() => onListo(elegidos.map((e) => ({ ...e, cantidad: valida(valores[e.food.id], e.cantidad) })))}
            className="w-full h-[54px] rounded-[27px] bg-gradient-to-b from-[#91C145] to-[#5A8F2F] text-white text-rt-16 font-bold"
          >
            {t('projetos:aa.addN', { n: elegidos.length })}
          </button>
        </div>
      </div>
    </div>
  )
}

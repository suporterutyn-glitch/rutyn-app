import { useEffect, useMemo, useState } from 'react'
import { coincide, textosEjercicio } from '@/lib/busqueda'
import { useTranslation } from 'react-i18next'
import { Plus, Search, X, Ban, Pencil, Star, Check, ChevronDown, Dumbbell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useFavoritos } from '@/lib/favoritos'
import { HojaRadio } from '@/components/professor/SelectorRadio'
import { MiniaturaMedia } from '@/components/MediaExercicio'
import { gruposMusculares, categoriasExercicio, etiquetasDe, etiquetaDe } from '@/lib/catalogos'
import { nombreEjercicio, type ConTraducciones } from '@/lib/nombreEjercicio'
import { NewExerciseSheet } from './ExercisesTab'

export type EjercicioCatalogo = {
  id: string
  trainer_id: string | null
  muscle_group: string | null
  muscle_groups: string[] | null
  category: string | null
  extra_categories?: string[] | null
  media_type: string | null
  video_url: string | null
  thumbnail_url: string | null
  description: string | null
  equipment?: string | null
} & ConTraducciones

/** Modal 'Adicionar Exercícios': selección múltiple del catálogo para anexar a la rutina. */
export function AdicionarExercicios({ yaEnRutina, onCerrar, onAgregar }: {
  yaEnRutina: string[]
  onCerrar: () => void
  onAgregar: (ejercicios: EjercicioCatalogo[]) => Promise<void>
}) {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [items, setItems] = useState<EjercicioCatalogo[] | null>(null)
  const [pestana, setPestana] = useState<'todos' | 'favoritos' | 'meus'>('todos')
  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState('')
  const [categoria, setCategoria] = useState('')
  const [abriendo, setAbriendo] = useState<'grupo' | 'categoria' | null>(null)
  const [marcados, setMarcados] = useState<string[]>([])
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<EjercicioCatalogo | null>(null)
  const [agregando, setAgregando] = useState(false)
  const { esFavorito, alternar } = useFavoritos('exercise')

  async function cargar() {
    const { data } = await supabase.from('exercises').select('*').order('name')
    setItems((data as EjercicioCatalogo[]) ?? [])
  }
  useEffect(() => { void cargar() }, [])

  useEffect(() => {
    const t = window.setTimeout(() => setBusca(texto), 250)
    return () => window.clearTimeout(t)
  }, [texto])

  const ya = useMemo(() => new Set(yaEnRutina), [yaEnRutina])

  // En los filtros solo aparecen grupos y categorías que tienen ejercicios.
  const gruposConEjercicios = useMemo(() => {
    const usados = new Set((items ?? []).flatMap((e) => (e.muscle_groups?.length ? e.muscle_groups : [e.muscle_group])))
    return gruposMusculares.filter((g) => usados.has(g.id))
  }, [items])
  const categoriasConEjercicios = useMemo(() => {
    const usadas = new Set((items ?? []).flatMap((e) => [e.category, ...(e.extra_categories ?? [])]))
    return categoriasExercicio.filter((c) => usadas.has(c.id))
  }, [items])

  const lista = useMemo(() => {
    return (items ?? [])
      .filter((e) => (pestana === 'favoritos' ? esFavorito(e.id) : pestana === 'meus' ? e.trainer_id === profile?.id : true))
      .filter((e) => !grupo || (e.muscle_groups?.length ? e.muscle_groups : [e.muscle_group]).includes(grupo))
      .filter((e) => !categoria || e.category === categoria || !!e.extra_categories?.includes(categoria))
      .filter((e) => coincide(busca, textosEjercicio(e)))
      .sort((a, b) => nombreEjercicio(a, lang).localeCompare(nombreEjercicio(b, lang)))
  }, [items, pestana, grupo, categoria, busca, esFavorito, profile?.id, lang])

  function alternarMarca(id: string) {
    setMarcados((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  async function agregar() {
    setAgregando(true)
    const elegidos = marcados.map((id) => items!.find((e) => e.id === id)!).filter(Boolean)
    await onAgregar(elegidos)
    setAgregando(false)
  }

  const n = marcados.length

  return (
    <div className="fixed inset-0 z-40 bg-[#1E1E1E] flex flex-col">
      <div className="max-w-app w-full mx-auto flex flex-col flex-1 min-h-0 pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="px-5 flex items-center justify-between">
          <h1 className="text-white text-rt-20 font-bold">{t('projetos:pick.title')}</h1>
          <button onClick={onCerrar} aria-label={t('projetos:c.close')} className="w-9 h-9 rounded-full bg-[#333333] flex items-center justify-center">
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="flex gap-2 px-5 mt-4 overflow-x-auto no-scrollbar">
          {([['todos', t('projetos:c.all')], ['favoritos', t('projetos:c.favorites')], ['meus', t('projetos:pick.myExercises')]] as const).map(([id, txt]) => (
            <button
              key={id}
              onClick={() => setPestana(id)}
              className={'shrink-0 px-5 h-10 rounded-btn-pill border text-rt-13 font-semibold ' +
                (pestana === id ? 'bg-brand border-brand text-white' : 'bg-[#2D2D2D] border-[#616161] text-white/80')}
            >
              {txt}
            </button>
          ))}
        </div>

        <div className="flex gap-2 px-5 mt-4">
          <button onClick={() => setCreando(true)} aria-label={t('projetos:pick.newExercise')} className="w-12 h-12 rounded-[12px] bg-brand flex items-center justify-center shrink-0">
            <Plus size={24} className="text-white" />
          </button>
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={t('projetos:pick.searchPh')}
              className="w-full h-12 pl-10 pr-9 rounded-[12px] bg-[#252525] border border-[#333333] text-white text-rt-14 outline-none focus:border-brand"
            />
            {texto && (
              <button onClick={() => setTexto('')} aria-label={t('projetos:c.clearSearch')} className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-500">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 mt-3">
          <Filtro etiqueta={t('projetos:ex.muscleGroup')} valor={grupo && etiquetaDe(gruposMusculares, grupo, lang)} onClick={() => setAbriendo('grupo')} />
          <Filtro etiqueta={t('projetos:pick.categories')} valor={categoria && etiquetaDe(categoriasExercicio, categoria, lang)} onClick={() => setAbriendo('categoria')} />
          <button
            onClick={() => { setGrupo(''); setCategoria(''); setTexto(''); setBusca('') }}
            className="shrink-0 text-[#EF5350] text-rt-14 font-semibold px-1"
          >
            {t('projetos:c.clear')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4">
          {items === null ? (
            <div className="py-10 flex justify-center"><span className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" /></div>
          ) : lista.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12">
              <Dumbbell size={48} className="text-[#616161]" />
              <span className="text-white/60 text-rt-13">{t('projetos:pick.notFound')}</span>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {lista.map((e) => {
                const bloqueado = ya.has(e.id)
                const on = marcados.includes(e.id)
                const tags = [
                  ...etiquetasDe(gruposMusculares, e.muscle_groups?.length ? e.muscle_groups : (e.muscle_group ? [e.muscle_group] : []), lang),
                  ...(e.category ? [etiquetaDe(categoriasExercicio, e.category, lang)] : []),
                ]
                return (
                  <li
                    key={e.id}
                    onClick={() => { if (!bloqueado) alternarMarca(e.id) }}
                    className={'rounded-[12px] bg-[#252525] p-2.5 flex items-center gap-3 ' +
                      (on ? 'border-2 border-brand' : 'border border-[#333333]') + (bloqueado ? ' opacity-40' : ' cursor-pointer')}
                  >
                    {bloqueado ? (
                      <span className="w-6 h-6 rounded-[6px] bg-[#424242] flex items-center justify-center shrink-0"><Ban size={14} className="text-grey-400" /></span>
                    ) : (
                      <span className={'w-6 h-6 rounded-[6px] border-2 flex items-center justify-center shrink-0 ' + (on ? 'bg-brand border-brand' : 'border-[#757575]')}>
                        {on && <Check size={14} className="text-white" />}
                      </span>
                    )}
                    <MiniaturaMedia media={e} tamano={50} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-rt-13 font-semibold leading-snug line-clamp-2">{nombreEjercicio(e, lang)}</div>
                      {bloqueado ? (
                        <div className="text-[#EF9A9A] text-rt-10 mt-1">{t('projetos:pick.alreadyAdded')}</div>
                      ) : (
                        <div className="flex gap-1 mt-1 overflow-x-auto no-scrollbar">
                          {tags.map((t) => <span key={t} className="shrink-0 text-rt-9 px-2 py-0.5 rounded-[10px] border border-[#616161] text-[#BDBDBD]">{t}</span>)}
                        </div>
                      )}
                    </div>
                    {!bloqueado && e.trainer_id === profile?.id && (
                      <button onClick={(ev) => { ev.stopPropagation(); setEditando(e) }} aria-label={t('projetos:ex.edit')} className="w-[30px] h-[30px] rounded-[6px] bg-[#333333] flex items-center justify-center shrink-0">
                        <Pencil size={16} className="text-brand" />
                      </button>
                    )}
                    {!bloqueado && (
                      <button onClick={(ev) => { ev.stopPropagation(); void alternar(e.id) }} aria-label={t('projetos:c.favorite')} className="shrink-0 p-0.5">
                        <Star size={22} className={esFavorito(e.id) ? 'text-brand fill-brand' : 'text-brand'} />
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
              onClick={() => void agregar()}
              className="w-full h-[54px] rounded-[27px] bg-gradient-to-b from-[#91C145] to-[#5A8F2F] text-white text-rt-16 font-bold"
            >
              {agregando ? t('projetos:pick.adding') : t('projetos:pick.addN', { count: n })}
            </button>
          </div>
        )}
      </div>

      {abriendo === 'grupo' && (
        <HojaRadio lista={gruposConEjercicios} valor={grupo} lang={lang} onElegir={(id) => { setGrupo(id); setAbriendo(null) }} onCerrar={() => setAbriendo(null)} />
      )}
      {abriendo === 'categoria' && (
        <HojaRadio lista={categoriasConEjercicios} valor={categoria} lang={lang} onElegir={(id) => { setCategoria(id); setAbriendo(null) }} onCerrar={() => setAbriendo(null)} />
      )}
      {creando && (
        <NewExerciseSheet
          onClose={() => setCreando(false)}
          onCreated={(id) => { setCreando(false); void cargar(); if (id) setMarcados((p) => [...p, id]) }}
        />
      )}
      {editando && (
        <NewExerciseSheet
          exercicio={editando as any}
          onClose={() => setEditando(null)}
          onCreated={() => { setEditando(null); void cargar() }}
        />
      )}
    </div>
  )
}

function Filtro({ etiqueta, valor, onClick }: { etiqueta: string; valor: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex-1 min-w-0 h-11 px-3 rounded-[12px] bg-[#252525] border border-[#333333] flex items-center gap-1">
      <span className={'flex-1 truncate text-left text-rt-12 ' + (valor ? 'text-white' : 'text-[#757575]')}>{valor || etiqueta}</span>
      <ChevronDown size={16} className="text-[#757575] shrink-0" />
    </button>
  )
}

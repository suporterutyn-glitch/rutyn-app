import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RoutinesTab } from './projetos/RoutinesTab'
import { ExercisesTab } from './projetos/ExercisesTab'
import { DietsTab } from './projetos/DietsTab'
import { FoodsTab } from './projetos/FoodsTab'
import { RecipesTab } from './projetos/RecipesTab'
import { SearchBar } from './projetos/RoutinesTab'

type TabKey = 'rotinas' | 'exercicios' | 'dietas' | 'alimentos' | 'receitas'

/** Todos / Favoritos / Minhas Criações: el filtro vale para la categoría activa. */
export type Filtro = 'todos' | 'favoritos' | 'minhas'

export function MeusProjetosPage() {
  const [tab, setTab] = useState<TabKey>('rotinas')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [query, setQuery] = useState('')
  const { t } = useTranslation()

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'rotinas', label: t('projects:routines') },
    { key: 'exercicios', label: t('projects:exercises') },
    { key: 'dietas', label: t('projects:diets') },
    { key: 'alimentos', label: t('projects:foods') },
    { key: 'receitas', label: t('projects:recipes') },
  ]

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: 'todos', label: t('projects:filterAll') },
    { key: 'favoritos', label: t('projects:filterFavorites') },
    { key: 'minhas', label: t('projects:filterMine') },
  ]

  const placeholders: Record<TabKey, string> = {
    rotinas: t('projects:searchRoutines'),
    exercicios: t('projects:searchExercises'),
    dietas: t('projects:searchDiets'),
    alimentos: t('projects:searchFoods'),
    receitas: t('projects:searchRecipes'),
  }

  const props = { query, filtro }

  // Las pestañas y los filtros quedan fijos al hacer scroll. Sin fondo mientras están en su lugar;
  // el fondo aparece solo cuando la lista empieza a pasar por detrás.
  const marca = useRef<HTMLDivElement>(null)
  const [fijo, setFijo] = useState(false)
  useEffect(() => {
    const el = marca.current
    if (!el) return
    // La barra se pega debajo de la zona segura del teléfono (hora, batería): se mide para saber cuándo quedó fija.
    const sonda = document.createElement('div')
    sonda.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top);visibility:hidden;pointer-events:none'
    document.body.appendChild(sonda)
    const zona = sonda.offsetHeight
    sonda.remove()
    const io = new IntersectionObserver(([e]) => setFijo(!e.isIntersecting), { rootMargin: `-${zona + 1}px 0px 0px 0px` })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24 md:max-w-form md:mx-auto w-full"
      style={{ '--proy-top': 'calc(env(safe-area-inset-top) + 52px)' } as React.CSSProperties}
      data-fijo={fijo ? '1' : undefined}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-white text-rt-20 font-bold">{t('projects:title')}</h1>
      </div>

      {/* Filtros: Todos / Favoritos / Mis Creaciones */}
      <div className="flex flex-wrap gap-2 mb-5 md:justify-center">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={
              'px-5 h-10 rounded-btn-pill border text-rt-13 font-semibold transition ' +
              (filtro === f.key
                ? 'bg-brand border-brand text-white'
                : 'bg-transparent border-grey-700 text-white/80')
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="mb-5">
        <SearchBar value={query} onChange={setQuery} placeholder={placeholders[tab]} />
      </div>

      {/* Categorías: Rutinas / Ejercicios / Dietas / etc */}
      <div ref={marca} aria-hidden="true" />
      {/* Queda fija arriba al hacer scroll; los filtros de cada pestaña se pegan justo debajo (--proy-top). */}
      <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 -mt-2 mb-2 proy-fija proy-tabs">
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pt-2 pb-2 md:justify-center">
        {TABS.map((x) => {
          const on = tab === x.key
          return (
            <button
              key={x.key}
              onClick={() => setTab(x.key)}
              className={
                'px-4 h-9 rounded-card border text-rt-12 font-semibold transition ' +
                (on
                  ? 'bg-brand border-brand text-white'
                  : 'bg-surface-raised border-grey-700 text-grey-400')
              }
            >
              {x.label}
            </button>
          )
        })}
      </div>
      </div>

      {/* Contenido */}
      <div>
        {tab === 'rotinas' && <RoutinesTab {...props} />}
        {tab === 'exercicios' && <ExercisesTab {...props} />}
        {tab === 'dietas' && <DietsTab {...props} />}
        {tab === 'alimentos' && <FoodsTab {...props} />}
        {tab === 'receitas' && <RecipesTab {...props} />}
      </div>
    </div>
  )
}

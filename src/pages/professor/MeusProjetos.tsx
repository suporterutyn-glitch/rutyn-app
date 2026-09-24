import { useState } from 'react'
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

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)]">
      <div className="px-4 flex items-center justify-between mb-4">
        <h1 className="text-white text-rt-20 font-bold">{t('projects:title')}</h1>
      </div>

      <div className="overflow-x-auto no-scrollbar mb-4">
        <div className="flex gap-2 px-4 pb-1">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={
                'shrink-0 px-5 h-10 rounded-btn-pill border text-rt-13 font-semibold transition ' +
                (filtro === f.key
                  ? 'bg-brand border-brand text-white'
                  : 'bg-transparent border-grey-700 text-white/80')
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        <SearchBar value={query} onChange={setQuery} placeholder={placeholders[tab]} />
      </div>

      <div className="overflow-x-auto no-scrollbar mb-4">
        <div className="flex gap-2 px-4 pb-1">
          {TABS.map((x) => {
            const on = tab === x.key
            return (
              <button
                key={x.key}
                onClick={() => setTab(x.key)}
                className={
                  'shrink-0 px-4 h-9 rounded-card border text-rt-12 font-semibold transition ' +
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

      <div className="px-4">
        {tab === 'rotinas' && <RoutinesTab {...props} />}
        {tab === 'exercicios' && <ExercisesTab {...props} />}
        {tab === 'dietas' && <DietsTab {...props} />}
        {tab === 'alimentos' && <FoodsTab {...props} />}
        {tab === 'receitas' && <RecipesTab {...props} />}
      </div>
    </div>
  )
}

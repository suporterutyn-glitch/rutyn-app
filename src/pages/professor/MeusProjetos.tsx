import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RoutinesTab } from './projetos/RoutinesTab'
import { ExercisesTab } from './projetos/ExercisesTab'
import { DietsTab } from './projetos/DietsTab'
import { FoodsTab } from './projetos/FoodsTab'
import { RecipesTab } from './projetos/RecipesTab'

type TabKey = 'rotinas' | 'exercicios' | 'dietas' | 'alimentos' | 'receitas'

export function MeusProjetosPage() {
  const [tab, setTab] = useState<TabKey>('rotinas')
  const { t } = useTranslation()
  const TABS: { key: TabKey; label: string }[] = [
    { key: 'rotinas', label: t('projects:routines') },
    { key: 'exercicios', label: t('projects:exercises') },
    { key: 'dietas', label: t('projects:diets') },
    { key: 'alimentos', label: t('projects:foods') },
    { key: 'receitas', label: t('projects:recipes') },
  ]

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)]">
      <div className="px-4 flex items-center justify-between mb-4">
        <h1 className="text-white text-rt-20 font-bold">{t('projects:title')}</h1>
      </div>

      <div className="overflow-x-auto no-scrollbar mb-4">
        <div className="flex gap-2 px-4 pb-1">
          {TABS.map((t) => {
            const on = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  'shrink-0 px-4 h-9 rounded-card border text-rt-12 font-semibold transition ' +
                  (on
                    ? 'bg-brand border-brand text-white'
                    : 'bg-surface-raised border-grey-700 text-grey-400')
                }
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4">
        {tab === 'rotinas' && <RoutinesTab />}
        {tab === 'exercicios' && <ExercisesTab />}
        {tab === 'dietas' && <DietsTab />}
        {tab === 'alimentos' && <FoodsTab />}
        {tab === 'receitas' && <RecipesTab />}
      </div>
    </div>
  )
}

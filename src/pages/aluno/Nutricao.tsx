import { useEffect, useState } from 'react'
import { nombreEjercicio } from '@/lib/nombreEjercicio'
import { Salad, MessageCircle, Bell, RefreshCw, ChevronUp, ChevronDown, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '@/components/LanguageToggle'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { EmptyState } from '@/pages/professor/projetos/RoutinesTab'
import { objetivosDieta, tiposRefeicao, etiquetaDe } from '@/lib/catalogos'
import { ModoDePreparo } from '@/pages/professor/projetos/dietas/EditorDietaInline'

type Food = { name: string; name_pt?: string | null; name_es?: string | null; name_en?: string | null; qty: number; unit: string; kcal: number; p: number; c: number; f: number; recipe?: string | null }
type Receta = { name: string; steps: string[]; tips: string | null; cover_url: string | null }
type Meal = { name: string; meal_type?: string | null; time?: string | null; foods: Food[]; recipes?: Receta[] }
type SD = { id: string; name: string; cycle_start: string; data: { meals?: Meal[]; goal?: string | null } }

export function NutricaoPage() {
  const { profile } = useAuth()
  const [diets, setDiets] = useState<SD[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'dietas' | 'compras'>('dietas')
  const [marked, setMarked] = useState<Record<string, boolean>>({}) // key: `${dietIdx}-${mealIdx}-${foodIdx}`
  const [macrosOn, setMacrosOn] = useState(true)
  const [plegadas, setPlegadas] = useState<Record<string, boolean>>({})
  const [dietaListaAvisada, setDietaListaAvisada] = useState(false)
  const [preparo, setPreparo] = useState<Receta | null>(null)
  const nav = useNavigate()
  const { t, i18n } = useTranslation()

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase.from('student_diets').select('id,name,cycle_start,data').eq('student_id', profile.id).order('created_at')
      setDiets((data as SD[]) ?? [])
      setLoading(false)
    })()
    const local = localStorage.getItem(`nut-${new Date().toISOString().slice(0,10)}`)
    if (local) try { setMarked(JSON.parse(local)) } catch { /* */ }
  }, [profile?.id])

  useEffect(() => {
    localStorage.setItem(`nut-${new Date().toISOString().slice(0,10)}`, JSON.stringify(marked))
  }, [marked])

  // Revezamento: dieta do dia = (dias desde ciclo) % len
  let todayDiet: SD | null = null
  let todayIdx = 0
  if (diets.length > 0) {
    const cycleStart = new Date(diets[0].cycle_start ?? new Date())
    const days = Math.floor((Date.now() - cycleStart.getTime()) / 86400000)
    todayIdx = ((days % diets.length) + diets.length) % diets.length
    todayDiet = diets[todayIdx]
  }

  const meals = todayDiet?.data?.meals ?? []
  const total = meals.reduce(
    (acc, m) => m.foods.reduce((a, f) => ({
      kcal: a.kcal + f.kcal, p: a.p + f.p, c: a.c + f.c, f: a.f + f.f,
    }), acc),
    { kcal: 0, p: 0, c: 0, f: 0 },
  )

  /** Todas las claves de la dieta del día, para saber cuándo está completa. */
  function clavesDelDia() {
    return meals.flatMap((m, mi) => m.foods.map((_, fi) => `${todayIdx}-${mi}-${fi}`))
  }

  function aplicarMarcas(siguiente: Record<string, boolean>) {
    setMarked(siguiente)
    const todas = clavesDelDia()
    if (todas.length > 0 && todas.every((k) => siguiente[k]) && !dietaListaAvisada) {
      setDietaListaAvisada(true)
    }
  }

  function alternarAlimento(key: string) {
    aplicarMarcas({ ...marked, [key]: !marked[key] })
  }

  /** Marcar la comida marca o desmarca todos sus alimentos de una vez. */
  function marcarComida(mi: number, valor: boolean) {
    const siguiente = { ...marked }
    meals[mi].foods.forEach((_, fi) => { siguiente[`${todayIdx}-${mi}-${fi}`] = valor })
    aplicarMarcas(siguiente)
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center justify-between mb-5">
        <div className="min-w-0">
          <div className="text-white text-rt-20 font-bold truncate">
            {t('aluno:hello', { name: profile?.full_name?.split(' ')[0] ?? t('nutricao:student') })}
          </div>
          <div className="text-white/60 text-rt-11 mt-0.5 truncate">{t('aluno:tabs.nutrition')}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LanguageToggle />
          <button onClick={() => nav('/aluno/notificacoes')} className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center" aria-label={t('nutricao:notifications')}>
            <Bell size={20} className="text-white" />
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-2 mb-3">
        {(['dietas', 'compras'] as const).map((x) => {
          const on = tab === x
          return (
            <button key={x} onClick={() => setTab(x)} className={
              'px-5 h-10 rounded-btn-pill border text-rt-13 font-semibold ' +
              (on ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-white/80')
            }>
              {x === 'dietas' ? t('nutricao:myDiets') : t('nutricao:shoppingList')}
            </button>
          )
        })}
      </div>

      {tab === 'dietas' && (
        <div className="flex items-center justify-end gap-2 mb-4">
          <span className="text-white/70 text-rt-13">{t('nutricao:macros')}</span>
          <button
            onClick={() => setMacrosOn((v) => !v)}
            className={'w-14 h-7 rounded-full flex items-center px-1 transition ' + (macrosOn ? 'bg-brand justify-end' : 'bg-grey-700 justify-start')}
            aria-label={t('nutricao:macros')}
          >
            <span className="w-5 h-5 rounded-full bg-white" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">{t('nutricao:loading')}</div>
      ) : diets.length === 0 ? (
        <EmptyState icon={Salad} title={t('nutricao:noDiet')} body={t('nutricao:noDietBody')} />
      ) : tab === 'dietas' ? (
        <>
          {/* Banner de la dieta del día, como en el diseño */}
          <div className="rounded-card border border-brand/50 bg-brand/10 px-3 py-2.5 mb-3 flex items-center gap-2">
            <RefreshCw size={16} className="text-brand shrink-0" />
            <span className="text-brand text-rt-13 font-semibold">
              {t('nutricao:dietOfDay', { name: todayDiet?.name })}
              {diets.length > 1 && t('nutricao:dayOf', { n: todayIdx + 1, total: diets.length })}
            </span>
          </div>

          {/* Macros del día */}
          {macrosOn && (
            <div className="card-dark p-3 mb-3 grid grid-cols-4 gap-2 text-center">
              {[
                { l: t('nutricao:kcal'), v: total.kcal, c: 'text-macro-kcal', d: 0 },
                { l: t('nutricao:proteins'), v: total.p, c: 'text-macro-protein', d: 1 },
                { l: t('nutricao:carbs'), v: total.c, c: 'text-macro-carb', d: 1 },
                { l: t('nutricao:fats'), v: total.f, c: 'text-macro-fat', d: 1 },
              ].map((m) => (
                <div key={m.l}>
                  <div className={'text-rt-18 font-bold ' + m.c}>
                    {m.d === 0 ? Math.round(m.v) : m.v.toFixed(1) + 'g'}
                  </div>
                  <div className="text-grey-500 text-rt-10">{m.l}</div>
                </div>
              ))}
            </div>
          )}

          {/* Dieta del día, con su objetivo */}
          <div className="card-dark p-3 mb-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-white text-rt-16 font-bold">{todayDiet?.name}</div>
                {todayDiet?.data?.goal && (
                  <span className="inline-block mt-1 text-rt-11 px-2.5 py-1 rounded-btn-pill bg-surface-raised text-white/70">
                    {etiquetaDe(objetivosDieta, todayDiet.data.goal, i18n.language)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {meals.length === 0 ? (
            <div className="card-dark p-4 text-white/60 text-rt-13">{t('nutricao:noMeals')}</div>
          ) : (
            <ul className="flex flex-col gap-3">
              {meals.map((m, mi) => {
                const claves = m.foods.map((_, fi) => `${todayIdx}-${mi}-${fi}`)
                const hechos = claves.filter((k) => marked[k]).length
                const completa = hechos === claves.length && claves.length > 0
                const plegada = !!plegadas[`${todayIdx}-${mi}`]
                return (
                  <li key={mi} className={'card-dark p-3 ' + (completa ? 'border-brand' : '')}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-rt-15 font-bold truncate">{m.meal_type && !m.meal_type.startsWith('custom:') ? etiquetaDe(tiposRefeicao, m.meal_type, i18n.language) : m.name}</div>
                        {hechos > 0 && !completa && (
                          <div className="text-white/50 text-rt-11">{t('nutricao:nOfTotal', { n: hechos, total: claves.length })}</div>
                        )}
                      </div>
                      {m.time && <span className="text-white/60 text-rt-12 shrink-0">{m.time.slice(0, 5)}</span>}
                      <button
                        onClick={() => marcarComida(mi, !completa)}
                        aria-label={completa ? t('nutricao:unmarkMeal') : t('nutricao:markMeal')}
                        className={
                          'w-7 h-7 rounded-[6px] border-2 flex items-center justify-center shrink-0 ' +
                          (completa ? 'bg-brand border-brand text-white' : 'border-grey-600')
                        }
                      >
                        {completa && '✓'}
                      </button>
                      <button
                        onClick={() => setPlegadas({ ...plegadas, [`${todayIdx}-${mi}`]: !plegada })}
                        className="w-7 h-7 flex items-center justify-center text-grey-500 shrink-0"
                        aria-label={plegada ? t('nutricao:expand') : t('nutricao:collapse')}
                      >
                        {plegada ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </button>
                    </div>

                    {!plegada && (
                      <ul className="flex flex-col gap-2 mt-3">
                        {(() => {
                          // Mantiene el índice original: las marcas se guardan por posición.
                          const fila = (f: Food, fi: number) => {
                          const key = `${todayIdx}-${mi}-${fi}`
                          const on = !!marked[key]
                          return (
                            <li key={fi} className={
                              'rounded-card border p-3 flex items-center gap-3 ' +
                              (on ? 'border-brand/40 bg-brand/5' : 'border-surface-line')
                            }>
                              <div className="flex-1 min-w-0">
                                <div className={'text-rt-14 font-semibold ' + (on ? 'text-grey-500 line-through' : 'text-white')}>
                                  {nombreEjercicio({ ...f, name_pt: f.name_pt ?? f.name }, i18n.language)}
                                </div>
                                {macrosOn && (
                                  <div className="text-rt-11 mt-0.5 flex flex-wrap gap-x-1">
                                    <span className="text-macro-kcal">{Math.round(f.kcal)} kcal</span>
                                    <span className="text-grey-600">|</span>
                                    <span className="text-macro-protein">{t('nutricao:pAbbr')}: {f.p.toFixed(1)}g</span>
                                    <span className="text-grey-600">|</span>
                                    <span className="text-macro-carb">{t('nutricao:cAbbr')}: {f.c.toFixed(1)}g</span>
                                    <span className="text-grey-600">|</span>
                                    <span className="text-macro-fat">{t('nutricao:fAbbr')}: {f.f.toFixed(1)}g</span>
                                  </div>
                                )}
                              </div>
                              <span className="text-white text-rt-15 font-bold shrink-0">
                                {Math.round(f.qty)}{f.unit === 'Uni' ? ` ${t('nutricao:unit')}` : f.unit}
                              </span>
                              <button
                                onClick={() => alternarAlimento(key)}
                                aria-label={on ? t('nutricao:unmarkFood') : t('nutricao:markFood')}
                                className={
                                  'w-7 h-7 rounded-[6px] border-2 flex items-center justify-center shrink-0 ' +
                                  (on ? 'bg-brand border-brand text-white' : 'border-grey-600')
                                }
                              >
                                {on && '✓'}
                              </button>
                            </li>
                          )
                          }
                          const conIndice = m.foods.map((f, fi) => ({ f, fi }))
                          return (
                            <>
                              {(m.recipes ?? []).map((r) => (
                                <li key={'r' + r.name} className="rounded-card border border-brand/30 bg-brand/5 p-2.5">
                                  <div className="flex items-center gap-2 mb-2">
                                    <BookOpen size={16} className="text-brand shrink-0" />
                                    <span className="flex-1 text-white text-rt-14 font-bold truncate">{r.name}</span>
                                    <button onClick={() => setPreparo(r)} className="shrink-0 px-2.5 py-1 rounded-btn-pill border border-brand text-brand text-rt-11 font-semibold">
                                      {t('nutricao:howToPrepare')}
                                    </button>
                                  </div>
                                  <ul className="flex flex-col gap-2">
                                    {conIndice.filter((x) => x.f.recipe === r.name).map((x) => fila(x.f, x.fi))}
                                  </ul>
                                </li>
                              ))}
                              {conIndice.filter((x) => !x.f.recipe || !(m.recipes ?? []).some((r) => r.name === x.f.recipe)).map((x) => fila(x.f, x.fi))}
                            </>
                          )
                        })()}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      ) : (
        <ComprasList diets={diets} />
      )}

      {preparo && <ModoDePreparo r={preparo} onCerrar={() => setPreparo(null)} />}
      {dietaListaAvisada && (
        <FeedbackDialog
          kind="success"
          message={t('nutricao:dietDone')}
          onClose={() => setDietaListaAvisada(false)}
        />
      )}
    </div>
  )
}

function ComprasList({ diets }: { diets: SD[] }) {
  const { t, i18n } = useTranslation()
  const [period, setPeriod] = useState<'semana' | 'mes'>('semana')
  // Lo comprado se recuerda: la lista se usa caminando por el supermercado.
  const [comprados, setComprados] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('compras-marcadas') ?? '{}') } catch { return {} }
  })
  useEffect(() => {
    localStorage.setItem('compras-marcadas', JSON.stringify(comprados))
  }, [comprados])

  const days = period === 'semana' ? 7 : 30
  const totals = new Map<string, { qty: number; unit: string; nombre: string }>()
  for (let i = 0; i < days; i++) {
    const d = diets[i % diets.length]
    d?.data?.meals?.forEach((m) => m.foods.forEach((f) => {
      const key = f.name
      const cur = totals.get(key) ?? { qty: 0, unit: f.unit, nombre: nombreEjercicio({ ...f, name_pt: f.name_pt ?? f.name }, i18n.language) }
      totals.set(key, { ...cur, qty: cur.qty + f.qty })
    }))
  }
  const list = Array.from(totals.entries()).sort()
  const hechos = list.filter(([k]) => comprados[k]).length

  function sendWhats() {
    const txt = list.map(([, v]) => `• ${Math.round(v.qty)}${v.unit} ${v.nombre}`).join('\n')
    const url = `https://wa.me/?text=${encodeURIComponent(t('nutricao:shoppingTitle') + '\n' + txt)}`
    window.open(url, '_blank')
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex gap-2">
          {(['semana', 'mes'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={
              'px-4 h-9 rounded-btn-pill text-rt-12 font-semibold ' +
              (period === p ? 'bg-brand text-white' : 'bg-surface-raised text-grey-400')
            }>
              {p === 'semana' ? t('nutricao:oneWeek') : t('nutricao:oneMonth')}
            </button>
          ))}
        </div>
        {list.length > 0 && (
          <span className="text-white/60 text-rt-12">{hechos}/{list.length}</span>
        )}
      </div>

      {list.length === 0 ? (
        <div className="card-dark p-4 text-white/60 text-rt-13">{t('nutricao:noItems')}</div>
      ) : (
        <ul className="flex flex-col gap-2 mb-4">
          {list.map(([k, v]) => {
            const on = !!comprados[k]
            return (
              <li key={k} className={'card-dark p-3 flex items-center gap-3 ' + (on ? 'border-brand/40' : '')}>
                <button
                  onClick={() => setComprados({ ...comprados, [k]: !on })}
                  aria-label={on ? t('nutricao:unmark') : t('nutricao:mark')}
                  className={
                    'w-6 h-6 rounded-[6px] border-2 flex items-center justify-center shrink-0 ' +
                    (on ? 'bg-brand border-brand text-white text-rt-12' : 'border-grey-600')
                  }
                >
                  {on && '✓'}
                </button>
                <span className={'flex-1 text-rt-14 ' + (on ? 'text-grey-500 line-through' : 'text-white')}>{v.nombre}</span>
                <span className={'text-rt-13 font-semibold ' + (on ? 'text-grey-600' : 'text-brand')}>
                  {Math.round(v.qty)}{v.unit === 'Uni' ? ` ${t('nutricao:unit')}` : v.unit}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <button onClick={sendWhats} className="w-full h-12 rounded-btn-pill bg-whatsapp text-white font-semibold flex items-center justify-center gap-2">
        <MessageCircle size={18} /> {t('nutricao:sendWhatsapp')}
      </button>
    </>
  )
}

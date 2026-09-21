import { useEffect, useState } from 'react'
import { Salad, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { EmptyState } from '@/pages/professor/projetos/RoutinesTab'

type Meal = { name: string; foods: Array<{ name: string; qty: number; unit: string; kcal: number; p: number; c: number; f: number }> }
type SD = { id: string; name: string; cycle_start: string; data: { meals?: Meal[] } }

export function NutricaoPage() {
  const { profile } = useAuth()
  const [diets, setDiets] = useState<SD[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'dietas' | 'compras'>('dietas')
  const [marked, setMarked] = useState<Record<string, boolean>>({}) // key: `${dietIdx}-${mealIdx}-${foodIdx}`

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

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <h1 className="text-white text-rt-20 font-bold mb-4">Nutrição</h1>

      <div className="flex justify-end gap-2 mb-4">
        {(['dietas', 'compras'] as const).map((t) => {
          const on = tab === t
          return (
            <button key={t} onClick={() => setTab(t)} className={
              'px-3 h-8 rounded-card border text-rt-11 font-semibold ' +
              (on ? 'bg-white text-black border-white' : 'bg-transparent border-grey-700 text-grey-400')
            }>
              {t === 'dietas' ? 'Minhas Dietas' : 'Lista de Compras'}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : diets.length === 0 ? (
        <EmptyState icon={Salad} title="Nenhuma dieta" body="Seu professor ainda não atribuiu uma dieta." />
      ) : tab === 'dietas' ? (
        <>
          {diets.length > 1 && (
            <div className="text-white/60 text-rt-11 mb-2">Dieta do dia: <span className="text-brand font-semibold">{String.fromCharCode(65 + todayIdx)} · {todayDiet?.name}</span></div>
          )}
          {/* Macros do dia */}
          <div className="card-dark p-3 mb-3 grid grid-cols-4 gap-2 text-center">
            {[
              { l: 'kcal', v: total.kcal, c: 'text-macro-kcal' },
              { l: 'P', v: total.p, c: 'text-macro-protein' },
              { l: 'C', v: total.c, c: 'text-macro-carb' },
              { l: 'G', v: total.f, c: 'text-macro-fat' },
            ].map((m) => (
              <div key={m.l}>
                <div className={'text-rt-18 font-bold ' + m.c}>{Math.round(m.v)}</div>
                <div className="text-grey-500 text-rt-10 uppercase">{m.l}</div>
              </div>
            ))}
          </div>

          {meals.length === 0 ? (
            <div className="card-dark p-4 text-white/60 text-rt-13">Nenhuma refeição cadastrada.</div>
          ) : (
            <ul className="flex flex-col gap-3">
              {meals.map((m, mi) => (
                <li key={mi} className="card-dark p-3">
                  <div className="text-white text-rt-14 font-bold mb-2">{m.name}</div>
                  <ul className="flex flex-col gap-1.5">
                    {m.foods.map((f, fi) => {
                      const key = `${todayIdx}-${mi}-${fi}`
                      const on = !!marked[key]
                      return (
                        <li key={fi} className="flex items-center gap-2">
                          <button
                            onClick={() => setMarked({ ...marked, [key]: !on })}
                            className={
                              'w-5 h-5 rounded-sm border-2 flex items-center justify-center ' +
                              (on ? 'bg-brand border-brand' : 'border-grey-600')
                            }
                          >
                            {on && <span className="text-white text-[10px]">✓</span>}
                          </button>
                          <div className={'flex-1 text-rt-13 ' + (on ? 'text-grey-600 line-through' : 'text-white')}>
                            {f.qty}{f.unit} · {f.name}
                          </div>
                          <div className={'text-rt-11 ' + (on ? 'text-grey-600' : 'text-brand font-semibold')}>{Math.round(f.kcal)} kcal</div>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <ComprasList diets={diets} />
      )}
    </div>
  )
}

function ComprasList({ diets }: { diets: SD[] }) {
  const [period, setPeriod] = useState<'semana' | 'mes'>('semana')
  const days = period === 'semana' ? 7 : 30
  const totals = new Map<string, { qty: number; unit: string }>()
  for (let i = 0; i < days; i++) {
    const d = diets[i % diets.length]
    d?.data?.meals?.forEach((m) => m.foods.forEach((f) => {
      const key = f.name
      const cur = totals.get(key) ?? { qty: 0, unit: f.unit }
      totals.set(key, { qty: cur.qty + f.qty, unit: f.unit })
    }))
  }
  const list = Array.from(totals.entries()).sort()

  function sendWhats() {
    const txt = list.map(([k, v]) => `• ${Math.round(v.qty)}${v.unit} ${k}`).join('\n')
    const url = `https://wa.me/?text=${encodeURIComponent('Lista de compras Rutyn:\n' + txt)}`
    window.open(url, '_blank')
  }

  return (
    <>
      <div className="flex gap-2 mb-3">
        {(['semana', 'mes'] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={
            'px-4 h-8 rounded-btn-pill text-rt-11 font-semibold ' +
            (period === p ? 'bg-brand text-white' : 'bg-surface-raised text-grey-400')
          }>
            {p === 'semana' ? '1 semana' : '1 mês'}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="card-dark p-4 text-white/60 text-rt-13">Sem itens na sua dieta.</div>
      ) : (
        <ul className="flex flex-col gap-2 mb-4">
          {list.map(([k, v]) => (
            <li key={k} className="card-dark p-3 flex items-center justify-between">
              <span className="text-white text-rt-13">{k}</span>
              <span className="text-brand text-rt-13 font-semibold">{Math.round(v.qty)}{v.unit}</span>
            </li>
          ))}
        </ul>
      )}
      <button onClick={sendWhats} className="w-full h-12 rounded-btn-pill bg-whatsapp text-white font-semibold flex items-center justify-center gap-2">
        <MessageCircle size={18} /> Enviar pelo WhatsApp
      </button>
    </>
  )
}

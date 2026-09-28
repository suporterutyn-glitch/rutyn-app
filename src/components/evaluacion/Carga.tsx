import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dumbbell, Filter, ChevronDown, X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { localeDe } from '@/lib/fechas'
import { gruposMusculares, etiquetaDe } from '@/lib/catalogos'
import { GraficoLineas } from './GraficoLineas'
import { ChipsPeriodo, DialogoPeriodo } from './Composicion'
import { agrupar, etiquetaCorte, periodoFijo, type Periodo } from './periodos'

const COLOR_GRUPO: Record<string, string> = {
  chest: '#E53935', back: '#1E88E5', shoulders: '#FFA726', biceps: '#EF9A9A', triceps: '#AB47BC', quadriceps: '#FFEE58',
  hamstrings: '#EC407A', glutes: '#66BB6A', calves: '#78909C', abs: '#FF7043', forearms: '#5C6BC0', traps: '#8D6E63',
  lowerBack: '#A1887F', adductors: '#9CCC65', abductors: '#4DB6AC',
}

type Serie = { done?: boolean; load?: string | number }
type Ejercicio = { muscle_group?: string | null; muscle_groups?: string[] | null; series?: Serie[] }
type Fila = { fecha: string; grupo: string; carga: number }

/** Fecha local "aaaa-mm-dd" de un instante. */
const diaLocal = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** Progreso de carga por grupo muscular, calculado de los entrenamientos del alumno. Solo lectura. */
export function SeccionCarga({ studentId }: { studentId: string }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [error, setError] = useState(false)
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoFijo('30'))
  const [personalizando, setPersonalizando] = useState(false)
  const [eligiendo, setEligiendo] = useState(false)
  const [elegidos, setElegidos] = useState<string[] | null>(null)

  useEffect(() => {
    void supabase.from('workout_sessions').select('started_at,data').eq('student_id', studentId).order('started_at').limit(500)
      .then(({ data, error: err }) => {
        if (err) { setError(true); setFilas([]); return }
        const out: Fila[] = []
        for (const s of (data as { started_at: string; data: { exercises?: Ejercicio[] } | null }[]) ?? []) {
          const fecha = diaLocal(s.started_at)
          for (const e of s.data?.exercises ?? []) {
            // Solo series hechas con carga > 0; un ejercicio de varios grupos suma a cada uno.
            const carga = Math.max(0, ...(e.series ?? []).filter((sr) => sr.done !== false).map((sr) => Number(String(sr.load ?? '').replace(',', '.')) || 0))
            if (carga <= 0) continue
            const grupos = e.muscle_groups?.length ? e.muscle_groups : e.muscle_group ? [e.muscle_group] : []
            for (const g of grupos) out.push({ fecha, grupo: g, carga })
          }
        }
        setFilas(out)
      })
  }, [studentId])

  const conDatos = useMemo(() => {
    const ids = [...new Set((filas ?? []).map((f) => f.grupo))]
    return ids.sort((a, b) => etiquetaDe(gruposMusculares, a, lang).localeCompare(etiquetaDe(gruposMusculares, b, lang)))
  }, [filas, lang])
  const activos = elegidos ?? conDatos.slice(0, 3)

  const series = useMemo(() => activos.map((g) => {
    const r = agrupar((filas ?? []).filter((f) => f.grupo === g), 'fecha', 'carga', periodo, 'max')
    return { id: g, color: COLOR_GRUPO[g] ?? '#8BC34A', ...r }
  }), [filas, activos, periodo])

  if (filas === null) return <div className="py-8 flex justify-center"><span className="w-7 h-7 rounded-full border-2 border-[#8BC34A]/30 border-t-[#8BC34A] animate-spin" /></div>
  if (filas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <Dumbbell size={48} className="text-white/20" />
        <p className="text-white/50 text-rt-14">{error ? t('evaluacion:loadErrorShort') : t('evaluacion:noWorkouts')}</p>
      </div>
    )
  }
  const conPuntos = series.filter((s) => s.puntos.length > 0)
  const cortes = series[0]?.cortes ?? []
  const g = series[0]?.g ?? 'day'

  return (
    <div className="flex flex-col gap-3">
      <ChipsPeriodo periodo={periodo} onFijo={(p) => setPeriodo(periodoFijo(p))} onPersonalizado={() => setPersonalizando(true)} />
      <button onClick={() => setEligiendo(true)} className="flex items-center gap-2 h-10 px-3 rounded-[10px] bg-[#1E1E1E] border border-[#2D2D2D]">
        <Filter size={16} className="text-[#8BC34A]" />
        <span className="flex-1 text-left text-white/70 text-rt-12">{t('evaluacion:nOfMGroups', { n: activos.length, m: conDatos.length })}</span>
        <ChevronDown size={16} className="text-white/50" />
      </button>
      {activos.length === 0 ? (
        <p className="text-white/50 text-rt-12 text-center py-4">{t('evaluacion:selectOneGroup')}</p>
      ) : conPuntos.length === 0 ? (
        <p className="text-white/50 text-rt-12 text-center py-4">{t('evaluacion:noHistoryInPeriod')}</p>
      ) : (
        <>
          <GraficoLineas series={conPuntos} etiquetasX={cortes.map((k) => etiquetaCorte(k, g, localeDe(lang)))} alto={240} decimales={0} />
          <div className="rounded-[12px] bg-[#252525] overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 bg-[#8BC34A]/10 text-white/60 text-rt-11">
              <span>{t('evaluacion:muscle')}</span><span className="w-14 text-right">{t('evaluacion:initial')}</span><span className="w-14 text-right">{t('evaluacion:current')}</span>
            </div>
            {conPuntos.map((s) => (
              <div key={s.id} className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 border-t border-[#2D2D2D] items-center">
                <span className="flex items-center gap-2 text-white text-rt-12 min-w-0"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} /><span className="truncate">{etiquetaDe(gruposMusculares, s.id, lang)}</span></span>
                <span className="w-14 text-right text-white/70 text-rt-12">{s.puntos[0].y} kg</span>
                <span className="w-14 text-right text-white text-rt-12 font-semibold">{s.puntos[s.puntos.length - 1].y} kg</span>
              </div>
            ))}
          </div>
        </>
      )}
      {personalizando && <DialogoPeriodo periodo={periodo} onAplicar={(p) => { setPeriodo(p); setPersonalizando(false) }} onCerrar={() => setPersonalizando(false)} />}
      {eligiendo && <HojaGrupos disponibles={conDatos} elegidos={activos} onAplicar={(l) => { setElegidos(l); setEligiendo(false) }} onCerrar={() => setEligiendo(false)} />}
    </div>
  )
}

function HojaGrupos({ disponibles, elegidos, onAplicar, onCerrar }: { disponibles: string[]; elegidos: string[]; onAplicar: (l: string[]) => void; onCerrar: () => void }) {
  const { t, i18n } = useTranslation()
  const [sel, setSel] = useState(elegidos)
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onCerrar}>
      <div className="w-full max-w-app rounded-t-[20px] bg-[#1E1E1E] flex flex-col h-[65dvh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3"><span className="w-10 h-1 rounded-full bg-grey-500" /></div>
        <div className="flex items-center justify-between px-5 pt-3">
          <span className="text-white text-rt-16 font-bold">{t('evaluacion:muscleGroups')}</span>
          <button onClick={onCerrar} aria-label={t('close')} className="w-9 h-9 rounded-[12px] bg-[#333333] flex items-center justify-center text-grey-400"><X size={18} /></button>
        </div>
        <div className="flex gap-4 px-5 py-2">
          <button onClick={() => setSel([...disponibles])} className="text-[#7CB342] text-rt-13 font-semibold">{t('evaluacion:selectAll')}</button>
          <button onClick={() => setSel([])} className="text-grey-500 text-rt-13">{t('evaluacion:clear')}</button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1">
          {disponibles.map((id) => {
            const on = sel.includes(id)
            return (
              <button key={id} onClick={() => setSel(on ? sel.filter((x) => x !== id) : [...sel, id])}
                className={'flex items-center gap-3 p-3 rounded-[12px] border text-left ' + (on ? 'bg-[#7CB342]/10 border-[#7CB342]/30' : 'border-transparent')}>
                <span className={'w-6 h-6 rounded-[6px] flex items-center justify-center ' + (on ? 'bg-[#7CB342]' : 'border-2 border-grey-600')}>{on && <Check size={16} className="text-white" />}</span>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR_GRUPO[id] ?? '#8BC34A' }} />
                <span className={'text-white text-rt-14 ' + (on ? 'font-bold' : '')}>{etiquetaDe(gruposMusculares, id, i18n.language)}</span>
              </button>
            )
          })}
        </div>
        <div className="p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button onClick={() => onAplicar(sel)} className="w-full h-[50px] rounded-[12px] bg-gradient-to-b from-[#91C145] to-[#5A8F2F] text-white text-rt-16 font-bold">{t('evaluacion:apply')}</button>
        </div>
      </div>
    </div>
  )
}

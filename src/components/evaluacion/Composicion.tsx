import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Ruler, PieChart, Filter, ChevronDown, X, Check, Calculator } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { detalleError } from '@/lib/errores'
import { localeDe, hoyLocal } from '@/lib/fechas'
import { edadDesde, leerNumero } from '@/lib/assessment'
import { HojaRadio } from '@/components/professor/SelectorRadio'
import {
  MEDIDAS, riesgoCinturaCadera, PROTOCOLOS_GRASA, pliegues, porcentajeGrasa, claseGrasa, COLOR_GRASA,
  type Medida, type ProtocoloGrasa, type Pliegue, type Sexo,
} from '@/lib/evaluacionCalculos'
import type { Ficha } from './Evaluacion'
import type { Autor } from './Pruebas'
import { GraficoLineas } from './GraficoLineas'
import { agrupar, diasEntre, etiquetaCorte, periodoFijo, type Periodo } from './periodos'
import { Campo, CampoFecha, ModalEdicion, Numero, Selector, Vacio } from './ui'

export type RegistroPerimetria = { id: string; measured_on: string } & Partial<Record<Medida, number | null>>
export type RegistroGrasa = { id: string; tested_on: string; protocol: ProtocoloGrasa; weight_kg: number | null; fat_pct: number | null } & Partial<Record<Pliegue, number | null>>
type Base = { studentId: string; teacherId: string; fichaId: string; autor: Autor }

async function marcarAutor(fichaId: string, autor: Autor) {
  await supabase.from('assessments').update({ updated_by_name: autor.nombre, updated_by_role: autor.rol }).eq('id', fichaId)
}
const uno = (v: number) => Number(v).toFixed(1)

// ---------------- Perimetría ----------------

export function SeccionPerimetria({ registros, ficha, puedeEditar, onEditar }: { registros: RegistroPerimetria[]; ficha: Ficha; puedeEditar: boolean; onEditar: () => void }) {
  const { t, i18n } = useTranslation()
  const locale = localeDe(i18n.language)
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoFijo('30'))
  const [eligiendo, setEligiendo] = useState(false)
  const [personalizando, setPersonalizando] = useState(false)
  const conDatos = MEDIDAS.filter((m) => registros.some((r) => r[m.id] != null))
  const [elegidas, setElegidas] = useState<Medida[]>(() => conDatos.slice(0, 3).map((m) => m.id))
  const ultimo = registros[registros.length - 1]

  const series = useMemo(() => elegidas.map((id) => {
    const r = agrupar(registros, 'measured_on', id, periodo)
    return { id, color: MEDIDAS.find((m) => m.id === id)!.color, ...r }
  }), [registros, elegidas, periodo])

  if (!ultimo) {
    return <Vacio icono={Ruler} texto={t('evaluacion:perimEmpty')} accion={puedeEditar ? t('evaluacion:perimRegister') : undefined} onAccion={onEditar} />
  }
  const cc = riesgoCinturaCadera(ultimo.waist ?? null, ultimo.hips ?? null, ficha.sex as Sexo | null)
  const conPuntos = series.filter((s) => s.puntos.length > 0)
  const cortes = series[0]?.cortes ?? []
  const g = series[0]?.g ?? 'day'

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        {MEDIDAS.map((m) => (
          <div key={m.id} className="rounded-[12px] bg-[#252525] p-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
            <div className="min-w-0">
              <div className="text-white/60 text-rt-11 truncate">{t(`evaluacion:medida.${m.id}`)}</div>
              <div className="text-white text-rt-14 font-semibold">{ultimo[m.id] != null ? `${uno(ultimo[m.id]!)} cm` : '-'}</div>
            </div>
          </div>
        ))}
      </div>
      {cc && (
        <div className="rounded-[12px] bg-[#252525] p-3 flex items-center justify-between">
          <span className="text-white/60 text-rt-12">{t('evaluacion:whr')}</span>
          <span className="text-white text-rt-14 font-semibold">{cc.relacion.toFixed(2)} · <span className={cc.riesgo === 'low' ? 'text-[#8BC34A]' : cc.riesgo === 'moderate' ? 'text-[#FFC107]' : 'text-[#EF5350]'}>{t(`evaluacion:risk.${cc.riesgo}`)}</span></span>
        </div>
      )}

      <div className="rounded-[12px] bg-[#252525] p-4 flex flex-col gap-3">
        <div className="text-white text-rt-14 font-semibold">{t('evaluacion:evolution')}</div>
        <ChipsPeriodo periodo={periodo} onFijo={(p) => setPeriodo(periodoFijo(p))} onPersonalizado={() => setPersonalizando(true)} />
        <button onClick={() => setEligiendo(true)} className="flex items-center gap-2 h-10 px-3 rounded-[10px] bg-[#1E1E1E] border border-[#2D2D2D]">
          <Filter size={16} className="text-[#8BC34A]" />
          <span className="flex-1 text-left text-white/70 text-rt-12">{t('evaluacion:nOfM', { n: elegidas.length, m: conDatos.length })}</span>
          <ChevronDown size={16} className="text-white/50" />
        </button>
        {registros.length < 2 ? (
          <p className="text-white/50 text-rt-12 text-center py-4">{t('evaluacion:perimNoHistory')}</p>
        ) : elegidas.length === 0 ? (
          <p className="text-white/50 text-rt-12 text-center py-4">{t('evaluacion:selectOneMeasure')}</p>
        ) : conPuntos.length === 0 ? (
          <p className="text-white/50 text-rt-12 text-center py-4">{t('evaluacion:noHistoryInPeriod')}</p>
        ) : (
          <>
            <GraficoLineas series={conPuntos} etiquetasX={cortes.map((k) => etiquetaCorte(k, g, locale))} />
            <div className="rounded-[12px] bg-[#1E1E1E] overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 bg-[#8BC34A]/10 text-white/60 text-rt-11">
                <span>{t('evaluacion:measure')}</span><span className="w-14 text-right">{t('evaluacion:initial')}</span><span className="w-14 text-right">{t('evaluacion:current')}</span>
              </div>
              {conPuntos.map((s) => (
                <div key={s.id} className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 border-t border-[#2D2D2D] items-center">
                  <span className="flex items-center gap-2 text-white text-rt-12 min-w-0"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} /><span className="truncate">{t(`evaluacion:medida.${s.id}`)}</span></span>
                  <span className="w-14 text-right text-white/70 text-rt-12">{uno(s.puntos[0].y)}</span>
                  <span className="w-14 text-right text-white text-rt-12 font-semibold">{uno(s.puntos[s.puntos.length - 1].y)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {eligiendo && <HojaMedidas disponibles={conDatos.map((m) => m.id)} elegidas={elegidas} onAplicar={(l) => { setElegidas(l); setEligiendo(false) }} onCerrar={() => setEligiendo(false)} />}
      {personalizando && <DialogoPeriodo periodo={periodo} onAplicar={(p) => { setPeriodo(p); setPersonalizando(false) }} onCerrar={() => setPersonalizando(false)} />}
    </div>
  )
}

export function ChipsPeriodo({ periodo, onFijo, onPersonalizado }: { periodo: Periodo; onFijo: (p: '30' | '90' | '180') => void; onPersonalizado: () => void }) {
  const { t } = useTranslation()
  const chip = (activo: boolean) => 'px-3 py-1.5 rounded-[16px] text-rt-11 border ' + (activo ? 'bg-[#7CB342] border-[#7CB342] text-white font-semibold' : 'bg-[#252525] border-[#3D3D3D] text-grey-400')
  return (
    <div className="flex gap-2 flex-wrap">
      {(['30', '90', '180'] as const).map((p) => <button key={p} onClick={() => onFijo(p)} className={chip(periodo.tipo === p)}>{p}D</button>)}
      <button onClick={onPersonalizado} className={chip(periodo.tipo === 'custom')}>{t('evaluacion:custom')}</button>
    </div>
  )
}

export function DialogoPeriodo({ periodo, onAplicar, onCerrar }: { periodo: Periodo; onAplicar: (p: Periodo) => void; onCerrar: () => void }) {
  const { t } = useTranslation()
  const [desde, setDesde] = useState(periodo.desde)
  const [hasta, setHasta] = useState(periodo.hasta)
  const [error, setError] = useState('')
  const hace2 = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 2); return d.toISOString().slice(0, 10) })()
  function aplicar() {
    if (!desde || !hasta || desde > hasta) { setError(t('evaluacion:rangeInvalid')); return }
    if (diasEntre(desde, hasta) > 180) { setError(t('evaluacion:rangeMax')); return }
    onAplicar({ tipo: 'custom', desde, hasta })
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-6" onClick={onCerrar}>
      <div className="w-full max-w-sm rounded-[16px] bg-[#2D2D2D] p-5 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="text-white text-rt-16 font-bold">{t('evaluacion:customPeriod')}</div>
        <Campo etiqueta={t('evaluacion:from')}><CampoFecha valor={desde} onChange={setDesde} min={hace2} /></Campo>
        <Campo etiqueta={t('evaluacion:to')}><CampoFecha valor={hasta} onChange={setHasta} min={hace2} /></Campo>
        {error && <p className="text-[#EF5350] text-rt-12" role="alert">{error}</p>}
        <div className="flex justify-end gap-4">
          <button onClick={onCerrar} className="text-white/70 text-rt-14">{t('cancel')}</button>
          <button onClick={aplicar} className="text-[#8BC34A] text-rt-14 font-semibold">{t('evaluacion:apply')}</button>
        </div>
      </div>
    </div>
  )
}

function HojaMedidas({ disponibles, elegidas, onAplicar, onCerrar }: { disponibles: Medida[]; elegidas: Medida[]; onAplicar: (l: Medida[]) => void; onCerrar: () => void }) {
  const { t } = useTranslation()
  const [sel, setSel] = useState<Medida[]>(elegidas)
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onCerrar}>
      <div className="w-full max-w-app rounded-t-[20px] bg-[#1E1E1E] flex flex-col h-[65dvh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3"><span className="w-10 h-1 rounded-full bg-grey-500" /></div>
        <div className="flex items-center justify-between px-5 pt-3">
          <span className="text-white text-rt-16 font-bold">{t('evaluacion:measures')}</span>
          <button onClick={onCerrar} aria-label={t('close')} className="w-9 h-9 rounded-[12px] bg-[#333333] flex items-center justify-center text-grey-400"><X size={18} /></button>
        </div>
        <div className="flex gap-4 px-5 py-2">
          <button onClick={() => setSel([...disponibles])} className="text-[#7CB342] text-rt-13 font-semibold">{t('evaluacion:selectAll')}</button>
          <button onClick={() => setSel([])} className="text-grey-500 text-rt-13">{t('evaluacion:clear')}</button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1">
          {disponibles.map((id) => {
            const on = sel.includes(id)
            const color = MEDIDAS.find((m) => m.id === id)!.color
            return (
              <button key={id} onClick={() => setSel(on ? sel.filter((x) => x !== id) : [...sel, id])}
                className={'flex items-center gap-3 p-3 rounded-[12px] border text-left ' + (on ? 'bg-[#7CB342]/10 border-[#7CB342]/30' : 'border-transparent')}>
                <span className={'w-6 h-6 rounded-[6px] flex items-center justify-center ' + (on ? 'bg-[#7CB342]' : 'border-2 border-grey-600')}>{on && <Check size={16} className="text-white" />}</span>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className={'text-white text-rt-14 ' + (on ? 'font-bold' : '')}>{t(`evaluacion:medida.${id}`)}</span>
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

export function ModalPerimetria({ ultimo, base, onCerrar, onGuardado }: { ultimo: RegistroPerimetria | null; base: Base; onCerrar: () => void; onGuardado: () => void }) {
  const { t } = useTranslation()
  const [v, setV] = useState<Record<Medida, string>>(() => Object.fromEntries(MEDIDAS.map((m) => [m.id, ultimo?.[m.id] != null ? String(Number(ultimo[m.id])) : ''])) as Record<Medida, string>)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const grupos: Medida[][] = [
    ['neck', 'shoulders', 'chest'], ['biceps_relaxed_l', 'biceps_relaxed_r'], ['biceps_contracted_l', 'biceps_contracted_r'],
    ['forearm_l', 'forearm_r'], ['waist', 'abdomen', 'hips'], ['thigh_l', 'thigh_r'], ['calf_l', 'calf_r'],
  ]

  async function guardar() {
    setError('')
    const fila: Record<string, number | null> = {}
    for (const m of MEDIDAS) {
      const n = leerNumero(v[m.id])
      if (Number.isNaN(n)) { setError(t('evaluacion:invalidNumber')); return }
      if (n != null && (n < 5 || n > 300)) { setError(t('evaluacion:perimRange')); return }
      fila[m.id] = n
    }
    if (Object.values(fila).every((x) => x == null)) { setError(t('evaluacion:perimNeedOne')); return }
    setGuardando(true)
    // Mismo día = se reemplaza; otro día = punto nuevo en el historial.
    const { error: err } = await supabase.from('assessment_perimetry').upsert(
      { ...fila, measured_on: hoyLocal(), student_id: base.studentId, teacher_id: base.teacherId },
      { onConflict: 'student_id,teacher_id,measured_on' },
    )
    if (err) { setGuardando(false); setError(t('evaluacion:saveError', { msg: detalleError(err) })); return }
    await marcarAutor(base.fichaId, base.autor)
    setGuardando(false)
    onGuardado()
  }

  return (
    <ModalEdicion titulo={t('evaluacion:sec.perimetria')} subtitulo={t('evaluacion:perimSubtitle')} guardando={guardando} error={error} onGuardar={() => void guardar()} onCerrar={onCerrar}>
      {grupos.map((g, i) => (
        <div key={i} className={'grid gap-3 ' + (g.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
          {g.map((id) => (
            <Campo key={id} etiqueta={t(`evaluacion:medidaLarga.${id}`)}>
              <Numero valor={v[id]} onChange={(x) => setV({ ...v, [id]: x })} sufijo="cm" placeholder="0" />
            </Campo>
          ))}
        </div>
      ))}
    </ModalEdicion>
  )
}

// ---------------- % de grasa ----------------

function datosGrasa(r: RegistroGrasa, ficha: Ficha) {
  const edad = edadDesde(ficha.birth_date)
  const pct = porcentajeGrasa(r.protocol, r, r.fat_pct, ficha.sex as Sexo | null, edad)
  const peso = ficha.weight_kg ?? r.weight_kg
  const gorda = pct != null && peso ? Number(peso) * pct / 100 : null
  return { pct, gorda, magra: gorda != null && peso ? Number(peso) - gorda : null, clase: claseGrasa(pct, ficha.sex as Sexo | null) }
}

export function SeccionGrasa({ registro, ficha, puedeEditar, onEditar }: { registro: RegistroGrasa | null; ficha: Ficha; puedeEditar: boolean; onEditar: () => void }) {
  const { t } = useTranslation()
  const d = registro ? datosGrasa(registro, ficha) : null
  if (!registro || !d || d.pct == null) {
    return (
      <div>
        <Vacio icono={PieChart} texto={t('evaluacion:fatEmpty')} accion={puedeEditar ? t('evaluacion:fatCalc') : undefined} onAccion={onEditar} />
        {registro && <p className="text-white/40 text-rt-11 text-center">{t('evaluacion:needBirthForFat')}</p>}
      </div>
    )
  }
  const pct = Math.min(Math.max(d.pct, 0), 100)
  const R = 52, C = 2 * Math.PI * R
  const colorClase = d.clase ? COLOR_GRASA[d.clase] : '#FFC107'
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="relative w-[120px] h-[120px] shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r={R} fill="none" stroke="#2D2D2D" strokeWidth="16" />
            <circle cx="60" cy="60" r={R} fill="none" stroke="#8BC34A" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${C * (1 - pct / 100)} ${C}`} />
            <circle cx="60" cy="60" r={R} fill="none" stroke="#FF7043" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${C * pct / 100} ${C}`} strokeDashoffset={-C * (1 - pct / 100)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[#FF7043] text-rt-20 font-bold">{d.pct.toFixed(1)}%</span>
            <span className="text-white/60 text-[10px]">{t('evaluacion:fat')}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <Leyenda color="#8BC34A" etiqueta={t('evaluacion:leanMass')} valor={d.magra != null ? `${uno(d.magra)} kg` : '-'} />
          <Leyenda color="#FF7043" etiqueta={t('evaluacion:fat')} valor={d.gorda != null ? `${uno(d.gorda)} kg` : '-'} />
          {d.clase && (
            <div>
              <div className="text-white/60 text-rt-11">{t('evaluacion:classification')}</div>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-[12px] text-rt-11 font-semibold border" style={{ color: colorClase, background: colorClase + '26', borderColor: colorClase + '4D' }}>{t(`evaluacion:claseGrasa.${d.clase}`)}</span>
            </div>
          )}
          <div className="text-white/40 text-[10px]">{t('evaluacion:protocolLine', { name: t(`evaluacion:protoGrasa.${registro.protocol}`) })}</div>
        </div>
      </div>
      {d.magra != null && d.gorda != null && (
        <div className="rounded-[12px] bg-[#252525] p-4 flex flex-col gap-2">
          <div className="text-white text-rt-14 font-semibold">{t('evaluacion:leanVsFat')}</div>
          <div className="h-6 rounded-[12px] overflow-hidden flex">
            <div className="bg-[#8BC34A]" style={{ width: `${100 - pct}%` }} />
            <div className="bg-[#FF7043]" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-center gap-4 text-white/60 text-rt-12">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-[2px] bg-[#8BC34A]" />{uno(d.magra)} kg</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-[2px] bg-[#FF7043]" />{uno(d.gorda)} kg</span>
          </div>
        </div>
      )}
    </div>
  )
}

function Leyenda({ color, etiqueta, valor }: { color: string; etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="flex-1 text-white/70 text-rt-12">{etiqueta}</span>
      <span className="text-white text-rt-14 font-semibold">{valor}</span>
    </div>
  )
}

export function ModalGrasa({ registro, ficha, base, onCerrar, onGuardado }: { registro: RegistroGrasa | null; ficha: Ficha; base: Base; onCerrar: () => void; onGuardado: () => void }) {
  const { t, i18n } = useTranslation()
  const txt = (v: number | null | undefined) => (v == null ? '' : String(Number(v)))
  const [protocolo, setProtocolo] = useState<ProtocoloGrasa>(registro?.protocol ?? 'pollock3')
  const [peso, setPeso] = useState(txt(ficha.weight_kg ?? registro?.weight_kg))
  const [plie, setPlie] = useState<Record<Pliegue, string>>(() => {
    const ks: Pliegue[] = ['chest', 'midaxillary', 'triceps', 'subscapular', 'abdomen', 'suprailiac', 'thigh']
    return Object.fromEntries(ks.map((k) => [k, txt(registro?.[k])])) as Record<Pliegue, string>
  })
  const [manual, setManual] = useState(txt(registro?.fat_pct))
  const [eligiendo, setEligiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const sexo = ficha.sex as Sexo | null
  const edad = edadDesde(ficha.birth_date)
  const campos = pliegues(protocolo, sexo)
  const num = (s: string) => { const v = leerNumero(s); return v == null || Number.isNaN(v) ? null : v }
  const valores = Object.fromEntries(campos.map((k) => [k, num(plie[k])])) as Partial<Record<Pliegue, number | null>>
  const pct = porcentajeGrasa(protocolo, valores, num(manual), sexo, edad)
  const pesoN = ficha.weight_kg ?? num(peso)
  const gorda = pct != null && pesoN ? Number(pesoN) * pct / 100 : null
  const clase = claseGrasa(pct, sexo)
  const faltaFicha = campos.length > 0 && (!sexo || edad == null)

  async function guardar() {
    setError('')
    if (campos.length ? campos.some((k) => !valores[k]) : !num(manual)) { setError(t('evaluacion:fillRequired')); return }
    if (pct != null && (pct < 2 || pct > 60)) { setError(t('evaluacion:fatOutOfRange')); return }
    setGuardando(true)
    const fila: Record<string, unknown> = {
      protocol: protocolo, weight_kg: num(peso), tested_on: hoyLocal(),
      fat_pct: campos.length ? null : num(manual),
      chest: null, midaxillary: null, triceps: null, subscapular: null, abdomen: null, suprailiac: null, thigh: null,
    }
    for (const k of campos) fila[k] = valores[k]
    const { error: err } = await supabase.from('assessment_bodyfat').insert({ ...fila, student_id: base.studentId, teacher_id: base.teacherId })
    if (err) { setGuardando(false); setError(t('evaluacion:saveError', { msg: detalleError(err) })); return }
    await marcarAutor(base.fichaId, base.autor)
    setGuardando(false)
    onGuardado()
  }

  return (
    <ModalEdicion
      titulo={t('evaluacion:sec.gordura')} subtitulo={t('evaluacion:bodyComposition')}
      guardando={guardando} error={error} onGuardar={() => void guardar()} onCerrar={onCerrar}
      extra={eligiendo && (
        <HojaRadio lista={PROTOCOLOS_GRASA.map((p) => { const x = t(`evaluacion:protoGrasa.${p}`); return { id: p, pt: x, es: x, en: x } })} valor={protocolo} lang={i18n.language}
          onElegir={(id) => { setProtocolo(id as ProtocoloGrasa); setEligiendo(false) }} onCerrar={() => setEligiendo(false)} />
      )}
    >
      <Campo etiqueta={t('evaluacion:protocol')}><Selector valor={t(`evaluacion:protoGrasa.${protocolo}`)} onClick={() => setEligiendo(true)} /></Campo>
      <div className="rounded-[8px] bg-[#252525] p-3 text-white/60 text-rt-12">{t(`evaluacion:protoGrasaInfo.${protocolo}`)}</div>
      <Campo etiqueta={t('evaluacion:currentWeight')}><Numero valor={peso} onChange={setPeso} sufijo="kg" placeholder="75,0" /></Campo>
      {faltaFicha && <p className="text-[#FFC107] text-rt-12">{t('evaluacion:needBirthForFat')}</p>}
      {campos.length > 0 ? (
        <>
          <div className="flex items-center gap-2 text-white text-rt-14 font-semibold mt-1"><span className="w-1 h-4 rounded bg-[#8BC34A]" />{t('evaluacion:skinfolds')}</div>
          {campos.map((k) => (
            <div key={k} className="flex items-center gap-3">
              <span className="flex-[2] text-white/80 text-rt-14">{t(`evaluacion:pliegue.${k}`)}</span>
              <div className="flex-1 flex items-center h-11 px-3 rounded-[8px] bg-[#252525] border border-white/10">
                <input inputMode="decimal" value={plie[k]} placeholder="0,0" onChange={(e) => setPlie({ ...plie, [k]: e.target.value.replace(/[^\d.,]/g, '') })}
                  className="w-full min-w-0 bg-transparent text-white text-rt-14 text-center outline-none placeholder:text-grey-600" />
                <span className="text-white/50 text-rt-12">mm</span>
              </div>
            </div>
          ))}
        </>
      ) : (
        <Campo etiqueta={t('evaluacion:fatPctField')}><Numero valor={manual} onChange={setManual} sufijo="%" placeholder="18,5" /></Campo>
      )}
      {pct != null && (
        <div className="rounded-[12px] bg-[#252525] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-white text-rt-14 font-semibold"><Calculator size={18} className="text-[#8BC34A]" />{t('evaluacion:results')}</div>
          <Fila etiqueta={t('evaluacion:fatPctShort')} valor={`${pct.toFixed(1)}%`} color="#FF7043" />
          <Fila etiqueta={t('evaluacion:fatMass')} valor={gorda != null ? `${uno(gorda)} kg` : '-'} color="#FF7043" />
          <Fila etiqueta={t('evaluacion:leanMass')} valor={gorda != null && pesoN ? `${uno(Number(pesoN) - gorda)} kg` : '-'} color="#8BC34A" />
          {clase && (
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-rt-13">{t('evaluacion:classification')}</span>
              <span className="px-2.5 py-0.5 rounded-[12px] text-rt-11 font-semibold border" style={{ color: COLOR_GRASA[clase], background: COLOR_GRASA[clase] + '26', borderColor: COLOR_GRASA[clase] + '4D' }}>{t(`evaluacion:claseGrasa.${clase}`)}</span>
            </div>
          )}
        </div>
      )}
    </ModalEdicion>
  )
}

function Fila({ etiqueta, valor, color }: { etiqueta: string; valor: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/60 text-rt-13">{etiqueta}</span>
      <span className="text-rt-16 font-bold" style={{ color }}>{valor}</span>
    </div>
  )
}

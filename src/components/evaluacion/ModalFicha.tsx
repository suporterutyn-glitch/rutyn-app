import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { detalleError } from '@/lib/errores'
import { leerNumero } from '@/lib/assessment'
import { HojaRadio } from '@/components/professor/SelectorRadio'
import type { Catalogo } from '@/lib/catalogos'
import type { Ficha } from './Evaluacion'

const TRABAJOS = ['remote', 'office', 'field', 'physical', 'mixed']
const NIVELES = ['sedentary', 'light', 'moderate', 'very', 'extreme']

export function ModalFicha({ ficha, autor, onCerrar, onGuardado }: {
  ficha: Ficha
  autor: { nombre: string | null; rol: 'teacher' | 'student' }
  onCerrar: () => void
  onGuardado: () => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const txt = (v: number | null) => (v == null ? '' : String(Number(v)).replace('.', lang.startsWith('en') ? '.' : ','))
  const [nacimiento, setNacimiento] = useState(ficha.birth_date ?? '')
  const [sexo, setSexo] = useState<'M' | 'F'>(ficha.sex ?? 'M')
  const [peso, setPeso] = useState(txt(ficha.weight_kg))
  const [altura, setAltura] = useState(txt(ficha.height_cm))
  const [objetivos, setObjetivos] = useState(ficha.goals ?? '')
  const [lesiones, setLesiones] = useState(ficha.injuries ?? '')
  const [patologias, setPatologias] = useState(ficha.pathologies ?? '')
  const [medicamentos, setMedicamentos] = useState(ficha.medications ?? '')
  const [comidas, setComidas] = useState(txt(ficha.meals_per_day))
  const [entrenos, setEntrenos] = useState(txt(ficha.workouts_per_week))
  const [trabajo, setTrabajo] = useState(ficha.work_type ?? '')
  const [nivel, setNivel] = useState(ficha.activity_level ?? 'sedentary')
  const [fuma, setFuma] = useState(ficha.smoker)
  const [hoja, setHoja] = useState<'sexo' | 'trabajo' | 'nivel' | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const hoy = new Date().toISOString().slice(0, 10)

  const cat = (id: string, texto: string): Catalogo => ({ id, pt: texto, es: texto, en: texto })

  async function guardar() {
    setError('')
    const p = leerNumero(peso), a = leerNumero(altura), c = leerNumero(comidas), e = leerNumero(entrenos)
    if ([p, a, c, e].some((n) => Number.isNaN(n))) { setError(t('evaluacion:invalidNumber')); return }
    // Si alguien escribe la altura en metros (1,75), se entiende como centímetros.
    const alturaCm = a != null && a > 0 && a < 3 ? Math.round(a * 100) : a
    if (alturaCm != null && (alturaCm < 100 || alturaCm > 250)) { setError(t('evaluacion:invalidHeight')); return }
    if (p != null && (p < 20 || p > 350)) { setError(t('evaluacion:invalidWeight')); return }
    if (nacimiento && (nacimiento < '1920-01-01' || nacimiento > hoy)) { setError(t('evaluacion:invalidDate')); return }
    setGuardando(true)
    const limpio = (s: string) => (s.trim() ? s.trim() : null)
    const { error: err } = await supabase.from('assessments').update({
      birth_date: nacimiento || null, sex: sexo, weight_kg: p, height_cm: alturaCm,
      goals: limpio(objetivos), injuries: limpio(lesiones), pathologies: limpio(patologias), medications: limpio(medicamentos),
      meals_per_day: c == null ? null : Math.round(c), workouts_per_week: e == null ? null : Math.round(e),
      work_type: trabajo || null, activity_level: nivel, smoker: fuma,
      updated_by_name: autor.nombre, updated_by_role: autor.rol,
    }).eq('id', ficha.id)
    setGuardando(false)
    if (err) { setError(t('evaluacion:saveError', { msg: detalleError(err) })); return }
    onGuardado()
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1E1E1E] flex flex-col">
      <div className="max-w-app w-full mx-auto flex items-center justify-between gap-3 px-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-4">
        <h2 className="text-white text-rt-20 font-bold">{t('evaluacion:sec.perfil')}</h2>
        <button onClick={onCerrar} aria-label={t('close')} className="w-9 h-9 rounded-full bg-[#333333] flex items-center justify-center text-white">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-app mx-auto px-6 pb-6 flex flex-col gap-4">
          <Campo etiqueta={t('evaluacion:birthDate')}>
            <input type="date" value={nacimiento} min="1920-01-01" max={hoy} onChange={(e) => setNacimiento(e.target.value)}
              className="w-full h-12 px-4 rounded-[12px] bg-[#252525] border border-[#333333] focus:border-[#7CB342] text-white text-rt-14 outline-none [color-scheme:dark]" />
          </Campo>
          <Campo etiqueta={t('evaluacion:sex')}>
            <Selector valor={sexo === 'F' ? t('evaluacion:female') : t('evaluacion:male')} onClick={() => setHoja('sexo')} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta={t('evaluacion:weight')}><Numero valor={peso} onChange={setPeso} sufijo="kg" placeholder={t('evaluacion:phWeight')} /></Campo>
            <Campo etiqueta={t('evaluacion:height')}><Numero valor={altura} onChange={setAltura} sufijo="cm" placeholder={t('evaluacion:phHeight')} /></Campo>
          </div>
          <Campo etiqueta={t('evaluacion:goals')}>
            <textarea rows={2} value={objetivos} onChange={(e) => setObjetivos(e.target.value)} placeholder={t('evaluacion:phGoals')}
              className="w-full px-4 py-3 rounded-[12px] bg-[#252525] border border-[#333333] focus:border-[#7CB342] text-white text-rt-14 outline-none resize-none placeholder:text-grey-600" />
          </Campo>
          <Campo etiqueta={t('evaluacion:injuries')}><Texto valor={lesiones} onChange={setLesiones} placeholder={t('evaluacion:phNoneF')} /></Campo>
          <Campo etiqueta={t('evaluacion:pathologies')}><Texto valor={patologias} onChange={setPatologias} placeholder={t('evaluacion:phNoneF')} /></Campo>
          <Campo etiqueta={t('evaluacion:medications')}><Texto valor={medicamentos} onChange={setMedicamentos} placeholder={t('evaluacion:phMeds')} /></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta={t('evaluacion:meals')}><Numero valor={comidas} onChange={setComidas} placeholder="5" entero /></Campo>
            <Campo etiqueta={t('evaluacion:workoutsPerWeek')}><Numero valor={entrenos} onChange={setEntrenos} placeholder="4" entero /></Campo>
          </div>
          <Campo etiqueta={t('evaluacion:workType')}>
            <Selector valor={trabajo ? t(`evaluacion:work.${trabajo}`) : ''} placeholder={t('evaluacion:selectOption')} onClick={() => setHoja('trabajo')} />
          </Campo>
          <Campo etiqueta={t('evaluacion:activityLevel')}>
            <Selector valor={t(`evaluacion:level.${nivel}`)} onClick={() => setHoja('nivel')} />
          </Campo>
          <label className="flex items-center justify-between h-12 px-4 rounded-[12px] bg-[#252525] border border-[#333333]">
            <span className="text-white text-rt-14">{t('evaluacion:smokerField')}</span>
            <button type="button" role="switch" aria-checked={fuma} onClick={() => setFuma(!fuma)}
              className={'w-12 h-7 rounded-full p-0.5 transition ' + (fuma ? 'bg-[#8BC34A]' : 'bg-[#2D2D2D]')}>
              <span className={'block w-6 h-6 rounded-full bg-white transition-transform ' + (fuma ? 'translate-x-5' : '')} />
            </button>
          </label>
          {error && <p className="text-[#EF5350] text-rt-13" role="alert">{error}</p>}
        </div>
      </div>

      <div className="border-t border-[#2D2D2D] px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="max-w-app mx-auto">
          <button onClick={() => void guardar()} disabled={guardando}
            className="w-full h-[54px] rounded-[27px] bg-gradient-to-b from-[#91C145] to-[#5A8F2F] shadow-[0_4px_12px_rgba(124,179,66,0.3)] text-white text-rt-16 font-bold flex items-center justify-center">
            {guardando ? <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : t('evaluacion:save')}
          </button>
        </div>
      </div>

      {hoja === 'sexo' && (
        <HojaRadio lista={[cat('M', t('evaluacion:male')), cat('F', t('evaluacion:female'))]} valor={sexo} lang={lang}
          onElegir={(id) => { setSexo(id as 'M' | 'F'); setHoja(null) }} onCerrar={() => setHoja(null)} />
      )}
      {hoja === 'trabajo' && (
        <HojaRadio lista={TRABAJOS.map((id) => cat(id, t(`evaluacion:work.${id}`)))} valor={trabajo} lang={lang}
          onElegir={(id) => { setTrabajo(id); setHoja(null) }} onCerrar={() => setHoja(null)} />
      )}
      {hoja === 'nivel' && (
        <HojaRadio lista={NIVELES.map((id) => cat(id, t(`evaluacion:level.${id}`)))} valor={nivel} lang={lang}
          onElegir={(id) => { setNivel(id); setHoja(null) }} onCerrar={() => setHoja(null)} />
      )}
    </div>
  )
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-white text-rt-13 font-semibold mb-1.5">{etiqueta}</div>
      {children}
    </div>
  )
}

function Texto({ valor, onChange, placeholder }: { valor: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full h-12 px-4 rounded-[12px] bg-[#252525] border border-[#333333] focus:border-[#7CB342] text-white text-rt-14 outline-none placeholder:text-grey-600" />
  )
}

function Numero({ valor, onChange, sufijo, placeholder, entero = false }: { valor: string; onChange: (v: string) => void; sufijo?: string; placeholder: string; entero?: boolean }) {
  return (
    <div className="flex items-center h-12 px-4 rounded-[12px] bg-[#252525] border border-[#333333] focus-within:border-[#7CB342]">
      <input inputMode={entero ? 'numeric' : 'decimal'} value={valor} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(entero ? /[^\d]/g : /[^\d.,]/g, ''))}
        className="flex-1 min-w-0 bg-transparent text-white text-rt-14 outline-none placeholder:text-grey-600" />
      {sufijo && <span className="text-white/50 text-rt-13 ml-2">{sufijo}</span>}
    </div>
  )
}

function Selector({ valor, placeholder, onClick }: { valor: string; placeholder?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full h-12 px-4 rounded-[12px] bg-[#252525] border border-[#333333] flex items-center justify-between text-left">
      <span className={valor ? 'text-white text-rt-14' : 'text-grey-600 text-rt-14'}>{valor || placeholder}</span>
      <ChevronDown size={20} className="text-white/60" />
    </button>
  )
}

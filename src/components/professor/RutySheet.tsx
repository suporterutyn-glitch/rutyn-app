import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Mic, Sparkles, Square } from 'lucide-react'
import { FullScreenSheet } from '@/pages/professor/projetos/RoutinesTab'
import { useAuth } from '@/lib/auth'
import { diasCortos } from '@/lib/fechas'
import { guardarBorrador, pedirRutina, RutyUpgrade, type BorradorRuty } from '@/lib/ruty'
import { mensajeError } from '@/lib/errores'

/** Pantalla de Ruty: el profesor dicta qué necesita, revisa el borrador y lo guarda en el alumno. */
export function RutySheet({ alumno, posicion, diasContrato, onCerrar, onGuardado, onUpgrade }: {
  alumno: { id: string; nombre: string }
  posicion: number
  diasContrato?: number[]
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
  onUpgrade: () => void
}) {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const [pedido, setPedido] = useState('')
  const [borrador, setBorrador] = useState<BorradorRuty | null>(null)
  const [pidiendo, setPidiendo] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nombresDias = diasCortos(i18n.language)

  // Dictado con el reconocimiento de voz del navegador (gratis, sin IA). Si el celular no lo tiene, queda el teclado.
  type Reconocedor = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void
    onresult: ((ev: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
    onend: (() => void) | null; onerror: (() => void) | null }
  const Voz = (window as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor })
  const ClaseVoz = Voz.SpeechRecognition ?? Voz.webkitSpeechRecognition
  const [escuchando, setEscuchando] = useState(false)
  const voz = useRef<Reconocedor | null>(null)
  useEffect(() => () => voz.current?.stop(), [])

  function dictar() {
    if (!ClaseVoz) return
    if (escuchando) { voz.current?.stop(); return }
    const r = new ClaseVoz()
    r.lang = ({ pt: 'pt-BR', es: 'es-419', en: 'en-US' } as Record<string, string>)[i18n.language.slice(0, 2)] ?? 'es-419'
    r.continuous = true
    r.interimResults = false
    const inicio = pedido.trim()
    let dicho = ''
    r.onresult = (ev) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) dicho += ev.results[i][0].transcript.trim() + ' '
      setPedido([inicio, dicho.trim()].filter(Boolean).join(' '))
    }
    r.onend = () => setEscuchando(false)
    r.onerror = () => setEscuchando(false)
    voz.current = r
    r.start()
    setEscuchando(true)
  }

  useEffect(() => {
    if (!pidiendo) return
    setSegundos(0)
    const iv = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(iv)
  }, [pidiendo])

  async function armar() {
    if (!pedido.trim() || pidiendo) return
    setPidiendo(true); setError(null); setBorrador(null)
    try { setBorrador(await pedirRutina(alumno.id, pedido.trim(), i18n.language.slice(0, 2))) }
    catch (e) {
      if (e instanceof RutyUpgrade) { onUpgrade(); return }
      setError((e as Error).message || t('ruty:error'))
    }
    finally { setPidiendo(false) }
  }

  async function guardar() {
    if (!borrador || !profile?.id) return
    setGuardando(true); setError(null)
    try {
      await guardarBorrador(borrador, { alumnoId: alumno.id, profesorId: profile.id, profesorNombre: profile.full_name ?? null, posicion, diasContrato })
      onGuardado(t('ruty:saved', { name: alumno.nombre }))
    } catch (e) { setError(mensajeError(e as Error)) }
    finally { setGuardando(false) }
  }

  return (
    <FullScreenSheet title={t('ruty:title')} onClose={onCerrar}>
      <p className="text-grey-400 text-rt-13 -mt-5 mb-5">{t('ruty:intro', { name: alumno.nombre })}</p>

      <label className="block text-white text-rt-13 font-semibold mb-2">{t('ruty:label')}</label>
      <div className="relative">
      <textarea
        rows={4}
        value={pedido}
        onChange={(e) => setPedido(e.target.value)}
        placeholder={t('ruty:placeholder')}
        disabled={pidiendo || guardando}
        className={'w-full px-4 py-3 rounded-[12px] bg-surface-input border border-surface-line text-white text-rt-14 placeholder:text-grey-600 focus:border-brand outline-none transition resize-none' + (ClaseVoz ? ' pr-14' : '')}
      />
      {ClaseVoz && (
        <button
          type="button"
          onClick={dictar}
          disabled={pidiendo || guardando}
          aria-label={escuchando ? t('ruty:stop') : t('ruty:speak')}
          className={'absolute right-2 bottom-3 w-10 h-10 rounded-full flex items-center justify-center transition '
            + (escuchando ? 'bg-danger-soft text-white animate-pulse' : 'bg-brand text-white')}
        >
          {escuchando ? <Square size={16} fill="currentColor" /> : <Mic size={19} />}
        </button>
      )}
      </div>
      <p className="text-grey-600 text-rt-12 mt-1.5">{escuchando ? t('ruty:listening') : ClaseVoz ? t('ruty:speakHint') : t('ruty:dictate')}</p>

      {!borrador && (
        <button onClick={() => void armar()} disabled={!pedido.trim() || pidiendo} className="btn-create mt-5">
          {pidiendo ? t('ruty:working', { s: segundos }) : (<><Sparkles size={18} /> {t('ruty:generate')}</>)}
        </button>
      )}
      {pidiendo && <p className="text-grey-400 text-rt-12 text-center mt-2">{t('ruty:workingHint')}</p>}
      {error && <p className="text-danger-soft text-rt-13 mt-4">{error}</p>}

      {borrador && (
        <div className="mt-6 flex flex-col gap-3">
          <div>
            <div className="text-white text-rt-18 font-bold">{borrador.plan.nombre}</div>
            <div className="text-grey-400 text-rt-13 mt-0.5">{borrador.plan.objetivo}</div>
          </div>

          {borrador.advertencias.length > 0 && (
            <div className="rounded-[12px] border border-[#5a4520] bg-[#221b10] p-4">
              <div className="flex items-center gap-2 text-[#F0B44C] text-rt-14 font-semibold mb-2"><AlertTriangle size={16} /> {t('ruty:warnings')}</div>
              <ul className="list-disc pl-5 flex flex-col gap-1.5 text-white/85 text-rt-13">
                {borrador.advertencias.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {borrador.plan.dias.map((d, i) => (
            <div key={i} className="rounded-card border border-surface-line bg-surface-raised p-4">
              <div className="text-white text-rt-15 font-semibold">{d.nombre}</div>
              {d.dias_semana.length > 0 && <div className="text-brand text-rt-12 mt-0.5">{t('ruty:days', { d: d.dias_semana.map((n) => nombresDias[n]).join(', ') })}</div>}
              <ul className="mt-3 flex flex-col divide-y divide-surface-line">
                {d.ejercicios.map((e, j) => (
                  <li key={j} className="py-2.5 flex gap-3 justify-between">
                    <div className="min-w-0">
                      <div className="text-white text-rt-14">{e.nombre}</div>
                      {e.notas && <div className="text-grey-400 text-rt-12 mt-0.5">{e.notas}</div>}
                    </div>
                    <div className="shrink-0 text-right text-grey-400 text-rt-12">
                      <div className="text-white/90">{t('ruty:sets', { n: e.series, v: e.tipo === 'tiempo' ? `${e.valor} s` : e.valor })}</div>
                      {(e.carga_kg || e.intensidad) && <div>{[e.carga_kg && `${e.carga_kg} kg`, e.intensidad].filter(Boolean).join(' · ')}</div>}
                      <div>{t('ruty:rest', { s: e.descanso_seg })}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <button onClick={() => void guardar()} disabled={guardando} className="btn-save mt-2">
            {guardando ? t('ruty:saving') : t('ruty:save', { name: alumno.nombre })}
          </button>
          <div className="flex gap-3">
            <button onClick={() => void armar()} disabled={guardando || pidiendo} className="flex-1 h-11 rounded-[12px] border border-surface-line text-white text-rt-14 font-semibold">
              {pidiendo ? t('ruty:working', { s: segundos }) : t('ruty:again')}
            </button>
            <button onClick={() => { setBorrador(null); setError(null) }} disabled={guardando || pidiendo} className="flex-1 h-11 rounded-[12px] border border-surface-line text-grey-400 text-rt-14 font-semibold">
              {t('ruty:discard')}
            </button>
          </div>
        </div>
      )}
    </FullScreenSheet>
  )
}

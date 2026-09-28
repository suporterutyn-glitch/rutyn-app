import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, ImagePlus, Images, Info, X, Grid3x3, RotateCcw, CalendarDays, Repeat, Trash2, ImageOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { detalleError } from '@/lib/errores'
import { localeDe } from '@/lib/fechas'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Autor } from './Pruebas'

export type Angulo = 'front' | 'back' | 'side'
export type FotoEval = { id: string; angle: Angulo; slot: 'reference' | 'current'; path: string; created_at: string; url?: string }
type Base = { studentId: string; teacherId: string; fichaId: string; autor: Autor }
const ANGULOS: Angulo[] = ['front', 'back', 'side']
const BUCKET = 'assessment-photos'

/** Reduce la foto a 1080×1920 como máximo y la pasa a JPEG 85 %. */
async function reducir(archivo: File): Promise<Blob> {
  const img = await createImageBitmap(archivo)
  const k = Math.min(1, 1080 / Math.min(img.width, img.height), 1920 / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return await new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('canvas'))), 'image/jpeg', 0.85))
}

/**
 * Sube la foto de un ángulo. Sin referencia, la nueva es la referencia; si ya hay, reemplaza a la 'actual'
 * (o a la referencia, si se pidió cambiarla). El archivo anterior se borra.
 */
export async function subirFoto(base: Base, fotos: FotoEval[], angulo: Angulo, archivo: File, cambiarReferencia = false) {
  const tieneRef = fotos.some((f) => f.angle === angulo && f.slot === 'reference')
  const slot = cambiarReferencia || !tieneRef ? 'reference' : 'current'
  const anterior = fotos.find((f) => f.angle === angulo && f.slot === slot)
  const blob = await reducir(archivo)
  const path = `${base.studentId}/${base.teacherId}/${angulo}-${slot}-${Date.now()}.jpg`
  const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
  if (up.error) throw up.error
  const { error } = await supabase.from('assessment_photos').upsert(
    { student_id: base.studentId, teacher_id: base.teacherId, angle: angulo, slot, path, created_at: new Date().toISOString() },
    { onConflict: 'student_id,teacher_id,angle,slot' },
  )
  if (error) { await supabase.storage.from(BUCKET).remove([path]); throw error }
  if (anterior) await supabase.storage.from(BUCKET).remove([anterior.path])
  await supabase.from('assessments').update({ updated_by_name: base.autor.nombre, updated_by_role: base.autor.rol }).eq('id', base.fichaId)
}

export async function firmarUrls(fotos: FotoEval[]): Promise<FotoEval[]> {
  if (fotos.length === 0) return fotos
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(fotos.map((f) => f.path), 3600)
  return fotos.map((f, i) => ({ ...f, url: data?.[i]?.signedUrl ?? undefined }))
}

export function SeccionFotos({ fotos, base, puedeEditar, onCambio }: { fotos: FotoEval[]; base: Base; puedeEditar: boolean; onCambio: () => void }) {
  const { t } = useTranslation()
  const [eligiendo, setEligiendo] = useState<{ angulo: Angulo; referencia: boolean } | null>(null)
  const [subiendo, setSubiendo] = useState<Angulo | null>(null)
  const [viendo, setViendo] = useState<Angulo | null>(null)
  const [error, setError] = useState('')

  async function elegido(archivo: File) {
    if (!eligiendo) return
    const { angulo, referencia } = eligiendo
    setEligiendo(null); setSubiendo(angulo); setError('')
    try { await subirFoto(base, fotos, angulo, archivo, referencia); onCambio() }
    catch (e) { setError(t('evaluacion:photoUploadError', { msg: detalleError(e) })) }
    finally { setSubiendo(null) }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        {ANGULOS.map((a) => {
          const delAngulo = fotos.filter((f) => f.angle === a)
          const ultima = delAngulo.find((f) => f.slot === 'current') ?? delAngulo.find((f) => f.slot === 'reference')
          return (
            <button
              key={a}
              disabled={!ultima && !puedeEditar}
              onClick={() => (ultima ? setViendo(a) : setEligiendo({ angulo: a, referencia: false }))}
              className="relative h-40 rounded-[12px] bg-[#252525] border border-[#2D2D2D] overflow-hidden flex flex-col items-center justify-center gap-2"
            >
              {ultima ? (
                <>
                  {ultima.url ? <img src={ultima.url} alt={t(`evaluacion:angle.${a}`)} className="absolute inset-0 w-full h-full object-cover" /> : <ImageOff size={28} className="text-white/30" />}
                  {delAngulo.length === 2 && <span className="absolute top-2 right-2 px-1.5 rounded-[8px] bg-black/60 text-white text-[10px] font-semibold">2</span>}
                  <span className="absolute inset-x-0 bottom-0 pt-6 pb-2 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
                    <span className="px-2 py-0.5 rounded-full bg-[#8BC34A] text-black text-[11px] font-semibold">{t('evaluacion:viewPhoto')}</span>
                  </span>
                </>
              ) : (
                <>
                  <ImagePlus size={32} className="text-white/30" />
                  <span className="text-white/40 text-[11px]">{puedeEditar ? t('evaluacion:addPhoto') : t('evaluacion:noPhoto')}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#8BC34A] text-black text-[11px] font-semibold">{t(`evaluacion:angle.${a}`)}</span>
                </>
              )}
              {subiendo === a && <span className="absolute inset-0 bg-black/70 flex items-center justify-center"><span className="w-7 h-7 rounded-full border-2 border-[#8BC34A]/30 border-t-[#8BC34A] animate-spin" /></span>}
            </button>
          )
        })}
      </div>
      {puedeEditar && (
        <div className="flex gap-2 rounded-[8px] bg-[#252525] p-3 text-white/50 text-[11px]">
          <Info size={16} className="shrink-0" /> {t('evaluacion:photoRule')}
        </div>
      )}
      {error && <p className="text-[#EF5350] text-rt-12" role="alert">{error}</p>}

      {eligiendo && <OrigenFoto onArchivo={(f) => void elegido(f)} onCerrar={() => setEligiendo(null)} />}
      {viendo && (
        <VisorFoto
          angulo={viendo}
          fotos={fotos.filter((f) => f.angle === viendo).sort((x) => (x.slot === 'reference' ? -1 : 1))}
          puedeEditar={puedeEditar}
          onCerrar={() => setViendo(null)}
          onNueva={(referencia) => { const a = viendo; setViendo(null); setEligiendo({ angulo: a, referencia }) }}
          onBorrada={() => { setViendo(null); onCambio() }}
        />
      )}
    </div>
  )
}

function OrigenFoto({ onArchivo, onCerrar }: { onArchivo: (f: File) => void; onCerrar: () => void }) {
  const { t } = useTranslation()
  const camara = useRef<HTMLInputElement>(null)
  const galeria = useRef<HTMLInputElement>(null)
  const tomar = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) onArchivo(f) }
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onCerrar}>
      <div className="w-full max-w-app rounded-t-[16px] bg-[#1E1E1E] pb-[calc(env(safe-area-inset-bottom)+16px)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-2"><span className="w-10 h-1 rounded-full bg-grey-500" /></div>
        <button onClick={() => camara.current?.click()} className="w-full flex items-center gap-4 px-6 py-4 text-white text-rt-15"><Camera size={22} />{t('evaluacion:camera')}</button>
        <button onClick={() => galeria.current?.click()} className="w-full flex items-center gap-4 px-6 py-4 text-white text-rt-15"><Images size={22} />{t('evaluacion:gallery')}</button>
        <input ref={camara} type="file" accept="image/*" capture="environment" className="hidden" onChange={tomar} />
        <input ref={galeria} type="file" accept="image/*" className="hidden" onChange={tomar} />
      </div>
    </div>
  )
}

function VisorFoto({ angulo, fotos, puedeEditar, onCerrar, onNueva, onBorrada }: {
  angulo: Angulo; fotos: FotoEval[]; puedeEditar: boolean
  onCerrar: () => void; onNueva: (referencia: boolean) => void; onBorrada: () => void
}) {
  const { t, i18n } = useTranslation()
  const [i, setI] = useState(fotos.length - 1)
  const [grilla, setGrilla] = useState(true)
  const [giro, setGiro] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [borrando, setBorrando] = useState(false)
  const [fallo, setFallo] = useState(false)
  const punteros = useRef(new Map<number, { x: number; y: number }>())
  const gesto = useRef<{ dist: number; zoom: number; x: number; y: number; pan: { x: number; y: number } } | null>(null)
  const foto = fotos[i]

  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); setFallo(false) }, [i])

  function abajo(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const ps = [...punteros.current.values()]
    gesto.current = {
      dist: ps.length === 2 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0,
      zoom, x: e.clientX, y: e.clientY, pan,
    }
  }
  function mover(e: React.PointerEvent) {
    if (!punteros.current.has(e.pointerId) || !gesto.current) return
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const ps = [...punteros.current.values()]
    const g = gesto.current
    if (ps.length === 2 && g.dist) {
      setZoom(Math.min(4, Math.max(0.5, g.zoom * Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) / g.dist)))
    } else if (ps.length === 1 && zoom !== 1) {
      setPan({ x: g.pan.x + e.clientX - g.x, y: g.pan.y + e.clientY - g.y })
    }
  }
  function arriba(e: React.PointerEvent) {
    const g = gesto.current
    // Deslizar con la foto sin zoom cambia entre referencia y actual.
    if (g && punteros.current.size === 1 && zoom === 1 && fotos.length === 2) {
      const dx = e.clientX - g.x
      if (dx < -50 && i < fotos.length - 1) setI(i + 1)
      if (dx > 50 && i > 0) setI(i - 1)
    }
    punteros.current.delete(e.pointerId)
    if (punteros.current.size === 0) gesto.current = null
  }

  const letras = 'ABCDEFGHIJKLMN'.split('')
  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col select-none">
      <div className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-2 z-10">
        <button onClick={onCerrar} aria-label={t('close')} className="text-white p-1"><X size={24} /></button>
        <span className="flex-1 text-white text-rt-16 font-semibold">{t(`evaluacion:angle.${angulo}`)}</span>
        <button onClick={() => setGrilla(!grilla)} aria-label={t('evaluacion:grid')} aria-pressed={grilla} className="p-1">
          <Grid3x3 size={22} className={grilla ? 'text-[#8BC34A]' : 'text-white/55'} />
        </button>
        {puedeEditar && <button onClick={() => onNueva(false)} aria-label={t('evaluacion:addPhoto')} className="p-1 text-white"><ImagePlus size={22} /></button>}
        {puedeEditar && <button onClick={() => setBorrando(true)} aria-label={t('evaluacion:deletePhoto')} className="p-1 text-white/70"><Trash2 size={20} /></button>}
      </div>

      <div
        className="relative flex-1 overflow-hidden touch-none"
        onPointerDown={abajo} onPointerMove={mover} onPointerUp={arriba} onPointerCancel={arriba}
        onWheel={(e) => setZoom((z) => Math.min(4, Math.max(0.5, z * (e.deltaY < 0 ? 1.1 : 0.9))))}
      >
        {fallo || !foto?.url ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60"><ImageOff size={64} />{t('evaluacion:photoLoadError')}</div>
        ) : (
          <img
            src={foto.url} alt="" draggable={false} onError={() => setFallo(true)}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${giro}deg)` }}
          />
        )}
        {grilla && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 140 140" preserveAspectRatio="none">
            {Array.from({ length: 13 }, (_, k) => (k + 1) * 10).map((p) => (
              <g key={p}>
                <line x1={p} x2={p} y1="0" y2="140" stroke="#8BC34A" strokeOpacity="0.5" strokeWidth={p === 70 ? 3 : 0.8} vectorEffect="non-scaling-stroke" />
                <line y1={p} y2={p} x1="0" x2="140" stroke="#8BC34A" strokeOpacity="0.5" strokeWidth={p === 70 ? 3 : 0.8} vectorEffect="non-scaling-stroke" />
              </g>
            ))}
          </svg>
        )}
        {grilla && (
          <>
            <div className="absolute top-0 inset-x-0 flex pointer-events-none">{letras.map((l) => <span key={l} className="flex-1 text-center text-white font-bold text-rt-12">{l}</span>)}</div>
            <div className="absolute left-0 inset-y-0 flex flex-col pointer-events-none">{letras.map((_, k) => <span key={k} className="flex-1 flex items-center pl-1 text-white font-bold text-rt-12">{k + 1}</span>)}</div>
          </>
        )}
      </div>

      {grilla && (
        <div className="flex items-center gap-3 px-4 py-2 bg-black/60">
          <RotateCcw size={18} className="text-white/70" />
          <input type="range" min={-45} max={45} step={1} value={giro} onChange={(e) => setGiro(Number(e.target.value))} className="flex-1 accent-[#8BC34A]" aria-label={t('evaluacion:rotation')} />
          <button onClick={() => setGiro(0)} className={'min-w-[44px] px-1.5 py-0.5 rounded text-rt-12 ' + (giro ? 'text-[#8BC34A] bg-[#8BC34A]/20' : 'text-white/50')}>{giro}°</button>
        </div>
      )}

      <div className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-2">
        {fotos.length === 2 && (
          <div className="flex justify-center gap-2">
            {fotos.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={`${k + 1}`} className={'w-2 h-2 rounded-full ' + (k === i ? 'bg-[#8BC34A]' : 'bg-white/30')} />)}
          </div>
        )}
        {fotos.length === 2 && foto && (
          <span className={'self-start px-2.5 py-0.5 rounded-full text-[11px] font-semibold ' + (foto.slot === 'reference' ? 'bg-white/15 text-white/70' : 'bg-[#8BC34A]/20 text-[#8BC34A]')}>
            {foto.slot === 'reference' ? t('evaluacion:referencePhoto') : t('evaluacion:currentPhoto')}
          </span>
        )}
        {foto && (
          <div className="flex items-center justify-between text-rt-13">
            <span className="flex items-center gap-1.5 text-white/80"><CalendarDays size={14} />{new Date(foto.created_at).toLocaleDateString(localeDe(i18n.language))}</span>
            <span className="text-white/60 text-rt-12">{t('evaluacion:nOfTotal', { n: i + 1, total: fotos.length })}</span>
          </div>
        )}
        {foto?.slot === 'reference' && puedeEditar && (
          <button onClick={() => onNueva(true)} className="self-start flex items-center gap-1 text-white/50 text-[11px]"><Repeat size={14} />{t('evaluacion:replaceReference')}</button>
        )}
        {grilla && (
          <div className="flex gap-4 text-white/60 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="w-4 h-[3px] bg-[#8BC34A]" />{t('evaluacion:centerLine')}</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-px bg-[#8BC34A]/60" />{t('evaluacion:auxGrid')}</span>
          </div>
        )}
      </div>

      {borrando && foto && (
        <ConfirmDialog
          message={t('evaluacion:deletePhotoTitle')}
          detail={t('evaluacion:deletePhotoBody')}
          confirmLabel={t('evaluacion:delete')}
          tone="danger"
          onCancel={() => setBorrando(false)}
          onConfirm={async () => {
            await supabase.from('assessment_photos').delete().eq('id', foto.id)
            await supabase.storage.from(BUCKET).remove([foto.path])
            setBorrando(false)
            onBorrada()
          }}
        />
      )}
    </div>
  )
}

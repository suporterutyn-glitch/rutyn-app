import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Share2, Download } from 'lucide-react'
import { crearImagenTreino, puedeCompartirArchivo, INSTAGRAM_RUTYN, type DatosTreino, type Formato } from '@/lib/compartirTreino'

/**
 * Hoja para compartir el entrenamiento en Instagram: muestra la imagen (historia o feed) y la manda
 * por el menú de compartir del teléfono. El texto con @rutynapp se copia para pegarlo en la publicación.
 */
export function CompartirTreino({ datos, leyenda, onCerrar }: { datos: DatosTreino; leyenda: string; onCerrar: () => void }) {
  const { t } = useTranslation()
  const [formato, setFormato] = useState<Formato>('story')
  const [vista, setVista] = useState<Record<Formato, string | null>>({ story: null, feed: null })
  const [aviso, setAviso] = useState<string | null>(null)
  // Las imágenes se preparan al abrir: en iPhone, compartir tiene que ocurrir en el mismo toque.
  const archivos = useRef<Partial<Record<Formato, File>>>({})

  useEffect(() => {
    let vivo = true
    const urls: string[] = []
    void (async () => {
      for (const f of ['story', 'feed'] as Formato[]) {
        try {
          const blob = await crearImagenTreino(f, datos)
          if (!vivo) return
          archivos.current[f] = new File([blob], `rutyn-${f === 'story' ? 'historia' : 'feed'}.png`, { type: 'image/png' })
          const url = URL.createObjectURL(blob)
          urls.push(url)
          setVista((v) => ({ ...v, [f]: url }))
        } catch { /* sin imagen: los botones quedan deshabilitados */ }
      }
    })()
    return () => { vivo = false; urls.forEach((u) => URL.revokeObjectURL(u)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const archivo = archivos.current[formato]
  const listo = !!vista[formato] && !!archivo
  const directo = !!archivo && puedeCompartirArchivo(archivo)

  async function copiarLeyenda() {
    try { await navigator.clipboard.writeText(leyenda); return true } catch { return false }
  }

  function descargar() {
    if (!vista[formato] || !archivo) return
    const a = document.createElement('a')
    a.href = vista[formato]!; a.download = archivo.name
    document.body.appendChild(a); a.click(); a.remove()
  }

  async function compartir() {
    if (!archivo) return
    // Copiar y compartir arrancan en el mismo toque: en iPhone, esperar a uno antes de lanzar el otro
    // hace que el sistema rechace el segundo.
    const copia = copiarLeyenda()
    const nota = async () => (formato === 'feed'
      ? ((await copia) ? t('treino:captionCopied', { ig: INSTAGRAM_RUTYN }) : null)
      : t('treino:storyTip', { ig: INSTAGRAM_RUTYN }))
    if (directo) {
      try { await navigator.share({ files: [archivo] }) } catch { return /* canceló */ }
      setAviso(await nota())
      return
    }
    descargar()
    setAviso([t('treino:downloaded'), await nota()].filter(Boolean).join(' '))
  }

  const chip = (activo: boolean) =>
    'flex-1 h-10 rounded-btn-pill text-rt-13 font-semibold border ' + (activo ? 'bg-brand border-brand text-white' : 'border-grey-700 text-grey-400')

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75" onClick={onCerrar}>
      <div
        className="w-full max-w-app max-h-[94dvh] overflow-y-auto rounded-t-[24px] bg-surface-card px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-rt-16 font-bold">{t('treino:shareSheet')}</h2>
          <button onClick={onCerrar} aria-label={t('close')} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white"><X size={18} /></button>
        </div>

        <div className="flex gap-2 mb-4">
          {(['story', 'feed'] as Formato[]).map((f) => (
            <button key={f} onClick={() => { setFormato(f); setAviso(null) }} className={chip(formato === f)}>{t(`treino:${f}`)}</button>
          ))}
        </div>

        <div className="flex justify-center mb-4">
          {vista[formato]
            ? <img src={vista[formato]!} alt="" className={'rounded-[16px] border border-surface-line ' + (formato === 'story' ? 'h-[46dvh]' : 'h-[40dvh]')} />
            : <div className="h-[40dvh] flex items-center text-white/60 text-rt-13">{t('treino:preparing')}</div>}
        </div>

        {aviso && <div className="mb-3 p-3 rounded-lg bg-brand/10 border border-brand/40 text-white text-rt-12">{aviso}</div>}

        <button disabled={!listo} onClick={() => void compartir()} className="btn-save flex items-center justify-center gap-2 disabled:opacity-50">
          <Share2 size={18} /> {t('treino:shareInstagram')}
        </button>
        {directo && (
          <button disabled={!listo} onClick={descargar} className="w-full h-11 mt-2 text-white/80 text-rt-13 font-semibold flex items-center justify-center gap-2">
            <Download size={16} /> {t('treino:downloadImage')}
          </button>
        )}
      </div>
    </div>
  )
}

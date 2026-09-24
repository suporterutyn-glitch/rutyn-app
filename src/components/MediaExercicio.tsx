import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Play, VideoOff, X } from 'lucide-react'

export type Media = {
  media_type?: string | null
  video_url?: string | null
  thumbnail_url?: string | null
}

/** youtube.com/watch?v=ID, youtu.be/ID y /shorts/ID -> el id del video. */
function idDeYoutube(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{6,})/)
  return m ? m[1] : null
}

function tipoDe(m: Media): 'video' | 'gif' | 'youtube' | null {
  if (!m.video_url) return null
  if (m.media_type === 'video' || m.media_type === 'gif' || m.media_type === 'youtube') return m.media_type
  // Datos viejos sin media_type: se deduce de la propia URL.
  if (idDeYoutube(m.video_url)) return 'youtube'
  if (/\.gif($|\?)/i.test(m.video_url)) return 'gif'
  return 'video'
}

const SELLO: Record<string, { texto: string; clase: string }> = {
  video: { texto: 'Vídeo', clase: 'bg-info' },
  gif: { texto: 'GIF', clase: 'bg-tone-purple' },
  youtube: { texto: 'YouTube', clase: 'bg-danger' },
}

/**
 * Banner de medios del ejercicio (print 026 del módulo 07): portada, botón de
 * reproducir y sello del tipo. Al tocarlo abre el reproductor a pantalla completa.
 */
export function BannerMedia({ media, alto = 160 }: { media: Media; alto?: number }) {
  const [abierto, setAbierto] = useState(false)
  const tipo = tipoDe(media)
  const portada = media.thumbnail_url
    || (tipo === 'youtube' && media.video_url ? `https://img.youtube.com/vi/${idDeYoutube(media.video_url)}/hqdefault.jpg` : null)

  if (!tipo) {
    return (
      <div
        className="w-full rounded-[12px] bg-surface-input border border-surface-line flex flex-col items-center justify-center gap-2"
        style={{ height: alto }}
      >
        <VideoOff size={36} className="text-grey-600" />
        <span className="text-grey-500 text-rt-12">Nenhuma mídia</span>
      </div>
    )
  }

  const sello = SELLO[tipo]

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="relative w-full rounded-[12px] bg-surface-input border border-surface-line overflow-hidden block"
        style={{ height: alto }}
      >
        {portada
          ? <img src={portada} alt="" className="w-full h-full object-cover" />
          : <span className="absolute inset-0 flex items-center justify-center text-grey-500 text-rt-12">Toque para reproduzir</span>}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-14 h-14 rounded-full bg-black/60 border-2 border-white/30 flex items-center justify-center">
            <Play size={30} className="text-white" fill="white" />
          </span>
        </span>
        <span className={'absolute bottom-2 right-2 px-2 py-1 rounded-md text-white text-rt-10 font-semibold ' + sello.clase}>
          {sello.texto}
        </span>
      </button>

      {abierto && <Reproductor media={media} tipo={tipo} onCerrar={() => setAbierto(false)} />}
    </>
  )
}

function Reproductor({ media, tipo, onCerrar }: {
  media: Media
  tipo: 'video' | 'gif' | 'youtube'
  onCerrar: () => void
}) {
  const url = media.video_url ?? ''
  return (
    <div className="fixed inset-0 z-[80] bg-black flex items-center justify-center" onClick={onCerrar}>
      <div className="w-full max-w-app px-2" onClick={(e) => e.stopPropagation()}>
        {tipo === 'youtube' && (
          <div className="relative w-full pt-[56.25%]">
            <iframe
              src={`https://www.youtube.com/embed/${idDeYoutube(url)}?autoplay=1`}
              title="Vídeo do exercício"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full rounded-[12px]"
            />
          </div>
        )}
        {tipo === 'video' && (
          <video src={url} controls autoPlay playsInline className="w-full max-h-[80dvh] rounded-[12px]" />
        )}
        {tipo === 'gif' && (
          <img src={url} alt="" className="w-full max-h-[80dvh] object-contain rounded-[12px]" />
        )}
      </div>

      <button
        onClick={onCerrar}
        className="absolute top-[calc(env(safe-area-inset-top)+16px)] right-4 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white"
        aria-label="Fechar"
      >
        <X size={22} />
      </button>
    </div>
  )
}

/**
 * Datos de catálogo de varios ejercicios (grupo, miniatura, video y tipo).
 * Lo usan el editor de rutina y la hoja de atribuir, que los necesitan juntos.
 */
export function useMediaDeExercicios(ids: (string | null)[]) {
  const [mapa, setMapa] = useState<Record<string, {
    muscle_group: string | null
    thumbnail_url: string | null
    video_url: string | null
    media_type: string | null
  }>>({})

  const clave = ids.filter(Boolean).sort().join(',')

  useEffect(() => {
    const limpios = clave ? clave.split(',') : []
    if (limpios.length === 0) { setMapa({}); return }
    void (async () => {
      const { data } = await supabase
        .from('exercises')
        .select('id,muscle_group,thumbnail_url,video_url,media_type')
        .in('id', limpios)
      const m: Record<string, any> = {}
      for (const x of (data as any[]) ?? []) {
        m[x.id] = {
          muscle_group: x.muscle_group,
          thumbnail_url: x.thumbnail_url,
          video_url: x.video_url,
          media_type: x.media_type,
        }
      }
      setMapa(m)
    })()
  }, [clave])

  return mapa
}

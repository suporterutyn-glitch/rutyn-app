import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, User as UserIcon, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { mensajeError } from '@/lib/errores'

type Props = { size?: number; className?: string }

const LADO = 512

/**
 * Recorta al centro en cuadrado y reduce a 512px en JPEG (~50–150 KB). Así sube
 * cualquier foto del celular: las de cámara de 3–6 MB, las HEIC del iPhone
 * (Safari las decodifica) y las que la galería entrega sin tipo MIME, que el
 * bucket rechazaría.
 */
async function prepararFoto(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const lado = Math.min(img.naturalWidth, img.naturalHeight)
    if (!lado) return null
    const destino = Math.min(LADO, lado)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = destino
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, destino, destino)
    return await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function AvatarUpload({ size = 96, className = '' }: Props) {
  const { t } = useTranslation()
  const { profile, refresh } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir la misma foto tras un error
    if (!file || !profile?.id) return
    setError(null); setUploading(true)

    const foto = await prepararFoto(file)
    if (!foto) { setError(t('general:ui.photoFormat')); setUploading(false); return }
    const path = `${profile.id}/avatar-${Date.now()}.jpg`

    const { error: upErr } = await supabase.storage.from('avatars').upload(path, foto, {
      cacheControl: '3600', upsert: false, contentType: 'image/jpeg',
    })
    if (upErr) { setError(mensajeError(upErr)); setUploading(false); return }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = pub.publicUrl

    // Remove antigos (best effort)
    if (profile.avatar_url) {
      const old = profile.avatar_url.split('/avatars/')[1]
      if (old && old !== path) await supabase.storage.from('avatars').remove([old]).catch(() => {})
    }

    const { error: perfilErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
    if (perfilErr) setError(mensajeError(perfilErr))
    await refresh()
    setUploading(false)
  }

  return (
    <div className={'flex flex-col items-center gap-2 ' + className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative rounded-full bg-surface-raised border-2 border-brand overflow-hidden active:scale-95 transition"
        style={{ width: size, height: size }}
        aria-label={t('general:ui.changePhoto')}
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <UserIcon size={size * 0.42} className="text-grey-500 mx-auto" />
        )}
        <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand border-2 border-surface-app flex items-center justify-center">
          {uploading ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
        </div>
      </button>
      {error && <div className="text-danger text-rt-10 text-center max-w-[140px]">{error}</div>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  )
}

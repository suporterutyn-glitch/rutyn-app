import { useRef, useState } from 'react'
import { Camera, User as UserIcon, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

type Props = { size?: number; className?: string }

export function AvatarUpload({ size = 96, className = '' }: Props) {
  const { profile, refresh } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return
    if (file.size > 2 * 1024 * 1024) { setError('Máximo 2MB'); return }
    setError(null); setUploading(true)

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type,
    })
    if (upErr) { setError(upErr.message); setUploading(false); return }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = pub.publicUrl

    // Remove antigos (best effort)
    if (profile.avatar_url) {
      const old = profile.avatar_url.split('/avatars/')[1]
      if (old && old !== path) await supabase.storage.from('avatars').remove([old]).catch(() => {})
    }

    await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
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
        aria-label="Alterar foto"
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
      {error && <div className="text-danger text-rt-10">{error}</div>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
    </div>
  )
}

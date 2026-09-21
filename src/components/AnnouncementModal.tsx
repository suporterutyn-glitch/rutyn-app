import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

type Ann = {
  id: string; title_pt: string; title_es: string | null
  body_pt: string | null; body_es: string | null
  media_url: string | null; cta_label_pt: string | null; cta_url: string | null
  audience: 'all' | 'teachers' | 'students'
  priority: number
}

export function AnnouncementModal() {
  const { profile } = useAuth()
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'pt'
  const [ann, setAnn] = useState<Ann | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      // Últimos anúncios ativos para a audiência
      const aud = profile.role === 'teacher' ? 'teachers' : 'students'
      const { data: list } = await supabase.from('announcements').select('*')
        .eq('is_active', true).in('audience', ['all', aud])
        .order('priority', { ascending: false }).order('created_at', { ascending: false }).limit(20)
      if (!list || list.length === 0) return
      // Filtra os já vistos
      const { data: seen } = await supabase.from('announcement_views').select('announcement_id').eq('user_id', profile.id)
      const seenIds = new Set((seen ?? []).map((v: any) => v.announcement_id))
      const next = (list as Ann[]).find((a) => !seenIds.has(a.id))
      if (next) setAnn(next)
    })()
  }, [profile?.id, profile?.role])

  if (!ann) return null

  async function dismiss() {
    if (!profile?.id || !ann) return
    await supabase.from('announcement_views').upsert({ announcement_id: ann.id, user_id: profile.id })
    setAnn(null)
  }

  const title = (lang === 'es' && ann.title_es) ? ann.title_es : ann.title_pt
  const body = (lang === 'es' && ann.body_es) ? ann.body_es : ann.body_pt

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={dismiss}>
      <div className="w-full max-w-sm rounded-card bg-surface-raised overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {ann.media_url && (
          <img src={ann.media_url} alt="" className="w-full h-40 object-cover" />
        )}
        <div className="p-5 relative">
          <button onClick={dismiss} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-grey-800 flex items-center justify-center">
            <X size={16} className="text-white" />
          </button>
          <div className="text-white text-rt-18 font-bold pr-8">{title}</div>
          {body && <div className="text-white/80 text-rt-13 mt-2">{body}</div>}
          {ann.cta_url && (
            <a href={ann.cta_url} target="_blank" rel="noreferrer" onClick={dismiss}
               className="block mt-4 h-11 rounded-btn-pill bg-brand text-white text-rt-14 font-bold flex items-center justify-center">
              {ann.cta_label_pt ?? 'Saber mais'}
            </a>
          )}
          <button onClick={dismiss} className="w-full mt-3 h-10 text-white/60 text-rt-12">Depois</button>
        </div>
      </div>
    </div>
  )
}

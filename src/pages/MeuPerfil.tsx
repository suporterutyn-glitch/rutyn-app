import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { AvatarUpload } from '@/components/AvatarUpload'

export function MeuPerfilPage() {
  const nav = useNavigate()
  const { t } = useTranslation()
  const { profile, refresh } = useAuth()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setName(profile?.full_name ?? '')
    setPhone(profile?.phone ?? '')
  }, [profile?.id])

  async function save() {
    if (!profile?.id) return
    setSaving(true)
    await supabase.from('profiles').update({
      full_name: name || null,
      phone: phone || null,
    }).eq('id', profile.id)
    await refresh()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">{t('settings:profile')}</h1>
      </div>

      <div className="flex flex-col items-center gap-3 mb-8">
        <AvatarUpload size={96} />
        <span className="px-3 h-7 rounded-menu bg-brand/15 border border-brand text-brand text-rt-11 font-bold tracking-[1.5px] uppercase">
          {profile?.role === 'teacher' ? 'PROFESSOR' : 'ALUNO'}
        </span>
      </div>

      <div className="flex flex-col gap-6">
        <UnderField label={t('name')} value={name} onChange={setName} />
        <UnderField label={t('whatsapp')} value={phone} onChange={setPhone} />
        <div>
          <label className="block text-surface-nav text-rt-12 mb-1">{t('email')}</label>
          <div className="w-full flex items-center gap-2 border-b border-surface-divider py-2">
            <span className="flex-1 text-grey-500 text-rt-13">{profile?.email}</span>
            <Lock size={14} className="text-grey-600" />
          </div>
        </div>
      </div>

      <div className="mt-10">
        <button onClick={save} disabled={saving} className="btn-save">
          {saving ? t('loading') : saved ? t('save') + ' ✓' : t('save')}
        </button>
      </div>
    </div>
  )
}

function UnderField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-surface-nav text-rt-12 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent border-b border-brand text-grey-300 text-rt-13 py-2 outline-none" />
    </div>
  )
}

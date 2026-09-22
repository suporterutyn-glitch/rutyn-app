import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Wallet, Lock, FileText, MessageCircle, LogOut, Trash2, Globe, Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { setLang } from '@/lib/i18n'
import { currentPermission, isPushSupported, subscribeToPush, unsubscribeFromPush } from '@/lib/push'

export function ConfiguracoesPage() {
  const nav = useNavigate()
  const { t, i18n } = useTranslation()
  const { profile, signOut } = useAuth()
  const isTeacher = profile?.role === 'teacher'
  const [deleting, setDeleting] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushErr, setPushErr] = useState<string | null>(null)

  useEffect(() => {
    void (async () => setPushOn((await currentPermission()) === 'granted'))()
  }, [])

  async function togglePush() {
    setPushErr(null)
    if (!profile?.id) return
    if (pushOn) {
      await unsubscribeFromPush()
      setPushOn(false)
    } else {
      const res = await subscribeToPush(profile.id)
      if (res.ok) setPushOn(true)
      else setPushErr(res.error ?? 'Erro ao ativar')
    }
  }

  async function deleteAccount() {
    if (!confirm('Isto marca sua conta para exclusão. Tem certeza?')) return
    if (!profile?.id) return
    setDeleting(true)
    await supabase.from('profiles').update({ account_status: 'deleting' }).eq('id', profile.id)
    await signOut()
  }

  const currentLang = i18n.language.startsWith('es') ? 'es' : i18n.language.startsWith('en') ? 'en' : 'pt'

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-18 font-semibold">{t('settings:title')}</h1>
      </div>

      {/* Language selector */}
      <div className="card-dark p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-brand" />
            <span className="text-white text-rt-14 font-semibold">{t('settings:language')}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {(['pt', 'es', 'en'] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)} className={
              'flex-1 h-10 rounded-btn-pill font-semibold text-rt-13 flex items-center justify-center gap-2 ' +
              (currentLang === l ? 'bg-brand text-white' : 'bg-surface-raised text-grey-400')
            }>
              <span className="text-lg leading-none">{l === 'pt' ? '🇧🇷' : l === 'es' ? '🇪🇸' : '🇺🇸'}</span>
              {l === 'pt' ? 'Português' : 'Español'}
            </button>
          ))}
        </div>
      </div>

      {isPushSupported() && (
        <div className="card-dark p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-brand" />
              <span className="text-white text-rt-14 font-semibold">Notificações push</span>
            </div>
            <button
              onClick={togglePush}
              className={
                'w-12 h-7 rounded-full flex items-center px-0.5 transition ' +
                (pushOn ? 'bg-brand justify-end' : 'bg-surface-raised justify-start')
              }
              aria-label="Toggle push"
            >
              <span className="w-6 h-6 rounded-full bg-white" />
            </button>
          </div>
          {pushErr && <div className="text-danger text-rt-11 mt-2">{pushErr}</div>}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        <MenuItem icon={User} label={t('settings:profile')} onClick={() => nav(isTeacher ? '/professor/perfil' : '/aluno/perfil')} />
        {isTeacher && (
          <>
            <MenuItem icon={Wallet} label={t('settings:plan')} onClick={() => nav('/professor/assinatura')} />
            <MenuItem icon={Wallet} label={t('settings:bank')} onClick={() => nav('/professor/dados-bancarios')} />
          </>
        )}
        <MenuItem icon={Lock} label={t('settings:security')} onClick={() => nav('/redefinir-senha')} />
        <MenuItem icon={FileText} label={t('settings:terms')} onClick={() => window.open('https://rutyn.app/termos', '_blank')} />
        <li>
          <a
            href="https://wa.me/5551999999999"
            target="_blank"
            rel="noreferrer"
            className="w-full h-12 rounded-btn-pill bg-whatsapp text-white text-rt-14 font-semibold flex items-center justify-center gap-2"
          >
            <MessageCircle size={18} /> {t('settings:support')}
          </a>
        </li>
      </ul>

      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={signOut}
          className="h-11 rounded-menu bg-danger-wine text-white text-rt-14 font-semibold flex items-center justify-center gap-2"
        >
          <LogOut size={18} /> {t('settings:signOut')}
        </button>
        <button
          onClick={deleteAccount}
          disabled={deleting}
          className="h-11 rounded-menu border border-[#8B0000]/50 text-danger text-rt-13 font-semibold flex items-center justify-center gap-2"
        >
          <Trash2 size={16} /> {t('settings:deleteAccount')}
        </button>
      </div>
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className="w-full h-12 px-4 rounded-menu border border-white/30 flex items-center gap-3 text-white text-rt-14 font-semibold">
        <Icon size={18} className="text-white/80" />
        <span className="flex-1 text-left">{label}</span>
      </button>
    </li>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, MessageSquare, Wallet, ClipboardCheck, Dumbbell, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { EmptyState } from '@/pages/professor/projetos/RoutinesTab'

type N = { id: string; type: string; title: string; body: string | null; read_at: string | null; created_at: string }

const ICON: Record<string, any> = {
  invite: MessageSquare, payment: Wallet, evaluation: ClipboardCheck,
  routine: Dumbbell, warning: AlertTriangle, info: Bell, system: Bell,
}
const COLOR: Record<string, string> = {
  invite: 'text-info-light', payment: 'text-brand', evaluation: 'text-brand-assess',
  routine: 'text-brand', warning: 'text-warning', info: 'text-white', system: 'text-white',
}

export function NotificacoesPage() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const [items, setItems] = useState<N[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(100)
      setItems((data as N[]) ?? [])
      // Marca todas como lidas
      const unread = ((data as N[]) ?? []).filter((n) => !n.read_at).map((n) => n.id)
      if (unread.length > 0) {
        await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', unread)
      }
      setLoading(false)
    })()
  }, [profile?.id])

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">Notificações</h1>
      </div>

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="Sem notificações" body="Você não tem novas notificações." />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => {
            const Icon = ICON[n.type] ?? Bell
            const color = COLOR[n.type] ?? 'text-white'
            return (
              <li key={n.id} className={'card-dark p-3 flex items-start gap-3 ' + (n.read_at ? '' : 'border-brand/40')}>
                <div className="w-9 h-9 rounded-lg bg-surface-input flex items-center justify-center">
                  <Icon size={18} className={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-rt-13 font-bold">{n.title}</div>
                  {n.body && <div className="text-white/70 text-rt-12">{n.body}</div>}
                  <div className="text-grey-500 text-rt-10 mt-1">{new Date(n.created_at).toLocaleString('pt-BR')}</div>
                </div>
                {!n.read_at && <span className="w-2 h-2 rounded-full bg-brand" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

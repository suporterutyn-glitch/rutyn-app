import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send, MessageSquare, User as UserIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { EmptyState } from '@/pages/professor/projetos/RoutinesTab'

type Conv = {
  id: string; teacher_id: string; student_id: string
  last_message: string | null; last_message_at: string | null
  other?: { id: string; full_name: string | null; avatar_url: string | null }
}

export function ConversasPage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const [convs, setConvs] = useState<Conv[]>([])
  const [loading, setLoading] = useState(true)
  const isTeacher = profile?.role === 'teacher'

  useEffect(() => {
    if (!profile?.id) return
    void loadOrBoot()
    // subscribe to updates on conversations
    const ch = supabase
      .channel('conv-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => { void loadOrBoot() })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [profile?.id])

  async function loadOrBoot() {
    if (!profile?.id) return
    setLoading(true)

    if (isTeacher) {
      // Garante uma conversation para cada aluno ativo
      const { data: students } = await supabase.from('profiles').select('id').eq('teacher_id', profile.id).eq('link_status', 'active')
      if (students && students.length > 0) {
        const upserts = students.map((s: any) => ({ teacher_id: profile.id, student_id: s.id }))
        await supabase.from('conversations').upsert(upserts, { onConflict: 'teacher_id,student_id', ignoreDuplicates: true })
      }
    } else if (profile.teacher_id) {
      await supabase.from('conversations').upsert({ teacher_id: profile.teacher_id, student_id: profile.id }, { onConflict: 'teacher_id,student_id', ignoreDuplicates: true })
    }

    const otherKey = isTeacher ? 'student_id' : 'teacher_id'
    const meKey = isTeacher ? 'teacher_id' : 'student_id'
    const { data } = await supabase
      .from('conversations')
      .select(`id,teacher_id,student_id,last_message,last_message_at`)
      .eq(meKey, profile.id)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    const rows = (data as Conv[]) ?? []
    // Buscar dados do outro
    if (rows.length > 0) {
      const ids = rows.map((r: any) => r[otherKey])
      const { data: others } = await supabase.from('profiles').select('id,full_name,avatar_url').in('id', ids)
      const map = new Map((others ?? []).map((o: any) => [o.id, o]))
      rows.forEach((r) => { r.other = map.get(isTeacher ? r.student_id : r.teacher_id) })
    }
    setConvs(rows)
    setLoading(false)
  }

  const backTo = isTeacher ? '/professor' : '/aluno'

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        {!isTeacher && (
          <button onClick={() => nav(backTo)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-white text-rt-20 font-bold">Mensagens</h1>
      </div>

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : convs.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Sem conversas" body={isTeacher ? "Assim que você tiver alunos ativos aparecerão aqui." : "Aguarde ser vinculado a um professor."} />
      ) : (
        <ul className="flex flex-col gap-2">
          {convs.map((c) => {
            const goto = isTeacher ? `/professor/mensagens/${c.id}` : `/aluno/chat/${c.id}`
            return (
              <li key={c.id} onClick={() => nav(goto)} className="card-dark p-3 flex items-center gap-3 cursor-pointer active:scale-[0.99]">
                <div className="w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center overflow-hidden">
                  {c.other?.avatar_url ? <img src={c.other.avatar_url} alt="" className="w-full h-full object-cover" /> : <UserIcon size={22} className="text-grey-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-rt-14 font-bold truncate">{c.other?.full_name ?? '...'}</div>
                  <div className="text-white/60 text-rt-11 truncate">{c.last_message ?? 'Toque para conversar'}</div>
                </div>
                {c.last_message_at && (
                  <div className="text-grey-500 text-rt-10 self-start mt-1">
                    {new Date(c.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

type Msg = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string }

export function ConversaPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [other, setOther] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null)
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    void (async () => {
      const { data: conv } = await supabase.from('conversations').select('teacher_id,student_id').eq('id', id).single()
      if (conv) {
        const otherId = profile?.id === conv.teacher_id ? conv.student_id : conv.teacher_id
        const { data: p } = await supabase.from('profiles').select('full_name,avatar_url').eq('id', otherId).single()
        setOther(p as any)
      }
      const { data: m } = await supabase.from('messages').select('*').eq('conversation_id', id).order('created_at')
      setMsgs((m as Msg[]) ?? [])
    })()

    const ch = supabase
      .channel(`msg-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
        setMsgs((prev) => [...prev, payload.new as Msg])
      })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [id, profile?.id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length])

  async function send() {
    if (!id || !profile?.id || !text.trim()) return
    const body = text.trim()
    setText('')
    await supabase.from('messages').insert({ conversation_id: id, sender_id: profile.id, body })
  }

  return (
    <div className="app-shell chat-bg">
      <div className="relative z-10 min-h-dvh flex flex-col">
        <div className="sticky top-0 bg-surface-app/95 backdrop-blur px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 flex items-center gap-3 border-b border-surface-line">
          <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center overflow-hidden">
            {other?.avatar_url ? <img src={other.avatar_url} alt="" className="w-full h-full object-cover" /> : <UserIcon size={20} className="text-grey-500" />}
          </div>
          <div className="text-white text-rt-15 font-bold flex-1 truncate">{other?.full_name ?? '...'}</div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {msgs.map((m) => {
            const mine = m.sender_id === profile?.id
            return (
              <div key={m.id} className={'max-w-[80%] rounded-bubble px-3 py-2 ' + (mine ? 'self-end bg-brand text-white rounded-br-none' : 'self-start bg-surface-raised text-white rounded-bl-none')}>
                <div className="text-rt-14 whitespace-pre-wrap break-words">{m.body}</div>
                <div className={'text-rt-10 mt-0.5 ' + (mine ? 'text-white/70 text-right' : 'text-grey-500')}>
                  {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>

        <div className="sticky bottom-0 bg-surface-app px-3 py-2 flex items-center gap-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
            placeholder="Digite sua mensagem…"
            className="flex-1 h-11 px-4 rounded-sheet-lg bg-surface-raised text-white text-rt-14 outline-none focus:ring-1 focus:ring-brand placeholder:text-grey-500"
          />
          <button onClick={send} disabled={!text.trim()} className="w-11 h-11 rounded-full bg-brand flex items-center justify-center disabled:opacity-40">
            <Send size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

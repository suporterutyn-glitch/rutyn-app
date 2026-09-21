import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Users, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Field } from './projetos/RoutinesTab'

type Student = { id: string; full_name: string | null; email: string | null }

export function CriarNotificacaoPage() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase.from('profiles')
        .select('id,full_name,email').eq('teacher_id', profile.id).eq('link_status', 'active').order('full_name')
      setStudents((data as Student[]) ?? [])
    })()
  }, [profile?.id])

  function toggle(id: string) {
    const n = new Set(selected); if (n.has(id)) n.delete(id); else n.add(id); setSelected(n)
  }
  function toggleAll() {
    if (selected.size === students.length) setSelected(new Set())
    else setSelected(new Set(students.map((s) => s.id)))
  }

  async function send() {
    if (!profile?.id || !title.trim() || selected.size === 0) return
    setSaving(true)
    await supabase.from('notifications').insert(Array.from(selected).map((uid) => ({
      user_id: uid, type: 'info', title: title.trim(), body: body.trim() || null,
    })))
    setSaving(false)
    setSaved(true)
    setTimeout(() => nav(-1), 1500)
  }

  const allOn = students.length > 0 && selected.size === students.length

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-32">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">Nova notificação</h1>
      </div>

      <div className="flex flex-col gap-6">
        <Field label="Título"><input className="input-dark" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Aula cancelada" /></Field>
        <Field label="Mensagem">
          <textarea className="input-dark h-24 py-3 resize-none" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Detalhes..." />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-white text-rt-13 font-semibold flex items-center gap-2">
              <Users size={16} /> Destinatários ({selected.size}/{students.length})
            </div>
            <button onClick={toggleAll} className="text-brand text-rt-12 font-semibold">
              {allOn ? 'Limpar' : 'Selecionar todos'}
            </button>
          </div>
          {students.length === 0 ? (
            <div className="card-dark p-4 text-white/60 text-rt-13">Nenhum aluno ativo.</div>
          ) : (
            <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {students.map((s) => (
                <li key={s.id}>
                  <button onClick={() => toggle(s.id)} className={
                    'w-full flex items-center gap-3 p-3 rounded-card border ' +
                    (selected.has(s.id) ? 'bg-brand/20 border-brand' : 'bg-transparent border-grey-700')
                  }>
                    <div className={'w-5 h-5 rounded-sm border-2 flex items-center justify-center ' + (selected.has(s.id) ? 'bg-brand border-brand' : 'border-grey-500')}>
                      {selected.has(s.id) && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-white text-rt-13 flex-1 text-left truncate">{s.full_name ?? s.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-bg-app/95 backdrop-blur">
        <button onClick={send} disabled={saving || !title.trim() || selected.size === 0} className="btn-save disabled:opacity-50">
          {saving ? 'Enviando…' : saved ? `${selected.size} enviadas ✓` : (<><Send size={16} className="inline mr-1" /> Enviar</>)}
        </button>
      </div>
    </div>
  )
}

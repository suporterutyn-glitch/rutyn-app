import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Send, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { EmptyState, FullScreenSheet } from '@/pages/professor/projetos/RoutinesTab'

type Q = { id: string; label_pt: string; label_es: string; type: 'text' | 'select' | 'yesno' | 'number'; options?: string[] }
type Template = { id: string; name: string; questions: Q[] }
type Answer = {
  id: string
  template_id: string
  student_id: string
  submitted_at: string | null
  answers: Record<string, any>
  anamnesis_templates?: { name: string; questions: Q[] }
  profiles?: { full_name: string | null }
}

// PROFESSOR — lista de anamneses de um aluno + botão enviar novo modelo
export function AnamneseProfessorPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [answers, setAnswers] = useState<Answer[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showSend, setShowSend] = useState(false)

  async function load() {
    if (!id || !profile?.id) return
    setLoading(true)
    const [{ data: ans }, { data: tpls }] = await Promise.all([
      supabase.from('anamnesis_answers').select('*,anamnesis_templates(name,questions)').eq('student_id', id).eq('teacher_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('anamnesis_templates').select('id,name,questions').eq('is_active', true),
    ])
    setAnswers((ans as unknown as Answer[]) ?? [])
    setTemplates((tpls as Template[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [id, profile?.id])

  async function send(templateId: string) {
    if (!id || !profile?.id) return
    await supabase.from('anamnesis_answers').insert({ student_id: id, teacher_id: profile.id, template_id: templateId })
    await supabase.from('notifications').insert({ user_id: id, type: 'evaluation', title: 'Anamnese pendente', body: 'Seu professor enviou uma anamnese para responder.' })
    setShowSend(false)
    await load()
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">Anamneses</h1>
      </div>

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : answers.length === 0 ? (
        <EmptyState icon={FileText} title="Sem anamneses" body="Envie uma anamnese para o aluno responder." />
      ) : (
        <ul className="flex flex-col gap-3 mb-6">
          {answers.map((a) => (
            <li key={a.id} className="card-dark p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={16} className="text-brand-assess" />
                <span className="text-white text-rt-14 font-bold">{a.anamnesis_templates?.name}</span>
              </div>
              <div className="text-white/60 text-rt-11">
                {a.submitted_at
                  ? `Respondida em ${new Date(a.submitted_at).toLocaleDateString('pt-BR')}`
                  : 'Aguardando o aluno responder'}
              </div>
              {a.submitted_at && Object.keys(a.answers).length > 0 && (
                <details className="mt-3">
                  <summary className="text-brand text-rt-12 font-semibold cursor-pointer">Ver respostas</summary>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {(a.anamnesis_templates?.questions ?? []).map((q) => (
                      <li key={q.id} className="text-white/80 text-rt-12">
                        <strong className="text-white">{q.label_pt}:</strong> {String(a.answers[q.id] ?? '—')}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      <button onClick={() => setShowSend(true)} className="btn-primary-pill">
        <Send size={18} /> Enviar nova anamnese
      </button>

      {showSend && (
        <FullScreenSheet title="Escolher anamnese" onClose={() => setShowSend(false)}>
          <ul className="flex flex-col gap-3">
            {templates.map((t) => (
              <li key={t.id}>
                <button onClick={() => send(t.id)} className="w-full card-dark p-4 flex items-center gap-3">
                  <FileText size={20} className="text-brand-assess" />
                  <div className="flex-1 text-left">
                    <div className="text-white text-rt-14 font-bold">{t.name}</div>
                    <div className="text-white/60 text-rt-11">{t.questions.length} perguntas</div>
                  </div>
                  <ChevronRight size={20} className="text-grey-500" />
                </button>
              </li>
            ))}
          </ul>
        </FullScreenSheet>
      )}
    </div>
  )
}

// ALUNO — lista de anamneses pendentes + responde
export function AnamneseAlunoListaPage() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const [items, setItems] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase.from('anamnesis_answers').select('*,anamnesis_templates(name,questions)').eq('student_id', profile.id).order('created_at', { ascending: false })
      setItems((data as unknown as Answer[]) ?? [])
      setLoading(false)
    })()
  }, [profile?.id])

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">Anamneses</h1>
      </div>

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={FileText} title="Sem anamneses" body="Seu professor ainda não enviou nenhuma anamnese." />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((a) => (
            <li key={a.id}>
              <button onClick={() => nav(`/aluno/anamnese/${a.id}`)} className="w-full card-dark p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-surface-input flex items-center justify-center">
                  <FileText size={20} className={a.submitted_at ? 'text-brand' : 'text-warning'} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white text-rt-14 font-bold">{a.anamnesis_templates?.name}</div>
                  <div className={'text-rt-11 ' + (a.submitted_at ? 'text-brand' : 'text-warning')}>
                    {a.submitted_at ? 'Respondida' : 'Pendente'}
                  </div>
                </div>
                <ChevronRight size={20} className="text-grey-500" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ALUNO — questionário passo a passo
export function AnamneseResponderPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'pt'
  const [ans, setAns] = useState<Answer | null>(null)
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    void (async () => {
      const { data } = await supabase.from('anamnesis_answers').select('*,anamnesis_templates(name,questions)').eq('id', id).single()
      setAns(data as unknown as Answer)
      setValues((data?.answers as any) ?? {})
    })()
  }, [id])

  const questions = ans?.anamnesis_templates?.questions ?? []
  const q = questions[step]
  const isLast = step === questions.length - 1
  const label = q ? (lang === 'es' ? q.label_es : q.label_pt) : ''

  async function next() {
    if (!q) return
    if (isLast) return submit()
    setStep(step + 1)
  }

  async function submit() {
    if (!id) return
    setSaving(true)
    await supabase.from('anamnesis_answers').update({ answers: values, submitted_at: new Date().toISOString() }).eq('id', id)
    setSaving(false)
    nav('/aluno/avaliacao', { replace: true })
  }

  const val = q ? values[q.id] ?? '' : ''
  const canNext = val !== ''

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-18 font-semibold">{ans?.anamnesis_templates?.name}</h1>
      </div>

      {q ? (
        <>
          <div className="mb-6">
            <div className="h-1.5 rounded-full bg-surface-raised overflow-hidden">
              <div className="h-full bg-brand transition-all" style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
            </div>
            <div className="text-white/60 text-rt-11 mt-1">{step + 1} / {questions.length}</div>
          </div>

          <div className="text-white text-rt-18 font-bold mb-6">{label}</div>

          {q.type === 'text' && (
            <textarea className="input-dark h-32 py-3 resize-none w-full" value={val} onChange={(e) => setValues({ ...values, [q.id]: e.target.value })} placeholder={t('common:type', { defaultValue: 'Escreva sua resposta…' })} />
          )}
          {q.type === 'number' && (
            <input type="number" inputMode="numeric" className="input-dark" value={val} onChange={(e) => setValues({ ...values, [q.id]: e.target.value })} />
          )}
          {q.type === 'yesno' && (
            <div className="flex gap-3">
              {['Sim', 'Não'].map((opt) => (
                <button key={opt} onClick={() => setValues({ ...values, [q.id]: opt })} className={
                  'flex-1 h-14 rounded-btn-pill border-2 text-rt-16 font-bold ' +
                  (val === opt ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-grey-400')
                }>{lang === 'es' ? (opt === 'Sim' ? 'Sí' : 'No') : opt}</button>
              ))}
            </div>
          )}
          {q.type === 'select' && (
            <div className="flex flex-col gap-2">
              {(q.options ?? []).map((opt) => (
                <button key={opt} onClick={() => setValues({ ...values, [q.id]: opt })} className={
                  'h-12 rounded-btn-pill border text-rt-14 font-semibold px-4 text-left ' +
                  (val === opt ? 'bg-brand border-brand text-white' : 'bg-surface-raised border-transparent text-white')
                }>{opt}</button>
              ))}
            </div>
          )}

          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app px-4 pb-4"
               style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
            <button onClick={next} disabled={!canNext || saving} className="btn-save disabled:opacity-50">
              {isLast ? (saving ? '...' : 'Enviar') : t('common:continue', { defaultValue: 'Continuar' })}
            </button>
          </div>
        </>
      ) : (
        <div className="text-white/60 text-rt-13 py-8 text-center">Carregando…</div>
      )}
    </div>
  )
}

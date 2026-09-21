import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserPlus, X, User as UserIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { EmptyState, FullScreenSheet, Field } from './projetos/RoutinesTab'

type Student = {
  id: string
  full_name: string | null
  email: string | null
  link_status: string
  avatar_url: string | null
}

const PLAN_LIMITS: Record<string, number> = { free: 2, pro: 25, master: 50, elite: 100 }

export function AlunosPage() {
  const { profile } = useAuth()
  const { t } = useTranslation()
  const [items, setItems] = useState<Student[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const planLimit = PLAN_LIMITS[profile?.plan ?? 'free'] ?? 2

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id,full_name,email,link_status,avatar_url')
      .eq('teacher_id', profile.id)
      .order('full_name')
    setItems((data as Student[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [profile?.id])

  const active = items.filter((s) => s.link_status === 'active').length
  const filtered = items.filter((s) => (s.full_name ?? '').toLowerCase().includes(query.toLowerCase()))
  const pct = Math.min(100, Math.round((active / planLimit) * 100))
  const barColor = pct > 80 ? 'bg-danger-soft' : pct > 55 ? 'bg-warning' : pct > 35 ? 'bg-[#CDDC39]' : 'bg-brand-light'
  const canAdd = active < planLimit

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-white text-rt-20 font-bold">{t('students:title')}</h1>
      </div>

      {/* Barra de limite do plano */}
      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-white/70 text-rt-11 font-semibold uppercase tracking-wide">{t('students:limit', { active, limit: planLimit })}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-surface-raised overflow-hidden">
          <div className={'h-full ' + barColor} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => canAdd && setShowNew(true)}
          disabled={!canAdd}
          className={
            'w-[42px] h-[42px] rounded-full flex items-center justify-center ' +
            (canAdd ? 'bg-brand' : 'bg-grey-600')
          }
          aria-label="Adicionar aluno"
        >
          <UserPlus size={20} className="text-white" />
        </button>
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-grey-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('students:searchStudent')}
            className="w-full h-[42px] pl-11 pr-10 rounded-[20px] bg-black/30 border border-brand/30 text-white text-rt-13 placeholder:text-grey-600 outline-none focus:border-brand"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-500" aria-label="Limpar">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-white/60 text-rt-13 py-8 text-center">{t('loading')}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserIcon} title={t('students:noStudents')} body={t('students:noStudentsSub')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link to={`/professor/alunos/${s.id}`} className="card-dark p-4 flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center overflow-hidden">
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={22} className="text-grey-500" />
                    )}
                  </div>
                  <span className={
                    'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface-card ' +
                    (s.link_status === 'active' ? 'bg-brand' : s.link_status === 'suspended' ? 'bg-danger' : 'bg-grey-500')
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-rt-17 font-bold truncate">{s.full_name ?? 'Sem nome'}</div>
                  <div className="text-grey-500 text-rt-11 truncate">{s.email}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showNew && <NewStudentSheet profile={profile} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); void load() }} />}
    </div>
  )
}

function NewStudentSheet({ profile, onClose, onCreated }: { profile: any; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!name.trim() || !email.trim()) { setError('Preencha todos os campos'); return }
    setSaving(true)
    setError(null)

    try {
      const { data, error } = await supabase.functions.invoke('create-student', {
        body: { email: email.trim(), full_name: name.trim(), teacher_id: profile?.id },
      })
      setSaving(false)
      if (error) {
        setError(error.message || 'Erro ao criar aluno')
        return
      }
      if (data?.error) {
        setError(data.error)
        return
      }
      onCreated()
    } catch (err) {
      setError(String(err))
      setSaving(false)
    }
  }

  return (
    <FullScreenSheet title="Cadastrar Aluno" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <Field label="Nome"><input className="input-dark" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="E-mail"><input type="email" className="input-dark" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        {error && <div className="text-rt-11 text-warning">{error}</div>}
      </div>
      <div className="mt-8">
        <button className="btn-save" disabled={saving} onClick={save}>{saving ? 'Salvando...' : 'Cadastrar Aluno'}</button>
      </div>
    </FullScreenSheet>
  )
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Users, TrendingUp, CreditCard, Mail, LogOut } from 'lucide-react'

type Tab = 'dashboard' | 'professors' | 'students' | 'subscriptions' | 'emails'

type Stats = {
  totalProfessors: number
  totalStudents: number
  activeSubscriptions: number
  monthlyRevenue: number
  failedEmails: number
}

export function AdminDashboardPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { user, profile } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState<Stats>({
    totalProfessors: 0,
    totalStudents: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    failedEmails: 0,
  })

  // Verificar si es admin
  useEffect(() => {
    if (!user?.email) return
    void (async () => {
      const { data } = await supabase
        .from('admins')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!data) {
        nav('/')
        return
      }
      setIsAdmin(true)
      loadStats()
    })()
  }, [user?.email, nav])

  // Cargar estadísticas
  async function loadStats() {
    setLoading(true)
    try {
      // Total de profesores
      const { count: profCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'teacher')

      // Total de alumnos
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')

      // Suscripciones activas
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('id,amount,currency')
        .eq('status', 'active')

      // Revenue del mes actual
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount,currency')
        .gte('created_at', monthStart)
        .eq('status', 'completed')

      // Emails fallidos
      const { count: emailFailCount } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')

      setStats({
        totalProfessors: profCount || 0,
        totalStudents: studentCount || 0,
        activeSubscriptions: subs?.length || 0,
        monthlyRevenue: transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
        failedEmails: emailFailCount || 0,
      })
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    nav('/')
  }

  if (!isAdmin || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-app">
        <div className="text-white text-rt-16">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-app pt-4 px-4 pb-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-rt-28 font-bold">Admin Dashboard</h1>
            <p className="text-grey-400 text-rt-13 mt-1">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 h-10 rounded-lg bg-danger/10 border border-danger text-danger text-rt-12 font-semibold hover:bg-danger/20 transition"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex gap-2 border-b border-surface-line overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'professors', label: 'Profesores', icon: Users },
            { id: 'students', label: 'Alumnos', icon: Users },
            { id: 'subscriptions', label: 'Suscripciones', icon: CreditCard },
            { id: 'emails', label: 'Emails', icon: Mail },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              className={`flex items-center gap-2 px-4 h-12 text-rt-13 font-semibold whitespace-nowrap border-b-2 transition ${
                tab === id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-grey-400 hover:text-white'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {tab === 'dashboard' && (
          <DashboardTab stats={stats} />
        )}
        {tab === 'professors' && (
          <ProfessorsTab />
        )}
        {tab === 'students' && (
          <StudentsTab />
        )}
        {tab === 'subscriptions' && (
          <SubscriptionsTab />
        )}
        {tab === 'emails' && (
          <EmailsTab />
        )}
      </div>
    </div>
  )
}

function DashboardTab({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Profesores Activos', value: stats.totalProfessors, icon: Users, color: 'bg-brand' },
    { label: 'Alumnos Activos', value: stats.totalStudents, icon: Users, color: 'bg-blue-500' },
    { label: 'Suscripciones Activas', value: stats.activeSubscriptions, icon: CreditCard, color: 'bg-green-500' },
    { label: 'Ingresos (este mes)', value: `$${(stats.monthlyRevenue / 100).toFixed(2)}`, icon: TrendingUp, color: 'bg-emerald-500' },
    { label: 'Emails Fallidos', value: stats.failedEmails, icon: Mail, color: 'bg-danger' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="bg-surface-card border border-surface-line rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <span className="text-grey-400 text-rt-12">{card.label}</span>
              <div className={`${card.color} w-8 h-8 rounded-lg flex items-center justify-center`}>
                <Icon size={16} className="text-white" />
              </div>
            </div>
            <div className="text-white text-rt-24 font-bold">{card.value}</div>
          </div>
        )
      })}
    </div>
  )
}

function ProfessorsTab() {
  const [professors, setProfessors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id,full_name,email,country,created_at')
        .eq('role', 'teacher')
        .order('created_at', { ascending: false })
      setProfessors(data || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="text-white">Cargando...</div>

  return (
    <div className="bg-surface-card border border-surface-line rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-line">
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">Nombre</th>
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">Email</th>
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">País</th>
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">Fecha Registro</th>
          </tr>
        </thead>
        <tbody>
          {professors.map((prof) => (
            <tr key={prof.id} className="border-b border-surface-line hover:bg-surface-line/50">
              <td className="px-4 py-3 text-white text-rt-13">{prof.full_name}</td>
              <td className="px-4 py-3 text-white text-rt-13">{prof.email}</td>
              <td className="px-4 py-3 text-white text-rt-13">{prof.country}</td>
              <td className="px-4 py-3 text-grey-400 text-rt-12">{new Date(prof.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StudentsTab() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id,full_name,email,country,teacher_id,created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false })
      setStudents(data || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="text-white">Cargando...</div>

  return (
    <div className="bg-surface-card border border-surface-line rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-line">
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">Nombre</th>
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">Email</th>
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">Profesor ID</th>
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">Fecha Registro</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id} className="border-b border-surface-line hover:bg-surface-line/50">
              <td className="px-4 py-3 text-white text-rt-13">{student.full_name}</td>
              <td className="px-4 py-3 text-white text-rt-13">{student.email}</td>
              <td className="px-4 py-3 text-grey-400 text-rt-12">{student.teacher_id?.slice(0, 8)}</td>
              <td className="px-4 py-3 text-grey-400 text-rt-12">{new Date(student.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('id,teacher_id,plan,status,amount,currency,current_period_start,current_period_end')
        .order('current_period_end', { ascending: false })
      setSubscriptions(data || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="text-white">Cargando...</div>

  return (
    <div className="bg-surface-card border border-surface-line rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-line">
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">Plan</th>
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">Status</th>
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">Monto</th>
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">Fin Período</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((sub) => (
            <tr key={sub.id} className="border-b border-surface-line hover:bg-surface-line/50">
              <td className="px-4 py-3 text-white text-rt-13 font-semibold">{sub.plan}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-rt-11 font-semibold ${
                  sub.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-grey-500/20 text-grey-400'
                }`}>
                  {sub.status}
                </span>
              </td>
              <td className="px-4 py-3 text-white text-rt-13">${(sub.amount / 100).toFixed(2)} {sub.currency}</td>
              <td className="px-4 py-3 text-grey-400 text-rt-12">{new Date(sub.current_period_end).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmailsTab() {
  const [emails, setEmails] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('email_logs')
        .select('id,recipient,subject,status,created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      setEmails(data || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="text-white">Cargando...</div>

  return (
    <div className="bg-surface-card border border-surface-line rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-line">
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">Destinatario</th>
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">Asunto</th>
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">Status</th>
            <th className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {emails.map((email) => (
            <tr key={email.id} className="border-b border-surface-line hover:bg-surface-line/50">
              <td className="px-4 py-3 text-white text-rt-13">{email.recipient}</td>
              <td className="px-4 py-3 text-white text-rt-13 truncate">{email.subject}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-rt-11 font-semibold ${
                  email.status === 'sent' ? 'bg-green-500/20 text-green-400' : 'bg-danger/20 text-danger'
                }`}>
                  {email.status}
                </span>
              </td>
              <td className="px-4 py-3 text-grey-400 text-rt-12">{new Date(email.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

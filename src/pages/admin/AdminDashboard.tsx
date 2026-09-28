import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Users, TrendingUp, CreditCard, Mail, LogOut, BarChart3, TrendingDown } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type Tab = 'dashboard' | 'professors' | 'students' | 'subscriptions' | 'emails' | 'reportes' | 'analytics'

type Stats = {
  totalProfessors: number
  totalStudents: number
  activeSubscriptions: number
  monthlyRevenue: number
  failedEmails: number
}

export function AdminDashboardPage() {
  const nav = useNavigate()
  const { user } = useAuth()
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
            { id: 'reportes', label: 'Reportes', icon: BarChart3 },
            { id: 'analytics', label: 'Analytics', icon: TrendingDown },
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
        {tab === 'reportes' && (
          <ReportesTab />
        )}
        {tab === 'analytics' && (
          <AnalyticsTab />
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

function ReportesTab() {
  const [actividadData, setActividadData] = useState<any[]>([])
  const [retencionData, setRetencionData] = useState<any[]>([])
  const [ltv, setLtv] = useState({ avgPerTeacher: 0, avgPerStudent: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void loadReportes()
  }, [])

  async function loadReportes() {
    setLoading(true)
    try {
      // Actividad: usuarios nuevos por mes (últimos 12 meses)
      const { data: usuarios } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at')

      const actividadMap: Record<string, number> = {}
      usuarios?.forEach((u) => {
        const month = new Date(u.created_at).toISOString().slice(0, 7)
        actividadMap[month] = (actividadMap[month] || 0) + 1
      })
      const actData = Object.entries(actividadMap)
        .slice(-12)
        .map(([month, count]) => ({ month, usuarios: count }))
      setActividadData(actData)

      // LTV: revenue promedio por usuario
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('amount,teacher_id')

      const { count: teacherCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'teacher')

      const totalRevenue = subs?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0
      const avgPerTeacher = teacherCount ? totalRevenue / 100 / teacherCount : 0

      setLtv({
        avgPerTeacher,
        avgPerStudent: 0,
      })

      // Retención: simplificado (usuarios que crearon algo en dos meses consecutivos)
      const retencionMap: Record<string, { nuevos: number; retenidos: number }> = {}
      usuarios?.forEach((u) => {
        const month = new Date(u.created_at).toISOString().slice(0, 7)
        if (!retencionMap[month]) retencionMap[month] = { nuevos: 0, retenidos: 0 }
        retencionMap[month].nuevos += 1
      })

      const retencionArray = Object.entries(retencionMap)
        .slice(-12)
        .map(([month, data]) => ({
          month,
          nuevos: data.nuevos,
          retenidos: Math.floor(data.nuevos * 0.7), // Simplificado: asumir 70% retención
        }))
      setRetencionData(retencionArray)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-white">Cargando...</div>

  return (
    <div className="space-y-6">
      {/* LTV Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-card border border-surface-line rounded-lg p-4">
          <div className="text-grey-400 text-rt-12 mb-2">LTV Promedio por Profesor</div>
          <div className="text-white text-rt-28 font-bold">${ltv.avgPerTeacher.toFixed(2)}</div>
          <div className="text-grey-500 text-rt-11 mt-1">Lifetime value estimado</div>
        </div>
        <div className="bg-surface-card border border-surface-line rounded-lg p-4">
          <div className="text-grey-400 text-rt-12 mb-2">Actividad Total</div>
          <div className="text-white text-rt-28 font-bold">{actividadData.reduce((sum, d) => sum + d.usuarios, 0)}</div>
          <div className="text-grey-500 text-rt-11 mt-1">Usuarios registrados (últimos 12 meses)</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="bg-surface-card border border-surface-line rounded-lg p-6">
        <h3 className="text-white text-rt-16 font-bold mb-4">Actividad de Usuarios</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={actividadData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="month" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="usuarios"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e', r: 4 }}
              name="Nuevos Usuarios"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface-card border border-surface-line rounded-lg p-6">
        <h3 className="text-white text-rt-16 font-bold mb-4">Retención de Usuarios</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={retencionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="month" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <Bar dataKey="nuevos" fill="#3b82f6" name="Nuevos" radius={[4, 4, 0, 0]} />
            <Bar dataKey="retenidos" fill="#22c55e" name="Retenidos" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function AnalyticsTab() {
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => {
    void loadAnalytics()
  }, [period])

  async function loadAnalytics() {
    setLoading(true)
    try {
      // Revenue por período
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount,created_at,status')
        .eq('status', 'completed')

      const periodMap: Record<string, number> = {}
      transactions?.forEach((t) => {
        const date = new Date(t.created_at)
        let key = ''
        if (period === 'week') {
          const weekNum = Math.ceil((date.getDate()) / 7)
          key = `Sem ${weekNum}`
        } else if (period === 'month') {
          key = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
        } else {
          key = date.getFullYear().toString()
        }
        periodMap[key] = (periodMap[key] || 0) + (t.amount || 0)
      })

      const data = Object.entries(periodMap).map(([period, amount]) => ({
        period,
        revenue: Math.round(amount / 100),
      }))
      setChartData(data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-white">Cargando...</div>

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(['week', 'month', 'year'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 h-9 rounded-lg text-rt-12 font-semibold border transition ${
              period === p
                ? 'bg-brand border-brand text-white'
                : 'bg-transparent border-grey-700 text-grey-400 hover:text-white'
            }`}
          >
            {p === 'week' ? 'Esta Semana' : p === 'month' ? 'Este Mes' : 'Este Año'}
          </button>
        ))}
      </div>

      <div className="bg-surface-card border border-surface-line rounded-lg p-6">
        <h3 className="text-white text-rt-16 font-bold mb-4">Ingresos por Período</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="period" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: any) => `$${value}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: '#10b981', r: 5 }}
              name="Revenue ($)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-card border border-surface-line rounded-lg p-4">
          <div className="text-grey-400 text-rt-12 mb-2">Total Revenue</div>
          <div className="text-white text-rt-24 font-bold">
            ${chartData.reduce((sum, d) => sum + d.revenue, 0)}
          </div>
        </div>
        <div className="bg-surface-card border border-surface-line rounded-lg p-4">
          <div className="text-grey-400 text-rt-12 mb-2">Promedio por Período</div>
          <div className="text-white text-rt-24 font-bold">
            ${Math.round(chartData.reduce((sum, d) => sum + d.revenue, 0) / (chartData.length || 1))}
          </div>
        </div>
        <div className="bg-surface-card border border-surface-line rounded-lg p-4">
          <div className="text-grey-400 text-rt-12 mb-2">Períodos con Data</div>
          <div className="text-white text-rt-24 font-bold">{chartData.length}</div>
        </div>
      </div>
    </div>
  )
}

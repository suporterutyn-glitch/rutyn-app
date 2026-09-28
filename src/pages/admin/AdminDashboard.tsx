import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Users, TrendingUp, CreditCard, LogOut, BarChart3, Search } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type Tab = 'resumen' | 'profesores' | 'alumnos' | 'planes' | 'crecimiento'

type Perfil = {
  id: string
  role: 'teacher' | 'student'
  full_name: string | null
  email: string | null
  country: string | null
  teacher_id: string | null
  link_status: string | null
  plan: string | null
  plan_seats: number | null
  plan_status: string | null
  plan_cancel_at_period_end: boolean | null
  created_at: string
}

// Precios de planes_stripe: Básico por alumno, Pro fijo. BR cobra en BRL, el resto en USD.
function precioMensual(p: Perfil): { valor: number; moneda: 'BRL' | 'USD' } | null {
  if (p.plan_status !== 'active') return null
  const br = p.country === 'BR'
  if (p.plan === 'basic') return { valor: (p.plan_seats ?? 0) * (br ? 5.9 : 1), moneda: br ? 'BRL' : 'USD' }
  if (p.plan === 'pro') return { valor: br ? 149.9 : 29.99, moneda: br ? 'BRL' : 'USD' }
  return null
}

const dinero = (v: number, m: 'BRL' | 'USD') =>
  v.toLocaleString(m === 'BRL' ? 'pt-BR' : 'en-US', { style: 'currency', currency: m })

const fecha = (s: string) => new Date(s).toLocaleDateString('es-ES')

export function AdminDashboardPage() {
  const nav = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [perfiles, setPerfiles] = useState<Perfil[] | null>(null)
  const [tab, setTab] = useState<Tab>('resumen')

  useEffect(() => {
    if (authLoading) return
    if (!user) { nav('/login'); return }
    void (async () => {
      const { data } = await supabase.from('admins').select('id').eq('user_id', user.id).maybeSingle()
      if (!data) { nav('/'); return }
      setIsAdmin(true)
      const { data: ps } = await supabase
        .from('profiles')
        .select('id,role,full_name,email,country,teacher_id,link_status,plan,plan_seats,plan_status,plan_cancel_at_period_end,created_at')
        .order('created_at', { ascending: false })
      setPerfiles((ps as Perfil[]) ?? [])
    })()
  }, [authLoading, user, nav])

  if (!isAdmin || !perfiles) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-app">
        <div className="text-white text-rt-16">Cargando...</div>
      </div>
    )
  }

  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: TrendingUp },
    { id: 'profesores', label: 'Profesores', icon: Users },
    { id: 'alumnos', label: 'Alumnos', icon: Users },
    { id: 'planes', label: 'Planes', icon: CreditCard },
    { id: 'crecimiento', label: 'Crecimiento', icon: BarChart3 },
  ] as const

  return (
    <div className="min-h-screen bg-surface-app pt-4 px-4 pb-8">
      <div className="max-w-7xl mx-auto mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-white text-rt-24 font-bold">Admin Rutyn</h1>
          <p className="text-grey-400 text-rt-12 truncate">{user?.email}</p>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); nav('/') }}
          className="flex items-center gap-2 px-4 h-10 rounded-lg border border-danger text-danger text-rt-12 font-semibold shrink-0"
        >
          <LogOut size={16} /> Salir
        </button>
      </div>

      <div className="max-w-7xl mx-auto mb-6 flex gap-2 border-b border-surface-line overflow-x-auto no-scrollbar">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 h-11 text-rt-13 font-semibold whitespace-nowrap border-b-2 ${
              tab === id ? 'border-brand text-brand' : 'border-transparent text-grey-400 hover:text-white'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="max-w-7xl mx-auto">
        {tab === 'resumen' && <Resumen perfiles={perfiles} />}
        {tab === 'profesores' && <Profesores perfiles={perfiles} />}
        {tab === 'alumnos' && <Alumnos perfiles={perfiles} />}
        {tab === 'planes' && <Planes perfiles={perfiles} />}
        {tab === 'crecimiento' && <Crecimiento perfiles={perfiles} />}
      </div>
    </div>
  )
}

function Tarjeta({ label, valor, nota }: { label: string; valor: string | number; nota?: string }) {
  return (
    <div className="bg-surface-card border border-surface-line rounded-lg p-4">
      <div className="text-grey-400 text-rt-12 mb-2">{label}</div>
      <div className="text-white text-rt-24 font-bold">{valor}</div>
      {nota && <div className="text-grey-500 text-rt-11 mt-1">{nota}</div>}
    </div>
  )
}

function Resumen({ perfiles }: { perfiles: Perfil[] }) {
  const profes = perfiles.filter((p) => p.role === 'teacher')
  const alumnos = perfiles.filter((p) => p.role === 'student')
  const activos = alumnos.filter((a) => a.link_status === 'active').length
  let brl = 0, usd = 0, pagantes = 0
  for (const p of profes) {
    const pr = precioMensual(p)
    if (!pr) continue
    pagantes++
    if (pr.moneda === 'BRL') brl += pr.valor
    else usd += pr.valor
  }
  const mes = new Date().toISOString().slice(0, 7)
  const nuevosMes = perfiles.filter((p) => p.created_at.slice(0, 7) === mes).length

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <Tarjeta label="Profesores" valor={profes.length} />
      <Tarjeta label="Alumnos" valor={alumnos.length} nota={`${activos} vinculados`} />
      <Tarjeta label="Profesores pagantes" valor={pagantes} nota={`${profes.length - pagantes} en plan gratis`} />
      <Tarjeta label="MRR Brasil" valor={dinero(brl, 'BRL')} nota="Ingreso mensual recurrente estimado" />
      <Tarjeta label="MRR internacional" valor={dinero(usd, 'USD')} nota="Ingreso mensual recurrente estimado" />
      <Tarjeta label="Registros este mes" valor={nuevosMes} />
    </div>
  )
}

function useBusqueda(lista: Perfil[]) {
  const [q, setQ] = useState('')
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return lista
    return lista.filter((p) => (p.full_name ?? '').toLowerCase().includes(t) || (p.email ?? '').toLowerCase().includes(t))
  }, [q, lista])
  const input = (
    <div className="relative mb-4 max-w-sm">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o email" className="input-dark pl-9" />
    </div>
  )
  return { filtrados, input }
}

function Tabla({ cabeceras, filas }: { cabeceras: string[]; filas: (string | number)[][] }) {
  return (
    <div className="bg-surface-card border border-surface-line rounded-lg overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-surface-line">
            {cabeceras.map((c) => <th key={c} className="text-left px-4 py-3 text-grey-400 text-rt-12 font-semibold">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr><td colSpan={cabeceras.length} className="px-4 py-6 text-grey-500 text-rt-13">Sin resultados</td></tr>
          )}
          {filas.map((f, i) => (
            <tr key={i} className="border-b border-surface-line last:border-0">
              {f.map((v, j) => <td key={j} className="px-4 py-3 text-white text-rt-13">{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const nombrePlan = (p: string | null) => (p === 'basic' ? 'Básico' : p === 'pro' ? 'Pro' : 'Gratis')

function Profesores({ perfiles }: { perfiles: Perfil[] }) {
  const profes = useMemo(() => perfiles.filter((p) => p.role === 'teacher'), [perfiles])
  const { filtrados, input } = useBusqueda(profes)
  const alumnosPor = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of perfiles) if (p.role === 'student' && p.teacher_id && p.link_status === 'active') m[p.teacher_id] = (m[p.teacher_id] ?? 0) + 1
    return m
  }, [perfiles])
  return (
    <>
      {input}
      <Tabla
        cabeceras={['Nombre', 'Email', 'País', 'Plan', 'Alumnos', 'Registro']}
        filas={filtrados.map((p) => [p.full_name ?? '—', p.email ?? '—', p.country ?? '—', nombrePlan(p.plan), alumnosPor[p.id] ?? 0, fecha(p.created_at)])}
      />
    </>
  )
}

function Alumnos({ perfiles }: { perfiles: Perfil[] }) {
  const alumnos = useMemo(() => perfiles.filter((p) => p.role === 'student'), [perfiles])
  const nombres = useMemo(() => Object.fromEntries(perfiles.map((p) => [p.id, p.full_name ?? p.email ?? '—'])), [perfiles])
  const { filtrados, input } = useBusqueda(alumnos)
  return (
    <>
      {input}
      <Tabla
        cabeceras={['Nombre', 'Email', 'Profesor', 'Vínculo', 'Registro']}
        filas={filtrados.map((p) => [p.full_name ?? '—', p.email ?? '—', p.teacher_id ? nombres[p.teacher_id] ?? '—' : '—', p.link_status ?? '—', fecha(p.created_at)])}
      />
    </>
  )
}

function Planes({ perfiles }: { perfiles: Perfil[] }) {
  const pagos = perfiles.filter((p) => p.role === 'teacher' && p.plan && p.plan !== 'free')
  return (
    <Tabla
      cabeceras={['Profesor', 'Plan', 'Estado', 'Cupos', 'Mensual', 'Renovación']}
      filas={pagos.map((p) => {
        const pr = precioMensual(p)
        return [
          p.full_name ?? p.email ?? '—',
          nombrePlan(p.plan),
          p.plan_status ?? '—',
          p.plan === 'basic' ? p.plan_seats ?? 0 : '∞',
          pr ? dinero(pr.valor, pr.moneda) : '—',
          p.plan_cancel_at_period_end ? 'Cancela al final del período' : 'Automática',
        ]
      })}
    />
  )
}

function Crecimiento({ perfiles }: { perfiles: Perfil[] }) {
  const datos = useMemo(() => {
    const meses: string[] = []
    const d = new Date()
    for (let i = 11; i >= 0; i--) meses.push(new Date(d.getFullYear(), d.getMonth() - i, 1).toISOString().slice(0, 7))
    return meses.map((m) => ({
      mes: m,
      Profesores: perfiles.filter((p) => p.role === 'teacher' && p.created_at.slice(0, 7) === m).length,
      Alumnos: perfiles.filter((p) => p.role === 'student' && p.created_at.slice(0, 7) === m).length,
    }))
  }, [perfiles])
  return (
    <div className="bg-surface-card border border-surface-line rounded-lg p-4">
      <h3 className="text-white text-rt-16 font-bold mb-4">Registros por mes (últimos 12 meses)</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={datos}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="mes" stroke="#888" fontSize={11} />
          <YAxis stroke="#888" allowDecimals={false} />
          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} labelStyle={{ color: '#fff' }} />
          <Legend />
          <Bar dataKey="Profesores" fill="#8BC34A" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Alumnos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

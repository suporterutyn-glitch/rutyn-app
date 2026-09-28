import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { LayoutDashboard, Users, CreditCard, Apple, Dumbbell, Megaphone, ClipboardList, LogOut, Menu } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { CAMPOS_PERFIL, dinero, type Perfil } from './api'
import { Tarjeta } from './ui'
import { Usuarios } from './Usuarios'
import { Stripe, useStripe, ingresosPorMes } from './Stripe'
import { CONFIGS, SeccionCatalogo } from './Catalogo'

type Seccion = 'resumen' | 'usuarios' | 'stripe' | 'foods' | 'exercises' | 'announcements' | 'anamnesis_templates'

const MENU: { id: Seccion; label: string; icon: typeof Users; grupo: string }[] = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard, grupo: 'Negocio' },
  { id: 'usuarios', label: 'Usuarios', icon: Users, grupo: 'Negocio' },
  { id: 'stripe', label: 'Pagos y planes', icon: CreditCard, grupo: 'Negocio' },
  { id: 'foods', label: 'Alimentos', icon: Apple, grupo: 'Catálogo' },
  { id: 'exercises', label: 'Ejercicios', icon: Dumbbell, grupo: 'Catálogo' },
  { id: 'announcements', label: 'Anuncios', icon: Megaphone, grupo: 'Contenido' },
  { id: 'anamnesis_templates', label: 'Anamnesis', icon: ClipboardList, grupo: 'Contenido' },
]

export function AdminDashboardPage() {
  const nav = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [perfiles, setPerfiles] = useState<Perfil[] | null>(null)
  const [seccion, setSeccion] = useState<Seccion>('resumen')
  const [menuAbierto, setMenuAbierto] = useState(false)

  const cargarPerfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select(CAMPOS_PERFIL).order('created_at', { ascending: false })
    setPerfiles((data as unknown as Perfil[]) ?? [])
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) { nav('/login'); return }
    void (async () => {
      const { data } = await supabase.from('admins').select('id').eq('user_id', user.id).maybeSingle()
      if (!data) { nav('/'); return }
      setIsAdmin(true)
      await cargarPerfiles()
    })()
  }, [authLoading, user, nav, cargarPerfiles])

  if (!isAdmin || !perfiles) {
    return <div className="w-full flex items-center justify-center min-h-screen bg-surface-app text-white text-rt-16">Cargando...</div>
  }

  const actual = MENU.find((m) => m.id === seccion)!

  return (
    <div className="w-full min-h-screen bg-surface-app md:flex">
      <aside className={
        'fixed md:sticky top-0 left-0 z-[70] h-screen w-64 shrink-0 bg-surface-card border-r border-surface-line flex flex-col transition-transform ' +
        (menuAbierto ? 'translate-x-0' : '-translate-x-full md:translate-x-0')
      }>
        <div className="px-5 h-16 flex items-center border-b border-surface-line">
          <span className="text-white text-rt-18 font-bold">Rutyn <span className="text-brand">Admin</span></span>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {['Negocio', 'Catálogo', 'Contenido'].map((g) => (
            <div key={g} className="mb-3">
              <div className="px-5 py-1 text-grey-500 text-rt-11 font-semibold uppercase tracking-wide">{g}</div>
              {MENU.filter((m) => m.grupo === g).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setSeccion(id); setMenuAbierto(false) }}
                  className={'w-full flex items-center gap-3 px-5 h-10 text-rt-13 font-semibold ' +
                    (seccion === id ? 'text-brand bg-brand/10 border-r-2 border-brand' : 'text-grey-300 hover:text-white hover:bg-white/5')}
                >
                  <Icon size={17} /> {label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-surface-line">
          <div className="text-grey-500 text-rt-11 truncate mb-2">{user?.email}</div>
          <button
            onClick={async () => { await supabase.auth.signOut(); nav('/') }}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-surface-line text-grey-300 text-rt-12 font-semibold"
          >
            <LogOut size={15} /> Salir
          </button>
        </div>
      </aside>
      {menuAbierto && <div className="fixed inset-0 z-[65] bg-black/50 md:hidden" onClick={() => setMenuAbierto(false)} />}

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-[60] h-16 px-4 md:px-8 flex items-center gap-3 bg-surface-app/95 backdrop-blur border-b border-surface-line">
          <button className="md:hidden text-white" onClick={() => setMenuAbierto(true)} aria-label="Menú"><Menu size={22} /></button>
          <h1 className="text-white text-rt-20 font-bold">{actual.label}</h1>
        </header>
        <div className="p-4 md:p-8">
          <Contenido seccion={seccion} perfiles={perfiles} recargar={cargarPerfiles} />
        </div>
      </main>
    </div>
  )
}

function Contenido({ seccion, perfiles, recargar }: { seccion: Seccion; perfiles: Perfil[]; recargar: () => Promise<void> }) {
  const stripe = useStripe()
  if (seccion === 'resumen') return <Resumen perfiles={perfiles} stripe={stripe} />
  if (seccion === 'usuarios') return <Usuarios perfiles={perfiles} recargar={recargar} />
  if (seccion === 'stripe') return <Stripe perfiles={perfiles} stripe={stripe} />
  return <SeccionCatalogo config={CONFIGS[seccion]} />
}

// Precios de _shared/stripe.ts: BR paga en BRL, el resto en USD.
function mrr(p: Perfil) {
  if (p.plan_status !== 'active') return null
  const br = p.country === 'BR'
  if (p.plan === 'basic') return { v: (p.plan_seats ?? 0) * (br ? 5.9 : 1), m: br ? 'BRL' : 'USD' }
  if (p.plan === 'pro') return { v: br ? 149.9 : 29.99, m: br ? 'BRL' : 'USD' }
  return null
}

function Resumen({ perfiles, stripe }: { perfiles: Perfil[]; stripe: ReturnType<typeof useStripe> }) {
  const profes = perfiles.filter((p) => p.role === 'teacher')
  const alumnos = perfiles.filter((p) => p.role === 'student')
  const vinculados = alumnos.filter((a) => a.link_status === 'active').length
  const bloqueados = perfiles.filter((p) => p.account_status !== 'active').length
  const pagos = profes.map(mrr).filter(Boolean) as { v: number; m: string }[]
  const suma = (m: string) => pagos.filter((x) => x.m === m).reduce((s, x) => s + x.v, 0)
  const mes = new Date().toISOString().slice(0, 7)
  const cobradoMes = stripe.datos ? ingresosPorMes(stripe.datos.invoices).at(-1) : null

  const crecimiento = useMemo(() => {
    const d = new Date()
    return Array.from({ length: 12 }, (_, i) => new Date(d.getFullYear(), d.getMonth() - 11 + i, 1).toISOString().slice(0, 7)).map((m) => ({
      mes: m,
      Profesores: perfiles.filter((p) => p.role === 'teacher' && p.created_at.slice(0, 7) === m).length,
      Alumnos: perfiles.filter((p) => p.role === 'student' && p.created_at.slice(0, 7) === m).length,
    }))
  }, [perfiles])

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tarjeta label="MRR Brasil" valor={dinero(suma('BRL'), 'BRL')} nota="según planes activos" />
        <Tarjeta label="MRR internacional" valor={dinero(suma('USD'), 'USD')} nota="según planes activos" />
        <Tarjeta
          label="Cobrado este mes"
          valor={cobradoMes ? dinero(cobradoMes.BRL as number, 'BRL') : '…'}
          nota={cobradoMes ? `+ ${dinero(cobradoMes.USD as number, 'USD')} · Stripe` : stripe.error ? 'Stripe no respondió' : 'leyendo Stripe'}
        />
        <Tarjeta label="Profesores pagantes" valor={pagos.length} nota={`de ${profes.length} profesores`} />
        <Tarjeta label="Profesores" valor={profes.length} />
        <Tarjeta label="Alumnos" valor={alumnos.length} nota={`${vinculados} vinculados`} />
        <Tarjeta label="Registros este mes" valor={perfiles.filter((p) => p.created_at.slice(0, 7) === mes).length} />
        <Tarjeta label="Cuentas bloqueadas" valor={bloqueados} />
      </div>
      <div className="bg-surface-card border border-surface-line rounded-xl p-4">
        <h3 className="text-white text-rt-16 font-bold mb-4">Registros por mes</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={crecimiento}>
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
    </div>
  )
}

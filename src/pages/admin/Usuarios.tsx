import { useEffect, useMemo, useState } from 'react'
import { adminApi, dinero, fecha, nombrePlan, type Perfil } from './api'
import { currencyOf } from '@/lib/plans'
import { Badge, Buscador, Error_, Formulario, Panel, Tabla, useAccion, type Campo } from './ui'

const ESTADOS = [{ v: 'active', l: 'Activa' }, { v: 'deactivated', l: 'Bloqueada' }, { v: 'deleting', l: 'Borrándose' }]
const NOMBRE_VINCULO: Record<string, string> = { none: 'Sin profesor', pending: 'Pendiente', active: 'Activo', suspended: 'Suspendido', ended: 'Terminado' }
const VINCULOS = Object.entries(NOMBRE_VINCULO).map(([v, l]) => ({ v, l }))
type Lote = 'block' | 'unblock' | 'delete'

export function Usuarios({ perfiles, recargar }: { perfiles: Perfil[]; recargar: () => Promise<void> }) {
  const [q, setQ] = useState('')
  const [rol, setRol] = useState<'all' | 'teacher' | 'student'>('all')
  const [plan, setPlan] = useState('all')
  const [editando, setEditando] = useState<Perfil | null>(null)
  const [orden, setOrden] = useState<'reciente' | 'alumnos' | 'nombre'>('reciente')
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [lote, setLote] = useState<Lote | null>(null)

  const nombres = useMemo(() => Object.fromEntries(perfiles.map((p) => [p.id, p.full_name ?? p.email ?? '—'])), [perfiles])
  const alumnosPor = useMemo(() => {
    const m: Record<string, { activos: number; total: number }> = {}
    for (const p of perfiles) {
      if (p.role !== 'student' || !p.teacher_id) continue
      const c = (m[p.teacher_id] ??= { activos: 0, total: 0 })
      c.total++
      if (p.link_status === 'active') c.activos++
    }
    return m
  }, [perfiles])

  const filas = useMemo(() => {
    const t = q.trim().toLowerCase()
    const lista = perfiles.filter((p) =>
      (rol === 'all' || p.role === rol) &&
      (plan === 'all' || (p.role === 'teacher' && (p.plan ?? 'free') === plan)) &&
      (!t || (p.full_name ?? '').toLowerCase().includes(t) || (p.email ?? '').toLowerCase().includes(t)),
    )
    if (orden === 'alumnos') return [...lista].sort((a, b) => (alumnosPor[b.id]?.total ?? -1) - (alumnosPor[a.id]?.total ?? -1))
    if (orden === 'nombre') return [...lista].sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))
    return lista
  }, [perfiles, q, rol, plan, orden, alumnosPor])

  // Lo marcado que sigue visible con los filtros actuales: sobre eso actúan los botones.
  const elegidos = useMemo(() => filas.filter((p) => marcados.has(p.id)), [filas, marcados])

  const chip = (activo: boolean) =>
    'px-3 h-9 rounded-lg text-rt-12 font-semibold border whitespace-nowrap ' + (activo ? 'bg-brand border-brand text-white' : 'border-grey-700 text-grey-400')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Buscador value={q} onChange={setQ} placeholder="Nombre o email" />
        {(['all', 'teacher', 'student'] as const).map((r) => (
          <button key={r} className={chip(rol === r)} onClick={() => setRol(r)}>
            {r === 'all' ? 'Todos' : r === 'teacher' ? 'Profesores' : 'Alumnos'}
          </button>
        ))}
        <select className="input-dark !w-auto h-9" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="all">Todos los planes</option>
          <option value="free">Gratis</option>
          <option value="basic">Básico</option>
          <option value="pro">Pro</option>
        </select>
        <select className="input-dark !w-auto h-9" value={orden} onChange={(e) => setOrden(e.target.value as typeof orden)}>
          <option value="reciente">Más recientes</option>
          <option value="alumnos">Más alumnos</option>
          <option value="nombre">Por nombre</option>
        </select>
        <span className="text-grey-500 text-rt-12 ml-auto">{filas.length} usuarios</span>
      </div>

      {elegidos.length > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 p-3 rounded-xl bg-surface-raised border border-brand/50">
          <span className="text-white text-rt-13 font-semibold mr-2">{elegidos.length} seleccionados</span>
          <button onClick={() => setLote('block')} className="px-3 h-9 rounded-lg border border-yellow-500 text-yellow-400 text-rt-12 font-semibold">Bloquear</button>
          <button onClick={() => setLote('unblock')} className="px-3 h-9 rounded-lg border border-green-500 text-green-400 text-rt-12 font-semibold">Desbloquear</button>
          <button onClick={() => setLote('delete')} className="px-3 h-9 rounded-lg bg-danger text-white text-rt-12 font-semibold">Eliminar</button>
          <button onClick={() => setMarcados(new Set())} className="px-3 h-9 text-grey-400 text-rt-12 font-semibold ml-auto">Quitar selección</button>
        </div>
      )}

      <Tabla
        rows={filas}
        onRow={setEditando}
        seleccion={{ ids: marcados, idDe: (p) => p.id, cambiar: setMarcados }}
        cols={[
          { label: 'Nombre', render: (p) => p.full_name ?? '—' },
          { label: 'Email', render: (p) => p.email ?? '—' },
          { label: 'Rol', render: (p) => (p.role === 'teacher' ? 'Profesor' : 'Alumno') },
          { label: 'Plan / Profesor', render: (p) => (p.role === 'teacher' ? nombrePlan(p.plan) : p.teacher_id ? nombres[p.teacher_id] : '—') },
          {
            label: 'Alumnos',
            render: (p) => {
              if (p.role !== 'teacher') return <span className="text-grey-500">{NOMBRE_VINCULO[p.link_status ?? 'none'] ?? p.link_status}</span>
              const c = alumnosPor[p.id]
              if (!c) return <span className="text-grey-500">0</span>
              return <span><b>{c.activos}</b> activos{c.total > c.activos && <span className="text-grey-400"> · {c.total} en total</span>}</span>
            },
          },
          {
            label: 'Cuenta',
            render: (p) => <Badge tono={p.account_status === 'active' ? 'ok' : 'bad'}>{ESTADOS.find((e) => e.v === p.account_status)?.l ?? p.account_status}</Badge>,
          },
          { label: 'Registro', render: (p) => fecha(p.created_at), className: 'text-grey-400' },
        ]}
      />

      {lote && (
        <AccionEnLote
          op={lote}
          perfiles={elegidos}
          alumnosPor={alumnosPor}
          onCerrar={() => setLote(null)}
          onHecho={async () => { setLote(null); setMarcados(new Set()); await recargar() }}
        />
      )}

      {editando && (
        <EditarUsuario
          perfil={editando}
          profesores={perfiles.filter((p) => p.role === 'teacher')}
          onCerrar={() => setEditando(null)}
          onGuardado={async () => { setEditando(null); await recargar() }}
        />
      )}
    </div>
  )
}

function AccionEnLote({ op, perfiles, alumnosPor, onCerrar, onHecho }: {
  op: Lote
  perfiles: Perfil[]
  alumnosPor: Record<string, { activos: number; total: number }>
  onCerrar: () => void
  onHecho: () => Promise<void>
}) {
  const [texto, setTexto] = useState('')
  const [resultado, setResultado] = useState<string | null>(null)
  const { ocupado, error, correr } = useAccion()
  const borrar = op === 'delete'
  const titulo = borrar ? 'Eliminar cuentas' : op === 'block' ? 'Bloquear cuentas' : 'Desbloquear cuentas'
  const conPago = perfiles.filter((p) => p.stripe_subscription_id).length
  const conAlumnos = perfiles.filter((p) => alumnosPor[p.id]?.total).length

  const ejecutar = () =>
    correr(async () => {
      const r = await adminApi<{ done: number; skipped: number; failed: { id: string; error: string }[] }>('users.bulk', { ids: perfiles.map((p) => p.id), op })
      if (r.failed.length || r.skipped) {
        setResultado(`Hechas: ${r.done}. ${r.skipped ? `Cuentas de administrador que no se tocaron: ${r.skipped}. ` : ''}${r.failed.length ? `Con error: ${r.failed.length} (${r.failed[0].error}).` : ''}`)
        return
      }
      await onHecho()
    })

  return (
    <Panel
      titulo={`${titulo} (${perfiles.length})`}
      onCerrar={resultado ? onHecho : onCerrar}
      pie={resultado
        ? <button className="btn-save" onClick={onHecho}>Cerrar</button>
        : (
          <button className={borrar ? 'w-full h-12 rounded-btn-pill bg-danger text-white font-semibold disabled:opacity-40' : 'btn-save'} disabled={ocupado || (borrar && texto !== 'BORRAR')} onClick={ejecutar}>
            {ocupado ? 'Procesando…' : `${titulo.split(' ')[0]} ${perfiles.length} ${perfiles.length === 1 ? 'cuenta' : 'cuentas'}`}
          </button>
        )}
    >
      <Error_ msg={error} />
      {resultado && <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/40 text-yellow-300 text-rt-13">{resultado}</div>}
      <p className="text-grey-300 text-rt-13">
        {borrar
          ? 'Se borran para siempre estas cuentas con todos sus datos (rutinas, dietas, evaluaciones, cobros, chat). No se puede deshacer.'
          : op === 'block'
            ? 'Estas cuentas no van a poder entrar a la app hasta que las desbloquees. No se borra nada.'
            : 'Estas cuentas vuelven a poder entrar a la app.'}
      </p>
      {borrar && conPago > 0 && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/40 text-yellow-300 text-rt-12">
          {conPago} {conPago === 1 ? 'profesor paga' : 'profesores pagan'} por Stripe: su suscripción se cancela ahora, antes de borrar la cuenta.
        </div>
      )}
      {borrar && conAlumnos > 0 && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/40 text-yellow-300 text-rt-12">
          {conAlumnos} {conAlumnos === 1 ? 'profesor tiene' : 'profesores tienen'} alumnos. Los alumnos no se borran: quedan sin profesor. Si también querés borrarlos, seleccionalos junto con el profesor.
        </div>
      )}
      <ul className="flex flex-col divide-y divide-surface-line border border-surface-line rounded-lg">
        {perfiles.map((p) => (
          <li key={p.id} className="px-3 py-2 flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-white text-rt-13 truncate">{p.full_name ?? '—'}</span>
              <span className="block text-grey-500 text-rt-11 truncate">{p.email}</span>
            </span>
            <span className="text-grey-400 text-rt-11 whitespace-nowrap">
              {p.role === 'teacher' ? `Profesor · ${nombrePlan(p.plan)} · ${alumnosPor[p.id]?.total ?? 0} alumnos` : 'Alumno'}
            </span>
          </li>
        ))}
      </ul>
      {borrar && !resultado && (
        <label className="flex flex-col gap-1">
          <span className="text-grey-400 text-rt-12">Para confirmar, escribí BORRAR:</span>
          <input className="input-dark" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
      )}
    </Panel>
  )
}

type Actividad = {
  id: string; full_name: string | null; email: string | null; phone: string | null
  link_status: string; account_status: string; created_at: string
  routines: string[]; diets: string[]; workouts: number; last_workout: string | null
  assessments: number; last_assessment: string | null; anamnesis: number
  charge: { amount: number; due_date: string; status: string; format: string } | null
  charges_overdue: number; last_message: string | null; next_appointments: number
}
type Detalle = { students: Actividad[]; library?: { routines: number; diets: number; exercises: number; foods: number; pending_invites: number } }

const ESTADO_COBRO: Record<string, { l: string; tono: 'ok' | 'warn' | 'bad' | 'neutral' }> = {
  paid: { l: 'Pagado', tono: 'ok' }, pending: { l: 'Pendiente', tono: 'neutral' }, declared: { l: 'Avisó que pagó', tono: 'warn' }, suspended: { l: 'Atrasado', tono: 'bad' },
}
const dia = (s: string | null) => (s ? fecha(s) : 'nunca')

function FichaAlumno({ a, moneda }: { a: Actividad; moneda: string }) {
  const cobro = a.charge ? ESTADO_COBRO[a.charge.status] ?? { l: a.charge.status, tono: 'neutral' as const } : null
  const dato = (label: string, valor: React.ReactNode) => (
    <div><div className="text-grey-500 text-rt-11">{label}</div><div className="text-white text-rt-13">{valor}</div></div>
  )
  return (
    <div className="border border-surface-line rounded-lg p-3 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-white text-rt-14 font-semibold truncate">{a.full_name ?? '—'}</div>
          <div className="text-grey-500 text-rt-11 truncate">{a.email}{a.phone ? ` · ${a.phone}` : ''}</div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Badge tono={a.link_status === 'active' ? 'ok' : a.link_status === 'suspended' ? 'bad' : 'warn'}>{NOMBRE_VINCULO[a.link_status] ?? a.link_status}</Badge>
          {a.account_status !== 'active' && <Badge tono="bad">Bloqueada</Badge>}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {dato('Rutinas', a.routines.length ? `${a.routines.length}: ${a.routines.join(', ')}` : 'ninguna')}
        {dato('Dietas', a.diets.length ? `${a.diets.length}: ${a.diets.join(', ')}` : 'ninguna')}
        {dato('Entrenamientos hechos', `${a.workouts} · último ${dia(a.last_workout)}`)}
        {dato('Evaluaciones', `${a.assessments} · última ${dia(a.last_assessment)}`)}
        {dato('Anamnesis', a.anamnesis)}
        {dato('Mensualidad', a.charge
          ? <span className="flex flex-wrap items-center gap-1">{dinero(a.charge.amount, moneda)} · vence {fecha(a.charge.due_date)} <Badge tono={cobro!.tono}>{cobro!.l}</Badge></span>
          : 'sin cobro')}
        {dato('Último mensaje', dia(a.last_message))}
        {dato('Alumno desde', fecha(a.created_at))}
      </div>
      {(a.charges_overdue > 0 || a.next_appointments > 0) && (
        <div className="text-rt-11 text-grey-400">
          {a.charges_overdue > 0 && <span className="text-danger">{a.charges_overdue} cobros atrasados. </span>}
          {a.next_appointments > 0 && <span>{a.next_appointments} citas agendadas.</span>}
        </div>
      )}
    </div>
  )
}

function Actividad_({ perfil }: { perfil: Perfil }) {
  const [d, setD] = useState<Detalle | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setD(null); setError(null)
    adminApi<Detalle>('user.detail', { id: perfil.id }).then(setD).catch((e) => setError((e as Error).message))
  }, [perfil.id])
  const moneda = currencyOf(perfil.country)

  if (error) return <Error_ msg={error} />
  if (!d) return <div className="text-grey-500 text-rt-13">Cargando…</div>
  const activos = d.students.filter((a) => a.link_status === 'active').length
  return (
    <>
      {d.library && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
          {[['Alumnos activos', activos], ['Alumnos en total', d.students.length], ['Propuestas pendientes', d.library.pending_invites],
            ['Rutinas creadas', d.library.routines], ['Dietas creadas', d.library.diets], ['Ejercicios / alimentos propios', `${d.library.exercises} / ${d.library.foods}`]].map(([l, v]) => (
            <div key={l as string} className="border border-surface-line rounded-lg p-2">
              <div className="text-white text-rt-16 font-bold">{v}</div>
              <div className="text-grey-500 text-rt-11 leading-tight">{l}</div>
            </div>
          ))}
        </div>
      )}
      {d.students.length === 0 && <div className="text-grey-500 text-rt-13">{perfil.role === 'teacher' ? 'Este profesor todavía no tiene alumnos.' : 'Sin actividad.'}</div>}
      {d.students.map((a) => <FichaAlumno key={a.id} a={a} moneda={moneda} />)}
    </>
  )
}

function EditarUsuario({ perfil, profesores, onCerrar, onGuardado }: {
  perfil: Perfil
  profesores: Perfil[]
  onCerrar: () => void
  onGuardado: () => Promise<void>
}) {
  const [v, setV] = useState<Record<string, any>>({ ...perfil })
  const [borrar, setBorrar] = useState('')
  const { ocupado, error, correr } = useAccion()
  const esProfe = perfil.role === 'teacher'
  const [pestaña, setPestaña] = useState<'actividad' | 'datos'>('actividad')

  const campos: Campo[] = [
    { key: 'full_name', label: 'Nombre completo' },
    { key: 'email', label: 'Email (también cambia el login)' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'country', label: 'País (código, ej. BR)' },
    { key: 'language', label: 'Idioma', tipo: 'select', opciones: [{ v: 'pt', l: 'Português' }, { v: 'es', l: 'Español' }, { v: 'en', l: 'English' }] },
    { key: 'gender', label: 'Género', tipo: 'select', opciones: [{ v: 'M', l: 'Masculino' }, { v: 'F', l: 'Femenino' }, { v: 'X', l: 'Otro' }] },
    { key: 'account_status', label: 'Estado de la cuenta', tipo: 'select', opciones: ESTADOS },
    ...(esProfe
      ? ([
          { key: 'plan', label: 'Plan', tipo: 'select', opciones: [{ v: 'free', l: 'Gratis' }, { v: 'basic', l: 'Básico' }, { v: 'pro', l: 'Pro' }] },
          { key: 'plan_seats', label: 'Cupos de alumnos (Básico)', tipo: 'number' },
          { key: 'plan_status', label: 'Estado del plan', tipo: 'select', opciones: ['active', 'past_due', 'canceled'].map((x) => ({ v: x, l: x })) },
        ] as Campo[])
      : ([
          { key: 'teacher_id', label: 'Profesor', tipo: 'select', opciones: profesores.map((p) => ({ v: p.id, l: p.full_name ?? p.email ?? p.id })) },
          { key: 'link_status', label: 'Vínculo con el profesor', tipo: 'select', opciones: VINCULOS },
        ] as Campo[])),
  ]

  const guardar = () =>
    correr(async () => {
      const fields: Record<string, unknown> = {}
      for (const c of campos) if (v[c.key] !== (perfil as any)[c.key]) fields[c.key] = v[c.key]
      if (Object.keys(fields).length) await adminApi('user.update', { id: perfil.id, fields })
      await onGuardado()
    })

  const bloquear = () =>
    correr(async () => {
      await adminApi('user.update', { id: perfil.id, fields: { account_status: perfil.account_status === 'active' ? 'deactivated' : 'active' } })
      await onGuardado()
    })

  const eliminar = () =>
    correr(async () => {
      await adminApi('user.delete', { id: perfil.id })
      await onGuardado()
    })

  return (
    <Panel
      titulo={perfil.full_name ?? perfil.email ?? 'Usuario'}
      onCerrar={onCerrar}
      ancho
      pie={pestaña === 'datos' ? <button className="btn-save" disabled={ocupado} onClick={guardar}>{ocupado ? 'Guardando…' : 'Guardar cambios'}</button> : undefined}
    >
      <div className="flex gap-2">
        {(['actividad', 'datos'] as const).map((x) => (
          <button key={x} onClick={() => setPestaña(x)} className={'px-4 h-9 rounded-lg text-rt-12 font-semibold border ' + (pestaña === x ? 'bg-brand border-brand text-white' : 'border-grey-700 text-grey-400')}>
            {x === 'datos' ? 'Datos y cuenta' : esProfe ? 'Alumnos y actividad' : 'Actividad'}
          </button>
        ))}
      </div>
      {pestaña === 'actividad' && <Actividad_ perfil={perfil} />}
      {pestaña === 'datos' && <>
      <Error_ msg={error} />
      {esProfe && perfil.stripe_subscription_id && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/40 text-yellow-300 text-rt-12">
          Este profesor paga por Stripe. Cambiar el plan acá no cambia lo que se le cobra: para eso usá la sección Stripe.
        </div>
      )}
      <Formulario campos={campos} valores={v} onChange={(k, x) => setV((s) => ({ ...s, [k]: x }))} />

      <div className="border-t border-surface-line pt-4 flex flex-col gap-3">
        <button disabled={ocupado} onClick={bloquear} className="h-11 rounded-lg border border-yellow-500 text-yellow-400 text-rt-13 font-semibold">
          {perfil.account_status === 'active' ? 'Bloquear cuenta' : 'Desbloquear cuenta'}
        </button>
        <div className="flex flex-col gap-2">
          <span className="text-grey-400 text-rt-12">Para borrar la cuenta para siempre, escribí BORRAR:</span>
          <div className="flex gap-2">
            <input className="input-dark flex-1" value={borrar} onChange={(e) => setBorrar(e.target.value)} />
            <button
              disabled={ocupado || borrar !== 'BORRAR'}
              onClick={eliminar}
              className="px-4 rounded-lg bg-danger text-white text-rt-13 font-semibold disabled:opacity-40"
            >
              Borrar
            </button>
          </div>
        </div>
      </div>
      </>}
    </Panel>
  )
}

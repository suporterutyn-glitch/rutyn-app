import { useMemo, useState } from 'react'
import { adminApi, fecha, nombrePlan, type Perfil } from './api'
import { Badge, Buscador, Error_, Formulario, Panel, Tabla, useAccion, type Campo } from './ui'

const ESTADOS = [{ v: 'active', l: 'Activa' }, { v: 'deactivated', l: 'Bloqueada' }, { v: 'deleting', l: 'Borrándose' }]
const VINCULOS = ['none', 'pending', 'active', 'suspended', 'ended'].map((v) => ({ v, l: v }))

export function Usuarios({ perfiles, recargar }: { perfiles: Perfil[]; recargar: () => Promise<void> }) {
  const [q, setQ] = useState('')
  const [rol, setRol] = useState<'all' | 'teacher' | 'student'>('all')
  const [plan, setPlan] = useState('all')
  const [editando, setEditando] = useState<Perfil | null>(null)

  const nombres = useMemo(() => Object.fromEntries(perfiles.map((p) => [p.id, p.full_name ?? p.email ?? '—'])), [perfiles])
  const alumnosPor = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of perfiles) if (p.role === 'student' && p.teacher_id && p.link_status === 'active') m[p.teacher_id] = (m[p.teacher_id] ?? 0) + 1
    return m
  }, [perfiles])

  const filas = useMemo(() => {
    const t = q.trim().toLowerCase()
    return perfiles.filter((p) =>
      (rol === 'all' || p.role === rol) &&
      (plan === 'all' || (p.role === 'teacher' && (p.plan ?? 'free') === plan)) &&
      (!t || (p.full_name ?? '').toLowerCase().includes(t) || (p.email ?? '').toLowerCase().includes(t)),
    )
  }, [perfiles, q, rol, plan])

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
        <span className="text-grey-500 text-rt-12 ml-auto">{filas.length} usuarios</span>
      </div>

      <Tabla
        rows={filas}
        onRow={setEditando}
        cols={[
          { label: 'Nombre', render: (p) => p.full_name ?? '—' },
          { label: 'Email', render: (p) => p.email ?? '—' },
          { label: 'Rol', render: (p) => (p.role === 'teacher' ? 'Profesor' : 'Alumno') },
          { label: 'Plan / Profesor', render: (p) => (p.role === 'teacher' ? `${nombrePlan(p.plan)} · ${alumnosPor[p.id] ?? 0} alumnos` : p.teacher_id ? nombres[p.teacher_id] : '—') },
          {
            label: 'Cuenta',
            render: (p) => <Badge tono={p.account_status === 'active' ? 'ok' : 'bad'}>{ESTADOS.find((e) => e.v === p.account_status)?.l ?? p.account_status}</Badge>,
          },
          { label: 'Registro', render: (p) => fecha(p.created_at), className: 'text-grey-400' },
        ]}
      />

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
      pie={<button className="btn-save" disabled={ocupado} onClick={guardar}>{ocupado ? 'Guardando…' : 'Guardar cambios'}</button>}
    >
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
    </Panel>
  )
}

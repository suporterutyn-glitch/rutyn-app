import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { adminApi, dinero, fecha, type Perfil } from './api'
import { Badge, Error_, Tabla, Tarjeta, useAccion } from './ui'

type Factura = {
  id: string; number: string | null; status: string; currency: string
  amount_paid: number; amount_due: number; created: number; email: string | null; url: string | null; attempts: number
}
type Sub = {
  id: string; status: string; email: string | null; cancel_at_period_end: boolean; current_period_end: number | null
  quantity: number; amount: number | null; currency: string; profile_id: string | null
}
export type ResumenStripe = { invoices: Factura[]; subscriptions: Sub[] }

export function useStripe() {
  const [datos, setDatos] = useState<ResumenStripe | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cargar = async () => {
    setError(null)
    try { setDatos(await adminApi<ResumenStripe>('stripe.summary')) } catch (e) { setError((e as Error).message) }
  }
  useEffect(() => { void cargar() }, [])
  return { datos, error, cargar }
}

export function ingresosPorMes(facturas: Factura[]) {
  const meses: string[] = []
  const d = new Date()
  for (let i = 11; i >= 0; i--) meses.push(new Date(d.getFullYear(), d.getMonth() - i, 1).toISOString().slice(0, 7))
  return meses.map((mes) => {
    const r: Record<string, number | string> = { mes, BRL: 0, USD: 0 }
    for (const f of facturas) {
      if (f.status !== 'paid' || new Date(f.created * 1000).toISOString().slice(0, 7) !== mes) continue
      const m = f.currency.toUpperCase()
      if (m === 'BRL' || m === 'USD') r[m] = (r[m] as number) + f.amount_paid / 100
    }
    return r
  })
}

const tonoSub = (s: string): 'ok' | 'warn' | 'bad' | 'neutral' =>
  s === 'active' || s === 'trialing' ? 'ok' : s === 'past_due' || s === 'incomplete' ? 'warn' : s === 'canceled' || s === 'unpaid' ? 'bad' : 'neutral'

export function Stripe({ perfiles, stripe }: { perfiles: Perfil[]; stripe: ReturnType<typeof useStripe> }) {
  const { datos, error, cargar } = stripe
  const accion = useAccion()
  const nombres = useMemo(() => Object.fromEntries(perfiles.map((p) => [p.id, p.full_name ?? p.email ?? '—'])), [perfiles])

  if (error) return <Error_ msg={`No se pudo leer Stripe: ${error}`} />
  if (!datos) return <div className="text-grey-400">Leyendo Stripe…</div>

  const pagadas = datos.invoices.filter((f) => f.status === 'paid')
  const fallidas = datos.invoices.filter((f) => f.status === 'open' && f.attempts > 0)
  const total = (m: string) => pagadas.filter((f) => f.currency.toUpperCase() === m).reduce((s, f) => s + f.amount_paid, 0)
  const activas = datos.subscriptions.filter((s) => s.status === 'active' || s.status === 'trialing')

  const cambiar = (id: string, action: 'stripe.cancel' | 'stripe.resume', now = false) =>
    accion.correr(async () => {
      if (action === 'stripe.cancel' && now && !confirm('¿Cancelar la suscripción YA? El profesor pierde el plan ahora mismo.')) return
      await adminApi(action, { id, now })
      await cargar()
    })

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tarjeta label="Cobrado 12 meses (BRL)" valor={dinero(total('BRL'), 'BRL', true)} />
        <Tarjeta label="Cobrado 12 meses (USD)" valor={dinero(total('USD'), 'USD', true)} />
        <Tarjeta label="Suscripciones activas" valor={activas.length} nota={`${datos.subscriptions.length} en total`} />
        <Tarjeta label="Pagos fallidos abiertos" valor={fallidas.length} />
      </div>

      <div className="bg-surface-card border border-surface-line rounded-xl p-4">
        <h3 className="text-white text-rt-16 font-bold mb-4">Ingresos cobrados por mes</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ingresosPorMes(datos.invoices)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="mes" stroke="#888" fontSize={11} />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} labelStyle={{ color: '#fff' }} />
            <Legend />
            <Bar dataKey="BRL" fill="#8BC34A" radius={[4, 4, 0, 0]} />
            <Bar dataKey="USD" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Error_ msg={accion.error} />

      <section className="flex flex-col gap-3">
        <h3 className="text-white text-rt-16 font-bold">Suscripciones</h3>
        <Tabla
          rows={datos.subscriptions}
          cols={[
            { label: 'Profesor', render: (s) => (s.profile_id ? nombres[s.profile_id] : null) ?? s.email ?? '—' },
            { label: 'Estado', render: (s) => <Badge tono={tonoSub(s.status)}>{s.status}{s.cancel_at_period_end ? ' · cancela' : ''}</Badge> },
            { label: 'Cupos', render: (s) => s.quantity },
            { label: 'Mensual', render: (s) => (s.amount != null ? dinero(s.amount * s.quantity, s.currency, true) : '—') },
            { label: 'Próximo cobro', render: (s) => (s.current_period_end ? fecha(s.current_period_end) : '—') },
            {
              label: 'Acciones',
              render: (s) =>
                s.status === 'canceled' ? '—' : (
                  <div className="flex gap-2">
                    {s.cancel_at_period_end ? (
                      <button disabled={accion.ocupado} onClick={() => cambiar(s.id, 'stripe.resume')} className="text-brand text-rt-12 font-semibold">Reactivar</button>
                    ) : (
                      <button disabled={accion.ocupado} onClick={() => cambiar(s.id, 'stripe.cancel')} className="text-yellow-400 text-rt-12 font-semibold">Cancelar al vencer</button>
                    )}
                    <button disabled={accion.ocupado} onClick={() => cambiar(s.id, 'stripe.cancel', true)} className="text-danger text-rt-12 font-semibold">Cancelar ya</button>
                  </div>
                ),
            },
          ]}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-white text-rt-16 font-bold">Facturas (últimos 12 meses)</h3>
        <Tabla
          rows={datos.invoices}
          cols={[
            { label: 'Fecha', render: (f) => fecha(f.created) },
            { label: 'Cliente', render: (f) => f.email ?? '—' },
            { label: 'Monto', render: (f) => dinero(f.status === 'paid' ? f.amount_paid : f.amount_due, f.currency, true) },
            { label: 'Estado', render: (f) => <Badge tono={f.status === 'paid' ? 'ok' : f.status === 'open' ? 'warn' : 'neutral'}>{f.status}{f.status === 'open' && f.attempts > 0 ? ' · falló' : ''}</Badge> },
            { label: 'Factura', render: (f) => (f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="text-brand underline">Ver</a> : '—') },
          ]}
        />
      </section>
    </div>
  )
}

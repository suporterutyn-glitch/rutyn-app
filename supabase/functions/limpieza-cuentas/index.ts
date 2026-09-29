// Edge Function diaria: elimina las cuentas congeladas por falta de pago hace más de 60 días
// (el profesor y todos sus alumnos, con sus archivos). Solo con CRON_SECRET (lo manda pg_cron desde Vault).
//
// POST {}              -> elimina
// POST { dry_run: true } -> solo lista lo que eliminaría

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { stripe, json } from '../_shared/stripe.ts'
import { borrarCuenta } from '../_shared/cuentas.ts'

const DIAS_DE_GRACIA = 60

// @ts-ignore
Deno.serve(async (req: Request) => {
  // @ts-ignore
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  // @ts-ignore
  const CRON = Deno.env.get('CRON_SECRET')
  if (!CRON || (req.headers.get('Authorization') ?? '') !== `Bearer ${CRON}`) return new Response('unauthorized', { status: 401 })
  // @ts-ignore
  const db = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE)
  const { dry_run } = await req.json().catch(() => ({})) as any

  const limite = new Date(Date.now() - DIAS_DE_GRACIA * 86400000).toISOString()
  const { data: profes, error } = await db.from('profiles')
    .select('id,email,frozen_since,stripe_subscription_id')
    .eq('role', 'teacher').not('frozen_since', 'is', null).lt('frozen_since', limite)
  if (error) return json({ error: error.message }, 500)

  const resultado: any[] = []
  for (const p of profes ?? []) {
    const { data: alumnos } = await db.from('profiles').select('id').eq('teacher_id', p.id).eq('role', 'student')
    const fila = { profesor: p.id, desde: p.frozen_since, alumnos: (alumnos ?? []).length, eliminado: false }
    if (!dry_run) {
      try {
        if (p.stripe_subscription_id) await stripe().subscriptions.cancel(p.stripe_subscription_id).catch(() => null)
        for (const a of alumnos ?? []) await borrarCuenta(db, a.id)
        await borrarCuenta(db, p.id)
        fila.eliminado = true
      } catch (e) {
        console.error('limpieza', p.id, (e as Error)?.message)
      }
    }
    resultado.push(fila)
  }
  return json({ dry_run: !!dry_run, cuentas: resultado })
})

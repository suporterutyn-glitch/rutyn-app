// Edge Function diaria: elimina las cuentas congeladas por falta de pago hace más de 60 días
// (el profesor y todos sus alumnos, con sus archivos) y los registros que nunca confirmaron su correo
// en 48 horas. Solo con CRON_SECRET (lo manda pg_cron desde Vault).
//
// POST {}              -> elimina
// POST { dry_run: true } -> solo lista lo que eliminaría

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { stripe, json } from '../_shared/stripe.ts'
import { borrarCuenta } from '../_shared/cuentas.ts'

const DIAS_DE_GRACIA = 60
const HORAS_SIN_CONFIRMAR = 48

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
  // 2) Registros que nunca confirmaron el correo (típico: correo mal escrito). Pasadas 48 h se borran,
  //    así no quedan cuentas fantasma. No toca a los alumnos que agregó un profesor (esos confirman
  //    al crear su contraseña) ni a los administradores.
  const sinConfirmar: any[] = []
  const corte = Date.now() - HORAS_SIN_CONFIRMAR * 3600000
  const { data: adm } = await db.from('admins').select('user_id')
  const admins = new Set((adm ?? []).map((a: any) => a.user_id))
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data: lote, error: e2 } = await db.auth.admin.listUsers({ page: pagina, perPage: 1000 })
    if (e2 || !lote?.users?.length) break
    const candidatos = lote.users.filter((u: any) =>
      !u.email_confirmed_at && !u.last_sign_in_at && new Date(u.created_at).getTime() < corte && !admins.has(u.id))
    if (candidatos.length) {
      const { data: perfiles } = await db.from('profiles').select('id,role,teacher_id,link_status').in('id', candidatos.map((u: any) => u.id))
      const P = new Map((perfiles ?? []).map((p: any) => [p.id, p]))
      for (const u of candidatos) {
        const p: any = P.get(u.id)
        const creadoPorProfesor = p?.role === 'student' && p.teacher_id && p.link_status === 'active'
        if (creadoPorProfesor) continue
        const fila = { id: u.id, email: u.email, creado: u.created_at, eliminado: false }
        if (!dry_run) {
          try { await borrarCuenta(db, u.id); fila.eliminado = true } catch (e) { console.error('sin confirmar', u.id, (e as Error)?.message) }
        }
        sinConfirmar.push(fila)
      }
    }
    if (lote.users.length < 1000) break
  }
  return json({ dry_run: !!dry_run, cuentas: resultado, sin_confirmar: sinConfirmar })
})

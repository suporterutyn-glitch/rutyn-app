// Edge Function diaria de mensualidades (profesor -> alumno). La llama pg_cron con CRON_SECRET.
//
// 1) Cobro mensual recurrente: cuando vence la última mensualidad de un alumno activo,
//    se crea la del mes siguiente (mismo monto, mismo día).
// 2) Recordatorios al alumno 5 y 3 días antes y el día del vencimiento.
// 3) Pendiente vencida -> "atrasada" (status suspended) + aviso al alumno y al profesor.
//    El alumno NO se suspende: lo decide el profesor.
// 4) Los lunes, resumen al profesor: cuántos cobros vencen en 7 días y cuántos están atrasados.
//
// POST {}                -> ejecuta
// POST { dry_run: true } -> solo cuenta lo que haría

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// Mismo mapa que src/lib/plans.ts (COUNTRY_CURRENCY).
const MONEDA: Record<string, string> = {
  BR: 'BRL', PT: 'EUR', ES: 'EUR', UY: 'UYU', AR: 'ARS', BO: 'BOB', PY: 'PYG',
  CL: 'CLP', CO: 'COP', PE: 'PEN', EC: 'USD', VE: 'USD',
}

// Textos de respaldo (pt); la app muestra la versión traducida usando data.key.
const AVISOS: Record<string, { title: string; body: string }> = {
  chargeNew: { title: 'Nova mensalidade', body: 'Sua mensalidade de {{amount}} vence em {{date}}.' },
  chargeSoon: { title: 'Mensalidade em {{days}} dias', body: 'Sua mensalidade de {{amount}} vence em {{date}}.' },
  chargeToday: { title: 'Mensalidade vence hoje', body: 'Sua mensalidade de {{amount}} vence hoje.' },
  chargeOverdueStudent: { title: 'Mensalidade atrasada', body: 'Sua mensalidade de {{amount}} venceu em {{date}}.' },
  chargeOverdueTeacher: { title: 'Mensalidade atrasada', body: '{{who}} não pagou a mensalidade de {{amount}} que venceu em {{date}}.' },
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  // @ts-ignore
  const CRON = Deno.env.get('CRON_SECRET')
  if (!CRON || (req.headers.get('Authorization') ?? '') !== `Bearer ${CRON}`) return new Response('unauthorized', { status: 401 })
  // @ts-ignore
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { dry_run } = await req.json().catch(() => ({})) as any

  const hoy = new Date().toISOString().slice(0, 10)
  const r = { nuevas: 0, recordatorios: 0, atrasadas: 0 }
  const avisos: any[] = []

  // Datos de profesores y alumnos para montos (moneda del profesor) y nombres.
  const { data: perfiles } = await db.from('profiles').select('id,full_name,email,country,role,teacher_id,link_status,frozen_since')
  const P = new Map((perfiles ?? []).map((p: any) => [p.id, p]))
  const monto = (valor: number, profesorId: string) => {
    const moneda = MONEDA[(P.get(profesorId) as any)?.country ?? 'BR'] ?? 'BRL'
    try { return new Intl.NumberFormat(moneda === 'BRL' ? 'pt-BR' : 'es-UY', { style: 'currency', currency: moneda }).format(valor) }
    catch { return valor.toFixed(2) }
  }
  const fecha = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7)
  const aviso = (userId: string, key: string, params: Record<string, unknown>, type = 'payment') => {
    const t = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? ''))
    avisos.push({ user_id: userId, type, title: t(AVISOS[key].title), body: t(AVISOS[key].body), data: { key, params } })
  }

  // 1) Recurrencia mensual.
  const { data: cobros } = await db.from('charges').select('id,teacher_id,student_id,amount,due_date,status,format')
  const ultimo = new Map<string, any>()
  for (const c of cobros ?? []) {
    const k = c.teacher_id + ':' + c.student_id
    if (!ultimo.has(k) || c.due_date > ultimo.get(k).due_date) ultimo.set(k, c)
  }
  const nuevas: any[] = []
  for (const c of ultimo.values()) {
    const alumno: any = P.get(c.student_id)
    const profe: any = P.get(c.teacher_id)
    if (c.format !== 'monthly' || c.due_date > hoy || !(Number(c.amount) > 0)) continue
    if (!alumno || alumno.teacher_id !== c.teacher_id || alumno.link_status !== 'active' || profe?.frozen_since) continue
    const venc = sumarMes(c.due_date)
    nuevas.push({ teacher_id: c.teacher_id, student_id: c.student_id, format: 'monthly', amount: c.amount, due_date: venc, status: 'pending' })
    aviso(c.student_id, 'chargeNew', { amount: monto(Number(c.amount), c.teacher_id), date: fecha(venc) })
  }
  r.nuevas = nuevas.length

  // 2) Recordatorios.
  for (const c of cobros ?? []) {
    if (c.status !== 'pending') continue
    const dias = difDias(hoy, c.due_date)
    const params = { amount: monto(Number(c.amount), c.teacher_id), date: fecha(c.due_date), days: dias }
    if (dias === 5 || dias === 3) { aviso(c.student_id, 'chargeSoon', params); r.recordatorios++ }
    else if (dias === 0) { aviso(c.student_id, 'chargeToday', params); r.recordatorios++ }
  }

  // 3) Vencidas -> atrasadas (una sola vez: la próxima corrida ya no están 'pending').
  const vencidas = (cobros ?? []).filter((c: any) => c.status === 'pending' && c.due_date < hoy)
  for (const c of vencidas) {
    const alumno: any = P.get(c.student_id)
    const params = { amount: monto(Number(c.amount), c.teacher_id), date: fecha(c.due_date), who: alumno?.full_name ?? alumno?.email ?? '' }
    aviso(c.student_id, 'chargeOverdueStudent', params, 'warning')
    aviso(c.teacher_id, 'chargeOverdueTeacher', params, 'warning')
  }
  r.atrasadas = vencidas.length

  // 4) Lunes: resumen al profesor de lo que vence en 7 días y lo que está atrasado.
  let resumenes = 0
  if (new Date().getUTCDay() === 1) {
    const en7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    const porProfe = new Map<string, { due: number; overdue: number }>()
    const idsVencidas = new Set(vencidas.map((c: any) => c.id))
    for (const c of [...(cobros ?? []), ...nuevas]) {
      const atrasado = c.status === 'suspended' || idsVencidas.has(c.id)
      const porVencer = c.status === 'pending' && !idsVencidas.has(c.id) && c.due_date >= hoy && c.due_date <= en7
      if (!atrasado && !porVencer) continue
      const x = porProfe.get(c.teacher_id) ?? { due: 0, overdue: 0 }
      if (atrasado) x.overdue++; else x.due++
      porProfe.set(c.teacher_id, x)
    }
    for (const [profe, x] of porProfe) {
      if ((P.get(profe) as any)?.frozen_since) continue
      const t = { title: 'Cobranças da semana', body: `${x.due} vencem nos próximos 7 dias · ${x.overdue} atrasadas. Veja quem em Financeiro.` }
      avisos.push({ user_id: profe, type: 'payment', title: t.title, body: t.body, data: { key: 'weekSummary', params: x } })
      resumenes++
    }
  }

  if (!dry_run) {
    if (nuevas.length) await db.from('charges').insert(nuevas)
    if (vencidas.length) await db.from('charges').update({ status: 'suspended' }).in('id', vencidas.map((c: any) => c.id))
    if (avisos.length) await db.from('notifications').insert(avisos)
  }
  return new Response(JSON.stringify({ ok: true, dry_run: !!dry_run, ...r, resumenes, avisos: avisos.length, hoy }), { headers: { 'Content-Type': 'application/json' } })
})

/** Mismo día del mes siguiente (31/01 -> 28/02). */
function sumarMes(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  const ultimoDia = new Date(Date.UTC(a, m + 1, 0)).getUTCDate()
  const f = new Date(Date.UTC(a, m, Math.min(d, ultimoDia)))
  return f.toISOString().slice(0, 10)
}

function difDias(desde: string, hasta: string) {
  return Math.round((Date.parse(hasta + 'T00:00:00Z') - Date.parse(desde + 'T00:00:00Z')) / 86400000)
}

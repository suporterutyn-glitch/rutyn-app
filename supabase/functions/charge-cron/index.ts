// Edge Function: cron diário para mensalidades.
// - Notifica aluno 5 e 3 dias antes do vencimento
// - Muda status de 'pending' vencida para 'suspended' + notifica ambos
// - Também desativa alunos sem professor há mais de 30 dias
//
// Chame via pg_cron (via extensão) OU Supabase Scheduled Functions:
//   select cron.schedule('charge-cron', '0 8 * * *',
//     $$ select net.http_post(url := 'https://<ref>.functions.supabase.co/charge-cron',
//        headers := jsonb_build_object('Authorization','Bearer <SERVICE_ROLE>')) $$);

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// @ts-ignore
Deno.serve(async (req: Request) => {
  // Só aceita chamada autorizada (service role token)
  const auth = req.headers.get('Authorization') ?? ''
  // @ts-ignore
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!auth.includes(SERVICE)) {
    return new Response('unauthorized', { status: 401 })
  }

  // @ts-ignore
  const URL = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(URL, SERVICE)

  const today = new Date().toISOString().slice(0, 10)
  const in3 = shiftDays(today, 3)
  const in5 = shiftDays(today, 5)
  const before30 = shiftDays(today, -30)

  const results: Record<string, number> = {}

  // 1) Lembretes 5 dias antes
  const { data: c5 } = await admin
    .from('charges').select('id,student_id,teacher_id,amount,due_date')
    .eq('status', 'pending').eq('due_date', in5)
  await Promise.all(((c5 as any[]) ?? []).map((c) => notify(admin, c.student_id, 'payment',
    'Mensalidade em 5 dias', `Sua mensalidade de ${money(c.amount)} vence em ${br(c.due_date)}.`)))
  results.reminders5 = (c5?.length ?? 0)

  // 2) Lembretes 3 dias antes
  const { data: c3 } = await admin
    .from('charges').select('id,student_id,teacher_id,amount,due_date')
    .eq('status', 'pending').eq('due_date', in3)
  await Promise.all(((c3 as any[]) ?? []).map((c) => notify(admin, c.student_id, 'payment',
    'Mensalidade em 3 dias', `Sua mensalidade de ${money(c.amount)} vence em ${br(c.due_date)}.`)))
  results.reminders3 = (c3?.length ?? 0)

  // 3) Vencidas pendentes → suspended
  const { data: overdue } = await admin
    .from('charges').select('id,student_id,teacher_id,due_date')
    .eq('status', 'pending').lt('due_date', today)
  if (overdue && overdue.length > 0) {
    const ids = (overdue as any[]).map((c) => c.id)
    await admin.from('charges').update({ status: 'suspended' }).in('id', ids)
    for (const c of overdue as any[]) {
      await notify(admin, c.student_id, 'warning', 'Mensalidade suspensa',
        `Sua mensalidade venceu em ${br(c.due_date)}.`)
      await notify(admin, c.teacher_id, 'warning', 'Aluno com mensalidade vencida',
        `Cobrança de ${br(c.due_date)} venceu sem pagamento.`)
      await admin.from('profiles').update({ link_status: 'suspended' }).eq('id', c.student_id)
    }
  }
  results.suspended = overdue?.length ?? 0

  // 4) Alunos sem professor há mais de 30 dias → deactivate
  const { data: orphans } = await admin
    .from('profiles').select('id,created_at').eq('role', 'student').is('teacher_id', null)
    .eq('account_status', 'active').lt('created_at', before30 + 'T00:00:00Z')
  if (orphans && orphans.length > 0) {
    const ids = (orphans as any[]).map((p) => p.id)
    await admin.from('profiles').update({ account_status: 'deactivated' }).in('id', ids)
  }
  results.deactivated = orphans?.length ?? 0

  return new Response(JSON.stringify({ ok: true, ...results, ran_at: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

async function notify(admin: any, userId: string, type: string, title: string, body: string) {
  await admin.from('notifications').insert({ user_id: userId, type, title, body })
}

function shiftDays(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
function br(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function money(v: any) {
  const n = Number(v ?? 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

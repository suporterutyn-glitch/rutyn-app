// Edge Function: le avisa la oferta de lanzamiento a un profesor nuevo (aviso en la app + correo).
// La llama el trigger `oferta_al_confirmar` cuando un profesor confirma su correo (pg_net + CRON_SECRET).
// POST { user_id }. No hace nada si la oferta ya terminó, si el profesor ya tiene plan pago
// o si ya recibió el aviso. Misma oferta que src/lib/oferta.ts y stripe-create-checkout.

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { enviarCorreo, plantilla, escapar } from '../_shared/correo.ts'

const FIN = Date.parse('2026-11-02T02:59:59Z')

const TEXTOS = {
  es: {
    asunto: '50% OFF por 3 meses en Rutyn · solo hasta el 1 de noviembre',
    titulo: (n: string) => (n ? `Hola ${n}, tenemos una oferta para ti` : 'Tenemos una oferta para ti'),
    parrafos: [
      'Para celebrar el lanzamiento de Rutyn, si contratas el plan <b>Básico</b> o <b>Pro</b> hasta el <b>1 de noviembre</b>, pagas <b>la mitad durante los primeros 3 meses</b>. Después sigue el precio normal.',
      'Con un plan pago sumas más alumnos y les armas rutinas, dietas, evaluaciones y cobros desde la misma app.',
      'El descuento se aplica solo al pagar, sin códigos. Entra a la app, ve a <b>Mi plan</b> y elige cuántos alumnos quieres.',
    ],
    boton: 'Quiero mi 50% OFF',
    pie: 'Recibes este correo porque tienes una cuenta de profesor en Rutyn. ¿Dudas? Escríbenos por WhatsApp al +55 48 99107-4102.',
    sello: '50% OFF · 3 meses',
    aviso: { title: '50% OFF por 3 meses 🎉', body: 'Oferta de lanzamiento: contratá Básico o Pro hasta el 1 de noviembre y pagá la mitad los primeros 3 meses.' },
  },
  pt: {
    asunto: '50% OFF por 3 meses no Rutyn · só até 1º de novembro',
    titulo: (n: string) => (n ? `Olá ${n}, temos uma oferta para você` : 'Temos uma oferta para você'),
    parrafos: [
      'Para comemorar o lançamento do Rutyn, se você assinar o plano <b>Básico</b> ou <b>Pro</b> até <b>1º de novembro</b>, paga <b>a metade nos primeiros 3 meses</b>. Depois segue o preço normal.',
      'Com um plano pago você soma mais alunos e monta rotinas, dietas, avaliações e cobranças no mesmo app.',
      'O desconto é aplicado no pagamento, sem códigos. Entre no app, vá em <b>Meu plano</b> e escolha quantos alunos quer.',
    ],
    boton: 'Quero meu 50% OFF',
    pie: 'Você recebe este e-mail porque tem uma conta de professor no Rutyn. Dúvidas? Fale com a gente pelo WhatsApp +55 48 99107-4102.',
    sello: '50% OFF · 3 meses',
    aviso: { title: '50% OFF por 3 meses 🎉', body: 'Oferta de lançamento: assine o Básico ou o Pro até 1º de novembro e pague a metade nos primeiros 3 meses.' },
  },
  en: {
    asunto: '50% off for 3 months on Rutyn · only until November 1',
    titulo: (n: string) => (n ? `Hi ${n}, we have an offer for you` : 'We have an offer for you'),
    parrafos: [
      'To celebrate the launch of Rutyn, if you subscribe to the <b>Basic</b> or <b>Pro</b> plan by <b>November 1</b>, you pay <b>half for the first 3 months</b>. Then the regular price applies.',
      'With a paid plan you can add more clients and build their workouts, diets, assessments and payments in the same app.',
      'The discount is applied at checkout, no codes needed. Open the app, go to <b>My plan</b> and choose how many clients you need.',
    ],
    boton: 'Get my 50% off',
    pie: 'You are receiving this email because you have a trainer account on Rutyn. Questions? Message us on WhatsApp at +55 48 99107-4102.',
    sello: '50% OFF · 3 months',
    aviso: { title: '50% OFF for 3 months 🎉', body: 'Launch offer: subscribe to Basic or Pro by November 1 and pay half for the first 3 months.' },
  },
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  // @ts-ignore
  const CRON = Deno.env.get('CRON_SECRET')
  if (!CRON || (req.headers.get('Authorization') ?? '') !== `Bearer ${CRON}`) return new Response('unauthorized', { status: 401 })
  const { user_id } = await req.json().catch(() => ({})) as any
  if (!user_id) return new Response(JSON.stringify({ error: 'user_id' }), { status: 400 })
  if (Date.now() > FIN) return new Response(JSON.stringify({ ok: true, omitido: 'oferta terminada' }))

  // @ts-ignore
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: p } = await db.from('profiles').select('id,role,plan,email,full_name,language').eq('id', user_id).maybeSingle()
  if (!p || p.role !== 'teacher' || (p.plan && p.plan !== 'free')) return new Response(JSON.stringify({ ok: true, omitido: 'no corresponde' }))
  const { count } = await db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', p.id).eq('data->>key', 'planOffer')
  if ((count ?? 0) > 0) return new Response(JSON.stringify({ ok: true, omitido: 'ya avisado' }))

  const t = TEXTOS[(p.language === 'pt' || p.language === 'en') ? p.language : 'es']
  await db.from('notifications').insert({ user_id: p.id, type: 'info', title: t.aviso.title, body: t.aviso.body, data: { key: 'planOffer', params: {} } })

  let correo = false
  if (p.email) {
    const nombre = escapar(String(p.full_name ?? '').trim().split(' ')[0] ?? '')
    const sello = `<div style="text-align:center;margin:0 0 20px"><span style="display:inline-block;background:linear-gradient(100deg,#FFE45C,#FFB020,#FF6A1A);color:#111;font-weight:bold;font-size:30px;padding:10px 22px;border-radius:14px">${t.sello}</span></div>`
    const html = plantilla(t.titulo(nombre), t.parrafos, t.boton, 'https://app.rutyn.com.br/professor/assinatura', t.pie)
      .replace('<h2 ', sello + '<h2 ')
    try { await enviarCorreo(p.email, t.asunto, html); correo = true } catch (e) { console.error('correo oferta', e) }
  }
  return new Response(JSON.stringify({ ok: true, aviso: true, correo }), { headers: { 'Content-Type': 'application/json' } })
})

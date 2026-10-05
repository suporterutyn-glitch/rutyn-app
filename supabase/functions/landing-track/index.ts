// Edge Function: recibe los eventos de la landing (rutyn.com.br) y los guarda en landing_events.
// Pública (sin JWT) pero solo acepta pedidos que vienen de la landing. No guarda IP ni datos personales.
//
// POST (text/plain o JSON) { type, visitor, session?, label?, lang?, device?, referrer?, utm_source?, utm_medium?, utm_campaign?, tz? }

// deno-lint-ignore-file
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const ORIGENES = new Set(['https://rutyn.com.br', 'https://www.rutyn.com.br'])
const TIPOS = new Set(['view', 'cta', 'form_start', 'signup_sent', 'signup', 'plan_click'])
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|facebookexternalhit|whatsapp|curl|wget|python|axios/i

const cors = (origen: string) => ({
  'Access-Control-Allow-Origin': origen,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Vary': 'Origin',
})
const corto = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)

// @ts-ignore
Deno.serve(async (req: Request) => {
  const origen = req.headers.get('Origin') ?? ''
  if (!ORIGENES.has(origen)) return new Response('forbidden', { status: 403 })
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(origen) })
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: cors(origen) })
  const ok = () => new Response(null, { status: 204, headers: cors(origen) })
  if (BOT.test(req.headers.get('User-Agent') ?? '')) return ok()

  let b: any = {}
  try { b = JSON.parse((await req.text()).slice(0, 2000)) } catch { return ok() }
  const visitor = corto(b.visitor, 40)
  if (!TIPOS.has(b.type) || !visitor || !/^[a-z0-9-]{8,40}$/i.test(visitor)) return ok()

  // @ts-ignore
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  // Tope simple contra abuso: un mismo navegador no pasa de 150 eventos por hora.
  const { count } = await db.from('landing_events').select('id', { count: 'exact', head: true })
    .eq('visitor', visitor).gte('created_at', new Date(Date.now() - 3600000).toISOString())
  if ((count ?? 0) > 150) return ok()

  await db.from('landing_events').insert({
    type: b.type, visitor, session: corto(b.session, 40), label: corto(b.label, 60),
    lang: ['pt', 'es', 'en'].includes(b.lang) ? b.lang : null,
    device: ['mobile', 'tablet', 'desktop'].includes(b.device) ? b.device : null,
    referrer: corto(b.referrer, 80), utm_source: corto(b.utm_source, 60), utm_medium: corto(b.utm_medium, 60),
    utm_campaign: corto(b.utm_campaign, 80), tz: corto(b.tz, 50),
  })
  return ok()
})

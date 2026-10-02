// Envío de correos por el relay SMTP del VPS (suporte@rutyn.com.br).

// @ts-ignore
const RELAY = Deno.env.get('VPS_RELAY_URL') || 'http://179.197.67.10:3001'

export async function enviarCorreo(to: string, subject: string, html: string) {
  const res = await fetch(`${RELAY}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html }),
  })
  if (!res.ok) throw new Error(await res.text())
}

/** Correo con la marca de Rutyn: título, párrafos y un botón. */
export function plantilla(titulo: string, parrafos: string[], boton: string, url: string, pie = '') {
  const p = parrafos.map((t) => `<p style="color:#555;font-size:16px;line-height:1.6;margin:0 0 14px">${t}</p>`).join('')
  return `<div style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
  <div style="background:#fff;border-radius:12px;padding:30px;max-width:560px;margin:0 auto">
    <h1 style="color:#7ec048;margin:0 0 24px;font-size:28px;text-align:center">Rutyn</h1>
    <h2 style="color:#333;font-size:22px;margin:0 0 16px">${titulo}</h2>
    ${p}
    <div style="text-align:center;margin:28px 0">
      <a href="${url}" style="background:#7ec048;color:#fff;padding:14px 36px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block">${boton}</a>
    </div>
    ${pie ? `<p style="color:#999;font-size:13px;line-height:1.5">${pie}</p>` : ''}
  </div>
</div>`
}

export function escapar(s: string) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

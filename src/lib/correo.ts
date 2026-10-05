// Detecta correos con el dominio mal escrito ("gmail.gom", "gnail.com", "hotmail.con") y propone el correcto.
// Un correo mal escrito no recibe el código de confirmación y deja una cuenta que nadie puede usar.

const DOMINIOS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.com', 'yahoo.com.br', 'hotmail.com.br', 'outlook.com.br', 'yahoo.es', 'hotmail.es', 'outlook.es', 'uol.com.br', 'bol.com.br', 'terra.com.br', 'protonmail.com', 'me.com', 'msn.com', 'mail.com', 'email.com', 'gmx.com', 'aol.com', 'ymail.com', 'zoho.com']
const TLD_MAL: [RegExp, string][] = [
  [/\.(con|cpm|cmo|vom|xom|gom|com\.|comm|coom|c0m|ocm|om|cm)$/, '.com'],
  [/\.(con|cmo|vom|gom)\.br$/, '.com.br'],
  [/\.com\.(bt|vr|be|nr)$/, '.com.br'],
]

function distancia(a: string, b: string) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) m[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) m[i][j] = Math.min(m[i][j], m[i - 2][j - 2] + 1)
    }
  }
  return m[a.length][b.length]
}

/** Devuelve el correo corregido si el dominio parece un error de tipeo; si no, null. */
export function sugerirCorreo(correo: string): string | null {
  const limpio = correo.trim().toLowerCase()
  const arroba = limpio.lastIndexOf('@')
  if (arroba < 1) return null
  const usuario = limpio.slice(0, arroba)
  let dominio = limpio.slice(arroba + 1)
  if (!dominio.includes('.') || DOMINIOS.includes(dominio)) return null

  for (const [mal, bien] of TLD_MAL) {
    if (mal.test(dominio)) { dominio = dominio.replace(mal, bien); break }
  }
  if (!DOMINIOS.includes(dominio)) {
    // A una o dos letras de un dominio conocido (gnail.com, hotmial.com, outlok.com).
    const cerca = DOMINIOS.map((d) => ({ d, n: distancia(dominio, d) })).sort((a, b) => a.n - b.n)[0]
    if (cerca.n <= (dominio.length > 9 ? 2 : 1)) dominio = cerca.d
  }
  const sugerido = `${usuario}@${dominio}`
  return sugerido !== limpio ? sugerido : null
}

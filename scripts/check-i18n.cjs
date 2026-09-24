// Verifica que cada t('ns:clave') usado en el código exista en pt, es y en.
const fs = require('fs'), path = require('path')
const { stripTypeScriptTypes } = require('node:module')
const SRC = path.resolve('src')
const res = { pt: {}, es: {}, en: {} }
// namespaces inline de lib/i18n.ts
const lib = fs.readFileSync(path.join(SRC, 'lib/i18n.ts'), 'utf8')
for (const l of ['pt', 'es', 'en']) {
  const re = new RegExp(`^const ${l}(?:: typeof pt)? = \\{`, 'm')
  const i = lib.search(re)
  const j = lib.indexOf('\n}\n', i)
  const obj = lib.slice(lib.indexOf('{', i), j + 2)
  Object.assign(res[l], eval('(' + obj + ')'))
}
// namespaces en src/i18n/*.ts
for (const f of fs.readdirSync(path.join(SRC, 'i18n'))) {
  if (f === 'textos.ts') continue
  let code = fs.readFileSync(path.join(SRC, 'i18n', f), 'utf8')
  code = code.replace(/import \{ textos \} from '\.\/textos'\n/, 'const textos = (x) => x\n')
  const js = stripTypeScriptTypes(code).replace(/^export default /m, 'module.exports.default = ')
  const m = { exports: {} }; new Function('module', 'exports', js)(m, m.exports)
  const ns = f.replace(/\.ts$/, '')
  for (const l of ['pt', 'es', 'en']) res[l][ns] = m.exports.default[l]
}
function tiene(obj, ns, key) {
  let o = obj[ns]; if (!o) return false
  for (const p of key.split('.')) { if (o == null) return false; o = o[p] }
  if (typeof o === 'string') return true
  return false
}
function tienePlural(obj, ns, key) { return tiene(obj, ns, key + '_one') || tiene(obj, ns, key + '_other') }
const falta = []; let usos = 0
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f)
    if (fs.statSync(p).isDirectory()) { walk(p); continue }
    if (!/\.(tsx?|ts)$/.test(f) || p.includes('/i18n/') || p.endsWith('lib/i18n.ts')) continue
    const s = fs.readFileSync(p, 'utf8')
    for (const m of s.matchAll(/(?<![\w.])(?:t|i18n\.t)\(\s*'([^'$]+)'/g)) {
      usos++; let k = m[1]
      let [ns, key] = k.includes(':') ? k.split(':') : ['common', k]
      for (const l of ['pt', 'es', 'en']) {
        if (!tiene(res[l], ns, key) && !tienePlural(res[l], ns, key)) falta.push(`${l}  ${ns}:${key}  (${path.relative(SRC, p)})`)
      }
    }
  }
}
walk(SRC)
// claves con distinta forma entre idiomas (solo inline; los archivos nuevos ya los chequea TS)
function claves(o, pre = '') { return Object.entries(o).flatMap(([k, v]) => typeof v === 'object' ? claves(v, pre + k + '.') : [pre + k]) }
const base = new Set(claves(res.pt))
for (const l of ['es', 'en']) for (const k of claves(res[l])) if (!base.has(k)) falta.push(`solo-${l} ${k}`)
for (const l of ['es', 'en']) { const s = new Set(claves(res[l])); for (const k of base) if (!s.has(k)) falta.push(`falta-en-${l} ${k}`) }
console.log('usos revisados:', usos); console.log([...new Set(falta)].join('\n') || 'OK: todas las claves existen en pt/es/en')
// valores en inglés que parecen portugués/español
function vals(o, pre = '') { return Object.entries(o).flatMap(([k, v]) => typeof v === 'object' ? vals(v, pre + k + '.') : [[pre + k, v]]) }
const ptv = Object.fromEntries(vals(res.pt)), esv = Object.fromEntries(vals(res.es))
for (const [k, v] of vals(res.en)) {
  if (/[ãõçêâáéíóúñ¿¡]/i.test(v) || (v === ptv[k] && /\b(de|do|da|para|com|sem|não|seu|sua)\b/i.test(v))) console.log('EN?', k, '=', v)
}
for (const [k, v] of vals(res.es)) {
  if (/[ãõç]|\b(você|não|seu|sua|com|sem|mais)\b/i.test(v)) console.log('ES?', k, '=', v)
}

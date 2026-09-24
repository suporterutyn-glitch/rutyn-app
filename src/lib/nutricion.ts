/** Macros de un alimento para una cantidad: valores de la porción base × (cantidad ÷ porción). */
export type Macros = { kcal: number; p: number; c: number; g: number }

export type ConMacros = {
  portion_qty: number | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fats_g: number | null
}

export function macrosDe(f: ConMacros, cantidad: number): Macros {
  const base = Number(f.portion_qty) > 0 ? Number(f.portion_qty) : 100
  const r = cantidad / base
  return {
    kcal: Number(f.calories ?? 0) * r,
    p: Number(f.protein_g ?? 0) * r,
    c: Number(f.carbs_g ?? 0) * r,
    g: Number(f.fats_g ?? 0) * r,
  }
}

export function sumarMacros(lista: Macros[]): Macros {
  return lista.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, g: a.g + m.g }), { kcal: 0, p: 0, c: 0, g: 0 })
}

/** g/ml de a 10 sin decimales; Kg/L de a 0,1; Uni de a 1 (regla 9 del módulo 08). */
export function pasoDe(unidad: string | null | undefined) {
  if (unidad === 'kg' || unidad === 'l') return { paso: 0.1, minimo: 0.1, decimales: 1 }
  if (unidad === 'uni') return { paso: 1, minimo: 1, decimales: 0 }
  return { paso: 10, minimo: 1, decimales: 0 }
}

export function redondear(n: number, decimales: number) {
  const f = 10 ** decimales
  return Math.round(n * f) / f
}

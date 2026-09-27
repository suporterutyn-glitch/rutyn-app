import { gruposMusculares, categoriasExercicio, categoriasAlimento, equipamentos, objetivosTreino, objetivosDieta, dificultades, categoriasReceita, tiposRefeicao, type Catalogo } from './catalogos'

/**
 * Búsqueda común de la app: sin acentos ni mayúsculas, palabras en cualquier
 * orden, en portugués, español o inglés, y no solo por el nombre: también por
 * grupo muscular, categoría, equipamiento, ingredientes...
 */
export function normalizar(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function coincide(busca: string, textos: (string | null | undefined)[]) {
  const palabras = normalizar(busca.trim()).split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return true
  const pajar = normalizar(textos.filter(Boolean).join(' '))
  return palabras.every((p) => pajar.includes(p))
}

/** Las tres etiquetas de un valor de catálogo, para buscar en cualquier idioma. */
export function terminos(lista: Catalogo[], ids: (string | null | undefined)[] | null | undefined): string[] {
  return (ids ?? []).flatMap((id) => {
    const c = lista.find((x) => x.id === id)
    return c ? [c.pt, c.es, c.en ?? ''] : []
  })
}

/** Cómo se busca una región del cuerpo que no es un grupo muscular en sí. */
const REGIONES: Record<string, string> = {
  quadriceps: 'perna pernas pierna piernas leg legs coxa muslo thigh inferiores lower body',
  hamstrings: 'perna pernas pierna piernas leg legs coxa muslo thigh isquiotibiais femoral inferiores lower body',
  glutes: 'perna pernas pierna piernas leg legs bumbum cola gluteo inferiores lower body',
  calves: 'perna pernas pierna piernas leg legs gemelos gemeos inferiores lower body',
  adductors: 'perna pernas pierna piernas leg legs coxa muslo inferiores lower body',
  abductors: 'perna pernas pierna piernas leg legs coxa muslo inferiores lower body',
  biceps: 'braco bracos brazo brazos arm arms superiores upper body',
  triceps: 'braco bracos brazo brazos arm arms superiores upper body',
  forearms: 'braco bracos brazo brazos arm arms punho muneca wrist grip',
  abs: 'core abdominal abdomen barriga six pack',
  lowerBack: 'core lombar lumbar costas espalda back',
  chest: 'peitoral pectoral pecs superiores upper body',
  back: 'dorsal dorsais dorsales lats superiores upper body',
  shoulders: 'deltoide deltoides delts superiores upper body',
  traps: 'trapezio trapecio pescoco cuello neck superiores upper body',
}

export function terminosGrupos(ids: (string | null | undefined)[] | null | undefined) {
  return [...terminos(gruposMusculares, ids), ...(ids ?? []).map((id) => (id ? REGIONES[id] ?? '' : ''))]
}

type EjercicioBuscable = {
  name?: string | null; name_pt?: string | null; name_es?: string | null; name_en?: string | null
  muscle_group?: string | null; muscle_groups?: string[] | null
  category?: string | null; equipment?: string | null
}

export function textosEjercicio(e: EjercicioBuscable): (string | null | undefined)[] {
  const grupos = e.muscle_groups?.length ? e.muscle_groups : [e.muscle_group]
  return [e.name, e.name_pt, e.name_es, e.name_en, ...terminosGrupos(grupos), ...terminos(categoriasExercicio, [e.category]), ...terminos(equipamentos, [e.equipment])]
}

type AlimentoBuscable = { name?: string | null; name_pt?: string | null; name_es?: string | null; name_en?: string | null; category?: string | null }

const CATEGORIA_ALIMENTO_EXTRA: Record<string, string> = {
  protein: 'proteinas proteins',
  carb: 'carboidratos carbohidratos carbs hidratos',
  fat: 'gorduras grasas fats lipidos',
  supplement: 'suplementos supplements whey',
  calories: 'caloricos energia',
  none: 'verdura verduras legumes vegetales vegetables',
}

export function textosAlimento(f: AlimentoBuscable): (string | null | undefined)[] {
  return [f.name, f.name_pt, f.name_es, f.name_en, ...terminos(categoriasAlimento, [f.category ?? 'none']), CATEGORIA_ALIMENTO_EXTRA[f.category ?? 'none'] ?? '']
}

export function textosRutina(r: { name: string; objective?: string | null; difficulty?: string | null }, ejercicios: EjercicioBuscable[]) {
  return [r.name, r.objective, r.difficulty, ...terminos(objetivosTreino, [r.objective]), ...terminos(dificultades, [r.difficulty]), ...ejercicios.flatMap(textosEjercicio)]
}

export function textosReceta(r: { name: string; category?: string | null }, ingredientes: AlimentoBuscable[]) {
  return [r.name, ...terminos(categoriasReceita, [r.category]), ...ingredientes.flatMap(textosAlimento)]
}

export function textosDieta(d: { name: string; goal?: string | null }, comidas: { name: string; meal_type?: string | null }[], alimentos: AlimentoBuscable[]) {
  return [d.name, d.goal, ...terminos(objetivosDieta, [d.goal]), ...comidas.flatMap((m) => [m.name, ...terminos(tiposRefeicao, [m.meal_type])]), ...alimentos.flatMap(textosAlimento)]
}

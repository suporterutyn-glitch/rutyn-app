import { supabase } from '@/lib/supabase'
import { macrosDe, sumarMacros, type Macros } from '@/lib/nutricion'
import { abreviaturaUnidad, etiquetaDe, tiposRefeicao } from '@/lib/catalogos'
import { nombreEjercicio as nombreEnIdioma } from '@/lib/nombreEjercicio'
import type { Food } from '../FoodsTab'
import i18n from '@/lib/i18n'

/** Alimento dentro de una refeição: guarda copia de nombre y macros (regla 10). */
export type AlimentoComida = {
  id: string
  meal_id: string
  food_id: string | null
  meal_recipe_id: string | null
  food_name_snapshot: string | null
  name_es: string | null
  name_en: string | null
  category: string | null
  quantity: number
  unit: string | null
  position: number
  portion_qty: number | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fats_g: number | null
}

export type RecetaComida = {
  id: string
  meal_id: string
  recipe_id: string | null
  name: string
  steps: string[]
  tips: string | null
  cover_url: string | null
  position: number
}

export type Comida = {
  id: string
  diet_id: string
  name: string
  time_of_day: string | null
  meal_type: string | null
  position: number
  meal_foods: AlimentoComida[]
  meal_recipes: RecetaComida[]
}

export type Dieta = {
  id: string
  owner_id: string
  name: string
  goal: string | null
  is_favorite: boolean | null
  position: number | null
  last_edited_by: string | null
  student_id?: string | null
  created_at: string
  meals: Comida[]
}

export const SELECT_DIETA = '*,meals(*,meal_foods(*),meal_recipes(*))'

/** Refeição del app: el nombre sale del idioma; personalizada: el que le puso el profesor. */
export function nombreComida(m: { name: string; meal_type: string | null }, lang: string) {
  return m.meal_type && !m.meal_type.startsWith('custom:') ? etiquetaDe(tiposRefeicao, m.meal_type, lang) : m.name
}

export function ordenarComidas(meals: Comida[]) {
  return meals.slice().sort((a, b) => (a.time_of_day ?? '99').localeCompare(b.time_of_day ?? '99'))
}

export function nombreAlimento(a: AlimentoComida, lang: string) {
  return nombreEnIdioma({ name: a.food_name_snapshot ?? '', name_pt: a.food_name_snapshot, name_es: a.name_es, name_en: a.name_en }, lang)
}

export function macrosAlimento(a: AlimentoComida): Macros {
  return macrosDe(a, Number(a.quantity))
}

export function macrosComida(m: Comida): Macros {
  return sumarMacros(m.meal_foods.map(macrosAlimento))
}

export function macrosDieta(d: Dieta): Macros {
  return sumarMacros(d.meals.map(macrosComida))
}

/** Fila de meal_foods con la copia del alimento del catálogo. */
export function filaAlimento(mealId: string, f: Food, cantidad: number, position: number, mealRecipeId: string | null = null) {
  return {
    meal_id: mealId,
    meal_recipe_id: mealRecipeId,
    food_id: f.id,
    food_name_snapshot: f.name_pt ?? f.name,
    name_es: f.name_es,
    name_en: f.name_en,
    category: f.category,
    quantity: cantidad,
    unit: f.unit ?? 'g',
    position,
    portion_qty: f.portion_qty,
    calories: f.calories,
    protein_g: f.protein_g,
    carbs_g: f.carbs_g,
    fats_g: f.fats_g,
  }
}

export async function cargarDieta(id: string) {
  const { data, error } = await supabase.from('diets').select(SELECT_DIETA).eq('id', id).single()
  if (error) throw error
  return data as Dieta
}

/** Marca la última edición: el card muestra 'Editado por: Professor'. */
export async function tocarDieta(id: string) {
  await supabase.from('diets').update({ last_edited_by: 'teacher', updated_at: new Date().toISOString() }).eq('id', id)
}

/**
 * Copia que recibe el alumno (student_diets.data). Mismo formato que ya lee la
 * pantalla de Nutrição: meals[].foods[] con macros ya calculados. Las receitas
 * van además en meals[].recipes para mostrar su modo de preparo.
 */
export function copiaParaAlumno(d: Dieta, lang = 'pt') {
  return {
    goal: d.goal,
    meals: ordenarComidas(d.meals).map((m) => ({
      name: m.name,
      meal_type: m.meal_type,
      time: m.time_of_day,
      foods: m.meal_foods.slice().sort((a, b) => a.position - b.position).map((a) => {
        const mm = macrosAlimento(a)
        return {
          name: nombreAlimento(a, lang),
          name_pt: a.food_name_snapshot,
          name_es: a.name_es,
          name_en: a.name_en,
          qty: Number(a.quantity),
          unit: abreviaturaUnidad(a.unit).trim(),
          kcal: mm.kcal, p: mm.p, c: mm.c, f: mm.g,
          recipe: m.meal_recipes.find((r) => r.id === a.meal_recipe_id)?.name ?? null,
        }
      }),
      recipes: m.meal_recipes.map((r) => ({ name: r.name, steps: r.steps, tips: r.tips, cover_url: r.cover_url })),
    })),
  }
}

/** Duplica una dieta completa (refeições, receitas y alimentos) para el mismo profesor. */
export async function duplicarDieta(d: Dieta, ownerId: string, position: number) {
  const { data: nueva, error } = await supabase.from('diets')
    .insert({ owner_id: ownerId, name: i18n.t('general:ui.copy', { name: d.name }), goal: d.goal, is_favorite: false, position })
    .select('id').single()
  if (error) throw error
  for (const m of d.meals) {
    const { data: mm, error: e1 } = await supabase.from('meals')
      .insert({ diet_id: nueva.id, name: m.name, time_of_day: m.time_of_day, meal_type: m.meal_type, position: m.position })
      .select('id').single()
    if (e1) throw e1
    const mapaRecetas = new Map<string, string>()
    for (const r of m.meal_recipes) {
      const { data: rr, error: e2 } = await supabase.from('meal_recipes')
        .insert({ meal_id: mm.id, recipe_id: r.recipe_id, name: r.name, steps: r.steps, tips: r.tips, cover_url: r.cover_url, position: r.position })
        .select('id').single()
      if (e2) throw e2
      mapaRecetas.set(r.id, rr.id)
    }
    if (m.meal_foods.length > 0) {
      const { error: e3 } = await supabase.from('meal_foods').insert(m.meal_foods.map(({ id: _i, meal_id: _m, meal_recipe_id, ...resto }) => ({
        ...resto, meal_id: mm.id, meal_recipe_id: meal_recipe_id ? mapaRecetas.get(meal_recipe_id) ?? null : null,
      })))
      if (e3) throw e3
    }
  }
}

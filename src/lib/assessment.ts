// Cálculos automáticos para avaliação física

export function bmi(weightKg?: number | null, heightCm?: number | null) {
  if (!weightKg || !heightCm) return null
  const h = heightCm / 100
  return weightKg / (h * h)
}

/** label es una clave de traducción. */
export function bmiClass(imc: number) {
  if (imc < 18.5) return { label: 'avaliacao:under', color: '#42A5F5' }
  if (imc < 25) return { label: 'avaliacao:normal', color: '#7CB342' }
  if (imc < 30) return { label: 'avaliacao:over', color: '#E6A23C' }
  if (imc < 35) return { label: 'avaliacao:ob1', color: '#FF7043' }
  if (imc < 40) return { label: 'avaliacao:ob2', color: '#F44336' }
  return { label: 'avaliacao:ob3', color: '#B71C1C' }
}

// FC máxima estimada — Tanaka (2001)
export function maxHR(age?: number | null) {
  if (!age) return null
  return Math.round(208 - 0.7 * age)
}

// FC de reserva (Karvonen) para uma intensidade %
export function targetHR(restingHR?: number | null, age?: number | null, intensity = 0.7) {
  const max = maxHR(age)
  if (!max || !restingHR) return null
  return Math.round(intensity * (max - restingHR) + restingHR)
}

// 1RM estimado (Epley)
export function estimate1RM(weightKg?: number | null, reps?: number | null) {
  if (!weightKg || !reps || reps <= 0) return null
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

// Cintura/quadril (WHR): risco
export function whr(waist?: number | null, hips?: number | null, isMale = true) {
  if (!waist || !hips) return null
  const r = waist / hips
  let risk: 'low' | 'moderate' | 'high' = 'low'
  if (isMale) {
    if (r >= 1.0) risk = 'high'
    else if (r >= 0.95) risk = 'moderate'
  } else {
    if (r >= 0.85) risk = 'high'
    else if (r >= 0.8) risk = 'moderate'
  }
  return { ratio: Math.round(r * 100) / 100, risk }
}

// Massa magra a partir de peso + % de gordura
export function leanMass(weightKg?: number | null, fatPct?: number | null) {
  if (!weightKg || fatPct == null) return null
  return Math.round(weightKg * (1 - fatPct / 100) * 10) / 10
}

// Catalogos extraidos de Rutyn_Documentacao/dados/enums.json (fuente oficial).
// No editar a mano: si cambian los enums del proyecto, volver a extraerlos.

export type Catalogo = { id: string; pt: string; es: string }

export function etiqueta(c: Catalogo, lang: string): string {
  return lang.startsWith('es') ? c.es : c.pt
}

export const atuacoes: Catalogo[] = [
  { id: 'personalTrainer', pt: 'Personal Trainer', es: 'Entrenador Personal' },
  { id: 'physicalEducator', pt: 'Educador Físico', es: 'Educador Físico' },
  { id: 'physicalTrainer', pt: 'Preparador Físico', es: 'Preparador Físico' },
  { id: 'functionalTrainingInstructor', pt: 'Instrutor de Treinamento Funcional', es: 'Instructor de Entrenamiento Funcional' },
  { id: 'runningCoach', pt: 'Treinador de Corrida', es: 'Entrenador de Running' },
  { id: 'crossTrainingCoach', pt: 'Treinador de Cross Training', es: 'Entrenador de Cross Training' },
  { id: 'calisthenicsInstructor', pt: 'Instrutor de Calistenia', es: 'Instructor de Calistenia' },
  { id: 'nutritionist', pt: 'Nutricionista', es: 'Nutricionista' },
  { id: 'sportsNutritionist', pt: 'Nutricionista Esportivo', es: 'Nutricionista Deportivo' },
  { id: 'homeTrainer', pt: 'Personal Home', es: 'Entrenador a Domicilio' },
  { id: 'swimmingInstructor', pt: 'Instrutor de Natação', es: 'Instructor de Natación' },
]

export const especialidades: Catalogo[] = [
  { id: 'weightLoss', pt: 'Emagrecimento', es: 'Adelgazamiento' },
  { id: 'hypertrophy', pt: 'Hipertrofia', es: 'Hipertrofia' },
  { id: 'definition', pt: 'Definição Muscular', es: 'Definición Muscular' },
  { id: 'leanMassGain', pt: 'Ganho de Massa Magra', es: 'Ganancia de Masa Magra' },
  { id: 'physicalConditioning', pt: 'Condicionamento Físico', es: 'Acondicionamiento Físico' },
  { id: 'healthWellness', pt: 'Saúde e Bem-estar', es: 'Salud y Bienestar' },
  { id: 'functionalTraining', pt: 'Treinamento Funcional', es: 'Entrenamiento Funcional' },
  { id: 'hiit', pt: 'HIIT', es: 'HIIT' },
  { id: 'injuryPrevention', pt: 'Prevenção de Lesões', es: 'Prevención de Lesiones' },
  { id: 'seniorTraining', pt: 'Terceira Idade', es: 'Tercera Edad' },
  { id: 'femaleTraining', pt: 'Treinamento Feminino', es: 'Entrenamiento Femenino' },
  { id: 'maleTraining', pt: 'Treinamento Masculino', es: 'Entrenamiento Masculino' },
  { id: 'pregnancyTraining', pt: 'Gestantes', es: 'Embarazadas' },
  { id: 'postpartumTraining', pt: 'Pós-parto', es: 'Posparto' },
  { id: 'athletePerformance', pt: 'Performance de Atletas', es: 'Rendimiento de Atletas' },
  { id: 'runningTraining', pt: 'Treinamento de Corrida', es: 'Entrenamiento de Running' },
  { id: 'weightLossNutrition', pt: 'Nutrição para Emagrecimento', es: 'Nutrición para Adelgazar' },
  { id: 'sportsNutrition', pt: 'Nutrição Esportiva', es: 'Nutrición Deportiva' },
]

export const formatosTrabalho: Catalogo[] = [
  { id: 'hybrid', pt: 'Híbrido', es: 'Híbrido' },
  { id: 'online', pt: 'Online', es: 'Online' },
  { id: 'inPerson', pt: 'Presencial', es: 'Presencial' },
]

export const clientesIdeais: Catalogo[] = [
  { id: 'male', pt: 'Homens', es: 'Hombres' },
  { id: 'female', pt: 'Mulheres', es: 'Mujeres' },
  { id: 'both', pt: 'Ambos', es: 'Ambos' },
]

/** Dificultad de una rutina (tabla difficulty_levels). */
export const dificultades: Catalogo[] = [
  { id: 'adaptation', pt: 'Adaptação', es: 'Adaptación' },
  { id: 'beginner', pt: 'Iniciante', es: 'Principiante' },
  { id: 'intermediate', pt: 'Intermediário', es: 'Intermedio' },
  { id: 'advanced', pt: 'Avançado', es: 'Avanzado' },
]

/** Objetivo de una rutina (tabla training_goals). */
export const objetivosTreino: Catalogo[] = [
  { id: 'hypertrophy', pt: 'Hipertrofia', es: 'Hipertrofia' },
  { id: 'fatLoss', pt: 'Perda de Gordura', es: 'Reducción de Grasa' },
  { id: 'fatLossHypertrophy', pt: 'Perda de Gordura + Hipertrofia', es: 'Reducción de Grasa/Hipertrofia' },
  { id: 'muscleDefinition', pt: 'Definição Muscular', es: 'Definición Muscular' },
  { id: 'physicalConditioning', pt: 'Condicionamento Físico', es: 'Acondicionamiento Físico' },
  { id: 'qualityOfLife', pt: 'Qualidade de Vida', es: 'Calidad de Vida' },
]

/** Objetivo de una dieta (tabla diet_goal). */
export const objetivosDieta: Catalogo[] = [
  { id: 'weightLoss', pt: 'Emagrecer', es: 'Perder Peso' },
  { id: 'muscleGain', pt: 'Ganhar Massa', es: 'Ganar Masa' },
  { id: 'maintenance', pt: 'Manutenção', es: 'Mantenimiento' },
  { id: 'healthyEating', pt: 'Alimentação Saudável', es: 'Alimentación Saludable' },
]

/** Muestra el id guardado con la etiqueta del idioma; si no está en el catálogo, se muestra tal cual. */
export function etiquetaDe(lista: Catalogo[], id: string | null | undefined, lang: string): string {
  if (!id) return ''
  const c = lista.find((x) => x.id === id)
  return c ? etiqueta(c, lang) : id
}

/** Grupos musculares de un ejercicio (tabla muscle_groups). Se eligen varios. */
export const gruposMusculares: Catalogo[] = [
  { id: 'chest', pt: 'Peito', es: 'Pecho' },
  { id: 'back', pt: 'Costas', es: 'Espalda' },
  { id: 'shoulders', pt: 'Ombros', es: 'Hombros' },
  { id: 'glutes', pt: 'Glúteos', es: 'Glúteos' },
  { id: 'quadriceps', pt: 'Quadríceps', es: 'Cuádriceps' },
  { id: 'hamstrings', pt: 'Posterior de Coxa', es: 'Isquiotibiales' },
  { id: 'calves', pt: 'Panturrilha', es: 'Pantorrilla' },
  { id: 'biceps', pt: 'Bíceps', es: 'Bíceps' },
  { id: 'triceps', pt: 'Tríceps', es: 'Tríceps' },
  { id: 'abs', pt: 'Abdômen', es: 'Abdomen' },
  { id: 'forearms', pt: 'Antebraço', es: 'Antebrazo' },
  { id: 'traps', pt: 'Trapézio', es: 'Trapecio' },
  { id: 'lowerBack', pt: 'Lombar', es: 'Lumbar' },
  { id: 'adductors', pt: 'Adutores', es: 'Aductores' },
  { id: 'abductors', pt: 'Abdutores', es: 'Abductores' },
]

/** Categoría del ejercicio (tabla exercise_categories). Se elige una. */
export const categoriasExercicio: Catalogo[] = [
  { id: 'musculacao', pt: 'Musculação', es: 'Musculación' },
  { id: 'funcional', pt: 'Funcional', es: 'Funcional' },
  { id: 'mobilidade', pt: 'Mobilidade', es: 'Movilidad' },
  { id: 'alongamento', pt: 'Alongamento', es: 'Estiramiento' },
  { id: 'hiit', pt: 'HIIT', es: 'HIIT' },
  { id: 'cardio', pt: 'Cardio', es: 'Cardio' },
  { id: 'pilates', pt: 'Pilates', es: 'Pilates' },
  { id: 'terapeutico', pt: 'Terapêutico', es: 'Terapéutico' },
  { id: 'crossTraining', pt: 'Cross Training', es: 'Cross Training' },
  { id: 'calistenia', pt: 'Calistenia', es: 'Calistenia' },
  { id: 'isometria', pt: 'Isometria', es: 'Isometría' },
]

/** Tipo de medio del ejercicio (tabla exercise_media_type). */
export const tiposMidia: Catalogo[] = [
  { id: 'video', pt: 'Vídeo do celular', es: 'Video del celular' },
  { id: 'gif', pt: 'GIF', es: 'GIF' },
  { id: 'youtube', pt: 'Link do Youtube', es: 'Link de Youtube' },
]

/** Varias etiquetas juntas, para los chips de las tarjetas. */
export function etiquetasDe(lista: Catalogo[], ids: string[] | null | undefined, lang: string): string[] {
  return (ids ?? []).map((id) => etiquetaDe(lista, id, lang)).filter(Boolean)
}

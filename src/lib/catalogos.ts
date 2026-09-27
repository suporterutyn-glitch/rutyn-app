// Catalogos extraidos de Rutyn_Documentacao/dados/enums.json (fuente oficial).
// No editar a mano: si cambian los enums del proyecto, volver a extraerlos.

export type Catalogo = { id: string; pt: string; es: string; en?: string }

export type Idioma = 'pt' | 'es' | 'en'

/** 'es-AR', 'en-US', 'pt-BR'... -> el idioma de la app. */
export function idiomaDe(lang: string | undefined | null): Idioma {
  const l = (lang || 'pt').slice(0, 2).toLowerCase()
  return l === 'es' ? 'es' : l === 'en' ? 'en' : 'pt'
}

export function etiqueta(c: { pt: string; es: string; en?: string }, lang: string): string {
  const l = idiomaDe(lang)
  return l === 'es' ? c.es : l === 'en' ? (c.en ?? c.pt) : c.pt
}

export const atuacoes: Catalogo[] = [
  { id: 'personalTrainer', pt: 'Personal Trainer', es: 'Entrenador Personal', en: 'Personal Trainer' },
  { id: 'physicalEducator', pt: 'Educador Físico', es: 'Educador Físico', en: 'Physical Educator' },
  { id: 'physicalTrainer', pt: 'Preparador Físico', es: 'Preparador Físico', en: 'Strength & Conditioning Coach' },
  { id: 'functionalTrainingInstructor', pt: 'Instrutor de Treinamento Funcional', es: 'Instructor de Entrenamiento Funcional', en: 'Functional Training Instructor' },
  { id: 'runningCoach', pt: 'Treinador de Corrida', es: 'Entrenador de Running', en: 'Running Coach' },
  { id: 'crossTrainingCoach', pt: 'Treinador de Cross Training', es: 'Entrenador de Cross Training', en: 'Cross Training Coach' },
  { id: 'calisthenicsInstructor', pt: 'Instrutor de Calistenia', es: 'Instructor de Calistenia', en: 'Calisthenics Instructor' },
  { id: 'nutritionist', pt: 'Nutricionista', es: 'Nutricionista', en: 'Nutritionist' },
  { id: 'sportsNutritionist', pt: 'Nutricionista Esportivo', es: 'Nutricionista Deportivo', en: 'Sports Nutritionist' },
  { id: 'homeTrainer', pt: 'Personal Home', es: 'Entrenador a Domicilio', en: 'In-Home Trainer' },
  { id: 'swimmingInstructor', pt: 'Instrutor de Natação', es: 'Instructor de Natación', en: 'Swimming Instructor' },
]

export const especialidades: Catalogo[] = [
  { id: 'weightLoss', pt: 'Emagrecimento', es: 'Adelgazamiento', en: 'Weight Loss' },
  { id: 'hypertrophy', pt: 'Hipertrofia', es: 'Hipertrofia', en: 'Hypertrophy' },
  { id: 'definition', pt: 'Definição Muscular', es: 'Definición Muscular', en: 'Muscle Definition' },
  { id: 'leanMassGain', pt: 'Ganho de Massa Magra', es: 'Ganancia de Masa Magra', en: 'Lean Mass Gain' },
  { id: 'physicalConditioning', pt: 'Condicionamento Físico', es: 'Acondicionamiento Físico', en: 'Physical Conditioning' },
  { id: 'healthWellness', pt: 'Saúde e Bem-estar', es: 'Salud y Bienestar', en: 'Health & Wellness' },
  { id: 'functionalTraining', pt: 'Treinamento Funcional', es: 'Entrenamiento Funcional', en: 'Functional Training' },
  { id: 'hiit', pt: 'HIIT', es: 'HIIT', en: 'HIIT' },
  { id: 'injuryPrevention', pt: 'Prevenção de Lesões', es: 'Prevención de Lesiones', en: 'Injury Prevention' },
  { id: 'seniorTraining', pt: 'Terceira Idade', es: 'Tercera Edad', en: 'Seniors' },
  { id: 'femaleTraining', pt: 'Treinamento Feminino', es: 'Entrenamiento Femenino', en: 'Women\'s Training' },
  { id: 'maleTraining', pt: 'Treinamento Masculino', es: 'Entrenamiento Masculino', en: 'Men\'s Training' },
  { id: 'pregnancyTraining', pt: 'Gestantes', es: 'Embarazadas', en: 'Pregnancy' },
  { id: 'postpartumTraining', pt: 'Pós-parto', es: 'Posparto', en: 'Postpartum' },
  { id: 'athletePerformance', pt: 'Performance de Atletas', es: 'Rendimiento de Atletas', en: 'Athlete Performance' },
  { id: 'runningTraining', pt: 'Treinamento de Corrida', es: 'Entrenamiento de Running', en: 'Running Training' },
  { id: 'weightLossNutrition', pt: 'Nutrição para Emagrecimento', es: 'Nutrición para Adelgazar', en: 'Weight Loss Nutrition' },
  { id: 'sportsNutrition', pt: 'Nutrição Esportiva', es: 'Nutrición Deportiva', en: 'Sports Nutrition' },
]

export const formatosTrabalho: Catalogo[] = [
  { id: 'hybrid', pt: 'Híbrido', es: 'Híbrido', en: 'Hybrid' },
  { id: 'online', pt: 'Online', es: 'Online', en: 'Online' },
  { id: 'inPerson', pt: 'Presencial', es: 'Presencial', en: 'In Person' },
]

export const clientesIdeais: Catalogo[] = [
  { id: 'male', pt: 'Homens', es: 'Hombres', en: 'Men' },
  { id: 'female', pt: 'Mulheres', es: 'Mujeres', en: 'Women' },
  { id: 'both', pt: 'Ambos', es: 'Ambos', en: 'Both' },
]

/** Dificultad de una rutina (tabla difficulty_levels). */
export const dificultades: Catalogo[] = [
  { id: 'adaptation', pt: 'Adaptação', es: 'Adaptación', en: 'Adaptation' },
  { id: 'beginner', pt: 'Iniciante', es: 'Principiante', en: 'Beginner' },
  { id: 'intermediate', pt: 'Intermediário', es: 'Intermedio', en: 'Intermediate' },
  { id: 'advanced', pt: 'Avançado', es: 'Avanzado', en: 'Advanced' },
]

/** Objetivo de una rutina (tabla training_goals). */
export const objetivosTreino: Catalogo[] = [
  { id: 'hypertrophy', pt: 'Hipertrofia', es: 'Hipertrofia', en: 'Hypertrophy' },
  { id: 'fatLoss', pt: 'Perda de Gordura', es: 'Reducción de Grasa', en: 'Fat Loss' },
  { id: 'fatLossHypertrophy', pt: 'Perda de Gordura + Hipertrofia', es: 'Reducción de Grasa/Hipertrofia', en: 'Fat Loss + Hypertrophy' },
  { id: 'muscleDefinition', pt: 'Definição Muscular', es: 'Definición Muscular', en: 'Muscle Definition' },
  { id: 'physicalConditioning', pt: 'Condicionamento Físico', es: 'Acondicionamiento Físico', en: 'Physical Conditioning' },
  { id: 'qualityOfLife', pt: 'Qualidade de Vida', es: 'Calidad de Vida', en: 'Quality of Life' },
]

/** Objetivo de una dieta (tabla diet_goal). */
export const objetivosDieta: Catalogo[] = [
  { id: 'weightLoss', pt: 'Emagrecer', es: 'Perder Peso', en: 'Lose Weight' },
  { id: 'muscleGain', pt: 'Ganhar Massa', es: 'Ganar Masa', en: 'Gain Mass' },
  { id: 'maintenance', pt: 'Manutenção', es: 'Mantenimiento', en: 'Maintenance' },
  { id: 'healthyEating', pt: 'Alimentação Saudável', es: 'Alimentación Saludable', en: 'Healthy Eating' },
]

/** Muestra el id guardado con la etiqueta del idioma; si no está en el catálogo, se muestra tal cual. */
export function etiquetaDe(lista: Catalogo[], id: string | null | undefined, lang: string): string {
  if (!id) return ''
  const c = lista.find((x) => x.id === id)
  return c ? etiqueta(c, lang) : id
}

/** Grupos musculares de un ejercicio (tabla muscle_groups). Se eligen varios. */
export const gruposMusculares: Catalogo[] = [
  { id: 'chest', pt: 'Peito', es: 'Pecho', en: 'Chest' },
  { id: 'back', pt: 'Costas', es: 'Espalda', en: 'Back' },
  { id: 'shoulders', pt: 'Ombros', es: 'Hombros', en: 'Shoulders' },
  { id: 'glutes', pt: 'Glúteos', es: 'Glúteos', en: 'Glutes' },
  { id: 'quadriceps', pt: 'Quadríceps', es: 'Cuádriceps', en: 'Quadriceps' },
  { id: 'hamstrings', pt: 'Posterior de Coxa', es: 'Isquiotibiales', en: 'Hamstrings' },
  { id: 'calves', pt: 'Panturrilha', es: 'Pantorrilla', en: 'Calves' },
  { id: 'biceps', pt: 'Bíceps', es: 'Bíceps', en: 'Biceps' },
  { id: 'triceps', pt: 'Tríceps', es: 'Tríceps', en: 'Triceps' },
  { id: 'abs', pt: 'Abdômen', es: 'Abdomen', en: 'Abs' },
  { id: 'forearms', pt: 'Antebraço', es: 'Antebrazo', en: 'Forearms' },
  { id: 'traps', pt: 'Trapézio', es: 'Trapecio', en: 'Traps' },
  { id: 'lowerBack', pt: 'Lombar', es: 'Lumbar', en: 'Lower Back' },
  { id: 'adductors', pt: 'Adutores', es: 'Aductores', en: 'Adductors' },
  { id: 'abductors', pt: 'Abdutores', es: 'Abductores', en: 'Abductors' },
]

/** Categoría del ejercicio (tabla exercise_categories). Se elige una. */
export const categoriasExercicio: Catalogo[] = [
  { id: 'musculacao', pt: 'Musculação', es: 'Musculación', en: 'Strength Training' },
  { id: 'funcional', pt: 'Funcional', es: 'Funcional', en: 'Functional' },
  { id: 'mobilidade', pt: 'Mobilidade', es: 'Movilidad', en: 'Mobility' },
  { id: 'alongamento', pt: 'Alongamento', es: 'Estiramiento', en: 'Stretching' },
  { id: 'hiit', pt: 'HIIT', es: 'HIIT', en: 'HIIT' },
  { id: 'cardio', pt: 'Cardio', es: 'Cardio', en: 'Cardio' },
  { id: 'pilates', pt: 'Pilates', es: 'Pilates', en: 'Pilates' },
  { id: 'terapeutico', pt: 'Terapêutico', es: 'Terapéutico', en: 'Therapeutic' },
  { id: 'crossTraining', pt: 'Cross Training', es: 'Cross Training', en: 'Cross Training' },
  { id: 'calistenia', pt: 'Calistenia', es: 'Calistenia', en: 'Calisthenics' },
  { id: 'isometria', pt: 'Isometria', es: 'Isometría', en: 'Isometrics' },
]

/** Tipo de medio del ejercicio (tabla exercise_media_type). */
export const tiposMidia: Catalogo[] = [
  { id: 'video', pt: 'Vídeo do celular', es: 'Video del celular', en: 'Phone video' },
  { id: 'gif', pt: 'GIF', es: 'GIF', en: 'GIF' },
  { id: 'youtube', pt: 'Link do Youtube', es: 'Link de Youtube', en: 'YouTube link' },
]

/** Varias etiquetas juntas, para los chips de las tarjetas. */
export function etiquetasDe(lista: Catalogo[], ids: string[] | null | undefined, lang: string): string[] {
  return (ids ?? []).map((id) => etiquetaDe(lista, id, lang)).filter(Boolean)
}

/** Categoría de un alimento (módulo 08): define el ícono y el color del card. */
export const categoriasAlimento: Catalogo[] = [
  { id: 'protein', pt: 'Proteína', es: 'Proteína', en: 'Protein' },
  { id: 'carb', pt: 'Carboidrato', es: 'Carbohidrato', en: 'Carbohydrate' },
  { id: 'fat', pt: 'Gordura', es: 'Grasa', en: 'Fat' },
  { id: 'supplement', pt: 'Suplemento', es: 'Suplemento', en: 'Supplement' },
  { id: 'calories', pt: 'Calorias', es: 'Calorías', en: 'Calories' },
  { id: 'none', pt: 'Sem Classificação', es: 'Sin Clasificación', en: 'Unclassified' },
]

/** Unidad de la porción base de un alimento. */
export const unidadesAlimento: Catalogo[] = [
  { id: 'g', pt: 'g (Gramas)', es: 'g (Gramos)', en: 'g (Grams)' },
  { id: 'kg', pt: 'Kg (Quilogramas)', es: 'Kg (Kilogramos)', en: 'Kg (Kilograms)' },
  { id: 'ml', pt: 'ml (Mililitros)', es: 'ml (Mililitros)', en: 'ml (Milliliters)' },
  { id: 'l', pt: 'L (Litros)', es: 'L (Litros)', en: 'L (Liters)' },
  { id: 'uni', pt: 'Uni (Unidade)', es: 'Uni (Unidad)', en: 'Unit' },
]

/** Abreviatura que se muestra junto a la cantidad ('100g', '1 Uni'). */
export function abreviaturaUnidad(id: string | null | undefined): string {
  return id === 'kg' ? 'Kg' : id === 'l' ? 'L' : id === 'uni' ? ' Uni' : id ?? 'g'
}

export const categoriasReceita: Catalogo[] = [
  { id: 'basicos', pt: 'Noções Básicas', es: 'Nociones Básicas', en: 'Basics' },
  { id: 'carnesBrancas', pt: 'Carnes Brancas', es: 'Carnes Blancas', en: 'Poultry' },
  { id: 'carneVermelha', pt: 'Carne Vermelha', es: 'Carne Roja', en: 'Red Meat' },
  { id: 'peixes', pt: 'Peixes e Frutos do Mar', es: 'Pescados y Mariscos', en: 'Fish & Seafood' },
  { id: 'massas', pt: 'Massas', es: 'Pastas', en: 'Pasta' },
  { id: 'arroz', pt: 'Arroz e Macarrão', es: 'Arroz y Fideos', en: 'Rice & Noodles' },
  { id: 'sopas', pt: 'Sopas', es: 'Sopas', en: 'Soups' },
  { id: 'leguminosas', pt: 'Leguminosas', es: 'Legumbres', en: 'Legumes' },
  { id: 'sanduiches', pt: 'Sanduíches e Torradas', es: 'Sándwiches y Tostadas', en: 'Sandwiches & Toast' },
  { id: 'hamburgueres', pt: 'Hambúrgueres e Wraps', es: 'Hamburguesas y Wraps', en: 'Burgers & Wraps' },
  { id: 'pizzas', pt: 'Pizzas', es: 'Pizzas', en: 'Pizzas' },
  { id: 'ovos', pt: 'Ovos e Tortilhas', es: 'Huevos y Tortillas', en: 'Eggs & Omelets' },
  { id: 'saladas', pt: 'Saladas', es: 'Ensaladas', en: 'Salads' },
  { id: 'vegetariano', pt: 'Vegetariano', es: 'Vegetariano', en: 'Vegetarian' },
  { id: 'bowl', pt: 'Bowl', es: 'Bowl', en: 'Bowl' },
  { id: 'panquecas', pt: 'Panquecas e Waffles', es: 'Panqueques y Waffles', en: 'Pancakes & Waffles' },
  { id: 'smoothies', pt: 'Milkshakes e Smoothies', es: 'Batidos y Smoothies', en: 'Shakes & Smoothies' },
  { id: 'doces', pt: 'Doces e Sobremesas', es: 'Dulces y Postres', en: 'Sweets & Desserts' },
  { id: 'outro', pt: 'Outro', es: 'Otro', en: 'Other' },
]

export const tiposPreparo: Catalogo[] = [
  { id: 'instantaneo', pt: 'Instantâneo', es: 'Instantáneo', en: 'Instant' },
  { id: 'facil', pt: 'Fácil', es: 'Fácil', en: 'Easy' },
  { id: 'medio', pt: 'Médio', es: 'Medio', en: 'Medium' },
  { id: 'elaborado', pt: 'Elaborado', es: 'Elaborado', en: 'Elaborate' },
]

export const temposReceita: Catalogo[] = [
  { id: 'lt5', pt: '< 5 min', es: '< 5 min', en: '< 5 min' },
  { id: 'lt10', pt: '< 10 min', es: '< 10 min', en: '< 10 min' },
  { id: 'lt15', pt: '< 15 min', es: '< 15 min', en: '< 15 min' },
  { id: 'lt30', pt: '< 30 min', es: '< 30 min', en: '< 30 min' },
  { id: 'lt45', pt: '< 45 min', es: '< 45 min', en: '< 45 min' },
  { id: 'lt60', pt: '< 1 h', es: '< 1 h', en: '< 1 h' },
  { id: 'gt60', pt: '> 1 h', es: '> 1 h', en: '> 1 h' },
]

export const utensiliosReceita: Catalogo[] = [
  { id: 'frigideira', pt: 'Frigideira', es: 'Sartén', en: 'Frying Pan' },
  { id: 'panela', pt: 'Panela/Caçarola', es: 'Olla/Cacerola', en: 'Pot/Saucepan' },
  { id: 'forno', pt: 'Forno', es: 'Horno', en: 'Oven' },
  { id: 'microondas', pt: 'Micro-ondas', es: 'Microondas', en: 'Microwave' },
  { id: 'grelha', pt: 'Sanduicheira/Grelha', es: 'Sandwichera/Parrilla', en: 'Sandwich Maker/Grill' },
  { id: 'torradeira', pt: 'Torradeira', es: 'Tostadora', en: 'Toaster' },
  { id: 'airfryer', pt: 'Fritadeira de Ar', es: 'Freidora de Aire', en: 'Air Fryer' },
  { id: 'liquidificador', pt: 'Liquidificador', es: 'Licuadora', en: 'Blender' },
  { id: 'thermomix', pt: 'Thermomix', es: 'Thermomix', en: 'Thermomix' },
  { id: 'wok', pt: 'Wok', es: 'Wok', en: 'Wok' },
]

/** Tipos de refeição do app com horário padrão (regra 6 do módulo 08). */
export const tiposRefeicao: (Catalogo & { hora: string })[] = [
  { id: 'cafe', pt: 'Café da Manhã', es: 'Desayuno', en: 'Breakfast', hora: '08:00' },
  { id: 'lancheManha', pt: 'Lanche da Manhã', es: 'Merienda de la Mañana', en: 'Morning Snack', hora: '10:00' },
  { id: 'almoco', pt: 'Almoço', es: 'Almuerzo', en: 'Lunch', hora: '12:00' },
  { id: 'lancheTarde', pt: 'Lanche da Tarde', es: 'Merienda', en: 'Afternoon Snack', hora: '14:00' },
  { id: 'preTreino', pt: 'Pré-Treino', es: 'Pre-Entreno', en: 'Pre-Workout', hora: '16:00' },
  { id: 'posTreino', pt: 'Pós-Treino', es: 'Post-Entreno', en: 'Post-Workout', hora: '18:00' },
  { id: 'jantar', pt: 'Jantar', es: 'Cena', en: 'Dinner', hora: '20:00' },
  { id: 'ceia', pt: 'Ceia', es: 'Colación Nocturna', en: 'Evening Snack', hora: '21:00' },
]

/** Equipamiento de un ejercicio del catálogo (columna exercises.equipment). */
export const equipamentos: Catalogo[] = [
  { id: 'barbell', pt: 'Barra', es: 'Barra', en: 'Barbell' },
  { id: 'dumbbell', pt: 'Halteres', es: 'Mancuernas', en: 'Dumbbells' },
  { id: 'cable', pt: 'Polia', es: 'Polea', en: 'Cable' },
  { id: 'machine', pt: 'Máquina', es: 'Máquina', en: 'Machine' },
  { id: 'bodyweight', pt: 'Peso corporal', es: 'Peso corporal', en: 'Bodyweight' },
  { id: 'kettlebell', pt: 'Kettlebell', es: 'Kettlebell', en: 'Kettlebell' },
  { id: 'band', pt: 'Elástico', es: 'Banda elástica', en: 'Resistance band' },
  { id: 'plate', pt: 'Anilha', es: 'Disco', en: 'Plate' },
  { id: 'trx', pt: 'TRX', es: 'TRX', en: 'TRX' },
  { id: 'smith', pt: 'Smith', es: 'Smith', en: 'Smith machine' },
  { id: 'mat', pt: 'Colchonete', es: 'Colchoneta', en: 'Mat' },
  { id: 'vitruvian', pt: 'Vitruvian', es: 'Vitruvian', en: 'Vitruvian' },
  { id: 'cardio', pt: 'Cardio', es: 'Cardio', en: 'Cardio' },
  { id: 'bosu', pt: 'Bosu', es: 'Bosu', en: 'Bosu' },
]

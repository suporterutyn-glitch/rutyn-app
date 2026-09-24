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

/** Categoría de un alimento (módulo 08): define el ícono y el color del card. */
export const categoriasAlimento: Catalogo[] = [
  { id: 'protein', pt: 'Proteína', es: 'Proteína' },
  { id: 'carb', pt: 'Carboidrato', es: 'Carbohidrato' },
  { id: 'fat', pt: 'Gordura', es: 'Grasa' },
  { id: 'calories', pt: 'Calorias', es: 'Calorías' },
  { id: 'none', pt: 'Sem Classificação', es: 'Sin Clasificación' },
]

/** Unidad de la porción base de un alimento. */
export const unidadesAlimento: Catalogo[] = [
  { id: 'g', pt: 'g (Gramas)', es: 'g (Gramos)' },
  { id: 'kg', pt: 'Kg (Quilogramas)', es: 'Kg (Kilogramos)' },
  { id: 'ml', pt: 'ml (Mililitros)', es: 'ml (Mililitros)' },
  { id: 'l', pt: 'L (Litros)', es: 'L (Litros)' },
  { id: 'uni', pt: 'Uni (Unidade)', es: 'Uni (Unidad)' },
]

/** Abreviatura que se muestra junto a la cantidad ('100g', '1 Uni'). */
export function abreviaturaUnidad(id: string | null | undefined): string {
  return id === 'kg' ? 'Kg' : id === 'l' ? 'L' : id === 'uni' ? ' Uni' : id ?? 'g'
}

export const categoriasReceita: Catalogo[] = [
  { id: 'basicos', pt: 'Noções Básicas', es: 'Nociones Básicas' },
  { id: 'carnesBrancas', pt: 'Carnes Brancas', es: 'Carnes Blancas' },
  { id: 'carneVermelha', pt: 'Carne Vermelha', es: 'Carne Roja' },
  { id: 'peixes', pt: 'Peixes e Frutos do Mar', es: 'Pescados y Mariscos' },
  { id: 'massas', pt: 'Massas', es: 'Pastas' },
  { id: 'arroz', pt: 'Arroz e Macarrão', es: 'Arroz y Fideos' },
  { id: 'sopas', pt: 'Sopas', es: 'Sopas' },
  { id: 'leguminosas', pt: 'Leguminosas', es: 'Legumbres' },
  { id: 'sanduiches', pt: 'Sanduíches e Torradas', es: 'Sándwiches y Tostadas' },
  { id: 'hamburgueres', pt: 'Hambúrgueres e Wraps', es: 'Hamburguesas y Wraps' },
  { id: 'pizzas', pt: 'Pizzas', es: 'Pizzas' },
  { id: 'ovos', pt: 'Ovos e Tortilhas', es: 'Huevos y Tortillas' },
  { id: 'saladas', pt: 'Saladas', es: 'Ensaladas' },
  { id: 'vegetariano', pt: 'Vegetariano', es: 'Vegetariano' },
  { id: 'bowl', pt: 'Bowl', es: 'Bowl' },
  { id: 'panquecas', pt: 'Panquecas e Waffles', es: 'Panqueques y Waffles' },
  { id: 'smoothies', pt: 'Milkshakes e Smoothies', es: 'Batidos y Smoothies' },
  { id: 'doces', pt: 'Doces e Sobremesas', es: 'Dulces y Postres' },
  { id: 'outro', pt: 'Outro', es: 'Otro' },
]

export const tiposPreparo: Catalogo[] = [
  { id: 'instantaneo', pt: 'Instantâneo', es: 'Instantáneo' },
  { id: 'facil', pt: 'Fácil', es: 'Fácil' },
  { id: 'medio', pt: 'Médio', es: 'Medio' },
  { id: 'elaborado', pt: 'Elaborado', es: 'Elaborado' },
]

export const temposReceita: Catalogo[] = [
  { id: 'lt5', pt: '< 5 min', es: '< 5 min' },
  { id: 'lt10', pt: '< 10 min', es: '< 10 min' },
  { id: 'lt15', pt: '< 15 min', es: '< 15 min' },
  { id: 'lt30', pt: '< 30 min', es: '< 30 min' },
  { id: 'lt45', pt: '< 45 min', es: '< 45 min' },
  { id: 'lt60', pt: '< 1 h', es: '< 1 h' },
  { id: 'gt60', pt: '> 1 h', es: '> 1 h' },
]

export const utensiliosReceita: Catalogo[] = [
  { id: 'frigideira', pt: 'Frigideira', es: 'Sartén' },
  { id: 'panela', pt: 'Panela/Caçarola', es: 'Olla/Cacerola' },
  { id: 'forno', pt: 'Forno', es: 'Horno' },
  { id: 'microondas', pt: 'Micro-ondas', es: 'Microondas' },
  { id: 'grelha', pt: 'Sanduicheira/Grelha', es: 'Sandwichera/Parrilla' },
  { id: 'torradeira', pt: 'Torradeira', es: 'Tostadora' },
  { id: 'airfryer', pt: 'Fritadeira de Ar', es: 'Freidora de Aire' },
  { id: 'liquidificador', pt: 'Liquidificador', es: 'Licuadora' },
  { id: 'thermomix', pt: 'Thermomix', es: 'Thermomix' },
  { id: 'wok', pt: 'Wok', es: 'Wok' },
]

/** Tipos de refeição do app com horário padrão (regra 6 do módulo 08). */
export const tiposRefeicao: (Catalogo & { hora: string })[] = [
  { id: 'cafe', pt: 'Café da Manhã', es: 'Desayuno', hora: '08:00' },
  { id: 'lancheManha', pt: 'Lanche da Manhã', es: 'Merienda de la Mañana', hora: '10:00' },
  { id: 'almoco', pt: 'Almoço', es: 'Almuerzo', hora: '12:00' },
  { id: 'lancheTarde', pt: 'Lanche da Tarde', es: 'Merienda', hora: '14:00' },
  { id: 'preTreino', pt: 'Pré-Treino', es: 'Pre-Entreno', hora: '16:00' },
  { id: 'posTreino', pt: 'Pós-Treino', es: 'Post-Entreno', hora: '18:00' },
  { id: 'jantar', pt: 'Jantar', es: 'Cena', hora: '20:00' },
  { id: 'ceia', pt: 'Ceia', es: 'Colación Nocturna', hora: '21:00' },
]

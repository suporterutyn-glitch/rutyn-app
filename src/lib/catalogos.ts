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

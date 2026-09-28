import { Navigate, useParams } from 'react-router-dom'

// La anamnesis vive dentro de la evaluación física (sección Anamnesis). Estas rutas
// viejas siguen existiendo para enlaces y avisos anteriores, y llevan ahí.

export function AnamneseProfessorPage() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/professor/avaliacoes/${id}`} replace />
}

export function AnamneseAlunoListaPage() {
  return <Navigate to="/aluno/avaliacao" replace />
}

export function AnamneseResponderPage() {
  return <Navigate to="/aluno/avaliacao" replace />
}

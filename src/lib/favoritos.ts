import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

/**
 * Favoritos del catálogo compartido (exercícios, alimentos).
 *
 * No viven en la fila del item porque el catálogo es de todos: marcar un
 * favorito no puede marcárselo a los demás profesores. Ver la migración
 * 20260923080000_favoritos_catalogo.sql.
 */
export function useFavoritos(tipo: 'exercise' | 'food') {
  const { profile } = useAuth()
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const { data } = await supabase
        .from('user_favorites')
        .select('item_id')
        .eq('user_id', profile.id)
        .eq('item_type', tipo)
      setIds(new Set(((data as { item_id: string }[]) ?? []).map((r) => r.item_id)))
    })()
  }, [profile?.id, tipo])

  const esFavorito = (id: string) => ids.has(id)

  async function alternar(id: string) {
    if (!profile?.id) return
    const yaEsta = ids.has(id)
    // Optimista: la estrella responde al toque y se revierte si falla.
    const siguiente = new Set(ids)
    if (yaEsta) siguiente.delete(id); else siguiente.add(id)
    setIds(siguiente)

    const { error: e } = yaEsta
      ? await supabase.from('user_favorites').delete()
          .eq('user_id', profile.id).eq('item_type', tipo).eq('item_id', id)
      : await supabase.from('user_favorites')
          .insert({ user_id: profile.id, item_type: tipo, item_id: id })

    // Si falla, se revierte y se dice por qué: un favorito que no se guarda
    // y no avisa es el tipo de silencio que ya nos costó caro.
    if (e) { setError(e.message); setIds(ids) }
  }

  return { esFavorito, alternar, error, limpiarError: () => setError(null) }
}

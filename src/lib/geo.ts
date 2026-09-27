import { useEffect, useState } from 'react'

/** [estado, ciudades[]] por país. Archivos en public/geo (IBGE para Brasil; dr5hn para el resto). */
export type Estados = [string, string[]][]

const cache = new Map<string, Promise<Estados>>()

function cargar(pais: string): Promise<Estados> {
  if (!cache.has(pais)) {
    const p = fetch(`${import.meta.env.BASE_URL}geo/${pais}.json`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
    cache.set(pais, p)
  }
  return cache.get(pais)!
}

export function useEstados(pais: string | null | undefined) {
  const [estados, setEstados] = useState<Estados | null>(null)
  useEffect(() => {
    if (!pais) { setEstados([]); return }
    let vivo = true
    setEstados(null)
    void cargar(pais).then((e) => { if (vivo) setEstados(e) })
    return () => { vivo = false }
  }, [pais])
  return estados
}

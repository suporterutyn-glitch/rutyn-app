import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { abrirFuera } from '@/lib/embed'
import { supabase } from '@/lib/supabase'

/** Cualquier pantalla que no sea el registro, cargada dentro del iframe de la landing: se abre fuera.
 *  Si hay sesión, viaja en el hash para que la pestaña nueva entre ya logueada. */
export function FueraDelIframe() {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.add('embed')
    const base = window.location.origin + window.location.pathname + window.location.search
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      const destino = s
        ? `${base}#access_token=${s.access_token}&refresh_token=${s.refresh_token}&expires_in=${s.expires_in}&expires_at=${s.expires_at}&token_type=bearer&type=signup`
        : base
      setUrl(destino)
      abrirFuera(destino)
    })
  }, [])

  if (!url) return null
  return (
    <div className="flex items-center justify-center p-8">
      {/* Pestaña nueva: funciona aunque el navegador no deje cambiar la página de arriba desde el iframe. */}
      <a href={url} target="_blank" rel="noopener" className="btn-primary-pill px-8 inline-flex items-center justify-center">{t('general:openApp')}</a>
    </div>
  )
}

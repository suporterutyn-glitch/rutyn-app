import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { abrirFuera } from '@/lib/embed'

/** Cualquier pantalla que no sea el registro, cargada dentro del iframe de la landing: se abre fuera. */
export function FueraDelIframe() {
  const { t } = useTranslation()
  const url = window.location.href

  useEffect(() => {
    document.documentElement.classList.add('embed')
    abrirFuera(url)
  }, [url])

  return (
    <div className="flex items-center justify-center p-8">
      <a href={url} target="_top" className="btn-primary-pill px-8 inline-flex items-center justify-center">{t('general:openApp')}</a>
    </div>
  )
}

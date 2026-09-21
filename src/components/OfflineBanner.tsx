import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function OfflineBanner() {
  const { t } = useTranslation()
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (online) return null
  return (
    <div className="w-full bg-alert-offline text-black text-rt-12 font-semibold text-center py-1.5">
      {t('offline')}
    </div>
  )
}

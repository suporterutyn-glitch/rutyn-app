import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/lib/i18n'
import './index.css'
import App from './App.tsx'
import { guardarIntencionDesdeUrl } from '@/lib/intencionCompra'
import { escucharInstalacion } from '@/lib/instalacion'

// Versión publicada (cambia el nombre del archivo JS y fuerza a los navegadores a bajar el nuevo).
;(window as unknown as { __RUTYN_BUILD__: string }).__RUTYN_BUILD__ = '2026-10-06.1'

guardarIntencionDesdeUrl()
escucharInstalacion()

// Versión nueva publicada: se busca al volver a la app y se aplica sola si recién se abrió y nadie está escribiendo
// (si no, queda para la próxima vez que se abra, para no borrar un formulario a medio llenar).
if ('serviceWorker' in navigator) {
  const abierta = Date.now()
  let tenia = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '')
    if (tenia && !escribiendo && Date.now() - abierta < 30000) window.location.reload()
    tenia = true
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void navigator.serviceWorker.getRegistration().then(r => r?.update()).catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

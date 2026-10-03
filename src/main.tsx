import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/lib/i18n'
import './index.css'
import App from './App.tsx'
import { guardarIntencionDesdeUrl } from '@/lib/intencionCompra'
import { escucharInstalacion } from '@/lib/instalacion'

// Versión publicada (cambia el nombre del archivo JS y fuerza a los navegadores a bajar el nuevo).
;(window as unknown as { __RUTYN_BUILD__: string }).__RUTYN_BUILD__ = '2026-10-03.2'

guardarIntencionDesdeUrl()
escucharInstalacion()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

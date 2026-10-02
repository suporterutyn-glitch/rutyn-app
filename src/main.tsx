import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/lib/i18n'
import './index.css'
import App from './App.tsx'
import { guardarIntencionDesdeUrl } from '@/lib/intencionCompra'
import { escucharInstalacion } from '@/lib/instalacion'

guardarIntencionDesdeUrl()
escucharInstalacion()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

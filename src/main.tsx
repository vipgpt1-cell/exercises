import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { warmUpVoices } from './lib/speech'
import { applyLaunchParams } from './lib/launch'
import { initStorage } from './lib/store'
import { installHostApi } from './lib/host-api'
import { APP } from './config'

applyLaunchParams()
warmUpVoices()

// Results live in IndexedDB; load them before the first screen so History and Report are complete.
void initStorage()
  .catch(() => {})
  .then(() => {
    installHostApi()
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    )
  })

// Offline caching for the hosted build (service workers need http/https).
if (!APP.offlineBuild && 'serviceWorker' in navigator && location.protocol.startsWith('http') && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}

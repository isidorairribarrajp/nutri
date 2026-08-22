import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'

// Con registerType 'autoUpdate', registerSW recarga la pagina en cuanto el
// service worker nuevo toma el control. Sin esto la app se queda mostrando la
// version vieja hasta que la abres una segunda vez.
const actualizar = registerSW({
  immediate: true,
  onRegisteredSW(url, registro) {
    if (!registro) return
    // se revisa al volver a la app y una vez por hora, para no depender de que
    // Isi la cierre entera desde el selector de apps
    const revisar = () => { if (document.visibilityState === 'visible') registro.update() }
    document.addEventListener('visibilitychange', revisar)
    window.addEventListener('online', revisar)
    setInterval(revisar, 60 * 60 * 1000)
  },
})
// en autoUpdate no hay confirmacion que pedir, pero se deja la referencia viva
void actualizar

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

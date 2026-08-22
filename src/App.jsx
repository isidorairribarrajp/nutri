import { useCallback, useEffect, useState } from 'react'
import Hoy from './pages/Hoy.jsx'
import Buscar from './pages/Buscar.jsx'
import Ajustes from './pages/Ajustes.jsx'
import * as db from './db.js'
import { cargarTablaCL } from './off.js'

const TABS = [
  { id: 'hoy', nombre: 'Hoy', icono: '◎' },
  { id: 'ajustes', nombre: 'Ajustes', icono: '⚙' },
]

export default function App() {
  const [tab, setTab] = useState('hoy')
  const [fecha, setFecha] = useState(() => db.claveFecha())
  const [entradas, setEntradas] = useState([])
  const [metas, setMetas] = useState(() => db.getMetas())
  const [buscando, setBuscando] = useState(null) // momento al que se va a agregar

  const recargar = useCallback(() => {
    setEntradas(db.getDia(fecha))
    setMetas(db.getMetas())
  }, [fecha])

  useEffect(() => { recargar() }, [recargar])

  // Precarga la tabla chilena para que la primera busqueda sea instantanea y sirva offline.
  useEffect(() => { cargarTablaCL() }, [])

  if (buscando !== null) {
    return (
      <div className="safe-top min-h-full">
        <Buscar
          fecha={fecha}
          momentoInicial={buscando}
          onListo={() => { setBuscando(null); recargar() }}
          onCancelar={() => setBuscando(null)}
        />
      </div>
    )
  }

  return (
    <div className="safe-top flex min-h-full flex-col">
      <header className="px-4 py-3">
        <h1 className="text-xl font-semibold tracking-tight">Nutri</h1>
      </header>

      <main className="flex-1 pb-24">
        {tab === 'hoy' && (
          <Hoy
            fecha={fecha}
            setFecha={setFecha}
            entradas={entradas}
            metas={metas}
            recargar={recargar}
            onAgregar={(momento) => setBuscando(momento)}
          />
        )}
        {tab === 'ajustes' && <Ajustes metas={metas} recargar={recargar} />}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 flex border-t border-borde bg-panel/95 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${
              tab === t.id ? 'text-kcal' : 'text-tenue'
            }`}
          >
            <span className="text-lg leading-none">{t.icono}</span>
            {t.nombre}
          </button>
        ))}
      </nav>
    </div>
  )
}

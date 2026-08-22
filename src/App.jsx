import { useCallback, useEffect, useMemo, useState } from 'react'
import Hoy from './pages/Hoy.jsx'
import Buscar from './pages/Buscar.jsx'
import Plan from './pages/Plan.jsx'
import Progreso from './pages/Progreso.jsx'
import Recetas from './pages/Recetas.jsx'
import Perfil from './pages/Perfil.jsx'
import * as db from './db.js'
import { cargarCatalogo, cargarRecetas, cargarTablaCL } from './off.js'
import { promedioDiario } from './ejercicio.js'
import { analizar, perfilCompleto } from './perfil.js'

const TABS = [
  { id: 'hoy', nombre: 'Hoy', icono: '◍' },
  { id: 'plan', nombre: 'Plan', icono: '✧' },
  { id: 'progreso', nombre: 'Progreso', icono: '↗' },
  { id: 'recetas', nombre: 'Recetas', icono: '✿' },
  { id: 'perfil', nombre: 'Perfil', icono: '☺' },
]

export default function App() {
  const [tab, setTab] = useState('hoy')
  const [fecha, setFecha] = useState(() => db.claveFecha())
  const [entradas, setEntradas] = useState([])
  const [metas, setMetas] = useState(() => db.getMetas())
  const [perfil, setPerfil] = useState(() => db.getPerfil())
  const [buscando, setBuscando] = useState(null)
  const [version, setVersion] = useState(0)

  const recargar = useCallback(() => {
    // las comidas marcadas como fijas se cargan solas al abrir el dia de hoy
    if (fecha === db.claveFecha()) db.aplicarRepetidas(fecha)
    setEntradas(db.getDia(fecha))
    setPerfil(db.getPerfil())
    setVersion((v) => v + 1)

    // Si las metas son automaticas se recalculan solas: el peso, las medidas y
    // el ejercicio de la semana las mueven, y no tiene sentido que Isi tenga que
    // volver a Perfil y apretar un boton cada vez.
    const p = db.getPerfil()
    if (db.metasSonAutomaticas() && perfilCompleto(p)) {
      const sesiones = db.getEjerciciosDesde(db.sumarDias(db.claveFecha(), -6))
      const a = analizar(p, db.getUltimasMedidas() || {}, promedioDiario(sesiones, Number(p.peso_kg) || 60, 7))
      db.setMetas({
        kcal: a.kcal, proteina_g: a.proteina_g, carbos_g: a.carbos_g, grasa_g: a.grasa_g, auto: true,
      })
    }
    setMetas(db.getMetas())
  }, [fecha])

  useEffect(() => { recargar() }, [recargar])

  useEffect(() => {
    document.documentElement.dataset.tema = db.getTema()
    // Se precargan para que la primera busqueda sea instantanea y sirva offline.
    cargarTablaCL()
    cargarRecetas()
    cargarCatalogo()
  }, [])

  const pesoKg = useMemo(() => Number(perfil?.peso_kg) || Number(db.getUltimoPeso()?.kg) || 60, [perfil, version])

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
      <header className="flex items-baseline justify-between px-4 pb-1 pt-3">
        <h1 className="mano text-3xl leading-none text-acento-texto">Nutri</h1>
        <span className="text-[10px] uppercase tracking-widest text-tenue">Isi Irri</span>
      </header>

      <main className="flex-1 pb-24 pt-2">
        {tab === 'hoy' && (
          <Hoy fecha={fecha} setFecha={setFecha} entradas={entradas} metas={metas}
            recargar={recargar} onAgregar={setBuscando} />
        )}
        {tab === 'plan' && <Plan metas={metas} recargar={recargar} />}
        {tab === 'progreso' && <Progreso perfil={perfil} pesoKg={pesoKg} recargar={recargar} />}
        {tab === 'recetas' && <Recetas recargar={recargar} />}
        {tab === 'perfil' && <Perfil metas={metas} recargar={recargar} />}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 flex border-t border-borde bg-panel/95 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] ${
              tab === t.id ? 'font-bold text-acento-texto' : 'text-tenue'
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

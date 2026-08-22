import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { FilaResultado } from '../components/FilaAlimento.jsx'
import SelectorPorcion from '../components/SelectorPorcion.jsx'

// El lector pesa harto: se carga solo cuando Isi abre la camara.
const Escaner = lazy(() => import('../components/Escaner.jsx'))
import { MOMENTOS, etiquetaPorcion } from '../nutricion.js'
import { buscarLocal, buscarOFF, cargarRecetas, cargarTablaCL, fijarEnCache } from '../off.js'
import * as db from '../db.js'

const DEBOUNCE_MS = 350

export default function Buscar({ fecha, momentoInicial, onListo, onCancelar }) {
  const [termino, setTermino] = useState('')
  const [momento, setMomento] = useState(momentoInicial || 'almuerzo')
  const [locales, setLocales] = useState([])
  const [remotos, setRemotos] = useState([])
  const [buscandoRed, setBuscandoRed] = useState(false)
  const [elegido, setElegido] = useState(null)
  const [creando, setCreando] = useState(false)
  const [escaneando, setEscaneando] = useState(false)
  const [codigoNuevo, setCodigoNuevo] = useState(null)
  const [recientes, setRecientes] = useState([])
  const [favoritos, setFavoritos] = useState(() => db.getFavoritos())
  const inputRef = useRef(null)

  useEffect(() => {
    Promise.all([cargarTablaCL(), cargarRecetas()]).then(() => setLocales(buscarLocal(termino)))
    setRecientes(db.getRecientes())
    inputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Los resultados locales son instantaneos; los de red van con debounce.
  useEffect(() => {
    setLocales(buscarLocal(termino))
    if (termino.trim().length < 3) {
      setRemotos([])
      setBuscandoRed(false)
      return
    }
    setBuscandoRed(true)
    const t = setTimeout(async () => {
      const res = await buscarOFF(termino.trim())
      setRemotos(res)
      setBuscandoRed(false)
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [termino])

  function confirmar(resultado) {
    const alimento = fijarEnCache(elegido)
    db.marcarReciente(alimento.id)
    db.agregarEntrada(fecha, {
      alimento_id: alimento.id,
      nombre: alimento.nombre,
      momento,
      gramos: resultado.gramos,
      kcal: resultado.kcal,
      p: resultado.p,
      c: resultado.c,
      g: resultado.g,
      etiqueta_porcion: etiquetaPorcion(resultado.gramos, resultado.porcion),
    })
    setElegido(null)
    onListo()
  }

  const sinTermino = termino.trim().length === 0
  const cache = db.getCache()
  const guardados = favoritos.map((id) => cache[id]).filter(Boolean)
  const sinRepetir = recientes.filter((r) => !favoritos.includes(r.id))
  const lista = sinTermino ? [...guardados, ...sinRepetir] : [...locales, ...remotos]

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-borde bg-fondo px-4 pb-3 pt-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            placeholder="Buscar alimento..."
            className="min-w-0 flex-1 rounded-xl border border-borde bg-panel2 px-4 py-3 outline-none focus:border-acento"
          />
          <button
            onClick={() => setEscaneando(true)}
            aria-label="Escanear código de barras"
            className="shrink-0 rounded-xl border border-borde bg-chip px-3 py-3 text-lg leading-none"
          >
            ▤
          </button>
          <button onClick={onCancelar} className="shrink-0 px-1 text-sm text-tenue">
            Cerrar
          </button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {MOMENTOS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMomento(m.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                m.id === momento
                  ? 'border-acento bg-chip text-chip-texto'
                  : 'border-borde bg-panel2 text-tenue'
              }`}
            >
              {m.emoji} {m.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        {sinTermino && lista.length > 0 && (
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-tenue">
            {guardados.length ? 'Favoritos y recientes' : 'Recientes'}
          </p>
        )}
        {sinTermino && lista.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-tenue">
            Busca lo que comiste. Tus recetas y la tabla chilena funcionan sin internet.
          </p>
        )}

        {lista.map((a) => (
          <FilaResultado
            key={a.id}
            alimento={a}
            onClick={() => setElegido(a)}
            favorito={favoritos.includes(a.id)}
            onFavorito={() => {
              fijarEnCache(a)
              db.alternarFavorito(a.id)
              setFavoritos(db.getFavoritos())
            }}
          />
        ))}

        {!sinTermino && buscandoRed && (
          <p className="px-4 py-3 text-center text-xs text-tenue">Buscando en Open Food Facts…</p>
        )}
        {!sinTermino && !buscandoRed && lista.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-tenue">
            Nada con ese nombre. Puedes crearlo tú misma.
          </p>
        )}

        <div className="p-4">
          <button
            onClick={() => setCreando(true)}
            className="w-full rounded-xl border border-dashed border-borde py-3.5 text-sm text-tenue active:bg-panel2"
          >
            + Crear alimento propio
          </button>
        </div>
      </div>

      {elegido && (
        <SelectorPorcion
          alimento={elegido}
          onConfirmar={confirmar}
          onCancelar={() => setElegido(null)}
        />
      )}

      {escaneando && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-sm text-white/70">Cargando el lector…</div>}>
          <Escaner
            onCerrar={() => setEscaneando(false)}
            onEncontrado={(prod) => {
              setEscaneando(false)
              if (prod.nuevo) { setCodigoNuevo(prod.codigo); setCreando(true) }
              else setElegido(prod)
            }}
          />
        </Suspense>
      )}

      {creando && (
        <CrearAlimento
          nombreInicial={termino}
          codigo={codigoNuevo}
          onCancelar={() => setCreando(false)}
          onCreado={(a) => {
            setCreando(false)
            setElegido(a)
          }}
        />
      )}
    </div>
  )
}

function CrearAlimento({ nombreInicial, codigo, onCreado, onCancelar }) {
  const [f, setF] = useState({ nombre: nombreInicial || '', kcal: '', p: '', c: '', g: '' })
  const valido = f.nombre.trim() && Number(f.kcal) >= 0 && f.kcal !== ''

  function guardar() {
    const alimento = {
      // si vino de un codigo de barras se guarda con ese id: la proxima vez que
      // Isi lo escanee lo encuentra en el cache, sin internet
      id: codigo ? `off-${codigo}` : `propio-${crypto.randomUUID()}`,
      codigo: codigo || null,
      nombre: f.nombre.trim(),
      marca: null,
      por100g: {
        kcal: Number(f.kcal) || 0,
        p: Number(f.p) || 0,
        c: Number(f.c) || 0,
        g: Number(f.g) || 0,
      },
      porciones: [{ nombre: '100 g', gramos: 100 }],
      fuente: 'propio',
    }
    db.guardarAlimento(alimento)
    onCreado(alimento)
  }

  const campos = [
    { k: 'kcal', label: 'Calorías' },
    { k: 'p', label: 'Proteína (g)' },
    { k: 'c', label: 'Carbos (g)' },
    { k: 'g', label: 'Grasa (g)' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onCancelar}>
      <div
        className="safe-bottom rounded-t-3xl border-t border-borde bg-panel px-5 pt-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-borde" />
        <h2 className="mb-1 text-lg font-semibold">Alimento propio</h2>
        <p className="mb-4 text-xs text-tenue">
          Copia los valores del envase, por cada 100 g.
          {codigo && <span className="mt-1 block">Código <b>{codigo}</b>: queda guardado con el producto.</span>}
        </p>

        <input
          value={f.nombre}
          onChange={(e) => setF({ ...f, nombre: e.target.value })}
          placeholder="Nombre"
          className="mb-3 w-full rounded-xl border border-borde bg-panel2 px-4 py-3 outline-none focus:border-acento"
        />
        <div className="grid grid-cols-2 gap-3">
          {campos.map((c) => (
            <label key={c.k} className="text-xs text-tenue">
              {c.label}
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={f[c.k]}
                onChange={(e) => setF({ ...f, [c.k]: e.target.value })}
                className="mt-1 w-full rounded-xl border border-borde bg-panel2 px-4 py-3 tabular-nums outline-none focus:border-acento"
              />
            </label>
          ))}
        </div>

        <div className="flex gap-3 py-5">
          <button
            onClick={onCancelar}
            className="flex-1 rounded-xl border border-borde bg-panel2 py-3.5 font-medium text-tenue"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={!valido}
            className="flex-[2] rounded-xl bg-acento py-3.5 font-bold text-tinta disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}

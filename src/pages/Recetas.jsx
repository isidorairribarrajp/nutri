import { useEffect, useMemo, useState } from 'react'
import SelectorPorcion from '../components/SelectorPorcion.jsx'
import * as db from '../db.js'
import { MOMENTOS, etiquetaPorcion } from '../nutricion.js'
import { cargarRecetas, getRecetas, normalizar } from '../off.js'

const FILTROS = [
  { id: 'todo', nombre: 'Todas' },
  { id: 'salado', nombre: 'Saladas' },
  { id: 'postre', nombre: 'Dulces' },
]

export default function Recetas({ recargar }) {
  const [listo, setListo] = useState(false)
  const [filtro, setFiltro] = useState('todo')
  const [q, setQ] = useState('')
  const [abierta, setAbierta] = useState(null)

  useEffect(() => { cargarRecetas().then(() => setListo(true)) }, [])

  const recetas = useMemo(() => {
    if (!listo) return []
    const n = normalizar(q)
    return getRecetas()
      .filter((r) => filtro === 'todo' || r.tipo === filtro)
      .filter((r) => !n || r.busqueda.includes(n))
  }, [listo, filtro, q])

  return (
    <div className="px-4 pb-6">
      <h2 className="mb-1 text-xl font-bold">Recetas</h2>
      <p className="mb-4 text-xs text-tenue">
        Tus dos recetarios: Comida salada liviana y Postres livianos. Sin trigo, sin ajo ni cebolla.
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar receta..."
        className="mb-3 w-full rounded-xl border border-borde bg-panel2 px-4 py-3 text-texto outline-none focus:border-acento"
      />

      <div className="mb-4 flex gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${
              f.id === filtro ? 'border-acento bg-chip text-chip-texto' : 'border-borde bg-panel2 text-tenue'
            }`}
          >
            {f.nombre}
          </button>
        ))}
      </div>

      {!listo && <p className="py-8 text-center text-sm text-tenue">Cargando recetario...</p>}

      <div className="space-y-3">
        {recetas.map((r) => (
          <button
            key={r.id}
            onClick={() => setAbierta(r)}
            className="tarjeta block w-full px-4 py-3 text-left active:bg-panel2"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold leading-tight">{r.nombre}</span>
              <span className="shrink-0 tabular-nums text-sm text-acento-texto">
                {r.por100g.kcal * (r.porciones[0].gramos / 100) | 0} kcal
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-tenue">{r.descripcion}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="pildora">
                rinde {r.rinde.porciones} {r.rinde.unidad}
              </span>
              <span className="pildora">P {r.por100g.p} · C {r.por100g.c} · G {r.por100g.g} /100 g</span>
            </div>
          </button>
        ))}
      </div>

      {listo && recetas.length === 0 && (
        <p className="py-8 text-center text-sm text-tenue">Ninguna receta con ese nombre.</p>
      )}

      {abierta && (
        <DetalleReceta receta={abierta} onCerrar={() => setAbierta(null)} onRegistrado={recargar} />
      )}
    </div>
  )
}

function DetalleReceta({ receta, onCerrar, onRegistrado }) {
  const [registrando, setRegistrando] = useState(false)
  const [momento, setMomento] = useState('almuerzo')
  const porcion = receta.porciones[0]
  const kcalPorcion = Math.round((receta.por100g.kcal * porcion.gramos) / 100)
  const difGrande = receta.desviacion != null && Math.abs(receta.desviacion) > 15

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onCerrar}>
      <div
        className="safe-bottom max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-borde bg-panel px-5 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-borde" />
        <h2 className="text-lg font-bold leading-tight">{receta.nombre}</h2>
        <p className="mt-1 text-xs leading-relaxed text-tenue">{receta.descripcion}</p>

        <div className="my-4 grid grid-cols-4 gap-2 rounded-2xl bg-panel2 p-3 text-center">
          <div>
            <div className="font-bold tabular-nums text-acento-texto">{kcalPorcion}</div>
            <div className="text-[10px] text-tenue">kcal</div>
          </div>
          <div>
            <div className="font-bold tabular-nums text-prot">
              {Math.round((receta.por100g.p * porcion.gramos) / 100)}
            </div>
            <div className="text-[10px] text-tenue">prot</div>
          </div>
          <div>
            <div className="font-bold tabular-nums text-carb">
              {Math.round((receta.por100g.c * porcion.gramos) / 100)}
            </div>
            <div className="text-[10px] text-tenue">carbos</div>
          </div>
          <div>
            <div className="font-bold tabular-nums text-gras">
              {Math.round((receta.por100g.g * porcion.gramos) / 100)}
            </div>
            <div className="text-[10px] text-tenue">grasa</div>
          </div>
        </div>
        <p className="-mt-2 mb-3 text-center text-[11px] text-tenue">por {porcion.nombre}</p>

        {difGrande && (
          <p className="mb-3 rounded-xl bg-panel2 px-3 py-2.5 text-xs leading-relaxed text-tenue">
            Tu recetario dice <b>{receta.kcal_declaradas} kcal</b> y sumando los ingredientes me dan{' '}
            <b>{receta.kcal_calculadas}</b>. Uso el cálculo porque es de donde salen los macros, pero
            la diferencia de {Math.abs(Math.round(receta.desviacion))} % vale la pena que la mires.
          </p>
        )}

        <h3 className="mb-2 font-semibold">Ingredientes</h3>
        <ul className="mb-4 space-y-1.5">
          {receta.ingredientes.map((i, n) => (
            <li key={n} className="flex gap-2 text-sm leading-snug">
              <span className="text-acento">·</span>
              <span>{i}</span>
            </li>
          ))}
        </ul>

        {registrando ? (
          <>
            <span className="text-xs text-tenue">¿En qué comida?</span>
            <div className="mb-3 mt-1 flex flex-wrap gap-2">
              {MOMENTOS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMomento(m.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    m.id === momento ? 'border-acento bg-chip text-chip-texto' : 'border-borde bg-panel2 text-tenue'
                  }`}
                >
                  {m.emoji} {m.nombre}
                </button>
              ))}
            </div>
            <SelectorPorcion
              alimento={receta}
              onCancelar={() => setRegistrando(false)}
              onConfirmar={(res) => {
                db.guardarAlimento({
                  id: receta.id, nombre: receta.nombre, marca: null,
                  por100g: receta.por100g, porciones: receta.porciones,
                  fuente: 'receta', aprox: true,
                })
                db.marcarReciente(receta.id)
                db.agregarEntrada(db.claveFecha(), {
                  alimento_id: receta.id, nombre: receta.nombre, momento,
                  gramos: res.gramos, kcal: res.kcal, p: res.p, c: res.c, g: res.g,
                  etiqueta_porcion: etiquetaPorcion(res.gramos, res.porcion),
                })
                setRegistrando(false)
                onCerrar()
                onRegistrado()
              }}
            />
          </>
        ) : (
          <div className="flex gap-3 pb-5">
            <button
              onClick={onCerrar}
              className="flex-1 rounded-xl border border-borde bg-panel2 py-3.5 font-medium text-tenue"
            >
              Cerrar
            </button>
            <button
              onClick={() => setRegistrando(true)}
              className="flex-[2] rounded-xl bg-acento py-3.5 font-bold text-tinta"
            >
              Comí esto
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import * as db from '../db.js'
import { normalizar } from '../off.js'
import { recalcular } from '../receta.js'

/**
 * Editor de receta: cambiar cuanto rinde, ajustar cantidades, sacar y agregar
 * ingredientes. Los macros se recalculan en vivo desde los ingredientes.
 * El recetario original nunca se pisa: la edicion vive aparte y se puede
 * deshacer con "Volver al recetario".
 */
export default function EditorReceta({ receta, onGuardado, onCerrar }) {
  const [rinde, setRinde] = useState(String(receta.rinde?.porciones ?? 1))
  const [ingredientes, setIngredientes] = useState(receta.ingredientes || [])
  const [tabla, setTabla] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}ingredientes-cl.json`)
      .then((r) => r.json())
      .then((j) => setTabla(j.ingredientes.map((i) => ({ ...i, busqueda: normalizar(i.nombre) }))))
      .catch(() => setTabla([]))
  }, [])

  const editada = { ...receta, ingredientes, rinde: { ...receta.rinde, porciones: Number(rinde) || 1 } }
  const calc = useMemo(() => recalcular(editada), [ingredientes, rinde])

  const resultados = useMemo(() => {
    const n = normalizar(q)
    if (!n) return []
    return tabla.filter((i) => i.busqueda.includes(n)).slice(0, 8)
  }, [q, tabla])

  const cambiar = (idx, gramos) =>
    setIngredientes((prev) => prev.map((i, n) => (n === idx ? { ...i, gramos: Number(gramos) || 0 } : i)))

  const sacar = (idx) => setIngredientes((prev) => prev.filter((_, n) => n !== idx))

  function agregar(ing) {
    setIngredientes((prev) => [...prev, {
      crudo: `100 g de ${ing.nombre}`,
      nombre: ing.nombre,
      clave: ing.clave,
      gramos: 100,
      por100g: ing.por100g,
    }])
    setQ('')
    setBuscando(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-fondo">
      <div className="safe-top flex items-center justify-between border-b border-borde px-4 py-3">
        <span className="min-w-0 flex-1 truncate font-bold">{receta.nombre}</span>
        <button onClick={onCerrar} className="shrink-0 pl-3 text-sm text-tenue">Cerrar</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        <div className="tarjeta mb-4 p-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              ['kcal', calc.porPorcion.kcal, 'text-acento-texto'],
              ['prot', calc.porPorcion.p, 'text-prot'],
              ['carbos', calc.porPorcion.c, 'text-carb'],
              ['grasa', calc.porPorcion.g, 'text-gras'],
            ].map(([l, v, c]) => (
              <div key={l}>
                <div className={`text-lg font-bold tabular-nums ${c}`}>{v}</div>
                <div className="text-[10px] text-tenue">{l}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] text-tenue">
            por porción de {calc.gramosPorcion} g · {calc.pesoTotal} g en total
          </p>
        </div>

        <label className="mb-4 block text-xs text-tenue">
          ¿En cuántas porciones rinde?
          <input
            type="number" inputMode="numeric" min="1" step="1"
            value={rinde} onChange={(e) => setRinde(e.target.value)}
            className="mt-1 w-full rounded-xl border border-borde bg-panel2 px-4 py-3 tabular-nums text-texto outline-none focus:border-acento"
          />
        </label>

        <h3 className="mb-2 font-semibold">Ingredientes</h3>
        <div className="tarjeta mb-3 divide-y divide-borde px-4">
          {ingredientes.map((i, idx) => (
            <div key={idx} className="flex items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm leading-tight first-letter:uppercase">{i.nombre || i.crudo}</div>
                {!i.por100g && (
                  <div className="text-[11px] text-gras">Sin composición: no suma al cálculo</div>
                )}
              </div>
              <div className="relative shrink-0">
                <input
                  type="number" inputMode="numeric" min="0"
                  value={i.gramos ?? ''}
                  placeholder="—"
                  onChange={(e) => cambiar(idx, e.target.value)}
                  className="w-20 rounded-lg border border-borde bg-panel2 py-2 pl-2.5 pr-6 text-right tabular-nums text-sm text-texto outline-none focus:border-acento"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-tenue">g</span>
              </div>
              <button
                onClick={() => sacar(idx)}
                aria-label={`Sacar ${i.nombre}`}
                className="shrink-0 px-1 text-lg leading-none text-tenue active:text-gras"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {buscando ? (
          <div className="tarjeta mb-3 p-3">
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar ingrediente…"
              className="w-full rounded-xl border border-borde bg-panel2 px-4 py-3 text-texto outline-none focus:border-acento"
            />
            <div className="mt-2 space-y-1">
              {resultados.map((i) => (
                <button key={i.clave} onClick={() => agregar(i)}
                  className="block w-full rounded-lg bg-panel2 px-3 py-2 text-left text-sm first-letter:uppercase">
                  {i.nombre}
                  <span className="block text-xs text-tenue">{i.por100g.kcal} kcal /100 g</span>
                </button>
              ))}
              {q && resultados.length === 0 && (
                <p className="px-1 py-2 text-xs text-tenue">
                  No tengo ese ingrediente en la tabla de composición.
                </p>
              )}
            </div>
            <button onClick={() => { setBuscando(false); setQ('') }}
              className="mt-2 w-full py-2 text-sm text-tenue">Cancelar</button>
          </div>
        ) : (
          <button onClick={() => setBuscando(true)}
            className="mb-3 w-full rounded-xl border border-dashed border-borde py-3 text-sm text-tenue">
            + Agregar ingrediente
          </button>
        )}

        {calc.ingredientesSinDatos.length > 0 && (
          <p className="mb-3 rounded-xl bg-panel2 px-3 py-2.5 text-xs leading-relaxed text-tenue">
            {calc.ingredientesSinDatos.length}{' '}
            {calc.ingredientesSinDatos.length === 1 ? 'ingrediente no tiene' : 'ingredientes no tienen'}{' '}
            peso o composición (suelen ser cosas al gusto, como pimienta u hojas de albahaca).
            No suman al cálculo. Si alguno sí pesa, escríbele los gramos.
          </p>
        )}

        {receta.editada && (
          <button
            onClick={() => { db.restaurarReceta(receta.id); onGuardado('Receta restaurada.') }}
            className="w-full py-3 text-sm text-gras"
          >
            Volver a la versión del recetario
          </button>
        )}
      </div>

      <div className="safe-bottom flex gap-3 border-t border-borde px-4 py-3">
        <button onClick={onCerrar} className="flex-1 rounded-xl border border-borde bg-panel2 py-3.5 font-medium text-tenue">
          Cancelar
        </button>
        <button
          onClick={() => {
            db.guardarRecetaEditada(receta.id, {
              ingredientes,
              rinde: { ...receta.rinde, porciones: Number(rinde) || 1 },
            })
            onGuardado('Receta guardada.')
          }}
          className="flex-[2] rounded-xl bg-acento py-3.5 font-bold text-tinta"
        >
          Guardar cambios
        </button>
      </div>
    </div>
  )
}

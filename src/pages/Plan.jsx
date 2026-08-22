import { useEffect, useMemo, useState } from 'react'
import * as db from '../db.js'
import { MOMENTOS, formatearFecha, redondear } from '../nutricion.js'
import { cargarRecetas, cargarTablaCL, getRecetas, getTablaCL } from '../off.js'
import { etiquetaItem, generarPlan } from '../plan.js'

const FUENTES = [
  { id: 'todo', nombre: 'Todo', detalle: 'Recetas, tus alimentos y la tabla chilena' },
  { id: 'mio', nombre: 'Solo lo mío', detalle: 'Tus recetas, favoritos y recientes' },
  { id: 'recetas', nombre: 'Solo recetas', detalle: 'Los dos recetarios' },
]

export default function Plan({ metas, recargar }) {
  const [listo, setListo] = useState(false)
  const [variante, setVariante] = useState(0)
  const [fuente, setFuente] = useState('todo')
  const [fecha] = useState(() => db.claveFecha())
  const [aviso, setAviso] = useState(null)
  // que items del plan ya se registraron, para poder ir marcandolos de a uno
  const [marcados, setMarcados] = useState({})

  useEffect(() => {
    Promise.all([cargarTablaCL(), cargarRecetas()]).then(() => setListo(true))
  }, [])

  const despensa = useMemo(() => {
    if (!listo) return []
    const recetas = getRecetas()
    const cache = Object.values(db.getCache())
    const mios = [...cache, ...recetas]
    if (fuente === 'recetas') return recetas
    if (fuente === 'mio') return mios.length > 3 ? mios : recetas
    // "todo": lo de Isi primero, la tabla chilena de relleno
    return [...mios, ...getTablaCL()]
  }, [listo, fuente])

  const plan = useMemo(
    () => (despensa.length ? generarPlan(despensa, metas, fecha, variante) : null),
    [despensa, metas, fecha, variante],
  )

  /** Registra UN item del plan. Es la forma natural de usarlo: vas comiendo
   *  y vas marcando, en vez de anotar el dia entero de golpe. */
  function registrarItem(comida, item, clave) {
    const a = item.alimento
    db.guardarAlimento({
      id: a.id, nombre: a.nombre, marca: a.marca || null,
      por100g: a.por100g, porciones: a.porciones || [], fuente: a.fuente, aprox: a.aprox,
    })
    db.marcarReciente(a.id)
    const f = item.gramos / 100
    const entrada = db.agregarEntrada(fecha, {
      alimento_id: a.id, nombre: a.nombre, momento: comida.momento, gramos: item.gramos,
      kcal: Math.round(a.por100g.kcal * f),
      p: redondear(a.por100g.p * f, 1),
      c: redondear(a.por100g.c * f, 1),
      g: redondear(a.por100g.g * f, 1),
      etiqueta_porcion: etiquetaItem(item),
    })
    setMarcados((m) => ({ ...m, [clave]: entrada.id }))
    recargar()
  }

  /** Desmarcar borra la entrada que se creo: no queda comida fantasma. */
  function desmarcarItem(clave) {
    const id = marcados[clave]
    if (id) db.borrarEntrada(fecha, id)
    setMarcados((m) => { const n = { ...m }; delete n[clave]; return n })
    recargar()
  }

  function registrarTodo() {
    let n = 0
    for (const comida of plan.comidas) {
      for (const [idx, item] of comida.items.entries()) {
        const clave = `${comida.momento}-${idx}-${item.alimento.id}`
        if (marcados[clave]) continue   // ese ya lo marco a mano
        registrarItem(comida, item, clave)
        n++
      }
    }
    recargar()
    setAviso(n === 0
      ? 'Ya tenías todo marcado.'
      : `${n} ${n === 1 ? 'alimento anotado' : 'alimentos anotados'} en ${formatearFecha(fecha).toLowerCase()}.`)
  }

  return (
    <div className="px-4 pb-6">
      <h2 className="mb-1 text-xl font-bold">Plan del día</h2>
      <p className="mb-4 text-xs leading-relaxed text-tenue">
        Una propuesta que cuadra con tus {metas.kcal} kcal y tus macros, armada con lo que
        realmente comes. No es una orden: es un punto de partida.
      </p>

      <div className="mb-3 flex gap-2">
        {FUENTES.map((f) => (
          <button
            key={f.id}
            onClick={() => setFuente(f.id)}
            className={`flex-1 rounded-xl border px-2 py-2 text-xs ${
              f.id === fuente ? 'border-acento bg-chip text-chip-texto' : 'border-borde bg-panel2 text-tenue'
            }`}
          >
            {f.nombre}
          </button>
        ))}
      </div>

      {!listo && <p className="py-10 text-center text-sm text-tenue">Armando el plan…</p>}

      {plan && (
        <>
          <section className="tarjeta mb-4 p-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ['kcal', plan.total.kcal, metas.kcal, 'text-acento-texto'],
                ['prot', Math.round(plan.total.p), metas.proteina_g, 'text-prot'],
                ['carbos', Math.round(plan.total.c), metas.carbos_g, 'text-carb'],
                ['grasa', Math.round(plan.total.g), metas.grasa_g, 'text-gras'],
              ].map(([l, v, m, c]) => (
                <div key={l}>
                  <div className={`text-lg font-bold tabular-nums ${c}`}>{v}</div>
                  <div className="text-[10px] text-tenue">de {m} {l}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-center text-[11px] text-tenue">
              {Math.abs(plan.ajuste.kcal) <= 40
                ? 'Cuadra con tu meta.'
                : `${plan.ajuste.kcal > 0 ? '+' : ''}${plan.ajuste.kcal} kcal respecto de tu meta.`}
            </p>
          </section>

          {plan.comidas.map((c) => {
            const m = MOMENTOS.find((x) => x.id === c.momento)
            return (
              <section key={c.momento} className="tarjeta mb-3 px-4 py-3">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <span>{m.emoji}</span>{m.nombre}
                  </h3>
                  <span className="tabular-nums text-sm text-tenue">
                    {Math.round(c.suma.kcal)} kcal
                  </span>
                </div>
                {c.items.length === 0 ? (
                  <p className="py-2 text-xs text-tenue">No encontré nada que calce acá.</p>
                ) : (
                  <ul className="divide-y divide-borde border-t border-borde">
                    {c.items.map((i, n) => {
                      const clave = `${c.momento}-${n}-${i.alimento.id}`
                      const hecho = Boolean(marcados[clave])
                      return (
                        <li key={clave} className="flex items-center gap-2 py-2">
                          <span className={`min-w-0 flex-1 text-sm leading-tight ${hecho ? 'text-tenue line-through' : ''}`}>
                            {i.alimento.nombre}
                            <span className="block text-xs text-tenue no-underline">{etiquetaItem(i)}</span>
                          </span>
                          <span className="shrink-0 tabular-nums text-xs text-tenue">
                            {Math.round((i.alimento.por100g.kcal * i.gramos) / 100)}
                          </span>
                          <button
                            onClick={() => (hecho ? desmarcarItem(clave) : registrarItem(c, i, clave))}
                            aria-label={hecho ? `Quitar ${i.alimento.nombre}` : `Ya comí ${i.alimento.nombre}`}
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${
                              hecho ? 'border-acento bg-acento text-tinta' : 'border-borde text-transparent'
                            }`}
                          >
                            ✓
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            )
          })}

          {aviso && (
            <p className="mb-3 rounded-xl bg-carb/15 px-4 py-3 text-sm text-carb">{aviso}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setVariante((v) => v + 1); setAviso(null); setMarcados({}) }}
              className="flex-1 rounded-xl border border-borde bg-panel2 py-3.5 text-sm font-semibold"
            >
              Otra opción
            </button>
            <button
              onClick={registrarTodo}
              className="flex-[2] rounded-xl bg-acento py-3.5 font-bold text-tinta"
            >
              Anotar todo en Hoy
            </button>
          </div>
        </>
      )}
    </div>
  )
}

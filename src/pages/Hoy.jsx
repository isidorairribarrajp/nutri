import { useMemo, useState } from 'react'
import AnilloCalorias from '../components/AnilloCalorias.jsx'
import BarraMacros from '../components/BarraMacros.jsx'
import { FilaEntrada } from '../components/FilaAlimento.jsx'
import SelectorPorcion from '../components/SelectorPorcion.jsx'
import { MOMENTOS, formatearFecha, porMomento, redondear, totales, etiquetaPorcion } from '../nutricion.js'
import * as db from '../db.js'

export default function Hoy({ fecha, setFecha, entradas, metas, recargar, onAgregar }) {
  const [editando, setEditando] = useState(null)

  const t = useMemo(() => totales(entradas), [entradas])
  const grupos = useMemo(() => porMomento(entradas), [entradas])

  function borrar(entrada) {
    db.borrarEntrada(fecha, entrada.id)
    recargar()
  }

  function abrirEdicion(entrada) {
    const alimento = db.getAlimento(entrada.alimento_id)
    if (!alimento) return // alimento borrado del cache: no hay como recalcular
    setEditando({ alimento, entrada })
  }

  function guardarEdicion(resultado) {
    db.editarEntrada(fecha, editando.entrada.id, {
      gramos: resultado.gramos,
      kcal: resultado.kcal,
      p: resultado.p,
      c: resultado.c,
      g: resultado.g,
      etiqueta_porcion: etiquetaPorcion(resultado.gramos, resultado.porcion),
    })
    setEditando(null)
    recargar()
  }

  return (
    <div className="px-4 pb-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setFecha(db.sumarDias(fecha, -1))}
          className="rounded-full border border-borde px-3 py-1.5 text-tenue active:bg-panel2"
          aria-label="Dia anterior"
        >
          ‹
        </button>
        <span className="text-sm font-medium capitalize">{formatearFecha(fecha)}</span>
        <button
          onClick={() => setFecha(db.sumarDias(fecha, 1))}
          disabled={fecha >= db.claveFecha()}
          className="rounded-full border border-borde px-3 py-1.5 text-tenue disabled:opacity-30 active:bg-panel2"
          aria-label="Dia siguiente"
        >
          ›
        </button>
      </div>

      <div className="mb-5 flex justify-center">
        <AnilloCalorias consumidas={t.kcal} meta={metas.kcal} />
      </div>

      <div className="mb-6 rounded-2xl border border-borde bg-panel p-4">
        <BarraMacros totales={t} metas={metas} />
      </div>

      {MOMENTOS.map((m) => {
        const items = grupos[m.id] || []
        const sub = totales(items)
        return (
          <section key={m.id} className="mb-3 rounded-2xl border border-borde bg-panel px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-medium">
                <span>{m.emoji}</span>
                {m.nombre}
              </h3>
              <div className="flex items-center gap-3">
                <span className="tabular-nums text-sm text-tenue">{redondear(sub.kcal)} kcal</span>
                <button
                  onClick={() => onAgregar(m.id)}
                  aria-label={`Agregar a ${m.nombre}`}
                  className="h-8 w-8 rounded-full bg-panel2 text-lg leading-none text-kcal active:bg-borde"
                >
                  +
                </button>
              </div>
            </div>
            {items.length > 0 && (
              <div className="mt-1 divide-y divide-borde border-t border-borde">
                {items.map((e) => (
                  <FilaEntrada
                    key={e.id}
                    entrada={e}
                    onEditar={() => abrirEdicion(e)}
                    onBorrar={() => borrar(e)}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}

      {editando && (
        <SelectorPorcion
          alimento={editando.alimento}
          entradaExistente={editando.entrada}
          onConfirmar={guardarEdicion}
          onCancelar={() => setEditando(null)}
        />
      )}
    </div>
  )
}

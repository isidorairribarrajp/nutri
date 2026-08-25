import { useMemo, useState } from 'react'
import * as db from '../db.js'
import { MOMENTOS, etiquetaPorcion, redondear } from '../nutricion.js'
import { interpretar, resolverGramos } from '../texto.js'

const EJEMPLO = `2 huevos
1 marraqueta
media palta
1 taza de arroz cocido`

/**
 * Escribir varias comidas de una, una por linea.
 * La regla es que nada se guarda sin que Isi lo vea: primero se muestra que
 * entendio de cada linea, con alternativas si dudo, y recien despues se anota.
 */
export default function RegistroTexto({ fecha, despensa, momentoInicial, onListo, onCerrar }) {
  const [texto, setTexto] = useState('')
  const [momento, setMomento] = useState(momentoInicial || 'almuerzo')
  const [correcciones, setCorrecciones] = useState({})
  const [abierta, setAbierta] = useState(null)

  const filas = useMemo(() => {
    const base = interpretar(texto, despensa)
    return base.map((f, i) => {
      const elegido = correcciones[i]
      if (!elegido) return f
      const g = resolverGramos(elegido, f.cantidad, f.unidad, f.crudo)
      return { ...f, alimento: elegido, error: null, dudoso: !g.seguro, ...g }
    })
  }, [texto, despensa, correcciones])

  const validas = filas.filter((f) => f.alimento && f.gramos > 0)
  const total = validas.reduce((a, f) => a + (f.alimento.por100g.kcal * f.gramos) / 100, 0)

  function guardar() {
    validas.forEach((f) => {
      const a = f.alimento
      db.guardarAlimento({
        id: a.id, nombre: a.nombre, marca: a.marca || null,
        por100g: a.por100g, porciones: a.porciones || [], fuente: a.fuente, aprox: a.aprox,
      })
      db.marcarReciente(a.id)
      const factor = f.gramos / 100
      db.agregarEntrada(fecha, {
        alimento_id: a.id, nombre: a.nombre, momento, gramos: f.gramos,
        kcal: Math.round(a.por100g.kcal * factor),
        p: redondear(a.por100g.p * factor, 1),
        c: redondear(a.por100g.c * factor, 1),
        g: redondear(a.por100g.g * factor, 1),
        etiqueta_porcion: etiquetaPorcion(f.gramos, f.porcion),
      })
    })
    onListo(validas.length)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-fondo">
      <div className="safe-top flex items-center justify-between border-b border-borde px-4 py-3">
        <span className="font-bold">Escribir lo que comí</span>
        <button onClick={onCerrar} className="text-sm text-tenue">Cerrar</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {MOMENTOS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMomento(m.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                m.id === momento ? 'border-acento bg-chip text-chip-texto' : 'border-borde bg-panel2 text-tenue'
              }`}
            >
              {m.emoji} {m.nombre}
            </button>
          ))}
        </div>

        <textarea
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setCorrecciones({}) }}
          placeholder={EJEMPLO}
          rows={5}
          className="w-full resize-none rounded-xl border border-borde bg-panel2 px-4 py-3 leading-relaxed text-texto outline-none focus:border-acento"
        />
        <p className="mb-4 mt-1.5 text-xs leading-relaxed text-tenue">
          Un alimento por línea. Entiende gramos ("100 g de pollo"), medidas caseras
          ("1 taza de arroz") y cantidades sueltas ("2 huevos", "media palta").
          <br />
          Con arroz, fideos, legumbres y carnes conviene decir <b>crudo</b> o <b>cocido</b>:
          100 g de lentejas crudas son 352 kcal y cocidas son 116.
        </p>

        {filas.length > 0 && (
          <>
            <div className="tarjeta divide-y divide-borde px-4">
              {filas.map((f, i) => (
                <Fila
                  key={i}
                  fila={f}
                  abierta={abierta === i}
                  onAbrir={() => setAbierta(abierta === i ? null : i)}
                  onElegir={(a) => { setCorrecciones((c) => ({ ...c, [i]: a })); setAbierta(null) }}
                />
              ))}
            </div>

            <p className="mt-3 text-center text-sm">
              <b>{validas.length}</b> de {filas.length}{' '}
              {filas.length === 1 ? 'línea reconocida' : 'líneas reconocidas'}
              {validas.length > 0 && <> · <b>{Math.round(total)} kcal</b></>}
            </p>
          </>
        )}
      </div>

      <div className="safe-bottom flex gap-3 border-t border-borde px-4 py-3">
        <button onClick={onCerrar} className="flex-1 rounded-xl border border-borde bg-panel2 py-3.5 font-medium text-tenue">
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={validas.length === 0}
          className="flex-[2] rounded-xl bg-acento py-3.5 font-bold text-tinta disabled:opacity-40"
        >
          Anotar {validas.length > 0 ? validas.length : ''}
        </button>
      </div>
    </div>
  )
}

function Fila({ fila, abierta, onAbrir, onElegir }) {
  if (fila.error) {
    return (
      <div className="py-3">
        <div className="text-sm line-through opacity-60">{fila.crudo}</div>
        <div className="mt-0.5 text-xs text-gras">{fila.error}</div>
      </div>
    )
  }

  const kcal = Math.round((fila.alimento.por100g.kcal * fila.gramos) / 100)

  return (
    <div className="py-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] leading-tight">{fila.alimento.nombre}</div>
          <div className="mt-0.5 truncate text-xs text-tenue">
            {fila.crudo} → {etiquetaPorcion(fila.gramos, fila.porcion)}
          </div>
        </div>
        <span className="shrink-0 tabular-nums text-sm font-semibold">{kcal}</span>
      </div>

      {fila.dudoso && !abierta && (
        <button onClick={onAbrir} className="mt-1.5 text-left text-xs text-acento-texto underline underline-offset-2">
          {fila.ambiguoEstado
            ? 'No dijiste si crudo o cocido — la diferencia es grande. Elegir'
            : '¿No es esto? Cambiar'}
        </button>
      )}

      {abierta && (
        <div className="mt-2 space-y-1.5">
          {fila.alternativas.length === 0 && (
            <p className="text-xs text-tenue">No tengo otra opción para esta línea.</p>
          )}
          {fila.alternativas.map((a) => (
            <button
              key={a.id}
              onClick={() => onElegir(a)}
              className="block w-full rounded-lg bg-panel2 px-3 py-2 text-left text-sm"
            >
              {a.nombre}
              <span className="block text-xs text-tenue">{a.por100g.kcal} kcal /100 g</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

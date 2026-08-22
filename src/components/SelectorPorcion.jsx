import { useMemo, useState } from 'react'
import { calcularPorcion, redondear } from '../nutricion.js'

/** Hoja inferior para elegir cuanto se comio, con preview en vivo de kcal y macros. */
export default function SelectorPorcion({ alimento, entradaExistente, onConfirmar, onCancelar }) {
  const porciones = alimento.porciones?.length ? alimento.porciones : [{ nombre: '100 g', gramos: 100 }]
  const [gramos, setGramos] = useState(() =>
    entradaExistente ? String(entradaExistente.gramos) : String(porciones[0].gramos),
  )
  const [cantidad, setCantidad] = useState('1')
  const [porcionIdx, setPorcionIdx] = useState(0)
  const [modoLibre, setModoLibre] = useState(false)

  const gramosFinales = modoLibre
    ? Number(gramos) || 0
    : redondear((Number(cantidad) || 0) * porciones[porcionIdx].gramos, 1)

  const nutri = useMemo(() => calcularPorcion(alimento, gramosFinales), [alimento, gramosFinales])

  function elegirPorcion(i) {
    setPorcionIdx(i)
    setModoLibre(false)
    setGramos(String(redondear((Number(cantidad) || 1) * porciones[i].gramos, 1)))
  }

  function confirmar() {
    if (gramosFinales <= 0) return
    onConfirmar({
      gramos: gramosFinales,
      porcion: modoLibre ? null : { ...porciones[porcionIdx], cantidad: Number(cantidad) || 1 },
      ...nutri,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onCancelar}>
      <div
        className="safe-bottom max-h-[88vh] overflow-y-auto rounded-t-3xl border-t border-borde bg-panel px-5 pt-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-borde" />

        <h2 className="text-lg font-semibold leading-tight">{alimento.nombre}</h2>
        {alimento.marca && <p className="text-sm text-tenue">{alimento.marca}</p>}
        {alimento.aprox && (
          <p className="mt-1 text-xs text-tenue">
            Valor aproximado: la receta cambia segun quien cocine.
          </p>
        )}

        <div className="my-4 grid grid-cols-4 gap-2 rounded-2xl bg-panel2 p-3 text-center">
          <div>
            <div className="text-lg font-semibold tabular-nums text-kcal">{nutri.kcal}</div>
            <div className="text-[10px] text-tenue">kcal</div>
          </div>
          <div>
            <div className="text-lg font-semibold tabular-nums text-prot">{nutri.p}</div>
            <div className="text-[10px] text-tenue">prot</div>
          </div>
          <div>
            <div className="text-lg font-semibold tabular-nums text-carb">{nutri.c}</div>
            <div className="text-[10px] text-tenue">carbos</div>
          </div>
          <div>
            <div className="text-lg font-semibold tabular-nums text-gras">{nutri.g}</div>
            <div className="text-[10px] text-tenue">grasa</div>
          </div>
        </div>

        {!modoLibre && (
          <>
            <label className="text-xs text-tenue">Cantidad</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="mt-1 mb-3 w-full rounded-xl border border-borde bg-panel2 px-4 py-3 tabular-nums outline-none focus:border-kcal"
            />
            <label className="text-xs text-tenue">Porcion</label>
            <div className="mb-3 mt-1 flex flex-wrap gap-2">
              {porciones.map((p, i) => (
                <button
                  key={p.nombre}
                  onClick={() => elegirPorcion(i)}
                  className={`rounded-full border px-3 py-2 text-sm ${
                    i === porcionIdx
                      ? 'border-kcal bg-kcal/15 text-kcal'
                      : 'border-borde bg-panel2 text-tenue'
                  }`}
                >
                  {p.nombre} · {p.gramos} g
                </button>
              ))}
            </div>
          </>
        )}

        {modoLibre && (
          <>
            <label className="text-xs text-tenue">Gramos</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              autoFocus
              value={gramos}
              onChange={(e) => setGramos(e.target.value)}
              className="mt-1 mb-3 w-full rounded-xl border border-borde bg-panel2 px-4 py-3 tabular-nums outline-none focus:border-kcal"
            />
          </>
        )}

        <button
          onClick={() => setModoLibre((v) => !v)}
          className="mb-4 text-sm text-prot underline underline-offset-2"
        >
          {modoLibre ? 'Usar porciones' : 'Escribir gramos exactos'}
        </button>

        <p className="mb-3 text-xs text-tenue">Total: {redondear(gramosFinales, 1)} g</p>

        <div className="flex gap-3 pb-5">
          <button
            onClick={onCancelar}
            className="flex-1 rounded-xl border border-borde bg-panel2 py-3.5 font-medium text-tenue"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={gramosFinales <= 0}
            className="flex-[2] rounded-xl bg-kcal py-3.5 font-semibold text-fondo disabled:opacity-40"
          >
            {entradaExistente ? 'Guardar' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}

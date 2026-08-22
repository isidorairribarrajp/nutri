import { useMemo, useState } from 'react'
import GraficoPeso from '../components/GraficoPeso.jsx'
import * as db from '../db.js'
import { formatearFecha } from '../nutricion.js'
import { calcularMetas, perfilCompleto } from '../perfil.js'

const RANGOS = [
  { id: 30, nombre: '30 dias' },
  { id: 90, nombre: '90 dias' },
  { id: 0, nombre: 'Todo' },
]

export default function Peso({ recargar }) {
  const [version, setVersion] = useState(0)
  const [rango, setRango] = useState(30)
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState(() => db.claveFecha())
  const [aviso, setAviso] = useState(null)

  const todos = useMemo(() => db.getPesosOrdenados(), [version])

  const visibles = useMemo(() => {
    if (!rango) return todos
    const corte = db.sumarDias(db.claveFecha(), -rango)
    return todos.filter((p) => p.fecha >= corte)
  }, [todos, rango])

  function guardar() {
    const kg = Number(String(valor).replace(',', '.'))
    if (!(kg > 20 && kg < 400)) {
      setAviso({ tipo: 'error', texto: 'Ese peso no parece real. Revisa el numero.' })
      return
    }
    db.registrarPeso(fecha, kg)
    setValor('')
    setVersion((v) => v + 1)

    // Si las metas son automaticas, el peso nuevo las mueve: hay que recalcular.
    const perfil = db.getPerfil()
    if (db.metasSonAutomaticas() && perfilCompleto(perfil) && fecha === db.claveFecha()) {
      const actualizado = { ...perfil, peso_kg: kg }
      db.setPerfil(actualizado)
      const m = calcularMetas(actualizado)
      db.setMetas({ kcal: m.kcal, proteina_g: m.proteina_g, carbos_g: m.carbos_g, grasa_g: m.grasa_g, auto: true })
      recargar()
      setAviso({ tipo: 'ok', texto: `Peso guardado. Metas recalculadas a ${m.kcal} kcal.` })
    } else {
      recargar()
      setAviso({ tipo: 'ok', texto: 'Peso guardado.' })
    }
  }

  function borrar(f) {
    db.borrarPeso(f)
    setVersion((v) => v + 1)
  }

  const ultimo = todos.length ? todos[todos.length - 1] : null

  return (
    <div className="px-4 pb-6">
      <h2 className="mb-4 text-lg font-semibold">Peso</h2>

      <section className="mb-5 rounded-2xl border border-borde bg-panel p-4">
        <div className="mb-3 flex items-end gap-3">
          <label className="flex-1 text-xs text-tenue">
            Peso de hoy
            <div className="relative mt-1">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder={ultimo ? String(ultimo.kg) : '—'}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full rounded-xl border border-borde bg-panel2 px-4 py-3 pr-10 tabular-nums text-texto outline-none focus:border-kcal"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-tenue">kg</span>
            </div>
          </label>
          <button
            onClick={guardar}
            disabled={!valor}
            className="rounded-xl bg-kcal px-6 py-3 font-semibold text-fondo disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
        <label className="block text-xs text-tenue">
          Fecha
          <input
            type="date"
            value={fecha}
            max={db.claveFecha()}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 w-full rounded-xl border border-borde bg-panel2 px-4 py-3 text-texto outline-none focus:border-kcal"
          />
        </label>
        {aviso && (
          <p
            className={`mt-3 rounded-xl px-3 py-2 text-xs ${
              aviso.tipo === 'error' ? 'bg-red-500/15 text-red-300' : 'bg-carb/15 text-carb'
            }`}
          >
            {aviso.texto}
          </p>
        )}
      </section>

      <section className="mb-5 rounded-2xl border border-borde bg-panel p-4">
        <div className="mb-3 flex gap-2">
          {RANGOS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRango(r.id)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                r.id === rango ? 'border-kcal bg-kcal/15 text-kcal' : 'border-borde bg-panel2 text-tenue'
              }`}
            >
              {r.nombre}
            </button>
          ))}
        </div>
        <GraficoPeso pesos={visibles} />
      </section>

      {todos.length > 0 && (
        <section className="rounded-2xl border border-borde bg-panel px-4 py-2">
          <div className="divide-y divide-borde">
            {[...todos].reverse().slice(0, 30).map((p) => (
              <div key={p.fecha} className="flex items-center gap-3 py-2.5">
                <span className="flex-1 text-sm capitalize">{formatearFecha(p.fecha)}</span>
                <span className="tabular-nums text-sm">{p.kg} kg</span>
                <button
                  onClick={() => borrar(p.fecha)}
                  aria-label={`Borrar peso del ${p.fecha}`}
                  className="px-2 text-lg leading-none text-tenue active:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {todos.length > 30 && (
            <p className="py-2 text-center text-xs text-tenue">
              Mostrando los ultimos 30 de {todos.length} registros.
            </p>
          )}
        </section>
      )}
    </div>
  )
}

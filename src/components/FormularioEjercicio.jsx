import { useState } from 'react'
import * as db from '../db.js'
import { EJERCICIOS, buscarEjercicio, kcalDeSesion } from '../ejercicio.js'

/** Hoja para anotar una sesión. Se abre desde Hoy y desde Progreso. */
export default function FormularioEjercicio({ fecha, pesoKg, onGuardado, onCerrar }) {
  const [s, setS] = useState({
    ejercicio: 'pilates',
    minutos: 50,
    intensidad: 'fuerte',
    velocidad: 5.5,
    inclinacion: 6,
    kcal_reloj: '',
  })
  const ej = buscarEjercicio(s.ejercicio)
  const { kcal, met, fuente } = kcalDeSesion(s, pesoKg)

  function elegir(id) {
    const e = buscarEjercicio(id)
    setS((prev) => ({
      ...prev,
      ejercicio: id,
      intensidad: e.intensidades ? (e.intensidades.find((i) => i.id === prev.intensidad)?.id || e.intensidades[0].id) : prev.intensidad,
      velocidad: e.defaults?.velocidad ?? prev.velocidad,
      inclinacion: e.defaults?.inclinacion ?? prev.inclinacion,
    }))
  }

  function guardar() {
    if (!(Number(s.minutos) > 0)) return
    db.agregarEjercicio(fecha, {
      ejercicio: s.ejercicio,
      minutos: Number(s.minutos),
      intensidad: s.intensidad,
      velocidad: Number(s.velocidad),
      inclinacion: Number(s.inclinacion),
      kcal_reloj: Number(s.kcal_reloj) || null,
    })
    onGuardado()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onCerrar}>
      <div
        className="safe-bottom max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-borde bg-panel px-5 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-borde" />
        <h2 className="mb-3 text-lg font-bold">Anotar ejercicio</h2>

        <div className="mb-4 grid grid-cols-4 gap-2">
          {EJERCICIOS.map((e) => (
            <button
              key={e.id}
              onClick={() => elegir(e.id)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[10px] leading-tight ${
                e.id === s.ejercicio
                  ? 'border-acento bg-chip text-chip-texto'
                  : 'border-borde bg-panel2 text-tenue'
              }`}
            >
              <span className="text-lg">{e.icono}</span>
              <span className="w-full truncate px-0.5">{e.corto || e.nombre}</span>
            </button>
          ))}
        </div>

        <label className="mb-3 block text-xs text-tenue">
          Minutos
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={s.minutos}
            onChange={(e) => setS({ ...s, minutos: e.target.value })}
            className="mt-1 w-full rounded-xl border border-borde bg-panel2 px-4 py-3 tabular-nums text-texto outline-none focus:border-acento"
          />
        </label>

        {ej.ecuacion ? (
          <div className="mb-3 grid grid-cols-2 gap-3">
            <label className="text-xs text-tenue">
              Velocidad (km/h)
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                value={s.velocidad}
                onChange={(e) => setS({ ...s, velocidad: e.target.value })}
                className="mt-1 w-full rounded-xl border border-borde bg-panel2 px-4 py-3 tabular-nums text-texto outline-none focus:border-acento"
              />
            </label>
            <label className="text-xs text-tenue">
              Inclinación (%)
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                max="40"
                value={s.inclinacion}
                onChange={(e) => setS({ ...s, inclinacion: e.target.value })}
                className="mt-1 w-full rounded-xl border border-borde bg-panel2 px-4 py-3 tabular-nums text-texto outline-none focus:border-acento"
              />
            </label>
          </div>
        ) : (
          <div className="mb-3">
            <span className="text-xs text-tenue">Intensidad</span>
            <div className="mt-1 flex flex-col gap-2">
              {(ej.intensidades || []).map((i) => (
                <button
                  key={i.id}
                  onClick={() => setS({ ...s, intensidad: i.id })}
                  className={`rounded-xl border px-4 py-2.5 text-left text-sm ${
                    i.id === s.intensidad
                      ? 'border-acento bg-chip text-chip-texto'
                      : 'border-borde bg-panel2'
                  }`}
                >
                  {i.nombre}
                  <span className="float-right tabular-nums text-tenue">{i.met} MET</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="mb-3 block text-xs text-tenue">
          Calorías del reloj (opcional)
          <input
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="cuando tengas el Garmin"
            value={s.kcal_reloj}
            onChange={(e) => setS({ ...s, kcal_reloj: e.target.value })}
            className="mt-1 w-full rounded-xl border border-borde bg-panel2 px-4 py-3 tabular-nums text-texto outline-none focus:border-acento"
          />
        </label>

        <div className="mb-3 rounded-2xl bg-panel2 p-3 text-center">
          <div className="text-3xl font-bold tabular-nums text-acento-texto">{kcal}</div>
          <div className="text-xs text-tenue">
            kcal netas · {met.toFixed(1)} MET · {fuente === 'reloj' ? 'según tu reloj' : 'estimadas'}
          </div>
        </div>

        {ej.nota && (
          <p className="mb-3 rounded-xl bg-panel2 px-3 py-2 text-xs leading-relaxed text-tenue">
            {ej.nota}
          </p>
        )}

        <div className="flex gap-3 pb-5">
          <button
            onClick={onCerrar}
            className="flex-1 rounded-xl border border-borde bg-panel2 py-3.5 font-medium text-tenue"
          >
            Cancelar
          </button>
          <button onClick={guardar} className="flex-[2] rounded-xl bg-acento py-3.5 font-bold text-tinta">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

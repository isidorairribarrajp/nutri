import { useMemo, useState } from 'react'
import * as db from '../db.js'
import { formatearFecha } from '../nutricion.js'
import { EJERCICIOS, buscarEjercicio, kcalDeSesion, metDeSesion, promedioDiario, resumenSesion } from '../ejercicio.js'

export default function Ejercicio({ pesoKg, recargar, sinTitulo }) {
  const [version, setVersion] = useState(0)
  const [fecha, setFecha] = useState(() => db.claveFecha())
  const [abierto, setAbierto] = useState(false)

  const delDia = useMemo(() => db.getEjerciciosDia(fecha), [fecha, version])
  const semana = useMemo(
    () => db.getEjerciciosDesde(db.sumarDias(db.claveFecha(), -6)),
    [version],
  )

  const kcalDia = delDia.reduce((a, s) => a + kcalDeSesion(s, pesoKg).kcal, 0)
  const kcalSemana = semana.reduce((a, s) => a + kcalDeSesion(s, pesoKg).kcal, 0)
  const promedio = promedioDiario(semana, pesoKg, 7)

  function borrar(id) {
    db.borrarEjercicio(fecha, id)
    setVersion((v) => v + 1)
    recargar()
  }

  return (
    <div className="px-4 pb-6">
      {!sinTitulo && <h2 className="mb-4 text-xl font-bold">Ejercicio</h2>}

      <section className="tarjeta mb-4 p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold tabular-nums text-acento-texto">{kcalDia}</div>
            <div className="text-[11px] text-tenue">hoy</div>
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">{kcalSemana}</div>
            <div className="text-[11px] text-tenue">últimos 7 días</div>
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">{promedio}</div>
            <div className="text-[11px] text-tenue">promedio al día</div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-tenue">
          Tu meta de comida usa el <b>promedio</b>, no el gasto de hoy. Si usara el de hoy, tu meta
          saltaría 300 kcal según si tocó Pilates o no. Con el promedio comes parejo y el balance
          cierra en la semana.
        </p>
      </section>

      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setFecha(db.sumarDias(fecha, -1))}
          className="rounded-full border border-borde px-3 py-1.5 text-tenue"
          aria-label="Día anterior"
        >
          ‹
        </button>
        <span className="text-sm font-semibold capitalize">{formatearFecha(fecha)}</span>
        <button
          onClick={() => setFecha(db.sumarDias(fecha, 1))}
          disabled={fecha >= db.claveFecha()}
          className="rounded-full border border-borde px-3 py-1.5 text-tenue disabled:opacity-30"
          aria-label="Día siguiente"
        >
          ›
        </button>
      </div>

      {delDia.length === 0 ? (
        <p className="tarjeta mb-3 px-4 py-8 text-center text-sm text-tenue">
          Sin ejercicio anotado este día.
        </p>
      ) : (
        <div className="tarjeta mb-3 divide-y divide-borde px-4">
          {delDia.map((s) => {
            const ej = buscarEjercicio(s.ejercicio)
            const { kcal, met, fuente } = kcalDeSesion(s, pesoKg)
            return (
              <div key={s.id} className="flex items-center gap-3 py-3">
                <span className="text-xl">{ej.icono}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{ej.nombre}</div>
                  <div className="truncate text-xs text-tenue">
                    {resumenSesion(s)} · {met.toFixed(1)} MET
                    {fuente === 'reloj' && ' · del reloj'}
                  </div>
                </div>
                <span className="shrink-0 tabular-nums text-sm font-semibold">{kcal}</span>
                <button
                  onClick={() => borrar(s.id)}
                  aria-label="Borrar"
                  className="shrink-0 px-1 text-lg text-tenue active:text-gras"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      <button
        onClick={() => setAbierto(true)}
        className="w-full rounded-xl bg-acento py-3.5 font-bold text-tinta"
      >
        + Anotar ejercicio
      </button>

      {abierto && (
        <FormularioSesion
          fecha={fecha}
          pesoKg={pesoKg}
          onCerrar={() => setAbierto(false)}
          onGuardado={() => {
            setAbierto(false)
            setVersion((v) => v + 1)
            recargar()
          }}
        />
      )}
    </div>
  )
}

function FormularioSesion({ fecha, pesoKg, onGuardado, onCerrar }) {
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

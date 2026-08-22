import { useMemo, useState } from 'react'
import * as db from '../db.js'
import { formatearFecha } from '../nutricion.js'
import FormularioEjercicio from '../components/FormularioEjercicio.jsx'
import { buscarEjercicio, kcalDeSesion, promedioDiario, resumenSesion } from '../ejercicio.js'

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
        <span className="text-sm font-semibold first-letter:uppercase">{formatearFecha(fecha)}</span>
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
        <FormularioEjercicio
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

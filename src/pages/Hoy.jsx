import { useMemo, useState } from 'react'
import Agua from '../components/Agua.jsx'
import AnilloCalorias from '../components/AnilloCalorias.jsx'
import BarraMacros from '../components/BarraMacros.jsx'
import { FilaEntrada } from '../components/FilaAlimento.jsx'
import SelectorPorcion from '../components/SelectorPorcion.jsx'
import TiraSemana, { LeyendaSemana } from '../components/TiraSemana.jsx'
import * as db from '../db.js'
import { kcalDeSesion } from '../ejercicio.js'
import { racha, rangoKcal, semanaDe } from '../racha.js'
import { MOMENTOS, etiquetaPorcion, formatearFecha, porMomento, redondear, totales } from '../nutricion.js'

export default function Hoy({ fecha, setFecha, entradas, metas, recargar, onAgregar }) {
  const [editando, setEditando] = useState(null)
  const [copiando, setCopiando] = useState(false)
  const [menuMomento, setMenuMomento] = useState(null)

  const t = useMemo(() => totales(entradas), [entradas])
  const grupos = useMemo(() => porMomento(entradas), [entradas])
  const agua = db.getAgua(fecha)
  const rango = useMemo(() => rangoKcal(metas.kcal), [metas.kcal])
  const dias = useMemo(() => semanaDe(fecha, metas), [fecha, metas, entradas])
  const diasSeguidos = useMemo(() => racha(), [entradas])
  const cerrado = db.estaCerrado(fecha)
  const repetidas = db.getRepetidas()

  const quemadas = useMemo(() => {
    const peso = Number(db.getPerfil()?.peso_kg) || 60
    return db.getEjerciciosDia(fecha).reduce((a, s) => a + kcalDeSesion(s, peso).kcal, 0)
  }, [fecha, entradas])

  function abrirEdicion(entrada) {
    const alimento = db.getAlimento(entrada.alimento_id)
    if (!alimento) return
    setEditando({ alimento, entrada })
  }

  return (
    <div className="px-4 pb-6">
      {diasSeguidos > 0 && (
        <div className="mb-2 flex items-center justify-center gap-1.5">
          <span className="text-lg">🔥</span>
          <span className="text-sm font-bold tabular-nums">{diasSeguidos}</span>
          <span className="text-xs text-tenue">
            {diasSeguidos === 1 ? 'día registrado' : 'días seguidos'}
          </span>
        </div>
      )}

      <TiraSemana dias={dias} onElegir={setFecha} />
      <LeyendaSemana />

      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setFecha(db.sumarDias(fecha, -1))}
          className="rounded-full border border-borde px-3 py-1.5 text-tenue" aria-label="Día anterior">‹</button>
        <span className="text-sm font-semibold capitalize">{formatearFecha(fecha)}</span>
        <button onClick={() => setFecha(db.sumarDias(fecha, 1))} disabled={fecha >= db.claveFecha()}
          className="rounded-full border border-borde px-3 py-1.5 text-tenue disabled:opacity-30" aria-label="Día siguiente">›</button>
      </div>

      <div className="mb-4 flex justify-center">
        <AnilloCalorias totales={t} meta={metas.kcal} rango={rango} />
      </div>

      {quemadas > 0 && (
        <p className="mb-4 text-center text-xs text-tenue">
          🔥 {quemadas} kcal quemadas hoy · las de tu meta ya vienen con tu promedio de ejercicio
        </p>
      )}

      <div className="tarjeta mb-3 p-4">
        <BarraMacros totales={t} metas={metas} />
      </div>

      <Agua fecha={fecha} vasos={agua} onCambio={recargar} />

      {MOMENTOS.map((m) => {
        const items = grupos[m.id] || []
        const sub = totales(items)
        return (
          <section key={m.id} className="tarjeta mb-3 px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                <span>{m.emoji}</span>{m.nombre}
              </h3>
              <div className="flex items-center gap-2">
                {repetidas[m.id] && (
                  <span className="pildora" title="Se carga sola cada día">↻ fija</span>
                )}
                <span className="tabular-nums text-sm text-tenue">{redondear(sub.kcal)} kcal</span>
                <button
                  onClick={() => setMenuMomento(menuMomento === m.id ? null : m.id)}
                  aria-label={`Opciones de ${m.nombre}`}
                  className="px-1 text-lg leading-none text-tenue"
                >
                  ⋯
                </button>
                <button onClick={() => onAgregar(m.id)} aria-label={`Agregar a ${m.nombre}`}
                  className="h-8 w-8 rounded-full bg-chip text-lg leading-none text-chip-texto">+</button>
              </div>
            </div>
            {menuMomento === m.id && (
              <div className="mt-2 rounded-xl bg-panel2 p-2">
                {repetidas[m.id] ? (
                  <button
                    onClick={() => { db.setRepetida(m.id, []); setMenuMomento(null); recargar() }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm"
                  >
                    Dejar de repetir este {m.nombre.toLowerCase()} todos los días
                  </button>
                ) : (
                  <button
                    onClick={() => { db.setRepetida(m.id, items); setMenuMomento(null); recargar() }}
                    disabled={items.length === 0}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm disabled:opacity-40"
                  >
                    Repetir este {m.nombre.toLowerCase()} todos los días
                    {items.length === 0 && <span className="block text-xs text-tenue">Primero agrega algo</span>}
                  </button>
                )}
              </div>
            )}

            {items.length > 0 && (
              <div className="mt-1 divide-y divide-borde border-t border-borde">
                {items.map((e) => (
                  <FilaEntrada key={e.id} entrada={e}
                    onEditar={() => abrirEdicion(e)}
                    onBorrar={() => { db.borrarEntrada(fecha, e.id); recargar() }} />
                ))}
              </div>
            )}
          </section>
        )
      })}

      <button
        onClick={() => { db.cerrarDia(fecha, !cerrado); recargar() }}
        className={`mt-1 w-full rounded-xl py-3.5 font-bold ${
          cerrado ? 'border border-borde bg-panel2 text-tenue' : 'bg-acento text-tinta'
        }`}
      >
        {cerrado ? 'Reabrir el día' : 'Terminar el día'}
      </button>

      <button onClick={() => setCopiando(true)}
        className="mt-3 w-full rounded-xl border border-dashed border-borde py-3 text-sm text-tenue">
        Copiar las comidas de otro día
      </button>

      {editando && (
        <SelectorPorcion
          alimento={editando.alimento}
          entradaExistente={editando.entrada}
          onCancelar={() => setEditando(null)}
          onConfirmar={(r) => {
            db.editarEntrada(fecha, editando.entrada.id, {
              gramos: r.gramos, kcal: r.kcal, p: r.p, c: r.c, g: r.g,
              etiqueta_porcion: etiquetaPorcion(r.gramos, r.porcion),
            })
            setEditando(null)
            recargar()
          }}
        />
      )}

      {copiando && (
        <CopiarDia fecha={fecha} onCerrar={() => setCopiando(false)}
          onCopiado={() => { setCopiando(false); recargar() }} />
      )}
    </div>
  )
}

/** "Repetir día": lo mismo que hace Fitia para no re-registrar el mismo almuerzo. */
function CopiarDia({ fecha, onCerrar, onCopiado }) {
  const [origen, setOrigen] = useState(() => db.sumarDias(fecha, -1))
  const previa = db.getDia(origen)
  const t = totales(previa)

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onCerrar}>
      <div className="safe-bottom rounded-t-3xl border-t border-borde bg-panel px-5 pt-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-borde" />
        <h2 className="mb-1 text-lg font-bold">Copiar comidas</h2>
        <p className="mb-3 text-xs text-tenue">
          Se agregan a <b className="capitalize">{formatearFecha(fecha)}</b>, sin borrar lo que ya tienes.
        </p>

        <label className="mb-3 block text-xs text-tenue">
          Desde
          <input type="date" value={origen} max={db.claveFecha()}
            onChange={(e) => setOrigen(e.target.value)}
            className="mt-1 w-full rounded-xl border border-borde bg-panel2 px-4 py-3 text-texto outline-none focus:border-acento" />
        </label>

        <p className="mb-4 rounded-xl bg-panel2 px-3 py-2.5 text-sm">
          {previa.length === 0
            ? 'Ese día no tiene comidas registradas.'
            : `${previa.length} alimentos · ${redondear(t.kcal)} kcal`}
        </p>

        <div className="flex gap-3 pb-5">
          <button onClick={onCerrar}
            className="flex-1 rounded-xl border border-borde bg-panel2 py-3.5 font-medium text-tenue">
            Cancelar
          </button>
          <button
            onClick={() => { db.copiarDia(origen, fecha); onCopiado() }}
            disabled={previa.length === 0}
            className="flex-[2] rounded-xl bg-acento py-3.5 font-bold text-tinta disabled:opacity-40"
          >
            Copiar
          </button>
        </div>
      </div>
    </div>
  )
}

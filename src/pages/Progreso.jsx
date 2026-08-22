import { useMemo, useState } from 'react'
import GraficoTendencia from '../components/GraficoTendencia.jsx'
import Ejercicio from './Ejercicio.jsx'
import * as db from '../db.js'
import { formatearFecha, redondear } from '../nutricion.js'
import { COMO_MEDIRSE, grasaNavy, medidasCompletas, tramoGrasa } from '../perfil.js'

const RANGOS = [
  { id: 30, nombre: '30 días' },
  { id: 90, nombre: '90 días' },
  { id: 0, nombre: 'Todo' },
]

export default function Progreso({ perfil, pesoKg, recargar }) {
  const [version, setVersion] = useState(0)
  const [vista, setVista] = useState('peso')
  const [rango, setRango] = useState(90)

  const pesos = useMemo(() => db.getPesosOrdenados(), [version])
  const medidas = useMemo(() => db.getMedidasOrdenadas(), [version])

  // Cada set de medidas se convierte en un punto de % de grasa.
  const grasas = useMemo(
    () =>
      medidas
        .filter((m) => medidasCompletas(m, perfil?.sexo))
        .map((m) => ({ fecha: m.fecha, kg: grasaNavy(perfil || {}, m) }))
        .filter((p) => p.kg != null),
    [medidas, perfil],
  )

  const filtrar = (lista) => {
    if (!rango) return lista
    const corte = db.sumarDias(db.claveFecha(), -rango)
    return lista.filter((p) => p.fecha >= corte)
  }

  const serie = vista === 'peso' ? pesos : grasas
  const ultimo = serie.length ? serie[serie.length - 1] : null
  const tramo = vista === 'grasa' && ultimo ? tramoGrasa(perfil?.sexo || 'mujer', ultimo.kg) : null

  return (
    <div className="px-4 pb-6">
      <h2 className="mb-4 text-xl font-bold">Progreso</h2>

      <div className="mb-4 flex gap-2 rounded-xl bg-panel2 p-1">
        {[
          { id: 'peso', nombre: 'Peso' },
          { id: 'grasa', nombre: 'Grasa' },
          { id: 'ejercicio', nombre: 'Ejercicio' },
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setVista(v.id)}
            className={`flex-1 rounded-lg py-2 text-sm ${
              vista === v.id ? 'bg-acento font-bold text-tinta' : 'text-tenue'
            }`}
          >
            {v.nombre}
          </button>
        ))}
      </div>

      {vista === 'ejercicio' ? (
        <div className="-mx-4">
          <Ejercicio pesoKg={pesoKg} recargar={recargar} sinTitulo />
        </div>
      ) : vista === 'peso' ? (
        <RegistroPeso onGuardado={() => { setVersion((v) => v + 1); recargar() }} ultimo={ultimo} />
      ) : (
        <RegistroMedidas
          perfil={perfil}
          onGuardado={() => { setVersion((v) => v + 1); recargar() }}
        />
      )}

      {vista !== 'ejercicio' && (
      <section className="tarjeta mb-4 p-4">
        {ultimo && (
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">
              {String(redondear(ultimo.kg, 1)).replace('.', ',')}
              <span className="ml-1 text-base font-normal text-tenue">
                {vista === 'peso' ? 'kg' : '%'}
              </span>
            </span>
            {tramo && <span className="pildora">{tramo.etiqueta}</span>}
          </div>
        )}
        <div className="mb-3 flex gap-2">
          {RANGOS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRango(r.id)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                r.id === rango ? 'border-acento bg-chip text-chip-texto' : 'border-borde bg-panel2 text-tenue'
              }`}
            >
              {r.nombre}
            </button>
          ))}
        </div>
        <GraficoTendencia
          puntos={filtrar(serie)}
          color={vista === 'peso' ? 'var(--color-carb)' : 'var(--color-prot)'}
          unidad={vista === 'peso' ? 'kg' : '%'}
          vacio={
            vista === 'peso'
              ? 'Registra tu peso para ver la tendencia.'
              : 'Anota tus medidas para estimar tu grasa corporal.'
          }
        />
      </section>
      )}

      {vista === 'grasa' && <ComoMedirse sexo={perfil?.sexo} />}

      {vista !== 'ejercicio' && serie.length > 0 && (
        <section className="tarjeta mt-4 px-4 py-2">
          <div className="divide-y divide-borde">
            {[...serie].reverse().slice(0, 30).map((p) => (
              <div key={p.fecha} className="flex items-center gap-3 py-2.5">
                <span className="flex-1 text-sm capitalize">{formatearFecha(p.fecha)}</span>
                <span className="tabular-nums text-sm">
                  {String(redondear(p.kg, 1)).replace('.', ',')} {vista === 'peso' ? 'kg' : '%'}
                </span>
                <button
                  onClick={() => {
                    if (vista === 'peso') db.borrarPeso(p.fecha)
                    else db.borrarMedidas(p.fecha)
                    setVersion((v) => v + 1)
                    recargar()
                  }}
                  aria-label={`Borrar registro del ${p.fecha}`}
                  className="px-2 text-lg leading-none text-tenue active:text-gras"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function RegistroPeso({ onGuardado, ultimo }) {
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState(() => db.claveFecha())
  const [error, setError] = useState(null)

  function guardar() {
    const kg = Number(String(valor).replace(',', '.'))
    if (!(kg > 20 && kg < 400)) {
      setError('Ese peso no parece real. Revisa el número.')
      return
    }
    db.registrarPeso(fecha, kg)
    // El peso nuevo cambia el perfil, y con el las metas si son automaticas.
    const perfil = db.getPerfil()
    if (perfil && fecha === db.claveFecha()) db.setPerfil({ ...perfil, peso_kg: kg })
    setValor('')
    setError(null)
    onGuardado()
  }

  return (
    <section className="tarjeta mb-4 p-4">
      <div className="flex items-end gap-3">
        <label className="flex-1 text-xs text-tenue">
          Peso
          <div className="relative mt-1">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder={ultimo ? String(ultimo.kg) : '—'}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full rounded-xl border border-borde bg-panel2 px-4 py-3 pr-10 tabular-nums text-texto outline-none focus:border-acento"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-tenue">kg</span>
          </div>
        </label>
        <button
          onClick={guardar}
          disabled={!valor}
          className="rounded-xl bg-acento px-6 py-3 font-bold text-tinta disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
      <label className="mt-3 block text-xs text-tenue">
        Fecha
        <input
          type="date"
          value={fecha}
          max={db.claveFecha()}
          onChange={(e) => setFecha(e.target.value)}
          className="mt-1 w-full rounded-xl border border-borde bg-panel2 px-4 py-3 text-texto outline-none focus:border-acento"
        />
      </label>
      {error && <p className="mt-3 rounded-xl bg-gras/15 px-3 py-2 text-xs text-gras">{error}</p>}
    </section>
  )
}

function RegistroMedidas({ perfil, onGuardado }) {
  const ultimas = db.getUltimasMedidas()
  const [m, setM] = useState(() => ({
    cuello_cm: ultimas?.cuello_cm ?? '',
    cintura_cm: ultimas?.cintura_cm ?? '',
    cadera_cm: ultimas?.cadera_cm ?? '',
  }))
  const [fecha, setFecha] = useState(() => db.claveFecha())

  const puntos = COMO_MEDIRSE.puntos.filter((p) => !p.soloMujer || perfil?.sexo !== 'hombre')
  const listo = medidasCompletas(m, perfil?.sexo)
  const pct = listo && perfil ? grasaNavy(perfil, m) : null

  return (
    <section className="tarjeta mb-4 p-4">
      <h3 className="mb-1 font-semibold">Medidas de hoy</h3>
      <p className="mb-3 text-xs leading-relaxed text-tenue">{COMO_MEDIRSE.intro}</p>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {puntos.map((p) => (
          <label key={p.id} className="text-xs text-tenue">
            {p.nombre}
            <div className="relative mt-1">
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                value={m[p.id]}
                onChange={(e) => setM({ ...m, [p.id]: e.target.value })}
                className="w-full rounded-xl border border-borde bg-panel2 px-3 py-3 pr-8 tabular-nums text-texto outline-none focus:border-acento"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-tenue">cm</span>
            </div>
          </label>
        ))}
      </div>

      <label className="mb-3 block text-xs text-tenue">
        Fecha
        <input
          type="date"
          value={fecha}
          max={db.claveFecha()}
          onChange={(e) => setFecha(e.target.value)}
          className="mt-1 w-full rounded-xl border border-borde bg-panel2 px-4 py-3 text-texto outline-none focus:border-acento"
        />
      </label>

      {pct != null && (
        <div className="mb-3 rounded-2xl bg-panel2 p-3 text-center">
          <div className="text-3xl font-bold tabular-nums text-acento-texto">
            {String(pct).replace('.', ',')} %
          </div>
          <div className="text-xs text-tenue">de grasa corporal estimada</div>
        </div>
      )}

      <button
        onClick={() => {
          db.registrarMedidas(fecha, {
            cuello_cm: Number(m.cuello_cm) || null,
            cintura_cm: Number(m.cintura_cm) || null,
            cadera_cm: Number(m.cadera_cm) || null,
          })
          onGuardado()
        }}
        disabled={!listo}
        className="w-full rounded-xl bg-acento py-3.5 font-bold text-tinta disabled:opacity-40"
      >
        Guardar medidas
      </button>
    </section>
  )
}

function ComoMedirse({ sexo }) {
  const [abierto, setAbierto] = useState(false)
  const puntos = COMO_MEDIRSE.puntos.filter((p) => !p.soloMujer || sexo !== 'hombre')

  return (
    <section className="tarjeta p-4">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between text-left font-semibold"
      >
        Cómo medirte bien
        <span className="text-tenue">{abierto ? '−' : '+'}</span>
      </button>
      {abierto && (
        <div className="mt-3 space-y-3">
          {puntos.map((p) => (
            <div key={p.id}>
              <div className="mano text-lg text-acento-texto">{p.nombre}</div>
              <p className="text-xs leading-relaxed text-tenue">{p.como}</p>
            </div>
          ))}
          <p className="rounded-xl bg-panel2 px-3 py-2.5 text-xs leading-relaxed text-tenue">
            {COMO_MEDIRSE.precision}
          </p>
        </div>
      )}
    </section>
  )
}

import { useMemo, useRef, useState } from 'react'
import * as db from '../db.js'
import { redondear } from '../nutricion.js'
import {
  ACTIVIDADES,
  OBJETIVOS,
  PERFIL_VACIO,
  REPARTOS,
  calcularMetas,
  perfilCompleto,
} from '../perfil.js'

const CAMPOS_META = [
  { k: 'kcal', label: 'Calorias diarias', sufijo: 'kcal' },
  { k: 'proteina_g', label: 'Proteina', sufijo: 'g' },
  { k: 'carbos_g', label: 'Carbohidratos', sufijo: 'g' },
  { k: 'grasa_g', label: 'Grasa', sufijo: 'g' },
]

export default function Ajustes({ metas, recargar }) {
  const [modo, setModo] = useState(() => (db.metasSonAutomaticas() ? 'auto' : 'manual'))
  const [aviso, setAviso] = useState(null)
  const [version, setVersion] = useState(0)

  return (
    <div className="px-4 pb-6">
      <h2 className="mb-4 text-lg font-semibold">Ajustes</h2>

      <section className="mb-5 rounded-2xl border border-borde bg-panel p-4">
        <h3 className="mb-3 font-medium">Metas diarias</h3>
        <div className="mb-4 flex gap-2 rounded-xl bg-panel2 p-1">
          {[
            { id: 'auto', nombre: 'Calcular por mi' },
            { id: 'manual', nombre: 'Escribirlas yo' },
          ].map((o) => (
            <button
              key={o.id}
              onClick={() => setModo(o.id)}
              className={`flex-1 rounded-lg py-2 text-sm ${
                modo === o.id ? 'bg-kcal font-semibold text-fondo' : 'text-tenue'
              }`}
            >
              {o.nombre}
            </button>
          ))}
        </div>

        {modo === 'auto' ? (
          <FormularioPerfil
            onGuardado={(texto) => {
              recargar()
              setVersion((v) => v + 1)
              setAviso({ tipo: 'ok', texto })
            }}
          />
        ) : (
          <FormularioManual
            metas={metas}
            onGuardado={() => {
              recargar()
              setAviso({ tipo: 'ok', texto: 'Metas guardadas.' })
            }}
          />
        )}
      </section>

      <Respaldo version={version} recargar={recargar} setAviso={setAviso} />

      {aviso && (
        <p
          className={`mb-5 rounded-xl px-4 py-3 text-sm ${
            aviso.tipo === 'error' ? 'bg-red-500/15 text-red-300' : 'bg-carb/15 text-carb'
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <button
        onClick={() => {
          if (!confirm('Esto borra TODO: comidas, pesos, perfil y metas. No se puede deshacer.')) return
          db.borrarTodo()
          recargar()
          setVersion((v) => v + 1)
          setAviso({ tipo: 'ok', texto: 'Todo borrado.' })
        }}
        className="w-full py-3 text-sm text-red-400"
      >
        Borrar todo
      </button>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-tenue">
        Nutri v1.1 · Alimentos de Open Food Facts y tablas de composicion (USDA / INTA).
        <br />
        Las calorias calculadas son una estimacion (Mifflin-St Jeor), no una medicion.
        <br />
        Esto no es consejo medico ni nutricional.
      </p>
    </div>
  )
}

function FormularioPerfil({ onGuardado }) {
  const [p, setP] = useState(() => db.getPerfil() || { ...PERFIL_VACIO, ...ultimoPesoComoDefecto() })
  const completo = perfilCompleto(p)
  const calc = useMemo(() => (completo ? calcularMetas(p) : null), [p, completo])

  function guardar() {
    db.setPerfil(p)
    db.setMetas({
      kcal: calc.kcal,
      proteina_g: calc.proteina_g,
      carbos_g: calc.carbos_g,
      grasa_g: calc.grasa_g,
      auto: true,
    })
    onGuardado(`Metas actualizadas: ${calc.kcal} kcal al dia.`)
  }

  const set = (k) => (e) => setP({ ...p, [k]: e.target.value })

  return (
    <>
      <div className="mb-3 flex gap-2">
        {[
          { id: 'mujer', nombre: 'Mujer' },
          { id: 'hombre', nombre: 'Hombre' },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setP({ ...p, sexo: s.id })}
            className={`flex-1 rounded-xl border py-2.5 text-sm ${
              p.sexo === s.id ? 'border-kcal bg-kcal/15 text-kcal' : 'border-borde bg-panel2 text-tenue'
            }`}
          >
            {s.nombre}
          </button>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { k: 'edad', label: 'Edad', sufijo: 'anos' },
          { k: 'altura_cm', label: 'Altura', sufijo: 'cm' },
          { k: 'peso_kg', label: 'Peso', sufijo: 'kg' },
        ].map((c) => (
          <label key={c.k} className="text-xs text-tenue">
            {c.label}
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={p[c.k]}
              onChange={set(c.k)}
              placeholder={c.sufijo}
              className="mt-1 w-full rounded-xl border border-borde bg-panel2 px-3 py-3 tabular-nums text-texto outline-none focus:border-kcal"
            />
          </label>
        ))}
      </div>

      <label className="mb-3 block text-xs text-tenue">
        Actividad
        <select
          value={p.actividad}
          onChange={set('actividad')}
          className="mt-1 w-full appearance-none rounded-xl border border-borde bg-panel2 px-4 py-3 text-texto outline-none focus:border-kcal"
        >
          {ACTIVIDADES.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre} — {a.detalle}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-3 block text-xs text-tenue">
        Objetivo
        <select
          value={p.objetivo}
          onChange={set('objetivo')}
          className="mt-1 w-full appearance-none rounded-xl border border-borde bg-panel2 px-4 py-3 text-texto outline-none focus:border-kcal"
        >
          {OBJETIVOS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre} {o.unidad}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-4 block text-xs text-tenue">
        Reparto de macros
        <select
          value={p.reparto}
          onChange={set('reparto')}
          className="mt-1 w-full appearance-none rounded-xl border border-borde bg-panel2 px-4 py-3 text-texto outline-none focus:border-kcal"
        >
          {REPARTOS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>
      </label>

      {calc ? (
        <>
          <div className="mb-3 rounded-2xl bg-panel2 p-3">
            <div className="mb-2 flex justify-between text-xs text-tenue">
              <span>Gasto en reposo: {calc.tmb} kcal</span>
              <span>Gasto total: {calc.tdee} kcal</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-lg font-semibold tabular-nums text-kcal">{calc.kcal}</div>
                <div className="text-[10px] text-tenue">kcal</div>
              </div>
              <div>
                <div className="text-lg font-semibold tabular-nums text-prot">{calc.proteina_g}</div>
                <div className="text-[10px] text-tenue">prot</div>
              </div>
              <div>
                <div className="text-lg font-semibold tabular-nums text-carb">{calc.carbos_g}</div>
                <div className="text-[10px] text-tenue">carbos</div>
              </div>
              <div>
                <div className="text-lg font-semibold tabular-nums text-gras">{calc.grasa_g}</div>
                <div className="text-[10px] text-tenue">grasa</div>
              </div>
            </div>
          </div>

          {calc.ajustado && (
            <p className="mb-3 rounded-xl bg-panel2 px-3 py-2 text-xs text-tenue">
              Ese objetivo daba menos de {calc.piso} kcal. La app lo subio a ese piso: bajar mas
              rapido que eso no se sostiene sin supervision profesional.
            </p>
          )}

          <button onClick={guardar} className="w-full rounded-xl bg-kcal py-3.5 font-semibold text-fondo">
            Usar estas metas
          </button>
        </>
      ) : (
        <p className="rounded-xl bg-panel2 px-3 py-3 text-center text-xs text-tenue">
          Completa edad, altura y peso para ver el calculo.
        </p>
      )}
    </>
  )
}

function ultimoPesoComoDefecto() {
  const ultimo = db.getUltimoPeso()
  return ultimo ? { peso_kg: String(ultimo.kg) } : {}
}

function FormularioManual({ metas, onGuardado }) {
  const [form, setForm] = useState(() =>
    Object.fromEntries(CAMPOS_META.map((c) => [c.k, String(metas[c.k])])),
  )

  // Chequeo de coherencia: 4/4/9 kcal por gramo.
  const kcalMacros = redondear(
    (Number(form.proteina_g) || 0) * 4 +
      (Number(form.carbos_g) || 0) * 4 +
      (Number(form.grasa_g) || 0) * 9,
  )
  const kcalMeta = Number(form.kcal) || 0
  const descuadre = kcalMeta > 0 ? Math.abs(kcalMacros - kcalMeta) / kcalMeta : 0

  return (
    <>
      {CAMPOS_META.map((c) => (
        <label key={c.k} className="mb-3 block text-xs text-tenue">
          {c.label}
          <div className="relative mt-1">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={form[c.k]}
              onChange={(e) => setForm({ ...form, [c.k]: e.target.value })}
              className="w-full rounded-xl border border-borde bg-panel2 px-4 py-3 pr-14 tabular-nums text-texto outline-none focus:border-kcal"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-tenue">
              {c.sufijo}
            </span>
          </div>
        </label>
      ))}

      {descuadre > 0.1 && (
        <p className="mb-3 rounded-xl bg-panel2 px-3 py-2 text-xs text-tenue">
          Ojo: esos macros suman {kcalMacros} kcal, no {kcalMeta}. Puedes dejarlo asi, pero las
          barras y el anillo no van a cerrar juntos.
        </p>
      )}

      <button
        onClick={() => {
          db.setMetas({
            ...Object.fromEntries(CAMPOS_META.map((c) => [c.k, Number(form[c.k]) || 0])),
            auto: false,
          })
          onGuardado()
        }}
        className="w-full rounded-xl bg-kcal py-3.5 font-semibold text-fondo"
      >
        Guardar metas
      </button>
    </>
  )
}

function Respaldo({ version, recargar, setAviso }) {
  const inputArchivo = useRef(null)

  function exportar() {
    const blob = new Blob([JSON.stringify(db.exportar(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nutri-respaldo-${db.claveFecha()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function importar(evento) {
    const archivo = evento.target.files?.[0]
    if (!archivo) return
    try {
      db.importar(JSON.parse(await archivo.text()))
      recargar()
      setAviso({ tipo: 'ok', texto: 'Respaldo importado.' })
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message || 'No se pudo leer el archivo.' })
    }
    evento.target.value = ''
  }

  const dias = useMemo(() => Object.keys(db.getDiario()).length, [version])
  const propios = useMemo(
    () => Object.values(db.getCache()).filter((a) => a.fuente === 'propio').length,
    [version],
  )
  const pesos = useMemo(() => Object.keys(db.getPesos()).length, [version])

  return (
    <section className="mb-5 rounded-2xl border border-borde bg-panel p-4">
      <h3 className="mb-1 font-medium">Respaldo</h3>
      <p className="mb-3 text-xs text-tenue">
        Tus datos viven solo en este telefono. Si lo pierdes o borras la app, se pierden. Exporta de
        vez en cuando y guarda el archivo en Drive.
      </p>
      <div className="flex gap-3">
        <button
          onClick={exportar}
          className="flex-1 rounded-xl border border-borde bg-panel2 py-3 text-sm font-medium"
        >
          Exportar
        </button>
        <button
          onClick={() => inputArchivo.current?.click()}
          className="flex-1 rounded-xl border border-borde bg-panel2 py-3 text-sm font-medium"
        >
          Importar
        </button>
      </div>
      <input
        ref={inputArchivo}
        type="file"
        accept="application/json,.json"
        onChange={importar}
        className="hidden"
      />
      <p className="mt-3 text-xs text-tenue">
        {dias} {dias === 1 ? 'dia registrado' : 'dias registrados'} · {pesos}{' '}
        {pesos === 1 ? 'pesada' : 'pesadas'} · {propios} alimentos propios
      </p>
    </section>
  )
}

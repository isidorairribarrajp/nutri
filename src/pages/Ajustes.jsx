import { useRef, useState } from 'react'
import * as db from '../db.js'
import { redondear } from '../nutricion.js'

const CAMPOS = [
  { k: 'kcal', label: 'Calorias diarias', sufijo: 'kcal' },
  { k: 'proteina_g', label: 'Proteina', sufijo: 'g' },
  { k: 'carbos_g', label: 'Carbohidratos', sufijo: 'g' },
  { k: 'grasa_g', label: 'Grasa', sufijo: 'g' },
]

export default function Ajustes({ metas, recargar }) {
  const [form, setForm] = useState(() => Object.fromEntries(CAMPOS.map((c) => [c.k, String(metas[c.k])])))
  const [aviso, setAviso] = useState(null)
  const inputArchivo = useRef(null)

  // Chequeo de coherencia: 4/4/9 kcal por gramo.
  const kcalMacros = redondear(
    (Number(form.proteina_g) || 0) * 4 + (Number(form.carbos_g) || 0) * 4 + (Number(form.grasa_g) || 0) * 9,
  )
  const kcalMeta = Number(form.kcal) || 0
  const descuadre = kcalMeta > 0 ? Math.abs(kcalMacros - kcalMeta) / kcalMeta : 0

  function guardar() {
    db.setMetas(Object.fromEntries(CAMPOS.map((c) => [c.k, Number(form[c.k]) || 0])))
    recargar()
    setAviso({ tipo: 'ok', texto: 'Metas guardadas.' })
  }

  function exportar() {
    const datos = db.exportar()
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
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
      const json = JSON.parse(await archivo.text())
      db.importar(json)
      recargar()
      setAviso({ tipo: 'ok', texto: 'Respaldo importado.' })
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message || 'No se pudo leer el archivo.' })
    }
    evento.target.value = ''
  }

  function borrarTodo() {
    if (!confirm('Esto borra TODO: comidas, alimentos propios y metas. No se puede deshacer.')) return
    db.borrarTodo()
    recargar()
    setAviso({ tipo: 'ok', texto: 'Todo borrado.' })
  }

  const dias = Object.keys(db.getDiario()).length
  const propios = Object.values(db.getCache()).filter((a) => a.fuente === 'propio').length

  return (
    <div className="px-4 pb-6">
      <h2 className="mb-4 text-lg font-semibold">Ajustes</h2>

      <section className="mb-5 rounded-2xl border border-borde bg-panel p-4">
        <h3 className="mb-3 font-medium">Metas diarias</h3>
        {CAMPOS.map((c) => (
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

        <button onClick={guardar} className="w-full rounded-xl bg-kcal py-3.5 font-semibold text-fondo">
          Guardar metas
        </button>
      </section>

      <section className="mb-5 rounded-2xl border border-borde bg-panel p-4">
        <h3 className="mb-1 font-medium">Respaldo</h3>
        <p className="mb-3 text-xs text-tenue">
          Tus datos viven solo en este telefono. Si lo pierdes o borras la app, se pierden. Exporta
          de vez en cuando y guarda el archivo en Drive.
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
          {dias} {dias === 1 ? 'dia registrado' : 'dias registrados'} · {propios} alimentos propios
        </p>
      </section>

      {aviso && (
        <p
          className={`mb-5 rounded-xl px-4 py-3 text-sm ${
            aviso.tipo === 'error' ? 'bg-red-500/15 text-red-300' : 'bg-carb/15 text-carb'
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <button onClick={borrarTodo} className="w-full py-3 text-sm text-red-400">
        Borrar todo
      </button>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-tenue">
        Nutri v1.0 · Alimentos de Open Food Facts y tablas de composicion (USDA / INTA).
        <br />
        Los platos preparados son aproximados. Esto no es consejo medico ni nutricional.
      </p>
    </div>
  )
}

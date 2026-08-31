import { useMemo, useRef, useState } from 'react'
import * as db from '../db.js'
import { getCatalogo, getRecetas, getTablaCL } from '../off.js'
import { redondear } from '../nutricion.js'
import { kcalDeSesion, promedioDiario } from '../ejercicio.js'
import {
  OBJETIVOS, PERFIL_VACIO, REPARTOS, VIDA_DIARIA,
  analizar, perfilCompleto,
} from '../perfil.js'

const CAMPOS_META = [
  { k: 'kcal', label: 'Calorías diarias', sufijo: 'kcal' },
  { k: 'proteina_g', label: 'Proteína', sufijo: 'g' },
  { k: 'carbos_g', label: 'Carbohidratos', sufijo: 'g' },
  { k: 'grasa_g', label: 'Grasa', sufijo: 'g' },
]

export default function Perfil({ metas, recargar }) {
  const [modo, setModo] = useState(() => (db.metasSonAutomaticas() ? 'auto' : 'manual'))
  const [aviso, setAviso] = useState(null)
  const [version, setVersion] = useState(0)

  return (
    <div className="px-4 pb-6">
      <h2 className="mb-4 text-xl font-bold">Perfil</h2>

      <section className="tarjeta mb-4 p-4">
        <h3 className="mb-3 font-semibold">Mis metas</h3>
        <div className="mb-4 flex gap-2 rounded-xl bg-panel2 p-1">
          {[
            { id: 'auto', nombre: 'Calcular por mí' },
            { id: 'manual', nombre: 'Escribirlas yo' },
          ].map((o) => (
            <button
              key={o.id}
              onClick={() => setModo(o.id)}
              className={`flex-1 rounded-lg py-2 text-sm ${
                modo === o.id ? 'bg-acento font-bold text-tinta' : 'text-tenue'
              }`}
            >
              {o.nombre}
            </button>
          ))}
        </div>

        {modo === 'auto' ? (
          <Automatico onGuardado={(t) => { recargar(); setVersion((v) => v + 1); setAviso({ tipo: 'ok', texto: t }) }} />
        ) : (
          <Manual metas={metas} onGuardado={() => { recargar(); setAviso({ tipo: 'ok', texto: 'Metas guardadas.' }) }} />
        )}
      </section>

      <Apariencia />
      <Respaldo version={version} recargar={recargar} setAviso={setAviso} />

      {aviso && (
        <p className={`mb-4 rounded-xl px-4 py-3 text-sm ${
          aviso.tipo === 'error' ? 'bg-gras/15 text-gras' : 'bg-carb/15 text-carb'
        }`}>
          {aviso.texto}
        </p>
      )}

      <button
        onClick={() => {
          if (!confirm('Esto borra TODO: comidas, ejercicio, pesos, medidas y metas. No se puede deshacer.')) return
          db.borrarTodo()
          recargar()
          setVersion((v) => v + 1)
          setAviso({ tipo: 'ok', texto: 'Todo borrado.' })
        }}
        className="w-full py-3 text-sm text-gras"
      >
        Borrar todo
      </button>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-tenue">
        Nutri · versión {__SELLO__} · Alimentos de Open Food Facts, fichas de
        etiqueta de jumbo.cl, tablas de composición (USDA / INTA) y los
        recetarios de la casa.
        <br />
        El gasto calculado es una estimación estadística, no una medición de tu metabolismo.
        <br />
        Esto no es consejo médico ni nutricional.
      </p>
    </div>
  )
}

function Automatico({ onGuardado }) {
  const [p, setP] = useState(() => db.getPerfil() || { ...PERFIL_VACIO, ...pesoInicial() })
  const medidas = useMemo(() => db.getUltimasMedidas() || {}, [])

  // El gasto de ejercicio entra como promedio de los ultimos 7 dias.
  const kcalEjercicio = useMemo(() => {
    const sesiones = db.getEjerciciosDesde(db.sumarDias(db.claveFecha(), -6))
    return promedioDiario(sesiones, Number(p.peso_kg) || 60, 7)
  }, [p.peso_kg])

  const completo = perfilCompleto(p)
  const a = useMemo(
    () => (completo ? analizar(p, medidas, kcalEjercicio) : null),
    [p, medidas, kcalEjercicio, completo],
  )

  const set = (k) => (e) => setP({ ...p, [k]: e.target.value })
  const esDeficit = a && a.objetivo.tipo === 'deficit'

  function guardar() {
    db.setPerfil(p)
    db.setMetas({
      kcal: a.kcal, proteina_g: a.proteina_g, carbos_g: a.carbos_g, grasa_g: a.grasa_g, auto: true,
    })
    onGuardado(`Metas actualizadas: ${a.kcal} kcal al día.`)
  }

  return (
    <>
      <div className="mb-3 flex gap-2">
        {[{ id: 'mujer', nombre: 'Mujer' }, { id: 'hombre', nombre: 'Hombre' }].map((s) => (
          <button
            key={s.id}
            onClick={() => setP({ ...p, sexo: s.id })}
            className={`flex-1 rounded-xl border py-2.5 text-sm ${
              p.sexo === s.id ? 'border-acento bg-chip text-chip-texto' : 'border-borde bg-panel2 text-tenue'
            }`}
          >
            {s.nombre}
          </button>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { k: 'edad', label: 'Edad', sufijo: 'años' },
          { k: 'altura_cm', label: 'Altura', sufijo: 'cm' },
          { k: 'peso_kg', label: 'Peso', sufijo: 'kg' },
        ].map((c) => (
          <label key={c.k} className="text-xs text-tenue">
            {c.label}
            <input
              type="number" inputMode="decimal" min="0"
              value={p[c.k]} onChange={set(c.k)} placeholder={c.sufijo}
              className="mt-1 w-full rounded-xl border border-borde bg-panel2 px-3 py-3 tabular-nums text-texto outline-none focus:border-acento"
            />
          </label>
        ))}
      </div>

      <Selector label="Vida diaria (sin contar el ejercicio)" value={p.vida_diaria} onChange={set('vida_diaria')}
        opciones={VIDA_DIARIA.map((v) => ({ value: v.id, texto: `${v.nombre} — ${v.detalle}` }))} />

      <Selector label="Objetivo" value={p.objetivo} onChange={set('objetivo')}
        opciones={OBJETIVOS.map((o) => ({ value: o.id, texto: `${o.nombre} — ${o.detalle}` }))} />

      {esDeficit && (
        <label className="mb-4 block text-xs text-tenue">
          Qué tan agresivo · <b className="text-acento-texto">{Math.round(a.pctAplicado * 100)} % de déficit</b>
          {' '}(tu tope es {Math.round(a.pctTope * 100)} %)
          <input
            type="range" min="0" max="1" step="0.05"
            value={p.intensidad_deficit}
            onChange={(e) => setP({ ...p, intensidad_deficit: Number(e.target.value) })}
            className="mt-2 w-full accent-[var(--color-acento)]"
          />
          <div className="flex justify-between text-[10px] text-tenue">
            <span>suave</span><span>el máximo que te permite tu grasa</span>
          </div>
        </label>
      )}

      <Selector label="Reparto de macros" value={p.reparto} onChange={set('reparto')}
        opciones={REPARTOS.map((r) => ({
          value: r.id,
          texto: r.id === 'auto' ? `${r.nombre} — ${r.detalle}` : `${r.nombre} — ${r.detalle}`,
        }))} />

      {a ? <Analisis a={a} onGuardar={guardar} /> : (
        <p className="rounded-xl bg-panel2 px-3 py-3 text-center text-xs text-tenue">
          Completa edad, altura y peso para ver el cálculo.
        </p>
      )}
    </>
  )
}

function Analisis({ a, onGuardar }) {
  const esDeficit = a.objetivo.tipo === 'deficit'
  return (
    <>
      <div className="mb-3 space-y-2.5 rounded-2xl bg-panel2 p-3.5">
        <Fila label="Metabolismo basal" valor={`${a.tmb} kcal`} nota={a.metodoTmb} />
        <Fila label={`Vida diaria (x${a.vida.factor})`} valor={`${a.gastoBase} kcal`} />
        <Fila label="Ejercicio (promedio 7 días)" valor={`+${a.ejercicio} kcal`} />
        <div className="border-t border-borde pt-2.5">
          <Fila label="Gasto total del día" valor={`${a.tdee} kcal`} fuerte />
        </div>

        {a.grasaPct != null && (
          <div className="border-t border-borde pt-2.5">
            <Fila label="Grasa corporal" valor={`${String(a.grasaPct).replace('.', ',')} %`} nota={a.tramo?.etiqueta} />
            <Fila label="Masa magra" valor={`${String(a.masaMagra).replace('.', ',')} kg`} />
          </div>
        )}

        <div className="border-t border-borde pt-2.5">
          {esDeficit ? (
            <Fila
              label="Déficit"
              valor={`−${a.deficit} kcal`}
              nota={`${Math.round(a.pctReal * 100)} % de tu gasto · ${String(Math.abs(a.kgSemana)).replace('.', ',')} kg por semana`}
              acento
            />
          ) : a.objetivo.tipo === 'superavit' ? (
            <Fila label="Superávit" valor={`+${Math.abs(a.deficit)} kcal`} acento />
          ) : (
            <Fila label="Sin déficit" valor="comes lo que gastas" />
          )}
        </div>
      </div>

      {a.grasaPct == null && (
        <p className="mb-3 rounded-xl bg-panel2 px-3 py-2.5 text-xs leading-relaxed text-tenue">
          Sin tus medidas uso Mifflin-St Jeor y un déficit conservador del 15 %. Anota cuello,
          cintura y cadera en <b>Progreso → Grasa corporal</b> y el cálculo pasa a Katch-McArdle,
          que le habla a tu músculo y no a tu peso: ahí el déficit se ajusta a lo que tu grasa
          realmente aguanta.
        </p>
      )}

      {a.tramo?.nota && (
        <p className="mb-3 rounded-xl bg-chip px-3 py-2.5 text-xs leading-relaxed text-chip-texto">
          {a.tramo.nota}
        </p>
      )}

      {a.ajustado && (
        <p className="mb-3 rounded-xl bg-panel2 px-3 py-2.5 text-xs leading-relaxed text-tenue">
          Ese objetivo daba menos de {a.piso} kcal, que es tu propio metabolismo basal. La app lo
          subió a ese piso: comer bajo el basal de forma sostenida es justamente lo que te hace
          perder músculo en vez de grasa.
        </p>
      )}

      <div className="mb-3 grid grid-cols-4 gap-2 rounded-2xl bg-panel2 p-3 text-center">
        {[
          ['kcal', a.kcal, 'text-acento-texto'],
          ['prot', a.proteina_g, 'text-prot'],
          ['carbos', a.carbos_g, 'text-carb'],
          ['grasa', a.grasa_g, 'text-gras'],
        ].map(([l, v, c]) => (
          <div key={l}>
            <div className={`text-lg font-bold tabular-nums ${c}`}>{v}</div>
            <div className="text-[10px] text-tenue">{l}</div>
          </div>
        ))}
      </div>

      <p className="mb-3 text-xs leading-relaxed text-tenue">
        <b className="text-texto">{a.reparto.nombre}</b>
        {a.repartoEsAuto && ' (recomendado)'} · proteína calculada sobre tu {a.proteinaBase}.
        <br />
        {a.repartoRecomendado.razon}
      </p>

      <button onClick={onGuardar} className="w-full rounded-xl bg-acento py-3.5 font-bold text-tinta">
        Usar estas metas
      </button>
    </>
  )
}

function Fila({ label, valor, nota, fuerte, acento }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <div className={`text-xs ${fuerte ? 'font-semibold text-texto' : 'text-tenue'}`}>{label}</div>
        {nota && <div className="text-[10px] text-tenue first-letter:uppercase">{nota}</div>}
      </div>
      <span className={`shrink-0 tabular-nums ${
        acento ? 'text-base font-bold text-acento-texto' : fuerte ? 'text-base font-bold' : 'text-sm'
      }`}>
        {valor}
      </span>
    </div>
  )
}

function Selector({ label, value, onChange, opciones }) {
  return (
    <label className="mb-3 block text-xs text-tenue">
      {label}
      <select
        value={value} onChange={onChange}
        className="mt-1 w-full appearance-none rounded-xl border border-borde bg-panel2 px-4 py-3 text-texto outline-none focus:border-acento"
      >
        {opciones.map((o) => <option key={o.value} value={o.value}>{o.texto}</option>)}
      </select>
    </label>
  )
}

function pesoInicial() {
  const u = db.getUltimoPeso()
  return u ? { peso_kg: String(u.kg) } : {}
}

function Manual({ metas, onGuardado }) {
  const [form, setForm] = useState(() => Object.fromEntries(CAMPOS_META.map((c) => [c.k, String(metas[c.k])])))
  const kcalMacros = redondear(
    (Number(form.proteina_g) || 0) * 4 + (Number(form.carbos_g) || 0) * 4 + (Number(form.grasa_g) || 0) * 9,
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
              type="number" inputMode="numeric" min="0"
              value={form[c.k]} onChange={(e) => setForm({ ...form, [c.k]: e.target.value })}
              className="w-full rounded-xl border border-borde bg-panel2 px-4 py-3 pr-14 tabular-nums text-texto outline-none focus:border-acento"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-tenue">{c.sufijo}</span>
          </div>
        </label>
      ))}
      {descuadre > 0.1 && (
        <p className="mb-3 rounded-xl bg-panel2 px-3 py-2 text-xs text-tenue">
          Ojo: esos macros suman {kcalMacros} kcal, no {kcalMeta}. Puedes dejarlo así, pero el
          anillo y las barras no van a cerrar juntos.
        </p>
      )}
      <button
        onClick={() => {
          db.setMetas({ ...Object.fromEntries(CAMPOS_META.map((c) => [c.k, Number(form[c.k]) || 0])), auto: false })
          onGuardado()
        }}
        className="w-full rounded-xl bg-acento py-3.5 font-bold text-tinta"
      >
        Guardar metas
      </button>
    </>
  )
}

function Apariencia() {
  const [tema, setTema] = useState(() => db.getTema())
  return (
    <section className="tarjeta mb-4 p-4">
      <h3 className="mb-3 font-semibold">Apariencia</h3>
      <div className="flex gap-2 rounded-xl bg-panel2 p-1">
        {[{ id: 'claro', nombre: '☀︎ Claro' }, { id: 'oscuro', nombre: '☾ Oscuro' }].map((t) => (
          <button
            key={t.id}
            onClick={() => { db.setTema(t.id); setTema(t.id) }}
            className={`flex-1 rounded-lg py-2 text-sm ${
              tema === t.id ? 'bg-acento font-bold text-tinta' : 'text-tenue'
            }`}
          >
            {t.nombre}
          </button>
        ))}
      </div>
    </section>
  )
}

function Respaldo({ version, recargar, setAviso }) {
  const input = useRef(null)

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

  const stats = useMemo(() => ({
    dias: Object.keys(db.getDiario()).length,
    pesos: Object.keys(db.getPesos()).length,
    sesiones: Object.values(db.getEjercicios()).flat().length,
    propios: Object.values(db.getCache()).filter((x) => x.fuente === 'propio').length,
  }), [version])

  return (
    <section className="tarjeta mb-4 p-4">
      <h3 className="mb-1 font-semibold">Respaldo</h3>
      <p className="mb-3 text-xs leading-relaxed text-tenue">
        Tus datos viven solo en este teléfono. Si lo pierdes o borras la app, se pierden. Exporta de
        vez en cuando y guarda el archivo en Drive.
      </p>
      <div className="flex gap-3">
        <button onClick={exportar} className="flex-1 rounded-xl border border-borde bg-panel2 py-3 text-sm font-semibold">
          Exportar
        </button>
        <button onClick={() => input.current?.click()} className="flex-1 rounded-xl border border-borde bg-panel2 py-3 text-sm font-semibold">
          Importar
        </button>
      </div>
      <input
        ref={input} type="file" accept="application/json,.json" className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          try {
            db.importar(JSON.parse(await f.text()))
            recargar()
            setAviso({ tipo: 'ok', texto: 'Respaldo importado.' })
          } catch (err) {
            setAviso({ tipo: 'error', texto: err.message || 'No se pudo leer el archivo.' })
          }
          e.target.value = ''
        }}
      />
      <p className="mt-3 text-xs leading-relaxed text-tenue">
        En el teléfono, sin internet: {getTablaCL().length} alimentos chilenos,{' '}
        {getRecetas().length} recetas tuyas y {getCatalogo().length.toLocaleString('es-CL')} productos
        de supermercado.
        <br />
        {stats.dias} {stats.dias === 1 ? 'día' : 'días'} de comida · {stats.sesiones} {stats.sesiones === 1 ? 'sesión' : 'sesiones'} · {stats.pesos} {stats.pesos === 1 ? 'pesada' : 'pesadas'} ·{' '}
        {stats.propios} {stats.propios === 1 ? 'alimento propio' : 'alimentos propios'}
      </p>
    </section>
  )
}

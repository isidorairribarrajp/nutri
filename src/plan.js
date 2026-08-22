// Generador de plan de comidas.
//
// Es la funcion estrella de Fitia y funciona asi: se reparten las calorias del
// dia entre las comidas, y para cada comida se buscan combinaciones de la
// despensa que caigan cerca de esa meta sin pasarse de macros.
//
// Dos reglas que hacen la diferencia entre un plan usable y uno de adorno:
//   1. Se arma con lo que Isi YA come: sus recetas, sus favoritos y sus
//      recientes. Un plan con comida que no tiene en la casa no sirve.
//   2. Se penaliza mas quedarse corto de proteina que pasarse de carbos: en
//      deficit la proteina es lo que protege el musculo.

import { redondear } from './nutricion.js'

/** Reparto tipico del dia en Chile: el almuerzo pesa mas que la cena. */
export const REPARTO_DIA = [
  { momento: 'desayuno', pct: 0.22 },
  { momento: 'almuerzo', pct: 0.33 },
  { momento: 'once', pct: 0.15 },
  { momento: 'cena', pct: 0.25 },
  { momento: 'snack', pct: 0.05 },
]

/** Que recetas pegan en que momento del dia. */
const APTOS = {
  desayuno: (a) => a.tipo === 'postre' || enGrupo(a, 'Lacteos', 'Panes', 'Frutas', 'Cereales', 'Huevos', 'Suplementos', 'Frutos secos'),
  once: (a) => a.tipo === 'postre' || enGrupo(a, 'Lacteos', 'Panes', 'Frutas'),
  snack: (a) => a.tipo === 'postre' || enGrupo(a, 'Frutas', 'Frutos secos', 'Lacteos', 'Suplementos'),
  almuerzo: (a) => a.tipo === 'salado' || enGrupo(a, 'Carnes', 'Pescados', 'Legumbres', 'Cereales', 'Verduras', 'Platos', 'Huevos'),
  cena: (a) => a.tipo === 'salado' || enGrupo(a, 'Carnes', 'Pescados', 'Legumbres', 'Verduras', 'Platos', 'Huevos'),
}

const sinTilde = (t) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const enGrupo = (a, ...grupos) => grupos.some((g) => sinTilde(a.grupo) === g)

const gramosDe = (a) => a.porciones?.[0]?.gramos || 100

// Cantidades que una persona sirve de verdad: medias porciones, de 0,5 a 2.
// Sin esto el plan dice "515 g de leche descremada" y nadie se toma medio litro.
const MULTIPLOS = [0.5, 1, 1.5, 2]

function ajustarAPorcion(alimento, gramosIdeales) {
  const gp = gramosDe(alimento)
  let mejorM = MULTIPLOS[0]
  let mejorDif = Infinity
  for (const m of MULTIPLOS) {
    const dif = Math.abs(gp * m - gramosIdeales)
    if (dif < mejorDif) { mejorDif = dif; mejorM = m }
  }
  return { gramos: Math.round(gp * mejorM), multiplo: mejorM }
}

function nutrientes(alimento, gramos) {
  const f = gramos / 100
  const b = alimento.por100g
  return { kcal: b.kcal * f, p: b.p * f, c: b.c * f, g: b.g * f }
}

/**
 * Que tan mal esta una combinacion respecto de la meta de esa comida.
 * Numero mas bajo = mejor. Quedarse corto de proteina pesa el doble.
 */
function castigo(suma, meta) {
  const rel = (v, m) => (m > 0 ? (v - m) / m : 0)
  const dKcal = Math.abs(rel(suma.kcal, meta.kcal))
  const dProt = rel(suma.p, meta.p)
  const dCarb = Math.abs(rel(suma.c, meta.c))
  const dGras = Math.abs(rel(suma.g, meta.g))
  return dKcal * 3 + (dProt < 0 ? -dProt * 2 : dProt * 0.6) + dCarb * 0.5 + dGras * 0.5
}

/**
 * Arma una comida probando combinaciones de 1 a 3 alimentos de la despensa.
 * `rnd` es un generador con semilla: el mismo dia da el mismo plan, y
 * "otra opcion" da otro distinto.
 */
function armarComida(despensa, meta, rnd) {
  if (!despensa.length) return null

  const candidatos = [...despensa]
  let mejor = null

  const evaluar = (items) => {
    // se ajusta la cantidad del ultimo item para acercarse a las kcal objetivo
    const base = items.slice(0, -1)
    const ultimo = items[items.length - 1]
    const sumaBase = base.reduce(
      (a, it) => {
        const n = nutrientes(it.alimento, it.gramos)
        return { kcal: a.kcal + n.kcal, p: a.p + n.p, c: a.c + n.c, g: a.g + n.g }
      },
      { kcal: 0, p: 0, c: 0, g: 0 },
    )
    const faltan = meta.kcal - sumaBase.kcal
    const kcal100 = ultimo.alimento.por100g.kcal || 1
    const gr = ajustarAPorcion(ultimo.alimento, (faltan / kcal100) * 100)
    if (gr.gramos <= 0) return

    const finales = [...base, { ...ultimo, gramos: gr.gramos, multiplo: gr.multiplo }]
    const suma = finales.reduce(
      (a, it) => {
        const n = nutrientes(it.alimento, it.gramos)
        return { kcal: a.kcal + n.kcal, p: a.p + n.p, c: a.c + n.c, g: a.g + n.g }
      },
      { kcal: 0, p: 0, c: 0, g: 0 },
    )
    const puntaje = castigo(suma, meta)
    if (!mejor || puntaje < mejor.puntaje) mejor = { items: finales, suma, puntaje }
  }

  // Se prueban combinaciones al azar en vez de todas: con 150 alimentos, todas
  // las ternas son 3 millones y no vale la pena para lo que mejora.
  const INTENTOS = 400
  for (let i = 0; i < INTENTOS; i++) {
    const n = candidatos.length < 3 ? candidatos.length : 1 + Math.floor(rnd() * 3)
    const elegidos = []
    const usados = new Set()
    for (let k = 0; k < n; k++) {
      let idx
      let vueltas = 0
      do { idx = Math.floor(rnd() * candidatos.length); vueltas++ } while (usados.has(idx) && vueltas < 20)
      usados.add(idx)
      const a = candidatos[idx]
      elegidos.push({ alimento: a, gramos: gramosDe(a), multiplo: 1 })
    }
    evaluar(elegidos)
  }
  return mejor
}

/** "1,5 marraquetas" o "150 g", segun tenga o no porcion casera. */
export function etiquetaItem(item) {
  const porcion = item.alimento.porciones?.[0]
  if (!porcion || !item.multiplo) return `${item.gramos} g`
  const n = String(item.multiplo).replace('.', ',')
  const nombre = porcion.nombre.replace(/^1\s+/, '')
  return `${n} ${nombre}${item.multiplo > 1 && !nombre.endsWith('s') ? 's' : ''} (${item.gramos} g)`
}

/** Generador con semilla: mismo dia, mismo plan. */
function generador(semilla) {
  let s = semilla >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const semillaDe = (txt) => {
  let h = 2166136261
  for (let i = 0; i < txt.length; i++) {
    h ^= txt.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Plan del dia completo.
 * @param despensa alimentos disponibles (recetas + favoritos + recientes + tabla)
 * @param metas    { kcal, proteina_g, carbos_g, grasa_g }
 * @param variante cambia el plan sin cambiar el dia ("otra opcion")
 */
export function generarPlan(despensa, metas, fecha, variante = 0) {
  const rnd = generador(semillaDe(`${fecha}#${variante}`))
  const comidas = []

  for (const r of REPARTO_DIA) {
    const meta = {
      kcal: metas.kcal * r.pct,
      p: metas.proteina_g * r.pct,
      c: metas.carbos_g * r.pct,
      g: metas.grasa_g * r.pct,
    }
    const filtro = APTOS[r.momento]
    const disponibles = despensa.filter((a) => filtro(a) && a.por100g?.kcal > 0)
    const armada = armarComida(disponibles.length ? disponibles : despensa, meta, rnd)
    comidas.push({ momento: r.momento, meta, ...(armada || { items: [], suma: { kcal: 0, p: 0, c: 0, g: 0 } }) })
  }

  const total = comidas.reduce(
    (a, c) => ({
      kcal: a.kcal + c.suma.kcal, p: a.p + c.suma.p,
      c: a.c + c.suma.c, g: a.g + c.suma.g,
    }),
    { kcal: 0, p: 0, c: 0, g: 0 },
  )

  return {
    comidas,
    total: {
      kcal: Math.round(total.kcal),
      p: redondear(total.p, 1),
      c: redondear(total.c, 1),
      g: redondear(total.g, 1),
    },
    // que tan cerca quedo del objetivo, para poder decirlo en pantalla
    ajuste: {
      kcal: Math.round(total.kcal - metas.kcal),
      p: Math.round(total.p - metas.proteina_g),
      c: Math.round(total.c - metas.carbos_g),
      g: Math.round(total.g - metas.grasa_g),
    },
  }
}

// Calculos de porciones y totales. Todo se deriva de "por 100 g".

export const MOMENTOS = [
  { id: 'desayuno', nombre: 'Desayuno', emoji: '☕' },
  { id: 'almuerzo', nombre: 'Almuerzo', emoji: '\u{1F37D}️' },
  { id: 'once', nombre: 'Once', emoji: '\u{1F35E}' },
  { id: 'cena', nombre: 'Cena', emoji: '\u{1F319}' },
  { id: 'snack', nombre: 'Snack', emoji: '\u{1F34E}' },
]

export const MACROS = [
  { id: 'p', nombre: 'Proteina', meta: 'proteina_g', color: 'var(--color-prot)' },
  { id: 'c', nombre: 'Carbos', meta: 'carbos_g', color: 'var(--color-carb)' },
  { id: 'g', nombre: 'Grasa', meta: 'grasa_g', color: 'var(--color-gras)' },
]

export function redondear(n, decimales = 0) {
  const f = 10 ** decimales
  return Math.round((Number(n) || 0) * f) / f
}

/** Nutrientes de `gramos` de un alimento, a partir de sus valores por 100 g. */
export function calcularPorcion(alimento, gramos) {
  const factor = (Number(gramos) || 0) / 100
  const base = alimento?.por100g || {}
  return {
    kcal: redondear((base.kcal || 0) * factor),
    p: redondear((base.p || 0) * factor, 1),
    c: redondear((base.c || 0) * factor, 1),
    g: redondear((base.g || 0) * factor, 1),
  }
}

/** Suma de un arreglo de entradas del diario. */
export function totales(entradas = []) {
  const t = entradas.reduce(
    (acc, e) => ({
      kcal: acc.kcal + (Number(e.kcal) || 0),
      p: acc.p + (Number(e.p) || 0),
      c: acc.c + (Number(e.c) || 0),
      g: acc.g + (Number(e.g) || 0),
    }),
    { kcal: 0, p: 0, c: 0, g: 0 },
  )
  return { kcal: redondear(t.kcal), p: redondear(t.p, 1), c: redondear(t.c, 1), g: redondear(t.g, 1) }
}

export function porMomento(entradas = []) {
  const mapa = Object.fromEntries(MOMENTOS.map((m) => [m.id, []]))
  entradas.forEach((e) => {
    if (mapa[e.momento]) mapa[e.momento].push(e)
    else mapa.snack.push(e)
  })
  return mapa
}

/** Texto de porcion legible: "1 marraqueta (100 g)" o solo "85 g". */
export function etiquetaPorcion(gramos, porcion) {
  if (porcion && porcion.nombre) return `${porcion.nombre} (${redondear(gramos)} g)`
  return `${redondear(gramos)} g`
}

export function formatearFecha(clave) {
  const [y, m, d] = clave.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const dif = Math.round((fecha - hoy) / 86400000)
  if (dif === 0) return 'Hoy'
  if (dif === -1) return 'Ayer'
  if (dif === 1) return 'Manana'
  return fecha.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
}

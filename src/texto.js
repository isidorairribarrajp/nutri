// Registro por texto: "2 huevos", "100g pollo", "media palta", "1 taza de arroz".
//
// No es magia ni IA: es un parser de cantidad + unidad + nombre, y despues una
// busqueda contra lo que ya existe (tabla chilena, recetas, alimentos propios).
// Lo importante es que NUNCA adivine en silencio: cada linea vuelve con lo que
// entendio y con que tan seguro esta, para que Isi lo corrija antes de guardar.

import { normalizar, raiz } from './off.js'

const PALABRAS_NUMERO = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, doce: 12,
  medio: 0.5, media: 0.5, mitad: 0.5,
  cuarto: 0.25,
}

// Unidades de peso directo y sus gramos.
const PESO = { g: 1, gr: 1, grs: 1, gramo: 1, gramos: 1, kg: 1000, kilo: 1000, kilos: 1000, ml: 1, cc: 1, l: 1000, litro: 1000, litros: 1000 }

// Unidades caseras: se resuelven contra las porciones del alimento.
const CASERAS = [
  'taza', 'tazas', 'cucharada', 'cucharadas', 'cda', 'cdas',
  'cucharadita', 'cucharaditas', 'cdta', 'cdtas', 'vaso', 'vasos',
  'plato', 'platos', 'pote', 'potes', 'rebanada', 'rebanadas',
  'trozo', 'trozos', 'unidad', 'unidades', 'porcion', 'porciones',
  'lamina', 'laminas', 'punado', 'punados', 'lata', 'latas',
  'filete', 'filetes', 'bola', 'bolas', 'copa', 'copas',
]

const RUIDO = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'un', 'una'])

function aNumero(txt) {
  const t = normalizar(txt)
  if (PALABRAS_NUMERO[t] != null) return PALABRAS_NUMERO[t]
  const frac = t.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  const mixto = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/)
  if (mixto) return Number(mixto[1]) + Number(mixto[2]) / Number(mixto[3])
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Separa una linea en { cantidad, unidad, nombre }.
 * Acepta "100g pollo", "100 g de pollo", "2 huevos", "media palta",
 * "1 1/2 taza de arroz", y tambien "pollo 100g" (la cantidad al final).
 */
export function parsearLinea(linea) {
  let t = normalizar(linea).replace(/[.;]+$/, '')
  if (!t) return null

  // cantidad pegada a la unidad: "100g" -> "100 g"
  t = t.replace(/(\d)\s*(g|gr|grs|kg|ml|cc|l)\b/g, '$1 $2')

  let cantidad = null
  let unidad = null

  // "pollo 100 g" -> se mueve la cantidad al frente
  const alFinal = t.match(/^(.*?)\s+(\d+[.,]?\d*)\s*(g|gr|grs|kg|ml|cc|l)$/)
  if (alFinal) t = `${alFinal[2]} ${alFinal[3]} ${alFinal[1]}`

  const palabras = t.split(/\s+/)
  let i = 0

  // 1. cantidad (numero, fraccion, "1 1/2", o palabra)
  const mixto = palabras[0] && palabras[1] && aNumero(`${palabras[0]} ${palabras[1]}`)
  if (mixto != null && /\//.test(palabras[1] || '')) {
    cantidad = mixto
    i = 2
  } else {
    const n = aNumero(palabras[0])
    if (n != null) { cantidad = n; i = 1 }
  }

  // 2. unidad
  if (palabras[i]) {
    const u = palabras[i]
    if (PESO[u] != null) { unidad = u; i++ }
    else if (CASERAS.includes(u)) { unidad = u; i++ }
  }

  const nombre = palabras.slice(i).filter((w) => !RUIDO.has(w)).join(' ').trim()
  if (!nombre) return null
  return { cantidad: cantidad ?? 1, unidad, nombre, crudo: linea.trim() }
}

/**
 * Puntaje de coincidencia. Mas alto = mejor.
 *
 * Lo que manda es DONDE calza, no solo si calza: "arroz" tiene que dar
 * "Arroz blanco" y no "Galletas de arroz". Por eso empezar con el termino
 * vale mucho mas que contenerlo en cualquier parte.
 */
const raices = (t) => normalizar(t).split(/\s+/).filter(Boolean).map(raiz)

function puntaje(nombre, alimento) {
  const a = normalizar(alimento.nombre)
  const busqueda = alimento.busqueda || `${a} ${normalizar(alimento.alias || '')}`
  if (a === nombre) return 100

  // se compara por raices para que el plural y el genero no cuenten:
  // "huevos" tiene que valer lo mismo que "huevo".
  const q = raices(nombre)
  const nom = raices(a)
  const todas = raices(busqueda)

  if (q.join(' ') === nom.join(' ')) return 100
  if (nom.slice(0, q.length).join(' ') === q.join(' ')) return 90   // empieza igual
  if (q.every((w) => nom.includes(w))) return 75                     // todas, en cualquier orden
  if (q.every((w) => todas.includes(w))) return 60                   // incluye sinonimos
  if (q.every((w) => todas.some((x) => x.startsWith(w)))) return 45
  if (busqueda.includes(nombre)) return 35
  return 0
}

const RE_ESTADO = /\b(crud|cocid|asad|frit|horno)/

/** ¿El alimento distingue crudo de cocido y Isi no dijo cual? */
function estadoAmbiguo(escrito, alimento, candidatos) {
  if (!RE_ESTADO.test(normalizar(alimento.nombre))) return false
  if (RE_ESTADO.test(normalizar(escrito))) return false
  // solo es ambiguo si de verdad existe la otra version
  return candidatos.some((c) => {
    const n = normalizar(c.alimento.nombre)
    return RE_ESTADO.test(n) && n !== normalizar(alimento.nombre)
  })
}

/** Gramos que corresponden a cantidad + unidad para ese alimento. */
export function resolverGramos(alimento, cantidad, unidad, frase) {
  const porciones = alimento.porciones || []

  // "media palta" YA es el nombre de una porcion (68 g). Si se trata como
  // "0,5 x la porcion" queda en 34 g, que es la mitad de la mitad.
  if (frase) {
    const f = normalizar(frase).replace(/\bde\b/g, '').replace(/\s+/g, ' ').trim()
    const exacta = porciones.find((x) => normalizar(x.nombre).replace(/\s+/g, ' ') === f)
    if (exacta) return { gramos: exacta.gramos, porcion: exacta, seguro: true }
  }

  if (unidad && PESO[unidad] != null) {
    return { gramos: Math.round(cantidad * PESO[unidad]), porcion: null, seguro: true }
  }

  if (unidad) {
    // "1 taza de arroz" -> la porcion del alimento que se llame taza
    const u = unidad.replace(/s$/, '')
    const p = porciones.find((x) => normalizar(x.nombre).includes(u))
    if (p) return { gramos: Math.round(cantidad * p.gramos), porcion: p, seguro: true }
  }

  // sin unidad: "2 huevos" -> dos veces la primera porcion
  if (porciones.length) {
    return { gramos: Math.round(cantidad * porciones[0].gramos), porcion: porciones[0], seguro: !unidad }
  }
  // ni porciones ni unidad conocida: se asume 100 g y se avisa
  return { gramos: Math.round(cantidad * 100), porcion: null, seguro: false }
}

/**
 * Interpreta un bloque de texto (una linea por alimento) contra la despensa.
 * Devuelve una fila por linea, con alternativas para que Isi pueda corregir.
 */
export function interpretar(texto, despensa) {
  return String(texto)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linea) => {
      const p = parsearLinea(linea)
      if (!p) return { crudo: linea, error: 'No entendí esta línea.' }

      const candidatos = despensa
        .map((a) => ({ alimento: a, pts: puntaje(p.nombre, a) }))
        .filter((x) => x.pts > 0)
        .sort((a, b) => b.pts - a.pts || a.alimento.nombre.length - b.alimento.nombre.length)
        .slice(0, 6)

      if (!candidatos.length) {
        return { ...p, error: `No encontré "${p.nombre}".`, alternativas: [] }
      }

      const elegido = candidatos[0]
      const g = resolverGramos(elegido.alimento, p.cantidad, p.unidad, p.crudo)
      // Cuando hay version cruda y cocida y no se dijo cual, la diferencia
      // puede ser de tres veces. Eso no se adivina en silencio.
      const ambiguo = estadoAmbiguo(p.crudo, elegido.alimento, candidatos)
      return {
        ...p,
        alimento: elegido.alimento,
        confianza: elegido.pts,
        dudoso: elegido.pts < 75 || !g.seguro || ambiguo,
        ambiguoEstado: ambiguo,
        ...g,
        alternativas: candidatos.slice(1).map((c) => c.alimento),
      }
    })
}

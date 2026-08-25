// Busqueda de alimentos: tabla chilena local (instantanea, offline) + Open Food Facts (red).
// Si no hay red, la app sigue funcionando con la tabla local y el cache.

import { getCache, guardarAlimento } from './db.js'

const OFF_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const CAMPOS = 'code,product_name,product_name_es,brands,nutriments,serving_size,quantity,image_thumb_url'

let TABLA_CL = null
let RECETAS = null
let CATALOGO = null

/** Quita tildes y baja a minusculas para que "platano" encuentre "plátano". */
export function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export async function cargarTablaCL() {
  if (TABLA_CL) return TABLA_CL
  const res = await fetch(`${import.meta.env.BASE_URL}alimentos-cl.json`)
  const json = await res.json()
  TABLA_CL = json.alimentos.map((a) => ({
    ...a,
    fuente: 'cl',
    busqueda: normalizar(`${a.nombre} ${a.alias || ''} ${a.grupo || ''}`),
  }))
  return TABLA_CL
}

/** Las recetas de los dos recetarios de Isi, como alimentos buscables. */
export async function cargarRecetas() {
  if (RECETAS) return RECETAS
  const res = await fetch(`${import.meta.env.BASE_URL}recetas-cl.json`)
  const json = await res.json()
  const { comoAlimento } = await import('./receta.js')
  RECETAS = json.recetas.map((r) => ({
    ...comoAlimento(r),
    busqueda: normalizar(`${r.nombre} ${r.descripcion} ${r.grupo}`),
  }))
  return RECETAS
}

/**
 * Catalogo de productos chilenos de Open Food Facts, empaquetado con la app.
 * Son miles, asi que se guarda compacto y se carga una sola vez; a cambio,
 * buscar un producto de supermercado deja de necesitar internet.
 */
export async function cargarCatalogo() {
  if (CATALOGO) return CATALOGO
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}off-cl.json`)
    const json = await res.json()
    const base = json.base_imagen || ''
    CATALOGO = json.productos.map((p) => ({
      id: `off-${p.c}`,
      codigo: p.c,
      nombre: p.n,
      marca: p.m || null,
      imagen: p.i ? base + p.i : null,
      por100g: { kcal: p.k, p: p.p, c: p.h, g: p.g },
      porciones: p.s ? [{ nombre: '1 porción', gramos: p.s }] : [],
      fuente: 'off',
      busqueda: normalizar(`${p.n} ${p.m || ''}`),
    }))
  } catch {
    CATALOGO = []   // sin catalogo la app sigue: queda la busqueda en red
  }
  return CATALOGO
}

export const getCatalogo = () => CATALOGO || []

export function buscarCatalogo(termino, limite = 30) {
  if (!CATALOGO || normalizar(termino).length < 2) return []
  const golpes = []
  for (const a of CATALOGO) {
    if (!calza(a.busqueda, termino)) continue
    golpes.push(a)
    if (golpes.length >= limite * 6) break
  }
  return golpes
    .sort((a, b) => relevancia(b, termino) - relevancia(a, termino) || a.nombre.length - b.nombre.length)
    .slice(0, limite)
}

export const getRecetas = () => RECETAS || []
export const getTablaCL = () => TABLA_CL || []

export function buscarRecetas(termino) {
  if (!RECETAS || !normalizar(termino)) return []
  return RECETAS.filter((r) => calza(r.busqueda, termino))
}

/**
 * Un termino calza si TODAS sus palabras aparecen en el alimento.
 * Sin esto "pollo crudo" no encontraba nada, porque se buscaba la frase
 * entera como substring y el alimento se llama "Pechuga de pollo cruda".
 *
 * Ademas se recortan el plural y la vocal de genero de las palabras largas,
 * para que "crudo" encuentre "cruda", "cocidas" encuentre "cocidos" y
 * "huevos" encuentre "huevo". Las palabras cortas se dejan enteras: recortar
 * "pan" o "te" convertiria la busqueda en cualquier cosa.
 */
export function raiz(palabra) {
  let r = palabra
  if (r.length >= 5 && r.endsWith('s')) r = r.slice(0, -1)        // plural
  if (r.length >= 4 && 'aeiou'.includes(r[r.length - 1])) r = r.slice(0, -1)  // genero
  return r
}

export function calza(busqueda, termino) {
  const palabras = normalizar(termino).split(/\s+/).filter(Boolean)
  if (!palabras.length) return false
  return palabras.every((w) => busqueda.includes(raiz(w)))
}

/** Que tan bien calza, para ordenar. Mas alto es mejor. */
function relevancia(alimento, termino) {
  const nombre = normalizar(alimento.nombre)
  const q = normalizar(termino)
  if (nombre === q) return 100
  if (nombre.startsWith(q)) return 80
  if (nombre.includes(q)) return 60
  return 40 - Math.min(nombre.length / 10, 20)
}

/** Busca en la tabla chilena. Prioriza los que empiezan con el termino. */
export function buscarCL(termino) {
  if (!TABLA_CL || !normalizar(termino)) return []
  return TABLA_CL
    .filter((a) => calza(a.busqueda, termino))
    .sort((a, b) => relevancia(b, termino) - relevancia(a, termino) || a.nombre.length - b.nombre.length)
}

/**
 * Todo lo que funciona sin internet, en orden de utilidad:
 * lo que Isi creo, sus recetas, la tabla chilena con porciones caseras, y
 * al final los miles de productos de supermercado.
 */
export function buscarLocal(termino) {
  return [
    ...buscarPropios(termino),
    ...buscarRecetas(termino),
    ...buscarCL(termino),
    ...buscarCatalogo(termino),
  ]
}

/** Busca en los alimentos que Isi creo a mano. */
export function buscarPropios(termino) {
  if (!normalizar(termino)) return []
  return Object.values(getCache())
    .filter((a) => a.fuente === 'propio' && calza(normalizar(a.nombre), termino))
}

function gramosDeServing(texto) {
  if (!texto) return null
  const m = String(texto).match(/([\d.,]+)\s*(g|gr|ml)/i)
  if (!m) return null
  const n = parseFloat(m[1].replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n < 2000 ? Math.round(n) : null
}

function traducirProducto(prod) {
  const n = prod.nutriments || {}
  const kcal = Number(n['energy-kcal_100g'])
  // Sin kcal por 100 g la ficha no sirve: Open Food Facts tiene muchas incompletas.
  if (!Number.isFinite(kcal) || kcal <= 0) return null

  const nombre = (prod.product_name_es || prod.product_name || '').trim()
  if (!nombre) return null

  const porciones = []
  const gServing = gramosDeServing(prod.serving_size)
  if (gServing) porciones.push({ nombre: '1 porción', gramos: gServing })
  const gEnvase = gramosDeServing(prod.quantity)
  if (gEnvase && gEnvase !== gServing) porciones.push({ nombre: 'envase completo', gramos: gEnvase })

  return {
    id: `off-${prod.code}`,
    codigo: String(prod.code),
    nombre,
    marca: (prod.brands || '').split(',')[0].trim() || null,
    imagen: prod.image_thumb_url || null,
    por100g: {
      kcal: Math.round(kcal),
      p: Math.round((Number(n.proteins_100g) || 0) * 10) / 10,
      c: Math.round((Number(n.carbohydrates_100g) || 0) * 10) / 10,
      g: Math.round((Number(n.fat_100g) || 0) * 10) / 10,
    },
    porciones,
    fuente: 'off',
  }
}

let controlador = null

/** Busca en Open Food Facts. Cancela la busqueda anterior. Devuelve [] si no hay red. */
export async function buscarOFF(termino) {
  if (controlador) controlador.abort()
  controlador = new AbortController()
  const params = new URLSearchParams({
    search_terms: termino,
    search_simple: '1',
    action: 'process',
    json: '1',
    fields: CAMPOS,
    page_size: '25',
  })
  try {
    const res = await fetch(`${OFF_URL}?${params}`, { signal: controlador.signal })
    if (!res.ok) return []
    const json = await res.json()
    return (json.products || []).map(traducirProducto).filter(Boolean)
  } catch {
    // AbortError o sin conexion: la UI ya muestra los resultados locales.
    return []
  }
}

/** Deja el alimento en cache para que funcione sin senal la proxima vez. */
export function fijarEnCache(alimento) {
  const { busqueda, ...limpio } = alimento
  return guardarAlimento(limpio)
}

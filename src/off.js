// Busqueda de alimentos: tabla chilena local (instantanea, offline) + Open Food Facts (red).
// Si no hay red, la app sigue funcionando con la tabla local y el cache.

import { getCache, guardarAlimento } from './db.js'

const OFF_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const CAMPOS = 'code,product_name,product_name_es,brands,nutriments,serving_size,quantity'

let TABLA_CL = null

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

/** Busca en la tabla chilena. Prioriza los que empiezan con el termino. */
export function buscarCL(termino) {
  if (!TABLA_CL) return []
  const q = normalizar(termino)
  if (!q) return []
  const golpes = TABLA_CL.filter((a) => a.busqueda.includes(q))
  return golpes.sort((a, b) => {
    const ia = normalizar(a.nombre).startsWith(q) ? 0 : 1
    const ib = normalizar(b.nombre).startsWith(q) ? 0 : 1
    if (ia !== ib) return ia - ib
    return a.nombre.length - b.nombre.length
  })
}

/** Busca en los alimentos que Isi creo a mano. */
export function buscarPropios(termino) {
  const q = normalizar(termino)
  if (!q) return []
  return Object.values(getCache())
    .filter((a) => a.fuente === 'propio' && normalizar(a.nombre).includes(q))
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
  if (gServing) porciones.push({ nombre: '1 porcion', gramos: gServing })
  const gEnvase = gramosDeServing(prod.quantity)
  if (gEnvase && gEnvase !== gServing) porciones.push({ nombre: 'envase completo', gramos: gEnvase })

  return {
    id: `off-${prod.code}`,
    nombre,
    marca: (prod.brands || '').split(',')[0].trim() || null,
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

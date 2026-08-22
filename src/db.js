// Persistencia local. Todo vive en el telefono de Isi: no hay backend ni cuenta.
// La unica red de seguridad contra perder el telefono es exportar() desde Ajustes.

const K = {
  metas: 'nutri:metas',
  diario: 'nutri:diario',
  cache: 'nutri:alimentos_cache',
  recientes: 'nutri:recientes',
  perfil: 'nutri:perfil',
  pesos: 'nutri:pesos',
  medidas: 'nutri:medidas',
  ejercicios: 'nutri:ejercicios',
  agua: 'nutri:agua',
  favoritos: 'nutri:favoritos',
  tema: 'nutri:tema',
}

const METAS_DEFAULT = { kcal: 1800, proteina_g: 120, carbos_g: 180, grasa_g: 60 }
const MAX_RECIENTES = 40

function leer(clave, fallback) {
  try {
    const crudo = localStorage.getItem(clave)
    if (crudo == null) return fallback
    return JSON.parse(crudo)
  } catch {
    return fallback
  }
}

function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
    return true
  } catch (e) {
    // Cuota llena: raro con texto, pero en iOS puede pasar en modo privado.
    console.error('No se pudo guardar', clave, e)
    return false
  }
}

/** Fecha local en formato YYYY-MM-DD (nunca toISOString: eso da UTC y en Chile corre el dia). */
export function claveFecha(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

export function sumarDias(clave, n) {
  const [y, m, d] = clave.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  fecha.setDate(fecha.getDate() + n)
  return claveFecha(fecha)
}

// --- metas ---
export function getMetas() {
  return { ...METAS_DEFAULT, ...leer(K.metas, {}) }
}

export function setMetas(metas) {
  escribir(K.metas, { ...getMetas(), ...metas })
  return getMetas()
}

/**
 * `auto` marca que las metas las calcula el perfil.
 * Mientras este en true, guardar el perfil las reescribe.
 */
export function metasSonAutomaticas() {
  return leer(K.metas, {}).auto === true
}

// --- perfil ---
export function getPerfil() {
  return leer(K.perfil, null)
}

export function setPerfil(perfil) {
  escribir(K.perfil, perfil)
  return perfil
}

// --- peso ---
export function getPesos() {
  return leer(K.pesos, {})
}

/** Un peso por dia: volver a pesarse el mismo dia reemplaza el anterior. */
export function registrarPeso(fecha, kg) {
  const pesos = getPesos()
  pesos[fecha] = Math.round(Number(kg) * 100) / 100
  escribir(K.pesos, pesos)
}

export function borrarPeso(fecha) {
  const pesos = getPesos()
  delete pesos[fecha]
  escribir(K.pesos, pesos)
}

/** Pesos ordenados del mas antiguo al mas nuevo. */
export function getPesosOrdenados() {
  return Object.entries(getPesos())
    .map(([fecha, kg]) => ({ fecha, kg }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export function getUltimoPeso() {
  const lista = getPesosOrdenados()
  return lista.length ? lista[lista.length - 1] : null
}

// --- medidas corporales ---
// Un set de medidas por fecha, igual que el peso.
export function getMedidas() {
  return leer(K.medidas, {})
}

export function registrarMedidas(fecha, medidas) {
  const todas = getMedidas()
  todas[fecha] = { ...(todas[fecha] || {}), ...medidas }
  escribir(K.medidas, todas)
}

export function borrarMedidas(fecha) {
  const todas = getMedidas()
  delete todas[fecha]
  escribir(K.medidas, todas)
}

export function getMedidasOrdenadas() {
  return Object.entries(getMedidas())
    .map(([fecha, m]) => ({ fecha, ...m }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export function getUltimasMedidas() {
  const l = getMedidasOrdenadas()
  return l.length ? l[l.length - 1] : null
}

// --- ejercicio ---
export function getEjercicios() {
  return leer(K.ejercicios, {})
}

export function getEjerciciosDia(fecha) {
  return getEjercicios()[fecha] || []
}

export function agregarEjercicio(fecha, sesion) {
  const todos = getEjercicios()
  const conId = { ...sesion, id: crypto.randomUUID(), ts: Date.now() }
  todos[fecha] = [...(todos[fecha] || []), conId]
  escribir(K.ejercicios, todos)
  return conId
}

export function borrarEjercicio(fecha, id) {
  const todos = getEjercicios()
  const lista = (todos[fecha] || []).filter((e) => e.id !== id)
  if (lista.length) todos[fecha] = lista
  else delete todos[fecha]
  escribir(K.ejercicios, todos)
}

/** Todas las sesiones desde `desde` (inclusive), aplanadas con su fecha. */
export function getEjerciciosDesde(desde) {
  const todos = getEjercicios()
  return Object.entries(todos)
    .filter(([f]) => f >= desde)
    .flatMap(([f, lista]) => lista.map((s) => ({ ...s, fecha: f })))
}

// --- agua ---
export function getAgua(fecha) {
  return leer(K.agua, {})[fecha] || 0
}

export function setAgua(fecha, vasos) {
  const todos = leer(K.agua, {})
  const n = Math.max(0, Math.round(vasos))
  if (n > 0) todos[fecha] = n
  else delete todos[fecha]
  escribir(K.agua, todos)
}

// --- favoritos ---
export function getFavoritos() {
  return leer(K.favoritos, [])
}

export function esFavorito(id) {
  return getFavoritos().includes(id)
}

export function alternarFavorito(id) {
  const f = getFavoritos()
  const nuevo = f.includes(id) ? f.filter((x) => x !== id) : [id, ...f]
  escribir(K.favoritos, nuevo)
  return nuevo.includes(id)
}

// --- tema ---
export function getTema() {
  return leer(K.tema, 'claro')
}

export function setTema(t) {
  escribir(K.tema, t)
  document.documentElement.dataset.tema = t
}

// --- diario ---
export function getDiario() {
  return leer(K.diario, {})
}

export function getDia(fecha) {
  return getDiario()[fecha] || []
}

export function agregarEntrada(fecha, entrada) {
  const diario = getDiario()
  const lista = diario[fecha] || []
  const conId = { ...entrada, id: crypto.randomUUID(), ts: Date.now() }
  diario[fecha] = [...lista, conId]
  escribir(K.diario, diario)
  return conId
}

export function editarEntrada(fecha, id, parche) {
  const diario = getDiario()
  const lista = diario[fecha] || []
  diario[fecha] = lista.map((e) => (e.id === id ? { ...e, ...parche } : e))
  escribir(K.diario, diario)
}

/** Copia todas las comidas de un dia a otro. Es el "repetir día" de Fitia. */
export function copiarDia(desde, hacia, momentos = null) {
  const origen = getDia(desde).filter((e) => !momentos || momentos.includes(e.momento))
  origen.forEach((e) => {
    const { id, ts, ...resto } = e
    agregarEntrada(hacia, resto)
  })
  return origen.length
}

export function borrarEntrada(fecha, id) {
  const diario = getDiario()
  const lista = diario[fecha] || []
  const filtrada = lista.filter((e) => e.id !== id)
  if (filtrada.length) diario[fecha] = filtrada
  else delete diario[fecha]
  escribir(K.diario, diario)
}

// --- cache de alimentos ---
export function getCache() {
  return leer(K.cache, {})
}

export function getAlimento(id) {
  return getCache()[id] || null
}

export function guardarAlimento(alimento) {
  const cache = getCache()
  cache[alimento.id] = alimento
  escribir(K.cache, cache)
  return alimento
}

export function borrarAlimentoPropio(id) {
  const cache = getCache()
  delete cache[id]
  escribir(K.cache, cache)
  escribir(K.recientes, getRecientesIds().filter((x) => x !== id))
}

// --- recientes ---
export function getRecientesIds() {
  return leer(K.recientes, [])
}

export function marcarReciente(id) {
  const previos = getRecientesIds().filter((x) => x !== id)
  escribir(K.recientes, [id, ...previos].slice(0, MAX_RECIENTES))
}

/** Recientes resueltos contra el cache; descarta ids que ya no existen. */
export function getRecientes() {
  const cache = getCache()
  return getRecientesIds()
    .map((id) => cache[id])
    .filter(Boolean)
}

// --- respaldo ---
export function exportar() {
  return {
    app: 'nutri',
    version: 1,
    exportado: new Date().toISOString(),
    metas: getMetas(),
    perfil: getPerfil(),
    pesos: getPesos(),
    medidas: getMedidas(),
    ejercicios: getEjercicios(),
    agua: leer(K.agua, {}),
    favoritos: getFavoritos(),
    diario: getDiario(),
    alimentos_cache: getCache(),
    recientes: getRecientesIds(),
  }
}

export function importar(json) {
  if (!json || json.app !== 'nutri') throw new Error('Este archivo no es un respaldo de Nutri.')
  if (json.metas) escribir(K.metas, json.metas)
  if (json.perfil) escribir(K.perfil, json.perfil)
  if (json.pesos) escribir(K.pesos, json.pesos)
  if (json.medidas) escribir(K.medidas, json.medidas)
  if (json.ejercicios) escribir(K.ejercicios, json.ejercicios)
  if (json.agua) escribir(K.agua, json.agua)
  if (json.favoritos) escribir(K.favoritos, json.favoritos)
  if (json.diario) escribir(K.diario, json.diario)
  if (json.alimentos_cache) escribir(K.cache, json.alimentos_cache)
  if (json.recientes) escribir(K.recientes, json.recientes)
}

export function borrarTodo() {
  Object.values(K).forEach((clave) => localStorage.removeItem(clave))
}

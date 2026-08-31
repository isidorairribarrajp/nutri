// Ciclo menstrual.
//
// La base fisiologica: en la fase lutea y durante la regla el metabolismo
// basal sube de verdad — los estudios miden entre 2,5 % y 11 % de gasto extra
// (unas 100-300 kcal/dia segun la persona). No se puede medir exacto sin
// laboratorio, asi que la app NO toca la meta base: muestra un margen de
// antojo explicito y ensancha el rango del dia hacia arriba. Permiso honesto,
// no numero inventado.
//
// Todo queda en el telefono, como el resto de los datos.

import * as db from './db.js'

/** Margen conservador dentro del rango que miden los estudios. */
export const MARGEN_ANTOJO = 150

const CICLO_MIN = 20
const CICLO_MAX = 45

export const conRegla = (fecha) => db.getRegla()[fecha] === true

export function marcarRegla(fecha, valor = true) {
  db.setRegla(fecha, valor)
}

/** Primeros dias de cada regla: un dia marcado cuyo dia anterior no lo esta. */
export function inicios() {
  const dias = Object.keys(db.getRegla()).sort()
  return dias.filter((f) => !db.getRegla()[db.sumarDias(f, -1)])
}

/**
 * Prediccion de la proxima regla. Necesita al menos dos inicios con una
 * separacion plausible (20-45 dias); usa la mediana de los ciclos.
 */
export function prediccion() {
  const ini = inicios()
  if (ini.length < 2) return null
  const brechas = []
  for (let i = 1; i < ini.length; i++) {
    const dias = Math.round((Date.parse(ini[i]) - Date.parse(ini[i - 1])) / 86400000)
    if (dias >= CICLO_MIN && dias <= CICLO_MAX) brechas.push(dias)
  }
  if (!brechas.length) return null
  brechas.sort((a, b) => a - b)
  const ciclo = brechas[Math.floor(brechas.length / 2)]
  return { ciclo, proxima: db.sumarDias(ini[ini.length - 1], ciclo) }
}

/** ¿Toca sugerir "¿te llego?" este dia? (ventana de -1 a +3 de lo predicho) */
export function enVentana(fecha) {
  if (conRegla(fecha)) return false
  const p = prediccion()
  if (!p) return false
  const dif = Math.round((Date.parse(fecha) - Date.parse(p.proxima)) / 86400000)
  return dif >= -1 && dif <= 3
}

/**
 * El antojo del dia: un postre del recetario de Isi que quepa en el margen.
 * Deterministico por fecha, para que no cambie con cada render.
 */
export function antojoDelDia(fecha, recetas) {
  const candidatos = (recetas || []).filter((r) => {
    if (r.tipo !== 'postre') return false
    const porcion = r.porciones?.[0]
    if (!porcion) return false
    const kcal = Math.round((r.por100g.kcal * porcion.gramos) / 100)
    return kcal > 0 && kcal <= MARGEN_ANTOJO + 70
  })
  if (!candidatos.length) return null
  let h = 0
  for (const c of fecha) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const r = candidatos[h % candidatos.length]
  const porcion = r.porciones[0]
  return {
    nombre: r.nombre,
    porcion: porcion.nombre,
    kcal: Math.round((r.por100g.kcal * porcion.gramos) / 100),
  }
}

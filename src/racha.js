// Racha, rango de calorias y estado de cada dia.
//
// El rango existe porque pegarle al numero exacto es imposible y castigarse por
// 40 kcal no le sirve a nadie. Un +-10 % alrededor de la meta es lo que usan las
// apps serias, y es lo que hace que un dia "bien hecho" se sienta alcanzable.

import * as db from './db.js'
import { totales } from './nutricion.js'

export const HOLGURA = 0.10

export function rangoKcal(meta) {
  const m = Number(meta) || 0
  return { min: Math.round(m * (1 - HOLGURA)), max: Math.round(m * (1 + HOLGURA)) }
}

// Cada estado lleva color Y forma. Solo con color no sirve: el verde de
// "cumplido" y el terracota de "fuera" son practicamente el mismo tono para
// alguien con daltonismo protan, y son justo los dos que significan lo opuesto.
export const ESTADOS = {
  dentro: { id: 'dentro', color: 'var(--color-ok)', forma: 'lleno', nombre: 'Dentro del rango' },
  fuera: { id: 'fuera', color: 'var(--color-gras)', forma: 'anillo', nombre: 'Registrado, fuera del rango' },
  parcial: { id: 'parcial', color: 'var(--color-acento)', forma: 'raya', nombre: 'Registrando' },
  vacio: { id: 'vacio', color: 'var(--color-borde)', forma: 'punto', nombre: 'Sin registro' },
}

/**
 * Estado de un dia.
 * Un dia que todavia esta corriendo no puede estar "fuera" por quedarse corto:
 * son las 11 de la manana, obvio que va bajo. Por eso existe `parcial`.
 */
export function estadoDelDia(fecha, metas) {
  const entradas = db.getDia(fecha)
  if (!entradas.length) return ESTADOS.vacio

  const { kcal } = totales(entradas)
  const { min, max } = rangoKcal(metas.kcal)
  const cerrado = db.estaCerrado(fecha)
  const esHoy = fecha === db.claveFecha()

  if (kcal > max) return ESTADOS.fuera
  if (kcal >= min) return ESTADOS.dentro
  // por debajo del minimo
  if (esHoy && !cerrado) return ESTADOS.parcial
  return ESTADOS.fuera
}

/**
 * Dias seguidos con comida registrada, contando hacia atras.
 * Si hoy todavia no registra nada, la racha no se corta: se mira desde ayer.
 * Cortarla a las 8 de la manana seria injusto y desmotivante.
 */
export function racha(hasta = db.claveFecha()) {
  const diario = db.getDiario()
  let n = 0
  let cursor = (diario[hasta] || []).length ? hasta : db.sumarDias(hasta, -1)
  while ((diario[cursor] || []).length) {
    n++
    cursor = db.sumarDias(cursor, -1)
  }
  return n
}

/** Los 7 dias de la semana de `fecha`, de lunes a domingo. */
export function semanaDe(fecha, metas) {
  const [y, m, d] = fecha.split('-').map(Number)
  const dia = new Date(y, m - 1, d)
  const diaSemana = (dia.getDay() + 6) % 7 // 0 = lunes
  const lunes = db.sumarDias(fecha, -diaSemana)
  const hoy = db.claveFecha()

  return Array.from({ length: 7 }, (_, i) => {
    const f = db.sumarDias(lunes, i)
    return {
      fecha: f,
      letra: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i],
      numero: Number(f.slice(8)),
      esHoy: f === hoy,
      futuro: f > hoy,
      estado: f > hoy ? ESTADOS.vacio : estadoDelDia(f, metas),
    }
  })
}

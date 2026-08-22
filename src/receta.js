// Recetas editables.
//
// Cada receta trae sus ingredientes con peso y composicion, asi que si Isi
// cambia una cantidad, saca algo o cambia cuanto rinde, los macros se vuelven a
// calcular desde los ingredientes. No se toca el archivo original: la edicion
// se guarda aparte y se puede volver a la version del recetario cuando quiera.

import * as db from './db.js'
import { redondear } from './nutricion.js'

/** Suma los ingredientes y reparte por porcion. */
export function recalcular(receta) {
  const usables = (receta.ingredientes || []).filter((i) => i.por100g && i.gramos > 0)
  const total = usables.reduce(
    (a, i) => {
      const f = i.gramos / 100
      return {
        kcal: a.kcal + i.por100g.kcal * f,
        p: a.p + i.por100g.p * f,
        c: a.c + i.por100g.c * f,
        g: a.g + i.por100g.g * f,
        peso: a.peso + i.gramos,
      }
    },
    { kcal: 0, p: 0, c: 0, g: 0, peso: 0 },
  )

  const porciones = Math.max(Number(receta.rinde?.porciones) || 1, 0.5)
  const gramosPorcion = Math.round(total.peso / porciones) || 1

  return {
    porPorcion: {
      kcal: Math.round(total.kcal / porciones),
      p: redondear(total.p / porciones, 1),
      c: redondear(total.c / porciones, 1),
      g: redondear(total.g / porciones, 1),
    },
    gramosPorcion,
    pesoTotal: Math.round(total.peso),
    por100g: {
      kcal: Math.round((total.kcal / total.peso) * 100) || 0,
      p: redondear((total.p / total.peso) * 100, 1) || 0,
      c: redondear((total.c / total.peso) * 100, 1) || 0,
      g: redondear((total.g / total.peso) * 100, 1) || 0,
    },
    ingredientesSinDatos: (receta.ingredientes || []).filter((i) => !i.por100g || !i.gramos),
  }
}

/** La receta con la edicion de Isi encima, si la hay. */
export function conEdicion(receta) {
  const edit = db.getRecetaEditada(receta.id)
  if (!edit) return receta
  return { ...receta, ...edit, editada: true }
}

/** Deja la receta lista para usar como alimento (por100g y porciones frescos). */
export function comoAlimento(receta) {
  const r = conEdicion(receta)
  const calc = recalcular(r)
  // si no se puede recalcular (faltan datos), se respeta lo que trae el archivo
  const por100g = calc.pesoTotal > 0 ? calc.por100g : r.por100g
  const gp = calc.pesoTotal > 0 ? calc.gramosPorcion : r.porciones?.[0]?.gramos || 100
  const unidad = r.porciones?.[0]?.nombre?.replace(/^\d[\d,.]*\s*/, '') || 'porción'
  return {
    ...r,
    por100g,
    porciones: [
      { nombre: `1 ${unidad}`, gramos: gp },
      { nombre: `2 ${unidad}${unidad.endsWith('s') ? '' : 's'}`, gramos: gp * 2 },
    ],
  }
}

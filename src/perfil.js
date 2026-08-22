// Calculo de gasto energetico y reparto de macros.
// Formula Mifflin-St Jeor, que es la que usan las apps serias y la mas validada
// en poblacion general. Es una ESTIMACION: el gasto real varia entre personas.

export const ACTIVIDADES = [
  { id: 'sedentario', nombre: 'Sedentario', detalle: 'Escritorio, poco movimiento', factor: 1.2 },
  { id: 'ligero', nombre: 'Ligero', detalle: 'Ejercicio 1-3 dias por semana', factor: 1.375 },
  { id: 'moderado', nombre: 'Moderado', detalle: 'Ejercicio 3-5 dias por semana', factor: 1.55 },
  { id: 'alto', nombre: 'Alto', detalle: 'Ejercicio 6-7 dias por semana', factor: 1.725 },
  { id: 'muy_alto', nombre: 'Muy alto', detalle: 'Trabajo fisico o dos sesiones al dia', factor: 1.9 },
]

// 1 kg de grasa corporal son ~7700 kcal, o sea 1100 kcal/dia por cada kg semanal.
const KCAL_POR_KG_SEMANAL = 1100

export const OBJETIVOS = [
  { id: 'bajar_075', nombre: 'Bajar 0,75 kg', unidad: 'por semana', kgSemana: -0.75 },
  { id: 'bajar_05', nombre: 'Bajar 0,5 kg', unidad: 'por semana', kgSemana: -0.5 },
  { id: 'bajar_025', nombre: 'Bajar 0,25 kg', unidad: 'por semana', kgSemana: -0.25 },
  { id: 'mantener', nombre: 'Mantener', unidad: 'el peso', kgSemana: 0 },
  { id: 'subir_025', nombre: 'Subir 0,25 kg', unidad: 'por semana', kgSemana: 0.25 },
  { id: 'subir_05', nombre: 'Subir 0,5 kg', unidad: 'por semana', kgSemana: 0.5 },
]

export const REPARTOS = [
  { id: 'equilibrado', nombre: 'Equilibrado', protPorKg: 1.6, pctGrasa: 0.30 },
  { id: 'alta_proteina', nombre: 'Alta proteina', protPorKg: 2.0, pctGrasa: 0.25 },
  { id: 'bajo_carbo', nombre: 'Bajos carbos', protPorKg: 1.8, pctGrasa: 0.45 },
]

// Piso de seguridad. Por debajo de esto es muy dificil cubrir micronutrientes
// sin supervision profesional, asi que la app avisa y no baja mas.
export const PISO_KCAL = { mujer: 1200, hombre: 1500 }

export const PERFIL_VACIO = {
  sexo: 'mujer',
  edad: '',
  altura_cm: '',
  peso_kg: '',
  actividad: 'ligero',
  objetivo: 'mantener',
  reparto: 'equilibrado',
}

export function perfilCompleto(p) {
  return Boolean(p && Number(p.edad) > 0 && Number(p.altura_cm) > 0 && Number(p.peso_kg) > 0)
}

/** Metabolismo basal: lo que gastas existiendo, sin moverte. */
export function calcularTMB({ sexo, edad, altura_cm, peso_kg }) {
  const base = 10 * Number(peso_kg) + 6.25 * Number(altura_cm) - 5 * Number(edad)
  return Math.round(base + (sexo === 'hombre' ? 5 : -161))
}

/** Gasto total: el basal por el factor de actividad. */
export function calcularTDEE(perfil) {
  const act = ACTIVIDADES.find((a) => a.id === perfil.actividad) || ACTIVIDADES[1]
  return Math.round(calcularTMB(perfil) * act.factor)
}

/**
 * Metas diarias a partir del perfil.
 * Devuelve tambien `ajustado` cuando el objetivo choco con el piso de seguridad,
 * para que la UI lo diga en vez de esconderlo.
 */
export function calcularMetas(perfil) {
  const tdee = calcularTDEE(perfil)
  const obj = OBJETIVOS.find((o) => o.id === perfil.objetivo) || OBJETIVOS[3]
  const piso = PISO_KCAL[perfil.sexo] || PISO_KCAL.mujer

  const objetivoCrudo = Math.round(tdee + obj.kgSemana * KCAL_POR_KG_SEMANAL)
  const kcal = Math.max(objetivoCrudo, piso)
  const ajustado = kcal > objetivoCrudo

  const rep = REPARTOS.find((r) => r.id === perfil.reparto) || REPARTOS[0]
  const peso = Number(perfil.peso_kg)

  let proteina_g = Math.round(rep.protPorKg * peso)
  let grasa_g = Math.round((kcal * rep.pctGrasa) / 9)
  let carbos_g = Math.round((kcal - proteina_g * 4 - grasa_g * 9) / 4)

  // Con pocas calorias y mucha grasa los carbos pueden dar negativo:
  // en ese caso se recorta la grasa, no la proteina.
  if (carbos_g < 0) {
    grasa_g = Math.max(Math.round((kcal - proteina_g * 4) / 9), 0)
    carbos_g = 0
  }

  return { kcal, proteina_g, carbos_g, grasa_g, tdee, tmb: calcularTMB(perfil), ajustado, piso }
}

/** Promedio movil para leer la tendencia: el peso diario es puro ruido. */
export function promedioMovil(puntos, ventana = 7) {
  return puntos.map((p, i) => {
    const desde = Math.max(0, i - ventana + 1)
    const trozo = puntos.slice(desde, i + 1)
    const suma = trozo.reduce((a, x) => a + x.kg, 0)
    return { ...p, promedio: Math.round((suma / trozo.length) * 100) / 100 }
  })
}

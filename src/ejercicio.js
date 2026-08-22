// Gasto por sesion de ejercicio.
//
// Dos decisiones que hacen que esto sea preciso y no un numero inflado:
//
// 1. Se cuentan calorias NETAS, no brutas. Un MET incluye lo que gastarias
//    igual sentada, y ese gasto ya esta contado en el metabolismo basal. Sumar
//    las brutas seria contarlo dos veces. Por eso se resta 1 MET.
//        kcal/min = (MET - 1) x 3,5 x peso_kg / 200
//
// 2. La caminata y el trote no usan un MET fijo: usan las ecuaciones de la ACSM,
//    que toman velocidad e inclinacion reales. Caminar a 5 km/h en plano y
//    caminar a 5 km/h al 10 % de inclinacion no son el mismo ejercicio.

/** VO2 (ml/kg/min) caminando, ecuacion ACSM. v en km/h, inclinacion en %. */
export function vo2Caminata(kmh, inclinacionPct) {
  const mMin = (Number(kmh) || 0) * 16.6667
  const grado = (Number(inclinacionPct) || 0) / 100
  return 0.1 * mMin + 1.8 * mMin * grado + 3.5
}

/** VO2 (ml/kg/min) trotando o corriendo, ecuacion ACSM. */
export function vo2Carrera(kmh, inclinacionPct) {
  const mMin = (Number(kmh) || 0) * 16.6667
  const grado = (Number(inclinacionPct) || 0) / 100
  return 0.2 * mMin + 0.9 * mMin * grado + 3.5
}

export const metDeVo2 = (vo2) => vo2 / 3.5

/**
 * Catalogo de ejercicios.
 * Los MET salen del Compendium of Physical Activities (Ainsworth et al.).
 * `parametros` define que le pregunta la app a Isi ademas de los minutos.
 */
export const EJERCICIOS = [
  {
    id: 'pilates',
    nombre: 'Pilates',
    corto: 'Pilates',
    icono: '🧘',
    parametros: ['intensidad'],
    intensidades: [
      { id: 'suave', nombre: 'Suave (mat, estiramiento)', met: 3.0 },
      { id: 'moderado', nombre: 'Moderado (reformer clásico)', met: 4.0 },
      { id: 'fuerte', nombre: 'Fuerte (reformer intenso, sin pausas)', met: 5.0 },
    ],
    nota: 'El Pilates quema menos de lo que parece: es fuerza y control, no cardio. '
      + 'Su valor está en la masa muscular que construye, y esa masa te sube el gasto '
      + 'de todos los días — no en las calorías de la clase.',
  },
  {
    id: 'caminata',
    nombre: 'Caminata',
    corto: 'Caminata',
    icono: '🚶',
    parametros: ['velocidad', 'inclinacion'],
    ecuacion: 'caminata',
    defaults: { velocidad: 5.5, inclinacion: 6 },
    nota: 'La inclinación es lo que cambia el número. A 5,5 km/h, subir de 0 % a 10 % '
      + 'casi duplica el gasto.',
  },
  {
    id: 'trote',
    nombre: 'Trote o carrera',
    corto: 'Trote',
    icono: '🏃',
    parametros: ['velocidad', 'inclinacion'],
    ecuacion: 'carrera',
    defaults: { velocidad: 9, inclinacion: 1 },
  },
  {
    id: 'fuerza',
    nombre: 'Entrenamiento de fuerza',
    corto: 'Fuerza',
    icono: '🏋️',
    parametros: ['intensidad'],
    intensidades: [
      { id: 'suave', nombre: 'Suave (máquinas, pausas largas)', met: 3.5 },
      { id: 'moderado', nombre: 'Moderado (series con descanso normal)', met: 5.0 },
      { id: 'fuerte', nombre: 'Fuerte (pesado o en circuito)', met: 6.0 },
    ],
  },
  {
    id: 'bicicleta',
    nombre: 'Bicicleta',
    corto: 'Bici',
    icono: '🚴',
    parametros: ['intensidad'],
    intensidades: [
      { id: 'suave', nombre: 'Suave (paseo)', met: 4.0 },
      { id: 'moderado', nombre: 'Moderada (estática firme)', met: 6.8 },
      { id: 'fuerte', nombre: 'Fuerte (spinning)', met: 8.5 },
    ],
  },
  {
    id: 'eliptica',
    nombre: 'Elíptica',
    corto: 'Elíptica',
    icono: '🎿',
    parametros: ['intensidad'],
    intensidades: [
      { id: 'suave', nombre: 'Suave', met: 4.6 },
      { id: 'moderado', nombre: 'Moderada', met: 5.0 },
      { id: 'fuerte', nombre: 'Fuerte', met: 7.0 },
    ],
  },
  {
    id: 'hiit',
    nombre: 'HIIT / funcional',
    corto: 'HIIT',
    icono: '⚡',
    parametros: ['intensidad'],
    intensidades: [
      { id: 'moderado', nombre: 'Moderado', met: 6.0 },
      { id: 'fuerte', nombre: 'Fuerte (poco descanso)', met: 8.0 },
    ],
  },
  {
    id: 'natacion',
    nombre: 'Natación',
    corto: 'Natación',
    icono: '🏊',
    parametros: ['intensidad'],
    intensidades: [
      { id: 'suave', nombre: 'Suave', met: 5.8 },
      { id: 'moderado', nombre: 'Moderada', met: 7.0 },
      { id: 'fuerte', nombre: 'Fuerte', met: 9.8 },
    ],
  },
  {
    id: 'yoga',
    nombre: 'Yoga',
    corto: 'Yoga',
    icono: '🕉️',
    parametros: ['intensidad'],
    intensidades: [
      { id: 'suave', nombre: 'Suave (hatha, restaurativo)', met: 2.5 },
      { id: 'moderado', nombre: 'Moderado (vinyasa)', met: 4.0 },
      { id: 'fuerte', nombre: 'Fuerte (power)', met: 5.0 },
    ],
  },
  {
    id: 'baile',
    nombre: 'Baile',
    corto: 'Baile',
    icono: '💃',
    parametros: ['intensidad'],
    intensidades: [
      { id: 'suave', nombre: 'Suave', met: 3.5 },
      { id: 'moderado', nombre: 'Moderado', met: 5.0 },
      { id: 'fuerte', nombre: 'Fuerte', met: 7.3 },
    ],
  },
  {
    id: 'otro',
    nombre: 'Otro',
    corto: 'Otro',
    icono: '✨',
    parametros: ['intensidad'],
    intensidades: [
      { id: 'suave', nombre: 'Suave (puedo conversar)', met: 3.0 },
      { id: 'moderado', nombre: 'Moderado (me cuesta conversar)', met: 5.0 },
      { id: 'fuerte', nombre: 'Fuerte (no puedo conversar)', met: 7.5 },
    ],
  },
]

export const buscarEjercicio = (id) => EJERCICIOS.find((e) => e.id === id) || EJERCICIOS[0]

/** MET de una sesion, ya sea por ecuacion o por intensidad del catalogo. */
export function metDeSesion(sesion) {
  const ej = buscarEjercicio(sesion.ejercicio)
  if (ej.ecuacion === 'caminata') return metDeVo2(vo2Caminata(sesion.velocidad, sesion.inclinacion))
  if (ej.ecuacion === 'carrera') return metDeVo2(vo2Carrera(sesion.velocidad, sesion.inclinacion))
  const i = (ej.intensidades || []).find((x) => x.id === sesion.intensidad)
  return i ? i.met : 3.0
}

/**
 * Calorias NETAS de una sesion.
 * Si Isi anoto las calorias del reloj (`kcal_reloj`), esas mandan: un Garmin
 * mide su frecuencia cardiaca real y le gana a cualquier tabla.
 */
export function kcalDeSesion(sesion, pesoKg) {
  if (Number(sesion.kcal_reloj) > 0) {
    return { kcal: Math.round(Number(sesion.kcal_reloj)), met: metDeSesion(sesion), fuente: 'reloj' }
  }
  const met = metDeSesion(sesion)
  const minutos = Number(sesion.minutos) || 0
  const peso = Number(pesoKg) || 60
  const kcal = Math.max(0, ((met - 1) * 3.5 * peso) / 200) * minutos
  return { kcal: Math.round(kcal), met, fuente: 'estimado' }
}

/** Descripcion corta para la lista: "45 min · 5,5 km/h al 6 %". */
export function resumenSesion(sesion) {
  const ej = buscarEjercicio(sesion.ejercicio)
  const partes = [`${sesion.minutos} min`]
  if (ej.ecuacion) {
    partes.push(`${String(sesion.velocidad).replace('.', ',')} km/h`)
    if (Number(sesion.inclinacion) > 0) partes.push(`${sesion.inclinacion} % de inclinación`)
  } else {
    const i = (ej.intensidades || []).find((x) => x.id === sesion.intensidad)
    if (i) partes.push(i.nombre.split(' (')[0].toLowerCase())
  }
  return partes.join(' · ')
}

/**
 * Promedio diario de ejercicio de los ultimos `dias`.
 * Se usa el promedio y no el gasto de hoy para que la meta del dia no salte
 * 400 kcal segun si toco Pilates o no: se come parejo y el balance cierra en
 * la semana.
 */
export function promedioDiario(sesiones, pesoKg, dias = 7) {
  const total = sesiones.reduce((a, s) => a + kcalDeSesion(s, pesoKg).kcal, 0)
  return Math.round(total / dias)
}

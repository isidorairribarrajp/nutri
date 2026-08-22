// Composicion corporal, gasto energetico y politica de deficit.
//
// El orden importa y es este:
//   1. Si hay medidas, se estima el % de grasa (metodo Navy).
//   2. Con el % de grasa se saca la masa magra y el metabolismo basal sale de
//      Katch-McArdle, que es mas exacto que Mifflin porque le habla al musculo
//      y no al peso total. Sin medidas, se cae a Mifflin-St Jeor.
//   3. El gasto total = basal x factor de vida diaria + el ejercicio registrado.
//      El factor de vida NO incluye el ejercicio planificado: ese se cuenta una
//      sola vez, desde las sesiones reales.
//   4. El deficit maximo lo manda el % de grasa, no las ganas.

import { redondear } from './nutricion.js'

// ── vida diaria (NEAT), sin contar el ejercicio planificado ──────────────────
export const VIDA_DIARIA = [
  { id: 'sentada', nombre: 'Sentada casi todo el día', detalle: 'Escritorio, auto, poco caminar', factor: 1.2 },
  { id: 'liviana', nombre: 'Algo de movimiento', detalle: 'Algunos recados, 6-8 mil pasos', factor: 1.3 },
  { id: 'de_pie', nombre: 'De pie o caminando harto', detalle: 'Trabajo de pie, 10 mil pasos o mas', factor: 1.45 },
  { id: 'fisica', nombre: 'Trabajo fisico', detalle: 'Carga, obra, terreno', factor: 1.6 },
]

// ── objetivos ────────────────────────────────────────────────────────────────
const KCAL_POR_KG_SEMANAL = 1100 // 1 kg de grasa ~ 7700 kcal

export const OBJETIVOS = [
  { id: 'bajar_grasa', nombre: 'Bajar grasa corporal', detalle: 'El déficit lo define tu % de grasa', tipo: 'deficit' },
  { id: 'recomposicion', nombre: 'Recomposición', detalle: 'Mantener peso, cambiar grasa por músculo', tipo: 'mantener' },
  { id: 'mantener', nombre: 'Mantener', detalle: 'Comer lo que gastas', tipo: 'mantener' },
  { id: 'subir_musculo', nombre: 'Subir músculo', detalle: 'Superávit chico y controlado', tipo: 'superavit' },
]

// ── politica de deficit segun % de grasa ────────────────────────────────────
// Mientras menos grasa te queda, mas facil es que el cuerpo saque la energia
// del musculo en vez de la grasa. Por eso el deficit se achica al bajar.
export const TRAMOS_GRASA = {
  mujer: [
    { hasta: 18, pctMax: 0.10, etiqueta: 'muy baja', nota: 'Con esta grasa el margen es minimo: un déficit grande te saca músculo, no grasa.' },
    { hasta: 21, pctMax: 0.13, etiqueta: 'atlética' },
    { hasta: 25, pctMax: 0.17, etiqueta: 'fitness' },
    { hasta: 29, pctMax: 0.20, etiqueta: 'saludable' },
    { hasta: 33, pctMax: 0.22, etiqueta: 'media-alta' },
    { hasta: 100, pctMax: 0.25, etiqueta: 'alta' },
  ],
  hombre: [
    { hasta: 10, pctMax: 0.10, etiqueta: 'muy baja', nota: 'Con esta grasa el margen es minimo: un déficit grande te saca músculo, no grasa.' },
    { hasta: 14, pctMax: 0.13, etiqueta: 'atlética' },
    { hasta: 18, pctMax: 0.17, etiqueta: 'fitness' },
    { hasta: 22, pctMax: 0.20, etiqueta: 'saludable' },
    { hasta: 26, pctMax: 0.22, etiqueta: 'media-alta' },
    { hasta: 100, pctMax: 0.25, etiqueta: 'alta' },
  ],
}

// Sin dato de grasa no se puede afinar, asi que se usa un deficit conservador.
const PCT_DEFICIT_SIN_MEDIDAS = 0.15
const PCT_SUPERAVIT = 0.10

// Piso absoluto: nunca por debajo de esto, aunque el objetivo lo pida.
export const PISO_KCAL = { mujer: 1200, hombre: 1500 }

export const PERFIL_VACIO = {
  sexo: 'mujer',
  edad: '',
  altura_cm: '',
  peso_kg: '',
  vida_diaria: 'liviana',
  objetivo: 'mantener',
  reparto: 'auto',
  intensidad_deficit: 1, // 0 = suave, 1 = el maximo que permite tu grasa
}

export const MEDIDAS_VACIAS = { cuello_cm: '', cintura_cm: '', cadera_cm: '' }

export function perfilCompleto(p) {
  return Boolean(p && Number(p.edad) > 0 && Number(p.altura_cm) > 0 && Number(p.peso_kg) > 0)
}

export function medidasCompletas(m, sexo = 'mujer') {
  if (!m) return false
  const base = Number(m.cuello_cm) > 0 && Number(m.cintura_cm) > 0
  return sexo === 'mujer' ? base && Number(m.cadera_cm) > 0 : base
}

// ── grasa corporal ───────────────────────────────────────────────────────────
/**
 * Metodo Navy, ecuaciones de Hodgdon-Beckett en su forma METRICA.
 *
 * Ojo: la version que circula por internet (163,205 x log10...) esta en
 * PULGADAS. Metiendole centimetros da como 25 puntos de mas. Estas constantes
 * son las que corresponden a medidas en cm.
 *
 * Error tipico de +-3 a 4 puntos contra un DEXA: sirve para la tendencia,
 * no para creerse el decimal.
 */
export function grasaNavy({ sexo, altura_cm }, { cuello_cm, cintura_cm, cadera_cm }) {
  const alt = Number(altura_cm)
  const cuello = Number(cuello_cm)
  const cintura = Number(cintura_cm)
  const cadera = Number(cadera_cm)
  if (!(alt > 0 && cuello > 0 && cintura > 0)) return null

  let pct
  if (sexo === 'hombre') {
    const d = cintura - cuello
    if (d <= 0) return null
    pct = 495 / (1.0324 - 0.19077 * Math.log10(d) + 0.15456 * Math.log10(alt)) - 450
  } else {
    if (!(cadera > 0)) return null
    const d = cintura + cadera - cuello
    if (d <= 0) return null
    pct = 495 / (1.29579 - 0.35004 * Math.log10(d) + 0.22100 * Math.log10(alt)) - 450
  }
  if (!Number.isFinite(pct) || pct <= 3 || pct >= 70) return null
  return redondear(pct, 1)
}

export function tramoGrasa(sexo, pct) {
  const tramos = TRAMOS_GRASA[sexo] || TRAMOS_GRASA.mujer
  return tramos.find((t) => pct < t.hasta) || tramos[tramos.length - 1]
}

// ── metabolismo ──────────────────────────────────────────────────────────────
/** Mifflin-St Jeor: la de siempre, cuando no sabemos el % de grasa. */
export function tmbMifflin({ sexo, edad, altura_cm, peso_kg }) {
  const base = 10 * Number(peso_kg) + 6.25 * Number(altura_cm) - 5 * Number(edad)
  return Math.round(base + (sexo === 'hombre' ? 5 : -161))
}

/** Katch-McArdle: usa masa magra. Mas exacta cuando conocemos la grasa. */
export function tmbKatch(masaMagraKg) {
  return Math.round(370 + 21.6 * Number(masaMagraKg))
}

/**
 * Todo el analisis en un solo objeto: composicion, gasto, deficit y macros.
 * Cada numero viene acompanado de como se obtuvo, para que nada sea magia.
 */
export function analizar(perfil, medidas, kcalEjercicioDiario = 0) {
  const peso = Number(perfil.peso_kg)
  const grasaPct = medidasCompletas(medidas, perfil.sexo) ? grasaNavy(perfil, medidas) : null
  const masaMagra = grasaPct != null ? redondear(peso * (1 - grasaPct / 100), 1) : null
  const masaGrasa = grasaPct != null ? redondear(peso - masaMagra, 1) : null

  const tmb = masaMagra != null ? tmbKatch(masaMagra) : tmbMifflin(perfil)
  const metodoTmb = masaMagra != null ? 'Katch-McArdle (con tu masa magra)' : 'Mifflin-St Jeor (sin medidas)'

  const vida = VIDA_DIARIA.find((v) => v.id === perfil.vida_diaria) || VIDA_DIARIA[1]
  const gastoBase = Math.round(tmb * vida.factor)
  const ejercicio = Math.round(Number(kcalEjercicioDiario) || 0)
  const tdee = gastoBase + ejercicio

  const obj = OBJETIVOS.find((o) => o.id === perfil.objetivo) || OBJETIVOS[2]
  const tramo = grasaPct != null ? tramoGrasa(perfil.sexo, grasaPct) : null

  // cuanto deficit permite tu grasa, y cuanto de ese margen estas usando
  const pctTope = obj.tipo === 'deficit'
    ? (tramo ? tramo.pctMax : PCT_DEFICIT_SIN_MEDIDAS)
    : 0
  const intensidad = Math.min(Math.max(Number(perfil.intensidad_deficit ?? 1), 0), 1)
  const pctAplicado = pctTope * (0.4 + 0.6 * intensidad) // nunca menos del 40 % del tope

  let objetivoCrudo
  if (obj.tipo === 'deficit') objetivoCrudo = Math.round(tdee * (1 - pctAplicado))
  else if (obj.tipo === 'superavit') objetivoCrudo = Math.round(tdee * (1 + PCT_SUPERAVIT))
  else objetivoCrudo = tdee

  // El piso es el mayor entre el minimo absoluto y tu propio basal: comer bajo
  // el basal de forma sostenida es lo que apaga el metabolismo y saca musculo.
  const pisoAbs = PISO_KCAL[perfil.sexo] || PISO_KCAL.mujer
  const piso = obj.tipo === 'deficit' ? Math.max(pisoAbs, tmb) : pisoAbs
  const kcal = Math.max(objetivoCrudo, piso)
  const ajustado = kcal > objetivoCrudo

  const deficit = tdee - kcal // negativo si es superavit
  const pctReal = tdee > 0 ? deficit / tdee : 0
  const kgSemana = redondear((-deficit * 7) / 7700, 2)

  const macros = calcularMacros({
    kcal, peso, masaMagra, reparto: perfil.reparto,
    tipo: obj.tipo, sexo: perfil.sexo, grasaPct,
  })

  return {
    grasaPct, masaMagra, masaGrasa, tramo,
    tmb, metodoTmb, vida, gastoBase, ejercicio, tdee,
    objetivo: obj, pctTope, pctAplicado,
    kcal, objetivoCrudo, piso, ajustado,
    deficit, pctReal, kgSemana,
    ...macros,
  }
}

// ── macros ───────────────────────────────────────────────────────────────────
export const REPARTOS = [
  { id: 'auto', nombre: 'Recomendado', detalle: 'Lo elige la app según tu objetivo y tu grasa' },
  { id: 'alta_proteina', nombre: 'Alta proteína', detalle: 'Para proteger músculo en déficit', protLBM: 2.4, protKg: 2.0, pctGrasa: 0.27 },
  { id: 'equilibrado', nombre: 'Equilibrado', detalle: 'Reparto clasico', protLBM: 2.0, protKg: 1.6, pctGrasa: 0.30 },
  { id: 'bajo_carbo', nombre: 'Bajos carbos', detalle: 'Mas grasa, menos carbo', protLBM: 2.2, protKg: 1.8, pctGrasa: 0.45 },
]

/** Cual reparto recomienda la app, y por que. */
export function repartoRecomendado({ tipo, grasaPct, sexo }) {
  if (tipo === 'deficit') {
    const bajo = sexo === 'hombre' ? 14 : 21
    if (grasaPct != null && grasaPct < bajo) {
      return { id: 'alta_proteina', razon: 'Estás en déficit con poca grasa: la proteína alta es lo que evita que bajes músculo en vez de grasa.' }
    }
    return { id: 'alta_proteina', razon: 'En déficit, la proteína alta protege el músculo y además es lo que más llena.' }
  }
  if (tipo === 'superavit') {
    return { id: 'equilibrado', razon: 'Para subir músculo los carbos son el combustible del entrenamiento.' }
  }
  return { id: 'equilibrado', razon: 'Sin déficit ni superávit, el reparto clasico es el mas fácil de sostener.' }
}

function calcularMacros({ kcal, peso, masaMagra, reparto, tipo, sexo, grasaPct }) {
  const rec = repartoRecomendado({ tipo, grasaPct, sexo })
  const idFinal = !reparto || reparto === 'auto' ? rec.id : reparto
  const r = REPARTOS.find((x) => x.id === idFinal) || REPARTOS[2]

  // Con masa magra conocida la proteína se calcula sobre el músculo, no sobre
  // el peso total: es lo correcto, y mas si hay grasa que perder.
  let proteina_g = masaMagra != null
    ? Math.round(r.protLBM * masaMagra)
    : Math.round(r.protKg * peso)
  let grasa_g = Math.round((kcal * r.pctGrasa) / 9)
  let carbos_g = Math.round((kcal - proteina_g * 4 - grasa_g * 9) / 4)

  if (carbos_g < 0) {
    grasa_g = Math.max(Math.round((kcal - proteina_g * 4) / 9), 0)
    carbos_g = 0
  }

  return {
    proteina_g, carbos_g, grasa_g,
    reparto: r, repartoRecomendado: rec, repartoEsAuto: !reparto || reparto === 'auto',
    proteinaBase: masaMagra != null ? 'masa magra' : 'peso corporal',
  }
}

// ── como medirse ─────────────────────────────────────────────────────────────
export const COMO_MEDIRSE = {
  intro: 'Con una huincha de costura, en ayunas, sin ropa apretada y sin apretar la huincha: '
    + 'tiene que quedar plana sobre la piel, no marcarla. Siempre a la misma hora y el mismo día de la semana.',
  puntos: [
    {
      id: 'cuello_cm',
      nombre: 'Cuello',
      como: 'Justo debajo de la nuez, con la huincha levemente inclinada hacia abajo adelante. '
        + 'Hombros relajados, sin encogerlos.',
    },
    {
      id: 'cintura_cm',
      nombre: 'Cintura',
      como: 'En la parte mas angosta del torso, normalmente sobre el ombligo. Al final de una '
        + 'espiracion normal, sin meter la guata.',
    },
    {
      id: 'cadera_cm',
      nombre: 'Cadera',
      como: 'En la parte mas ancha del poto, con los pies juntos.',
      soloMujer: true,
    },
  ],
  precision: 'La huincha te da un número con un error de 3 a 4 puntos contra un DEXA. '
    + 'Eso NO importa para lo que sirve: lo que importa es que midas siempre igual, porque '
    + 'la tendencia si es confiable. Si quieres el número exacto, un DEXA o un InBody lo dan; '
    + 'las balanzas de bioimpedancia de casa varian mucho con cuánta agua tienes encima.',
}

/** Promedio movil para leer la tendencia: la medicion diaria es puro ruido. */
export function promedioMovil(puntos, ventana = 7) {
  return puntos.map((p, i) => {
    const trozo = puntos.slice(Math.max(0, i - ventana + 1), i + 1)
    const suma = trozo.reduce((a, x) => a + x.kg, 0)
    return { ...p, promedio: redondear(suma / trozo.length, 2) }
  })
}

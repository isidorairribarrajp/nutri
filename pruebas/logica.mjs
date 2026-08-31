// Los cálculos: composición corporal, ejercicio, racha, recetas.
import { ck, cerrar, datos, montarLocalStorage, seccion, src } from './_ayuda.mjs'
montarLocalStorage()

const db = await src('db.js')
const P = await src('perfil.js')
const E = await src('ejercicio.js')
const R = await src('racha.js')
const REC = await src('receta.js')
const { MOMENTOS } = await src('nutricion.js')

seccion('grasa corporal (Navy métrico)')
const perfil = { sexo: 'mujer', edad: 30, altura_cm: 165, peso_kg: 58, vida_diaria: 'liviana', objetivo: 'bajar_grasa', reparto: 'auto', intensidad_deficit: 1 }
const med = { cuello_cm: 32, cintura_cm: 70, cadera_cm: 95 }
const esperado = 495 / (1.29579 - 0.35004 * Math.log10(133) + 0.221 * Math.log10(165)) - 450
const got = P.grasaNavy(perfil, med)
// la fórmula que circula está en PULGADAS: con cm daba 51 % donde van 25
ck('usa Hodgdon-Beckett métrico, no la de pulgadas', Math.abs(got - esperado) < 0.06 && got < 30, `${got} %`)
ck('sin cadera no calcula en mujer', P.grasaNavy(perfil, { cuello_cm: 32, cintura_cm: 70 }) === null)
ck('medidas imposibles devuelven null', P.grasaNavy(perfil, { cuello_cm: 80, cintura_cm: 60, cadera_cm: 60 }) === null)

seccion('metabolismo y déficit')
const a = P.analizar(perfil, med, 0)
ck('con medidas usa Katch-McArdle', a.metodoTmb.startsWith('Katch'))
ck('sin medidas cae a Mifflin', P.analizar(perfil, {}, 0).metodoTmb.startsWith('Mifflin'))
ck('masa grasa + magra = peso', Math.abs(a.masaMagra + a.masaGrasa - 58) < 0.2)
ck('el déficit no supera el tope del tramo', a.pctReal <= a.tramo.pctMax + 0.001, `${(a.pctReal * 100).toFixed(1)} % vs tope ${a.tramo.pctMax * 100} %`)
ck('nunca come bajo su propio basal', a.kcal >= a.tmb, `${a.kcal} vs ${a.tmb}`)
const flaca = P.analizar({ ...perfil, peso_kg: 50 }, { cuello_cm: 29, cintura_cm: 58, cadera_cm: 84 }, 0)
ck('con poca grasa el tope baja a 10 %', flaca.tramo.pctMax <= 0.1, `${flaca.grasaPct} % → ${flaca.tramo.etiqueta}`)
ck('y explica por qué', !!flaca.tramo.nota)
ck('mantener no deja déficit', Math.abs(P.analizar({ ...perfil, objetivo: 'mantener' }, med, 0).deficit) < 1)
const suma = a.proteina_g * 4 + a.carbos_g * 4 + a.grasa_g * 9
ck('los macros cuadran con las kcal', Math.abs(suma - a.kcal) <= 8)
ck('la proteína se calcula sobre masa magra', a.proteinaBase === 'masa magra')

seccion('ejercicio')
ck('ACSM caminata plana', Math.abs(E.metDeVo2(E.vo2Caminata(5, 0)) - 3.38) < 0.03)
const plano = E.kcalDeSesion({ ejercicio: 'caminata', minutos: 45, velocidad: 5.5, inclinacion: 0 }, 58)
const cuesta = E.kcalDeSesion({ ejercicio: 'caminata', minutos: 45, velocidad: 5.5, inclinacion: 10 }, 58)
ck('la inclinación casi triplica el gasto', cuesta.kcal > plano.kcal * 1.8, `${plano.kcal} → ${cuesta.kcal} kcal`)
const pil = E.kcalDeSesion({ ejercicio: 'pilates', minutos: 50, intensidad: 'fuerte' }, 58)
ck('pilates fuerte da una cifra realista', pil.kcal > 150 && pil.kcal < 250, `${pil.kcal} kcal`)
ck('cuenta netas, no brutas', pil.kcal < Math.round((5 * 3.5 * 58 / 200) * 50))
ck('el dato del reloj manda', E.kcalDeSesion({ ejercicio: 'pilates', minutos: 50, intensidad: 'fuerte', kcal_reloj: 312 }, 58).fuente === 'reloj')

seccion('racha y rango')
const HOY = db.claveFecha()
const metas = { kcal: 1500, proteina_g: 110, carbos_g: 160, grasa_g: 50 }
const comer = (f, kcal) => db.agregarEntrada(f, { alimento_id: 'x', nombre: 'T', momento: 'almuerzo', gramos: 100, kcal, p: 1, c: 1, g: 1 })
const r = R.rangoKcal(1490)
ck('el rango es ±10 %', r.min === 1341 && r.max === 1639)
comer(HOY, 300)
ck('hoy con poco es "registrando", no fallo', R.estadoDelDia(HOY, metas).id === 'parcial')
db.cerrarDia(HOY)
ck('al terminar el día ese mismo poco sí es fuera', R.estadoDelDia(HOY, metas).id === 'fuera')
db.cerrarDia(HOY, false)
for (let i = 1; i <= 4; i++) comer(db.sumarDias(HOY, -i), 1500)
ck('la racha cuenta los días seguidos', R.racha(HOY) === 5, `${R.racha(HOY)}`)
db.borrarEntrada(HOY, db.getDia(HOY)[0].id)
ck('hoy sin registrar todavía no corta la racha', R.racha(HOY) === 4)
const sem = R.semanaDe(HOY, metas)
ck('la semana va de lunes a domingo', sem.length === 7 && sem[0].letra === 'L' && sem[6].letra === 'D')
ck('cada estado tiene forma además de color', Object.values(R.ESTADOS).every((e) => e.forma))

seccion('comidas del día')
ck('la merienda está entre desayuno y almuerzo',
  MOMENTOS.map((m) => m.id).join(',').includes('desayuno,merienda,almuerzo'),
  MOMENTOS.map((m) => m.id).join(' · '))

seccion('recetas editables')
const pizza = datos('recetas-cl.json').recetas.find((x) => x.nombre.includes('Pizza de masa de avena'))
const base = REC.recalcular(pizza)
ck('el recálculo coincide con lo exportado', Math.abs(base.porPorcion.kcal - pizza.kcal_calculadas) <= 2)
const doble = REC.recalcular({ ...pizza, ingredientes: pizza.ingredientes.map((i) => (/harina de avena/i.test(i.nombre || '') ? { ...i, gramos: i.gramos * 2 } : i)) })
ck('duplicar un ingrediente sube las kcal', doble.porPorcion.kcal > base.porPorcion.kcal, `${base.porPorcion.kcal} → ${doble.porPorcion.kcal}`)
const enCuatro = REC.recalcular({ ...pizza, rinde: { ...pizza.rinde, porciones: 4 } })
ck('cortar en 4 en vez de 8 duplica la porción', Math.abs(enCuatro.porPorcion.kcal - base.porPorcion.kcal * 2) <= 2)
db.guardarRecetaEditada(pizza.id, { rinde: { porciones: 4, unidad: 'trozos' } })
ck('la edición se aplica sin tocar el original', REC.conEdicion(pizza).rinde.porciones === 4 && pizza.rinde.porciones === 8)
db.restaurarReceta(pizza.id)
ck('restaurar vuelve al recetario', REC.conEdicion(pizza).rinde.porciones === 8)
ck('rinde 0 no divide por cero', Number.isFinite(REC.recalcular({ ingredientes: pizza.ingredientes, rinde: { porciones: 0 } }).porPorcion.kcal))

seccion('respaldo')
db.setPerfil(perfil)
db.registrarMedidas(HOY, med)
db.agregarEjercicio(HOY, { ejercicio: 'pilates', minutos: 50, intensidad: 'fuerte' })
db.setRepetida('desayuno', [{ alimento_id: 'a', nombre: 'Avena', momento: 'desayuno', gramos: 40, kcal: 156, p: 7, c: 27, g: 3 }])
const resp = JSON.parse(JSON.stringify(db.exportar()))
db.borrarTodo()
ck('borrar todo deja limpio', db.getPerfil() === null && db.getPesosOrdenados().length === 0)
db.importar(resp)
ck('el respaldo restaura todo', !!db.getPerfil() && db.getEjerciciosDia(HOY).length === 1 && !!db.getRepetidas().desayuno)
db.borrarTodo()
db.importar({ app: 'nutri', version: 1, metas: { kcal: 1600 }, diario: {} })
ck('un respaldo viejo sigue sirviendo', db.getMetas().kcal === 1600)

cerrar()

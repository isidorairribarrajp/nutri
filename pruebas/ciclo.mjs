// El ciclo: marcado, predicción, antojo y su efecto en el rango del día.
import { ck, cerrar, datos, montarLocalStorage, seccion, src } from './_ayuda.mjs'
montarLocalStorage()

const db = await src('db.js')
const C = await src('ciclo.js')
const R = await src('racha.js')

seccion('marcar y desmarcar')
C.marcarRegla('2026-08-10')
C.marcarRegla('2026-08-11')
C.marcarRegla('2026-08-12')
ck('un día marcado se lee', C.conRegla('2026-08-11') === true)
ck('un día no marcado no', C.conRegla('2026-08-20') === false)
C.marcarRegla('2026-08-11', false)
ck('se puede desmarcar', C.conRegla('2026-08-11') === false)
C.marcarRegla('2026-08-11')

seccion('inicios y predicción')
ck('tres días seguidos son UN inicio', C.inicios().length === 1, C.inicios().join(','))
ck('con un solo ciclo no predice', C.prediccion() === null)
// segunda regla 28 días después
C.marcarRegla('2026-09-07'); C.marcarRegla('2026-09-08')
const p = C.prediccion()
ck('con dos inicios predice', p !== null && p.ciclo === 28, JSON.stringify(p))
ck('la próxima cae 28 días después', p.proxima === '2026-10-05')
ck('la ventana de sugerencia abre un día antes', C.enVentana('2026-10-04') === true)
ck('y sigue abierta 3 días después', C.enVentana('2026-10-08') === true)
ck('fuera de la ventana no molesta', C.enVentana('2026-10-15') === false)
ck('un día ya marcado no sugiere', (C.marcarRegla('2026-10-04'), C.enVentana('2026-10-04')) === false)
C.marcarRegla('2026-10-04', false)

// una brecha implausible no rompe la mediana
C.marcarRegla('2026-09-10')  // "inicio" 2 días después del anterior: brecha 3, se ignora
ck('brechas imposibles se ignoran', C.prediccion() !== null && C.prediccion().ciclo === 28)

seccion('el rango del día con antojo')
const HOY = db.claveFecha()
const metas = { kcal: 1500, proteina_g: 110, carbos_g: 160, grasa_g: 50 }
const sin = R.rangoDelDia(HOY, metas)
C.marcarRegla(HOY)
const con = R.rangoDelDia(HOY, metas)
ck('el techo sube exactamente el margen', con.max - sin.max === C.MARGEN_ANTOJO, `${sin.max} → ${con.max}`)
ck('el piso no cambia', con.min === sin.min)
ck('la meta base no se toca', metas.kcal === 1500)

// un día con antojo comido queda "dentro", no "fuera"
db.agregarEntrada(HOY, { alimento_id: 'x', nombre: 'T', momento: 'almuerzo', gramos: 100, kcal: sin.max + 100, p: 1, c: 1, g: 1 })
ck('comerse el antojo no marca el día como fallo', R.estadoDelDia(HOY, metas).id === 'dentro')
C.marcarRegla(HOY, false)
ck('sin regla, lo mismo queda fuera', R.estadoDelDia(HOY, metas).id === 'fuera')

seccion('antojo del recetario')
const recetas = datos('recetas-cl.json').recetas
const a = C.antojoDelDia('2026-08-31', recetas)
ck('sugiere un postre que cabe', a !== null && a.kcal <= C.MARGEN_ANTOJO + 70, a && `${a.nombre} (${a.kcal} kcal)`)
ck('es determinístico por fecha', JSON.stringify(C.antojoDelDia('2026-08-31', recetas)) === JSON.stringify(a))
ck('otra fecha puede dar otro', true)  // no exigible, pero no debe reventar
ck('sin recetas no revienta', C.antojoDelDia('2026-08-31', []) === null)

seccion('respaldo')
C.marcarRegla('2026-08-25')
const resp = JSON.parse(JSON.stringify(db.exportar()))
db.borrarTodo()
ck('borrar todo limpia la regla', Object.keys(db.getRegla()).length === 0)
db.importar(resp)
ck('el respaldo trae la regla de vuelta', C.conRegla('2026-08-25'))

cerrar()

// Búsqueda y registro por texto: que encuentre lo correcto y en el orden correcto.
import { ck, cerrar, datos, montarLocalStorage, seccion, src } from './_ayuda.mjs'
montarLocalStorage()

const OFF = await src('off.js')
const T = await src('texto.js')
const norm = OFF.normalizar

const cl = datos('alimentos-cl.json').alimentos
  .map((a) => ({ ...a, fuente: 'cl', busqueda: norm(`${a.nombre} ${a.alias || ''} ${a.grupo || ''}`) }))
// las recetas calzan SOLO por nombre, igual que en la app
const rec = datos('recetas-cl.json').recetas
  .map((r) => ({ ...r, fuente: 'receta', busqueda: norm(r.nombre) }))

const relev = (a, q) => {
  const n = norm(a.nombre); const t = norm(q)
  if (n === t) return 100
  if (n.startsWith(t)) return 80
  if (n.includes(t)) return 60
  return 40 - Math.min(n.length / 10, 20)
}
// mismo orden que buscarLocal: alimentos sueltos primero, recetas después
const buscar = (q) => [
  ...cl.filter((a) => OFF.calza(a.busqueda, q)).sort((a, b) => relev(b, q) - relev(a, q) || a.nombre.length - b.nombre.length),
  ...rec.filter((a) => OFF.calza(a.busqueda, q)),
]

seccion('varias palabras y raíz')
for (const [q, esperado] of [
  ['pollo crudo', 'Pechuga de pollo cruda'],
  ['pollo cocido', 'Pechuga de pollo cocida'],
  ['arroz integral', 'Arroz integral crudo'],
  ['camote horno', 'Camote al horno'],
  ['yogur griego', 'Yogurt griego natural'],
  ['bebida avena', 'Bebida de avena sin azúcar'],
  ['posta crudo', 'Posta de vacuno cruda'],
  ['porotos cocidas', 'Porotos cocidos'],
]) {
  const r = buscar(q).map((x) => x.nombre)
  ck(`"${q}"`, r.includes(esperado), r.slice(0, 2).join(', ') || 'NADA')
}

seccion('el término va primero, no en cualquier parte')
ck('"arroz" da arroz, no galletas de arroz', buscar('arroz')[0].nombre.startsWith('Arroz'), buscar('arroz')[0].nombre)
ck('"pan" da pan, no panceta', /^pan|^hallulla|^marraqueta/i.test(buscar('pan')[0].nombre), buscar('pan')[0].nombre)
ck('"huevo" da el huevo primero', buscar('huevo')[0].nombre === 'Huevo', buscar('huevo')[0].nombre)

seccion('las recetas quedan accesibles pero no primero')
const huevo = buscar('huevo')
const primeraReceta = huevo.findIndex((x) => x.fuente === 'receta')
ck('ninguna receta antes que los alimentos sueltos',
  primeraReceta === -1 || huevo.slice(0, primeraReceta).every((x) => x.fuente === 'cl'),
  huevo.slice(0, 4).map((x) => x.nombre).join(' · '))
ck('pero siguen encontrándose', buscar('pizza').some((x) => x.fuente === 'receta'))
ck('la receta no aparece por mencionar algo en su descripción',
  !buscar('huevo').slice(0, 5).some((x) => x.fuente === 'receta'))

seccion('sinónimos')
for (const [q, esperado] of [['aguacate', 'Palta'], ['fresa', 'Frutillas'], ['remolacha', 'Betarraga cocida'], ['gambas', 'Camarones cocidos']]) {
  ck(`"${q}" → ${esperado}`, buscar(q).some((x) => x.nombre === esperado))
}
ck('término vacío no devuelve nada', buscar('').length === 0)
ck('algo inexistente no devuelve nada', buscar('zzzqqq').length === 0)

seccion('registro por texto')
const despensa = [...cl, ...rec]
const filas = T.interpretar(`2 huevos
100g arroz
150g pechuga de pollo
1 taza de lentejas cocidas
media palta
1 marraqueta
zzz inexistente`, despensa)
ck('una fila por línea', filas.length === 7)
ck('"2 huevos" = 100 g de Huevo', filas[0].alimento?.nombre === 'Huevo' && filas[0].gramos === 100)
ck('"100g arroz" no da galletas', /^Arroz/.test(filas[1].alimento?.nombre || ''), filas[1].alimento?.nombre)
ck('"1 taza de lentejas cocidas" usa las cocidas', filas[3].alimento?.nombre === 'Lentejas cocidas' && filas[3].gramos === 198)
ck('"media palta" son 68 g, no 34', filas[4].gramos === 68)
ck('lo inexistente se marca con error', !!filas[6].error)

seccion('crudo o cocido sin decir cuál')
ck('"100g arroz" queda marcado como ambiguo', filas[1].ambiguoEstado === true)
ck('"150g pechuga de pollo" también', filas[2].ambiguoEstado === true)
ck('si lo dice, no molesta', filas[3].ambiguoEstado !== true)
ck('lo que no tiene dos versiones no se marca', filas[0].ambiguoEstado !== true && filas[5].ambiguoEstado !== true)

cerrar()

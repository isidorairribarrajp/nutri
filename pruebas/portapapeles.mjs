// Copiar y pegar una comida.
import { ck, cerrar, montarLocalStorage, seccion, src } from './_ayuda.mjs'
montarLocalStorage()
const db = await src('db.js')

const HOY = db.claveFecha()
const AYER = db.sumarDias(HOY, -1)
const comer = (f, momento, nombre, kcal) =>
  db.agregarEntrada(f, { alimento_id: 'x-' + nombre, nombre, momento, gramos: 100, kcal, p: 10, c: 20, g: 5, etiqueta_porcion: '100 g' })

seccion('copiar')
comer(AYER, 'almuerzo', 'Pollo', 300)
comer(AYER, 'almuerzo', 'Arroz', 200)
comer(AYER, 'cena', 'Sopa', 150)
ck('copiar una comida devuelve cuántos lleva', db.copiarComida(AYER, 'almuerzo') === 2)
const p = db.getPortapapeles()
ck('el portapapeles guarda origen y entradas', p.origen.momento === 'almuerzo' && p.entradas.length === 2)
ck('las entradas van sin id ni ts', p.entradas.every((e) => !('id' in e) && !('ts' in e)))
ck('una comida vacía no copia', db.copiarComida(AYER, 'merienda') === 0)
ck('y no pisa lo ya copiado', db.getPortapapeles().origen.momento === 'almuerzo')

seccion('pegar')
ck('pegar devuelve cuántos puso', db.pegarComida(HOY, 'cena') === 2)
const cena = db.getDia(HOY).filter((e) => e.momento === 'cena')
ck('lo pegado cae en la comida DESTINO', cena.length === 2 && cena.every((e) => e.momento === 'cena'))
ck('con ids nuevos', cena.every((e) => e.id && e.ts))
ck('el original de ayer queda intacto', db.getDia(AYER).filter((e) => e.momento === 'almuerzo').length === 2)
db.pegarComida(HOY, 'cena')
ck('pegar dos veces duplica (decisión de Isi, no bug)', db.getDia(HOY).filter((e) => e.momento === 'cena').length === 4)
ck('se puede pegar en otro día y otra comida', (db.pegarComida(db.sumarDias(HOY, -3), 'desayuno'), db.getDia(db.sumarDias(HOY, -3)).length === 2))

seccion('persistencia')
ck('el portapapeles vive en localStorage (sobrevive recargas)', JSON.parse(localStorage.getItem('nutri:portapapeles')).entradas.length === 2)
const resp = db.exportar()
ck('pero NO viaja en el respaldo', !('portapapeles' in resp))
db.borrarTodo()
ck('borrar todo también lo limpia', db.getPortapapeles() === null)

cerrar()

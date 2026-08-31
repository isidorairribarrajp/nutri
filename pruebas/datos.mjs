// La tabla de alimentos y las recetas: que no tengan huecos ni incoherencias.
import { ck, cerrar, datos, seccion } from './_ayuda.mjs'

const cl = datos('alimentos-cl.json').alimentos
const rec = datos('recetas-cl.json').recetas
const off = datos('off-cl.json').productos

seccion('tabla chilena')
ck('hay una cantidad razonable de alimentos', cl.length >= 250, `${cl.length}`)
const ids = new Set()
const dup = cl.filter((a) => (ids.has(a.id) ? true : (ids.add(a.id), false)))
ck('sin ids duplicados', dup.length === 0, dup.map((a) => a.id).join(', '))
ck('todos tienen porciones', cl.every((a) => a.porciones?.length))
ck('todos tienen los 4 macros', cl.every((a) => ['kcal', 'p', 'c', 'g'].every((k) => k in a.por100g)))
ck('sin porciones absurdas', cl.every((a) => a.porciones.every((p) => p.gramos > 0 && p.gramos <= 1200)))

// El alcohol y la fibra rompen la regla 4/4/9 con razon; el resto no deberia.
const EXCEPCIONES = ['Cerveza', 'Pisco', 'Vino tinto', 'Cacao amargo en polvo', 'Canela', 'Limón']
const incoherentes = cl.filter((a) => {
  const b = a.por100g
  const calc = b.p * 4 + b.c * 4 + b.g * 9
  return b.kcal > 25 && Math.abs(calc - b.kcal) / b.kcal > 0.28 && !EXCEPCIONES.includes(a.nombre)
})
ck('las kcal cuadran con los macros', incoherentes.length === 0, incoherentes.map((a) => a.nombre).join(', '))

seccion('crudo vs cocido')
const RE = /\b(crud|cocid|asad|frit|horno|ahumad|lata)/i
const carnes = cl.filter((a) => ['Carnes', 'Pescados'].includes(a.grupo))
const PROCESADOS = ['Arrollado huaso', 'Chorizo', 'Jamón de pavo', 'Longaniza', 'Prieta', 'Salchicha de pavo', 'Vienesa']
const sinEstado = carnes.filter((a) => !RE.test(a.nombre) && !PROCESADOS.includes(a.nombre))
ck('toda carne o pescado dice en qué estado está', sinEstado.length === 0, sinEstado.map((a) => a.nombre).join(', '))

const pares = {}
for (const a of cl) {
  const m = a.nombre.match(/^(.+?) (crud[ao]s?|cocid[ao]s?)$/)
  if (m) (pares[m[1]] ??= {})[m[2].slice(0, 4)] = a.por100g.kcal
}
const completos = Object.entries(pares).filter(([, v]) => v.crud && v.coci)
ck('hay pares crudo/cocido', completos.length >= 15, `${completos.length} pares`)
// los granos y legumbres BAJAN al cocerse (absorben agua); las carnes SUBEN
const granos = ['Arroz blanco', 'Lentejas', 'Porotos', 'Fideos', 'Garbanzos', 'Quinoa']
ck('granos y legumbres bajan al cocerse',
  granos.every((g) => !pares[g] || pares[g].coci < pares[g].crud),
  granos.filter((g) => pares[g]).map((g) => `${g} ${pares[g].crud}→${pares[g].coci}`).join(' · '))
const carnesPar = ['Posta de vacuno', 'Merluza', 'Salmón', 'Lomo de cerdo']
ck('las carnes suben al cocerse',
  carnesPar.every((c) => !pares[c] || pares[c].coci > pares[c].crud))

seccion('camote')
const camote = cl.filter((a) => /camote/i.test(a.nombre))
ck('está el camote en varias formas', camote.length >= 3, camote.map((a) => a.nombre).join(', '))

seccion('recetas')
ck('están las 45 recetas', rec.length >= 44, `${rec.length}`)
ck('todas traen ingredientes estructurados', rec.every((r) => r.ingredientes?.length))
ck('todas se pueden recalcular', rec.every((r) => r.ingredientes.some((i) => i.por100g && i.gramos > 0)))

seccion('catálogo de supermercado')
ck('hay miles de productos', off.length >= 3000, `${off.length}`)
// 0 kcal es legitimo (Coca Zero, te, endulzantes); lo raro es negativo o >900
ck('todos con kcal plausibles', off.every((p) => p.k >= 0 && p.k <= 900))
ck('ninguno se llama solo con números', off.every((p) => /[a-zA-ZáéíóúñÁÉÍÓÚÑ]{3}/.test(p.n)))
ck('la mayoría trae foto', off.filter((p) => p.i).length / off.length > 0.6,
  `${off.filter((p) => p.i).length}/${off.length}`)

cerrar()

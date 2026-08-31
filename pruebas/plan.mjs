// El generador de plan del día.
import { ck, cerrar, datos, montarLocalStorage, seccion, src } from './_ayuda.mjs'
montarLocalStorage()
const P = await src('plan.js')

const despensa = [...datos('recetas-cl.json').recetas, ...datos('alimentos-cl.json').alimentos]
const metas = { kcal: 1506, proteina_g: 106, carbos_g: 169, grasa_g: 45 }
const plan = P.generarPlan(despensa, metas, '2026-08-30', 0)

seccion('estructura')
ck('el reparto suma 100 %', Math.abs(P.REPARTO_DIA.reduce((a, r) => a + r.pct, 0) - 1) < 0.001)
ck('genera las seis comidas', plan.comidas.length === 6, plan.comidas.map((c) => c.momento).join(' · '))
ck('incluye la merienda', plan.comidas.some((c) => c.momento === 'merienda'))
ck('todas traen algo', plan.comidas.every((c) => c.items.length > 0))

seccion('cuadra con la meta')
ck('las kcal quedan a menos de 10 %', Math.abs(plan.ajuste.kcal) / metas.kcal < 0.1,
  `${plan.total.kcal} vs ${metas.kcal} (${plan.ajuste.kcal >= 0 ? '+' : ''}${plan.ajuste.kcal})`)
ck('la proteína no queda corta', plan.total.p >= metas.proteina_g * 0.8, `${plan.total.p} g`)
ck('el desayuno pesa menos que el almuerzo',
  plan.comidas.find((c) => c.momento === 'desayuno').suma.kcal < plan.comidas.find((c) => c.momento === 'almuerzo').suma.kcal)
ck('la merienda es liviana',
  plan.comidas.find((c) => c.momento === 'merienda').suma.kcal < plan.comidas.find((c) => c.momento === 'almuerzo').suma.kcal)

seccion('porciones realistas')
const items = plan.comidas.flatMap((c) => c.items)
ck('sin porciones absurdas', items.every((i) => i.gramos >= 10 && i.gramos <= 600),
  items.filter((i) => i.gramos < 10 || i.gramos > 600).map((i) => `${i.alimento.nombre} ${i.gramos}g`).join(', '))
ck('las cantidades son medias porciones', items.every((i) => [0.5, 1, 1.5, 2].includes(i.multiplo)))

seccion('determinismo')
ck('el mismo día da el mismo plan',
  JSON.stringify(P.generarPlan(despensa, metas, '2026-08-30', 0).total) === JSON.stringify(plan.total))
ck('"otra opción" da otro plan',
  JSON.stringify(P.generarPlan(despensa, metas, '2026-08-30', 1).total) !== JSON.stringify(plan.total))
ck('otro día da otro plan',
  JSON.stringify(P.generarPlan(despensa, metas, '2026-08-31', 0).total) !== JSON.stringify(plan.total))

seccion('robustez')
ck('no revienta con despensa vacía', (() => { try { P.generarPlan([], metas, '2026-08-30'); return true } catch { return false } })())
ck('no revienta con un solo alimento', (() => { try { P.generarPlan([despensa[0]], metas, '2026-08-30'); return true } catch { return false } })())

console.log('\n  plan de ejemplo:')
for (const c of plan.comidas) {
  console.log(`    ${c.momento.padEnd(9)} ${String(Math.round(c.suma.kcal)).padStart(4)} kcal · ${c.items.map((i) => P.etiquetaItem(i) + ' de ' + i.alimento.nombre).join(' + ').slice(0, 90)}`)
}
cerrar()

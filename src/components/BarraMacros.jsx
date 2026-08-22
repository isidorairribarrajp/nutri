import { MACROS, redondear } from '../nutricion.js'

/** Barras de macro. Cada una va con su nombre al lado: la identidad nunca
 *  depende solo del color. */
export default function BarraMacros({ totales, metas }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {MACROS.map((m) => {
        const valor = totales[m.id] || 0
        const meta = metas[m.meta] || 0
        const pct = meta > 0 ? Math.min((valor / meta) * 100, 100) : 0
        const pasado = meta > 0 && valor > meta
        return (
          <div key={m.id} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: m.color }} />
              <span className="truncate text-xs text-tenue">{m.nombre}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-borde">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: m.color, transition: 'width 400ms ease' }}
              />
            </div>
            <span className="text-xs tabular-nums">
              <span className={pasado ? 'text-gras' : ''}>{redondear(valor)}</span>
              <span className="text-tenue"> / {redondear(meta)} g</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

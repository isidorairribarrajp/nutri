import { MACROS, redondear } from '../nutricion.js'

export default function BarraMacros({ totales, metas }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {MACROS.map((m) => {
        const valor = totales[m.id] || 0
        const meta = metas[m.meta] || 0
        const pct = meta > 0 ? Math.min((valor / meta) * 100, 100) : 0
        return (
          <div key={m.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-tenue">{m.nombre}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-borde">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: m.color, transition: 'width 400ms ease' }}
              />
            </div>
            <span className="text-xs tabular-nums text-texto">
              {redondear(valor)}
              <span className="text-tenue"> / {redondear(meta)} g</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

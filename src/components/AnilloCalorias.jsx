import { redondear } from '../nutricion.js'

/** Anillo de progreso de calorias. SVG puro, sin librerias. */
export default function AnilloCalorias({ consumidas, meta }) {
  const R = 78
  const circunferencia = 2 * Math.PI * R
  const pct = meta > 0 ? Math.min(consumidas / meta, 1) : 0
  const restantes = redondear(meta - consumidas)
  const excedida = consumidas > meta

  return (
    <div className="relative flex items-center justify-center">
      <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--color-borde)" strokeWidth="14" />
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke={excedida ? '#ef4444' : 'var(--color-kcal)'}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 400ms ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-semibold tabular-nums">{redondear(consumidas)}</span>
        <span className="text-xs text-tenue">de {redondear(meta)} kcal</span>
        <span className={`mt-1 text-sm font-medium ${excedida ? 'text-red-400' : 'text-kcal'}`}>
          {excedida ? `${Math.abs(restantes)} de mas` : `quedan ${restantes}`}
        </span>
      </div>
    </div>
  )
}

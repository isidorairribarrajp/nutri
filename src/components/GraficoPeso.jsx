import { useMemo } from 'react'
import { promedioMovil } from '../perfil.js'

const ANCHO = 340
const ALTO = 170
const M = { arriba: 12, abajo: 22, izq: 34, der: 8 }

function aDias(clave) {
  const [y, m, d] = clave.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86400000
}

/**
 * Peso en el tiempo. El eje X respeta los dias reales, no el indice:
 * si Isi no se pesa por dos semanas, el hueco se ve.
 */
export default function GraficoPeso({ pesos }) {
  const datos = useMemo(() => promedioMovil(pesos, 7), [pesos])

  if (datos.length < 2) {
    return (
      <div className="flex h-[170px] items-center justify-center text-center text-sm text-tenue">
        {datos.length === 0
          ? 'Registra tu peso para ver la tendencia.'
          : 'Con un solo registro no hay tendencia todavia. Pesate de nuevo en unos dias.'}
      </div>
    )
  }

  const x0 = aDias(datos[0].fecha)
  const x1 = aDias(datos[datos.length - 1].fecha)
  const spanX = Math.max(x1 - x0, 1)

  const valores = datos.flatMap((d) => [d.kg, d.promedio])
  let min = Math.min(...valores)
  let max = Math.max(...valores)
  const margen = Math.max((max - min) * 0.15, 0.5) // si el peso es plano igual se ve la linea
  min -= margen
  max += margen
  const spanY = max - min

  const px = (f) => M.izq + ((aDias(f) - x0) / spanX) * (ANCHO - M.izq - M.der)
  const py = (kg) => M.arriba + (1 - (kg - min) / spanY) * (ALTO - M.arriba - M.abajo)

  const linea = (campo) =>
    datos.map((d, i) => `${i ? 'L' : 'M'}${px(d.fecha).toFixed(1)},${py(d[campo]).toFixed(1)}`).join(' ')

  const ticks = [max, (max + min) / 2, min]
  const primero = datos[0]
  const ultimo = datos[datos.length - 1]
  const cambio = Math.round((ultimo.promedio - primero.promedio) * 10) / 10

  return (
    <div>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full" role="img" aria-label="Peso en el tiempo">
        {ticks.map((t, i) => {
          const y = py(t)
          return (
            <g key={i}>
              <line x1={M.izq} x2={ANCHO - M.der} y1={y} y2={y} stroke="var(--color-borde)" strokeWidth="1" />
              <text x={M.izq - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill="var(--color-tenue)">
                {t.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* pesadas sueltas, tenues: son ruido */}
        <path d={linea('kg')} fill="none" stroke="var(--color-borde)" strokeWidth="1.5" />
        {datos.map((d) => (
          <circle key={d.fecha} cx={px(d.fecha)} cy={py(d.kg)} r="2" fill="var(--color-borde)" />
        ))}

        {/* la tendencia, que es lo que importa */}
        <path
          d={linea('promedio')}
          fill="none"
          stroke="var(--color-prot)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <text x={M.izq} y={ALTO - 6} fontSize="9" fill="var(--color-tenue)">
          {primero.fecha.slice(5).replace('-', '/')}
        </text>
        <text x={ANCHO - M.der} y={ALTO - 6} textAnchor="end" fontSize="9" fill="var(--color-tenue)">
          {ultimo.fecha.slice(5).replace('-', '/')}
        </text>
      </svg>

      <p className="mt-1 text-center text-xs text-tenue">
        Linea azul: promedio de 7 dias.{' '}
        <span className="text-texto">
          {cambio === 0 ? 'Sin cambio' : `${cambio > 0 ? '+' : ''}${cambio} kg`}
        </span>{' '}
        en la tendencia.
      </p>
    </div>
  )
}

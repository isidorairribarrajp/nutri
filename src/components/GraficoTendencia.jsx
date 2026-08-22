import { useMemo } from 'react'
import { promedioMovil } from '../perfil.js'

const ANCHO = 340
const ALTO = 168
const M = { arriba: 12, abajo: 22, izq: 36, der: 8 }

const aDias = (clave) => {
  const [y, m, d] = clave.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86400000
}

/**
 * Serie en el tiempo con su promedio movil.
 * El eje X respeta los dias reales, no el indice: si Isi deja de medirse dos
 * semanas, el hueco se ve en vez de disimularse.
 */
export default function GraficoTendencia({ puntos, color, unidad = 'kg', ventana = 7, vacio }) {
  const datos = useMemo(() => promedioMovil(puntos, ventana), [puntos, ventana])

  if (datos.length < 2) {
    return (
      <div className="flex h-[168px] items-center justify-center px-6 text-center text-sm text-tenue">
        {datos.length === 0 ? vacio : 'Con un solo registro no hay tendencia. Vuelve a medirte en unos días.'}
      </div>
    )
  }

  const x0 = aDias(datos[0].fecha)
  const spanX = Math.max(aDias(datos[datos.length - 1].fecha) - x0, 1)

  const valores = datos.flatMap((d) => [d.kg, d.promedio])
  let min = Math.min(...valores)
  let max = Math.max(...valores)
  const margen = Math.max((max - min) * 0.15, 0.4)
  min -= margen
  max += margen
  const spanY = max - min

  const px = (f) => M.izq + ((aDias(f) - x0) / spanX) * (ANCHO - M.izq - M.der)
  const py = (v) => M.arriba + (1 - (v - min) / spanY) * (ALTO - M.arriba - M.abajo)
  const linea = (campo) =>
    datos.map((d, i) => `${i ? 'L' : 'M'}${px(d.fecha).toFixed(1)},${py(d[campo]).toFixed(1)}`).join(' ')

  const cambio = Math.round((datos[datos.length - 1].promedio - datos[0].promedio) * 10) / 10

  return (
    <div>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full" role="img" aria-label={`Tendencia en ${unidad}`}>
        {[max, (max + min) / 2, min].map((t, i) => (
          <g key={i}>
            <line x1={M.izq} x2={ANCHO - M.der} y1={py(t)} y2={py(t)} stroke="var(--color-borde)" strokeWidth="1" />
            <text x={M.izq - 6} y={py(t) + 3.5} textAnchor="end" fontSize="9" fill="var(--color-tenue)">
              {t.toFixed(1)}
            </text>
          </g>
        ))}

        {/* mediciones sueltas, tenues: son ruido */}
        <path d={linea('kg')} fill="none" stroke="var(--color-borde)" strokeWidth="1.5" />
        {datos.map((d) => (
          <circle key={d.fecha} cx={px(d.fecha)} cy={py(d.kg)} r="2.2" fill="var(--color-borde)" />
        ))}

        {/* la tendencia, que es lo unico que se puede leer */}
        <path d={linea('promedio')} fill="none" stroke={color} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />

        <text x={M.izq} y={ALTO - 6} fontSize="9" fill="var(--color-tenue)">
          {datos[0].fecha.slice(5).replace('-', '/')}
        </text>
        <text x={ANCHO - M.der} y={ALTO - 6} textAnchor="end" fontSize="9" fill="var(--color-tenue)">
          {datos[datos.length - 1].fecha.slice(5).replace('-', '/')}
        </text>
      </svg>

      <p className="mt-1 text-center text-xs text-tenue">
        Línea de color: promedio de {ventana} días.{' '}
        <span className="font-semibold text-texto">
          {cambio === 0 ? 'Sin cambio' : `${cambio > 0 ? '+' : ''}${String(cambio).replace('.', ',')} ${unidad}`}
        </span>{' '}
        en la tendencia.
      </p>
    </div>
  )
}

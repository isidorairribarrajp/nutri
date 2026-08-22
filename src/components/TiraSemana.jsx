/**
 * La semana de un vistazo: un punto por dia con su estado.
 * El color no va solo: cada dia lleva su letra y su numero, y el punto tiene
 * un title para que se pueda leer sin depender del color.
 */
import { ESTADOS } from '../racha.js'

/** La forma distingue el estado aunque el color no se vea. */
function Marca({ estado }) {
  const c = estado.color
  if (estado.forma === 'anillo') {
    return <span className="h-2 w-2 rounded-full border-2" style={{ borderColor: c }} aria-hidden="true" />
  }
  if (estado.forma === 'raya') {
    return <span className="h-[3px] w-2.5 rounded-full" style={{ background: c }} aria-hidden="true" />
  }
  if (estado.forma === 'punto') {
    return <span className="h-1 w-1 rounded-full" style={{ background: c }} aria-hidden="true" />
  }
  return <span className="h-2 w-2 rounded-full" style={{ background: c }} aria-hidden="true" />
}

export default function TiraSemana({ dias, onElegir }) {
  return (
    <div className="mb-4 flex justify-between gap-1">
      {dias.map((d) => (
        <button
          key={d.fecha}
          onClick={() => !d.futuro && onElegir(d.fecha)}
          disabled={d.futuro}
          title={`${d.fecha}: ${d.estado.nombre}`}
          className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 disabled:opacity-35 ${
            d.esHoy ? 'bg-chip' : ''
          }`}
        >
          <span className={`text-[10px] ${d.esHoy ? 'font-bold text-chip-texto' : 'text-tenue'}`}>
            {d.letra}
          </span>
          <span className={`text-sm tabular-nums ${d.esHoy ? 'font-bold text-chip-texto' : ''}`}>
            {d.numero}
          </span>
          <Marca estado={d.estado} />
        </button>
      ))}
    </div>
  )
}

export function LeyendaSemana() {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-tenue">
      {['dentro', 'fuera', 'parcial'].map((k) => (
        <span key={k} className="flex items-center gap-1">
          <Marca estado={ESTADOS[k]} />
          {ESTADOS[k].nombre.toLowerCase()}
        </span>
      ))}
    </div>
  )
}

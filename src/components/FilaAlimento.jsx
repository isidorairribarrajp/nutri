import { redondear } from '../nutricion.js'

const ETIQUETA_FUENTE = { cl: 'Chile', off: 'Open Food Facts', propio: 'Mio' }

/** Fila de resultado de busqueda. */
export function FilaResultado({ alimento, onClick }) {
  const { kcal, p, c, g } = alimento.por100g
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-borde px-4 py-3 text-left active:bg-panel2"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] leading-tight">{alimento.nombre}</div>
        <div className="mt-0.5 truncate text-xs text-tenue">
          {alimento.marca ? `${alimento.marca} · ` : ''}
          {kcal} kcal · P {p} · C {c} · G {g} <span className="opacity-70">/100 g</span>
        </div>
      </div>
      <span className="shrink-0 rounded-full border border-borde px-2 py-0.5 text-[10px] text-tenue">
        {ETIQUETA_FUENTE[alimento.fuente] || ''}
      </span>
    </button>
  )
}

/** Fila de una entrada ya registrada en el diario. */
export function FilaEntrada({ entrada, onEditar, onBorrar }) {
  return (
    <div className="flex items-center gap-2 py-2.5">
      <button onClick={onEditar} className="min-w-0 flex-1 text-left">
        <div className="truncate text-[15px] leading-tight">{entrada.nombre}</div>
        <div className="mt-0.5 text-xs text-tenue">
          {entrada.etiqueta_porcion} · P {entrada.p} · C {entrada.c} · G {entrada.g}
        </div>
      </button>
      <span className="shrink-0 tabular-nums text-sm text-kcal">{redondear(entrada.kcal)}</span>
      <button
        onClick={onBorrar}
        aria-label="Borrar"
        className="shrink-0 px-2 py-1 text-lg leading-none text-tenue active:text-red-400"
      >
        ×
      </button>
    </div>
  )
}

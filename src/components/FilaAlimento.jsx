import { redondear } from '../nutricion.js'

const ETIQUETA_FUENTE = {
  cl: 'Chile',
  off: 'Open Food Facts',
  propio: 'Mío',
  receta: 'Mi recetario',
}

export function FilaResultado({ alimento, onClick, favorito, onFavorito }) {
  const { kcal, p, c, g } = alimento.por100g
  return (
    <div className="flex w-full items-center border-b border-borde active:bg-panel2">
      <button onClick={onClick} className="min-w-0 flex-1 px-4 py-3 text-left">
        <div className="truncate text-[15px] font-medium leading-tight">{alimento.nombre}</div>
        <div className="mt-0.5 truncate text-xs text-tenue">
          {alimento.marca ? `${alimento.marca} · ` : ''}
          {kcal} kcal · P {p} · C {c} · G {g} <span className="opacity-70">/100 g</span>
        </div>
        <span className="pildora mt-1.5">{ETIQUETA_FUENTE[alimento.fuente] || ''}</span>
      </button>
      {onFavorito && (
        <button
          onClick={onFavorito}
          aria-label={favorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          className={`shrink-0 px-3 py-4 text-lg ${favorito ? 'text-acento' : 'text-tenue opacity-50'}`}
        >
          {favorito ? '♥' : '♡'}
        </button>
      )}
    </div>
  )
}

export function FilaEntrada({ entrada, onEditar, onBorrar }) {
  return (
    <div className="flex items-center gap-2 py-2.5">
      <button onClick={onEditar} className="min-w-0 flex-1 text-left">
        <div className="truncate text-[15px] leading-tight">{entrada.nombre}</div>
        <div className="mt-0.5 truncate text-xs text-tenue">
          {entrada.etiqueta_porcion} · P {entrada.p} · C {entrada.c} · G {entrada.g}
        </div>
      </button>
      <span className="shrink-0 tabular-nums text-sm font-semibold">{redondear(entrada.kcal)}</span>
      <button
        onClick={onBorrar}
        aria-label="Borrar"
        className="shrink-0 px-2 py-1 text-lg leading-none text-tenue active:text-gras"
      >
        ×
      </button>
    </div>
  )
}

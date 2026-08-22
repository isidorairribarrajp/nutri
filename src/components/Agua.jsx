import * as db from '../db.js'

const META_VASOS = 8

/** Vasos de agua del dia. Ocho vasos de 250 ml es la referencia habitual. */
export default function Agua({ fecha, vasos, onCambio }) {
  function set(n) {
    db.setAgua(fecha, n)
    onCambio()
  }

  return (
    <section className="tarjeta mb-3 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <span>💧</span> Agua
        </h3>
        <span className="text-sm tabular-nums text-tenue">
          {vasos} / {META_VASOS} vasos · {(vasos * 0.25).toFixed(2).replace('.', ',')} L
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: META_VASOS }, (_, i) => (
          <button
            key={i}
            onClick={() => set(i + 1 === vasos ? i : i + 1)}
            aria-label={`${i + 1} vasos`}
            className="h-9 flex-1 rounded-lg border transition-colors"
            style={{
              background: i < vasos ? 'var(--color-agua)' : 'var(--color-panel2)',
              borderColor: i < vasos ? 'var(--color-agua)' : 'var(--color-borde)',
            }}
          />
        ))}
      </div>
    </section>
  )
}

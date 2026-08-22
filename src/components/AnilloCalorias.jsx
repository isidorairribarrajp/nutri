import { MACROS, redondear } from '../nutricion.js'

const R = 76
const GROSOR = 15
const CIRC = 2 * Math.PI * R
const HUECO = 2 // separacion entre segmentos, en px de arco

/**
 * Anillo de calorias segmentado por macro.
 * No es decoracion: cada segmento es la porcion de kcal que aporto ese macro
 * (4 kcal por gramo de proteina y carbo, 9 por gramo de grasa), asi que de una
 * mirada se ve de donde vinieron las calorias del dia.
 */
export default function AnilloCalorias({ totales, meta, rango }) {
  const kcalMacro = {
    p: (totales.p || 0) * 4,
    c: (totales.c || 0) * 4,
    g: (totales.g || 0) * 9,
  }
  const consumidas = totales.kcal || 0
  const sumaMacros = kcalMacro.p + kcalMacro.c + kcalMacro.g
  const restantes = redondear(meta - consumidas)
  const excedida = rango ? consumidas > rango.max : consumidas > meta
  const dentro = rango && consumidas >= rango.min && consumidas <= rango.max

  // Los segmentos se dibujan proporcionales a las kcal consumidas sobre la meta.
  const escala = meta > 0 ? Math.min(consumidas / meta, 1) / (sumaMacros || 1) : 0
  let acumulado = 0
  const segmentos = MACROS.map((m) => {
    const frac = kcalMacro[m.id] * escala
    const seg = { id: m.id, color: m.color, largo: CIRC * frac, offset: CIRC * acumulado }
    acumulado += frac
    return seg
  }).filter((s) => s.largo > 0.5)

  return (
    <div className="relative flex items-center justify-center">
      <svg width="190" height="190" viewBox="0 0 190 190" className="-rotate-90" aria-hidden="true">
        <circle cx="95" cy="95" r={R} fill="none" stroke="var(--color-borde)" strokeWidth={GROSOR} />
        {/* marcas del rango aceptable: pegarle al numero exacto no es la meta */}
        {rango && meta > 0 && [rango.min, rango.max].map((v) => (
          <circle
            key={v}
            cx="95" cy="95" r={R}
            fill="none"
            stroke="var(--color-tenue)"
            strokeWidth={GROSOR}
            strokeDasharray={`2 ${CIRC}`}
            strokeDashoffset={-CIRC * Math.min(v / meta, 1.4)}
            opacity="0.55"
          />
        ))}
        {segmentos.map((s) => (
          <circle
            key={s.id}
            cx="95"
            cy="95"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={GROSOR}
            strokeDasharray={`${Math.max(s.largo - HUECO, 0.5)} ${CIRC}`}
            strokeDashoffset={-s.offset}
            style={{ transition: 'stroke-dasharray 400ms ease, stroke-dashoffset 400ms ease' }}
          />
        ))}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[2.6rem] font-bold leading-none tabular-nums">{redondear(consumidas)}</span>
        <span className="mt-0.5 text-xs text-tenue">de {redondear(meta)} kcal</span>
        <span className={`mano mt-1 text-lg ${excedida ? 'text-gras' : dentro ? 'text-carb' : 'text-acento-texto'}`}>
          {excedida ? `${Math.abs(restantes)} de más` : dentro ? 'en tu rango' : `quedan ${restantes}`}
        </span>
        {rango && (
          <span className="mt-0.5 text-[10px] tabular-nums text-tenue">
            rango {rango.min}–{rango.max}
          </span>
        )}
      </div>
    </div>
  )
}

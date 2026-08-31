import { useEffect, useRef, useState } from 'react'
import { buscarPorCodigo, escanear } from '../escaner.js'
import { getCatalogo } from '../off.js'
import * as db from '../db.js'

/**
 * Escaner de codigo de barras.
 * Antes de ir a la red se revisa el cache local: un producto ya escaneado
 * vuelve a funcionar sin senal.
 */
export default function Escaner({ onEncontrado, onCerrar }) {
  const video = useRef(null)
  const yaLeido = useRef(false)
  const [estado, setEstado] = useState('abriendo')
  const [error, setError] = useState(null)
  const [codigo, setCodigo] = useState(null)

  useEffect(() => {
    let apagar = null
    let vivo = true

    escanear(
      video.current,
      async (texto) => {
        if (yaLeido.current) return
        yaLeido.current = true
        setCodigo(texto)
        setEstado('buscando')
        if (navigator.vibrate) navigator.vibrate(60)

        const local = buscarEnCache(texto)
        if (local) {
          onEncontrado(local)
          return
        }
        try {
          const prod = await buscarPorCodigo(texto)
          if (!vivo) return
          if (prod) onEncontrado(prod)
          else setEstado('sin_ficha')
        } catch {
          if (vivo) setEstado('sin_red')
        }
      },
      (msg) => { if (vivo) { setError(msg); setEstado('error') } },
    ).then((fn) => {
      apagar = fn
      // fn es null cuando la camara no arranco: ahi manda el mensaje de error
      if (fn && vivo && !yaLeido.current) setEstado('leyendo')
    })

    return () => { vivo = false; apagar?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function reintentar() {
    yaLeido.current = false
    setCodigo(null)
    setEstado('leyendo')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="safe-top flex items-center justify-between px-4 py-3">
        <span className="font-semibold text-white">Escanear código</span>
        <button onClick={onCerrar} className="px-2 text-sm text-white/70">Cerrar</button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={video}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {/* la ventanita guia: apuntar dentro del recuadro */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-32 w-72 max-w-[85%] rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        </div>
      </div>

      <div className="safe-bottom bg-black px-5 pb-5 pt-4 text-center">
        {estado === 'abriendo' && <p className="text-sm text-white/70">Abriendo la cámara…</p>}
        {estado === 'leyendo' && (
          <p className="text-sm text-white/70">
            Apunta al código de barras del envase. Que quede dentro del recuadro y con luz.
          </p>
        )}
        {estado === 'buscando' && <p className="text-sm text-white/70">Buscando {codigo}…</p>}

        {estado === 'sin_ficha' && (
          <>
            <p className="text-sm text-white">
              Leí el código <b>{codigo}</b>, pero Open Food Facts no tiene ese producto.
            </p>
            <p className="mt-1 text-xs text-white/60">
              Pasa con productos chilenos poco cargados. Puedes crearlo tú con los datos del envase
              y queda guardado con su código para la próxima.
            </p>
            <div className="mt-4 flex gap-3">
              <button onClick={reintentar} className="flex-1 rounded-xl border border-white/25 py-3 text-sm text-white">
                Escanear otro
              </button>
              <button
                onClick={() => onEncontrado({ nuevo: true, codigo })}
                className="flex-[2] rounded-xl bg-acento py-3 font-bold text-tinta"
              >
                Crearlo yo
              </button>
            </div>
          </>
        )}

        {estado === 'sin_red' && (
          <>
            <p className="text-sm text-white">Sin internet no puedo buscar un producto nuevo.</p>
            <p className="mt-1 text-xs text-white/60">
              Los que ya escaneaste antes sí funcionan sin señal.
            </p>
            <button onClick={reintentar} className="mt-4 w-full rounded-xl border border-white/25 py-3 text-sm text-white">
              Reintentar
            </button>
          </>
        )}

        {estado === 'error' && (
          <>
            <p className="text-sm leading-relaxed text-white">{error}</p>
            <button onClick={onCerrar} className="mt-4 w-full rounded-xl border border-white/25 py-3 text-sm text-white">
              Cerrar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function buscarEnCache(codigo) {
  const cache = db.getCache()
  return (
    cache[`off-${codigo}`] ||
    Object.values(cache).find((a) => a.codigo === codigo) ||
    // el catalogo empaquetado: cubre sin internet, y es la UNICA via para los
    // EAN de la marca propia de Jumbo, que Open Food Facts no conoce
    getCatalogo().find((a) => a.codigo === codigo) ||
    null
  )
}

// Lector de codigos de barras.
//
// Safari en iOS no trae BarcodeDetector, asi que se usa ZXing sobre el video de
// la camara. La libreria se carga con import() dinamico: pesa harto y no tiene
// sentido que Isi la baje si nunca abre el escaner.
//
// Solo se buscan formatos de producto de supermercado (EAN/UPC). Limitar los
// formatos hace la deteccion bastante mas rapida y evita falsos positivos con
// codigos que no son de comida.

let lectorPromesa = null

async function crearLector() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ])
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
  ])
  hints.set(DecodeHintType.TRY_HARDER, true)
  return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 })
}

export function cargarLector() {
  if (!lectorPromesa) lectorPromesa = crearLector()
  return lectorPromesa
}

/**
 * Enciende la camara y avisa cuando lee un codigo.
 * Devuelve una funcion para apagar todo.
 */
export async function escanear(video, onCodigo, onError) {
  const lector = await cargarLector()
  let controles = null
  let cancelado = false

  try {
    controles = await lector.decodeFromConstraints(
      {
        video: {
          // la trasera es la que enfoca de cerca; en el Mac cae a la unica que haya
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      video,
      (resultado, error) => {
        if (cancelado) return
        if (resultado) onCodigo(resultado.getText())
        // los errores por fotograma sin codigo son normales: no se reportan
      },
    )
  } catch (e) {
    onError(mensajeDeError(e))
    // se devuelve null a proposito: si se devolviera la funcion de apagado, el
    // que llama no podria distinguir "arranco bien" de "fallo", y terminaba
    // pisando el mensaje de error con el estado normal de lectura.
    return null
  }

  return () => {
    cancelado = true
    try { controles?.stop() } catch { /* ya estaba apagada */ }
    const stream = video?.srcObject
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      video.srcObject = null
    }
  }
}

function mensajeDeError(e) {
  const n = e?.name || ''
  if (n === 'NotAllowedError') {
    return 'No me diste permiso para usar la cámara. En iPhone: Ajustes → Safari → Cámara → Preguntar, '
      + 'y vuelve a abrir la app.'
  }
  if (n === 'NotFoundError' || n === 'OverconstrainedError') {
    return 'No encontré una cámara en este dispositivo.'
  }
  if (n === 'NotReadableError') {
    return 'La cámara está ocupada por otra app. Ciérrala y vuelve a intentar.'
  }
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    return 'La cámara solo funciona en HTTPS.'
  }
  return 'No pude abrir la cámara: ' + (e?.message || 'error desconocido')
}

/** Ficha de Open Food Facts por codigo de barras. */
export async function buscarPorCodigo(codigo) {
  const campos = 'code,product_name,product_name_es,brands,nutriments,serving_size,quantity,image_small_url'
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo)}.json?fields=${campos}`
  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json()
  if (json.status !== 1 || !json.product) return null

  const prod = json.product
  const n = prod.nutriments || {}
  const kcal = Number(n['energy-kcal_100g'])
  const nombre = (prod.product_name_es || prod.product_name || '').trim()
  if (!nombre || !Number.isFinite(kcal) || kcal <= 0) return null

  const porciones = []
  const gServing = gramosDe(prod.serving_size)
  if (gServing) porciones.push({ nombre: '1 porción', gramos: gServing })
  const gEnvase = gramosDe(prod.quantity)
  if (gEnvase && gEnvase !== gServing) porciones.push({ nombre: 'envase completo', gramos: gEnvase })

  return {
    id: `off-${prod.code}`,
    codigo: String(prod.code),
    nombre,
    marca: (prod.brands || '').split(',')[0].trim() || null,
    imagen: prod.image_small_url || null,
    por100g: {
      kcal: Math.round(kcal),
      p: Math.round((Number(n.proteins_100g) || 0) * 10) / 10,
      c: Math.round((Number(n.carbohydrates_100g) || 0) * 10) / 10,
      g: Math.round((Number(n.fat_100g) || 0) * 10) / 10,
    },
    porciones,
    fuente: 'off',
  }
}

function gramosDe(texto) {
  if (!texto) return null
  const m = String(texto).match(/([\d.,]+)\s*(g|gr|ml)\b/i)
  if (!m) return null
  const n = parseFloat(m[1].replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n < 5000 ? Math.round(n) : null
}

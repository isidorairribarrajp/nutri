// Utilidades compartidas por las pruebas.
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')

/** localStorage falso: las pruebas corren en node, no en el navegador. */
export function montarLocalStorage() {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  }
  return store
}

export const datos = (nombre) => JSON.parse(readFileSync(join(RAIZ, 'public', nombre), 'utf8'))
export const src = (m) => import(join(RAIZ, 'src', m))

let fallos = 0
export function ck(nombre, cond, extra = '') {
  console.log((cond ? '  ok  ' : ' FALLA') + '  ' + nombre + (extra ? '   ' + extra : ''))
  if (!cond) fallos++
}
export function seccion(t) { console.log(`\n--- ${t} ---`) }
export function cerrar() {
  console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLAS`)
  process.exit(fallos ? 1 : 0)
}

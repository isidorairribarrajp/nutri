# Nutri

App de registro de comidas, calorias y macros. PWA instalable en el iPhone.

**En vivo:** https://isidorairribarrajp.github.io/nutri/

## Instalar en el celular

Abrir la URL **en Safari** (no en Chrome: en iOS solo Safari puede instalar PWAs)
→ boton Compartir → "Anadir a pantalla de inicio".

## Como funciona

- Los datos viven **solo en el telefono**, en `localStorage`. No hay backend ni cuenta.
  El unico respaldo es exportar el JSON desde Ajustes.
- Los alimentos vienen de dos lados:
  - `public/alimentos-cl.json` — ~100 alimentos y platos chilenos con porciones caseras,
    incluido en el bundle, funciona sin internet.
  - [Open Food Facts](https://world.openfoodfacts.org/) — productos de supermercado, requiere red.
  - Ademas se pueden crear alimentos propios.
- Todo alimento usado queda en cache, asi lo que se come seguido funciona sin senal.

## Desarrollo

```
npm install
npm run dev
npm run build && npm run preview
```

`vite.config.js` fija `base: '/nutri/'` para GitHub Pages. Si cambia el nombre del repo,
hay que cambiar ese valor o el service worker no registra.

## Sobre los valores nutricionales

Los genericos salen de tablas de composicion (USDA FoodData Central) y los platos chilenos
de la tabla del INTA / U. de Chile. Los platos preparados estan marcados como aproximados:
la receta de cada casa cambia. Esto no es consejo medico ni nutricional.

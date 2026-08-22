# Nutri

App de registro de comidas, calorias y macros, con metas calculadas y seguimiento
de peso. PWA instalable en el iPhone.

**En vivo:** https://isidorairribarrajp.github.io/nutri/

## Instalar en el celular

Abrir la URL **en Safari** (no en Chrome: en iOS solo Safari puede instalar PWAs)
→ boton Compartir → "Anadir a pantalla de inicio".

## Que hace

- **Hoy** — anillo de calorias, barras de macros y las comidas del dia por momento
  (desayuno / almuerzo / once / cena / snack). Se puede navegar a dias anteriores.
- **Peso** — registro de peso con grafico de tendencia. La linea gruesa es el promedio
  movil de 7 dias: el peso diario es ruido y leerlo dia a dia enganna.
- **Ajustes** — metas diarias, calculadas desde el perfil o escritas a mano, y respaldo.

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

## Metas automaticas

El calculo usa **Mifflin-St Jeor** para el metabolismo basal, por el factor de actividad
para el gasto total, y suma o resta el deficit del objetivo (1 kg de grasa = ~7700 kcal,
o sea 1100 kcal/dia por cada kg semanal).

Dos decisiones deliberadas:

- **Piso de seguridad** (`PISO_KCAL` en `src/perfil.js`): 1200 kcal para mujeres, 1500
  para hombres. Si el objetivo pide menos, la app sube al piso y lo dice en pantalla en
  vez de esconderlo. Los objetivos de bajada llegan hasta 0,75 kg/semana y no mas.
- **La proteina se fija por kg de peso** (1,6 a 2,0 segun el reparto), no como porcentaje
  de las calorias. La grasa sale de un porcentaje de las kcal y los carbos son el resto.
  Si los carbos dieran negativo se recorta la grasa, nunca la proteina.

Cuando las metas estan en modo automatico, registrar un peso nuevo del dia de hoy
recalcula las metas solo.

## Sobre los valores nutricionales

Los genericos salen de tablas de composicion (USDA FoodData Central) y los platos chilenos
de la tabla del INTA / U. de Chile. Los platos preparados estan marcados como aproximados:
la receta de cada casa cambia.

Las calorias del calculo automatico son una **estimacion estadistica**, no una medicion
de tu metabolismo: el gasto real varia bastante entre personas con el mismo cuerpo.
Esto no es consejo medico ni nutricional.

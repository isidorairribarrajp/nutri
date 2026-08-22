# Nutri

App de registro de comidas con la identidad de marca **Isi Irri**. Calorías y macros,
metas calculadas desde composición corporal, ejercicio por sesión, plan de comidas
automático y los dos recetarios de la casa. PWA instalable en el iPhone.

**En vivo:** https://isidorairribarrajp.github.io/nutri/

## Instalar en el celular

Abrir la URL **en Safari** (en iOS solo Safari puede instalar PWAs)
→ botón Compartir → "Añadir a pantalla de inicio".

## Las cinco pantallas

- **Hoy** — anillo de calorías segmentado por macro, barras de macros, agua, y las
  comidas del día por momento (desayuno / almuerzo / once / cena / snack). Copiar
  las comidas de otro día.
- **Plan** — propuesta de día completo que cuadra con las metas, armada con lo que
  Isi realmente come. "Otra opción" regenera; "Anotar todo en Hoy" lo registra.
- **Progreso** — peso, grasa corporal y ejercicio, con gráficos de tendencia.
- **Recetas** — los dos recetarios, con macros por porción y botón "Comí esto".
- **Perfil** — el análisis completo, respaldo y tema claro/oscuro.

## Cómo se calculan las calorías

El orden importa:

1. **Composición corporal.** Con cuello, cintura y cadera se estima el % de grasa por
   el método Navy, en su forma **métrica** (Hodgdon-Beckett). La versión que circula
   por internet está en pulgadas: metiéndole centímetros da ~25 puntos de más.
2. **Metabolismo basal.** Con el % de grasa se saca la masa magra y el basal sale de
   **Katch-McArdle**, que le habla al músculo y no al peso total. Sin medidas se cae a
   Mifflin-St Jeor.
3. **Gasto total** = basal × factor de vida diaria + ejercicio registrado. El factor de
   vida **no** incluye el ejercicio planificado: ese se cuenta una sola vez, desde las
   sesiones reales, y como promedio de 7 días para que la meta no salte según el día.
4. **Déficit.** El tope lo manda el % de grasa, no las ganas (ver abajo).

### Ejercicio

Calorías **netas**, no brutas: un MET incluye lo que gastarías igual sentada, y eso ya
está en el basal. Sumar las brutas sería contarlo dos veces.

    kcal/min = (MET − 1) × 3,5 × peso_kg / 200

Caminata y trote no usan un MET fijo: usan las **ecuaciones de la ACSM** con velocidad e
inclinación reales. Caminar a 5,5 km/h en plano y al 10 % de inclinación no son el mismo
ejercicio — la diferencia es casi el triple de gasto.

Cada sesión acepta un campo **"calorías del reloj"**. Si está lleno, manda: un Garmin mide
frecuencia cardíaca real y le gana a cualquier tabla.

### Política de déficit

Mientras menos grasa queda, más fácil es que el cuerpo saque la energía del músculo. Por
eso el tope de déficit baja con el % de grasa (`TRAMOS_GRASA` en `src/perfil.js`). Para
mujeres: bajo 18 % el tope es 10 %; 18-21 % es 13 %; 21-25 % es 17 %; y así hasta 25 %.

Dos pisos que no se cruzan:
- Nunca bajo **1200 kcal** (mujeres) / 1500 (hombres).
- En déficit, nunca bajo el **propio metabolismo basal**.

La app muestra el déficit explícito en kcal, en % del gasto y en kg por semana.

### Macros

La proteína se calcula sobre la **masa magra** cuando se conoce (2,0 a 2,4 g/kg según el
reparto), no sobre el peso total. La grasa sale de un porcentaje de las kcal y los carbos
son el resto. Si los carbos dieran negativo se recorta la grasa, nunca la proteína.

El reparto "Recomendado" lo elige la app según objetivo y % de grasa, y dice por qué.

## Los alimentos

- `public/alimentos-cl.json` — ~100 alimentos y platos chilenos con porciones caseras.
  Va en el bundle: funciona sin internet.
- `public/recetas-cl.json` — 45 entradas generadas desde los dos recetarios de Isi
  (`datos/`). Los macros se calculan sumando los ingredientes y se **contrastan** contra
  las kcal que declara cada receta; cuando la diferencia supera el 15 % la app lo dice.
  Mediana de desviación: 8,9 %.
- [Open Food Facts](https://world.openfoodfacts.org/) — productos de supermercado (red).
- Alimentos propios y favoritos.

Regenerar las recetas desde los recetarios:

```
cd datos && python3 parsear_recetarios.py && python3 calcular_recetas.py && python3 exportar_recetas.py
```

## Marca

Tokens de `~/IsiIrri/vlog_pipeline/assets/brand-tokens.json`: base crema, el rosa siempre
como acento y nunca de fondo entero, Manrope para interfaz y Caveat para las anotaciones
manuscritas. Las tipografías van autoalojadas y subseteadas a latín (113 KB) para que la
app funcione sin internet.

Los colores de los gráficos **no** son decorativos: pasaron el validador de contraste y
daltonismo de la skill `dataviz` en modo claro y oscuro.

## Desarrollo

```
npm install
npm run dev
npm run build && npm run preview
```

`vite.config.js` fija `base: '/nutri/'` para GitHub Pages. Si cambia el nombre del repo hay
que cambiar ese valor o el service worker no registra.

## Advertencias

Los platos preparados son aproximados: la receta de cada casa cambia. El gasto calculado es
una **estimación estadística**, no una medición del metabolismo de nadie. La huincha da el %
de grasa con un error de 3 a 4 puntos contra un DEXA: sirve para la tendencia, no para el
decimal. Esto no es consejo médico ni nutricional.

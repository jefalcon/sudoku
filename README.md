# Sudoku — Solución única garantizada

Juego de Sudoku completo en un único `index.html` autocontenido
(HTML + CSS + JavaScript vanilla, sin frameworks, CDN, build ni red).
Se abre directamente con doble clic (`file://`) y funciona offline.

Prioridad del proyecto: **corrección algorítmica**. Cada puzzle se genera
de verdad en el momento (nada de banco de puzzles): primero una cuadrícula
solución completa desde un RNG con semilla, después perforado celda a celda
donde cada celda solo se retira si el puzzle resultante mantiene
**exactamente 1 solución** (verificado con el solver propio antes de cada
retirada definitiva). La dificultad se gradúa por la **técnica lógica más
difícil necesaria**, no solo por el número de pistas.

## Cómo abrirlo

Abre `index.html` en cualquier navegador moderno (doble clic).
Sin servidor, sin instalación, sin internet.

La semilla viaja en la URL: `index.html?seed=1`. Misma semilla + mismo
nivel = mismo puzzle en cualquier carga. También se puede escribir la
semilla en la pantalla inicial.

## Controles exactos

Ratón: clic para seleccionar celda; botones y selector 1–9; `Borrar`.

Teclado (fuera de campos de texto):

| Tecla | Acción |
|---|---|
| Flechas | Mover selección |
| `1`–`9` | Colocar número (o alternar candidato en modo notas) |
| `0`, `Supr`, `Retroceso` | Borrar celda |
| `N` | Alternar modo notas (lápiz) |
| `C` | Comprobar ON/OFF (resalta duplicados en fila, columna o caja) |
| `H` | Pista (máx. 3 por partida, ver abajo) |
| `U` o `Ctrl+Z` | Deshacer (jugadas, borrados y pistas; no alternancias de lápiz) |
| `Y` o `Ctrl+Y` / `Ctrl+Shift+Z` | Rehacer |
| `Enter` | Nueva partida (misma pantalla: mismo nivel, semilla + 1) |
| `P` | Pausa / continuar |
| `R` | Reiniciar el puzzle actual (misma semilla y nivel) |
| `M` | Silenciar / activar sonido (pitidos WebAudio, sin ficheros) |
| `` ` `` o `F1` | Overlay de depuración |
| `1`–`4` (pantalla inicial) | Elegir nivel y empezar directamente |
| Clic en un nivel | Empezar directamente con la semilla escrita |
| Botón `Jugar` / `Enter` (pantalla inicial) | Empezar con el nivel resaltado y la semilla escrita |

Las pistas iniciales no se pueden modificar ni borrar (avisan en pantalla).
Completar el tablero sin conflictos = victoria (con solución única, eso
implica la solución correcta): muestra tiempo final y récord de la sesión.
Los récords viven solo en memoria (nada sale del navegador).

## Criterio de dificultad de cada nivel

Técnicas implementadas, de menor a mayor: 1 single desnudo, 2 single
oculto, 3 pareja desnuda, 4 pareja oculta, 5 apuntado (box-line),
6 trío desnudo, 7 X-Wing, 8 búsqueda (no lógica).

El generador perfora hasta un suelo de pistas exigiendo unicidad en cada
paso, y solo acepta el puzzle si su técnica requerida cae en la banda del
nivel (reintentos deterministas con el mismo RNG; si se agotan, entrega el
mejor intento, siempre único):

| Nivel | Banda de técnica exigida | Suelo de pistas | Pistas típicas medidas |
|---|---|---|---|
| Fácil | 1–2 (solo singles) | 36 | 36–40 |
| Medio | 2–4 (al menos single oculto, hasta parejas) | 30 | 30–34 |
| Difícil | 3–7 (al menos parejas, hasta X-Wing) | 26 | 26–30 |
| Experto | 5–8 (técnicas avanzadas o búsqueda) | 22 | 22–27 |

Fácil y medio se resuelven **únicamente con deducción** (sin conjeturas),
garantizado por construcción: ninguna celda se retira si el puzzle deja de
ser resoluble con la lógica del nivel.

## Pista honesta

La pista (máx. 3 por partida) solo rellena si existe una deducción válida
de un solo paso (single desnudo u oculto) en la posición actual, y **nombra
la técnica, la fila, la columna y el valor**. El valor se contrasta con la
solución para no mentir cuando el jugador introdujo un error: en ese caso
no se consume pista y se pide revisar el tablero. Nunca es un valor
«mágico» sin justificación.

## Autotest (auditoría de unicidad)

1. Pulsa `` ` `` (o `F1`) para abrir el overlay de depuración.
2. En vivo verás: semilla, nivel, nº de pistas, nº de soluciones que el
   solver reporta para el puzzle (siempre exactamente 1) y la técnica
   máxima requerida.
3. Elige `N` (por defecto 100) y semilla base (por defecto 1), pulsa
   **AUTOTEST**: genera N puzzles rotando los 4 niveles y afirma que todos
   tienen solución única (y que fácil/medio no exigen conjetura),
   imprimiendo pasados/fallidos por nivel y la lista de fallos.
4. Referencia medida: 100 puzzles, 100/100 únicos, ~1–3 s según máquina.

## Parámetros

| Parámetro | Valor |
|---|---|
| Niveles | fácil, medio, difícil, experto |
| Pistas aprox. por nivel | 36–40 / 30–34 / 26–30 / 22–27 |
| Semilla por defecto | 1 (`?seed=N` para fijarla) |
| Autotest por defecto | N = 100, base = 1 |
| Pistas de ayuda | 3 por partida (celdas bloqueadas en verde) |
| Ficheros de la entrega | `index.html`, `README.md` (nada más) |

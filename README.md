# Sudoku — puzzle con solución única garantizada

Sudoku 9×9 clásico (9 cajas 3×3) en **un único fichero `index.html`** — HTML + CSS + JavaScript vanilla, sin frameworks, sin librerías, sin CDN, sin build, sin red. Funciona abriendo el archivo directamente con `file://`, 100 % offline.

El objetivo del proyecto es la **corrección algorítmica**: cada puzzle se genera de verdad a partir de la semilla y el nivel (nada de bancos pregenerados), mantiene **solución única en todo momento** (verificada con el solver antes de retirar cada celda) y la dificultad está **graduada por la técnica lógica más difícil necesaria**, no por el número de pistas.

---

## Cómo abrirlo

1. Abre `index.html` con doble clic, o arrástralo a una pestaña del navegador.
2. Alternativamente, desde la terminal: `xdg-open index.html` (Linux) o `open index.html` (macOS).
3. No hace falta servidor, conexión ni permisos especiales.

### Parámetros opcionales de URL

| URL | Efecto |
|---|---|
| `index.html` | Seed por defecto = **1**, nivel Fácil |
| `index.html?seed=42` | Genera el puzzle de la semilla 42 (determinista) |
| `index.html?level=experto` | Empieza en el nivel indicado (`facil`, `medio`, `dificil`, `experto`) |
| `index.html?seed=7&level=dificil` | Combina ambos |

`?seed=1` + el mismo nivel produce **siempre exactamente el mismo puzzle**, en cualquier carga y cualquier máquina. Cambiar la semilla cambia el puzzle. Nótese que al pulsar *Nueva partida* (Enter) dentro de una sesión avanza la semilla de forma determinista (base + nº de partida); recargar la página reinicia.

---

## Controles

### Ratón
- **Clic** en una celda: la selecciona.

### Teclado
| Tecla | Acción |
|---|---|
| `←` `↑` `↓` `→` | Mover la selección por la rejilla (con vuelta circular) |
| `1`–`9` | Colocar el número en la celda seleccionada |
| `0` o `Supr` (`Backspace` también) | Borrar el valor/notas de la celda |
| `N` | Alternar **modo notas/lápiz** (en ese modo 1–9 ponen/quitan candidatos) |
| `H` | **Pista** (igual que el botón 💡): rellena **una** celda con una deducción lógica válida y muestra la técnica usada (máx. 3 por partida) |
| `Enter` | **Nueva partida** (siguiente semilla, mismo nivel) |
| `P` | **Pausa** (oculta el tablero y detiene el cronómetro) |
| `R` | **Reiniciar** el puzzle actual (misma semilla, tablero limpio) |
| `M` | Silenciar audio (esta versión no tiene audio: muestra un aviso) |
| `Ctrl+Z` / `Ctrl+Y` | **Deshacer** / **rehacer** |
| `` ` `` (backtick) o `F1` | **Overlay de depuración** (y `Esc` para cerrarlo) |

- Las **pistas iniciales no se pueden sobrescribir ni borrar** (la celda lo avisa).
- La fila, columna y caja de la celda activa quedan resaltadas, y también todas las celdas con el mismo número que la seleccionada.

### Botones
- **Comprobar** (toggle): resalta en rojo los conflictos (mismo número repetido en fila, columna o caja).
- **💡 Pista** (máx. 3 por partida): rellena **una** celda mediante una deducción lógica válida y **nombra la técnica** usada (p. ej. «Single oculto: fila 4, columna 7 = 6»). Nunca da un valor «mágico» de la solución sin justificación; si lo que hay disponible es una técnica de eliminación, sugiere dónde mirar sin consumir pista.
- **↩ Deshacer / ↪ Rehacer**, **Reiniciar**, **Nueva partida**, **✏️ Notas (N)**.
- **Cronómetro**, **contador de errores** y **contador de pistas** en la cabecera.

---

## Dificultad: criterio exacto

La dificultad se gradúa por la **técnica lógica más difícil necesaria para resolver el puzzle sin adivinar** (sin backtracking ni conjeturas), medida con un *gradador* que resuelve el puzzle aplicando exclusivamente técnicas del repertorio. Nunca por número de pistas.

Repertorio y peso (step 1 = más fácil … 14 = más difícil):

| Step | Técnica |
|---|---|
| 1 | Full House (último valor libre de una unidad) |
| 2 | Single desnudo (única candidata) |
| 3 | Single oculto |
| 4 | Candidatas bloqueadas (pointing / claiming) |
| 5 | Par desnudo |
| 6 | Par oculto |
| 7 | Trío desnudo |
| 8 | Trío oculto |
| 9 | X-Wing |
| 10 | Cuádruple desnudo |
| 11 | Cuádruple oculto |
| 12 | Swordfish |
| 13 | XY-Wing |
| 14 | XYZ-Wing |

### Niveles

| Nivel | Técnicas permitidas (techo) | Banda de rating (piso–techo) | Pistas típicas | Garantía |
|---|---|---|---|---|
| **Fácil** | Full House, single desnudo, single oculto | 1–3 | ~36 | Resoluble **solo con singles**, sin adivinar |
| **Medio** | + locked candidates, par desnudo, par oculto | 3–6 | ~23–31 | Sin técnicas avanzadas; solo lógica deductiva |
| **Difícil** | + trío desnudo, trío oculto, X-Wing | 5–9 | ~23–30 | Puede exigir pares/tríos y X-Wing |
| **Experto** | Repertorio completo (hasta XYZ-Wing) | 7–14 | ~23–27 | Puede exigir el tramo alto del repertorio |

Cómo se aplica el criterio:

- **Techo garantizado (dura):** el rating del puzzle servido siempre cae dentro del techo del nivel elegido. El generador solo retira una celda si el puzzle resultante sigue resolviéndose —sin adivinar— con las técnicas del nivel y conserva solución única.
- **Piso perseguido:** el generador intenta varias semillas derivadas y aplica una fase de reparación (rellenar/perforar celdas midiendo el rating) para que el puzzle exija técnicas del tramo del nivel. Si una semilla es especialmente terca, se sirve el mejor candidato encontrado; el **overlay de depuración muestra siempre el rating real** del puzzle (técnica más difícil y su step), así que la graduación es auditable en todo momento y nunca se infla.
- **Fácil y medio son siempre resolubles únicamente con lógica deductiva** — el propio perforado lo verifica: si un hueco hiciese el puzzle no resoluble con el techo del nivel, ese hueco no se retira.

---

## Overlay de depuración

Se abre con `` ` `` o `F1` (oculto por defecto). Muestra **en vivo**:

- **Seed** efectiva (base + nº de partida) y **nivel**.
- **Nº de pistas** del puzzle actual.
- **Nº de soluciones** que el solver reporta para el puzzle actual (debe ser exactamente **1 ✓ única**).
- **Técnica más difícil** requerida para resolverlo (rating lógico, con step sobre 14).
- **Estado** del juego y datos del motor (pistas usadas, errores, historial).
- Toggle: marcar en rojo los valores erróneos al escribirlos.

### AUTOTEST (auditoría del generador)

1. Abre el overlay (`` ` `` o `F1`).
2. En la sección **AUTOTEST**, deja `100` puzzles (admite 1–500) y pulsa **▶ Ejecutar AUTOTEST**.
3. Al terminar imprime el veredicto: cuántos puzzles tienen solución única, cuántos fallan (0 soluciones o 2+), estadísticas de pistas por nivel, comprobación interna de determinismo (regenera el primer puzzle y lo compara) y duración.

Qué audita: recorre **semillas consecutivas desde la seed base**, **genera de verdad cada puzzle** (nada de listas embebidas) en los 4 niveles rotando, y **afirma con el solver que todos tienen exactamente 1 solución**. Con los valores por defecto (`?seed=1`, 100 puzzles) el resultado esperado es:

```
Con solución única: 100/100
Con 0 soluciones: 0 · con 2 o más: 0
Determinismo (regeneración del puzzle 1): OK ✓
AUTOTEST SUPERADO: 100/100 puzzles con solución única ✓
```

El mismo motor puede auditarse por lotes mayores (p. ej. 500) con el selector de la UI.

---

## Garantías algorítmicas

1. **RNG determinista:** todo el azar pasa por un único generador sembrable (mulberry32) alimentado por `?seed=N` (por defecto 1). `Math.random()` no aparece en el código y el tiempo (`Date.now`) no participa en la generación — solo en el cronómetro de la partida.
2. **Solución completa primero:** se genera una cuadrícula-solución 9×9 completa y válida; después se perfora.
3. **Unicidad en todo momento:** antes de retirar definitivamente una celda se comprueba con el solver que el puzzle resultante sigue teniendo exactamente 1 solución; si pasaría a tener 2 o más, esa celda **no** se retira.
4. **Solver como oráculo:** propagación de restricciones + backtracking con heurística MRV (celda con menos candidatos). `countSolutions(puzzle, 2)` distingue 0 / 1 / «2 o más» deteniéndose en cuanto encuentra 2. Es instrumentación de auditoría: **no** se usa para autocompletar el tablero del jugador.
5. **Sin bancos de puzzles:** cada puzzle se construye desde cero a partir de (seed, nivel). No hay ninguna lista de puzzles pregenerados en el código (verificable: no hay cadenas de dígitos embebidas).
6. **Gradación honesta:** el nivel se asigna por técnica lógica más difícil (ver arriba), medida con el gradador, y se muestra en el overlay.

## Parámetros

| Parámetro | Valor |
|---|---|
| Semilla por defecto | `1` (`?seed=N` para cambiarla, N ≥ 0) |
| Niveles | `facil`, `medio`, `dificil`, `experto` (`?level=`) |
| Pistas aproximadas | Fácil ~36 · Medio ~23–31 · Difícil ~23–30 · Experto ~23–27 |
| Pistas (ayudas) por partida | Máximo **3** |
| Autotest por defecto | 100 puzzles (1–500 configurable en la UI) |
| Tablero | 9×9, 9 cajas 3×3, dígitos 1–9 |
| Requisitos | Cualquier navegador moderno; `file://` sin red |

## Estructura

```
index.html      # Todo el juego: HTML + CSS + JS vanilla (offline)
README.md       # Este documento
LOG_SESION.md   # Log de actividades del pipeline de agentes
```

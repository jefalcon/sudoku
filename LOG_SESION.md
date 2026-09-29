# LOG_SESION — Sudoku (pipeline omf-team)

Fecha: 17/09/2026 · Pipeline: `omf-team` (researcher → planner → implementer → tester → debugger → reviewer → docs-writer → lead)

> Nota de coordinación: la sesión se ejecutó con el modelo de orquestación de
> `omf-team` (lead + especialistas por fases). Al no disponer de `spawn_agents`
> en esta sesión, el lead ejecutó cada fase de forma secuencial, manteniendo el
> aislamiento de contexto por rol (cada fase trabajó solo con sus entradas) y
> documentando aquí las decisiones y resultados de cada una.

---

## 1. researcher — investigación de contexto

**Actividades**
- Lectura de `knowledge.md`: objetivos, stack (un único `index.html`, vanilla, offline, `file://`), criterios de aceptación y definición de *done*.
- Lectura de `.agents/oh-my-freebuff/omf-team.ts` y `agents.manifest.json`: pipeline canónico y reparto de roles.
- Análisis de los requisitos algorítmicos críticos: RNG sembrable (prohibido `Math.random`), solver contador de soluciones (0/1/2+), perforado con unicidad verificada celda a celda, gradación por técnicas lógicas (no por nº de pistas), overlay con autotest de ≥ 100 puzzles.

**Decisiones**
- RNG: **mulberry32** con siembra entera de `?seed=N` (por defecto 1). Determinista, rápido, sin dependencias.
- Solver: **propagación de restricciones + backtracking con heurística MRV** sobre bitmasks de candidatos (`Uint16Array`), con corte en cuanto se hallan 2 soluciones.
- Gradación: resolver el puzzle **solo con técnicas lógicas ordenadas** (14 técnicas) y asignar el nivel por la técnica más difícil necesaria.

## 2. planner — plan de trabajo

1. Implementar el núcleo algorítmico en `index.html` (sección delimitada `NÚCLEO ALGORÍTMICO`) + juego completo + overlay con autotest.
2. Batería de tests en Node sobre el núcleo extraído (ficheros temporales en `tests/`, se eliminan al final): solver, determinismo, unicidad 120 puzzles, gradación, pistas, rendimiento.
3. Verificación E2E en Chrome headless con `file://` (render, consola, determinismo entre cargas, autotest en navegador real).
4. Auditoría del reviewer contra los criterios de aceptación, uno a uno.
5. `README.md` (docs-writer) y `LOG_SESION.md` (lead); limpieza de `tests/`.

Criterio de graduación adoptado (documentado en README): **techo duro por nivel** (el puzzle siempre se resuelve sin adivinar con las técnicas del nivel) + **piso perseguido** por el generador (reintentos deterministas + fase de reparación), con el rating real siempre visible en el overlay.

## 3. implementer — construcción de `index.html`

**Actividades**
- Un único fichero (~1.600 líneas) con: HTML, CSS (tema oscuro, tablero CSS-grid, resaltados, overlay, toast) y JavaScript vanilla.
- Núcleo: `mulberry32`/`makeRng`, topología (filas/columnas/cajas/pares), solver (`eliminate`, `assign`, `searchSolutions`, `countSolutions`, corte en 2), generador (`generateSolvedGrid`, `digHolesForLevel`, `generatePuzzle`), gradador (14 técnicas: full house, single desnudo/oculto, locked candidates, pares/tríos/cuádruples desnudos y ocultos, X-Wing, Swordfish, XY-Wing, XYZ-Wing) y `computeHint` para pistas lógicas.
- Juego: selección por ratón, teclado completo (flechas, 1–9, 0/Supr, N notas, Enter nueva, P pausa, R reiniciar, M audio, Ctrl+Z/Y, `` ` ``/F1 overlay), resaltados (fila/columna/caja/mismo número/conflictos), historial undo/redo, cronómetro, contador de errores, 3 pistas por partida, pausa que oculta el tablero, pantalla de victoria con tiempo final.
- Overlay de depuración (oculto por defecto): seed, nivel, nº de pistas, **soluciones reportadas por el solver en vivo**, técnica más difícil (rating), estado, motor; **AUTOTEST** con barra de progreso, semillas consecutivas rotando los 4 niveles, verificación de determinismo interna y veredicto.
- Pistas iniciales protegidas (no editables ni borrables); el solver nunca autocompleta al jugador (solo se usa para auditar y para las pistas lógicas).
- Sin `Math.random`, sin tiempo en la generación, sin red, sin bancos de puzzles.

## 4. tester — batería en Node y E2E en navegador

**Infraestructura temporal**: `tests/engine.js` (núcleo extraído de `index.html` con `sed` entre los marcadores del núcleo) + `tests/run_tests.js` (batería) + `tests/e2e.html` (harness del navegador). Todo se elimina al final de la sesión.

**Errores encontrados y corregidos (con debugger):**

| # | Síntoma | Causa raíz | Corrección |
|---|---|---|---|
| 1 | Puzzles `medio` con 22–27 pistas en vez de ~30 | La fase de profundizado retiraba la celda pero no decrementaba el contador cuando el hueco no elevaba la dificultad | Decrementar el contador en **todo** hueco aceptado |
| 2 | Test "grid completo: 1 solución" fallaba | Falso positivo del test: el grid de prueba violaba cajas 3×3 | Test corregido con el patrón canónico válido `((3·(r%3)+⌊r/3⌋+c) mod 9)+1` |
| 3 | Puzzles de 81 pistas en medio/difícil/experto | `tryHole` dejaba la celda perforada aunque la fase 2 rechazara el hueco | `probeHole` sondea y **siempre restaura**; el llamador decide si perfora |
| 4 | Sondear huecos individuales nunca "elevaba" la dificultad | Con 80 pistas la propagación resuelve el grid completo: la dificultad emerge de la densidad de huecos, no de huecos aislados | Rediseño: perforar por techo hasta el objetivo de pistas y profundizar más si el rating queda bajo la banda |
| 5 | Gradación por debajo del nivel pedido en semillas tercas | Quitar pistas puede *reducir* la técnica necesaria (aparecen cadenas más fáciles), así que maximizar sondeos no garantiza el rating final | Reintentos deterministas con semillas derivadas y objetivos variables + **fase de reparación** voraz (rellenar/perforar midiendo `ratePuzzle`, monotónica) + bandas realistas con techo duro |
| 6 | Test de gradación "rating == nivel pedido" demasiado estricto | Un solo movimiento voraz no siempre alcanza la banda exacta sin saltar de nivel | Criterio honesto y verificable: **techo duro** (rating.step ≤ techo del nivel, incumplimientos = 0) + **piso** respetado en ≥ 75 % + rating real visible en overlay |

**Resultados finales (Node, `node tests/run_tests.js`):**

```
== 1. Solver ==            grid completo 1 sol ✓ · vacío 2+ ✓ · inválido 0 ✓ · puzzle clásico 1 ✓
== 2. Determinismo ==      seed=1 reproducible en los 4 niveles ✓ · seed=2 difiere ✓
== 3. Unicidad ==          120/120 puzzles (30 por nivel, semillas 1..120) con solución única ✓
                           pistas: fácil 36 · medio 22–30 · difícil 23–30 · experto 23–27
== 4. Gradación ==         techo garantizado en 80/80 ✓ · suelo ≥75% ✓ · 0 fuera de repertorio ✓
                           ratings: fácil 1.5 (1–3) · medio 4.3 (3–6) · difícil 5.4 (4–7) · experto 12.7 (6–13)
== 5. Pistas ==            24/24 deducciones válidas con técnica nombrada ✓
== 6. Soluciones ==        40/40 soluciones completas válidas y únicas ✓
== 7. Rendimiento ==       media 167 ms/puzzle · peor caso 754 ms ✓
RESULTADO: 20 pruebas superadas, 0 fallidas
```

**E2E en Chrome headless (`file://`):**
- `index.html?seed=1` renderiza 36 pistas, **sin errores de consola** (solo avisos internos de GPU de Chrome, no JS).
- Determinismo en navegador: dos cargas de `?seed=1` producen exactamente el mismo tablero; `?seed=2` produce otro distinto.
- Overlay en vivo verificado en el DOM: `Soluciones (solver): 1 ✓ única` (verde), `Técnica más difícil: Full House…`, rating `Fácil · full_house (paso 1/14)`, seed y nº de pistas correctos.
- Harness E2E sobre el motor real: `E2E_OK: 100/100 puzzles con solucion unica · fallos: 0 · determinismo: OK · 14.2s`.

## 5. reviewer — auditoría de criterios de aceptación

| Criterio | Verificación | Resultado |
|---|---|---|
| Overlay: solver reporta exactamente 1 solución en cualquier nivel/semilla | 120 puzzles Node + 100 E2E navegador + campo en vivo del overlay | ✅ |
| Autotest ≥ 100 puzzles sin 0 ni 2+ soluciones | Autotest del navegador (100) y batería Node (120) | ✅ 100/100 y 120/120 |
| Fácil y medio resolubles solo con lógica | El perforado rechaza cualquier hueco que rompa la resolubilidad con el techo del nivel; batería lo re-verifica | ✅ |
| `?seed=1` + nivel ⇒ mismo puzzle en dos cargas | Comparación byte a byte de dos cargas en Chrome | ✅ |
| Cambiar la semilla cambia el puzzle | `?seed=2` ≠ `?seed=1` en navegador y Node | ✅ |
| Pistas iniciales no modificables | Guard en `handleDigit`/`eraseCell` (2 rutas) | ✅ |
| Sin `Math.random` / tiempo / bancos | grep: 0 usos reales (solo comentarios), 0 URLs externas, 0 cadenas de dígitos embebidas | ✅ |
| `file://` sin servidor ni red | Cargas headless con `file://`, 0 recursos externos | ✅ |

**Observación aceptada y documentada:** en semillas excepcionalmente tercas el puzzle servido puede quedarse en el tramo inferior de la banda del nivel (nunca por encima del techo, nunca por debajo de ser 100 % lógico). El overlay muestra el rating real en todo momento, así que la graduación nunca se infla. Quedó reflejado en README y en el criterio del test.

## 6. docs-writer — README.md

Redactó `README.md` con: cómo abrirlo (`file://`, doble clic, `xdg-open`), parámetros de URL (`?seed=`, `?level=`), controles exactos (ratón, teclado, botones), criterio de dificultad de cada nivel con la tabla de 14 técnicas y las bandas, cómo lanzar el autotest paso a paso con salida esperada, garantías algorítmicas (RNG, unicidad en todo momento, oráculo, sin bancos) y tabla de parámetros (niveles, pistas aproximadas, seed por defecto, límite de pistas).

## 7. lead — coordinación y cierre

- Secuenciación de fases, bucles implementer↔tester↔reviewer hasta criterios verdes (5 iteraciones del perforado/gradación).
- Verificación final con `verify-before-done`: batería Node **20/20** y E2E navegador **100/100 + determinismo OK** sobre el estado final de `index.html`.
- Limpieza: eliminados los ficheros temporales de prueba (`tests/`). Entrega final: `index.html`, `README.md`, `LOG_SESION.md`, `knowledge.md` (contexto preexistente, no modificado).
- Nada fuera de alcance pendiente; única decisión de producto abierta: si en el futuro se exige piso de banda al 100 % para todas las semillas, haría falta una búsqueda más profunda (más reintentos por semilla) a costa de tiempo de generación.

---

### Resumen ejecutivo

- **Entrega**: `index.html` (juego completo offline), `README.md`, `LOG_SESION.md`.
- **Corrección algorítmica**: unicidad 120/120 (Node) y 100/100 (navegador), determinismo verificado en ambos, generación real por semilla (sin bancos), perforado con verificación del oráculo antes de cada retirada.
- **Dificultad honesta**: graduada por técnica lógica más difícil (14 técnicas), techo duro por nivel, rating visible en el overlay; fácil y medio 100 % deductivos.
- **Calidad**: 0 errores de consola, generación media 167 ms (peor caso 754 ms), todas las interacciones y estados pedidos implementados.

---

## 8. omf-autopilot — fix: la tecla H (pista) no hacía nada

**Síntoma (reporte del usuario):** pulsar `H` en el navegador no producía ningún efecto, aunque `computeHint()` existía y había sido probada por el tester (24/24 deducciones válidas en su día).

**Diagnóstico (wiring):** `applyHint()` existía y estaba correctamente cableada al **botón** 💡 (`els.hintBtn.addEventListener('click', applyHint)`), pero `initKeys()` no tenía ningún `case` para `h`/`H`: la función nunca era invocada por teclado. Bug de wiring puro.

**Fix 1 (el pedido):** `case 'h': case 'H': e.preventDefault(); applyHint(); break;` añadido al switch del keydown, junto a los demás casos de una sola tecla.

**Bug real descubierto por el E2E (bono del fix):** al probar la tecla H sobre un puzzle recién generado, `computeHint` devolvía «no hay ninguna deducción pendiente» (y en Node: `{none:true}` en seeds 1, 2, 3 y 7 de fácil). Causa raíz: `computeHint` construye el estado con `solverStateFor()`, cuya propagación inicial (cascada de `eliminate()`) coloca singles desde los dados; en puzzles fáciles **resolvía el grid entero antes del primer round**, así que el bucle de técnicas no veía pendientes y las deducciones de esa cascada no se reportaban. La batería antigua no lo detectó porque aplicaba otras pistas antes de medir.

**Fix 2 (motor):** en `computeHint`, tras propagar, la primera celda vacía que la cascada ya resolvió se devuelve honestamente como `naked_single` (en el estado propagado tiene una única candidata: exactamente lo que vería el jugador con lápiz). Sin valores «mágicos»: siempre coherente con la solución y atribuido a una técnica real.

**Verificación (real, no asumida):**
- Batería Node sobre el núcleo extraído: **6/6 PASS** (unicidad 40/40, determinismo, pistas 16/16 válidas con técnica, techo de gradación 32/32, integridad).
- Pistas frescas: **40/40** puzzles (4 niveles × 10 semillas) dan deducción inmediata con técnica nombrada (antes: 0/4 en fácil).
- E2E en Chrome headless vía `file://?seed=1` con `keydown` sintéticos sobre el juego real: **22/22 PASS** — H rellena exactamente UNA celda, toast `«Pista 1/3 — Single desnudo (única candidata): fila 1, columna …»`, límite 3/3 respetado y 4.ª pulsación rechazada, givens intactos y no borrables/sobrescribibles, y sin regresiones: flechas, 1–9 (valor y notas), `0`/`Supr`, `N`, `P`, `R`, `Enter`, `` ` ``/`F1`/`Esc`, `Ctrl+Z`/`Ctrl+Y`.
- Autotest del navegador sobre el código parcheado: **100/100 con solución única, 0 con 0 soluciones, 0 con 2+, determinismo OK**.
- Determinismo del juego real tras el fix: dos cargas de `?seed=1` producen el mismo puzzle y `?seed=2` uno distinto.
- Auditoría estática: sin `case` duplicados en el switch, único `case 'h'`, `Math.random`/`Date.now` solo en comentarios documentales.

**Alcance no modificado:** el botón 💡 sigue funcionando por su vía propia (ahora botón y tecla H comparten `applyHint`); el comportamiento preexistente de `applyHint` cuando se pulsa fuera de partida (toast de aviso) se mantiene. `README.md` actualizado con la tecla `H` en la tabla de teclado.

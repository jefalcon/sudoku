# Project knowledge

## What this project is
Juego de Sudoku completo y jugable en un único archivo HTML. El objetivo principal
es la CORRECCIÓN ALGORÍTMICA: generación de puzzles con SOLUCIÓN ÚNICA GARANTIZADA
y dificultad graduada de forma honesta. Este proyecto es una prueba de concepto
para validar el pipeline de orquestación de agentes.

## Stack & conventions
- Un único archivo: `index.html` con HTML + CSS + JavaScript vanilla
- Sin frameworks, sin librerías externas, sin CDN, sin build process
- Debe funcionar abriendo el archivo directamente (file://), totalmente offline
- Idioma del código, comentarios y mensajes de usuario: español
- Tablero clásico de 9x9 con 9 cajas de 3x3

## Commands the agents should use
- Open: `xdg-open index.html` (Linux) o abrir manualmente en navegador
- Validate: abrir index.html en navegador y verificar que carga sin errores de consola
- Test: usar el overlay de depuración (tecla ` o F1) y ejecutar AUTOTEST
- Reproducibility: `index.html?seed=1&level=medio` (siempre el mismo puzzle)

## Layout
sudoku/
├── index.html # Archivo único: HTML + CSS + JS (todo el juego)
├── README.md # Documentación: controles, criterios de dificultad, autotest
├── knowledge.md # Este archivo (contexto compartido)
├── LOG_SESION.md # Log detallado de todas las actividades de agentes
└── .agents/ # Definiciones de agentes oh-my-freebuff


## Gotchas
- PROHIBIDO servir puzzles desde una lista/banco hardcodeado o pregenerado.
  Cada puzzle debe generarse de verdad a partir de la semilla y el nivel.
- El solver (punto 3) es la instrumentación de auditoría de unicidad. NO debe
  usarse para autocompletar el juego por el jugador.
- Fácil y medio deben ser resolibles ÚNICAMENTE con lógica deductiva (sin
  backtracking ni conjeturas). Todos los niveles tienen solución única.
- El autotest debe generar >=100 puzzles y verificar que TODOS tienen exactamente
  1 solución (no 0, no 2+). Esta es la auditoría crítica.
- Math.random() está PROHIBIDO. Todo el azar pasa por un único RNG sembrable
  (?seed=N).
- Las pistas iniciales del puzzle NO se pueden sobrescribir ni borrar.

## Definition of done
Para considerar el proyecto completado:
1. index.html funciona abriéndolo directamente en navegador (file://)
2. Con el overlay activo, el solver reporta EXACTAMENTE 1 solución para cualquier
   puzzle generado, en cualquier nivel y semilla
3. El autotest sobre >=100 puzzles no encuentra ninguno con 0 ni con 2+ soluciones
4. Los puzzles de nivel fácil y medio se resuelven sin adivinar, solo con lógica
5. ?seed=1 + el mismo nivel produce el mismo puzzle en dos cargas distintas
6. Cambiar la semilla cambia el puzzle (evidencia de generación real)
7. Las pistas iniciales no se pueden modificar
8. README.md documenta: cómo abrirlo, controles exactos, criterio de dificultad
   de cada nivel, cómo lanzar el autotest, tabla de parámetros
9. LOG_SESION.md documenta todas las actividades, roles, decisiones y resultados

## Autotest obligatorio
El overlay de depuración incluye botón de AUTOTEST que:
- Genera N puzzles (por defecto 100) recorriendo semillas
- Verifica que TODOS tienen solución única
- Imprime cuántos pasan y cuántos fallan (0 soluciones o 2+)
- Esta es la auditoría de que el generador no hace trampa

## Criterios de dificultad (graduada por técnica lógica)
- Fácil: singles desnudos/ocultos únicamente
- Medio: pares/tríos, pero sin técnicas avanzadas
- Difícil: técnicas intermedias (X-Wing, Swordfish, etc.)
- Experto: técnicas avanzadas (puede requerir backtracking)

La dificultad se gradúa por la TÉCNICA LÓGICA más difícil necesaria, NO solo
por el número de pistas.

## Controles requeridos
- Ratón: seleccionar celda
- Teclado: flechas (navegar), 1-9 (rellenar), 0/Supr (borrar)
- Modo notas/candidatos: una tecla lo alterna
- Enter: nueva partida
- P: pausa
- R: reiniciar puzzle actual
- M: silenciar audio (si hay)
- ` o F1: overlay de depuración

## Ayudas requeridas
- Comprobar (toggle): resalta conflictos
- Pista (limitada): rellena UNA celda con deducción lógica válida y nombra la técnica
- Deshacer/rehacer
- Cronómetro
- Contador de errores

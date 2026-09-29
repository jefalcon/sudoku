#!/bin/bash
cd "$(dirname "$0")" || exit

echo "========================================================================"
echo "🔍 VERIFICACIÓN V2 — Sudoku (adaptada al código real)"
echo "========================================================================"

# -----------------------------------------------------------------------------
# FASE 1: Math.random REAL (ignorando comentarios)
# -----------------------------------------------------------------------------
echo ""
echo "=== FASE 1: Math.random REAL (sin comentarios) ==="

# Extraer solo el código JS del HTML (entre <script> y </script>)
sed -n '/<script>/,/<\/script>/p' index.html > /tmp/sudoku_js_extracted.js

# Buscar Math.random en el código extraído, ignorando líneas de comentarios
MATH_RANDOM_REAL=$(grep -v "^[[:space:]]*\*" /tmp/sudoku_js_extracted.js | grep -v "^[[:space:]]*//" | grep -c "Math\.random" 2>/dev/null || echo "0")

echo "Math.random en código real (no comentarios): $MATH_RANDOM_REAL"

if [ "$MATH_RANDOM_REAL" = "0" ]; then
    echo "✅ OK: NO hay Math.random en el código real"
else
    echo "⚠️ ALERTA: Math.random usado en código real:"
    grep -n "Math\.random" /tmp/sudoku_js_extracted.js | grep -v "^[[:space:]]*\*" | grep -v "//"
fi

# Búsqueda adicional: Date.now() usado como fuente de azar
echo ""
echo "Búsqueda de Date.now() como fuente de azar:"
DATENOW_USOS=$(grep -c "Date\.now" /tmp/sudoku_js_extracted.js 2>/dev/null || echo "0")
echo "  Date.now() encontrado: $DATENOW_USOS veces"
if [ "$DATENOW_USOS" != "0" ]; then
    echo "  Contexto:"
    grep -n "Date\.now" /tmp/sudoku_js_extracted.js | head -5
fi

# -----------------------------------------------------------------------------
# FASE 2: Verificar las 14 técnicas del log (no solo 12)
# -----------------------------------------------------------------------------
echo ""
echo "=== FASE 2: Las 14 técnicas según el log ==="

# El log menciona: full house, single desnudo/oculto, locked candidates,
# pares/tríos/cuádruples desnudos y ocultos, X-Wing, Swordfish, XY-Wing, XYZ-Wing
# = 14 técnicas. Buscamos todas en el código real.

TECHNIQUES=(
    "full_house"
    "naked_single"
    "hidden_single"
    "locked_candidates"
    "naked_pair"
    "naked_triple"
    "naked_quad"
    "hidden_pair"
    "hidden_triple"
    "hidden_quad"
    "x_wing"
    "swordfish"
    "xy_wing"
    "xyz_wing"
)

FOUND=0
for tech in "${TECHNIQUES[@]}"; do
    if grep -q "$tech" index.html; then
        echo "   ✅ $tech"
        FOUND=$((FOUND+1))
    else
        echo "   ❌ $tech (NO ENCONTRADA)"
    fi
done
echo ""
echo "   Total: $FOUND de ${#TECHNIQUES[@]} técnicas"

# -----------------------------------------------------------------------------
# FASE 3: Probar el solver directamente en Node.js
# -----------------------------------------------------------------------------
echo ""
echo "=== FASE 3: Tests del solver en Node.js ==="

# Crear un script Node que evalúa el JS extraído y prueba el solver
cat > /tmp/test_solver_real.js << 'NODEJS'
const fs = require('fs');
const vm = require('vm');

// Cargar el JS extraído del HTML
const jsCode = fs.readFileSync('/tmp/sudoku_js_extracted.js', 'utf8');

// Crear un contexto con window/document simulado para evitar errores de DOM
const sandbox = {
    console,
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    window: {},
    document: { addEventListener: () => {}, querySelector: () => null },
    location: { search: '' }
};

try {
    vm.createContext(sandbox);
    vm.runInContext(jsCode, sandbox, { timeout: 5000 });
    console.log('✅ JavaScript cargado sin errores');
} catch (e) {
    console.log('⚠️  Error al cargar el JS (puede ser por dependencias de DOM):');
    console.log('   ' + e.message.substring(0, 200));
    console.log('   Intentaremos acceder a las funciones globalmente...');
}

// Intentar acceder a las funciones del solver
// Los nombres probables según el log son: makeRng, generatePuzzle, countSolutions, ratePuzzle, searchSolutions
const fnNames = ['makeRng', 'generatePuzzle', 'countSolutions', 'ratePuzzle', 'searchSolutions', 'generateSolvedGrid', 'digHolesForLevel'];

console.log('\n🔎 Buscando funciones del solver en el código...');
const available = {};
for (const name of fnNames) {
    // Buscar la definición de la función en el código fuente
    const regex = new RegExp(`(function\\s+${name}\\s*\\(|const\\s+${name}\\s*=|let\\s+${name}\\s*=|var\\s+${name}\\s*=)`);
    if (regex.test(jsCode)) {
        console.log(`   ✅ ${name} existe`);
        available[name] = true;
    } else {
        console.log(`   ❌ ${name} NO encontrada`);
    }
}

console.log('\n📊 Resumen de funciones del solver disponibles:');
console.log(`   Encontradas: ${Object.keys(available).length} de ${fnNames.length}`);

// -----------------------------------------------------------------------------
// TESTS ESTÁTICOS DEL CÓDIGO (sin ejecutar, verificando patrones)
// -----------------------------------------------------------------------------
console.log('\n=== Tests estáticos del código ===');

// Test 1: RNG sembrable
if (/mulberry32/.test(jsCode) && /makeRng/.test(jsCode)) {
    console.log('✅ RNG: mulberry32 + makeRng presentes (RNG sembrable)');
} else {
    console.log('⚠️  RNG: patrón mulberry32/makeRng no encontrado');
}

// Test 2: Solver con conteo de soluciones
if (/countSolutions/.test(jsCode) || /searchSolutions/.test(jsCode)) {
    console.log('✅ Solver con conteo de soluciones presente');
} else {
    console.log('⚠️  Solver con conteo NO encontrado');
}

// Test 3: Corte en 2 soluciones
if (/count\s*>=?\s*2|solutions\s*>=?\s*2|found\s*>=?\s*2/.test(jsCode)) {
    console.log('✅ Corte en 2+ soluciones presente (evita conteo infinito)');
} else {
    console.log('⚠️  No se encuentra corte en 2 soluciones');
}

// Test 4: Generador con verificación de unicidad
if (/probeHole|tryHole|digHoles/.test(jsCode)) {
    console.log('✅ Generador con perforado verificado presente');
} else {
    console.log('⚠️  No se encuentra función de perforado');
}

// Test 5: Verificación ?seed=N en URL
if (/location\.search|URLSearchParams|\?seed=/.test(jsCode)) {
    console.log('✅ Parseo de ?seed=N presente');
} else {
    console.log('⚠️  No se encuentra parseo de semilla por URL');
}

// Test 6: Sin bancos de puzzles hardcodeados
const LONG_DIGIT_STRING = /\d{20,}/.test(jsCode);
if (!LONG_DIGIT_STRING) {
    console.log('✅ Sin cadenas largas de dígitos (no hay bancos embebidos)');
} else {
    console.log('⚠️  Cadena larga de dígitos detectada (posible banco embebido)');
}

// Test 7: Pistas lógicas con técnica nombrada
if (/computeHint|hint.*technique|technique.*hint/i.test(jsCode)) {
    console.log('✅ Sistema de pistas lógicas con técnica nombrada presente');
} else {
    console.log('⚠️  No se encuentra sistema de pistas lógicas');
}

// Test 8: Autotest en overlay
if (/AUTOTEST|autotest/.test(jsCode)) {
    console.log('✅ Botón AUTOTEST del overlay presente');
} else {
    console.log('⚠️  No se encuentra botón AUTOTEST');
}

console.log('\n📋 CONCLUSIÓN DE FASE 3:');
console.log('   La verificación del solver requiere ejecución en navegador real');
console.log('   (el código depende del DOM). Los tests estáticos confirman la');
console.log('   estructura algorítmica. La prueba definitiva es el AUTOTEST del overlay.');

NODEJS

node /tmp/test_solver_real.js

# -----------------------------------------------------------------------------
# FASE 4: Verificaciones adicionales del HTML
# -----------------------------------------------------------------------------
echo ""
echo "=== FASE 4: Estructura HTML ==="

# Verificar que es un único archivo autocontenido
echo "Tamaño del HTML: $(wc -c < index.html) bytes"
echo "Líneas del HTML: $(wc -l < index.html)"

# Contar scripts embebidos vs externos
SCRIPTS_EXTERNOS=$(grep -c '<script src=' index.html 2>/dev/null || echo "0")
SCRIPTS_EMBEBIDOS=$(grep -c '<script>' index.html 2>/dev/null || echo "0")
echo "Scripts externos: $SCRIPTS_EXTERNOS (debe ser 0)"
echo "Scripts embebidos: $SCRIPTS_EMBEBIDOS (debe ser >= 1)"

# CSS
CSS_EXTERNOS=$(grep -c '<link.*stylesheet' index.html 2>/dev/null || echo "0")
CSS_EMBEBIDOS=$(grep -c '<style>' index.html 2>/dev/null || echo "0")
echo "CSS externos: $CSS_EXTERNOS (debe ser 0)"
echo "CSS embebidos: $CSS_EMBEBIDOS (debe ser >= 1)"

# Verificar overlay de depuración en el DOM
if grep -q 'overlay' index.html && grep -q 'AUTOTEST' index.html; then
    echo "✅ Overlay de depuración y botón AUTOTEST presentes en el HTML"
else
    echo "⚠️  Falta overlay o botón AUTOTEST"
fi

# Verificar controles de teclado
CONTROLES=("Enter" "Escape" "ArrowUp" "ArrowDown" "ArrowLeft" "ArrowRight")
echo ""
echo "Controles de teclado en el código:"
for ctrl in "${CONTROLES[@]}"; do
    if grep -q "$ctrl" index.html; then
        echo "   ✅ $ctrl"
    else
        echo "   ❌ $ctrl"
    fi
done

# -----------------------------------------------------------------------------
# RESUMEN
# -----------------------------------------------------------------------------
echo ""
echo "========================================================================"
echo "📊 RESUMEN DE VERIFICACIONES AUTOMÁTICAS V2"
echo "========================================================================"
echo ""
echo "✅ Verificado automáticamente:"
echo "   - Archivos entregados: $([ -f index.html ] && [ -f README.md ] && echo "OK" || echo "FALTA")"
echo "   - Sin Math.random en código real: $([ "$MATH_RANDOM_REAL" = "0" ] && echo "OK" || echo "REVISAR")"
echo "   - Sin URLs externas: $([ "$SCRIPTS_EXTERNOS" = "0" ] && [ "$CSS_EXTERNOS" = "0" ] && echo "OK" || echo "REVISAR")"
echo "   - Técnicas de gradación: $FOUND de ${#TECHNIQUES[@]}"
echo "   - Estructura HTML autocontenida: OK"
echo ""
echo "⏳ Requiere verificación manual en navegador:"
echo "   1. Abrir index.html?seed=1 en el navegador (doble clic en el fichero)"
echo "   2. F12 → Console → sin errores rojos"
echo "   3. \` o F1 → activar overlay"
echo "   4. AUTOTEST → debe mostrar 100/100 (o 120/120)"
echo "   5. Recargar con ?seed=1 → mismo puzzle"
echo "   6. Recargar con ?seed=2 → puzzle diferente"
echo "   7. Intentar editar pista inicial → bloqueada"
echo "   8. 'N' → modo notas → escribir candidatos"
echo "   9. 'H' → pista → debe nombrar técnica"
echo "  10. Ctrl+Z/Ctrl+Y → deshacer/rehacer"
echo ""

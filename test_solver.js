// Extraer el núcleo del solver de index.html para probarlo aisladamente
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Buscar el marcador de inicio y fin del núcleo algorítmico
const startMarker = '// === NÚCLEO ALGORÍTMICO ===';
const endMarker = '// === FIN NÚCLEO ALGORÍTMICO ===';
const startIndex = html.indexOf(startMarker);
const endIndex = html.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.log('❌ No se encontraron los marcadores del núcleo algorítmico');
    process.exit(1);
}

const coreCode = html.substring(startIndex, endIndex + endMarker.length);

// Evaluar el código del núcleo
eval(coreCode);

console.log('✅ Núcleo extraído correctamente');
console.log('');

// Caso 1: Puzzle válido con solución única
const puzzle1 = [
    [5,3,0,0,7,0,0,0,0],
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9]
];
console.log('Caso 1: Puzzle válido clásico');
const solutions1 = countSolutions(puzzle1);
console.log(`   Soluciones encontradas: ${solutions1}`);
console.log(`   Esperado: 1, Resultado: ${solutions1 === 1 ? '✅ OK' : '❌ FALLO'}`);
console.log('');

// Caso 2: Puzzle vacío (múltiples soluciones)
const puzzle2 = Array(9).fill().map(() => Array(9).fill(0));
console.log('Caso 2: Puzzle vacío (debe tener 2+ soluciones)');
const solutions2 = countSolutions(puzzle2);
console.log(`   Soluciones encontradas: ${solutions2}`);
console.log(`   Esperado: 2+, Resultado: ${solutions2 >= 2 ? '✅ OK' : '❌ FALLO'}`);
console.log('');

// Caso 3: Puzzle inválido (conflicto de fila)
const puzzle3 = [
    [5,5,0,0,7,0,0,0,0], // Dos 5 en la misma fila
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9]
];
console.log('Caso 3: Puzzle inválido (conflicto de fila)');
const solutions3 = countSolutions(puzzle3);
console.log(`   Soluciones encontradas: ${solutions3}`);
console.log(`   Esperado: 0, Resultado: ${solutions3 === 0 ? '✅ OK' : '❌ FALLO'}`);
console.log('');

// Caso 4: Determinismo con seed=1
console.log('Caso 4: Determinismo (seed=1, nivel=facil)');
const puzzle4a = generatePuzzle(1, 'facil');
const puzzle4b = generatePuzzle(1, 'facil');
const equal = JSON.stringify(puzzle4a) === JSON.stringify(puzzle4b);
console.log(`   Puzzles iguales: ${equal}`);
console.log(`   Resultado: ${equal ? '✅ OK' : '❌ FALLO'}`);
console.log('');

// Caso 5: Cambio de semilla produce puzzle diferente
console.log('Caso 5: Diferente semilla (seed=1 vs seed=2)');
const puzzle5a = generatePuzzle(1, 'facil');
const puzzle5b = generatePuzzle(2, 'facil');
const different = JSON.stringify(puzzle5a) !== JSON.stringify(puzzle5b);
console.log(`   Puzzles diferentes: ${different}`);
console.log(`   Resultado: ${different ? '✅ OK' : '❌ FALLO'}`);

console.log('');
console.log('=== RESUMEN ===');
const allPassed = (solutions1 === 1) && (solutions2 >= 2) && (solutions3 === 0) && equal && different;
console.log(allPassed ? '✅ TODAS LAS PRUEBAS DEL SOLVER PASARON' : '❌ ALGUNAS PRUEBAS FALLARON');

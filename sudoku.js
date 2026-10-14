'use strict';

// === RNG (única fuente de azar; prohibido el azar sin semilla) ===
// Mulberry32: determinista para la misma semilla en cualquier navegador.

/**
 * Crea un generador aleatorio sembrable.
 */
function makeRng(seed) {
  var state = (Number(seed) || 1) >>> 0;
  if (state === 0) state = 1;
  return {
    /** Número pseudoaleatorio en [0, 1). */
    next: function () {
      state |= 0;
      state = (state + 0x6D2B79F5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** Entero en [0, n). */
    int: function (n) {
      return Math.floor(this.next() * n);
    },
    /** Copia mezclada (Fisher-Yates) usando este RNG. */
    shuffled: function (values) {
      var arr = values.slice();
      for (var i = arr.length - 1; i > 0; i--) {
        var j = this.int(i + 1);
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    }
  };
}

// === SOLVER / ORÁCULO DE UNICIDAD ===
// Backtracking con propagación de singles desnudos y heurística MRV sobre
// máscaras de bits. Cuenta soluciones deteniéndose en `cap` (por defecto 2:
// basta distinguir 0 / 1 / "2 o más"). NO se usa para autocompletar la partida.

var NMASK = 511; // 9 bits: candidatos 1-9.

function rowOf(i) { return (i / 9) | 0; }
function colOf(i) { return i % 9; }
function boxOf(i) { return (((i / 9) | 0) / 3 | 0) * 3 + (((i % 9) / 3) | 0); }

/** Índice (0-8) del único bit activo. */
function bitIndex(bit) {
  var i = 0;
  while ((bit >>= 1) > 0) i++;
  return i;
}

/** Nº de bits activos (popcount). */
function popcount(m) {
  var n = 0;
  while (m > 0) { m &= m - 1; n++; }
  return n;
}

/**
 * Inicializa las máscaras de dígitos usados desde una cuadrícula.
 * Devuelve null si la cuadrícula ya trae conflictos.
 */
function initMasks(cells) {
  var rowM = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var colM = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var boxM = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (var i = 0; i < 81; i++) {
    var v = cells[i];
    if (v === 0) continue;
    var bit = 1 << (v - 1);
    var r = rowOf(i), c = colOf(i), b = boxOf(i);
    if ((rowM[r] & bit) || (colM[c] & bit) || (boxM[b] & bit)) return null;
    rowM[r] |= bit;
    colM[c] |= bit;
    boxM[b] |= bit;
  }
  return { rowM: rowM, colM: colM, boxM: boxM };
}

/**
 * Cuenta las soluciones de la cuadrícula hasta `cap` (defecto 2).
 * Cuadrícula: array de 81 (0 = vacía). No modifica la entrada.
 */
function countSolutions(cells, cap) {
  var max = cap || 2;
  var work = cells.slice();
  var masks = initMasks(work);
  if (masks === null) return 0;
  var total = 0;

  function place(i, bit) {
    work[i] = bitIndex(bit) + 1;
    masks.rowM[rowOf(i)] |= bit;
    masks.colM[colOf(i)] |= bit;
    masks.boxM[boxOf(i)] |= bit;
  }

  function search() {
    if (total >= max) return;
    // Propagación: coloca singles desnudos hasta punto fijo.
    for (;;) {
      var progress = false;
      for (var i = 0; i < 81; i++) {
        if (work[i] !== 0) continue;
        var m = ~(masks.rowM[rowOf(i)] | masks.colM[colOf(i)] | masks.boxM[boxOf(i)]) & NMASK;
        if (m === 0) return; // Contradicción: esta rama no vale.
        if ((m & (m - 1)) === 0) {
          place(i, m);
          progress = true;
        }
      }
      if (!progress) break;
    }
    // MRV: celda vacía con menos candidatos.
    var best = -1, bestM = 0, bestN = 10;
    for (var j = 0; j < 81; j++) {
      if (work[j] !== 0) continue;
      var cm = ~(masks.rowM[rowOf(j)] | masks.colM[colOf(j)] | masks.boxM[boxOf(j)]) & NMASK;
      var cn = popcount(cm);
      if (cn < bestN) {
        bestN = cn;
        best = j;
        bestM = cm;
        if (cn === 2) break;
      }
    }
    if (best === -1) {
      total++;
      return;
    }
    // Ramifica probando cada candidato (copia el estado).
    var rest = bestM;
    while (rest !== 0 && total < max) {
      var bit = rest & -rest;
      rest ^= bit;
      var savedCells = work.slice();
      var savedRow = masks.rowM.slice();
      var savedCol = masks.colM.slice();
      var savedBox = masks.boxM.slice();
      place(best, bit);
      search();
      work = savedCells;
      masks.rowM = savedRow;
      masks.colM = savedCol;
      masks.boxM = savedBox;
    }
  }

  search();
  return total;
}

/**
 * Rellena una cuadrícula completa válida usando el RNG dado.
 * Devuelve array de 81 con valores 1-9.
 */
function fillGrid(rng) {
  var cells = new Array(81).fill(0);
  var rowM = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var colM = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var boxM = [0, 0, 0, 0, 0, 0, 0, 0, 0];

  function search() {
    var best = -1, bestM = 0, bestN = 10;
    for (var i = 0; i < 81; i++) {
      if (cells[i] !== 0) continue;
      var m = ~(rowM[rowOf(i)] | colM[colOf(i)] | boxM[boxOf(i)]) & NMASK;
      var n = popcount(m);
      if (n === 0) return false;
      if (n < bestN) {
        bestN = n;
        best = i;
        bestM = m;
        if (n === 1) break;
      }
    }
    if (best === -1) return true;
    var bits = [];
    var rest = bestM;
    while (rest !== 0) {
      var b = rest & -rest;
      rest ^= b;
      bits.push(b);
    }
    bits = rng.shuffled(bits);
    for (var k = 0; k < bits.length; k++) {
      cells[best] = bitIndex(bits[k]) + 1;
      rowM[rowOf(best)] |= bits[k];
      colM[colOf(best)] |= bits[k];
      boxM[boxOf(best)] |= bits[k];
      if (search()) return true;
      cells[best] = 0;
      rowM[rowOf(best)] &= ~bits[k];
      colM[colOf(best)] &= ~bits[k];
      boxM[boxOf(best)] &= ~bits[k];
    }
    return false;
  }

  search();
  return cells;
}

/**
 * Resuelve con orden determinista (sin azar). Solo para tests.
 */
function solveFirst(cells) {
  var work = cells.slice();
  var masks = initMasks(work);
  if (masks === null) return null;
  function search() {
    var best = -1, bestM = 0, bestN = 10;
    for (var i = 0; i < 81; i++) {
      if (work[i] !== 0) continue;
      var m = ~(masks.rowM[rowOf(i)] | masks.colM[colOf(i)] | masks.boxM[boxOf(i)]) & NMASK;
      var n = popcount(m);
      if (n === 0) return false;
      if (n < bestN) { bestN = n; best = i; bestM = m; if (n === 1) break; }
    }
    if (best === -1) return true;
    for (var b = 1; b <= 256; b <<= 1) {
      if (!(bestM & b)) continue;
      work[best] = bitIndex(b) + 1;
      masks.rowM[rowOf(best)] |= b;
      masks.colM[colOf(best)] |= b;
      masks.boxM[boxOf(best)] |= b;
      if (search()) return true;
      work[best] = 0;
      masks.rowM[rowOf(best)] &= ~b;
      masks.colM[colOf(best)] &= ~b;
      masks.boxM[boxOf(best)] &= ~b;
    }
    return false;
  }
  return search() ? work : null;
}

// === LÓGICA DEDUCTIVA (técnicas sin adivinar) ===
// Unidades: 27 grupos de 9 índices (filas, columnas, cajas).

var UNITS = (function () {
  var units = [];
  var r, c, i;
  for (r = 0; r < 9; r++) {
    var row = [];
    for (c = 0; c < 9; c++) row.push(r * 9 + c);
    units.push(row);
  }
  for (c = 0; c < 9; c++) {
    var col = [];
    for (r = 0; r < 9; r++) col.push(r * 9 + c);
    units.push(col);
  }
  for (var br = 0; br < 3; br++) {
    for (var bc = 0; bc < 3; bc++) {
      var box = [];
      for (r = 0; r < 3; r++) {
        for (c = 0; c < 3; c++) box.push((br * 3 + r) * 9 + (bc * 3 + c));
      }
      units.push(box);
    }
  }
  return units;
})();

// Niveles de técnica (menor = más básica).
var TIER_NAKED_SINGLE = 1;
var TIER_HIDDEN_SINGLE = 2;
var TIER_NAKED_PAIR = 3;
var TIER_HIDDEN_PAIR = 4;
var TIER_POINTING = 5;
var TIER_NAKED_TRIPLE = 6;
var TIER_XWING = 7;

var TECH_NAMES = {
  1: 'Single desnudo',
  2: 'Single oculto',
  3: 'Pareja desnuda',
  4: 'Pareja oculta',
  5: 'Apuntado (box-line)',
  6: 'Trío desnudo',
  7: 'X-Wing'
};

/**
 * Candidatos (máscara de bits) de cada celda según los valores actuales.
 */
function computeCandidates(values) {
  var masks = initMasks(values);
  var cands = new Array(81);
  for (var i = 0; i < 81; i++) {
    if (values[i] !== 0) {
      cands[i] = 0;
    } else if (masks === null) {
      cands[i] = NMASK;
    } else {
      cands[i] = ~(masks.rowM[rowOf(i)] | masks.colM[colOf(i)] | masks.boxM[boxOf(i)]) & NMASK;
    }
  }
  return cands;
}

/**
 * Busca el primer paso deductivo aplicable (sin adivinar) en orden de
 * dificultad creciente. Devuelve { tier, placements, eliminations } o null.
 * placements: [{ idx, val }]. eliminations: [{ idx, mask }].
 */
function findLogicalStep(values, cands) {
  var u, i, d, bit;
  // Tier 1: single desnudo (celda con un solo candidato).
  for (i = 0; i < 81; i++) {
    if (values[i] === 0 && cands[i] !== 0 && (cands[i] & (cands[i] - 1)) === 0) {
      return { tier: TIER_NAKED_SINGLE, placements: [{ idx: i, val: bitIndex(cands[i]) + 1 }], eliminations: [] };
    }
  }
  // Tier 2: single oculto (dígito que solo cabe en una celda de la unidad).
  for (u = 0; u < 27; u++) {
    for (d = 1; d <= 9; d++) {
      bit = 1 << (d - 1);
      var count = 0, where = -1, filled = false;
      for (i = 0; i < 9; i++) {
        var idx = UNITS[u][i];
        if (values[idx] === d) { filled = true; break; }
        if (values[idx] === 0 && (cands[idx] & bit)) { count++; where = idx; }
      }
      if (!filled && count === 1) {
        return { tier: TIER_HIDDEN_SINGLE, placements: [{ idx: where, val: d }], eliminations: [] };
      }
    }
  }
  // Tier 3: pareja desnuda (dos celdas con los mismos 2 candidatos).
  for (u = 0; u < 27; u++) {
    for (i = 0; i < 9; i++) {
      var a = UNITS[u][i];
      if (values[a] !== 0 || popcount(cands[a]) !== 2) continue;
      for (var j = i + 1; j < 9; j++) {
        var b = UNITS[u][j];
        if (values[b] !== 0 || cands[b] !== cands[a]) continue;
        var elims = [];
        for (var k = 0; k < 9; k++) {
          var o = UNITS[u][k];
          if (o === a || o === b || values[o] !== 0) continue;
          if (cands[o] & cands[a]) elims.push({ idx: o, mask: cands[a] });
        }
        if (elims.length > 0) {
          return { tier: TIER_NAKED_PAIR, placements: [], eliminations: elims };
        }
      }
    }
  }
  // Tier 4: pareja oculta (dos dígitos que solo caben en las mismas 2 celdas).
  for (u = 0; u < 27; u++) {
    for (var d1 = 1; d1 <= 9; d1++) {
      for (var d2 = d1 + 1; d2 <= 9; d2++) {
        var cells12 = [];
        for (i = 0; i < 9; i++) {
          var q = UNITS[u][i];
          if (values[q] !== 0) continue;
          if ((cands[q] & ((1 << (d1 - 1)) | (1 << (d2 - 1)))) !== 0) cells12.push(q);
          if (cells12.length > 2) break;
        }
        if (cells12.length !== 2) continue;
        var keep = (1 << (d1 - 1)) | (1 << (d2 - 1));
        var p = cells12[0], qq = cells12[1];
        // Ambos dígitos deben aparecer al menos una vez entre las dos celdas.
        if (!(cands[p] & (1 << (d1 - 1))) && !(cands[qq] & (1 << (d1 - 1)))) continue;
        if (!(cands[p] & (1 << (d2 - 1))) && !(cands[qq] & (1 << (d2 - 1)))) continue;
        var drop = [];
        if (cands[p] & ~keep) drop.push({ idx: p, mask: cands[p] & ~keep });
        if (cands[qq] & ~keep) drop.push({ idx: qq, mask: cands[qq] & ~keep });
        if (drop.length > 0) {
          return { tier: TIER_HIDDEN_PAIR, placements: [], eliminations: drop };
        }
      }
    }
  }
  // Tier 5: apuntado (en una caja, un dígito confinado a una fila/columna
  // elimina ese dígito del resto de la fila/columna fuera de la caja).
  for (var bx = 18; bx < 27; bx++) {
    var box = UNITS[bx];
    for (d = 1; d <= 9; d++) {
      bit = 1 << (d - 1);
      var spots = [];
      for (i = 0; i < 9; i++) {
        if (values[box[i]] === 0 && (cands[box[i]] & bit)) spots.push(box[i]);
      }
      if (spots.length < 2) continue;
      // Misma fila.
      var rr = rowOf(spots[0]);
      var sameRow = spots.every(function (s) { return rowOf(s) === rr; });
      if (sameRow) {
        var cut = [];
        for (var c = 0; c < 9; c++) {
          var t = rr * 9 + c;
          if (box.indexOf(t) === -1 && values[t] === 0 && (cands[t] & bit)) {
            cut.push({ idx: t, mask: bit });
          }
        }
        if (cut.length > 0) {
          return { tier: TIER_POINTING, placements: [], eliminations: cut };
        }
      }
      // Misma columna.
      var cc = colOf(spots[0]);
      var sameCol = spots.every(function (s) { return colOf(s) === cc; });
      if (sameCol) {
        var cutC = [];
        for (var r2 = 0; r2 < 9; r2++) {
          var t2 = r2 * 9 + cc;
          if (box.indexOf(t2) === -1 && values[t2] === 0 && (cands[t2] & bit)) {
            cutC.push({ idx: t2, mask: bit });
          }
        }
        if (cutC.length > 0) {
          return { tier: TIER_POINTING, placements: [], eliminations: cutC };
        }
      }
    }
  }
  // Tier 6: trío desnudo (tres celdas cuya unión es exactamente 3 dígitos).
  for (u = 0; u < 27; u++) {
    var empties = [];
    for (i = 0; i < 9; i++) {
      var e = UNITS[u][i];
      if (values[e] === 0 && cands[e] !== 0) empties.push(e);
    }
    for (var a3 = 0; a3 < empties.length; a3++) {
      for (var b3 = a3 + 1; b3 < empties.length; b3++) {
        for (var c3 = b3 + 1; c3 < empties.length; c3++) {
          var union = cands[empties[a3]] | cands[empties[b3]] | cands[empties[c3]];
          if (popcount(union) !== 3) continue;
          var trim = [];
          for (var k3 = 0; k3 < 9; k3++) {
            var o3 = UNITS[u][k3];
            if (o3 === empties[a3] || o3 === empties[b3] || o3 === empties[c3]) continue;
            if (values[o3] !== 0) continue;
            if (cands[o3] & union) trim.push({ idx: o3, mask: union });
          }
          if (trim.length > 0) {
            return { tier: TIER_NAKED_TRIPLE, placements: [], eliminations: trim };
          }
        }
      }
    }
  }
  // Tier 7: X-Wing por filas y por columnas.
  for (d = 1; d <= 9; d++) {
    bit = 1 << (d - 1);
    var rowPairs = [];
    for (var rw = 0; rw < 9; rw++) {
      var colsHit = [];
      for (var cl = 0; cl < 9; cl++) {
        var w = rw * 9 + cl;
        if (values[w] === 0 && (cands[w] & bit)) colsHit.push(cl);
      }
      if (colsHit.length === 2) rowPairs.push({ line: rw, spans: colsHit });
    }
    for (var p1 = 0; p1 < rowPairs.length; p1++) {
      for (var p2 = p1 + 1; p2 < rowPairs.length; p2++) {
        if (rowPairs[p1].spans[0] !== rowPairs[p2].spans[0] ||
            rowPairs[p1].spans[1] !== rowPairs[p2].spans[1]) continue;
        var wing = [];
        for (var rw2 = 0; rw2 < 9; rw2++) {
          if (rw2 === rowPairs[p1].line || rw2 === rowPairs[p2].line) continue;
          for (var s = 0; s < 2; s++) {
            var w2 = rw2 * 9 + rowPairs[p1].spans[s];
            if (values[w2] === 0 && (cands[w2] & bit)) wing.push({ idx: w2, mask: bit });
          }
        }
        if (wing.length > 0) {
          return { tier: TIER_XWING, placements: [], eliminations: wing };
        }
      }
    }
    var colPairs = [];
    for (var cl2 = 0; cl2 < 9; cl2++) {
      var rowsHit = [];
      for (var rw3 = 0; rw3 < 9; rw3++) {
        var w3 = rw3 * 9 + cl2;
        if (values[w3] === 0 && (cands[w3] & bit)) rowsHit.push(rw3);
      }
      if (rowsHit.length === 2) colPairs.push({ line: cl2, spans: rowsHit });
    }
    for (var q1 = 0; q1 < colPairs.length; q1++) {
      for (var q2 = q1 + 1; q2 < colPairs.length; q2++) {
        if (colPairs[q1].spans[0] !== colPairs[q2].spans[0] ||
            colPairs[q1].spans[1] !== colPairs[q2].spans[1]) continue;
        var wingC = [];
        for (var cl3 = 0; cl3 < 9; cl3++) {
          if (cl3 === colPairs[q1].line || cl3 === colPairs[q2].line) continue;
          for (var s2 = 0; s2 < 2; s2++) {
            var w4 = colPairs[q1].spans[s2] * 9 + cl3;
            if (values[w4] === 0 && (cands[w4] & bit)) wingC.push({ idx: w4, mask: bit });
          }
        }
        if (wingC.length > 0) {
          return { tier: TIER_XWING, placements: [], eliminations: wingC };
        }
      }
    }
  }
  return null;
}

/**
 * Aplica un paso lógico a valores/candidatos.
 */
function applyLogicalStep(values, cands, step) {
  var i, e;
  for (i = 0; i < step.placements.length; i++) {
    values[step.placements[i].idx] = step.placements[i].val;
  }
  // Tras colocar, los candidatos se recalculan fuera.
  for (i = 0; i < step.eliminations.length; i++) {
    e = step.eliminations[i];
    cands[e.idx] &= ~e.mask;
  }
}

/**
 * Resuelve solo con deducción (máximo nivel maxTier). No adivina.
 * Devuelve { solved, maxUsed }.
 */
function solveLogical(values, maxTier) {
  var work = values.slice();
  var cands = computeCandidates(work);
  var maxUsed = 0;
  for (;;) {
    var complete = true;
    for (var i = 0; i < 81; i++) {
      if (work[i] === 0) { complete = false; break; }
    }
    if (complete) return { solved: true, maxUsed: maxUsed };
    var step = findLogicalStep(work, cands);
    if (step === null || step.tier > maxTier) return { solved: false, maxUsed: maxUsed };
    if (step.tier > maxUsed) maxUsed = step.tier;
    applyLogicalStep(work, cands, step);
    if (step.placements.length > 0) {
      // Al colocar valores, los candidatos se rederivan del tablero.
      cands = computeCandidates(work);
    }
    // Las eliminaciones persisten en `cands`: cada vuelta reduce
    // celdas vacías o bits candidatos, luego siempre termina.
  }
}

/**
 * Técnica más difícil necesaria para resolver el puzzle sin adivinar.
 * Devuelve { tier, name }: tier 8 = requiere búsqueda.
 */
function hardestTechnique(values) {
  var res = solveLogical(values, TIER_XWING);
  if (res.solved) {
    return { tier: res.maxUsed, name: TECH_NAMES[res.maxUsed] || 'Directo' };
  }
  return { tier: 8, name: 'Búsqueda (backtracking)' };
}

// === GENERADOR ===
// 1) Cuadrícula-solución completa desde el RNG. 2) Perforado celda a celda:
// una celda solo se retira si el puzzle resultante sigue teniendo EXACTAMENTE
// 1 solución (oráculo countSolutions) y, salvo en experto, sigue resoluble
// con las técnicas permitidas del nivel. Prohibido el banco de puzzles.

var LEVELS = ['facil', 'medio', 'dificil', 'experto'];

var LEVEL_CFG = {
  facil: { minTier: 1, maxTier: TIER_HIDDEN_SINGLE, minClues: 36 },
  medio: { minTier: 2, maxTier: TIER_HIDDEN_PAIR, minClues: 30 },
  dificil: { minTier: 3, maxTier: TIER_XWING, minClues: 26 },
  experto: { minTier: 5, maxTier: 8, minClues: 22 }
};

// Reintentos máximos para alcanzar la banda de dificultad (deterministas:
// consumen el mismo RNG en secuencia; si se agotan, se entrega el mejor
// intento, siempre con solución única).
var MAX_GRADE_ATTEMPTS = 100;

var LEVEL_LABEL = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil', experto: 'Experto' };

/**
 * Genera un puzzle real a partir del RNG y el nivel.
 * Devuelve { puzzle, solution, clues, grade } (arrays de 81).
 */
function digPuzzle(rng, cfg) {
  var solution = fillGrid(rng);
  var puzzle = solution.slice();
  var clues = 81;
  var order = rng.shuffled(
    Array.apply(null, { length: 81 }).map(function (_, i) { return i; })
  );
  for (var k = 0; k < order.length; k++) {
    if (clues <= cfg.minClues) break;
    var idx = order[k];
    var backup = puzzle[idx];
    puzzle[idx] = 0;
    // Unicidad: si deja de haber exactamente 1 solución, se restaura.
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[idx] = backup;
      continue;
    }
    // Graduación honesta: el nivel debe seguir resoluble con su lógica.
    if (cfg.maxTier < 8 && !solveLogical(puzzle, cfg.maxTier).solved) {
      puzzle[idx] = backup;
      continue;
    }
    clues--;
  }
  return { puzzle: puzzle, solution: solution, clues: clues };
}

/**
 * Genera un puzzle real a partir del RNG y el nivel.
 * Reintenta (determinista) hasta que la técnica requerida cae en la banda
 * [minTier, maxTier] del nivel. Devuelve { puzzle, solution, clues, grade }.
 */
function generatePuzzle(rng, level) {
  if (LEVELS.indexOf(level) === -1) throw new Error('Nivel desconocido: ' + level);
  var cfg = LEVEL_CFG[level];
  var best = null;
  for (var attempt = 0; attempt < MAX_GRADE_ATTEMPTS; attempt++) {
    var dug = digPuzzle(rng, cfg);
    var grade = hardestTechnique(dug.puzzle);
    var cand = { puzzle: dug.puzzle, solution: dug.solution, clues: dug.clues, grade: grade, level: level };
    if (grade.tier >= cfg.minTier) return cand;
    if (best === null || grade.tier > best.grade.tier) best = cand;
  }
  return best;
}

/**
 * Nº de pistas (celdas distintas de cero).
 */
function countClues(cells) {
  var n = 0;
  for (var i = 0; i < 81; i++) {
    if (cells[i] !== 0) n++;
  }
  return n;
}

// === ESTADO ===
// Tableros como arrays de 81 (0 = vacía). `puzzle` son las pistas iniciales
// (inmutables); `solution` la solución; `board` los valores actuales;
// `notes` máscaras de candidatos de lápiz; `hinted` celdas de pista (fijas).

var puzzle = null;
var solution = null;
var board = null;
var notes = null;
var hinted = null;
var level = 'medio';
var seed = 1;
var grade = null;
var selected = -1;
var notesMode = false;
var checkMode = true;
var errors = 0;
var hintsUsed = 0;
var HINTS_MAX = 3;
var undoStack = [];
var redoStack = [];
var status = 'start'; // start | playing | paused | solved
var elapsedMs = 0;
var lastTick = 0;
var timerId = null;
var bests = { facil: null, medio: null, dificil: null, experto: null };
var muted = false;
var audioCtx = null;

var boardEl = null, padEl = null, timerEl = null, errorsEl = null;
var hintsEl = null, bestEl = null, messageEl = null, levelNameEl = null;
var cellEls = [];
var padButtons = [];

// === UI ===

/** Formatea milisegundos como mm:ss. */
function formatTime(ms) {
  var s = Math.floor(ms / 1000);
  var m = Math.floor(s / 60);
  s = s % 60;
  return (m < 10 ? '0' + m : '' + m) + ':' + (s < 10 ? '0' + s : '' + s);
}

function showMessage(text, kind) {
  messageEl.textContent = text;
  messageEl.className = 'message' + (kind ? ' ' + kind : '');
}

/** Índices con el mismo valor repetido en su fila, columna o caja. */
function findValueConflicts(values) {
  var bad = {};
  function scan(cells) {
    var seen = {};
    for (var i = 0; i < cells.length; i++) {
      var v = values[cells[i]];
      if (v === 0) continue;
      if (seen[v] !== undefined) {
        bad[cells[i]] = true;
        bad[seen[v]] = true;
      } else {
        seen[v] = cells[i];
      }
    }
  }
  for (var u = 0; u < 27; u++) scan(UNITS[u]);
  return bad;
}

/** true si poner val en idx duplica un valor ya presente. */
function placementConflicts(values, idx, val) {
  var r = rowOf(idx), c = colOf(idx);
  for (var k = 0; k < 9; k++) {
    if (values[r * 9 + k] === val || values[k * 9 + c] === val) return true;
  }
  var br = (r / 3 | 0) * 3, bc = (c / 3 | 0) * 3;
  for (var dr = 0; dr < 3; dr++) {
    for (var dc = 0; dc < 3; dc++) {
      if (values[(br + dr) * 9 + (bc + dc)] === val) return true;
    }
  }
  return false;
}

function isGiven(idx) { return puzzle[idx] !== 0; }
function isLocked(idx) { return isGiven(idx) || hinted[idx]; }

function buildBoard() {
  boardEl.innerHTML = '';
  cellEls = [];
  for (var i = 0; i < 81; i++) {
    (function (idx) {
      var cell = document.createElement('div');
      cell.className = 'cell';
      cell.addEventListener('click', function () {
        if (status !== 'playing') return;
        selected = idx;
        renderBoard();
      });
      boardEl.appendChild(cell);
      cellEls.push(cell);
    })(i);
  }
}

function buildPad() {
  padEl.innerHTML = '';
  padButtons = [];
  for (var n = 1; n <= 9; n++) {
    (function (num) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.addEventListener('click', function () { handleNumberInput(num); });
      padEl.appendChild(btn);
      padButtons.push(btn);
    })(n);
  }
  var erase = document.createElement('button');
  erase.type = 'button';
  erase.textContent = 'Borrar';
  erase.addEventListener('click', function () { eraseSelected(); });
  padEl.appendChild(erase);
}

function renderNotes(el, mask) {
  var html = '<span class="notes">';
  for (var n = 1; n <= 9; n++) {
    html += '<span>' + ((mask & (1 << (n - 1))) ? n : '') + '</span>';
  }
  el.innerHTML = html + '</span>';
}

function renderBoard() {
  var conflicts = checkMode ? findValueConflicts(board) : {};
  var selVal = selected >= 0 ? board[selected] : 0;
  for (var i = 0; i < 81; i++) {
    var el = cellEls[i];
    var v = board[i];
    if (v !== 0) {
      el.textContent = String(v);
    } else if (notes[i] !== 0) {
      renderNotes(el, notes[i]);
    } else {
      el.textContent = '';
    }
    el.classList.toggle('given', isGiven(i));
    el.classList.toggle('hinted', !isGiven(i) && hinted[i]);
    el.classList.toggle('selected', i === selected);
    el.classList.toggle('related', i !== selected && selected >= 0 && (
      rowOf(i) === rowOf(selected) || colOf(i) === colOf(selected) || boxOf(i) === boxOf(selected)
    ));
    el.classList.toggle('same', selVal !== 0 && v === selVal && i !== selected);
    el.classList.toggle('conflict', !!conflicts[i]);
  }
  for (var n = 1; n <= 9; n++) {
    var btn = padButtons[n - 1];
    btn.textContent = String(n);
    btn.classList.toggle('active', selVal === n);
  }
  timerEl.textContent = formatTime(elapsedMs);
  errorsEl.textContent = String(errors);
  hintsEl.textContent = String(HINTS_MAX - hintsUsed);
  var b = bests[level];
  bestEl.textContent = (b === null || b === undefined) ? '--:--' : formatTime(b);
  levelNameEl.textContent = '· ' + LEVEL_LABEL[level];
}

/** Coloca un número o alterna un candidato según el modo. */
function handleNumberInput(num) {
  if (status !== 'playing' || selected < 0) return;
  if (isLocked(selected)) {
    showMessage('Las pistas iniciales no se pueden modificar.', 'warning');
    return;
  }
  if (board[selected] !== 0 && !notesMode) {
    if (board[selected] === num) return;
  }
  if (notesMode) {
    if (board[selected] !== 0) return;
    var bit = 1 << (num - 1);
    notes[selected] ^= bit;
    showMessage('', '');
    renderBoard();
    return;
  }
  var prev = board[selected];
  if (prev === num) return;
  if (placementConflicts(board, selected, num)) {
    errors++;
    beep(200, 0.15);
  } else {
    beep(600, 0.06);
  }
  undoStack.push({ idx: selected, prevVal: prev, nextVal: num, prevNotes: notes[selected], nextNotes: 0 });
  redoStack = [];
  board[selected] = num;
  notes[selected] = 0;
  showMessage('', '');
  renderBoard();
  checkWin();
}

function eraseSelected() {
  if (status !== 'playing' || selected < 0) return;
  if (isLocked(selected)) return;
  if (board[selected] === 0 && notes[selected] === 0) return;
  undoStack.push({ idx: selected, prevVal: board[selected], nextVal: 0, prevNotes: notes[selected], nextNotes: notes[selected] });
  redoStack = [];
  board[selected] = 0;
  showMessage('', '');
  renderBoard();
}

function undoMove() {
  if (status !== 'playing') return;
  var last = undoStack.pop();
  if (!last) {
    showMessage('No hay movimientos que deshacer.', 'warning');
    return;
  }
  redoStack.push(last);
  board[last.idx] = last.prevVal;
  notes[last.idx] = last.prevNotes;
  selected = last.idx;
  showMessage('', '');
  renderBoard();
}

function redoMove() {
  if (status !== 'playing') return;
  var next = redoStack.pop();
  if (!next) {
    showMessage('No hay movimientos que rehacer.', 'warning');
    return;
  }
  undoStack.push(next);
  board[next.idx] = next.nextVal;
  notes[next.idx] = next.nextNotes;
  selected = next.idx;
  showMessage('', '');
  renderBoard();
  checkWin();
}

/**
 * Pista honesta: solo rellena si hay una deducción lógica (single desnudo u
 * oculto) válida en la posición actual, y nombra la técnica. El valor se
 * contrasta con la solución para no mentir si el jugador metió un error:
 * en ese caso no se consume la pista. Límite: HINTS_MAX por partida.
 */
function giveHint() {
  if (status !== 'playing') return;
  if (hintsUsed >= HINTS_MAX) {
    showMessage('Ya usaste las ' + HINTS_MAX + ' pistas de esta partida.', 'warning');
    return;
  }
  if (Object.keys(findValueConflicts(board)).length > 0) {
    showMessage('Hay conflictos en el tablero: actívalos con Comprobar y corrígelos antes de pedir pista.', 'error');
    return;
  }
  var cands = computeCandidates(board);
  var step = findLogicalStep(board, cands);
  if (step === null || step.placements.length === 0 ||
      step.tier > TIER_HIDDEN_SINGLE) {
    showMessage('No hay deducción simple disponible ahora mismo.', 'warning');
    return;
  }
  var move = step.placements[0];
  if (solution[move.idx] !== move.val) {
    showMessage('Hay un error en el tablero que impide deducir: revísalo.', 'error');
    return;
  }
  undoStack.push({ idx: move.idx, prevVal: 0, nextVal: move.val, prevNotes: notes[move.idx], nextNotes: 0 });
  redoStack = [];
  board[move.idx] = move.val;
  notes[move.idx] = 0;
  hinted[move.idx] = true;
  selected = move.idx;
  hintsUsed++;
  beep(800, 0.08);
  showMessage('Pista (' + TECH_NAMES[step.tier] + '): fila ' + (rowOf(move.idx) + 1) +
    ', columna ' + (colOf(move.idx) + 1) + ' = ' + move.val + '.', 'success');
  renderBoard();
  checkWin();
}

function toggleCheck() {
  checkMode = !checkMode;
  document.getElementById('btn-check').textContent = 'Comprobar: ' + (checkMode ? 'ON' : 'OFF');
  renderBoard();
}

function toggleNotes() {
  notesMode = !notesMode;
  document.getElementById('btn-notes').textContent = 'Notas: ' + (notesMode ? 'ON' : 'OFF');
  document.getElementById('btn-notes').classList.toggle('on', notesMode);
  showMessage(notesMode ? 'Modo notas: 1-9 ponen/quitan candidatos.' : '', '');
}

function togglePause() {
  if (status === 'playing') {
    status = 'paused';
    document.getElementById('pause-veil').classList.remove('hidden');
  } else if (status === 'paused') {
    status = 'playing';
    document.getElementById('pause-veil').classList.add('hidden');
    lastTick = Date.now();
  }
  renderBoard();
}

/** Reinicia el puzzle actual (misma semilla y nivel). */
function restartPuzzle() {
  board = puzzle.slice();
  notes = new Array(81).fill(0);
  hinted = new Array(81).fill(false);
  selected = -1;
  errors = 0;
  hintsUsed = 0;
  undoStack = [];
  redoStack = [];
  elapsedMs = 0;
  lastTick = Date.now();
  status = 'playing';
  document.getElementById('pause-veil').classList.add('hidden');
  document.getElementById('victory-veil').classList.add('hidden');
  showMessage('Puzzle reiniciado.', '');
  renderBoard();
}

function checkWin() {
  if (status !== 'playing') return;
  for (var i = 0; i < 81; i++) {
    if (board[i] === 0) return;
  }
  if (Object.keys(findValueConflicts(board)).length > 0) return;
  status = 'solved';
  var finalMs = elapsedMs;
  var prev = bests[level];
  if (prev === null || prev === undefined || finalMs < prev) {
    bests[level] = finalMs;
  }
  beep(660, 0.1);
  setTimeout(function () { beep(880, 0.15); }, 120);
  var info = 'Nivel ' + LEVEL_LABEL[level] + ' · Tiempo final: ' + formatTime(finalMs) +
    ' · Récord: ' + formatTime(bests[level]) + ' · Errores: ' + errors;
  document.getElementById('victory-info').textContent = info;
  document.getElementById('victory-veil').classList.remove('hidden');
  renderBoard();
}

function tickTimer() {
  if (status !== 'playing') return;
  var now = Date.now();
  elapsedMs += now - lastTick;
  lastTick = now;
  timerEl.textContent = formatTime(elapsedMs);
}

/** Pitido minimalista (WebAudio, offline). M lo silencia. */
function beep(freq, seconds) {
  if (muted) return;
  try {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + seconds);
  } catch (e) {
    // Sin audio: el juego sigue igual.
  }
}

function toggleMute() {
  muted = !muted;
  document.getElementById('btn-mute').textContent = 'Sonido: ' + (muted ? 'OFF' : 'ON');
  showMessage(muted ? 'Sonido silenciado (M para activar).' : 'Sonido activado.', '');
}

// === OVERLAY DE DEPURACIÓN + AUTOTEST ===
// Oculto por defecto (` o F1). Muestra en vivo seed, nivel, pistas,
// nº de soluciones del solver para el puzzle (siempre 1) y la técnica
// más difícil requerida. El AUTOTEST genera N puzzles recorriendo
// semillas y afirma que todos tienen solución única.

function updateDebug() {
  document.getElementById('dbg-seed').textContent = puzzle ? String(seed) : '-';
  document.getElementById('dbg-level').textContent = puzzle ? LEVEL_LABEL[level] : '-';
  document.getElementById('dbg-clues').textContent = puzzle ? String(countClues(puzzle)) : '-';
  document.getElementById('dbg-count').textContent = puzzle ? String(countSolutions(puzzle, 2)) : '-';
  document.getElementById('dbg-tech').textContent = grade ? grade.name : '-';
}

function toggleDebug() {
  var dbg = document.getElementById('debug');
  dbg.classList.toggle('hidden');
  if (!dbg.classList.contains('hidden')) updateDebug();
}

function autotestLine(text, cls) {
  var box = document.getElementById('autotest-results');
  var div = document.createElement('div');
  if (cls) div.className = cls;
  div.textContent = text;
  box.appendChild(div);
}

/**
 * Genera N puzzles (semillas base..base+N-1, rotando los 4 niveles) y
 * afirma: solución única (count === 1) y, en fácil/medio, resoluble solo
 * con la lógica del nivel. Informa pasados/fallidos por nivel.
 */
function runAutotest() {
  var nInput = parseInt(document.getElementById('autotest-n').value, 10);
  var baseInput = parseInt(document.getElementById('autotest-base').value, 10);
  var total = isNaN(nInput) ? 100 : Math.min(1000, Math.max(1, nInput));
  var base = isNaN(baseInput) ? 1 : Math.max(1, baseInput);
  var btn = document.getElementById('btn-autotest');
  var box = document.getElementById('autotest-results');
  box.innerHTML = '';
  btn.disabled = true;
  var perLevel = { facil: 0, medio: 0, dificil: 0, experto: 0 };
  var perLevelFail = { facil: 0, medio: 0, dificil: 0, experto: 0 };
  var logicFails = 0;
  var failed = [];
  var i = 0;
  autotestLine('Autotest: ' + total + ' puzzles desde semilla ' + base + '…');

  function chunk() {
    var end = Math.min(total, i + 4);
    for (; i < end; i++) {
      var lv = LEVELS[i % 4];
      var sd = base + i;
      var gen = generatePuzzle(makeRng(sd), lv);
      var c = countSolutions(gen.puzzle, 2);
      if (c === 1) {
        perLevel[lv]++;
        if ((lv === 'facil' || lv === 'medio') &&
            !solveLogical(gen.puzzle, LEVEL_CFG[lv].maxTier).solved) {
          logicFails++;
          failed.push('seed=' + sd + ' ' + lv + ': exige conjetura');
        }
      } else {
        perLevelFail[lv]++;
        failed.push('seed=' + sd + ' ' + lv + ': ' + c + ' soluciones');
      }
    }
    box.firstChild.textContent = 'Autotest: ' + i + '/' + total + '…';
    if (i < total) {
      setTimeout(chunk, 0);
      return;
    }
    var pass = total - failed.length;
    autotestLine('TOTAL: ' + pass + '/' + total + ' únicos' +
      (failed.length === 0 ? ' — TODO OK' : ' — ' + failed.length + ' FALLOS'),
      failed.length === 0 ? 'pass' : 'fail');
    for (var l = 0; l < LEVELS.length; l++) {
      var lv2 = LEVELS[l];
      autotestLine('  ' + LEVEL_LABEL[lv2] + ': ' + perLevel[lv2] + ' únicos, ' +
        perLevelFail[lv2] + ' fallos', perLevelFail[lv2] === 0 ? 'pass' : 'fail');
    }
    autotestLine('Fácil/medio sin conjetura: ' +
      (logicFails === 0 ? 'OK' : logicFails + ' FALLOS'), logicFails === 0 ? 'pass' : 'fail');
    for (var f = 0; f < Math.min(10, failed.length); f++) {
      autotestLine('  ' + failed[f], 'fail');
    }
    btn.disabled = false;
  }

  setTimeout(chunk, 0);
}

// === PANTALLAS E INICIALIZACIÓN ===

function showScreen(name) {
  document.getElementById('screen-start').classList.toggle('hidden', name !== 'start');
  document.getElementById('screen-game').classList.toggle('hidden', name !== 'game');
  status = name === 'game' ? 'playing' : 'start';
}

/** Lee ?seed=N de la URL (defecto 1). Funciona en file://. */
function seedFromUrl() {
  try {
    var m = /[?&]seed=(\d+)/.exec(window.location.search || '');
    if (m) return Math.max(1, parseInt(m[1], 10));
  } catch (e) {
    // Sin acceso a la URL: semilla por defecto.
  }
  return 1;
}

/** Intenta reflejar la semilla en la URL sin recargar (best-effort). */
function pushSeedToUrl(sd) {
  try {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '?seed=' + sd);
    }
  } catch (e) {
    // file:// puede no permitirlo: no pasa nada.
  }
}

/**
 * Empieza una partida con nivel y semilla dados (generación real con el RNG).
 */
function startGame(lv, sd) {
  level = lv;
  seed = sd;
  pushSeedToUrl(sd);
  var gen = generatePuzzle(makeRng(sd), lv);
  puzzle = gen.puzzle;
  solution = gen.solution;
  grade = gen.grade;
  board = puzzle.slice();
  notes = new Array(81).fill(0);
  hinted = new Array(81).fill(false);
  selected = -1;
  notesMode = false;
  errors = 0;
  hintsUsed = 0;
  undoStack = [];
  redoStack = [];
  elapsedMs = 0;
  document.getElementById('btn-notes').textContent = 'Notas: OFF';
  document.getElementById('btn-notes').classList.remove('on');
  document.getElementById('btn-check').textContent = 'Comprobar: ON';
  checkMode = true;
  document.getElementById('pause-veil').classList.add('hidden');
  document.getElementById('victory-veil').classList.add('hidden');
  showMessage('', '');
  showScreen('game');
  lastTick = Date.now();
  renderBoard();
  updateDebug();
}

/** Nueva partida: mismo nivel, siguiente semilla (puzzle distinto). */
function newSeedGame() {
  var lv = level === undefined ? pendingLevel : level;
  var sd = (status === 'start' || seed === undefined) ? seed : seed + 1;
  showScreen('game');
  showMessage('Generando puzzle (semilla ' + sd + ')…', '');
  setTimeout(function () { startGame(lv, sd); }, 30);
}

var pendingLevel = 'medio';

function moveSelection(dRow, dCol) {
  var cur = selected >= 0 ? selected : 40;
  var r = (rowOf(cur) + dRow + 9) % 9;
  var c = (colOf(cur) + dCol + 9) % 9;
  selected = r * 9 + c;
  renderBoard();
}

function onKeyDown(event) {
  if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA')) {
    return;
  }
  var key = event.key;
  if (key === 'F1') {
    event.preventDefault();
    toggleDebug();
    return;
  }
  if (key === '`') {
    toggleDebug();
    return;
  }
  if (status === 'start') {
    if (key >= '1' && key <= '4') {
      startLevel(LEVELS[Number(key) - 1]);
    } else if (key === 'Enter') {
      beginFromStart();
    }
    return;
  }
  if (key === 'p' || key === 'P') {
    if (status === 'playing' || status === 'paused') togglePause();
    return;
  }
  if (status === 'solved') {
    if (key === 'Enter') newSeedGame();
    return;
  }
  if (status !== 'playing') return;
  if (key === 'Enter') {
    newSeedGame();
  } else if (/^[1-9]$/.test(key)) {
    handleNumberInput(Number(key));
  } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
    event.preventDefault();
    eraseSelected();
  } else if (key === 'ArrowUp') {
    event.preventDefault();
    moveSelection(-1, 0);
  } else if (key === 'ArrowDown') {
    event.preventDefault();
    moveSelection(1, 0);
  } else if (key === 'ArrowLeft') {
    event.preventDefault();
    moveSelection(0, -1);
  } else if (key === 'ArrowRight') {
    event.preventDefault();
    moveSelection(0, 1);
  } else if (key === 'n' || key === 'N') {
    toggleNotes();
  } else if (key === 'c' || key === 'C') {
    toggleCheck();
  } else if (key === 'h' || key === 'H') {
    giveHint();
  } else if (key === 'r' || key === 'R') {
    restartPuzzle();
  } else if (key === 'm' || key === 'M') {
    toggleMute();
  } else if (key === 'u' || key === 'U') {
    undoMove();
  } else if (key === 'y' || key === 'Y') {
    redoMove();
  } else if ((event.ctrlKey || event.metaKey) && (key === 'z' || key === 'Z')) {
    event.preventDefault();
    if (event.shiftKey) redoMove();
    else undoMove();
  } else if ((event.ctrlKey || event.metaKey) && (key === 'y' || key === 'Y')) {
    event.preventDefault();
    redoMove();
  }
}

function markLevelButtons() {
  var btns = document.querySelectorAll('#screen-start [data-level]');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('on', btns[i].getAttribute('data-level') === pendingLevel);
  }
}

/** Lee la semilla del campo de texto (defecto 1). */
function readSeedInput() {
  var input = document.getElementById('seed-input');
  var sd = parseInt(input.value, 10);
  if (isNaN(sd) || sd < 1) sd = 1;
  return sd;
}

/**
 * Elige nivel y arranca la partida de inmediato con la semilla indicada.
 * Es lo que ocurre al pulsar un botón de nivel o las teclas 1-4.
 */
function startLevel(lv) {
  pendingLevel = lv;
  level = lv;
  seed = readSeedInput();
  markLevelButtons();
  newSeedGame();
}

function beginFromStart() {
  seed = readSeedInput();
  level = pendingLevel;
  newSeedGame();
}

function initGame() {
  boardEl = document.getElementById('board');
  padEl = document.getElementById('pad');
  timerEl = document.getElementById('timer');
  errorsEl = document.getElementById('errors');
  hintsEl = document.getElementById('hints-left');
  bestEl = document.getElementById('best');
  messageEl = document.getElementById('message');
  levelNameEl = document.getElementById('level-name');

  buildBoard();
  buildPad();

  var levelBtns = document.querySelectorAll('#screen-start [data-level]');
  for (var i = 0; i < levelBtns.length; i++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        startLevel(btn.getAttribute('data-level'));
      });
    })(levelBtns[i]);
  }
  document.getElementById('seed-input').value = String(seedFromUrl());
  document.getElementById('btn-start').addEventListener('click', beginFromStart);
  document.getElementById('btn-check').addEventListener('click', toggleCheck);
  document.getElementById('btn-hint').addEventListener('click', giveHint);
  document.getElementById('btn-undo').addEventListener('click', undoMove);
  document.getElementById('btn-redo').addEventListener('click', redoMove);
  document.getElementById('btn-notes').addEventListener('click', toggleNotes);
  document.getElementById('btn-pause').addEventListener('click', togglePause);
  document.getElementById('btn-restart').addEventListener('click', restartPuzzle);
  document.getElementById('btn-new2').addEventListener('click', newSeedGame);
  document.getElementById('btn-mute').addEventListener('click', toggleMute);
  document.getElementById('btn-again').addEventListener('click', newSeedGame);
  document.getElementById('btn-view').addEventListener('click', function () {
    document.getElementById('victory-veil').classList.add('hidden');
  });
  document.getElementById('btn-autotest').addEventListener('click', runAutotest);
  document.addEventListener('keydown', onKeyDown);

  seed = seedFromUrl();
  pendingLevel = 'medio';
  markLevelButtons();
  showScreen('start');
  lastTick = Date.now();
  timerId = setInterval(tickTimer, 250);
}

// El script va al final del <body>: el DOM ya existe.
initGame();

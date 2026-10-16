// BH on the kept cells (the scan and run path, bhOnKept) against the full family (bhAdjust). Kept cells are the
// p-values at or below stats.pKeep; m is the family size (every tested cell). Expected: equal within 1e-12 for every
// kept p, and null for every p above pKeep. The planted defect (m off by one) must break the equality.
import { test, assert } from '../core/harness.js';
import { bhAdjust, bhOnKept } from '../core/stats/fdr.js';
import { mulberry32 } from '../core/synth.js';
import { stats } from '../config/stats.js';

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const TOL = 1e-12;
const FAMILY = 60;
const FAMILY_SEED = 3;
const PLANT_M_STEP = 1;

// Cubing a uniform draw puts about a third of the p-values below 0.05, so both sides of pKeep are populated.
function family() {
  const rnd = mulberry32(FAMILY_SEED);
  return Array.from({ length: FAMILY }, () => rnd() ** 3);
}

function keptIndex(p) {
  return p.map((_, i) => i).filter((i) => p[i] <= stats.pKeep);
}

// The exactness contract (run.js header) covers q below pKeep. A kept cell with full q at or above pKeep can differ
// (dropped cells with larger p can sit below it at high rank); the scan reports null there, so the output is unaffected.
test('BH on kept p-values: raw q equals the full-family q within 1e-12 wherever the full q is below pKeep', () => {
  const p = family();
  const full = bhAdjust(p, p.length);
  const idx = keptIndex(p);
  assert.ok(idx.length > 0 && idx.length < p.length, 'family has kept and dropped cells');
  const raw = bhAdjust(idx.map((i) => p[i]), p.length);
  const exact = idx.filter((i) => full[i] < stats.pKeep);
  assert.ok(exact.length > 0, 'some kept cells have q below pKeep');
  idx.forEach((i, j) => {
    if (full[i] < stats.pKeep) assert.ok(near(raw[j], full[i], TOL), `index ${i}: kept ${raw[j]}, full ${full[i]}`);
  });
});

test('bhOnKept: q below pKeep for kept cells equals the full family; null where the full q is at or above pKeep', () => {
  const p = family();
  const full = bhAdjust(p, p.length);
  const idx = keptIndex(p);
  const qk = bhOnKept(idx.map((i) => p[i]), p.length, stats.pKeep);
  idx.forEach((i, j) => {
    if (full[i] < stats.pKeep) assert.ok(near(qk[j], full[i], TOL), `index ${i}: kept ${qk[j]}, full ${full[i]}`);
    else assert.equal(qk[j], null, `index ${i} is null`);
  });
  p.forEach((v, i) => {
    if (v > stats.pKeep) assert.ok(full[i] >= stats.pKeep, `dropped index ${i} has full q below pKeep`);
  });
});

test('planted defect: family size off by one changes the kept q values', () => {
  const p = family();
  const full = bhAdjust(p, p.length);
  const idx = keptIndex(p);
  const raw = bhAdjust(idx.map((i) => p[i]), p.length + PLANT_M_STEP);
  const differing = idx.filter((i, j) => !near(raw[j], full[i], TOL)).length;
  assert.ok(differing > 0, 'no kept q changed with m + 1');
});

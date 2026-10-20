// CIE Lab colour maths (phase 4g.3, Node). Every case pins one exported function: the Lab hand triples, the deltaE76
// distances, the minPairwiseDeltaE lists, the symmetry, and the __proto__/non-string inputs that must throw. run-test
// executes this file; the mutation gate runs it against app\core\color-lab.js.
import { test, assert } from '../core/harness.js';
import { labOf, deltaE76, minPairwiseDeltaE } from '../core/color-lab.js';

// Two values are close enough when they agree to tol, avoiding float noise in the Lab comparison.
const CLOSE = (a, b, tol) => Math.abs(a - b) <= tol;

test('labOf: black, white and mid grey', () => {
  assert.deepEqual(labOf('#000000'), [0, 0, 0], 'black is L=0');
  assert.ok(CLOSE(labOf('#ffffff')[0], 100, 0.01) && CLOSE(labOf('#ffffff')[1], 0, 0.01) && CLOSE(labOf('#ffffff')[2], 0, 0.01), 'white [100,0,0]');
  assert.ok(CLOSE(labOf('#808080')[0], 53.59, 0.01) && CLOSE(labOf('#808080')[1], 0, 0.01) && CLOSE(labOf('#808080')[2], 0, 0.01), 'grey [53.59,0,0]');
});

test('labOf: the three primaries', () => {
  const [L, a, b] = labOf('#ff0000');
  assert.ok(CLOSE(L, 53.24, 0.01) && CLOSE(a, 80.09, 0.01) && CLOSE(b, 67.20, 0.01), 'red');
  const [L2, a2, b2] = labOf('#00ff00');
  assert.ok(CLOSE(L2, 87.73, 0.01) && CLOSE(a2, -86.18, 0.01) && CLOSE(b2, 83.18, 0.01), 'green');
  const [L3, a3, b3] = labOf('#0000ff');
  assert.ok(CLOSE(L3, 32.30, 0.01) && CLOSE(a3, 79.19, 0.01) && CLOSE(b3, -107.86, 0.01), 'blue');
});

test('labOf: the series dark colour', () => {
  const [L, a, b] = labOf('#1e2129');
  assert.ok(CLOSE(L, 12.76, 0.01) && CLOSE(a, 0.88, 0.01) && CLOSE(b, -5.81, 0.01), '1e2129');
});

test('deltaE76: the exact and tolerance hand distances', () => {
  assert.ok(CLOSE(deltaE76('#ffffff', '#000000'), 100, 0.01), 'white vs black is 100');
  assert.ok(CLOSE(deltaE76('#ff0000', '#ff0000'), 0, 1e-9), 'same colour is 0');
  assert.ok(CLOSE(deltaE76('#000000', '#808080'), 53.59, 0.01), 'black vs grey');
  assert.ok(CLOSE(deltaE76('#ff0000', '#00ff00'), 170.57, 0.01), 'red vs green');
  assert.ok(CLOSE(deltaE76('#56b4e9', '#4f8fd8'), 20.1, 0.1), 'palette pair, tol 0.1');
});

test('deltaE76: symmetry across three pairs', () => {
  for (const [a, b] of [['#ff0000', '#00ff00'], ['#1e2129', '#56b4e9'], ['#808080', '#0000ff']]) {
    assert.ok(CLOSE(deltaE76(a, b), deltaE76(b, a), 1e-9), `${a} vs ${b} symmetric`);
  }
});

test('minPairwiseDeltaE: three colours, a single colour, and an empty list', () => {
  assert.ok(CLOSE(minPairwiseDeltaE(['#ffffff', '#000000', '#808080']), 46.41, 0.01), 'three colours');
  assert.ok(minPairwiseDeltaE(['#ffffff']) === Infinity, 'one colour is Infinity');
  assert.ok(minPairwiseDeltaE([]) === Infinity, 'empty list is Infinity');
});

test('minPairwiseDeltaE: the dark and light series lists', () => {
  const dark = ['#209bf6', '#e5c45f', '#eb6b98', '#2ddfb3', '#5bbed3', '#df7b4e', '#6da449', '#d6bcf1'];
  assert.ok(CLOSE(minPairwiseDeltaE(dark), 40.79, 0.05), 'dark list');
  const light = ['#9d3723', '#176dc7', '#437a20', '#84693b', '#7f3f92', '#116550', '#86455a', '#057698'];
  assert.ok(CLOSE(minPairwiseDeltaE(light), 35.40, 0.05), 'light list');
});

test('labOf: an invalid colour throws TypeError', () => {
  for (const bad of ['red', '#fff', '#12345g', null, undefined, 123, {}, '__proto__', 'constructor']) {
    let threw = false;
    try { labOf(bad); } catch (e) { threw = e instanceof TypeError; }
    assert.ok(threw, `labOf(${JSON.stringify(bad)}) must throw TypeError`);
  }
});

test('deltaE76: an invalid colour throws TypeError', () => {
  let threw = false;
  try { deltaE76('#000000', 'nope'); } catch (e) { threw = e instanceof TypeError; }
  assert.ok(threw, 'bad second colour must throw TypeError');
});

test('minPairwiseDeltaE: a bad entry throws TypeError', () => {
  for (const bad of [['#000000', '__proto__'], ['#000000', 'red'], ['#000000', null]]) {
    let threw = false;
    try { minPairwiseDeltaE(bad); } catch (e) { threw = e instanceof TypeError; }
    assert.ok(threw, `minPairwiseDeltaE(${JSON.stringify(bad)}) must throw TypeError`);
  }
});

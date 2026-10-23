// Mood-influence interval (phase 4h.3, Node). Every case pins one exported function: the hand values from the brief
// (the exact reference output), the gating statuses, determinism and no input change, and the exact bad inputs that
// must throw. run-test executes this file; the mutation gate runs it against app\core\mood-influence.js.
import { test, assert } from '../core/harness.js';
import { moodInfluence } from '../core/mood-influence.js';

// Two values agree when they match to this tolerance, avoiding float noise in the comparison.
const CLOSE = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
// A function must throw the given error type when called.
const throwsType = (fn, ErrorType) => {
  try {
    fn();
  } catch (e) {
    return e instanceof ErrorType;
  }
  return false;
};

// The reference inputs from brief section M1.
const P = [1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0];
const M = [4, 5, 3, 2, null, 3, 5, 2, 3, 4, 5, 1];
const O = { seed: 7, resamples: 200, blockLength: 2, level: 0.9, minPerGroup: 2, maxSkipShare: 0.5 };

test('moodInfluence: full-data means and diff, hand case 1', () => {
  const r = moodInfluence(P, M, O);
  assert.ok(r.status === 'ok', 'status ok');
  assert.ok(r.n1 === 5, 'n1');
  assert.ok(r.n0 === 6, 'n0');
  assert.ok(CLOSE(r.mean1, 4.6), 'mean1');
  assert.ok(CLOSE(r.mean0, 2.3333333333333335), 'mean0');
  assert.ok(CLOSE(r.diff, 2.266666666666666), 'diff');
  assert.ok(r.blockLength === 2, 'blockLength copied');
  assert.ok(CLOSE(r.level, 0.9), 'level copied');
});

test('moodInfluence: bootstrap interval and counts, hand case 1 exact', () => {
  const r = moodInfluence(P, M, O);
  assert.ok(CLOSE(r.lo, 1.685714285714286), 'lo');
  assert.ok(CLOSE(r.hi, 2.875), 'hi');
  assert.ok(r.resamples === 199, 'resamples');
  assert.ok(r.skipped === 1, 'skipped');
  assert.ok(r.lo <= r.diff && r.diff <= r.hi, 'lo <= diff <= hi');
});

test('moodInfluence: bootstrap interval, hand case 2 (seed 8)', () => {
  const r = moodInfluence(P, M, { ...O, seed: 8 });
  assert.ok(CLOSE(r.lo, 1.8000000000000003), 'lo');
  assert.ok(CLOSE(r.hi, 2.833333333333334), 'hi');
  assert.ok(r.resamples === 199, 'resamples');
  assert.ok(r.skipped === 1, 'skipped');
  assert.ok(CLOSE(r.mean1, 4.6), 'mean1 unchanged');
  assert.ok(CLOSE(r.diff, 2.266666666666666), 'diff unchanged');
});

test('moodInfluence: too-few-days gating, hand case 3 (minPerGroup 6)', () => {
  const r = moodInfluence(P, M, { ...O, minPerGroup: 6 });
  assert.ok(r.status === 'too-few-days', 'status');
  assert.ok(r.lo === null && r.hi === null, 'lo and hi null');
  assert.ok(r.resamples === 0, 'resamples 0');
  assert.ok(r.skipped === 0, 'skipped 0');
  assert.ok(r.n1 === 5 && r.n0 === 6, 'n1 and n0');
  assert.ok(CLOSE(r.diff, 2.266666666666666), 'diff');
});

test('moodInfluence: zero difference when mood is constant, hand case 4', () => {
  const twelve = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
  const r = moodInfluence(P, twelve, O);
  assert.ok(r.status === 'ok', 'status');
  assert.ok(r.n1 === 6 && r.n0 === 6, 'n1 and n0');
  assert.ok(CLOSE(r.mean1, 3) && CLOSE(r.mean0, 3), 'means');
  assert.ok(CLOSE(r.diff, 0), 'diff');
  assert.ok(CLOSE(r.lo, 0) && CLOSE(r.hi, 0), 'interval');
  assert.ok(r.resamples === 200 && r.skipped === 0, 'counts');
});

test('moodInfluence: bootstrap interval, hand case 5 planted D=120', () => {
  const present = [];
  const mood = [];
  for (let i = 0; i < 120; i += 1) {
    const p = Math.floor(i / 10) % 2 === 0 ? 1 : 0;
    present.push(p);
    mood.push(3 + 2 * p + [-0.5, 0, 0.5, 0.25, -0.25][i % 5]);
  }
  const O5 = { seed: 11, resamples: 300, blockLength: 5, level: 0.95, minPerGroup: 10, maxSkipShare: 0.5 };
  const r = moodInfluence(present, mood, O5);
  assert.ok(r.status === 'ok', 'status');
  assert.ok(r.n1 === 60 && r.n0 === 60, 'n1 and n0');
  assert.ok(CLOSE(r.mean1, 5) && CLOSE(r.mean0, 3), 'means');
  assert.ok(CLOSE(r.diff, 2), 'diff');
  assert.ok(CLOSE(r.lo, 1.920681551116334), 'lo');
  assert.ok(CLOSE(r.hi, 2.0759734093067426), 'hi');
  assert.ok(r.resamples === 300 && r.skipped === 0, 'counts');
});

test('moodInfluence: too-few-days when one group is empty, hand case 6', () => {
  const r = moodInfluence([1, 1, 1, 1], [1, 2, 3, 4], { ...O, minPerGroup: 1, resamples: 10 });
  assert.ok(r.status === 'too-few-days', 'status');
  assert.ok(r.n1 === 4 && r.n0 === 0, 'n1 and n0');
  assert.ok(CLOSE(r.mean1, 2.5), 'mean1');
  assert.ok(r.mean0 === null && r.diff === null, 'mean0 and diff null');
});

test('moodInfluence: same call twice is deeply equal and leaves inputs unchanged', () => {
  const r1 = moodInfluence(P, M, O);
  const r2 = moodInfluence(P, M, O);
  assert.deepEqual(r1, r2, 'two calls equal');
  const beforeP = P.slice();
  const beforeM = M.slice();
  moodInfluence(P, M, O);
  assert.deepEqual(P, beforeP, 'present unchanged');
  assert.deepEqual(M, beforeM, 'mood unchanged');
});

test('moodInfluence: bad present/mood inputs and options throw', () => {
  // TypeError: present not 0/1, mood not a number/null, inputs not arrays, options not an object.
  assert.ok(throwsType(() => moodInfluence([1, 2], [4, 2], O), TypeError), 'present 2');
  assert.ok(throwsType(() => moodInfluence([1, '1'], [4, 2], O), TypeError), 'present "1"');
  assert.ok(throwsType(() => moodInfluence([1, null], [4, 2], O), TypeError), 'present null');
  assert.ok(throwsType(() => moodInfluence("not array", [4, 2], O), TypeError), 'present not array');
  assert.ok(throwsType(() => moodInfluence([1, 0], ['x', 2], O), TypeError), 'mood string');
  assert.ok(throwsType(() => moodInfluence([1, 0], [NaN, 2], O), TypeError), 'mood NaN');
  assert.ok(throwsType(() => moodInfluence([1, 0], "not array", O), TypeError), 'mood not array');
  assert.ok(throwsType(() => moodInfluence(P, M, null), TypeError), 'options null');
  assert.ok(throwsType(() => moodInfluence(P, M, 5), TypeError), 'options not object');
  // RangeError: length mismatch and each bad option.
  assert.ok(throwsType(() => moodInfluence([1, 0, 1], [4, 2], O), RangeError), 'length mismatch');
  assert.ok(throwsType(() => moodInfluence(P, M, { ...O, level: 0 }), RangeError), 'level 0');
  assert.ok(throwsType(() => moodInfluence(P, M, { ...O, level: 1 }), RangeError), 'level 1');
  assert.ok(throwsType(() => moodInfluence(P, M, { ...O, blockLength: 0 }), RangeError), 'blockLength 0');
  assert.ok(throwsType(() => moodInfluence(P, M, { ...O, blockLength: 13 }), RangeError), 'blockLength D+1');
  assert.ok(throwsType(() => moodInfluence(P, M, { ...O, resamples: 0 }), RangeError), 'resamples 0');
  assert.ok(throwsType(() => moodInfluence(P, M, { ...O, seed: 1.5 }), RangeError), 'seed 1.5');
  assert.ok(throwsType(() => moodInfluence(P, M, { ...O, maxSkipShare: 1.5 }), RangeError), 'maxSkipShare 1.5');
});

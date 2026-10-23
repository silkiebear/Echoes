// Explore card data helpers (phase 4h, step 5b, Node). The data preparation shared by the C1, C2 and M1 cards: store ids to
// strings (nulls dropped), the labels of the observed days, the 0 or 1 presence array, the mood array and the guards. Pure:
// the helpers take plain arrays, so this file runs in Node. The hand-written expectations below are the contract.
import { test, assert } from '../core/harness.js';
import {
  stringIds, dayLabelIds, presentFor, moodFor, tooManyLabels, textsOf, tooFewResult, activePeriod,
} from '../core/explore-card-data.js';
import { moodInfluenceConfig } from '../config/mood-influence.js';

test('stringIds: numeric ids become strings and nulls are dropped', () => {
  assert.deepEqual(stringIds([3, null, 'x', undefined, 0]), ['3', 'x', '0'], 'numbers as strings, nulls and undefined dropped');
  assert.deepEqual(stringIds([]), [], 'zero labels give the empty list');
});

test('stringIds: the ids __proto__ and constructor survive', () => {
  assert.deepEqual(stringIds(['__proto__', 'constructor']), ['__proto__', 'constructor'], 'both kept as strings');
});

test('dayLabelIds: each observed day gives its label ids as strings, nulls dropped', () => {
  const days = [{ labels: [1, null, 2] }, { labels: [] }, { labels: [7] }];
  assert.deepEqual(dayLabelIds(days), [['1', '2'], [], ['7']], 'the ids of each day');
});

test('presentFor: 1 when the label is on the day, 0 otherwise, same order as the days', () => {
  const lists = [['a', 'b'], ['a'], ['b', 'c'], []];
  assert.deepEqual(presentFor(lists, 'a'), [1, 1, 0, 0], 'label a');
  assert.deepEqual(presentFor(lists, 'c'), [0, 0, 1, 0], 'label c');
  assert.deepEqual(presentFor(lists, 'z'), [0, 0, 0, 0], 'a label on no day');
});

test('presentFor: matches a naive loop, and the ids __proto__ and constructor work', () => {
  const lists = [['__proto__'], ['constructor'], ['__proto__', 'constructor'], []];
  const naive = lists.map((day) => (day.includes('__proto__') ? 1 : 0));
  const before = JSON.stringify(Object.keys(Object.prototype));
  assert.deepEqual(presentFor(lists, '__proto__'), naive, 'the same as a naive loop');
  assert.deepEqual(presentFor(lists, 'constructor'), [0, 1, 1, 0], 'constructor');
  assert.equal(JSON.stringify(Object.keys(Object.prototype)), before, 'Object.prototype unchanged');
});

test('moodFor: the day mood, null where the day has no scored mood', () => {
  assert.deepEqual(moodFor([{ mood: 3 }, { mood: null }, { mood: 5 }]), [3, null, 5], 'moods in day order');
  assert.deepEqual(moodFor([]), [], 'no observed day');
});

test('tooManyLabels: more than the limit is true; the limit and fewer are false', () => {
  assert.equal(tooManyLabels([1, 2, 3, 4, 5, 6, 7], 6), true, 'seven labels against a limit of six');
  assert.equal(tooManyLabels([1, 2, 3, 4, 5, 6], 6), false, 'six labels at the limit');
  assert.equal(tooManyLabels([], 6), false, 'zero labels');
});

test('textsOf: the texts of the chosen ids, in the order of the ids', () => {
  const labels = [{ text: 'Water' }, { text: 'Coffee' }, { text: 'Sleep' }];
  assert.deepEqual(textsOf(labels, [2, 0]), ['Sleep', 'Water'], 'texts in id order');
  assert.deepEqual(textsOf(labels, []), [], 'no ids, no texts');
});

test('tooFewResult: counts the present and absent days, and gives no range', () => {
  const r = tooFewResult([1, 1, 1, 1], 7, 0.9);
  assert.equal(r.status, 'too-few-days', 'the status');
  assert.equal(r.n1, 4, 'present days');
  assert.equal(r.n0, 0, 'absent days');
  assert.equal(r.lo, null, 'no range');
  assert.equal(r.hi, null, 'no range');
  assert.equal(r.blockLength, 7, 'block length copied');
  assert.equal(r.level, 0.9, 'level copied');
});

// activePeriod (phase 4h.3b, S1 and S2): the observed days from the first to the last day with the label. The days are
// plain strings here; the function keeps them in step with present and mood.
const D7 = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'];

test('activePeriod: first and last use, the slice and the days left out', () => {
  const r = activePeriod([0, 0, 1, 0, 1, 0, 0], [3, 4, 2, null, 5, 1, 2], D7);
  assert.equal(r.first, 2, 'first index');
  assert.equal(r.last, 4, 'last index');
  assert.equal(r.used, 3, 'days used');
  assert.equal(r.excluded, 4, 'days left out');
  assert.deepEqual(r.present, [1, 0, 1], 'present of the slice');
  assert.deepEqual(r.mood, [2, null, 5], 'mood of the slice, a null kept');
  assert.deepEqual(r.days, ['d2', 'd3', 'd4'], 'days of the slice');
});

test('activePeriod: the label on every day leaves no day out, and the slices are new arrays', () => {
  const present = [1, 1, 1];
  const mood = [1, 2, 3];
  const days = ['a', 'b', 'c'];
  const r = activePeriod(present, mood, days);
  assert.equal(r.excluded, 0, 'no day left out');
  assert.deepEqual(r.present, present, 'present equal to the input');
  assert.deepEqual(r.mood, mood, 'mood equal to the input');
  assert.deepEqual(r.days, days, 'days equal to the input');
  assert.ok(r.present !== present && r.mood !== mood && r.days !== days, 'new arrays, not the inputs');
});

test('activePeriod: one day with the label gives a period of one day', () => {
  const r = activePeriod([0, 0, 0, 1, 0, 0, 0], [1, 1, 1, 1, 1, 1, 1], D7);
  assert.equal(r.used, 1, 'one day used');
  assert.equal(r.first, 3, 'first is that day');
  assert.equal(r.last, 3, 'last is that day');
  assert.equal(r.excluded, 6, 'the other six days left out');
});

test('activePeriod: a label on the first and on the last day leaves no day out', () => {
  const r = activePeriod([1, 0, 0, 0, 1], [1, 2, 3, 4, 5], ['a', 'b', 'c', 'd', 'e']);
  assert.equal(r.first, 0, 'first index 0');
  assert.equal(r.last, 4, 'last index is the final day');
  assert.equal(r.excluded, 0, 'no day left out');
});

test('activePeriod: no day with the label gives empty slices, -1 indices and every day left out', () => {
  const r = activePeriod([0, 0, 0, 0, 0, 0, 0], [1, 2, 3, 4, 5, 6, 7], D7);
  assert.deepEqual(r.present, [], 'empty present');
  assert.deepEqual(r.mood, [], 'empty mood');
  assert.deepEqual(r.days, [], 'empty days');
  assert.equal(r.first, -1, 'first -1');
  assert.equal(r.last, -1, 'last -1');
  assert.equal(r.used, 0, 'no day used');
  assert.equal(r.excluded, 7, 'all seven days left out');
});

test('activePeriod: the inputs are not changed by the call', () => {
  const present = [0, 1, 0, 1, 0];
  const mood = [1, null, 3, 4, 5];
  const days = ['a', 'b', 'c', 'd', 'e'];
  const before = JSON.stringify([present, mood, days]);
  activePeriod(present, mood, days);
  assert.equal(JSON.stringify([present, mood, days]), before, 'inputs unchanged');
});

test('activePeriod: arrays of different lengths throw', () => {
  assert.throws(() => activePeriod([1, 0], [1], ['a', 'b']), 'activePeriod: length mismatch', 'a mood array of another length');
});

test('activePeriod: the slice of case one is too few days for the block length, so the too-few result applies', () => {
  const r = activePeriod([0, 0, 1, 0, 1, 0, 0], [3, 4, 2, null, 5, 1, 2], D7);
  assert.ok(r.days.length < moodInfluenceConfig.blockLength, 'three days, below the block length of the config');
  const res = tooFewResult(r.present, moodInfluenceConfig.blockLength, moodInfluenceConfig.level);
  assert.equal(res.status, 'too-few-days', 'the too-few status');
  assert.equal(res.n1, 2, 'two present days in the slice');
});

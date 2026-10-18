// Label search, selection and day counts for the Explore tab (phase 4c, 4c.2; pure, Node and browser). Labels named
// "__proto__" and "constructor" must come out as plain text and change no object.
import { test, assert } from '../core/harness.js';
import { searchLabels, toggleSelection, dayCountsOf } from '../core/selection.js';
import { explore } from '../config/explore.js';

const CFG = { minChars: 2, maxResults: 40 };
const LABELS = [
  { id: 0, text: 'Café' },
  { id: 1, text: 'cafe-latte' },
  { id: 2, text: 'Sleep S+' },
  { id: 3, text: '__proto__' },
  { id: 4, text: 'constructor' },
];
const COUNTS = [5, 9, 1, 2, 2];

test('searchLabels: case-insensitive substring, most days first, trimmed query', () => {
  const hits = searchLabels(LABELS, COUNTS, '  CAF ', CFG).map((h) => h.id);
  assert.deepEqual(hits, [1, 0], 'order or matches');
  assert.deepEqual(searchLabels(LABELS, COUNTS, 'sle', CFG).map((h) => [h.id, h.days]), [[2, 1]], 'days value');
});

test('searchLabels: composed and decomposed spellings match (NFC)', () => {
  const decomposed = [{ id: 0, text: 'Cafe\u0301' }];
  assert.deepEqual(searchLabels(decomposed, [3], 'Caf\u00e9', CFG).map((h) => h.id), [0], 'composed query');
  assert.deepEqual(searchLabels(LABELS, COUNTS, 'Cafe\u0301', CFG).map((h) => h.id), [0], 'decomposed query');
});

test('searchLabels: fewer than minChars characters gives no results; the cap applies', () => {
  assert.deepEqual(searchLabels(LABELS, COUNTS, 'S', CFG), [], 'one character');
  assert.deepEqual(searchLabels(LABELS, COUNTS, ' e ', CFG), [], 'one character after the trim');
  assert.deepEqual(searchLabels(LABELS, COUNTS, 'e', { minChars: 1, maxResults: 1 }).map((h) => h.id), [1], 'cap keeps the most days');
});

test('searchLabels: labels named __proto__ and constructor are found as text and change no object', () => {
  const before = JSON.stringify(LABELS);
  assert.deepEqual(searchLabels(LABELS, COUNTS, 'proto', CFG).map((h) => h.id), [3], '__proto__');
  assert.deepEqual(searchLabels(LABELS, COUNTS, 'constr', CFG).map((h) => h.id), [4], 'constructor');
  assert.equal(JSON.stringify(LABELS), before, 'labels changed');
  assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, 'proto'), false, 'prototype changed');
});

test('toggleSelection: adds, removes, refuses past max (a copy comes back), never duplicates', () => {
  assert.deepEqual(toggleSelection([], 3, 2), [3], 'add');
  assert.deepEqual(toggleSelection([3], 3, 2), [], 'remove');
  const full = [3, 4];
  const refused = toggleSelection(full, 5, 2);
  assert.deepEqual(refused, [3, 4], 'refused');
  assert.ok(refused !== full, 'refusal returned the same array');
  assert.deepEqual(toggleSelection([3], 4, 2), [3, 4], 'second label');
  const once = toggleSelection(toggleSelection([], 7, 8), 7, 8);
  assert.deepEqual(once, [], 'toggled twice is empty');
});

test('dayCountsOf: days present per label id, from the day label lists', () => {
  const data = { labels: [{ id: 0, text: 'a' }, { id: 1, text: 'b' }], days: [{ labels: [0, 1] }, { labels: [1] }] };
  assert.deepEqual(dayCountsOf(data), [1, 2], 'counts');
});

test('explore: the selection limit and minimum length are config values', () => {
  assert.equal(explore.selection.max, 8, 'max');
  assert.equal(explore.selection.minChars, 2, 'minChars');
  assert.equal(explore.selection.maxResults, 40, 'maxResults');
});

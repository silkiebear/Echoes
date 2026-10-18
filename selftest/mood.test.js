import { test, assert } from '../core/harness.js';
import {
  orderFromTaps,
  colorFor,
  moodScore,
  missingMoods,
  applyOrder,
} from '../core/mood.js';
import { defaultSettings } from '../core/settings.js';
import { settingsConfig } from '../config/settings.js';

const P = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

test('orderFromTaps keeps tap order', () => {
  assert.deepEqual(
    orderFromTaps(['a', 'b', 'c'], ['c', 'a']),
    [{ name: 'c', order: 1 }, { name: 'a', order: 2 }],
    'tap order is preserved with 1-based order'
  );
});

test('orderFromTaps ignores unknown and duplicate taps', () => {
  assert.deepEqual(
    orderFromTaps(['a', 'b'], ['x', 'b', 'b', 'a']),
    [{ name: 'b', order: 1 }, { name: 'a', order: 2 }],
    'unknown and duplicate taps are skipped'
  );
});

test('colorFor with n = 1 gives palette[0]', () => {
  assert.equal(colorFor(0, 1, P), 'p0', 'single mood takes the best colour');
});

test('colorFor with n = 2', () => {
  assert.equal(colorFor(0, 2, P), 'p0', 'first of two is best');
  assert.equal(colorFor(1, 2, P), 'p6', 'last of two is worst');
});

test('colorFor with n = 7 maps rank r to palette[r]', () => {
  for (let r = 0; r < 7; r += 1) {
    assert.equal(colorFor(r, 7, P), `p${r}`, `rank ${r} maps to p${r}`);
  }
});

test('colorFor with n = 12', () => {
  assert.equal(colorFor(0, 12, P), 'p0', 'first maps to best');
  assert.equal(colorFor(11, 12, P), 'p6', 'last maps to worst');
  assert.equal(colorFor(5, 12, P), 'p3', 'middle rounds to p3');
});

test('moodScore', () => {
  const settings = {
    moods: [
      { name: 'good', order: 1, color: '#000000' },
      { name: 'ok', order: 2, color: '#000000' },
      { name: 'bad', order: 3, color: '#000000' },
    ],
  };
  assert.equal(moodScore(settings, 'good'), 3, 'best order scores highest');
  assert.equal(moodScore(settings, 'bad'), 1, 'worst order scores lowest');
  assert.equal(moodScore(settings, 'none'), null, 'unknown mood is null');
});

test('missingMoods', () => {
  const settings = { moods: [{ name: 'good', order: 1, color: '#000000' }] };
  assert.deepEqual(
    missingMoods(settings, ['good', 'bad', 'good', 'ok']),
    ['bad', 'ok'],
    'distinct missing names in first-appearance order'
  );
});

test('applyOrder keeps an existing colour and colours new names by rank', () => {
  const settings = { moods: [{ name: 'good', order: 2, color: '#111111' }] };
  const ordered = [
    { name: 'bad', order: 1 },
    { name: 'good', order: 2 },
  ];
  assert.deepEqual(
    applyOrder(settings, ordered, P),
    [
      { name: 'bad', order: 1, color: 'p0' },
      { name: 'good', order: 2, color: '#111111' },
    ],
    'known mood keeps its colour, new mood is coloured by rank'
  );
});

test('applyOrder drops moods not in ordered', () => {
  const settings = { moods: [{ name: 'gone', order: 1, color: '#222222' }] };
  assert.deepEqual(
    applyOrder(settings, [{ name: 'a', order: 1 }], P),
    [{ name: 'a', order: 1, color: 'p0' }],
    'moods absent from ordered are dropped'
  );
});

test('applyOrder does not mutate its inputs', () => {
  const settings = { moods: [{ name: 'good', order: 2, color: '#111111' }] };
  const ordered = [
    { name: 'bad', order: 1 },
    { name: 'good', order: 2 },
  ];
  const settingsCopy = JSON.parse(JSON.stringify(settings));
  const orderedCopy = JSON.parse(JSON.stringify(ordered));
  applyOrder(settings, ordered, P);
  assert.deepEqual(settings, settingsCopy, 'settings is unchanged');
  assert.deepEqual(ordered, orderedCopy, 'ordered is unchanged');
});

test('preset names match after trim and case-folding', () => {
  const s = defaultSettings();
  assert.deepEqual(missingMoods(s, [' YAY! ', 'Good', 'AWFUL']), [], 'no tap setup for matching names');
  assert.equal(moodScore(s, ' Awful '), 1, 'awful scores 1 of 5');
  assert.equal(moodScore(s, 'YAY!'), 5, 'yay! scores 5 of 5');
});

test('a name that matches no preset goes to the tap list', () => {
  assert.deepEqual(missingMoods(defaultSettings(), ['yay!', 'okay']), ['okay'], 'only unmatched names are missing');
});

test('applyOrder keeps the preset spelling and colour', () => {
  const good = settingsConfig.moodPresets.find((m) => m.name === 'good');
  assert.deepEqual(
    applyOrder(defaultSettings(), [{ name: 'GOOD ', order: 1 }], P),
    [{ name: 'good', order: 1, color: good.color }],
    'matched name takes the preset spelling and colour'
  );
});

test('presets score five moods with yay! best', () => {
  const s = defaultSettings();
  assert.equal(s.moods.length, 5, 'five presets by default');
  assert.equal(moodScore(s, 'yay!'), 5, 'yay! is the best of five');
  assert.equal(moodScore(s, 'awful'), 1, 'awful is the worst of five');
});

test('__proto__ and constructor match nothing and change no object', () => {
  const s = defaultSettings();
  const before = JSON.parse(JSON.stringify(s));
  assert.deepEqual(missingMoods(s, ['__proto__', 'constructor']), ['__proto__', 'constructor'], 'both are missing');
  assert.equal(moodScore(s, '__proto__'), null, '__proto__ has no score');
  assert.equal(moodScore(s, 'constructor'), null, 'constructor has no score');
  assert.deepEqual(s, before, 'settings is unchanged');
});

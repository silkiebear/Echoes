// M1 Mood and this label, model (phase 4h, M1, Node). Pins buildMoodModel of views\m1-mood-card.js against the hand case 1
// of briefs section M1 (the numbers of moodInfluence on P, M and O) and the three status messages. The expected strings
// are written out here; the numbers are formatted with the helpers of core\format.js, as the view does. run-test runs this
// file; it fails until the view exists.
import { test, assert } from '../core/harness.js';
import { buildMoodModel } from '../views/m1-mood-card.js';
import { formatNumber, formatPercent } from '../core/format.js';
import { explore } from '../config/explore.js';
import { moodInfluenceConfig } from '../config/mood-influence.js';

const LABEL = 'Vegetables F+';
const digits = explore.mood.digits;

// The moodInfluence result of hand case 1 (P, M, O), copied as plain values.
const CASE1 = {
  status: 'ok', n1: 5, n0: 6, mean1: 4.6, mean0: 2.3333333333333335, diff: 2.266666666666666,
  blockLength: 2, level: 0.9, lo: 1.685714285714286, hi: 2.875, resamples: 199, skipped: 1,
};

test('buildMoodModel: hand case 1 gives the sentence with the numbers filled in', () => {
  const model = buildMoodModel(CASE1, LABEL);
  const expected = `On days with ${LABEL} your mood averaged ${formatNumber(4.6, digits)} (mood score, higher is better); `
    + `on the other days of the same period, ${formatNumber(2.3333333333333335, digits)}. The difference is ${formatNumber(2.266666666666666, digits)}. `
    + `The range that fits most resamples of your days is ${formatNumber(1.685714285714286, digits)} to ${formatNumber(2.875, digits)}.`;
  assert.equal(model.sentence, expected, 'the result sentence');
  assert.equal(model.status, 'ok', 'the status is copied');
});

test('buildMoodModel: hand case 1 gives the table with the counts of days and the range', () => {
  const model = buildMoodModel(CASE1, LABEL);
  assert.deepEqual(model.table, {
    headers: ['Comparison', 'Mood score'],
    rows: [
      [`With ${LABEL} (${formatNumber(5)} days)`, formatNumber(4.6, digits)],
      [`Without ${LABEL}, same period (${formatNumber(6)} days)`, formatNumber(2.3333333333333335, digits)],
      ['Difference', formatNumber(2.266666666666666, digits)],
      [`Range (${formatPercent(0.9)})`, `${formatNumber(1.685714285714286, digits)} to ${formatNumber(2.875, digits)}`],
    ],
  }, 'the table rows');
});

test('buildMoodModel: the technical line names the seed, the resamples and the block length', () => {
  const model = buildMoodModel(CASE1, LABEL);
  assert.equal(
    model.numbersLine,
    `Seed ${String(moodInfluenceConfig.seed)}; ${formatNumber(moodInfluenceConfig.resamples)} resamples; blocks of ${String(moodInfluenceConfig.blockLength)} days.`,
    'the technical line',
  );
});

test('buildMoodModel: too-few-days gives the message with the config minimum and no table', () => {
  const tooFew = {
    status: 'too-few-days', n1: 4, n0: 0, mean1: 2.5, mean0: null, diff: null,
    blockLength: 1, level: 0.9, lo: null, hi: null, resamples: 0, skipped: 0,
  };
  const model = buildMoodModel(tooFew, LABEL);
  assert.equal(model.status, 'too-few-days', 'the status is copied');
  assert.ok(model.sentence.includes(String(moodInfluenceConfig.minPerGroup)), 'the sentence names the config minimum');
  assert.equal(
    model.sentence,
    `Not enough days with and without this label (at least ${formatNumber(moodInfluenceConfig.minPerGroup)} each) to say anything.`,
    'the too-few-days sentence',
  );
  assert.equal(model.table, null, 'no table when the status is not ok');
});

test('buildMoodModel: too-many-skipped gives the range message and no table', () => {
  const skipped = {
    status: 'too-many-skipped', n1: 12, n0: 11, mean1: 3, mean0: 3, diff: 0,
    blockLength: 7, level: 0.9, lo: null, hi: null, resamples: 40, skipped: 160,
  };
  const model = buildMoodModel(skipped, LABEL);
  assert.equal(model.sentence, explore.ui.miTooSkipped, 'the too-many-skipped message');
  assert.equal(model.table, null, 'no table when the status is not ok');
});

test('buildMoodModel: a label text stays verbatim in the sentence', () => {
  const odd = '<b>& "x"';
  const model = buildMoodModel(CASE1, odd);
  assert.ok(model.sentence.startsWith(`On days with ${odd} your mood averaged`), 'the label as typed');
  assert.ok(!model.sentence.includes('&lt;'), 'no escaping in the model');
});

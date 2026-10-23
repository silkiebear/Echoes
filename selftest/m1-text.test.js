// M1 texts (phase 4h.3b, Node). Gates on the wording of the Mood and this label card: the numbers in its help text equal
// the config, the note and the table header carry no shared wording that does not fit M1, the glossary explains the two
// words the card uses, and no M1 text names a file, a phase or a spec section. The rendered note fills the placeholder
// of the shared sentence first, so the check reads what the user sees, not the template.
import { test, assert } from '../core/harness.js';
import { explore } from '../config/explore.js';
import { exploreHelp } from '../config/explore-help.js';
import { moodInfluenceConfig } from '../config/mood-influence.js';
import { fill } from '../core/explore-kit.js';

const ui = explore.ui;
const periodValues = { used: 5, label: 'L', first: 'a', last: 'b', excluded: 1 };
const help = exploreHelp.cards.M1;
const terms = exploreHelp.glossary.terms.map((t) => t.term);
const noteShown = ui.noteM1.replace('{descriptive}', ui.descriptive);
const m1Texts = [noteShown, ui.miPeriod, ui.miPeriodAll, ui.miOk, ui.miRowWithout, help.how, help.numbers, help.care];

test('M1 help numbers: the resamples, the block length and the level are the config values', () => {
  assert.ok(help.numbers.includes(String(moodInfluenceConfig.resamples)), `resamples ${moodInfluenceConfig.resamples} in the help text`);
  assert.ok(help.numbers.includes(String(moodInfluenceConfig.blockLength)), `block length ${moodInfluenceConfig.blockLength} in the help text`);
  assert.ok(help.numbers.includes(String(Math.round(moodInfluenceConfig.level * 100))), 'the level in percent in the help text');
});

test('M1 note: the shared "counts and shares" sentence is not on the M1 card', () => {
  assert.ok(!noteShown.includes('counts and shares'), 'no counts and shares in the rendered note');
  assert.ok(!noteShown.includes(ui.descriptive), 'the shared descriptive sentence is not in the rendered note');
});

test('M1 table header: the group column is "Comparison", not "Days"', () => {
  assert.ok(ui.miColGroup !== 'Days', `the header is ${ui.miColGroup}`);
});

test('M1 sentence: the resample word is "resamples", not "resampling"', () => {
  assert.ok(ui.miOk.includes('resamples'), 'the word resamples');
  assert.ok(!ui.miOk.includes('resampling'), 'no resampling');
});

test('M1 glossary: entries for Resample and Seed', () => {
  assert.ok(terms.includes('Resample'), 'a Resample entry');
  assert.ok(terms.includes('Seed'), 'a Seed entry');
});

test('M1 help care: the chance warning about many labels', () => {
  assert.ok(help.care.includes('by chance'), 'by chance in the care text');
});

test('M1 help how: the active period is named', () => {
  assert.ok(help.how.includes('first to your last use'), 'first to your last use in the how text');
});

// D17 (phase 4h.3c): the number of days left out must follow its label; "1 observed days" is not allowed (no plural handling).
test('M1 period line: the number is not put in front of "observed days" (D17)', () => {
  assert.ok(!/\{excluded\} observed day/.test(ui.miPeriod), 'no {excluded} before "observed day" in the template');
  assert.ok(!fill(ui.miPeriod, periodValues).includes('1 observed days'), 'no "1 observed days" with one day left out');
});

test('M1 period line: the number of days left out follows its label', () => {
  const two = fill(ui.miPeriod, { ...periodValues, excluded: 2 });
  assert.ok(two.includes('left out (outside this period): 2'), `the count after its label: ${two}`);
  const many = fill(ui.miPeriod, { ...periodValues, excluded: 1458 });
  assert.ok(many.includes('left out (outside this period): 1458'), `the count after its label: ${many}`);
});

test('M1 period line: the all-days text is unchanged', () => {
  assert.ok(ui.miPeriodAll.includes('No observed days are left out'), 'no day left out');
});

test('M1 texts: each is a string, and none names a file, a phase or a spec section', () => {
  for (const text of m1Texts) {
    assert.ok(typeof text === 'string', `a text is ${typeof text}, not a string`);
    assert.ok(!/SPEC/.test(text), `SPEC in: ${text}`);
    assert.ok(!/phase/i.test(text), `phase in: ${text}`);
    assert.ok(!/\.js\b/.test(text), `a .js name in: ${text}`);
  }
});

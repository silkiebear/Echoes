// C1 Days together column widths (phase 4h.3c, D19, Node). Split from c1-render.test.js in phase 4h.3c (D23) to keep the
// file under the style limit. Pins the one column width of the matrix, which follows the widest header word. run-test
// executes this file.
import { test, assert } from '../core/harness.js';
import { render } from '../views/c1-cooccurrence.js';
import { coOccurrence } from '../core/cooccurrence.js';

// days reused across the cases: the hand days, so both = [[3,2,1],[2,3,2],[1,2,3]] for ids a, b, c.
const D = [['a', 'b'], ['a'], ['b', 'c'], [], ['a', 'b', 'c'], ['c']];
const dataOf = (days, ids) => coOccurrence(days, ids);

// Every text element as {cls, x, y, value}, the value decoded once as drawn (markup escapes quotes and ampersands).
const texts = (svg) => {
  const re = /<text x="([^"]*)" y="([^"]*)" dy="[^"]*" class="([^"]*)" text-anchor="([^"]*)" font-size="([^"]*)">([\s\S]*?)<\/text>/g;
  const decode = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return [...svg.matchAll(re)].map((m) => ({ cls: m[3], x: Number(m[1]), y: Number(m[2]), value: decode(m[6]) }));
};

// The cell rect as {x, y, class}, in the order render writes them (row-major).
const cells = (svg) => [...svg.matchAll(/<rect class="(co-\d+)" x="([^"]*)" y="([^"]*)" width="([^"]*)" height="([^"]*)" rx="([^"]*)" ry="([^"]*)"/g)].map((m) => ({ cls: m[1], x: Number(m[2]), y: Number(m[3]), size: Number(m[4]), radius: Number(m[7]) }));

// The viewBox of the svg element.
const viewBox = (svg) => svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).slice(1).map(Number);

// Sums of em shares carry float noise: compared within this tolerance.
const TOLERANCE = 1e-6;
const near = (actual, expected) => Math.abs(actual - expected) < TOLERANCE;

// D19 (phase 4h.3c): the column width follows the widest header word. The constants below are frozen copies of the config
// values, so that a config change shows here as a failure, not as a silent pass.
const TEST_FONT_PX = 12;
const TEST_PAD_PX = 4;
const TEST_CELL_PX = 44;
const TEST_LABEL_PX = 96;
const TEST_COL_MAX_PX = 96;
// core\textfit.js is linear: width = characters x fontPx x this factor (config\views.js charWidthEm).
const TEST_CHAR_EM = 0.6;

const FIX3 = ['Vegetables F+', 'Water intake H+', 'Late coffee F-'];
const FIX8 = ['Pneumonoultramicroscopic', 'Tea', 'Water intake H+', 'Late coffee F-', 'Vegetables F+', 'Sleep', 'Walk', 'Music'];
const IDS8 = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const DAYS8 = [IDS8, ['a', 'c'], ['b', 'd', 'h']];

// The header text elements (the muted texts above the first cell row), as {x, y, value}.
const headerTexts = (svg) => texts(svg).filter((t) => t.cls === 't-muted' && t.y < cells(svg)[0].y);
// The header lines of column j, in order of y.
const headerOf = (svg, j, colPx) => {
  const cx = TEST_LABEL_PX + j * colPx + colPx / 2;
  return headerTexts(svg).filter((t) => Math.abs(t.x - cx) < TOLERANCE).sort((a, b) => a.y - b.y).map((t) => t.value);
};

test('C1 columns: no header word is split (3 labels)', () => {
  const svg = render(dataOf(D, ['a', 'b', 'c']), { texts: FIX3 });
  const colPx = cells(svg)[0].size;
  FIX3.forEach((label, j) => {
    assert.deepEqual(headerOf(svg, j, colPx).join(' ').split(' '), label.split(' '), `column ${j} "${label}" keeps its words whole`);
  });
});

test('C1 columns: only a word wider than the cap is split, and the matrix stops at the cap width (8 labels)', () => {
  // Hand value (phase 4h.3c): 'Pneumonoultramicroscopic' is 24 x 12 x 0.6 = 172.8 px, wider than the cap 96 - 2 x 4 = 88 px,
  // so colPx = the cap 96 for every column. At 88 px a piece holds 12 characters: 'Pneumonoultr' and 'amicroscopic'.
  const svg = render(dataOf(DAYS8, IDS8), { texts: FIX8 });
  const colPx = cells(svg)[0].size;
  assert.equal(colPx, TEST_COL_MAX_PX, 'the cap width');
  assert.deepEqual(headerOf(svg, 0, colPx), ['Pneumonoultr', 'amicroscopic'], 'the one word wider than the cap breaks');
  FIX8.slice(1).forEach((label, j) => {
    assert.deepEqual(headerOf(svg, j + 1, colPx).join(' ').split(' '), label.split(' '), `column ${j + 1} "${label}" keeps its words whole`);
  });
});

test('C1 columns: the width is the widest word plus its padding, below the cap (3 labels)', () => {
  // Hand value (phase 4h.3c): the widest word is 'Vegetables', 10 x 12 x 0.6 = 72 px; 72 + 2 x 4 = 80 px, which lies between
  // cellPx 44 and the cap 96, so colPx = 80 for every column.
  const svg = render(dataOf(D, ['a', 'b', 'c']), { texts: FIX3 });
  const widths = cells(svg).map((c) => c.size);
  const hand = 10 * TEST_FONT_PX * TEST_CHAR_EM + 2 * TEST_PAD_PX;
  assert.equal(hand, 80, 'the hand value');
  assert.ok(widths.every((w) => near(w, hand)), `every column ${hand} px, got ${widths.join(', ')}`);
  assert.ok(hand >= TEST_CELL_PX && hand <= TEST_COL_MAX_PX, 'between cellPx and the cap');
});

test('C1 columns: the viewBox, the column centres and the header lines follow the column width (3 labels)', () => {
  // Hand values (phase 4h.3c): colPx 80; the width is 96 + 3 x 80 + 4 = 340; the column centres are 96 + 80 j + 40 = 136,
  // 216 and 296. Two header lines (the longest label wraps to two): the first centre 9.24 and the second 23.24 (4h.3b),
  // so the header is 9.24 + 14 + 7.68 = 30.92 px high and the first cell row starts at 30.92.
  const svg = render(dataOf(D, ['a', 'b', 'c']), { texts: FIX3 });
  assert.equal(viewBox(svg)[0], 340, 'the viewBox width');
  assert.ok(near(viewBox(svg)[1], 166.92), 'the viewBox height 166.92');
  const centres = [136, 216, 296];
  const hdr = headerTexts(svg);
  assert.equal(hdr.length, 6, 'two header lines in each column');
  hdr.forEach((t) => assert.ok(centres.some((c) => near(t.x, c)), `header x ${t.x} is a column centre`));
  assert.deepEqual([...new Set(hdr.map((t) => t.y.toFixed(2)))], ['9.24', '23.24'], 'the 4h.3b header line centres');
  assert.ok(near(cells(svg)[0].y, 30.92), 'the first cell row starts at the header height 30.92');
});

test('C1 columns: a short label keeps the cell width (1 label)', () => {
  // Hand value (phase 4h.3c): 'Tea' is 3 x 12 x 0.6 = 21.6 px; 21.6 + 8 = 29.6 px is below cellPx 44, so colPx = 44.
  // coOccurrence takes 2 to 8 labels, so the one-label matrix is written out by hand (the view reads ids, both, conditional).
  const svg = render({ ids: ['a'], both: [[2]], conditional: [[1]] }, { texts: ['Tea'] });
  assert.equal(cells(svg)[0].size, TEST_CELL_PX, 'the cell width');
});

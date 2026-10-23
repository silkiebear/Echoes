// C1 Days together view (phase 4h, C1, Node). Pins the two exports of views\c1-cooccurrence.js: pairMost (the pair
// with the most days together) and render (the matrix SVG). run-test executes this file; the mutation gate runs it
// against the view.
import { test, assert } from '../core/harness.js';
import { pairMost, render } from '../views/c1-cooccurrence.js';
import { coOccurrence } from '../core/cooccurrence.js';
import { combos } from '../config/combos.js';
import { explore } from '../config/explore.js';

// days reused across the cases: the hand days, so both = [[3,2,1],[2,3,2],[1,2,3]] for ids a, b, c.
const D = [['a', 'b'], ['a'], ['b', 'c'], [], ['a', 'b', 'c'], ['c']];
const dataOf = (days, ids) => coOccurrence(days, ids);

// The co-* classes of the matrix cells, in row-major order (the order render writes the rects).
const rectClasses = (svg) => [...svg.matchAll(/<rect class="(co-\d+)"/g)].map((m) => m[1]);

// Every text element as {cls, x, y, value}, the value decoded once as drawn (markup escapes quotes and ampersands).
const texts = (svg) => {
  const re = /<text x="([^"]*)" y="([^"]*)" dy="[^"]*" class="([^"]*)" text-anchor="([^"]*)" font-size="([^"]*)">([\s\S]*?)<\/text>/g;
  const decode = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return [...svg.matchAll(re)].map((m) => ({ cls: m[3], x: Number(m[1]), y: Number(m[2]), value: decode(m[6]) }));
};

// The cell rect as {x, y, class}, in the order render writes them (row-major).
const cells = (svg) => [...svg.matchAll(/<rect class="(co-\d+)" x="([^"]*)" y="([^"]*)" width="([^"]*)" height="([^"]*)" rx="([^"]*)" ry="([^"]*)"/g)].map((m) => ({ cls: m[1], x: Number(m[2]), y: Number(m[3]), size: Number(m[4]), radius: Number(m[7]) }));

// The viewBox of the svg element.
// The height may carry decimals since phase 4h.3b (em shares of the header).
const viewBox = (svg) => svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).slice(1).map(Number);

// Header and row heights are sums of em shares (phase 4h.3b), so the printed values carry float noise: moved coordinates
// are compared within this tolerance against the hand values.
const TOLERANCE = 1e-6;
const near = (actual, expected) => Math.abs(actual - expected) < TOLERANCE;

test('pairMost: the pair with the most days together, a tie keeping the earlier pair', () => {
  // both = [[3,2,1],[2,3,2],[1,2,3]]: the off-diagonal max is 2, shared by a,b and b,c; row-major keeps a,b.
  assert.deepEqual(pairMost(D, ['a', 'b', 'c']), ['a', 'b'], 'the earlier pair on a tie');
});

test('pairMost: fewer than two labels returns null', () => {
  assert.equal(pairMost(D, ['a']), null, 'one label');
  assert.equal(pairMost(D, []), null, 'no label');
});

test('pairMost: a clear single winner is that pair', () => {
  const days = [['a', 'b'], ['a', 'b'], ['a', 'b'], ['c']];
  assert.deepEqual(pairMost(days, ['a', 'b', 'c']), ['a', 'b'], 'a,b share three days');
});

test('pairMost: two labels still return their pair', () => {
  const days = [['a', 'b'], ['a'], ['b', 'c'], ['c']];
  assert.deepEqual(pairMost(days, ['a', 'b']), ['a', 'b'], 'the only pair');
});

test('pairMost: two labels that never share a day still return their pair', () => {
  // a and b are on separate days, so both = 0; the function returns the only pair, not null, because null is reserved
  // for fewer than two labels. This pins the starting best at -1 (0 > -1 keeps the pair).
  assert.deepEqual(pairMost([['a'], ['b']], ['a', 'b']), ['a', 'b'], 'the pair even with zero shared days');
});

test('pairMost: __proto__ and constructor ids draw no prototype member', () => {
  const days = [['__proto__', 'constructor'], ['__proto__', 'constructor'], ['a']];
  const before = JSON.stringify(Object.keys(Object.prototype));
  const pair = pairMost(days, ['__proto__', 'constructor', 'a']);
  assert.deepEqual(pair, ['__proto__', 'constructor'], 'the pair in order');
  assert.equal(JSON.stringify(Object.keys(Object.prototype)), before, 'Object.prototype unchanged');
});

test('render: a well-formed matrix SVG with the title and desc', () => {
  const svg = render(dataOf(D, ['a', 'b', 'c']), {});
  assert.ok(svg.startsWith('<svg'), 'an svg element');
  assert.ok(svg.includes('viewBox="0 0 '), 'a viewBox');
  assert.ok(svg.includes('<title>C1 Days together</title'), 'the title');
  assert.ok(svg.includes('<desc>'), 'a desc');
});

test('render: one cell per pair, each in a shade step 0..levels-1', () => {
  const k = 3;
  const classes = rectClasses(render(dataOf(D, ['a', 'b', 'c']), {}));
  assert.equal(classes.length, k * k, 'one rect per cell');
  for (const c of classes) {
    const n = Number(c.slice(3));
    assert.ok(n >= 0 && n < combos.levels, `${c} is a shade step`);
  }
});

test('render: the shade step follows the share of the row label days', () => {
  // conditional = [[1,2/3,1/3],[2/3,1,2/3],[1/3,2/3,1]] → floor(share*5) gives co-4, co-3, co-1.
  assert.deepEqual(rectClasses(render(dataOf(D, ['a', 'b', 'c']), {})), [
    'co-4', 'co-3', 'co-1',
    'co-3', 'co-4', 'co-3',
    'co-1', 'co-3', 'co-4',
  ], 'each cell in its shade step');
});

test('render: an empty-label row is the lightest shade, including its null diagonal', () => {
  // b has no days, so every b cell is null -> co-0 (its diagonal is the null case). a and c are always together:
  // the a-row and the c-diagonal are co-4, but the c-row has an extra day (day 3) without a, so co(c|a) = 2/3 -> co-3.
  const days = [['a', 'c'], [''], ['a', 'c'], ['c']];
  const classes = rectClasses(render(dataOf(days, ['a', 'b', 'c']), {}));
  assert.deepEqual(classes, [
    'co-4', 'co-0', 'co-4',
    'co-0', 'co-0', 'co-0',
    'co-3', 'co-0', 'co-4',
  ], 'the null diagonal and 0-share cells are co-0');
});

test('render: labels in t-muted, numbers in co-num, and untrusted ids render safely', () => {
  const list = texts(render(dataOf(D, ['a', 'b', 'c']), {}));
  const nums = list.filter((t) => t.cls === 'co-num').map((t) => t.value);
  assert.deepEqual(nums, ['3', '2', '1', '2', '3', '2', '1', '2', '3'], 'the both counts, row-major');
  const labels = list.filter((t) => t.cls === 't-muted').map((t) => t.value);
  assert.deepEqual(labels, ['a', 'b', 'c', 'a', 'b', 'c'], 'headers then rows');
  assert.ok(labels.includes('a') && labels.includes('b') && labels.includes('c'), 'the labels named');

  // __proto__ and constructor ids render as cells, not as prototype keys, and leave Object.prototype alone.
  const proto = render(dataOf([['__proto__', 'constructor'], ['constructor', 'a']], ['__proto__', 'constructor', 'a']), {});
  const before = JSON.stringify(Object.keys(Object.prototype));
  assert.ok(proto.includes('co-num'), 'drew cells');
  assert.equal(JSON.stringify(Object.keys(Object.prototype)), before, 'Object.prototype unchanged');
});

test('render: the matrix has the fixed size, square cells, and the shade-step colours', () => {
  const svg = render(dataOf(D, ['a', 'b', 'c']), {});
  // Hand value (phase 4h.3b): the one-line header is 0.77em + 0.64em = 16.92 px; height 16.92 + 3 x 44 + 4 = 152.92.
  assert.equal(viewBox(svg)[0], 232, 'the fixed width');
  assert.ok(near(viewBox(svg)[1], 152.92), 'the fixed height 152.92');
  for (const c of cells(svg)) {
    assert.equal(c.size, 44, 'each cell is square');
    assert.equal(c.radius, 4, 'each cell is rounded');
  }
});

test('render: the cells sit in their row and column grid', () => {
  const svg = render(dataOf(D, ['a', 'b', 'c']), {});
  const cls = rectClasses(svg);
  // Hand values (phase 4h.3b): the row tops are 16.92 + 44 x row (the header is 16.92 px high).
  const expected = [
    ['co-4', 96, 16.92], ['co-3', 140, 16.92], ['co-1', 184, 16.92],
    ['co-3', 96, 60.92], ['co-4', 140, 60.92], ['co-3', 184, 60.92],
    ['co-1', 96, 104.92], ['co-3', 140, 104.92], ['co-4', 184, 104.92],
  ];
  expected.forEach((exp, idx) => {
    const c = cells(svg)[idx];
    assert.equal(c.cls, exp[0], `cell ${idx} class`);
    assert.equal(c.x, exp[1], `cell ${idx} x`);
    assert.ok(near(c.y, exp[2]), `cell ${idx} y ${c.y}, expected ${exp[2]}`);
  });
});

test('render: the cell numbers sit centred in their cell', () => {
  const svg = render(dataOf(D, ['a', 'b', 'c']), {});
  const nums = texts(svg).filter((t) => t.cls === 'co-num');
  // Hand values (phase 4h.3b): each number sits at its cell centre, the cell top plus 22 px.
  const expected = [
    [118, 38.92, '3'], [162, 38.92, '2'], [206, 38.92, '1'],
    [118, 82.92, '2'], [162, 82.92, '3'], [206, 82.92, '2'],
    [118, 126.92, '1'], [162, 126.92, '2'], [206, 126.92, '3'],
  ];
  expected.forEach((exp, idx) => {
    const n = nums[idx];
    assert.equal(n.x, exp[0], `number ${idx} x`);
    assert.ok(near(n.y, exp[1]), `number ${idx} y ${n.y}, expected ${exp[1]}`);
    assert.equal(n.value, exp[2], `number ${idx} value`);
  });
});

test('render: the column headers sit centred over their cell', () => {
  const svg = render(dataOf(D, ['a', 'b', 'c']), {});
  // The headers are the muted texts above the first row. Hand value (phase 4h.3b): the first line centre is 0.77em = 9.24 px.
  const hdr = texts(svg).filter((t) => t.cls === 't-muted' && t.y < cells(svg)[0].y);
  const expected = [
    [118, 9.24, 'a'], [162, 9.24, 'b'], [206, 9.24, 'c'],
  ];
  expected.forEach((exp, idx) => {
    const h = hdr[idx];
    assert.equal(h.x, exp[0], `header ${idx} x`);
    assert.ok(near(h.y, exp[1]), `header ${idx} y ${h.y}, expected ${exp[1]}`);
    assert.equal(h.value, exp[2], `header ${idx} value`);
  });
});

// Header text boxes (phase 4h.3b). core\svg.js shifts each text down by 0.35em (dy), so the box is not symmetric about the
// centre y that svgText receives. The two box constants below were measured in Chromium in tier 4h.3 (first line at y=13,
// font 12: box 3.9 to 20.5, that is 9.1 px above y and 7.5 px below y). The test keeps its own copy, not the config.
const TEST_BOX_ABOVE_EM = 0.758;
const TEST_BOX_BELOW_EM = 0.625;
// The dy that core\svg.js adds to every text: the reason the box is not symmetric about y (the constants above include it).
const TEST_BASELINE_SHIFT_EM = 0.35;
// The header texts as {y, dy, fs}: the column headers are the middle-anchored muted texts.
const headerTextBoxes = (svg) => [...svg.matchAll(/<text x="([^"]*)" y="([^"]*)" dy="([^"]*)" class="t-muted" text-anchor="middle" font-size="([^"]*)">/g)]
  .map((m) => ({ y: Number(m[2]), dy: m[3], fs: Number(m[4]) }));

test('render: the header text boxes sit inside the header, with the line spacing (one line and three lines)', () => {
  const long = 'abcdefghijklmnopqrstuvwxy';
  const cases = [
    ['one line', render(dataOf(D, ['a', 'b', 'c']), {})],
    ['three lines', render(dataOf([['a', long], ['a'], [long], ['a', long]], ['a', long]), {})],
  ];
  for (const [name, svg] of cases) {
    const boxes = headerTextBoxes(svg);
    const headerHeight = cells(svg)[0].y;
    const first = boxes[0];
    const last = boxes.reduce((a, b) => (b.y > a.y ? b : a));
    const ys = [...new Set(boxes.map((b) => b.y))].sort((a, b) => a - b);
    for (const b of boxes) assert.equal(b.dy, `${TEST_BASELINE_SHIFT_EM}em`, `${name}: the baseline shift of svgText`);
    const top = first.y - TEST_BOX_ABOVE_EM * first.fs;
    assert.ok(top >= -TOLERANCE && top <= 1.5 + TOLERANCE, `${name}: first header box top ${top} is at or below 0 and at most 1.5 px below 0`);
    const bottom = last.y + TEST_BOX_BELOW_EM * last.fs;
    assert.ok(bottom <= headerHeight + TOLERANCE, `${name}: last header box bottom ${bottom} is at most the header height ${headerHeight}`);
    assert.ok(headerHeight - bottom <= 1.5 + TOLERANCE, `${name}: last header box bottom ${bottom} is at most 1.5 px above the header height ${headerHeight}`);
    for (let i = 1; i < ys.length; i += 1) {
      assert.ok(Math.abs(ys[i] - ys[i - 1] - explore.matrix.lineHeight) < TOLERANCE, `${name}: header lines ${ys[i - 1]} and ${ys[i]} are ${explore.matrix.lineHeight} apart`);
    }
  }
  assert.equal(explore.matrix.descentShare, undefined, 'the descent share is removed from the config');
});

test('render: the row labels sit beside their row', () => {
  const svg = render(dataOf(D, ['a', 'b', 'c']), {});
  const rows = texts(svg).filter((t) => t.cls === 't-muted' && t.x === 92);
  // Hand values (phase 4h.3b): the row centre is the row top (16.92 + 44 x row) plus 22 px.
  const expected = [
    [38.92, 'a'], [82.92, 'b'], [126.92, 'c'],
  ];
  expected.forEach((exp, idx) => {
    const r = rows[idx];
    assert.ok(near(r.y, exp[0]), `row ${idx} y ${r.y}, expected ${exp[0]}`);
    assert.equal(r.value, exp[1], `row ${idx} value`);
  });
});

test('render: a long label wraps to the header and row caps, fixing the line offsets', () => {
  // A 25-char single word is wider than the column cap (phase 4h.3c, D19): the column is colMaxPx = 96 px wide, and the
  // header breaks it into 12-character pieces at 96 - 2 x 4 = 88 px. Hand values: the width is 96 + 2 x 96 + 4 = 292 px
  // (was 188 with 44 px columns); the header has 3 lines, the cap, and the long column centre is 96 + 96 + 48 = 240.
  // The row label is unchanged (its width is labelPx).
  const long = 'abcdefghijklmnopqrstuvwxy';
  const svg = render(dataOf([['a', long], ['a'], [long], ['a', long]], ['a', long]), {});
  assert.equal(viewBox(svg)[0], 292, 'the width with two wrapped labels and 96 px columns');
  assert.ok(near(viewBox(svg)[1], 136.92), 'the fixed height 136.92 (hand value: 44.92 + 2 x 44 + 4)');

  // The long column header wraps to three lines, centred at 9.24, 23.24 and 37.24 px (4h.3b line centres).
  const hdr = texts(svg).filter((t) => t.cls === 't-muted' && t.x === 240).sort((a, b) => a.y - b.y);
  assert.deepEqual(hdr.map(({ cls, x, value }) => ({ cls, x, value })), [
    { cls: 't-muted', x: 240, value: 'abcdefghijkl' },
    { cls: 't-muted', x: 240, value: 'mnopqrstuvwx' },
    { cls: 't-muted', x: 240, value: 'y' },
  ], 'the long header wraps to 3 lines');
  [9.24, 23.24, 37.24].forEach((y, i) => assert.ok(near(hdr[i].y, y), `long header line ${i} at ${hdr[i].y}, expected ${y}`));

  // The row labels: the short row centred at 66.92 px; the long label wrapped to two lines at 103.92 and 117.92 px (the
  // first line kept). Hand values (phase 4h.3b): the row tops are 44.92 and 88.92 px.
  const rows = texts(svg).filter((t) => t.cls === 't-muted' && t.x === 92).sort((a, b) => a.y - b.y);
  assert.deepEqual(rows.map(({ cls, x, value }) => ({ cls, x, value })), [
    { cls: 't-muted', x: 92, value: 'a' },
    { cls: 't-muted', x: 92, value: 'abcdefghijkl' },
    { cls: 't-muted', x: 92, value: 'mnopqrstuvwx' },
  ], 'the long label wraps to 2 row lines');
  [66.92, 103.92, 117.92].forEach((y, i) => assert.ok(near(rows[i].y, y), `row label ${i} at ${rows[i].y}, expected ${y}`));
});

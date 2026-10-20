// Colour maths (phase 4g.2, Node). Every case pins one exported function: the hand values from the brief, the exact
// bad inputs that must throw, the share loop, and the __proto__/constructor strings. run-test executes this file; the
// mutation gate runs it against app\core\color.js.
import { test, assert } from '../core/harness.js';
import { parseHex, mixHex, contrastRatio, channelSpread } from '../core/color.js';

// Two values are close enough when they agree to tol, avoiding float noise in the comparison.
const CLOSE = (a, b, tol) => Math.abs(a - b) <= tol;

test('parseHex: the six hand colours, any case', () => {
  assert.deepEqual(parseHex('#1E2129'), [30, 33, 41], 'mixed case');
  assert.deepEqual(parseHex('#000000'), [0, 0, 0], 'black');
  assert.deepEqual(parseHex('#ffffff'), [255, 255, 255], 'lowercase white');
  assert.deepEqual(parseHex('#FFFFFF'), [255, 255, 255], 'uppercase white');
  assert.deepEqual(parseHex('#FF0000'), [255, 0, 0], 'uppercase red');
});

test('parseHex: non-hex, wrong length and non-string inputs throw TypeError', () => {
  for (const bad of ['red', '#fff', '#12345g', '1e2129', '#1e212', '#1e21290', null, undefined, 123, {}, '__proto__', 'constructor']) {
    let threw = false;
    try { parseHex(bad); } catch (e) { threw = e instanceof TypeError; }
    assert.ok(threw, `parseHex(${JSON.stringify(bad)}) must throw TypeError`);
  }
});

test('mixHex: the share-0.1 blend hand colours', () => {
  assert.deepEqual(mixHex('#1e2129', '#bba9da', 0.1), '#2e2f3b', 'blend 1');
  assert.deepEqual(mixHex('#1e2129', '#daa9ca', 0.1), '#312f39', 'blend 2');
  assert.deepEqual(mixHex('#1e2129', '#cb86b6', 0.1), '#2f2b37', 'blend 3');
  assert.deepEqual(mixHex('#1e2129', '#b6c3bf', 0.1), '#2d3138', 'blend 4');
  assert.deepEqual(mixHex('#1e2129', '#b8b8b8', 0.1), '#2d3037', 'blend 5');
});

test('mixHex: share 0, share 1, the midpoint and a quarter blend', () => {
  assert.deepEqual(mixHex('#102030', '#a0b0c0', 0), '#102030', 'share 0');
  assert.deepEqual(mixHex('#102030', '#a0b0c0', 1), '#a0b0c0', 'share 1');
  assert.deepEqual(mixHex('#000000', '#ffffff', 0.5), '#808080', 'midpoint');
  assert.deepEqual(mixHex('#FF0000', '#0000FF', 0.25), '#bf0040', 'quarter');
});

test('mixHex: a bad share throws RangeError, shares 0 and 1 stay valid', () => {
  for (const bad of [-0.1, 1.1, Number.NaN, '0.5', null]) {
    let threw = false;
    try { mixHex('#000000', '#ffffff', bad); } catch (e) { threw = e instanceof RangeError; }
    assert.ok(threw, `mixHex share ${JSON.stringify(bad)} must throw RangeError`);
  }
  assert.ok(mixHex('#000000', '#ffffff', 0) === '#000000', 'share 0 is valid');
  assert.ok(mixHex('#000000', '#ffffff', 1) === '#ffffff', 'share 1 is valid');
});

test('mixHex: an invalid colour throws TypeError once the share is accepted', () => {
  let threw = false;
  try { mixHex('nope', '#ffffff', 0.5); } catch (e) { threw = e instanceof TypeError; }
  assert.ok(threw, 'bad bg must throw TypeError');
  threw = false;
  try { mixHex('#000000', '__proto__', 0.5); } catch (e) { threw = e instanceof TypeError; }
  assert.ok(threw, "bad fg '__proto__' must throw TypeError");
});

test('mixHex: the three channels stay equal and non-decreasing as share grows', () => {
  let prev = 0;
  for (const share of [0, 0.25, 0.5, 0.75, 1]) {
    const [r, g, b] = parseHex(mixHex('#000000', '#ffffff', share));
    assert.ok(r === g && g === b, `share ${share}: channels equal`);
    assert.ok(r >= prev, `share ${share}: channel does not decrease`);
    prev = r;
  }
});

test('contrastRatio: black on white is 21 in both orders', () => {
  assert.ok(CLOSE(contrastRatio('#ffffff', '#000000'), 21, 1e-9), 'white on black');
  assert.ok(CLOSE(contrastRatio('#000000', '#ffffff'), 21, 1e-9), 'black on white');
});

test('contrastRatio: the two tolerance hand values', () => {
  assert.ok(CLOSE(contrastRatio('#777777', '#ffffff'), 4.4781, 0.0005), '777 on white');
  assert.ok(CLOSE(contrastRatio('#e7e9ee', '#2e2f3b'), 10.901, 0.001), 'e7e9ee on 2e2f3b');
});

test('contrastRatio: equal colours give exactly 1', () => {
  assert.ok(CLOSE(contrastRatio('#1e2129', '#1e2129'), 1, 1e-9), 'same colour');
});

test('channelSpread: the three hand values', () => {
  assert.deepEqual(channelSpread('#2e2f3b'), 13, '2e2f3b');
  assert.deepEqual(channelSpread('#808080'), 0, '808080');
  assert.deepEqual(channelSpread('#ff0000'), 255, 'ff0000');
});

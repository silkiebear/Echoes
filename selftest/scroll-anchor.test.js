// Scroll anchor pure helpers (Node and browser). The browser behaviour on rotation is checked by hand (phase 4a
// report), not here.
import { test, assert } from '../core/harness.js';
import { pickAnchor, deltaFor } from '../core/scroll-anchor.js';

test('pickAnchor: the first item (document order) whose bottom is below the viewport top', () => {
  const items = [
    { id: 'a', top: -300, bottom: -100 },
    { id: 'b', top: -50, bottom: 40 },
    { id: 'c', top: 60, bottom: 200 },
  ];
  assert.equal(pickAnchor(items, 0), 'b', 'anchor');
  assert.equal(pickAnchor(items, 100), 'c', 'anchor after the viewport moved down');
});

test('pickAnchor: null when every item ends above the viewport top or the list is empty', () => {
  assert.equal(pickAnchor([{ id: 'a', top: -300, bottom: -100 }], 0), null, 'all above');
  assert.equal(pickAnchor([], 0), null, 'empty list');
});

test('pickAnchor: a bottom equal to the viewport top does not count; a tie keeps document order', () => {
  const edge = [{ id: 'a', top: -20, bottom: 0 }, { id: 'b', top: -10, bottom: 5 }];
  assert.equal(pickAnchor(edge, 0), 'b', 'bottom equal to the viewport top was picked');
  const tie = [{ id: 'first', top: 0, bottom: 10 }, { id: 'second', top: 0, bottom: 10 }];
  assert.equal(pickAnchor(tie, 5), 'first', 'tie not resolved by document order');
});

test('deltaFor: positive when the element is below its place (scroll down), negative above, zero in place', () => {
  assert.equal(deltaFor(100, 500), 400, 'element below its place');
  assert.equal(deltaFor(500, 100), -400, 'element above its place');
  assert.equal(deltaFor(250, 250), 0, 'element in place');
});

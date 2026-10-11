import { test, assert } from '../core/harness.js';
import { esc, svgDoc } from '../core/svg.js';

test('esc escapes & < > " and apostrophe', () => {
  assert.equal(esc(`<b>&"'`), '&lt;b&gt;&amp;&quot;&#39;');
});

test('svgDoc has viewBox and role, no xmlns or width attribute, escaped title', () => {
  const svg = svgDoc({ width: 10, height: 20, title: '<T>', desc: 'd', body: '' });
  assert.ok(svg.startsWith('<svg viewBox="0 0 10 20"'), 'viewBox comes first');
  assert.ok(svg.includes('role="img"'), 'role missing');
  assert.ok(!svg.includes('xmlns'), 'xmlns must not be present');
  assert.ok(!/\swidth=/.test(svg), 'width attribute must not be present');
  assert.ok(svg.includes('<title>&lt;T&gt;</title>'), 'title is not escaped');
});

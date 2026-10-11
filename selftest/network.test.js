import { test, skip, assert } from '../core/harness.js';
import { probeNetworkBlocked } from '../core/probe.js';

if (typeof document === 'undefined') {
  skip('outbound image request is blocked by CSP', 'browser only');
} else {
  test('outbound image request is blocked by CSP', async () => {
    const result = await probeNetworkBlocked();
    assert.ok(result.blocked, 'the probe request was not blocked');
  });
}

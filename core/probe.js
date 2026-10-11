// Privacy probes. The network probe relies on the CSP img-src directive blocking the request.
// readFileStats never registers or logs file content.
import { app } from '../config/app.js';

const LF = 0x0a;
const PROBE_URL = 'https://example.invalid/probe.png'; // lint-allow: reserved TLD, proves CSP blocks outbound requests
const PROBE_ORIGIN = new URL(PROBE_URL).origin;

export function probeNetworkBlocked() {
  return new Promise((resolve) => {
    let timer = null;
    const finish = (result) => {
      document.removeEventListener('securitypolicyviolation', onViolation);
      clearTimeout(timer);
      resolve(result);
    };
    const onViolation = (event) => {
      if (typeof event.blockedURI === 'string' && event.blockedURI.startsWith(PROBE_ORIGIN)) {
        finish({ blocked: true, directive: event.effectiveDirective || event.violatedDirective || '' });
      }
    };
    document.addEventListener('securitypolicyviolation', onViolation);
    timer = setTimeout(() => finish({ blocked: false, directive: '' }), app.probe.timeoutMs);
    const img = new Image();
    img.src = PROBE_URL;
  });
}

export async function readFileStats(file) {
  const chunk = app.probe.chunkBytes;
  let bytes = 0;
  let lineBreaks = 0;
  for (let offset = 0; offset < file.size; offset += chunk) {
    const buffer = new Uint8Array(await file.slice(offset, offset + chunk).arrayBuffer());
    bytes += buffer.length;
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === LF) lineBreaks += 1;
    }
  }
  return { bytes, lineBreaks };
}

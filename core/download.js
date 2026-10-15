// Saves text as a file through a temporary link. Same technique as modules/diag-panel.js.
import { app } from '../config/app.js';

export function downloadText(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the save in some browsers, so wait first.
  setTimeout(() => URL.revokeObjectURL(url), app.diag.revokeDelayMs);
}

import { app } from '../config/app.js';

function firstLines(text) {
  return text.split('\n').slice(0, app.diag.previewLines).join('\n');
}

function download(text, name) {
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

function button(text) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = text;
  return element;
}

export default {
  id: 'diag-panel',
  title: 'Diagnostics',
  phase: 0,
  order: 30,
  mount(container, ctx) {
    const diag = ctx.diag;

    const include = document.createElement('input');
    include.type = 'checkbox';
    include.id = 'diag-include-data';
    const includeLabel = document.createElement('label');
    includeLabel.className = 'check';
    includeLabel.htmlFor = include.id;
    includeLabel.append(include, document.createTextNode('Include data-derived sections'));

    const downloadButton = button('Download');
    const copyButton = button('Copy');
    const row = document.createElement('div');
    row.className = 'row';
    row.append(downloadButton);
    if (typeof navigator.share === 'function') {
      const shareButton = button('Share');
      shareButton.addEventListener('click', () => share());
      row.append(shareButton);
    }
    row.append(copyButton);

    const status = document.createElement('p');
    status.className = 'status-line';
    status.setAttribute('role', 'status');
    const preview = document.createElement('pre');
    preview.className = 'scroll';
    preview.setAttribute('aria-label', 'Diagnostics preview');
    container.append(includeLabel, row, status, preview);

    const build = () => {
      const text = diag.build({ includeData: include.checked });
      preview.textContent = firstLines(text);
      return text;
    };
    build();
    include.addEventListener('change', build);

    downloadButton.addEventListener('click', () => {
      const text = build();
      const bytes = new Blob([text]).size;
      const name = diag.fileNameFor(new Date());
      download(text, name);
      status.textContent = `Saved ${name} (${bytes} bytes)`;
      diag.log('INFO', `diagnostics downloaded bytes=${bytes} includeData=${include.checked}`);
    });

    async function share() {
      const text = build();
      const name = diag.fileNameFor(new Date());
      try {
        const file = new File([text], name, { type: 'text/plain' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Echoes diagnostics' });
        } else {
          await navigator.share({ title: 'Echoes diagnostics', text });
        }
        status.textContent = 'Shared.';
      } catch (err) {
        const name = err ? err.name : 'unknown';
        if (name === 'AbortError') return;
        status.textContent = 'Share failed.';
        diag.log('ERROR', `share failed: ${name}`);
      }
    }

    copyButton.addEventListener('click', async () => {
      const text = build();
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        status.textContent = 'Clipboard not available. Use Download.';
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = 'Copied.';
      } catch {
        status.textContent = 'Copy failed. Use Download.';
      }
    });
  },
};

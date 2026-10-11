import { probeNetworkBlocked, readFileStats } from '../core/probe.js';

export default {
  id: 'privacy-probe',
  title: 'Privacy checks',
  phase: 0,
  order: 40,
  mount(container, ctx) {
    const networkButton = document.createElement('button');
    networkButton.type = 'button';
    networkButton.textContent = 'Test network block';
    const networkStatus = document.createElement('p');
    networkStatus.className = 'status-line';
    networkStatus.setAttribute('role', 'status');

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'privacy-file';
    fileInput.accept = '.csv,.txt,text/csv,text/plain';
    const fileLabel = document.createElement('label');
    fileLabel.htmlFor = fileInput.id;
    fileLabel.textContent = 'Test file read (nothing is uploaded)';
    const fileStatus = document.createElement('p');
    fileStatus.className = 'status-line';
    fileStatus.setAttribute('role', 'status');

    container.append(networkButton, networkStatus, fileLabel, fileInput, fileStatus);

    networkButton.addEventListener('click', async () => {
      networkStatus.textContent = 'Testing...';
      const result = await probeNetworkBlocked();
      const detail = result.directive ? ` (directive: ${result.directive})` : '';
      networkStatus.textContent = `Blocked: ${result.blocked}${detail}`;
      ctx.diag.log('INFO', `network probe blocked=${result.blocked}`);
    });

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      fileStatus.textContent = 'Reading...';
      try {
        const stats = await readFileStats(file);
        fileStatus.textContent = `Bytes: ${stats.bytes}. Line breaks: ${stats.lineBreaks}. Nothing was uploaded or stored.`;
        ctx.diag.log('INFO', `file read bytes=${stats.bytes} lineBreaks=${stats.lineBreaks}`);
      } catch (err) {
        const name = err ? err.name : 'unknown';
        fileStatus.textContent = `Read failed: ${name}`;
        ctx.diag.log('ERROR', `file read failed: ${name}`);
      }
    });
  },
};

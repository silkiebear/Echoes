// App-wide tunables. Limits are plain numbers so each one is changed in one place.
export const app = {
  name: 'Echoes',
  diag: {
    maxBytes: 100000,      // hard cap on the diagnostics text (about 100 KB)
    maxErrors: 50,         // error entries kept in memory
    maxLogLines: 500,      // log entries kept in memory
    previewLines: 30,      // lines shown in the diagnostics preview
    revokeDelayMs: 4000,   // keeps a download URL alive long enough for the save dialog
  },
  probe: {
    timeoutMs: 1500,       // wait for a CSP violation before reporting "not blocked"
    chunkBytes: 1048576,   // read size when counting bytes and line breaks (1 MiB)
  },
  selftest: {
    stringCount: 5000,     // registered strings in the redaction performance test
    textBytes: 100000,     // text size in that test
    perfBudgetMs: 1000,    // allowed time for register plus safe in that test
  },
};

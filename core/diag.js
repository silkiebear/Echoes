// Diagnostics with redaction. Strings read from the export are registered and
// replaced by stable tokens in every [SAFE] output, so a shared file cannot leak
// them by accident. Best effort, not a guarantee.
import { app } from '../config/app.js';
import { version } from '../config/version.js';
import { describeEnvironment } from './env.js';

const PREFIX_BY_KIND = new Map([['label', 'L'], ['mood', 'M'], ['note', 'N']]);
const DEFAULT_PREFIX = 'X';
const MIN_LENGTH = 2;
// Keys this long or longer match anywhere (leak-safe, may mangle longer words). Shorter keys match only
// as whole words, so a two-letter mood cannot blank out the middle of unrelated words.
const SUBSTRING_MIN_LENGTH = 3;
const TOKEN_DIGITS = 4;
const REDACTED = '[REDACTED]';
const UTF8_MAX_BYTES = 4; // reserved so a cut multi-byte character cannot overflow the cap
const DEFAULT_SECTION = 'SAFE';

// Built from parts so no external-URL literal appears in app files (lint L2). Matches an optional scheme,
// then "//", then host and port, up to the next slash, space or closing parenthesis. Path parts are kept.
const ORIGIN = new RegExp(`(?:[a-z][a-z0-9+.-]*:)?\\/\\/[^/\\s)]*`, 'gi');

const entries = new Map();  // lowercase text -> { text, token }
const counters = new Map(); // prefix -> last number issued
let pattern = null;         // compiled alternation, rebuilt after register()
let logEntries = [];
let errorEntries = [];
let errorTotal = 0;         // every error captured this session, not capped like errorEntries
let selftestSummary = null;
let parseStats = null;      // counts, column names and shapes from the last parse; never values
let capturedTarget = null;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Two patterns: long keys (substring, flags gi) and short keys (whole word, flags giu). The short
// pattern captures the character before the match instead of using a lookbehind.
function compile() {
  if (entries.size === 0) return null;
  // Longest first, so "Sleep well" wins over "Sleep" at the same position.
  const byLength = (a, b) => b.length - a.length;
  const keys = [...entries.keys()];
  const long = keys.filter((k) => k.length >= SUBSTRING_MIN_LENGTH).sort(byLength);
  const short = keys.filter((k) => k.length < SUBSTRING_MIN_LENGTH).sort(byLength);
  return {
    long: long.length ? new RegExp(long.map(escapeRegex).join('|'), 'gi') : null,
    short: short.length
      ? new RegExp(`(^|[^\\p{L}\\p{N}])(${short.map(escapeRegex).join('|')})(?![\\p{L}\\p{N}])`, 'giu')
      : null,
  };
}

function trimTo(list, max) {
  if (list.length > max) list.splice(0, list.length - max);
}

// NFC first, so a composed and a decomposed spelling of the same label match each other.
export function register(str, kind) {
  if (typeof str !== 'string') return null;
  const text = str.normalize('NFC').trim();
  if (text.length < MIN_LENGTH) return null;
  const key = text.toLowerCase();
  const existing = entries.get(key);
  if (existing) return existing.token;
  const prefix = PREFIX_BY_KIND.get(kind) || DEFAULT_PREFIX;
  const next = (counters.get(prefix) || 0) + 1;
  counters.set(prefix, next);
  const token = prefix + String(next).padStart(TOKEN_DIGITS, '0');
  entries.set(key, { text, token });
  pattern = null;
  return token;
}

// Unknown case-folding matches are redacted rather than passed through.
function tokenFor(match) {
  const entry = entries.get(match.toLowerCase());
  return entry ? entry.token : REDACTED;
}

export function safe(value) {
  const text = String(value).normalize('NFC');
  if (entries.size === 0) return text;
  pattern = pattern || compile();
  const replacedLong = pattern.long ? text.replace(pattern.long, (match) => tokenFor(match)) : text;
  if (!pattern.short) return replacedLong;
  return replacedLong.replace(pattern.short, (match, prefix, key) => prefix + tokenFor(key));
}

export function log(level, msg, section = DEFAULT_SECTION) {
  logEntries.push({
    time: new Date().toISOString(),
    level: safe(level),
    section: safe(section),
    msg: safe(msg),
  });
  trimTo(logEntries, app.diag.maxLogLines);
}

function describeValue(value) {
  if (value && typeof value === 'object') {
    return { message: String(value.message || value), stack: String(value.stack || '') };
  }
  return { message: String(value), stack: '' };
}

// Keeps the path of each URL-like token and drops scheme, host and port.
export function stripOrigins(text) {
  return String(text).replace(ORIGIN, '');
}

// Cross-origin scripts report only "Script error." with no file, line or stack. Say so, so the entry
// is not mistaken for a fault in the app.
const BARE_SCRIPT_ERROR = 'Script error.';
const BARE_SCRIPT_DETAIL = 'Script error. [no details: cross-origin or injected script]';

function recordError(kind, value, fallback, event = null) {
  const info = describeValue(value);
  const file = event && event.filename ? safe(stripOrigins(String(event.filename))) : '';
  let message = info.message || fallback;
  if (message === BARE_SCRIPT_ERROR && !file) message = BARE_SCRIPT_DETAIL;
  errorTotal += 1;
  errorEntries.push({
    time: new Date().toISOString(),
    kind,
    message: safe(stripOrigins(message)),
    where: file ? `${file}:${event.lineno || 0}:${event.colno || 0}` : '',
    stack: safe(stripOrigins(info.stack)),
  });
  trimTo(errorEntries, app.diag.maxErrors);
}

export function totalErrors() {
  return errorTotal;
}

export function captureErrors(target = typeof window !== 'undefined' ? window : null) {
  if (!target || target === capturedTarget) return;
  capturedTarget = target;
  target.addEventListener('error', (event) => {
    recordError('ERROR', event.error || event.message, 'script error', event);
  });
  target.addEventListener('unhandledrejection', (event) => {
    recordError('UNHANDLED', event.reason, 'unhandled rejection');
  });
}

const FILE_PREFIX = 'echoes-diagnostics';
const TWO_DIGITS = 2;
const MONTH_OFFSET = 1; // JavaScript months are 0-based

function pad2(n) {
  return String(n).padStart(TWO_DIGITS, '0');
}

// Local time, so the name matches the time shown on the device when the file was saved.
export function fileNameFor(date) {
  const day = `${date.getFullYear()}${pad2(date.getMonth() + MONTH_OFFSET)}${pad2(date.getDate())}`;
  return `${FILE_PREFIX}-${day}-${pad2(date.getHours())}${pad2(date.getMinutes())}.txt`;
}

export function setSelftest(summary) {
  selftestSummary = summary;
}

export function setParseStats(stats) {
  parseStats = stats;
}

export function reset() {
  entries.clear();
  counters.clear();
  pattern = null;
  logEntries = [];
  errorEntries = [];
  errorTotal = 0;
  selftestSummary = null;
  parseStats = null;
}

function safeBlock(name, lines) {
  return `== ${name} [SAFE] ==\n${safe(lines.join('\n'))}\n\n`;
}

function environmentLines() {
  return Object.entries(describeEnvironment()).map(([key, value]) => `${key}: ${value}`);
}

function selftestLines() {
  if (!selftestSummary) return ['not run in this session'];
  const s = selftestSummary;
  const lines = [`ran: ${s.ran}`, `passed ${s.passed}, failed ${s.failed}, skipped ${s.skipped}`];
  for (const failure of s.failing) {
    lines.push(`FAIL ${failure.file} :: ${failure.name}`, `  ${failure.error}`);
  }
  return lines;
}

// Nested objects print as "key.sub: value"; arrays as one comma-separated line. safeBlock() runs safe() on the text.
function flattenStats(obj, prefix = '') {
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    const name = prefix + key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      lines.push(...flattenStats(value, `${name}.`));
    } else if (Array.isArray(value)) {
      lines.push(`${name}: ${value.join(', ')}`);
    } else {
      lines.push(`${name}: ${value}`);
    }
  }
  return lines;
}

function parseStatLines() {
  if (!parseStats) return ['(none yet)'];
  return flattenStats(parseStats);
}

function errorLines() {
  if (errorEntries.length === 0) return ['no errors captured'];
  const lines = [];
  for (const e of errorEntries) {
    lines.push(`[${e.time}] ${e.kind}: ${e.message}${e.where ? ` at ${e.where}` : ''}`);
    if (e.stack) lines.push(...e.stack.split('\n').map((line) => `    ${line}`));
  }
  return lines;
}

function logLines() {
  if (logEntries.length === 0) return ['no log entries'];
  return logEntries.map((e) => `[${e.time}] ${e.level} [${e.section}] ${e.msg}`);
}

function dataBlock() {
  const lines = [...entries.values()].map((e) => `${e.token} = ${JSON.stringify(e.text)}`);
  return '== LABELS AND MOODS [CONTAINS DATA FROM YOUR EXPORT] ==\n'
    + (lines.length ? lines.join('\n') : '(no strings registered)')
    + '\n\n';
}

function capBytes(text) {
  const max = app.diag.maxBytes;
  const bytes = encoder.encode(text);
  if (bytes.length <= max) return text;
  const notice = `\n[TRUNCATED: output exceeded ${max} bytes; remaining content omitted]\n`;
  const room = max - encoder.encode(notice).length - UTF8_MAX_BYTES;
  return decoder.decode(bytes.subarray(0, room)) + notice;
}

export function build({ includeData = false } = {}) {
  const header = [
    'ECHOES DIAGNOSTICS v1',
    `time: ${new Date().toISOString()}`,
    `app: ${app.name} phase ${version.phase} build ${version.build}`,
    '',
    '',
  ].join('\n');
  let text = header
    + safeBlock('ENVIRONMENT', environmentLines())
    + safeBlock('SELFTEST', selftestLines())
    + safeBlock('ERRORS', errorLines())
    + safeBlock('LOG', logLines())
    + safeBlock('PARSE STATS', parseStatLines());
  if (includeData) text += dataBlock();
  return capBytes(text);
}

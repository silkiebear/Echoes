// Rewrites time cells written as H:MM or HH:MM into the dotted form H.MM or HH.MM seen in the real export. Only the
// time column changes. Shared by tools\make-synthetic-export.mjs and the export-parse tests, so both produce the same text.
import { parseCsv } from './csv.js';
import { parser } from '../config/parser.js';

const COLON_TIME = /^\d{1,2}:\d{2}$/;

function normalizeName(raw) {
  return raw.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[ -]/g, '_');
}

export function dotTimeCells(text, { delimiter = ',', eol = '\n', bom = false } = {}) {
  const csv = parseCsv(text, parser);
  const timeIndex = csv.header.map(normalizeName).findIndex((name) => parser.columnAliases.time.includes(name));
  const quote = (cell) => (/["\r\n]/.test(cell) || cell.includes(delimiter) ? `"${cell.replace(/"/g, '""')}"` : cell);
  const header = csv.header.map((cell) => cell.replace(/^\uFEFF/, ''));
  const rows = csv.rows.map((row) => row.map((cell, i) => (i === timeIndex && COLON_TIME.test(cell) ? cell.replace(':', '.') : cell)));
  const lines = [header, ...rows].map((row) => row.map(quote).join(delimiter));
  return (bom ? '\uFEFF' : '') + lines.join(eol) + eol;
}

// RFC 4180 CSV parser. Quote-aware, multi-delimiter detection, never throws.
// The chosen delimiter is the candidate giving the most fields in the first record.

const CODE_BOM = 0xfeff;
const CODE_CR = 0x0d;
const CODE_LF = 0x0a;
const CODE_DQUOTE = 0x22;

const DELIMITER_NAME = { ',': 'comma', ';': 'semicolon', '\t': 'tab' };

function firstRecordFieldCount(text, delimiterCode) {
  // Count fields in the first record only; quotes make delimiters and line
  // breaks opaque so they do not inflate the count.
  let fields = 1;
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    if (ch === CODE_DQUOTE) {
      inQuotes = !inQuotes;
    } else if (!inQuotes && ch === delimiterCode) {
      fields += 1;
    } else if (!inQuotes && (ch === CODE_CR || ch === CODE_LF)) {
      break;
    }
  }
  return fields;
}

function chooseDelimiter(text, candidates) {
  if (text.length === 0) return candidates[0];
  let best = candidates[0];
  let bestCount = firstRecordFieldCount(text, candidates[0].charCodeAt(0));
  for (let i = 1; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const count = firstRecordFieldCount(text, candidate.charCodeAt(0));
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

// Parse one record from index start. Returns fields, the next index, whether a
// line break ended the record, the line-break counters, and unterminated flag.
function parseRecord(text, start, delimiterCode) {
  const len = text.length;
  const fields = [''];
  let i = start;
  let fieldStarted = false;
  let inQuotes = false;
  let ended = false;
  let crlf = 0;
  let lf = 0;
  let quotedBreaks = 0;

  while (i < len) {
    const ch = text.charCodeAt(i);

    if (inQuotes) {
      if (ch === CODE_DQUOTE) {
        if (i + 1 < len && text.charCodeAt(i + 1) === CODE_DQUOTE) {
          fields[fields.length - 1] += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else if (ch === CODE_CR) {
        if (i + 1 < len && text.charCodeAt(i + 1) === CODE_LF) {
          fields[fields.length - 1] += '\r\n';
          quotedBreaks += 1;
          i += 2;
        } else {
          fields[fields.length - 1] += '\r';
          quotedBreaks += 1;
          i += 1;
        }
      } else if (ch === CODE_LF) {
        fields[fields.length - 1] += '\n';
        quotedBreaks += 1;
        i += 1;
      } else {
        fields[fields.length - 1] += text[i];
        i += 1;
      }
      continue;
    }

    if (ch === CODE_DQUOTE) {
      if (!fieldStarted) {
        inQuotes = true;
        fieldStarted = true;
        i += 1;
      } else {
        fields[fields.length - 1] += '"';
        fieldStarted = true;
        i += 1;
      }
      continue;
    }

    if (ch === delimiterCode) {
      fields.push('');
      fieldStarted = false;
      i += 1;
      continue;
    }

    if (ch === CODE_CR) {
      if (i + 1 < len && text.charCodeAt(i + 1) === CODE_LF) {
        crlf += 1;
        i += 2;
      } else {
        i += 1;
      }
      ended = true;
      break;
    }

    if (ch === CODE_LF) {
      lf += 1;
      i += 1;
      ended = true;
      break;
    }

    fields[fields.length - 1] += text[i];
    fieldStarted = true;
    i += 1;
  }

  if (i >= len && inQuotes) ended = false; // still open when text ran out
  if (fields.length === 0) fields.push('');

  return { fields, next: i, ended, crlf, lf, quotedBreaks, unterminated: inQuotes };
}

export function parseCsv(text, cfg) {
  const candidates = cfg.delimiters;
  const info = {
    delimiter: DELIMITER_NAME[candidates[0]] ?? candidates[0],
    bom: false,
    crlf: 0,
    lf: 0,
    quotedBreaks: 0,
    raggedRows: 0,
    unterminatedQuote: false,
  };

  if (text.length === 0) {
    return { header: [], rows: [], info };
  }

  let work = text;
  if (work.charCodeAt(0) === CODE_BOM) {
    work = work.slice(1);
    info.bom = true;
  }
  if (work.length === 0) {
    return { header: [], rows: [], info };
  }

  const delimiter = chooseDelimiter(work, candidates);
  info.delimiter = DELIMITER_NAME[delimiter] ?? candidates[0];

  const len = work.length;
  const records = [];
  let i = 0;
  let unterminated = false;

  while (i < len) {
    const rec = parseRecord(work, i, delimiter.charCodeAt(0));
    records.push(rec.fields);
    info.crlf += rec.crlf;
    info.lf += rec.lf;
    info.quotedBreaks += rec.quotedBreaks;
    i = rec.next;
    if (rec.unterminated) {
      unterminated = true;
      break;
    }
  }

  // A trailing empty line is a single empty field at end of text; drop it.
  if (i >= len) {
    const last = records[records.length - 1];
    if (last.length === 1 && last[0] === '') records.pop();
  }

  info.unterminatedQuote = unterminated;

  const header = records.length > 0 ? records[0] : [];
  const rows = records.slice(1);
  let raggedRows = 0;
  for (const row of rows) {
    if (row.length !== header.length) raggedRows += 1;
  }
  info.raggedRows = raggedRows;

  return { header, rows, info };
}

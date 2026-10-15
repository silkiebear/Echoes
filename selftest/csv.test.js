import { test, assert } from '../core/harness.js';
import { parseCsv } from '../core/csv.js';
import { parser } from '../config/parser.js';

test('1 plain LF splits header and one row', () => {
  const r = parseCsv('a,b\n1,2\n', parser);
  assert.deepEqual(r.header, ['a', 'b'], 'header');
  assert.deepEqual(r.rows, [['1', '2']], 'rows');
  assert.equal(r.info.delimiter, 'comma', 'delimiter');
  assert.equal(r.info.crlf, 0, 'crlf');
  assert.equal(r.info.lf, 2, 'lf');
});

test('2 quoted comma stays inside one field', () => {
  const r = parseCsv('a,b\n"x,y",2\n', parser);
  assert.deepEqual(r.rows, [['x,y', '2']], 'rows');
});

test('3 doubled quote becomes one literal quote', () => {
  const r = parseCsv('a\n"say ""hi"""\n', parser);
  assert.deepEqual(r.rows, [['say "hi"']], 'rows');
});

test('4 quoted line break is kept and counted', () => {
  const r = parseCsv('a,b\n"l1\nl2",x\n', parser);
  assert.deepEqual(r.rows, [['l1\nl2', 'x']], 'rows');
  assert.equal(r.info.quotedBreaks, 1, 'quotedBreaks');
});

test('5 BOM is stripped and flagged', () => {
  const r = parseCsv('\uFEFFa,b\n1,2\n', parser);
  assert.deepEqual(r.header, ['a', 'b'], 'header');
  assert.equal(r.info.bom, true, 'bom');
});

test('6 CRLF counts as crlf only', () => {
  const r = parseCsv('a,b\r\n1,2\r\n', parser);
  assert.deepEqual(r.rows, [['1', '2']], 'rows');
  assert.equal(r.info.crlf, 2, 'crlf');
  assert.equal(r.info.lf, 0, 'lf');
});

test('7 LF counts as lf only', () => {
  const r = parseCsv('a,b\n1,2\n', parser);
  assert.equal(r.info.crlf, 0, 'crlf');
  assert.equal(r.info.lf, 2, 'lf');
});

test('8 lone CR is a break but counted in neither', () => {
  const r = parseCsv('a,b\r1,2\r', parser);
  assert.deepEqual(r.rows, [['1', '2']], 'rows');
  assert.equal(r.info.crlf, 0, 'crlf');
  assert.equal(r.info.lf, 0, 'lf');
});

test('9 ragged rows are counted without padding', () => {
  const r = parseCsv('a,b,c\n1,2\n1,2,3,4\n', parser);
  assert.deepEqual(r.rows, [['1', '2'], ['1', '2', '3', '4']], 'rows');
  assert.equal(r.info.raggedRows, 2, 'raggedRows');
});

test('10 trailing empty line is dropped', () => {
  const r = parseCsv('a,b\n1,2\n\n', parser);
  assert.deepEqual(r.rows, [['1', '2']], 'rows');
});

test('11 missing trailing break still yields the row', () => {
  const r = parseCsv('a,b\n1,2', parser);
  assert.deepEqual(r.rows, [['1', '2']], 'rows');
});

test('12 semicolon header selects semicolon delimiter', () => {
  const r = parseCsv('a;b;c\n1;2;3\n', parser);
  assert.deepEqual(r.header, ['a', 'b', 'c'], 'header');
  assert.equal(r.info.delimiter, 'semicolon', 'delimiter');
});

test('13 tab header selects tab delimiter', () => {
  const r = parseCsv('a\tb\n1\t2\n', parser);
  assert.equal(r.info.delimiter, 'tab', 'delimiter');
  assert.deepEqual(r.rows, [['1', '2']], 'rows');
});

test('14 tie goes to the earlier candidate', () => {
  const r = parseCsv('a,b;c\n', parser);
  assert.equal(r.info.delimiter, 'comma', 'comma wins the tie');
});

test('15 delimiter inside quotes is ignored for detection', () => {
  const r = parseCsv('"a;b;c",d\n1,2\n', parser);
  assert.equal(r.info.delimiter, 'comma', 'comma wins');
  assert.deepEqual(r.header, ['a;b;c', 'd'], 'header');
});

test('16 unterminated quote does not throw and flags the record', () => {
  const r = parseCsv('a,b\n"open,1\n', parser);
  assert.equal(r.info.unterminatedQuote, true, 'flags unterminated');
  assert.deepEqual(r.header, ['a', 'b'], 'header is the first record');
});

test('17 empty text yields empty output', () => {
  const r = parseCsv('', parser);
  assert.deepEqual(r.header, [], 'header');
  assert.deepEqual(r.rows, [], 'rows');
  assert.equal(r.info.unterminatedQuote, false, 'not unterminated');
});

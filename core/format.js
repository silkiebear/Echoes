// Number formatting in the browser's locale (SPEC 15). Missing values print "n/a".
import { viewSettings } from '../config/views.js';

const cache = new Map();

function formatter(digits, options) {
  const key = `${digits}|${options}`;
  if (!cache.has(key)) {
    cache.set(key, new Intl.NumberFormat(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      ...(options === 'percent' ? { style: 'percent' } : {}),
    }));
  }
  return cache.get(key);
}

function isNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

export function formatNumber(n, digits = 0) {
  return isNumber(n) ? formatter(digits, 'plain').format(n) : 'n/a';
}

export function formatRatio(rr) {
  return formatNumber(rr, viewSettings.format.ratioDigits);
}

// Input is a fraction (0.25 prints as 25%).
export function formatPercent(p) {
  return isNumber(p) ? formatter(viewSettings.format.percentDigits, 'percent').format(p) : 'n/a';
}

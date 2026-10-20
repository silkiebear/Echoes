// One style per T4 series. The legend key, the line and its markers take their colour, marker shape and classes from
// seriesStyle(k) alone, so they cannot disagree. The index wraps modulo seriesPalette.count, so a ninth series reuses
// the first colour instead of getting an undefined class.
import { seriesPalette } from '../config/palette.js';

export function seriesStyle(k) {
  if (!Number.isInteger(k)) throw new TypeError('seriesStyle: the series index must be an integer');
  const count = seriesPalette.count;
  const i = ((k % count) + count) % count;
  const n = i + 1;
  return { colourVar: `--series-${n}`, marker: seriesPalette.markers[i], cls: `s-${n}`, fillCls: `sf-${n}` };
}

// Marker of one series centred on (cx, cy). extra is attribute text with a leading space (for example data-mark).
export function seriesMarkerSvg(style, cx, cy, extra = '') {
  const r = seriesPalette.markerRadius;
  const open = `style="fill:none;stroke-width:${seriesPalette.markerStroke}px"`;
  const fill = `class="${style.fillCls}"`;
  switch (style.marker) {
    case 'circle':
      return `<circle ${fill} cx="${cx}" cy="${cy}" r="${r}"${extra}/>`;
    case 'square':
      return `<rect ${fill} x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}"${extra}/>`;
    case 'triangle-up':
      return `<polygon ${fill} points="${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}"${extra}/>`;
    case 'diamond':
      return `<polygon ${fill} points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}"${extra}/>`;
    case 'triangle-down':
      return `<polygon ${fill} points="${cx - r},${cy - r} ${cx + r},${cy - r} ${cx},${cy + r}"${extra}/>`;
    case 'plus':
      return `<path class="${style.cls}" ${open} d="M${cx - r},${cy} L${cx + r},${cy} M${cx},${cy - r} L${cx},${cy + r}"${extra}/>`;
    case 'cross':
      return `<path class="${style.cls}" ${open} d="M${cx - r},${cy - r} L${cx + r},${cy + r} M${cx + r},${cy - r} L${cx - r},${cy + r}"${extra}/>`;
    case 'ring':
      return `<circle class="${style.cls}" ${open} cx="${cx}" cy="${cy}" r="${r}"${extra}/>`;
    default:
      throw new TypeError(`seriesMarkerSvg: unknown marker ${style.marker}`);
  }
}

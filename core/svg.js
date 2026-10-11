// SVG strings for views. No xmlns attribute: mountSvg parses the markup through a template,
// so the HTML parser assigns the SVG namespace. Text from data must go through esc().
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

export function svgDoc({ width, height, title, desc, body }) {
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">`
    + `<title>${esc(title)}</title><desc>${esc(desc)}</desc>${body}</svg>`;
}

// Text element; the value is escaped here, so callers cannot forget it.
export function svgText(x, y, value, cls, anchor = 'start') {
  return `<text x="${x}" y="${y}" dy="0.35em" class="${cls}" text-anchor="${anchor}">${esc(value)}</text>`;
}

export function mountSvg(container, svgString) {
  const template = document.createElement('template');
  template.innerHTML = svgString;
  container.replaceChildren(template.content);
}

// Sets the CSS width to the viewBox width (or minWidth if larger) so wide charts scroll inside their container.
export function sizeSvg(svg, minWidth) {
  const width = Number(svg.getAttribute('viewBox').split(/\s+/)[2]);
  svg.style.width = `${Math.max(width, minWidth)}px`;
}

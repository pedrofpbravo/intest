// Pure inline-SVG chart builders: no DOM APIs, no libraries. Each function
// returns an <svg> string sized by viewBox; the page scales it via CSS.
// Colors come from CSS custom properties so the charts follow the theme.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

const fmtVal = (v) => (Number.isInteger(v) ? String(v) : String(v).replace(".", ","));

// Bar chart of {label, value} bars, value printed above each bar when > 0.
// showLabels: "ends" prints only first/last x labels, "all" prints every one.
export function barChart(bars, { showLabels = "all", color = "var(--brand)" } = {}) {
  const W = 340;
  const H = 150;
  const PAD = { top: 16, right: 8, bottom: 20, left: 8 };
  if (!bars || bars.length === 0) return "";

  const max = Math.max(1, ...bars.map((b) => b.value));
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const step = iw / bars.length;
  const bw = Math.min(28, step * 0.62);

  const parts = bars.map((b, i) => {
    const cx = PAD.left + step * i + step / 2;
    const h = (b.value / max) * ih;
    const yTop = PAD.top + ih - h;
    const bar = `<rect x="${(cx - bw / 2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, b.value > 0 ? 2 : 0).toFixed(1)}" rx="3" fill="${b.color || color}"/>`;
    const val =
      b.value > 0
        ? `<text x="${cx.toFixed(1)}" y="${(yTop - 4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--muted)">${fmtVal(b.value)}</text>`
        : "";
    const showLabel = showLabels === "all" || i === 0 || i === bars.length - 1;
    const label = showLabel
      ? `<text x="${cx.toFixed(1)}" y="${H - 5}" text-anchor="middle" font-size="9" fill="var(--muted)">${esc(b.label)}</text>`
      : "";
    return bar + val + label;
  });

  const base = PAD.top + ih;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">
    <line x1="${PAD.left}" y1="${base}" x2="${W - PAD.right}" y2="${base}" stroke="var(--line)"/>
    ${parts.join("")}
  </svg>`;
}

// Line chart of {at, kg} points already sorted oldest to newest.
export function lineChart(points) {
  if (!points || points.length === 0) return "";
  const W = 340;
  const H = 170;
  const PAD = { top: 14, right: 12, bottom: 24, left: 42 };
  const values = points.map((p) => Number(p.kg));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (kg) => max === min ? PAD.top + ih / 2 : PAD.top + ((max - kg) / range) * ih;
  const kgLabel = (kg) => `${fmtVal(Math.round(kg * 100) / 100)} kg`;
  const dateLabel = (at) => `${at.slice(8, 10)}/${at.slice(5, 7)}`;

  const grid = [0, 0.5, 1]
    .map((ratio) => {
      const gy = PAD.top + ratio * ih;
      return `<line x1="${PAD.left}" y1="${gy.toFixed(1)}" x2="${W - PAD.right}" y2="${gy.toFixed(1)}" stroke="var(--line)"/>`;
    })
    .join("");
  const coords = points.map((p, i) => `${x(i).toFixed(1)},${y(Number(p.kg)).toFixed(1)}`);
  const line = points.length > 1
    ? `<polyline points="${coords.join(" ")}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
    : "";
  const dots = coords
    .map((xy) => {
      const [cx, cy] = xy.split(",");
      return `<circle cx="${cx}" cy="${cy}" r="3.5" fill="var(--accent)"/>`;
    })
    .join("");
  const last = points.length - 1;

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">
    ${grid}
    <text x="${PAD.left - 6}" y="${PAD.top + 3}" text-anchor="end" font-size="9" fill="var(--muted)">${esc(kgLabel(max))}</text>
    <text x="${PAD.left - 6}" y="${PAD.top + ih + 3}" text-anchor="end" font-size="9" fill="var(--muted)">${esc(kgLabel(min))}</text>
    ${line}${dots}
    <text x="${PAD.left}" y="${H - 5}" text-anchor="start" font-size="9" fill="var(--muted)">${esc(dateLabel(points[0].at))}</text>
    <text x="${W - PAD.right}" y="${H - 5}" text-anchor="end" font-size="9" fill="var(--muted)">${esc(dateLabel(points[last].at))}</text>
  </svg>`;
}

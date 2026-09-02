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

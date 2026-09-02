// Pure helpers: no DOM, no Firebase. Date handling, Bristol stats and
// sorting. Everything here is testable in isolation.

// ---------- dates (always LOCAL, never toISOString: UTC would shift the
// date in Brazil from 21:00 onwards) ----------

const pad = (n) => String(n).padStart(2, "0");

export function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Value for <input type="datetime-local">: "YYYY-MM-DDTHH:mm" local.
export function nowLocalStr(d = new Date()) {
  return `${todayStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateFromStr(dateStr) {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDate(dateStr) {
  const d = dateFromStr(dateStr);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

// "2026-08-30T14:23" -> "30/08 14:23"
export function fmtDateTime(atStr) {
  return `${fmtDate(atStr)} ${atStr.slice(11, 16)}`;
}

// Monday of the week containing dateStr, as a date string (BR weeks).
export function weekStartStr(dateStr) {
  const d = dateFromStr(dateStr);
  const dow = (d.getDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setDate(d.getDate() - dow);
  return todayStr(d);
}

export function addDaysStr(dateStr, days) {
  const d = dateFromStr(dateStr);
  d.setDate(d.getDate() + days);
  return todayStr(d);
}

// ---------- Bristol ----------

export const BRISTOL_LABELS = {
  1: "Bolinhas duras",
  2: "Grumoso e firme",
  3: "Salsicha com fissuras",
  4: "Liso e macio",
  5: "Pedaços macios",
  6: "Pastoso",
  7: "Líquido",
};

// 1-2 constipated (warn), 3-4 normal (ok), 5-7 loose (bad).
export function bristolClass(n) {
  if (n <= 2) return "warn";
  if (n <= 4) return "ok";
  return "bad";
}

// {week, perDay, avg4w, dist:[7]} for the stats card.
export function bristolStats(events, today) {
  const thisWeek = weekStartStr(today);
  const fourWeeksAgo = addDaysStr(thisWeek, -21);
  let week = 0;
  let last4 = 0;
  const dist = [0, 0, 0, 0, 0, 0, 0];
  for (const e of events) {
    const date = (e.at || "").slice(0, 10);
    if (!date) continue;
    const ws = weekStartStr(date);
    if (ws === thisWeek) week++;
    if (ws >= fourWeeksAgo) last4++;
    const b = Number(e.bristol);
    if (b >= 1 && b <= 7) dist[b - 1]++;
  }
  const dow = (dateFromStr(today).getDay() + 6) % 7; // days elapsed this week
  return {
    week,
    perDay: week / (dow + 1),
    avg4w: last4 / 4,
    dist,
  };
}

// ---------- sorting ----------

export const sortEvents = (list) =>
  [...list].sort((a, b) => (a.at < b.at ? 1 : -1));

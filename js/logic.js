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

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

// "2026-11-01T07:50" -> "01/11 dom 07:50"
export function fmtDateTime(atStr) {
  const wd = WEEKDAYS[dateFromStr(atStr).getDay()];
  return `${fmtDate(atStr)} ${wd} ${atStr.slice(11, 16)}`;
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

export function parseKg(str) {
  const value = Number(String(str).trim().replace(",", "."));
  if (!Number.isFinite(value) || value < 20 || value > 400) return null;
  return Math.round(value * 100) / 100;
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

// The chart window is fixed (no paging); empty periods stay in the result so
// gaps render as zero bars instead of disappearing.
export function frequencyBuckets(events, granularity, today = todayStr()) {
  const dates = events
    .map((e) => (e.at || "").slice(0, 10))
    .filter(Boolean);
  let bars;

  if (granularity === "week") {
    const currentWeek = weekStartStr(today);
    const firstWeek = addDaysStr(currentWeek, -77);
    bars = Array.from({ length: 12 }, (_, i) => {
      const key = addDaysStr(firstWeek, i * 7);
      return { key, label: `${key.slice(8, 10)}/${key.slice(5, 7)}`, value: 0 };
    });
  } else if (granularity === "month") {
    const monthLabels = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const currentYear = Number(today.slice(0, 4));
    const currentMonth = Number(today.slice(5, 7)) - 1;
    bars = Array.from({ length: 12 }, (_, i) => {
      const monthIndex = currentYear * 12 + currentMonth - 11 + i;
      const year = Math.floor(monthIndex / 12);
      const month = monthIndex % 12;
      return {
        key: `${year}-${pad(month + 1)}`,
        label: monthLabels[month],
        value: 0,
      };
    });
  } else {
    const currentYear = Number(today.slice(0, 4));
    const firstYear = dates.reduce(
      (earliest, date) => Math.min(earliest, Number(date.slice(0, 4))),
      currentYear
    );
    bars = Array.from({ length: currentYear - firstYear + 1 }, (_, i) => {
      const key = String(firstYear + i);
      return { key, label: key, value: 0 };
    });
  }

  const byKey = new Map(bars.map((bar) => [bar.key, bar]));
  dates.forEach((date) => {
    const key = granularity === "week"
      ? weekStartStr(date)
      : granularity === "month"
        ? date.slice(0, 7)
        : date.slice(0, 4);
    const bar = byKey.get(key);
    if (bar) bar.value++;
  });
  return bars;
}

// ---------- sorting ----------

const byAtDesc = (a, b) => (a.at === b.at ? 0 : a.at < b.at ? 1 : -1);

export const sortEvents = (list) => [...list].sort(byAtDesc);
export const sortWeights = (list) => [...list].sort(byAtDesc);

// In-memory stand-in for db.js, used when the page is opened with #debug
// (same trick as Treino/MercadoJa): lets every screen and flow be exercised
// locally with sample data, no Firebase needed. Ships two weeks of
// generated events so the stats and the Bristol chart render meaningfully.

import { todayStr, addDaysStr, nowLocalStr } from "./logic.js";

const ts = (ms = Date.now()) => ({ toMillis: () => ms });
let nextId = 1;
const id = (p) => `${p}-${nextId++}`;

// Small deterministic LCG so the sample data is stable across reloads.
let rngState = 42;
function rng() {
  rngState = (rngState * 1103515245 + 12345) % 2147483648;
  return rngState / 2147483648;
}

const store = { events: [] };

(function generateEvents() {
  const now = nowLocalStr();
  const today = todayStr();
  for (let back = 14; back >= 1; back--) {
    const date = addDaysStr(today, -back);
    const n = rng() < 0.72 ? 1 : rng() < 0.5 ? 2 : 0;
    for (let i = 0; i < n; i++) {
      const hour = 7 + Math.floor(rng() * 14);
      const at = `${date}T${String(hour).padStart(2, "0")}:${String(Math.floor(rng() * 60)).padStart(2, "0")}`;
      if (at > now) continue;
      const roll = rng();
      const bristol = roll < 0.08 ? 2 : roll < 0.35 ? 3 : roll < 0.8 ? 4 : roll < 0.93 ? 5 : 6;
      store.events.push({
        id: id("ev"),
        at,
        bristol,
        note: rng() < 0.2 ? "depois do café" : "",
        createdAt: ts(),
        updatedAt: ts(),
      });
    }
  }
})();

// ---------- listener plumbing (same contract as db.js) ----------

const listeners = [];
const emit = () => listeners.forEach((cb) => cb(store.events.map((x) => ({ ...x }))));

export const isConfigured = () => true;
export const init = () => {};
export const watchAuth = (cb) => cb({ uid: "debug" });
export const login = async () => {};
export const logout = async () => location.reload();

export function listenEvents(cb) {
  listeners.push(cb);
  cb(store.events.map((x) => ({ ...x })));
}

export async function createEvent({ at, bristol, note }) {
  store.events.push({ id: id("ev"), at, bristol, note: note || "", createdAt: ts(), updatedAt: ts() });
  emit();
}

export async function updateEvent(eid, { at, bristol, note }) {
  Object.assign(store.events.find((e) => e.id === eid), { at, bristol, note: note || "", updatedAt: ts() });
  emit();
}

export async function deleteEvent(eid) {
  store.events = store.events.filter((e) => e.id !== eid);
  emit();
}

export async function importEvents(events) {
  events.forEach((e) => {
    const item = {
      id: e.id,
      at: e.at,
      bristol: Number(e.bristol) || 4,
      note: e.note || "",
      createdAt: ts(),
      updatedAt: ts(),
    };
    const cur = store.events.find((x) => x.id === item.id);
    if (cur) Object.assign(cur, item);
    else store.events.push(item);
  });
  emit();
}

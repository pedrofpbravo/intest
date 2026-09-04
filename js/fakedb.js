// In-memory stand-in for db.js, used when the page is opened with #debug
// (same trick as Treino/MercadoJa): lets every screen and flow be exercised
// locally with sample data, no Firebase needed. Ships two weeks of events
// and eight weeks of weights so both charts render meaningfully.

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

const store = { events: [], weights: [] };

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

(function generateWeights() {
  const today = todayStr();
  for (let back = 56; back >= 0; back--) {
    if (rng() < 0.18) continue;
    const progress = (56 - back) / 56;
    const kg = Math.round((93 - progress * 7 + (rng() - 0.5) * 0.8) * 10) / 10;
    store.weights.push({
      id: id("wt"),
      at: `${addDaysStr(today, -back)}T08:00`,
      kg,
      createdAt: ts(),
      updatedAt: ts(),
    });
  }
})();

// ---------- listener plumbing (same contract as db.js) ----------

const eventListeners = [];
const weightListeners = [];
const emitEvents = () => eventListeners.forEach((cb) => cb(store.events.map((x) => ({ ...x }))));
const emitWeights = () => weightListeners.forEach((cb) => cb(store.weights.map((x) => ({ ...x }))));

export const isConfigured = () => true;
export const init = () => {};
export const watchAuth = (cb) => cb({ uid: "debug" });
export const login = async () => {};
export const logout = async () => location.reload();

export function listenEvents(cb) {
  eventListeners.push(cb);
  cb(store.events.map((x) => ({ ...x })));
}

export async function createEvent({ at, bristol, note }) {
  store.events.push({ id: id("ev"), at, bristol, note: note || "", createdAt: ts(), updatedAt: ts() });
  emitEvents();
}

export async function updateEvent(eid, { at, bristol, note }) {
  Object.assign(store.events.find((e) => e.id === eid), { at, bristol, note: note || "", updatedAt: ts() });
  emitEvents();
}

export async function deleteEvent(eid) {
  store.events = store.events.filter((e) => e.id !== eid);
  emitEvents();
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
  emitEvents();
}

export function listenWeights(cb) {
  weightListeners.push(cb);
  cb(store.weights.map((x) => ({ ...x })));
}

export async function createWeight({ at, kg }) {
  store.weights.push({ id: id("wt"), at, kg, createdAt: ts(), updatedAt: ts() });
  emitWeights();
}

export async function updateWeight(wid, { at, kg }) {
  Object.assign(store.weights.find((weight) => weight.id === wid), { at, kg, updatedAt: ts() });
  emitWeights();
}

export async function deleteWeight(wid) {
  store.weights = store.weights.filter((weight) => weight.id !== wid);
  emitWeights();
}

export async function importWeights(weights) {
  weights.forEach((weight) => {
    const item = {
      id: weight.id,
      at: weight.at,
      kg: Number(weight.kg),
      createdAt: ts(),
      updatedAt: ts(),
    };
    const cur = store.weights.find((x) => x.id === item.id);
    if (cur) Object.assign(cur, item);
    else store.weights.push(item);
  });
  emitWeights();
}

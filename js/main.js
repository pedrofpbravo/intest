// Intest: UI layer. Same architecture as Treino/MercadoJa: one main module,
// direct DOM, optimistic writes through db.js. Firestore's local cache gives
// latency compensation: every write below fires the onSnapshot immediately,
// so the UI re-renders from a single source of truth and still feels
// instant (and works offline).

// Open the app with #debug to preview every screen and flow with sample
// in-memory sample data, no Firebase needed.
import * as realDb from "./db.js";
import * as fakeDb from "./fakedb.js";
const db = location.hash === "#debug" ? fakeDb : realDb;
import {
  todayStr,
  nowLocalStr,
  fmtDateTime,
  BRISTOL_LABELS,
  bristolClass,
  bristolStats,
  frequencyBuckets,
  parseKg,
  sortEvents,
  sortWeights,
} from "./logic.js";
import { barChart, lineChart } from "./charts.js";

// Shown in the menu so anyone can tell which deploy a phone is running.
// Keep in sync with CACHE in sw.js.
const APP_VERSION = "v3";

const $ = (id) => document.getElementById(id);

// ---------- state ----------

// Touching localStorage throws outright when Safari refuses storage (private
// mode, blocked cookies). This runs at module load, so an unguarded read would
// keep the whole app from booting on the phone.
function savedFreqRange() {
  try {
    const saved = localStorage.getItem("intest.freq");
    return ["week", "month", "year"].includes(saved) ? saved : "week";
  } catch {
    return "week";
  }
}

const state = {
  events: [], // raw; sorted at render time
  weights: [],
  view: "events",
  freqRange: savedFreqRange(),
  editingId: null,
  editingWeightId: null,
  draftBristol: null,
  listenersStarted: false,
};

// ---------- tiny UI helpers ----------

let toastTimer = null;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

function openSheet(id) {
  $("sheet-backdrop").hidden = false;
  $(id).hidden = false;
}

function closeSheets() {
  $("sheet-backdrop").hidden = true;
  document.querySelectorAll(".sheet").forEach((s) => (s.hidden = true));
}

// ---------- main screen ----------

function renderEvents() {
  const stats = bristolStats(state.events, todayStr());
  const statsEl = $("stats");
  statsEl.innerHTML = "";
  [
    [String(stats.week), "esta semana"],
    [stats.perDay.toFixed(1).replace(".", ","), "por dia"],
    [stats.avg4w.toFixed(1).replace(".", ","), "por sem (4 sem)"],
  ].forEach(([big, label]) => {
    const div = document.createElement("div");
    div.className = "stat";
    const b = document.createElement("b");
    b.textContent = big;
    const span = document.createElement("span");
    span.textContent = label;
    div.append(b, span);
    statsEl.appendChild(div);
  });

  const colors = { ok: "var(--ok)", warn: "var(--warn)", bad: "var(--bad)" };
  $("dist-chart").innerHTML = barChart(
    stats.dist.map((count, i) => ({
      label: String(i + 1),
      value: count,
      color: colors[bristolClass(i + 1)],
    }))
  );
  renderFrequency();

  const listEl = $("events-list");
  listEl.innerHTML = "";
  const events = sortEvents(state.events);
  if (events.length > 0) {
    const ul = document.createElement("ul");
    ul.className = "group-items";
    events.forEach((ev) => {
      const li = document.createElement("li");
      li.className = "item-row";

      const badge = document.createElement("span");
      badge.className = `badge-pill ${bristolClass(ev.bristol)}`;
      badge.textContent = ev.bristol;

      const main = document.createElement("div");
      main.className = "item-main";
      const name = document.createElement("span");
      name.className = "item-name";
      name.textContent = `${fmtDateTime(ev.at)} · ${BRISTOL_LABELS[ev.bristol] || ""}`;
      main.appendChild(name);
      if (ev.note) {
        const sub = document.createElement("span");
        sub.className = "item-sub";
        sub.textContent = ev.note;
        main.appendChild(sub);
      }

      li.append(badge, main);
      li.addEventListener("click", () => openEventSheet(ev.id));
      ul.appendChild(li);
    });
    listEl.appendChild(ul);
  }
  $("events-empty").hidden = events.length > 0;
}

function renderFrequency() {
  const bars = frequencyBuckets(state.events, state.freqRange, todayStr());
  $("freq-chart").innerHTML = barChart(bars, {
    color: "var(--accent)",
    labelEvery: state.freqRange === "week" ? 2 : 1,
  });
  const total = bars.reduce((sum, bar) => sum + bar.value, 0);
  const rangeLabel = {
    week: "Últimas 12 semanas",
    month: "Últimos 12 meses",
    year: "Por ano",
  }[state.freqRange];
  $("freq-summary").textContent = `${rangeLabel} · ${total} ${total === 1 ? "registro" : "registros"}`;
  $("freq-range").querySelectorAll(".seg-btn").forEach((button) => {
    const active = button.dataset.range === state.freqRange;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

const fmtKg = (kg) => String(Number(kg)).replace(".", ",");

function renderWeights() {
  const weights = sortWeights(state.weights);
  $("weight-chart").innerHTML = lineChart([...weights].reverse());

  const listEl = $("weights-list");
  listEl.innerHTML = "";
  if (weights.length > 0) {
    const ul = document.createElement("ul");
    ul.className = "group-items";
    weights.forEach((weight, i) => {
      const li = document.createElement("li");
      li.className = "item-row";

      const badge = document.createElement("span");
      badge.className = "badge-pill wide ok";
      badge.textContent = fmtKg(weight.kg);

      const main = document.createElement("div");
      main.className = "item-main";
      const name = document.createElement("span");
      name.className = "item-name";
      name.textContent = fmtDateTime(weight.at);
      main.appendChild(name);

      const older = weights[i + 1];
      if (older) {
        const delta = Math.round((Number(weight.kg) - Number(older.kg)) * 100) / 100;
        const sub = document.createElement("span");
        sub.className = "item-sub";
        sub.textContent = `${delta >= 0 ? "+" : ""}${fmtKg(delta)} kg`;
        main.appendChild(sub);
      }

      li.append(badge, main);
      li.addEventListener("click", () => openWeightSheet(weight.id));
      ul.appendChild(li);
    });
    listEl.appendChild(ul);
  }
  $("weights-empty").hidden = weights.length > 0;
}

function render() {
  renderEvents();
  renderWeights();
}

function setView(view) {
  state.view = view;
  const eventsOn = view === "events";
  $("view-events").hidden = !eventsOn;
  $("view-weight").hidden = eventsOn;
  $("tab-events").classList.toggle("active", eventsOn);
  $("tab-events").setAttribute("aria-selected", String(eventsOn));
  $("tab-weight").classList.toggle("active", !eventsOn);
  $("tab-weight").setAttribute("aria-selected", String(!eventsOn));
  $("fab-new").setAttribute("aria-label", eventsOn ? "Novo registro" : "Novo peso");
}

// ---------- event sheet (new / edit) ----------

function renderBristolGrid() {
  const grid = $("bristol-grid");
  grid.innerHTML = "";
  for (let n = 1; n <= 7; n++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `bristol-btn ${bristolClass(n)}` + (state.draftBristol === n ? " on" : "");
    btn.textContent = n;
    btn.addEventListener("click", () => {
      state.draftBristol = n;
      renderBristolGrid();
    });
    grid.appendChild(btn);
  }
  $("bristol-label").textContent = state.draftBristol
    ? `${state.draftBristol} · ${BRISTOL_LABELS[state.draftBristol]}`
    : "Toque para escolher.";
}

function openEventSheet(eventId) {
  state.editingId = eventId || null;
  const ev = eventId ? state.events.find((e) => e.id === eventId) : null;
  $("sheet-event-title").textContent = ev ? "Editar registro" : "Novo registro";
  $("event-at").value = ev ? ev.at : nowLocalStr();
  state.draftBristol = ev ? ev.bristol : 4;
  renderBristolGrid();
  $("event-note").value = ev?.note || "";
  $("event-error").hidden = true;
  $("btn-event-delete").hidden = !ev;
  openSheet("sheet-event");
}

function submitEventForm(e) {
  e.preventDefault();
  const at = $("event-at").value;
  const errEl = $("event-error");
  if (!at || !state.draftBristol) {
    errEl.textContent = "Preencha a data/hora e escolha o nível na escala.";
    errEl.hidden = false;
    return;
  }
  const data = { at, bristol: state.draftBristol, note: $("event-note").value.trim() };
  const op = state.editingId
    ? db.updateEvent(state.editingId, data)
    : db.createEvent(data);
  op.catch(() => toast("Erro ao salvar registro."));
  closeSheets();
}

// ---------- weight sheet (new / edit) ----------

function openWeightSheet(weightId) {
  state.editingWeightId = weightId || null;
  const weight = weightId ? state.weights.find((item) => item.id === weightId) : null;
  $("sheet-weight-title").textContent = weight ? "Editar peso" : "Novo peso";
  $("weight-at").value = weight ? weight.at : nowLocalStr();
  $("weight-kg").value = weight ? fmtKg(weight.kg) : "";
  $("weight-error").hidden = true;
  $("btn-weight-delete").hidden = !weight;
  openSheet("sheet-weight");
}

function submitWeightForm(e) {
  e.preventDefault();
  const at = $("weight-at").value;
  const kg = parseKg($("weight-kg").value);
  const errEl = $("weight-error");
  if (!at || kg === null) {
    errEl.textContent = "Informe um peso válido.";
    errEl.hidden = false;
    return;
  }
  const data = { at, kg };
  const op = state.editingWeightId
    ? db.updateWeight(state.editingWeightId, data)
    : db.createWeight(data);
  op.catch(() => toast("Erro ao salvar peso."));
  closeSheets();
}

// ---------- backup ----------

function buildBackup() {
  return {
    app: "Intest",
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    events: sortEvents(state.events).map((e) => ({
      id: e.id,
      at: e.at,
      bristol: e.bristol,
      note: e.note || "",
    })),
    weights: sortWeights(state.weights).map((weight) => ({
      id: weight.id,
      at: weight.at,
      kg: weight.kg,
    })),
  };
}

async function exportBackup() {
  const data = buildBackup();
  const json = JSON.stringify(data, null, 2);
  const filename = `intest-backup-${data.exportedAt.slice(0, 10)}.json`;

  // iOS standalone: the share sheet ("Salvar em Arquivos") is the reliable
  // path; plain downloads are flaky there. Elsewhere, a regular download.
  const file = new File([json], filename, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (ex) {
      if (ex.name === "AbortError") return; // user closed the sheet
      // fall through to download
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  toast("Backup exportado.");
}

// Accepts three shapes: the Treino backup ({bathroom: [...]}), the Intest
// backup ({events: [...], weights: [...]}) or a bare array. Ids are preserved
// (import twice = overwrite, not duplicate); missing ids are deterministic.
function normalizeBackup(data) {
  const rawEvents = Array.isArray(data)
    ? data
    : Array.isArray(data?.events)
      ? data.events
      : Array.isArray(data?.bathroom)
        ? data.bathroom
        : null;
  if (!rawEvents) return null;
  const events = rawEvents
    .filter((e) => e && typeof e.at === "string" && e.at.length >= 16)
    .map((e) => ({
      id: e.id || `imp-${e.at.replace(/[T:]/g, "-")}`,
      at: e.at,
      bristol: Number(e.bristol) || 4,
      note: e.note || "",
    }));
  const rawWeights = !Array.isArray(data) && Array.isArray(data?.events) && Array.isArray(data?.weights)
    ? data.weights
    : [];
  const weights = rawWeights
    .filter((weight) =>
      weight &&
      typeof weight.at === "string" &&
      weight.at.length >= 16 &&
      Number.isFinite(Number(weight.kg))
    )
    .map((weight) => ({
      id: weight.id || `wimp-${weight.at.replace(/[T:]/g, "-")}`,
      at: weight.at,
      kg: Number(weight.kg),
    }));
  return { events, weights };
}

function importBackupFile(file) {
  file
    .text()
    .then((text) => {
      const backup = normalizeBackup(JSON.parse(text));
      if (!backup) throw new Error("formato");
      const { events, weights } = backup;
      if (events.length === 0 && weights.length === 0) {
        toast("O arquivo não tem registros nem pesos.");
        return;
      }
      if (
        !confirm(
          `Importar ${events.length} registros e ${weights.length} pesos?\nDocs atuais com o mesmo id serão sobrescritos; nada é apagado.`
        )
      ) {
        return;
      }
      Promise.all([
        events.length ? db.importEvents(events) : Promise.resolve(),
        weights.length ? db.importWeights(weights) : Promise.resolve(),
      ])
        .then(() => toast(`${events.length} registros e ${weights.length} pesos importados.`))
        .catch(() => toast("Erro ao importar o backup."));
    })
    .catch(() => toast("Arquivo de backup inválido."));
}

// ---------- auth + boot ----------

function showLogin() {
  $("screen-login").hidden = false;
  $("app-shell").hidden = true;
}

function showApp() {
  $("screen-login").hidden = true;
  $("app-shell").hidden = false;
  startListeners();
}

function startListeners() {
  if (state.listenersStarted) return;
  state.listenersStarted = true;
  db.listenEvents(
    (events) => {
      state.events = events;
      render();
    },
    () => toast("Erro de conexão com o banco.")
  );
  db.listenWeights(
    (weights) => {
      state.weights = weights;
      render();
    },
    () => toast("Erro de conexão com o banco.")
  );
}

const LOGIN_ERRORS = {
  "auth/invalid-email": "E-mail inválido.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco.",
  "auth/network-request-failed": "Sem conexão. Tente novamente.",
};

async function handleLogin(e) {
  e.preventDefault();
  const btn = $("btn-login");
  const errEl = $("login-error");
  errEl.hidden = true;
  btn.disabled = true;
  btn.textContent = "Entrando…";
  try {
    await db.login($("login-email").value.trim(), $("login-password").value);
    // watchAuth flips the screens.
  } catch (ex) {
    errEl.textContent = LOGIN_ERRORS[ex.code] || "Não foi possível entrar. Tente novamente.";
    errEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
}

// ---------- offline indicator ----------

function updateOnline() {
  $("offline-banner").hidden = navigator.onLine;
}

// ---------- wiring ----------

function wire() {
  // login
  $("login-form").addEventListener("submit", handleLogin);

  // events
  $("fab-new").addEventListener("click", () => {
    if (state.view === "events") openEventSheet(null);
    else openWeightSheet(null);
  });
  $("tab-events").addEventListener("click", () => setView("events"));
  $("tab-weight").addEventListener("click", () => setView("weight"));
  $("freq-range").addEventListener("click", (e) => {
    const button = e.target.closest(".seg-btn");
    const range = button?.dataset.range;
    if (!["week", "month", "year"].includes(range)) return;
    state.freqRange = range;
    try {
      localStorage.setItem("intest.freq", range);
    } catch {
      // The chart still works when Safari private mode refuses storage writes.
    }
    renderFrequency();
  });
  $("event-form").addEventListener("submit", submitEventForm);
  $("btn-event-delete").addEventListener("click", () => {
    const ev = state.events.find((e) => e.id === state.editingId);
    if (ev && confirm("Excluir este registro?")) {
      db.deleteEvent(ev.id).catch(() => toast("Erro ao excluir."));
      closeSheets();
    }
  });

  // weights
  $("weight-form").addEventListener("submit", submitWeightForm);
  $("btn-weight-delete").addEventListener("click", () => {
    const weight = state.weights.find((item) => item.id === state.editingWeightId);
    if (weight && confirm("Excluir este peso?")) {
      db.deleteWeight(weight.id).catch(() => toast("Erro ao excluir."));
      closeSheets();
    }
  });

  // menu
  $("btn-menu").addEventListener("click", () => openSheet("sheet-menu"));
  $("btn-export").addEventListener("click", exportBackup);
  $("btn-import").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) importBackupFile(file);
  });
  $("btn-logout").addEventListener("click", () => {
    if (confirm("Sair da conta neste aparelho?")) db.logout();
  });

  // sheets
  $("sheet-backdrop").addEventListener("click", closeSheets);
  document.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", closeSheets)
  );

  // offline indicator
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  updateOnline();
}

function boot() {
  wire();
  setView(state.view);
  $("app-version").textContent = `Intest · ${APP_VERSION}`;
  if (db === fakeDb) {
    // #debug test hooks
    window.__buildBackup = buildBackup;
    window.__state = state;
  }

  // iOS install hint (login screen only)
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  $("install-card").hidden = !!standalone;

  if (!db.isConfigured()) {
    showLogin();
    $("setup-warning").hidden = false;
    $("login-form").querySelectorAll("input, button").forEach((el) => (el.disabled = true));
    return;
  }

  db.init();
  db.watchAuth((user) => {
    if (user) showApp();
    // After a logout, reload so the next login (possibly another account)
    // starts with no listener bound to the previous uid.
    else if (state.listenersStarted) location.reload();
    else showLogin();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

boot();

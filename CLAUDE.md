# CLAUDE.md - "Intest" (bathroom log PWA)

Architecture notes for future sessions. This describes the app as it actually is.

# Orchestration Protocol — Fable leads, Codex executes

You (Claude/Fable) are the **orchestrator and tech lead** for this project. You do not implement tasks yourself unless explicitly told to. Your job is to plan, delegate, verify, and integrate.

## Roles

- **Fable (you):** decompose the request, design the solution structure, write delegation briefs, review and verify all work, own final quality.
- **Codex (via the `codex:codex-rescue` subagent from the Codex plugin):** executes scoped implementation tasks — writing scripts, generating files, fixing bugs.

## Workflow (follow in order)

1. **Plan first.** When I give you a task, produce a short plan: objective, deliverable(s), task breakdown, what you will delegate vs. keep. Ask me a boatload of questions to confirm scope and also refine it to be more specific. Wait for my approval before delegating.
2. **Delegate to Codex.** Hand each implementation task to Codex through the rescue subagent, preferably as a background job. Each delegation brief must be **self-contained** — Codex has none of our conversation context. Include: exact deliverable and file path, inputs/assumptions, structure required, acceptance criteria, and what NOT to do.
3. **Monitor.** Check job status and collect results when done.
4. **Verify — never trust, always check.** Open and inspect what Codex produced. Run it if it's code. Check outputs against the acceptance criteria.
5. **Fix or re-delegate.** Small issues: fix them yourself. Structural issues: send a corrected brief back to Codex (resume the same thread when possible).
6. **Close out.** Summarize: what was built, what Codex did, what you changed in review, and remaining risks/open items.

## Rules

- Never present Codex output as done without your own verification pass.
- One delegation = one clearly scoped task. Don't send Codex vague multi-part briefs.
- If a slash command (e.g. `/codex:rescue`) is unavailable in this environment, delegate via natural language to the `codex:codex-rescue` subagent instead.
- Keep a running `WORKLOG.md` in the repo: plan, delegations sent, results received, review findings, fixes.
- If Codex is unreachable (not installed / not logged in), stop and tell me — do not silently do the work yourself.
- Code: runs cleanly from a fresh shell; minimal dependencies; brief README or header comment.
- **Token economy — batch everything.** Ask ALL scope questions in one round up front (one message or one AskUserQuestion batch), never spread across the session. Verify each phase in ONE consolidated pass: a single browser script that runs every acceptance check together and returns one result, instead of many small probes. One status report per phase, not per step. Prefer one big call that returns everything over five small ones.

## What it is

Personal bathroom diary (Bristol scale 1-7) for TWO people, each with a private history. Split out of the Treino app (`04. app gym`) in Sep 2026; Pedro's pre-split history was migrated in via the backup import. Single-screen mobile PWA, UI in pt-BR, installed on iPhones from GitHub Pages.

Functionality: stats card (entries this week, per day, 4-week weekly average), Bristol distribution bar chart, frequency-over-time bar chart with a Semana/Mes/Ano segmented filter (last 12 weeks / last 12 months / all years, selection persisted in localStorage under `intest.freq`), event list (newest first), FAB opens the add sheet (datetime-local defaulting to now, Bristol 1-7 picker, optional note), tapping a list row opens the same sheet for edit/delete. A "⋯" menu sheet holds backup export/import and logout.

## Architecture (same family as Treino / MercadoJá)

- **Vanilla JS, no build step.** ES modules loaded directly by the browser; Firebase SDK 10.12.2 as ESM from the gstatic CDN. Do NOT introduce Vite/React/npm.
- **Firebase**: own project (separate from treino). Auth email/password with `browserLocalPersistence`, two users (Pedro + Thayza), sign-up disabled in the console. Firestore with `persistentLocalCache({tabManager: persistentMultipleTabManager()})` for full offline. Keys hardcoded in `js/config.js`; security lives in `firestore.rules`.
- **Per-user data**: everything lives under `users/{uid}/events`. Rules allow a user to touch only their own subtree. `db.js` resolves the collection from `auth.currentUser.uid` (`eventsCol()`); listeners start only after auth, so the uid is always set.
- **Reads**: one `onSnapshot` over the user's whole `events` subcollection, sorted client-side (`sortEvents` in logic.js). **Writes**: targeted `setDoc`/`updateDoc`/`deleteDoc` with `serverTimestamp()`, optimistic UI (the local cache fires the snapshot immediately).
- **Account switching**: after logout, `main.js` reloads the page so no listener bound to the previous uid survives into the next login.
- **`#debug`**: `main.js` swaps `db.js` for `fakedb.js` (`const db = location.hash === "#debug" ? fakeDb : realDb`). fakedb mirrors every export and generates two weeks of events, so the whole app works with zero Firebase.
- **No seeding**: a new user simply starts with an empty list.
- **SW** (`sw.js`): network-first, opportunistic cache (origin + gstatic), `cache: "no-cache"` revalidation. DEPLOY RITUAL: bump `CACHE` (sw.js) and `APP_VERSION` (main.js) on every deploy.
- Hosting: GitHub Pages from repo root (`pedrofpbravo/intest`), or `firebase deploy`.

## Files

- `js/config.js`: firebaseConfig only ("the only file you edit").
- `js/logic.js`: pure helpers (no DOM/Firebase): local date handling, BRISTOL_LABELS, bristolClass, bristolStats, frequencyBuckets, sortEvents.
- `js/charts.js`: pure SVG-string builders (barChart, lineChart). No chart libraries. `barChart`'s `labelEvery` thins a crowded x axis, counting back from the last bar so the newest period always keeps its label.
- `js/db.js`: the only file touching Firebase. Flat verb-named API: listenEvents, createEvent, updateEvent, deleteEvent, importEvents.
- `js/fakedb.js`: same exports, in-memory.
- `js/main.js`: all UI. State object + renderers + wiring + boot.
- `SETUP.md`: the one-time setup and migration guide (Firebase console, GitHub Pages, import).

## Data model (Firestore)

- `users/{uid}/events/{eventId}`: `{at: "YYYY-MM-DDTHH:mm" LOCAL string, bristol: 1-7 (number), note, createdAt, updatedAt}`. New events get auto ids; imported events keep their original id (Treino-era auto ids or `imp-<at>`).

## Key behaviors and decisions

- Dates are always LOCAL strings; `at` is the raw `<input type="datetime-local">` value and must never round-trip through `Date`/`toISOString` (UTC shifts the date in Brazil after 21:00).
- Backup export produces `{app: "Intest", version, exportedAt, events: [{id, at, bristol, note}]}` via the iOS share sheet (fallback: blob download).
- Backup import accepts three shapes: the Intest backup (`events`), the old Treino backup (`bathroom`), or a bare array. Ids are preserved, so re-importing overwrites instead of duplicating. Entries import under the SIGNED-IN user's uid.
- Bristol semantics: 1-2 warn (constipated), 3-4 ok, 5-7 bad (loose); colors come from `--ok/--warn/--bad` CSS vars.
- Theme: mint `#eef6f2` bg, dark green ink `#142521`, teal accent `#2a9d8f`, deep green buttons `#1c4f44`, pill buttons. Viewport locked (`maximum-scale=1` + `touch-action: manipulation`).
- UI text is pt-BR.

## Local dev

`python -m http.server 8090` (also in `.claude/launch.json`; 8085 and 8082 are taken/reserved on this machine), then http://localhost:8090/#debug. Debug hooks: `window.__state`, `window.__buildBackup`.

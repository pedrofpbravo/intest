# CLAUDE.md - "Intest" (bathroom log PWA)

Architecture notes for future sessions. This describes the app as it actually is.

## What it is

Personal bathroom diary (Bristol scale 1-7) for TWO people, each with a private history. Split out of the Treino app (`04. app gym`) in Sep 2026; Pedro's pre-split history was migrated in via the backup import. Single-screen mobile PWA, UI in pt-BR, installed on iPhones from GitHub Pages.

Functionality: stats card (entries this week, per day, 4-week weekly average), Bristol distribution bar chart, event list (newest first), FAB opens the add sheet (datetime-local defaulting to now, Bristol 1-7 picker, optional note), tapping a list row opens the same sheet for edit/delete. A "⋯" menu sheet holds backup export/import and logout.

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
- `js/logic.js`: pure helpers (no DOM/Firebase): local date handling, BRISTOL_LABELS, bristolClass, bristolStats, sortEvents.
- `js/charts.js`: pure SVG-string builder (barChart). No chart libraries.
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

`python -m http.server 8082` (also in `.claude/launch.json`), then http://localhost:8082/#debug. Debug hooks: `window.__state`, `window.__buildBackup`.

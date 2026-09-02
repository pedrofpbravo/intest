# Intest

Diário intestinal (escala de Bristol 1 a 7), para duas pessoas, cada uma com histórico privado.

One screen: stats (this week, per day, 4-week average), Bristol distribution chart, and the event list. The ＋ button logs an event with date/time (defaults to now, editable), Bristol level and an optional note; tap an entry to edit or delete it. The menu (⋯) has JSON backup export/import and logout.

Same architecture as Treino (`04. app gym`) and MercadoJá: no build step, plain JS modules, Firebase SDK from the CDN, one config file, installable iPhone PWA, works fully offline.

Each account sees only its own data: everything is stored under `users/{uid}/events` and the Firestore rules block cross-user access.

## Setup, hosting and migration

See [SETUP.md](SETUP.md) for the full step-by-step: Firebase project, the two accounts, rules, GitHub Pages, phone install, and importing the old history from the Treino backup.

## Deploying changes

1. Bump `CACHE` in `sw.js` and `APP_VERSION` in `js/main.js`.
2. Push. On the phone, force-close and reopen the app once.

## Local development

```bash
python -m http.server 8082
```

Open http://localhost:8082/#debug to preview every screen with in-memory sample data (two weeks of events), no Firebase keys needed.

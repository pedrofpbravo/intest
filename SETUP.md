# SETUP.md - Intest: one-time setup and migration

Step-by-step guide, written for a non-developer. Follow the phases in order. Steps marked **(you)** are done by you in a browser or on the phone; steps marked **(Claude)** are done in a Claude Code session.

Accounts:
- Account 1: Pedro, same e-mail you use to log into the Treino app. Receives the migrated history.
- Account 2: `thayzapromo@gmail.com`. Starts empty.

## Phase 0: export the Treino backup (you, FIRST, before anything else)

This file is both the migration source and the safety net. Do it while Treino still has the Banheiro tab (version v4).

1. Open the Treino app on your phone.
2. Ajustes > **Exportar backup** > save the JSON file (Salvar em Arquivos, or share it to Drive/e-mail).
3. Keep this file somewhere you can reach from the phone later. Do not delete it, ever; it is the permanent archive.

## Phase 1: build the app (Claude, done)

The app lives in this folder. Until Phase 2 fills `js/config.js`, the login screen shows "Configuração pendente"; the `#debug` mode works regardless.

## Phase 2: Firebase project (you, ~10 min)

1. Go to console.firebase.google.com > **Add project** > name it `intest` > disable Google Analytics > Create.
2. **Register the web app**: Project Overview > web icon (`</>`) > nickname `intest` (no hosting needed) > Register. Copy the whole `firebaseConfig = { ... }` block that appears and paste it to Claude (it goes into `js/config.js`). You can also paste the values yourself into `js/config.js`, replacing the PASTE_ placeholders.
3. **Authentication**: Build > Authentication > Get started > enable **Email/Password** > Save. Then in the **Users** tab, click **Add user** twice:
   - your e-mail (the same one you use in Treino) + a password
   - `thayzapromo@gmail.com` + a password
4. **Disable sign-up** (important): Authentication > Settings > User actions > uncheck "Enable create (sign-up)" > Save. Without this, anyone with the public key could create an account.
5. **Firestore**: Build > Firestore Database > Create database > region `southamerica-east1` (São Paulo) > **production mode** > Create.
6. **Rules**: Firestore > Rules tab > replace everything with the contents of `firestore.rules` from this folder > **Publish**.

## Phase 3: GitHub + phones (you create the repo, Claude pushes)

1. **(you)** Go to github.com > New repository > name `intest` > **Public** > do NOT add README/gitignore > Create repository.
2. **(Claude)** Commits this folder and pushes to `https://github.com/pedrofpbravo/intest.git`.
3. **(you)** In the repo: Settings > Pages > Deploy from a branch > `main`, `/ (root)` > Save. After a minute or two the app is live at `https://pedrofpbravo.github.io/intest/`.
4. **(you, both phones)** Open that URL in Safari > log in (each person with their own account) > Share button > **Adicionar à Tela de Início**. On iPhone, log in inside the installed app too if it asks again; the installed app has its own storage.

## Phase 4: migrate the history (you, Pedro's phone)

1. Open Intest logged in as you.
2. Menu (⋯) > **Importar backup** > pick the Treino JSON from Phase 0 > confirm.
3. Verify: the entry count in the confirmation matches your expectation, the oldest and newest entries look right, the stats are plausible. Importing the same file again is harmless (it overwrites the same entries, no duplicates).
4. On the other phone, logged in as `thayzapromo@gmail.com`, confirm the list is EMPTY. That proves the accounts are isolated.

## Phase 5: remove the Banheiro tab from Treino (Claude, only after Phase 4 is confirmed)

Claude pushes the already-prepared Treino v5 (no Banheiro tab) to the treino repo. On your phone, force-close and reopen the Treino app until Ajustes shows "Treino · v5" (sometimes it takes two close-reopen cycles). Your gym data is untouched.

## Phase 6: delete the old data (you, LAST, irreversible)

Only after Phase 4 is verified and you are happy with Intest:

1. console.firebase.google.com > project **treino** > Firestore Database.
2. Click the `bathroom` collection > menu (⋮) at the top of the column > **Delete collection** > type the name to confirm.
3. Keep the Phase 0 backup JSON as a permanent archive anyway.

## Later: deploying changes to Intest

1. Bump `CACHE` in `sw.js` (`intest-v1` to `intest-v2`, ...) and `APP_VERSION` in `js/main.js`.
2. Push. Force-close and reopen the app on the phones.

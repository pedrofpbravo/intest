// Firebase layer (same architecture as Treino/MercadoJa: one thin module,
// CDN SDK, no build step). Auth = two personal email/password accounts.
// Data is PER USER: everything lives under users/{uid}/events, and the
// rules only let a user touch their own subtree. Firestore's persistent
// local cache keeps everything working offline and syncs on reconnect.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig } from "./config.js";

let app = null;
let auth = null;
let fs = null;

export function isConfigured() {
  return (
    firebaseConfig &&
    firebaseConfig.apiKey &&
    !/PASTE/.test(firebaseConfig.apiKey) &&
    firebaseConfig.projectId &&
    !/PASTE/.test(firebaseConfig.projectId)
  );
}

export function init() {
  if (app) return;
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  fs = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

// ---------- auth ----------

export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function login(email, password) {
  await setPersistence(auth, browserLocalPersistence);
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

// ---------- events (per-user subcollection) ----------
// main.js only starts listening after watchAuth reports a user, so
// auth.currentUser is always set when these run.

function eventsCol() {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error("not signed in");
  return collection(fs, "users", uid, "events");
}

export function listenEvents(cb, errCb) {
  return onSnapshot(eventsCol(), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, errCb);
}

export function createEvent({ at, bristol, note }) {
  return setDoc(doc(eventsCol()), {
    at,
    bristol,
    note: note || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateEvent(id, { at, bristol, note }) {
  return updateDoc(doc(eventsCol(), id), {
    at,
    bristol,
    note: note || "",
    updatedAt: serverTimestamp(),
  });
}

export function deleteEvent(id) {
  return deleteDoc(doc(eventsCol(), id));
}

// ---------- weights (per-user subcollection) ----------

function weightsCol() {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error("not signed in");
  return collection(fs, "users", uid, "weights");
}

export function listenWeights(cb, errCb) {
  return onSnapshot(weightsCol(), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, errCb);
}

export function createWeight({ at, kg }) {
  return setDoc(doc(weightsCol()), {
    at,
    kg,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateWeight(id, { at, kg }) {
  return updateDoc(doc(weightsCol(), id), {
    at,
    kg,
    updatedAt: serverTimestamp(),
  });
}

export function deleteWeight(id) {
  return deleteDoc(doc(weightsCol(), id));
}

// ---------- backup import ----------
// Takes a normalized array [{id, at, bristol, note}] (main.js accepts the
// Treino backup, the Intest backup or a bare array and normalizes it).
// Ids are preserved, so importing the same file twice overwrites the same
// docs instead of duplicating them. Chunked under the 500-op batch limit.

export async function importEvents(events) {
  const col = eventsCol();
  for (let i = 0; i < events.length; i += 400) {
    const batch = writeBatch(fs);
    events.slice(i, i + 400).forEach((e) => {
      batch.set(doc(col, e.id), {
        at: e.at,
        bristol: Number(e.bristol) || 4,
        note: e.note || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
}

export async function importWeights(weights) {
  const col = weightsCol();
  for (let i = 0; i < weights.length; i += 400) {
    const batch = writeBatch(fs);
    weights.slice(i, i + 400).forEach((weight) => {
      batch.set(doc(col, weight.id), {
        at: weight.at,
        kg: Number(weight.kg),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
}

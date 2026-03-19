// appState.js — Stato condiviso dell'applicazione
// Centralizza l'accesso alle globali Firebase definite nell'inline script di index.html.
// I moduli importano da qui anziché usare globali implicite su window.

/** @type {firebase.firestore.Firestore} */
export const db = window.db;

/** @type {firebase.auth.Auth} */
export const auth = window.auth;

/** @type {boolean} */
export const DEV_MODE = window.DEV_MODE;

// currentUser è mutevole (cambia con auth state)
let _currentUser = window.currentUser || null;

/** @returns {firebase.User|null} */
export function getCurrentUser() {
    return _currentUser || window.currentUser;
}

/** @param {firebase.User|null} user */
export function setCurrentUser(user) {
    _currentUser = user;
    window.currentUser = user; // backward compat per moduli non ancora migrati
}

// Per i moduli che usano `currentUser` come variabile (da migrare gradualmente),
// questo getter permette: import { currentUser } from './appState.js'
// NB: è un binding live solo se il file viene ri-importato, per ora usiamo
// la proprietà su window come bridge.

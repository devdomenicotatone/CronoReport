// firebaseConfig.js — Google API initialization (Firebase-integrated)
import * as notify from './notify.js';
// Usa il token OAuth ottenuto durante il login Firebase (zero popup aggiuntivi)
// Firebase config e initializeApp sono nell'inline script di index.html

// Google API Config
const API_KEY = 'AIzaSyA1yoFNujcHvWFib5_J1dFiMSDzBMv-b4s';

const DISCOVERY_DOCS = [
    'https://docs.googleapis.com/$discovery/rest?version=v1',
    'https://sheets.googleapis.com/$discovery/rest?version=v4'
];

export let gapiReady = false;

// ── Helper: carica uno script esterno e ritorna una Promise ──
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Impossibile caricare: ${src}`));
        document.head.appendChild(script);
    });
}

// ── Inizializzazione GAPI (solo client library, niente GIS) ──
async function initGapi() {
    await loadScript('https://apis.google.com/js/api.js');
    await new Promise(resolve => gapi.load('client', resolve));
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
    });
    gapiReady = true;

    // Se c'è un token salvato dal login, impostalo subito
    const savedToken = localStorage.getItem('googleAccessToken');
    if (savedToken) {
        gapi.client.setToken({ access_token: savedToken });
    }

    maybeEnableButtons();
}

// Avvia init
initGapi().catch(err => {
    console.warn('Google API non disponibile — i pulsanti export resteranno disabilitati:', err.message || err);
});

// ── Ensure Auth: verifica/rinnova il token prima di ogni chiamata API ──
// Usa il token Firebase (già ottenuto al login), nessun popup aggiuntivo.
// Se il token è scaduto, riautentica via Firebase Google provider.
export async function ensureGoogleAuth() {
    if (!gapiReady) {
        throw new Error('Google API client non ancora inizializzato. Riprova tra qualche secondo.');
    }

    const currentToken = gapi.client.getToken();
    if (currentToken && currentToken.access_token) {
        // Verifica se il token è ancora valido con un test leggero
        const isValid = await testTokenValidity(currentToken.access_token);
        if (isValid) return;
        // Token scaduto — rimuovi e rinnova
        console.warn('Token Google scaduto, rinnovo in corso...');
        gapi.client.setToken('');
        localStorage.removeItem('googleAccessToken');
    }

    // Prova con il token salvato in localStorage
    const savedToken = localStorage.getItem('googleAccessToken');
    if (savedToken) {
        const isValid = await testTokenValidity(savedToken);
        if (isValid) {
            gapi.client.setToken({ access_token: savedToken });
            return;
        }
        // Token salvato scaduto
        localStorage.removeItem('googleAccessToken');
    }

    // Nessun token valido: riautentica via Firebase
    await refreshGoogleToken();
}

// Test veloce della validità del token (evita 401 sulle chiamate API vere)
async function testTokenValidity(token) {
    try {
        const res = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
        return res.ok;
    } catch {
        return false;
    }
}

// ── Rinnova il token via Firebase Google Sign-In ──
async function refreshGoogleToken() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/documents');
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');

    const result = await firebase.auth().signInWithPopup(provider);
    const credential = result.credential;
    const accessToken = credential.accessToken;

    localStorage.setItem('googleAccessToken', accessToken);
    gapi.client.setToken({ access_token: accessToken });
}

// ── handleAuthClick: compatibilità con il codice esistente ──
// Ora usa ensureGoogleAuth() (token Firebase) anziché GIS popup
export async function handleAuthClick(callback) {
    try {
        await ensureGoogleAuth();
        if (callback) callback();
    } catch (error) {
        console.error('Errore autenticazione Google:', error);
        notify.error('Errore Autenticazione', error.message || 'Impossibile autenticarsi con Google. Riprova.');
    }
}

// ── Sign out ──
export function handleSignOutClick() {
    const token = gapi.client.getToken();
    if (token) {
        gapi.client.setToken('');
    }
    localStorage.removeItem('googleAccessToken');
}

// ── Inizializzazione client con access token (usata da reportEvents.js) ──
export function initializeGoogleApiClient(accessToken) {
    return new Promise((resolve, reject) => {
        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    discoveryDocs: DISCOVERY_DOCS
                });
                gapi.client.setToken({ access_token: accessToken });
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

// ── Abilita bottoni export quando GAPI è pronto ──
export function maybeEnableButtons() {
    if (gapiReady) {
        const docBtn = document.getElementById('export-google-doc-btn');
        const sheetBtn = document.getElementById('export-google-sheet-btn');
        if (docBtn) docBtn.disabled = false;
        if (sheetBtn) sheetBtn.disabled = false;
    }
}

// Retrocompatibilità: export gapiInited e gisInited per i moduli che li importano
// gisInited è sempre true perché non usiamo più GIS — legato a gapiReady
export { gapiReady as gapiInited };
export const gisInited = true;

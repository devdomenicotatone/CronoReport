// firebaseConfig.js — GAPI + GIS initialization (modern programmatic loading)
// Firebase config e initializeApp sono nell'inline script di index.html

// Google API Config
const CLIENT_ID = '1032884571304-7t9shq2pb29o92qhthovhsj65l99l9t4.apps.googleusercontent.com';
const API_KEY = 'AIzaSyA1yoFNujcHvWFib5_J1dFiMSDzBMv-b4s';

const DISCOVERY_DOCS = [
    'https://docs.googleapis.com/$discovery/rest?version=v1',
    'https://sheets.googleapis.com/$discovery/rest?version=v4'
];

const SCOPES = 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/spreadsheets';

let tokenClient;
export let gapiInited = false;
export let gisInited = false;

// ── Helper: carica uno script esterno e ritorna una Promise ──
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // Se lo script è già presente nel DOM, risolvi subito
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Impossibile caricare: ${src}`));
        document.head.appendChild(script);
    });
}

// ── Inizializzazione GAPI (Google API Client) ──
async function initGapi() {
    await loadScript('https://apis.google.com/js/api.js');
    await new Promise(resolve => gapi.load('client', resolve));
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
    });
    gapiInited = true;
    maybeEnableButtons();
}

// ── Inizializzazione GIS (Google Identity Services) ──
async function initGis() {
    await loadScript('https://accounts.google.com/gsi/client');
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '',
    });
    gisInited = true;
    maybeEnableButtons();
}

// ── Avvia entrambi in parallelo ──
Promise.all([initGapi(), initGis()]).catch(err => {
    console.warn('Google API non disponibile — i pulsanti export resteranno disabilitati:', err.message || err);
});

// ── Auth: gestione token OAuth2 con rinnovo silente ──
export function handleAuthClick(callback) {
    tokenClient.callback = async (response) => {
        if (response.error) {
            console.error('Errore durante l\'autenticazione:', response);
            return;
        }
        callback();
    };

    const token = gapi.client.getToken();
    if (!token) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

// ── Sign out ──
export function handleSignOutClick() {
    const token = gapi.client.getToken();
    if (token) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
    }
}

// ── Inizializzazione client con access token esistente (usata da reportEvents.js) ──
export function initializeGoogleApiClient(accessToken) {
    return new Promise((resolve, reject) => {
        gapi.load('client', () => {
            gapi.client.init({
                discoveryDocs: DISCOVERY_DOCS
            }).then(() => {
                gapi.client.setToken({ access_token: accessToken });
                resolve();
            }, (error) => {
                reject(error);
            });
        });
    });
}

// ── Abilita bottoni export quando entrambe le API sono pronte ──
export function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        const docBtn = document.getElementById('export-google-doc-btn');
        const sheetBtn = document.getElementById('export-google-sheet-btn');
        if (docBtn) docBtn.disabled = false;
        if (sheetBtn) sheetBtn.disabled = false;
    }
}

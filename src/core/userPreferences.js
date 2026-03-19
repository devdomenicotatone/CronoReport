// userPreferences.js
// Modulo centralizzato per le preferenze utente su Firestore
// Documento: userPreferences/{uid}

let _cache = null;
let _cacheUid = null;

/**
 * Carica le preferenze utente da Firestore.
 * Usa cache in memoria per evitare letture ripetute nella stessa sessione.
 * @param {string} uid - User ID
 * @returns {Promise<Object>} preferenze utente
 */
export async function loadUserPreferences(uid) {
    // Return cache if same user
    if (_cache && _cacheUid === uid) return _cache;

    try {
        const doc = await db.collection('userPreferences').doc(uid).get();
        _cache = doc.exists ? doc.data() : {};
        _cacheUid = uid;
        return _cache;
    } catch (error) {
        console.error('Errore caricamento preferenze utente:', error);
        return {};
    }
}

/**
 * Salva una singola preferenza utente su Firestore (merge).
 * @param {string} uid - User ID
 * @param {string} key - Chiave della preferenza (es. 'pinnedColumns')
 * @param {*} value - Valore da salvare
 */
export async function saveUserPreference(uid, key, value) {
    try {
        await db.collection('userPreferences').doc(uid).set(
            { [key]: value },
            { merge: true }
        );
        // Update cache
        if (!_cache) _cache = {};
        _cache[key] = value;
        _cacheUid = uid;
    } catch (error) {
        console.error(`Errore salvataggio preferenza "${key}":`, error);
    }
}

/**
 * Legge una singola preferenza dalla cache o da Firestore.
 * @param {string} uid - User ID
 * @param {string} key - Chiave della preferenza
 * @param {*} fallback - Valore di fallback se non esiste
 * @returns {Promise<*>}
 */
export async function getUserPreference(uid, key, fallback = null) {
    const prefs = await loadUserPreferences(uid);
    return prefs[key] !== undefined ? prefs[key] : fallback;
}

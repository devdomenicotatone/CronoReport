// clientColors.js — Cache centralizzata dei colori dei clienti da Firestore
// Il colore scelto in Gestione Dati si propaga ovunque: badge, timer cards, ecc.

let _colorCache = {}; // clientName → hex color
let _loaded = false;

/**
 * Carica tutti i colori dei clienti da Firestore e li mette in cache.
 * Chiamare all'avvio di ogni sezione che usa i colori.
 */
export async function loadClientColors() {
    if (_loaded) return _colorCache;
    try {
        const snap = await db.collection('clients')
            .where('uid', '==', currentUser.uid)
            .get();
        _colorCache = {};
        snap.forEach(doc => {
            const d = doc.data();
            if (d.name && d.color) {
                _colorCache[d.name] = d.color;
            }
        });
        _loaded = true;
    } catch (error) {
        console.error('Errore caricamento colori clienti:', error);
    }
    return _colorCache;
}

/**
 * Invalida la cache (chiamare dopo aver cambiato un colore in Gestione Dati)
 */
export function invalidateColorCache() {
    _loaded = false;
    _colorCache = {};
}

/**
 * Ottieni il colore hex del cliente. Fallback: '#6366f1' (indigo)
 * @param {string} clientName
 * @returns {string} hex color
 */
export function getClientHexColor(clientName) {
    return _colorCache[clientName] || '#6366f1';
}

/**
 * Genera una versione chiara (per sfondo badge) a partire dal colore hex.
 * Es: #6366f1 → rgba(99, 102, 241, 0.12)
 */
export function getClientBgStyle(clientName) {
    const hex = getClientHexColor(clientName);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return {
        bg: `rgba(${r}, ${g}, ${b}, 0.12)`,
        text: hex,
        border: `rgba(${r}, ${g}, ${b}, 0.25)`
    };
}

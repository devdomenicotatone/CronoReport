/**
 * backup-firestore.js
 * 
 * Script da eseguire nella Console del browser su:
 * https://devdomenicotatone.github.io/CronoReport
 * 
 * Esporta TUTTI i documenti Firestore dell'utente corrente  
 * in un file JSON locale: cronoreport_backup_YYYY-MM-DD.json
 * 
 * ISTRUZIONI:
 * 1. Apri https://devdomenicotatone.github.io/CronoReport
 * 2. Effettua il login
 * 3. Apri la Console del browser (F12 → Console)
 * 4. Copia e incolla TUTTO questo script
 * 5. Premi Invio
 * 6. Il file JSON verrà scaricato automaticamente
 */

(async function backupFirestore() {
    'use strict';

    // Verifica che l'utente sia autenticato
    if (!currentUser || !currentUser.uid) {
        console.error('❌ Utente non autenticato. Effettua il login prima di eseguire il backup.');
        return;
    }

    const uid = currentUser.uid;
    console.log(`🔄 Avvio backup Firestore per utente: ${uid}`);

    // Collection da esportare
    const collectionsToExport = [
        'clients',
        'projects',
        'worktypes',
        'timeLogs',
        'timers',
        'activeTimers',
        'reportConfigs',
        'reports'
    ];

    const backup = {
        metadata: {
            exportDate: new Date().toISOString(),
            userId: uid,
            userEmail: currentUser.email || 'N/A',
            source: window.location.href,
            version: '1.0'
        },
        collections: {}
    };

    let totalDocs = 0;

    for (const collName of collectionsToExport) {
        console.log(`📂 Esportando collection: ${collName}...`);

        try {
            const snapshot = await db.collection(collName)
                .where('uid', '==', uid)
                .get();

            const docs = [];
            snapshot.forEach(doc => {
                const data = doc.data();

                // Converti i Timestamp Firestore in formato serializzabile
                const serialized = serializeData(data);
                docs.push({
                    id: doc.id,
                    data: serialized
                });
            });

            backup.collections[collName] = docs;
            totalDocs += docs.length;
            console.log(`   ✅ ${collName}: ${docs.length} documenti`);

        } catch (error) {
            console.warn(`   ⚠️ Errore su ${collName}:`, error.message);
            backup.collections[collName] = { error: error.message };
        }
    }

    // Riepilogo
    console.log(`\n📊 Riepilogo backup:`);
    console.log(`   Totale documenti: ${totalDocs}`);
    Object.entries(backup.collections).forEach(([name, docs]) => {
        const count = Array.isArray(docs) ? docs.length : 'ERRORE';
        console.log(`   - ${name}: ${count}`);
    });

    // Scarica il file JSON
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `cronoreport_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`\n✅ Backup completato! File scaricato: cronoreport_backup_${dateStr}.json`);
    console.log(`📦 Dimensione: ${(jsonStr.length / 1024).toFixed(1)} KB`);

    // Helper per serializzare i Timestamp Firestore
    function serializeData(data) {
        if (data === null || data === undefined) return data;
        if (typeof data !== 'object') return data;

        // Firestore Timestamp
        if (data.toDate && typeof data.toDate === 'function') {
            return {
                __type: 'Timestamp',
                seconds: data.seconds,
                nanoseconds: data.nanoseconds,
                iso: data.toDate().toISOString()
            };
        }

        // Array
        if (Array.isArray(data)) {
            return data.map(item => serializeData(item));
        }

        // Object
        const result = {};
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                result[key] = serializeData(data[key]);
            }
        }
        return result;
    }

})();

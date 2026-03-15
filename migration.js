// migration.js — One-time data migrations

/**
 * Migrazione one-time: aggiorna tutti i timer in `timeLogs` che hanno
 * `hourlyRate` mancante o 0, recuperando la tariffa dal worktype associato.
 * 
 * Usa un flag in localStorage per eseguirsi una sola volta per utente.
 */
async function migrateTimerHourlyRates(uid) {
    const migrationKey = `cr-migration-hourlyRate-${uid}`;
    
    // Se la migrazione è già stata eseguita, skip
    if (localStorage.getItem(migrationKey) === 'done') {
        return;
    }

    console.log('[Migration] Controllo timer con hourlyRate mancante...');

    try {
        // 1. Recupera tutte le tariffe correnti dai worktypes
        const worktypeSnapshot = await db.collection('worktypes')
            .where('uid', '==', uid)
            .get();
        
        const worktypeRates = {};
        worktypeSnapshot.forEach(doc => {
            worktypeRates[doc.id] = doc.data().hourlyRate || 0;
        });

        // 2. Trova tutti i timeLogs senza hourlyRate valida
        const timeLogsSnapshot = await db.collection('timeLogs')
            .where('uid', '==', uid)
            .get();

        let updateCount = 0;
        const batch = db.batch();

        timeLogsSnapshot.forEach(doc => {
            const data = doc.data();
            const currentRate = data.hourlyRate;
            
            // Se hourlyRate è mancante, null, undefined, o 0
            if (!currentRate || currentRate === 0) {
                const worktypeId = data.worktypeId;
                const correctRate = worktypeRates[worktypeId] || 0;
                
                if (correctRate > 0) {
                    batch.update(doc.ref, { hourlyRate: correctRate });
                    updateCount++;
                }
            }
        });

        if (updateCount > 0) {
            await batch.commit();
            console.log(`[Migration] ✅ Aggiornati ${updateCount} timer con hourlyRate corretta.`);
        } else {
            console.log('[Migration] ✅ Nessun timer da aggiornare.');
        }

        // Segna la migrazione come completata
        localStorage.setItem(migrationKey, 'done');

    } catch (error) {
        console.error('[Migration] Errore durante la migrazione hourlyRate:', error);
    }
}

// === VITE MODULE: Registra globals ===
window.migrateTimerHourlyRates = migrateTimerHourlyRates;

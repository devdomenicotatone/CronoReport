/**
 * migrate-remove-site-fields.js
 * 
 * Script da eseguire nella Console del browser su:
 * https://devdomenicotatone.github.io/CronoReport
 * 
 * Rimuove i campi obsoleti `siteId` e `siteName` da timeLogs e timers.
 * I campi `projectId` e `projectName` sono già presenti con gli stessi valori.
 * 
 * ⚠️ PREREQUISITO: aver eseguito il backup (backup-firestore.js) PRIMA!
 * 
 * ISTRUZIONI:
 * 1. Apri https://devdomenicotatone.github.io/CronoReport
 * 2. Effettua il login
 * 3. Apri la Console del browser (F12 → Console)
 * 4. Copia e incolla TUTTO questo script
 * 5. Premi Invio
 * 6. Attendi il completamento (può richiedere 30-60 secondi)
 */

(async function removeSiteFields() {
    'use strict';

    if (!currentUser || !currentUser.uid) {
        console.error('❌ Utente non autenticato.');
        return;
    }

    const uid = currentUser.uid;
    const deleteField = firebase.firestore.FieldValue.delete();
    const collectionsToClean = ['timeLogs', 'timers'];
    
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    console.log('🔄 Avvio rimozione campi siteId/siteName...');
    console.log('⚠️  Assicurati di aver eseguito il backup prima!');

    for (const collName of collectionsToClean) {
        console.log(`\n📂 Elaborazione collection: ${collName}`);

        try {
            const snapshot = await db.collection(collName)
                .where('uid', '==', uid)
                .get();

            let updated = 0;
            let skipped = 0;
            let errors = 0;

            // Usa batch per efficienza (max 500 operazioni per batch)
            const BATCH_SIZE = 450;
            let batch = db.batch();
            let batchCount = 0;

            for (const doc of snapshot.docs) {
                const data = doc.data();
                
                // Controlla se ha i vecchi campi
                if (!data.hasOwnProperty('siteId') && !data.hasOwnProperty('siteName')) {
                    skipped++;
                    continue;
                }

                // Verifica di sicurezza: projectId deve già esistere
                if (!data.projectId) {
                    console.warn(`   ⚠️ SKIP ${doc.id}: manca projectId!`);
                    skipped++;
                    continue;
                }

                // Verifica di sicurezza: i valori devono essere uguali
                if (data.siteId && data.siteId !== data.projectId) {
                    console.error(`   ❌ MISMATCH ${doc.id}: siteId=${data.siteId} !== projectId=${data.projectId}`);
                    errors++;
                    continue;
                }

                // Rimuovi i vecchi campi
                batch.update(doc.ref, {
                    siteId: deleteField,
                    siteName: deleteField
                });
                updated++;
                batchCount++;

                // Commit batch quando raggiungiamo il limite
                if (batchCount >= BATCH_SIZE) {
                    await batch.commit();
                    console.log(`   💾 Batch committato: ${batchCount} documenti`);
                    batch = db.batch();
                    batchCount = 0;
                }
            }

            // Commit batch rimanente
            if (batchCount > 0) {
                await batch.commit();
                console.log(`   💾 Batch finale committato: ${batchCount} documenti`);
            }

            console.log(`   ✅ ${collName}: ${updated} aggiornati, ${skipped} saltati, ${errors} errori`);
            totalUpdated += updated;
            totalSkipped += skipped;
            totalErrors += errors;

        } catch (error) {
            console.error(`   ❌ Errore su ${collName}:`, error.message);
            totalErrors++;
        }
    }

    // Riepilogo
    console.log('\n' + '═'.repeat(50));
    console.log('📊 RIEPILOGO MIGRAZIONE');
    console.log('═'.repeat(50));
    console.log(`   ✅ Documenti aggiornati: ${totalUpdated}`);
    console.log(`   ⏭️  Documenti saltati: ${totalSkipped}`);
    console.log(`   ❌ Errori: ${totalErrors}`);

    if (totalErrors === 0) {
        document.title = `MIGRAZIONE_OK: ${totalUpdated} docs aggiornati`;
        console.log('\n🎉 Migrazione completata con successo!');
    } else {
        document.title = `MIGRAZIONE_ERRORI: ${totalErrors} errori`;
        console.error('\n⚠️ Migrazione completata con errori. Controlla il log sopra.');
    }

    window.__migrateResult = { totalUpdated, totalSkipped, totalErrors };
})();

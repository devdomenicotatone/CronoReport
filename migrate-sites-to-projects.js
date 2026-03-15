/**
 * migrate-sites-to-projects.js
 * 
 * Script di migrazione Firebase: sites → projects (SAFE MODE)
 * Da eseguire UNA SOLA VOLTA nella console del browser con l'utente autenticato.
 * 
 * Operazioni:
 * 1. Copia tutti i documenti da 'sites' a 'projects' (stessi dati, stesso ID)
 * 2. AGGIUNGE projectId e projectName in 'timeLogs' (senza cancellare siteId/siteName)
 * 3. AGGIUNGE projectId e projectName in 'timers' (senza cancellare siteId/siteName)
 * 4. AGGIUNGE projectId/projectName in 'reportConfigs' (senza cancellare i vecchi)
 * 5. NON cancella la collezione 'sites' (per sicurezza)
 * 
 * I vecchi campi siteId/siteName restano per compatibilità col codice vecchio.
 * Dopo il deploy del nuovo codice, puoi opzionalmente cancellarli.
 * 
 * Uso: Incolla questo script nella Console del browser dopo login
 */

async function migrateSitesToProjects() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error('❌ Nessun utente autenticato. Effettua il login prima.');
        return;
    }

    const uid = user.uid;
    const db = firebase.firestore();
    console.log(`🚀 Inizio migrazione per utente: ${uid}`);

    let stats = {
        sitesCopied: 0,
        timeLogsUpdated: 0,
        timersUpdated: 0,
        reportConfigsUpdated: 0,
        errors: []
    };

    // === STEP 1: Copia sites → projects ===
    console.log('\n📋 STEP 1: Copiando documenti da "sites" a "projects"...');
    try {
        const sitesSnap = await db.collection('sites').where('uid', '==', uid).get();
        console.log(`   Trovati ${sitesSnap.size} documenti in "sites"`);

        const batch1 = db.batch();
        sitesSnap.forEach(doc => {
            const projectRef = db.collection('projects').doc(doc.id); // Mantieni lo stesso ID
            batch1.set(projectRef, doc.data());
            stats.sitesCopied++;
        });

        if (stats.sitesCopied > 0) {
            await batch1.commit();
            console.log(`   ✅ ${stats.sitesCopied} documenti copiati in "projects"`);
        } else {
            console.log('   ⚠️ Nessun documento trovato in "sites"');
        }
    } catch (err) {
        console.error('   ❌ Errore in STEP 1:', err);
        stats.errors.push(`STEP 1: ${err.message}`);
    }

    // === STEP 2: Aggiorna timeLogs ===
    console.log('\n📋 STEP 2: Aggiornando campi in "timeLogs"...');
    try {
        const timeLogsSnap = await db.collection('timeLogs').where('uid', '==', uid).get();
        console.log(`   Trovati ${timeLogsSnap.size} documenti in "timeLogs"`);

        // Firestore batch ha un limite di 500 operazioni
        const chunks = [];
        let currentChunk = [];
        timeLogsSnap.forEach(doc => {
            currentChunk.push(doc);
            if (currentChunk.length === 450) { // Lasciamo margine
                chunks.push(currentChunk);
                currentChunk = [];
            }
        });
        if (currentChunk.length > 0) chunks.push(currentChunk);

        for (const chunk of chunks) {
            const batch = db.batch();
            for (const doc of chunk) {
                const data = doc.data();
                const updates = {};
                
                if (data.siteId !== undefined) {
                    updates.projectId = data.siteId;
                    // NON cancella siteId — resta per compatibilità
                }
                if (data.siteName !== undefined) {
                    updates.projectName = data.siteName;
                    // NON cancella siteName — resta per compatibilità
                }
                
                if (Object.keys(updates).length > 0) {
                    batch.update(doc.ref, updates);
                    stats.timeLogsUpdated++;
                }
            }
            await batch.commit();
        }
        console.log(`   ✅ ${stats.timeLogsUpdated} documenti aggiornati in "timeLogs"`);
    } catch (err) {
        console.error('   ❌ Errore in STEP 2:', err);
        stats.errors.push(`STEP 2: ${err.message}`);
    }

    // === STEP 3: Aggiorna timers (timer attivi) ===
    console.log('\n📋 STEP 3: Aggiornando campi in "timers"...');
    try {
        const timersSnap = await db.collection('timers').where('uid', '==', uid).get();
        console.log(`   Trovati ${timersSnap.size} documenti in "timers"`);

        if (timersSnap.size > 0) {
            const batch = db.batch();
            timersSnap.forEach(doc => {
                const data = doc.data();
                const updates = {};
                
                if (data.siteId !== undefined) {
                    updates.projectId = data.siteId;
                }
                if (data.siteName !== undefined) {
                    updates.projectName = data.siteName;
                }
                
                if (Object.keys(updates).length > 0) {
                    batch.update(doc.ref, updates);
                    stats.timersUpdated++;
                }
            });
            await batch.commit();
        }
        console.log(`   ✅ ${stats.timersUpdated} documenti aggiornati in "timers"`);
    } catch (err) {
        console.error('   ❌ Errore in STEP 3:', err);
        stats.errors.push(`STEP 3: ${err.message}`);
    }

    // === STEP 4: Aggiorna reportConfigs ===
    console.log('\n📋 STEP 4: Aggiornando campi in "reportConfigs"...');
    try {
        const reportsSnap = await db.collection('reportConfigs').where('uid', '==', uid).get();
        console.log(`   Trovati ${reportsSnap.size} documenti in "reportConfigs"`);

        if (reportsSnap.size > 0) {
            const batch = db.batch();
            reportsSnap.forEach(doc => {
                const data = doc.data();
                const updates = {};
                
                if (data.siteId !== undefined) {
                    updates.projectId = data.siteId;
                }
                if (data.siteName !== undefined) {
                    updates.projectName = data.siteName;
                }
                if (data.filterSite !== undefined) {
                    updates.filterProject = data.filterSite;
                }
                if (data.filterSiteName !== undefined) {
                    updates.filterProjectName = data.filterSiteName;
                }
                
                if (Object.keys(updates).length > 0) {
                    batch.update(doc.ref, updates);
                    stats.reportConfigsUpdated++;
                }
            });
            await batch.commit();
        }
        console.log(`   ✅ ${stats.reportConfigsUpdated} documenti aggiornati in "reportConfigs"`);
    } catch (err) {
        console.error('   ❌ Errore in STEP 4:', err);
        stats.errors.push(`STEP 4: ${err.message}`);
    }

    // === RIEPILOGO ===
    console.log('\n' + '═'.repeat(50));
    console.log('📊 RIEPILOGO MIGRAZIONE');
    console.log('═'.repeat(50));
    console.log(`   Sites copiati in Projects: ${stats.sitesCopied}`);
    console.log(`   TimeLogs aggiornati:       ${stats.timeLogsUpdated}`);
    console.log(`   Timers aggiornati:         ${stats.timersUpdated}`);
    console.log(`   ReportConfigs aggiornati:  ${stats.reportConfigsUpdated}`);
    
    if (stats.errors.length > 0) {
        console.log('\n   ⚠️ ERRORI:');
        stats.errors.forEach(e => console.log(`      - ${e}`));
    } else {
        console.log('\n   ✅ Migrazione completata senza errori!');
        console.log('   ⚠️ La collezione "sites" NON è stata cancellata (per sicurezza).');
        console.log('   🗑️ Puoi cancellarla manualmente dalla console Firebase quando sei sicuro.');
    }
}

// Esegui la migrazione
migrateSitesToProjects();

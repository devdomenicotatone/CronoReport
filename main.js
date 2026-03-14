// main.js
// DEV_MODE, auth, db, currentUser sono definiti globalmente in index.html

if (DEV_MODE) {
    // Fake user per sviluppo
    currentUser = {
        uid: 'dev-user-001',
        displayName: 'Dev User',
        email: 'dev@cronoreport.local',
        photoURL: null
    };
    console.log('%c🚀 DEV MODE ATTIVO — Login bypassato', 'color: #10b981; font-weight: bold; font-size: 14px;');

    // Defer: i template (const) sono dichiarati più avanti nel file
    setTimeout(() => {
        if (typeof updateUserDisplay === 'function') {
            updateUserDisplay(currentUser);
        }
        loadSection('timer');
        setActiveNav('timer');
    }, 0);

    // Preveni qualsiasi redirect da Firebase auth
    auth.onAuthStateChanged(() => {
        // No-op in dev mode — ignora lo stato auth
    });
} else {
    // Listener per lo stato di autenticazione (PRODUCTION)
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            console.log("Utente autenticato:", currentUser.uid);

            // Update user display in navbar
            if (typeof updateUserDisplay === 'function') {
                updateUserDisplay(user);
            }

            loadSection('timer');
            setActiveNav('timer');

            await initializeTimerEvents();

        } else {
            currentUser = null;
            window.location.href = 'login.html';
        }
    });
}

// Template: dataManagementTemplate è definito in templates.js

/**
 * Funzione per caricare le sezioni in base al menu
 * @param {string} section - Nome della sezione da caricare
 */
function loadSection(section) {
    const contentSection = document.getElementById('content-section');
    contentSection.innerHTML = ''; // Svuota la sezione di contenuto

    switch (section) {
        case 'data-management':
            contentSection.innerHTML = dataManagementTemplate;
            initializeDataManagementEvents();
            break;
        case 'timer':
            contentSection.innerHTML = timerTemplate;
            initializeTimerEvents();
            break;
        case 'saved-timers':
            contentSection.innerHTML = savedTimersTemplate;
            if (currentUser) {
                initializeSavedTimersEvents();
            } else {
                console.error("currentUser non definito, impossibile inizializzare saved timers.");
            }
            break;
        case 'recycle-bin':
            contentSection.innerHTML = recycleBinTemplate;
            CrTabs.init('#recycleBinTabs');
            initializeRecycleBinTimersEvents();
            initializeRecycleBinReportsEvents();
            break;
        case 'report':
            contentSection.innerHTML = reportTemplate;
            initializeReportEvents();
            break;
        case 'report-history':
            contentSection.innerHTML = reportHistoryTemplate;
            initializeReportHistoryEvents();
            break;
        case 'dashboard':
            // Carica il template della dashboard
            initializeDashboardEvents();
            break;
        // aggiungi altri case se necessario
        default:
            contentSection.innerHTML = '<p>Sezione non trovata.</p>';
    }

    // Tooltips handled natively via title attribute (no jQuery needed)
}

/**
 * Funzione per inizializzare gli eventi della Gestione Dati (Ultra Pro)
 */
function initializeDataManagementEvents() {
    const addClientBtn = document.getElementById('add-client-btn');
    const newClientName = document.getElementById('new-client-name');
    const searchInput = document.getElementById('dm-search-input');

    // Add Client
    addClientBtn.addEventListener('click', () => {
        const name = newClientName.value.trim();
        if (!name) {
            showAlert('warning', 'Attenzione', 'Inserisci un nome per il cliente.');
            return;
        }
        db.collection('clients').add({
            name: name,
            uid: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            newClientName.value = '';
            renderUnifiedClientAccordion();
            showAlert('success', 'Cliente aggiunto!', `Il cliente "${name}" è stato aggiunto.`);
        }).catch(error => {
            console.error('Errore:', error);
            showAlert('error', 'Errore', 'Si è verificato un errore.');
        });
    });

    // Search filter
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase();
            document.querySelectorAll('#dm-client-accordion .dm-client-card').forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(q) ? '' : 'none';
            });
        });
    }

    // Initial render
    renderUnifiedClientAccordion();
}

/**
 * Notifiche SweetAlert2
 */
function showAlert(icon, title, text) {
    Swal.fire({ icon, title, text, confirmButtonColor: '#3085d6' });
}

/**
 * Render the unified client accordion with sites and worktypes nested
 */
async function renderUnifiedClientAccordion() {
    const container = document.getElementById('dm-client-accordion');
    if (!container) return;
    container.innerHTML = '';

    let totalClients = 0, totalSites = 0, totalWorktypes = 0;

    try {
        const clientSnap = await db.collection('clients')
            .where('uid', '==', currentUser.uid)
            .orderBy('name')
            .get();

        totalClients = clientSnap.size;

        for (const clientDoc of clientSnap.docs) {
            const clientData = clientDoc.data();
            const clientId = clientDoc.id;

            // Fetch sites + worktypes in parallel
            const [sitesSnap, worktypesSnap] = await Promise.all([
                db.collection('sites').where('uid', '==', currentUser.uid).where('clientId', '==', clientId).orderBy('name').get(),
                db.collection('worktypes').where('uid', '==', currentUser.uid).where('clientId', '==', clientId).orderBy('name').get()
            ]);

            totalSites += sitesSnap.size;
            totalWorktypes += worktypesSnap.size;

            // === BUILD CARD ===
            const card = document.createElement('div');
            card.className = 'dm-client-card';

            // Header
            const header = document.createElement('div');
            header.className = 'dm-client-header';
            header.innerHTML = `
                <div class="flex items-center gap-2">
                    <i class="fas fa-user-circle text-indigo-400"></i>
                    <input class="dm-editable font-semibold" value="${clientData.name}" data-id="${clientId}" data-collection="clients" data-field="name" />
                </div>
                <div class="flex items-center gap-2">
                    <span class="dm-badge dm-badge-teal">${sitesSnap.size} siti</span>
                    <span class="dm-badge dm-badge-amber">${worktypesSnap.size} tipi</span>
                    <button class="p-1 text-rose-400 hover:text-rose-600 transition" title="Elimina cliente"><i class="fas fa-trash-alt text-xs"></i></button>
                    <i class="fas fa-chevron-down chevron"></i>
                </div>
            `;

            // Delete client
            const delBtn = header.querySelector('button[title="Elimina cliente"]');
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                Swal.fire({
                    title: 'Sei sicuro?',
                    text: `Vuoi eliminare il cliente "${clientData.name}"?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Sì, elimina!',
                    cancelButtonText: 'Annulla'
                }).then(result => {
                    if (result.isConfirmed) {
                        db.collection('clients').doc(clientId).delete().then(() => {
                            renderUnifiedClientAccordion();
                            Swal.fire('Eliminato!', 'Il cliente è stato eliminato.', 'success');
                        });
                    }
                });
            });

            // Inline edit client name
            const nameInput = header.querySelector('.dm-editable');
            nameInput.addEventListener('click', (e) => e.stopPropagation());
            nameInput.addEventListener('blur', () => {
                const newName = nameInput.value.trim();
                if (newName && newName !== clientData.name) {
                    db.collection('clients').doc(clientId).update({ name: newName });
                }
            });

            // Toggle body
            const body = document.createElement('div');
            body.className = 'dm-client-body';
            header.addEventListener('click', () => {
                header.classList.toggle('open');
                body.classList.toggle('expanded');
            });

            // === SITES SECTION ===
            const sitesSection = document.createElement('div');
            sitesSection.className = 'dm-sub-section';
            sitesSection.innerHTML = `<div class="dm-sub-section-title"><i class="fas fa-map-marker-alt"></i> Siti</div>`;

            if (sitesSnap.empty) {
                sitesSection.innerHTML += `<div class="dm-empty">Nessun sito</div>`;
            } else {
                sitesSnap.forEach(siteDoc => {
                    const siteData = siteDoc.data();
                    const row = document.createElement('div');
                    row.className = 'dm-sub-item';
                    row.innerHTML = `
                        <input class="dm-editable" value="${siteData.name}" data-id="${siteDoc.id}" data-collection="sites" data-field="name" />
                        <button class="delete-btn" title="Elimina sito"><i class="fas fa-times"></i></button>
                    `;
                    row.querySelector('.delete-btn').addEventListener('click', () => {
                        db.collection('sites').doc(siteDoc.id).delete().then(() => renderUnifiedClientAccordion());
                    });
                    row.querySelector('.dm-editable').addEventListener('blur', (e) => {
                        const v = e.target.value.trim();
                        if (v && v !== siteData.name) db.collection('sites').doc(siteDoc.id).update({ name: v });
                    });
                    sitesSection.appendChild(row);
                });
            }

            // Add site inline
            const addSiteRow = document.createElement('div');
            addSiteRow.className = 'dm-add-row';
            addSiteRow.innerHTML = `<input type="text" class="flex-1" placeholder="Nuovo sito..." /><button class="dm-add-btn"><i class="fas fa-plus"></i></button>`;
            addSiteRow.querySelector('.dm-add-btn').addEventListener('click', () => {
                const input = addSiteRow.querySelector('input');
                const name = input.value.trim();
                if (!name) return;
                db.collection('sites').add({
                    name, uid: currentUser.uid, clientId, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => renderUnifiedClientAccordion());
            });
            sitesSection.appendChild(addSiteRow);

            // === WORKTYPES SECTION ===
            const wtSection = document.createElement('div');
            wtSection.className = 'dm-sub-section';
            wtSection.innerHTML = `<div class="dm-sub-section-title"><i class="fas fa-tools"></i> Tipi di Lavoro</div>`;

            if (worktypesSnap.empty) {
                wtSection.innerHTML += `<div class="dm-empty">Nessun tipo di lavoro</div>`;
            } else {
                worktypesSnap.forEach(wtDoc => {
                    const wtData = wtDoc.data();
                    const row = document.createElement('div');
                    row.className = 'dm-sub-item';
                    row.innerHTML = `
                        <input class="dm-editable flex-1" value="${wtData.name}" data-id="${wtDoc.id}" data-collection="worktypes" data-field="name" />
                        <input class="dm-editable" type="number" value="${wtData.hourlyRate || 0}" style="width:60px;text-align:right;" data-id="${wtDoc.id}" data-collection="worktypes" data-field="hourlyRate" />
                        <span class="text-xs text-surface-400 mr-1">€/h</span>
                        <button class="delete-btn" title="Elimina tipo"><i class="fas fa-times"></i></button>
                    `;
                    row.querySelector('.delete-btn').addEventListener('click', () => {
                        db.collection('worktypes').doc(wtDoc.id).delete().then(() => renderUnifiedClientAccordion());
                    });
                    // Inline edit name
                    row.querySelectorAll('.dm-editable').forEach(inp => {
                        inp.addEventListener('blur', () => {
                            const field = inp.dataset.field;
                            let val = inp.value.trim();
                            if (field === 'hourlyRate') val = parseFloat(val) || 0;
                            if (val !== '' && val !== (field === 'hourlyRate' ? wtData.hourlyRate : wtData.name)) {
                                db.collection('worktypes').doc(wtDoc.id).update({ [field]: val });
                            }
                        });
                    });
                    wtSection.appendChild(row);
                });
            }

            // Add worktype inline
            const addWtRow = document.createElement('div');
            addWtRow.className = 'dm-add-row';
            addWtRow.innerHTML = `
                <input type="text" class="flex-1" placeholder="Tipo lavoro..." />
                <input type="number" style="width:60px" placeholder="€/h" />
                <button class="dm-add-btn"><i class="fas fa-plus"></i></button>
            `;
            addWtRow.querySelector('.dm-add-btn').addEventListener('click', () => {
                const inputs = addWtRow.querySelectorAll('input');
                const name = inputs[0].value.trim();
                const rate = parseFloat(inputs[1].value) || 0;
                if (!name) return;
                db.collection('worktypes').add({
                    name, hourlyRate: rate, uid: currentUser.uid, clientId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => renderUnifiedClientAccordion());
            });
            wtSection.appendChild(addWtRow);

            // Assemble
            body.appendChild(sitesSection);
            body.appendChild(wtSection);
            card.appendChild(header);
            card.appendChild(body);
            container.appendChild(card);
        }

        // Update stats
        dmUpdateStats(totalClients, totalSites, totalWorktypes);

    } catch (error) {
        console.error('Errore nel rendering accordion:', error);
    }
}

/**
 * Update stat cards for data management
 */
function dmUpdateStats(clients, sites, worktypes) {
    const c = document.getElementById('dm-stat-clients');
    const s = document.getElementById('dm-stat-sites');
    const w = document.getElementById('dm-stat-worktypes');
    if (c) c.textContent = clients;
    if (s) s.textContent = sites;
    if (w) w.textContent = worktypes;
}

/**
 * Load clients for select element (used by timer and report pages)
 */
function loadClientsForSelect(selectElement) {
    selectElement.innerHTML = '<option value="">--Seleziona Cliente--</option>';
    db.collection('clients')
        .where('uid', '==', currentUser.uid)
        .orderBy('name')
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                selectElement.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Errore nel caricamento dei clienti per selezione:', error);
        });
}

/**
 * Inserimento dei template nel DOM
 */

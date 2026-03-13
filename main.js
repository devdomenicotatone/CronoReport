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
        loadSection('data-management');
        setActiveNav('data-management');
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

            loadSection('data-management');
            setActiveNav('data-management');

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
 * Funzione per inizializzare gli eventi della Gestione Dati
 */
function initializeDataManagementEvents() {
    // Elementi DOM esistenti
    const addClientBtn = document.getElementById('add-client-btn');
    const newClientName = document.getElementById('new-client-name');

    const addSiteBtn = document.getElementById('add-site-btn');
    const newSiteName = document.getElementById('new-site-name');
    const selectClientForSite = document.getElementById('select-client-for-site');

    const addWorktypeBtn = document.getElementById('add-worktype-btn');
    const newWorktypeName = document.getElementById('new-worktype-name');
    const selectClientForWorktype = document.getElementById('select-client-for-worktype');

    // Pulsanti di toggle
    const toggleClientListBtn = document.getElementById('toggle-client-list-btn');
    const toggleSiteListBtn = document.getElementById('toggle-site-list-btn');
    const toggleWorktypeListBtn = document.getElementById('toggle-worktype-list-btn');

    // Event listener per il pulsante di toggle dei Clienti
    toggleClientListBtn.addEventListener('click', function () {
        const clientList = document.getElementById('client-list');
        if (clientList.style.display === 'none' || clientList.style.display === '') {
            clientList.style.display = 'block';
        } else {
            clientList.style.display = 'none';
        }
    });

    // **Event listener per il pulsante di toggle dei Siti**
    toggleSiteListBtn.addEventListener('click', function () {
        const siteListDiv = document.getElementById('site-list');
        if (siteListDiv.style.display === 'none' || siteListDiv.style.display === '') {
            siteListDiv.style.display = 'block';
        } else {
            siteListDiv.style.display = 'none';
        }
    });

    // **Event listener per il pulsante di toggle dei Tipi di Lavoro**
    toggleWorktypeListBtn.addEventListener('click', function () {
        const worktypeListDiv = document.getElementById('worktype-list');
        if (worktypeListDiv.style.display === 'none' || worktypeListDiv.style.display === '') {
            worktypeListDiv.style.display = 'block';
        } else {
            worktypeListDiv.style.display = 'none';
        }
    });

    // Carica le liste esistenti
    loadDataManagementClientList(); // Per la lista dei Clienti
    loadClientsForSelect(selectClientForSite); // Per il select dei Clienti nei Siti
    loadClientsForSelect(selectClientForWorktype); // Per il select dei Clienti nei Tipi di Lavoro
    loadSites(); // Per la lista dei Siti
    loadWorktypes(); // Per la lista dei Tipi di Lavoro

    // Aggiungi Cliente
    addClientBtn.addEventListener('click', () => {
        const clientName = newClientName.value.trim();
        if (clientName) {
            addClient(clientName);
        } else {
            showAlert('warning', 'Attenzione', 'Inserisci un nome valido per il cliente.');
        }
    });

    // Aggiungi Sito
    addSiteBtn.addEventListener('click', () => {
        const siteName = newSiteName.value.trim();
        const clientId = selectClientForSite.value;

        if (!clientId) {
            showAlert('warning', 'Attenzione', 'Seleziona un Cliente prima di aggiungere un Sito.');
            return;
        }

        if (siteName) {
            addSite(clientId, siteName);
        } else {
            showAlert('warning', 'Attenzione', 'Inserisci un nome valido per il sito.');
        }
    });

    // Aggiungi Tipo di Lavoro
    addWorktypeBtn.addEventListener('click', () => {
        const worktypeName = newWorktypeName.value.trim();
        const clientId = selectClientForWorktype.value;
        const hourlyRate = parseFloat(document.getElementById('new-worktype-hourly-rate').value);

        if (!clientId) {
            showAlert('warning', 'Attenzione', 'Seleziona un Cliente prima di aggiungere un Tipo di Lavoro.');
            return;
        }

        if (worktypeName && !isNaN(hourlyRate)) {
            addWorktype(clientId, worktypeName, hourlyRate);
        } else {
            showAlert('warning', 'Attenzione', 'Inserisci un nome valido e una tariffa oraria valida per il tipo di lavoro.');
        }
    });
}

/**
 * Funzione per mostrare notifiche con SweetAlert2
 * @param {string} icon - Tipo di icona ('success', 'error', 'warning', etc.)
 * @param {string} title - Titolo della notifica
 * @param {string} text - Testo della notifica
 */
function showAlert(icon, title, text) {
    Swal.fire({
        icon: icon,
        title: title,
        text: text,
        confirmButtonColor: '#3085d6'
    });
}

/**
 * Funzione per aggiungere un nuovo cliente
 * @param {string} name - Nome del cliente
 */
async function addClient(name) {
    try {
        await db.collection('clients').add({
            name: name,
            uid: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showAlert('success', 'Cliente aggiunto!', `Il cliente "${name}" è stato aggiunto con successo.`);
        document.getElementById('new-client-name').value = '';
        loadDataManagementClientList();
        loadClientsForSelect(document.getElementById('select-client-for-site'));
        loadClientsForSelect(document.getElementById('select-client-for-worktype'));
    } catch (error) {
        console.error('Errore nell\'aggiunta del cliente:', error);
        showAlert('error', 'Errore', 'Si è verificato un errore durante l\'aggiunta del cliente.');
    }
}

/**
 * Funzione per aggiungere un nuovo sito
 * @param {string} clientId - ID del cliente associato
 * @param {string} name - Nome del sito
 */
async function addSite(clientId, name) {
    try {
        await db.collection('sites').add({
            name: name,
            uid: currentUser.uid,
            clientId: clientId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showAlert('success', 'Sito aggiunto!', `Il sito "${name}" è stato aggiunto con successo.`);
        document.getElementById('new-site-name').value = '';
        loadSites();
    } catch (error) {
        console.error('Errore nell\'aggiunta del sito:', error);
        showAlert('error', 'Errore', 'Si è verificato un errore durante l\'aggiunta del sito.');
    }
}

/**
 * Funzione per aggiungere un nuovo tipo di lavoro
 * @param {string} clientId - ID del cliente associato
 * @param {string} name - Nome del tipo di lavoro
 * @param {number} hourlyRate - Tariffa oraria per il tipo di lavoro
 */
async function addWorktype(clientId, name, hourlyRate) {
    try {
        await db.collection('worktypes').add({
            name: name,
            uid: currentUser.uid,
            clientId: clientId,
            hourlyRate: hourlyRate,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showAlert('success', 'Tipo di Lavoro aggiunto!', `Il tipo di lavoro "${name}" è stato aggiunto con successo.`);
        document.getElementById('new-worktype-name').value = '';
        document.getElementById('new-worktype-hourly-rate').value = ''; // Resetta il campo hourlyRate
        loadWorktypes();
    } catch (error) {
        console.error('Errore nell\'aggiunta del tipo di lavoro:', error);
        showAlert('error', 'Errore', 'Si è verificato un errore durante l\'aggiunta del tipo di lavoro.');
    }
}

/**
 * Funzione per caricare i Clienti nelle liste o nei menu a tendina
 * @param {HTMLElement} selectElement - Elemento select da popolare
 */
function loadClientsForSelect(selectElement) {
    selectElement.innerHTML = '<option value="">--Seleziona Cliente--</option>';
    db.collection('clients')
        .where('uid', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
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
            showAlert('error', 'Errore', 'Si è verificato un errore durante il caricamento dei clienti.');
        });
}

/**
 * Funzione per caricare i Clienti nella lista principale
 * @param {HTMLElement|null} selectElement - Elemento select opzionale
 */
function loadDataManagementClientList(selectElement = null) {
    if (selectElement) {
        // Popola il menu a tendina
        selectElement.innerHTML = '<option value="">--Seleziona Cliente--</option>';
        db.collection('clients')
            .where('uid', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
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
                console.error('Errore nel caricamento dei clienti:', error);
                showAlert('error', 'Errore', 'Si è verificato un errore durante il caricamento dei clienti.');
            });
    } else {
        // Popola la lista nella Gestione Dati
        const clientList = document.getElementById('client-list');
        clientList.innerHTML = '';
        db.collection('clients')
            .where('uid', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get()
            .then(snapshot => {
                snapshot.forEach(doc => {
                    const li = document.createElement('li');
                    li.className = 'flex items-center justify-between px-4 py-3 bg-surface-50 rounded-lg mb-2 group hover:bg-surface-100 transition-colors';

                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = doc.data().name;
                    nameSpan.className = 'flex-1 text-sm font-medium text-surface-700';

                    const deleteBtn = document.createElement('button');
                    deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                    deleteBtn.className = 'p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100';
                    deleteBtn.title = 'Elimina';

                    deleteBtn.addEventListener('click', () => {
                        Swal.fire({
                            title: 'Sei sicuro?',
                            text: `Vuoi eliminare il cliente "${doc.data().name}"?`,
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#ef4444',
                            cancelButtonColor: '#6b7280',
                            confirmButtonText: 'Sì, elimina!',
                            cancelButtonText: 'Annulla'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                db.collection('clients').doc(doc.id).delete()
                                    .then(() => {
                                        Swal.fire(
                                            'Eliminato!',
                                            'Il cliente è stato eliminato.',
                                            'success'
                                        );
                                        loadDataManagementClientList();
                                        loadClientsForSelect(document.getElementById('select-client-for-site'));
                                        loadClientsForSelect(document.getElementById('select-client-for-worktype'));
                                    })
                                    .catch(error => {
                                        console.error('Errore nell\'eliminazione del cliente:', error);
                                        showAlert('error', 'Errore', 'Si è verificato un errore durante l\'eliminazione del cliente.');
                                    });
                            }
                        });
                    });

                    li.appendChild(nameSpan);
                    li.appendChild(deleteBtn);
                    clientList.appendChild(li);
                });
            })
            .catch(error => {
                console.error('Errore nel caricamento dei clienti:', error);
                showAlert('error', 'Errore', 'Si è verificato un errore durante il caricamento dei clienti.');
            });
    }
}

/**
 * Funzione per caricare i Siti nelle liste o nei menu a tendina
 * @param {HTMLElement|null} selectElement - Elemento select da popolare
 * @param {string|null} clientId - ID del cliente per filtrare i siti
 */
function loadSites(selectElement = null, clientId = null) {
    if (selectElement && clientId) {
        // Popola il menu a tendina basato su clientId
        selectElement.innerHTML = '<option value="">--Seleziona Sito--</option>';
        db.collection('sites')
            .where('uid', '==', currentUser.uid)
            .where('clientId', '==', clientId)
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
                console.error('Errore nel caricamento dei siti:', error);
                showAlert('error', 'Errore', 'Si è verificato un errore durante il caricamento dei siti.');
            });
    } else {
        // Popola la lista nella Gestione Dati
        const siteListDiv = document.getElementById('site-list');
        siteListDiv.innerHTML = '';
        db.collection('clients')
            .where('uid', '==', currentUser.uid)
            .orderBy('name')
            .get()
            .then(clientSnapshot => {
                clientSnapshot.forEach(clientDoc => {
                    const clientData = clientDoc.data();
                    const clientId = clientDoc.id;
        
                    // Crea un div per la sezione del cliente
                    const clientSectionDiv = document.createElement('div');
                    clientSectionDiv.className = 'mb-4';
        
                    // Crea l'header per il Cliente con un pulsante di toggle
                    const clientHeaderDiv = document.createElement('div');
                    clientHeaderDiv.className = 'flex justify-between items-center';
        
                    const clientHeader = document.createElement('h5');
                    clientHeader.textContent = clientData.name;
                    clientHeader.className = 'text-sm font-semibold text-surface-800 mt-3';
        
                    const toggleSitesBtn = document.createElement('button');
                    toggleSitesBtn.className = 'text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors';
                    toggleSitesBtn.innerHTML = '<i class="fas fa-eye text-xs"></i> Mostra/Nascondi';
        
                    clientHeaderDiv.appendChild(clientHeader);
                    clientHeaderDiv.appendChild(toggleSitesBtn);
        
                    // Crea la lista dei Siti per questo Cliente
                    const siteUl = document.createElement('ul');
                    siteUl.className = 'mt-2 space-y-1';
                    siteUl.style.display = 'none'; // Nasconde i siti inizialmente
        
                    db.collection('sites')
                        .where('uid', '==', currentUser.uid)
                        .where('clientId', '==', clientId)
                        .orderBy('name')
                        .get()
                        .then(siteSnapshot => {
                            if (siteSnapshot.empty) {
                                const noSitesLi = document.createElement('li');
                                noSitesLi.textContent = 'Nessun sito associato.';
                                noSitesLi.className = 'text-sm text-surface-400 italic px-4 py-2';
                                siteUl.appendChild(noSitesLi);
                            } else {
                                siteSnapshot.forEach(siteDoc => {
                                    const siteData = siteDoc.data();
                                    const li = document.createElement('li');
                                    li.className = 'flex items-center justify-between px-4 py-2.5 bg-surface-50 rounded-lg group hover:bg-surface-100 transition-colors';
        
                                    const nameSpan = document.createElement('span');
                                    nameSpan.textContent = siteData.name;
                                    nameSpan.className = 'flex-1 text-sm text-surface-700';
        
                                    const deleteBtn = document.createElement('button');
                                    deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                                    deleteBtn.className = 'p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100';
                                    deleteBtn.title = 'Elimina';
        
                                    deleteBtn.addEventListener('click', () => {
                                        Swal.fire({
                                            title: 'Sei sicuro?',
                                            text: `Vuoi eliminare il sito "${siteData.name}"?`,
                                            icon: 'warning',
                                            showCancelButton: true,
                                            confirmButtonColor: '#ef4444',
                                            cancelButtonColor: '#6b7280',
                                            confirmButtonText: 'Sì, elimina!',
                                            cancelButtonText: 'Annulla'
                                        }).then((result) => {
                                            if (result.isConfirmed) {
                                                db.collection('sites').doc(siteDoc.id).delete()
                                                    .then(() => {
                                                        Swal.fire(
                                                            'Eliminato!',
                                                            'Il sito è stato eliminato.',
                                                            'success'
                                                        );
                                                        loadSites();
                                                    })
                                                    .catch(error => {
                                                        console.error('Errore nell\'eliminazione del sito:', error);
                                                        showAlert('error', 'Errore', 'Si è verificato un errore durante l\'eliminazione del sito.');
                                                    });
                                            }
                                        });
                                    });
        
                                    li.appendChild(nameSpan);
                                    li.appendChild(deleteBtn);
                                    siteUl.appendChild(li);
                                });
                            }
                        })
                        .catch(error => {
                            console.error('Errore nel caricamento dei siti:', error);
                            showAlert('error', 'Errore', 'Si è verificato un errore durante il caricamento dei siti.');
                        });
        
                    // Aggiungi l'event listener per il pulsante di toggle
                    toggleSitesBtn.addEventListener('click', () => {
                        if (siteUl.style.display === 'none' || siteUl.style.display === '') {
                            siteUl.style.display = 'block';
                        } else {
                            siteUl.style.display = 'none';
                        }
                    });
        
                    // Aggiungi l'header del cliente e la lista dei siti al div della sezione
                    clientSectionDiv.appendChild(clientHeaderDiv);
                    clientSectionDiv.appendChild(siteUl);
        
                    // Aggiungi il div della sezione cliente al div principale
                    siteListDiv.appendChild(clientSectionDiv);
                });
            })
            .catch(error => {
                console.error('Errore nel caricamento dei clienti per i siti:', error);
                showAlert('error', 'Errore', 'Si è verificato un errore durante il caricamento dei clienti.');
            });
    }
}

/**
 * Funzione per caricare i Tipi di Lavoro nelle liste o nei menu a tendina
 * @param {HTMLElement|null} selectElement - Elemento select da popolare
 * @param {string|null} clientId - ID del cliente per filtrare i tipi di lavoro
 */
function loadWorktypes(selectElement = null, clientId = null) {
    if (selectElement && clientId) {
        // Popola il menu a tendina basato su clientId
        selectElement.innerHTML = '<option value="">--Seleziona Tipo di Lavoro--</option>';
        db.collection('worktypes')
            .where('uid', '==', currentUser.uid)
            .where('clientId', '==', clientId)
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
                console.error('Errore nel caricamento dei tipi di lavoro:', error);
                showAlert('error', 'Errore', 'Si è verificato un errore durante il caricamento dei tipi di lavoro.');
            });
    } else {
        // Popola la lista nella Gestione Dati
        const worktypeListDiv = document.getElementById('worktype-list');
        worktypeListDiv.innerHTML = '';
        db.collection('clients')
            .where('uid', '==', currentUser.uid)
            .orderBy('name')
            .get()
            .then(clientSnapshot => {
                clientSnapshot.forEach(clientDoc => {
                    const clientData = clientDoc.data();
                    const clientId = clientDoc.id;
        
                    // Crea un div per la sezione del cliente
                    const clientSectionDiv = document.createElement('div');
                    clientSectionDiv.className = 'mb-4';
        
                    // Crea l'header per il Cliente con un pulsante di toggle
                    const clientHeaderDiv = document.createElement('div');
                    clientHeaderDiv.className = 'flex justify-between items-center';
        
                    const clientHeader = document.createElement('h5');
                    clientHeader.textContent = clientData.name;
                    clientHeader.className = 'text-sm font-semibold text-surface-800 mt-3';
        
                    const toggleWorktypesBtn = document.createElement('button');
                    toggleWorktypesBtn.className = 'text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors';
                    toggleWorktypesBtn.innerHTML = '<i class="fas fa-eye text-xs"></i> Mostra/Nascondi';
        
                    clientHeaderDiv.appendChild(clientHeader);
                    clientHeaderDiv.appendChild(toggleWorktypesBtn);
        
                    // Crea la lista dei Tipi di Lavoro per questo Cliente
                    const worktypeUl = document.createElement('ul');
                    worktypeUl.className = 'mt-2 space-y-1';
                    worktypeUl.style.display = 'none'; // Nasconde i tipi di lavoro inizialmente
        
                    db.collection('worktypes')
                        .where('uid', '==', currentUser.uid)
                        .where('clientId', '==', clientId)
                        .orderBy('name')
                        .get()
                        .then(worktypeSnapshot => {
                            if (worktypeSnapshot.empty) {
                                const noWorktypesLi = document.createElement('li');
                                noWorktypesLi.textContent = 'Nessun tipo di lavoro associato.';
                                noWorktypesLi.className = 'text-sm text-surface-400 italic px-4 py-2';
                                worktypeUl.appendChild(noWorktypesLi);
                            } else {
                                worktypeSnapshot.forEach(worktypeDoc => {
                                    const worktypeData = worktypeDoc.data();
                                    const li = document.createElement('li');
                                    li.className = 'flex items-center justify-between px-4 py-2.5 bg-surface-50 rounded-lg group hover:bg-surface-100 transition-colors';
        
                                    const nameSpan = document.createElement('span');
                                    nameSpan.className = 'flex-1 text-sm text-surface-700';
                                    nameSpan.innerHTML = `${worktypeData.name} <span class="text-xs text-surface-400 ml-2">${worktypeData.hourlyRate || 0} €/h</span>`;
        
                                    const deleteBtn = document.createElement('button');
                                    deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                                    deleteBtn.className = 'p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100';
                                    deleteBtn.title = 'Elimina';
        
                                    deleteBtn.addEventListener('click', () => {
                                        Swal.fire({
                                            title: 'Sei sicuro?',
                                            text: `Vuoi eliminare il tipo di lavoro "${worktypeData.name}"?`,
                                            icon: 'warning',
                                            showCancelButton: true,
                                            confirmButtonColor: '#ef4444',
                                            cancelButtonColor: '#6b7280',
                                            confirmButtonText: 'Sì, elimina!',
                                            cancelButtonText: 'Annulla'
                                        }).then((result) => {
                                            if (result.isConfirmed) {
                                                db.collection('worktypes').doc(worktypeDoc.id).delete()
                                                    .then(() => {
                                                        Swal.fire(
                                                            'Eliminato!',
                                                            'Il tipo di lavoro è stato eliminato.',
                                                            'success'
                                                        );
                                                        loadWorktypes();
                                                    })
                                                    .catch(error => {
                                                        console.error('Errore nell\'eliminazione del tipo di lavoro:', error);
                                                        showAlert('error', 'Errore', 'Si è verificato un errore durante l\'eliminazione del tipo di lavoro.');
                                                    });
                                            }
                                        });
                                    });
        
                                    li.appendChild(nameSpan);
                                    li.appendChild(deleteBtn);
                                    worktypeUl.appendChild(li);
                                });
                            }
                        })
                        .catch(error => {
                            console.error('Errore nel caricamento dei tipi di lavoro:', error);
                            showAlert('error', 'Errore', 'Si è verificato un errore durante il caricamento dei tipi di lavoro.');
                        });
        
                    // Aggiungi l'event listener per il pulsante di toggle
                    toggleWorktypesBtn.addEventListener('click', () => {
                        if (worktypeUl.style.display === 'none' || worktypeUl.style.display === '') {
                            worktypeUl.style.display = 'block';
                        } else {
                            worktypeUl.style.display = 'none';
                        }
                    });
        
                    // Aggiungi l'header del cliente e la lista dei tipi di lavoro al div della sezione
                    clientSectionDiv.appendChild(clientHeaderDiv);
                    clientSectionDiv.appendChild(worktypeUl);
        
                    // Aggiungi il div della sezione cliente al div principale
                    worktypeListDiv.appendChild(clientSectionDiv);
                });
            })
            .catch(error => {
                console.error('Errore nel caricamento dei clienti per i tipi di lavoro:', error);
                showAlert('error', 'Errore', 'Si è verificato un errore durante il caricamento dei clienti.');
            });
    }
}

/**
 * Inserimento dei template nel DOM
 */

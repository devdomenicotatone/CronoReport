// savedTimersEvents.js

// Variabili globali
window.displayedTimers = []; // Array per memorizzare i timer visualizzati (shared state)
let lastOperation = null;
let worktypeRates = {}; // Definiamo la variabile worktypeRates

// Funzione aggiornata per inizializzare gli eventi dei Timer Salvati
async function initializeSavedTimersEvents() {
    if (!currentUser) {
        console.error("currentUser non definito in initializeSavedTimersEvents. Interruzione.");
        return;
    }

    const savedTimersList = document.getElementById('savedTimersAccordion');
    if (!savedTimersList) {
        console.error("Elemento 'savedTimersAccordion' non trovato nel DOM.");
        return;
    }

    const filterTimersBtn = document.getElementById('filter-timers-btn');
    const unmarkActionSelect = document.getElementById('unmark-action-select');
    const applyActionBtn = document.getElementById('apply-action-btn');
    const undoActionBtn = document.getElementById('undo-action-btn');

    const searchTimersInput = document.getElementById('search-timers-input');
    const exportGoogleDocBtn = document.getElementById('export-google-doc-btn');
    const exportGoogleSheetBtn = document.getElementById('export-google-sheet-btn');

    // Abilita bottoni export se GAPI è pronto (i bottoni ora esistono nel DOM)
    maybeEnableButtons();

    console.log("Carico i clienti per il filtro...");
    await loadClientsForFilter();

    console.log("Carico le tariffe dei tipi di lavoro...");
    await loadWorktypeRates();

    if (filterTimersBtn) {
        filterTimersBtn.addEventListener('click', () => {
            console.log("Cliccato Filtra Timer");
            filterTimers();
        });
    }

    if (applyActionBtn) {
        applyActionBtn.addEventListener('click', () => {
            const selectedAction = unmarkActionSelect.value;
            console.log("Azione selezionata:", selectedAction);
            switch (selectedAction) {
                case 'unmark-all':
                    unmarkAllTimers();
                    break;
                case 'unmark-selected':
                    unmarkSelectedTimers();
                    break;
                case 'unmark-filtered':
                    unmarkFilteredTimers();
                    break;
                default:
                    Swal.fire({
                        icon: 'warning',
                        title: 'Attenzione',
                        text: 'Seleziona un\'azione da eseguire.',
                        confirmButtonText: 'OK'
                    });
                    break;
            }
        });
    }

    if (undoActionBtn) {
        undoActionBtn.addEventListener('click', () => {
            console.log("Cliccato Annulla Ultima Operazione");
            if (!lastOperation) {
                Swal.fire({
                    icon: 'info',
                    title: 'Nessuna Operazione da Annullare',
                    text: 'Non ci sono operazioni recenti da annullare.',
                    confirmButtonText: 'OK'
                });
                return;
            }

            switch (lastOperation.action) {
                case 'delete':
                    undoDeleteTimer(lastOperation.timerId);
                    break;
                case 'unmark':
                    undoUnmarkTimers(lastOperation.timerIds);
                    break;
                case 'deleteMonth':
                    undoDeleteMonth(lastOperation);
                    break;
                case 'deleteYear':
                    undoDeleteYear(lastOperation);
                    break;
                default:
                    Swal.fire({
                        icon: 'error',
                        title: 'Errore',
                        text: 'Operazione non riconosciuta.',
                        confirmButtonText: 'OK'
                    });
                    break;
            }
        });
    }

    if (searchTimersInput) {
        searchTimersInput.addEventListener('input', () => {
            const searchTerm = searchTimersInput.value.trim().toLowerCase();
            console.log("Ricerca timer con termine:", searchTerm);
            filterDisplayedTimers(searchTerm);
        });
    }

    if (exportGoogleDocBtn) {
        exportGoogleDocBtn.addEventListener('click', () => {
            console.log("Cliccato Esporta in Google Docs");
            exportTimersToGoogleDoc();
        });
    }

    if (exportGoogleSheetBtn) {
        exportGoogleSheetBtn.addEventListener('click', () => {
            console.log("Cliccato Esporta in Google Sheets");
            exportTimersToGoogleSheet();
        });
    }

    console.log("Carico tutti i timer salvati...");
    await loadSavedTimers(); // Assicurati che i timer e il DOM siano pronti

    // Carica gli anni disponibili per la Quick Filter Bar
    console.log("Carico gli anni disponibili per la Quick Filter Bar...");
    await loadAvailableYears();

    // === Quick Filter Bar: Event Listeners ===
    const qfYearContainer = document.getElementById('qf-year-chips');
    const qfMonthContainer = document.getElementById('qf-month-chips');

    if (qfYearContainer) {
        qfYearContainer.addEventListener('click', (e) => {
            const chip = e.target.closest('.qf-chip');
            if (!chip) return;
            const val = chip.dataset.year;
            if (val === 'all') {
                window.activeQuickYear = null;
                window.activeQuickMonth = null;
            } else {
                window.activeQuickYear = parseInt(val);
            }
            // Reset date inputs manuali per evitare conflitti
            const dateStart = document.getElementById('filter-date-start');
            const dateEnd = document.getElementById('filter-date-end');
            if (dateStart) dateStart.value = '';
            if (dateEnd) dateEnd.value = '';

            updateQuickFilterBar();
            loadSavedTimers(getCurrentFilters());
        });
    }

    if (qfMonthContainer) {
        qfMonthContainer.addEventListener('click', (e) => {
            const chip = e.target.closest('.qf-chip');
            if (!chip) return;
            const val = chip.dataset.month;
            if (val === 'all') {
                window.activeQuickMonth = null;
            } else {
                window.activeQuickMonth = parseInt(val);
                // Se non c'è un anno selezionato, usa l'anno corrente
                if (window.activeQuickYear === null) {
                    window.activeQuickYear = new Date().getFullYear();
                }
            }
            // Reset date inputs manuali
            const dateStart = document.getElementById('filter-date-start');
            const dateEnd = document.getElementById('filter-date-end');
            if (dateStart) dateStart.value = '';
            if (dateEnd) dateEnd.value = '';

            updateQuickFilterBar();
            loadSavedTimers(getCurrentFilters());
        });
    }

    // QUI aggiungiamo i listener ai pulsanti all'interno della modale, dopo che i timer sono caricati e il DOM è pronto
    const saveEditedBtn = document.getElementById('save-edited-saved-timer-btn');
    if (saveEditedBtn) {
        console.log("Aggiungo eventListener a #save-edited-saved-timer-btn");
        saveEditedBtn.addEventListener('click', () => {
            console.log("Cliccato bottone Salva Modifiche timer salvato");
            saveEditedSavedTimer();
        });
    } else {
        console.warn("Non ho trovato il pulsante #save-edited-saved-timer-btn nel DOM al termine di initializeSavedTimersEvents");
    }

    // Aggiungiamo il listener per il pulsante "Elimina Timer" allo stesso modo
    const deleteSavedTimerBtn = document.getElementById('delete-saved-timer-btn');
    if (deleteSavedTimerBtn) {
        console.log("Aggiungo eventListener a #delete-saved-timer-btn");
        deleteSavedTimerBtn.addEventListener('click', () => {
            const timerId = document.getElementById('edit-saved-timer-id').value.trim();
            if (!timerId) {
                Swal.fire({
                    icon: 'error',
                    title: 'Errore',
                    text: 'Impossibile trovare il timer da eliminare.',
                    confirmButtonText: 'OK'
                });
                return;
            }

            Swal.fire({
                title: 'Sei sicuro?',
                text: 'Vuoi eliminare questo timer? Sarà spostato nel cestino.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sì, elimina!',
                cancelButtonText: 'Annulla'
            }).then((result) => {
                if (result.isConfirmed) {
                    deleteTimerById(timerId);
                }
            });
        });
    } else {
        console.warn("Non ho trovato il pulsante #delete-saved-timer-btn nel DOM al termine di initializeSavedTimersEvents");
    }

    console.log("Fine initializeSavedTimersEvents");
}

// Funzione per caricare le tariffe dei tipi di lavoro
function loadWorktypeRates() {
    return db.collection('worktypes')
        .where('uid', '==', currentUser.uid)
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const worktypeData = doc.data();
                worktypeRates[doc.id] = worktypeData.hourlyRate || 0;
            });
            return worktypeRates; // Ritorna worktypeRates se necessario
        })
        .catch(error => {
            console.error('Errore nel caricamento delle tariffe dei tipi di lavoro:', error);
        });
}

function undoDeleteYear(operation) {
    const { clientName, year, timerIds, yearSection } = operation;
    const batch = db.batch();

    timerIds.forEach(timerId => {
        const timerRef = db.collection('timeLogs').doc(timerId);
        batch.update(timerRef, {
            isDeleted: false,
            deletedAt: null
        });
    });

    batch.commit().then(() => {
        // Re-inserisci la sezione dell'anno nell'interfaccia
        const clientSections = document.querySelectorAll('.cr-card');
        let inserted = false;

        clientSections.forEach(clientSection => {
            const clientHeader = clientSection.querySelector('button[data-cr-toggle]');
            if (clientHeader && clientHeader.textContent.trim() === clientName) {
                const clientBody = clientSection.querySelector('.cr-collapsible > div');
                if (clientBody) clientBody.appendChild(yearSection);
                inserted = true;
            }
        });

        if (!inserted) {
            // Se la sezione del cliente non esiste più, ricarica i timer
            loadSavedTimers(getCurrentFilters());
        }

        lastOperation = null;
        Swal.fire({
            icon: 'success',
            title: 'Operazione Annullata',
            text: `L'eliminazione dell'anno ${year} per il cliente ${clientName} è stata annullata.`,
            confirmButtonText: 'OK'
        });
    }).catch(error => {
        console.error('Errore durante l\'annullamento dell\'eliminazione dell\'anno:', error);
        Swal.fire({
            icon: 'error',
            title: 'Errore',
            text: 'Si è verificato un errore durante il ripristino dei timer.',
            confirmButtonText: 'OK'
        });
    });
}

function undoDeleteMonth(operation) {
    const { clientName, year, month, timerIds, monthSection } = operation;
    const batch = db.batch();

    timerIds.forEach(timerId => {
        const timerRef = db.collection('timeLogs').doc(timerId);
        batch.update(timerRef, {
            isDeleted: false,
            deletedAt: null
        });
    });

    batch.commit().then(() => {
        // Re-inserisci la sezione del mese nell'interfaccia
        const yearSections = document.querySelectorAll('.cr-card');
        let inserted = false;

        yearSections.forEach(yearSection => {
            const yearHeader = yearSection.querySelector('button[data-cr-toggle]');
            if (yearHeader && yearHeader.textContent.trim() === year) {
                const yearBody = yearSection.querySelector('.cr-collapsible > div');
                if (yearBody) yearBody.appendChild(monthSection);
                inserted = true;
            }
        });

        if (!inserted) {
            // Se la sezione dell'anno non esiste più, ricarica i timer
            loadSavedTimers(getCurrentFilters());
        }

        lastOperation = null;
        Swal.fire({
            icon: 'success',
            title: 'Operazione Annullata',
            text: `L'eliminazione del mese ${month} per l'anno ${year} è stata annullata.`,
            confirmButtonText: 'OK'
        });
    }).catch(error => {
        console.error('Errore durante l\'annullamento dell\'eliminazione del mese:', error);
        Swal.fire({
            icon: 'error',
            title: 'Errore',
            text: 'Si è verificato un errore durante il ripristino dei timer.',
            confirmButtonText: 'OK'
        });
    });
}

function deleteMonthTimers(clientName, year, month, monthSection) {
    Swal.fire({
        title: 'Sei sicuro?',
        text: `Vuoi eliminare tutti i timer del mese di ${getMonthName(parseInt(month))} ${year} per il cliente ${clientName}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sì, elimina!',
        cancelButtonText: 'Annulla'
    }).then((result) => {
        if (result.isConfirmed) {
            // Recupera tutti i timer del mese specificato per il cliente
            db.collection('timeLogs')
                .where('uid', '==', currentUser.uid)
                .where('isDeleted', '==', false)
                .where('clientName', '==', clientName)
                .get()
                .then(snapshot => {
                    const batch = db.batch();
                    const timerIds = [];

                    snapshot.forEach(doc => {
                        const logData = doc.data();
                        const startTime = logData.startTime.toDate();
                        const timerYear = startTime.getFullYear();
                        const timerMonth = String(startTime.getMonth() + 1).padStart(2, '0');

                        if (timerYear === parseInt(year) && timerMonth === month) {
                            const timerRef = db.collection('timeLogs').doc(doc.id);
                            batch.update(timerRef, {
                                isDeleted: true,
                                deletedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            timerIds.push(doc.id);
                        }
                    });

                    batch.commit().then(() => {
                        // Rimuovi la sezione del mese dall'interfaccia
                        monthSection.parentNode.removeChild(monthSection);

                        // Salva l'operazione per l'undo
                        lastOperation = {
                            action: 'deleteMonth',
                            clientName: clientName,
                            year: year,
                            month: month,
                            timerIds: timerIds,
                            monthSection: monthSection
                        };

                        Swal.fire({
                            icon: 'success',
                            title: 'Mese Eliminato',
                            text: `Tutti i timer del mese di ${getMonthName(parseInt(month))} ${year} per il cliente ${clientName} sono stati eliminati.`,
                            confirmButtonText: 'OK'
                        });
                    }).catch(error => {
                        console.error('Errore durante l\'eliminazione dei timer del mese:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Errore',
                            text: 'Si è verificato un errore durante l\'eliminazione dei timer.',
                            confirmButtonText: 'OK'
                        });
                    });
                }).catch(error => {
                    console.error('Errore durante il recupero dei timer del mese:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Errore',
                        text: 'Si è verificato un errore durante il recupero dei timer.',
                        confirmButtonText: 'OK'
                    });
                });
        }
    });
}

// Funzione per filtrare i timer salvati
function filterTimers() {
    const filters = getCurrentFilters();
    loadSavedTimers(filters);
}

// Funzione per filtrare i timer visualizzati in base al termine di ricerca
function filterDisplayedTimers(searchTerm) {
    if (searchTerm === '') {
        // Se il termine di ricerca è vuoto, mostra tutti i timer con i filtri correnti
        const filters = getCurrentFilters();
        loadSavedTimers(filters);
    } else {
        // Converti il termine di ricerca in minuscolo per un confronto case-insensitive
        const searchLower = searchTerm.toLowerCase();

        // Filtra displayedTimers in base al termine di ricerca
        const filteredTimers = displayedTimers.filter(timerObj => {
            const logData = timerObj.data;

            // Controlla se uno dei campi contiene il termine di ricerca
            return (
                (logData.clientName && logData.clientName.toLowerCase().includes(searchLower)) ||
                (logData.siteName && logData.siteName.toLowerCase().includes(searchLower)) ||
                (logData.worktypeName && logData.worktypeName.toLowerCase().includes(searchLower)) ||
                (logData.link && logData.link.toLowerCase().includes(searchLower)) ||
                (formatDateTime(logData.startTime).toLowerCase().includes(searchLower)) ||
                (formatDateTime(logData.endTime).toLowerCase().includes(searchLower))
            );
        });

        // Calcola gli importi non riscossi per i timer filtrati
        const unreportedAmounts = {};
        filteredTimers.forEach(timerObj => {
            const logData = timerObj.data;
            const clientName = logData.clientName || 'Cliente Sconosciuto';
            const worktypeId = logData.worktypeId;

            if (!logData.isReported) {
                const durationInHours = logData.duration / 3600;
                const hourlyRate = worktypeRates[worktypeId] || 0;
                const amount = durationInHours * hourlyRate;

                if (!unreportedAmounts[clientName]) {
                    unreportedAmounts[clientName] = 0;
                }
                unreportedAmounts[clientName] += amount;
            }
        });

        // Mostra i timer filtrati
        displayTimers(filteredTimers);

        // Visualizza gli importi non riscossi
        displayUnreportedAmounts(unreportedAmounts);
    }
}

// Funzione per esportare i timer in Google Docs
function exportTimersToGoogleDoc() {
    if (!gapiInited || !gisInited) {
        Swal.fire({
            icon: 'warning',
            title: 'Google API non pronta',
            text: 'Le API di Google non sono ancora caricate. Ricarica la pagina e riprova.',
            confirmButtonText: 'OK'
        });
        return;
    }
    if (displayedTimers.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Nessun Dato',
            text: 'Non ci sono timer da esportare.',
            confirmButtonText: 'OK'
        });
        return;
    }

    handleAuthClick(() => {
        proceedWithExportToGoogleDoc();
    });
}

function proceedWithExportToGoogleDoc() {
    // Genera il contenuto del report
    const reportContent = generateTimersReportContent(displayedTimers);

    // Genera un nome per il file
    const fileName = 'Storico Timer';

    createGoogleDoc(reportContent, fileName);
}

// Funzione per esportare i timer in Google Sheets
function exportTimersToGoogleSheet() {
    if (!gapiInited || !gisInited) {
        Swal.fire({
            icon: 'warning',
            title: 'Google API non pronta',
            text: 'Le API di Google non sono ancora caricate. Ricarica la pagina e riprova.',
            confirmButtonText: 'OK'
        });
        return;
    }
    if (displayedTimers.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Nessun Dato',
            text: 'Non ci sono timer da esportare.',
            confirmButtonText: 'OK'
        });
        return;
    }

    handleAuthClick(() => {
        proceedWithExportToGoogleSheet();
    });
}

function proceedWithExportToGoogleSheet() {
    // Genera l'array di valori
    const reportValues = generateTimersReportValues(displayedTimers);

    // Genera un nome per il file
    const fileName = 'Storico Timer';

    createGoogleSheet(reportValues, fileName);
}

// Funzione per generare il contenuto del report per Google Docs
function generateTimersReportContent(timers) {
    let content = 'Storico Timer\n\n';

    timers.forEach(timerObj => {
        const logData = timerObj.data;

        const clientName = logData.clientName || 'N/A';
        const siteName = logData.siteName || 'N/A';
        const worktypeName = logData.worktypeName || 'N/A';
        const duration = formatDuration(logData.duration);
        const startTime = formatDateTime(logData.startTime);
        const endTime = formatDateTime(logData.endTime);
        const link = logData.link || '';

        content += `Cliente: ${clientName}\n`;
        content += `Sito: ${siteName}\n`;
        content += `Tipo di Lavoro: ${worktypeName}\n`;
        content += `Durata: ${duration}\n`;
        content += `Inizio: ${startTime}\n`;
        content += `Fine: ${endTime}\n`;
        content += `Link: ${link}\n`;
        content += '\n';
    });

    return content;
}

// Funzione per generare i valori del report per Google Sheets
function generateTimersReportValues(timers) {
    const values = [];

    // Aggiungi la riga di intestazione
    values.push(['Cliente', 'Sito', 'Tipo di Lavoro', 'Durata', 'Inizio', 'Fine', 'Link']);

    timers.forEach(timerObj => {
        const logData = timerObj.data;

        const clientName = logData.clientName || 'N/A';
        const siteName = logData.siteName || 'N/A';
        const worktypeName = logData.worktypeName || 'N/A';
        const duration = formatDuration(logData.duration);
        const startTime = formatDateTime(logData.startTime);
        const endTime = formatDateTime(logData.endTime);
        const link = logData.link || '';

        values.push([clientName, siteName, worktypeName, duration, startTime, endTime, link]);
    });

    return values;
}

// Funzioni per creare il documento Google Docs
function createGoogleDoc(reportContent, fileName) {
    gapi.client.docs.documents.create({
        title: fileName
    }).then((response) => {
        const documentId = response.result.documentId;

        // Inserisci il contenuto nel documento
        insertContentIntoDoc(documentId, reportContent);
    }, (error) => {
        console.error('Errore durante la creazione del documento:', error);
    });
}

function insertContentIntoDoc(documentId, reportContent) {
    const requests = [];

    // Aggiungi il testo al documento
    requests.push({
        insertText: {
            location: {
                index: 1 // Inserisci dopo l'inizio del documento
            },
            text: reportContent
        }
    });

    gapi.client.docs.documents.batchUpdate({
        documentId: documentId,
        requests: requests
    }).then((response) => {
        console.log('Contenuto inserito nel documento:', response);
        // Apri il documento in una nuova scheda
        window.open(`https://docs.google.com/document/d/${documentId}/edit`, '_blank');
    }, (error) => {
        console.error('Errore durante l\'inserimento del contenuto:', error);
    });
}

// Funzioni per creare il foglio Google Sheets
function createGoogleSheet(reportValues, fileName) {
    gapi.client.sheets.spreadsheets.create({
        properties: {
            title: fileName
        }
    }).then((response) => {
        const spreadsheetId = response.result.spreadsheetId;
        const sheetName = response.result.sheets[0].properties.title;

        // Inserisci i dati nel foglio
        insertDataIntoSheet(spreadsheetId, sheetName, reportValues);
    }, (error) => {
        console.error('Errore durante la creazione del foglio di calcolo:', error);
    });
}

function insertDataIntoSheet(spreadsheetId, sheetName, reportValues) {
    const range = `${sheetName}!A1`;

    gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        values: reportValues
    }).then((response) => {
        console.log('Dati inseriti nel foglio di calcolo:', response);
        // Apri il foglio di calcolo in una nuova scheda
        window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, '_blank');
    }, (error) => {
        console.error('Errore durante l\'inserimento dei dati:', error);
    });
}

// Funzione per rimuovere il contrassegno a tutti i timer
function unmarkAllTimers() {
    Swal.fire({
        title: 'Sei sicuro?',
        text: 'Vuoi rimuovere il contrassegno da tutti i timer?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sì, rimuovi!',
        cancelButtonText: 'Annulla'
    }).then((result) => {
        if (result.isConfirmed) {
            db.collection('timeLogs')
                .where('uid', '==', currentUser.uid)
                .where('isDeleted', '==', false)
                .get()
                .then(snapshot => {
                    const timerIds = snapshot.docs.map(doc => doc.id);
                    unmarkTimers(timerIds);
                });
        }
    });
}

// Funzione per rimuovere il contrassegno ai timer selezionati
function unmarkSelectedTimers() {
    const selectedTimers = Array.from(document.querySelectorAll('.timer-checkbox:checked')).map(checkbox => checkbox.value);
    if (selectedTimers.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Attenzione',
            text: 'Seleziona almeno un timer per rimuovere il contrassegno.',
            confirmButtonText: 'OK'
        });
        return;
    }
    unmarkTimers(selectedTimers);
}

// Funzione per rimuovere il contrassegno ai timer filtrati
function unmarkFilteredTimers() {
    const timerIds = displayedTimers.map(timer => timer.id);
    if (timerIds.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Attenzione',
            text: 'Non ci sono timer filtrati da cui rimuovere il contrassegno.',
            confirmButtonText: 'OK'
        });
        return;
    }
    unmarkTimers(timerIds);
}

// Funzione per rimuovere il contrassegno ai timer specificati
function unmarkTimers(timerIds) {
    const batch = db.batch();
    timerIds.forEach(timerId => {
        const timerRef = db.collection('timeLogs').doc(timerId);
        batch.update(timerRef, { isReported: false });
    });

    batch.commit().then(() => {
        lastOperation = {
            action: 'unmark',
            timerIds: timerIds
        };
        Swal.fire({
            icon: 'success',
            title: 'Contrassegno Rimosso',
            text: 'Il contrassegno è stato rimosso dai timer selezionati.',
            confirmButtonText: 'OK'
        });
        // Aggiorna la visualizzazione
        loadSavedTimers(getCurrentFilters());
    }).catch(error => {
        console.error('Errore durante la rimozione del contrassegno:', error);
    });
}

// Funzione per annullare la rimozione del contrassegno
function undoUnmarkTimers(timerIds) {
    const batch = db.batch();
    timerIds.forEach(timerId => {
        const timerRef = db.collection('timeLogs').doc(timerId);
        batch.update(timerRef, { isReported: true });
    });

    batch.commit().then(() => {
        lastOperation = null;
        Swal.fire({
            icon: 'success',
            title: 'Operazione Annullata',
            text: 'La rimozione del contrassegno è stata annullata.',
            confirmButtonText: 'OK'
        });
        // Aggiorna la visualizzazione
        loadSavedTimers(getCurrentFilters());
    }).catch(error => {
        console.error('Errore durante l\'annullamento della rimozione del contrassegno:', error);
    });
}

// Funzione per annullare l'eliminazione di un timer
function undoDeleteTimer(timerId) {
    db.collection('timeLogs').doc(timerId).update({
        isDeleted: false,
        deletedAt: null
    }).then(() => {
        lastOperation = null;
        Swal.fire({
            icon: 'success',
            title: 'Timer Ripristinato',
            text: 'L\'eliminazione del timer è stata annullata.',
            confirmButtonText: 'OK'
        });
        // Aggiorna la visualizzazione
        loadSavedTimers(getCurrentFilters());
    }).catch(error => {
        console.error('Errore durante il ripristino del timer:', error);
    });
}

// Avvia l'inizializzazione dopo che l'utente è autenticato
firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        currentUser = user;
        initializeSavedTimersEvents();

        // Aggiungi l'event listener per il link al cestino
        const recycleBinLink = document.getElementById('recycle-bin-link');
        if (recycleBinLink) {
            recycleBinLink.addEventListener('click', (e) => {
                e.preventDefault(); // Previene il comportamento predefinito del link
                // Nascondi altre sezioni e mostra il cestino
                document.getElementById('saved-timers-section').style.display = 'none';
                document.getElementById('recycle-bin-section').style.display = 'block';
                loadRecycleBin();
            });
        }
    } else if (!DEV_MODE) {
        // L'utente non è autenticato, reindirizza alla pagina di login (solo in produzione)
        window.location.href = 'login.html';
    }
});
// === VITE MODULE: Registra globals ===
window.displayedTimers = displayedTimers;
window.createGoogleDoc = createGoogleDoc;
window.createGoogleSheet = createGoogleSheet;
window.deleteMonthTimers = deleteMonthTimers;
window.exportTimersToGoogleDoc = exportTimersToGoogleDoc;
window.exportTimersToGoogleSheet = exportTimersToGoogleSheet;
window.filterDisplayedTimers = filterDisplayedTimers;
window.filterTimers = filterTimers;
window.generateTimersReportContent = generateTimersReportContent;
window.generateTimersReportValues = generateTimersReportValues;
window.initializeSavedTimersEvents = initializeSavedTimersEvents;
window.insertContentIntoDoc = insertContentIntoDoc;
window.insertDataIntoSheet = insertDataIntoSheet;
window.loadWorktypeRates = loadWorktypeRates;
window.proceedWithExportToGoogleDoc = proceedWithExportToGoogleDoc;
window.proceedWithExportToGoogleSheet = proceedWithExportToGoogleSheet;
window.undoDeleteMonth = undoDeleteMonth;
window.undoDeleteTimer = undoDeleteTimer;
window.undoDeleteYear = undoDeleteYear;
window.undoUnmarkTimers = undoUnmarkTimers;
window.unmarkAllTimers = unmarkAllTimers;
window.unmarkFilteredTimers = unmarkFilteredTimers;
window.unmarkSelectedTimers = unmarkSelectedTimers;
window.unmarkTimers = unmarkTimers;
window.worktypeRates = worktypeRates;

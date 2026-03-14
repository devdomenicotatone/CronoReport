// savedTimersUI.js

// Template per la sezione Timer Salvati — Timeline View
const savedTimersTemplate = `
<div id="saved-timers-section" class="max-w-6xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <i class="fas fa-stopwatch text-white text-lg"></i>
            </div>
            <h2 class="text-2xl font-bold text-surface-800">Timer Salvati</h2>
        </div>
        <div class="flex flex-wrap gap-2">
            <button id="undo-action-btn" class="cr-btn cr-btn-sm bg-surface-100 hover:bg-surface-200 text-surface-600" title="Annulla ultima operazione">
                <i class="fas fa-undo"></i>
            </button>
            <button id="export-google-doc-btn" class="cr-btn cr-btn-sm bg-indigo-500 hover:bg-indigo-600 text-white" title="Esporta in Google Docs">
                <i class="fab fa-google-drive"></i><span class="hidden sm:inline ml-1">Docs</span>
            </button>
            <button id="export-google-sheet-btn" class="cr-btn cr-btn-sm bg-emerald-500 hover:bg-emerald-600 text-white" title="Esporta in Google Sheets">
                <i class="fas fa-table"></i><span class="hidden sm:inline ml-1">Sheets</span>
            </button>
        </div>
    </div>

    <!-- Stats Cards -->
    <div id="tl-stats-bar" class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div class="tl-stats-card">
            <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                    <i class="fas fa-coins text-amber-500"></i>
                </div>
                <div>
                    <div class="text-xs font-medium text-surface-400 uppercase tracking-wide">Non Riscosso</div>
                    <div id="tl-stat-unreported" class="text-lg font-bold text-surface-800">€ 0.00</div>
                </div>
            </div>
        </div>
        <div class="tl-stats-card">
            <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <i class="fas fa-clock text-indigo-500"></i>
                </div>
                <div>
                    <div class="text-xs font-medium text-surface-400 uppercase tracking-wide">Ore Totali</div>
                    <div id="tl-stat-hours" class="text-lg font-bold text-surface-800">00:00</div>
                </div>
            </div>
        </div>
        <div class="tl-stats-card">
            <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <i class="fas fa-layer-group text-emerald-500"></i>
                </div>
                <div>
                    <div class="text-xs font-medium text-surface-400 uppercase tracking-wide">Timer</div>
                    <div id="tl-stat-count" class="text-lg font-bold text-surface-800">0</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Toolbar Compatta: Cerca + Cliente + Azioni -->
    <div class="cr-card mb-5 overflow-hidden">
        <div class="p-3 sm:p-4">
            <div class="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                <!-- Cerca -->
                <div class="flex-1 min-w-0">
                    <input type="text" id="search-timers-input" class="cr-input" placeholder="🔍 Cerca timer...">
                </div>
                <!-- Cliente -->
                <div class="w-full sm:w-44">
                    <select id="filter-client" class="cr-select">
                        <option value="">Tutti i Clienti</option>
                    </select>
                </div>
                <!-- Azioni -->
                <div class="flex gap-2 flex-shrink-0">
                    <select id="unmark-action-select" class="cr-select text-sm flex-1 sm:flex-none" style="min-width: 0;">
                        <option value="">⚙ Azione...</option>
                        <option value="unmark-all">Segna Tutti Non Reportati</option>
                        <option value="unmark-selected">Segna Selezionati Non Reportati</option>
                        <option value="unmark-filtered">Segna Filtrati Non Reportati</option>
                    </select>
                    <button id="apply-action-btn" class="cr-btn cr-btn-sm bg-surface-700 hover:bg-surface-800 text-white" title="Applica azione">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Hidden date inputs per compatibilità con getCurrentFilters() -->
    <input type="hidden" id="filter-date-start" value="">
    <input type="hidden" id="filter-date-end" value="">
    <button id="filter-timers-btn" type="button" style="display:none;"></button>

    <!-- Timeline Container -->
    <div id="savedTimersAccordion" class="space-y-4">
        <!-- Timer timeline will be rendered here -->
    </div>

    <!-- Floating Quick Filter Bar -->
    <div id="quick-filter-bar" class="quick-filter-bar">
        <div class="qf-inner">
            <div class="qf-row">
                <span class="qf-label"><i class="fas fa-calendar-alt" style="margin-right: 4px;"></i>Anno</span>
                <div id="qf-year-chips" class="qf-chips">
                    <!-- Populated dynamically -->
                </div>
                <!-- Mese section: hidden by default, shown when a year is selected -->
                <div id="qf-month-section" class="qf-month-section" style="display: none;">
                    <div class="qf-divider"></div>
                    <span class="qf-label" style="min-width: auto;"><i class="fas fa-th" style="margin-right: 4px;"></i></span>
                    <div id="qf-month-chips" class="qf-chips qf-chips-scroll">
                        <!-- Populated dynamically based on actual data -->
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modal Promemoria -->
<div class="modal fade" id="setReminderModal" tabindex="-1" role="dialog" aria-labelledby="setReminderModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content" style="border:none; border-radius:1rem; overflow:hidden;">
      <div class="px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white flex justify-between items-center">
        <h5 class="font-semibold" id="setReminderModalLabel">Promemoria per <span id="modal-client-name"></span></h5>
        <button type="button" class="text-white/80 hover:text-white text-xl" data-cr-dismiss="modal" aria-label="Chiudi">&times;</button>
      </div>
      <div class="p-5 space-y-4">
        <form id="reminderForm" class="space-y-4">
          <div>
            <label for="reminder-amount" class="cr-label">Importo Obiettivo (€)</label>
            <input type="number" step="0.01" min="0" class="cr-input" id="reminder-amount" placeholder="Es: 1000">
          </div>
          <div>
            <label for="reminder-date" class="cr-label">Data Scadenza</label>
            <input type="date" class="cr-input" id="reminder-date">
          </div>
        </form>
      </div>
      <div class="px-5 py-3 bg-surface-50 flex justify-end gap-2 border-t border-surface-100">
        <button type="button" class="cr-btn bg-surface-200 hover:bg-surface-300 text-surface-600" data-cr-dismiss="modal">Annulla</button>
        <button type="button" class="cr-btn bg-indigo-500 hover:bg-indigo-600 text-white" id="save-reminder-btn">Salva</button>
      </div>
    </div>
  </div>
</div>

<!-- Modal Modifica Timer Salvato -->
<div class="modal fade" id="edit-saved-timer-modal" tabindex="-1" role="dialog" aria-labelledby="editSavedTimerModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content" style="border:none; border-radius:1rem; overflow:hidden;">
      <div class="px-5 py-3 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white flex justify-between items-center">
        <h5 class="font-semibold" id="editSavedTimerModalLabel">Modifica Timer Salvato</h5>
        <button type="button" class="text-white/80 hover:text-white text-xl" data-cr-dismiss="modal" aria-label="Chiudi">&times;</button>
      </div>
      <div class="p-5 space-y-4">
        <form id="edit-saved-timer-form" class="space-y-4">
          <input type="hidden" id="edit-saved-timer-id">

          <div>
            <label for="edit-saved-client-select" class="cr-label">Cliente</label>
            <select id="edit-saved-client-select" class="cr-select"></select>
          </div>
          <div>
            <label for="edit-saved-site-select" class="cr-label">Sito</label>
            <select id="edit-saved-site-select" class="cr-select"></select>
          </div>
          <div>
            <label for="edit-saved-worktype-select" class="cr-label">Tipo di Lavoro</label>
            <select id="edit-saved-worktype-select" class="cr-select"></select>
          </div>
          <div>
            <label for="edit-saved-link" class="cr-label">Link (opzionale)</label>
            <input type="url" id="edit-saved-link" class="cr-input" placeholder="https://esempio.com">
          </div>
          <div>
            <label for="edit-saved-duration" class="cr-label">Durata (hh:mm:ss)</label>
            <input type="text" id="edit-saved-duration" class="cr-input" placeholder="Es: 01:23:45">
            <p class="text-xs text-surface-400 mt-1">Formato: hh:mm:ss</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="edit-saved-start-time" class="cr-label">Data/Ora Inizio</label>
              <input type="text" id="edit-saved-start-time" class="cr-input" placeholder="DD/MM/YYYY HH:mm:ss">
            </div>
            <div>
              <label for="edit-saved-end-time" class="cr-label">Data/Ora Fine</label>
              <input type="text" id="edit-saved-end-time" class="cr-input" placeholder="DD/MM/YYYY HH:mm:ss">
            </div>
          </div>
        </form>
      </div>
      <div class="px-5 py-3 bg-surface-50 flex justify-between border-t border-surface-100">
        <button type="button" class="cr-btn bg-rose-500 hover:bg-rose-600 text-white" id="delete-saved-timer-btn">
            <i class="fas fa-trash-alt mr-1"></i>Elimina
        </button>
        <div class="flex gap-2">
          <button type="button" class="cr-btn bg-surface-200 hover:bg-surface-300 text-surface-600" data-cr-dismiss="modal">Annulla</button>
          <button type="button" class="cr-btn bg-indigo-500 hover:bg-indigo-600 text-white" id="save-edited-saved-timer-btn">Salva</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Sezione Cestino -->
<div id="recycle-bin-section" class="max-w-6xl mx-auto px-4 py-6" style="display: none;">
    <div class="flex items-center gap-3 mb-8">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
            <i class="fas fa-trash-alt text-white text-lg"></i>
        </div>
        <h2 class="text-2xl font-bold text-surface-800">Cestino</h2>
    </div>

    <!-- Tabs senza Bootstrap nav-tabs: custom Tailwind tabs -->
    <div class="flex gap-1 mb-4 border-b border-surface-200" id="recycleBinTabs" role="tablist">
        <button class="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors text-indigo-600 border-b-2 border-indigo-500 bg-white" 
                id="timers-tab" data-cr-tab="timers" role="tab">
            <i class="fas fa-stopwatch mr-1.5"></i>Timer Eliminati
        </button>
        <button class="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors text-surface-500 hover:text-surface-700" 
                id="reports-tab" data-cr-tab="reports" role="tab">
            <i class="fas fa-file-alt mr-1.5"></i>Report Eliminati
        </button>
    </div>

    <div id="recycleBinTabsContent">
        <!-- Tab Timer Eliminati -->
        <div id="timers" role="tabpanel" aria-labelledby="timers-tab">
            <div id="recycle-bin-timers" class="mt-4">
                <!-- I timer eliminati saranno caricati qui -->
            </div>
        </div>

        <!-- Tab Report Eliminati -->
        <div id="reports" role="tabpanel" aria-labelledby="reports-tab" style="display:none;">
            <div id="recycle-bin-reports" class="mt-4">
                <!-- I report eliminati saranno caricati qui -->
            </div>
        </div>
    </div>
</div>
`;

// Inserisci il template nel DOM
const savedTimersDiv = document.createElement('div');
savedTimersDiv.id = 'saved-timers-template';
savedTimersDiv.style.display = 'none'; // Nascondi il template
savedTimersDiv.innerHTML = savedTimersTemplate;
document.body.appendChild(savedTimersDiv);

function deleteTimerById(timerId) {
    const timerRef = db.collection('timeLogs').doc(timerId);
    timerRef.update({
        isDeleted: true,
        deletedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'Timer Eliminato',
            text: 'Il timer è stato spostato nel cestino.',
            confirmButtonText: 'OK'
        });
        // Chiudi la modale
        CrModal.hide('edit-saved-timer-modal');
        // Ricarica la lista dei timer salvati per riflettere il cambiamento
        const filters = getCurrentFilters();
        loadSavedTimers(filters);
    }).catch(error => {
        console.error('Errore durante l\'eliminazione del timer:', error);
        Swal.fire({
            icon: 'error',
            title: 'Errore',
            text: 'Si è verificato un errore durante l\'eliminazione del timer.',
            confirmButtonText: 'OK'
        });
    });
}

// Funzione per creare l'elemento HTML di un timer salvato come riga di tabella
function createTimerRow(timerId, logData, isRecycleBin = false) {
    const row = document.createElement('tr');

    // Se NON siamo nel cestino, creiamo la colonna checkbox
    if (!isRecycleBin) {
        const checkboxCell = document.createElement('td');
        checkboxCell.className = 'text-center align-middle';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'w-4 h-4 accent-indigo-500 timer-checkbox';
        checkbox.value = timerId;
        checkbox.id = 'checkbox-' + timerId;
        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);
    }
    // Se isRecycleBin è true non creiamo affatto questa colonna,
    // così la tabella è allineata correttamente con le intestazioni.

    const siteCell = document.createElement('td');
    siteCell.innerHTML = `<i class="fas fa-building mr-2"></i>${logData.siteName || 'Sito Sconosciuto'}`;
    row.appendChild(siteCell);

    const worktypeCell = document.createElement('td');
    worktypeCell.innerHTML = `<i class="fas fa-briefcase mr-2"></i>${logData.worktypeName || 'N/A'}`;
    row.appendChild(worktypeCell);

    const durationCell = document.createElement('td');
    durationCell.innerHTML = `<i class="fas fa-clock mr-2"></i>${formatDuration(logData.duration)}`;
    row.appendChild(durationCell);

    const timeCell = document.createElement('td');
    const startFormatted = logData.startTime ? formatTimeWithSeconds(logData.startTime) : 'N/A';
    const endFormatted = logData.endTime ? formatTimeWithSeconds(logData.endTime) : 'N/A';
    timeCell.innerHTML = `
        <i class="fas fa-play mr-1 text-success"></i> ${startFormatted} 
        | 
        <i class="fas fa-stop mr-1 text-danger"></i> ${endFormatted}
    `;
    row.appendChild(timeCell);

    const linkCell = document.createElement('td');
    if (logData.link) {
        const linkElement = document.createElement('a');
        linkElement.href = logData.link;
        linkElement.target = '_blank';
        linkElement.innerHTML = '<i class="fas fa-external-link-alt mr-1"></i>';
        linkCell.appendChild(linkElement);
    } else {
        linkCell.textContent = 'N/A';
    }
    row.appendChild(linkCell);

    const statusCell = document.createElement('td');
    statusCell.className = 'text-center align-middle';
    if (logData.isReported) {
        const checkmarkIcon = document.createElement('i');
        checkmarkIcon.className = 'fas fa-check-circle text-emerald-500';
        statusCell.appendChild(checkmarkIcon);
    } else {
        const pendingIcon = document.createElement('i');
        pendingIcon.className = 'fas fa-hourglass-half text-amber-500';
        statusCell.appendChild(pendingIcon);
    }
    row.appendChild(statusCell);

    const actionCell = document.createElement('td');
    actionCell.className = 'text-center align-middle';

    if (isRecycleBin) {
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'cr-btn cr-btn-sm bg-emerald-500 hover:bg-emerald-600 text-white';
        restoreBtn.innerHTML = '<i class="fas fa-undo mr-1"></i> Ripristina';
        restoreBtn.addEventListener('click', () => {
            restoreTimer(timerId, row);
        });
        actionCell.appendChild(restoreBtn);
    } else {
        const editBtn = document.createElement('button');
        editBtn.className = 'cr-btn cr-btn-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700';
        editBtn.title = 'Modifica Timer';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.addEventListener('click', () => {
            openEditSavedTimerModal(timerId);
        });
        actionCell.appendChild(editBtn);
    }

    row.appendChild(actionCell);

    return row;
}

function loadAllSitesForSavedTimerSelect(selectElement, clientId, selectedSiteId) {
    selectElement.innerHTML = '<option value="">--Seleziona Sito--</option>';
    return db.collection('sites')
        .where('uid', '==', currentUser.uid)
        .where('clientId', '==', clientId)
        .orderBy('name')
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = doc.data().name;
                selectElement.appendChild(opt);
            });
            if (selectedSiteId) {
                selectElement.value = selectedSiteId;
            }
        });
}

function loadAllWorktypesForSavedTimerSelect(selectElement, clientId, selectedWorktypeId) {
    selectElement.innerHTML = '<option value="">--Seleziona Tipo di Lavoro--</option>';
    return db.collection('worktypes')
        .where('uid', '==', currentUser.uid)
        .where('clientId', '==', clientId)
        .orderBy('name')
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = doc.data().name;
                selectElement.appendChild(opt);
            });
            if (selectedWorktypeId) {
                selectElement.value = selectedWorktypeId;
            }
        });
}

function attachSavedTimersListeners() {
    const saveEditedBtn = document.getElementById('save-edited-saved-timer-btn');
    if (saveEditedBtn) {
        console.log("Aggancio eventListener a #save-edited-saved-timer-btn");
        saveEditedBtn.addEventListener('click', () => {
            console.log("Cliccato bottone Salva Modifiche timer salvato");
            saveEditedSavedTimer();
        });
    } else {
        console.error("Non ho trovato #save-edited-saved-timer-btn nel DOM");
    }
}

function initializeSavedTimersSection() {
    initializeSavedTimersEvents();
    attachSavedTimersListeners();
}

// Funzioni di supporto per caricare i dati nelle select della modale di modifica timer salvato
function loadAllClientsForEditSelect(selectElement, selectedClientId) {
    return db.collection('clients')
        .where('uid', '==', currentUser.uid)
        .orderBy('name')
        .get()
        .then(snapshot => {
            selectElement.innerHTML = '<option value="">--Seleziona Cliente--</option>';
            snapshot.forEach(doc => {
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = doc.data().name;
                selectElement.appendChild(opt);
            });
            if (selectedClientId) {
                selectElement.value = selectedClientId;
            }
        });
}

function loadAllSitesForEditSelect(selectElement, clientId, selectedSiteId) {
    selectElement.innerHTML = '<option value="">--Seleziona Sito--</option>';
    return db.collection('sites')
        .where('uid', '==', currentUser.uid)
        .where('clientId', '==', clientId)
        .orderBy('name')
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = doc.data().name;
                selectElement.appendChild(opt);
            });
            if (selectedSiteId) {
                selectElement.value = selectedSiteId;
            }
        });
}

function loadAllWorktypesForEditSelect(selectElement, clientId, selectedWorktypeId) {
    selectElement.innerHTML = '<option value="">--Seleziona Tipo di Lavoro--</option>';
    return db.collection('worktypes')
        .where('uid', '==', currentUser.uid)
        .where('clientId', '==', clientId)
        .orderBy('name')
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = doc.data().name;
                selectElement.appendChild(opt);
            });
            if (selectedWorktypeId) {
                selectElement.value = selectedWorktypeId;
            }
        });
}

// Funzione per aprire la modale di modifica di un timer salvato
function openEditSavedTimerModal(timerId) {
    console.log("openEditSavedTimerModal chiamata con timerId:", timerId);
    const timerObj = displayedTimers.find(t => t.id === timerId);
    if (!timerObj) {
        console.error("Nessun timer trovato con ID:", timerId);
        return;
    }

    const logData = timerObj.data;
    document.getElementById('edit-saved-timer-id').value = timerId;

    const clientSelect = document.getElementById('edit-saved-client-select');
    const siteSelect = document.getElementById('edit-saved-site-select');
    const worktypeSelect = document.getElementById('edit-saved-worktype-select');

    const clientId = logData.clientId || '';
    const siteId = logData.siteId || '';
    const worktypeId = logData.worktypeId || '';

    // Carichiamo i clienti, poi siti e poi worktypes
    loadAllClientsForEditSelect(clientSelect, clientId)
      .then(() => loadAllSitesForEditSelect(siteSelect, clientId, siteId))
      .then(() => loadAllWorktypesForEditSelect(worktypeSelect, clientId, worktypeId))
      .catch(error => console.error('Errore nel caricamento dati per la modale di modifica (saved):', error));

    document.getElementById('edit-saved-link').value = logData.link || '';
    document.getElementById('edit-saved-duration').value = secondsToHHMMSS(logData.duration || 0);

    const startStr = logData.startTime ? formatLocalDateTime(logData.startTime.toDate()) : '';
    document.getElementById('edit-saved-start-time').value = startStr;

    if (logData.endTime) {
        document.getElementById('edit-saved-end-time').value = formatLocalDateTime(logData.endTime.toDate());
    } else {
        document.getElementById('edit-saved-end-time').value = '';
    }

    // Inizializza flatpickr per i campi data/ora della modale
    flatpickr('#edit-saved-start-time', {
        enableTime: true,
        enableSeconds: true,
        time_24hr: true,
        dateFormat: "d/m/Y H:i:S",
        locale: "it"
    });

    flatpickr('#edit-saved-end-time', {
        enableTime: true,
        enableSeconds: true,
        time_24hr: true,
        dateFormat: "d/m/Y H:i:S",
        locale: "it"
    });

    // Aggiungiamo un event listener per il cambio del cliente
    clientSelect.addEventListener('change', () => {
        const newClientId = clientSelect.value;
        // Quando cambia il cliente, ricarichiamo i siti e i tipi di lavoro
        loadAllSitesForEditSelect(siteSelect, newClientId, '')
          .then(() => loadAllWorktypesForEditSelect(worktypeSelect, newClientId, ''))
          .catch(error => console.error("Errore durante l'aggiornamento di siti e tipi di lavoro:", error));
    });

    CrModal.show('edit-saved-timer-modal');
}

function saveEditedSavedTimer() {
    console.log("Inizio saveEditedSavedTimer");
    const timerId = document.getElementById('edit-saved-timer-id').value.trim();
    const clientId = document.getElementById('edit-saved-client-select').value.trim();
    const siteId = document.getElementById('edit-saved-site-select').value.trim();
    const worktypeId = document.getElementById('edit-saved-worktype-select').value.trim();
    const link = document.getElementById('edit-saved-link').value.trim();
    const durationStr = document.getElementById('edit-saved-duration').value.trim();
    const startTimeStr = document.getElementById('edit-saved-start-time').value.trim();
    const endTimeStr = document.getElementById('edit-saved-end-time').value.trim();

    const durationSeconds = hhmmssToSeconds(durationStr);
    if (isNaN(durationSeconds)) {
        Swal.fire({
            icon: 'error',
            title: 'Errore',
            text: 'La durata inserita non è valida. Usa il formato hh:mm:ss.',
            confirmButtonText: 'OK'
        });
        return;
    }

    const newStartTime = startTimeStr ? parseLocalDateTime(startTimeStr) : null;
    if (startTimeStr && !newStartTime) {
        Swal.fire({
            icon: 'error',
            title: 'Errore',
            text: 'La data/ora di inizio non è valida.',
            confirmButtonText: 'OK'
        });
        return;
    }

    let newEndTime = null;
    if (endTimeStr) {
        newEndTime = parseLocalDateTime(endTimeStr);
        if (!newEndTime) {
            Swal.fire({
                icon: 'error',
                title: 'Errore',
                text: 'La data/ora di fine non è valida.',
                confirmButtonText: 'OK'
            });
            return;
        }
        if (newStartTime && newEndTime <= newStartTime) {
            Swal.fire({
                icon: 'error',
                title: 'Errore',
                text: 'La data/ora di fine deve essere successiva alla data/ora di inizio.',
                confirmButtonText: 'OK'
            });
            return;
        }
    }

    console.log("Cerco il timerObj in displayedTimers con id:", timerId);
    const timerObj = displayedTimers.find(t => t.id === timerId);
    if (!timerObj) {
        console.error("Nessun timer trovato con ID:", timerId);
        Swal.fire({
            icon: 'error',
            title: 'Errore',
            text: 'Impossibile trovare il timer da modificare. Riprova.',
            confirmButtonText: 'OK'
        });
        return;
    }

    console.log("Timer trovato:", timerObj);

    // Ricaviamo i nomi da client, site, worktype
    let clientName = 'Sconosciuto', siteName = 'Sconosciuto', worktypeName = 'N/A';
    db.collection('clients').doc(clientId).get().then(clientDoc => {
      if (clientDoc.exists) {
        clientName = clientDoc.data().name;
      }
      return db.collection('sites').doc(siteId).get();
    }).then(siteDoc => {
      if (siteDoc.exists) {
        siteName = siteDoc.data().name;
      }
      return db.collection('worktypes').doc(worktypeId).get();
    }).then(worktypeDoc => {
      let hourlyRate = 0;
      if (worktypeDoc.exists) {
        worktypeName = worktypeDoc.data().name || 'N/A';
        hourlyRate = worktypeDoc.data().hourlyRate || 0;
      }

      const updateData = {
          clientId: clientId,
          siteId: siteId,
          worktypeId: worktypeId,
          clientName: clientName,
          siteName: siteName,
          worktypeName: worktypeName,
          link: link || '',
          duration: durationSeconds
      };

      if (newStartTime) {
          updateData.startTime = firebase.firestore.Timestamp.fromDate(newStartTime);
      }
      if (newEndTime) {
          updateData.endTime = firebase.firestore.Timestamp.fromDate(newEndTime);
      } else {
          updateData.endTime = null;
      }

      console.log("Eseguo update su Firestore con:", updateData);

      return db.collection('timeLogs').doc(timerId).update(updateData);
    }).then(() => {
      console.log("Update completato con successo");
      Swal.fire({
          icon: 'success',
          title: 'Modifiche Salvate',
          text: 'Il timer è stato aggiornato con successo.',
          confirmButtonText: 'OK'
      });
      CrModal.hide('edit-saved-timer-modal');
      // Ricarica la lista dei timer per mostrare le modifiche
      loadSavedTimers(getCurrentFilters());
      console.log("Fine saveEditedSavedTimer");
    }).catch(error => {
      console.error('Errore nel salvataggio delle modifiche del timer:', error);
      Swal.fire({
          icon: 'error',
          title: 'Errore',
          text: 'Si è verificato un errore durante il salvataggio delle modifiche.',
          confirmButtonText: 'OK'
      });
    });
}

// Funzione per creare l'elemento HTML di un timer nel cestino come riga di tabella
function createRecycleBinRow(timerId, logData) {
    // Crea l'elemento riga (tr)
    const row = document.createElement('tr');

    // Colonna per Cliente e Sito con icona
    const clientCell = document.createElement('td');
    clientCell.innerHTML = `<i class="fas fa-building mr-2"></i>${logData.clientName} - ${logData.siteName}`;
    row.appendChild(clientCell);

    // Colonna per Tipo di Lavoro con icona
    const worktypeCell = document.createElement('td');
    worktypeCell.innerHTML = `<i class="fas fa-briefcase mr-2"></i>${logData.worktypeName || 'N/A'}`;
    row.appendChild(worktypeCell);

    // Colonna per Durata con icona
    const durationCell = document.createElement('td');
    durationCell.innerHTML = `<i class="fas fa-clock mr-2"></i>${formatDuration(logData.duration)}`;
    row.appendChild(durationCell);

    // Colonna per Orario di Inizio e Fine con formattazione
    const timeCell = document.createElement('td');
    timeCell.innerHTML = `
        <i class="fas fa-play mr-1 text-success"></i> ${formatDateTime(logData.startTime)}<br>
        <i class="fas fa-stop mr-1 text-danger"></i> ${formatDateTime(logData.endTime)}
    `;
    row.appendChild(timeCell);

    // Colonna per il Link/Note con icona
    const linkCell = document.createElement('td');
    if (logData.link) {
        const isUrl = /^https?:\/\//i.test(logData.link);
        if (isUrl) {
            const linkAnchor = document.createElement('a');
            linkAnchor.href = logData.link;
            linkAnchor.target = '_blank';
            linkAnchor.innerHTML = '<i class="fas fa-external-link-alt mr-1"></i>Apri Link';
            linkCell.appendChild(linkAnchor);
        } else {
            linkCell.innerHTML = `<span class="text-xs text-surface-400"><i class="fas fa-sticky-note mr-1"></i>${logData.link}</span>`;
        }
    } else {
        linkCell.textContent = '—';
    }
    row.appendChild(linkCell);

    // Colonna per le Azioni (Ripristina ed Elimina Definitivamente)
    const actionCell = document.createElement('td');
    actionCell.className = 'text-center align-middle';

    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'cr-btn cr-btn-sm bg-emerald-500 hover:bg-emerald-600 text-white mr-1';
    restoreBtn.title = 'Ripristina Timer';
    restoreBtn.innerHTML = '<i class="fas fa-undo"></i>';
    restoreBtn.addEventListener('click', () => {
        restoreTimer(timerId, row);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'cr-btn cr-btn-sm bg-rose-500 hover:bg-rose-600 text-white';
    deleteBtn.title = 'Elimina Definitivamente';
    deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
    deleteBtn.addEventListener('click', () => {
        permanentlyDeleteTimer(timerId, row);
    });

    actionCell.appendChild(restoreBtn);
    actionCell.appendChild(deleteBtn);
    row.appendChild(actionCell);

    return row;
}

// Funzione per ottenere il nome del mese
function getMonthName(monthNumber) {
    const months = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return months[monthNumber - 1];
}

// Funzione per formattare la durata in ore, minuti e secondi
function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const hrsDisplay = hrs > 0 ? (hrs < 10 ? '0' + hrs : hrs) + 'h ' : '00h ';
    const minsDisplay = mins > 0 ? (mins < 10 ? '0' + mins : mins) + 'm ' : '00m ';
    const secsDisplay = secs > 0 ? (secs < 10 ? '0' + secs : secs) + 's' : '00s';

    return hrsDisplay + minsDisplay + secsDisplay;
}

function padZero(num) {
    return num.toString().padStart(2, '0');
}

function formatTime(date) {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function formatTimeWithSeconds(timestamp) {
    const date = timestamp.toDate();
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatTimeShort(timestamp) {
    const date = timestamp.toDate();
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
    return date.toLocaleDateString('it-IT');
}

function formatDate(dateStr) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('it-IT', options);
}

// Funzione per formattare la data e l'ora
function formatDateTime(timestamp) {
    const date = timestamp.toDate();
    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
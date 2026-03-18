// savedTimersUI.js
import { CrModal } from './uiComponents.js';

// NOTE: le seguenti dipendenze circolari sono risolte con import() dinamico nei punti di utilizzo:
// - getCurrentFilters, loadSavedTimers da savedTimersData.js
// - loadSection, showAlert da main.js
// - restoreTimer, permanentlyDeleteTimer da recycleBinTimers.js
// - initializeSavedTimersEvents da savedTimersEvents.js

// Template per la sezione Timer Salvati — Timeline View
export const savedTimersTemplate = `
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
            <button id="export-csv-btn" class="st-export-btn" title="Esporta CSV">
                <i class="fas fa-file-csv text-emerald-500"></i><span class="hidden sm:inline">CSV</span>
            </button>
            <button id="export-pdf-btn" class="st-export-btn" title="Esporta PDF">
                <i class="fas fa-file-pdf text-rose-500"></i><span class="hidden sm:inline">PDF</span>
            </button>
            <button id="export-google-doc-btn" class="st-export-btn" title="Esporta in Google Docs">
                <i class="fab fa-google-drive text-indigo-500"></i><span class="hidden sm:inline">Docs</span>
            </button>
            <button id="export-google-sheet-btn" class="st-export-btn" title="Esporta in Google Sheets">
                <i class="fas fa-table text-emerald-600"></i><span class="hidden sm:inline">Sheets</span>
            </button>
        </div>
    </div>

    <!-- Stats Cards -->
    <div id="tl-stats-bar" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
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
                <div class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <i class="fas fa-wallet text-emerald-500"></i>
                </div>
                <div>
                    <div class="text-xs font-medium text-surface-400 uppercase tracking-wide">Guadagni</div>
                    <div id="tl-stat-earnings" class="text-lg font-bold text-emerald-600">€ 0.00</div>
                    <div id="tl-stat-earnings-delta" class="tl-stat-delta tl-stat-delta--neutral"></div>
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
                    <div id="tl-stat-hours-delta" class="tl-stat-delta tl-stat-delta--neutral"></div>
                </div>
            </div>
        </div>
        <div class="tl-stats-card">
            <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                    <i class="fas fa-layer-group text-purple-500"></i>
                </div>
                <div>
                    <div class="text-xs font-medium text-surface-400 uppercase tracking-wide">Timer</div>
                    <div id="tl-stat-count" class="text-lg font-bold text-surface-800">0</div>
                    <div id="tl-stat-count-delta" class="tl-stat-delta tl-stat-delta--neutral"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Toolbar Compatta: Cerca + Cliente + Filtri -->
    <div class="cr-card mb-5 overflow-hidden">
        <div class="p-3 sm:p-4">
            <div class="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center flex-wrap">
                <!-- Cerca -->
                <div class="flex-1 min-w-0">
                    <input type="text" id="search-timers-input" class="cr-input" placeholder="🔍 Cerca timer...">
                </div>
                <!-- Cliente -->
                <div class="w-full sm:w-40">
                    <select id="filter-client" class="cr-select">
                        <option value="">Tutti i Clienti</option>
                    </select>
                </div>
                <!-- Azioni (legacy, nascosto: sostituito dalla action bar contestuale) -->
                <div class="flex gap-2 flex-shrink-0 min-w-0" style="display:none;">
                    <select id="unmark-action-select" class="cr-select text-sm min-w-0 max-w-[180px]">
                        <option value="">⚙ Azione...</option>
                        <option value="unmark-all">Segna Tutti Non Reportati</option>
                        <option value="unmark-selected">Segna Selezionati Non Reportati</option>
                        <option value="unmark-filtered">Segna Filtrati Non Reportati</option>
                    </select>
                    <button id="apply-action-btn" class="cr-btn cr-btn-sm bg-surface-700 hover:bg-surface-800 text-white flex-shrink-0" title="Applica azione">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            </div>
            <!-- Filtro Stato -->
            <div id="st-filters-row" class="st-filters-row">
                <span class="st-filter-label">Stato</span>
                <button class="st-filter-chip st-filter-chip--active" data-filter-status="all">Tutti</button>
                <button class="st-filter-chip" data-filter-status="pending"><i class="fas fa-clock text-amber-400" style="font-size:0.625rem;"></i> Pending</button>
                <button class="st-filter-chip" data-filter-status="reported"><i class="fas fa-check-circle text-emerald-400" style="font-size:0.625rem;"></i> Reportati</button>
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

    <!-- Floating Contextual Action Bar -->
    <div id="st-action-bar" class="st-action-bar">
        <div class="st-action-bar__header">
            <div class="st-action-bar__count"><span id="st-selected-count">0</span> selezionati</div>
            <button class="st-action-bar__close" id="st-action-deselect" title="Deseleziona tutti">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="st-action-bar__actions">
            <button class="st-action-bar__btn st-action-bar__btn--success" id="st-action-mark-reported" title="Segna come Reportati">
                <i class="fas fa-check-circle"></i> <span>Reportati</span>
            </button>
            <button class="st-action-bar__btn" id="st-action-mark-unreported" title="Segna come Non Reportati">
                <i class="fas fa-clock"></i> <span>Pending</span>
            </button>
            <button class="st-action-bar__btn st-action-bar__btn--danger" id="st-action-delete" title="Elimina selezionati">
                <i class="fas fa-trash-alt"></i> <span>Elimina</span>
            </button>
            <button class="st-action-bar__btn st-action-bar__btn--primary" id="st-action-export" title="Esporta selezionati">
                <i class="fas fa-download"></i> <span>Esporta</span>
            </button>
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

// Il template viene inserito nel DOM da loadSection() in main.js
// NON creiamo una copia nascosta qui per evitare ID duplicati nel DOM.

export function deleteTimerById(timerId) {
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
        import('./savedTimersData.js').then(m => m.loadSavedTimers(m.getCurrentFilters()));
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
export function createTimerRow(timerId, logData, isRecycleBin = false) {
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

    const projectCell = document.createElement('td');
    projectCell.innerHTML = `<i class="fas fa-building mr-2"></i>${logData.projectName || 'Progetto Sconosciuto'}`;
    row.appendChild(projectCell);

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
            import('./recycleBinTimers.js').then(m => m.restoreTimer(timerId, row));
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

export function attachSavedTimersListeners() {
    // Inline editing — nessun listener modale necessario
}

export function initializeSavedTimersSection() {
    import('./savedTimersEvents.js').then(m => m.initializeSavedTimersEvents());
}





// Funzione per creare l'elemento HTML di un timer nel cestino come riga di tabella
export function createRecycleBinRow(timerId, logData) {
    // Crea l'elemento riga (tr)
    const row = document.createElement('tr');

    // Colonna per Cliente e Sito con icona
    const clientCell = document.createElement('td');
    clientCell.innerHTML = `<i class="fas fa-building mr-2"></i>${logData.clientName} - ${logData.projectName}`;
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
        import('./recycleBinTimers.js').then(m => m.restoreTimer(timerId, row));
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'cr-btn cr-btn-sm bg-rose-500 hover:bg-rose-600 text-white';
    deleteBtn.title = 'Elimina Definitivamente';
    deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
    deleteBtn.addEventListener('click', () => {
        import('./recycleBinTimers.js').then(m => m.permanentlyDeleteTimer(timerId, row));
    });

    actionCell.appendChild(restoreBtn);
    actionCell.appendChild(deleteBtn);
    row.appendChild(actionCell);

    return row;
}

// Funzione per ottenere il nome del mese
export function getMonthName(monthNumber) {
    const months = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return months[monthNumber - 1];
}

// Funzione per formattare la durata in ore, minuti e secondi
export function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const hrsDisplay = hrs > 0 ? (hrs < 10 ? '0' + hrs : hrs) + 'h ' : '00h ';
    const minsDisplay = mins > 0 ? (mins < 10 ? '0' + mins : mins) + 'm ' : '00m ';
    const secsDisplay = secs > 0 ? (secs < 10 ? '0' + secs : secs) + 's' : '00s';

    return hrsDisplay + minsDisplay + secsDisplay;
}

export function padZero(num) {
    return num.toString().padStart(2, '0');
}

export function formatTime(date) {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function formatTimeWithSeconds(timestamp) {
    const date = timestamp.toDate();
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatTimeShort(timestamp) {
    const date = timestamp.toDate();
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(dateInput) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return dateObj.toLocaleDateString('it-IT', options);
}

// Funzione per formattare la data e l'ora
export function formatDateTime(timestamp) {
    const date = timestamp.toDate();
    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}


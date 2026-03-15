// recycleBinTimers.js
import { formatTimeShort } from './savedTimersUI.js';
import { loadSavedTimers, getCurrentFilters } from './savedTimersData.js';

// Palette colori per badge (consistente con il resto)
const rbtColorPalette = [
    { bg: 'bg-rose-100', text: 'text-rose-700' },
    { bg: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    { bg: 'bg-purple-100', text: 'text-purple-700' },
    { bg: 'bg-teal-100', text: 'text-teal-700' },
    { bg: 'bg-orange-100', text: 'text-orange-700' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
];
const rbtColorMap = {};
let rbtColorIdx = 0;
function getRbtColor(name) {
    if (!rbtColorMap[name]) {
        rbtColorMap[name] = rbtColorPalette[rbtColorIdx % rbtColorPalette.length];
        rbtColorIdx++;
    }
    return rbtColorMap[name];
}

// Funzione per inizializzare gli eventi della sezione Cestino Timer
export function initializeRecycleBinTimersEvents() {
    const recycleBinTimersDiv = document.getElementById('recycle-bin-timers');

    // Aggiungi barra ricerca inline
    const searchBar = document.createElement('div');
    searchBar.className = 'cr-card mb-4 p-4';
    searchBar.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="flex-1 relative">
                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-300 text-sm"></i>
                <input type="text" id="search-recycle-timers-input" class="cr-input pl-9 text-sm" placeholder="Cerca tra i timer eliminati...">
            </div>
        </div>
    `;
    recycleBinTimersDiv.parentNode.insertBefore(searchBar, recycleBinTimersDiv);

    const searchInput = document.getElementById('search-recycle-timers-input');
    searchInput.addEventListener('input', () => {
        loadRecycleBinTimers(searchInput.value.trim());
    });

    // Carica i timer per la prima volta
    loadRecycleBinTimers();
}

export function loadRecycleBinTimers(searchTerm = '') {
    const recycleBinTimersDiv = document.getElementById('recycle-bin-timers');
    recycleBinTimersDiv.innerHTML = '';

    db.collection('timeLogs')
        .where('uid', '==', currentUser.uid)
        .where('isDeleted', '==', true)
        .orderBy('deletedAt', 'desc')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                recycleBinTimersDiv.innerHTML = `
                    <div class="text-center py-12">
                        <div class="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-stopwatch text-2xl text-surface-300"></i>
                        </div>
                        <p class="text-surface-400 font-medium">Cestino vuoto</p>
                        <p class="text-surface-300 text-sm mt-1">Nessun timer eliminato</p>
                    </div>
                `;
                return;
            }

            let timersArray = [];
            snapshot.forEach(doc => {
                timersArray.push({ id: doc.id, data: doc.data() });
            });

            // Filtra per ricerca
            if (searchTerm) {
                const lower = searchTerm.toLowerCase();
                timersArray = timersArray.filter(t => {
                    return Object.values(t.data).some(v => {
                        if (typeof v === 'string') return v.toLowerCase().includes(lower);
                        if (typeof v === 'number') return v.toString().includes(lower);
                        if (v && v.toDate) return v.toDate().toLocaleDateString().includes(lower);
                        return false;
                    });
                });
            }

            if (timersArray.length === 0) {
                recycleBinTimersDiv.innerHTML = `
                    <div class="text-center py-8 text-surface-400">
                        <i class="fas fa-search text-2xl mb-2 block text-surface-300"></i>
                        Nessun timer trovato per "${searchTerm}"
                    </div>
                `;
                return;
            }

            // === Raggruppa per cliente ===
            const timersByClient = {};
            timersArray.forEach(t => {
                const name = t.data.clientName || 'Cliente Sconosciuto';
                if (!timersByClient[name]) timersByClient[name] = [];
                timersByClient[name].push(t);
            });

            const sortedClients = Object.keys(timersByClient).sort((a, b) =>
                timersByClient[b].length - timersByClient[a].length
            );

            sortedClients.forEach(clientName => {
                const clientTimers = timersByClient[clientName];
                const color = getRbtColor(clientName);

                // Totale ore cliente
                const totalSeconds = clientTimers.reduce((sum, t) => sum + (t.data.duration || 0), 0);

                // --- Client Section ---
                const section = document.createElement('div');
                section.className = 'animate-slide-up';

                // Client Header
                const header = document.createElement('div');
                header.className = 'tl-day-header';
                header.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="tl-badge-client ${color.bg} ${color.text}" style="font-size: 0.8rem; padding: 4px 14px;">${clientName}</span>
                        <span class="text-xs text-surface-400">(${clientTimers.length} timer)</span>
                    </div>
                    <div class="flex items-center gap-3 text-sm">
                        <span class="flex items-center gap-1.5 text-surface-500">
                            <i class="fas fa-clock text-xs"></i>
                            <span class="font-mono font-semibold">${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0')}m</span>
                        </span>
                        <button class="rbt-restore-client-btn text-xs text-emerald-500 hover:text-emerald-700 transition-colors flex items-center gap-1" title="Ripristina tutti">
                            <i class="fas fa-undo text-xs"></i> Ripristina
                        </button>
                        <button class="rbt-delete-client-btn p-1.5 text-surface-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Elimina definitivamente tutti">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </div>
                `;

                // Ripristina tutti per cliente
                header.querySelector('.rbt-restore-client-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    Swal.fire({
                        title: 'Ripristinare tutti?',
                        text: `Ripristinare tutti i timer di "${clientName}"?`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#10b981',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: 'Sì, ripristina!',
                        cancelButtonText: 'Annulla'
                    }).then(result => {
                        if (result.isConfirmed) restoreClientTimers(clientName);
                    });
                });

                // Elimina definitivamente per cliente
                header.querySelector('.rbt-delete-client-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    Swal.fire({
                        title: 'Eliminare definitivamente?',
                        text: `Eliminare tutti i timer di "${clientName}"? Non potranno essere recuperati.`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#d33',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: 'Sì, elimina!',
                        cancelButtonText: 'Annulla'
                    }).then(result => {
                        if (result.isConfirmed) permanentlyDeleteClientTimers(clientName, section);
                    });
                });

                section.appendChild(header);

                // Timer Rows
                const list = document.createElement('div');
                list.className = 'space-y-1';

                // Ordina per data recente
                clientTimers.sort((a, b) => b.data.startTime.seconds - a.data.startTime.seconds);

                clientTimers.forEach(timerObj => {
                    const logData = timerObj.data;
                    const row = document.createElement('div');
                    row.className = 'tl-timer-row';

                    const content = document.createElement('div');
                    content.className = 'flex-1 min-w-0';

                    // === RIGA 1: Data + Progetto + Durata ===
                    const mainRow = document.createElement('div');
                    mainRow.className = 'flex items-center gap-3';

                    // Data
                    const dateSpan = document.createElement('span');
                    dateSpan.className = 'text-xs font-semibold text-surface-500 flex-shrink-0';
                    const startDate = logData.startTime.toDate();
                    dateSpan.textContent = startDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

                    // Project
                    const projectSpan = document.createElement('span');
                    projectSpan.className = 'text-sm font-medium text-surface-700 truncate';
                    projectSpan.textContent = logData.projectName || '—';

                    const spacer = document.createElement('span');
                    spacer.className = 'flex-1';

                    // Duration
                    const durationSpan = document.createElement('span');
                    durationSpan.className = 'font-mono text-base font-bold text-surface-800 flex-shrink-0';
                    const dur = logData.duration || 0;
                    durationSpan.textContent = `${Math.floor(dur / 3600)}h ${Math.floor((dur % 3600) / 60).toString().padStart(2, '0')}m`;

                    mainRow.appendChild(dateSpan);
                    mainRow.appendChild(projectSpan);
                    mainRow.appendChild(spacer);
                    mainRow.appendChild(durationSpan);

                    // === RIGA 2: Tipo lavoro · Orari · Azioni ===
                    const detailRow = document.createElement('div');
                    detailRow.className = 'flex items-center gap-3 mt-1';

                    const worktypeSpan = document.createElement('span');
                    worktypeSpan.className = 'text-xs text-surface-400';
                    worktypeSpan.textContent = logData.worktypeName || '';
                    detailRow.appendChild(worktypeSpan);

                    if (logData.worktypeName) {
                        const sep = document.createElement('span');
                        sep.className = 'text-surface-200';
                        sep.textContent = '·';
                        detailRow.appendChild(sep);
                    }

                    const timesSpan = document.createElement('span');
                    timesSpan.className = 'text-xs text-surface-400';
                    const startH = logData.startTime ? formatTimeShort(logData.startTime) : '—';
                    const endH = logData.endTime ? formatTimeShort(logData.endTime) : '—';
                    timesSpan.textContent = `${startH} – ${endH}`;
                    detailRow.appendChild(timesSpan);

                    const spacer2 = document.createElement('span');
                    spacer2.className = 'flex-1';
                    detailRow.appendChild(spacer2);

                    // Ripristina
                    const restoreBtn = document.createElement('button');
                    restoreBtn.className = 'text-xs text-emerald-500 hover:text-emerald-700 transition-colors flex items-center gap-1';
                    restoreBtn.innerHTML = '<i class="fas fa-undo"></i> Ripristina';
                    restoreBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        restoreTimer(timerObj.id, row);
                    });
                    detailRow.appendChild(restoreBtn);

                    // Elimina definitivamente
                    const delBtn = document.createElement('button');
                    delBtn.className = 'tl-edit-btn ml-1';
                    delBtn.title = 'Elimina definitivamente';
                    delBtn.innerHTML = '<i class="fas fa-trash-alt text-xs"></i>';
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        permanentlyDeleteTimer(timerObj.id, row);
                    });
                    detailRow.appendChild(delBtn);

                    content.appendChild(mainRow);
                    content.appendChild(detailRow);
                    row.appendChild(content);
                    list.appendChild(row);
                });

                section.appendChild(list);
                recycleBinTimersDiv.appendChild(section);
            });
        })
        .catch(error => {
            console.error('Errore nel caricamento del cestino:', error);
        });
}

// Ripristina un singolo timer
export function restoreTimer(timerId, rowElement) {
    db.collection('timeLogs').doc(timerId).update({
        isDeleted: false,
        deletedAt: firebase.firestore.FieldValue.delete()
    }).then(() => {
        rowElement.remove();
        Swal.fire({ icon: 'success', title: 'Ripristinato!', text: 'Timer ripristinato con successo.', confirmButtonText: 'OK' });
    }).catch(error => {
        console.error('Errore ripristino timer:', error);
    });
}

// Ripristina tutti i timer di un cliente
export function restoreClientTimers(clientName) {
    db.collection('timeLogs')
        .where('uid', '==', currentUser.uid)
        .where('isDeleted', '==', true)
        .where('clientName', '==', clientName)
        .get()
        .then(snapshot => {
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.update(doc.ref, { isDeleted: false, deletedAt: firebase.firestore.FieldValue.delete() });
            });
            return batch.commit();
        })
        .then(() => {
            Swal.fire({ icon: 'success', title: 'Ripristinati!', text: `Tutti i timer di "${clientName}" ripristinati.`, confirmButtonText: 'OK' });
            loadRecycleBinTimers();
        })
        .catch(error => {
            console.error('Errore ripristino timer cliente:', error);
        });
}

// Funzione per "eliminare" un timer salvato (spostandolo nel cestino)
export function deleteTimer(timerId, barElement) {
    Swal.fire({
        title: 'Sei sicuro?', text: 'Il timer sarà spostato nel cestino.',
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#d33', cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sì, elimina!', cancelButtonText: 'Annulla'
    }).then(result => {
        if (result.isConfirmed) {
            db.collection('timeLogs').doc(timerId).update({
                isDeleted: true,
                deletedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                barElement.remove();
                lastOperation = { action: 'delete', timerId: timerId };
                Swal.fire({ icon: 'success', title: 'Timer Eliminato', text: 'Spostato nel cestino.', confirmButtonText: 'OK' });
            }).catch(error => {
                console.error('Errore eliminazione:', error);
            });
        }
    });
}

// Annulla eliminazione
export function undoDeleteTimer(timerId) {
    db.collection('timeLogs').doc(timerId).update({
        isDeleted: false,
        deletedAt: firebase.firestore.FieldValue.delete()
    }).then(() => {
        lastOperation = null;
        Swal.fire({ icon: 'success', title: 'Annullato', text: 'Il timer è stato ripristinato.', confirmButtonText: 'OK' });
        loadSavedTimers(getCurrentFilters());
    }).catch(error => {
        console.error('Errore annullamento:', error);
    });
}

// Elimina definitivamente un singolo timer
export function permanentlyDeleteTimer(timerId, rowElement) {
    Swal.fire({
        title: 'Eliminare definitivamente?', text: 'Non potrà essere recuperato.',
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#d33', cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sì, elimina!', cancelButtonText: 'Annulla'
    }).then(result => {
        if (result.isConfirmed) {
            db.collection('timeLogs').doc(timerId).delete().then(() => {
                rowElement.remove();
                Swal.fire({ icon: 'success', title: 'Eliminato!', text: 'Timer eliminato definitivamente.', confirmButtonText: 'OK' });
            }).catch(error => {
                console.error('Errore eliminazione:', error);
            });
        }
    });
}

// Elimina definitivamente tutti i timer di un cliente
export function permanentlyDeleteClientTimers(clientName, sectionElement) {
    db.collection('timeLogs')
        .where('uid', '==', currentUser.uid)
        .where('isDeleted', '==', true)
        .where('clientName', '==', clientName)
        .get()
        .then(snapshot => {
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            return batch.commit();
        })
        .then(() => {
            sectionElement.remove();
            Swal.fire({ icon: 'success', title: 'Eliminati!', text: `Tutti i timer di "${clientName}" eliminati definitivamente.`, confirmButtonText: 'OK' });
        })
        .catch(error => {
            console.error('Errore eliminazione cliente:', error);
        });
}


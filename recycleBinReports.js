// recycleBinReports.js

const recycleBinTemplate = `
<div id="recycle-bin-section" class="max-w-6xl mx-auto px-4 py-6">
    <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                <i class="fas fa-trash-alt text-white text-lg"></i>
            </div>
            <h2 class="text-2xl font-bold text-surface-800">Cestino</h2>
        </div>
    </div>

    <!-- Tab navigation premium -->
    <div class="flex gap-1 bg-surface-100 rounded-xl p-1 mb-6" id="recycleBinTabs" role="tablist">
        <button class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-indigo-600 border-b-2 border-indigo-500 bg-white shadow-sm"
                id="timers-tab" data-cr-tab="timers" role="tab">
            <i class="fas fa-stopwatch text-xs"></i> Timer Eliminati
        </button>
        <button class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-surface-500 hover:text-surface-700 hover:bg-white/50"
                id="reports-tab" data-cr-tab="reports" role="tab">
            <i class="fas fa-file-alt text-xs"></i> Report Eliminati
        </button>
    </div>

    <!-- Tab Timer Eliminati -->
    <div id="timers" data-cr-panel role="tabpanel">
        <div id="recycle-bin-timers">
            <!-- I timer eliminati saranno caricati qui -->
        </div>
    </div>

    <!-- Tab Report Eliminati -->
    <div id="reports" data-cr-panel role="tabpanel" style="display:none;">
        <!-- Barra ricerca -->
        <div class="cr-card mb-4 p-4">
            <div class="flex items-center gap-3">
                <div class="flex-1 relative">
                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-300 text-sm"></i>
                    <input type="text" id="search-recycle-reports-input" class="cr-input pl-9 text-sm" placeholder="Cerca nei report eliminati...">
                </div>
            </div>
        </div>
        <div id="recycle-bin-reports">
            <!-- I report eliminati saranno caricati qui -->
        </div>
    </div>
</div>
`;

// Palette colori per badge (stile consistente)
const rbColorPalette = [
    { bg: 'bg-rose-100', text: 'text-rose-700' },
    { bg: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    { bg: 'bg-purple-100', text: 'text-purple-700' },
    { bg: 'bg-teal-100', text: 'text-teal-700' },
    { bg: 'bg-orange-100', text: 'text-orange-700' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
];
const rbColorMap = {};
let rbColorIdx = 0;
function getRbColor(name) {
    if (!rbColorMap[name]) {
        rbColorMap[name] = rbColorPalette[rbColorIdx % rbColorPalette.length];
        rbColorIdx++;
    }
    return rbColorMap[name];
}

// Funzione per inizializzare gli eventi della sezione Cestino Report
function initializeRecycleBinReportsEvents() {
    const searchInput = document.getElementById('search-recycle-reports-input');

    searchInput.addEventListener('input', () => {
        loadRecycleBinReports(searchInput.value.trim());
    });

    // Carica i report per la prima volta
    loadRecycleBinReports();
}

function loadRecycleBinReports(searchTerm = '') {
    const recycleBinReportsDiv = document.getElementById('recycle-bin-reports');
    recycleBinReportsDiv.innerHTML = '';

    db.collection('reports')
        .where('uid', '==', currentUser.uid)
        .where('isDeleted', '==', true)
        .orderBy('deletedAt', 'desc')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                recycleBinReportsDiv.innerHTML = `
                    <div class="text-center py-12">
                        <div class="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-trash text-2xl text-surface-300"></i>
                        </div>
                        <p class="text-surface-400 font-medium">Cestino vuoto</p>
                        <p class="text-surface-300 text-sm mt-1">Nessun report eliminato</p>
                    </div>
                `;
                return;
            }

            // Raccogli i report
            let reportsArray = [];
            snapshot.forEach(doc => {
                reportsArray.push({ id: doc.id, data: doc.data() });
            });

            // Filtra per ricerca
            if (searchTerm) {
                const lower = searchTerm.toLowerCase();
                reportsArray = reportsArray.filter(r => {
                    return Object.values(r.data).some(v => {
                        if (typeof v === 'string') return v.toLowerCase().includes(lower);
                        if (typeof v === 'number') return v.toString().includes(lower);
                        if (v && v.toDate) return v.toDate().toLocaleDateString().includes(lower);
                        return false;
                    });
                });
            }

            if (reportsArray.length === 0) {
                recycleBinReportsDiv.innerHTML = `
                    <div class="text-center py-8 text-surface-400">
                        <i class="fas fa-search text-2xl mb-2 block text-surface-300"></i>
                        Nessun report trovato per "${searchTerm}"
                    </div>
                `;
                return;
            }

            // === Raggruppa per cliente ===
            const reportsByClient = {};
            reportsArray.forEach(r => {
                const name = r.data.filterClientName || 'Cliente Sconosciuto';
                if (!reportsByClient[name]) reportsByClient[name] = [];
                reportsByClient[name].push(r);
            });

            // Ordina clienti per numero report (decrescente)
            const sortedClients = Object.keys(reportsByClient).sort((a, b) =>
                reportsByClient[b].length - reportsByClient[a].length
            );

            sortedClients.forEach(clientName => {
                const clientReports = reportsByClient[clientName];
                const color = getRbColor(clientName);

                // --- Client Section ---
                const section = document.createElement('div');
                section.className = 'animate-slide-up';

                // Client Header
                const header = document.createElement('div');
                header.className = 'tl-day-header';
                header.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="tl-badge-client ${color.bg} ${color.text}" style="font-size: 0.8rem; padding: 4px 14px;">${clientName}</span>
                        <span class="text-xs text-surface-400">(${clientReports.length} report)</span>
                    </div>
                    <div class="flex items-center gap-3 text-sm">
                        <button class="rb-restore-client-btn text-xs text-emerald-500 hover:text-emerald-700 transition-colors flex items-center gap-1" title="Ripristina tutti">
                            <i class="fas fa-undo text-xs"></i> Ripristina tutti
                        </button>
                        <button class="rb-delete-client-btn p-1.5 text-surface-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Elimina definitivamente tutti">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </div>
                `;

                // Evento ripristina tutti per cliente
                header.querySelector('.rb-restore-client-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    Swal.fire({
                        title: 'Ripristinare tutti?',
                        text: `Ripristinare tutti i report di "${clientName}"?`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#10b981',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: 'Sì, ripristina tutti!',
                        cancelButtonText: 'Annulla'
                    }).then(result => {
                        if (result.isConfirmed) restoreClientReports(clientName);
                    });
                });

                // Evento elimina definitivamente per cliente
                header.querySelector('.rb-delete-client-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    Swal.fire({
                        title: 'Eliminare definitivamente?',
                        text: `Eliminare definitivamente tutti i report di "${clientName}"? Non potranno essere recuperati.`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#d33',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: 'Sì, elimina!',
                        cancelButtonText: 'Annulla'
                    }).then(result => {
                        if (result.isConfirmed) permanentlyDeleteClientReports(clientName, section);
                    });
                });

                section.appendChild(header);

                // Report Rows
                const list = document.createElement('div');
                list.className = 'space-y-1';

                clientReports.forEach(report => {
                    const r = report.data;
                    const row = document.createElement('div');
                    row.className = 'tl-timer-row';

                    const content = document.createElement('div');
                    content.className = 'flex-1 min-w-0';

                    // === RIGA 1: Icona + Nome + Data eliminazione ===
                    const mainRow = document.createElement('div');
                    mainRow.className = 'flex items-center gap-3';

                    const icon = document.createElement('span');
                    icon.className = 'text-rose-400 flex-shrink-0';
                    icon.innerHTML = '<i class="fas fa-file-alt text-sm"></i>';

                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'text-sm font-medium text-surface-700 truncate';
                    nameSpan.textContent = r.reportHeader || r.reportName || 'Report';

                    const spacer = document.createElement('span');
                    spacer.className = 'flex-1';

                    // Data eliminazione
                    const deletedSpan = document.createElement('span');
                    deletedSpan.className = 'text-xs text-rose-400 flex-shrink-0';
                    const deletedDate = r.deletedAt ? r.deletedAt.toDate() : null;
                    deletedSpan.textContent = deletedDate
                        ? `Eliminato ${deletedDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}`
                        : '';

                    mainRow.appendChild(icon);
                    mainRow.appendChild(nameSpan);
                    mainRow.appendChild(spacer);
                    mainRow.appendChild(deletedSpan);

                    // === RIGA 2: Periodo · Importo · Azioni ===
                    const detailRow = document.createElement('div');
                    detailRow.className = 'flex items-center gap-3 mt-1';

                    const periodSpan = document.createElement('span');
                    periodSpan.className = 'text-xs text-surface-400';
                    periodSpan.textContent = `${r.startDate || '—'} → ${r.endDate || '—'}`;
                    detailRow.appendChild(periodSpan);

                    if (r.totalAmount) {
                        const sep = document.createElement('span');
                        sep.className = 'text-surface-200';
                        sep.textContent = '·';
                        detailRow.appendChild(sep);

                        const amountSpan = document.createElement('span');
                        amountSpan.className = 'text-xs font-medium text-surface-500';
                        amountSpan.textContent = `€ ${parseFloat(r.totalAmount).toFixed(2)}`;
                        detailRow.appendChild(amountSpan);
                    }

                    const spacer2 = document.createElement('span');
                    spacer2.className = 'flex-1';
                    detailRow.appendChild(spacer2);

                    // Ripristina
                    const restoreBtn = document.createElement('button');
                    restoreBtn.className = 'text-xs text-emerald-500 hover:text-emerald-700 transition-colors flex items-center gap-1';
                    restoreBtn.innerHTML = '<i class="fas fa-undo"></i> Ripristina';
                    restoreBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        restoreReport(report.id, row);
                    });
                    detailRow.appendChild(restoreBtn);

                    // Elimina definitivamente
                    const delBtn = document.createElement('button');
                    delBtn.className = 'tl-edit-btn ml-1';
                    delBtn.title = 'Elimina definitivamente';
                    delBtn.innerHTML = '<i class="fas fa-trash-alt text-xs"></i>';
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        permanentlyDeleteReport(report.id, row);
                    });
                    detailRow.appendChild(delBtn);

                    content.appendChild(mainRow);
                    content.appendChild(detailRow);
                    row.appendChild(content);
                    list.appendChild(row);
                });

                section.appendChild(list);
                recycleBinReportsDiv.appendChild(section);
            });
        })
        .catch(error => {
            console.error('Errore nel caricamento dei report eliminati:', error);
        });
}

// Ripristina un singolo report
function restoreReport(reportId, rowElement) {
    db.collection('reports').doc(reportId).update({
        isDeleted: false,
        deletedAt: firebase.firestore.FieldValue.delete()
    }).then(() => {
        rowElement.remove();
        Swal.fire({ icon: 'success', title: 'Ripristinato!', text: 'Report ripristinato con successo.', confirmButtonText: 'OK' });
    }).catch(error => {
        console.error('Errore ripristino report:', error);
    });
}

// Ripristina tutti i report di un cliente
function restoreClientReports(clientName) {
    let query = db.collection('reports')
        .where('uid', '==', currentUser.uid)
        .where('isDeleted', '==', true);
    if (clientName !== 'Cliente Sconosciuto') {
        query = query.where('filterClientName', '==', clientName);
    }

    query.get().then(snapshot => {
        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, {
                isDeleted: false,
                deletedAt: firebase.firestore.FieldValue.delete()
            });
        });
        return batch.commit();
    }).then(() => {
        Swal.fire({ icon: 'success', title: 'Ripristinati!', text: `Tutti i report di "${clientName}" ripristinati.`, confirmButtonText: 'OK' });
        loadRecycleBinReports();
    }).catch(error => {
        console.error('Errore ripristino report cliente:', error);
    });
}

// Elimina definitivamente un singolo report
function permanentlyDeleteReport(reportId, rowElement) {
    Swal.fire({
        title: 'Eliminare definitivamente?',
        text: 'Questo report non potrà essere recuperato.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sì, elimina!',
        cancelButtonText: 'Annulla'
    }).then(result => {
        if (result.isConfirmed) {
            db.collection('reports').doc(reportId).delete().then(() => {
                rowElement.remove();
                Swal.fire({ icon: 'success', title: 'Eliminato!', text: 'Report eliminato definitivamente.', confirmButtonText: 'OK' });
            }).catch(error => {
                console.error('Errore eliminazione report:', error);
            });
        }
    });
}

// Elimina definitivamente tutti i report di un cliente
function permanentlyDeleteClientReports(clientName, sectionElement) {
    let query = db.collection('reports')
        .where('uid', '==', currentUser.uid)
        .where('isDeleted', '==', true);
    if (clientName !== 'Cliente Sconosciuto') {
        query = query.where('filterClientName', '==', clientName);
    }

    query.get().then(snapshot => {
        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        return batch.commit();
    }).then(() => {
        sectionElement.remove();
        Swal.fire({ icon: 'success', title: 'Eliminati!', text: `Tutti i report di "${clientName}" eliminati definitivamente.`, confirmButtonText: 'OK' });
    }).catch(error => {
        console.error('Errore eliminazione report cliente:', error);
    });
}

// === VITE MODULE: Registra globals ===
window.recycleBinTemplate = recycleBinTemplate;
window.initializeRecycleBinReportsEvents = initializeRecycleBinReportsEvents;

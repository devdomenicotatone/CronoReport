// reportHistory.js
import * as notify from './notify.js';
import { generatePDF } from './reportConfig.js';
import { loadClientColors, getClientBgStyle, getClientHexColor } from './clientColors.js';
// Template per la sezione Storico Report
export const reportHistoryTemplate = `
<div id="report-history-section" class="max-w-6xl mx-auto px-4 py-6" style="padding-bottom: 5.5rem;">
    <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
                <i class="fas fa-history text-white text-lg"></i>
            </div>
            <h2 class="text-2xl font-bold text-surface-800">Storico Report</h2>
        </div>
        <div class="flex gap-2">
            <button id="refresh-report-history-btn" class="cr-btn cr-btn-sm bg-surface-100 hover:bg-surface-200 text-surface-600 text-xs">
                <i class="fas fa-sync-alt"></i>
            </button>
        </div>
    </div>

    <!-- Barra ricerca -->
    <div class="cr-card mb-5 p-4">
        <div class="flex items-center gap-3">
            <div class="flex-1 relative">
                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-300 text-sm"></i>
                <input type="text" id="search-report-input" class="cr-input pl-9 text-sm" placeholder="Cerca nei report...">
            </div>
        </div>
    </div>

    <!-- Bozze salvate -->
    <div id="rh-drafts-section" style="display:none;">
        <div class="flex items-center gap-2 mb-3">
            <div class="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <i class="fas fa-bookmark text-amber-600 text-xs"></i>
            </div>
            <h3 class="text-sm font-bold text-surface-700">Bozze Salvate</h3>
        </div>
        <div id="rh-drafts-list" class="space-y-2 mb-6"></div>
    </div>

    <!-- Report list -->
    <div id="reportHistoryAccordion"></div>

    <!-- Floating Quick Filter Bar -->
    <div id="rh-quick-filter-bar" class="quick-filter-bar">
        <div class="qf-inner">
            <div class="qf-row">
                <span class="qf-label"><i class="fas fa-calendar-alt" style="margin-right: 4px;"></i>Anno</span>
                <div id="rh-year-chips" class="qf-chips">
                    <!-- Populated dynamically -->
                </div>
                <div id="rh-month-section" class="qf-month-section" style="display: none;">
                    <div class="qf-divider"></div>
                    <span class="qf-label" style="min-width: auto;"><i class="fas fa-th" style="margin-right: 4px;"></i></span>
                    <div id="rh-month-chips" class="qf-chips qf-chips-scroll">
                        <!-- Populated dynamically -->
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
`;

/**
 * Funzione per inizializzare gli eventi della sezione Storico Report
 */
export function initializeReportHistoryEvents() {
    const reportHistoryAccordion = document.getElementById('reportHistoryAccordion');
    const refreshReportHistoryBtn = document.getElementById('refresh-report-history-btn');
    const searchReportInput = document.getElementById('search-report-input');

    // === Quick Filter State (locale a Storico Report) ===
    let rhActiveYear = new Date().getFullYear(); // default: anno corrente
    let rhActiveMonth = null;
    let rhAvailableMonthsByYear = {};
    const RH_MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

    // I colori dei clienti vengono caricati da Firestore tramite clientColors.js

    // === Quick Filter: Year/Month Detection ===
    async function loadRhAvailableYears() {
        try {
            const snapshot = await db.collection('reports')
                .where('uid', '==', currentUser.uid)
                .orderBy('timestamp', 'desc')
                .get();
            const yearMonthMap = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.isDeleted) return;
                const ts = data.timestamp;
                if (ts) {
                    const d = ts.toDate();
                    const year = d.getFullYear();
                    const month = d.getMonth() + 1;
                    if (!yearMonthMap[year]) yearMonthMap[year] = new Set();
                    yearMonthMap[year].add(month);
                }
            });
            rhAvailableMonthsByYear = {};
            for (const year in yearMonthMap) {
                rhAvailableMonthsByYear[year] = Array.from(yearMonthMap[year]).sort((a, b) => a - b);
            }
            const years = Object.keys(rhAvailableMonthsByYear).map(Number).sort((a, b) => b - a);
            populateRhYearChips(years);
            updateRhQuickFilterBar();
            return years;
        } catch (error) {
            console.error('Errore caricamento anni report:', error);
            return [];
        }
    }

    function populateRhYearChips(years) {
        const container = document.getElementById('rh-year-chips');
        if (!container) return;
        container.innerHTML = '';

        const allBtn = document.createElement('button');
        allBtn.className = 'qf-chip qf-chip-all' + (rhActiveYear === null ? ' qf-chip-active' : '');
        allBtn.dataset.year = 'all';
        allBtn.textContent = 'Tutti';
        container.appendChild(allBtn);

        years.forEach(year => {
            const btn = document.createElement('button');
            btn.className = 'qf-chip' + (rhActiveYear === year ? ' qf-chip-active' : '');
            btn.dataset.year = year;
            btn.textContent = year;
            container.appendChild(btn);
        });
    }

    function populateRhMonthChips(year) {
        const container = document.getElementById('rh-month-chips');
        const section = document.getElementById('rh-month-section');
        if (!container || !section) return;

        const months = rhAvailableMonthsByYear[year] || [];
        if (months.length === 0) {
            section.style.display = 'none';
            return;
        }

        container.innerHTML = '';

        const allBtn = document.createElement('button');
        allBtn.className = 'qf-chip qf-chip-all' + (rhActiveMonth === null ? ' qf-chip-active' : '');
        allBtn.dataset.month = 'all';
        allBtn.textContent = 'Tutti';
        container.appendChild(allBtn);

        months.forEach(month => {
            const btn = document.createElement('button');
            btn.className = 'qf-chip' + (rhActiveMonth === month ? ' qf-chip-active' : '');
            btn.dataset.month = month;
            btn.textContent = RH_MONTH_NAMES[month - 1];
            container.appendChild(btn);
        });

        section.style.display = 'flex';
        section.style.animation = 'qfSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
    }

    function updateRhQuickFilterBar() {
        // Year chips
        document.querySelectorAll('#rh-year-chips .qf-chip').forEach(chip => {
            const val = chip.dataset.year;
            const isActive = (val === 'all' && rhActiveYear === null) ||
                             (val !== 'all' && parseInt(val) === rhActiveYear);
            chip.classList.toggle('qf-chip-active', isActive);
        });

        // Month section
        const section = document.getElementById('rh-month-section');
        if (rhActiveYear === null) {
            if (section) section.style.display = 'none';
        } else {
            populateRhMonthChips(rhActiveYear);
        }

        // Month chips
        document.querySelectorAll('#rh-month-chips .qf-chip').forEach(chip => {
            const val = chip.dataset.month;
            const isActive = (val === 'all' && rhActiveMonth === null) ||
                             (val !== 'all' && parseInt(val) === rhActiveMonth);
            chip.classList.toggle('qf-chip-active', isActive);
        });
    }

    /**
     * Carica lo storico dei report con layout flat per cliente
     */
    async function loadReportHistory(searchTerm = '') {
        reportHistoryAccordion.innerHTML = '';

        // Ensure client colors are loaded
        await loadClientColors();

        let query = db.collection('reports')
            .where('uid', '==', currentUser.uid);

        // Quick filter: anno/mese
        if (rhActiveYear !== null) {
            let startDate, endDate;
            if (rhActiveMonth !== null) {
                startDate = new Date(rhActiveYear, rhActiveMonth - 1, 1);
                endDate = new Date(rhActiveYear, rhActiveMonth, 0, 23, 59, 59, 999);
            } else {
                startDate = new Date(rhActiveYear, 0, 1);
                endDate = new Date(rhActiveYear, 11, 31, 23, 59, 59, 999);
            }
            query = query.where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(startDate));
            query = query.where('timestamp', '<=', firebase.firestore.Timestamp.fromDate(endDate));
        }

        try {
            const snapshot = await query.orderBy('timestamp', 'desc').get();
                if (snapshot.empty) {
                    reportHistoryAccordion.innerHTML = `
                        <div class="text-center py-12">
                            <div class="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-file-alt text-2xl text-surface-300"></i>
                            </div>
                            <p class="text-surface-400 font-medium">Nessun report disponibile</p>
                            <p class="text-surface-300 text-sm mt-1">I report generati appariranno qui</p>
                        </div>
                    `;
                    return;
                }

                // Raccogli report (esclusi eliminati)
                let reportsArray = [];
                snapshot.forEach(doc => {
                    const reportData = doc.data();
                    if (reportData.isDeleted) return;
                    reportsArray.push({ id: doc.id, data: reportData });
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
                    reportHistoryAccordion.innerHTML = `
                        <div class="text-center py-8 text-surface-400">
                            <i class="fas fa-search text-2xl mb-2 block text-surface-300"></i>
                            Nessun report trovato${searchTerm ? ` per "${searchTerm}"` : ''}
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
                    const color = getClientBgStyle(clientName);

                    // Totale importo del cliente
                    const totalAmount = clientReports.reduce((sum, r) =>
                        sum + (parseFloat(r.data.totalAmount) || 0), 0
                    );

                    // --- Client Section (stile identico a Timer Salvati) ---
                    const section = document.createElement('div');
                    section.className = 'animate-slide-up';

                    // Client Header
                    const header = document.createElement('div');
                    header.className = 'tl-day-header';
                    header.style.borderLeftColor = getClientHexColor(clientName);
                    header.innerHTML = `
                        <div class="flex items-center gap-3">
                            <span class="tl-badge-client" style="background:${color.bg}; color:${color.text};">${clientName}</span>
                            <span class="text-xs text-surface-400">(${clientReports.length} report)</span>
                        </div>
                        <div class="flex items-center gap-4 text-sm">
                            <span class="flex items-center gap-1.5 text-emerald-600 font-semibold">
                                € ${totalAmount.toFixed(2)}
                            </span>
                            <button class="rh-delete-client-btn p-1.5 text-surface-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Elimina tutti i report del cliente">
                                <i class="fas fa-trash-alt text-xs"></i>
                            </button>
                        </div>
                    `;

                    // Evento elimina per cliente
                    const deleteClientBtn = header.querySelector('.rh-delete-client-btn');
                    deleteClientBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const confirmed = await notify.confirm('Sei sicuro?', `Eliminare tutti i report di "${clientName}"? Saranno spostati nel cestino.`, { confirmText: 'Sì, elimina tutti!' });
                        if (confirmed) deleteReportsByClient(clientName);
                    });

                    section.appendChild(header);

                    // === Sub-raggruppa per mese ===
                    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                                        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

                    // Ordina report per data creazione (decrescente)
                    clientReports.sort((a, b) => {
                        const dateA = a.data.createdAt ? a.data.createdAt.seconds : 0;
                        const dateB = b.data.createdAt ? b.data.createdAt.seconds : 0;
                        return dateB - dateA;
                    });

                    const reportsByMonth = {};
                    clientReports.forEach(r => {
                        let d;
                        if (r.data.createdAt && r.data.createdAt.toDate) {
                            d = r.data.createdAt.toDate();
                        } else {
                            d = new Date(); // fallback
                        }
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        if (!reportsByMonth[key]) reportsByMonth[key] = [];
                        reportsByMonth[key].push(r);
                    });

                    const sortedMonths = Object.keys(reportsByMonth).sort((a, b) => b.localeCompare(a));

                    sortedMonths.forEach((monthKey, monthIdx) => {
                        const monthReports = reportsByMonth[monthKey];
                        const [year, month] = monthKey.split('-');
                        const monthName = `${monthNames[parseInt(month) - 1]} ${year}`;

                        // Totale importo del mese
                        const monthTotal = monthReports.reduce((sum, r) =>
                            sum + (parseFloat(r.data.totalAmount) || 0), 0);

                        // --- Month Section ---
                        const monthSection = document.createElement('div');
                        monthSection.className = 'tl-month-section';

                        // Month Header
                        const monthHeader = document.createElement('div');
                        monthHeader.className = 'tl-month-header';
                        monthHeader.innerHTML = `
                            <i class="fas fa-chevron-${monthIdx === 0 ? 'down' : 'right'} text-xs text-surface-400 month-chevron transition-transform"></i>
                            <span class="text-sm font-semibold text-surface-600">${monthName}</span>
                            <span class="text-xs text-surface-400">${monthReports.length} report</span>
                            <span class="flex-1"></span>
                            <span class="text-xs font-mono text-emerald-600 font-semibold">€ ${monthTotal.toFixed(2)}</span>
                        `;

                        // Month Body
                        const monthBody = document.createElement('div');
                        monthBody.className = 'tl-month-body';
                        const startExpanded = monthIdx === 0;
                        monthBody.style.display = startExpanded ? 'block' : 'none';

                        // Toggle mese
                        monthHeader.addEventListener('click', () => {
                            const isOpen = monthBody.style.display !== 'none';
                            monthBody.style.display = isOpen ? 'none' : 'block';
                            const chevron = monthHeader.querySelector('.month-chevron');
                            if (chevron) {
                                chevron.classList.toggle('fa-chevron-down', !isOpen);
                                chevron.classList.toggle('fa-chevron-right', isOpen);
                            }
                        });

                        monthReports.forEach(report => {
                        const r = report.data;
                        const row = document.createElement('div');
                        row.className = 'tl-timer-row';

                        // Content wrapper (2 righe)
                        const content = document.createElement('div');
                        content.className = 'flex-1 min-w-0';

                        // === RIGA 1: Titolo + Importo ===
                        const mainRow = document.createElement('div');
                        mainRow.className = 'flex items-center gap-3';

                        // Icona report
                        const icon = document.createElement('span');
                        icon.className = 'text-indigo-400 flex-shrink-0';
                        icon.innerHTML = '<i class="fas fa-file-alt text-sm"></i>';

                        // Nome report
                        const nameSpan = document.createElement('span');
                        nameSpan.className = 'text-sm font-medium text-surface-700 truncate';
                        nameSpan.textContent = r.reportHeader || r.reportName || 'Report';

                        // Spacer
                        const spacer = document.createElement('span');
                        spacer.className = 'flex-1';

                        // Importo
                        const amountSpan = document.createElement('span');
                        amountSpan.className = 'font-mono text-base font-bold text-emerald-600 flex-shrink-0';
                        amountSpan.textContent = `€ ${parseFloat(r.totalAmount || 0).toFixed(2)}`;

                        mainRow.appendChild(icon);
                        mainRow.appendChild(nameSpan);
                        mainRow.appendChild(spacer);
                        mainRow.appendChild(amountSpan);

                        // === RIGA 2: Periodo · Sito · Azioni ===
                        const detailRow = document.createElement('div');
                        detailRow.className = 'flex items-center gap-3 mt-1';

                        // Periodo date
                        const periodSpan = document.createElement('span');
                        periodSpan.className = 'text-xs text-surface-400';
                        periodSpan.textContent = `${r.startDate || '—'} → ${r.endDate || '—'}`;

                        // Sito/Tipo lavoro
                        if (r.filterProjectName) {
                            const sep = document.createElement('span');
                            sep.className = 'text-surface-200';
                            sep.textContent = '·';
                            detailRow.appendChild(periodSpan);
                            detailRow.appendChild(sep);

                            const projectSpan = document.createElement('span');
                            projectSpan.className = 'text-xs text-surface-400';
                            projectSpan.textContent = r.filterProjectName;
                            detailRow.appendChild(projectSpan);
                        } else {
                            detailRow.appendChild(periodSpan);
                        }

                        if (r.filterWorktypeName) {
                            const sep2 = document.createElement('span');
                            sep2.className = 'text-surface-200';
                            sep2.textContent = '·';
                            detailRow.appendChild(sep2);

                            const wtSpan = document.createElement('span');
                            wtSpan.className = 'text-xs text-surface-400';
                            wtSpan.textContent = r.filterWorktypeName;
                            detailRow.appendChild(wtSpan);
                        }

                        // Spacer
                        const spacer2 = document.createElement('span');
                        spacer2.className = 'flex-1';
                        detailRow.appendChild(spacer2);

                        // Scarica PDF button
                        const pdfBtn = document.createElement('button');
                        pdfBtn.className = 'text-xs text-emerald-500 hover:text-emerald-700 transition-colors flex items-center gap-1';
                        pdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> PDF';
                        pdfBtn.title = 'Scarica PDF';
                        pdfBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            regenerateAndDownloadReport(r);
                        });
                        detailRow.appendChild(pdfBtn);

                        // Elimina button
                        const delBtn = document.createElement('button');
                        delBtn.className = 'tl-edit-btn ml-1';
                        delBtn.title = 'Elimina';
                        delBtn.innerHTML = '<i class="fas fa-trash-alt text-xs"></i>';
                        delBtn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            const confirmed = await notify.confirm('Eliminare questo report?', 'Sarà spostato nel cestino.', { confirmText: 'Sì, elimina!' });
                            if (confirmed) {
                                try {
                                    await db.collection('reports').doc(report.id).update({
                                        isDeleted: true,
                                        deletedAt: firebase.firestore.FieldValue.serverTimestamp()
                                    });
                                    notify.success('Eliminato!', 'Report spostato nel cestino.');
                                    loadReportHistory(searchReportInput.value.trim());
                                } catch (error) {
                                    console.error('Errore eliminazione report:', error);
                                }
                            }
                        });
                        detailRow.appendChild(delBtn);

                        content.appendChild(mainRow);
                        content.appendChild(detailRow);
                        row.appendChild(content);
                        monthBody.appendChild(row);
                    });

                        monthSection.appendChild(monthHeader);
                        monthSection.appendChild(monthBody);
                        section.appendChild(monthSection);
                    });

                    reportHistoryAccordion.appendChild(section);
                });
        } catch (error) {
            console.error('Errore nel caricamento dello storico report:', error);
            notify.error('Errore', 'Si è verificato un errore durante il caricamento dello storico report.');
        }
    }

    /**
     * Elimina tutti i report di un cliente (soft delete)
     */
    async function deleteReportsByClient(clientName) {
        try {
            let query = db.collection('reports').where('uid', '==', currentUser.uid);
            if (clientName === 'Cliente Sconosciuto') {
                query = query.where('filterClientName', 'in', [null, '']);
            } else {
                query = query.where('filterClientName', '==', clientName);
            }
            const snapshot = await query.get();
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.update(doc.ref, {
                    isDeleted: true,
                    deletedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            await batch.commit();
            notify.success('Eliminati!', `Tutti i report di "${clientName}" spostati nel cestino.`);
            loadReportHistory(searchReportInput.value.trim());
        } catch (error) {
            console.error('Errore eliminazione report cliente:', error);
        }
    }

    /**
     * Rigenera e scarica il report come PDF
     */
    function regenerateAndDownloadReport(reportData) {
        if (reportData.reportDataArray && reportData.reportDataArray.length > 0) {
            generatePDF(
                reportData.reportHeader,
                reportData.reportDataArray,
                reportData.totalHours || 0,
                reportData.totalAmount || 0,
                reportData.companyLogoBase64 || '',
                reportData.reportName || 'report',
                reportData.includeHourlyRate || false
            );
        } else {
            notify.info('Nessun Dato', 'Non ci sono dati disponibili per questo report.');
        }
    }

    // === Quick Filter Bar: Event Listeners ===
    const rhYearContainer = document.getElementById('rh-year-chips');
    const rhMonthContainer = document.getElementById('rh-month-chips');

    if (rhYearContainer) {
        rhYearContainer.addEventListener('click', (e) => {
            const chip = e.target.closest('.qf-chip');
            if (!chip) return;
            const val = chip.dataset.year;
            if (val === 'all') {
                rhActiveYear = null;
                rhActiveMonth = null;
            } else {
                rhActiveYear = parseInt(val);
                rhActiveMonth = null; // reset mese quando cambi anno
            }
            updateRhQuickFilterBar();
            loadReportHistory(searchReportInput.value.trim());
        });
    }

    if (rhMonthContainer) {
        // Delegated: il container è statico, i chip sono dinamici
        document.getElementById('rh-month-section').addEventListener('click', (e) => {
            const chip = e.target.closest('.qf-chip');
            if (!chip) return;
            const val = chip.dataset.month;
            if (val === 'all') {
                rhActiveMonth = null;
            } else {
                rhActiveMonth = parseInt(val);
                if (rhActiveYear === null) {
                    rhActiveYear = new Date().getFullYear();
                }
            }
            updateRhQuickFilterBar();
            loadReportHistory(searchReportInput.value.trim());
        });
    }

    // === DRAFTS ===
    async function loadDrafts() {
        const section = document.getElementById('rh-drafts-section');
        const list = document.getElementById('rh-drafts-list');
        if (!section || !list) return;

        try {
            const snapshot = await db.collection('reportDrafts')
                .where('uid', '==', currentUser.uid)
                .where('isDeleted', '==', false)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            if (snapshot.empty) {
                section.style.display = 'none';
                return;
            }
            section.style.display = 'block';
            list.innerHTML = '';

            snapshot.forEach(doc => {
                const d = doc.data();
                const row = document.createElement('div');
                row.className = 'tl-timer-row';
                row.innerHTML = `
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                <i class="fas fa-bookmark text-[0.6rem]"></i> Bozza
                            </span>
                            <span class="text-sm font-medium text-surface-700 truncate">${d.reportHeader || 'Bozza'}</span>
                            <span class="flex-1"></span>
                            <span class="text-xs text-surface-400">${d.filterClientName || ''}</span>
                        </div>
                        <div class="flex items-center gap-3 mt-1">
                            <span class="text-xs text-surface-400">${d.startDate || '—'} → ${d.endDate || '—'}</span>
                            <span class="text-xs text-surface-300">${d.template ? '• ' + d.template.charAt(0).toUpperCase() + d.template.slice(1) : ''}</span>
                            <span class="flex-1"></span>
                            <button class="rh-resume-draft-btn text-xs text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1" title="Riprendi bozza">
                                <i class="fas fa-play"></i> Riprendi
                            </button>
                            <button class="rh-delete-draft-btn tl-edit-btn ml-1" title="Elimina bozza">
                                <i class="fas fa-trash-alt text-xs"></i>
                            </button>
                        </div>
                    </div>
                `;

                row.querySelector('.rh-resume-draft-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('loadDraft', { detail: { ...d, docId: doc.id } }));
                    const reportLink = document.querySelector('[data-section="report"]');
                    if (reportLink) reportLink.click();
                    notify.toast('Bozza caricata');
                });

                row.querySelector('.rh-delete-draft-btn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const confirmed = await notify.confirm('Eliminare questa bozza?', '', { confirmText: 'Sì, elimina!' });
                    if (confirmed) {
                        await db.collection('reportDrafts').doc(doc.id).update({ isDeleted: true });
                        loadDrafts();
                        notify.toast('Bozza eliminata');
                    }
                });

                list.appendChild(row);
            });
        } catch (error) {
            console.error('Errore caricamento bozze:', error);
        }
    }

    // Carica lo storico + anni disponibili + bozze all'avvio
    loadRhAvailableYears();
    loadReportHistory();
    loadDrafts();

    // Evento refresh
    refreshReportHistoryBtn.addEventListener('click', () => {
        loadReportHistory(searchReportInput.value.trim());
        loadDrafts();
    });

    // Evento ricerca
    searchReportInput.addEventListener('input', () => {
        loadReportHistory(searchReportInput.value.trim());
    });
}



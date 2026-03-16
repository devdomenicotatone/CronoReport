// reportEvents.js
import { loadClients, loadProjects, loadWorktypes, loadSavedConfigs, saveReportConfig, generatePDF, generateReportContentString, generateReportValuesArray, exportReportToGoogleSheet, createGoogleDoc, createGoogleSheet, extractDomainName, displayLogoPreview, clearLogoPreview, applySavedConfig } from './reportConfig.js';
import { gapiInited, gisInited, handleAuthClick, maybeEnableButtons, initializeGoogleApiClient } from './firebaseConfig.js';
import { formatDuration } from './timerHelpers.js';
import { getUserPreference, saveUserPreference } from './userPreferences.js';
// Variabili globali necessarie
let worktypeRates = {};
let companyLogoBase64 = null;

// Funzione per inizializzare gli eventi della sezione Report
export function initializeReportEvents() {
    // Controlla se currentUser è disponibile
    if (!currentUser) {
        firebase.auth().onAuthStateChanged(function (user) {
            if (user) {
                currentUser = user;
                setupReportSection();
            } else {
                window.location.href = 'login.html';
            }
        });
    } else {
        setupReportSection();
    }
}

// Funzione per caricare le tariffe orarie dei tipi di lavoro
export function loadWorktypeRates() {
    return db.collection('worktypes')
        .where('uid', '==', currentUser.uid)
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const worktypeData = doc.data();
                worktypeRates[doc.id] = worktypeData.hourlyRate || 0;
            });
            return worktypeRates;
        })
        .catch(error => {
            console.error('Errore nel caricamento delle tariffe dei tipi di lavoro:', error);
        });
}

// Funzione per impostare la sezione Report
export function setupReportSection() {
    const reportForm = document.getElementById('report-form');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const exportGoogleDocBtn = document.getElementById('export-google-doc-btn');
    const exportGoogleSheetBtn = document.getElementById('export-google-sheet-btn');
    const exportButtonsContainer = document.getElementById('rw-export-buttons');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    const filterClientSelect = document.getElementById('filter-client');
    const filterProjectSelect = document.getElementById('filter-project');
    const filterWorktypeSelect = document.getElementById('filter-worktype');

    const generateBtn = document.getElementById('rw-generate-btn');

    // Carica i clienti
    loadClients(filterClientSelect);

    filterClientSelect.addEventListener('change', () => {
        const selectedClientId = filterClientSelect.value;
        if (selectedClientId) {
            loadProjects(filterProjectSelect, selectedClientId);
            loadWorktypes(filterWorktypeSelect, selectedClientId);
        } else {
            filterProjectSelect.innerHTML = '<option value="">Tutti i Progetti</option>';
            filterWorktypeSelect.innerHTML = '<option value="">Tutti i Tipi di Lavoro</option>';
        }
        tryLoadPreview();
    });

    // Trigger preview anche quando cambiano progetto/worktype/checkbox
    filterProjectSelect.addEventListener('change', () => tryLoadPreview());
    filterWorktypeSelect.addEventListener('change', () => tryLoadPreview());
    document.getElementById('only-unreported').addEventListener('change', () => tryLoadPreview());

    // Trigger preview quando cambiano intestazione o note
    const reportHeaderInput = document.getElementById('report-header');
    const reportNotesInput = document.getElementById('report-notes');
    if (reportHeaderInput) reportHeaderInput.addEventListener('input', () => tryLoadPreview());
    if (reportNotesInput) reportNotesInput.addEventListener('input', () => tryLoadPreview());

    // === COLUMN CHIPS with PIN system ===
    const columnChipsContainer = document.getElementById('rw-column-chips');

    // Load pinned columns from Firestore (with localStorage fallback)
    async function loadPinnedColumns() {
        try {
            const firestorePins = await getUserPreference(currentUser.uid, 'pinnedColumns', null);
            if (firestorePins) return firestorePins;
            // Fallback: migrate from localStorage if exists
            const localPins = localStorage.getItem('crono-pinned-columns');
            if (localPins) {
                const parsed = JSON.parse(localPins);
                // Migrate to Firestore and clean up localStorage
                await saveUserPreference(currentUser.uid, 'pinnedColumns', parsed);
                localStorage.removeItem('crono-pinned-columns');
                return parsed;
            }
            return null;
        } catch { return null; }
    }

    function savePinnedColumns(pinnedCols) {
        saveUserPreference(currentUser.uid, 'pinnedColumns', pinnedCols);
    }

    function getPinnedColumns() {
        const pinned = [];
        columnChipsContainer.querySelectorAll('.rw-column-chip.pinned').forEach(c => {
            pinned.push(c.dataset.col);
        });
        return pinned;
    }

    // Restore pinned state on load
    async function restorePinnedState() {
        const pinned = await loadPinnedColumns();
        if (pinned && pinned.length > 0) {
            columnChipsContainer.querySelectorAll('.rw-column-chip').forEach(chip => {
                const col = chip.dataset.col;
                const isPinned = pinned.includes(col);
                chip.classList.toggle('pinned', isPinned);
                chip.classList.toggle('active', isPinned);
            });
        }
    }

    restorePinnedState();

    columnChipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.rw-column-chip');
        if (!chip) return;

        // Check if the pin icon was clicked
        const pinEl = e.target.closest('.rw-chip-pin');
        if (pinEl) {
            // Toggle pin state
            chip.classList.toggle('pinned');
            // If pinning, also activate
            if (chip.classList.contains('pinned')) {
                chip.classList.add('active');
            }
            // Save all pinned state
            savePinnedColumns(getPinnedColumns());
        } else {
            // Toggle active state (on/off)
            chip.classList.toggle('active');
        }
        tryLoadPreview();
    });

    function getActiveColumns() {
        const chips = columnChipsContainer.querySelectorAll('.rw-column-chip.active');
        return Array.from(chips).map(c => c.dataset.col);
    }

    // === GROUP BY ===
    const groupBySelect = document.getElementById('rw-group-by');
    groupBySelect.addEventListener('change', () => tryLoadPreview());

    // === TEMPLATE SEGMENTED CONTROL (solo grafica, non cambiano le colonne) ===
    const templateCardsContainer = document.getElementById('rw-template-cards');
    let activeTemplate = 'minimal';

    templateCardsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.rw-seg-btn');
        if (!btn) return;
        activeTemplate = btn.dataset.template;
        templateCardsContainer.querySelectorAll('.rw-seg-btn').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        tryLoadPreview();
    });

    function getActiveTemplate() { return activeTemplate; }

    // === ACCENT COLOR PICKER ===
    const accentPicker = document.getElementById('rw-accent-picker');
    const accentCustomInput = document.getElementById('rw-accent-custom-input');
    let activeAccentColor = '#6366f1';

    function setAccentColor(color) {
        activeAccentColor = color;
        // Update dots
        accentPicker.querySelectorAll('.rw-accent-dot').forEach(d => {
            d.classList.toggle('active', d.dataset.color === color);
        });
        // Apply to preview container
        const previewContainer = document.getElementById('rw-preview-container');
        if (previewContainer) {
            previewContainer.style.setProperty('--rw-accent', color);
        }
        accentCustomInput.value = color;
        tryLoadPreview();
    }

    accentPicker.addEventListener('click', (e) => {
        const dot = e.target.closest('.rw-accent-dot');
        if (!dot) return;
        setAccentColor(dot.dataset.color);
    });

    accentCustomInput.addEventListener('input', (e) => {
        const color = e.target.value;
        accentPicker.querySelectorAll('.rw-accent-dot').forEach(d => d.classList.remove('active'));
        activeAccentColor = color;
        const previewContainer = document.getElementById('rw-preview-container');
        if (previewContainer) previewContainer.style.setProperty('--rw-accent', color);
        tryLoadPreview();
    });

    function getAccentColor() { return activeAccentColor; }

    // === TAX & SCONTO ===
    const ivaChipsContainer = document.getElementById('rw-iva-chips');
    const ivaCustomInput = document.getElementById('rw-iva-custom');
    const discountValueInput = document.getElementById('rw-discount-value');
    const discountToggle = document.getElementById('rw-discount-toggle');
    let discountType = 'percent'; // 'percent' or 'fixed'

    // IVA chips
    ivaChipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.rw-iva-chip');
        if (!chip) return;
        ivaChipsContainer.querySelectorAll('.rw-iva-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        ivaCustomInput.value = chip.dataset.iva;
        tryLoadPreview();
    });

    ivaCustomInput.addEventListener('input', () => {
        const val = parseFloat(ivaCustomInput.value) || 0;
        ivaChipsContainer.querySelectorAll('.rw-iva-chip').forEach(c => {
            c.classList.toggle('active', parseFloat(c.dataset.iva) === val);
        });
        tryLoadPreview();
    });

    // Sconto toggle %/€
    discountToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.rw-disc-btn');
        if (!btn) return;
        discountType = btn.dataset.type;
        discountToggle.querySelectorAll('.rw-disc-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tryLoadPreview();
    });

    discountValueInput.addEventListener('input', () => tryLoadPreview());

    function getTaxDiscount() {
        return {
            iva: parseFloat(ivaCustomInput.value) || 0,
            discountValue: parseFloat(discountValueInput.value) || 0,
            discountType: discountType
        };
    }

    // === TOOLBAR TOGGLE PANELS ===
    function setupToolbarToggles() {
        const toggleMap = [
            { btn: 'rw-toggle-notes', panel: 'rw-notes-panel' },
            { btn: 'rw-toggle-tax', panel: 'rw-tax-panel' },
            { btn: 'rw-toggle-presets', panel: 'rw-presets-panel' },
        ];
        toggleMap.forEach(({ btn: btnId, panel: panelId }) => {
            const btnEl = document.getElementById(btnId);
            const panelEl = document.getElementById(panelId);
            if (!btnEl || !panelEl) return;
            btnEl.addEventListener('click', () => {
                const isOpen = panelEl.style.display !== 'none';
                panelEl.style.display = isOpen ? 'none' : 'block';
                btnEl.classList.toggle('active', !isOpen);
            });
        });
    }
    setupToolbarToggles();

    // === INLINE LOGO CLICK (area in preview header) ===
    const logoArea = document.getElementById('rw-logo-area');
    const logoFileInput = document.getElementById('company-logo');
    if (logoArea && logoFileInput) {
        logoArea.addEventListener('click', () => logoFileInput.click());
        logoFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                companyLogoBase64 = reader.result;
                displayLogoPreview(companyLogoBase64);
                tryLoadPreview();
            };
            reader.readAsDataURL(file);
        });
    }

    // === SAVE CONFIG PRESET (dal pulsante nella toolbar) ===
    const saveConfigBtn = document.getElementById('rw-save-config-btn');
    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', () => {
            const configName = document.getElementById('config-name').value.trim();
            if (!configName) {
                Swal.fire({ icon: 'info', title: 'Nome mancante', text: 'Inserisci un nome per il preset.', confirmButtonText: 'OK' });
                return;
            }
            const config = {
                name: configName,
                reportHeader: document.getElementById('report-header').value.trim(),
                companyLogoBase64: companyLogoBase64 || ''
            };
            saveReportConfig(config);
        });
    }

    // === SAVE DRAFT ===
    const saveDraftBtn = document.getElementById('rw-save-draft-btn');

    saveDraftBtn.addEventListener('click', () => {
        const reportHeader = document.getElementById('report-header').value.trim();
        const startDateVal = startDateInput.value;
        const endDateVal = endDateInput.value;
        const clientId = filterClientSelect.value;
        const clientName = filterClientSelect.options[filterClientSelect.selectedIndex]?.text || '';
        const projectId = filterProjectSelect.value;
        const projectName = filterProjectSelect.options[filterProjectSelect.selectedIndex]?.text || '';
        const worktypeId = filterWorktypeSelect.value;
        const worktypeName = filterWorktypeSelect.options[filterWorktypeSelect.selectedIndex]?.text || '';
        const reportNotes = document.getElementById('report-notes').value.trim();

        if (!reportHeader && !clientId) {
            Swal.fire({ icon: 'info', title: 'Nessun dato', text: 'Compila almeno l\'intestazione o seleziona un cliente prima di salvare la bozza.', confirmButtonText: 'OK' });
            return;
        }

        const draft = {
            uid: currentUser.uid,
            isDraft: true,
            reportHeader: reportHeader || 'Bozza senza titolo',
            startDate: startDateVal || null,
            endDate: endDateVal || null,
            filterClient: clientId || null,
            filterClientName: clientName,
            filterProject: projectId || null,
            filterProjectName: projectName,
            filterWorktype: worktypeId || null,
            filterWorktypeName: worktypeName,
            groupBy: groupBySelect.value,
            activeColumns: getActiveColumns(),
            template: activeTemplate,
            accentColor: activeAccentColor,
            notes: reportNotes,
            iva: getTaxDiscount().iva,
            discountValue: getTaxDiscount().discountValue,
            discountType: getTaxDiscount().discountType,
            companyLogoBase64: companyLogoBase64 || null,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            isDeleted: false
        };

        db.collection('reportDrafts').add(draft)
            .then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Bozza salvata!',
                    text: 'La configurazione è stata salvata. Puoi riprenderla dallo Storico Report.',
                    confirmButtonText: 'OK',
                    timer: 2500,
                    timerProgressBar: true
                });
            })
            .catch(error => {
                console.error('Errore salvataggio bozza:', error);
                Swal.fire({ icon: 'error', title: 'Errore', text: 'Impossibile salvare la bozza.', confirmButtonText: 'OK' });
            });
    });

    // === LOAD DRAFT (from Storico Report) ===
    window.addEventListener('loadDraft', (e) => {
        const d = e.detail;
        if (!d) return;
        // Populate fields
        if (d.reportHeader) document.getElementById('report-header').value = d.reportHeader;
        if (d.startDate) startDateInput.value = d.startDate;
        if (d.endDate) endDateInput.value = d.endDate;
        if (d.filterClient) filterClientSelect.value = d.filterClient;
        if (d.filterProject) filterProjectSelect.value = d.filterProject;
        if (d.filterWorktype) filterWorktypeSelect.value = d.filterWorktype;
        if (d.groupBy) groupBySelect.value = d.groupBy;
        if (d.notes) document.getElementById('report-notes').value = d.notes;
        // Template
        if (d.template) {
            activeTemplate = d.template;
            templateCardsContainer.querySelectorAll('.rw-template-card').forEach(c => {
                c.classList.toggle('active', c.dataset.template === d.template);
            });
        }
        // Accent color
        if (d.accentColor) setAccentColor(d.accentColor);
        // Tax & Sconto
        if (d.iva !== undefined) {
            ivaCustomInput.value = d.iva;
            ivaChipsContainer.querySelectorAll('.rw-iva-chip').forEach(c => {
                c.classList.toggle('active', parseFloat(c.dataset.iva) === d.iva);
            });
        }
        if (d.discountValue !== undefined) discountValueInput.value = d.discountValue;
        if (d.discountType) {
            discountType = d.discountType;
            discountToggle.querySelectorAll('.rw-disc-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.type === d.discountType);
            });
        }
        // Columns
        if (d.activeColumns && Array.isArray(d.activeColumns)) {
            columnChipsContainer.querySelectorAll('.rw-column-chip').forEach(chip => {
                chip.classList.toggle('active', d.activeColumns.includes(chip.dataset.col));
            });
        }
        // Trigger preview
        setTimeout(() => tryLoadPreview(), 300);
    });




    // === PERIOD CHIPS ===
    const periodChipsContainer = document.getElementById('rw-period-chips');
    const dateRangeContainer = document.getElementById('rw-date-range');
    let activePeriod = null;

    function setPeriodDates(period) {
        const now = new Date();
        let start, end;

        switch (period) {
            case 'this-month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'last-month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'last-3-months':
                start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'this-year':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                return;
        }

        startDateInput.value = start.toISOString().split('T')[0];
        endDateInput.value = end.toISOString().split('T')[0];
    }

    function updatePeriodChipsUI() {
        periodChipsContainer.querySelectorAll('.rw-period-chip').forEach(chip => {
            chip.classList.toggle('rw-period-chip-active', chip.dataset.period === activePeriod);
        });
        // Show/hide date range for custom
        if (activePeriod === 'custom') {
            dateRangeContainer.classList.add('visible');
        } else {
            dateRangeContainer.classList.remove('visible');
        }
    }

    periodChipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.rw-period-chip');
        if (!chip) return;
        activePeriod = chip.dataset.period;
        updatePeriodChipsUI();

        if (activePeriod !== 'custom') {
            setPeriodDates(activePeriod);
            tryLoadPreview();
        }
    });

    // When dates change manually update preview
    startDateInput.addEventListener('change', () => {
        if (!activePeriod || activePeriod === 'custom') {
            activePeriod = 'custom';
            updatePeriodChipsUI();
        }
        tryLoadPreview();
    });
    endDateInput.addEventListener('change', () => {
        if (!activePeriod || activePeriod === 'custom') {
            activePeriod = 'custom';
            updatePeriodChipsUI();
        }
        tryLoadPreview();
    });

    // Auto-set dates from unreported timers fallback
    setAutoDateRange();

    // === LIVE PREVIEW ===
    let previewDebounceTimer = null;
    let lastPreviewData = null; // cache for preview results

    function tryLoadPreview() {
        // Debounce 300ms
        clearTimeout(previewDebounceTimer);
        previewDebounceTimer = setTimeout(() => {
            loadPreview();
        }, 300);
    }

    function loadPreview() {
        const startVal = startDateInput.value;
        const endVal = endDateInput.value;
        const clientId = filterClientSelect.value;
        const projectId = filterProjectSelect.value;
        const worktypeId = filterWorktypeSelect.value;
        const onlyUnreported = document.getElementById('only-unreported').checked;
        const groupBy = groupBySelect.value;
        const activeCols = getActiveColumns();

        // Reset if not enough data
        if (!startVal || !endVal || !clientId) {
            document.getElementById('rw-preview-container').innerHTML = `
                <div class="rw-empty-preview">
                    <i class="fas fa-search"></i>
                    <p>Seleziona periodo e cliente per vedere l'anteprima</p>
                </div>
            `;
            if (generateBtn) generateBtn.disabled = true;
            if (exportButtonsContainer) exportButtonsContainer.style.display = 'none';
            lastPreviewData = null;
            return;
        }

        // Show loading
        document.getElementById('rw-preview-container').innerHTML = `
            <div class="rw-loading">
                <div class="spinner"></div>
                Caricamento anteprima...
            </div>
        `;

        const startDate = new Date(startVal);
        const endDate = new Date(endVal);
        endDate.setHours(23, 59, 59, 999);

        // Load worktype rates first
        loadWorktypeRates().then(() => {
            let query = db.collection('timeLogs')
                .where('uid', '==', currentUser.uid)
                .where('isDeleted', '==', false)
                .where('startTime', '>=', firebase.firestore.Timestamp.fromDate(startDate))
                .where('startTime', '<=', firebase.firestore.Timestamp.fromDate(endDate));

            if (clientId) query = query.where('clientId', '==', clientId);
            if (projectId) query = query.where('projectId', '==', projectId);
            if (worktypeId) query = query.where('worktypeId', '==', worktypeId);
            if (onlyUnreported) query = query.where('isReported', '==', false);

            return query.orderBy('startTime', 'asc').get();
        }).then(snapshot => {
            let totalHours = 0;
            let totalAmount = 0;
            let count = 0;
            const allRows = [];

            snapshot.forEach(doc => {
                const d = doc.data();
                const durationH = d.duration / 3600;
                const rate = worktypeRates[d.worktypeId] || d.hourlyRate || 0;
                const amount = durationH * rate;
                totalHours += durationH;
                totalAmount += amount;
                count++;

                allRows.push({
                    date: new Date(d.startTime.seconds * 1000).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }),
                    dateShort: new Date(d.startTime.seconds * 1000).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
                    workType: d.worktypeName || '—',
                    project: d.projectName || '—',
                    link: d.link || '',
                    note: d.note || '',
                    hours: formatDuration(d.duration),
                    durationSec: d.duration,
                    rate: rate,
                    amount: amount
                });
            });

            // Store for later
            lastPreviewData = { totalHours, totalAmount, count, allRows };

            // === Build WYSIWYG preview ===
            const container = document.getElementById('rw-preview-container');
            if (count === 0) {
                container.innerHTML = `
                    <div class="rw-empty-preview">
                        <i class="fas fa-inbox"></i>
                        <p>Nessun timer trovato per il periodo e i filtri selezionati</p>
                    </div>
                `;
                if (generateBtn) generateBtn.disabled = true;
                return;
            }

            // Column header labels
            const colLabels = {
                date: 'Data', worktype: 'Tipo', project: 'Progetto',
                link: 'Link', note: 'Note', duration: 'Durata',
                rate: 'Tariffa', amount: 'Importo'
            };

            // Column width strategy: fixed for predictable content, auto for text
            const colWidths = {
                date: '110px', worktype: 'auto', project: 'auto',
                link: 'auto', note: 'auto', duration: '95px',
                rate: '90px', amount: '100px'
            };

            // Build colgroup
            let colgroup = '<colgroup>';
            activeCols.forEach(col => {
                const w = colWidths[col] || 'auto';
                colgroup += w === 'auto' ? '<col>' : `<col style="width:${w};">`;
            });
            colgroup += '</colgroup>';

            // Build table header
            let thead = '<tr>';
            activeCols.forEach(col => {
                const align = (col === 'amount' || col === 'rate') ? ' style="text-align:right;"' : '';
                thead += `<th${align}>${colLabels[col]}</th>`;
            });
            thead += '</tr>';

            // Group rows
            let groups;
            if (groupBy === 'none') {
                groups = [{ label: null, rows: allRows }];
            } else {
                const groupMap = {};
                allRows.forEach(row => {
                    let key;
                    if (groupBy === 'date') key = row.date;
                    else if (groupBy === 'worktype') key = row.workType;
                    else if (groupBy === 'project') key = row.project;
                    else key = 'Altro';
                    if (!groupMap[key]) groupMap[key] = [];
                    groupMap[key].push(row);
                });
                groups = Object.entries(groupMap).map(([label, rows]) => ({ label, rows }));
            }

            // Render cell value
            function cellVal(row, col) {
                switch (col) {
                    case 'date': return row.dateShort;
                    case 'worktype': return row.workType;
                    case 'project': return row.project;
                    case 'link': return row.link ? `<a href="${row.link}" target="_blank" class="text-indigo-500 hover:underline text-xs">${row.link.replace(/https?:\/\/(www\.)?/, '').substring(0, 30)}…</a>` : '—';
                    case 'note': return row.note ? `<span class="text-xs text-surface-500">${row.note.length > 50 ? row.note.substring(0, 50) + '…' : row.note}</span>` : '—';
                    case 'duration': return row.hours;
                    case 'rate': return `€ ${row.rate.toFixed(2)}`;
                    case 'amount': return `€ ${row.amount.toFixed(2)}`;
                    default: return '';
                }
            }

            // Build table body
            let tbody = '';
            groups.forEach(group => {
                if (group.label) {
                    tbody += `<tr class="rw-group-header"><td colspan="${activeCols.length}">${group.label}</td></tr>`;
                }
                group.rows.forEach(row => {
                    tbody += '<tr>';
                    activeCols.forEach(col => {
                        const align = (col === 'amount' || col === 'rate') ? ' style="text-align:right; font-weight:600;"' : '';
                        tbody += `<td${align}>${cellVal(row, col)}</td>`;
                    });
                    tbody += '</tr>';
                });
                // Sub-total per group
                if (group.label && groups.length > 1) {
                    const gHours = group.rows.reduce((s, r) => s + r.durationSec, 0);
                    const gAmount = group.rows.reduce((s, r) => s + r.amount, 0);
                    const gHH = Math.floor(gHours / 3600);
                    const gMM = Math.floor((gHours % 3600) / 60);
                    tbody += `<tr class="rw-group-subtotal">`;
                    activeCols.forEach((col, i) => {
                        if (col === 'duration') tbody += `<td style="text-align:right;">${gHH}h ${gMM.toString().padStart(2, '0')}m</td>`;
                        else if (col === 'amount') tbody += `<td style="text-align:right;">€ ${gAmount.toFixed(2)}</td>`;
                        else if (i === 0) tbody += `<td><strong>Subtotale</strong></td>`;
                        else tbody += `<td></td>`;
                    });
                    tbody += '</tr>';
                }
            });

            // WYSIWYG wrapper
            const reportHeader = document.getElementById('report-header').value.trim() || 'Report';
            const reportNotes = document.getElementById('report-notes').value.trim();
            const clientName = filterClientSelect.options[filterClientSelect.selectedIndex]?.text || '';
            const logoSrc = companyLogoBase64;
            const tpl = getActiveTemplate();
            const accent = getAccentColor();
            // Executive: no separate KPI (data is in totals)

            let wysiwygHtml = `<div class="rw-wysiwyg-preview rw-tpl-${tpl}" style="--rw-accent:${accent};">`;
            // Accent line
            wysiwygHtml += `<div class="rw-accent-line" style="height:${tpl === 'executive' ? '5px' : tpl === 'minimal' ? '2px' : '3px'}; background:${accent};"></div>`;
            // Header
            wysiwygHtml += `<div class="rw-wysiwyg-header">`;
            if (logoSrc) wysiwygHtml += `<img src="${logoSrc}" alt="Logo" class="rw-wysiwyg-logo">`;
            wysiwygHtml += `<div>
                <div class="rw-wysiwyg-title">${reportHeader}</div>
                <div class="rw-wysiwyg-meta">${clientName} · ${new Date(startVal).toLocaleDateString('it-IT')} — ${new Date(endVal).toLocaleDateString('it-IT')}</div>
                <div class="rw-wysiwyg-date" style="font-size:0.7rem;color:#94a3b8;margin-top:2px;">Generato il ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div></div>`;
            wysiwygHtml += `<hr style="border-color:${accent};margin:0.5rem 0;">`;

            const totalSec = Math.floor(totalHours * 3600);
            const hh = Math.floor(totalSec / 3600);
            const mm = Math.floor((totalSec % 3600) / 60);

            // Executive KPI cards (before table)
            if (tpl === 'executive') {
                const formattedHrs = `${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}:${String(totalSec % 60).padStart(2,'0')}`;
                wysiwygHtml += `<div class="rw-exec-kpi">
                    <div class="rw-exec-kpi-card"><div class="rw-exec-kpi-val">${count}</div><div class="rw-exec-kpi-lbl">TIMER</div></div>
                    <div class="rw-exec-kpi-card"><div class="rw-exec-kpi-val">${formattedHrs}</div><div class="rw-exec-kpi-lbl">DURATA TOTALE</div></div>
                    <div class="rw-exec-kpi-card"><div class="rw-exec-kpi-val">€ ${totalAmount.toFixed(2)}</div><div class="rw-exec-kpi-lbl">IMPORTO TOTALE</div></div>
                </div>`;
            }

            // Table
            wysiwygHtml += `<table class="rw-preview-table">${colgroup}<thead>${thead}</thead><tbody>${tbody}</tbody></table>`;

            // === Tax & Sconto calculations ===
            const taxDiscount = getTaxDiscount();
            const subtotal = totalAmount;
            let discountAmt = 0;
            if (taxDiscount.discountValue > 0) {
                discountAmt = taxDiscount.discountType === 'percent'
                    ? subtotal * (taxDiscount.discountValue / 100)
                    : taxDiscount.discountValue;
            }
            const afterDiscount = Math.max(0, subtotal - discountAmt);
            const ivaAmt = afterDiscount * (taxDiscount.iva / 100);
            const grandTotal = afterDiscount + ivaAmt;
            const hasTaxOrDiscount = taxDiscount.iva > 0 || taxDiscount.discountValue > 0;

            const formattedHours = `${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}:${String(totalSec % 60).padStart(2,'0')}`;

            // Totals box (matching PDF riepilogo)
            wysiwygHtml += `<div class="rw-totals-box">`;
            wysiwygHtml += `<div class="rw-totals-box-header" style="background:${accent};">RIEPILOGO TOTALI</div>`;
            wysiwygHtml += `<div class="rw-totals-box-body">`;

            if (hasTaxOrDiscount) {
                wysiwygHtml += `<div class="rw-totals-row"><span class="rw-totals-row-label">Timer:</span><span class="rw-totals-row-value">${count}</span></div>`;
                wysiwygHtml += `<div class="rw-totals-row"><span class="rw-totals-row-label">Totale Durata:</span><span class="rw-totals-row-value">${formattedHours}</span></div>`;
                wysiwygHtml += `<div class="rw-totals-divider"></div>`;
                wysiwygHtml += `<div class="rw-totals-row"><span class="rw-totals-row-label">Subtotale:</span><span class="rw-totals-row-value">€ ${subtotal.toFixed(2)}</span></div>`;
                if (discountAmt > 0) {
                    const discLabel = taxDiscount.discountType === 'percent' ? `Sconto (${taxDiscount.discountValue}%):` : 'Sconto:';
                    wysiwygHtml += `<div class="rw-totals-row rw-totals-discount"><span class="rw-totals-row-label">${discLabel}</span><span class="rw-totals-row-value">- € ${discountAmt.toFixed(2)}</span></div>`;
                }
                if (taxDiscount.iva > 0) {
                    wysiwygHtml += `<div class="rw-totals-row"><span class="rw-totals-row-label">Imponibile:</span><span class="rw-totals-row-value">€ ${afterDiscount.toFixed(2)}</span></div>`;
                    wysiwygHtml += `<div class="rw-totals-row"><span class="rw-totals-row-label">IVA (${taxDiscount.iva}%):</span><span class="rw-totals-row-value">+ € ${ivaAmt.toFixed(2)}</span></div>`;
                }
                wysiwygHtml += `<div class="rw-totals-divider"></div>`;
                wysiwygHtml += `<div class="rw-totals-row rw-totals-grand"><span class="rw-totals-row-label">TOTALE:</span><span class="rw-totals-row-value" style="color:${accent};">€ ${grandTotal.toFixed(2)}</span></div>`;
            } else {
                wysiwygHtml += `<div class="rw-totals-row"><span class="rw-totals-row-label">Totale Durata:</span><span class="rw-totals-row-value">${formattedHours}</span></div>`;
                wysiwygHtml += `<div class="rw-totals-row"><span class="rw-totals-row-label">Totale Importo:</span><span class="rw-totals-row-value" style="color:${accent};">€ ${totalAmount.toFixed(2)}</span></div>`;
            }
            wysiwygHtml += `</div></div>`;

            // Notes
            if (reportNotes) {
                wysiwygHtml += `<div class="rw-wysiwyg-notes"><strong>Note:</strong> ${reportNotes.replace(/\n/g, '<br>')}</div>`;
            }
            // Footer branding
            wysiwygHtml += `<div class="rw-wysiwyg-footer" style="display:flex;justify-content:space-between;font-size:7px;color:#64748b;font-style:italic;padding-top:0.75rem;margin-top:1rem;border-top:0.3px solid #f1f5f9;">
                <span>CronoReport</span>
                <span>Pagina 1 di 1</span>
            </div>`;
            wysiwygHtml += `</div>`;

            container.innerHTML = wysiwygHtml;
            if (generateBtn) generateBtn.disabled = false;
            if (saveDraftBtn) saveDraftBtn.disabled = false;
            if (exportButtonsContainer) exportButtonsContainer.style.display = 'flex';
        }).catch(error => {
            console.error('Errore anteprima:', error);
            document.getElementById('rw-preview-container').innerHTML = `
                <div class="rw-empty-preview">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Errore nel caricamento dell'anteprima</p>
                </div>
            `;
            if (generateBtn) generateBtn.disabled = true;
        });
    }

    // === CONFIG MANAGEMENT ===
    const savedConfigSelect = document.getElementById('saved-config-select');
    const deleteConfigBtn = document.getElementById('delete-config-btn');
    const configNameInput = document.getElementById('config-name');

    // Logo change already handled in INLINE LOGO CLICK section above

    if (savedConfigSelect) loadSavedConfigs();

    if (savedConfigSelect) {
        savedConfigSelect.addEventListener('change', () => {
            const selectedConfigId = savedConfigSelect.value;
            if (selectedConfigId) {
                applySavedConfig(selectedConfigId);
                if (deleteConfigBtn) deleteConfigBtn.style.display = 'inline-block';
            } else {
                reportForm.reset();
                companyLogoBase64 = '';
                if (deleteConfigBtn) deleteConfigBtn.style.display = 'none';
                clearLogoPreview();
            }
        });
    }

    if (deleteConfigBtn) {
        deleteConfigBtn.addEventListener('click', () => {
            const selectedConfigId = savedConfigSelect ? savedConfigSelect.value : null;
            if (selectedConfigId) {
                Swal.fire({
                    title: 'Sei sicuro?',
                    text: 'Vuoi eliminare questa configurazione?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Sì, elimina!',
                    cancelButtonText: 'Annulla'
                }).then((result) => {
                    if (result.isConfirmed) {
                        db.collection('reportConfigs').doc(selectedConfigId).delete()
                            .then(() => {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Configurazione Eliminata',
                                    text: 'La configurazione è stata eliminata con successo.',
                                    confirmButtonText: 'OK'
                                });
                                loadSavedConfigs();
                                reportForm.reset();
                                companyLogoBase64 = '';
                                deleteConfigBtn.style.display = 'none';
                                clearLogoPreview();
                            })
                            .catch(error => {
                                console.error('Errore durante l\'eliminazione della configurazione:', error);
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Errore',
                                    text: 'Si è verificato un errore durante l\'eliminazione della configurazione.',
                                    confirmButtonText: 'OK'
                                });
                            });
                    }
                });
            }
        });
    }

    // === EXPORT BUTTONS ===
    function getReportParams() {
        return {
            template: activeTemplate,
            accentColor: document.querySelector('.rw-accent-dot.active')?.dataset?.color || '#6366f1',
            reportHeader: document.getElementById('report-header')?.value?.trim() || 'Report',
            companyLogoBase64: companyLogoBase64 || '',
            reportNotes: document.getElementById('report-notes')?.value?.trim() || '',
            taxDiscount: getTaxDiscount(),
            activeColumns: getActiveColumns(),
            includeHourlyRate: getActiveColumns().includes('rate')
        };
    }

    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', async () => {
            if (!lastPreviewData || !lastPreviewData.allRows || lastPreviewData.allRows.length === 0) {
                Swal.fire({ icon: 'info', title: 'Nessun dato', text: 'Carica prima i dati per generare il report.' });
                return;
            }
            const p = getReportParams();
            const clientName = filterClientSelect.options[filterClientSelect.selectedIndex]?.text || 'Report';
            const fileName = `Report_${clientName}_${startDateInput.value}_${endDateInput.value}`;
            try {
                downloadPdfBtn.disabled = true;
                downloadPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
                await generatePDF(
                    p.reportHeader,
                    lastPreviewData.allRows,
                    lastPreviewData.totalHours,
                    lastPreviewData.totalAmount,
                    p.companyLogoBase64,
                    fileName,
                    p.includeHourlyRate,
                    p.template,
                    p.accentColor,
                    p.taxDiscount,
                    p.activeColumns
                );
            } catch (error) {
                console.error('Errore generazione PDF:', error);
                Swal.fire({ icon: 'error', title: 'Errore PDF', text: error.message || 'Errore durante la generazione del PDF.' });
            } finally {
                downloadPdfBtn.disabled = false;
                downloadPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Scarica PDF';
            }
        });
    }

    if (exportGoogleDocBtn) {
        exportGoogleDocBtn.addEventListener('click', async () => {
            if (!gapiInited || !gisInited) {
                handleAuthClick();
                return;
            }
            if (!lastPreviewData || !lastPreviewData.allRows || lastPreviewData.allRows.length === 0) {
                Swal.fire({ icon: 'info', title: 'Nessun dato', text: 'Carica prima i dati.' });
                return;
            }
            const p = getReportParams();
            try {
                exportGoogleDocBtn.disabled = true;
                exportGoogleDocBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
                const content = generateReportContentString(lastPreviewData.allRows, p.activeColumns);
                await createGoogleDoc(p.reportHeader, content);
            } catch (error) {
                console.error('Errore Google Docs:', error);
                Swal.fire({ icon: 'error', title: 'Errore Google Docs', text: error.message || 'Errore durante la creazione del documento.' });
            } finally {
                exportGoogleDocBtn.disabled = false;
                exportGoogleDocBtn.innerHTML = '<i class="fab fa-google-drive"></i> Google Docs';
            }
        });
    }

    if (exportGoogleSheetBtn) {
        exportGoogleSheetBtn.addEventListener('click', async () => {
            if (!gapiInited || !gisInited) {
                handleAuthClick();
                return;
            }
            if (!lastPreviewData || !lastPreviewData.allRows || lastPreviewData.allRows.length === 0) {
                Swal.fire({ icon: 'info', title: 'Nessun dato', text: 'Carica prima i dati.' });
                return;
            }
            const p = getReportParams();
            try {
                exportGoogleSheetBtn.disabled = true;
                exportGoogleSheetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
                const values = generateReportValuesArray(lastPreviewData.allRows, p.activeColumns);
                await createGoogleSheet(p.reportHeader, values);
            } catch (error) {
                console.error('Errore Google Sheets:', error);
                Swal.fire({ icon: 'error', title: 'Errore Google Sheets', text: error.message || 'Errore durante la creazione del foglio.' });
            } finally {
                exportGoogleSheetBtn.disabled = false;
                exportGoogleSheetBtn.innerHTML = '<i class="fab fa-google-drive"></i> Google Sheets';
            }
        });
    }

    function markTimersAsReported(timerIds) {
        timerIds.forEach(timerId => {
            db.collection('timeLogs').doc(timerId).update({
                isReported: true
            }).catch(error => {
                console.error('Errore nel contrassegnare il timer come reportato:', error);
            });
        });
    }

    function setAutoDateRange() {
        db.collection('timeLogs')
            .where('uid', '==', currentUser.uid)
            .where('isReported', '==', false)
            .orderBy('startTime', 'asc')
            .get()
            .then(snapshot => {
                if (!snapshot.empty) {
                    const firstTimer = snapshot.docs[0].data();
                    const lastTimer = snapshot.docs[snapshot.docs.length - 1].data();
                    startDateInput.value = new Date(firstTimer.startTime.seconds * 1000).toISOString().split('T')[0];
                    endDateInput.value = new Date(lastTimer.startTime.seconds * 1000).toISOString().split('T')[0];
                }
            })
            .catch(error => {
                console.error('Errore nel recupero dei timer non reportati:', error);
            });
    }

    // === REPORT GENERATION (invariato) ===
    reportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        loadWorktypeRates().then(() => {
            generateReport();
        }).catch(error => {
            console.error('Errore nel caricamento delle tariffe orarie:', error);
            Swal.fire({
                icon: 'error',
                title: 'Errore',
                text: 'Si è verificato un errore durante il caricamento delle tariffe orarie.',
                confirmButtonText: 'OK'
            });
        });
    });

    function generateReport() {
        const reportHeader = document.getElementById('report-header').value.trim();
        const startDateInputVal = document.getElementById('start-date').value;
        const endDateInputVal = document.getElementById('end-date').value;
        const configName = document.getElementById('config-name').value.trim();
    
        const onlyUnreported = document.getElementById('only-unreported').checked;
        const activeCols = getActiveColumns();
        const groupBy = groupBySelect.value;
        const reportNotes = document.getElementById('report-notes').value.trim();
        const includeHourlyRate = activeCols.includes('rate');
    
        let errorMessage = '';
    
        if (!reportHeader) errorMessage += '• Inserisci l\'intestazione del report.\n';
        if (!startDateInputVal) errorMessage += '• Seleziona una data di inizio.\n';
        if (!endDateInputVal) errorMessage += '• Seleziona una data di fine.\n';
        if (startDateInputVal && endDateInputVal && new Date(startDateInputVal) > new Date(endDateInputVal)) {
            errorMessage += '• La data di inizio non può essere successiva alla data di fine.\n';
        }
    
        const filterClient = document.getElementById('filter-client').value;
        const filterProject = document.getElementById('filter-project').value;
        const filterWorktype = document.getElementById('filter-worktype').value;
    
        if (!filterClient) errorMessage += '• Seleziona un cliente per il filtro.\n';
    
        if (errorMessage) {
            Swal.fire({
                icon: 'warning',
                title: 'Attenzione',
                html: errorMessage.replace(/\n/g, '<br>'),
                confirmButtonText: 'OK'
            });
            return;
        }
    
        if (configName) {
            saveReportConfig({
                name: configName,
                reportHeader,
                companyLogoBase64,
                filterClient,
                filterProject,
                filterWorktype
            });
        }
    
    
        const reportFileName = `${reportHeader} - ${startDateInputVal} a ${endDateInputVal}`;
        function sanitizeFileName(fileName) {
            return fileName.replace(/[\/\\?%*:|"<>]/g, '-');
        }
        const sanitizedReportFileName = sanitizeFileName(reportFileName);
    
        const startDate = new Date(startDateInputVal);
        const endDate = new Date(endDateInputVal);
        endDate.setHours(23, 59, 59, 999);
    
        let query = db.collection('timeLogs')
            .where('uid', '==', currentUser.uid)
            .where('isDeleted', '==', false)
            .where('startTime', '>=', firebase.firestore.Timestamp.fromDate(startDate))
            .where('startTime', '<=', firebase.firestore.Timestamp.fromDate(endDate));
    
        if (filterClient) query = query.where('clientId', '==', filterClient);
        if (filterProject) query = query.where('projectId', '==', filterProject);
        if (filterWorktype) query = query.where('worktypeId', '==', filterWorktype);
        if (onlyUnreported) query = query.where('isReported', '==', false);
    
        query.orderBy('startTime', 'asc')
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Nessun Dato',
                        text: 'Non ci sono dati disponibili per l\'intervallo di date e i filtri selezionati.',
                        confirmButtonText: 'OK'
                    });
                    return;
                }
    
                let totalAmount = 0;
                let totalHours = 0;
                let reportData = [];
                let timerIds = [];
    
                snapshot.forEach(doc => {
                    const logData = doc.data();
                    timerIds.push(doc.id);
    
                    const durationInHours = logData.duration / 3600;
                    const hourlyRate = worktypeRates[logData.worktypeId] || logData.hourlyRate || 0;
                    const amount = durationInHours * hourlyRate;
                    totalAmount += amount;
                    totalHours += durationInHours;
    
                    const dataRow = {
                        date: new Date(logData.startTime.seconds * 1000).toLocaleDateString(),
                        dateGroupKey: new Date(logData.startTime.seconds * 1000).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }),
                        workType: logData.worktypeName,
                        project: logData.projectName || '—',
                        hourlyRate: hourlyRate.toFixed(2),
                        link: logData.link || '',
                        linkText: logData.link ? extractDomainName(logData.link) : '-',
                        note: logData.note || '',
                        timeWorked: formatDuration(logData.duration),
                        durationSec: logData.duration,
                        amount: amount.toFixed(2)
                    };
    
                    reportData.push(dataRow);
                });
    
                // Helper: dopo l'export, chiedi se marcare i timer come riportati
                function askMarkAsReported() {
                    Swal.fire({
                        icon: 'question',
                        title: 'Contrassegnare come riportati?',
                        text: 'Vuoi contrassegnare i timer inclusi nel report come già riportati?',
                        showCancelButton: true,
                        confirmButtonText: 'Sì, contrassegna',
                        cancelButtonText: 'No, lascia invariati',
                        customClass: {
                            popup: 'cr-swal-popup',
                            title: 'cr-swal-title',
                            htmlContainer: 'cr-swal-text',
                            confirmButton: 'cr-swal-confirm',
                            cancelButton: 'cr-swal-cancel',
                            actions: 'cr-swal-actions'
                        },
                        buttonsStyling: false
                    }).then((result) => {
                        if (result.isConfirmed) {
                            markTimersAsReported(timerIds);
                            Swal.fire({
                                icon: 'success',
                                title: 'Timer aggiornati',
                                text: `${timerIds.length} timer contrassegnati come riportati.`,
                                timer: 2000,
                                timerProgressBar: true,
                                showConfirmButton: false
                            });
                        }
                    });
                }

                // Bind export buttons
                downloadPdfBtn.onclick = () => {
                    generatePDF(reportHeader, reportData, totalHours, totalAmount, companyLogoBase64, sanitizedReportFileName, includeHourlyRate, getActiveTemplate(), getAccentColor(), getTaxDiscount(), getActiveColumns());
                    askMarkAsReported();
                };
                
                exportGoogleDocBtn.onclick = () => {
                    const reportContentString = generateReportContentString(reportHeader, reportData, totalHours, totalAmount, includeHourlyRate);
                    handleAuthClick(() => {
                        createGoogleDoc(reportContentString, sanitizedReportFileName);
                        askMarkAsReported();
                    });
                };
    
                exportGoogleSheetBtn.onclick = () => {
                    const reportValuesArray = generateReportValuesArray(reportHeader, reportData, totalHours, totalAmount, includeHourlyRate);
                    handleAuthClick(() => {
                        createGoogleSheet(reportValuesArray, sanitizedReportFileName);
                        askMarkAsReported();
                    });
                };

                // Show export buttons
                if (exportButtonsContainer) exportButtonsContainer.style.display = '';
    
                let filterClientName = '';
                let filterprojectName = '';
                let filterWorktypeName = '';
    
                if (document.getElementById('filter-client').value) {
                    filterClientName = document.getElementById('filter-client').options[document.getElementById('filter-client').selectedIndex].text;
                }
                if (document.getElementById('filter-project').value) {
                    filterprojectName = document.getElementById('filter-project').options[document.getElementById('filter-project').selectedIndex].text;
                }
                if (document.getElementById('filter-worktype').value) {
                    filterWorktypeName = document.getElementById('filter-worktype').options[document.getElementById('filter-worktype').selectedIndex].text;
                }
    
                const reportDetails = {
                    uid: currentUser.uid,
                    reportHeader: reportHeader,
                    startDate: startDateInputVal,
                    endDate: endDateInputVal,
                    filterClient: filterClient || null,
                    filterProject: filterProject || null,
                    filterWorktype: filterWorktype || null,
                    filterClientName: filterClientName,
                    filterprojectName: filterprojectName,
                    filterWorktypeName: filterWorktypeName,
                    totalAmount: totalAmount,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    companyLogoBase64: companyLogoBase64,
                    reportName: sanitizedReportFileName,
                    reportDataArray: reportData,
                    includeHourlyRate: includeHourlyRate,
                    totalHours: totalHours
                };
    
                db.collection('reports').add(reportDetails)
                    .then(() => {
                        console.log('Report salvato nello storico.');
                        Swal.fire({
                            icon: 'success',
                            title: 'Report Generato',
                            text: 'Il report è stato salvato nello storico. Usa i pulsanti sotto l\'anteprima per esportare.',
                            confirmButtonText: 'OK'
                        });
                    })
                    .catch(error => {
                        console.error('Errore nel salvataggio del report nello storico:', error);
                    });
    
            })
            .catch(error => {
                console.error('Errore nel caricamento dei dati per il report:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Errore',
                    text: 'Si è verificato un errore durante il caricamento dei dati del report.',
                    confirmButtonText: 'OK'
                });
            });
    }
    
    const accessToken = localStorage.getItem('googleAccessToken');
    if (accessToken) {
        initializeGoogleApiClient(accessToken).then(() => {
            if (exportGoogleDocBtn) exportGoogleDocBtn.disabled = false;
            if (exportGoogleSheetBtn) exportGoogleSheetBtn.disabled = false;
        }).catch(error => {
            console.error('Errore durante l\'inizializzazione del client Google API:', error);
            if (exportGoogleDocBtn) exportGoogleDocBtn.disabled = true;
            if (exportGoogleSheetBtn) exportGoogleSheetBtn.disabled = true;
        });
    } else {
        if (exportGoogleDocBtn) exportGoogleDocBtn.disabled = true;
        if (exportGoogleSheetBtn) exportGoogleSheetBtn.disabled = true;
    }
}

// Avvia l'inizializzazione dopo che l'utente è autenticato
firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        currentUser = user;
        initializeReportEvents();
    } else if (!DEV_MODE) {
        window.location.href = 'login.html';
    }
});



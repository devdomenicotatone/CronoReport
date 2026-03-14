// reportEvents.js

// Variabili globali necessarie
let savedConfigSelect;
let deleteConfigBtn;
let configNameInput;
let companyLogoInput;
let exportGoogleDocBtn;
let exportGoogleSheetBtn;

// Funzione per inizializzare gli eventi della sezione Report
function initializeReportEvents() {
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
function loadWorktypeRates() {
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
function setupReportSection() {
    const reportForm = document.getElementById('report-form');
    const reportContent = document.getElementById('report-content');
    const reportHeaderDisplay = document.getElementById('report-header-display');
    const reportTableBody = document.getElementById('report-table-body');
    const totalAmountDisplay = document.getElementById('total-amount');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    const filterClientSelect = document.getElementById('filter-client');
    const filterSiteSelect = document.getElementById('filter-site');
    const filterWorktypeSelect = document.getElementById('filter-worktype');

    const generateBtn = document.getElementById('rw-generate-btn');

    // Carica i clienti
    loadClients(filterClientSelect);

    filterClientSelect.addEventListener('change', () => {
        const selectedClientId = filterClientSelect.value;
        if (selectedClientId) {
            loadSites(filterSiteSelect, selectedClientId);
            loadWorktypes(filterWorktypeSelect, selectedClientId);
        } else {
            filterSiteSelect.innerHTML = '<option value="">Tutti i Siti</option>';
            filterWorktypeSelect.innerHTML = '<option value="">Tutti i Tipi di Lavoro</option>';
        }
        tryLoadPreview();
    });

    // Trigger preview anche quando cambiano sito/worktype/checkbox
    filterSiteSelect.addEventListener('change', () => tryLoadPreview());
    filterWorktypeSelect.addEventListener('change', () => tryLoadPreview());
    document.getElementById('only-unreported').addEventListener('change', () => tryLoadPreview());

    exportGoogleDocBtn = document.getElementById('export-google-doc-btn');
    exportGoogleSheetBtn = document.getElementById('export-google-sheet-btn');

    if (exportGoogleDocBtn) exportGoogleDocBtn.disabled = true;
    if (exportGoogleSheetBtn) exportGoogleSheetBtn.disabled = true;

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
        const siteId = filterSiteSelect.value;
        const worktypeId = filterWorktypeSelect.value;
        const onlyUnreported = document.getElementById('only-unreported').checked;

        // Reset if not enough data
        if (!startVal || !endVal || !clientId) {
            document.getElementById('rw-stat-hours').textContent = '—';
            document.getElementById('rw-stat-amount').textContent = '—';
            document.getElementById('rw-stat-count').textContent = '—';
            document.getElementById('rw-preview-container').innerHTML = `
                <div class="rw-empty-preview">
                    <i class="fas fa-search"></i>
                    <p>Seleziona periodo e cliente per vedere l'anteprima</p>
                </div>
            `;
            if (generateBtn) generateBtn.disabled = true;
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
            if (siteId) query = query.where('siteId', '==', siteId);
            if (worktypeId) query = query.where('worktypeId', '==', worktypeId);
            if (onlyUnreported) query = query.where('isReported', '==', false);

            return query.orderBy('startTime', 'asc').get();
        }).then(snapshot => {
            let totalHours = 0;
            let totalAmount = 0;
            let count = 0;
            const previewRows = [];

            snapshot.forEach(doc => {
                const d = doc.data();
                const durationH = d.duration / 3600;
                const rate = worktypeRates[d.worktypeId] || 0;
                const amount = durationH * rate;
                totalHours += durationH;
                totalAmount += amount;
                count++;

                previewRows.push({
                    date: new Date(d.startTime.seconds * 1000).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
                    workType: d.worktypeName || '—',
                    hours: formatDuration(d.duration),
                    amount: `€ ${amount.toFixed(2)}`
                });
            });

            // Store for later
            lastPreviewData = { totalHours, totalAmount, count };

            // Update stat cards
            const totalSec = Math.floor(totalHours * 3600);
            const hh = Math.floor(totalSec / 3600);
            const mm = Math.floor((totalSec % 3600) / 60);
            document.getElementById('rw-stat-hours').textContent = `${hh}h ${mm.toString().padStart(2, '0')}m`;
            document.getElementById('rw-stat-amount').textContent = `€ ${totalAmount.toFixed(2)}`;
            document.getElementById('rw-stat-count').textContent = count;

            // Update preview table
            const container = document.getElementById('rw-preview-container');
            if (count === 0) {
                container.innerHTML = `
                    <div class="rw-empty-preview">
                        <i class="fas fa-inbox"></i>
                        <p>Nessun timer trovato per il periodo e i filtri selezionati</p>
                    </div>
                `;
                if (generateBtn) generateBtn.disabled = true;
            } else {
                const maxShow = 10;
                const showAll = count <= maxShow;
                let html = `
                    <table class="rw-preview-table">
                        <thead><tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Durata</th>
                            <th style="text-align:right;">Importo</th>
                        </tr></thead>
                        <tbody>
                `;
                const rowsToShow = showAll ? previewRows : previewRows.slice(0, maxShow);
                rowsToShow.forEach(r => {
                    html += `<tr>
                        <td>${r.date}</td>
                        <td>${r.workType}</td>
                        <td>${r.hours}</td>
                        <td style="text-align:right; font-weight:600;">${r.amount}</td>
                    </tr>`;
                });
                html += '</tbody></table>';
                if (!showAll) {
                    html += `<div class="text-center mt-2">
                        <span class="text-xs text-surface-400">e altri ${count - maxShow} timer…</span>
                    </div>`;
                }
                container.innerHTML = html;
                if (generateBtn) generateBtn.disabled = false;
            }
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

    // === CONFIG MANAGEMENT (invariato) ===
    savedConfigSelect = document.getElementById('saved-config-select');
    deleteConfigBtn = document.getElementById('delete-config-btn');
    configNameInput = document.getElementById('config-name');
    companyLogoInput = document.getElementById('company-logo');

    companyLogoInput.addEventListener('change', () => {
        const file = companyLogoInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                companyLogoBase64 = e.target.result;
                displayLogoPreview(companyLogoBase64);
            };
            reader.readAsDataURL(file);
        }
    });

    loadSavedConfigs();

    savedConfigSelect.addEventListener('change', () => {
        const selectedConfigId = savedConfigSelect.value;
        if (selectedConfigId) {
            applySavedConfig(selectedConfigId);
            deleteConfigBtn.style.display = 'inline-block';
        } else {
            reportForm.reset();
            companyLogoBase64 = '';
            deleteConfigBtn.style.display = 'none';
            clearLogoPreview();
        }
    });

    deleteConfigBtn.addEventListener('click', () => {
        const selectedConfigId = savedConfigSelect.value;
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
    
        const includeHourlyRate = document.getElementById('include-hourly-rate').checked;
        const onlyUnreported = document.getElementById('only-unreported').checked;
    
        let errorMessage = '';
    
        if (!reportHeader) errorMessage += '• Inserisci l\'intestazione del report.\n';
        if (!startDateInputVal) errorMessage += '• Seleziona una data di inizio.\n';
        if (!endDateInputVal) errorMessage += '• Seleziona una data di fine.\n';
        if (startDateInputVal && endDateInputVal && new Date(startDateInputVal) > new Date(endDateInputVal)) {
            errorMessage += '• La data di inizio non può essere successiva alla data di fine.\n';
        }
    
        const filterClient = document.getElementById('filter-client').value;
        const filterSite = document.getElementById('filter-site').value;
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
                filterSite,
                filterWorktype
            });
        }
    
        const reportTableBody = document.getElementById('report-table-body');
        const totalAmountDisplay = document.getElementById('total-amount');
        const totalHoursDisplay = document.getElementById('total-hours');
        reportTableBody.innerHTML = '';
        totalAmountDisplay.textContent = '0.00';
        totalHoursDisplay.textContent = '0.00';
    
        const reportHeaderDisplay = document.getElementById('report-header-display');
        const reportContent = document.getElementById('report-content');
    
        const reportFileName = `${reportHeader} - ${startDateInputVal} a ${endDateInputVal}`;
        function sanitizeFileName(fileName) {
            return fileName.replace(/[\/\\?%*:|"<>]/g, '-');
        }
        const sanitizedReportFileName = sanitizeFileName(reportFileName);
    
        reportHeaderDisplay.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center;">
                ${companyLogoBase64 ? `<img src="${companyLogoBase64}" alt="Logo Aziendale" style="height: 50px; margin-right: 20px;"/>` : ''}
                <h3 style="margin: 0;">${reportHeader}</h3>
            </div>
        `;
    
        const startDate = new Date(startDateInputVal);
        const endDate = new Date(endDateInputVal);
        endDate.setHours(23, 59, 59, 999);
    
        let query = db.collection('timeLogs')
            .where('uid', '==', currentUser.uid)
            .where('isDeleted', '==', false)
            .where('startTime', '>=', firebase.firestore.Timestamp.fromDate(startDate))
            .where('startTime', '<=', firebase.firestore.Timestamp.fromDate(endDate));
    
        if (filterClient) query = query.where('clientId', '==', filterClient);
        if (filterSite) query = query.where('siteId', '==', filterSite);
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
    
                const reportTableHeader = document.querySelector('#report-content thead');
                let tableHeaders = `
                    <tr>
                        <th>Data</th>
                        <th>Tipo di Lavoro</th>
                        ${includeHourlyRate ? '<th>Tariffa Oraria (€)</th>' : ''}
                        <th>Link / Note</th>
                        <th>Tempo Lavorato</th>
                        <th>Importo (€)</th>
                    </tr>
                `;
                reportTableHeader.innerHTML = tableHeaders;
    
                let totalAmount = 0;
                let totalHours = 0;
                let reportData = [];
                let timerIds = [];
    
                snapshot.forEach(doc => {
                    const logData = doc.data();
                    timerIds.push(doc.id);
    
                    const durationInHours = logData.duration / 3600;
                    const worktypeId = logData.worktypeId;
                    const hourlyRate = worktypeRates[worktypeId] || 0;
                    const amount = durationInHours * hourlyRate;
                    totalAmount += amount;
                    totalHours += durationInHours;
    
                    const linkText = logData.link ? extractDomainName(logData.link) : '-';
    
                    const dataRow = {
                        date: new Date(logData.startTime.seconds * 1000).toLocaleDateString(),
                        workType: logData.worktypeName,
                        hourlyRate: hourlyRate.toFixed(2),
                        link: logData.link || '',
                        linkText: linkText,
                        timeWorked: formatDuration(logData.duration),
                        amount: amount.toFixed(2)
                    };
    
                    reportData.push(dataRow);
    
                    const tr = document.createElement('tr');
    
                    const tdDate = document.createElement('td');
                    tdDate.textContent = dataRow.date;
    
                    const tdWorkType = document.createElement('td');
                    tdWorkType.textContent = dataRow.workType;
    
                    const tdHourlyRate = document.createElement('td');
                    if (includeHourlyRate) {
                        tdHourlyRate.textContent = `€ ${dataRow.hourlyRate}`;
                    }
    
                    const tdLink = document.createElement('td');
                    if (dataRow.link) {
                        const linkElement = document.createElement('a');
                        linkElement.href = dataRow.link;
                        linkElement.target = '_blank';
                        linkElement.textContent = dataRow.linkText;
                        tdLink.appendChild(linkElement);
                    } else {
                        tdLink.textContent = '-';
                    }
    
                    const tdTimeWorked = document.createElement('td');
                    tdTimeWorked.textContent = dataRow.timeWorked;
    
                    const tdAmount = document.createElement('td');
                    tdAmount.textContent = `€ ${dataRow.amount}`;
    
                    tr.appendChild(tdDate);
                    tr.appendChild(tdWorkType);
                    if (includeHourlyRate) tr.appendChild(tdHourlyRate);
                    tr.appendChild(tdLink);
                    tr.appendChild(tdTimeWorked);
                    tr.appendChild(tdAmount);
    
                    reportTableBody.appendChild(tr);
                });
    
                totalAmountDisplay.textContent = totalAmount.toFixed(2);
                
                const totalSeconds = Math.floor(totalHours * 3600);
                const hh = Math.floor(totalSeconds / 3600);
                const remainder = totalSeconds % 3600;
                const mm = Math.floor(remainder / 60);
                const ss = remainder % 60;

                const hhStr = hh.toString().padStart(2, '0');
                const mmStr = mm.toString().padStart(2, '0');
                const ssStr = ss.toString().padStart(2, '0');

                totalHoursDisplay.textContent = `${hhStr}:${mmStr}:${ssStr}`;
    
                markTimersAsReported(timerIds);
    
                document.getElementById('download-pdf-btn').onclick = () => generatePDF(reportHeader, reportData, totalHours, totalAmount, companyLogoBase64, sanitizedReportFileName, includeHourlyRate);
                
                if (exportGoogleDocBtn) {
                    exportGoogleDocBtn.onclick = () => {
                        const reportContentString = generateReportContentString(reportHeader, reportData, totalHours, totalAmount, includeHourlyRate);
                        handleAuthClick(() => {
                            createGoogleDoc(reportContentString, sanitizedReportFileName);
                        });
                    };
                }
    
                if (exportGoogleSheetBtn) {
                    exportGoogleSheetBtn.onclick = () => {
                        const reportValuesArray = generateReportValuesArray(reportHeader, reportData, totalHours, totalAmount, includeHourlyRate);
                        handleAuthClick(() => {
                            createGoogleSheet(reportValuesArray, sanitizedReportFileName);
                        });
                    };
                }
    
                let filterClientName = '';
                let filterSiteName = '';
                let filterWorktypeName = '';
    
                if (document.getElementById('filter-client').value) {
                    filterClientName = document.getElementById('filter-client').options[document.getElementById('filter-client').selectedIndex].text;
                }
                if (document.getElementById('filter-site').value) {
                    filterSiteName = document.getElementById('filter-site').options[document.getElementById('filter-site').selectedIndex].text;
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
                    filterSite: filterSite || null,
                    filterWorktype: filterWorktype || null,
                    filterClientName: filterClientName,
                    filterSiteName: filterSiteName,
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
                    })
                    .catch(error => {
                        console.error('Errore nel salvataggio del report nello storico:', error);
                    });
    
                CrModal.show('reportModal');
                reportContent.style.display = 'block';
    
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

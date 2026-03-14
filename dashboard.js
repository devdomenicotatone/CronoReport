// dashboard.js

let earningsChartViewMode = 'combined';

const dashboardTemplate = `
<div id="dashboard-section" class="max-w-6xl mx-auto px-4 py-6">
    <div class="flex items-center gap-3 mb-8">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <i class="fas fa-chart-line text-white text-lg"></i>
        </div>
        <h2 class="text-2xl font-bold text-surface-800">Dashboard Analitica</h2>
    </div>
    <!-- Sezione Filtri -->
    <div class="cr-card mb-5 overflow-hidden">
        <div class="px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
            <span class="font-semibold flex items-center gap-2"><i class="fas fa-filter"></i> Filtri</span>
        </div>
        <div class="p-5">
            <form id="dashboard-filter-form" class="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div>
                    <label for="dashboard-filter-date-start" class="block text-sm font-semibold text-surface-600 mb-1">Data Inizio</label>
                    <input type="date" id="dashboard-filter-date-start" class="cr-input">
                </div>
                <div>
                    <label for="dashboard-filter-date-end" class="block text-sm font-semibold text-surface-600 mb-1">Data Fine</label>
                    <input type="date" id="dashboard-filter-date-end" class="cr-input">
                </div>
                <div>
                    <label for="dashboard-filter-client" class="block text-sm font-semibold text-surface-600 mb-1">Cliente</label>
                    <select id="dashboard-filter-client" class="cr-input">
                        <option value="">Tutti i Clienti</option>
                    </select>
                </div>
                <div>
                    <button id="dashboard-filter-btn" type="button" class="cr-btn w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold shadow-md">
                        <i class="fas fa-search mr-2"></i>Filtra
                    </button>
                </div>
            </form>
        </div>
    </div>
    <!-- Grafici -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Tempo Lavorato -->
        <div class="cr-card overflow-hidden">
            <div class="px-5 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <span class="font-semibold flex items-center gap-2"><i class="fas fa-clock"></i> Tempo Lavorato</span>
            </div>
            <div class="p-5">
                <canvas id="workedTimeChart"></canvas>
            </div>
        </div>
        <!-- Guadagni Totali -->
        <div class="cr-card overflow-hidden">
            <div class="px-5 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white flex justify-between items-center">
                <span class="font-semibold flex items-center gap-2"><i class="fas fa-euro-sign"></i> Guadagni Totali</span>
                <div class="flex items-center gap-2">
                    <label for="earnings-view-mode" class="text-xs text-white/80">Visualizza:</label>
                    <select id="earnings-view-mode" class="bg-white/20 border-0 text-white text-xs rounded px-2 py-1 focus:outline-none">
                        <option value="combined">Combinato</option>
                        <option value="perClient">Per Cliente</option>
                    </select>
                </div>
            </div>
            <div class="p-5">
                <canvas id="earningsChart"></canvas>
            </div>
        </div>
        <!-- Distribuzione Tipi di Lavoro -->
        <div class="cr-card overflow-hidden">
            <div class="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                <span class="font-semibold flex items-center gap-2"><i class="fas fa-chart-pie"></i> Distribuzione Tipi di Lavoro</span>
            </div>
            <div class="p-5" style="position:relative; min-height:300px;">
                <div style="position: relative; height:100%; width:100%;">
                    <canvas id="worktypeDistributionChart"></canvas>
                </div>
            </div>
        </div>
        <!-- Tempo Lavorato per Cliente -->
        <div class="cr-card overflow-hidden">
            <div class="px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                <span class="font-semibold flex items-center gap-2"><i class="fas fa-user-clock"></i> Tempo Lavorato per Cliente</span>
            </div>
            <div class="p-5">
                <canvas id="clientWorkedTimeChart"></canvas>
            </div>
        </div>
    </div>
</div>
`;

// Riferimenti ai grafici
let workedTimeChartInstance = null;
let earningsChartInstance = null;
let worktypeDistributionChartInstance = null;
let clientWorkedTimeChartInstance = null;

/** Funzione per formattare le ore decimali in hh:mm:ss */
function formatHoursToHMS(decimalHours) {
    const totalSeconds = Math.round(decimalHours * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');

    return `${hh}:${mm}:${ss}`;
}

/** Tooltip callback per ore lavorate */
function hoursTooltipCallback(context) {
    const rawValue = context.parsed.y; // valore in ore decimali
    const formatted = formatHoursToHMS(rawValue);
    return `Ore Lavorate: ${formatted}`;
}

/** Tooltip callback per ore lavorate su grafico a torta (pie chart) */
function hoursTooltipPieCallback(context) {
    const rawValue = context.parsed; // valore in ore decimali
    const formatted = formatHoursToHMS(rawValue);
    return `${context.label}: ${formatted}`;
}

/** Tooltip callback per guadagni in euro */
function earningsTooltipCallback(context) {
    const rawValue = context.parsed.y;
    return `Guadagni: €${rawValue.toFixed(2)}`;
}

function initializeDashboardEvents() {
    const contentSection = document.getElementById('content-section');
    contentSection.innerHTML = dashboardTemplate;

    requestAnimationFrame(() => {
        // Tooltips handled natively via title attribute

        loadClientsForDashboardFilter();

        const filterBtn = document.getElementById('dashboard-filter-btn');
        filterBtn.addEventListener('click', () => {
            const filters = getDashboardFilters();
            loadDashboardData(filters);
        });

        const earningsViewModeSelect = document.getElementById('earnings-view-mode');
        earningsViewModeSelect.addEventListener('change', () => {
            earningsChartViewMode = earningsViewModeSelect.value;
            const filters = getDashboardFilters();
            loadDashboardData(filters);
        });

        setInitialDateRangeAndLoadData();
    });
}

/** Imposta l'intervallo di date iniziali e carica i dati.
 *  Default: primo giorno del mese corrente → oggi */
function setInitialDateRangeAndLoadData() {
    const endDateInput = document.getElementById('dashboard-filter-date-end');
    const startDateInput = document.getElementById('dashboard-filter-date-start');

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    startDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
    endDateInput.value = now.toISOString().split('T')[0];

    const filters = getDashboardFilters();
    loadDashboardData(filters);
}

/** Carica i clienti per il filtro */
function loadClientsForDashboardFilter() {
    const clientSelect = document.getElementById('dashboard-filter-client');
    clientSelect.innerHTML = '<option value="">Tutti i Clienti</option>';
    db.collection('clients')
        .where('uid', '==', currentUser.uid)
        .orderBy('name')
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const client = doc.data();
                const opt = document.createElement('option');
                opt.value = client.name;
                opt.textContent = client.name;
                clientSelect.appendChild(opt);
            });
        })
        .catch(error => console.error('Errore nel caricamento clienti:', error));
}

/** Ottiene i filtri dalla UI */
function getDashboardFilters() {
    const startDateVal = document.getElementById('dashboard-filter-date-start').value;
    const endDateVal = document.getElementById('dashboard-filter-date-end').value;
    const clientName = document.getElementById('dashboard-filter-client').value;

    const filters = {};
    if (startDateVal) filters.startDate = new Date(startDateVal + 'T00:00:00');
    if (endDateVal) filters.endDate = new Date(endDateVal + 'T23:59:59');
    if (clientName) filters.clientName = clientName;

    return filters;
}

/** Carica i dati da Firestore e aggiorna i grafici */
async function loadDashboardData(filters) {
    try {
        let query = db.collection('timeLogs')
            .where('uid', '==', currentUser.uid)
            .where('isDeleted', '==', false);

        if (filters.clientName) {
            query = query.where('clientName', '==', filters.clientName);
        }
        if (filters.startDate) {
            query = query.where('startTime', '>=', firebase.firestore.Timestamp.fromDate(filters.startDate));
        }
        if (filters.endDate) {
            query = query.where('startTime', '<=', firebase.firestore.Timestamp.fromDate(filters.endDate));
        }

        query = query.orderBy('startTime', 'desc');

        const snapshot = await query.get();
        const timeLogs = snapshot.docs.map(d => d.data());

        // Aggiorna grafici
        updateCharts(timeLogs, filters);
    } catch (error) {
        console.error('Errore nel caricamento dei dati della dashboard:', error);
        Swal.fire({
            icon: 'error',
            title: 'Errore',
            text: 'Si è verificato un errore durante il caricamento dei dati della dashboard.',
            confirmButtonText: 'OK'
        });
    }
}

/** Aggiorna tutti i grafici */
function updateCharts(timeLogs, filters) {
    prepareWorkedTimeChart(timeLogs);
    prepareEarningsChart(timeLogs, filters);
    prepareWorktypeDistributionChart(timeLogs);
    prepareClientWorkedTimeChart(timeLogs);
}

/** Crea il grafico del tempo lavorato giornaliero */
function prepareWorkedTimeChart(timeLogs) {
    const canvas = document.getElementById('workedTimeChart');
    if (!canvas) return;
    if (workedTimeChartInstance) workedTimeChartInstance.destroy();

    const workedTimePerDay = {};
    timeLogs.forEach(log => {
        const dateStr = log.startTime.toDate().toLocaleDateString('it-IT');
        const hours = log.duration / 3600;
        workedTimePerDay[dateStr] = (workedTimePerDay[dateStr] || 0) + hours;
    });

    const labels = Object.keys(workedTimePerDay)
        .sort((a,b) => new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-')));
    const data = labels.map(l => workedTimePerDay[l]);

    workedTimeChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Ore Lavorate',
                data,
                backgroundColor: 'rgba(40, 167, 69, 0.6)',
                borderColor: 'rgba(40, 167, 69, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                x: { title: { display: true, text: 'Data' }},
                y: { title: { display: true, text: 'Ore' }, beginAtZero: true }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: hoursTooltipCallback
                    }
                }
            }
        }
    });
}

/** Crea il grafico dei guadagni */
function prepareEarningsChart(timeLogs, filters) {
    const canvas = document.getElementById('earningsChart');
    if (!canvas) return;
    if (earningsChartInstance) earningsChartInstance.destroy();

    const clientNames = new Set(timeLogs.map(l => l.clientName));
    const getDateStr = log => log.startTime.toDate().toLocaleDateString('it-IT');

    if (filters.clientName || earningsChartViewMode === 'combined' || clientNames.size === 1) {
        // Combinato
        const earningsPerDay = {};
        timeLogs.forEach(log => {
            const dateStr = getDateStr(log);
            const hr = log.hourlyRate || 0;
            const amount = (log.duration / 3600) * hr;
            earningsPerDay[dateStr] = (earningsPerDay[dateStr] || 0) + amount;
        });
        const labels = Object.keys(earningsPerDay)
            .sort((a,b) => new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-')));
        const data = labels.map(l => earningsPerDay[l]);

        earningsChartInstance = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Guadagni (€)',
                    data,
                    backgroundColor: 'rgba(23, 162, 184, 0.6)',
                    borderColor: 'rgba(23, 162, 184, 1)',
                    borderWidth: 2,
                    fill: false
                }]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Data' }},
                    y: { title: { display: true, text: 'Euro (€)' }, beginAtZero: true }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: earningsTooltipCallback
                        }
                    }
                }
            }
        });
    } else {
        // Per Cliente
        const earningsPerDayPerClient = {};
        timeLogs.forEach(log => {
            const dateStr = getDateStr(log);
            const hr = log.hourlyRate || 0;
            const amount = (log.duration / 3600) * hr;
            if (!earningsPerDayPerClient[log.clientName]) earningsPerDayPerClient[log.clientName] = {};
            earningsPerDayPerClient[log.clientName][dateStr] = (earningsPerDayPerClient[log.clientName][dateStr] || 0) + amount;
        });

        const allDates = new Set();
        Object.values(earningsPerDayPerClient).forEach(clientObj => {
            Object.keys(clientObj).forEach(d => allDates.add(d));
        });
        const labels = Array.from(allDates)
            .sort((a,b) => new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-')));

        const datasets = [];
        const colors = ['rgba(23,162,184,1)', 'rgba(220,53,69,1)', 'rgba(255,193,7,1)', 'rgba(40,167,69,1)', 'rgba(102,16,242,1)'];
        let cIndex = 0;
        clientNames.forEach(cn => {
            const color = colors[cIndex % colors.length];
            cIndex++;
            const data = labels.map(l => (earningsPerDayPerClient[cn][l] || 0));
            datasets.push({
                label: cn,
                data,
                backgroundColor: color.replace('1)', '0.6)'),
                borderColor: color,
                borderWidth: 2,
                fill: false
            });
        });

        earningsChartInstance = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels, datasets },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Data' }},
                    y: { title: { display: true, text: 'Euro (€)' }, beginAtZero: true }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: earningsTooltipCallback
                        }
                    }
                }
            }
        });
    }
}

/** Crea il grafico a torta della distribuzione dei tipi di lavoro */
const colorPalette = [
    '#f94144','#f3722c','#f8961e','#f9c74f',
    '#90be6d','#43aa8b','#4d908e','#577590','#277da1',
    '#9b5de5','#f15bb5','#fee440','#00bbf9','#00f5d4',
    '#b5179e','#7209b7','#560bad','#480ca8','#3a0ca3',
    '#3f37c9','#4361ee','#4895ef','#4cc9f0','#6a4c93'
];

function prepareWorktypeDistributionChart(timeLogs) {
    const canvas = document.getElementById('worktypeDistributionChart');
    if (!canvas) return;
    if (worktypeDistributionChartInstance) worktypeDistributionChartInstance.destroy();

    const worktypeDistribution = {};
    timeLogs.forEach(log => {
        const wName = log.worktypeName || 'Sconosciuto';
        const hours = log.duration / 3600;
        worktypeDistribution[wName] = (worktypeDistribution[wName] || 0) + hours;
    });

    const labels = Object.keys(worktypeDistribution);
    const data = labels.map(l => worktypeDistribution[l]);
    const backgroundColors = labels.map((_, i) => colorPalette[i % colorPalette.length]);

    worktypeDistributionChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                label: 'Ore Lavorate',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            // maintainAspectRatio: true, // lascialo commentato se vuoi più elasticità
            plugins: {
                tooltip: {
                    callbacks: {
                        label: hoursTooltipPieCallback
                    }
                },
                legend: {
                    position: 'bottom', // leggenda sotto il grafico
                    labels: {
                        boxWidth: 20,
                        boxHeight: 20,
                        padding: 10
                    }
                }
            },
            layout: {
                padding: {
                    top: 20,
                    bottom: 20
                }
            }
        }
    });
}

/** Crea il grafico a barre del tempo lavorato per cliente */
function prepareClientWorkedTimeChart(timeLogs) {
    const canvas = document.getElementById('clientWorkedTimeChart');
    if (!canvas) return;
    if (clientWorkedTimeChartInstance) clientWorkedTimeChartInstance.destroy();

    const workedTimePerClient = {};
    timeLogs.forEach(log => {
        const cname = log.clientName || 'Sconosciuto';
        const hours = log.duration / 3600;
        workedTimePerClient[cname] = (workedTimePerClient[cname] || 0) + hours;
    });

    const labels = Object.keys(workedTimePerClient);
    const data = labels.map(l => workedTimePerClient[l]);

    clientWorkedTimeChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Ore Lavorate per Cliente',
                data,
                backgroundColor: 'rgba(0, 123, 255, 0.6)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                x: { title: { display: true, text: 'Cliente' }},
                y: { title: { display: true, text: 'Ore' }, beginAtZero: true }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: hoursTooltipCallback
                    }
                }
            }
        }
    });
}

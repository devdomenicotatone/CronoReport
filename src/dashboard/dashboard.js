// dashboard.js — Dashboard Analitica PRO (Mobile-First)
// Refactored: Compute Once, Render Many

// ═══════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════
let dashActivePeriod = 'month'; // today | week | month | quarter | year | all | custom
let dashChartInstances = {};
let dashHeatmapView = 'week'; // 'week' (7 celle) | 'month' (31 celle) — solo per periodi lunghi
let lastHeatmapArgs = null; // {vm, start, end, period} per re-render dal toggle
let dashCustomStart = null; // Date — inizio range personalizzato
let dashCustomEnd = null;   // Date — fine range personalizzato
let dashFpStart = null;     // Flatpickr instance — picker "Da"
let dashFpEnd = null;       // Flatpickr instance — picker "A"
const DASH_CLIENT_COLORS = [
    { main: '#6366f1', light: 'rgba(99,102,241,0.18)' },   // indigo
    { main: '#10b981', light: 'rgba(16,185,129,0.18)' },   // emerald
    { main: '#f59e0b', light: 'rgba(245,158,11,0.18)' },   // amber
    { main: '#ef4444', light: 'rgba(239,68,68,0.18)' },    // rose
    { main: '#06b6d4', light: 'rgba(6,182,212,0.18)' },    // cyan
    { main: '#8b5cf6', light: 'rgba(139,92,246,0.18)' },   // violet
    { main: '#ec4899', light: 'rgba(236,72,153,0.18)' },   // pink
    { main: '#14b8a6', light: 'rgba(20,184,166,0.18)' },   // teal
];

// Mappa colori clienti: assegnati sequenzialmente in ordine alfabetico
// → Sempre distinti (fino a 8 clienti) e stabili tra periodi
let dashClientColorMap = {};

function buildClientColorMap(clientNames) {
    dashClientColorMap = {};
    const sorted = [...clientNames].sort((a, b) => a.localeCompare(b));
    sorted.forEach((name, i) => {
        dashClientColorMap[name] = DASH_CLIENT_COLORS[i % DASH_CLIENT_COLORS.length];
    });
}

function getDashClientColor(name) {
    return dashClientColorMap[name] || DASH_CLIENT_COLORS[0];
}

// ═══════════════════════════════════════════════
//  TEMPLATE
// ═══════════════════════════════════════════════
export const dashboardTemplate = `
<div id="dashboard-section" class="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

    <!-- Header -->
    <div class="flex items-center gap-3 mb-5">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <i class="fas fa-chart-line text-white text-lg"></i>
        </div>
        <div>
            <h2 class="text-xl sm:text-2xl font-bold text-surface-800 tracking-tight">Dashboard Analitica</h2>
            <p class="text-xs text-surface-400 mt-0.5 hidden sm:block">Panoramica completa della tua attività</p>
        </div>
    </div>

    <!-- ═══ QUICK PERIOD SELECTOR ═══ -->
    <div class="dash-period-bar mb-5" id="dash-period-bar">
        <button class="dash-period-chip" data-period="today">Oggi</button>
        <button class="dash-period-chip" data-period="week">Settimana</button>
        <button class="dash-period-chip dash-period-chip-active" data-period="month">Mese</button>
        <button class="dash-period-chip" data-period="quarter">Trimestre</button>
        <button class="dash-period-chip" data-period="year">Anno</button>
        <button class="dash-period-chip" data-period="all">Tutto</button>
        <button class="dash-period-chip dash-period-chip-custom" data-period="custom">
            <i class="fas fa-calendar-range"></i> Personalizzato
        </button>
    </div>

    <!-- ═══ CUSTOM DATE RANGE PANEL ═══ -->
    <div class="dash-custom-range" id="dash-custom-range">
        <div class="dash-custom-range-inner">
            <!-- Shortcut Pills -->
            <div class="dash-custom-shortcuts" id="dash-custom-shortcuts">
                <button class="dash-shortcut-pill" data-shortcut="last3m"><i class="fas fa-bolt"></i> Ultimi 3 mesi</button>
                <button class="dash-shortcut-pill" data-shortcut="last6m"><i class="fas fa-bolt"></i> Ultimi 6 mesi</button>
                <button class="dash-shortcut-pill" data-shortcut="lastyear"><i class="fas fa-calendar-check"></i> Anno scorso</button>
                <button class="dash-shortcut-pill" data-shortcut="ytd"><i class="fas fa-arrow-trend-up"></i> Da inizio anno</button>
            </div>

            <!-- Date Pickers -->
            <div class="dash-custom-pickers">
                <div class="dash-custom-picker-group">
                    <label class="dash-custom-label"><i class="fas fa-calendar-day"></i> Da</label>
                    <input type="text" id="dash-fp-start" class="dash-custom-input" placeholder="Seleziona data..." readonly>
                </div>
                <div class="dash-custom-picker-sep">
                    <i class="fas fa-arrow-right"></i>
                </div>
                <div class="dash-custom-picker-group">
                    <label class="dash-custom-label"><i class="fas fa-calendar-day"></i> A</label>
                    <input type="text" id="dash-fp-end" class="dash-custom-input" placeholder="Seleziona data..." readonly>
                </div>
            </div>

            <!-- Range Summary + Apply -->
            <div class="dash-custom-footer">
                <div class="dash-custom-summary" id="dash-custom-summary">
                    <i class="fas fa-info-circle"></i>
                    <span>Seleziona un intervallo di date</span>
                </div>
                <button class="dash-custom-apply" id="dash-custom-apply" disabled>
                    <i class="fas fa-check"></i> Applica
                </button>
            </div>
        </div>
    </div>

    <!-- ═══ KPI STRIP ═══ -->
    <div class="dash-kpi-strip mb-5" id="dash-kpi-strip">
        <div class="dash-kpi-card dash-kpi-hours">
            <div class="dash-kpi-icon"><i class="fas fa-clock"></i></div>
            <div class="dash-kpi-value" id="dash-kpi-hours">0h 00m</div>
            <div class="dash-kpi-label">Durata Totale</div>
        </div>
        <div class="dash-kpi-card dash-kpi-earnings">
            <div class="dash-kpi-icon"><i class="fas fa-euro-sign"></i></div>
            <div class="dash-kpi-value" id="dash-kpi-earnings">€ 0</div>
            <div class="dash-kpi-label">Guadagni</div>
        </div>
        <div class="dash-kpi-card dash-kpi-avg">
            <div class="dash-kpi-icon"><i class="fas fa-chart-bar"></i></div>
            <div class="dash-kpi-value" id="dash-kpi-avg">0h 00m</div>
            <div class="dash-kpi-label">Media/Giorno</div>
        </div>
        <div class="dash-kpi-card dash-kpi-top">
            <div class="dash-kpi-icon"><i class="fas fa-trophy"></i></div>
            <div class="dash-kpi-value dash-kpi-value-sm" id="dash-kpi-top">—</div>
            <div class="dash-kpi-label">Cliente Top</div>
        </div>
    </div>

    <!-- ═══ CHARTS GRID ═══ -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

        <!-- Tempo Lavorato (Stacked Bar) -->
        <div class="dash-chart-card lg:col-span-2">
            <div class="dash-chart-header" style="background: linear-gradient(135deg, #10b981, #059669);">
                <span class="dash-chart-title"><i class="fas fa-layer-group"></i> Tempo Lavorato per Cliente</span>
            </div>
            <div class="dash-chart-body">
                <canvas id="dashWorkedTimeChart"></canvas>
            </div>
        </div>

        <!-- Guadagni (Area Chart) -->
        <div class="dash-chart-card">
            <div class="dash-chart-header" style="background: linear-gradient(135deg, #06b6d4, #0891b2);">
                <span class="dash-chart-title"><i class="fas fa-euro-sign"></i> Andamento Guadagni</span>
            </div>
            <div class="dash-chart-body">
                <canvas id="dashEarningsChart"></canvas>
            </div>
        </div>

        <!-- Distribuzione Tipi di Lavoro (Doughnut) -->
        <div class="dash-chart-card">
            <div class="dash-chart-header" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                <span class="dash-chart-title"><i class="fas fa-chart-pie"></i> Distribuzione Lavoro</span>
            </div>
            <div class="dash-chart-body dash-chart-body-doughnut" style="display:flex;flex-direction:column;overflow:hidden;">
                <div style="flex:0 0 auto;min-height:180px;max-height:220px;position:relative;"><canvas id="dashWorktypeChart"></canvas></div>
                <div id="dashWorktypeLegend" style="max-height:110px;overflow-y:auto;padding:8px 4px 4px;display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:center;font-size:11px;"></div>
            </div>
        </div>
    </div>

    <!-- ═══ ROW: Classifica + Heatmap ═══ -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

        <!-- Classifica Clienti -->
        <div class="dash-chart-card">
            <div class="dash-chart-header" style="background: linear-gradient(135deg, #6366f1, #4f46e5);">
                <span class="dash-chart-title"><i class="fas fa-ranking-star"></i> Classifica Clienti</span>
            </div>
            <div class="dash-chart-body p-0" id="dash-client-ranking">
                <!-- Populated dynamically -->
            </div>
        </div>

        <!-- Heatmap Attività -->
        <div class="dash-chart-card">
            <div class="dash-chart-header" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
                <span class="dash-chart-title"><i class="fas fa-fire"></i> Mappa Attività</span>
                <div class="dash-hm-toggle" id="dash-hm-toggle" style="display:none;">
                    <button class="dash-hm-toggle-btn dash-hm-toggle-active" data-view="week">Settimana</button>
                    <button class="dash-hm-toggle-btn" data-view="month">Mese</button>
                </div>
            </div>
            <div class="dash-chart-body" id="dash-heatmap-container">
                <!-- Populated dynamically -->
            </div>
        </div>
    </div>

    <!-- ═══ SMART INSIGHTS ═══ -->
    <div class="dash-insights-card" id="dash-insights">
        <div class="dash-insights-header">
            <i class="fas fa-lightbulb"></i>
            <span>Smart Insights</span>
        </div>
        <div class="dash-insights-body" id="dash-insights-body">
            <!-- Populated dynamically -->
        </div>
    </div>

</div>
`;

// ═══════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════
export function initializeDashboardEvents() {
    const contentSection = document.getElementById('content-section');
    contentSection.innerHTML = dashboardTemplate;

    requestAnimationFrame(() => {
        // Period selector
        const periodBar = document.getElementById('dash-period-bar');
        const customPanel = document.getElementById('dash-custom-range');

        periodBar.addEventListener('click', (e) => {
            const chip = e.target.closest('.dash-period-chip');
            if (!chip) return;
            periodBar.querySelectorAll('.dash-period-chip').forEach(c => c.classList.remove('dash-period-chip-active'));
            chip.classList.add('dash-period-chip-active');
            dashActivePeriod = chip.dataset.period;

            if (dashActivePeriod === 'custom') {
                // Apri pannello custom
                customPanel.classList.add('dash-custom-range-open');
                // Non caricare subito — aspetta che l'utente selezioni le date
                if (dashCustomStart && dashCustomEnd) {
                    loadDashboardData();
                }
            } else {
                // Chiudi pannello custom + carica dati
                customPanel.classList.remove('dash-custom-range-open');
                loadDashboardData();
            }
        });

        // ═══ CUSTOM RANGE: Flatpickr Init ═══
        initCustomRangePickers();

        // ═══ CUSTOM RANGE: Shortcuts ═══
        const shortcutsBar = document.getElementById('dash-custom-shortcuts');
        shortcutsBar.addEventListener('click', (e) => {
            const pill = e.target.closest('.dash-shortcut-pill');
            if (!pill) return;
            const shortcut = pill.dataset.shortcut;
            const now = new Date();
            let s, en;

            switch (shortcut) {
                case 'last3m':
                    s = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                    en = new Date(now.getFullYear(), now.getMonth(), 0); // ultimo giorno mese precedente
                    break;
                case 'last6m':
                    s = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                    en = new Date(now.getFullYear(), now.getMonth(), 0);
                    break;
                case 'lastyear':
                    s = new Date(now.getFullYear() - 1, 0, 1);
                    en = new Date(now.getFullYear() - 1, 11, 31);
                    break;
                case 'ytd':
                    s = new Date(now.getFullYear(), 0, 1);
                    en = now;
                    break;
                default: return;
            }

            // Aggiorna Flatpickr + state
            dashCustomStart = s;
            dashCustomEnd = en;
            if (dashFpStart) dashFpStart.setDate(s, false);
            if (dashFpEnd) dashFpEnd.setDate(en, false);

            // Highlight shortcut attivo
            shortcutsBar.querySelectorAll('.dash-shortcut-pill').forEach(p => p.classList.remove('dash-shortcut-active'));
            pill.classList.add('dash-shortcut-active');

            updateCustomRangeSummary();
            loadDashboardData();
        });

        // ═══ CUSTOM RANGE: Apply Button ═══
        document.getElementById('dash-custom-apply').addEventListener('click', () => {
            if (dashCustomStart && dashCustomEnd) {
                loadDashboardData();
            }
        });

        // Heatmap view toggle
        const hmToggle = document.getElementById('dash-hm-toggle');
        hmToggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.dash-hm-toggle-btn');
            if (!btn) return;
            hmToggle.querySelectorAll('.dash-hm-toggle-btn').forEach(b => b.classList.remove('dash-hm-toggle-active'));
            btn.classList.add('dash-hm-toggle-active');
            dashHeatmapView = btn.dataset.view;
            // Re-render senza ricaricare dati
            if (lastHeatmapArgs) {
                renderHeatmap(lastHeatmapArgs.vm, lastHeatmapArgs.start, lastHeatmapArgs.end, lastHeatmapArgs.period);
            }
        });

        // Initial load
        loadDashboardData();
    });
}

// ═══════════════════════════════════════════════
//  CUSTOM RANGE PICKER SETUP
// ═══════════════════════════════════════════════
function initCustomRangePickers() {
    const fpConfig = {
        locale: flatpickr.l10ns.it || 'it',
        dateFormat: 'd M Y',
        altInput: true,
        altFormat: 'd M Y',
        disableMobile: true,
        monthSelectorType: 'dropdown',
        animate: true,
        position: 'below',
    };

    dashFpStart = flatpickr('#dash-fp-start', {
        ...fpConfig,
        defaultDate: dashCustomStart,
        onChange: ([date]) => {
            dashCustomStart = date || null;
            // Imposta minDate sul picker fine
            if (dashFpEnd && date) {
                dashFpEnd.set('minDate', date);
            }
            clearShortcutHighlight();
            updateCustomRangeSummary();
        }
    });

    dashFpEnd = flatpickr('#dash-fp-end', {
        ...fpConfig,
        defaultDate: dashCustomEnd,
        onChange: ([date]) => {
            dashCustomEnd = date || null;
            // Imposta maxDate sul picker inizio
            if (dashFpStart && date) {
                dashFpStart.set('maxDate', date);
            }
            clearShortcutHighlight();
            updateCustomRangeSummary();
        }
    });
}

function updateCustomRangeSummary() {
    const summary = document.getElementById('dash-custom-summary');
    const applyBtn = document.getElementById('dash-custom-apply');
    if (!summary || !applyBtn) return;

    if (dashCustomStart && dashCustomEnd) {
        const fmtOpts = { day: '2-digit', month: 'short', year: 'numeric' };
        const startLabel = dashCustomStart.toLocaleDateString('it-IT', fmtOpts);
        const endLabel = dashCustomEnd.toLocaleDateString('it-IT', fmtOpts);

        // Calcola durata in giorni
        const diffDays = Math.round((dashCustomEnd - dashCustomStart) / 86400000) + 1;

        summary.innerHTML = `
            <i class="fas fa-calendar-check"></i>
            <span><strong>${startLabel}</strong> → <strong>${endLabel}</strong> <span class="dash-custom-days">(${diffDays} giorni)</span></span>
        `;
        summary.classList.add('dash-custom-summary-active');
        applyBtn.disabled = false;
    } else {
        summary.innerHTML = '<i class="fas fa-info-circle"></i><span>Seleziona un intervallo di date</span>';
        summary.classList.remove('dash-custom-summary-active');
        applyBtn.disabled = true;
    }
}

function clearShortcutHighlight() {
    const bar = document.getElementById('dash-custom-shortcuts');
    if (bar) bar.querySelectorAll('.dash-shortcut-pill').forEach(p => p.classList.remove('dash-shortcut-active'));
}

// ═══════════════════════════════════════════════
//  DATE RANGE HELPERS
// ═══════════════════════════════════════════════
function getDashDateRange(period) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start, end;

    switch (period) {
        case 'today':
            start = today;
            end = new Date(today.getTime() + 86400000 - 1);
            break;
        case 'week': {
            const dow = today.getDay() || 7; // Mon=1
            start = new Date(today);
            start.setDate(today.getDate() - dow + 1);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        }
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'quarter': {
            const qMonth = Math.floor(now.getMonth() / 3) * 3;
            start = new Date(now.getFullYear(), qMonth, 1);
            end = new Date(now.getFullYear(), qMonth + 3, 0, 23, 59, 59, 999);
            break;
        }
        case 'year':
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
        case 'all':
            start = new Date(2020, 0, 1);
            end = new Date(now.getFullYear() + 1, 0, 1);
            break;
        case 'custom':
            start = dashCustomStart ? new Date(dashCustomStart.getFullYear(), dashCustomStart.getMonth(), dashCustomStart.getDate()) : new Date(2020, 0, 1);
            end = dashCustomEnd ? new Date(dashCustomEnd.getFullYear(), dashCustomEnd.getMonth(), dashCustomEnd.getDate(), 23, 59, 59, 999) : now;
            break;
        default:
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = now;
    }
    return { start, end };
}

// ═══════════════════════════════════════════════
//  DATA LAYER — Compute Once, Render Many
// ═══════════════════════════════════════════════
function computeDashboardData(timeLogs) {
    const vm = {
        totalSec: 0,
        totalEarnings: 0,
        workedDays: new Set(),
        // {nome: {sec, hours, earnings}}
        clientMap: {},
        // {isoDate: {label, hours, earnings, clients: {nome: hours}}}
        dateMap: {},
        // {nome: {sec, earnings}}
        worktypeMap: {},
        // Array[7] di {sec, days: Set<isoDate>} — Lun(0)..Dom(6)
        dayOfWeekMap: Array.from({ length: 7 }, () => ({ sec: 0, days: new Set() })),
        unreportedCount: 0,
        unreportedEarnings: 0,
        clientCount: 0,
    };

    for (const l of timeLogs) {
        const sec = l.duration || 0;
        const rate = l.hourlyRate || 0;
        const hours = sec / 3600;
        const earning = hours * rate;
        const date = l.startTime.toDate();
        const isoDate = date.toISOString().split('T')[0];
        const dateLabel = date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
        const dateLabelFull = date.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' });
        const cn = l.clientName || 'Sconosciuto';
        const wt = l.worktypeName || 'Altro';
        const dow = date.getDay();
        const dowIdx = dow === 0 ? 6 : dow - 1; // Mon=0 ... Sun=6

        // Totali globali
        vm.totalSec += sec;
        vm.totalEarnings += earning;
        vm.workedDays.add(isoDate);

        // Aggregati per cliente
        if (!vm.clientMap[cn]) vm.clientMap[cn] = { sec: 0, hours: 0, earnings: 0 };
        vm.clientMap[cn].sec += sec;
        vm.clientMap[cn].hours += hours;
        vm.clientMap[cn].earnings += earning;

        // Aggregati per data (per grafici bar/area e heatmap)
        if (!vm.dateMap[isoDate]) vm.dateMap[isoDate] = { label: dateLabel, labelFull: dateLabelFull, hours: 0, earnings: 0, clients: {} };
        vm.dateMap[isoDate].hours += hours;
        vm.dateMap[isoDate].earnings += earning;
        vm.dateMap[isoDate].clients[cn] = (vm.dateMap[isoDate].clients[cn] || 0) + hours;

        // Aggregati per tipo di lavoro
        if (!vm.worktypeMap[wt]) vm.worktypeMap[wt] = { sec: 0, earnings: 0 };
        vm.worktypeMap[wt].sec += sec;
        vm.worktypeMap[wt].earnings += earning;

        // Giorno della settimana — FIX BUG-4: conta i GIORNI unici, non i log
        vm.dayOfWeekMap[dowIdx].sec += sec;
        vm.dayOfWeekMap[dowIdx].days.add(isoDate);

        // Timer non reportati
        if (!l.isReported) {
            vm.unreportedCount++;
            vm.unreportedEarnings += earning;
        }
    }

    vm.clientCount = Object.keys(vm.clientMap).length;
    return vm;
}

// ═══════════════════════════════════════════════
//  DATA LOADING
// ═══════════════════════════════════════════════
export async function loadDashboardData() {
    try {
        const { start, end } = getDashDateRange(dashActivePeriod);

        let query = db.collection('timeLogs')
            .where('uid', '==', currentUser.uid)
            .where('isDeleted', '==', false)
            .where('startTime', '>=', firebase.firestore.Timestamp.fromDate(start))
            .where('startTime', '<=', firebase.firestore.Timestamp.fromDate(end))
            .orderBy('startTime', 'desc');

        const snapshot = await query.get();
        const timeLogs = snapshot.docs.map(d => d.data());

        // Periodo precedente per trend comparison
        // FIX BUG-3: per "all", filtra in-memory invece di fare una seconda query
        let prevTimeLogs = [];
        if (dashActivePeriod === 'all') {
            const now = new Date();
            const thisYear = now.getFullYear();
            // Confronto equo: anno corrente vs anno precedente (entrambi in-memory)
            prevTimeLogs = timeLogs.filter(l => {
                const y = l.startTime.toDate().getFullYear();
                return y === thisYear - 1;
            });
        } else if (dashActivePeriod === 'custom') {
            // Per custom: confronto con intervallo identico immediatamente precedente
            const periodMs = end.getTime() - start.getTime();
            const prevStart = new Date(start.getTime() - periodMs);
            const prevEnd = new Date(start.getTime() - 1);
            const prevQuery = db.collection('timeLogs')
                .where('uid', '==', currentUser.uid)
                .where('isDeleted', '==', false)
                .where('startTime', '>=', firebase.firestore.Timestamp.fromDate(prevStart))
                .where('startTime', '<=', firebase.firestore.Timestamp.fromDate(prevEnd))
                .orderBy('startTime', 'desc');
            const prevSnapshot = await prevQuery.get();
            prevTimeLogs = prevSnapshot.docs.map(d => d.data());
        } else {
            const periodMs = end.getTime() - start.getTime();
            const prevStart = new Date(start.getTime() - periodMs);
            const prevEnd = new Date(start.getTime() - 1);
            const prevQuery = db.collection('timeLogs')
                .where('uid', '==', currentUser.uid)
                .where('isDeleted', '==', false)
                .where('startTime', '>=', firebase.firestore.Timestamp.fromDate(prevStart))
                .where('startTime', '<=', firebase.firestore.Timestamp.fromDate(prevEnd))
                .orderBy('startTime', 'desc');
            const prevSnapshot = await prevQuery.get();
            prevTimeLogs = prevSnapshot.docs.map(d => d.data());
        }

        // Compute Once — singola passata su tutti i log
        const vm = computeDashboardData(timeLogs);
        const prevVm = computeDashboardData(prevTimeLogs);

        // Assegna colori unici e stabili ai clienti (ordine alfabetico)
        buildClientColorMap(Object.keys(vm.clientMap));

        // Render Many — ogni render riceve il ViewModel pre-computato
        renderKPIs(vm);
        renderWorkedTimeChart(vm);
        renderEarningsChart(vm);
        renderWorktypeChart(vm);
        renderClientRanking(vm);
        renderHeatmap(vm, start, end, dashActivePeriod);
        renderInsights(vm, prevVm, dashActivePeriod);

    } catch (error) {
        console.error('Errore dashboard:', error);
    }
}

// ═══════════════════════════════════════════════
//  FORMAT HELPERS
// ═══════════════════════════════════════════════
function fmtHM(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function fmtHoursToHM(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function fmtEuro(amount) {
    return `€ ${amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDateShort(date) {
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

// ═══════════════════════════════════════════════
//  KPI RENDERING
// ═══════════════════════════════════════════════
function renderKPIs(vm) {
    // Ore totali
    document.getElementById('dash-kpi-hours').textContent = fmtHM(vm.totalSec);

    // Guadagni totali
    document.getElementById('dash-kpi-earnings').textContent = fmtEuro(vm.totalEarnings);

    // Media per giorno lavorato
    const workedDaysCount = vm.workedDays.size;
    const avgSec = workedDaysCount > 0 ? vm.totalSec / workedDaysCount : 0;
    document.getElementById('dash-kpi-avg').textContent = fmtHM(avgSec);

    // Cliente top (per secondi lavorati, dal clientMap pre-computato)
    const topClient = Object.entries(vm.clientMap).sort((a, b) => b[1].sec - a[1].sec)[0];
    document.getElementById('dash-kpi-top').textContent = topClient ? topClient[0] : '—';

    // Animate KPI cards
    document.querySelectorAll('.dash-kpi-card').forEach((card, i) => {
        card.style.animationDelay = `${i * 0.08}s`;
        card.classList.remove('dash-kpi-animate');
        void card.offsetWidth; // force reflow
        card.classList.add('dash-kpi-animate');
    });
}

// ═══════════════════════════════════════════════
//  WORKED TIME CHART (STACKED BAR PER CLIENT)
// ═══════════════════════════════════════════════
function renderWorkedTimeChart(vm) {
    const canvas = document.getElementById('dashWorkedTimeChart');
    if (!canvas) return;
    if (dashChartInstances.workedTime) dashChartInstances.workedTime.destroy();

    const sortedDates = Object.keys(vm.dateMap).sort();
    const labels = sortedDates.map(k => vm.dateMap[k].label);

    // Raccogli tutti i clienti unici dalle date
    const clientSet = new Set();
    for (const k of sortedDates) {
        for (const cn of Object.keys(vm.dateMap[k].clients)) {
            clientSet.add(cn);
        }
    }
    const clients = Array.from(clientSet);

    const datasets = clients.map(cn => {
        const color = getDashClientColor(cn);
        return {
            label: cn,
            data: sortedDates.map(k => vm.dateMap[k].clients[cn] || 0),
            backgroundColor: color.main + 'CC',
            borderColor: color.main,
            borderWidth: 1,
            borderRadius: 4,
        };
    });

    dashChartInstances.workedTime = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 } } },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: { display: true, text: 'Durata', font: { size: 12, weight: 600 } },
                    grid: { color: 'rgba(0,0,0,0.04)' }
                }
            },
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 14, padding: 16, font: { size: 12 } } },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            if (!items.length) return '';
                            const idx = items[0].dataIndex;
                            const key = sortedDates[idx];
                            return vm.dateMap[key]?.labelFull || items[0].label;
                        },
                        label: (ctx) => ` ${ctx.dataset.label}: ${fmtHoursToHM(ctx.parsed.y)}`
                    }
                }
            }
        }
    });
}

// ═══════════════════════════════════════════════
//  EARNINGS CHART (AREA)
// ═══════════════════════════════════════════════
function renderEarningsChart(vm) {
    const canvas = document.getElementById('dashEarningsChart');
    if (!canvas) return;
    if (dashChartInstances.earnings) dashChartInstances.earnings.destroy();

    const sortedKeys = Object.keys(vm.dateMap).sort();
    const labels = sortedKeys.map(k => vm.dateMap[k].label);
    const data = sortedKeys.map(k => vm.dateMap[k].earnings);

    // Cumulativo
    let cumulative = 0;
    const cumulativeData = data.map(v => { cumulative += v; return cumulative; });

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.02)');

    dashChartInstances.earnings = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Guadagno Giornaliero',
                    data,
                    borderColor: '#06b6d4',
                    backgroundColor: gradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                    pointBackgroundColor: '#06b6d4',
                    pointHoverRadius: 6,
                },
                {
                    label: 'Cumulativo',
                    data: cumulativeData,
                    borderColor: '#8b5cf6',
                    borderWidth: 2,
                    borderDash: [6, 3],
                    fill: false,
                    tension: 0.35,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    ticks: { callback: v => `€${v}` }
                }
            },
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 14, padding: 16, font: { size: 12 } } },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            if (!items.length) return '';
                            const idx = items[0].dataIndex;
                            const key = sortedKeys[idx];
                            return vm.dateMap[key]?.labelFull || items[0].label;
                        },
                        label: (ctx) => ` ${ctx.dataset.label}: €${ctx.parsed.y.toFixed(2)}`
                    }
                }
            }
        }
    });
}

// ═══════════════════════════════════════════════
//  WORKTYPE CHART (DOUGHNUT)
// ═══════════════════════════════════════════════
function renderWorktypeChart(vm) {
    const canvas = document.getElementById('dashWorktypeChart');
    if (!canvas) return;
    if (dashChartInstances.worktype) dashChartInstances.worktype.destroy();

    // Converti da secondi a ore per la visualizzazione
    const wtHours = {};
    for (const [wt, d] of Object.entries(vm.worktypeMap)) {
        wtHours[wt] = d.sec / 3600;
    }

    // Raggruppa worktypes piccoli in "Altro" se sono più di 10
    let labels, data;
    const MAX_SLICES = 10;
    const entries = Object.entries(wtHours).sort((a, b) => b[1] - a[1]);

    if (entries.length > MAX_SLICES) {
        const top = entries.slice(0, MAX_SLICES);
        const rest = entries.slice(MAX_SLICES);
        const otherHours = rest.reduce((s, [, v]) => s + v, 0);
        labels = top.map(([k]) => k);
        data = top.map(([, v]) => v);
        if (otherHours > 0) {
            labels.push(`Altro (${rest.length} tipi)`);
            data.push(otherHours);
        }
    } else {
        labels = entries.map(([k]) => k);
        data = entries.map(([, v]) => v);
    }

    const totalHours = data.reduce((s, v) => s + v, 0);
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6', '#94a3b8'];

    dashChartInstances.worktype = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: labels.map((_, i) => colors[i % colors.length]),
                borderWidth: 2,
                borderColor: '#fff',
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '60%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const pct = totalHours > 0 ? ((ctx.parsed / totalHours) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}: ${fmtHoursToHM(ctx.parsed)} (${pct}%)`;
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'centerText',
            afterDraw(chart) {
                const { ctx, chartArea } = chart;
                const cx = (chartArea.left + chartArea.right) / 2;
                const cy = (chartArea.top + chartArea.bottom) / 2;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'bold 1.3rem Inter, sans-serif';
                ctx.fillStyle = '#1e293b';
                ctx.fillText(fmtHM(totalHours * 3600), cx, cy - 8);
                ctx.font = '500 0.7rem Inter, sans-serif';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText('totali', cx, cy + 14);
                ctx.restore();
            }
        }]
    });

    // Legenda HTML custom scrollabile
    const legendEl = document.getElementById('dashWorktypeLegend');
    if (legendEl) {
        legendEl.innerHTML = '';
        labels.forEach((label, i) => {
            const item = document.createElement('span');
            item.style.cssText = 'display:inline-flex;align-items:center;gap:4px;white-space:nowrap;cursor:pointer;';
            const dot = document.createElement('span');
            dot.style.cssText = `width:10px;height:10px;border-radius:50%;flex-shrink:0;background:${colors[i % colors.length]};`;
            const txt = document.createElement('span');
            txt.style.color = '#64748b';
            txt.textContent = label;
            item.appendChild(dot);
            item.appendChild(txt);
            legendEl.appendChild(item);
        });
    }
}

// ═══════════════════════════════════════════════
//  CLIENT RANKING
// ═══════════════════════════════════════════════
function renderClientRanking(vm) {
    const container = document.getElementById('dash-client-ranking');
    if (!container) return;
    container.innerHTML = '';

    const sorted = Object.entries(vm.clientMap).sort((a, b) => b[1].hours - a[1].hours);
    const maxHours = sorted.length > 0 ? sorted[0][1].hours : 1;
    const totalHours = sorted.reduce((s, [, v]) => s + v.hours, 0);

    if (sorted.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-surface-400 text-sm">Nessun dato disponibile</div>';
        return;
    }

    sorted.forEach(([name, data], idx) => {
        const color = getDashClientColor(name);
        const pct = totalHours > 0 ? ((data.hours / totalHours) * 100).toFixed(1) : 0;
        const barWidth = (data.hours / maxHours) * 100;

        const row = document.createElement('div');
        row.className = 'dash-rank-row';
        row.style.animationDelay = `${idx * 0.06}s`;
        row.innerHTML = `
            <div class="dash-rank-pos">${idx + 1}</div>
            <div class="dash-rank-info">
                <div class="dash-rank-name">${name}</div>
                <div class="dash-rank-bar-track">
                    <div class="dash-rank-bar" style="width:${barWidth}%;background:${color.main};"></div>
                </div>
            </div>
            <div class="dash-rank-stats">
                <span class="dash-rank-hours">${fmtHoursToHM(data.hours)}</span>
                <span class="dash-rank-euro">${fmtEuro(data.earnings)}</span>
                <span class="dash-rank-pct">${pct}%</span>
            </div>
        `;
        container.appendChild(row);
    });
}

// ═══════════════════════════════════════════════
//  HEATMAP
// ═══════════════════════════════════════════════
function renderHeatmap(vm, start, end, period) {
    const container = document.getElementById('dash-heatmap-container');
    if (!container) return;
    container.innerHTML = '';

    const now = new Date();
    const isLongPeriod = period === 'quarter' || period === 'year' || period === 'all';

    // Salva args per re-render dal toggle
    lastHeatmapArgs = { vm, start, end, period };

    // Mostra/nascondi toggle
    const toggleEl = document.getElementById('dash-hm-toggle');
    if (toggleEl) toggleEl.style.display = isLongPeriod ? 'flex' : 'none';

    if (!isLongPeriod) {
        // === PERIODI BREVI: CALENDARIO REALE ===
        renderHeatmapCalendar(container, vm, start, end, period, now);
    } else if (dashHeatmapView === 'week') {
        // === 7 CELLE: MEDIA PER GIORNO DELLA SETTIMANA ===
        renderHeatmapWeekView(container, vm, period);
    } else {
        // === 31 CELLE: MEDIA PER GIORNO DEL MESE ===
        renderHeatmapMonthView(container, vm, start, end, period, now);
    }

    // Legenda
    const legend = document.createElement('div');
    legend.className = 'dash-hm-legend';
    legend.innerHTML = `
        <span class="text-xs text-surface-400">Meno</span>
        <div class="dash-hm-cell dash-hm-cell-legend" style="background:#f1f5f9;"></div>
        <div class="dash-hm-cell dash-hm-cell-legend" style="background:rgba(99,102,241,0.2);"></div>
        <div class="dash-hm-cell dash-hm-cell-legend" style="background:rgba(99,102,241,0.45);"></div>
        <div class="dash-hm-cell dash-hm-cell-legend" style="background:rgba(99,102,241,0.7);"></div>
        <div class="dash-hm-cell dash-hm-cell-legend" style="background:rgba(99,102,241,1);"></div>
        <span class="text-xs text-surface-400">Più</span>
    `;
    container.appendChild(legend);
}

/**
 * Calendario reale: per periodi brevi (oggi/settimana/mese)
 * Mostra le ore effettive per ogni giorno
 */
function renderHeatmapCalendar(container, vm, start, end, period, now) {
    const dayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    const hmEndDate = new Date(Math.min(end.getTime(), now.getTime()));
    hmEndDate.setHours(23, 59, 59, 999);

    let hmStart, hmEnd;
    if (period === 'today' || period === 'week') {
        const dow = hmEndDate.getDay() || 7;
        hmStart = new Date(hmEndDate);
        hmStart.setDate(hmEndDate.getDate() - dow + 1);
        hmStart.setHours(0, 0, 0, 0);
        hmEnd = hmEndDate;
    } else {
        hmStart = new Date(hmEndDate.getFullYear(), hmEndDate.getMonth(), 1);
        hmEnd = hmEndDate;
    }

    // Estrai ore reali nel range
    const dayMap = {};
    let maxH = 0.1;
    for (const [isoDate, d] of Object.entries(vm.dateMap)) {
        const date = new Date(isoDate + 'T12:00:00');
        if (date >= hmStart && date <= hmEnd) {
            dayMap[isoDate] = d.hours;
            maxH = Math.max(maxH, d.hours);
        }
    }

    // Header
    const headerRow = document.createElement('div');
    headerRow.className = 'dash-hm-header';
    dayLabels.forEach(d => {
        const span = document.createElement('span');
        span.textContent = d;
        headerRow.appendChild(span);
    });
    container.appendChild(headerRow);

    // Grid
    const gridEl = document.createElement('div');
    gridEl.className = 'dash-hm-grid';

    const cur = new Date(hmStart);
    const dow = cur.getDay() || 7;
    cur.setDate(cur.getDate() - dow + 1);

    while (cur <= hmEnd) {
        for (let d = 0; d < 7; d++) {
            const cellDate = new Date(cur);
            cellDate.setDate(cur.getDate() + d);
            const key = cellDate.toISOString().split('T')[0];
            const hours = dayMap[key] || 0;
            const intensity = hours > 0 ? Math.max(0.15, hours / maxH) : 0;
            const inRange = cellDate >= hmStart && cellDate <= hmEnd;

            const cell = document.createElement('div');
            cell.className = 'dash-hm-cell';

            if (!inRange) {
                cell.style.opacity = '0.15';
                cell.style.background = '#f1f5f9';
            } else if (hours > 0) {
                cell.style.background = `rgba(99,102,241,${intensity})`;
            } else {
                cell.style.background = '#f1f5f9';
            }

            if (inRange) {
                cell.classList.add('dash-hm-cell-numbered');
                const dayNum = document.createElement('span');
                dayNum.className = 'dash-hm-day-num';
                dayNum.textContent = cellDate.getDate();
                cell.appendChild(dayNum);
            }

            const dateLabel = cellDate.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
            cell.title = inRange
                ? `${dateLabel}: ${hours > 0 ? fmtHoursToHM(hours) : 'Nessuna attività'}`
                : '';

            gridEl.appendChild(cell);
        }
        cur.setDate(cur.getDate() + 7);
    }
    container.appendChild(gridEl);
}

/**
 * Vista Settimana: 7 celle grandi con media per giorno della settimana
 */
function renderHeatmapWeekView(container, vm, period) {
    const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    const periodLabels = { quarter: 'nel trimestre', year: "nell'anno", all: 'nello storico' };

    // Sottotitolo
    const subtitle = document.createElement('div');
    subtitle.className = 'dash-hm-subtitle';
    subtitle.textContent = `Media ore per giorno della settimana ${periodLabels[period] || ''}`;
    container.appendChild(subtitle);

    // Calcola medie per DOW
    const dayAvgs = vm.dayOfWeekMap.map(d => d.days.size > 0 ? d.sec / d.days.size : 0);
    const maxAvg = Math.max(...dayAvgs, 1);

    // Grid 7 celle grandi
    const gridEl = document.createElement('div');
    gridEl.className = 'dash-hm-week-grid';

    dayNames.forEach((name, i) => {
        const avgSec = dayAvgs[i];
        const avgHours = avgSec / 3600;
        const intensity = avgSec > 0 ? Math.max(0.15, avgSec / maxAvg) : 0;
        const daysCount = vm.dayOfWeekMap[i].days.size;

        const cell = document.createElement('div');
        cell.className = 'dash-hm-week-cell';

        if (avgSec > 0) {
            cell.style.background = `rgba(99,102,241,${intensity})`;
        } else {
            cell.style.background = '#f1f5f9';
        }

        const labelEl = document.createElement('span');
        labelEl.className = 'dash-hm-week-label';
        labelEl.textContent = name;

        const valueEl = document.createElement('span');
        valueEl.className = 'dash-hm-week-value';
        valueEl.textContent = avgSec > 0 ? fmtHM(avgSec) : '—';

        // Contrasto testo
        if (intensity > 0.55) {
            labelEl.style.color = 'rgba(255,255,255,0.7)';
            valueEl.style.color = 'white';
        }

        cell.appendChild(labelEl);
        cell.appendChild(valueEl);
        cell.title = daysCount > 0
            ? `${name}: media ${fmtHM(avgSec)} su ${daysCount} giorni`
            : `${name}: Nessuna attività`;

        gridEl.appendChild(cell);
    });

    container.appendChild(gridEl);
}

/**
 * Vista Mese: 31 celle sequenziali, media per giorno del mese
 * Flusso 1→31 senza header Lun-Dom
 */
function renderHeatmapMonthView(container, vm, start, end, period, now) {
    const periodLabels = { quarter: 'nel trimestre', year: "nell'anno", all: 'nello storico' };

    // Sottotitolo
    const subtitle = document.createElement('div');
    subtitle.className = 'dash-hm-subtitle';
    subtitle.textContent = `Media ore per giorno del mese ${periodLabels[period] || ''}`;
    container.appendChild(subtitle);

    // Calcola media per giorno del mese (1-31)
    const dayOfMonthStats = {};
    for (const [isoDate, d] of Object.entries(vm.dateMap)) {
        const date = new Date(isoDate + 'T12:00:00');
        const dom = date.getDate();
        if (!dayOfMonthStats[dom]) dayOfMonthStats[dom] = { totalHours: 0, count: 0 };
        dayOfMonthStats[dom].totalHours += d.hours;
        dayOfMonthStats[dom].count++;
    }

    // Conta mesi nel periodo
    const periodStart = new Date(Math.max(start.getTime(), new Date(2020, 0, 1).getTime()));
    const periodEnd = new Date(Math.min(end.getTime(), now.getTime()));
    let totalMonths = 0;
    const ms = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
    while (ms <= periodEnd) { totalMonths++; ms.setMonth(ms.getMonth() + 1); }
    totalMonths = Math.max(totalMonths, 1);

    // Calcola le medie
    let maxAvg = 0.1;
    const avgByDay = {};
    for (let day = 1; day <= 31; day++) {
        const stats = dayOfMonthStats[day];
        const avg = stats ? stats.totalHours / totalMonths : 0;
        avgByDay[day] = { avg, count: stats?.count || 0 };
        maxAvg = Math.max(maxAvg, avg);
    }

    // Grid sequenziale 7 colonne
    const gridEl = document.createElement('div');
    gridEl.className = 'dash-hm-grid';

    for (let day = 1; day <= 31; day++) {
        const { avg, count } = avgByDay[day];
        const intensity = avg > 0 ? Math.max(0.15, avg / maxAvg) : 0;

        const cell = document.createElement('div');
        cell.className = 'dash-hm-cell dash-hm-cell-numbered';

        if (avg > 0) {
            cell.style.background = `rgba(99,102,241,${intensity})`;
        } else {
            cell.style.background = '#f1f5f9';
        }

        const dayNum = document.createElement('span');
        dayNum.className = 'dash-hm-day-num';
        dayNum.textContent = day;

        // Contrasto
        if (intensity > 0.55) {
            dayNum.style.color = 'rgba(255,255,255,0.8)';
        }

        cell.appendChild(dayNum);
        cell.title = count > 0
            ? `Giorno ${day}: media ${fmtHoursToHM(avg)}/mese (${count} volte)`
            : `Giorno ${day}: Nessuna attività`;

        gridEl.appendChild(cell);
    }

    container.appendChild(gridEl);
}

// ═══════════════════════════════════════════════
//  SMART INSIGHTS
// ═══════════════════════════════════════════════
function renderInsights(vm, prevVm, period) {
    const container = document.getElementById('dash-insights-body');
    if (!container) return;
    container.innerHTML = '';

    const insights = [];

    if (vm.totalSec === 0) {
        container.innerHTML = '<div class="text-surface-400 text-sm p-2">Nessun dato disponibile per generare insights.</div>';
        return;
    }

    // 1. 🏆 GIORNO RECORD — il singolo giorno con più ore lavorate
    const dateEntries = Object.entries(vm.dateMap);
    if (dateEntries.length > 0) {
        const [recordDate, recordData] = dateEntries.reduce((best, curr) =>
            curr[1].hours > best[1].hours ? curr : best
        );
        const recordDateObj = new Date(recordDate + 'T12:00:00');
        const recordLabel = recordDateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        insights.push({
            icon: 'fa-trophy',
            color: '#f59e0b',
            text: `Il tuo giorno record è <strong>${recordLabel}</strong> con <strong>${fmtHoursToHM(recordData.hours)}</strong> lavorate`
        });
    }

    // 2. 📅 PATTERN SETTIMANALE — in media, quale giorno della settimana è il più attivo
    const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    const dayAvgs = vm.dayOfWeekMap.map(d => d.days.size > 0 ? d.sec / d.days.size : 0);
    const bestDayIdx = dayAvgs.indexOf(Math.max(...dayAvgs));
    if (dayAvgs[bestDayIdx] > 0) {
        insights.push({
            icon: 'fa-calendar-check',
            color: '#10b981',
            text: `In media, lavori di più il <strong>${dayNames[bestDayIdx]}</strong> (${fmtHM(dayAvgs[bestDayIdx])}/giorno su ${vm.dayOfWeekMap[bestDayIdx].days.size} ${dayNames[bestDayIdx].toLowerCase().slice(0, -1)}ì)`
        });
    }

    // 3. 💎 TIPO DI LAVORO PIÙ REDDITIZIO
    const bestWt = Object.entries(vm.worktypeMap).sort((a, b) => b[1].earnings - a[1].earnings)[0];
    if (bestWt && bestWt[1].earnings > 0) {
        const wtPct = vm.totalEarnings > 0 ? ((bestWt[1].earnings / vm.totalEarnings) * 100).toFixed(0) : 0;
        insights.push({
            icon: 'fa-gem',
            color: '#8b5cf6',
            text: `Il tipo di lavoro più redditizio è <strong>${bestWt[0]}</strong> (${fmtEuro(bestWt[1].earnings)} — ${wtPct}% del totale)`
        });
    }

    // 4. 📈 TREND VS PERIODO PRECEDENTE
    if (prevVm.totalSec > 0) {
        const pctChange = ((vm.totalSec - prevVm.totalSec) / prevVm.totalSec * 100).toFixed(0);
        const isUp = vm.totalSec >= prevVm.totalSec;
        const periodLabel = period === 'all' ? "rispetto all'anno precedente" : 'rispetto al periodo precedente';
        insights.push({
            icon: isUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down',
            color: isUp ? '#10b981' : '#ef4444',
            text: `Hai lavorato <strong>${Math.abs(pctChange)}% ${isUp ? 'in più' : 'in meno'}</strong> ${periodLabel}`
        });
    }

    // 5. 🔥 STREAK — giorni lavorativi consecutivi più lunghi
    if (dateEntries.length > 1) {
        const sortedDates = Object.keys(vm.dateMap).sort();
        let maxStreak = 1, currentStreak = 1;
        let streakEnd = sortedDates[0];
        let bestStreakEnd = sortedDates[0];

        for (let i = 1; i < sortedDates.length; i++) {
            const prev = new Date(sortedDates[i - 1] + 'T12:00:00');
            const curr = new Date(sortedDates[i] + 'T12:00:00');
            const diffDays = Math.round((curr - prev) / 86400000);

            if (diffDays === 1) {
                currentStreak++;
                streakEnd = sortedDates[i];
            } else {
                currentStreak = 1;
                streakEnd = sortedDates[i];
            }

            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
                bestStreakEnd = streakEnd;
            }
        }

        if (maxStreak >= 3) {
            const endDate = new Date(bestStreakEnd + 'T12:00:00');
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - maxStreak + 1);
            const startLabel = startDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
            const endLabel = endDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
            insights.push({
                icon: 'fa-fire',
                color: '#ef4444',
                text: `Streak record: <strong>${maxStreak} giorni consecutivi</strong> (${startLabel} → ${endLabel})`
            });
        }
    }

    // 6. ⚠️ TIMER NON REPORTATI
    if (vm.unreportedCount > 0) {
        insights.push({
            icon: 'fa-exclamation-circle',
            color: '#f59e0b',
            text: `<strong>${vm.unreportedCount} timer</strong> non ancora reportati (${fmtEuro(vm.unreportedEarnings)} pending)`
        });
    }

    // 7. 👥 CLIENTI + MEDIA GIORNALIERA
    const workedDaysCount = vm.workedDays.size;
    const avgHoursPerDay = workedDaysCount > 0 ? (vm.totalSec / 3600) / workedDaysCount : 0;
    insights.push({
        icon: 'fa-users',
        color: '#6366f1',
        text: `<strong>${vm.clientCount} client${vm.clientCount !== 1 ? 'i' : 'e'}</strong> nel periodo · media <strong>${fmtHoursToHM(avgHoursPerDay)}/giorno</strong> su ${workedDaysCount} giorni lavorati`
    });

    // Render
    insights.forEach((ins, i) => {
        const div = document.createElement('div');
        div.className = 'dash-insight-item';
        div.style.animationDelay = `${i * 0.08}s`;
        div.innerHTML = `
            <div class="dash-insight-icon" style="color:${ins.color};background:${ins.color}18;">
                <i class="fas ${ins.icon}"></i>
            </div>
            <div class="dash-insight-text">${ins.text}</div>
        `;
        container.appendChild(div);
    });
}

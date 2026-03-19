// dashboard.js — Dashboard Analitica PRO (Mobile-First)
// Refactored: Compute Once, Render Many

// ═══════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════
let dashActivePeriod = 'month'; // today | week | month | quarter | year | all
let dashChartInstances = {};
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
        periodBar.addEventListener('click', (e) => {
            const chip = e.target.closest('.dash-period-chip');
            if (!chip) return;
            periodBar.querySelectorAll('.dash-period-chip').forEach(c => c.classList.remove('dash-period-chip-active'));
            chip.classList.add('dash-period-chip-active');
            dashActivePeriod = chip.dataset.period;
            loadDashboardData();
        });

        // Initial load
        loadDashboardData();
    });
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
        if (!vm.dateMap[isoDate]) vm.dateMap[isoDate] = { label: dateLabel, hours: 0, earnings: 0, clients: {} };
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
        renderHeatmap(vm, start, end);
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
function renderHeatmap(vm, start, end) {
    const container = document.getElementById('dash-heatmap-container');
    if (!container) return;
    container.innerHTML = '';

    // Usa dateMap pre-computato per le ore giornaliere
    const dayMap = {};
    for (const [isoDate, d] of Object.entries(vm.dateMap)) {
        dayMap[isoDate] = d.hours;
    }

    const maxH = Math.max(...Object.values(dayMap), 1);

    // Day labels
    const dayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

    // Create header
    const headerRow = document.createElement('div');
    headerRow.className = 'dash-hm-header';
    dayLabels.forEach(d => {
        const span = document.createElement('span');
        span.textContent = d;
        headerRow.appendChild(span);
    });
    container.appendChild(headerRow);

    // Build weeks — compatto: max 5 settimane
    const gridEl = document.createElement('div');
    gridEl.className = 'dash-hm-grid';
    container.style.overflowX = '';

    const MAX_WEEKS = 5;
    const now = new Date();
    let hmEnd = new Date(Math.min(end.getTime(), now.getTime()));
    hmEnd.setHours(23, 59, 59, 999);
    let hmStart = new Date(hmEnd);
    hmStart.setDate(hmStart.getDate() - (MAX_WEEKS * 7) + 1);
    if (hmStart < start) hmStart = new Date(start);

    // Find first Monday on or before hmStart
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

            const cell = document.createElement('div');
            cell.className = 'dash-hm-cell';

            if (cellDate < hmStart || cellDate > hmEnd) {
                cell.style.opacity = '0.15';
                cell.style.background = '#f1f5f9';
            } else if (hours > 0) {
                cell.style.background = `rgba(99,102,241,${intensity})`;
            } else {
                cell.style.background = '#f1f5f9';
            }

            cell.title = `${cellDate.toLocaleDateString('it-IT')}: ${hours > 0 ? fmtHoursToHM(hours) : 'Nessuna attività'}`;

            gridEl.appendChild(cell);
        }
        cur.setDate(cur.getDate() + 7);
    }

    container.appendChild(gridEl);

    // Legend
    const legend = document.createElement('div');
    legend.className = 'dash-hm-legend';
    legend.innerHTML = `
        <span class="text-xs text-surface-400">Meno</span>
        <div class="dash-hm-cell" style="background:#f1f5f9;width:14px;height:14px;"></div>
        <div class="dash-hm-cell" style="background:rgba(99,102,241,0.2);width:14px;height:14px;"></div>
        <div class="dash-hm-cell" style="background:rgba(99,102,241,0.45);width:14px;height:14px;"></div>
        <div class="dash-hm-cell" style="background:rgba(99,102,241,0.7);width:14px;height:14px;"></div>
        <div class="dash-hm-cell" style="background:rgba(99,102,241,1);width:14px;height:14px;"></div>
        <span class="text-xs text-surface-400">Più</span>
    `;
    container.appendChild(legend);
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

    // 1. Giorno più produttivo — FIX BUG-4: usa giorni unici, non conteggio log
    const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    const dayAvgs = vm.dayOfWeekMap.map(d => d.days.size > 0 ? d.sec / d.days.size : 0);
    const bestDayIdx = dayAvgs.indexOf(Math.max(...dayAvgs));
    if (dayAvgs[bestDayIdx] > 0) {
        insights.push({
            icon: 'fa-calendar-check',
            color: '#10b981',
            text: `Il tuo giorno più produttivo è il <strong>${dayNames[bestDayIdx]}</strong> (media ${fmtHM(dayAvgs[bestDayIdx])})`
        });
    }

    // 2. Tipo di lavoro più redditizio — FIX BUG-5: usa guadagno totale, non rate massimo
    const bestWt = Object.entries(vm.worktypeMap).sort((a, b) => b[1].earnings - a[1].earnings)[0];
    if (bestWt && bestWt[1].earnings > 0) {
        insights.push({
            icon: 'fa-gem',
            color: '#8b5cf6',
            text: `Il tipo di lavoro più redditizio è <strong>${bestWt[0]}</strong> (${fmtEuro(bestWt[1].earnings)} totali)`
        });
    }

    // 3. Trend vs periodo precedente
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

    // 4. Timer non reportati
    if (vm.unreportedCount > 0) {
        insights.push({
            icon: 'fa-exclamation-circle',
            color: '#f59e0b',
            text: `<strong>${vm.unreportedCount} timer</strong> non ancora reportati (${fmtEuro(vm.unreportedEarnings)} pending)`
        });
    }

    // 5. Clienti nel periodo
    insights.push({
        icon: 'fa-users',
        color: '#6366f1',
        text: `Hai lavorato con <strong>${vm.clientCount} client${vm.clientCount !== 1 ? 'i' : 'e'}</strong> in questo periodo`
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

// dashboard.js — Dashboard Analitica PRO (Mobile-First)

// ═══════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════
let dashActivePeriod = 'month'; // today | week | month | quarter | year | custom
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
let dashClientColorMap = {};

function getDashClientColor(name) {
    if (!dashClientColorMap[name]) {
        const idx = Object.keys(dashClientColorMap).length;
        dashClientColorMap[name] = DASH_CLIENT_COLORS[idx % DASH_CLIENT_COLORS.length];
    }
    return dashClientColorMap[name];
}

// ═══════════════════════════════════════════════
//  TEMPLATE
// ═══════════════════════════════════════════════
const dashboardTemplate = `
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
            <div class="dash-kpi-label">Ore Totali</div>
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
            <div class="dash-chart-body dash-chart-body-doughnut">
                <canvas id="dashWorktypeChart"></canvas>
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
function initializeDashboardEvents() {
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
//  DATA LOADING
// ═══════════════════════════════════════════════
async function loadDashboardData() {
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

        // Also fetch previous period for trend comparison
        const periodMs = end.getTime() - start.getTime();
        const prevStart = new Date(start.getTime() - periodMs);
        const prevEnd = new Date(start.getTime() - 1);

        let prevQuery = db.collection('timeLogs')
            .where('uid', '==', currentUser.uid)
            .where('isDeleted', '==', false)
            .where('startTime', '>=', firebase.firestore.Timestamp.fromDate(prevStart))
            .where('startTime', '<=', firebase.firestore.Timestamp.fromDate(prevEnd))
            .orderBy('startTime', 'desc');

        const prevSnapshot = await prevQuery.get();
        const prevTimeLogs = prevSnapshot.docs.map(d => d.data());

        // Reset color map
        dashClientColorMap = {};

        // Render everything — l.hourlyRate dal documento è la fonte di verità
        renderKPIs(timeLogs, prevTimeLogs, start, end);
        renderWorkedTimeChart(timeLogs, start, end);
        renderEarningsChart(timeLogs, start, end);
        renderWorktypeChart(timeLogs);
        renderClientRanking(timeLogs);
        renderHeatmap(timeLogs, start, end);
        renderInsights(timeLogs, prevTimeLogs);

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

function fmtEuro(amount) {
    return `€ ${amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDateShort(date) {
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

// ═══════════════════════════════════════════════
//  KPI RENDERING
// ═══════════════════════════════════════════════
function renderKPIs(timeLogs, prevTimeLogs, start, end) {
    // Total hours
    const totalSec = timeLogs.reduce((s, l) => s + (l.duration || 0), 0);
    document.getElementById('dash-kpi-hours').textContent = fmtHM(totalSec);

    // Total earnings — l.hourlyRate dal documento è la fonte di verità
    const totalEarnings = timeLogs.reduce((s, l) => {
        const rate = l.hourlyRate || 0;
        return s + (l.duration / 3600) * rate;
    }, 0);
    document.getElementById('dash-kpi-earnings').textContent = fmtEuro(totalEarnings);

    // Average per worked day
    const workedDays = new Set(timeLogs.map(l => l.startTime.toDate().toDateString())).size;
    const avgSec = workedDays > 0 ? totalSec / workedDays : 0;
    document.getElementById('dash-kpi-avg').textContent = fmtHM(avgSec);

    // Top client
    const clientHours = {};
    timeLogs.forEach(l => {
        const cn = l.clientName || 'Sconosciuto';
        clientHours[cn] = (clientHours[cn] || 0) + (l.duration || 0);
    });
    const topClient = Object.entries(clientHours).sort((a, b) => b[1] - a[1])[0];
    const topEl = document.getElementById('dash-kpi-top');
    topEl.textContent = topClient ? topClient[0] : '—';

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
function renderWorkedTimeChart(timeLogs, start, end) {
    const canvas = document.getElementById('dashWorkedTimeChart');
    if (!canvas) return;
    if (dashChartInstances.workedTime) dashChartInstances.workedTime.destroy();

    // Group by date and client
    const dateClientMap = {};
    const clientSet = new Set();
    timeLogs.forEach(l => {
        const dateStr = l.startTime.toDate().toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
        const dateKey = l.startTime.toDate().toISOString().split('T')[0];
        const cn = l.clientName || 'Sconosciuto';
        clientSet.add(cn);
        if (!dateClientMap[dateKey]) dateClientMap[dateKey] = { label: dateStr, clients: {} };
        dateClientMap[dateKey].clients[cn] = (dateClientMap[dateKey].clients[cn] || 0) + l.duration / 3600;
    });

    const sortedDates = Object.keys(dateClientMap).sort();
    const labels = sortedDates.map(k => dateClientMap[k].label);
    const clients = Array.from(clientSet);

    const datasets = clients.map(cn => {
        const color = getDashClientColor(cn);
        return {
            label: cn,
            data: sortedDates.map(k => dateClientMap[k].clients[cn] || 0),
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
                    title: { display: true, text: 'Ore', font: { size: 12, weight: 600 } },
                    grid: { color: 'rgba(0,0,0,0.04)' }
                }
            },
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 14, padding: 16, font: { size: 12 } } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const h = Math.floor(ctx.parsed.y);
                            const m = Math.round((ctx.parsed.y - h) * 60);
                            return ` ${ctx.dataset.label}: ${h}h ${m.toString().padStart(2, '0')}m`;
                        }
                    }
                }
            }
        }
    });
}

// ═══════════════════════════════════════════════
//  EARNINGS CHART (AREA)
// ═══════════════════════════════════════════════
function renderEarningsChart(timeLogs, start, end) {
    const canvas = document.getElementById('dashEarningsChart');
    if (!canvas) return;
    if (dashChartInstances.earnings) dashChartInstances.earnings.destroy();

    const earningsPerDay = {};
    timeLogs.forEach(l => {
        const dateKey = l.startTime.toDate().toISOString().split('T')[0];
        const dateLabel = l.startTime.toDate().toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
        const rate = l.hourlyRate || 0;
        const amount = (l.duration / 3600) * rate;
        if (!earningsPerDay[dateKey]) earningsPerDay[dateKey] = { label: dateLabel, amount: 0 };
        earningsPerDay[dateKey].amount += amount;
    });

    const sortedKeys = Object.keys(earningsPerDay).sort();
    const labels = sortedKeys.map(k => earningsPerDay[k].label);
    const data = sortedKeys.map(k => earningsPerDay[k].amount);

    // Cumulative
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
function renderWorktypeChart(timeLogs) {
    const canvas = document.getElementById('dashWorktypeChart');
    if (!canvas) return;
    if (dashChartInstances.worktype) dashChartInstances.worktype.destroy();

    const wtHours = {};
    timeLogs.forEach(l => {
        const wt = l.worktypeName || 'Altro';
        wtHours[wt] = (wtHours[wt] || 0) + l.duration / 3600;
    });

    const labels = Object.keys(wtHours);
    const data = labels.map(l => wtHours[l]);
    const totalHours = data.reduce((s, v) => s + v, 0);
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6'];

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
                legend: { position: 'bottom', labels: { boxWidth: 14, padding: 12, font: { size: 12 } } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const h = Math.floor(ctx.parsed);
                            const m = Math.round((ctx.parsed - h) * 60);
                            const pct = totalHours > 0 ? ((ctx.parsed / totalHours) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}: ${h}h ${m.toString().padStart(2, '0')}m (${pct}%)`;
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
}

// ═══════════════════════════════════════════════
//  CLIENT RANKING
// ═══════════════════════════════════════════════
function renderClientRanking(timeLogs) {
    const container = document.getElementById('dash-client-ranking');
    if (!container) return;
    container.innerHTML = '';

    const clientData = {};
    timeLogs.forEach(l => {
        const cn = l.clientName || 'Sconosciuto';
        if (!clientData[cn]) clientData[cn] = { hours: 0, earnings: 0 };
        clientData[cn].hours += l.duration / 3600;
        clientData[cn].earnings += (l.duration / 3600) * (l.hourlyRate || 0);
    });

    const sorted = Object.entries(clientData).sort((a, b) => b[1].hours - a[1].hours);
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
        const h = Math.floor(data.hours);
        const m = Math.round((data.hours - h) * 60);

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
                <span class="dash-rank-hours">${h}h ${m.toString().padStart(2, '0')}m</span>
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
function renderHeatmap(timeLogs, start, end) {
    const container = document.getElementById('dash-heatmap-container');
    if (!container) return;
    container.innerHTML = '';

    // Build day→hours map
    const dayMap = {};
    timeLogs.forEach(l => {
        const key = l.startTime.toDate().toISOString().split('T')[0];
        dayMap[key] = (dayMap[key] || 0) + l.duration / 3600;
    });

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

    // Build weeks between start and end
    const gridEl = document.createElement('div');
    gridEl.className = 'dash-hm-grid';

    // Cap heatmap to max 12 weeks for readability
    const MAX_WEEKS = 12;
    const maxMs = MAX_WEEKS * 7 * 86400000;
    let hmStart = new Date(start);
    let hmEnd = new Date(end);
    if (hmEnd.getTime() - hmStart.getTime() > maxMs) {
        hmStart = new Date(hmEnd.getTime() - maxMs);
    }

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

            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            cell.title = `${cellDate.toLocaleDateString('it-IT')}: ${hours > 0 ? h + 'h ' + m.toString().padStart(2, '0') + 'm' : 'Nessuna attività'}`;

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
function renderInsights(timeLogs, prevTimeLogs) {
    const container = document.getElementById('dash-insights-body');
    if (!container) return;
    container.innerHTML = '';

    const insights = [];

    if (timeLogs.length === 0) {
        container.innerHTML = '<div class="text-surface-400 text-sm p-2">Nessun dato disponibile per generare insights.</div>';
        return;
    }

    // 1. Most productive day of the week
    const dayHours = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    timeLogs.forEach(l => {
        const dow = l.startTime.toDate().getDay();
        const idx = dow === 0 ? 6 : dow - 1; // Mon=0 ... Sun=6
        dayHours[idx] += l.duration / 3600;
        dayCounts[idx]++;
    });
    const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    const dayAvgs = dayHours.map((h, i) => dayCounts[i] > 0 ? h / dayCounts[i] : 0);
    const bestDayIdx = dayAvgs.indexOf(Math.max(...dayAvgs));
    if (dayAvgs[bestDayIdx] > 0) {
        insights.push({
            icon: 'fa-calendar-check',
            color: '#10b981',
            text: `Il tuo giorno più produttivo è il <strong>${dayNames[bestDayIdx]}</strong> (media ${fmtHM(dayAvgs[bestDayIdx] * 3600)})`
        });
    }

    // 2. Most profitable worktype
    const wtRates = {};
    timeLogs.forEach(l => {
        const wt = l.worktypeName || 'Altro';
        const rate = l.hourlyRate || 0;
        if (!wtRates[wt] || rate > wtRates[wt]) wtRates[wt] = rate;
    });
    const bestWt = Object.entries(wtRates).sort((a, b) => b[1] - a[1])[0];
    if (bestWt && bestWt[1] > 0) {
        insights.push({
            icon: 'fa-gem',
            color: '#8b5cf6',
            text: `Il tipo di lavoro più redditizio è <strong>${bestWt[0]}</strong> (€${bestWt[1]}/h)`
        });
    }

    // 3. Trend vs prev period
    const totalSec = timeLogs.reduce((s, l) => s + (l.duration || 0), 0);
    const prevTotalSec = prevTimeLogs.reduce((s, l) => s + (l.duration || 0), 0);
    if (prevTotalSec > 0) {
        const pctChange = ((totalSec - prevTotalSec) / prevTotalSec * 100).toFixed(0);
        const isUp = totalSec >= prevTotalSec;
        insights.push({
            icon: isUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down',
            color: isUp ? '#10b981' : '#ef4444',
            text: `Hai lavorato <strong>${Math.abs(pctChange)}% ${isUp ? 'in più' : 'in meno'}</strong> rispetto al periodo precedente`
        });
    }

    // 4. Unreported timers
    const unreported = timeLogs.filter(l => !l.isReported);
    if (unreported.length > 0) {
        const unreportedEarnings = unreported.reduce((s, l) => s + (l.duration / 3600) * (l.hourlyRate || 0), 0);
        insights.push({
            icon: 'fa-exclamation-circle',
            color: '#f59e0b',
            text: `<strong>${unreported.length} timer</strong> non ancora reportati (${fmtEuro(unreportedEarnings)} pending)`
        });
    }

    // 5. Total clients worked with
    const clientCount = new Set(timeLogs.map(l => l.clientName)).size;
    insights.push({
        icon: 'fa-users',
        color: '#6366f1',
        text: `Hai lavorato con <strong>${clientCount} client${clientCount !== 1 ? 'i' : 'e'}</strong> in questo periodo`
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

// ═══════════════════════════════════════════════
//  VITE MODULE: Registra globals
// ═══════════════════════════════════════════════
window.dashboardTemplate = dashboardTemplate;
window.initializeDashboardEvents = initializeDashboardEvents;
window.loadDashboardData = loadDashboardData;

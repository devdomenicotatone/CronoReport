/**
 * templates.js — Template HTML modernizzati per tutte le sezioni
 * 
 * Ogni template usa classi Tailwind CSS + design system CronoReport.
 * File separato per mantenere main.js snello (~400 righe max).
 */

// ==========================================
//  GESTIONE DATI
// ==========================================
export const dataManagementTemplate = `
<div id="data-management" class="max-w-6xl mx-auto px-4 py-6">
    
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <i class="fas fa-database text-white text-lg"></i>
        </div>
        <h2 class="text-2xl font-bold text-surface-800">Gestione Dati</h2>
    </div>

    <!-- ═══ STAT CARDS ═══ -->
    <div class="timer-today-grid mb-5" id="dm-stats-grid">
        <div class="rw-stat-card stat-hours">
            <div class="rw-stat-icon"><i class="fas fa-users"></i></div>
            <div class="rw-stat-label">Clienti</div>
            <div class="rw-stat-value" id="dm-stat-clients">0</div>
        </div>
        <div class="rw-stat-card stat-amount">
            <div class="rw-stat-icon"><i class="fas fa-folder-open"></i></div>
            <div class="rw-stat-label">Progetti</div>
            <div class="rw-stat-value" id="dm-stat-projects">0</div>
        </div>
        <div class="rw-stat-card stat-count">
            <div class="rw-stat-icon"><i class="fas fa-tools"></i></div>
            <div class="rw-stat-label">Tipi di Lavoro</div>
            <div class="rw-stat-value" id="dm-stat-worktypes">0</div>
        </div>
    </div>

    <!-- ═══ SEARCH + ADD CLIENT ═══ -->
    <div class="cr-card mb-5 overflow-hidden">
        <div class="p-4 flex flex-col sm:flex-row gap-3">
            <div class="dm-search-wrap flex-1">
                <i class="fas fa-search"></i>
                <input type="text" id="dm-search-input" class="cr-input text-sm w-full" placeholder="Cerca clienti, siti, tipi...">
            </div>
            <div class="flex gap-2">
                <input type="text" id="new-client-name" class="cr-input text-sm" placeholder="Nuovo cliente...">
                <button id="add-client-btn" class="timer-start-btn" style="padding: 0.4rem 1rem; font-size: 0.8rem;">
                    <i class="fas fa-plus"></i> Aggiungi
                </button>
            </div>
        </div>
    </div>

    <!-- ═══ UNIFIED CLIENT LIST ═══ -->
    <div id="dm-client-accordion" class="space-y-3">
        <!-- Populated dynamically -->
    </div>
</div>
`;

// ==========================================
//  TIMER DI LAVORO
// ==========================================
export const timerTemplate = `
<div id="timer-section" class="max-w-6xl mx-auto px-4 py-6">

    <!-- Header sezione -->
    <div class="flex items-center gap-3 mb-6 animate-slide-up">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <i class="fas fa-stopwatch text-white text-xl"></i>
        </div>
        <div>
            <h2 class="text-2xl font-bold text-surface-900 tracking-tight">Timer di Lavoro</h2>
            <p class="text-xs font-medium text-surface-500 mt-0.5">Traccia il tempo sui tuoi progetti in tempo reale</p>
        </div>
    </div>

    <!-- ═══ START BAR ═══ -->
    <div class="cr-card mb-5 overflow-hidden border-0 shadow-lg shadow-surface-200/50">
        <div class="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 border-b border-emerald-600/20 flex justify-between items-center">
            <span class="text-white font-bold tracking-tight text-sm flex items-center gap-2"><i class="fas fa-play-circle text-emerald-100"></i> Avvia Nuovo Timer</span>
        </div>
        <div class="p-5 bg-white space-y-4">
            <!-- Riga inline: selettori + pulsante -->
            <div class="timer-start-bar">
                <div class="flex-1 min-w-[140px]">
                    <label for="client-select" class="block text-xs font-bold text-surface-600 uppercase tracking-wider mb-1.5 pl-1">Cliente</label>
                    <select id="client-select" class="cr-select text-sm font-medium bg-surface-50 border-surface-200 focus:bg-white transition-colors">
                        <option value="">--Seleziona Cliente--</option>
                    </select>
                </div>
                <div class="flex-1 min-w-[140px]">
                    <label for="project-select" class="block text-xs font-bold text-surface-600 uppercase tracking-wider mb-1.5 pl-1">Progetto</label>
                    <select id="project-select" class="cr-select text-sm font-medium bg-surface-50 border-surface-200 focus:bg-white transition-colors">
                        <option value="">-- Seleziona --</option>
                    </select>
                </div>
                <div class="flex-1 min-w-[140px]">
                    <label for="worktype-select" class="block text-xs font-bold text-surface-600 uppercase tracking-wider mb-1.5 pl-1">Tipo Lavoro</label>
                    <select id="worktype-select" class="cr-select text-sm font-medium bg-surface-50 border-surface-200 focus:bg-white transition-colors">
                        <option value="">-- Seleziona --</option>
                    </select>
                </div>
                <div class="flex-1 min-w-[130px]">
                    <label for="link-input" class="block text-xs font-bold text-surface-600 uppercase tracking-wider mb-1.5 pl-1">🔗 Link</label>
                    <input type="url" id="link-input" class="cr-input text-sm font-medium bg-surface-50 border-surface-200 focus:bg-white transition-colors" placeholder="https://...">
                </div>
                <div class="flex-1 min-w-[130px]">
                    <label for="note-input" class="block text-xs font-bold text-surface-600 uppercase tracking-wider mb-1.5 pl-1">📝 Note</label>
                    <input type="text" id="note-input" class="cr-input text-sm font-medium bg-surface-50 border-surface-200 focus:bg-white transition-colors" placeholder="Appunti, dettagli...">
                </div>
                <button id="start-timer-btn" class="timer-start-btn shadow-md shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-95 transition-all">
                    <i class="fas fa-play"></i> Avvia
                </button>
            </div>

            <!-- Toggle manuale -->
            <div class="pt-2 border-t border-surface-100/50 mt-4">
                <div class="timer-manual-toggle text-indigo-600 hover:text-indigo-700 transition-colors" id="timer-manual-toggle">
                    <i class="fas fa-chevron-down"></i> Imposta orario manuale
                </div>
                <div class="timer-manual-section" id="timer-manual-section">
                    <div class="flex flex-col sm:flex-row gap-4 mt-3 bg-surface-50/50 p-4 rounded-xl border border-surface-100">
                        <div class="flex-1">
                            <label for="manual-start-time" class="block text-xs font-bold text-surface-600 mb-1.5">Inizio (Opzionale)</label>
                            <input type="text" id="manual-start-time" class="cr-input text-sm bg-white" placeholder="DD/MM/YYYY HH:mm:ss" />
                        </div>
                        <div class="flex-1">
                            <label for="manual-end-time" class="block text-xs font-bold text-surface-600 mb-1.5">Fine (Opzionale)</label>
                            <input type="text" id="manual-end-time" class="cr-input text-sm bg-white" placeholder="DD/MM/YYYY HH:mm:ss" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- ═══ RECENTI ═══ -->
    <div id="timer-recents-section" class="mb-6 animate-fade-in" style="display:none;">
        <div class="flex items-center gap-2 mb-2 pl-1">
            <i class="fas fa-history text-surface-400 text-xs"></i>
            <span class="text-xs font-bold text-surface-500 uppercase tracking-wider">Scelte Recenti</span>
        </div>
        <div class="timer-recents" id="timer-recents-chips">
            <!-- Populated dynamically -->
        </div>
    </div>

    <!-- ═══ RIEPILOGO OGGI — compact inline bar ═══ -->
    <div class="flex items-center gap-4 px-4 py-2.5 mb-6 bg-surface-50/80 rounded-xl border border-surface-100/60 text-sm" id="timer-today-grid">
        <span class="text-[10px] font-bold uppercase tracking-wider text-surface-400">Oggi</span>
        <span class="text-surface-200">|</span>
        <span class="flex items-center gap-1.5">
            <i class="fas fa-clock text-[10px] text-indigo-400"></i>
            <span class="font-bold text-surface-700" id="today-stat-hours">0h 00m</span>
        </span>
        <span class="text-surface-200">·</span>
        <span class="flex items-center gap-1.5">
            <i class="fas fa-euro-sign text-[10px] text-emerald-500"></i>
            <span class="font-bold text-surface-700" id="today-stat-amount">€ 0.00</span>
        </span>
        <span class="text-surface-200">·</span>
        <span class="flex items-center gap-1.5">
            <i class="fas fa-check-circle text-[10px] text-amber-500"></i>
            <span class="font-bold text-surface-700" id="today-stat-count">0</span>
            <span class="text-xs text-surface-400">task</span>
        </span>
    </div>

    <!-- ═══ TIMER ATTIVI ═══ -->
    <div id="active-timers">
        <div class="flex items-center gap-3 mb-5 pl-1">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md shadow-rose-500/20">
                <i class="fas fa-satellite-dish text-white text-sm animate-pulse"></i>
            </div>
            <h3 class="text-xl font-extrabold text-surface-900 tracking-tight">Timer Attivi <span id="active-timer-count" class="ml-2 text-xs font-bold bg-rose-100 text-rose-600 px-2.5 py-0.5 rounded-full shadow-sm" style="display:none;">0</span></h3>
        </div>
        <div id="timer-cards" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <!-- Le card dei timer attivi saranno aggiunte dinamicamente -->
        </div>
    </div>

    <!-- ═══ LOG DI OGGI ═══ -->
    <div id="today-log-section" class="mt-8 animate-fade-in" style="display:none;">
        <div class="flex items-center justify-between mb-4 pl-1">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                    <i class="fas fa-list-check text-white text-sm"></i>
                </div>
                <h3 class="text-lg font-extrabold text-surface-900 tracking-tight">Completati Oggi</h3>
                <span id="today-log-count" class="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full"></span>
            </div>
            <span id="today-log-total" class="text-xs font-bold text-surface-500"></span>
        </div>
        <div id="today-log-list" class="space-y-1.5">
            <!-- Populated dynamically by loadTodayLog() -->
        </div>
    </div>
</div>

`;


/**
 * templates.js — Template HTML modernizzati per tutte le sezioni
 * 
 * Ogni template usa classi Tailwind CSS + design system CronoReport.
 * File separato per mantenere main.js snello (~400 righe max).
 */

// ==========================================
//  GESTIONE DATI
// ==========================================
const dataManagementTemplate = `
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
            <div class="rw-stat-icon"><i class="fas fa-map-marker-alt"></i></div>
            <div class="rw-stat-label">Siti</div>
            <div class="rw-stat-value" id="dm-stat-sites">0</div>
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
const timerTemplate = `
<div id="timer-section" class="max-w-6xl mx-auto px-4 py-6">

    <!-- Header sezione -->
    <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <i class="fas fa-clock text-white text-lg"></i>
        </div>
        <h2 class="text-2xl font-bold text-surface-800">Timer di Lavoro</h2>
    </div>

    <!-- ═══ START BAR ═══ -->
    <div class="cr-card mb-4 overflow-hidden">
        <div class="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
            <span class="font-semibold flex items-center gap-2"><i class="fas fa-play-circle"></i> Avvia Timer</span>
        </div>
        <div class="p-4 space-y-3">
            <!-- Riga inline: selettori + pulsante -->
            <div class="timer-start-bar">
                <div class="flex-1 min-w-0">
                    <label for="client-select" class="block text-xs font-semibold text-surface-500 mb-0.5">Cliente</label>
                    <select id="client-select" class="cr-select text-sm">
                        <option value="">-- Cliente --</option>
                    </select>
                </div>
                <div class="flex-1 min-w-0">
                    <label for="site-select" class="block text-xs font-semibold text-surface-500 mb-0.5">Sito</label>
                    <select id="site-select" class="cr-select text-sm">
                        <option value="">-- Sito --</option>
                    </select>
                </div>
                <div class="flex-1 min-w-0">
                    <label for="worktype-select" class="block text-xs font-semibold text-surface-500 mb-0.5">Tipo</label>
                    <select id="worktype-select" class="cr-select text-sm">
                        <option value="">-- Tipo --</option>
                    </select>
                </div>
                <div class="flex-1 min-w-0">
                    <label for="link-input" class="block text-xs font-semibold text-surface-500 mb-0.5">Link</label>
                    <input type="url" id="link-input" class="cr-input text-sm" placeholder="https://...">
                </div>
                <button id="start-timer-btn" class="timer-start-btn">
                    <i class="fas fa-play"></i> Avvia
                </button>
            </div>

            <!-- Toggle manuale -->
            <div>
                <div class="timer-manual-toggle" id="timer-manual-toggle">
                    <i class="fas fa-chevron-down"></i> Orario manuale
                </div>
                <div class="timer-manual-section" id="timer-manual-section">
                    <div class="flex gap-3 mt-2">
                        <div class="flex-1">
                            <label for="manual-start-time" class="block text-xs font-medium text-surface-500 mb-0.5">Inizio</label>
                            <input type="text" id="manual-start-time" class="cr-input text-sm" placeholder="DD/MM/YYYY HH:mm:ss" />
                        </div>
                        <div class="flex-1">
                            <label for="manual-end-time" class="block text-xs font-medium text-surface-500 mb-0.5">Fine</label>
                            <input type="text" id="manual-end-time" class="cr-input text-sm" placeholder="DD/MM/YYYY HH:mm:ss" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- ═══ RECENTI ═══ -->
    <div id="timer-recents-section" class="mb-4" style="display:none;">
        <div class="flex items-center gap-2 mb-2">
            <i class="fas fa-history text-surface-400 text-xs"></i>
            <span class="text-xs font-semibold text-surface-500 uppercase tracking-wider">Recenti</span>
        </div>
        <div class="timer-recents" id="timer-recents-chips">
            <!-- Populated dynamically -->
        </div>
    </div>

    <!-- ═══ RIEPILOGO OGGI ═══ -->
    <div class="timer-today-grid mb-6" id="timer-today-grid">
        <div class="rw-stat-card stat-hours">
            <div class="rw-stat-icon"><i class="fas fa-clock"></i></div>
            <div class="rw-stat-label">Ore Oggi</div>
            <div class="rw-stat-value" id="today-stat-hours">0h 00m</div>
        </div>
        <div class="rw-stat-card stat-amount">
            <div class="rw-stat-icon"><i class="fas fa-euro-sign"></i></div>
            <div class="rw-stat-label">Importo Oggi</div>
            <div class="rw-stat-value" id="today-stat-amount">€ 0.00</div>
        </div>
        <div class="rw-stat-card stat-count">
            <div class="rw-stat-icon"><i class="fas fa-check-circle"></i></div>
            <div class="rw-stat-label">Task Oggi</div>
            <div class="rw-stat-value" id="today-stat-count">0</div>
        </div>
    </div>

    <!-- ═══ TIMER ATTIVI ═══ -->
    <div id="active-timers">
        <div class="flex items-center gap-3 mb-4">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                <i class="fas fa-play-circle text-white text-sm"></i>
            </div>
            <h3 class="text-lg font-bold text-surface-800">Timer Attivi</h3>
            <span id="active-timer-count" class="text-xs font-semibold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full" style="display:none;">0</span>
        </div>
        <div id="timer-cards" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Le card dei timer attivi saranno aggiunte dinamicamente -->
        </div>
    </div>
</div>

<!-- Modale per modificare il timer -->
<div class="modal fade" id="edit-timer-modal" tabindex="-1" role="dialog" aria-labelledby="editTimerModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content" style="border-radius: 1rem; overflow: hidden; border: none;">
      <div class="px-5 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600">
        <h5 class="text-white font-semibold" id="editTimerModalLabel">Modifica Timer</h5>
        <button type="button" class="close text-white" data-cr-dismiss="modal" aria-label="Chiudi">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="p-5 space-y-4">
        <form id="edit-timer-form">
          <input type="hidden" id="edit-timer-id">
          <div class="mb-3">
            <label for="edit-client-select" class="block text-sm font-medium text-surface-600 mb-1">Cliente:</label>
            <select id="edit-client-select" class="cr-select"></select>
          </div>
          <div class="mb-3">
            <label for="edit-site-select" class="block text-sm font-medium text-surface-600 mb-1">Sito:</label>
            <select id="edit-site-select" class="cr-select"></select>
          </div>
          <div class="mb-3">
            <label for="edit-worktype-select" class="block text-sm font-medium text-surface-600 mb-1">Tipo di Lavoro:</label>
            <select id="edit-worktype-select" class="cr-select"></select>
          </div>
          <div class="mb-3">
            <label for="edit-link-input" class="block text-sm font-medium text-surface-600 mb-1">Link (opzionale):</label>
            <input type="url" id="edit-link-input" class="cr-input" placeholder="https://esempio.com">
          </div>
          <div class="mb-3">
            <label for="edit-accumulated-time" class="block text-sm font-medium text-surface-600 mb-1">Tempo accumulato (hh:mm:ss):</label>
            <input type="text" id="edit-accumulated-time" class="cr-input" placeholder="Es: 01:23:45">
            <small class="text-xs text-surface-400 mt-1">Inserisci il tempo nel formato hh:mm:ss</small>
          </div>
          <div class="mb-3">
            <label for="edit-start-time" class="block text-sm font-medium text-surface-600 mb-1">Data/Ora Inizio:</label>
            <input type="text" id="edit-start-time" class="cr-input" placeholder="DD/MM/YYYY HH:mm:ss">
          </div>
          <div class="mb-3">
            <label for="edit-end-time" class="block text-sm font-medium text-surface-600 mb-1">Data/Ora Fine (opzionale):</label>
            <input type="text" id="edit-end-time" class="cr-input" placeholder="DD/MM/YYYY HH:mm:ss">
          </div>
        </form>
      </div>
      <div class="flex justify-between px-5 py-4 border-t border-surface-100">
        <button type="button" class="cr-btn cr-btn-danger cr-btn-sm" id="delete-timer-btn">Elimina Timer</button>
        <div class="flex gap-2">
          <button type="button" class="cr-btn cr-btn-outline cr-btn-sm" data-cr-dismiss="modal">Annulla</button>
          <button type="button" class="cr-btn cr-btn-primary cr-btn-sm" id="save-timer-changes-btn">Salva Modifiche</button>
        </div>
      </div>
    </div>
  </div>
</div>
`;

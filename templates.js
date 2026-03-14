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
<div id="data-management" class="max-w-5xl mx-auto px-4 py-6">
    
    <!-- Header sezione -->
    <div class="flex items-center gap-3 mb-8">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <i class="fas fa-database text-white text-lg"></i>
        </div>
        <h2 class="text-2xl font-bold text-surface-800">Gestione Dati</h2>
    </div>

    <!-- Aggiungi Cliente -->
    <div class="cr-card mb-6">
        <div class="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-t-2xl">
            <h3 class="text-white font-semibold flex items-center gap-2">
                <i class="fas fa-user-plus"></i> Aggiungi Nuovo Cliente
            </h3>
            <button id="toggle-client-list-btn" class="text-white/80 hover:text-white text-sm flex items-center gap-1 transition">
                <i class="fas fa-list"></i> Mostra/Nascondi Elenco Clienti
            </button>
        </div>
        <div class="p-5">
            <div class="flex gap-3">
                <input type="text" id="new-client-name" 
                       class="cr-input flex-1" 
                       placeholder="Nome Cliente">
                <button id="add-client-btn" class="cr-btn cr-btn-success whitespace-nowrap">
                    <i class="fas fa-plus"></i> Aggiungi Cliente
                </button>
            </div>
        </div>
        <!-- Lista Clienti -->
        <ul id="client-list" class="divide-y divide-surface-100 border-t border-surface-100" style="display: none;">
            <!-- Clienti saranno popolati dinamicamente -->
        </ul>
    </div>

    <!-- Grid Siti + Tipi di Lavoro -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Gestione Siti -->
        <div class="cr-card">
            <div class="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-t-2xl">
                <h3 class="text-white font-semibold flex items-center gap-2">
                    <i class="fas fa-map-marker-alt"></i> Gestione Siti
                </h3>
                <button id="toggle-site-list-btn" class="text-white/80 hover:text-white text-sm flex items-center gap-1 transition">
                    <i class="fas fa-list"></i> Mostra/Nascondi
                </button>
            </div>
            <div class="p-5 space-y-4">
                <div>
                    <label for="select-client-for-site" class="block text-sm font-medium text-surface-600 mb-1">Seleziona Cliente:</label>
                    <select id="select-client-for-site" class="cr-select">
                        <option value="">--Seleziona Cliente--</option>
                    </select>
                </div>
                <div class="flex gap-3">
                    <input type="text" id="new-site-name" 
                           class="cr-input flex-1" 
                           placeholder="Nome del Sito">
                    <button id="add-site-btn" class="cr-btn cr-btn-success whitespace-nowrap">
                        <i class="fas fa-plus"></i> Aggiungi Sito
                    </button>
                </div>
                <!-- Lista Siti -->
                <div id="site-list" style="display: none;">
                    <!-- Siti saranno popolati dinamicamente -->
                </div>
            </div>
        </div>

        <!-- Gestione Tipi di Lavoro -->
        <div class="cr-card">
            <div class="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-2xl">
                <h3 class="text-white font-semibold flex items-center gap-2">
                    <i class="fas fa-tools"></i> Gestione Tipi di Lavoro
                </h3>
                <button id="toggle-worktype-list-btn" class="text-white/80 hover:text-white text-sm flex items-center gap-1 transition">
                    <i class="fas fa-list"></i> Mostra/Nascondi
                </button>
            </div>
            <div class="p-5 space-y-4">
                <div>
                    <label for="select-client-for-worktype" class="block text-sm font-medium text-surface-600 mb-1">Seleziona Cliente:</label>
                    <select id="select-client-for-worktype" class="cr-select">
                        <option value="">--Seleziona Cliente--</option>
                    </select>
                </div>
                <div>
                    <label for="new-worktype-name" class="block text-sm font-medium text-surface-600 mb-1">Tipo di Lavoro:</label>
                    <input type="text" id="new-worktype-name" 
                           class="cr-input" 
                           placeholder="Tipo di Lavoro">
                </div>
                <div>
                    <label for="new-worktype-hourly-rate" class="block text-sm font-medium text-surface-600 mb-1">Tariffa Oraria (€):</label>
                    <input type="number" id="new-worktype-hourly-rate" 
                           class="cr-input" 
                           placeholder="Es: 50">
                </div>
                <button id="add-worktype-btn" class="cr-btn cr-btn-success w-full">
                    <i class="fas fa-plus"></i> Aggiungi Tipo di Lavoro
                </button>
                <!-- Lista Tipi di Lavoro -->
                <div id="worktype-list" style="display: none;">
                    <!-- Tipi di Lavoro saranno popolati dinamicamente -->
                </div>
            </div>
        </div>

    </div>
</div>
`;

// ==========================================
//  TIMER DI LAVORO
// ==========================================
const timerTemplate = `
<div id="timer-section" class="max-w-5xl mx-auto px-4 py-6">

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
                <div class="flex-1 min-w-[120px]">
                    <label for="client-select" class="block text-xs font-semibold text-surface-500 mb-0.5">Cliente</label>
                    <select id="client-select" class="cr-select text-sm">
                        <option value="">-- Cliente --</option>
                    </select>
                </div>
                <div class="flex-1 min-w-[120px]">
                    <label for="site-select" class="block text-xs font-semibold text-surface-500 mb-0.5">Sito</label>
                    <select id="site-select" class="cr-select text-sm">
                        <option value="">-- Sito --</option>
                    </select>
                </div>
                <div class="flex-1 min-w-[120px]">
                    <label for="worktype-select" class="block text-xs font-semibold text-surface-500 mb-0.5">Tipo</label>
                    <select id="worktype-select" class="cr-select text-sm">
                        <option value="">-- Tipo --</option>
                    </select>
                </div>
                <div class="flex-1 min-w-[100px]">
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

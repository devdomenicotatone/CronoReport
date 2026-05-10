// savedTimersData.js
import { CrModal } from '../ui/uiComponents.js';
import { loadClientColors, getClientBgStyle, getClientHexColor } from '../core/clientColors.js';
import { createTimerRow, formatDuration, getMonthName, formatDate, formatTimeShort } from './savedTimersUI.js';
import * as notify from '../core/notify.js';

// Shared state: displayedTimers ora vive qui per evitare dipendenza circolare con savedTimersEvents.js
export let displayedTimers = [];
export function setDisplayedTimers(arr) { displayedTimers = arr; }

// Quick filter state
export let activeQuickYear = new Date().getFullYear();  // default: anno corrente
export let activeQuickMonth = null; // null = tutti i mesi

// Setter functions per mutare lo stato da moduli esterni
export function setActiveQuickYear(val) { activeQuickYear = val; }
export function setActiveQuickMonth(val) { activeQuickMonth = val; }
let availableMonthsByYear = {}; // { 2026: [1, 2, 3], 2025: [1, ..., 12] }

// Advanced filter state
export let activeStatusFilter = 'all'; // 'all' | 'pending' | 'reported'
export let activeWorktypeFilter = null; // null = tutti, oppure worktypeName
export function setActiveStatusFilter(val) { activeStatusFilter = val; }
export function setActiveWorktypeFilter(val) { activeWorktypeFilter = val; }

// Stats delta memory (per calcolare variazione vs periodo precedente)
let previousPeriodStats = { hours: 0, earnings: 0, count: 0 };

const MONTH_NAMES_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

// Funzione per caricare gli anni e mesi disponibili e popolare i chip
export async function loadAvailableYears() {
    try {
        const snapshot = await db.collection('timeLogs')
            .where('uid', '==', currentUser.uid)
            .where('isDeleted', '==', false)
            .orderBy('startTime', 'desc')
            .get();
        const yearMonthMap = {};
        snapshot.forEach(doc => {
            const startTime = doc.data().startTime;
            if (startTime) {
                const d = startTime.toDate();
                const year = d.getFullYear();
                const month = d.getMonth() + 1;
                if (!yearMonthMap[year]) yearMonthMap[year] = new Set();
                yearMonthMap[year].add(month);
            }
        });
        availableMonthsByYear = {};
        for (const year in yearMonthMap) {
            availableMonthsByYear[year] = Array.from(yearMonthMap[year]).sort((a, b) => a - b);
        }
        const years = Object.keys(availableMonthsByYear).map(Number).sort((a, b) => b - a);
        populateYearChips(years);
        updateQuickFilterBar();
        return years;
    } catch (error) {
        console.error('Errore nel caricamento degli anni disponibili:', error);
        return [];
    }
}

// Popola i chip degli anni nella Quick Filter Bar (Smart Collapse)
export function populateYearChips(years) {
    const container = document.getElementById('qf-year-chips');
    if (!container) return;
    container.innerHTML = '';

    // Chip "Tutti"
    const allBtn = document.createElement('button');
    allBtn.className = 'qf-chip qf-chip-all' + (activeQuickYear === null ? ' qf-chip-active' : '');
    allBtn.dataset.year = 'all';
    allBtn.textContent = 'Tutti';
    container.appendChild(allBtn);

    if (years.length === 0) return;

    const currentYear = new Date().getFullYear();
    // Anno "primario" = anno selezionato oppure anno corrente
    const primaryYear = activeQuickYear || currentYear;
    // Anni secondari = tutti gli altri
    const secondaryYears = years.filter(y => y !== primaryYear);

    // Chip anno primario (sempre visibile)
    if (years.includes(primaryYear)) {
        const btn = document.createElement('button');
        btn.className = 'qf-chip' + (activeQuickYear === primaryYear ? ' qf-chip-active' : '');
        btn.dataset.year = primaryYear;
        btn.textContent = primaryYear;
        container.appendChild(btn);
    }

    // Se ci sono anni secondari, mostra il chip "⋯" + popover con chip nascosti
    if (secondaryYears.length > 0) {
        // Wrapper per posizionamento relativo
        const moreWrapper = document.createElement('div');
        moreWrapper.className = 'qf-year-more-wrap';

        // Chip toggle "⋯"
        const moreBtn = document.createElement('button');
        moreBtn.className = 'qf-chip qf-chip-more';
        moreBtn.id = 'qf-year-more';
        moreBtn.textContent = '⋯';
        moreBtn.title = `Mostra altri ${secondaryYears.length} anni`;
        moreBtn.setAttribute('aria-expanded', 'false');
        moreWrapper.appendChild(moreBtn);

        // Popover container per gli anni nascosti
        const overflow = document.createElement('div');
        overflow.className = 'qf-year-overflow';
        overflow.id = 'qf-year-overflow';

        secondaryYears.forEach(year => {
            const btn = document.createElement('button');
            btn.className = 'qf-chip';
            btn.dataset.year = year;
            btn.textContent = year;
            if (activeQuickYear === year) btn.classList.add('qf-chip-active');
            overflow.appendChild(btn);
        });

        moreWrapper.appendChild(overflow);
        container.appendChild(moreWrapper);

        // Toggle handler
        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const expanded = overflow.classList.toggle('qf-year-overflow--open');
            moreBtn.setAttribute('aria-expanded', String(expanded));
            moreBtn.textContent = expanded ? '✕' : '⋯';
            moreBtn.title = expanded ? 'Nascondi anni' : `Mostra altri ${secondaryYears.length} anni`;
        });

        // Click esterno chiude il popover
        document.addEventListener('click', (e) => {
            if (!moreWrapper.contains(e.target) && overflow.classList.contains('qf-year-overflow--open')) {
                overflow.classList.remove('qf-year-overflow--open');
                moreBtn.setAttribute('aria-expanded', 'false');
                moreBtn.textContent = '⋯';
            }
        });
    }
}

// Popola i chip dei mesi in base all'anno selezionato (solo mesi con dati)
export function populateMonthChips(year) {
    const container = document.getElementById('qf-month-chips');
    const section = document.getElementById('qf-month-section');
    if (!container || !section) return;

    const months = availableMonthsByYear[year] || [];
    if (months.length === 0) {
        section.style.display = 'none';
        return;
    }

    container.innerHTML = '';

    // Chip "Tutti" per i mesi
    const allBtn = document.createElement('button');
    allBtn.className = 'qf-chip qf-chip-all' + (activeQuickMonth === null ? ' qf-chip-active' : '');
    allBtn.dataset.month = 'all';
    allBtn.textContent = 'Tutti';
    container.appendChild(allBtn);

    months.forEach(month => {
        const btn = document.createElement('button');
        btn.className = 'qf-chip' + (activeQuickMonth === month ? ' qf-chip-active' : '');
        btn.dataset.month = month;
        btn.textContent = MONTH_NAMES_SHORT[month - 1];
        container.appendChild(btn);
    });

    // Mostra la sezione mesi con animazione
    section.style.display = 'flex';
    section.style.animation = 'qfSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
}

// Aggiorna lo stato visivo dei chip nella Quick Filter Bar
export function updateQuickFilterBar() {
    // Aggiorna year chips
    const yearChips = document.querySelectorAll('#qf-year-chips .qf-chip');
    yearChips.forEach(chip => {
        const val = chip.dataset.year;
        const isActive = (val === 'all' && activeQuickYear === null) ||
                         (val !== 'all' && parseInt(val) === activeQuickYear);
        chip.classList.toggle('qf-chip-active', isActive);
    });

    // Mostra/nascondi mesi in base all'anno
    const section = document.getElementById('qf-month-section');
    if (activeQuickYear === null) {
        // Nessun anno selezionato: nascondi mesi
        if (section) section.style.display = 'none';
    } else {
        // Anno selezionato: popola e mostra mesi con dati
        populateMonthChips(activeQuickYear);
    }

    // Aggiorna month chips active state
    const monthChips = document.querySelectorAll('#qf-month-chips .qf-chip');
    monthChips.forEach(chip => {
        const val = chip.dataset.month;
        const isActive = (val === 'all' && activeQuickMonth === null) ||
                         (val !== 'all' && parseInt(val) === activeQuickMonth);
        chip.classList.toggle('qf-chip-active', isActive);
    });
}

// Funzione per caricare i timer salvati in base ai filtri
export async function loadSavedTimers(filters = {}) {
    // Ensure client colors are loaded from Firestore
    await loadClientColors();

    const savedTimersList = document.getElementById('savedTimersAccordion');
    savedTimersList.innerHTML = '';

    const amountsSection = document.getElementById('unreported-amounts-section');
    if (amountsSection) {
        amountsSection.remove();
    }

    let query = db.collection('timeLogs')
        .where('uid', '==', currentUser.uid)
        .where('isDeleted', '==', false);

    // Quick Filter Bar: se c'è un anno/mese selezionato, usa quelli come filtri date
    // MA solo se non ci sono filtri manuali dalla toolbar
    const hasManualDateFilter = filters.startDate || filters.endDate;

    if (hasManualDateFilter) {
        // Filtri manuali dalla toolbar: hanno precedenza
        if (filters.startDate) {
            query = query.where('startTime', '>=', firebase.firestore.Timestamp.fromDate(new Date(filters.startDate)));
        }
        if (filters.endDate) {
            const endDateObj = new Date(filters.endDate);
            endDateObj.setHours(23, 59, 59, 999);
            query = query.where('startTime', '<=', firebase.firestore.Timestamp.fromDate(endDateObj));
        }
    } else if (activeQuickYear !== null) {
        // Quick filter: filtra per anno (e opzionalmente mese)
        const year = activeQuickYear;
        const month = activeQuickMonth; // 1-12 or null
        let startDate, endDate;

        if (month !== null) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59, 999); // ultimo giorno del mese
        } else {
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31, 23, 59, 59, 999);
        }

        query = query.where('startTime', '>=', firebase.firestore.Timestamp.fromDate(startDate));
        query = query.where('startTime', '<=', firebase.firestore.Timestamp.fromDate(endDate));
    }

    if (filters.client) {
        query = query.where('clientId', '==', filters.client);
    }

    try {
        const snapshot = await query.orderBy('startTime', 'desc').get();
        displayedTimers.length = 0;
        const unreportedAmounts = {};

        if (snapshot.empty) {
            const noTimersMessage = document.createElement('p');
            noTimersMessage.textContent = 'Non ci sono timer salvati.';
            savedTimersList.appendChild(noTimersMessage);
            updateQuickFilterBar();
            return;
        }

        snapshot.forEach(doc => {
            const logData = doc.data();
            const clientName = logData.clientName || 'Cliente Sconosciuto';

            displayedTimers.push({
                id: doc.id,
                data: logData
            });

            if (!logData.isReported) {
                const durationInHours = logData.duration / 3600;
                const hourlyRate = logData.hourlyRate || 0;
                const amount = durationInHours * hourlyRate;

                if (!unreportedAmounts[clientName]) {
                    unreportedAmounts[clientName] = 0;
                }
                unreportedAmounts[clientName] += amount;
            }
        });

        displayTimers(displayedTimers);
        displayUnreportedAmounts(unreportedAmounts);
        updateQuickFilterBar();
    } catch (error) {
        console.error('Errore nel caricamento dei timer salvati:', error);
    }
}

export function generateSafeId(prefix, name) {
    return prefix + '-' + name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function displayUnreportedAmounts(unreportedAmounts) {
    // 1. Aggiorna la stats card totale
    const statEl = document.getElementById('tl-stat-unreported');
    let total = 0;
    for (const clientName in unreportedAmounts) {
        total += unreportedAmounts[clientName];
    }
    if (statEl) {
        statEl.textContent = `€ ${total.toFixed(2)}`;
        if (total > 0) {
            statEl.classList.add('text-amber-600');
            statEl.classList.remove('text-surface-800');
        } else {
            statEl.classList.remove('text-amber-600');
            statEl.classList.add('text-surface-800');
        }
    }

    // 2. Crea/aggiorna la sezione dettaglio per cliente con promemoria
    let detailSection = document.getElementById('tl-unreported-detail');
    if (detailSection) {
        detailSection.remove();
    }

    if (Object.keys(unreportedAmounts).length === 0) return;

    detailSection = document.createElement('div');
    detailSection.id = 'tl-unreported-detail';
    detailSection.className = 'mb-5';

    // Header cliccabile per espandere/comprimere
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 mb-2 transition-colors';
    toggleBtn.innerHTML = '<i class="fas fa-chevron-down text-xs"></i> Dettaglio importi per cliente';
    
    const detailBody = document.createElement('div');
    detailBody.className = 'space-y-2';
    detailBody.style.display = 'none'; // Inizia chiuso

    toggleBtn.addEventListener('click', () => {
        const isOpen = detailBody.style.display !== 'none';
        detailBody.style.display = isOpen ? 'none' : 'block';
        toggleBtn.innerHTML = isOpen 
            ? '<i class="fas fa-chevron-down text-xs"></i> Dettaglio importi per cliente'
            : '<i class="fas fa-chevron-up text-xs"></i> Dettaglio importi per cliente';
    });

    // Crea una riga per ogni cliente
    for (const clientName in unreportedAmounts) {
        const amount = unreportedAmounts[clientName];
        const clientColor = getClientBgStyle(clientName);

        const row = document.createElement('div');
        row.className = 'flex items-start gap-3 px-3 py-2.5 bg-white rounded-lg border border-surface-100 overflow-hidden';

        // Badge cliente
        const badge = document.createElement('span');
        badge.className = 'tl-badge-client';
        badge.style.background = clientColor.bg;
        badge.style.color = clientColor.text;
        badge.textContent = clientName;

        // Importo
        const amountSpan = document.createElement('span');
        amountSpan.className = 'text-sm font-semibold text-amber-600';
        amountSpan.textContent = `€ ${amount.toFixed(2)}`;

        // Promemoria cell
        const reminderSpan = document.createElement('span');
        reminderSpan.className = 'text-xs text-surface-400 flex-1';
        reminderSpan.id = generateSafeId('reminder-cell', clientName);
        
        // Carica le impostazioni di promemoria per il cliente
        loadReminderSettings(clientName, reminderSpan, amount);

        // Bottone Imposta Promemoria
        const reminderBtn = document.createElement('button');
        reminderBtn.className = 'text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors';
        reminderBtn.innerHTML = '<i class="fas fa-bell"></i> Promemoria';
        reminderBtn.addEventListener('click', () => {
            showSetReminderModal(clientName, amount);
        });

        row.appendChild(badge);
        row.appendChild(amountSpan);
        row.appendChild(reminderSpan);
        row.appendChild(reminderBtn);

        detailBody.appendChild(row);
    }

    detailSection.appendChild(toggleBtn);
    detailSection.appendChild(detailBody);

    // Inserisci dopo le stats cards
    const statsBar = document.getElementById('tl-stats-bar');
    if (statsBar && statsBar.nextSibling) {
        statsBar.parentNode.insertBefore(detailSection, statsBar.nextSibling);
    }
}

export async function saveReminderSettings(clientName, reminderAmount, reminderDate) {
    try {
        const snapshot = await db.collection('reminders')
            .where('uid', '==', currentUser.uid)
            .where('clientName', '==', clientName)
            .get();

        if (!snapshot.empty) {
            const docId = snapshot.docs[0].id;
            try {
                await db.collection('reminders').doc(docId).update({
                    reminderAmount: reminderAmount,
                    reminderDate: reminderDate,
                    dismissed: false,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                CrModal.hide('setReminderModal');
                const m = await import('../pages/main.js');
                m.showAlert('success', 'Promemoria Salvato', 'Le impostazioni di promemoria sono state aggiornate.');
                loadSavedTimers(getCurrentFilters());
            } catch (error) {
                console.error('Errore nell\'aggiornamento del promemoria:', error);
                const m = await import('../pages/main.js');
                m.showAlert('error', 'Errore', 'Si è verificato un errore durante il salvataggio del promemoria.');
            }
        } else {
            try {
                await db.collection('reminders').add({
                    uid: currentUser.uid,
                    clientName: clientName,
                    reminderAmount: reminderAmount,
                    reminderDate: reminderDate,
                    dismissed: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                CrModal.hide('setReminderModal');
                const m = await import('../pages/main.js');
                m.showAlert('success', 'Promemoria Salvato', 'Le impostazioni di promemoria sono state salvate.');
                loadSavedTimers(getCurrentFilters());
            } catch (error) {
                console.error('Errore nel salvataggio del promemoria:', error);
                const m = await import('../pages/main.js');
                m.showAlert('error', 'Errore', 'Si è verificato un errore durante il salvataggio del promemoria.');
            }
        }
    } catch (error) {
        console.error('Errore nel controllare il promemoria esistente:', error);
    }
}

export async function loadReminderSettings(clientName, reminderCell, currentAmount) {
    try {
        const snapshot = await db.collection('reminders')
            .where('uid', '==', currentUser.uid)
            .where('clientName', '==', clientName)
            .get();
        if (!snapshot.empty) {
            const reminderData = snapshot.docs[0].data();
            let reminderText = '';

            if (reminderData.reminderAmount) {
                reminderText += `Importo: ${reminderData.reminderAmount.toFixed(2)} €`;
            }
            if (reminderData.reminderDate) {
                if (reminderText) reminderText += ' | ';
                reminderText += `Data: ${formatDate(reminderData.reminderDate)}`;
            }

            reminderCell.textContent = reminderText;
            checkReminder(clientName, currentAmount, reminderData);
        } else {
            reminderCell.textContent = 'Nessun promemoria impostato';
        }
    } catch (error) {
        console.error('Errore nel caricamento delle impostazioni di promemoria:', error);
    }
}

export function checkReminder(clientName, currentAmount, reminderData) {
    let shouldRemind = false;

    // Controlla l'importo
    if (reminderData.reminderAmount && currentAmount >= reminderData.reminderAmount) {
        shouldRemind = true;
    }

    // Controlla la data
    if (reminderData.reminderDate) {
        const today = new Date();
        const reminderDate = new Date(reminderData.reminderDate);
        if (today >= reminderDate) {
            shouldRemind = true;
        }
    }

    if (shouldRemind) {
        const reminderCellId = generateSafeId('reminder-cell', clientName);
        const reminderCell = document.getElementById(reminderCellId);
        if (!reminderCell) {
            console.error(`Elemento con id "${reminderCellId}" non trovato.`);
            return;
        }
        const reminderRow = reminderCell.parentElement;
        if (reminderRow) {
            reminderRow.classList.add('table-warning');
        } else {
            console.error('Impossibile trovare il parentElement di reminderCell.');
        }

        // Se l'utente ha già silenziato questo promemoria, non mostrare il dialog
        if (reminderData.dismissed) return;

        // Mostra una notifica all'utente con opzione per silenziare
        Swal.fire({
            icon: 'info',
            title: 'Promemoria',
            text: `Il cliente "${clientName}" ha raggiunto le condizioni del promemoria.`,
            confirmButtonText: 'OK',
            showDenyButton: true,
            denyButtonText: 'Non mostrare più',
            confirmButtonColor: '#6366f1',
            denyButtonColor: '#64748b',
        }).then(async (result) => {
            if (result.isDenied) {
                try {
                    const snapshot = await db.collection('reminders')
                        .where('uid', '==', currentUser.uid)
                        .where('clientName', '==', clientName)
                        .get();
                    if (!snapshot.empty) {
                        await db.collection('reminders').doc(snapshot.docs[0].id).update({
                            dismissed: true
                        });
                        notify.toast('Promemoria silenziato');
                    }
                } catch (err) {
                    console.error('Errore nel silenziare il promemoria:', err);
                }
            }
        });
    }
}

export async function showSetReminderModal(clientName, currentAmount) {
    document.getElementById('modal-client-name').textContent = clientName;

    document.getElementById('reminder-amount').value = '';
    document.getElementById('reminder-date').value = '';

    try {
        const snapshot = await db.collection('reminders')
            .where('uid', '==', currentUser.uid)
            .where('clientName', '==', clientName)
            .get();
        if (!snapshot.empty) {
            const reminderData = snapshot.docs[0].data();
            if (reminderData.reminderAmount) {
                document.getElementById('reminder-amount').value = reminderData.reminderAmount;
            }
            if (reminderData.reminderDate) {
                document.getElementById('reminder-date').value = reminderData.reminderDate;
            }
        }
    } catch (error) {
        console.error('Errore nel caricamento delle impostazioni di promemoria:', error);
    }

    CrModal.show('setReminderModal');

    const saveReminderBtn = document.getElementById('save-reminder-btn');
    saveReminderBtn.onclick = async () => {
        const reminderAmount = parseFloat(document.getElementById('reminder-amount').value);
        const reminderDate = document.getElementById('reminder-date').value;

        if (isNaN(reminderAmount) && !reminderDate) {
            const m = await import('../pages/main.js');
            m.showAlert('warning', 'Attenzione', 'Inserisci almeno un valore per il promemoria.');
            return;
        }

        saveReminderSettings(clientName, reminderAmount || null, reminderDate || null);
    };
}

// getClientColor è ora sostituita da getClientBgStyle di clientColors.js
// Mantenuta per retrocompatibilità interna ma reindirizza al modulo centralizzato
export function getClientColor(clientName) {
    const style = getClientBgStyle(clientName);
    return { bg: '', text: '', style };
}

// Funzione per visualizzare i timer raggruppati per cliente
export function displayTimers(timers) {
    const savedTimersList = document.getElementById('savedTimersAccordion');
    savedTimersList.innerHTML = '';

    // Aggiorna stats
    updateTimelineStats(timers);

    if (timers.length === 0) {
        savedTimersList.innerHTML = `
            <div class="text-center py-12">
                <div class="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-inbox text-2xl text-surface-300"></i>
                </div>
                <p class="text-surface-400 font-medium">Nessun timer trovato</p>
                <p class="text-surface-300 text-sm mt-1">Prova a modificare i filtri</p>
            </div>
        `;
        return;
    }

    const TIMERS_PER_PAGE = 20; // Timer visibili per mese inizialmente
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // === Raggruppa timer per cliente ===
    const timersByClient = {};

    timers.forEach(timerObj => {
        const clientName = timerObj.data.clientName || 'Sconosciuto';
        if (!timersByClient[clientName]) {
            timersByClient[clientName] = [];
        }
        timersByClient[clientName].push(timerObj);
    });

    // Ordina i clienti: usa ordine personalizzato (localStorage) se esiste, altrimenti per ore
    const savedOrder = JSON.parse(localStorage.getItem('cr-client-sort-order') || '{}');
    const hasSavedOrder = Object.keys(savedOrder).length > 0;

    const sortedClients = Object.keys(timersByClient).sort((a, b) => {
        if (hasSavedOrder) {
            const sa = savedOrder[a] ?? 9999;
            const sb = savedOrder[b] ?? 9999;
            if (sa !== sb) return sa - sb;
        }
        // Fallback: ordina per totale ore decrescente
        const totalA = timersByClient[a].reduce((sum, t) => sum + (t.data.duration || 0), 0);
        const totalB = timersByClient[b].reduce((sum, t) => sum + (t.data.duration || 0), 0);
        return totalB - totalA;
    });

    sortedClients.forEach((clientName, clientIdx) => {
        const clientTimers = timersByClient[clientName];
        const color = getClientBgStyle(clientName);

        // Calcola totali del cliente
        let totalSeconds = 0;
        let totalEarnings = 0;
        clientTimers.forEach(t => {
            totalSeconds += t.data.duration || 0;
            const rate = t.data.hourlyRate || 0;
            totalEarnings += (t.data.duration / 3600) * rate;
        });

        // --- Client Section (draggable) ---
        const clientSection = document.createElement('div');
        clientSection.className = 'tl-client-section animate-slide-up';
        clientSection.draggable = true;
        clientSection.dataset.clientName = clientName;

        // Client Header (collapsible + drag handle)
        const clientHeader = document.createElement('div');
        clientHeader.className = 'tl-day-header';
        clientHeader.style.borderLeftColor = getClientHexColor(clientName);
        const startExpanded = clientIdx === 0;
        clientHeader.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fas fa-grip-vertical tl-drag-handle text-surface-300 cursor-grab text-xs" title="Trascina per riordinare"></i>
                <i class="fas fa-chevron-${startExpanded ? 'down' : 'right'} text-xs text-surface-400 tl-client-chevron transition-transform"></i>
                <span class="tl-badge-client" style="background:${color.bg}; color:${color.text};">${clientName}</span>
                <span class="text-xs text-surface-400">(${clientTimers.length} timer)</span>
            </div>
            <div class="flex items-center gap-4 text-sm">
                <span class="flex items-center gap-1.5 text-surface-500">
                    <i class="fas fa-clock text-xs"></i>
                    <span class="font-mono font-semibold">${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0')}m</span>
                </span>
                <span class="flex items-center gap-1.5 text-emerald-600 font-semibold">
                    € ${totalEarnings.toFixed(2)}
                </span>
            </div>
        `;

        // Client Body (collapsible container for months)
        const clientBody = document.createElement('div');
        clientBody.className = 'tl-client-body';
        clientBody.style.display = startExpanded ? 'block' : 'none';

        // Toggle collapse
        clientHeader.addEventListener('click', (e) => {
            // Don't toggle when clicking the drag handle
            if (e.target.closest('.tl-drag-handle')) return;
            const isOpen = clientBody.style.display !== 'none';
            clientBody.style.display = isOpen ? 'none' : 'block';
            const chevron = clientHeader.querySelector('.tl-client-chevron');
            if (chevron) {
                chevron.classList.toggle('fa-chevron-down', !isOpen);
                chevron.classList.toggle('fa-chevron-right', isOpen);
            }
        });

        // === DRAG & DROP (same pattern as Gestione Dati) ===
        clientSection.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', clientName);
            clientSection.classList.add('tl-dragging');
        });
        clientSection.addEventListener('dragend', () => clientSection.classList.remove('tl-dragging'));
        clientSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragging = savedTimersList.querySelector('.tl-dragging');
            if (dragging && dragging !== clientSection) {
                const rect = clientSection.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (e.clientY < midY) {
                    savedTimersList.insertBefore(dragging, clientSection);
                } else {
                    savedTimersList.insertBefore(dragging, clientSection.nextSibling);
                }
            }
        });
        clientSection.addEventListener('drop', (e) => {
            e.preventDefault();
            // Save new sort order to localStorage
            const sections = savedTimersList.querySelectorAll('.tl-client-section');
            const newOrder = {};
            sections.forEach((s, i) => {
                if (s.dataset.clientName) newOrder[s.dataset.clientName] = i;
            });
            localStorage.setItem('cr-client-sort-order', JSON.stringify(newOrder));
        });

        clientSection.appendChild(clientHeader);

        // === Sub-raggruppa per mese ===
        clientTimers.sort((a, b) => b.data.startTime.seconds - a.data.startTime.seconds);

        const timersByMonth = {};
        clientTimers.forEach(t => {
            const d = t.data.startTime.toDate();
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!timersByMonth[key]) timersByMonth[key] = [];
            timersByMonth[key].push(t);
        });

        const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                            'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

        // Ordina mesi decrescente
        const sortedMonths = Object.keys(timersByMonth).sort((a, b) => b.localeCompare(a));

        sortedMonths.forEach((monthKey, monthIdx) => {
            const monthTimers = timersByMonth[monthKey];
            const [year, month] = monthKey.split('-');
            const monthName = `${monthNames[parseInt(month) - 1]} ${year}`;
            const isCurrentMonth = monthKey === currentMonthKey;

            // Totali del mese
            let monthSeconds = 0;
            monthTimers.forEach(t => { monthSeconds += t.data.duration || 0; });

            // --- Month Section ---
            const monthSection = document.createElement('div');
            monthSection.className = 'tl-month-section';

            // Month Header (collapsibile)
            const monthHeader = document.createElement('div');
            monthHeader.className = 'tl-month-header';
            monthHeader.innerHTML = `
                <i class="fas fa-chevron-${isCurrentMonth || monthIdx === 0 ? 'down' : 'right'} text-xs text-surface-400 month-chevron transition-transform"></i>
                <span class="text-sm font-semibold text-surface-600">${monthName}</span>
                <span class="text-xs text-surface-400">${monthTimers.length} timer</span>
                <span class="flex-1"></span>
                <span class="text-xs font-mono text-surface-500">${Math.floor(monthSeconds / 3600)}h ${Math.floor((monthSeconds % 3600) / 60).toString().padStart(2, '0')}m</span>
            `;

            // Month Body
            const monthBody = document.createElement('div');
            monthBody.className = 'tl-month-body';
            // Solo primo mese espanso, gli altri compressi
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

            // === Paginazione: mostra solo TIMERS_PER_PAGE alla volta ===
            let visibleCount = 0;

            function renderTimerRow(timerObj) {
                const logData = timerObj.data;
                const row = document.createElement('div');
                row.className = 'tl-timer-row';
                row.setAttribute('data-timer-id', timerObj.id);

                // Checkbox
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'w-4 h-4 accent-indigo-500 timer-checkbox flex-shrink-0 mt-1';
                checkbox.value = timerObj.id;
                checkbox.id = 'checkbox-' + timerObj.id;

                const content = document.createElement('div');
                content.className = 'flex-1 min-w-0';

                // === HELPER: Inline edit per testo semplice ===
                function makeInlineEditable(el, fieldName, opts = {}) {
                    el.classList.add('tl-inline-editable');
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (el.querySelector('input, select')) return; // già in editing
                        const currentVal = logData[fieldName] || '';
                        const input = document.createElement('input');
                        input.type = opts.type || 'text';
                        input.className = 'tl-inline-input';
                        input.value = opts.formatForEdit ? opts.formatForEdit(currentVal) : currentVal;
                        if (opts.placeholder) input.placeholder = opts.placeholder;
                        const originalText = el.textContent;
                        const originalHTML = el.innerHTML;
                        el.innerHTML = '';
                        el.appendChild(input);
                        input.focus();
                        input.select();

                        const save = () => {
                            const raw = input.value.trim();
                            const val = opts.parseValue ? opts.parseValue(raw) : raw;
                            if (val === null) {
                                // Valore non valido — ripristina
                                el.innerHTML = originalHTML;
                                return;
                            }
                            logData[fieldName] = val;
                            const updateData = { [fieldName]: val };
                            // Aggiorna anche il display
                            if (opts.formatDisplay) {
                                el.innerHTML = opts.formatDisplay(val);
                            } else {
                                el.textContent = val || opts.emptyText || '—';
                            }
                            // Se cambio durata, ricalcola hourlyRate display
                            if (opts.extraUpdates) {
                                const extra = opts.extraUpdates(val, logData);
                                Object.assign(updateData, extra);
                            }
                            db.collection('timeLogs').doc(timerObj.id).update(updateData)
                                .catch(err => console.error(`Errore aggiornamento ${fieldName}:`, err));
                        };
                        input.addEventListener('blur', save);
                        input.addEventListener('keydown', (ev) => {
                            if (ev.key === 'Enter') input.blur();
                            if (ev.key === 'Escape') { el.innerHTML = originalHTML; }
                        });
                    });
                }

                // === HELPER: Inline edit per select (con caricamento dati Firestore) ===
                function makeInlineSelect(el, fieldName, nameName, loadOptionsFn) {
                    el.classList.add('tl-inline-editable');
                    el.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (el.querySelector('select')) return;
                        const originalHTML = el.innerHTML;
                        const select = document.createElement('select');
                        select.className = 'tl-inline-select';
                        el.innerHTML = '';
                        el.appendChild(select);

                        await loadOptionsFn(select, logData[fieldName]);
                        select.focus();

                        const save = async () => {
                            const selectedOpt = select.options[select.selectedIndex];
                            if (selectedOpt && selectedOpt.value) {
                                const newId = selectedOpt.value;
                                const newName = selectedOpt.textContent;
                                logData[fieldName] = newId;
                                logData[nameName] = newName;
                                el.textContent = newName;
                                const updateData = { [fieldName]: newId, [nameName]: newName };
                                if (fieldName === 'worktypeId') {
                                    try {
                                        const doc = await db.collection('worktypes').doc(newId).get();
                                        if (doc.exists) {
                                            const rate = doc.data().hourlyRate || 0;
                                            logData.hourlyRate = rate;
                                            updateData.hourlyRate = rate;
                                        }
                                        await db.collection('timeLogs').doc(timerObj.id).update(updateData);
                                    } catch (err) {
                                        console.error(`Errore aggiornamento ${fieldName}:`, err);
                                    }
                                    return;
                                }
                                db.collection('timeLogs').doc(timerObj.id).update(updateData)
                                    .catch(err => console.error(`Errore aggiornamento ${fieldName}:`, err));
                            } else {
                                el.innerHTML = originalHTML;
                            }
                        };
                        select.addEventListener('blur', save);
                        select.addEventListener('change', () => select.blur());
                    });
                }

                // RIGA 1: Data + Progetto (editable) + Durata (editable)
                const mainRow = document.createElement('div');
                mainRow.className = 'flex items-center gap-2 flex-wrap';

                const dateSpan = document.createElement('span');
                dateSpan.className = 'text-xs font-semibold text-surface-500 flex-shrink-0';
                const startDate = logData.startTime.toDate();
                dateSpan.textContent = startDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

                const projectSpan = document.createElement('span');
                projectSpan.className = 'text-sm font-medium text-surface-700 truncate';
                projectSpan.textContent = logData.projectName || '—';
                // Inline select per progetto
                makeInlineSelect(projectSpan, 'projectId', 'projectName', async (selectEl, currentId) => {
                    selectEl.innerHTML = '<option value="">--Progetto--</option>';
                    const snap = await db.collection('projects')
                        .where('uid', '==', currentUser.uid)
                        .where('clientId', '==', logData.clientId)
                        .orderBy('name').get();
                    snap.forEach(doc => {
                        const opt = document.createElement('option');
                        opt.value = doc.id;
                        opt.textContent = doc.data().name;
                        if (doc.id === currentId) opt.selected = true;
                        selectEl.appendChild(opt);
                    });
                });

                const spacer = document.createElement('span');
                spacer.className = 'flex-1';

                const durationSpan = document.createElement('span');
                durationSpan.className = 'font-mono text-base font-bold text-surface-800 flex-shrink-0';
                const dur = logData.duration || 0;
                durationSpan.textContent = `${Math.floor(dur / 3600)}h ${Math.floor((dur % 3600) / 60).toString().padStart(2, '0')}m`;
                // Inline edit per durata
                makeInlineEditable(durationSpan, 'duration', {
                    placeholder: 'hh:mm:ss',
                    formatForEdit: (sec) => {
                        const h = Math.floor(sec / 3600);
                        const m = Math.floor((sec % 3600) / 60);
                        const s = Math.floor(sec % 60);
                        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
                    },
                    parseValue: (raw) => {
                        const parts = raw.split(':').map(Number);
                        if (parts.length !== 3 || parts.some(isNaN)) return null;
                        return parts[0] * 3600 + parts[1] * 60 + parts[2];
                    },
                    formatDisplay: (sec) => `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60).toString().padStart(2, '0')}m`
                });

                mainRow.appendChild(dateSpan);
                mainRow.appendChild(projectSpan);
                mainRow.appendChild(spacer);
                mainRow.appendChild(durationSpan);

                // RIGA 2: Tipo lavoro (editable) · Orari · Stato toggle · Azioni
                const detailRow = document.createElement('div');
                detailRow.className = 'flex items-center gap-2 mt-1 flex-wrap';

                const worktypeSpan = document.createElement('span');
                worktypeSpan.className = 'text-xs text-surface-400';
                worktypeSpan.textContent = logData.worktypeName || '—';
                // Inline select per tipo lavoro
                makeInlineSelect(worktypeSpan, 'worktypeId', 'worktypeName', async (selectEl, currentId) => {
                    selectEl.innerHTML = '<option value="">--Tipo Lavoro--</option>';
                    const snap = await db.collection('worktypes')
                        .where('uid', '==', currentUser.uid)
                        .where('clientId', '==', logData.clientId)
                        .orderBy('name').get();
                    snap.forEach(doc => {
                        const opt = document.createElement('option');
                        opt.value = doc.id;
                        opt.textContent = doc.data().name;
                        if (doc.id === currentId) opt.selected = true;
                        selectEl.appendChild(opt);
                    });
                });

                const timesSpan = document.createElement('span');
                timesSpan.className = 'text-xs text-surface-400';
                const startH = logData.startTime ? formatTimeShort(logData.startTime) : '—';
                const endH = logData.endTime ? formatTimeShort(logData.endTime) : '—';
                timesSpan.textContent = `${startH} – ${endH}`;

                const spacer2 = document.createElement('span');
                spacer2.className = 'flex-1';

                // Stato — cliccabile per toggle
                const statusBadge = document.createElement('button');
                statusBadge.className = 'tl-inline-status';
                statusBadge.title = 'Clicca per cambiare stato';
                function renderStatusBadge() {
                    if (logData.isReported) {
                        statusBadge.className = 'tl-inline-status tl-inline-status--reported';
                        statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> Reportato';
                    } else {
                        statusBadge.className = 'tl-inline-status tl-inline-status--pending';
                        statusBadge.innerHTML = '<i class="fas fa-clock"></i> Pending';
                    }
                }
                renderStatusBadge();
                statusBadge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const newStatus = !logData.isReported;
                    logData.isReported = newStatus;
                    renderStatusBadge();
                    db.collection('timeLogs').doc(timerObj.id).update({ isReported: newStatus })
                        .catch(err => console.error('Errore toggle stato:', err));
                });

                detailRow.appendChild(worktypeSpan);
                if (logData.worktypeName) {
                    const sep = document.createElement('span');
                    sep.className = 'text-surface-200';
                    sep.textContent = '·';
                    detailRow.appendChild(sep);
                }
                detailRow.appendChild(timesSpan);
                detailRow.appendChild(spacer2);
                detailRow.appendChild(statusBadge);

                // Link — solo icona, editabile inline
                const linkWrap = document.createElement('span');
                linkWrap.className = 'tl-inline-link-wrap';

                function renderLinkDisplay() {
                    linkWrap.innerHTML = '';
                    const val = logData.link || '';
                    const isUrl = /^https?:\/\//i.test(val);

                    if (val && isUrl) {
                        // Icona link che apre in nuova tab
                        const a = document.createElement('a');
                        a.href = val;
                        a.target = '_blank';
                        a.className = 'tl-inline-link-icon tl-inline-link-icon--active';
                        a.innerHTML = '<i class="fas fa-external-link-alt"></i>';
                        a.title = val;
                        a.addEventListener('click', (e) => e.stopPropagation());
                        linkWrap.appendChild(a);
                    } else if (val) {
                        // Link non-URL — icona attiva
                        const icon = document.createElement('span');
                        icon.className = 'tl-inline-link-icon tl-inline-link-icon--active';
                        icon.innerHTML = '<i class="fas fa-external-link-alt"></i>';
                        icon.title = val;
                        linkWrap.appendChild(icon);
                    } else {
                        // Nessun link — icona disattivata
                        const icon = document.createElement('span');
                        icon.className = 'tl-inline-link-icon tl-inline-link-icon--empty';
                        icon.innerHTML = '<i class="fas fa-external-link-alt"></i>';
                        icon.title = 'Aggiungi link';
                        linkWrap.appendChild(icon);
                    }

                    // Bottone edit piccolo
                    const editIcon = document.createElement('button');
                    editIcon.className = 'tl-inline-link-edit';
                    editIcon.innerHTML = '—';
                    editIcon.title = val ? 'Modifica link' : 'Aggiungi link';
                    editIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openLinkEditor();
                    });
                    linkWrap.appendChild(editIcon);
                }

                function openLinkEditor() {
                    linkWrap.innerHTML = '';
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'tl-inline-input';
                    input.value = logData.link || '';
                    input.placeholder = 'https://...';
                    input.style.minWidth = '12rem';
                    linkWrap.appendChild(input);
                    input.focus();
                    input.select();

                    const save = () => {
                        const val = input.value.trim();
                        logData.link = val;
                        renderLinkDisplay();
                        db.collection('timeLogs').doc(timerObj.id).update({ link: val })
                            .catch(err => console.error('Errore aggiornamento link:', err));
                    };
                    input.addEventListener('blur', save);
                    input.addEventListener('keydown', (ev) => {
                        if (ev.key === 'Enter') input.blur();
                        if (ev.key === 'Escape') renderLinkDisplay();
                    });
                }

                renderLinkDisplay();
                detailRow.appendChild(linkWrap);

                // Delete inline
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'tl-inline-action tl-inline-action--delete';
                deleteBtn.title = 'Elimina';
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const confirmed = await notify.confirm('Eliminare questo timer?', 'Sarà spostato nel cestino.', { confirmText: 'Sì, elimina' });
                    if (confirmed) {
                        try {
                            await db.collection('timeLogs').doc(timerObj.id).update({
                                isDeleted: true,
                                deletedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            row.style.transition = 'opacity 0.3s, transform 0.3s';
                            row.style.opacity = '0';
                            row.style.transform = 'translateX(20px)';
                            setTimeout(() => row.remove(), 300);
                            notify.success('Eliminato', 'Timer spostato nel cestino.');
                        } catch (err) {
                            console.error('Errore eliminazione timer:', err);
                            notify.error('Errore', 'Impossibile eliminare.');
                        }
                    }
                });
                detailRow.appendChild(deleteBtn);

                content.appendChild(mainRow);
                content.appendChild(detailRow);

                // RIGA 3: Note — sempre visibile se presente, editabile inline
                const noteRow = document.createElement('div');
                noteRow.className = 'tl-inline-note-row';
                const noteIcon = document.createElement('i');
                noteIcon.className = 'fas fa-sticky-note text-[9px]';
                const noteText = document.createElement('span');
                noteText.className = 'tl-inline-note-text';
                noteText.textContent = logData.note || 'Aggiungi nota...';
                if (!logData.note) noteText.classList.add('tl-inline-note-text--empty');
                noteRow.appendChild(noteIcon);
                noteRow.appendChild(noteText);

                // Click per editare la nota
                noteRow.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (noteRow.querySelector('input')) return;
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'tl-inline-input tl-inline-input--note';
                    input.value = logData.note || '';
                    input.placeholder = 'Scrivi una nota...';
                    noteRow.innerHTML = '';
                    noteRow.appendChild(input);
                    input.focus();

                    const save = () => {
                        const val = input.value.trim();
                        logData.note = val;
                        noteRow.innerHTML = '';
                        noteRow.appendChild(noteIcon);
                        noteText.textContent = val || 'Aggiungi nota...';
                        noteText.className = val ? 'tl-inline-note-text' : 'tl-inline-note-text tl-inline-note-text--empty';
                        noteRow.appendChild(noteText);
                        db.collection('timeLogs').doc(timerObj.id).update({ note: val })
                            .catch(err => console.error('Errore aggiornamento nota:', err));
                    };
                    input.addEventListener('blur', save);
                    input.addEventListener('keydown', (ev) => {
                        if (ev.key === 'Enter') input.blur();
                        if (ev.key === 'Escape') {
                            noteRow.innerHTML = '';
                            noteRow.appendChild(noteIcon);
                            noteRow.appendChild(noteText);
                        }
                    });
                });

                content.appendChild(noteRow);

                row.appendChild(checkbox);
                row.appendChild(content);
                return row;
            }

            // Render primi N timer
            const initialBatch = monthTimers.slice(0, TIMERS_PER_PAGE);
            initialBatch.forEach(t => {
                monthBody.appendChild(renderTimerRow(t));
            });
            visibleCount = initialBatch.length;

            // Pulsante "Mostra altri" se ci sono più timer
            if (monthTimers.length > TIMERS_PER_PAGE) {
                const loadMoreBtn = document.createElement('button');
                const remaining = monthTimers.length - visibleCount;
                loadMoreBtn.className = 'w-full py-2.5 text-sm font-medium text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all flex items-center justify-center gap-2 mt-2';
                loadMoreBtn.innerHTML = `<i class="fas fa-chevron-down text-xs"></i> Mostra altri ${Math.min(remaining, TIMERS_PER_PAGE)} di ${remaining}`;

                loadMoreBtn.addEventListener('click', () => {
                    const nextBatch = monthTimers.slice(visibleCount, visibleCount + TIMERS_PER_PAGE);
                    nextBatch.forEach(t => {
                        monthBody.insertBefore(renderTimerRow(t), loadMoreBtn);
                    });
                    visibleCount += nextBatch.length;

                    const newRemaining = monthTimers.length - visibleCount;
                    if (newRemaining <= 0) {
                        loadMoreBtn.remove();
                    } else {
                        loadMoreBtn.innerHTML = `<i class="fas fa-chevron-down text-xs"></i> Mostra altri ${Math.min(newRemaining, TIMERS_PER_PAGE)} di ${newRemaining}`;
                    }
                });

                monthBody.appendChild(loadMoreBtn);
            }

            monthSection.appendChild(monthHeader);
            monthSection.appendChild(monthBody);
            clientBody.appendChild(monthSection);
        });

        clientSection.appendChild(clientBody);
        savedTimersList.appendChild(clientSection);
    });
}

// Aggiorna le stats cards
export function updateTimelineStats(timers) {
    // Ore totali
    let totalSeconds = 0;
    let totalEarnings = 0;
    timers.forEach(t => {
        totalSeconds += t.data.duration || 0;
        const rate = t.data.hourlyRate || 0;
        totalEarnings += (t.data.duration / 3600) * rate;
    });
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const statHours = document.getElementById('tl-stat-hours');
    if (statHours) {
        statHours.textContent = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    // Conteggio timer
    const statCount = document.getElementById('tl-stat-count');
    if (statCount) {
        statCount.textContent = timers.length;
    }

    // Guadagni totali
    const statEarnings = document.getElementById('tl-stat-earnings');
    if (statEarnings) {
        statEarnings.textContent = `€ ${totalEarnings.toFixed(2)}`;
    }

    // Delta indicators
    updateStatDelta('tl-stat-hours-delta', totalSeconds / 3600, previousPeriodStats.hours, 'h');
    updateStatDelta('tl-stat-earnings-delta', totalEarnings, previousPeriodStats.earnings, '€');
    updateStatDelta('tl-stat-count-delta', timers.length, previousPeriodStats.count, '');

    // Salva stats correnti come riferimento per il prossimo ciclo di confronto
    previousPeriodStats = {
        hours: totalSeconds / 3600,
        earnings: totalEarnings,
        count: timers.length
    };

    // Popola i chip dei tipi di lavoro
    populateWorktypeChips(timers);
}

function updateStatDelta(elementId, current, previous, unit) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (previous === 0) {
        el.textContent = '';
        el.className = 'tl-stat-delta tl-stat-delta--neutral';
        return;
    }
    const diff = current - previous;
    const pct = ((diff / previous) * 100).toFixed(0);
    if (diff > 0) {
        el.innerHTML = `<i class="fas fa-arrow-up" style="font-size:0.5rem;"></i> +${pct}%`;
        el.className = 'tl-stat-delta tl-stat-delta--up';
    } else if (diff < 0) {
        el.innerHTML = `<i class="fas fa-arrow-down" style="font-size:0.5rem;"></i> ${pct}%`;
        el.className = 'tl-stat-delta tl-stat-delta--down';
    } else {
        el.textContent = '—';
        el.className = 'tl-stat-delta tl-stat-delta--neutral';
    }
}

// Popola i chip dei tipi di lavoro basandosi sui timer attualmente visualizzati
export function populateWorktypeChips(timers) {
    const container = document.getElementById('st-worktype-chips');
    const filtersRow = document.getElementById('st-filters-row');
    if (!container || !filtersRow) return;
    container.innerHTML = '';

    // Raccogli tipi di lavoro unici
    const worktypes = new Set();
    timers.forEach(t => {
        if (t.data.worktypeName) worktypes.add(t.data.worktypeName);
    });

    if (worktypes.size === 0) {
        filtersRow.style.display = 'none';
        return;
    }

    filtersRow.style.display = 'flex';

    // Chip "Tutti"
    const allChip = document.createElement('button');
    allChip.className = 'st-filter-chip' + (activeWorktypeFilter === null ? ' st-filter-chip--active' : '');
    allChip.dataset.filterWorktype = 'all';
    allChip.textContent = 'Tutti';
    container.appendChild(allChip);

    worktypes.forEach(wt => {
        const chip = document.createElement('button');
        chip.className = 'st-filter-chip' + (activeWorktypeFilter === wt ? ' st-filter-chip--active' : '');
        chip.dataset.filterWorktype = wt;
        chip.textContent = wt;
        container.appendChild(chip);
    });
}

// Funzione per caricare i clienti nel filtro
export async function loadClientsForFilter() {
    const filterClientSelect = document.getElementById('filter-client');
    try {
        const snapshot = await db.collection('clients')
            .where('uid', '==', currentUser.uid)
            .orderBy('name')
            .get();
        snapshot.forEach(doc => {
            const clientData = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = clientData.name;
            filterClientSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Errore nel caricamento dei clienti per il filtro:', error);
    }
}

// Funzione per ottenere i filtri correnti
export function getCurrentFilters() {
    const filterDateStart = document.getElementById('filter-date-start').value;
    const filterDateEnd = document.getElementById('filter-date-end').value;
    const filterClient = document.getElementById('filter-client').value;

    return {
        dateStart: filterDateStart,
        dateEnd: filterDateEnd,
        client: filterClient
    };
}

// Applica filtri avanzati (status, worktype) client-side ai timer già caricati
export function applyAdvancedFilters(timers) {
    let filtered = timers;

    // Filtro per stato
    if (activeStatusFilter === 'pending') {
        filtered = filtered.filter(t => !t.data.isReported);
    } else if (activeStatusFilter === 'reported') {
        filtered = filtered.filter(t => t.data.isReported);
    }

    // Filtro per tipo di lavoro
    if (activeWorktypeFilter !== null) {
        filtered = filtered.filter(t => t.data.worktypeName === activeWorktypeFilter);
    }

    return filtered;
}

// ============================================
// Export CSV Nativo
// ============================================
export async function exportTimersToCSV(timers) {
    if (!timers || timers.length === 0) {
        const m = await import('../pages/main.js');
        m.showAlert('info', 'Nessun Dato', 'Non ci sono timer da esportare.');
        return;
    }

    const headers = ['Cliente', 'Progetto', 'Tipo Lavoro', 'Data', 'Inizio', 'Fine', 'Durata (h)', 'Tariffa (€/h)', 'Importo (€)', 'Stato', 'Link'];
    const rows = timers.map(t => {
        const d = t.data;
        const startDate = d.startTime ? d.startTime.toDate() : null;
        const endDate = d.endTime ? d.endTime.toDate() : null;
        const durationH = (d.duration / 3600).toFixed(2);
        const rate = d.hourlyRate || 0;
        const amount = ((d.duration / 3600) * rate).toFixed(2);
        return [
            d.clientName || '',
            d.projectName || '',
            d.worktypeName || '',
            startDate ? startDate.toLocaleDateString('it-IT') : '',
            startDate ? startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '',
            endDate ? endDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '',
            durationH,
            rate.toFixed(2),
            amount,
            d.isReported ? 'Reportato' : 'Pending',
            d.link || ''
        ];
    });

    // BOM UTF-8 per Excel compatibilità
    let csv = '\uFEFF' + headers.join(';') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CronoReport_Timer_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const m = await import('../pages/main.js');
    m.showAlert('success', 'CSV Esportato', `${timers.length} timer esportati con successo.`);
}

// ============================================
// Export PDF Nativo
// ============================================
export async function exportTimersToPDF(timers) {
    if (!timers || timers.length === 0) {
        const m = await import('../pages/main.js');
        m.showAlert('info', 'Nessun Dato', 'Non ci sono timer da esportare.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // === HEADER ===
    // Gradient bar
    doc.setFillColor(99, 102, 241); // indigo-500
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.rect(pageWidth / 2, 0, pageWidth / 2, 18, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('CronoReport — Storico Timer', margin, 11);

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    const dateStr = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`${dateStr} — ${timers.length} timer`, pageWidth - margin, 11, { align: 'right' });

    let yPos = 26;

    // Raggruppa per cliente
    const byClient = {};
    timers.forEach(t => {
        const client = t.data.clientName || 'Sconosciuto';
        if (!byClient[client]) byClient[client] = [];
        byClient[client].push(t);
    });

    const clientNames = Object.keys(byClient).sort();

    clientNames.forEach((clientName, clientIdx) => {
        const clientTimers = byClient[clientName];
        let totalSec = 0, totalEur = 0;
        clientTimers.forEach(t => {
            totalSec += t.data.duration || 0;
            totalEur += ((t.data.duration / 3600) * (t.data.hourlyRate || 0));
        });

        // Check if we need a new page for the client header
        if (yPos > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage();
            yPos = 14;
        }

        // Client header bar
        doc.setFillColor(99, 102, 241);
        doc.roundedRect(margin, yPos, pageWidth - margin * 2, 8, 1.5, 1.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text(clientName, margin + 4, yPos + 5.5);

        const summaryText = `${clientTimers.length} timer · ${Math.floor(totalSec / 3600)}h ${Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0')}m · € ${totalEur.toFixed(2)}`;
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.text(summaryText, pageWidth - margin - 4, yPos + 5.5, { align: 'right' });

        yPos += 10;

        // Table data
        const tableBody = clientTimers.map(t => {
            const d = t.data;
            const start = d.startTime ? d.startTime.toDate() : null;
            const end = d.endTime ? d.endTime.toDate() : null;
            const dur = d.duration || 0;
            const amt = ((dur / 3600) * (d.hourlyRate || 0)).toFixed(2);
            return [
                start ? start.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : '—',
                d.projectName || '—',
                d.worktypeName || '—',
                `${start ? start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '—'} – ${end ? end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '—'}`,
                `${Math.floor(dur / 3600)}h ${Math.floor((dur % 3600) / 60).toString().padStart(2, '0')}m`,
                `€ ${amt}`,
                d.isReported ? '✓' : '⏳'
            ];
        });

        doc.autoTable({
            startY: yPos,
            margin: { left: margin, right: margin },
            head: [['Data', 'Progetto', 'Tipo', 'Orario', 'Durata', 'Importo', '']],
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: [241, 245, 249],
                textColor: [100, 116, 139],
                fontStyle: 'bold',
                fontSize: 6,
                cellPadding: 2,
                lineColor: [226, 232, 240],
                lineWidth: 0.2
            },
            bodyStyles: {
                fontSize: 7,
                cellPadding: 2,
                textColor: [30, 41, 59],
                lineColor: [241, 245, 249],
                lineWidth: 0.1
            },
            alternateRowStyles: {
                fillColor: [250, 251, 252]
            },
            columnStyles: {
                0: { cellWidth: 18 },
                3: { cellWidth: 28 },
                4: { cellWidth: 18 },
                5: { cellWidth: 18 },
                6: { cellWidth: 10, halign: 'center' }
            },
            didParseCell: (data) => {
                // Color the status column
                if (data.section === 'body' && data.column.index === 6) {
                    if (data.cell.raw === '✓') {
                        data.cell.styles.textColor = [34, 197, 94]; // green
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.textColor = [245, 158, 11]; // amber
                    }
                }
            }
        });

        yPos = doc.lastAutoTable.finalY + 2;

        // Client total row
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, yPos, pageWidth - margin * 2, 6, 1, 1, 'FD');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.text(`Totale: ${Math.floor(totalSec / 3600)}h ${Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0')}m — € ${totalEur.toFixed(2)}`, pageWidth - margin - 4, yPos + 4, { align: 'right' });

        yPos += 12;
    });

    // === FOOTER on each page ===
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.setFont(undefined, 'normal');
        doc.text(
            `CronoReport — ${new Date().getFullYear()} | Pagina ${i} di ${totalPages}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 6,
            { align: 'center' }
        );
    }

    // Save
    const fileName = `CronoReport_Timer_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

    const mPdf = await import('../pages/main.js');
    mPdf.showAlert('success', 'PDF Esportato', `${timers.length} timer esportati in "${fileName}".`);
}

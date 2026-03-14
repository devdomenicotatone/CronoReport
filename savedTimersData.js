// savedTimersData.js

// Quick filter state
let activeQuickYear = new Date().getFullYear();  // default: anno corrente
let activeQuickMonth = null; // null = tutti i mesi
let availableMonthsByYear = {}; // { 2026: [1, 2, 3], 2025: [1, ..., 12] }

const MONTH_NAMES_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

// Funzione per caricare gli anni e mesi disponibili e popolare i chip
function loadAvailableYears() {
    return db.collection('timeLogs')
        .where('uid', '==', currentUser.uid)
        .where('isDeleted', '==', false)
        .orderBy('startTime', 'desc')
        .get()
        .then(snapshot => {
            const yearMonthMap = {};
            snapshot.forEach(doc => {
                const startTime = doc.data().startTime;
                if (startTime) {
                    const d = startTime.toDate();
                    const year = d.getFullYear();
                    const month = d.getMonth() + 1; // 1-12
                    if (!yearMonthMap[year]) yearMonthMap[year] = new Set();
                    yearMonthMap[year].add(month);
                }
            });
            // Converti Sets in Arrays ordinati
            availableMonthsByYear = {};
            for (const year in yearMonthMap) {
                availableMonthsByYear[year] = Array.from(yearMonthMap[year]).sort((a, b) => a - b);
            }
            const years = Object.keys(availableMonthsByYear).map(Number).sort((a, b) => b - a);
            populateYearChips(years);
            updateQuickFilterBar();
            return years;
        })
        .catch(error => {
            console.error('Errore nel caricamento degli anni disponibili:', error);
            return [];
        });
}

// Popola i chip degli anni nella Quick Filter Bar
function populateYearChips(years) {
    const container = document.getElementById('qf-year-chips');
    if (!container) return;
    container.innerHTML = '';

    // Chip "Tutti"
    const allBtn = document.createElement('button');
    allBtn.className = 'qf-chip qf-chip-all' + (activeQuickYear === null ? ' qf-chip-active' : '');
    allBtn.dataset.year = 'all';
    allBtn.textContent = 'Tutti';
    container.appendChild(allBtn);

    years.forEach(year => {
        const btn = document.createElement('button');
        btn.className = 'qf-chip' + (activeQuickYear === year ? ' qf-chip-active' : '');
        btn.dataset.year = year;
        btn.textContent = year;
        container.appendChild(btn);
    });
}

// Popola i chip dei mesi in base all'anno selezionato (solo mesi con dati)
function populateMonthChips(year) {
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
function updateQuickFilterBar() {
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
function loadSavedTimers(filters = {}) {
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

    query.orderBy('startTime', 'desc').get()
        .then(snapshot => {
            displayedTimers = [];
            const unreportedAmounts = {};

            if (snapshot.empty) {
                const noTimersMessage = document.createElement('p');
                noTimersMessage.textContent = 'Non ci sono timer salvati.';
                savedTimersList.appendChild(noTimersMessage);
                updateQuickFilterBar();
                return;
            }

            const worktypeRates = {};

            db.collection('worktypes')
                .where('uid', '==', currentUser.uid)
                .get()
                .then(worktypeSnapshot => {
                    worktypeSnapshot.forEach(worktypeDoc => {
                        const worktypeData = worktypeDoc.data();
                        worktypeRates[worktypeDoc.id] = worktypeData.hourlyRate || 0;
                    });

                    snapshot.forEach(doc => {
                        const logData = doc.data();
                        const clientName = logData.clientName || 'Cliente Sconosciuto';
                        const worktypeId = logData.worktypeId;

                        displayedTimers.push({
                            id: doc.id,
                            data: logData
                        });

                        if (!logData.isReported) {
                            const durationInHours = logData.duration / 3600;
                            const hourlyRate = worktypeRates[worktypeId] || 0;
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
                })
                .catch(error => {
                    console.error('Errore nel caricamento delle tariffe dei tipi di lavoro:', error);
                });
        })
        .catch(error => {
            console.error('Errore nel caricamento dei timer salvati:', error);
        });
}

function generateSafeId(prefix, name) {
    return prefix + '-' + name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function displayUnreportedAmounts(unreportedAmounts) {
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
        const clientColor = getClientColor(clientName);

        const row = document.createElement('div');
        row.className = 'flex items-start gap-3 px-3 py-2.5 bg-white rounded-lg border border-surface-100 overflow-hidden';

        // Badge cliente
        const badge = document.createElement('span');
        badge.className = `tl-badge-client ${clientColor.bg} ${clientColor.text}`;
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

function saveReminderSettings(clientName, reminderAmount, reminderDate) {
    // Controlla se esiste già un promemoria per questo cliente
    db.collection('reminders')
        .where('uid', '==', currentUser.uid)
        .where('clientName', '==', clientName)
        .get()
        .then(snapshot => {
            if (!snapshot.empty) {
                // Aggiorna il documento esistente
                const docId = snapshot.docs[0].id;
                db.collection('reminders').doc(docId).update({
                    reminderAmount: reminderAmount,
                    reminderDate: reminderDate,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    CrModal.hide('setReminderModal');
                    showAlert('success', 'Promemoria Salvato', 'Le impostazioni di promemoria sono state aggiornate.');
                    // Ricarica la sezione degli importi non riscossi
                    loadSavedTimers(getCurrentFilters());
                }).catch(error => {
                    console.error('Errore nell\'aggiornamento del promemoria:', error);
                    showAlert('error', 'Errore', 'Si è verificato un errore durante il salvataggio del promemoria.');
                });
            } else {
                // Crea un nuovo documento
                db.collection('reminders').add({
                    uid: currentUser.uid,
                    clientName: clientName,
                    reminderAmount: reminderAmount,
                    reminderDate: reminderDate,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    CrModal.hide('setReminderModal');
                    showAlert('success', 'Promemoria Salvato', 'Le impostazioni di promemoria sono state salvate.');
                    // Ricarica la sezione degli importi non riscossi
                    loadSavedTimers(getCurrentFilters());
                }).catch(error => {
                    console.error('Errore nel salvataggio del promemoria:', error);
                    showAlert('error', 'Errore', 'Si è verificato un errore durante il salvataggio del promemoria.');
                });
            }
        })
        .catch(error => {
            console.error('Errore nel controllare il promemoria esistente:', error);
        });
}

function loadReminderSettings(clientName, reminderCell, currentAmount) {
    db.collection('reminders')
        .where('uid', '==', currentUser.uid)
        .where('clientName', '==', clientName)
        .get()
        .then(snapshot => {
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

                // Controlla se il promemoria deve essere attivato
                checkReminder(clientName, currentAmount, reminderData);
            } else {
                reminderCell.textContent = 'Nessun promemoria impostato';
            }
        })
        .catch(error => {
            console.error('Errore nel caricamento delle impostazioni di promemoria:', error);
        });
}

function checkReminder(clientName, currentAmount, reminderData) {
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

        // Mostra una notifica all'utente
        Swal.fire({
            icon: 'info',
            title: 'Promemoria',
            text: `Il cliente "${clientName}" ha raggiunto le condizioni del promemoria.`,
            confirmButtonText: 'OK'
        });
    }
}

function showSetReminderModal(clientName, currentAmount) {
    // Imposta il nome del cliente nella modale
    document.getElementById('modal-client-name').textContent = clientName;

    // Reset dei campi
    document.getElementById('reminder-amount').value = '';
    document.getElementById('reminder-date').value = '';

    // Carica le impostazioni esistenti, se presenti
    db.collection('reminders')
        .where('uid', '==', currentUser.uid)
        .where('clientName', '==', clientName)
        .get()
        .then(snapshot => {
            if (!snapshot.empty) {
                const reminderData = snapshot.docs[0].data();
                if (reminderData.reminderAmount) {
                    document.getElementById('reminder-amount').value = reminderData.reminderAmount;
                }
                if (reminderData.reminderDate) {
                    document.getElementById('reminder-date').value = reminderData.reminderDate;
                }
            }
        })
        .catch(error => {
            console.error('Errore nel caricamento delle impostazioni di promemoria:', error);
        });

    // Mostra la modale
    CrModal.show('setReminderModal');

    // Aggiungi event listener per il pulsante Salva
    const saveReminderBtn = document.getElementById('save-reminder-btn');
    saveReminderBtn.onclick = () => {
        const reminderAmount = parseFloat(document.getElementById('reminder-amount').value);
        const reminderDate = document.getElementById('reminder-date').value;

        if (isNaN(reminderAmount) && !reminderDate) {
            showAlert('warning', 'Attenzione', 'Inserisci almeno un valore per il promemoria.');
            return;
        }

        saveReminderSettings(clientName, reminderAmount || null, reminderDate || null);
    };
}

// Palette colori per badge clienti
const clientColorPalette = [
    { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { bg: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-rose-100', text: 'text-rose-700' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    { bg: 'bg-purple-100', text: 'text-purple-700' },
    { bg: 'bg-pink-100', text: 'text-pink-700' },
    { bg: 'bg-teal-100', text: 'text-teal-700' },
    { bg: 'bg-orange-100', text: 'text-orange-700' },
    { bg: 'bg-blue-100', text: 'text-blue-700' },
];
const clientColorMap = {};
let clientColorIndex = 0;

function getClientColor(clientName) {
    if (!clientColorMap[clientName]) {
        clientColorMap[clientName] = clientColorPalette[clientColorIndex % clientColorPalette.length];
        clientColorIndex++;
    }
    return clientColorMap[clientName];
}

// Funzione per visualizzare i timer raggruppati per cliente
function displayTimers(timers) {
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

    // Ordina i clienti per totale ore (decrescente)
    const sortedClients = Object.keys(timersByClient).sort((a, b) => {
        const totalA = timersByClient[a].reduce((sum, t) => sum + (t.data.duration || 0), 0);
        const totalB = timersByClient[b].reduce((sum, t) => sum + (t.data.duration || 0), 0);
        return totalB - totalA;
    });

    sortedClients.forEach(clientName => {
        const clientTimers = timersByClient[clientName];
        const color = getClientColor(clientName);

        // Calcola totali del cliente
        let totalSeconds = 0;
        let totalEarnings = 0;
        clientTimers.forEach(t => {
            totalSeconds += t.data.duration || 0;
            const rate = worktypeRates[t.data.worktypeId] || t.data.hourlyRate || 0;
            totalEarnings += (t.data.duration / 3600) * rate;
        });

        // --- Client Section ---
        const clientSection = document.createElement('div');
        clientSection.className = 'animate-slide-up';

        // Client Header
        const clientHeader = document.createElement('div');
        clientHeader.className = 'tl-day-header';
        clientHeader.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="tl-badge-client ${color.bg} ${color.text}" style="font-size: 0.8rem; padding: 4px 14px;">${clientName}</span>
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
            monthSection.className = 'mb-2';

            // Month Header (collapsibile)
            const monthHeader = document.createElement('div');
            monthHeader.className = 'flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-50 rounded-lg transition-colors';
            monthHeader.innerHTML = `
                <i class="fas fa-chevron-${isCurrentMonth || monthIdx === 0 ? 'down' : 'right'} text-xs text-surface-400 month-chevron transition-transform"></i>
                <span class="text-sm font-semibold text-surface-600">${monthName}</span>
                <span class="text-xs text-surface-400">${monthTimers.length} timer</span>
                <span class="flex-1"></span>
                <span class="text-xs font-mono text-surface-500">${Math.floor(monthSeconds / 3600)}h ${Math.floor((monthSeconds % 3600) / 60).toString().padStart(2, '0')}m</span>
            `;

            // Month Body
            const monthBody = document.createElement('div');
            monthBody.className = 'space-y-1';
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
                row.className = 'tl-timer-row group';

                // Checkbox
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'w-4 h-4 accent-indigo-500 timer-checkbox flex-shrink-0 mt-1';
                checkbox.value = timerObj.id;
                checkbox.id = 'checkbox-' + timerObj.id;

                const content = document.createElement('div');
                content.className = 'flex-1 min-w-0';

                // RIGA 1: Data + Sito + Durata
                const mainRow = document.createElement('div');
                mainRow.className = 'flex items-center gap-2 flex-wrap';

                const dateSpan = document.createElement('span');
                dateSpan.className = 'text-xs font-semibold text-surface-500 flex-shrink-0';
                const startDate = logData.startTime.toDate();
                dateSpan.textContent = startDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

                const siteSpan = document.createElement('span');
                siteSpan.className = 'text-sm font-medium text-surface-700 truncate';
                siteSpan.textContent = logData.siteName || '—';

                const spacer = document.createElement('span');
                spacer.className = 'flex-1';

                const durationSpan = document.createElement('span');
                durationSpan.className = 'font-mono text-base font-bold text-surface-800 flex-shrink-0';
                const dur = logData.duration || 0;
                durationSpan.textContent = `${Math.floor(dur / 3600)}h ${Math.floor((dur % 3600) / 60).toString().padStart(2, '0')}m`;

                mainRow.appendChild(dateSpan);
                mainRow.appendChild(siteSpan);
                mainRow.appendChild(spacer);
                mainRow.appendChild(durationSpan);

                // RIGA 2: Tipo lavoro · Orari · (status dot) · (edit on hover)
                const detailRow = document.createElement('div');
                detailRow.className = 'flex items-center gap-2 mt-1';

                const worktypeSpan = document.createElement('span');
                worktypeSpan.className = 'text-xs text-surface-400';
                worktypeSpan.textContent = logData.worktypeName || '';

                const timesSpan = document.createElement('span');
                timesSpan.className = 'text-xs text-surface-400';
                const startH = logData.startTime ? formatTimeShort(logData.startTime) : '—';
                const endH = logData.endTime ? formatTimeShort(logData.endTime) : '—';
                timesSpan.textContent = `${startH} – ${endH}`;

                const spacer2 = document.createElement('span');
                spacer2.className = 'flex-1';

                // Status: solo un pallino colorato (verde = reportato, ambra = pending)
                const statusDot = document.createElement('span');
                if (logData.isReported) {
                    statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0';
                    statusDot.title = 'Reportato';
                } else {
                    statusDot.className = 'w-2 h-2 rounded-full bg-amber-400 flex-shrink-0';
                    statusDot.title = 'Pending';
                }

                detailRow.appendChild(worktypeSpan);
                if (logData.worktypeName) {
                    const sep = document.createElement('span');
                    sep.className = 'text-surface-200';
                    sep.textContent = '·';
                    detailRow.appendChild(sep);
                }
                detailRow.appendChild(timesSpan);
                detailRow.appendChild(spacer2);
                detailRow.appendChild(statusDot);

                // Link icon (subtle, solo se esiste)
                if (logData.link) {
                    const isUrl = /^https?:\/\//i.test(logData.link);
                    if (isUrl) {
                        const a = document.createElement('a');
                        a.href = logData.link;
                        a.target = '_blank';
                        a.className = 'text-xs text-surface-300 hover:text-indigo-500 transition-colors ml-1 opacity-0 group-hover:opacity-100';
                        a.innerHTML = '<i class="fas fa-external-link-alt"></i>';
                        a.title = logData.link;
                        detailRow.appendChild(a);
                    }
                }

                // Edit button (visibile solo al hover)
                const editBtn = document.createElement('button');
                editBtn.className = 'tl-edit-btn ml-1 opacity-0 group-hover:opacity-100 transition-opacity';
                editBtn.title = 'Modifica';
                editBtn.innerHTML = '<i class="fas fa-pen text-xs"></i>';
                editBtn.addEventListener('click', () => {
                    openEditSavedTimerModal(timerObj.id);
                });
                detailRow.appendChild(editBtn);

                content.appendChild(mainRow);
                content.appendChild(detailRow);

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
            clientSection.appendChild(monthSection);
        });

        savedTimersList.appendChild(clientSection);
    });
}

// Aggiorna le stats cards
function updateTimelineStats(timers) {
    // Ore totali
    let totalSeconds = 0;
    timers.forEach(t => { totalSeconds += t.data.duration || 0; });
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
}

// Funzione per caricare i clienti nel filtro
function loadClientsForFilter() {
    const filterClientSelect = document.getElementById('filter-client');
    return db.collection('clients')
        .where('uid', '==', currentUser.uid)
        .orderBy('name')
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const clientData = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = clientData.name;
                filterClientSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Errore nel caricamento dei clienti per il filtro:', error);
        });
}

// Funzione per ottenere i filtri correnti
function getCurrentFilters() {
    const filterDateStart = document.getElementById('filter-date-start').value;
    const filterDateEnd = document.getElementById('filter-date-end').value;
    const filterClient = document.getElementById('filter-client').value;

    return {
        dateStart: filterDateStart,
        dateEnd: filterDateEnd,
        client: filterClient
    };
}
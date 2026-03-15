// timerInit.js — Inizializzazione eventi e caricamento timer attivi

// Variabili globali per i selettori e i timer
let clientSelect;
let siteSelect;
let worktypeSelect;
let linkInput;
let manualStartTimeInput;
let manualEndTimeInput;
let startTimerBtn;
let timerCardsContainer;

// Gestione dei timer attivi
let activeTimers = [];

// Flag per evitare doppio bind
let _timerEventsInitialized = false;

async function initializeTimerEvents() {
    if (!currentUser) {
        console.error("Utente non autenticato: currentUser è null in initializeTimerEvents.");
        return; 
    }
    
    // Bind events only once
    if (!_timerEventsInitialized) {
        _timerEventsInitialized = true;

        const timerDiv = document.createElement('div');
        timerDiv.id = 'timer-template';
        timerDiv.style.display = 'none';
        timerDiv.innerHTML = timerTemplate;
        document.body.appendChild(timerDiv);
        
        // Inizializza flatpickr per i campi della modale, UNA VOLTA SOLA
        flatpickr('#edit-start-time', {
            enableTime: true,
            enableSeconds: true,
            time_24hr: true,
            dateFormat: "d/m/Y H:i:S",
            locale: "it"
        });
        
        flatpickr('#edit-end-time', {
            enableTime: true,
            enableSeconds: true,
            time_24hr: true,
            dateFormat: "d/m/Y H:i:S",
            locale: "it"
        });

        clientSelect = document.getElementById('client-select');
        siteSelect = document.getElementById('site-select');
        worktypeSelect = document.getElementById('worktype-select');
        linkInput = document.getElementById('link-input');
        manualStartTimeInput = document.getElementById('manual-start-time');
        manualEndTimeInput = document.getElementById('manual-end-time');
        startTimerBtn = document.getElementById('start-timer-btn');
        timerCardsContainer = document.getElementById('timer-cards');

        const manualStartTimePicker = flatpickr(manualStartTimeInput, {
            enableTime: true,
            enableSeconds: true,
            time_24hr: true,
            dateFormat: "d/m/Y H:i:S",
            locale: "it"
        });

        const manualEndTimePicker = flatpickr(manualEndTimeInput, {
            enableTime: true,
            enableSeconds: true,
            time_24hr: true,
            dateFormat: "d/m/Y H:i:S",
            locale: "it"
        });

        loadTimerClientDropdown(clientSelect);

        clientSelect.addEventListener('change', () => {
            const selectedClientId = clientSelect.value;
            if (selectedClientId) {
                loadSites(siteSelect, selectedClientId);
                loadWorktypes(worktypeSelect, selectedClientId);
            } else {
                siteSelect.innerHTML = '<option value="">-- Sito --</option>';
                worktypeSelect.innerHTML = '<option value="">-- Tipo --</option>';
            }
        });

        // === MANUAL TOGGLE ===
        const manualToggle = document.getElementById('timer-manual-toggle');
        const manualSection = document.getElementById('timer-manual-section');
        if (manualToggle && manualSection) {
            manualToggle.addEventListener('click', () => {
                manualToggle.classList.toggle('open');
                manualSection.classList.toggle('visible');
            });
        }

        startTimerBtn.addEventListener('click', () => {
            const clientId = clientSelect.value;
            const siteId = siteSelect.value;
            const worktypeId = worktypeSelect.value;
            const link = linkInput.value.trim();

            const manualStartTimeValue = manualStartTimeInput.value;
            const manualEndTimeValue = manualEndTimeInput.value;

            if (clientId && siteId && worktypeId) {
                if (manualEndTimeValue && !manualStartTimeValue) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Attenzione',
                        text: 'Per inserire l\'ora di fine, devi prima specificare l\'ora di inizio.',
                        confirmButtonText: 'OK'
                    });
                    return;
                }

                createNewTimer(clientId, siteId, worktypeId, link, manualStartTimeValue, manualEndTimeValue);
                linkInput.value = '';
                manualStartTimeInput.value = '';
                manualEndTimeInput.value = '';
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Attenzione',
                    text: 'Seleziona cliente, sito e tipo di lavoro.',
                    confirmButtonText: 'OK'
                });
            }
        });
    } else {
        // Re-grab ALL DOM references on subsequent visits
        // (the old elements were destroyed by contentSection.innerHTML = '')
        clientSelect = document.getElementById('client-select');
        siteSelect = document.getElementById('site-select');
        worktypeSelect = document.getElementById('worktype-select');
        linkInput = document.getElementById('link-input');
        manualStartTimeInput = document.getElementById('manual-start-time');
        manualEndTimeInput = document.getElementById('manual-end-time');
        startTimerBtn = document.getElementById('start-timer-btn');
        timerCardsContainer = document.getElementById('timer-cards');

        // Re-populate client dropdown
        loadTimerClientDropdown(clientSelect);

        // Re-bind change listener (old element + listener was destroyed)
        clientSelect.addEventListener('change', () => {
            const selectedClientId = clientSelect.value;
            if (selectedClientId) {
                loadSites(siteSelect, selectedClientId);
                loadWorktypes(worktypeSelect, selectedClientId);
            } else {
                siteSelect.innerHTML = '<option value="">-- Sito --</option>';
                worktypeSelect.innerHTML = '<option value="">-- Tipo --</option>';
            }
        });

        // Re-bind start button
        startTimerBtn.addEventListener('click', () => {
            const clientId = clientSelect.value;
            const siteId = siteSelect.value;
            const worktypeId = worktypeSelect.value;
            const link = linkInput.value.trim();
            const manualStartTimeValue = manualStartTimeInput.value;
            const manualEndTimeValue = manualEndTimeInput.value;

            if (clientId && siteId && worktypeId) {
                if (manualEndTimeValue && !manualStartTimeValue) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Attenzione',
                        text: 'Per inserire l\'ora di fine, devi prima specificare l\'ora di inizio.',
                        confirmButtonText: 'OK'
                    });
                    return;
                }
                createNewTimer(clientId, siteId, worktypeId, link, manualStartTimeValue, manualEndTimeValue);
                linkInput.value = '';
                manualStartTimeInput.value = '';
                manualEndTimeInput.value = '';
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Attenzione',
                    text: 'Seleziona cliente, sito e tipo di lavoro.',
                    confirmButtonText: 'OK'
                });
            }
        });

        // Re-init flatpickr for manual time inputs
        flatpickr(manualStartTimeInput, {
            enableTime: true, enableSeconds: true, time_24hr: true,
            dateFormat: "d/m/Y H:i:S", locale: "it"
        });
        flatpickr(manualEndTimeInput, {
            enableTime: true, enableSeconds: true, time_24hr: true,
            dateFormat: "d/m/Y H:i:S", locale: "it"
        });

        // Re-bind manual toggle
        const manualToggle = document.getElementById('timer-manual-toggle');
        const manualSection = document.getElementById('timer-manual-section');
        if (manualToggle && manualSection) {
            manualToggle.addEventListener('click', () => {
                manualToggle.classList.toggle('open');
                manualSection.classList.toggle('visible');
            });
        }
    }

    // === LOAD RECENT TASKS ===
    loadRecentTasks();

    // === LOAD TODAY SUMMARY ===
    loadTodaySummary();

    // Carica i timer attivi — clear existing first to prevent duplication
    activeTimers.forEach(t => { if (t.intervalId) clearInterval(t.intervalId); });
    activeTimers.length = 0;
    if (timerCardsContainer) timerCardsContainer.innerHTML = '';

    db.collection('timers')
        .where('uid', '==', currentUser.uid)
        .where('isActive', '==', true)
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const timerData = doc.data();
                const timer = {
                    id: doc.id,
                    clientId: timerData.clientId,
                    siteId: timerData.siteId,
                    worktypeId: timerData.worktypeId,
                    clientName: timerData.clientName,
                    siteName: timerData.siteName,
                    worktypeName: timerData.worktypeName,
                    link: timerData.link || '',
                    accumulatedElapsedTime: timerData.accumulatedElapsedTime || 0,
                    lastStartTime: timerData.lastStartTime ? timerData.lastStartTime.toDate() : new Date(),
                    endTime: timerData.endTime ? timerData.endTime.toDate() : null,
                    isPaused: timerData.isPaused || false,
                    intervalId: null,
                    timerDisplay: null,
                    liveAmountDisplay: null,
                    hourlyRate: parseFloat(timerData.hourlyRate) || 0
                };

                activeTimers.push(timer);
                const timerCard = createTimerCard(timer);
                timerCardsContainer.appendChild(timerCard);

                if (!timer.isPaused) {
                    startTimer(timer);
                } else {
                    const totalElapsedTime = timer.accumulatedElapsedTime;
                    timer.timerDisplay.textContent = formatDuration(totalElapsedTime);
                    updateLiveAmount(timer, totalElapsedTime);
                }
            });
            updateActiveTimerCount();
        })
        .catch(error => {
            console.error('Errore nel caricamento dei timer attivi:', error);
        });

    initializeEditModalEvents();
}

function initializeEditModalEvents() {
    const saveChangesBtn = document.getElementById('save-timer-changes-btn');
    const deleteTimerBtn = document.getElementById('delete-timer-btn');

    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', () => {
            saveTimerChanges();
        });
    }

    if (deleteTimerBtn) {
        deleteTimerBtn.addEventListener('click', () => {
            deleteTimerFromModal();
        });
    }
}

// === VITE MODULE: Registra globals ===
window.activeTimers = activeTimers;
window.initializeTimerEvents = initializeTimerEvents;
window.initializeEditModalEvents = initializeEditModalEvents;

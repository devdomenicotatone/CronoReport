// timerInit.js — Inizializzazione eventi e caricamento timer attivi
import { timerTemplate } from './templates.js';
import { loadTimerClientDropdown, loadProjects, loadWorktypes, formatDuration, updateLiveAmount } from './timerHelpers.js';
import { createTimerCard, startTimer, pauseTimer, stopTimer, activeTimers } from './timerCard.js';
import { loadRecentTasks, loadTodaySummary, loadTodayLog, updateActiveTimerCount } from './timerWidgets.js';
import { createNewTimer } from './timerCrud.js';
import { loadClientColors } from './clientColors.js';

// Variabili globali per i selettori e i timer
let clientSelect;
let projectSelect;
let worktypeSelect;
let linkInput;
let noteInput;
let manualStartTimeInput;
let manualEndTimeInput;
let startTimerBtn;
let timerCardsContainer;

// activeTimers è importato da timerCard.js (shared state)

// Flag per evitare doppio bind
let _timerEventsInitialized = false;
let _keyboardBound = false;

export async function initializeTimerEvents() {
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
        

        clientSelect = document.getElementById('client-select');
        projectSelect = document.getElementById('project-select');
        worktypeSelect = document.getElementById('worktype-select');
        linkInput = document.getElementById('link-input');
        noteInput = document.getElementById('note-input');
        manualStartTimeInput = document.getElementById('manual-start-time');
        manualEndTimeInput = document.getElementById('manual-end-time');
        startTimerBtn = document.getElementById('start-timer-btn');
        timerCardsContainer = document.getElementById('timer-cards');


        loadTimerClientDropdown(clientSelect);

        clientSelect.addEventListener('change', () => {
            const selectedClientId = clientSelect.value;
            if (selectedClientId) {
                loadProjects(projectSelect, selectedClientId);
                loadWorktypes(worktypeSelect, selectedClientId);
            } else {
                projectSelect.innerHTML = '<option value="">-- Progetto --</option>';
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
            const projectId = projectSelect.value;
            const worktypeId = worktypeSelect.value;
            const link = linkInput.value.trim();
            const note = noteInput ? noteInput.value.trim() : '';

            const manualStartTimeValue = manualStartTimeInput.value;
            const manualEndTimeValue = manualEndTimeInput.value;

            if (clientId && projectId && worktypeId) {
                if (manualEndTimeValue && !manualStartTimeValue) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Attenzione',
                        text: 'Per inserire l\'ora di fine, devi prima specificare l\'ora di inizio.',
                        confirmButtonText: 'OK'
                    });
                    return;
                }

                createNewTimer(clientId, projectId, worktypeId, link, note, manualStartTimeValue, manualEndTimeValue);
                linkInput.value = '';
                if (noteInput) noteInput.value = '';
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
        projectSelect = document.getElementById('project-select');
        worktypeSelect = document.getElementById('worktype-select');
        linkInput = document.getElementById('link-input');
        noteInput = document.getElementById('note-input');
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
                loadProjects(projectSelect, selectedClientId);
                loadWorktypes(worktypeSelect, selectedClientId);
            } else {
                projectSelect.innerHTML = '<option value="">-- Progetto --</option>';
                worktypeSelect.innerHTML = '<option value="">-- Tipo --</option>';
            }
        });

        // Re-bind start button
        startTimerBtn.addEventListener('click', () => {
            const clientId = clientSelect.value;
            const projectId = projectSelect.value;
            const worktypeId = worktypeSelect.value;
            const link = linkInput.value.trim();
            const note = noteInput ? noteInput.value.trim() : '';
            const manualStartTimeValue = manualStartTimeInput.value;
            const manualEndTimeValue = manualEndTimeInput.value;

            if (clientId && projectId && worktypeId) {
                if (manualEndTimeValue && !manualStartTimeValue) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Attenzione',
                        text: 'Per inserire l\'ora di fine, devi prima specificare l\'ora di inizio.',
                        confirmButtonText: 'OK'
                    });
                    return;
                }
                createNewTimer(clientId, projectId, worktypeId, link, note, manualStartTimeValue, manualEndTimeValue);
                linkInput.value = '';
                if (noteInput) noteInput.value = '';
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

    // === LOAD TODAY LOG ===
    loadTodayLog();

    // Carica i timer attivi — clear existing first to prevent duplication
    activeTimers.forEach(t => { if (t.intervalId) clearInterval(t.intervalId); });
    activeTimers.length = 0;
    if (timerCardsContainer) timerCardsContainer.innerHTML = '';

    // Pre-load client colors from Firestore, then load active timers
    loadClientColors().then(() => {
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
                    projectId: timerData.projectId,
                    worktypeId: timerData.worktypeId,
                    clientName: timerData.clientName,
                    projectName: timerData.projectName,
                    worktypeName: timerData.worktypeName,
                    link: timerData.link || '',
                    note: timerData.note || '',
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
            updateActiveTimerCount(activeTimers);
        })
        .catch(error => {
            console.error('Errore nel caricamento dei timer attivi:', error);
        });
    }); // end loadClientColors().then()

    // === KEYBOARD SHORTCUTS (bind once) ===
    if (!_keyboardBound) {
        _keyboardBound = true;
        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('timer-section')) return;
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

            // Ctrl+Shift+S → Pause/Resume the first running timer
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                const running = activeTimers.find(t => !t.isPaused);
                if (running) {
                    const card = document.querySelector(`[data-timer-id="${running.id}"]`);
                    if (card) {
                        const pauseBtn = card.querySelector('button[title="Pausa"]');
                        if (pauseBtn) pauseBtn.click();
                    }
                } else {
                    const paused = activeTimers.find(t => t.isPaused);
                    if (paused) {
                        const card = document.querySelector(`[data-timer-id="${paused.id}"]`);
                        if (card) {
                            const resumeBtn = card.querySelector('button[title="Riprendi"]');
                            if (resumeBtn) resumeBtn.click();
                        }
                    }
                }
            }

            // Ctrl+Shift+N → Focus on start bar
            if (e.ctrlKey && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                const clientSel = document.getElementById('client-select');
                if (clientSel) {
                    clientSel.focus();
                    clientSel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    }
}

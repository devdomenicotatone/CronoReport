// timerInit.js — Inizializzazione eventi e caricamento timer attivi
import { timerTemplate } from './templates.js';
import { loadTimerClientDropdown, loadProjects, loadWorktypes, formatDuration, updateLiveAmount } from './timerHelpers.js';
import { createTimerCard, startTimer, pauseTimer, stopTimer, activeTimers } from './timerCard.js';
import { loadRecentTasks, loadTodaySummary, loadTodayLog, updateActiveTimerCount } from './timerWidgets.js';
import { createNewTimer } from './timerCrud.js';
import { loadClientColors } from './clientColors.js';
import * as notify from './notify.js';

// Variabili per i selettori
let clientSelect, projectSelect, worktypeSelect, linkInput, noteInput;
let manualStartTimeInput, manualEndTimeInput, startTimerBtn, timerCardsContainer;

// Flag per evitare doppio bind
let _timerEventsInitialized = false;
let _keyboardBound = false;

// ── Bind event listeners (estratto per evitare duplicazione) ──
function bindTimerControls() {
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

    // Manual toggle
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
                notify.warning('Attenzione', 'Per inserire l\'ora di fine, devi prima specificare l\'ora di inizio.');
                return;
            }
            createNewTimer(clientId, projectId, worktypeId, link, note, manualStartTimeValue, manualEndTimeValue);
            linkInput.value = '';
            if (noteInput) noteInput.value = '';
            manualStartTimeInput.value = '';
            manualEndTimeInput.value = '';
        } else {
            notify.warning('Attenzione', 'Seleziona cliente, sito e tipo di lavoro.');
        }
    });
}

export async function initializeTimerEvents() {
    if (!currentUser) {
        console.error("Utente non autenticato: currentUser è null in initializeTimerEvents.");
        return; 
    }
    
    // Prima volta: aggiungi template nascosto al DOM
    if (!_timerEventsInitialized) {
        _timerEventsInitialized = true;
        const timerDiv = document.createElement('div');
        timerDiv.id = 'timer-template';
        timerDiv.style.display = 'none';
        timerDiv.innerHTML = timerTemplate;
        document.body.appendChild(timerDiv);
    }

    // Bind/re-bind controlli (ogni volta — gli elementi DOM vengono ricreati)
    bindTimerControls();

    // Carica widget
    loadRecentTasks();
    loadTodaySummary();
    loadTodayLog();

    // Carica i timer attivi — clear existing first to prevent duplication
    activeTimers.forEach(t => { if (t.intervalId) clearInterval(t.intervalId); });
    activeTimers.length = 0;
    if (timerCardsContainer) timerCardsContainer.innerHTML = '';

    // Pre-load client colors, poi carica timer attivi
    await loadClientColors();

    try {
        const snapshot = await db.collection('timers')
            .where('uid', '==', currentUser.uid)
            .where('isActive', '==', true)
            .get();

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
    } catch (error) {
        console.error('Errore nel caricamento dei timer attivi:', error);
    }

    // Keyboard shortcuts (bind una sola volta)
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

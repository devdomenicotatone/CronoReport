// timerCard.js — Card UI e Timer Lifecycle (start, pause, resume, stop)
import { createFaviconEl, loadRecentTasks, loadTodaySummary, loadTodayLog, updateActiveTimerCount } from './timerWidgets.js';
import { formatDuration, updateLiveAmount, hhmmssToSeconds, secondsToHHMMSS } from './timerHelpers.js';
import { getClientHexColor } from '../core/clientColors.js';
import * as notify from '../core/notify.js';

// Shared state: activeTimers vive qui per evitare dipendenza circolare con timerInit/timerCrud
export let activeTimers = [];

// === CREATE TIMER CARD (with inline editing) ===

export function createTimerCard(timer) {
    const card = document.createElement('div');
    card.className = 'cr-card overflow-hidden timer-card relative border-0 shadow-md shadow-surface-200/40 transition-all duration-200 hover:shadow-lg hover:shadow-surface-300/50';
    if (timer.isPaused) card.classList.add('timer-card-paused');
    card.setAttribute('data-timer-id', timer.id);

    // Accent bar — use client color from Firestore
    const clientColor = getClientHexColor(timer.clientName);
    const clientColorLight = clientColor + '66';

    const accentBar = document.createElement('div');
    accentBar.className = 'h-1 w-full absolute top-0 left-0';
    if (timer.isPaused) {
        accentBar.style.background = '#cbd5e1';
    } else {
        accentBar.style.background = `linear-gradient(90deg, ${clientColor}, ${clientColorLight}, ${clientColor})`;
        accentBar.style.backgroundSize = '200% 100%';
        accentBar.style.animation = 'shimmer 4s linear infinite';
    }

    // Body
    const body = document.createElement('div');
    body.className = 'p-3 sm:p-4 pt-4 flex flex-col h-full';

    // === ROW 1: Client name + worktype badge ===
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center gap-2 mb-0.5';

    const title = document.createElement('h4');
    title.className = 'text-sm font-extrabold text-surface-900 leading-tight tracking-tight truncate';
    title.textContent = timer.clientName;

    const r = parseInt(clientColor.slice(1, 3), 16);
    const g = parseInt(clientColor.slice(3, 5), 16);
    const b = parseInt(clientColor.slice(5, 7), 16);
    const badge = document.createElement('span');
    badge.className = 'inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0 max-w-[100px] overflow-hidden text-ellipsis';
    badge.style.background = `rgba(${r}, ${g}, ${b}, 0.1)`;
    badge.style.color = clientColor;
    badge.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
    badge.style.borderWidth = '1px';
    badge.style.borderStyle = 'solid';
    badge.textContent = timer.worktypeName;

    header.appendChild(title);
    header.appendChild(badge);

    // === ROW 2: Project name only (clean) ===
    const subHeader = document.createElement('div');
    subHeader.className = 'flex items-center gap-1.5 mb-1.5';

    const projectFavicon = createFaviconEl(timer.projectName, '', 14);
    subHeader.appendChild(projectFavicon);

    const projectSpan = document.createElement('span');
    projectSpan.className = 'text-[10px] font-semibold text-surface-400 uppercase tracking-wider truncate';
    projectSpan.textContent = timer.projectName;
    subHeader.appendChild(projectSpan);

    // === ROW 2.5: Link + Note inline editing (single clean row) ===
    const metaRow = document.createElement('div');
    metaRow.className = 'flex items-center gap-2 mb-2.5';

    // Inline editable link — icon opens URL, text is editable
    const linkWrap = document.createElement('div');
    linkWrap.className = 'timer-inline-field';

    const linkIcon = document.createElement('i');
    linkIcon.className = 'fas fa-link text-[9px] text-surface-300 cursor-pointer';
    linkIcon.title = 'Apri link';
    // Icon click → open URL in new tab (if valid URL)
    linkIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (timer.link && /^https?:\/\//i.test(timer.link)) {
            window.open(timer.link, '_blank', 'noopener');
        }
    });

    const linkText = document.createElement('span');
    linkText.className = 'timer-inline-text';
    linkText.title = 'Clicca per modificare il link';
    linkText.textContent = timer.link || '—';
    if (!timer.link) linkText.classList.add('text-surface-300', 'italic');
    // If valid URL, show icon as clickable
    if (timer.link && /^https?:\/\//i.test(timer.link)) {
        linkIcon.classList.remove('text-surface-300');
        linkIcon.classList.add('text-indigo-400', 'hover:text-indigo-600');
    }

    linkWrap.appendChild(linkIcon);
    linkWrap.appendChild(linkText);

    // Text click → edit inline
    linkText.addEventListener('click', (e) => {
        e.stopPropagation();
        const input = document.createElement('input');
        input.type = 'url';
        input.className = 'timer-inline-input';
        input.value = timer.link || '';
        input.placeholder = 'https://...';
        linkWrap.innerHTML = '';
        linkWrap.appendChild(input);
        input.focus();
        input.select();

        const save = () => {
            const val = input.value.trim();
            timer.link = val;
            db.collection('timers').doc(timer.id).update({ link: val })
                .catch(e => console.error('Errore aggiornamento link:', e));
            linkWrap.innerHTML = '';
            // Update icon style
            linkIcon.className = 'fas fa-link text-[9px] cursor-pointer';
            if (val && /^https?:\/\//i.test(val)) {
                linkIcon.classList.add('text-indigo-400', 'hover:text-indigo-600');
                linkIcon.title = 'Apri link';
            } else {
                linkIcon.classList.add('text-surface-300');
                linkIcon.title = '';
            }
            linkText.textContent = val || '—';
            linkText.className = val ? 'timer-inline-text' : 'timer-inline-text text-surface-300 italic';
            linkWrap.appendChild(linkIcon);
            linkWrap.appendChild(linkText);
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') input.blur(); if (ev.key === 'Escape') { input.value = timer.link || ''; input.blur(); } });
    });

    // Inline editable note
    const noteWrap = document.createElement('div');
    noteWrap.className = 'timer-inline-field flex-1';
    const noteIcon = document.createElement('i');
    noteIcon.className = 'fas fa-sticky-note text-[9px] text-surface-300';
    const noteText = document.createElement('span');
    noteText.className = 'timer-inline-text';
    noteText.title = 'Clicca per aggiungere una nota';
    noteText.textContent = timer.note || '—';
    if (!timer.note) noteText.classList.add('text-surface-300', 'italic');
    noteWrap.appendChild(noteIcon);
    noteWrap.appendChild(noteText);

    noteWrap.addEventListener('click', (e) => {
        e.stopPropagation();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'timer-inline-input';
        input.value = timer.note || '';
        input.placeholder = 'Appunti...';
        noteWrap.innerHTML = '';
        noteWrap.appendChild(input);
        input.focus();
        input.select();

        const save = () => {
            const val = input.value.trim();
            timer.note = val;
            db.collection('timers').doc(timer.id).update({ note: val })
                .catch(e => console.error('Errore aggiornamento note:', e));
            noteWrap.innerHTML = '';
            noteWrap.appendChild(noteIcon);
            noteText.textContent = val || '—';
            noteText.className = val ? 'timer-inline-text' : 'timer-inline-text text-surface-300 italic';
            noteWrap.appendChild(noteText);
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') input.blur(); if (ev.key === 'Escape') { input.value = timer.note || ''; input.blur(); } });
    });

    metaRow.appendChild(linkWrap);
    metaRow.appendChild(noteWrap);

    // === ROW 3: Timer display (EDITABLE) + live amount ===
    const timerRow = document.createElement('div');
    timerRow.className = 'flex items-baseline justify-between mb-3';

    const timerDisplay = document.createElement('div');
    timerDisplay.className = 'text-2xl font-mono font-black text-surface-900 tracking-tight tabular-nums timer-inline-editable';
    timerDisplay.title = 'Clicca per modificare il tempo';
    if (!timer.isPaused) timerDisplay.classList.add('timer-display-running');
    timerDisplay.textContent = formatDuration(timer.accumulatedElapsedTime);

    // Inline time editing
    timerDisplay.addEventListener('click', () => {
        // Guard: se l'input è già presente, non ricreare
        if (timerDisplay.querySelector('input')) return;
        // Only allow editing when paused
        if (!timer.isPaused) {
            notify.info('Metti in pausa', 'Metti in pausa il timer prima di modificare il tempo.');
            return;
        }
        const currentVal = secondsToHHMMSS(timer.accumulatedElapsedTime);
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'timer-time-input';
        input.value = currentVal;
        input.placeholder = 'hh:mm:ss';
        // Blocca bubble click sull'input per evitare che il parent lo ricrei
        input.addEventListener('click', (e) => e.stopPropagation());
        timerDisplay.textContent = '';
        timerDisplay.appendChild(input);
        input.focus();
        input.select();

        const save = () => {
            const newSec = hhmmssToSeconds(input.value);
            if (!isNaN(newSec) && newSec >= 0) {
                timer.accumulatedElapsedTime = newSec;
                timerDisplay.textContent = formatDuration(newSec);
                updateLiveAmount(timer, newSec);
                db.collection('timers').doc(timer.id).update({ accumulatedElapsedTime: newSec })
                    .catch(e => console.error('Errore aggiornamento tempo:', e));
            } else {
                timerDisplay.textContent = formatDuration(timer.accumulatedElapsedTime);
                notify.error('Formato non valido', 'Usa il formato hh:mm:ss');
            }
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') { timerDisplay.textContent = formatDuration(timer.accumulatedElapsedTime); }
        });
    });

    const liveAmount = document.createElement('div');
    liveAmount.className = 'timer-live-amount text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100';
    const initHours = timer.accumulatedElapsedTime / 3600;
    liveAmount.textContent = `€ ${(initHours * (timer.hourlyRate || 0)).toFixed(2)}`;

    timerRow.appendChild(timerDisplay);
    timerRow.appendChild(liveAmount);

    // === ROW 4: Action buttons — Pause/Resume + Stop + Delete ===
    const actions = document.createElement('div');
    actions.className = 'flex gap-1.5 mt-auto pt-2.5 border-t border-surface-100/50';

    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'cr-btn cr-btn-sm flex-1 py-1.5 bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-sm active:scale-95 transition-all outline-none border-0 text-xs';
    pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    pauseBtn.title = 'Pausa';
    pauseBtn.style.display = timer.isPaused ? 'none' : '';

    const resumeBtn = document.createElement('button');
    resumeBtn.className = 'cr-btn cr-btn-sm flex-1 py-1.5 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-sm active:scale-95 transition-all outline-none border-0 text-xs';
    resumeBtn.innerHTML = '<i class="fas fa-play"></i>';
    resumeBtn.title = 'Riprendi';
    resumeBtn.style.display = timer.isPaused ? '' : 'none';

    const stopBtn = document.createElement('button');
    stopBtn.className = 'cr-btn cr-btn-sm flex-[1.5] py-1.5 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-sm active:scale-95 transition-all outline-none border-0 font-bold text-xs';
    stopBtn.innerHTML = '<i class="fas fa-stop mr-1"></i>Stop';
    stopBtn.title = 'Stop e Salva';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'cr-btn cr-btn-sm py-1.5 bg-surface-50 hover:bg-rose-50 text-surface-400 hover:text-rose-500 border border-surface-200 hover:border-rose-200 active:scale-95 transition-all outline-none text-xs px-3';
    deleteBtn.innerHTML = '<i class="fas fa-trash-alt text-[10px]"></i>';
    deleteBtn.title = 'Elimina Timer';

    // Event listeners
    pauseBtn.addEventListener('click', () => {
        pauseTimer(timer);
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = '';
        timerDisplay.classList.remove('timer-display-running');
        card.classList.add('timer-card-paused');
        accentBar.style.background = '#cbd5e1';
        accentBar.style.backgroundSize = '';
        accentBar.style.animation = 'none';
    });

    resumeBtn.addEventListener('click', () => {
        resumeTimer(timer);
        pauseBtn.style.display = '';
        resumeBtn.style.display = 'none';
        timerDisplay.classList.add('timer-display-running');
        card.classList.remove('timer-card-paused');
        accentBar.style.background = `linear-gradient(90deg, ${clientColor}, ${clientColorLight}, ${clientColor})`;
        accentBar.style.backgroundSize = '200% 100%';
        accentBar.style.animation = 'shimmer 4s linear infinite';
    });

    stopBtn.addEventListener('click', () => {
        stopTimer(timer, card);
    });

    deleteBtn.addEventListener('click', async () => {
        const confirmed = await notify.confirm('Eliminare questo timer?', 'Il timer verrà rimosso definitivamente.', { confirmText: 'Sì, elimina' });
        if (confirmed) {
            clearInterval(timer.intervalId);
            try {
                await db.collection('timers').doc(timer.id).delete();
                const idx = activeTimers.indexOf(timer);
                if (idx > -1) activeTimers.splice(idx, 1);
                card.remove();
                updateActiveTimerCount(activeTimers);
                updateTabTitle();
                notify.toast('Eliminato!');
            } catch (e) {
                console.error('Errore eliminazione timer:', e);
                notify.error('Errore', 'Impossibile eliminare il timer.');
            }
        }
    });

    actions.appendChild(pauseBtn);
    actions.appendChild(resumeBtn);
    actions.appendChild(stopBtn);
    actions.appendChild(deleteBtn);

    // Assemble
    body.appendChild(header);
    body.appendChild(subHeader);
    body.appendChild(metaRow);
    body.appendChild(timerRow);
    body.appendChild(actions);

    card.appendChild(accentBar);
    card.appendChild(body);

    timer.timerDisplay = timerDisplay;
    timer.liveAmountDisplay = liveAmount;

    return card;
}

const ORIGINAL_TITLE = 'CronoReport';

// Update browser tab title with the first running timer
export function updateTabTitle() {
    const running = activeTimers.find(t => !t.isPaused);
    if (running) {
        const now = new Date();
        const elapsed = (now - running.lastStartTime) / 1000 + running.accumulatedElapsedTime;
        const h = Math.floor(elapsed / 3600);
        const m = Math.floor((elapsed % 3600) / 60);
        const s = Math.floor(elapsed % 60);
        const timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        document.title = `⏱ ${timeStr} · ${running.projectName || running.clientName} - CronoReport`;
    } else if (activeTimers.some(t => t.isPaused)) {
        document.title = `⏸ Timer in pausa - CronoReport`;
    } else {
        document.title = ORIGINAL_TITLE;
    }
}

export function startTimer(timer) {
    timer.intervalId = setInterval(() => {
        if (!timer.isPaused) {
            const now = new Date();
            const totalElapsedTime = (now - timer.lastStartTime) / 1000 + timer.accumulatedElapsedTime;
            timer.timerDisplay.textContent = formatDuration(totalElapsedTime);
            updateLiveAmount(timer, totalElapsedTime);
            updateTabTitle();
        }
    }, 1000);
}

export function pauseTimer(timer) {
    clearInterval(timer.intervalId);
    timer.isPaused = true;
    const now = new Date();
    const elapsedSinceLastStart = (now - timer.lastStartTime) / 1000;
    timer.accumulatedElapsedTime += elapsedSinceLastStart;

    db.collection('timers').doc(timer.id).update({
        isPaused: true,
        accumulatedElapsedTime: timer.accumulatedElapsedTime,
        lastStartTime: firebase.firestore.Timestamp.fromDate(timer.lastStartTime)
    }).catch(error => {
        console.error('Errore nell\'aggiornamento del timer (pausa):', error);
    });
    updateTabTitle();
}

export function resumeTimer(timer) {
    timer.isPaused = false;
    timer.lastStartTime = new Date();
    startTimer(timer);

    db.collection('timers').doc(timer.id).update({
        isPaused: false,
        lastStartTime: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => {
        console.error('Errore nell\'aggiornamento del timer (riprendi):', error);
    });
    updateTabTitle();
}

export async function stopTimer(timer, card) {
    clearInterval(timer.intervalId);

    const now = new Date();
    let totalElapsedTime = timer.accumulatedElapsedTime;

    if (!timer.isPaused) {
        const elapsedSinceLastStart = (now - timer.lastStartTime) / 1000;
        totalElapsedTime += elapsedSinceLastStart;
    }

    const startTime = timer.lastStartTime;

    const timeLogData = {
        uid: currentUser.uid,
        clientId: timer.clientId,
        projectId: timer.projectId,
        worktypeId: timer.worktypeId,
        clientName: timer.clientName,
        projectName: timer.projectName,
        worktypeName: timer.worktypeName,
        link: timer.link || '',
        note: timer.note || '',
        startTime: firebase.firestore.Timestamp.fromDate(startTime),
        endTime: firebase.firestore.Timestamp.fromDate(now),
        duration: totalElapsedTime,
        isReported: false,
        isDeleted: false,
        hourlyRate: typeof timer.hourlyRate === 'number' ? timer.hourlyRate : 0
    };

    if (typeof timeLogData.hourlyRate !== 'number') {
        notify.error('Errore', 'La tariffa oraria non è valida.');
        return;
    }

    try {
        await db.collection('timeLogs').add(timeLogData);
        await db.collection('timers').doc(timer.id).update({
            isActive: false,
            endTime: firebase.firestore.FieldValue.serverTimestamp(),
            totalElapsedTime: totalElapsedTime
        });
        const index = activeTimers.indexOf(timer);
        if (index > -1) {
            activeTimers.splice(index, 1);
        }

        card.remove();
        updateActiveTimerCount(activeTimers);
        loadTodaySummary();
        loadRecentTasks();
        loadTodayLog();
        updateTabTitle();

        notify.success('Timer Salvato', 'Il tempo è stato registrato con successo.');
    } catch (error) {
        console.error('Errore nel salvataggio del tempo:', error);
        notify.error('Errore', 'Si è verificato un errore durante il salvataggio del tempo.');
    }
}

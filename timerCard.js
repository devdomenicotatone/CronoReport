// timerCard.js — Card UI e Timer Lifecycle (start, pause, resume, stop)

function createTimerCard(timer) {
    const card = document.createElement('div');
    card.className = 'cr-card overflow-hidden timer-card relative border-0 shadow-md shadow-surface-200/40 transition-all duration-200 hover:shadow-lg hover:shadow-surface-300/50';
    if (timer.isPaused) card.classList.add('timer-card-paused');
    card.setAttribute('data-timer-id', timer.id);

    // Accent bar — thin
    const accentBar = document.createElement('div');
    accentBar.className = 'h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 absolute top-0 left-0';
    if (timer.isPaused) accentBar.className = 'h-1 w-full bg-surface-300 absolute top-0 left-0';

    // Body — compact padding
    const body = document.createElement('div');
    body.className = 'p-3 sm:p-4 pt-4 flex flex-col h-full';

    // === ROW 1: Client name + worktype badge ===
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center gap-2 mb-0.5';

    const title = document.createElement('h4');
    title.className = 'text-sm font-extrabold text-surface-900 leading-tight tracking-tight truncate';
    title.textContent = timer.clientName;

    const badge = document.createElement('span');
    badge.className = 'inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap flex-shrink-0 max-w-[100px] overflow-hidden text-ellipsis';
    badge.textContent = timer.worktypeName;

    header.appendChild(title);
    header.appendChild(badge);

    // === ROW 2: Site + link (sub-header) ===
    const subHeader = document.createElement('div');
    subHeader.className = 'flex items-center gap-1.5 mb-3';

    // Favicon before site name
    const siteFavicon = createFaviconEl(timer.siteName, '', 14);
    subHeader.appendChild(siteFavicon);

    const siteSpan = document.createElement('span');
    siteSpan.className = 'text-[10px] font-semibold text-surface-400 uppercase tracking-wider truncate';
    siteSpan.textContent = timer.siteName;
    subHeader.appendChild(siteSpan);

    if (timer.link) {
        const isUrl = /^https?:\/\//i.test(timer.link);
        const sep = document.createElement('span');
        sep.className = 'text-surface-200 text-[10px]';
        sep.textContent = '·';
        subHeader.appendChild(sep);

        if (isUrl) {
            const linkA = document.createElement('a');
            linkA.href = timer.link;
            linkA.target = '_blank';
            linkA.className = 'text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors truncate';
            linkA.innerHTML = '<i class="fas fa-external-link-alt text-[8px] mr-0.5"></i>link';
            subHeader.appendChild(linkA);
        } else {
            const noteSpan = document.createElement('span');
            noteSpan.className = 'text-[10px] text-surface-400 italic truncate';
            noteSpan.textContent = timer.link;
            subHeader.appendChild(noteSpan);
        }
    }

    // === ROW 3: Timer display + live amount (inline) ===
    const timerRow = document.createElement('div');
    timerRow.className = 'flex items-baseline justify-between mb-3';

    const timerDisplay = document.createElement('div');
    timerDisplay.className = 'text-2xl font-mono font-black text-surface-900 tracking-tight tabular-nums';
    if (!timer.isPaused) timerDisplay.classList.add('timer-display-running');
    timerDisplay.textContent = formatDuration(timer.accumulatedElapsedTime);

    const liveAmount = document.createElement('div');
    liveAmount.className = 'timer-live-amount text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100';
    const initHours = timer.accumulatedElapsedTime / 3600;
    liveAmount.textContent = `€ ${(initHours * (timer.hourlyRate || 0)).toFixed(2)}`;

    timerRow.appendChild(timerDisplay);
    timerRow.appendChild(liveAmount);

    // === ROW 4: Action buttons (compact) ===
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

    const editBtn = document.createElement('button');
    editBtn.className = 'cr-btn cr-btn-sm py-1.5 bg-surface-50 hover:bg-surface-100 text-surface-500 border border-surface-200 active:scale-95 transition-all outline-none text-xs px-3';
    editBtn.innerHTML = '<i class="fas fa-pen text-[10px]"></i>';
    editBtn.title = 'Modifica Dati';

    // Event listeners
    pauseBtn.addEventListener('click', () => {
        pauseTimer(timer);
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = '';
        timerDisplay.classList.remove('timer-display-running');
        card.classList.add('timer-card-paused');
        accentBar.className = 'h-1 w-full bg-surface-300 absolute top-0 left-0';
    });

    resumeBtn.addEventListener('click', () => {
        resumeTimer(timer);
        pauseBtn.style.display = '';
        resumeBtn.style.display = 'none';
        timerDisplay.classList.add('timer-display-running');
        card.classList.remove('timer-card-paused');
        accentBar.className = 'h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 absolute top-0 left-0';
    });

    stopBtn.addEventListener('click', () => {
        stopTimer(timer, card);
    });

    editBtn.addEventListener('click', () => {
        openEditTimerModal(timer);
    });

    actions.appendChild(pauseBtn);
    actions.appendChild(resumeBtn);
    actions.appendChild(stopBtn);
    actions.appendChild(editBtn);

    // Assemble
    body.appendChild(header);
    body.appendChild(subHeader);
    body.appendChild(timerRow);
    body.appendChild(actions);

    card.appendChild(accentBar);
    card.appendChild(body);

    timer.timerDisplay = timerDisplay;
    timer.liveAmountDisplay = liveAmount;

    return card;
}

// === TIMER LIFECYCLE ===

function startTimer(timer) {
    timer.intervalId = setInterval(() => {
        if (!timer.isPaused) {
            const now = new Date();
            const totalElapsedTime = (now - timer.lastStartTime) / 1000 + timer.accumulatedElapsedTime;
            timer.timerDisplay.textContent = formatDuration(totalElapsedTime);
            updateLiveAmount(timer, totalElapsedTime);
        }
    }, 1000);
}

function pauseTimer(timer) {
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
}

function resumeTimer(timer) {
    timer.isPaused = false;
    timer.lastStartTime = new Date();
    startTimer(timer);

    db.collection('timers').doc(timer.id).update({
        isPaused: false,
        lastStartTime: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => {
        console.error('Errore nell\'aggiornamento del timer (riprendi):', error);
    });
}

function stopTimer(timer, card) {
    clearInterval(timer.intervalId);

    const now = new Date();
    let totalElapsedTime = timer.accumulatedElapsedTime;

    if (!timer.isPaused) {
        const elapsedSinceLastStart = (now - timer.lastStartTime) / 1000;
        totalElapsedTime += elapsedSinceLastStart;
    }

    const startTime = timer.lastStartTime;

    console.log('startTime:', startTime);
    console.log('endTime:', now);
    console.log('Total Elapsed Time (secondi):', totalElapsedTime);

    const timeLogData = {
        uid: currentUser.uid,
        clientId: timer.clientId,
        siteId: timer.siteId,
        worktypeId: timer.worktypeId,
        clientName: timer.clientName,
        siteName: timer.siteName,
        worktypeName: timer.worktypeName,
        link: timer.link || '',
        startTime: firebase.firestore.Timestamp.fromDate(startTime),
        endTime: firebase.firestore.Timestamp.fromDate(now),
        duration: totalElapsedTime,
        isReported: false,
        isDeleted: false,
        hourlyRate: typeof timer.hourlyRate === 'number' ? timer.hourlyRate : 0
    };

    if (typeof timeLogData.hourlyRate !== 'number') {
        Swal.fire({
            icon: 'error',
            title: 'Errore',
            text: 'La tariffa oraria non è valida.',
            confirmButtonText: 'OK'
        });
        return;
    }

    db.collection('timeLogs').add(timeLogData)
        .then(() => {
            db.collection('timers').doc(timer.id).update({
                isActive: false,
                endTime: firebase.firestore.FieldValue.serverTimestamp(),
                totalElapsedTime: totalElapsedTime
            }).then(() => {
                const index = activeTimers.indexOf(timer);
                if (index > -1) {
                    activeTimers.splice(index, 1);
                }

                card.remove();
                updateActiveTimerCount();
                loadTodaySummary();
                loadRecentTasks();

                Swal.fire({
                    icon: 'success',
                    title: 'Timer Salvato',
                    text: 'Il tempo è stato registrato con successo.',
                    confirmButtonText: 'OK'
                });
            }).catch(error => {
                console.error('Errore nell\'aggiornamento del timer:', error);
            });
        }).catch(error => {
            console.error('Errore nell\'aggiunta del log del tempo:', error);
            Swal.fire({
                icon: 'error',
                title: 'Errore',
                text: 'Si è verificato un errore durante il salvataggio del tempo.',
                confirmButtonText: 'OK'
            });
        });
}

// === VITE MODULE: Registra globals ===
window.createTimerCard = createTimerCard;
window.startTimer = startTimer;
window.pauseTimer = pauseTimer;
window.resumeTimer = resumeTimer;
window.stopTimer = stopTimer;

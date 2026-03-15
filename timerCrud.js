// timerCrud.js — Operazioni CRUD: crea timer (la modifica inline è ora in timerCard.js)
import { parseLocalDateTime, getHourlyRate } from './timerHelpers.js';
import { loadRecentTasks, loadTodaySummary, loadTodayLog, updateActiveTimerCount } from './timerWidgets.js';
import { createTimerCard, startTimer, activeTimers } from './timerCard.js';

// === CREATE NEW TIMER ===

export async function createNewTimer(clientId, projectId, worktypeId, link, note, manualStartTimeValue, manualEndTimeValue) {
    const clientSelectEl = document.getElementById('client-select');
    const projectSelectEl = document.getElementById('project-select');
    const worktypeSelectEl = document.getElementById('worktype-select');

    const clientName = clientSelectEl.options[clientSelectEl.selectedIndex].text;
    const projectName = projectSelectEl.options[projectSelectEl.selectedIndex].text;
    const worktypeName = worktypeSelectEl.options[worktypeSelectEl.selectedIndex].text;

    let hourlyRate = 0;
    try {
        const worktypeDoc = await db.collection('worktypes').doc(worktypeId).get();
        if (worktypeDoc.exists) {
            hourlyRate = parseFloat(worktypeDoc.data().hourlyRate) || 0;
        }
    } catch (error) {
        console.error('Errore nel recuperare la tariffa oraria del tipo di lavoro:', error);
    }
    
    const manualStartTime = manualStartTimeValue ? parseLocalDateTime(manualStartTimeValue) : null;
    const manualEndTime = manualEndTimeValue ? parseLocalDateTime(manualEndTimeValue) : null;

    if (manualStartTimeValue && !manualStartTime) {
        Swal.fire({ icon: 'error', title: 'Errore', text: 'L\'ora di inizio inserita non è valida.', confirmButtonText: 'OK' });
        return;
    }
    if (manualEndTimeValue && !manualEndTime) {
        Swal.fire({ icon: 'error', title: 'Errore', text: 'L\'ora di fine inserita non è valida.', confirmButtonText: 'OK' });
        return;
    }

    if (manualStartTime && manualEndTime) {
        // === MANUAL START + END: Save directly as timeLog ===
        const durationInSeconds = (manualEndTime - manualStartTime) / 1000;
        if (durationInSeconds <= 0) {
            Swal.fire({ icon: 'error', title: 'Errore', text: 'L\'ora di fine deve essere successiva all\'ora di inizio.', confirmButtonText: 'OK' });
            return;
        }

        let hourlyRate = await getHourlyRate();

        db.collection('timeLogs').add({
            uid: currentUser.uid,
            clientId, projectId, worktypeId,
            clientName, projectName, worktypeName,
            link: link || '',
            note: note || '',
            startTime: firebase.firestore.Timestamp.fromDate(manualStartTime),
            endTime: firebase.firestore.Timestamp.fromDate(manualEndTime),
            duration: durationInSeconds,
            isReported: false,
            isDeleted: false,
            hourlyRate: hourlyRate
        }).then(() => {
            Swal.fire({ icon: 'success', title: 'Timer Salvato', text: 'Il timer è stato registrato con successo.', confirmButtonText: 'OK' });
            loadRecentTasks();
            loadTodaySummary();
            loadTodayLog();
        }).catch(error => {
            console.error('Errore nel salvataggio del timer:', error);
            Swal.fire({ icon: 'error', title: 'Errore', text: 'Si è verificato un errore durante il salvataggio del timer.', confirmButtonText: 'OK' });
        });

    } else if (manualStartTime && !manualEndTime) {
        // === MANUAL START ONLY: Create active timer from past ===
        const now = new Date();
        if (manualStartTime > now) {
            Swal.fire({ icon: 'error', title: 'Errore', text: 'L\'ora di inizio non può essere futura.', confirmButtonText: 'OK' });
            return;
        }

        const timer = {
            clientId, projectId, worktypeId,
            clientName, projectName, worktypeName,
            link: link || '',
            note: note || '',
            accumulatedElapsedTime: 0,
            lastStartTime: manualStartTime,
            isPaused: false,
            intervalId: null,
            timerDisplay: null,
            liveAmountDisplay: null,
            hourlyRate: hourlyRate
        };

        db.collection('timers').add({
            uid: currentUser.uid,
            clientId, projectId, worktypeId,
            clientName, projectName, worktypeName,
            link: link || '',
            note: note || '',
            accumulatedElapsedTime: 0,
            lastStartTime: firebase.firestore.Timestamp.fromDate(manualStartTime),
            isPaused: false,
            isActive: true,
            hourlyRate: hourlyRate
        }).then(docRef => {
            timer.id = docRef.id;
            activeTimers.push(timer);
            const timerCard = createTimerCard(timer);
            document.getElementById('timer-cards').appendChild(timerCard);
            startTimer(timer);
            updateActiveTimerCount(activeTimers);
        }).catch(error => {
            console.error('Errore nel salvataggio del timer:', error);
            Swal.fire({ icon: 'error', title: 'Errore', text: 'Si è verificato un errore durante il salvataggio del timer.', confirmButtonText: 'OK' });
        });

    } else {
        // === LIVE TIMER: Start now ===
        const timer = {
            clientId, projectId, worktypeId,
            clientName, projectName, worktypeName,
            link: link || '',
            note: note || '',
            accumulatedElapsedTime: 0,
            lastStartTime: new Date(),
            isPaused: false,
            intervalId: null,
            timerDisplay: null,
            liveAmountDisplay: null,
            hourlyRate: hourlyRate
        };

        db.collection('timers').add({
            uid: currentUser.uid,
            clientId, projectId, worktypeId,
            clientName, projectName, worktypeName,
            link: link || '',
            note: note || '',
            accumulatedElapsedTime: 0,
            lastStartTime: firebase.firestore.FieldValue.serverTimestamp(),
            isPaused: false,
            isActive: true,
            hourlyRate: hourlyRate
        }).then(docRef => {
            timer.id = docRef.id;
            activeTimers.push(timer);
            const timerCard = createTimerCard(timer);
            document.getElementById('timer-cards').appendChild(timerCard);
            startTimer(timer);
            updateActiveTimerCount(activeTimers);
        }).catch(error => {
            console.error('Errore nel salvataggio del timer:', error);
            Swal.fire({ icon: 'error', title: 'Errore', text: 'Si è verificato un errore durante il salvataggio del timer.', confirmButtonText: 'OK' });
        });
    }
}

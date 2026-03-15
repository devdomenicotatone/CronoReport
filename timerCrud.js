// timerCrud.js — Operazioni CRUD: crea, modifica, elimina timer
import { CrModal } from './uiComponents.js';
import { parseLocalDateTime, formatLocalDateTime, secondsToHHMMSS, hhmmssToSeconds, getHourlyRate } from './timerHelpers.js';
import { createFaviconEl, loadRecentTasks, loadTodaySummary, updateActiveTimerCount } from './timerWidgets.js';
import { createTimerCard, startTimer, activeTimers } from './timerCard.js';

// === EDIT MODAL: Dropdown Loading ===

export function loadAllClientsForEditSelect(selectElement, selectedClientId) {
    return db.collection('clients')
        .where('uid', '==', currentUser.uid)
        .orderBy('name')
        .get()
        .then(snapshot => {
            selectElement.innerHTML = '';
            snapshot.forEach(doc => {
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = doc.data().name;
                selectElement.appendChild(opt);
            });
            if (selectedClientId) {
                selectElement.value = selectedClientId;
            }
        });
}

export function loadAllProjectsForEditSelect(selectElement, clientId, selectedprojectId) {
    selectElement.innerHTML = '<option value="">--Seleziona Progetto--</option>';
    return db.collection('projects')
        .where('uid', '==', currentUser.uid)
        .where('clientId', '==', clientId)
        .orderBy('name')
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = doc.data().name;
                selectElement.appendChild(opt);
            });
            if (selectedprojectId) {
                selectElement.value = selectedprojectId;
            }
        });
}

export function loadAllWorktypesForEditSelect(selectElement, clientId, selectedWorktypeId) {
    selectElement.innerHTML = '<option value="">--Seleziona Tipo di Lavoro--</option>';
    return db.collection('worktypes')
        .where('uid', '==', currentUser.uid)
        .where('clientId', '==', clientId)
        .orderBy('name')
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = doc.data().name;
                selectElement.appendChild(opt);
            });
            if (selectedWorktypeId) {
                selectElement.value = selectedWorktypeId;
            }
        });
}

// === CREATE NEW TIMER ===

export async function createNewTimer(clientId, projectId, worktypeId, link, manualStartTimeValue, manualEndTimeValue) {
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
            console.log(`[Timer] hourlyRate per ${worktypeName}: ${hourlyRate} €/h`);
        }
    } catch (error) {
        console.error('Errore nel recuperare la tariffa oraria del tipo di lavoro:', error);
    }
    
    const manualStartTime = manualStartTimeValue ? parseLocalDateTime(manualStartTimeValue) : null;
    const manualEndTime = manualEndTimeValue ? parseLocalDateTime(manualEndTimeValue) : null;

    if (manualStartTimeValue && !manualStartTime) {
        Swal.fire({
            icon: 'error',
            title: 'Errore',
            text: 'L\'ora di inizio inserita non è valida.',
            confirmButtonText: 'OK'
        });
        return;
    }
    if (manualEndTimeValue && !manualEndTime) {
        Swal.fire({
            icon: 'error',
            title: 'Errore',
            text: 'L\'ora di fine inserita non è valida.',
            confirmButtonText: 'OK'
        });
        return;
    }

    if (manualStartTime && manualEndTime) {
        // === MANUAL START + END: Save directly as timeLog ===
        const durationInSeconds = (manualEndTime - manualStartTime) / 1000;
        if (durationInSeconds <= 0) {
            Swal.fire({
                icon: 'error',
                title: 'Errore',
                text: 'L\'ora di fine deve essere successiva all\'ora di inizio.',
                confirmButtonText: 'OK'
            });
            return;
        }

        let hourlyRate = await getHourlyRate();

        db.collection('timeLogs').add({
            uid: currentUser.uid,
            clientId: clientId,
            projectId: projectId,
            worktypeId: worktypeId,
            clientName: clientName,
            projectName: projectName,
            worktypeName: worktypeName,
            link: link || '',
            startTime: firebase.firestore.Timestamp.fromDate(manualStartTime),
            endTime: firebase.firestore.Timestamp.fromDate(manualEndTime),
            duration: durationInSeconds,
            isReported: false,
            isDeleted: false,
            hourlyRate: hourlyRate
        }).then(() => {
            Swal.fire({
                icon: 'success',
                title: 'Timer Salvato',
                text: 'Il timer è stato registrato con successo.',
                confirmButtonText: 'OK'
            });
            loadRecentTasks();
            loadTodaySummary();
        }).catch(error => {
            console.error('Errore nel salvataggio del timer:', error);
            Swal.fire({
                icon: 'error',
                title: 'Errore',
                text: 'Si è verificato un errore durante il salvataggio del timer.',
                confirmButtonText: 'OK'
            });
        });

    } else if (manualStartTime && !manualEndTime) {
        // === MANUAL START ONLY: Create active timer from past ===
        const now = new Date();
        if (manualStartTime > now) {
            Swal.fire({
                icon: 'error',
                title: 'Errore',
                text: 'L\'ora di inizio non può essere futura.',
                confirmButtonText: 'OK'
            });
            return;
        }

        const accumulatedElapsedTime = 0;
        let hourlyRate = 0;
        try {
            const wtDoc = await db.collection('worktypes').doc(worktypeId).get();
            if (wtDoc.exists) hourlyRate = parseFloat(wtDoc.data().hourlyRate) || 0;
        } catch(e) { /* fallback 0 */ }
        console.log(`[Timer] hourlyRate per ${worktypeName}: ${hourlyRate} €/h`);

        const timer = {
            clientId: clientId,
            projectId: projectId,
            worktypeId: worktypeId,
            clientName: clientName,
            projectName: projectName,
            worktypeName: worktypeName,
            link: link,
            accumulatedElapsedTime: accumulatedElapsedTime,
            lastStartTime: manualStartTime,
            isPaused: false,
            intervalId: null,
            timerDisplay: null,
            liveAmountDisplay: null,
            hourlyRate: hourlyRate
        };

        db.collection('timers').add({
            uid: currentUser.uid,
            clientId: clientId,
            projectId: projectId,
            worktypeId: worktypeId,
            clientName: clientName,
            projectName: projectName,
            worktypeName: worktypeName,
            link: link || '',
            accumulatedElapsedTime: timer.accumulatedElapsedTime,
            lastStartTime: firebase.firestore.Timestamp.fromDate(manualStartTime),
            isPaused: timer.isPaused,
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
            Swal.fire({
                icon: 'error',
                title: 'Errore',
                text: 'Si è verificato un errore durante il salvataggio del timer.',
                confirmButtonText: 'OK'
            });
        });

    } else {
        // === LIVE TIMER: Start now ===
        let hourlyRate = 0;
        try {
            const wtDoc = await db.collection('worktypes').doc(worktypeId).get();
            if (wtDoc.exists) hourlyRate = parseFloat(wtDoc.data().hourlyRate) || 0;
        } catch(e) { /* fallback 0 */ }
        console.log(`[Timer] hourlyRate per ${worktypeName}: ${hourlyRate} €/h`);

        const timer = {
            clientId: clientId,
            projectId: projectId,
            worktypeId: worktypeId,
            clientName: clientName,
            projectName: projectName,
            worktypeName: worktypeName,
            link: link,
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
            clientId: clientId,
            projectId: projectId,
            worktypeId: worktypeId,
            clientName: clientName,
            projectName: projectName,
            worktypeName: worktypeName,
            link: link || '',
            accumulatedElapsedTime: timer.accumulatedElapsedTime,
            lastStartTime: firebase.firestore.FieldValue.serverTimestamp(),
            isPaused: timer.isPaused,
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
            Swal.fire({
                icon: 'error',
                title: 'Errore',
                text: 'Si è verificato un errore durante il salvataggio del timer.',
                confirmButtonText: 'OK'
            });
        });
    }
}

// === OPEN EDIT MODAL ===

export function openEditTimerModal(timer) {
    document.getElementById('edit-timer-id').value = timer.id;

    const clientSelect = document.getElementById('edit-client-select');
    const projectSelect = document.getElementById('edit-project-select');
    const worktypeSelect = document.getElementById('edit-worktype-select');

    loadAllClientsForEditSelect(clientSelect, timer.clientId)
        .then(() => loadAllProjectsForEditSelect(projectSelect, timer.clientId, timer.projectId))
        .then(() => loadAllWorktypesForEditSelect(worktypeSelect, timer.clientId, timer.worktypeId))
        .catch(error => console.error('Errore nel caricamento dati per la modale di modifica:', error));

    clientSelect.addEventListener('change', () => {
        const newClientId = clientSelect.value;
        if (newClientId) {
            loadAllProjectsForEditSelect(projectSelect, newClientId, '')
                .then(() => loadAllWorktypesForEditSelect(worktypeSelect, newClientId, ''))
                .catch(error => console.error("Errore durante l'aggiornamento di progetti e tipi di lavoro:", error));
        } else {
            projectSelect.innerHTML = '<option value="">--Seleziona Progetto--</option>';
            worktypeSelect.innerHTML = '<option value="">--Seleziona Tipo di Lavoro--</option>';
        }
    });

    document.getElementById('edit-link-input').value = timer.link || '';
    document.getElementById('edit-accumulated-time').value = secondsToHHMMSS(timer.accumulatedElapsedTime || 0);

    const startStr = timer.lastStartTime ? formatLocalDateTime(timer.lastStartTime) : '';
    document.getElementById('edit-start-time').value = startStr;

    if (timer.endTime) {
        document.getElementById('edit-end-time').value = formatLocalDateTime(timer.endTime);
    } else {
        document.getElementById('edit-end-time').value = '';
    }

    CrModal.show('edit-timer-modal');
}

// === DELETE TIMER FROM MODAL ===

export function deleteTimerFromModal() {
    const timerId = document.getElementById('edit-timer-id').value;
    if (!timerId) return;

    Swal.fire({
        title: 'Sei sicuro?',
        text: 'Vuoi eliminare questo timer?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sì, elimina',
        cancelButtonText: 'Annulla'
    }).then((result) => {
        if (result.isConfirmed) {
            db.collection('timers').doc(timerId).delete()
                .then(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Eliminato!',
                        text: 'Il timer è stato eliminato con successo.',
                        confirmButtonText: 'OK'
                    });
                    CrModal.hide('edit-timer-modal');

                    const index = activeTimers.findIndex(t => t.id === timerId);
                    if (index > -1) {
                        const timer = activeTimers[index];
                        if (timer.intervalId) clearInterval(timer.intervalId);
                        activeTimers.splice(index, 1);
                    }
                    const oldCard = document.querySelector(`.timer-card[data-timer-id="${timerId}"]`);
                    if (oldCard) {
                        oldCard.parentElement.remove();
                    }
                    updateActiveTimerCount();
                    loadRecentTasks();
                    loadTodaySummary();
                })
                .catch(error => {
                    console.error('Errore durante l\'eliminazione del timer:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Errore',
                        text: 'Si è verificato un errore durante l\'eliminazione del timer.',
                        confirmButtonText: 'OK'
                    });
                });
        }
    });
}

// === SAVE TIMER CHANGES ===

export function saveTimerChanges() {
    const timerId = document.getElementById('edit-timer-id').value;
    const clientId = document.getElementById('edit-client-select').value;
    const projectId = document.getElementById('edit-project-select').value;
    const worktypeId = document.getElementById('edit-worktype-select').value;
    const link = document.getElementById('edit-link-input').value.trim();
    const accumulatedTimeStr = document.getElementById('edit-accumulated-time').value.trim();
    const startTimeStr = document.getElementById('edit-start-time').value.trim();
    const endTimeStr = document.getElementById('edit-end-time').value.trim();

    const accumulatedSeconds = hhmmssToSeconds(accumulatedTimeStr);
    if (isNaN(accumulatedSeconds)) {
        Swal.fire({
            icon: 'error',
            title: 'Errore',
            text: 'Il tempo accumulato inserito non è valido. Usa il formato hh:mm:ss.',
            confirmButtonText: 'OK'
        });
        return;
    }

    const newStartTime = startTimeStr ? parseLocalDateTime(startTimeStr) : null;
    if (startTimeStr && !newStartTime) {
        Swal.fire({
            icon: 'error',
            title: 'Errore',
            text: 'La data/ora di inizio non è valida.',
            confirmButtonText: 'OK'
        });
        return;
    }

    let newEndTime = null;
    if (endTimeStr) {
        newEndTime = parseLocalDateTime(endTimeStr);
        if (!newEndTime) {
            Swal.fire({
                icon: 'error',
                title: 'Errore',
                text: 'La data/ora di fine non è valida.',
                confirmButtonText: 'OK'
            });
            return;
        }
    }

    Promise.all([
        db.collection('clients').doc(clientId).get(),
        db.collection('projects').doc(projectId).get(),
        db.collection('worktypes').doc(worktypeId).get()
    ]).then(results => {
        const clientDoc = results[0];
        const projectDoc = results[1];
        const worktypeDoc = results[2];

        const clientName = clientDoc.exists ? clientDoc.data().name : 'Sconosciuto';
        const projectName = projectDoc.exists ? projectDoc.data().name : 'Sconosciuto';
        let worktypeName = 'Sconosciuto';
        let hourlyRate = 0;
        if (worktypeDoc.exists) {
            worktypeName = worktypeDoc.data().name || 'Sconosciuto';
            hourlyRate = worktypeDoc.data().hourlyRate || 0;
        }

        const updateData = {
            clientId: clientId,
            projectId: projectId,
            worktypeId: worktypeId,
            clientName: clientName,
            projectName: projectName,
            worktypeName: worktypeName,
            link: link,
            accumulatedElapsedTime: accumulatedSeconds,
            hourlyRate: hourlyRate
        };

        if (newStartTime) {
            updateData.lastStartTime = firebase.firestore.Timestamp.fromDate(newStartTime);
        }

        if (newEndTime) {
            if (newStartTime) {
                const totalElapsedTime = (newEndTime - newStartTime) / 1000;
                const timeLogData = {
                    uid: currentUser.uid,
                    clientId: clientId,
                    projectId: projectId,
                    worktypeId: worktypeId,
                    clientName: clientName,
                    projectName: projectName,
                    worktypeName: worktypeName,
                    link: link || '',
                    startTime: firebase.firestore.Timestamp.fromDate(newStartTime),
                    endTime: firebase.firestore.Timestamp.fromDate(newEndTime),
                    duration: totalElapsedTime,
                    isReported: false,
                    isDeleted: false,
                    hourlyRate: hourlyRate
                };

                return db.collection('timeLogs').add(timeLogData)
                    .then(() => {
                        updateData.isActive = false;
                        updateData.endTime = firebase.firestore.Timestamp.fromDate(newEndTime);
                        return db.collection('timers').doc(timerId).update(updateData);
                    })
                    .then(() => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Modifiche Salvate',
                            text: 'Il timer è stato aggiornato con successo e segnato come concluso.',
                            confirmButtonText: 'OK'
                        });
                        CrModal.hide('edit-timer-modal');
                        loadRecentTasks();
                        loadTodaySummary();

                        const timer = activeTimers.find(t => t.id === timerId);
                        if (timer) {
                            const index = activeTimers.indexOf(timer);
                            if (index > -1) {
                                activeTimers.splice(index, 1);
                            }
                            const oldCard = document.querySelector(`.timer-card[data-timer-id="${timer.id}"]`);
                            if (oldCard) {
                                oldCard.remove();
                            }
                        }
                    });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Attenzione',
                    text: 'Per impostare una data/ora di fine devi prima specificare una data/ora di inizio.',
                    confirmButtonText: 'OK'
                });
                return Promise.reject('No start time set');
            }
        } else {
            updateData.endTime = firebase.firestore.FieldValue.delete();

            return db.collection('timers').doc(timerId).update(updateData).then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Modifiche Salvate',
                    text: 'Il timer è stato aggiornato con successo.',
                    confirmButtonText: 'OK'
                });
                CrModal.hide('edit-timer-modal');

                const timer = activeTimers.find(t => t.id === timerId);
                if (timer) {
                    timer.clientId = clientId;
                    timer.projectId = projectId;
                    timer.worktypeId = worktypeId;
                    timer.clientName = clientName;
                    timer.projectName = projectName;
                    timer.worktypeName = worktypeName;
                    timer.link = link;
                    timer.accumulatedElapsedTime = accumulatedSeconds;
                    timer.hourlyRate = parseFloat(hourlyRate);

                    if (!timer.isPaused) {
                        return db.collection('timers').doc(timerId).update({
                            lastStartTime: firebase.firestore.FieldValue.serverTimestamp()
                        }).then(() => {
                            timer.lastStartTime = new Date();

                            const oldCard = document.querySelector(`.timer-card[data-timer-id="${timer.id}"]`);
                            if (oldCard) {
                                oldCard.remove();
                            }

                            const newCard = createTimerCard(timer);
                            document.getElementById('timer-cards').appendChild(newCard);

                            clearInterval(timer.intervalId);
                            startTimer(timer);
                        });
                    } else {
                        const oldCard = document.querySelector(`.timer-card[data-timer-id="${timer.id}"]`);
                        if (oldCard) {
                            oldCard.remove();
                        }

                        const newCard = createTimerCard(timer);
                        document.getElementById('timer-cards').appendChild(newCard);
                    }
                }
            });
        }
    }).catch(error => {
        console.error('Errore nel salvataggio delle modifiche del timer:', error);
        Swal.fire({
            icon: 'error',
            title: 'Errore',
            text: 'Si è verificato un errore durante il salvataggio delle modifiche.',
            confirmButtonText: 'OK'
        });
    });
}



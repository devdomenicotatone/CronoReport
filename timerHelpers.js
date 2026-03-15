// timerHelpers.js — Utilità, dropdown Firestore, formattazione

// === DROPDOWN LOADING ===

function loadTimerClientDropdown(selectElement) {
    selectElement.innerHTML = '<option value="">--Seleziona Cliente--</option>';
    db.collection('clients')
        .where('uid', '==', currentUser.uid)
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                selectElement.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Errore nel caricamento dei clienti nel Timer:', error);
        });
}

function loadSites(selectElement, clientId) {
    selectElement.innerHTML = '<option value="">--Seleziona Sito--</option>';
    return (
    db.collection('sites')
        .where('uid', '==', currentUser.uid)
        .where('clientId', '==', clientId)
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                selectElement.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Errore nel caricamento dei siti nel Timer:', error);
        })
    );
}

function loadWorktypes(selectElement, clientId) {
    selectElement.innerHTML = '<option value="">--Seleziona Tipo di Lavoro--</option>';
    return (
    db.collection('worktypes')
        .where('uid', '==', currentUser.uid)
        .where('clientId', '==', clientId)
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                selectElement.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Errore nel caricamento dei tipi di lavoro nel Timer:', error);
        })
    );
}

// === DATE/TIME PARSING & FORMATTING ===

function parseLocalDateTime(s) {
    const [datePart, timePart] = s.split(' ');
    if (!datePart || !timePart) return null;
    const [day, month, year] = datePart.split('/').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);
    if (
        isNaN(day) || isNaN(month) || isNaN(year) ||
        isNaN(hour) || isNaN(minute) || isNaN(second)
    ) {
        return null;
    }
    return new Date(year, month - 1, day, hour, minute, second);
}

function formatLocalDateTime(date) {
    const dd = String(date.getDate()).padStart(2,'0');
    const mm = String(date.getMonth()+1).padStart(2,'0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2,'0');
    const min = String(date.getMinutes()).padStart(2,'0');
    const ss = String(date.getSeconds()).padStart(2,'0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

// === DURATION FORMATTING ===

function secondsToHHMMSS(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
}

function hhmmssToSeconds(hhmmss) {
    const parts = hhmmss.split(':');
    if (parts.length !== 3) return NaN;
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseInt(parts[2]);
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return NaN;
    return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(seconds) {
    return secondsToHHMMSS(seconds);
}

// === RATE & AMOUNT ===

async function getHourlyRate() {
    try {
        const snapshot = await db.collection('reportConfigs')
            .where('uid', '==', currentUser.uid)
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const config = snapshot.docs[0].data();
            return typeof config.hourlyRate === 'number' ? config.hourlyRate : 0;
        }
        return 0;
    } catch (error) {
        console.error('Errore nel recuperare hourlyRate:', error);
        return 0;
    }
}

function updateLiveAmount(timer, totalElapsedSeconds) {
    if (!timer.liveAmountDisplay) return;
    const hours = totalElapsedSeconds / 3600;
    const amount = hours * (timer.hourlyRate || 0);
    timer.liveAmountDisplay.textContent = `€ ${amount.toFixed(2)}`;
}

// === VITE MODULE: Registra globals ===
window.loadTimerClientDropdown = loadTimerClientDropdown;
window.loadSites = loadSites;
window.loadWorktypes = loadWorktypes;
window.parseLocalDateTime = parseLocalDateTime;
window.formatLocalDateTime = formatLocalDateTime;
window.secondsToHHMMSS = secondsToHHMMSS;
window.hhmmssToSeconds = hhmmssToSeconds;
window.formatDuration = formatDuration;
window.getHourlyRate = getHourlyRate;
window.updateLiveAmount = updateLiveAmount;

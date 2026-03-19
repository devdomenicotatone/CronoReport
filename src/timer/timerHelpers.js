// timerHelpers.js — Utilità, dropdown Firestore, formattazione

// === DROPDOWN LOADING ===

export async function loadTimerClientDropdown(selectElement) {
    selectElement.innerHTML = '<option value="">--Seleziona Cliente--</option>';
    try {
        const snapshot = await db.collection('clients')
            .where('uid', '==', currentUser.uid)
            .orderBy('name')
            .get();
        snapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().name;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Errore nel caricamento dei clienti:', error);
    }
}

export async function loadProjects(selectElement, clientId) {
    selectElement.innerHTML = '<option value="">--Seleziona Progetto--</option>';
    try {
        const snapshot = await db.collection('projects')
            .where('uid', '==', currentUser.uid)
            .where('clientId', '==', clientId)
            .orderBy('name')
            .get();
        if (snapshot.empty) {
            selectElement.disabled = true;
        } else {
            selectElement.disabled = false;
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Errore nel caricamento dei progetti:', error);
    }
}

export async function loadWorktypes(selectElement, clientId) {
    selectElement.innerHTML = '<option value="">--Seleziona Tipo di Lavoro--</option>';
    try {
        const snapshot = await db.collection('worktypes')
            .where('uid', '==', currentUser.uid)
            .where('clientId', '==', clientId)
            .orderBy('name')
            .get();
        if (snapshot.empty) {
            selectElement.disabled = true;
        } else {
            selectElement.disabled = false;
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Errore nel caricamento dei tipi di lavoro:', error);
    }
}

// === DATE/TIME PARSING & FORMATTING ===

export function parseLocalDateTime(s) {
    if (!s) return null;
    // Native datetime-local format: "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"
    if (s.includes('T')) {
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }
    // Legacy Flatpickr format: "DD/MM/YYYY HH:mm:ss"
    const [datePart, timePart] = s.split(' ');
    if (!datePart || !timePart) return null;
    const [day, month, year] = datePart.split('/').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);
    if (
        isNaN(day) || isNaN(month) || isNaN(year) ||
        isNaN(hour) || isNaN(minute)
    ) {
        return null;
    }
    return new Date(year, month - 1, day, hour, minute, second || 0);
}

export function formatLocalDateTime(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth()+1).padStart(2,'0');
    const dd = String(date.getDate()).padStart(2,'0');
    const hh = String(date.getHours()).padStart(2,'0');
    const min = String(date.getMinutes()).padStart(2,'0');
    // datetime-local format: YYYY-MM-DDTHH:mm
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

// === DURATION FORMATTING ===

export function secondsToHHMMSS(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
}

export function hhmmssToSeconds(hhmmss) {
    const parts = hhmmss.split(':');
    if (parts.length !== 3) return NaN;
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseInt(parts[2]);
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return NaN;
    return hours * 3600 + minutes * 60 + seconds;
}

export function formatDuration(seconds) {
    return secondsToHHMMSS(seconds);
}



export function updateLiveAmount(timer, totalElapsedSeconds) {
    if (!timer.liveAmountDisplay) return;
    const hours = totalElapsedSeconds / 3600;
    const amount = hours * (timer.hourlyRate || 0);
    timer.liveAmountDisplay.textContent = `€ ${amount.toFixed(2)}`;
}

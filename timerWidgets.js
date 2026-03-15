// timerWidgets.js — Widget: Attività Recenti, Riepilogo Odierno, Favicon, Badge
import { loadProjects, loadWorktypes } from './timerHelpers.js';

// === FAVICON ===

/**
 * Creates a favicon element with fallback to colored initial.
 * Shows colored initial immediately, then tries loading the real
 * favicon from the domain. Only swaps if load succeeds.
 */
export function createFaviconEl(projectName, projectUrl, sizePx) {
    sizePx = sizePx || 16;
    const name = projectName || '?';
    const initial = name[0].toUpperCase();
    const colors = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#14b8a6','#06b6d4','#3b82f6'];
    const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const color = colors[hash % colors.length];

    // Try to extract domain from projectUrl or projectName
    let domain = '';
    if (projectUrl && /^https?:\/\//i.test(projectUrl)) {
        try { domain = new URL(projectUrl).hostname; } catch(e) {}
    }
    if (!domain) {
        const cleaned = name.replace(/^https?:\/\//i, '').replace(/\/.*/,'').trim();
        if (/\.[a-z]{2,}$/i.test(cleaned)) domain = cleaned;
    }

    const wrapper = document.createElement('span');
    wrapper.className = 'inline-flex items-center justify-center flex-shrink-0';
    wrapper.style.width = sizePx + 'px';
    wrapper.style.height = sizePx + 'px';

    // Always start with colored initial
    const fb = document.createElement('span');
    fb.className = 'inline-flex items-center justify-center rounded text-white font-bold';
    fb.style.cssText = `width:${sizePx}px;height:${sizePx}px;font-size:${Math.round(sizePx*0.55)}px;background:${color};border-radius:3px;`;
    fb.textContent = initial;
    wrapper.appendChild(fb);

    // Try loading real favicon in background — only swap if successful
    if (domain) {
        const img = new Image();
        img.src = `https://${domain}/favicon.ico`;
        img.onload = () => {
            wrapper.innerHTML = '';
            img.style.width = sizePx + 'px';
            img.style.height = sizePx + 'px';
            img.style.borderRadius = '3px';
            img.style.objectFit = 'contain';
            wrapper.appendChild(img);
        };
    }

    return wrapper;
}

// === RECENT TASKS ===

export function loadRecentTasks() {
    db.collection('timeLogs')
        .where('uid', '==', currentUser.uid)
        .orderBy('startTime', 'desc')
        .limit(20)
        .get()
        .then(async snapshot => {
            const seen = new Set();
            const recents = [];
            snapshot.forEach(doc => {
                const d = doc.data();
                const key = `${d.clientId}|${d.projectId}|${d.worktypeId}`;
                if (!seen.has(key) && recents.length < 5) {
                    seen.add(key);
                    recents.push({
                        clientId: d.clientId,
                        projectId: d.projectId,
                        worktypeId: d.worktypeId,
                        clientName: d.clientName || '—',
                        projectName: d.projectName || '—',
                        worktypeName: d.worktypeName || '—',
                        link: d.link || '',
                        projectUrl: d.projectUrl || ''
                    });
                }
            });

            // Fetch project URLs for favicon lookup
            const projectIds = [...new Set(recents.map(r => r.projectId).filter(Boolean))];
            const projectUrlMap = {};
            for (const projectId of projectIds) {
                try {
                    const projectDoc = await db.collection('projects').doc(projectId).get();
                    if (projectDoc.exists) {
                        projectUrlMap[projectId] = projectDoc.data().url || '';
                    }
                } catch (e) { /* ignore */ }
            }

            const section = document.getElementById('timer-recents-section');
            const container = document.getElementById('timer-recents-chips');
            if (!container || !section) return;

            if (recents.length === 0) {
                section.style.display = 'none';
                return;
            }

            section.style.display = '';
            container.innerHTML = '';
            recents.forEach(r => {
                const chip = document.createElement('div');
                chip.className = 'timer-recent-chip';

                const projectUrl = projectUrlMap[r.projectId] || r.projectUrl || '';
                const projectName = r.projectName || '—';

                const favicon = createFaviconEl(projectName, projectUrl, 16);
                favicon.classList.add('timer-recent-initial');
                const labelSpan = document.createElement('span');
                labelSpan.className = 'truncate max-w-[120px]';
                labelSpan.textContent = r.worktypeName;
                chip.appendChild(favicon);
                chip.appendChild(labelSpan);

                chip.title = `${r.clientName} · ${r.projectName} · ${r.worktypeName}`;
                chip.addEventListener('click', async () => {
                    const cs = document.getElementById('client-select');
                    const ss = document.getElementById('project-select');
                    const ws = document.getElementById('worktype-select');

                    cs.value = r.clientId;
                    // Load sites and worktypes, wait for both to finish
                    await Promise.all([
                        loadProjects(ss, r.clientId),
                        loadWorktypes(ws, r.clientId)
                    ]);

                    ss.value = r.projectId;
                    ws.value = r.worktypeId;
                    document.getElementById('link-input').value = r.link;
                });
                container.appendChild(chip);
            });
        })
        .catch(error => {
            console.error('Errore nel caricamento delle attività recenti:', error);
        });
}

// === TODAY SUMMARY ===

export function loadTodaySummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    db.collection('timeLogs')
        .where('uid', '==', currentUser.uid)
        .where('isDeleted', '==', false)
        .where('startTime', '>=', firebase.firestore.Timestamp.fromDate(today))
        .where('startTime', '<', firebase.firestore.Timestamp.fromDate(tomorrow))
        .get()
        .then(snapshot => {
            let totalHours = 0;
            let totalAmount = 0;
            let count = 0;

            snapshot.forEach(doc => {
                const d = doc.data();
                const durationH = (d.duration || 0) / 3600;
                const rate = d.hourlyRate || 0;
                totalHours += durationH;
                totalAmount += durationH * rate;
                count++;
            });

            const totalSec = Math.floor(totalHours * 3600);
            const hh = Math.floor(totalSec / 3600);
            const mm = Math.floor((totalSec % 3600) / 60);

            const hoursEl = document.getElementById('today-stat-hours');
            const amountEl = document.getElementById('today-stat-amount');
            const countEl = document.getElementById('today-stat-count');

            if (hoursEl) hoursEl.textContent = `${hh}h ${mm.toString().padStart(2, '0')}m`;
            if (amountEl) amountEl.textContent = `€ ${totalAmount.toFixed(2)}`;
            if (countEl) countEl.textContent = count;
        })
        .catch(error => {
            console.error('Errore nel caricamento del riepilogo odierno:', error);
        });
}

// === ACTIVE TIMER COUNT ===

export function updateActiveTimerCount(activeTimers) {
    const badge = document.getElementById('active-timer-count');
    if (!badge) return;
    const count = activeTimers.length;
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = '';
    } else {
        badge.style.display = 'none';
    }
}

// === TODAY LOG — Task completati oggi (inline timeline) ===

export function loadTodayLog() {
    const section = document.getElementById('today-log-section');
    const listEl = document.getElementById('today-log-list');
    const countBadge = document.getElementById('today-log-count');
    const totalEl = document.getElementById('today-log-total');
    if (!section || !listEl) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    db.collection('timeLogs')
        .where('uid', '==', currentUser.uid)
        .where('isDeleted', '==', false)
        .where('startTime', '>=', firebase.firestore.Timestamp.fromDate(today))
        .where('startTime', '<', firebase.firestore.Timestamp.fromDate(tomorrow))
        .orderBy('startTime', 'desc')
        .get()
        .then(snapshot => {
            const logs = [];
            let totalDuration = 0;
            let totalAmount = 0;

            snapshot.forEach(doc => {
                const d = doc.data();
                logs.push(d);
                totalDuration += d.duration || 0;
                const rate = d.hourlyRate || 0;
                totalAmount += ((d.duration || 0) / 3600) * rate;
            });

            if (logs.length === 0) {
                section.style.display = 'none';
                return;
            }

            section.style.display = '';
            if (countBadge) countBadge.textContent = logs.length;

            // Total time + amount
            const tH = Math.floor(totalDuration / 3600);
            const tM = Math.floor((totalDuration % 3600) / 60);
            if (totalEl) {
                totalEl.textContent = `${tH}h ${tM.toString().padStart(2, '0')}m · € ${totalAmount.toFixed(2)}`;
            }

            listEl.innerHTML = '';
            logs.forEach(log => {
                const row = document.createElement('div');
                row.className = 'today-log-row';

                // Time range
                const startDate = log.startTime?.toDate?.() || new Date();
                const endDate = log.endTime?.toDate?.() || new Date();
                const startStr = startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                const endStr = endDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

                // Duration
                const dur = log.duration || 0;
                const dH = Math.floor(dur / 3600);
                const dM = Math.floor((dur % 3600) / 60);
                const durStr = dH > 0 ? `${dH}h ${dM.toString().padStart(2, '0')}m` : `${dM}m`;

                // Color dot based on project name hash
                const name = log.projectName || '?';
                const colors = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#14b8a6','#06b6d4','#3b82f6'];
                const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                const color = colors[hash % colors.length];

                row.innerHTML = `
                    <span class="today-log-time">${startStr} – ${endStr}</span>
                    <span class="today-log-dot" style="background:${color}"></span>
                    <span class="today-log-project">${log.projectName || '—'}</span>
                    <span class="today-log-sep">·</span>
                    <span class="today-log-worktype">${log.worktypeName || '—'}</span>
                    <span class="today-log-duration">${durStr}</span>
                `;
                listEl.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Errore nel caricamento del log odierno:', error);
        });
}

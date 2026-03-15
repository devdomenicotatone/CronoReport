// timerWidgets.js — Widget: Attività Recenti, Riepilogo Odierno, Favicon, Badge

// === FAVICON ===

/**
 * Creates a favicon element with fallback to colored initial.
 * Shows colored initial immediately, then tries loading the real
 * favicon from the domain. Only swaps if load succeeds.
 */
function createFaviconEl(siteName, siteUrl, sizePx) {
    sizePx = sizePx || 16;
    const name = siteName || '?';
    const initial = name[0].toUpperCase();
    const colors = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#14b8a6','#06b6d4','#3b82f6'];
    const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const color = colors[hash % colors.length];

    // Try to extract domain from siteUrl or siteName
    let domain = '';
    if (siteUrl && /^https?:\/\//i.test(siteUrl)) {
        try { domain = new URL(siteUrl).hostname; } catch(e) {}
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

function loadRecentTasks() {
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
                const key = `${d.clientId}|${d.siteId}|${d.worktypeId}`;
                if (!seen.has(key) && recents.length < 5) {
                    seen.add(key);
                    recents.push({
                        clientId: d.clientId,
                        siteId: d.siteId,
                        worktypeId: d.worktypeId,
                        clientName: d.clientName || '—',
                        siteName: d.siteName || '—',
                        worktypeName: d.worktypeName || '—',
                        link: d.link || '',
                        siteUrl: d.siteUrl || ''
                    });
                }
            });

            // Fetch site URLs for favicon lookup
            const siteIds = [...new Set(recents.map(r => r.siteId).filter(Boolean))];
            const siteUrlMap = {};
            for (const siteId of siteIds) {
                try {
                    const siteDoc = await db.collection('sites').doc(siteId).get();
                    if (siteDoc.exists) {
                        siteUrlMap[siteId] = siteDoc.data().url || '';
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

                const siteUrl = siteUrlMap[r.siteId] || r.siteUrl || '';
                const siteName = r.siteName || '—';

                const favicon = createFaviconEl(siteName, siteUrl, 16);
                favicon.classList.add('timer-recent-initial');
                const labelSpan = document.createElement('span');
                labelSpan.className = 'truncate max-w-[120px]';
                labelSpan.textContent = r.worktypeName;
                chip.appendChild(favicon);
                chip.appendChild(labelSpan);

                chip.title = `${r.clientName} · ${r.siteName} · ${r.worktypeName}`;
                chip.addEventListener('click', () => {
                    const cs = document.getElementById('client-select');
                    cs.value = r.clientId;
                    cs.dispatchEvent(new Event('change'));
                    setTimeout(() => {
                        const ss = document.getElementById('site-select');
                        const ws = document.getElementById('worktype-select');
                        ss.value = r.siteId;
                        ws.value = r.worktypeId;
                        document.getElementById('link-input').value = r.link;
                    }, 500);
                });
                container.appendChild(chip);
            });
        })
        .catch(error => {
            console.error('Errore nel caricamento delle attività recenti:', error);
        });
}

// === TODAY SUMMARY ===

function loadTodaySummary() {
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

function updateActiveTimerCount() {
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

// === VITE MODULE: Registra globals ===
window.createFaviconEl = createFaviconEl;
window.loadRecentTasks = loadRecentTasks;
window.loadTodaySummary = loadTodaySummary;
window.updateActiveTimerCount = updateActiveTimerCount;

/**
 * import-backup.js — Converte il backup JSON di CronoReport in devData.js
 * 
 * Uso: node scripts/import-backup.js [percorso-backup.json]
 * Default: scripts/cronoreport_backup_2026-03-15.json
 */

const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const backupPath = process.argv[2] || resolve(__dirname, 'cronoreport_backup_2026-03-15.json');
const outputPath = resolve(__dirname, '..', 'devData.js');

console.log(`📦 Leggendo backup da: ${backupPath}`);
const backup = JSON.parse(readFileSync(backupPath, 'utf-8'));
const cols = backup.collections;

// === Helpers ===
function escapeStr(s) {
    if (!s) return "''";
    return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
}

function timestampToCode(ts) {
    if (!ts || !ts.seconds) return 'makeTimestamp(new Date())';
    const d = new Date(ts.seconds * 1000);
    return `makeTimestamp(new Date('${d.toISOString()}'))`;
}

// === Build clients ===
const clientLines = (cols.clients || []).map(c => {
    const d = c.data;
    return `        { id: '${c.id}', data: { uid: MOCK_UID, name: ${escapeStr(d.name)} } }`;
});

// === Build projects ===
const projectLines = (cols.projects || []).map(p => {
    const d = p.data;
    return `        { id: '${p.id}', data: { uid: MOCK_UID, clientId: '${d.clientId || ''}', name: ${escapeStr(d.name)} } }`;
});

// === Build worktypes ===
const worktypeLines = (cols.worktypes || []).map(w => {
    const d = w.data;
    const rate = d.hourlyRate || 0;
    return `        { id: '${w.id}', data: { uid: MOCK_UID, clientId: '${d.clientId || ''}', name: ${escapeStr(d.name)}, hourlyRate: ${rate} } }`;
});

// === Build timeLogs ===
const timeLogLines = (cols.timeLogs || []).map(t => {
    const d = t.data;
    const startTime = timestampToCode(d.startTime);
    const endTime = timestampToCode(d.endTime);
    const duration = d.duration || 0;
    const isReported = d.isReported === true;
    const isDeleted = d.isDeleted === true;
    const hourlyRate = d.hourlyRate || 0;
    const link = d.link || '';
    const note = d.note || '';
    
    let line = `        { id: '${t.id}', data: { uid: MOCK_UID`;
    line += `, clientId: '${d.clientId || ''}'`;
    line += `, clientName: ${escapeStr(d.clientName)}`;
    line += `, projectId: '${d.projectId || ''}'`;
    line += `, projectName: ${escapeStr(d.projectName)}`;
    line += `, worktypeId: '${d.worktypeId || ''}'`;
    line += `, worktypeName: ${escapeStr(d.worktypeName)}`;
    line += `, hourlyRate: ${hourlyRate}`;
    line += `, startTime: ${startTime}`;
    line += `, endTime: ${endTime}`;
    line += `, duration: ${duration}`;
    line += `, isReported: ${isReported}`;
    line += `, isDeleted: ${isDeleted}`;
    if (isDeleted && d.deletedAt) {
        line += `, deletedAt: ${timestampToCode(d.deletedAt)}`;
    }
    line += `, link: ${escapeStr(link)}`;
    line += `, note: ${escapeStr(note)}`;
    line += ` } }`;
    return line;
});

// === Build reports ===
const reportLines = (cols.reports || []).map(r => {
    const d = r.data;
    let line = `        { id: '${r.id}', data: { uid: MOCK_UID`;
    line += `, reportHeader: ${escapeStr(d.reportHeader)}`;
    line += `, startDate: ${escapeStr(d.startDate)}`;
    line += `, endDate: ${escapeStr(d.endDate)}`;
    line += `, filterClient: ${escapeStr(d.filterClient)}`;
    line += `, filterClientName: ${escapeStr(d.filterClientName)}`;
    line += `, filterProject: ${d.filterProject ? escapeStr(d.filterProject) : 'null'}`;
    line += `, filterProjectName: ${escapeStr(d.filterprojectName || d.filterProjectName || '')}`;
    line += `, filterWorktype: ${d.filterWorktype ? escapeStr(d.filterWorktype) : 'null'}`;
    line += `, filterWorktypeName: ${escapeStr(d.filterWorktypeName || '')}`;
    line += `, totalAmount: ${d.totalAmount || 0}`;
    line += `, totalHours: ${d.totalHours || 0}`;
    line += `, timestamp: ${timestampToCode(d.timestamp)}`;
    line += `, reportName: ${escapeStr(d.reportName)}`;
    line += `, reportDataArray: []`; // Skip heavy data arrays
    line += `, includeHourlyRate: ${d.includeHourlyRate === true}`;
    line += `, isDeleted: ${d.isDeleted === true}`;
    line += ` } }`;
    return line;
});

// === Build reportConfigs ===
const configLines = (cols.reportConfigs || []).map(c => {
    const d = c.data;
    return `        { id: '${c.id}', data: { uid: MOCK_UID, name: ${escapeStr(d.name)}, reportHeader: ${escapeStr(d.reportHeader)}, companyLogoBase64: '', filterClient: '${d.filterClient || ''}', filterProject: '${d.filterProject || ''}', filterWorktype: '${d.filterWorktype || ''}' } }`;
});

// =============================================
//  CLIENTI FITTIZI EXTRA (aggregati al backup)
// =============================================

const extraClients = [
    `        { id: 'dev-client-001', data: { uid: MOCK_UID, name: 'Studio Rossi Architetti' } }`,
    `        { id: 'dev-client-002', data: { uid: MOCK_UID, name: 'TechVision SRL' } }`,
    `        { id: 'dev-client-003', data: { uid: MOCK_UID, name: 'Farmacia Centrale' } }`,
];

const extraProjects = [
    `        { id: 'dev-project-001', data: { uid: MOCK_UID, clientId: 'dev-client-001', name: 'www.studiorossi.it' } }`,
    `        { id: 'dev-project-002', data: { uid: MOCK_UID, clientId: 'dev-client-001', name: 'blog.studiorossi.it' } }`,
    `        { id: 'dev-project-003', data: { uid: MOCK_UID, clientId: 'dev-client-002', name: 'app.techvision.com' } }`,
    `        { id: 'dev-project-004', data: { uid: MOCK_UID, clientId: 'dev-client-002', name: 'dashboard.techvision.com' } }`,
    `        { id: 'dev-project-005', data: { uid: MOCK_UID, clientId: 'dev-client-003', name: 'farmaciacentrale.it' } }`,
];

const extraWorktypes = [
    `        { id: 'dev-wt-001', data: { uid: MOCK_UID, clientId: 'dev-client-001', name: 'Sviluppo Web', hourlyRate: 45 } }`,
    `        { id: 'dev-wt-002', data: { uid: MOCK_UID, clientId: 'dev-client-001', name: 'SEO & Marketing', hourlyRate: 35 } }`,
    `        { id: 'dev-wt-003', data: { uid: MOCK_UID, clientId: 'dev-client-002', name: 'Backend API', hourlyRate: 55 } }`,
    `        { id: 'dev-wt-004', data: { uid: MOCK_UID, clientId: 'dev-client-002', name: 'UI/UX Design', hourlyRate: 40 } }`,
    `        { id: 'dev-wt-005', data: { uid: MOCK_UID, clientId: 'dev-client-003', name: 'Manutenzione Progetto', hourlyRate: 30 } }`,
];

// Genera timer per i clienti extra, sparsi negli ultimi 60 giorni
function devTimerLine(id, daysBack, startHour, durationH, clientId, clientName, projectId, projectName, wtId, wtName, rate, isReported, link, note) {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    d.setHours(startHour, 0, 0, 0);
    const startISO = d.toISOString();
    const endD = new Date(d.getTime() + durationH * 3600000);
    const endISO = endD.toISOString();
    const dur = Math.round(durationH * 3600);
    const linkStr = link ? `'${link}'` : "''";
    const noteStr = note ? `'${note.replace(/'/g, "\\'")}'` : "''";
    return `        { id: '${id}', data: { uid: MOCK_UID, clientId: '${clientId}', clientName: '${clientName}', projectId: '${projectId}', projectName: '${projectName}', worktypeId: '${wtId}', worktypeName: '${wtName}', hourlyRate: ${rate}, startTime: makeTimestamp(new Date('${startISO}')), endTime: makeTimestamp(new Date('${endISO}')), duration: ${dur}, isReported: ${isReported}, isDeleted: false, link: ${linkStr}, note: ${noteStr} } }`;
}

const extraTimeLogs = [
    // Studio Rossi — Sviluppo Web
    devTimerLine('dev-timer-001', 0, 9, 3, 'dev-client-001', 'Studio Rossi Architetti', 'dev-project-001', 'www.studiorossi.it', 'dev-wt-001', 'Sviluppo Web', 45, false, 'https://github.com/studiorossi/website/pull/42', 'Refactoring header responsive + fix menu mobile'),
    devTimerLine('dev-timer-002', 1, 10, 4, 'dev-client-001', 'Studio Rossi Architetti', 'dev-project-001', 'www.studiorossi.it', 'dev-wt-001', 'Sviluppo Web', 45, false, 'https://github.com/studiorossi/website/issues/38', 'Bug fix: form contatti non invia email su Safari iOS'),
    devTimerLine('dev-timer-003', 2, 9, 6, 'dev-client-001', 'Studio Rossi Architetti', 'dev-project-001', 'www.studiorossi.it', 'dev-wt-001', 'Sviluppo Web', 45, false, '', 'Implementazione dark mode + toggle con localStorage'),
    devTimerLine('dev-timer-004', 4, 14, 2.5, 'dev-client-001', 'Studio Rossi Architetti', 'dev-project-001', 'www.studiorossi.it', 'dev-wt-001', 'Sviluppo Web', 45, true, '', 'Performance audit Lighthouse — score da 62 a 94'),
    devTimerLine('dev-timer-005', 8, 9, 5, 'dev-client-001', 'Studio Rossi Architetti', 'dev-project-001', 'www.studiorossi.it', 'dev-wt-001', 'Sviluppo Web', 45, true, 'https://github.com/studiorossi/website/milestone/3', 'Sprint review: chiuse 12 issue su 15'),
    devTimerLine('dev-timer-006', 13, 9, 5, 'dev-client-001', 'Studio Rossi Architetti', 'dev-project-001', 'www.studiorossi.it', 'dev-wt-001', 'Sviluppo Web', 45, true, '', 'Integrazione Google Maps API per pagina contatti'),
    // Studio Rossi — SEO & Marketing
    devTimerLine('dev-timer-007', 1, 14, 1.5, 'dev-client-001', 'Studio Rossi Architetti', 'dev-project-002', 'blog.studiorossi.it', 'dev-wt-002', 'SEO & Marketing', 35, false, 'https://docs.google.com/spreadsheets/d/abc123/edit', 'Analisi keyword competitor + piano editoriale Q2'),
    devTimerLine('dev-timer-008', 6, 11, 2, 'dev-client-001', 'Studio Rossi Architetti', 'dev-project-002', 'blog.studiorossi.it', 'dev-wt-002', 'SEO & Marketing', 35, false, '', 'Ottimizzazione meta description per 15 articoli'),
    devTimerLine('dev-timer-009', 10, 10, 2.5, 'dev-client-001', 'Studio Rossi Architetti', 'dev-project-002', 'blog.studiorossi.it', 'dev-wt-002', 'SEO & Marketing', 35, false, 'https://search.google.com/search-console', 'Analisi Search Console: +23% click organici vs mese precedente'),
    devTimerLine('dev-timer-010', 22, 9, 3, 'dev-client-001', 'Studio Rossi Architetti', 'dev-project-002', 'blog.studiorossi.it', 'dev-wt-002', 'SEO & Marketing', 35, true, 'https://analytics.google.com', 'Report mensile analytics — presentazione via Zoom'),
    devTimerLine('dev-timer-011', 42, 10, 2, 'dev-client-001', 'Studio Rossi Architetti', 'dev-project-002', 'blog.studiorossi.it', 'dev-wt-002', 'SEO & Marketing', 35, true, 'https://ahrefs.com/site-explorer', 'Backlink audit: rimossi 23 link tossici via Disavow Tool'),
    // TechVision — Backend API
    devTimerLine('dev-timer-012', 0, 14, 2, 'dev-client-002', 'TechVision SRL', 'dev-project-003', 'app.techvision.com', 'dev-wt-003', 'Backend API', 55, false, '', 'Implementazione endpoint /api/v2/users con paginazione'),
    devTimerLine('dev-timer-013', 3, 9, 5, 'dev-client-002', 'TechVision SRL', 'dev-project-003', 'app.techvision.com', 'dev-wt-003', 'Backend API', 55, false, 'https://trello.com/c/abc123/deploy-api-v2', 'Deploy staging + test di carico con k6 — 500 req/s OK'),
    devTimerLine('dev-timer-014', 6, 14, 4, 'dev-client-002', 'TechVision SRL', 'dev-project-003', 'app.techvision.com', 'dev-wt-003', 'Backend API', 55, false, 'https://github.com/techvision/api/pull/87', 'Migrazione da REST a GraphQL — schema utenti completato'),
    devTimerLine('dev-timer-015', 9, 9, 4.5, 'dev-client-002', 'TechVision SRL', 'dev-project-003', 'app.techvision.com', 'dev-wt-003', 'Backend API', 55, true, '', 'Setup CI/CD pipeline su GitHub Actions'),
    devTimerLine('dev-timer-016', 14, 10, 3.5, 'dev-client-002', 'TechVision SRL', 'dev-project-003', 'app.techvision.com', 'dev-wt-003', 'Backend API', 55, true, 'https://github.com/techvision/api/releases/tag/v2.1.0', 'Release v2.1.0 — 3 nuovi endpoint + fix rate limiter'),
    devTimerLine('dev-timer-017', 18, 10, 5, 'dev-client-002', 'TechVision SRL', 'dev-project-003', 'app.techvision.com', 'dev-wt-003', 'Backend API', 55, true, 'https://notion.so/techvision/API-Docs-v2', 'Documentazione API con Swagger — 45 endpoint documentati'),
    devTimerLine('dev-timer-018', 38, 10, 6, 'dev-client-002', 'TechVision SRL', 'dev-project-003', 'app.techvision.com', 'dev-wt-003', 'Backend API', 55, true, '', 'Ottimizzazione query SQL — tempo risposta da 2.3s a 0.18s'),
    devTimerLine('dev-timer-019', 55, 10, 3, 'dev-client-002', 'TechVision SRL', 'dev-project-003', 'app.techvision.com', 'dev-wt-003', 'Backend API', 55, true, 'https://sentry.io/techvision/api/', 'Setup Sentry error tracking + integrazione Slack alert'),
    // TechVision — UI/UX Design
    devTimerLine('dev-timer-020', 1, 14, 3.5, 'dev-client-002', 'TechVision SRL', 'dev-project-004', 'dashboard.techvision.com', 'dev-wt-004', 'UI/UX Design', 40, false, 'https://www.figma.com/file/xyz789/Dashboard-v3', 'Wireframe nuova dashboard analytics'),
    devTimerLine('dev-timer-021', 5, 9, 3, 'dev-client-002', 'TechVision SRL', 'dev-project-004', 'dashboard.techvision.com', 'dev-wt-004', 'UI/UX Design', 40, true, 'https://www.figma.com/file/xyz789/Dashboard-v3', 'Revisione mockup con PM — approvati 3 flussi principali'),
    devTimerLine('dev-timer-022', 11, 14, 3, 'dev-client-002', 'TechVision SRL', 'dev-project-004', 'dashboard.techvision.com', 'dev-wt-004', 'UI/UX Design', 40, false, '', 'Prototipo interattivo per il demo al board'),
    devTimerLine('dev-timer-023', 24, 10, 4, 'dev-client-002', 'TechVision SRL', 'dev-project-004', 'dashboard.techvision.com', 'dev-wt-004', 'UI/UX Design', 40, true, 'https://www.figma.com/file/def456/Design-System', 'Design system: 32 componenti, 8 colori, 4 tipografie'),
    devTimerLine('dev-timer-024', 45, 14, 3.5, 'dev-client-002', 'TechVision SRL', 'dev-project-004', 'dashboard.techvision.com', 'dev-wt-004', 'UI/UX Design', 40, true, '', 'User testing con 5 utenti — NPS score 78'),
    // Farmacia Centrale — Manutenzione
    devTimerLine('dev-timer-025', 2, 15, 1, 'dev-client-003', 'Farmacia Centrale', 'dev-project-005', 'farmaciacentrale.it', 'dev-wt-005', 'Manutenzione Progetto', 30, false, '', 'Aggiornamento plugin WooCommerce + backup DB'),
    devTimerLine('dev-timer-026', 4, 14, 2, 'dev-client-003', 'Farmacia Centrale', 'dev-project-005', 'farmaciacentrale.it', 'dev-wt-005', 'Manutenzione Progetto', 30, false, 'https://farmaciacentrale.it/wp-admin', 'Call con il cliente per nuove funzionalità catalogo'),
    devTimerLine('dev-timer-027', 7, 10, 1.5, 'dev-client-003', 'Farmacia Centrale', 'dev-project-005', 'farmaciacentrale.it', 'dev-wt-005', 'Manutenzione Progetto', 30, true, '', 'Backup completo + test restore su staging'),
    devTimerLine('dev-timer-028', 12, 9, 3, 'dev-client-003', 'Farmacia Centrale', 'dev-project-005', 'farmaciacentrale.it', 'dev-wt-005', 'Manutenzione Progetto', 30, true, 'https://farmaciacentrale.it', 'Migrazione hosting da Aruba a SiteGround — zero downtime'),
    devTimerLine('dev-timer-029', 20, 14, 2, 'dev-client-003', 'Farmacia Centrale', 'dev-project-005', 'farmaciacentrale.it', 'dev-wt-005', 'Manutenzione Progetto', 30, true, '', 'Configurazione CDN Cloudflare + ottimizzazione immagini'),
    devTimerLine('dev-timer-030', 28, 14, 1.5, 'dev-client-003', 'Farmacia Centrale', 'dev-project-005', 'farmaciacentrale.it', 'dev-wt-005', 'Manutenzione Progetto', 30, true, 'https://farmaciacentrale.it/sitemap.xml', 'Fix sitemap XML rotta + reinvio a Google'),
    devTimerLine('dev-timer-031', 40, 9, 2, 'dev-client-003', 'Farmacia Centrale', 'dev-project-005', 'farmaciacentrale.it', 'dev-wt-005', 'Manutenzione Progetto', 30, true, '', 'Aggiornamento PHP 8.1 → 8.3 + fix compatibilità'),
    devTimerLine('dev-timer-032', 58, 14, 1.5, 'dev-client-003', 'Farmacia Centrale', 'dev-project-005', 'farmaciacentrale.it', 'dev-wt-005', 'Manutenzione Progetto', 30, true, '', 'Rinnovo certificato SSL + redirect HTTP → HTTPS'),
    // Timer eliminato (per test cestino)
    `        { id: 'dev-timer-del-001', data: { uid: MOCK_UID, clientId: 'dev-client-001', clientName: 'Studio Rossi Architetti', projectId: 'dev-project-001', projectName: 'www.studiorossi.it', worktypeId: 'dev-wt-001', worktypeName: 'Sviluppo Web', hourlyRate: 45, startTime: makeTimestamp(new Date('${new Date(Date.now() - 10*86400000).toISOString()}')), endTime: makeTimestamp(new Date('${new Date(Date.now() - 10*86400000 + 9000000).toISOString()}')), duration: 9000, isReported: false, isDeleted: true, deletedAt: makeTimestamp(new Date('${new Date(Date.now() - 8*86400000).toISOString()}')), link: 'https://github.com/studiorossi/website/issues/25', note: 'Tentativo fix che ha rotto la build — timer da eliminare' } }`,
];

// Append extra data to backup arrays
clientLines.push(...extraClients);
projectLines.push(...extraProjects);
worktypeLines.push(...extraWorktypes);
timeLogLines.push(...extraTimeLogs);

console.log('➕ Aggiunti 3 clienti extra con 33 timer fittizi');

// === Assemble final file ===
const stats = {
    clients: clientLines.length,
    projects: projectLines.length,
    worktypes: worktypeLines.length,
    timeLogs: timeLogLines.length,
    reports: reportLines.length,
    reportConfigs: configLines.length
};

console.log('📊 Statistiche totali:');
Object.entries(stats).forEach(([k, v]) => console.log(`   ${k}: ${v}`));

const output = `/**
 * devData.js — Mock Firestore per DEV MODE
 * 
 * Auto-generato da: ${backupPath.split(/[\\/]/).pop()}
 * Data import: ${new Date().toISOString()}
 * 
 * Sovrascrive \`db\` con un mock in-memory che fornisce dati fittizi
 * per testare l'intera app senza connessione a Firebase.
 */

(function () {
    'use strict';

    if (typeof DEV_MODE === 'undefined' || !DEV_MODE) return;

    console.log('%c📦 Mock Firestore caricato — dati con persistenza localStorage', 'color: #f59e0b; font-weight: bold;');

    // =============================================
    //  AUTO-CLEAR: pulisce localStorage se i dati sono cambiati
    // =============================================
    const DATA_VERSION = '${new Date().toISOString()}';
    const STORAGE_PREFIX = 'cr_dev_';

    const storedVersion = localStorage.getItem(STORAGE_PREFIX + '_version');
    if (storedVersion !== DATA_VERSION) {
        console.log('%c🧹 Dati aggiornati — pulizia cache localStorage', 'color: #ef4444; font-weight: bold;');
        Object.keys(localStorage)
            .filter(k => k.startsWith(STORAGE_PREFIX))
            .forEach(k => localStorage.removeItem(k));
        localStorage.setItem(STORAGE_PREFIX + '_version', DATA_VERSION);
    }

    function saveCollection(name) {
        try {
            const items = collections[name] || [];
            const serializable = items.map(item => ({
                id: item.id,
                data: serializeData(item.data)
            }));
            localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(serializable));
        } catch (e) {
            console.warn('[Mock] Errore salvataggio localStorage:', e);
        }
    }

    function loadCollection(name) {
        try {
            const raw = localStorage.getItem(STORAGE_PREFIX + name);
            if (raw) {
                const parsed = JSON.parse(raw);
                return parsed.map(item => ({
                    id: item.id,
                    data: deserializeData(item.data)
                }));
            }
        } catch (e) {
            console.warn('[Mock] Errore lettura localStorage:', e);
        }
        return null;
    }

    function serializeData(data) {
        const out = {};
        for (const key in data) {
            const val = data[key];
            if (val && typeof val === 'object' && typeof val.toDate === 'function') {
                out[key] = { __ts: true, ms: val.toDate().getTime() };
            } else {
                out[key] = val;
            }
        }
        return out;
    }

    function deserializeData(data) {
        const out = {};
        for (const key in data) {
            const val = data[key];
            if (val && typeof val === 'object' && val.__ts) {
                out[key] = makeTimestamp(new Date(val.ms));
            } else {
                out[key] = val;
            }
        }
        return out;
    }

    // =============================================
    //  DATI DA BACKUP REALE
    // =============================================

    const MOCK_UID = 'dev-user-001';

    function makeTimestamp(date) {
        return {
            toDate: () => date,
            seconds: Math.floor(date.getTime() / 1000),
            nanoseconds: 0
        };
    }

    const mockClients = [
${clientLines.join(',\n')}
    ];

    const mockProjects = [
${projectLines.join(',\n')}
    ];

    const mockWorktypes = [
${worktypeLines.join(',\n')}
    ];

    const mockTimeLogs = [
${timeLogLines.join(',\n')}
    ];

    const mockActiveTimers = [];

    const mockReportConfigs = [
${configLines.join(',\n')}
    ];

    const mockReports = [
${reportLines.join(',\n')}
    ];

    // =============================================
    //  MOCK COLLECTIONS MAP (con localStorage fallback)
    // =============================================
    const collections = {
        clients: loadCollection('clients') || mockClients,
        projects: loadCollection('projects') || mockProjects,
        worktypes: loadCollection('worktypes') || mockWorktypes,
        timeLogs: loadCollection('timeLogs') || mockTimeLogs,
        activeTimers: loadCollection('activeTimers') || mockActiveTimers,
        timers: loadCollection('timers') || [],
        reportConfigs: loadCollection('reportConfigs') || mockReportConfigs,
        reports: loadCollection('reports') || mockReports,
    };

    // Salva i dati iniziali se non esistono in localStorage
    Object.keys(collections).forEach(name => {
        if (!localStorage.getItem(STORAGE_PREFIX + name)) {
            saveCollection(name);
        }
    });

    // =============================================
    //  MOCK QUERY BUILDER
    // =============================================

    function MockDoc(id, data, collectionName) {
        this.id = id;
        this._data = JSON.parse(JSON.stringify(data));
        if (collectionName) {
            this.ref = new MockDocRef(collectionName, id);
        }
        Object.keys(this._data).forEach(key => {
            const val = this._data[key];
            if (val && typeof val === 'object' && val.seconds !== undefined) {
                this._data[key] = makeTimestamp(new Date(val.seconds * 1000));
            }
        });
    }
    MockDoc.prototype.data = function () { return this._data; };
    MockDoc.prototype.exists = true;

    function MockSnapshot(docs) {
        this.docs = docs;
        this.empty = docs.length === 0;
        this.size = docs.length;
    }
    MockSnapshot.prototype.forEach = function (fn) {
        this.docs.forEach(fn);
    };

    function MockQuery(collectionName, items) {
        this._collection = collectionName;
        this._items = items.slice();
        this._filters = [];
        this._orderField = null;
        this._orderDir = 'asc';
        this._limitN = null;
    }

    MockQuery.prototype.where = function (field, op, value) {
        const q = new MockQuery(this._collection, this._items);
        q._filters = [...this._filters, { field, op, value }];
        q._orderField = this._orderField;
        q._orderDir = this._orderDir;
        q._limitN = this._limitN;
        return q;
    };

    MockQuery.prototype.orderBy = function (field, dir) {
        const q = new MockQuery(this._collection, this._items);
        q._filters = [...this._filters];
        q._orderField = field;
        q._orderDir = dir || 'asc';
        q._limitN = this._limitN;
        return q;
    };

    MockQuery.prototype.limit = function (n) {
        const q = new MockQuery(this._collection, this._items);
        q._filters = [...this._filters];
        q._orderField = this._orderField;
        q._orderDir = this._orderDir;
        q._limitN = n;
        return q;
    };

    MockQuery.prototype.get = function () {
        let results = this._items.slice();

        this._filters.forEach(f => {
            results = results.filter(item => {
                let val = item.data[f.field];
                if (val && typeof val === 'object' && val.seconds !== undefined) {
                    val = val;
                }
                let compValue = f.value;
                if (compValue && typeof compValue === 'object' && compValue.seconds !== undefined) {
                    const valSec = val && val.seconds ? val.seconds : 0;
                    switch (f.op) {
                        case '==': return valSec === compValue.seconds;
                        case '>=': return valSec >= compValue.seconds;
                        case '<=': return valSec <= compValue.seconds;
                        case '>': return valSec > compValue.seconds;
                        case '<': return valSec < compValue.seconds;
                        default: return true;
                    }
                }
                switch (f.op) {
                    case '==': return val === compValue;
                    case '!=': return val !== compValue;
                    case '>=': return val >= compValue;
                    case '<=': return val <= compValue;
                    case '>': return val > compValue;
                    case '<': return val < compValue;
                    case 'in': return Array.isArray(compValue) && compValue.includes(val);
                    case 'array-contains': return Array.isArray(val) && val.includes(compValue);
                    default: return true;
                }
            });
        });

        if (this._orderField) {
            const field = this._orderField;
            const dir = this._orderDir;
            results.sort((a, b) => {
                let va = a.data[field];
                let vb = b.data[field];
                if (va && va.seconds) va = va.seconds;
                if (vb && vb.seconds) vb = vb.seconds;
                if (va < vb) return dir === 'asc' ? -1 : 1;
                if (va > vb) return dir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        if (this._limitN) {
            results = results.slice(0, this._limitN);
        }

        const docs = results.map(item => new MockDoc(item.id, item.data, this._collection));
        return Promise.resolve(new MockSnapshot(docs));
    };

    MockQuery.prototype.onSnapshot = function (callback) {
        this.get().then(snapshot => callback(snapshot));
        return () => { };
    };

    // =============================================
    //  MOCK COLLECTION REFERENCE
    // =============================================

    function MockCollectionRef(name) {
        this._name = name;
        this._items = collections[name] || [];
    }

    MockCollectionRef.prototype.where = function (field, op, value) {
        return new MockQuery(this._name, this._items).where(field, op, value);
    };
    MockCollectionRef.prototype.orderBy = function (field, dir) {
        return new MockQuery(this._name, this._items).orderBy(field, dir);
    };
    MockCollectionRef.prototype.limit = function (n) {
        return new MockQuery(this._name, this._items).limit(n);
    };
    MockCollectionRef.prototype.get = function () {
        return new MockQuery(this._name, this._items).get();
    };
    MockCollectionRef.prototype.onSnapshot = function (callback) {
        return new MockQuery(this._name, this._items).onSnapshot(callback);
    };

    MockCollectionRef.prototype.doc = function (docId) {
        return new MockDocRef(this._name, docId);
    };

    MockCollectionRef.prototype.add = function (data) {
        const newId = this._name + '-' + Date.now();
        const newItem = { id: newId, data: { ...data } };
        this._items.push(newItem);
        saveCollection(this._name);
        console.log(\`[Mock] Added to \${this._name}:\`, newId);
        return Promise.resolve(new MockDoc(newId, data));
    };

    // =============================================
    //  MOCK DOCUMENT REFERENCE
    // =============================================

    function MockDocRef(collectionName, docId) {
        this._collection = collectionName;
        this._id = docId;
        this._items = collections[collectionName] || [];
    }

    MockDocRef.prototype.get = function () {
        const item = this._items.find(i => i.id === this._id);
        if (item) {
            const doc = new MockDoc(item.id, item.data);
            doc.exists = true;
            return Promise.resolve(doc);
        }
        const emptyDoc = { exists: false, id: this._id, data: () => null };
        return Promise.resolve(emptyDoc);
    };

    MockDocRef.prototype.set = function (data, options) {
        const idx = this._items.findIndex(i => i.id === this._id);
        if (idx >= 0) {
            if (options && options.merge) {
                Object.assign(this._items[idx].data, data);
            } else {
                this._items[idx].data = { ...data };
            }
        } else {
            this._items.push({ id: this._id, data: { ...data } });
        }
        console.log(\`[Mock] Set \${this._collection}/\${this._id}\`);
        saveCollection(this._collection);
        return Promise.resolve();
    };

    MockDocRef.prototype.update = function (data) {
        const idx = this._items.findIndex(i => i.id === this._id);
        if (idx >= 0) {
            Object.assign(this._items[idx].data, data);
        }
        console.log(\`[Mock] Updated \${this._collection}/\${this._id}\`);
        saveCollection(this._collection);
        return Promise.resolve();
    };

    MockDocRef.prototype.delete = function () {
        const idx = this._items.findIndex(i => i.id === this._id);
        if (idx >= 0) {
            this._items.splice(idx, 1);
        }
        console.log(\`[Mock] Deleted \${this._collection}/\${this._id}\`);
        saveCollection(this._collection);
        return Promise.resolve();
    };

    // =============================================
    //  MOCK BATCH
    // =============================================

    function MockBatch() {
        this._ops = [];
    }
    MockBatch.prototype.set = function (ref, data, options) {
        this._ops.push(() => ref.set(data, options));
    };
    MockBatch.prototype.update = function (ref, data) {
        this._ops.push(() => ref.update(data));
    };
    MockBatch.prototype.delete = function (ref) {
        this._ops.push(() => ref.delete());
    };
    MockBatch.prototype.commit = function () {
        this._ops.forEach(op => op());
        console.log(\`[Mock] Batch committed (\${this._ops.length} operations)\`);
        return Promise.resolve();
    };

    // =============================================
    //  OVERRIDE GLOBALE DI \`db\`
    // =============================================

    window._realDb = window.db;

    window.db = {
        collection: function (name) {
            return new MockCollectionRef(name);
        },
        batch: function () {
            return new MockBatch();
        }
    };

    // Mock firebase.firestore.FieldValue
    if (!firebase.firestore.FieldValue) {
        firebase.firestore.FieldValue = {};
    }
    firebase.firestore.FieldValue.serverTimestamp = function () {
        return makeTimestamp(new Date());
    };
    firebase.firestore.FieldValue.delete = function () {
        return '__DELETE__';
    };

    // Mock firebase.firestore.Timestamp
    if (!firebase.firestore.Timestamp) {
        firebase.firestore.Timestamp = {};
    }
    firebase.firestore.Timestamp.fromDate = function (date) {
        return makeTimestamp(date);
    };

    console.log('%c📦 Collections disponibili: ' + Object.keys(collections).join(', '), 'color: #f59e0b;');

})();
`;

writeFileSync(outputPath, output, 'utf-8');
console.log(`\n✅ Scritto: ${outputPath}`);
console.log(`   Dimensione: ${(output.length / 1024).toFixed(1)} KB`);

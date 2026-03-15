/**
 * devData.js — Mock Firestore per DEV MODE
 * 
 * Sovrascrive `db` con un mock in-memory che fornisce dati fittizi
 * per testare l'intera app senza connessione a Firebase.
 */

(function () {
    'use strict';

    if (typeof DEV_MODE === 'undefined' || !DEV_MODE) return;

    console.log('%c📦 Mock Firestore caricato — dati con persistenza localStorage', 'color: #f59e0b; font-weight: bold;');

    // =============================================
    //  STORAGE PERSISTENCE HELPERS
    // =============================================
    const STORAGE_PREFIX = 'cr_dev_';

    function saveCollection(name) {
        try {
            const items = collections[name] || [];
            // Serialize timestamps to plain objects
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
    //  DATI FITTIZI
    // =============================================

    const MOCK_UID = 'dev-user-001';

    const mockClients = [
        { id: 'client-001', data: { uid: MOCK_UID, name: 'Studio Rossi Architetti' } },
        { id: 'client-002', data: { uid: MOCK_UID, name: 'TechVision SRL' } },
        { id: 'client-003', data: { uid: MOCK_UID, name: 'Farmacia Centrale' } },
    ];

    const mockSites = [
        { id: 'site-001', data: { uid: MOCK_UID, clientId: 'client-001', name: 'www.studiorossi.it', url: 'https://www.studiorossi.it' } },
        { id: 'site-002', data: { uid: MOCK_UID, clientId: 'client-001', name: 'blog.studiorossi.it', url: 'https://blog.studiorossi.it' } },
        { id: 'site-003', data: { uid: MOCK_UID, clientId: 'client-002', name: 'app.techvision.com', url: 'https://app.techvision.com' } },
        { id: 'site-004', data: { uid: MOCK_UID, clientId: 'client-002', name: 'dashboard.techvision.com', url: 'https://dashboard.techvision.com' } },
        { id: 'site-005', data: { uid: MOCK_UID, clientId: 'client-003', name: 'farmaciacentrale.it', url: 'https://farmaciacentrale.it' } },
    ];

    const mockWorktypes = [
        { id: 'wt-001', data: { uid: MOCK_UID, clientId: 'client-001', name: 'Sviluppo Web', hourlyRate: 45 } },
        { id: 'wt-002', data: { uid: MOCK_UID, clientId: 'client-001', name: 'SEO & Marketing', hourlyRate: 35 } },
        { id: 'wt-003', data: { uid: MOCK_UID, clientId: 'client-002', name: 'Backend API', hourlyRate: 55 } },
        { id: 'wt-004', data: { uid: MOCK_UID, clientId: 'client-002', name: 'UI/UX Design', hourlyRate: 40 } },
        { id: 'wt-005', data: { uid: MOCK_UID, clientId: 'client-003', name: 'Manutenzione Sito', hourlyRate: 30 } },
    ];

    // Helper per creare date
    function daysAgo(n) {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return d;
    }
    function makeTimestamp(date) {
        return {
            toDate: () => date,
            seconds: Math.floor(date.getTime() / 1000),
            nanoseconds: 0
        };
    }

    // Helper per creare timer a un'ora specifica di N giorni fa
    function timerAt(daysBack, startHour, durationHours) {
        const d = daysAgo(daysBack);
        d.setHours(startHour, 0, 0, 0);
        const end = new Date(d.getTime() + durationHours * 3600000);
        return {
            startTime: makeTimestamp(d),
            endTime: makeTimestamp(end),
            duration: Math.round(durationHours * 3600)
        };
    }

    const mockTimeLogs = [
        // === OGGI (0 giorni fa) ===
        { id: 'timer-001', data: { uid: MOCK_UID, clientId: 'client-001', clientName: 'Studio Rossi Architetti', siteId: 'site-001', siteName: 'www.studiorossi.it', worktypeId: 'wt-001', worktypeName: 'Sviluppo Web', hourlyRate: 45, ...timerAt(0, 9, 3), isReported: false, isDeleted: false, link: 'https://studiorossi.it/homepage-v2' }},
        { id: 'timer-002', data: { uid: MOCK_UID, clientId: 'client-002', clientName: 'TechVision SRL', siteId: 'site-003', siteName: 'app.techvision.com', worktypeId: 'wt-003', worktypeName: 'Backend API', hourlyRate: 55, ...timerAt(0, 14, 2), isReported: false, isDeleted: false, link: '' }},
        // === IERI (1) ===
        { id: 'timer-003', data: { uid: MOCK_UID, clientId: 'client-001', clientName: 'Studio Rossi Architetti', siteId: 'site-002', siteName: 'blog.studiorossi.it', worktypeId: 'wt-002', worktypeName: 'SEO & Marketing', hourlyRate: 35, ...timerAt(1, 10, 1.5), isReported: false, isDeleted: false, link: '' }},
        { id: 'timer-004', data: { uid: MOCK_UID, clientId: 'client-002', clientName: 'TechVision SRL', siteId: 'site-004', siteName: 'dashboard.techvision.com', worktypeId: 'wt-004', worktypeName: 'UI/UX Design', hourlyRate: 40, ...timerAt(1, 14, 3.5), isReported: false, isDeleted: false, link: '' }},
        // === 2 giorni fa ===
        { id: 'timer-005', data: { uid: MOCK_UID, clientId: 'client-001', clientName: 'Studio Rossi Architetti', siteId: 'site-001', siteName: 'www.studiorossi.it', worktypeId: 'wt-001', worktypeName: 'Sviluppo Web', hourlyRate: 45, ...timerAt(2, 9, 4), isReported: false, isDeleted: false, link: 'https://studiorossi.it/nuova-pagina' }},
        { id: 'timer-006', data: { uid: MOCK_UID, clientId: 'client-003', clientName: 'Farmacia Centrale', siteId: 'site-005', siteName: 'farmaciacentrale.it', worktypeId: 'wt-005', worktypeName: 'Manutenzione Sito', hourlyRate: 30, ...timerAt(2, 15, 1), isReported: false, isDeleted: false, link: '' }},
        // === 3 giorni fa ===
        { id: 'timer-007', data: { uid: MOCK_UID, clientId: 'client-002', clientName: 'TechVision SRL', siteId: 'site-003', siteName: 'app.techvision.com', worktypeId: 'wt-003', worktypeName: 'Backend API', hourlyRate: 55, ...timerAt(3, 9, 5), isReported: true, isDeleted: false, link: 'https://app.techvision.com/api/v2' }},
        // === 4 giorni fa ===
        { id: 'timer-008', data: { uid: MOCK_UID, clientId: 'client-001', clientName: 'Studio Rossi Architetti', siteId: 'site-001', siteName: 'www.studiorossi.it', worktypeId: 'wt-001', worktypeName: 'Sviluppo Web', hourlyRate: 45, ...timerAt(4, 10, 2.5), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-009', data: { uid: MOCK_UID, clientId: 'client-003', clientName: 'Farmacia Centrale', siteId: 'site-005', siteName: 'farmaciacentrale.it', worktypeId: 'wt-005', worktypeName: 'Manutenzione Sito', hourlyRate: 30, ...timerAt(4, 14, 2), isReported: false, isDeleted: false, link: 'https://farmaciacentrale.it' }},
        // === 5 giorni fa ===
        { id: 'timer-010', data: { uid: MOCK_UID, clientId: 'client-002', clientName: 'TechVision SRL', siteId: 'site-004', siteName: 'dashboard.techvision.com', worktypeId: 'wt-004', worktypeName: 'UI/UX Design', hourlyRate: 40, ...timerAt(5, 9, 3), isReported: true, isDeleted: false, link: '' }},
        // === 6 giorni fa ===
        { id: 'timer-011', data: { uid: MOCK_UID, clientId: 'client-001', clientName: 'Studio Rossi Architetti', siteId: 'site-002', siteName: 'blog.studiorossi.it', worktypeId: 'wt-002', worktypeName: 'SEO & Marketing', hourlyRate: 35, ...timerAt(6, 11, 2), isReported: false, isDeleted: false, link: '' }},
        { id: 'timer-012', data: { uid: MOCK_UID, clientId: 'client-002', clientName: 'TechVision SRL', siteId: 'site-003', siteName: 'app.techvision.com', worktypeId: 'wt-003', worktypeName: 'Backend API', hourlyRate: 55, ...timerAt(6, 14, 4), isReported: false, isDeleted: false, link: '' }},
        // === 7 giorni fa ===
        { id: 'timer-013', data: { uid: MOCK_UID, clientId: 'client-003', clientName: 'Farmacia Centrale', siteId: 'site-005', siteName: 'farmaciacentrale.it', worktypeId: 'wt-005', worktypeName: 'Manutenzione Sito', hourlyRate: 30, ...timerAt(7, 10, 1.5), isReported: true, isDeleted: false, link: '' }},
        // === 8-14 (settimana scorsa) ===
        { id: 'timer-014', data: { uid: MOCK_UID, clientId: 'client-001', clientName: 'Studio Rossi Architetti', siteId: 'site-001', siteName: 'www.studiorossi.it', worktypeId: 'wt-001', worktypeName: 'Sviluppo Web', hourlyRate: 45, ...timerAt(8, 9, 6), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-015', data: { uid: MOCK_UID, clientId: 'client-002', clientName: 'TechVision SRL', siteId: 'site-003', siteName: 'app.techvision.com', worktypeId: 'wt-003', worktypeName: 'Backend API', hourlyRate: 55, ...timerAt(9, 9, 4.5), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-016', data: { uid: MOCK_UID, clientId: 'client-001', clientName: 'Studio Rossi Architetti', siteId: 'site-002', siteName: 'blog.studiorossi.it', worktypeId: 'wt-002', worktypeName: 'SEO & Marketing', hourlyRate: 35, ...timerAt(10, 10, 2.5), isReported: false, isDeleted: false, link: '' }},
        { id: 'timer-017', data: { uid: MOCK_UID, clientId: 'client-002', clientName: 'TechVision SRL', siteId: 'site-004', siteName: 'dashboard.techvision.com', worktypeId: 'wt-004', worktypeName: 'UI/UX Design', hourlyRate: 40, ...timerAt(11, 14, 3), isReported: false, isDeleted: false, link: '' }},
        { id: 'timer-018', data: { uid: MOCK_UID, clientId: 'client-003', clientName: 'Farmacia Centrale', siteId: 'site-005', siteName: 'farmaciacentrale.it', worktypeId: 'wt-005', worktypeName: 'Manutenzione Sito', hourlyRate: 30, ...timerAt(12, 9, 3), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-019', data: { uid: MOCK_UID, clientId: 'client-001', clientName: 'Studio Rossi Architetti', siteId: 'site-001', siteName: 'www.studiorossi.it', worktypeId: 'wt-001', worktypeName: 'Sviluppo Web', hourlyRate: 45, ...timerAt(13, 9, 5), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-020', data: { uid: MOCK_UID, clientId: 'client-002', clientName: 'TechVision SRL', siteId: 'site-003', siteName: 'app.techvision.com', worktypeId: 'wt-003', worktypeName: 'Backend API', hourlyRate: 55, ...timerAt(14, 10, 3.5), isReported: true, isDeleted: false, link: '' }},
        // === 15-30 (mese scorso) ===
        { id: 'timer-021', data: { uid: MOCK_UID, clientId: 'client-001', clientName: 'Studio Rossi Architetti', siteId: 'site-001', siteName: 'www.studiorossi.it', worktypeId: 'wt-001', worktypeName: 'Sviluppo Web', hourlyRate: 45, ...timerAt(16, 9, 4), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-022', data: { uid: MOCK_UID, clientId: 'client-002', clientName: 'TechVision SRL', siteId: 'site-003', siteName: 'app.techvision.com', worktypeId: 'wt-003', worktypeName: 'Backend API', hourlyRate: 55, ...timerAt(18, 10, 5), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-023', data: { uid: MOCK_UID, clientId: 'client-003', clientName: 'Farmacia Centrale', siteId: 'site-005', siteName: 'farmaciacentrale.it', worktypeId: 'wt-005', worktypeName: 'Manutenzione Sito', hourlyRate: 30, ...timerAt(20, 14, 2), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-024', data: { uid: MOCK_UID, clientId: 'client-001', clientName: 'Studio Rossi Architetti', siteId: 'site-002', siteName: 'blog.studiorossi.it', worktypeId: 'wt-002', worktypeName: 'SEO & Marketing', hourlyRate: 35, ...timerAt(22, 9, 3), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-025', data: { uid: MOCK_UID, clientId: 'client-002', clientName: 'TechVision SRL', siteId: 'site-004', siteName: 'dashboard.techvision.com', worktypeId: 'wt-004', worktypeName: 'UI/UX Design', hourlyRate: 40, ...timerAt(24, 10, 4), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-026', data: { uid: MOCK_UID, clientId: 'client-001', clientName: 'Studio Rossi Architetti', siteId: 'site-001', siteName: 'www.studiorossi.it', worktypeId: 'wt-001', worktypeName: 'Sviluppo Web', hourlyRate: 45, ...timerAt(26, 9, 3.5), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-027', data: { uid: MOCK_UID, clientId: 'client-003', clientName: 'Farmacia Centrale', siteId: 'site-005', siteName: 'farmaciacentrale.it', worktypeId: 'wt-005', worktypeName: 'Manutenzione Sito', hourlyRate: 30, ...timerAt(28, 14, 1.5), isReported: true, isDeleted: false, link: '' }},
        // === 31-60 (2 mesi fa) ===
        { id: 'timer-028', data: { uid: MOCK_UID, clientId: 'client-001', clientName: 'Studio Rossi Architetti', siteId: 'site-001', siteName: 'www.studiorossi.it', worktypeId: 'wt-001', worktypeName: 'Sviluppo Web', hourlyRate: 45, ...timerAt(35, 9, 5), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-029', data: { uid: MOCK_UID, clientId: 'client-002', clientName: 'TechVision SRL', siteId: 'site-003', siteName: 'app.techvision.com', worktypeId: 'wt-003', worktypeName: 'Backend API', hourlyRate: 55, ...timerAt(38, 10, 6), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-030', data: { uid: MOCK_UID, clientId: 'client-003', clientName: 'Farmacia Centrale', siteId: 'site-005', siteName: 'farmaciacentrale.it', worktypeId: 'wt-005', worktypeName: 'Manutenzione Sito', hourlyRate: 30, ...timerAt(40, 9, 2), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-031', data: { uid: MOCK_UID, clientId: 'client-001', clientName: 'Studio Rossi Architetti', siteId: 'site-002', siteName: 'blog.studiorossi.it', worktypeId: 'wt-002', worktypeName: 'SEO & Marketing', hourlyRate: 35, ...timerAt(42, 10, 2), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-032', data: { uid: MOCK_UID, clientId: 'client-002', clientName: 'TechVision SRL', siteId: 'site-004', siteName: 'dashboard.techvision.com', worktypeId: 'wt-004', worktypeName: 'UI/UX Design', hourlyRate: 40, ...timerAt(45, 14, 3.5), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-033', data: { uid: MOCK_UID, clientId: 'client-001', clientName: 'Studio Rossi Architetti', siteId: 'site-001', siteName: 'www.studiorossi.it', worktypeId: 'wt-001', worktypeName: 'Sviluppo Web', hourlyRate: 45, ...timerAt(50, 9, 4), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-034', data: { uid: MOCK_UID, clientId: 'client-002', clientName: 'TechVision SRL', siteId: 'site-003', siteName: 'app.techvision.com', worktypeId: 'wt-003', worktypeName: 'Backend API', hourlyRate: 55, ...timerAt(55, 10, 3), isReported: true, isDeleted: false, link: '' }},
        { id: 'timer-035', data: { uid: MOCK_UID, clientId: 'client-003', clientName: 'Farmacia Centrale', siteId: 'site-005', siteName: 'farmaciacentrale.it', worktypeId: 'wt-005', worktypeName: 'Manutenzione Sito', hourlyRate: 30, ...timerAt(58, 14, 1.5), isReported: true, isDeleted: false, link: '' }},
        // === Timer eliminato (per test isDeleted) ===
        { id: 'timer-036', data: { uid: MOCK_UID, clientId: 'client-001', clientName: 'Studio Rossi Architetti', siteId: 'site-001', siteName: 'www.studiorossi.it', worktypeId: 'wt-001', worktypeName: 'Sviluppo Web', hourlyRate: 45, ...timerAt(10, 9, 2.5), isReported: false, isDeleted: true, deletedAt: makeTimestamp(daysAgo(8)), link: '' }},
    ];

    const mockActiveTimers = [];

    const mockReportConfigs = [
        {
            id: 'config-001', data: {
                uid: MOCK_UID, name: 'Config Standard',
                reportHeader: 'Report Lavori',
                companyLogoBase64: '', filterClient: 'client-001',
                filterSite: '', filterWorktype: ''
            }
        }
    ];

    const mockReports = [
        {
            id: 'report-001', data: {
                uid: MOCK_UID, reportHeader: 'Report Marzo 2026',
                startDate: '2026-03-01', endDate: '2026-03-31',
                filterClient: 'client-001', filterClientName: 'Studio Rossi Architetti',
                filterSite: '', filterSiteName: '', filterWorktype: '', filterWorktypeName: '',
                totalAmount: 675.00, totalHours: 15,
                timestamp: makeTimestamp(daysAgo(1)),
                companyLogoBase64: '', reportName: 'Report Marzo 2026',
                reportDataArray: [], includeHourlyRate: true,
                isDeleted: false
            }
        }
    ];

    // =============================================
    //  MOCK COLLECTIONS MAP (con localStorage fallback)
    // =============================================
    const collections = {
        clients: loadCollection('clients') || mockClients,
        sites: loadCollection('sites') || mockSites,
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

    function MockDoc(id, data) {
        this.id = id;
        this._data = JSON.parse(JSON.stringify(data)); // deep clone
        // Fix timestamp objects that got stringified
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
        this._items = items.slice(); // copy
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

        // Apply filters
        this._filters.forEach(f => {
            results = results.filter(item => {
                let val = item.data[f.field];
                // Handle nested timestamp comparison
                if (val && typeof val === 'object' && val.seconds !== undefined) {
                    val = val; // keep as timestamp for comparison
                }
                let compValue = f.value;
                if (compValue && typeof compValue === 'object' && compValue.seconds !== undefined) {
                    // Compare timestamps by seconds
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

        // Apply ordering
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

        // Apply limit
        if (this._limitN) {
            results = results.slice(0, this._limitN);
        }

        const docs = results.map(item => new MockDoc(item.id, item.data));
        return Promise.resolve(new MockSnapshot(docs));
    };

    MockQuery.prototype.onSnapshot = function (callback) {
        // Fire immediately with current data
        this.get().then(snapshot => callback(snapshot));
        // Return unsubscribe function
        return () => { };
    };

    // =============================================
    //  MOCK COLLECTION REFERENCE
    // =============================================

    function MockCollectionRef(name) {
        this._name = name;
        this._items = collections[name] || [];
    }

    // Inherit query methods
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
        console.log(`[Mock] Added to ${this._name}:`, newId);
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
        console.log(`[Mock] Set ${this._collection}/${this._id}`);
        saveCollection(this._collection);
        return Promise.resolve();
    };

    MockDocRef.prototype.update = function (data) {
        const idx = this._items.findIndex(i => i.id === this._id);
        if (idx >= 0) {
            Object.assign(this._items[idx].data, data);
        }
        console.log(`[Mock] Updated ${this._collection}/${this._id}`);
        saveCollection(this._collection);
        return Promise.resolve();
    };

    MockDocRef.prototype.delete = function () {
        const idx = this._items.findIndex(i => i.id === this._id);
        if (idx >= 0) {
            this._items.splice(idx, 1);
        }
        console.log(`[Mock] Deleted ${this._collection}/${this._id}`);
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
        console.log(`[Mock] Batch committed (${this._ops.length} operations)`);
        return Promise.resolve();
    };

    // =============================================
    //  OVERRIDE GLOBALE DI `db`
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

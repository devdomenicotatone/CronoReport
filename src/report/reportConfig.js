// reportConfig.js
import * as notify from '../core/notify.js';
import { handleAuthClick } from '../core/firebaseConfig.js';
import { loadTimerClientDropdown as loadClients, loadProjects, loadWorktypes } from '../timer/timerHelpers.js';

// Re-export per backward compatibility con reportEvents.js
export { loadClients, loadProjects, loadWorktypes };

// Variabili globali necessarie per configurazioni e logo
let savedConfigs = {}; // Oggetto per memorizzare le configurazioni salvate
let companyLogoBase64 = ''; // Variabile per memorizzare il logo in base64

export const reportTemplate = `
<div id="report-section" class="max-w-6xl mx-auto px-4 py-6">
    <div class="flex items-center gap-3 mb-8">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <i class="fas fa-file-alt text-white text-lg"></i>
        </div>
        <h2 class="text-2xl font-bold text-surface-800">Genera Report</h2>
    </div>
    <form id="report-form">

        <!-- ═══ CARD 1: Dati & Filtri ═══ -->
        <div class="cr-card mb-5 overflow-hidden">
            <div class="px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                <span class="font-semibold flex items-center gap-2"><i class="fas fa-filter"></i> Dati & Filtri</span>
            </div>
            <div class="p-5 space-y-4">
                <!-- Filtri Client/Project/Worktype -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label for="filter-client" class="block text-sm font-semibold text-surface-600 mb-1">Cliente</label>
                        <select id="filter-client" class="cr-input" required></select>
                    </div>
                    <div>
                        <label for="filter-project" class="block text-sm font-semibold text-surface-600 mb-1">Progetto</label>
                        <select id="filter-project" class="cr-input">
                            <option value="">Tutti i Progetti</option>
                        </select>
                    </div>
                    <div>
                        <label for="filter-worktype" class="block text-sm font-semibold text-surface-600 mb-1">Tipo di Lavoro</label>
                        <select id="filter-worktype" class="cr-input">
                            <option value="">Tutti i Tipi di Lavoro</option>
                        </select>
                    </div>
                </div>

                <!-- Periodo chips -->
                <div>
                    <label class="block text-sm font-semibold text-surface-600 mb-2">Periodo</label>
                    <div class="rw-period-chips disabled" id="rw-period-chips">
                        <button type="button" class="rw-period-chip" data-period="auto" disabled><i class="fas fa-magic"></i> Auto</button>
                        <button type="button" class="rw-period-chip" data-period="this-month" disabled><i class="fas fa-calendar-day"></i> Questo Mese</button>
                        <button type="button" class="rw-period-chip" data-period="last-month" disabled><i class="fas fa-calendar-minus"></i> Mese Scorso</button>
                        <button type="button" class="rw-period-chip" data-period="last-3-months" disabled><i class="fas fa-calendar-week"></i> Ultimi 3 Mesi</button>
                        <button type="button" class="rw-period-chip" data-period="this-year" disabled><i class="fas fa-calendar"></i> Anno Corrente</button>
                        <button type="button" class="rw-period-chip" data-period="custom" disabled><i class="fas fa-sliders-h"></i> Personalizzato</button>
                    </div>
                    <div class="rw-date-range" id="rw-date-range">
                        <input type="date" id="start-date" class="cr-input flex-1">
                        <span class="rw-date-sep">→</span>
                        <input type="date" id="end-date" class="cr-input flex-1">
                    </div>
                </div>

                <!-- Raggruppa + Genera -->
                <div class="flex flex-wrap items-center gap-4">
                    <div class="flex items-center gap-2">
                        <label for="rw-group-by" class="text-sm font-semibold text-surface-600">Raggruppa</label>
                        <select id="rw-group-by" class="cr-input w-auto text-sm py-1.5 px-3">
                            <option value="none">Nessuno</option>
                            <option value="date">Data</option>
                            <option value="worktype">Tipo di Lavoro</option>
                            <option value="project">Progetto</option>
                        </select>
                    </div>
                    <div class="ml-auto">
                        <button type="submit" id="rw-generate-btn" class="cr-btn bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold shadow-md px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                            <i class="fas fa-search mr-2"></i>Carica Dati
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ CARD 2: Anteprima & Stile ═══ -->
        <div class="cr-card mb-5 overflow-hidden">
            <div class="px-5 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <span class="font-semibold flex items-center gap-2"><i class="fas fa-eye"></i> Anteprima & Stile</span>
            </div>

            <!-- ── TOOLBAR ── -->
            <div class="rw-toolbar" id="rw-toolbar">
                <!-- Row 1: Template + Accent + actions -->
                <div class="rw-toolbar-row">
                    <!-- Segmented control template -->
                    <div class="rw-segmented" id="rw-template-cards">
                        <button type="button" class="rw-seg-btn active" data-template="minimal" title="Minimal"><i class="fas fa-minus"></i></button>
                        <button type="button" class="rw-seg-btn" data-template="detailed" title="Dettagliato"><i class="fas fa-list-alt"></i></button>
                        <button type="button" class="rw-seg-btn" data-template="executive" title="Executive"><i class="fas fa-crown"></i></button>
                    </div>

                    <!-- Divider -->
                    <div class="rw-toolbar-divider"></div>

                    <!-- Accent color dots -->
                    <div class="rw-accent-row" id="rw-accent-picker">
                        <button type="button" class="rw-accent-dot active" data-color="#6366f1" style="background:#6366f1;" title="Indaco"></button>
                        <button type="button" class="rw-accent-dot" data-color="#8b5cf6" style="background:#8b5cf6;" title="Viola"></button>
                        <button type="button" class="rw-accent-dot" data-color="#3b82f6" style="background:#3b82f6;" title="Blu"></button>
                        <button type="button" class="rw-accent-dot" data-color="#06b6d4" style="background:#06b6d4;" title="Ciano"></button>
                        <button type="button" class="rw-accent-dot" data-color="#10b981" style="background:#10b981;" title="Smeraldo"></button>
                        <button type="button" class="rw-accent-dot" data-color="#f59e0b" style="background:#f59e0b;" title="Ambra"></button>
                        <button type="button" class="rw-accent-dot" data-color="#ef4444" style="background:#ef4444;" title="Rosso"></button>
                        <button type="button" class="rw-accent-dot" data-color="#1e293b" style="background:#1e293b;" title="Scuro"></button>
                        <div class="rw-accent-custom">
                            <input type="color" id="rw-accent-custom-input" value="#6366f1" class="rw-accent-color-input" title="Colore personalizzato">
                        </div>
                    </div>

                    <!-- Divider -->
                    <div class="rw-toolbar-divider"></div>

                    <!-- Action buttons -->
                    <div class="rw-toolbar-actions">
                        <button type="button" class="rw-toolbar-btn" id="rw-toggle-notes" title="Note / Memo">
                            <i class="fas fa-sticky-note"></i>
                        </button>
                        <button type="button" class="rw-toolbar-btn" id="rw-toggle-tax" title="Tax & Sconto">
                            <i class="fas fa-receipt"></i>
                        </button>
                        <button type="button" class="rw-toolbar-btn" id="rw-toggle-presets" title="Preset Configurazioni">
                            <i class="fas fa-bookmark"></i>
                        </button>
                    </div>
                </div>

                <!-- Row 2: Column chips -->
                <div class="rw-toolbar-row rw-toolbar-row-compact">
                    <span class="rw-toolbar-label">Colonne</span>
                    <div class="flex flex-wrap gap-1.5" id="rw-column-chips">
                        <button type="button" class="rw-column-chip active" data-col="date"><span class="rw-chip-label">📅 Data</span><span class="rw-chip-pin" title="Predefinito"><i class="fas fa-thumbtack"></i></span></button>
                        <button type="button" class="rw-column-chip active" data-col="worktype"><span class="rw-chip-label">🔧 Tipo</span><span class="rw-chip-pin" title="Predefinito"><i class="fas fa-thumbtack"></i></span></button>
                        <button type="button" class="rw-column-chip" data-col="project"><span class="rw-chip-label">📁 Progetto</span><span class="rw-chip-pin" title="Predefinito"><i class="fas fa-thumbtack"></i></span></button>
                        <button type="button" class="rw-column-chip" data-col="link"><span class="rw-chip-label">🔗 Link</span><span class="rw-chip-pin" title="Predefinito"><i class="fas fa-thumbtack"></i></span></button>
                        <button type="button" class="rw-column-chip" data-col="note"><span class="rw-chip-label">📝 Note</span><span class="rw-chip-pin" title="Predefinito"><i class="fas fa-thumbtack"></i></span></button>
                        <button type="button" class="rw-column-chip active" data-col="duration"><span class="rw-chip-label">⏱ Durata</span><span class="rw-chip-pin" title="Predefinito"><i class="fas fa-thumbtack"></i></span></button>
                        <button type="button" class="rw-column-chip" data-col="rate"><span class="rw-chip-label">💶 Tariffa</span><span class="rw-chip-pin" title="Predefinito"><i class="fas fa-thumbtack"></i></span></button>
                        <button type="button" class="rw-column-chip active" data-col="amount"><span class="rw-chip-label">💰 Importo</span><span class="rw-chip-pin" title="Predefinito"><i class="fas fa-thumbtack"></i></span></button>
                    </div>
                </div>

                <!-- Expandable: Notes panel -->
                <div class="rw-toolbar-expand" id="rw-notes-panel" style="display:none;">
                    <textarea id="report-notes" class="cr-input w-full text-sm" rows="2" placeholder="Note aggiuntive per il report (condizioni, scadenze, istruzioni di pagamento…)"></textarea>
                </div>

                <!-- Expandable: Tax & Sconto panel -->
                <div class="rw-toolbar-expand" id="rw-tax-panel" style="display:none;">
                    <div class="grid grid-cols-2 gap-3">
                        <!-- IVA -->
                        <div class="rw-tax-box">
                            <div class="flex items-center gap-2 mb-2">
                                <i class="fas fa-percentage text-surface-400 text-xs"></i>
                                <span class="text-xs font-semibold text-surface-500 uppercase tracking-wider">IVA</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="flex gap-1" id="rw-iva-chips">
                                    <button type="button" class="rw-iva-chip active" data-iva="0">0%</button>
                                    <button type="button" class="rw-iva-chip" data-iva="4">4%</button>
                                    <button type="button" class="rw-iva-chip" data-iva="10">10%</button>
                                    <button type="button" class="rw-iva-chip" data-iva="22">22%</button>
                                </div>
                                <input type="number" id="rw-iva-custom" class="cr-input w-16 text-center text-sm" min="0" max="100" step="0.5" placeholder="%" value="0">
                            </div>
                        </div>
                        <!-- Sconto -->
                        <div class="rw-tax-box">
                            <div class="flex items-center gap-2 mb-2">
                                <i class="fas fa-tag text-surface-400 text-xs"></i>
                                <span class="text-xs font-semibold text-surface-500 uppercase tracking-wider">Sconto</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <input type="number" id="rw-discount-value" class="cr-input w-20 text-center text-sm" min="0" step="0.5" placeholder="0" value="0">
                                <div class="rw-discount-toggle" id="rw-discount-toggle">
                                    <button type="button" class="rw-disc-btn active" data-type="percent">%</button>
                                    <button type="button" class="rw-disc-btn" data-type="fixed">€</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Expandable: Presets panel -->
                <div class="rw-toolbar-expand" id="rw-presets-panel" style="display:none;">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="text-xs font-semibold text-surface-500 uppercase tracking-wider">Preset</span>
                        <select id="saved-config-select" class="cr-input text-sm py-1.5 flex-1 max-w-xs">
                            <option value="">-- Seleziona configurazione --</option>
                        </select>
                        <button type="button" id="delete-config-btn" class="rw-toolbar-btn text-rose-400 hover:text-rose-600" style="display: none;" title="Elimina preset">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        <div class="rw-toolbar-divider"></div>
                        <input type="text" id="config-name" class="cr-input text-sm py-1.5 flex-1 max-w-xs" placeholder="Nome nuovo preset…">
                        <button type="button" id="rw-save-config-btn" class="rw-toolbar-btn text-indigo-500 hover:text-indigo-700" title="Salva preset">
                            <i class="fas fa-save"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- ── PREVIEW AREA ── -->
            <div class="p-5 space-y-4">
                <!-- Inline header: logo + intestazione -->
                <div class="rw-preview-header" id="rw-preview-header">
                    <div class="rw-preview-logo-area" id="rw-logo-area" title="Clicca per caricare un logo">
                        <input type="file" id="company-logo" accept="image/*" class="hidden">
                        <div id="logo-preview-container" class="rw-logo-placeholder">
                            <i class="fas fa-image text-surface-300 text-xl"></i>
                            <span class="text-[10px] text-surface-400">Logo</span>
                        </div>
                    </div>
                    <div class="flex-1">
                        <input type="text" id="report-header" class="rw-inline-header-input" placeholder="Intestazione del Report" value="">
                    </div>
                </div>

                <!-- Preview Table -->
                <div id="rw-preview-container">
                    <div class="rw-empty-preview">
                        <i class="fas fa-search"></i>
                        <p>Seleziona periodo e cliente, poi clicca <strong>Carica Dati</strong></p>
                    </div>
                </div>

                <!-- Export buttons (visibili dopo generazione) -->
                <div id="rw-export-buttons" class="flex flex-wrap justify-center gap-3 pt-3 pb-1" style="display:none;">
                    <button type="button" id="download-pdf-btn" class="cr-btn bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-md px-5 py-2.5">
                        <i class="fas fa-file-pdf mr-2"></i>Scarica PDF
                    </button>
                    <button type="button" id="export-google-doc-btn" class="cr-btn bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-md px-5 py-2.5">
                        <i class="fab fa-google-drive mr-2"></i>Google Docs
                    </button>
                    <button type="button" id="export-google-sheet-btn" class="cr-btn bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-md px-5 py-2.5">
                        <i class="fab fa-google-drive mr-2"></i>Google Sheets
                    </button>
                </div>

                <!-- Salva bozza -->
                <div class="flex justify-end gap-3 pt-2">
                    <button type="button" id="rw-save-draft-btn" class="cr-btn bg-surface-100 hover:bg-surface-200 text-surface-600 font-semibold px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                        <i class="fas fa-bookmark mr-2"></i>Salva Bozza
                    </button>
                </div>
            </div>
        </div>

    </form>
</div>
`;

const reportDiv = document.createElement('div');
reportDiv.id = 'report-template';
reportDiv.style.display = 'none';
reportDiv.innerHTML = reportTemplate;
document.body.appendChild(reportDiv);

// Funzione per estrarre il nome del dominio dall'URL
export function extractDomainName(url) {
    try {
        const hostname = new URL(url).hostname;
        let domain = hostname.startsWith('www.') ? hostname.substring(4) : hostname;
        return domain;
    } catch (e) {
        return 'Link';
    }
}

// Funzione per visualizzare l'anteprima del logo
export function displayLogoPreview(base64Data) {
    const previewContainer = document.getElementById('logo-preview-container');
    previewContainer.innerHTML = '';

    const imgPreview = document.createElement('img');
    imgPreview.id = 'logo-preview';
    imgPreview.src = base64Data;
    imgPreview.style.maxWidth = '150px';
    imgPreview.style.marginTop = '10px';
    previewContainer.appendChild(imgPreview);
}

// Funzione per rimuovere l'anteprima del logo
export function clearLogoPreview() {
    const previewContainer = document.getElementById('logo-preview-container');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
}

// loadClients, loadProjects, loadWorktypes → importati e ri-esportati da timerHelpers.js (vedi top)

// Funzione per caricare le configurazioni salvate
export async function loadSavedConfigs() {
    const savedConfigSelect = document.getElementById('saved-config-select');
    const deleteConfigBtn = document.getElementById('delete-config-btn');

    savedConfigSelect.innerHTML = '<option value="">-- Seleziona una configurazione --</option>';
    deleteConfigBtn.style.display = 'none';
    try {
        const snapshot = await db.collection('reportConfigs')
            .where('uid', '==', currentUser.uid)
            .orderBy('timestamp', 'desc')
            .get();
        savedConfigs = {};
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                const config = doc.data();
                savedConfigs[doc.id] = config;
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = config.name;
                savedConfigSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Errore nel caricamento delle configurazioni salvate:', error);
        notify.error('Errore', 'Si è verificato un errore durante il caricamento delle configurazioni salvate.');
    }
}

// Funzione per salvare una configurazione
export async function saveReportConfig(config) {
    try {
        await db.collection('reportConfigs').add({
            uid: currentUser.uid,
            name: config.name,
            reportHeader: config.reportHeader,
            companyLogoBase64: config.companyLogoBase64,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        notify.success('Configurazione Salvata', 'La configurazione è stata salvata con successo.');
        loadSavedConfigs();
        document.getElementById('config-name').value = '';
    } catch (error) {
        console.error('Errore nel salvataggio della configurazione:', error);
        notify.error('Errore', 'Si è verificato un errore durante il salvataggio della configurazione.');
    }
}

// Funzione per applicare una configurazione salvata
export async function applySavedConfig(configId) {
    const config = savedConfigs[configId];
    if (config) {
        document.getElementById('report-header').value = config.reportHeader;
        companyLogoBase64 = config.companyLogoBase64 || '';
        if (companyLogoBase64) {
            displayLogoPreview(companyLogoBase64);
        } else {
            clearLogoPreview();
        }
    }
}

// Funzione per generare PDF — Template Ultra Pro con stili dinamici
export function generatePDF(reportHeader, reportData, totalHours, totalAmount, companyLogoBase64, reportFileName, includeHourlyRate, template = 'minimal', accentHex = '#6366f1', taxDiscount = null, activeColumns = null, metaInfo = null) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); // Portrait A4

    // === Hex to RGB ===
    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    }
    function lightenRgb(rgb, factor = 0.9) {
        return rgb.map(c => Math.round(c + (255 - c) * factor));
    }

    const primary = hexToRgb(accentHex);
    const primaryLight = lightenRgb(primary, 0.92);

    // === CONFIG CENTRALIZZATA ===
    const cfg = {
        colors: {
            primary: primary,
            primaryLight: primaryLight,
            dark: [30, 41, 59],           // Slate 800
            medium: [100, 116, 139],      // Slate 500
            light: [241, 245, 249],       // Slate 100
            white: [255, 255, 255],
            accent: [16, 185, 129],       // Emerald 500 (per importi)
            discount: [16, 185, 129],     // Verde sconto
        },
        page: {
            width: doc.internal.pageSize.getWidth(),   // 210
            height: doc.internal.pageSize.getHeight(),  // 297
            marginLeft: 15,
            marginRight: 15,
            marginTop: 35,    // Spazio per header
            marginBottom: 20, // Spazio per footer (standard ISO/DIN)
        },
        font: {
            titleSize: template === 'executive' ? 16 : 14,
            subtitleSize: 10,
            bodySize: template === 'minimal' ? 8 : 9,
            smallSize: 7,
        }
    };
    const contentWidth = cfg.page.width - cfg.page.marginLeft - cfg.page.marginRight;

    // === HELPERS ===
    function formatHoursToHMS(hoursDecimal) {
        const totalSeconds = Math.floor(hoursDecimal * 3600);
        const hh = Math.floor(totalSeconds / 3600);
        const mm = Math.floor((totalSeconds % 3600) / 60);
        const ss = totalSeconds % 60;
        return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
    }

    function drawHeader(doc) {
        // Linea accent in alto (più spessa per executive)
        const lineH = template === 'executive' ? 4 : template === 'minimal' ? 2 : 3;
        doc.setFillColor(...cfg.colors.primary);
        doc.rect(0, 0, cfg.page.width, lineH, 'F');

        // Titolo report
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(cfg.font.titleSize);
        doc.setTextColor(...cfg.colors.dark);
        doc.text(reportHeader, cfg.page.marginLeft, 15);

        // Meta info: cliente · date range · N timer
        if (metaInfo) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...cfg.colors.medium);
            doc.text(metaInfo, cfg.page.marginLeft, 20);
        }

        // Linea separatrice
        const lineY = metaInfo ? 24 : 20;
        doc.setDrawColor(...cfg.colors.primary);
        doc.setLineWidth(template === 'executive' ? 0.8 : 0.5);
        doc.line(cfg.page.marginLeft, lineY, cfg.page.width - cfg.page.marginRight, lineY);
    }

    function drawFooter(doc, pageNum) {
        const y = cfg.page.height - 10;
        doc.setDrawColor(...cfg.colors.light);
        doc.setLineWidth(0.3);
        doc.line(cfg.page.marginLeft, y - 5, cfg.page.width - cfg.page.marginRight, y - 5);

        // Data generazione a sinistra
        const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
        doc.setFontSize(cfg.font.smallSize);
        doc.setTextColor(...cfg.colors.medium);
        doc.setFont('helvetica', 'italic');
        doc.text(`Generato il ${today}`, cfg.page.marginLeft, y);

        doc.setFont('helvetica', 'normal');
        doc.text(`Pagina ${pageNum}`, cfg.page.width - cfg.page.marginRight, y, { align: 'right' });
    }

    // === COSTRUZIONE TABELLA DINAMICA ===
    const colMap = {
        date: { header: 'Data', value: item => item.date },
        worktype: { header: 'Tipo', value: item => item.workType },
        project: { header: 'Progetto', value: item => item.project || '—' },
        rate: { header: 'Tariffa', value: item => `€ ${(item.rate || 0).toFixed(2)}` },
        link: { header: 'Link', value: item => item.link || '' },
        note: { header: 'Note', value: item => item.note || '-' },
        duration: { header: 'Durata', value: item => item.hours || '' },
        amount: { header: 'Importo', value: item => `€ ${(item.amount || 0).toFixed(2)}` },
    };

    // Fallback default columns if none provided
    const cols = activeColumns && activeColumns.length > 0
        ? activeColumns
        : ['date', 'worktype', ...(includeHourlyRate ? ['rate'] : []), 'link', 'duration', 'amount'];

    const tableColumn = cols.map(c => colMap[c]?.header || c);
    const linkColumnIndex = cols.indexOf('link');

    const tableRows = [];
    reportData.forEach(item => {
        const rowData = cols.map(c => colMap[c]?.value(item) || '');
        tableRows.push(rowData);
    });

    // === Prima pagina: Logo + Header ===
    let tableStartY = metaInfo ? cfg.page.marginTop : cfg.page.marginTop - 4;

    // Executive KPI summary prima della tabella
    if (template === 'executive') {
        tableStartY = cfg.page.marginTop + 18 + (metaInfo ? 0 : -4);
    }

    // Cache logo info for drawing on every page
    let cachedLogoW = 0;
    let cachedLogoH = 0;

    function drawLogo(doc) {
        if (companyLogoBase64 && cachedLogoW > 0) {
            doc.addImage(companyLogoBase64, 'PNG', cfg.page.width - cfg.page.marginRight - cachedLogoW, 8, cachedLogoW, cachedLogoH);
        }
    }

    if (companyLogoBase64) {
        const img = new Image();
        img.src = companyLogoBase64;
        img.onload = function () {
            // Logo a destra (standard report/invoice)
            cachedLogoH = 12;
            cachedLogoW = (img.width * cachedLogoH) / img.height;
            drawHeader(doc);
            drawLogo(doc);
            if (template === 'executive') drawKpiCards(doc, cfg.page.marginTop + (metaInfo ? 0 : -4));
            buildTable(tableStartY);
        };
    } else {
        drawHeader(doc);
        if (template === 'executive') drawKpiCards(doc, cfg.page.marginTop + (metaInfo ? 0 : -4));
        buildTable(tableStartY);
    }

    // Executive KPI cards
    function drawKpiCards(doc, y) {
        const cardW = (contentWidth - 8) / 3;
        const cardH = 12;
        const formattedHours = formatHoursToHMS(totalHours);
        const count = reportData.length;

        const kpis = [
            { label: 'TIMER', value: `${count}` },
            { label: 'DURATA TOTALE', value: formattedHours },
            { label: 'IMPORTO TOTALE', value: `€ ${totalAmount.toFixed(2)}` },
        ];

        kpis.forEach((kpi, i) => {
            const x = cfg.page.marginLeft + i * (cardW + 4);
            doc.setFillColor(...cfg.colors.primaryLight);
            doc.setDrawColor(...cfg.colors.primary);
            doc.setLineWidth(0.3);
            doc.roundedRect(x, y, cardW, cardH, 1.5, 1.5, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(...cfg.colors.primary);
            doc.text(kpi.value, x + cardW / 2, y + 5.5, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(...cfg.colors.medium);
            doc.text(kpi.label, x + cardW / 2, y + 10, { align: 'center' });
        });
    }

    function buildTable(startY) {
        // Stili tabella basati sul template
        const headStyles = {
            fillColor: cfg.colors.primary,
            textColor: cfg.colors.white,
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'left',
        };

        const alternateStyles = template === 'minimal'
            ? { fillColor: cfg.colors.white } // Minimal: no alternate
            : { fillColor: cfg.colors.primaryLight };

        const bodyStyles = template === 'executive'
            ? { lineWidth: 0.5, lineColor: cfg.colors.light }
            : { lineWidth: 0.3, lineColor: cfg.colors.light };

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: startY,
            margin: { left: cfg.page.marginLeft, right: cfg.page.marginRight, top: cfg.page.marginTop, bottom: cfg.page.marginBottom },
            styles: {
                fontSize: cfg.font.bodySize,
                cellPadding: template === 'executive' ? 4 : 3,
                overflow: 'linebreak',
                lineColor: bodyStyles.lineColor,
                lineWidth: bodyStyles.lineWidth,
                textColor: cfg.colors.dark,
            },
            headStyles: headStyles,
            alternateRowStyles: alternateStyles,
            columnStyles: {},
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === linkColumnIndex) {
                    data.cell.text = '';
                }
            },
            didDrawCell: function (data) {
                if (data.section === 'body' && data.column.index === linkColumnIndex) {
                    const link = reportData[data.row.index]?.link;
                    if (link) {
                        doc.setTextColor(...cfg.colors.primary);
                        doc.setFontSize(8);
                        const linkText = extractDomainName(link);
                        const xPos = data.cell.x + data.cell.padding('left');
                        const yPos = data.cell.y + data.cell.height / 2 + 1;
                        doc.textWithLink(linkText, xPos, yPos, { url: link });
                        doc.setTextColor(...cfg.colors.dark);
                        doc.setFontSize(cfg.font.bodySize);
                    }
                }
            },
            didDrawPage: function (data) {
                if (data.pageNumber > 1) {
                    drawHeader(doc);
                }
            },
        });

        // === RIEPILOGO TOTALI ===
        const lastAutoTable = doc.lastAutoTable;
        let currentY = lastAutoTable ? lastAutoTable.finalY + 10 : startY + 10;

        // Calcoli fiscali
        const td = taxDiscount || { iva: 0, discountValue: 0, discountType: 'percent' };
        const subtotal = totalAmount;
        let discountAmt = 0;
        if (td.discountValue > 0) {
            discountAmt = td.discountType === 'percent' ? subtotal * (td.discountValue / 100) : td.discountValue;
        }
        const afterDiscount = Math.max(0, subtotal - discountAmt);
        const ivaAmt = afterDiscount * (td.iva / 100);
        const grandTotal = afterDiscount + ivaAmt;
        const hasTaxOrDiscount = td.iva > 0 || td.discountValue > 0;

        // Altezza box dinamica
        let boxRows = 2; // Ore + Importo base
        if (hasTaxOrDiscount) {
            boxRows = 2; // Timer + Ore
            if (discountAmt > 0) boxRows += 2; // Subtotale + Sconto
            if (td.iva > 0) boxRows += 2; // Imponibile + IVA
            boxRows += 1; // Totale finale
        }
        const boxHeight = 8 + (boxRows * 8) + 4;
        const boxWidth = 100;

        if (currentY + boxHeight > cfg.page.height - cfg.page.marginBottom) {
            doc.addPage();
            drawHeader(doc);
            currentY = cfg.page.marginTop;
        }

        const boxX = cfg.page.width - cfg.page.marginRight - boxWidth;
        const boxY = currentY;

        // Box sfondo
        doc.setFillColor(...cfg.colors.light);
        doc.setDrawColor(...cfg.colors.primary);
        doc.setLineWidth(0.5);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'FD');

        // Titolo riepilogo
        doc.setFillColor(...cfg.colors.primary);
        doc.roundedRect(boxX, boxY, boxWidth, 8, 2, 2, 'F');
        doc.rect(boxX, boxY + 5, boxWidth, 3, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...cfg.colors.white);
        doc.text('RIEPILOGO TOTALI', boxX + boxWidth / 2, boxY + 5.5, { align: 'center' });

        // Contenuto riepilogo
        const formattedHours = formatHoursToHMS(totalHours);
        let rowY = boxY + 16;
        const leftX = boxX + 5;
        const rightX = boxX + boxWidth - 5;

        function drawRow(label, value, opts = {}) {
            doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
            doc.setFontSize(opts.size || 9);
            doc.setTextColor(...(opts.labelColor || cfg.colors.dark));
            doc.text(label, leftX, rowY);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...(opts.valueColor || cfg.colors.dark));
            doc.text(value, rightX, rowY, { align: 'right' });
            rowY += 8;
        }

        if (hasTaxOrDiscount) {
            // Timer + Ore
            drawRow('Timer:', `${reportData.length}`, { bold: true });
            drawRow('Totale Durata:', formattedHours, { bold: true });

            // Divider
            doc.setDrawColor(...cfg.colors.medium);
            doc.setLineWidth(0.2);
            doc.line(leftX, rowY - 4, rightX, rowY - 4);

            // Subtotale
            drawRow('Subtotale:', `€ ${subtotal.toFixed(2)}`, { bold: true });

            if (discountAmt > 0) {
                const discLabel = td.discountType === 'percent' ? `Sconto (${td.discountValue}%):` : 'Sconto:';
                drawRow(discLabel, `- € ${discountAmt.toFixed(2)}`, { valueColor: cfg.colors.discount });
            }
            if (td.iva > 0) {
                drawRow('Imponibile:', `€ ${afterDiscount.toFixed(2)}`);
                drawRow(`IVA (${td.iva}%):`, `+ € ${ivaAmt.toFixed(2)}`);
            }

            // Divider
            doc.setDrawColor(...cfg.colors.medium);
            doc.setLineWidth(0.2);
            doc.line(leftX, rowY - 4, rightX, rowY - 4);

            // Grand total
            drawRow('TOTALE:', `€ ${grandTotal.toFixed(2)}`, { bold: true, size: 10, valueColor: cfg.colors.primary });
        } else {
            drawRow('Totale Durata:', formattedHours, { bold: true });
            drawRow('Totale Importo:', `€ ${totalAmount.toFixed(2)}`, { bold: true, valueColor: cfg.colors.primary });
        }

        // === NUMERI DI PAGINA (X di Y) ===
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            drawFooter(doc, `${i} di ${totalPages}`);
        }

        // Salva
        doc.save(`${reportFileName}.pdf`);
    }
}

export function exportReportToGoogleSheet(reportValues, fileName) {
    handleAuthClick(() => {
        createGoogleSheet(reportValues, fileName);
    });
}

export async function createGoogleDoc(reportContent, fileName) {
    try {
        const response = await gapi.client.docs.documents.create({
            title: fileName
        });
        const documentId = response.result.documentId;
        insertContentIntoDoc(documentId, reportContent);
    } catch (error) {
        console.error('Errore durante la creazione del documento:', error);
    }
}

export async function insertContentIntoDoc(documentId, reportContent) {
    const requests = [{
        insertText: {
            location: { index: 1 },
            text: reportContent
        }
    }];

    try {
        const response = await gapi.client.docs.documents.batchUpdate({
            documentId: documentId,
            requests: requests
        });
        console.log('Contenuto inserito nel documento:', response);
        window.open(`https://docs.google.com/document/d/${documentId}/edit`, '_blank');
    } catch (error) {
        console.error('Errore durante l\'inserimento del contenuto:', error);
    }
}

export function generateReportContentString(reportHeader, reportData, totalAmount, includeHourlyRate) {
    let content = `${reportHeader}\n\n`;
    reportData.forEach(item => {
        content += `Data: ${item.date}\n`;
        content += `Tipo di Lavoro: ${item.workType}\n`;
        if (includeHourlyRate) {
            content += `Tariffa Oraria (€): ${item.hourlyRate}\n`;
        }
        content += `Link: ${item.link}\n`;
        content += `Tempo Lavorato: ${item.timeWorked}\n`;
        content += `Importo (€): ${item.amount}\n\n`;
    });
    content += `Totale: € ${totalAmount.toFixed(2)}\n`;
    return content;
}

export async function createGoogleSheet(reportValues, fileName) {
    try {
        const response = await gapi.client.sheets.spreadsheets.create({
            properties: { title: fileName }
        });
        const spreadsheetId = response.result.spreadsheetId;
        const sheetName = response.result.sheets[0].properties.title;
        insertDataIntoSheet(spreadsheetId, sheetName, reportValues);
    } catch (error) {
        console.error('Errore durante la creazione del foglio di calcolo:', error);
    }
}

export async function insertDataIntoSheet(spreadsheetId, sheetName, reportValues) {
    const range = `${sheetName}!A1`;

    try {
        const response = await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: range,
            valueInputOption: 'RAW',
            values: reportValues
        });
        console.log('Dati inseriti nel foglio di calcolo:', response);
        window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, '_blank');
    } catch (error) {
        console.error('Errore durante l\'inserimento dei dati:', error);
    }
}

export function generateReportValuesArray(reportHeader, reportData, totalAmount, includeHourlyRate) {
    const values = [];
    values.push([reportHeader]);
    values.push([]);
    const headers = ['Data', 'Tipo di Lavoro'];
    if (includeHourlyRate) headers.push('Tariffa Oraria (€)');
    headers.push('Link', 'Tempo Lavorato', 'Importo (€)');
    values.push(headers);

    reportData.forEach(item => {
        const row = [item.date, item.workType];
        if (includeHourlyRate) row.push(item.hourlyRate);
        row.push(item.link, item.timeWorked, item.amount);
        values.push(row);
    });

    values.push([]);
    const totalRow = ['', ''];
    if (includeHourlyRate) totalRow.push('');
    totalRow.push('', 'Totale', totalAmount.toFixed(2));
    values.push(totalRow);

    return values;
}



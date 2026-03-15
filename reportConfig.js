// reportConfig.js
import { handleAuthClick } from './firebaseConfig.js';

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

        <!-- ═══ SEZIONE 1: Configurazione ═══ -->
        <div class="cr-card mb-5 overflow-hidden">
            <div class="px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                <span class="font-semibold flex items-center gap-2"><i class="fas fa-cog"></i> Configurazione</span>
            </div>
            <div class="p-5">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="saved-config-select" class="block text-sm font-semibold text-surface-600 mb-1">Configurazione Salvata</label>
                        <div class="flex gap-2">
                            <select id="saved-config-select" class="cr-input flex-1">
                                <option value="">-- Seleziona una configurazione --</option>
                            </select>
                            <button type="button" id="delete-config-btn" class="cr-btn text-rose-400 hover:text-rose-600 hover:bg-rose-50" style="display: none;">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label for="report-header" class="block text-sm font-semibold text-surface-600 mb-1">Intestazione del Report</label>
                        <input type="text" id="report-header" class="cr-input" placeholder="Inserisci l'intestazione del report">
                    </div>
                    <div>
                        <label for="company-logo" class="block text-sm font-semibold text-surface-600 mb-1">Logo Aziendale</label>
                        <input type="file" id="company-logo" class="cr-input text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600 file:font-medium hover:file:bg-indigo-100" accept="image/*">
                        <div id="logo-preview-container" class="mt-2"></div>
                    </div>
                    <div>
                        <label for="config-name" class="block text-sm font-semibold text-surface-600 mb-1">Nome Configurazione (per salvare)</label>
                        <input type="text" id="config-name" class="cr-input" placeholder="Inserisci un nome per questa configurazione">
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ SEZIONE 2: Periodo & Filtri ═══ -->
        <div class="cr-card mb-5 overflow-hidden">
            <div class="px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                <span class="font-semibold flex items-center gap-2"><i class="fas fa-calendar-alt"></i> Periodo & Filtri</span>
            </div>
            <div class="p-5 space-y-4">
                <!-- Chip periodo rapido -->
                <div>
                    <label class="block text-sm font-semibold text-surface-600 mb-2">Periodo Rapido</label>
                    <div class="rw-period-chips" id="rw-period-chips">
                        <button type="button" class="rw-period-chip" data-period="this-month"><i class="fas fa-calendar-day"></i> Questo Mese</button>
                        <button type="button" class="rw-period-chip" data-period="last-month"><i class="fas fa-calendar-minus"></i> Mese Scorso</button>
                        <button type="button" class="rw-period-chip" data-period="last-3-months"><i class="fas fa-calendar-week"></i> Ultimi 3 Mesi</button>
                        <button type="button" class="rw-period-chip" data-period="this-year"><i class="fas fa-calendar"></i> Anno Corrente</button>
                        <button type="button" class="rw-period-chip" data-period="custom"><i class="fas fa-sliders-h"></i> Personalizzato</button>
                    </div>
                    <!-- Date range (visibile solo con "Personalizzato") -->
                    <div class="rw-date-range" id="rw-date-range">
                        <input type="date" id="start-date" class="cr-input flex-1">
                        <span class="rw-date-sep">→</span>
                        <input type="date" id="end-date" class="cr-input flex-1">
                    </div>
                </div>

                <!-- Filtri -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label for="filter-client" class="block text-sm font-semibold text-surface-600 mb-1">Cliente</label>
                        <select id="filter-client" class="cr-input" required></select>
                    </div>
                    <div>
                        <label for="filter-project" class="block text-sm font-semibold text-surface-600 mb-1">Progetto</label>
                        <select id="filter-project" class="cr-input">
                            <option value="">Tutti i Siti</option>
                        </select>
                    </div>
                    <div>
                        <label for="filter-worktype" class="block text-sm font-semibold text-surface-600 mb-1">Tipo di Lavoro</label>
                        <select id="filter-worktype" class="cr-input">
                            <option value="">Tutti i Tipi di Lavoro</option>
                        </select>
                    </div>
                </div>

                <!-- Opzioni -->
                <div class="flex flex-wrap gap-6">
                    <div class="flex items-center gap-2">
                        <input type="checkbox" id="only-unreported" class="w-4 h-4 text-indigo-600 rounded border-surface-300 focus:ring-indigo-500" checked>
                        <label for="only-unreported" class="text-sm text-surface-600">Solo timer non reportati</label>
                    </div>
                    <div class="flex items-center gap-2">
                        <input type="checkbox" id="include-hourly-rate" class="w-4 h-4 text-indigo-600 rounded border-surface-300 focus:ring-indigo-500">
                        <label for="include-hourly-rate" class="text-sm text-surface-600">Includi Tariffa Oraria</label>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ SEZIONE 3: Anteprima & Genera ═══ -->
        <div class="cr-card mb-5 overflow-hidden">
            <div class="px-5 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <span class="font-semibold flex items-center gap-2"><i class="fas fa-eye"></i> Anteprima</span>
            </div>
            <div class="p-5 space-y-4">
                <!-- KPI Stat Cards -->
                <div class="rw-stats-grid" id="rw-stats-grid">
                    <div class="rw-stat-card stat-hours">
                        <div class="rw-stat-icon"><i class="fas fa-clock"></i></div>
                        <div class="rw-stat-label">Ore Totali</div>
                        <div class="rw-stat-value" id="rw-stat-hours">—</div>
                    </div>
                    <div class="rw-stat-card stat-amount">
                        <div class="rw-stat-icon"><i class="fas fa-euro-sign"></i></div>
                        <div class="rw-stat-label">Importo Totale</div>
                        <div class="rw-stat-value" id="rw-stat-amount">—</div>
                    </div>
                    <div class="rw-stat-card stat-count">
                        <div class="rw-stat-icon"><i class="fas fa-layer-group"></i></div>
                        <div class="rw-stat-label">Timer</div>
                        <div class="rw-stat-value" id="rw-stat-count">—</div>
                    </div>
                </div>

                <!-- Preview Table -->
                <div id="rw-preview-container">
                    <div class="rw-empty-preview">
                        <i class="fas fa-search"></i>
                        <p>Seleziona periodo e cliente per vedere l'anteprima</p>
                    </div>
                </div>

                <!-- Pulsante Genera -->
                <div class="flex justify-end pt-2">
                    <button type="submit" id="rw-generate-btn" class="cr-btn bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold shadow-md px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                        <i class="fas fa-file-alt mr-2"></i>Genera Report
                    </button>
                </div>
            </div>
        </div>

    </form>
</div>

<!-- Modal per visualizzare il report -->
<div class="modal fade" id="reportModal" tabindex="-1" role="dialog" aria-labelledby="reportModalLabel" aria-hidden="true" style="display:none;">
  <div class="fixed inset-0 bg-black/50 flex items-start justify-center pt-4 sm:pt-10 px-0 sm:px-4 z-50">
    <div class="bg-white sm:rounded-xl shadow-2xl w-full sm:max-w-5xl max-h-[100vh] sm:max-h-[85vh] overflow-y-auto">
      <div class="px-5 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white flex justify-between items-center rounded-t-xl sticky top-0 z-10">
        <span class="font-semibold flex items-center gap-2" id="reportModalLabel"><i class="fas fa-file-alt"></i> Report Generato</span>
        <button type="button" class="text-white/80 hover:text-white text-xl" data-cr-dismiss="modal" aria-label="Chiudi">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="p-5">
        <div id="report-content" style="display: none;">
            <div id="report-header-display" class="text-center mb-4"></div>
            <table class="w-full text-sm border-collapse">
                <thead class="bg-surface-800 text-white text-xs uppercase"></thead>
                <tbody id="report-table-body" class="divide-y divide-surface-100"></tbody>
            </table>
            <table class="text-sm border-collapse mt-4 ml-auto" style="max-width: 300px;">
                <thead class="bg-surface-800 text-white text-xs uppercase">
                    <tr>
                        <th colspan="2" class="text-center">Riepilogo Totali</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Totale Ore</strong></td>
                        <td><span id="total-hours">0.00</span> h</td>
                    </tr>
                    <tr>
                        <td><strong>Totale Importo</strong></td>
                        <td>€ <span id="total-amount">0.00</span></td>
                    </tr>
                </tbody>
            </table>
            <div class="text-center">
                <button id="download-pdf-btn" class="cr-btn bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-md mr-2">
                    <i class="fas fa-file-pdf mr-2"></i>Scarica PDF
                </button>
                <button id="export-google-doc-btn" class="cr-btn bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold shadow-md mr-2">
                    <i class="fab fa-google-drive mr-2"></i>Google Docs
                </button>
                <button id="export-google-sheet-btn" class="cr-btn bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold shadow-md">
                    <i class="fab fa-google-drive mr-2"></i>Google Sheets
                </button>
            </div>
        </div>
      </div>
    </div>
  </div>
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

// Caricamento filtri
export function loadClients(selectElement) {
    selectElement.innerHTML = '<option value="">--Seleziona Cliente--</option>';
    return db.collection('clients')
        .where('uid', '==', currentUser.uid)
        .orderBy('name')
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const client = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = client.name;
                selectElement.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Errore nel caricamento dei clienti:', error);
            return Promise.reject(error);
        });
}

export function loadProjects(selectElement, selectedClientId) {
    selectElement.innerHTML = '<option value="">--Seleziona Sito--</option>';
    let query = db.collection('projects')
        .where('uid', '==', currentUser.uid)
        .where('clientId', '==', selectedClientId)
        .orderBy('name');

    return query.get()
        .then(snapshot => {
            if (snapshot.empty) {
                selectElement.disabled = true;
            } else {
                selectElement.disabled = false;
                snapshot.forEach(doc => {
                    const site = doc.data();
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = site.name;
                    selectElement.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Errore nel caricamento dei siti:', error);
            throw error;
        });
}

export function loadWorktypes(selectElement, selectedClientId) {
    selectElement.innerHTML = '<option value="">--Seleziona Tipo di Lavoro--</option>';
    let query = db.collection('worktypes')
        .where('uid', '==', currentUser.uid)
        .where('clientId', '==', selectedClientId)
        .orderBy('name');

    return query.get()
        .then(snapshot => {
            if (snapshot.empty) {
                selectElement.disabled = true;
            } else {
                selectElement.disabled = false;
                snapshot.forEach(doc => {
                    const worktype = doc.data();
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = worktype.name;
                    selectElement.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Errore nel caricamento dei tipi di lavoro:', error);
            throw error;
        });
}

// Funzione per caricare le configurazioni salvate
export function loadSavedConfigs() {
    const savedConfigSelect = document.getElementById('saved-config-select');
    const deleteConfigBtn = document.getElementById('delete-config-btn');

    savedConfigSelect.innerHTML = '<option value="">-- Seleziona una configurazione --</option>';
    deleteConfigBtn.style.display = 'none';
    db.collection('reportConfigs')
        .where('uid', '==', currentUser.uid)
        .orderBy('timestamp', 'desc')
        .get()
        .then(snapshot => {
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
        })
        .catch(error => {
            console.error('Errore nel caricamento delle configurazioni salvate:', error);
            Swal.fire({
                icon: 'error',
                title: 'Errore',
                text: 'Si è verificato un errore durante il caricamento delle configurazioni salvate.',
                confirmButtonText: 'OK'
            });
        });
}

// Funzione per salvare una configurazione
export function saveReportConfig(config) {
    db.collection('reportConfigs').add({
        uid: currentUser.uid,
        name: config.name,
        reportHeader: config.reportHeader,
        companyLogoBase64: config.companyLogoBase64,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'Configurazione Salvata',
            text: 'La configurazione è stata salvata con successo.',
            confirmButtonText: 'OK'
        });
        loadSavedConfigs();
        document.getElementById('config-name').value = '';
    }).catch(error => {
        console.error('Errore nel salvataggio della configurazione:', error);
        Swal.fire({
            icon: 'error',
            title: 'Errore',
            text: 'Si è verificato un errore durante il salvataggio della configurazione.',
            confirmButtonText: 'OK'
        });
    });
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

// Funzione per generare PDF — Template Ultra Pro
export function generatePDF(reportHeader, reportData, totalHours, totalAmount, companyLogoBase64, reportFileName, includeHourlyRate) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); // Portrait A4

    // === CONFIG CENTRALIZZATA ===
    const cfg = {
        colors: {
            primary: [79, 70, 229],      // Indigo 600
            primaryLight: [238, 242, 255], // Indigo 50
            dark: [30, 41, 59],           // Slate 800
            medium: [100, 116, 139],      // Slate 500
            light: [241, 245, 249],       // Slate 100
            white: [255, 255, 255],
            accent: [16, 185, 129],       // Emerald 500
        },
        page: {
            width: doc.internal.pageSize.getWidth(),   // 210
            height: doc.internal.pageSize.getHeight(),  // 297
            marginLeft: 15,
            marginRight: 15,
            marginTop: 35,    // Spazio per header
            marginBottom: 25, // Spazio per footer
        },
        font: {
            titleSize: 14,
            subtitleSize: 10,
            bodySize: 9,
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
        // Linea accent in alto
        doc.setFillColor(...cfg.colors.primary);
        doc.rect(0, 0, cfg.page.width, 3, 'F');

        // Titolo report
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(cfg.font.titleSize);
        doc.setTextColor(...cfg.colors.dark);
        doc.text(reportHeader, cfg.page.marginLeft, 15);

        // Data generazione
        const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(cfg.font.smallSize);
        doc.setTextColor(...cfg.colors.medium);
        doc.text(`Generato il ${today}`, cfg.page.marginLeft, 21);

        // Linea separatrice sottile
        doc.setDrawColor(...cfg.colors.primary);
        doc.setLineWidth(0.5);
        doc.line(cfg.page.marginLeft, 25, cfg.page.width - cfg.page.marginRight, 25);
    }

    function drawFooter(doc, pageNum) {
        const y = cfg.page.height - 10;
        // Linea separatrice
        doc.setDrawColor(...cfg.colors.light);
        doc.setLineWidth(0.3);
        doc.line(cfg.page.marginLeft, y - 5, cfg.page.width - cfg.page.marginRight, y - 5);

        // CronoReport branding
        doc.setFontSize(cfg.font.smallSize);
        doc.setTextColor(...cfg.colors.medium);
        doc.setFont('helvetica', 'italic');
        doc.text('CronoReport', cfg.page.marginLeft, y);

        // Numero pagina (placeholder — aggiornato dopo)
        doc.setFont('helvetica', 'normal');
        doc.text(`Pagina ${pageNum}`, cfg.page.width - cfg.page.marginRight, y, { align: 'right' });
    }

    // === COSTRUZIONE TABELLA ===
    const tableColumn = ["Data", "Tipo di Lavoro"];
    if (includeHourlyRate) tableColumn.push("Tariffa (€/h)");
    tableColumn.push("Link", "Ore", "Importo (€)");

    const linkColumnIndex = includeHourlyRate ? 3 : 2;

    const tableRows = [];
    reportData.forEach(item => {
        const rowData = [item.date, item.workType];
        if (includeHourlyRate) rowData.push(item.hourlyRate);
        rowData.push('', item.timeWorked, `€ ${item.amount}`);
        tableRows.push(rowData);
    });

    // === Prima pagina: Logo + Header ===
    let tableStartY = cfg.page.marginTop;

    if (companyLogoBase64) {
        const img = new Image();
        img.src = companyLogoBase64;
        img.onload = function() {
            drawHeader(doc);
            const logoH = 12;
            const logoW = (img.width * logoH) / img.height;
            doc.addImage(companyLogoBase64, 'PNG', cfg.page.width - cfg.page.marginRight - logoW, 8, logoW, logoH);
            buildTable(tableStartY);
        };
    } else {
        drawHeader(doc);
        buildTable(tableStartY);
    }

    function buildTable(startY) {
        // Tabella principale
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: startY,
            margin: { left: cfg.page.marginLeft, right: cfg.page.marginRight, top: cfg.page.marginTop, bottom: cfg.page.marginBottom },
            styles: {
                fontSize: cfg.font.bodySize,
                cellPadding: 3,
                overflow: 'linebreak',
                lineColor: cfg.colors.light,
                lineWidth: 0.3,
                textColor: cfg.colors.dark,
            },
            headStyles: {
                fillColor: cfg.colors.primary,
                textColor: cfg.colors.white,
                fontStyle: 'bold',
                fontSize: 8,
                halign: 'left',
            },
            alternateRowStyles: {
                fillColor: cfg.colors.primaryLight,
            },
            columnStyles: {},
            // Hook: link ipertestuali nel PDF
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === linkColumnIndex) {
                    data.cell.text = '';
                }
            },
            didDrawCell: function(data) {
                if (data.section === 'body' && data.column.index === linkColumnIndex) {
                    const link = reportData[data.row.index]?.link;
                    if (link) {
                        doc.setTextColor(79, 70, 229); // Indigo
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
            // Hook: header/footer su ogni nuova pagina
            didDrawPage: function(data) {
                if (data.pageNumber > 1) {
                    drawHeader(doc);
                }
            },
        });

        // === RIEPILOGO TOTALI ===
        const lastAutoTable = doc.lastAutoTable;
        let currentY = lastAutoTable ? lastAutoTable.finalY + 10 : startY + 10;

        // Controlla se c'è spazio, altrimenti nuova pagina
        if (currentY + 40 > cfg.page.height - cfg.page.marginBottom) {
            doc.addPage();
            drawHeader(doc);
            currentY = cfg.page.marginTop;
        }

        const boxWidth = 90;
        const boxX = cfg.page.width - cfg.page.marginRight - boxWidth;
        const boxY = currentY;
        const boxHeight = 32;

        // Box sfondo
        doc.setFillColor(...cfg.colors.light);
        doc.setDrawColor(...cfg.colors.primary);
        doc.setLineWidth(0.5);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'FD');

        // Titolo riepilogo
        doc.setFillColor(...cfg.colors.primary);
        doc.roundedRect(boxX, boxY, boxWidth, 8, 2, 2, 'F');
        // Rettangolo per coprire angoli arrotondati inferiori del titolo
        doc.rect(boxX, boxY + 5, boxWidth, 3, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...cfg.colors.white);
        doc.text('RIEPILOGO TOTALI', boxX + boxWidth / 2, boxY + 5.5, { align: 'center' });

        // Contenuto riepilogo
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...cfg.colors.dark);

        const formattedHours = formatHoursToHMS(totalHours);

        doc.setFont('helvetica', 'bold');
        doc.text('Totale Ore:', boxX + 5, boxY + 16);
        doc.setFont('helvetica', 'normal');
        doc.text(formattedHours, boxX + boxWidth - 5, boxY + 16, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.text('Totale Importo:', boxX + 5, boxY + 24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...cfg.colors.accent);
        doc.text(`€ ${totalAmount.toFixed(2)}`, boxX + boxWidth - 5, boxY + 24, { align: 'right' });

        // === NUMERI DI PAGINA (X di Y) — Loop finale ===
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

export function createGoogleDoc(reportContent, fileName) {
    gapi.client.docs.documents.create({
        title: fileName
    }).then((response) => {
        const documentId = response.result.documentId;
        insertContentIntoDoc(documentId, reportContent);
    }, (error) => {
        console.error('Errore durante la creazione del documento:', error);
    });
}

export function insertContentIntoDoc(documentId, reportContent) {
    const requests = [{
        insertText: {
            location: { index: 1 },
            text: reportContent
        }
    }];

    gapi.client.docs.documents.batchUpdate({
        documentId: documentId,
        requests: requests
    }).then((response) => {
        console.log('Contenuto inserito nel documento:', response);
        window.open(`https://docs.google.com/document/d/${documentId}/edit`, '_blank');
    }, (error) => {
        console.error('Errore durante l\'inserimento del contenuto:', error);
    });
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

export function createGoogleSheet(reportValues, fileName) {
    gapi.client.sheets.spreadsheets.create({
        properties: { title: fileName }
    }).then((response) => {
        const spreadsheetId = response.result.spreadsheetId;
        const sheetName = response.result.sheets[0].properties.title;
        insertDataIntoSheet(spreadsheetId, sheetName, reportValues);
    }, (error) => {
        console.error('Errore durante la creazione del foglio di calcolo:', error);
    });
}

export function insertDataIntoSheet(spreadsheetId, sheetName, reportValues) {
    const range = `${sheetName}!A1`;

    gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        values: reportValues
    }).then((response) => {
        console.log('Dati inseriti nel foglio di calcolo:', response);
        window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, '_blank');
    }, (error) => {
        console.error('Errore durante l\'inserimento dei dati:', error);
    });
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



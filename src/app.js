// src/app.js — Entry point per Vite
// Importa tutti i moduli nell'ordine corretto.
// Le dipendenze CDN (Firebase, SweetAlert2, Chart.js, etc.) restano globali.
// Le variabili condivise (DEV_MODE, auth, db, currentUser) sono su window
// (dichiarate nell'inline script non-module in index.html).

// Firebase GAPI/GIS initialization
import '../firebaseConfig.js';

// UI Components (CrModal, CrTabs, CrCollapse)
import '../uiComponents.js';

// Theme Configuration (SweetAlert2, Chart.js, Flatpickr)
import '../themeConfig.js';

// Mock data in DEV MODE
import '../devData.js';

// Feature modules
import '../dashboard.js';
import '../reportConfig.js';
import '../reportEvents.js';
import '../reportHistory.js';
import '../savedTimersUI.js';
import '../savedTimersData.js';
import '../savedTimersEvents.js';
import '../recycleBinTimers.js';
import '../recycleBinReports.js';
import '../timer.js';
import '../menu.js';
import '../templates.js';

// Main orchestrator (deve essere ultimo — usa tutto il resto)
import '../main.js';

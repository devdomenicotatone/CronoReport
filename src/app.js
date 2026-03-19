// src/app.js — Entry point per Vite
// Importa tutti i moduli nell'ordine corretto.
// Le dipendenze CDN (Firebase, SweetAlert2, Chart.js, etc.) restano globali.
// Le variabili condivise (DEV_MODE, auth, db, currentUser) sono su window
// (dichiarate nell'inline script non-module in index.html).

// Firebase GAPI/GIS initialization
import './core/firebaseConfig.js';

// UI Components (CrModal, CrTabs, CrCollapse)
import './ui/uiComponents.js';

// Theme Configuration (SweetAlert2, Chart.js, Flatpickr)
import './core/themeConfig.js';

// Mock data in DEV MODE
import '../devData.js';

// Feature modules
import './dashboard/dashboard.js';
import './report/reportConfig.js';
import './report/reportEvents.js';
import './report/reportHistory.js';
import './saved-timers/savedTimersUI.js';
import './saved-timers/savedTimersData.js';
import './saved-timers/savedTimersEvents.js';
import './recycle-bin/recycleBinTimers.js';
import './recycle-bin/recycleBinReports.js';
import './timer/timerHelpers.js';
import './timer/timerWidgets.js';
import './timer/timerCard.js';
import './timer/timerCrud.js';
import './timer/timerInit.js';
import './pages/menu.js';
import './ui/templates.js';

// Main orchestrator (deve essere ultimo — usa tutto il resto)
import './pages/main.js';

// main.js — Orchestratore: Auth + Routing
// DEV_MODE, auth, db sono definiti globalmente in index.html — accesso centralizzato via appState.js
import { dataManagementTemplate, timerTemplate } from '../ui/templates.js';
import { initializeMenu, updateUserDisplay, setActiveNav } from './menu.js';
import { initializeTimerEvents } from '../timer/timerInit.js';
import { savedTimersTemplate, initializeSavedTimersSection } from '../saved-timers/savedTimersUI.js';
import { initializeSavedTimersEvents } from '../saved-timers/savedTimersEvents.js';
import { initializeRecycleBinTimersEvents } from '../recycle-bin/recycleBinTimers.js';
import { initializeRecycleBinReportsEvents, recycleBinTemplate } from '../recycle-bin/recycleBinReports.js';
import { reportTemplate } from '../report/reportConfig.js';
import { initializeReportEvents } from '../report/reportEvents.js';
import { reportHistoryTemplate, initializeReportHistoryEvents } from '../report/reportHistory.js';
import { dashboardTemplate, initializeDashboardEvents } from '../dashboard/dashboard.js';
import { CrTabs } from '../ui/uiComponents.js';
import { setCurrentUser } from '../core/appState.js';
import { initializeDataManagementEvents } from '../data/dataManagement.js';

if (DEV_MODE) {
    // Fake user per sviluppo
    setCurrentUser({
        uid: 'dev-user-001',
        displayName: 'Dev User',
        email: 'dev@cronoreport.local',
        photoURL: null
    });
    console.log('%c🚀 DEV MODE ATTIVO — Login bypassato', 'color: #10b981; font-weight: bold; font-size: 14px;');

    // Defer: i template (const) sono dichiarati più avanti nel file
    setTimeout(() => {
        if (typeof updateUserDisplay === 'function') {
            updateUserDisplay(currentUser);
        }
        const savedSection = location.hash.replace('#', '') || 'timer';
        loadSection(savedSection);
        setActiveNav(savedSection);
    }, 0);

    // Preveni qualsiasi redirect da Firebase auth
    auth.onAuthStateChanged(() => {
        // No-op in dev mode — ignora lo stato auth
    });
} else {
    // Listener per lo stato di autenticazione (PRODUCTION)
    auth.onAuthStateChanged((user) => {
        if (user) {
            setCurrentUser(user);

            // Update user display in navbar
            if (typeof updateUserDisplay === 'function') {
                updateUserDisplay(user);
            }

            const savedSection = location.hash.replace('#', '') || 'timer';
            loadSection(savedSection);
            setActiveNav(savedSection);

        } else {
            setCurrentUser(null);
            window.location.href = 'login.html';
        }
    });
}

/**
 * Funzione per caricare le sezioni in base al menu
 * @param {string} section - Nome della sezione da caricare
 */
export function loadSection(section) {
    // Save scroll position of previous section before switching
    const prevSection = location.hash.replace('#', '');
    if (prevSection) {
        sessionStorage.setItem(`cr-scroll-${prevSection}`, window.scrollY.toString());
    }

    const contentSection = document.getElementById('content-section');
    contentSection.innerHTML = ''; // Svuota la sezione di contenuto

    switch (section) {
        case 'data-management':
            contentSection.innerHTML = dataManagementTemplate;
            initializeDataManagementEvents();
            break;
        case 'timer':
            contentSection.innerHTML = timerTemplate;
            initializeTimerEvents();
            break;
        case 'saved-timers':
            contentSection.innerHTML = savedTimersTemplate;
            if (currentUser) {
                initializeSavedTimersEvents();
            } else {
                console.error("currentUser non definito, impossibile inizializzare saved timers.");
            }
            break;
        case 'recycle-bin':
            contentSection.innerHTML = recycleBinTemplate;
            CrTabs.init('#recycleBinTabs');
            initializeRecycleBinTimersEvents();
            initializeRecycleBinReportsEvents();
            break;
        case 'report':
            contentSection.innerHTML = reportTemplate;
            initializeReportEvents();
            break;
        case 'report-history':
            contentSection.innerHTML = reportHistoryTemplate;
            initializeReportHistoryEvents();
            break;
        case 'dashboard':
            initializeDashboardEvents();
            break;
        default:
            contentSection.innerHTML = '<p>Sezione non trovata.</p>';
    }

    // Save current section to hash for persistence
    location.hash = section;

    // Restore scroll position after a small delay
    requestAnimationFrame(() => {
        const savedScroll = sessionStorage.getItem(`cr-scroll-${section}`);
        if (savedScroll) {
            window.scrollTo(0, parseInt(savedScroll, 10));
        } else {
            window.scrollTo(0, 0);
        }
    });
}

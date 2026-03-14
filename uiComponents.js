/**
 * uiComponents.js — Vanilla JS UI components (replaces jQuery + Bootstrap JS)
 * Provides: CrModal, CrCollapse, CrTabs
 */

// ============================================
// CrModal — Lightweight modal manager
// ============================================
const CrModal = {
    show(idOrEl) {
        const modal = typeof idOrEl === 'string' ? document.getElementById(idOrEl) || document.querySelector(idOrEl) : idOrEl;
        if (!modal) return;
        modal.classList.add('show');
        modal.style.display = 'flex';
        modal.removeAttribute('aria-hidden');
        document.body.style.overflow = 'hidden';
        // Backdrop click to close
        modal._backdropHandler = modal._backdropHandler || function (e) {
            if (e.target === modal) CrModal.hide(modal);
        };
        modal.addEventListener('click', modal._backdropHandler);
        // ESC key to close
        modal._escHandler = modal._escHandler || function (e) {
            if (e.key === 'Escape') CrModal.hide(modal);
        };
        document.addEventListener('keydown', modal._escHandler);
    },

    hide(idOrEl) {
        const modal = typeof idOrEl === 'string' ? document.getElementById(idOrEl) || document.querySelector(idOrEl) : idOrEl;
        if (!modal) return;
        modal.classList.remove('show');
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (modal._backdropHandler) modal.removeEventListener('click', modal._backdropHandler);
        if (modal._escHandler) document.removeEventListener('keydown', modal._escHandler);
    },

    toggle(idOrEl) {
        const modal = typeof idOrEl === 'string' ? document.getElementById(idOrEl) || document.querySelector(idOrEl) : idOrEl;
        if (!modal) return;
        modal.classList.contains('show') ? CrModal.hide(modal) : CrModal.show(modal);
    }
};

// ============================================
// CrCollapse — Lightweight collapse/accordion
// ============================================
const CrCollapse = {
    toggle(el) {
        if (typeof el === 'string') el = document.querySelector(el);
        if (!el) return;
        el.classList.contains('cr-open') ? CrCollapse.hide(el) : CrCollapse.show(el);
    },

    show(el) {
        if (typeof el === 'string') el = document.querySelector(el);
        if (!el || el.classList.contains('cr-open')) return;
        el.classList.add('cr-open');
        el.style.display = 'block';
        el.dispatchEvent(new CustomEvent('cr:show'));
    },

    hide(el) {
        if (typeof el === 'string') el = document.querySelector(el);
        if (!el || !el.classList.contains('cr-open')) return;
        el.classList.remove('cr-open');
        el.style.display = 'none';
        el.dispatchEvent(new CustomEvent('cr:hide'));
    },

    showAll(parentSelector) {
        const parent = typeof parentSelector === 'string' ? document.querySelector(parentSelector) : parentSelector;
        if (!parent) return;
        parent.querySelectorAll('.cr-collapsible').forEach(el => CrCollapse.show(el));
    },

    hideAll(parentSelector) {
        const parent = typeof parentSelector === 'string' ? document.querySelector(parentSelector) : parentSelector;
        if (!parent) return;
        parent.querySelectorAll('.cr-collapsible').forEach(el => CrCollapse.hide(el));
    }
};

// ============================================
// CrTabs — Lightweight tab switcher
// ============================================
const CrTabs = {
    init(containerSelector) {
        const container = typeof containerSelector === 'string' ? document.querySelector(containerSelector) : containerSelector;
        if (!container) return;

        const tabs = container.querySelectorAll('[data-cr-tab]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-cr-tab');
                CrTabs.activate(container, target);
            });
        });
    },

    activate(container, targetId) {
        if (typeof container === 'string') container = document.querySelector(container);
        if (!container) return;

        // Deactivate all tabs
        container.querySelectorAll('[data-cr-tab]').forEach(t => {
            t.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-500', 'bg-white', 'shadow-sm');
            t.classList.add('text-surface-500');
        });

        // Hide all panels — search in parent or document
        const panelContainer = container.parentElement || document;
        panelContainer.querySelectorAll('[data-cr-panel]').forEach(p => {
            p.style.display = 'none';
        });

        // Activate clicked tab
        const activeTab = container.querySelector(`[data-cr-tab="${targetId}"]`);
        if (activeTab) {
            activeTab.classList.remove('text-surface-500');
            activeTab.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-500', 'bg-white', 'shadow-sm');
        }

        // Show target panel
        const panel = document.getElementById(targetId);
        if (panel) panel.style.display = 'block';
    }
};

// ============================================
// Delegated event listeners (global)
// ============================================
document.addEventListener('click', function (e) {
    // Modal dismiss buttons
    const dismissBtn = e.target.closest('[data-cr-dismiss="modal"]');
    if (dismissBtn) {
        const modal = dismissBtn.closest('.modal');
        if (modal) CrModal.hide(modal);
    }

    // Collapse toggle buttons
    const collapseBtn = e.target.closest('[data-cr-toggle="collapse"]');
    if (collapseBtn) {
        const target = collapseBtn.getAttribute('data-cr-target');
        if (target) CrCollapse.toggle(target);
    }
});

// === VITE MODULE: Registra globals ===
window.CrModal = CrModal;
window.CrCollapse = CrCollapse;
window.CrTabs = CrTabs;

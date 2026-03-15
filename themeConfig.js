/**
 * themeConfig.js — Configurazione globale tema librerie esterne
 * 
 * Personalizza SweetAlert2, Flatpickr e Chart.js per match design system.
 */

// ==========================================
//  SWEETALERT2 — Tema CronoReport
// ==========================================
if (typeof Swal !== 'undefined') {
    const crSwalDefaults = Swal.mixin({
        customClass: {
            popup: 'cr-swal-popup',
            title: 'cr-swal-title',
            htmlContainer: 'cr-swal-text',
            confirmButton: 'cr-swal-confirm',
            cancelButton: 'cr-swal-cancel',
            actions: 'cr-swal-actions',
        },
        buttonsStyling: false,           // Disattiva stili default, usa i nostri
        confirmButtonText: 'OK',
        cancelButtonText: 'Annulla',
        reverseButtons: true,            // Cancel a sinistra, Confirm a destra
        showClass: {
            popup: 'animate__animated animate__fadeInUp animate__faster'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutDown animate__faster'
        }
    });

    // Override globale di Swal.fire
    window._originalSwal = Swal;
    window.Swal = {
        fire: function (...args) {
            return crSwalDefaults.fire(...args);
        },
        mixin: Swal.mixin.bind(Swal),
        close: Swal.close.bind(Swal),
        isVisible: Swal.isVisible.bind(Swal),
        getPopup: Swal.getPopup.bind(Swal),
    };
}

// ==========================================
//  CHART.JS — Palette CronoReport
// ==========================================
if (typeof Chart !== 'undefined') {
    // Palette colori design system
    const CR_CHART_COLORS = {
        indigo: 'rgba(99, 102, 241, 1)',
        indigoLight: 'rgba(99, 102, 241, 0.15)',
        violet: 'rgba(139, 92, 246, 1)',
        violetLight: 'rgba(139, 92, 246, 0.15)',
        emerald: 'rgba(16, 185, 129, 1)',
        emeraldLight: 'rgba(16, 185, 129, 0.15)',
        amber: 'rgba(245, 158, 11, 1)',
        amberLight: 'rgba(245, 158, 11, 0.15)',
        rose: 'rgba(244, 63, 94, 1)',
        roseLight: 'rgba(244, 63, 94, 0.15)',
        sky: 'rgba(14, 165, 233, 1)',
        skyLight: 'rgba(14, 165, 233, 0.15)',
        slate: 'rgba(100, 116, 139, 1)',
        slateLight: 'rgba(100, 116, 139, 0.15)',
    };

    // Palette per dataset multipli — esportata globalmente perché usata da dashboard charts
    window.CR_CHART_COLORS = CR_CHART_COLORS;
    window.CR_CHART_PALETTE = [
        CR_CHART_COLORS.indigo, CR_CHART_COLORS.emerald,
        CR_CHART_COLORS.amber, CR_CHART_COLORS.rose,
        CR_CHART_COLORS.violet, CR_CHART_COLORS.sky,
        CR_CHART_COLORS.slate,
    ];
    window.CR_CHART_PALETTE_LIGHT = [
        CR_CHART_COLORS.indigoLight, CR_CHART_COLORS.emeraldLight,
        CR_CHART_COLORS.amberLight, CR_CHART_COLORS.roseLight,
        CR_CHART_COLORS.violetLight, CR_CHART_COLORS.skyLight,
        CR_CHART_COLORS.slateLight,
    ];

    // Default globali Chart.js
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.font.size = 13;
    Chart.defaults.color = '#64748b';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.tooltip.backgroundColor = '#1e293b';
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
    Chart.defaults.elements.bar.borderRadius = 6;
    Chart.defaults.elements.line.tension = 0.3;
    Chart.defaults.elements.point.radius = 4;
    Chart.defaults.elements.point.hoverRadius = 6;
}

console.log('%c🎨 Theme Config caricato', 'color: #8b5cf6; font-weight: bold;');

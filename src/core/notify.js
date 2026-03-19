// notify.js — Wrapper centralizzato per SweetAlert2
// Elimina le 50+ chiamate Swal.fire() sparse con configurazioni ripetute.

const BASE_OPTS = {
    confirmButtonColor: '#6366f1',
    cancelButtonColor: '#64748b',
};

/** Notifica successo (auto-dismiss dopo 2s) */
export function success(title, text, opts = {}) {
    return Swal.fire({
        icon: 'success',
        title,
        text,
        timer: opts.timer ?? 2000,
        showConfirmButton: opts.showConfirmButton ?? false,
        ...BASE_OPTS,
        ...opts,
    });
}

/** Notifica errore */
export function error(title, text, opts = {}) {
    return Swal.fire({
        icon: 'error',
        title,
        text,
        confirmButtonText: 'OK',
        ...BASE_OPTS,
        ...opts,
    });
}

/** Notifica avviso */
export function warning(title, text, opts = {}) {
    return Swal.fire({
        icon: 'warning',
        title,
        text,
        confirmButtonText: 'OK',
        ...BASE_OPTS,
        ...opts,
    });
}

/** Notifica informativa */
export function info(title, text, opts = {}) {
    return Swal.fire({
        icon: 'info',
        title,
        text,
        confirmButtonText: 'OK',
        ...BASE_OPTS,
        ...opts,
    });
}

/** Dialogo di conferma — restituisce true se confermato */
export async function confirm(title, text, opts = {}) {
    const result = await Swal.fire({
        title,
        text,
        icon: opts.icon ?? 'warning',
        showCancelButton: true,
        confirmButtonText: opts.confirmText ?? 'Sì, conferma',
        cancelButtonText: opts.cancelText ?? 'Annulla',
        confirmButtonColor: opts.confirmColor ?? '#ef4444',
        cancelButtonColor: opts.cancelColor ?? '#64748b',
        ...opts,
    });
    return result.isConfirmed;
}

/** Toast leggero (angolo in alto) */
export function toast(title, icon = 'success') {
    return Swal.fire({
        toast: true,
        position: 'top-end',
        icon,
        title,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
    });
}

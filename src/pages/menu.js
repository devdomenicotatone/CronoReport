// menu.js — Vanilla JS (no jQuery)

/**
 * Initialize all menu functionality: sidebar nav, bottom nav, more menu, logout
 */
export function initializeMenu() {
    // === Sidebar Navigation (Desktop) ===
    const sidebarLinks = document.querySelectorAll('#sidebar-nav .nav-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            if (section) {
                const m = await import('./main.js');
                m.loadSection(section);
                setActiveNav(section);
            }
        });
    });

    // === Bottom Navigation (Mobile) ===
    const bottomLinks = document.querySelectorAll('#bottom-nav .bottom-nav-link');
    bottomLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            if (section) {
                const m = await import('./main.js');
                m.loadSection(section);
                setActiveNav(section);
                closeMoreMenu();
            }
        });
    });

    // === More Menu (Mobile) ===
    const moreBtn = document.getElementById('more-menu-btn');
    const morePopup = document.getElementById('more-menu-popup');

    if (moreBtn && morePopup) {
        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            morePopup.classList.toggle('hidden');
        });

        // Close more menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!morePopup.contains(e.target) && e.target !== moreBtn) {
                closeMoreMenu();
            }
        });

        // More menu links
        const moreLinks = morePopup.querySelectorAll('.more-nav-link');
        moreLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                if (section) {
                    const m = await import('./main.js');
                    m.loadSection(section);
                    setActiveNav(section);
                    closeMoreMenu();
                }
            });
        });
    }

    // === Logout ===
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await auth.signOut();
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Errore durante il logout:', error);
            }
        });
    }

    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await auth.signOut();
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Errore durante il logout:', error);
            }
        });
    }
}

/**
 * Close the mobile "More" popup menu
 */
export function closeMoreMenu() {
    const morePopup = document.getElementById('more-menu-popup');
    if (morePopup) {
        morePopup.classList.add('hidden');
    }
}

/**
 * Set the active navigation item across sidebar and bottom nav
 * @param {string} section - The section identifier
 */
export function setActiveNav(section) {
    // Update sidebar links
    document.querySelectorAll('#sidebar-nav .nav-link').forEach(link => {
        if (link.getAttribute('data-section') === section) {
            link.classList.add('active');
            link.classList.remove('text-white/60');
            link.classList.add('text-white', 'bg-brand-600/20');
        } else {
            link.classList.remove('active', 'text-white', 'bg-brand-600/20');
            link.classList.add('text-white/60');
        }
    });

    // Update bottom nav links
    document.querySelectorAll('#bottom-nav .bottom-nav-link').forEach(link => {
        if (link.getAttribute('data-section') === section) {
            link.classList.add('active');
            link.classList.remove('text-white/40');
            link.classList.add('text-brand-400');
        } else {
            link.classList.remove('active', 'text-brand-400');
            link.classList.add('text-white/40');
        }
    });

    // Update more menu links
    document.querySelectorAll('#more-menu-popup .more-nav-link').forEach(link => {
        if (link.getAttribute('data-section') === section) {
            link.classList.add('text-brand-400');
            link.classList.remove('text-white/60');
        } else {
            link.classList.remove('text-brand-400');
            link.classList.add('text-white/60');
        }
    });
}

/**
 * Update the user display info in sidebar and mobile header
 * @param {object} user - Firebase user object
 */
export function updateUserDisplay(user) {
    if (!user) return;

    const initial = (user.displayName || user.email || '?').charAt(0).toUpperCase();
    const name = user.displayName || user.email || 'Utente';

    const avatar = document.getElementById('user-avatar');
    const mobileAvatar = document.getElementById('mobile-user-avatar');
    const userName = document.getElementById('user-name');

    if (avatar) avatar.textContent = initial;
    if (mobileAvatar) mobileAvatar.textContent = initial;
    if (userName) userName.textContent = name;

    // If user has a photo, use it
    if (user.photoURL) {
        if (avatar) {
            avatar.innerHTML = `<img src="${user.photoURL}" alt="" class="w-8 h-8 rounded-full object-cover">`;
        }
        if (mobileAvatar) {
            mobileAvatar.innerHTML = `<img src="${user.photoURL}" alt="" class="w-7 h-7 rounded-full object-cover">`;
        }
    }
}

// The menu is now inline in index.html, so we just initialize directly
// Keep the loadMenu function for backwards compatibility
export function loadMenu() {
    initializeMenu();
}

// Alias for backwards compatibility
export function updateActiveMenuItem(section) {
    setActiveNav(section);
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeMenu();
});

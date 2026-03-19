// dataManagement.js — Gestione Dati: Clienti, Progetti, Tipi di Lavoro
// Estratto da main.js per Single Responsibility
import { invalidateColorCache } from '../core/clientColors.js';
import * as notify from '../core/notify.js';

let _currentDmFilter = 'active';

const DM_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#f59e0b',
    '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6b7280', '#1e293b'
];

export function initializeDataManagementEvents() {
    const addClientBtn = document.getElementById('add-client-btn');
    const newClientName = document.getElementById('new-client-name');
    const searchInput = document.getElementById('dm-search-input');

    // Add Client
    addClientBtn.addEventListener('click', async () => {
        const name = newClientName.value.trim();
        if (!name) {
            notify.warning('Attenzione', 'Inserisci un nome per il cliente.');
            return;
        }
        try {
            await db.collection('clients').add({
                name,
                uid: currentUser.uid,
                color: DM_COLORS[Math.floor(Math.random() * DM_COLORS.length)],
                isArchived: false,
                sortOrder: Date.now(),
                notes: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            newClientName.value = '';
            renderUnifiedClientAccordion(_currentDmFilter);
            notify.success('Cliente aggiunto!', `Il cliente "${name}" è stato aggiunto.`);
        } catch (error) {
            console.error('Errore:', error);
            notify.error('Errore', 'Si è verificato un errore.');
        }
    });

    // Search filter
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase();
            document.querySelectorAll('#dm-client-accordion .dm-client-card').forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(q) ? '' : 'none';
            });
        });
    }

    // Filter chips
    const filtersContainer = document.getElementById('dm-filters');
    if (filtersContainer) {
        filtersContainer.addEventListener('click', (e) => {
            const chip = e.target.closest('.dm-filter-chip');
            if (!chip) return;
            filtersContainer.querySelectorAll('.dm-filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            _currentDmFilter = chip.dataset.filter;
            renderUnifiedClientAccordion(_currentDmFilter);
        });
    }

    // Initial render
    renderUnifiedClientAccordion(_currentDmFilter);
}

/**
 * Render the unified client accordion with projects and worktypes nested
 */
export async function renderUnifiedClientAccordion(filter = 'active') {
    const container = document.getElementById('dm-client-accordion');
    if (!container) return;
    container.innerHTML = '';

    let totalClients = 0, totalProjects = 0, totalWorktypes = 0;

    try {
        const clientSnap = await db.collection('clients')
            .where('uid', '==', currentUser.uid)
            .orderBy('name')
            .get();

        // Filter by archived status
        let clientDocs = clientSnap.docs;
        if (filter === 'active') {
            clientDocs = clientDocs.filter(d => !d.data().isArchived);
        } else if (filter === 'archived') {
            clientDocs = clientDocs.filter(d => d.data().isArchived === true);
        }

        // Sort by sortOrder (if available), then name
        clientDocs.sort((a, b) => {
            const sa = a.data().sortOrder || 0;
            const sb = b.data().sortOrder || 0;
            if (sa !== sb) return sa - sb;
            return (a.data().name || '').localeCompare(b.data().name || '');
        });

        totalClients = clientDocs.length;

        for (const clientDoc of clientDocs) {
            const clientData = clientDoc.data();
            const clientId = clientDoc.id;
            const clientColor = clientData.color || '#6366f1';
            const isArchived = clientData.isArchived || false;

            // Fetch projects + worktypes in parallel
            const [projectsSnap, worktypesSnap] = await Promise.all([
                db.collection('projects').where('uid', '==', currentUser.uid).where('clientId', '==', clientId).orderBy('name').get(),
                db.collection('worktypes').where('uid', '==', currentUser.uid).where('clientId', '==', clientId).orderBy('name').get()
            ]);

            totalProjects += projectsSnap.size;
            totalWorktypes += worktypesSnap.size;

            // === BUILD CARD ===
            const card = document.createElement('div');
            card.className = 'dm-client-card';
            card.draggable = true;
            card.dataset.clientId = clientId;
            card.style.borderLeftColor = clientColor;
            if (isArchived) card.style.opacity = '0.6';

            // Header
            const header = document.createElement('div');
            header.className = 'dm-client-header';
            header.innerHTML = `
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <i class="fas fa-grip-vertical dm-drag-handle text-surface-300 cursor-grab text-xs" title="Trascina per riordinare"></i>
                    <div class="dm-color-dot" style="background:${clientColor};" title="Clicca per cambiare colore"></div>
                    <input class="dm-editable font-semibold" value="${clientData.name}" data-id="${clientId}" data-collection="clients" data-field="name" />
                </div>
                <div class="flex items-center gap-2">
                    <span class="dm-badge dm-badge-teal">${projectsSnap.size} progetti</span>
                    <span class="dm-badge dm-badge-amber">${worktypesSnap.size} tipi</span>
                    ${isArchived
                        ? `<button class="dm-action-btn dm-delete-hover" title="Ripristina"><i class="fas fa-undo text-xs text-emerald-500"></i></button>`
                        : `<button class="dm-action-btn dm-delete-hover" title="Archivia"><i class="fas fa-archive text-xs text-amber-500"></i></button>`
                    }
                    <button class="dm-action-btn dm-delete-hover" title="Elimina cliente"><i class="fas fa-trash-alt text-xs text-rose-400"></i></button>
                    <i class="fas fa-chevron-down chevron"></i>
                </div>
            `;

            // Color dot click → palette
            const colorDot = header.querySelector('.dm-color-dot');
            colorDot.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.dm-color-palette').forEach(p => p.remove());
                const palette = document.createElement('div');
                palette.className = 'dm-color-palette';
                DM_COLORS.forEach(color => {
                    const swatch = document.createElement('div');
                    swatch.className = 'dm-color-swatch';
                    swatch.style.background = color;
                    if (color === clientColor) swatch.classList.add('active');
                    swatch.addEventListener('click', async (ev) => {
                        ev.stopPropagation();
                        await db.collection('clients').doc(clientId).update({ color });
                        invalidateColorCache();
                        palette.remove();
                        renderUnifiedClientAccordion(_currentDmFilter);
                    });
                    palette.appendChild(swatch);
                });
                colorDot.closest('.dm-client-header').appendChild(palette);
                setTimeout(() => {
                    const close = (ev) => { if (!palette.contains(ev.target)) { palette.remove(); document.removeEventListener('click', close); } };
                    document.addEventListener('click', close);
                }, 10);
            });

            // Archive/Restore button
            const archiveBtn = header.querySelector(`button[title="${isArchived ? 'Ripristina' : 'Archivia'}"]`);
            archiveBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await db.collection('clients').doc(clientId).update({ isArchived: !isArchived });
                renderUnifiedClientAccordion(_currentDmFilter);
                notify.success(isArchived ? 'Ripristinato!' : 'Archiviato!', `"${clientData.name}" ${isArchived ? 'ripristinato' : 'archiviato'}.`);
            });

            // Delete client
            const delBtn = header.querySelector('button[title="Elimina cliente"]');
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await notify.confirm(
                    'Sei sicuro?',
                    `Vuoi eliminare il cliente "${clientData.name}"?`,
                    { confirmText: 'Sì, elimina!' }
                );
                if (confirmed) {
                    await db.collection('clients').doc(clientId).delete();
                    renderUnifiedClientAccordion(_currentDmFilter);
                    notify.success('Eliminato!', 'Il cliente è stato eliminato.');
                }
            });

            // Inline edit client name
            const nameInput = header.querySelector('.dm-editable');
            nameInput.addEventListener('click', (e) => e.stopPropagation());
            nameInput.addEventListener('blur', () => {
                const newName = nameInput.value.trim();
                if (newName && newName !== clientData.name) {
                    db.collection('clients').doc(clientId).update({ name: newName });
                }
            });

            // === DRAG & DROP ===
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', clientId);
                card.classList.add('dm-dragging');
            });
            card.addEventListener('dragend', () => card.classList.remove('dm-dragging'));
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                const dragging = container.querySelector('.dm-dragging');
                if (dragging && dragging !== card) {
                    const rect = card.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    if (e.clientY < midY) {
                        container.insertBefore(dragging, card);
                    } else {
                        container.insertBefore(dragging, card.nextSibling);
                    }
                }
            });
            card.addEventListener('drop', (e) => {
                e.preventDefault();
                const cards = container.querySelectorAll('.dm-client-card');
                cards.forEach((c, i) => {
                    const id = c.dataset.clientId;
                    if (id) db.collection('clients').doc(id).update({ sortOrder: i });
                });
            });

            // Toggle body
            const body = document.createElement('div');
            body.className = 'dm-client-body';
            header.addEventListener('click', () => {
                header.classList.toggle('open');
                body.classList.toggle('expanded');
            });

            // === PROJECTS SECTION (collapsible) ===
            const projectsSection = document.createElement('div');
            projectsSection.className = 'dm-sub-section';
            const projCount = projectsSnap.size;
            const projCollapsed = projCount > 3;
            projectsSection.innerHTML = `
                <div class="dm-sub-section-header${projCollapsed ? '' : ' open'}">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-folder-open text-xs"></i>
                        <span class="dm-sub-section-title" style="margin-bottom:0;">Progetti</span>
                        <span class="dm-badge dm-badge-teal">${projCount}</span>
                    </div>
                    <i class="fas fa-chevron-down dm-sub-chevron"></i>
                </div>
            `;
            const projBody = document.createElement('div');
            projBody.className = 'dm-sub-body' + (projCollapsed ? '' : ' expanded');

            if (projectsSnap.empty) {
                projBody.innerHTML = `<div class="dm-empty"><i class="fas fa-info-circle" style="margin-right:4px;"></i>Aggiungi un progetto per questo cliente (es. nome del sito)</div>`;
            } else {
                projectsSnap.forEach(projectDoc => {
                    const projectData = projectDoc.data();
                    const row = document.createElement('div');
                    row.className = 'dm-sub-item';
                    row.innerHTML = `
                        <input class="dm-editable flex-1" value="${projectData.name}" data-id="${projectDoc.id}" data-collection="projects" data-field="name" placeholder="Nome progetto" />
                        <input class="dm-editable dm-url-input" value="${projectData.url || ''}" data-id="${projectDoc.id}" data-collection="projects" data-field="url" placeholder="🔗 URL progetto..." />
                        <button class="delete-btn dm-delete-hover" title="Elimina progetto"><i class="fas fa-times"></i></button>
                    `;
                    row.querySelector('.delete-btn').addEventListener('click', async () => {
                        await db.collection('projects').doc(projectDoc.id).delete();
                        renderUnifiedClientAccordion(_currentDmFilter);
                    });
                    row.querySelectorAll('.dm-editable').forEach(inp => {
                        inp.addEventListener('blur', (e) => {
                            const field = e.target.dataset.field;
                            const v = e.target.value.trim();
                            const oldVal = field === 'url' ? (projectData.url || '') : projectData.name;
                            if (v !== oldVal) {
                                db.collection('projects').doc(projectDoc.id).update({ [field]: v });
                            }
                        });
                    });
                    projBody.appendChild(row);
                });
            }

            // Add project inline
            const addProjectRow = document.createElement('div');
            addProjectRow.className = 'dm-add-row';
            addProjectRow.innerHTML = `<input type="text" class="flex-1" placeholder="Es. sito-cliente.it" /><input type="text" class="dm-url-input" placeholder="🔗 URL progetto..." /><button class="dm-add-btn"><i class="fas fa-plus"></i></button>`;
            addProjectRow.querySelector('.dm-add-btn').addEventListener('click', async () => {
                const inputs = addProjectRow.querySelectorAll('input');
                const name = inputs[0].value.trim();
                const url = inputs[1].value.trim();
                if (!name) return;
                await db.collection('projects').add({
                    name, url, uid: currentUser.uid, clientId, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                renderUnifiedClientAccordion(_currentDmFilter);
            });
            projBody.appendChild(addProjectRow);
            projectsSection.appendChild(projBody);

            projectsSection.querySelector('.dm-sub-section-header').addEventListener('click', () => {
                projectsSection.querySelector('.dm-sub-section-header').classList.toggle('open');
                projBody.classList.toggle('expanded');
            });

            // === WORKTYPES SECTION (collapsible) ===
            const wtSection = document.createElement('div');
            wtSection.className = 'dm-sub-section';
            const wtCount = worktypesSnap.size;
            const wtCollapsed = wtCount > 3;
            wtSection.innerHTML = `
                <div class="dm-sub-section-header${wtCollapsed ? '' : ' open'}">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-tools text-xs"></i>
                        <span class="dm-sub-section-title" style="margin-bottom:0;">Tipi di Lavoro</span>
                        <span class="dm-badge dm-badge-amber">${wtCount}</span>
                    </div>
                    <i class="fas fa-chevron-down dm-sub-chevron"></i>
                </div>
            `;
            const wtBody = document.createElement('div');
            wtBody.className = 'dm-sub-body' + (wtCollapsed ? '' : ' expanded');

            if (worktypesSnap.empty) {
                wtBody.innerHTML = `<div class="dm-empty"><i class="fas fa-info-circle" style="margin-right:4px;"></i>Definisci come lavori per questo cliente (es. Sviluppo, Design, SEO...)</div>`;
            } else {
                worktypesSnap.forEach(wtDoc => {
                    const wtData = wtDoc.data();
                    const row = document.createElement('div');
                    row.className = 'dm-sub-item';
                    row.innerHTML = `
                        <input class="dm-editable flex-1" value="${wtData.name}" data-id="${wtDoc.id}" data-collection="worktypes" data-field="name" />
                        <input class="dm-editable" type="number" value="${wtData.hourlyRate || 0}" style="width:60px;text-align:right;" data-id="${wtDoc.id}" data-collection="worktypes" data-field="hourlyRate" />
                        <span class="text-xs text-surface-400 mr-1">€/h</span>
                        <button class="delete-btn dm-delete-hover" title="Elimina tipo"><i class="fas fa-times"></i></button>
                    `;
                    row.querySelector('.delete-btn').addEventListener('click', async () => {
                        await db.collection('worktypes').doc(wtDoc.id).delete();
                        renderUnifiedClientAccordion(_currentDmFilter);
                    });
                    row.querySelectorAll('.dm-editable').forEach(inp => {
                        inp.addEventListener('blur', () => {
                            const field = inp.dataset.field;
                            let val = inp.value.trim();
                            if (field === 'hourlyRate') val = parseFloat(val) || 0;
                            if (val !== '' && val !== (field === 'hourlyRate' ? wtData.hourlyRate : wtData.name)) {
                                db.collection('worktypes').doc(wtDoc.id).update({ [field]: val });
                            }
                        });
                    });
                    wtBody.appendChild(row);
                });
            }

            // Add worktype inline
            const addWtRow = document.createElement('div');
            addWtRow.className = 'dm-add-row';
            addWtRow.innerHTML = `
                <input type="text" class="flex-1" placeholder="Es. Sviluppo, Design, SEO..." />
                <input type="number" style="width:60px" placeholder="30" />
                <span class="text-xs text-surface-400" style="margin-right:2px;">€/h</span>
                <button class="dm-add-btn"><i class="fas fa-plus"></i></button>
            `;
            addWtRow.querySelector('.dm-add-btn').addEventListener('click', async () => {
                const inputs = addWtRow.querySelectorAll('input');
                const name = inputs[0].value.trim();
                const rate = parseFloat(inputs[1].value) || 0;
                if (!name) return;
                await db.collection('worktypes').add({
                    name, hourlyRate: rate, uid: currentUser.uid, clientId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                renderUnifiedClientAccordion(_currentDmFilter);
            });
            wtBody.appendChild(addWtRow);
            wtSection.appendChild(wtBody);

            wtSection.querySelector('.dm-sub-section-header').addEventListener('click', () => {
                wtSection.querySelector('.dm-sub-section-header').classList.toggle('open');
                wtBody.classList.toggle('expanded');
            });

            // === NOTES SECTION ===
            const notesSection = document.createElement('div');
            notesSection.className = 'dm-sub-section';
            const hasNotes = !!(clientData.notes && clientData.notes.trim());
            notesSection.innerHTML = `
                <div class="dm-sub-section-header open">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-sticky-note text-xs"></i>
                        <span class="dm-sub-section-title" style="margin-bottom:0;">Note</span>
                        ${hasNotes ? '<span class="dm-badge dm-badge-teal">1</span>' : ''}
                    </div>
                    <i class="fas fa-chevron-down dm-sub-chevron"></i>
                </div>
            `;
            const notesBody = document.createElement('div');
            notesBody.className = 'dm-sub-body expanded';
            const notesTextarea = document.createElement('textarea');
            notesTextarea.className = 'dm-notes-textarea';
            notesTextarea.placeholder = 'Aggiungi note... (contatti, scadenze, ecc.)';
            notesTextarea.value = clientData.notes || '';
            notesTextarea.addEventListener('blur', () => {
                const val = notesTextarea.value.trim();
                if (val !== (clientData.notes || '')) {
                    db.collection('clients').doc(clientId).update({ notes: val });
                }
            });
            notesBody.appendChild(notesTextarea);
            notesSection.appendChild(notesBody);

            notesSection.querySelector('.dm-sub-section-header').addEventListener('click', () => {
                notesSection.querySelector('.dm-sub-section-header').classList.toggle('open');
                notesBody.classList.toggle('expanded');
            });

            // Assemble
            body.appendChild(projectsSection);
            body.appendChild(wtSection);
            body.appendChild(notesSection);
            card.appendChild(header);
            card.appendChild(body);
            container.appendChild(card);
        }

        // Update stats
        dmUpdateStats(totalClients, totalProjects, totalWorktypes);

        // Toggle empty state vs data sections
        const emptyState = document.getElementById('dm-empty-state');
        const hasDataSection = document.getElementById('dm-has-data-section');
        const searchWrap = document.getElementById('dm-search-wrap');
        if (totalClients === 0) {
            if (emptyState) emptyState.style.display = '';
            if (hasDataSection) hasDataSection.style.display = 'none';
            if (searchWrap) searchWrap.style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            if (hasDataSection) hasDataSection.style.display = '';
            if (searchWrap) searchWrap.style.display = '';
        }

    } catch (error) {
        console.error('Errore nel rendering accordion:', error);
    }
}

function dmUpdateStats(clients, projects, worktypes) {
    const c = document.getElementById('dm-stat-clients');
    const s = document.getElementById('dm-stat-projects');
    const w = document.getElementById('dm-stat-worktypes');
    if (c) c.textContent = clients;
    if (s) s.textContent = projects;
    if (w) w.textContent = worktypes;
}

/**
 * Keyboard shortcuts handler.
 */

import { closeHistorySidebar } from './history.js';

/**
 * Initialize all keyboard shortcuts.
 */
export function initShortcuts() {
    const shortcutsOverlay = document.getElementById('shortcuts-overlay');
    const shortcutsClose = document.getElementById('shortcuts-close');
    const translateBtn = document.getElementById('translate-btn');
    const searchInput = document.getElementById('search-input');
    const historySidebar = document.getElementById('history-sidebar');
    const historyToggle = document.getElementById('history-toggle');
    const overlay = document.getElementById('overlay');
    const expandCollapseBtn = document.getElementById('expand-collapse-btn');

    function openShortcuts() { shortcutsOverlay.classList.remove('hidden'); }
    function closeShortcuts() { shortcutsOverlay.classList.add('hidden'); }

    shortcutsClose.addEventListener('click', closeShortcuts);
    shortcutsOverlay.addEventListener('click', e => {
        if (e.target === shortcutsOverlay) closeShortcuts();
    });

    document.addEventListener('keydown', e => {
        const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);

        // Ctrl+Enter — translate (works even when typing in CodeMirror)
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            translateBtn.click();
            return;
        }

        // ? key — show shortcuts (only when not typing)
        if (e.key === '?' && !isTyping) {
            e.preventDefault();
            openShortcuts();
            return;
        }

        // Escape — cascading close: shortcuts → search → history → auth → editing
        if (e.key === 'Escape') {
            if (!shortcutsOverlay.classList.contains('hidden')) { closeShortcuts(); return; }
            if (searchInput.value) { searchInput.value = ''; searchInput.dispatchEvent(new Event('input')); return; }
            if (historySidebar.classList.contains('open')) { closeHistorySidebar(); return; }
            if (!overlay.classList.contains('hidden')) { overlay.classList.add('hidden'); return; }
            const editing = document.querySelector('.t-card.editing');
            if (editing) { editing.querySelector('.cancel-edit-btn')?.click(); return; }
        }

        // Ctrl+Shift combos
        if (e.ctrlKey && e.shiftKey) {
            if (e.key === 'D' || e.key === 'd') {
                e.preventDefault();
                document.querySelector('.theme-toggle')?.click();
            } else if (e.key === 'H' || e.key === 'h') {
                e.preventDefault();
                historyToggle?.click();
            } else if (e.key === 'F' || e.key === 'f') {
                e.preventDefault();
                searchInput.focus();
            } else if (e.key === 'E' || e.key === 'e') {
                e.preventDefault();
                expandCollapseBtn.click();
            }
        }
    });
}

/**
 * UI utilities: toasts, theme toggle, char count, search, stats, resizer.
 */

import { MAX_CHARS, WARN_CHARS } from './state.js';
import { getEditorValue } from './editor.js';

// ── TOAST NOTIFICATION SYSTEM ──

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 */
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = icons[type] || icons.info;
    const msgSpan = document.createElement('span');
    msgSpan.className = 'toast-msg';
    msgSpan.textContent = message;
    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
}

// ── COPY TO CLIPBOARD ──

export function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const original = btn.textContent;
        btn.classList.add('copied');
        btn.textContent = '✓ Copied';
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = original;
        }, 1500);
    }).catch(() => showToast('Failed to copy to clipboard', 'error'));
}

// ── HTML ESCAPING ──

export function escHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── DARK MODE ──

export function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('anuvaad-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'dark' ? '☀' : '🌙';

    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('anuvaad-theme', next);
        themeToggle.textContent = next === 'dark' ? '☀' : '🌙';
    });
}

// ── CHARACTER COUNT ──

export function updateCharCount() {
    const charCount = document.getElementById('char-count');
    const len = getEditorValue().length;
    charCount.textContent = `${len.toLocaleString()} chars`;
    charCount.classList.remove('warning', 'danger');
    if (len >= MAX_CHARS) {
        charCount.classList.add('danger');
        charCount.textContent += ' (limit reached)';
    } else if (len >= WARN_CHARS) {
        charCount.classList.add('warning');
    }
}

export function initCharCountFallback() {
    const codeEditorTextarea = document.getElementById('code-editor');
    codeEditorTextarea.addEventListener('input', () => {
        if (codeEditorTextarea.value.length > MAX_CHARS) {
            codeEditorTextarea.value = codeEditorTextarea.value.slice(0, MAX_CHARS);
            showToast(`Character limit reached (${MAX_CHARS.toLocaleString()})`, 'warning');
        }
        updateCharCount();
    });
}

// ── COPY CODE BUTTON ──

export function initCopyCode() {
    const copyCodeBtn = document.getElementById('copy-code-btn');
    copyCodeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = getEditorValue().trim();
        if (!code) return showToast('Nothing to copy', 'warning');
        copyToClipboard(code, copyCodeBtn);
    });
}

// ── TRANSLATION STATS ──

export function updateStats(code, blocks) {
    const statsBar = document.getElementById('stats-bar');
    const statWords = document.getElementById('stat-words');
    const statReading = document.getElementById('stat-reading');
    const statLines = document.getElementById('stat-lines');
    const statFunctions = document.getElementById('stat-functions');

    const allText = blocks.map(b => b.english_translation || '').join(' ');
    const wordCount = allText.trim().split(/\s+/).filter(w => w.length > 0).length;
    const readingMins = Math.max(1, Math.ceil(wordCount / 200));
    const codeLines = code.split('\n').filter(l => l.trim().length > 0).length;
    const fnPatterns = /\b(def|function|func|fn|public\s+static|private\s+static|public\s+void|private\s+void)\s+\w+\s*\(/g;
    const fnCount = (code.match(fnPatterns) || []).length;

    statWords.textContent = `📏 ${wordCount} words`;
    statReading.textContent = `⏱ ${readingMins} min read`;
    statLines.textContent = `📄 ${codeLines} lines`;
    statFunctions.textContent = `⚙ ${fnCount} function${fnCount !== 1 ? 's' : ''}`;

    statsBar.classList.remove('hidden');
}

// ── SEARCH / FILTER CARDS ──

export function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchCount = document.getElementById('search-count');
    const cardsContainer = document.getElementById('cards-container');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        const cards = cardsContainer.querySelectorAll('.t-card');
        let matches = 0;

        cards.forEach(card => {
            const textEl = card.querySelector('.card-text');
            const codeEl = card.querySelector('.card-code-block');
            const idEl = card.querySelector('.card-id');
            const originalText = textEl?.textContent || '';
            const codeText = codeEl?.textContent || '';
            const idText = idEl?.textContent || '';
            const combined = (originalText + ' ' + codeText + ' ' + idText).toLowerCase();

            if (!query) {
                card.classList.remove('search-hidden');
                if (textEl) textEl.textContent = originalText;
                matches++;
            } else if (combined.includes(query)) {
                card.classList.remove('search-hidden');
                // Highlight matching text (XSS-safe: escapes HTML before inserting marks)
                if (textEl && originalText.toLowerCase().includes(query)) {
                    const escaped = escHtml(originalText);
                    const escapedQuery = escHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(${escapedQuery})`, 'gi');
                    textEl.innerHTML = escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
                }
                matches++;
            } else {
                card.classList.add('search-hidden');
            }
        });

        searchCount.textContent = query ? `${matches}/${cards.length}` : '';
    });
}

// ── EXPAND / COLLAPSE ALL ──

export function initExpandCollapse() {
    const expandCollapseBtn = document.getElementById('expand-collapse-btn');
    const cardsContainer = document.getElementById('cards-container');
    let allCollapsed = false;

    expandCollapseBtn.addEventListener('click', () => {
        const cards = cardsContainer.querySelectorAll('.t-card');
        if (cards.length === 0) return;
        allCollapsed = !allCollapsed;
        cards.forEach(card => {
            if (allCollapsed) card.classList.add('collapsed');
            else card.classList.remove('collapsed');
        });
        expandCollapseBtn.textContent = allCollapsed ? '▶ Expand All' : '▼ Collapse All';
    });
}

// ── RESIZER ──

export function initResizer() {
    const resizer = document.getElementById('resizer');
    const leftPane = document.getElementById('left-pane');
    const layout = document.getElementById('layout');
    let isResizing = false;

    resizer.addEventListener('mousedown', () => {
        isResizing = true;
        resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', e => {
        if (!isResizing) return;
        const r = layout.getBoundingClientRect();
        const p = ((e.clientX - r.left) / r.width) * 100;
        leftPane.style.width = Math.min(75, Math.max(25, p)) + '%';
    });

    document.addEventListener('mouseup', () => {
        if (!isResizing) return;
        isResizing = false;
        resizer.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    });
}

// ── SMART ERROR HANDLER ──

export function getErrorMessage(err) {
    if (!navigator.onLine) return 'You appear to be offline. Check your connection.';
    if (err.message && err.message.includes('504')) return 'Translation timed out. The code may be too complex — try a smaller snippet.';
    if (err.message && err.message.includes('429')) return 'Too many requests. Please wait a moment.';
    if (err.message && err.message.includes('500')) return 'Translation engine error. Try again.';
    if (err.message && err.message.includes('Failed to fetch')) return 'Could not reach the Anuvaad engine. Make sure main.py is running on port 8000.';
    return `Translation failed: ${err.message}`;
}

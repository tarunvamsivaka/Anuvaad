/**
 * Translation history management (localStorage).
 */

import { appState, HISTORY_KEY } from './state.js';
import { setEditorValue, switchLanguage } from './editor.js';
import { renderCards } from './cards.js';
import { showToast, escHtml, updateCharCount } from './ui.js';

// ── History data access ──

export function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
}

export function saveToHistory(input, blocks, translationMode, language) {
    const history = getHistory();
    const preview = input.length > 80 ? input.slice(0, 80) + '…' : input;
    const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        timestamp: Date.now(),
        mode: translationMode,
        language,
        preview,
        input,
        blocks,
    };
    history.unshift(entry);
    if (history.length > 50) history.length = 50;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    updateHistoryBadge();
}

function deleteFromHistory(id) {
    let history = getHistory();
    history = history.filter(h => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
    updateHistoryBadge();
    showToast('Entry removed.', 'info');
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    updateHistoryBadge();
    showToast('History cleared.', 'info');
}

export function updateHistoryBadge() {
    const historyBadge = document.getElementById('history-badge');
    const count = getHistory().length;
    if (count > 0) {
        historyBadge.textContent = count > 9 ? '9+' : count;
        historyBadge.style.display = 'flex';
    } else {
        historyBadge.style.display = 'none';
    }
}

function formatTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

// ── Rendering ──

function renderHistory() {
    const historyList = document.getElementById('history-list');
    const historyEmpty = document.getElementById('history-empty');
    const history = getHistory();
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.appendChild(historyEmpty.cloneNode(true));
        return;
    }

    history.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'history-item';
        const modeLabels = { 'code-to-en': 'C→E', 'en-to-code': 'E→C', 'code-to-code': 'C→C' };
        const timeAgo = formatTimeAgo(entry.timestamp);
        item.innerHTML = `
            <div class="history-item-content">
                <div class="history-item-title">${escHtml(entry.preview)}</div>
                <div class="history-item-meta">
                    <span class="history-item-mode">${modeLabels[entry.mode] || entry.mode}</span>
                    <span class="history-item-lang">${entry.language}</span>
                    <span>${timeAgo}</span>
                </div>
            </div>
            <button class="history-delete-btn" title="Delete">✕</button>
        `;

        item.querySelector('.history-item-content').addEventListener('click', () => restoreFromHistory(entry));
        item.querySelector('.history-delete-btn').addEventListener('click', e => {
            e.stopPropagation();
            deleteFromHistory(entry.id);
        });

        historyList.appendChild(item);
    });
}

function restoreFromHistory(entry) {
    const btnCodeToEn = document.getElementById('btn-code-to-en');
    const btnEnToCode = document.getElementById('btn-en-to-code');
    const btnCodeToCode = document.getElementById('btn-code-to-code');
    const langSelect = document.getElementById('lang-select');
    const langBadge = document.getElementById('lang-badge');
    const blockCount = document.getElementById('block-count');
    const exportToolbar = document.getElementById('export-toolbar');

    // Switch mode
    if (entry.mode === 'code-to-en') btnCodeToEn.click();
    else if (entry.mode === 'en-to-code') btnEnToCode.click();
    else if (entry.mode === 'code-to-code') btnCodeToCode.click();

    // Set language
    langSelect.value = entry.language;
    langBadge.textContent = entry.language;
    switchLanguage(entry.language);

    // Set editor content
    setEditorValue(entry.input);
    updateCharCount();

    // Restore results
    appState.state = entry.blocks;
    renderCards(entry.blocks);
    blockCount.textContent = `${entry.blocks.length} block${entry.blocks.length !== 1 ? 's' : ''}`;
    blockCount.style.display = 'inline-flex';
    exportToolbar.classList.add('visible');

    // Close sidebar
    closeHistorySidebar();
    showToast('Translation restored from history.', 'success');
}

// ── Sidebar toggle ──

function openHistorySidebar() {
    const historySidebar = document.getElementById('history-sidebar');
    const historyOverlay = document.getElementById('history-overlay');
    renderHistory();
    historySidebar.classList.add('open');
    historyOverlay.classList.add('visible');
}

export function closeHistorySidebar() {
    const historySidebar = document.getElementById('history-sidebar');
    const historyOverlay = document.getElementById('history-overlay');
    historySidebar.classList.remove('open');
    historyOverlay.classList.remove('visible');
}

/**
 * Initialize all history sidebar event listeners.
 */
export function initHistory() {
    const historyToggle = document.getElementById('history-toggle');
    const historyClose = document.getElementById('history-close');
    const historyOverlay = document.getElementById('history-overlay');
    const historyClear = document.getElementById('history-clear');

    historyToggle.addEventListener('click', openHistorySidebar);
    historyClose.addEventListener('click', closeHistorySidebar);
    historyOverlay.addEventListener('click', closeHistorySidebar);
    historyClear.addEventListener('click', () => {
        if (getHistory().length === 0) return;
        clearHistory();
    });
}

/**
 * Anuvaad — Main Entry Point
 *
 * Orchestrates initialization of all modules.
 * This replaces the monolithic script.js.
 */

import { appState, API_BASE, FREE_TIER_LIMIT, USAGE_KEY } from './state.js';
import { initEditor, getEditorValue, setEditorValue, switchLanguage } from './editor.js';
import { showToast, updateCharCount, initTheme, initCharCountFallback, initCopyCode, updateStats, initSearch, initExpandCollapse, initResizer, getErrorMessage, initOfflineDetection } from './ui.js';
import { renderCards, renderLeftPane } from './cards.js';
import { initAuth } from './auth.js';
import { initHistory, saveToHistory, updateHistoryBadge } from './history.js';
import { initExport } from './export.js';
import { initShortcuts } from './shortcuts.js';
import { initAutoDetect } from './detect.js';

document.addEventListener('DOMContentLoaded', () => {

    // ── DOM ELEMENTS ──
    const cardsContainer = document.getElementById('cards-container');
    const emptyState = document.getElementById('empty-state');
    const translateBtn = document.getElementById('translate-btn');
    const newBtn = document.getElementById('new-btn');
    const langSelect = document.getElementById('lang-select');
    const langBadge = document.getElementById('lang-badge');
    const blockCount = document.getElementById('block-count');
    const leftLabel = document.getElementById('left-label');
    const rightLabel = document.getElementById('right-label');
    const editorWrap = document.getElementById('editor-wrap');
    const exportToolbar = document.getElementById('export-toolbar');
    const usageCounter = document.getElementById('usage-counter');

    const btnCodeToEn = document.getElementById('btn-code-to-en');
    const btnEnToCode = document.getElementById('btn-en-to-code');
    const btnCodeToCode = document.getElementById('btn-code-to-code');
    const targetLangSelect = document.getElementById('target-lang-select');

    // ── INIT EDITOR ──
    initEditor(updateCharCount);

    // ── INIT UI MODULES ──
    initTheme();
    initCharCountFallback();
    initCopyCode();
    initSearch();
    initExpandCollapse();
    initResizer();
    initOfflineDetection();

    // ── INIT FEATURE MODULES ──
    initAuth();
    initHistory();
    initExport();
    initShortcuts();
    initAutoDetect();

    // ── LANG & MODE TOGGLES ──
    langSelect.addEventListener('change', () => {
        langBadge.textContent = langSelect.value;
        switchLanguage(langSelect.value);
    });

    btnCodeToEn.addEventListener('click', () => {
        appState.mode = 'code-to-en';
        btnCodeToEn.classList.add('active');
        btnEnToCode.classList.remove('active');
        btnCodeToCode.classList.remove('active');
        targetLangSelect.classList.add('hidden');
        leftLabel.textContent = 'Source Code';
        rightLabel.textContent = 'English Translation';
        reset();
    });

    btnEnToCode.addEventListener('click', () => {
        appState.mode = 'en-to-code';
        btnEnToCode.classList.add('active');
        btnCodeToEn.classList.remove('active');
        btnCodeToCode.classList.remove('active');
        targetLangSelect.classList.add('hidden');
        leftLabel.textContent = 'Description';
        rightLabel.textContent = 'Generated Code';
        reset();
    });

    btnCodeToCode.addEventListener('click', () => {
        appState.mode = 'code-to-code';
        btnCodeToCode.classList.add('active');
        btnCodeToEn.classList.remove('active');
        btnEnToCode.classList.remove('active');
        targetLangSelect.classList.remove('hidden');
        leftLabel.textContent = 'Source Code';
        rightLabel.textContent = 'Translated Code';
        reset();
    });

    function reset() {
        setEditorValue('');
        appState.state = [];
        cardsContainer.innerHTML = '';
        emptyState.style.display = 'flex';
        cardsContainer.appendChild(emptyState);
        blockCount.style.display = 'none';
        exportToolbar.classList.remove('visible');
        updateCharCount();
    }
    newBtn.addEventListener('click', reset);

    // ── USAGE COUNTER ──
    function getTodayKey() {
        return new Date().toISOString().split('T')[0];
    }

    function getUsageCount() {
        try {
            const data = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}');
            return data[getTodayKey()] || 0;
        } catch { return 0; }
    }

    function incrementUsage() {
        try {
            const data = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}');
            const today = getTodayKey();
            data[today] = (data[today] || 0) + 1;
            Object.keys(data).forEach(k => {
                if (k < new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]) delete data[k];
            });
            localStorage.setItem(USAGE_KEY, JSON.stringify(data));
            updateUsageUI();
        } catch { /* ignore */ }
    }

    function updateUsageUI() {
        const count = getUsageCount();
        usageCounter.classList.remove('warn', 'limit', 'pro');

        if (appState.isPro) {
            usageCounter.textContent = `${count} ✦ Pro`;
            usageCounter.classList.add('pro');
        } else {
            usageCounter.textContent = `${count}/${FREE_TIER_LIMIT}`;
            if (count >= FREE_TIER_LIMIT) usageCounter.classList.add('limit');
            else if (count >= FREE_TIER_LIMIT * 0.7) usageCounter.classList.add('warn');
        }
    }

    // ── TRANSLATE / GENERATE ──
    translateBtn.addEventListener('click', async () => {
        const raw = getEditorValue().trim();
        if (!raw) {
            editorWrap.style.backgroundColor = 'rgba(200, 50, 50, 0.15)';
            setTimeout(() => editorWrap.style.backgroundColor = 'transparent', 300);
            showToast('Paste some code or type a description first.', 'warning');
            return;
        }

        // ── SOFT AUTH GATE ──
        // Users can explore freely, but must sign in to translate
        if (!appState.currentUserEmail) {
            appState.pendingTranslate = true;
            // Update modal messaging to feel inviting, not blocking
            const modalTitle = document.getElementById('modal-title');
            const modalSub = document.getElementById('modal-sub');
            if (modalTitle) modalTitle.textContent = 'Sign in to translate';
            if (modalSub) modalSub.textContent = 'Create a free account to unlock translations — it only takes 10 seconds.';
            document.getElementById('overlay').classList.remove('hidden');
            return;
        }

        if (!appState.isPro && getUsageCount() >= FREE_TIER_LIMIT) {
            showToast('Daily limit reached. Upgrade to Pro for unlimited translations.', 'warning');
            return;
        }
        translateBtn.disabled = true;
        translateBtn.innerHTML = '<span>Processing…</span>';
        cardsContainer.innerHTML = '';
        blockCount.style.display = 'none';

        // Show progress bar
        const progressEl = document.getElementById('translate-progress');
        const progressBar = document.getElementById('progress-bar');
        const progressLabel = document.getElementById('progress-label');
        const statsBar = document.getElementById('stats-bar');
        statsBar.classList.add('hidden');
        progressEl.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressLabel.textContent = 'Translating...';

        // Animate progress (simulated)
        let progressValue = 0;
        const progressInterval = setInterval(() => {
            progressValue = Math.min(progressValue + Math.random() * 12, 90);
            progressBar.style.width = progressValue + '%';
            if (progressValue > 30) progressLabel.textContent = 'Analyzing code blocks...';
            if (progressValue > 60) progressLabel.textContent = 'Generating translations...';
        }, 500);

        for (let i = 0; i < 3; i++) {
            const sk = document.createElement('div');
            sk.className = 'loading-card';
            sk.innerHTML = `<div class="skel skel-line" style="width:${60 + Math.random() * 30}%"></div><div class="skel skel-line" style="width:${50 + Math.random() * 40}%"></div><div class="skel skel-line" style="width:${40 + Math.random() * 20}%"></div>`;
            cardsContainer.appendChild(sk);
        }

        try {
            let endpoint, payload;
            if (appState.mode === 'code-to-en') {
                endpoint = '/api/code-to-english';
                payload = { raw_code: raw, language: langSelect.value };
            } else if (appState.mode === 'en-to-code') {
                endpoint = '/api/generate-from-english';
                payload = { prompt: raw, language: langSelect.value };
            } else {
                endpoint = '/api/code-to-code';
                payload = { raw_code: raw, source_language: langSelect.value, target_language: targetLangSelect.value };
            }
            const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) {
                const err = new Error(`HTTP ${res.status}`);
                err.status = res.status;
                throw err;
            }
            const data = await res.json();

            // Complete progress
            clearInterval(progressInterval);
            progressBar.style.width = '100%';
            progressLabel.textContent = 'Done!';
            setTimeout(() => progressEl.classList.add('hidden'), 600);

            appState.state = data;
            if (appState.mode !== 'code-to-en') { renderLeftPane(); updateCharCount(); }
            renderCards(data);
            blockCount.textContent = `${data.length} block${data.length !== 1 ? 's' : ''}`;
            blockCount.style.display = 'inline-flex';
            exportToolbar.classList.add('visible');
            showToast(`Translated into ${data.length} block${data.length !== 1 ? 's' : ''}.`, 'success');

            // Update stats
            updateStats(raw, data);

            // Scroll to top of cards
            cardsContainer.scrollTo({ top: 0, behavior: 'smooth' });

            // Save to history
            saveToHistory(raw, data, appState.mode, langSelect.value);
            incrementUsage();
        } catch (e) {
            clearInterval(progressInterval);
            progressEl.classList.add('hidden');
            cardsContainer.innerHTML = '';
            const err = document.createElement('div');
            err.className = 'error-banner';
            err.textContent = `⚠ ${getErrorMessage(e)}`;
            cardsContainer.appendChild(err);
        } finally {
            translateBtn.disabled = false;
            translateBtn.innerHTML = '<span>Translate</span><span class="arrow">→</span>';
        }
    });

    // ── INIT ON LOAD ──
    updateUsageUI();
    updateHistoryBadge();

}); // end DOMContentLoaded

/**
 * Translation card rendering, editing, and code linking.
 */

import { appState, API_BASE } from './state.js';
import { getEditorValue, setEditorValue, getCmView, EditorView } from './editor.js';
import { showToast, copyToClipboard, updateCharCount } from './ui.js';

/**
 * Render the left pane with code from all state blocks.
 */
export function renderLeftPane() {
    setEditorValue(appState.state.map(s => s.code_snippet || s.code || '').join('\n'));
}

/**
 * Render translation cards into the cards container.
 * @param {Array} data - Array of translation block objects
 */
export function renderCards(data) {
    const cardsContainer = document.getElementById('cards-container');
    cardsContainer.innerHTML = '';

    data.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = 't-card';
        card.dataset.id = item.id || `block_${i + 1}`;
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'article');
        card.setAttribute('aria-label', `Translation block ${i + 1}: ${(item.english_translation || '').slice(0, 60)}`);
        card.style.animation = `cardEnter 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${i * 60}ms both`;

        const translationText = item.english_translation || item.explanation || item.description || item.text || '';
        const displayText = translationText.trim() || '(No description available for this block)';
        const codeSnippet = item.code_snippet || item.code || '';

        // ─ Card accent bar ─
        const accent = document.createElement('div');
        accent.className = 'card-accent';

        // ─ Card body ─
        const body = document.createElement('div');
        body.className = 'card-body';

        // ─ Header row (clickable to collapse) ─
        const headerRow = document.createElement('div');
        headerRow.className = 'card-header-row';

        const headerLeft = document.createElement('div');
        headerLeft.className = 'card-header-left';

        const collapseIcon = document.createElement('span');
        collapseIcon.className = 'card-collapse-icon';
        collapseIcon.textContent = '▼';

        const idDiv = document.createElement('div');
        idDiv.className = 'card-id';
        idDiv.textContent = item.id || `block_${i + 1}`;

        headerLeft.appendChild(collapseIcon);
        headerLeft.appendChild(idDiv);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn copy-card-btn';
        copyBtn.textContent = '📋 Copy';

        headerRow.appendChild(headerLeft);
        headerRow.appendChild(copyBtn);

        // ─ Collapsible content wrapper ─
        const collapsible = document.createElement('div');
        collapsible.className = 'card-collapsible';

        // ─ Translation text ─
        const textDiv = document.createElement('div');
        textDiv.className = 'card-text';
        textDiv.textContent = displayText;

        // ─ Code snippet preview ─
        const codeToggle = document.createElement('button');
        codeToggle.className = 'card-code-toggle';
        codeToggle.innerHTML = '<span class="toggle-chevron">▶</span> Show Code';

        const codeBlock = document.createElement('div');
        codeBlock.className = 'card-code-block';
        codeBlock.textContent = codeSnippet;

        codeToggle.addEventListener('click', e => {
            e.stopPropagation();
            codeToggle.classList.toggle('open');
            codeBlock.classList.toggle('visible');
            const isOpen = codeBlock.classList.contains('visible');
            codeToggle.innerHTML = `<span class="toggle-chevron">▶</span> ${isOpen ? 'Hide Code' : 'Show Code'}`;
        });

        // ─ Textarea (editing mode) ─
        const textarea = document.createElement('textarea');
        textarea.className = 'card-textarea';
        textarea.value = translationText;
        textarea.setAttribute('name', `ta-${item.id || `block_${i+1}`}`);
        textarea.style.display = 'none';

        // ─ Footer (editing mode) ─
        const footer = document.createElement('div');
        footer.className = 'card-footer';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-edit-btn';
        cancelBtn.textContent = 'Cancel';

        const updateBtn = document.createElement('button');
        updateBtn.className = 'update-btn';
        updateBtn.textContent = 'Update Code ↑';

        footer.appendChild(cancelBtn);
        footer.appendChild(updateBtn);

        // ─ Hint ─
        const hint = document.createElement('div');
        hint.className = 'card-hint';
        hint.style.display = 'none';
        hint.id = `hint-${item.id || `block_${i+1}`}`;
        hint.innerHTML = '<span class="hint-icon">✓</span> Code updated successfully';

        // ─ Assemble collapsible content ─
        collapsible.appendChild(textDiv);
        if (codeSnippet) {
            collapsible.appendChild(codeToggle);
            collapsible.appendChild(codeBlock);
        }
        collapsible.appendChild(textarea);
        collapsible.appendChild(footer);
        collapsible.appendChild(hint);

        // ─ Assemble card ─
        body.appendChild(headerRow);
        body.appendChild(collapsible);
        card.appendChild(accent);
        card.appendChild(body);

        // ─ Event: collapse/expand ─
        headerRow.addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') return;
            card.classList.toggle('collapsed');
        });

        // ─ Event: double-click to link to code ─
        card.addEventListener('dblclick', e => {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
            linkCardToCode(card);
        });

        // ─ Event: copy ─
        copyBtn.addEventListener('click', e => {
            e.stopPropagation();
            copyToClipboard(translationText || codeSnippet, copyBtn);
        });

        // ─ Event: enter edit mode (click card body, not header) ─
        collapsible.addEventListener('click', e => {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON' || e.target.closest('.card-code-toggle') || e.target.closest('.card-code-block')) return;
            if (card.classList.contains('editing') || card.classList.contains('collapsed')) return;
            card.classList.add('editing');
            textarea.style.display = '';
            textarea.focus();
        });

        // ─ Event: cancel edit ─
        cancelBtn.addEventListener('click', e => {
            e.stopPropagation();
            card.classList.remove('editing');
            textarea.style.display = 'none';
            textarea.value = item.english_translation;
        });

        // ─ Event: update code ─
        updateBtn.addEventListener('click', async e => {
            e.stopPropagation();
            const modifiedEnglish = textarea.value;
            updateBtn.disabled = true;
            updateBtn.textContent = 'Updating…';
            try {
                const res = await fetch(`${API_BASE}/api/english-to-code`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ block_id: item.id, modified_english: modifiedEnglish, full_context: getEditorValue() })
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const result = await res.json();
                const target = appState.state.find(o => o.id === item.id);
                if (target) { target.code_snippet = result.updated_code; target.english_translation = modifiedEnglish; }
                item.english_translation = modifiedEnglish;
                renderLeftPane(); updateCharCount();
                textDiv.textContent = modifiedEnglish;
                card.classList.remove('editing');
                textarea.style.display = 'none';
                if (hint) { hint.style.display = 'flex'; setTimeout(() => { hint.style.display = 'none'; }, 3000); }
                showToast('Code block updated successfully.', 'success');
            } catch (err) {
                showToast('Error updating code. Check that the backend is running.', 'error');
            } finally {
                updateBtn.disabled = false;
                updateBtn.textContent = 'Update Code ↑';
            }
        });

        cardsContainer.appendChild(card);
    });
}

/**
 * Link a card to its corresponding code in the editor.
 * Double-click a card → scrolls editor to matching code snippet.
 */
export function linkCardToCode(cardEl) {
    const blockId = cardEl.dataset.id;
    const block = appState.state.find(b => (b.id || '') === blockId);
    if (!block || !block.code_snippet) return;

    const editorValue = getEditorValue();
    const snippet = block.code_snippet.trim();
    const idx = editorValue.indexOf(snippet);
    if (idx === -1) return;

    const linesBefore = editorValue.substring(0, idx).split('\n').length;
    const cmView = getCmView();

    if (cmView) {
        cmView.dispatch({
            selection: { anchor: idx },
            effects: EditorView.scrollIntoView(idx, { y: 'center' })
        });
        cmView.focus();
    }

    cardEl.classList.add('active-link');
    setTimeout(() => cardEl.classList.remove('active-link'), 1500);
    showToast(`Linked to line ${linesBefore} in editor`, 'success');
}

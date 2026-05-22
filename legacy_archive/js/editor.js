/**
 * CodeMirror 6 editor setup and abstraction layer.
 *
 * Provides getEditorValue, setEditorValue, focusEditor, switchLanguage
 * that work with CodeMirror or fall back to a plain textarea.
 */

import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { oneDark } from '@codemirror/theme-one-dark';

// ── Language map ──
const langExtensions = {
    python: () => python(),
    javascript: () => javascript(),
    typescript: () => javascript({ typescript: true }),
    java: () => java(),
    cpp: () => cpp(),
    rust: () => rust(),
    go: () => go(),
};

// Module-level references
let cmView = null;
let langCompartment = null;
let codeEditorTextarea = null;

/**
 * Initialize the CodeMirror editor.
 * @param {Function} onDocChanged - callback when doc content changes
 * @returns {{ cmView: EditorView|null }}
 */
export function initEditor(onDocChanged) {
    codeEditorTextarea = document.getElementById('code-editor');
    const cmContainer = document.getElementById('code-editor-cm');
    langCompartment = new Compartment();

    const cmTheme = EditorView.theme({
        '&': {
            height: '100%',
            fontSize: '0.875rem',
        },
        '.cm-scroller': {
            fontFamily: "'DM Mono', monospace",
            lineHeight: '1.75',
            overflow: 'auto',
        },
        '.cm-content': {
            caretColor: '#f4c55a',
            padding: '0',
        },
        '&.cm-focused .cm-cursor': {
            borderLeftColor: '#f4c55a',
        },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
            background: 'rgba(200, 134, 10, 0.25) !important',
        },
        '.cm-gutters': {
            background: 'transparent',
            borderRight: '1px solid rgba(255,255,255,0.07)',
            color: '#5c5a57',
            minWidth: '40px',
        },
        '.cm-activeLineGutter': {
            background: 'rgba(255,255,255,0.04)',
        },
        '.cm-activeLine': {
            background: 'rgba(255,255,255,0.03)',
        },
    });

    try {
        cmView = new EditorView({
            state: EditorState.create({
                doc: '',
                extensions: [
                    basicSetup,
                    langCompartment.of(python()),
                    oneDark,
                    cmTheme,
                    EditorView.updateListener.of(update => {
                        if (update.docChanged && onDocChanged) onDocChanged();
                    }),
                    EditorView.contentAttributes.of({ 'aria-label': 'Code editor' }),
                    EditorState.tabSize.of(4),
                ],
            }),
            parent: cmContainer,
        });
        cmContainer.style.display = '';
        codeEditorTextarea.style.display = 'none';
        // Hide loading indicator
        const cmLoading = document.getElementById('cm-loading');
        if (cmLoading) cmLoading.style.display = 'none';
    } catch (e) {
        console.warn('CodeMirror failed to load, falling back to textarea:', e);
        cmContainer.style.display = 'none';
        codeEditorTextarea.style.display = '';
        cmView = null;
        // Hide loading indicator on fallback too
        const cmLoading = document.getElementById('cm-loading');
        if (cmLoading) cmLoading.style.display = 'none';
    }

    return { cmView };
}

/** Get the current editor content. */
export function getEditorValue() {
    if (cmView) return cmView.state.doc.toString();
    return codeEditorTextarea.value;
}

/** Set the editor content. */
export function setEditorValue(text) {
    if (cmView) {
        cmView.dispatch({
            changes: { from: 0, to: cmView.state.doc.length, insert: text }
        });
    } else {
        codeEditorTextarea.value = text;
    }
}

/** Focus the editor. */
export function focusEditor() {
    if (cmView) cmView.focus();
    else codeEditorTextarea.focus();
}

/** Switch the CodeMirror language extension. */
export function switchLanguage(lang) {
    if (!cmView || !langCompartment) return;
    const ext = langExtensions[lang];
    if (ext) {
        cmView.dispatch({
            effects: langCompartment.reconfigure(ext()),
        });
    }
}

/** Get the raw CodeMirror EditorView instance (for scrollIntoView, etc.) */
export function getCmView() {
    return cmView;
}

/** Re-export EditorView for modules that need scrollIntoView. */
export { EditorView };

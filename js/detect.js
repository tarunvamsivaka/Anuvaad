/**
 * Auto language detection from code patterns.
 */

import { getEditorValue } from './editor.js';
import { showToast } from './ui.js';

const langPatterns = {
    python: [/^import\s/m, /^from\s.*import/m, /def\s+\w+\(/, /print\(/, /:\s*$/m, /^\s+#/m],
    javascript: [/const\s+\w+\s*=/, /let\s+\w+\s*=/, /function\s+\w+\(/, /=>\s*{/, /console\.log\(/, /document\./],
    java: [/public\s+class\s/, /public\s+static\s+void/, /System\.out\.print/, /import\s+java\./],
    cpp: [/#include\s*</, /std::/, /int\s+main\(/, /cout\s*<</, /namespace\s/],
    typescript: [/interface\s+\w+\s*{/, /type\s+\w+\s*=/, /:\s*(string|number|boolean|any)/, /as\s+\w+/],
    rust: [/fn\s+\w+\(/, /let\s+mut\s/, /impl\s+/, /use\s+std::/, /println!\(/],
    go: [/^package\s+\w+/m, /func\s+\w+\(/, /fmt\.Print/, /import\s*\(/, /:=\s/]
};

function detectLanguage(code) {
    const scores = {};
    for (const [lang, patterns] of Object.entries(langPatterns)) {
        scores[lang] = patterns.filter(p => p.test(code)).length;
    }
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 2) return { lang: best[0], confidence: Math.min(best[1] / 4, 1) };
    return null;
}

/**
 * Initialize auto language detection on paste events.
 */
export function initAutoDetect() {
    const langSelect = document.getElementById('lang-select');
    const editorWrap = document.getElementById('editor-wrap');

    function handleAutoDetect() {
        const code = getEditorValue();
        if (!code || code.length < 10) return;
        const result = detectLanguage(code);
        if (result) {
            const selectValue = result.lang;
            const options = Array.from(langSelect.options).map(o => o.value.toLowerCase());
            if (options.includes(selectValue)) {
                langSelect.value = Array.from(langSelect.options).find(o => o.value.toLowerCase() === selectValue)?.value || langSelect.value;
                showToast(`Auto-detected: ${langSelect.value}`, 'success');
            }
        }
    }

    if (editorWrap) {
        editorWrap.addEventListener('paste', () => setTimeout(handleAutoDetect, 100));
    }
}

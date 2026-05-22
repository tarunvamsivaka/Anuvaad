/**
 * Export functionality: Markdown, JSON, PDF.
 */

import { appState } from './state.js';
import { getEditorValue } from './editor.js';
import { showToast } from './ui.js';

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Initialize all export button event listeners.
 */
export function initExport() {
    const exportMd = document.getElementById('export-md');
    const exportJson = document.getElementById('export-json');
    const exportPdf = document.getElementById('export-pdf');
    const langSelect = document.getElementById('lang-select');

    exportMd.addEventListener('click', () => {
        if (!appState.state.length) return;
        const modeLabel = appState.mode === 'code-to-en' ? 'Code → English' : appState.mode === 'en-to-code' ? 'English → Code' : 'Code → Code';
        let md = `# Anuvaad Translation\n\n`;
        md += `**Mode:** ${modeLabel}  \n`;
        md += `**Language:** ${langSelect.value}  \n`;
        md += `**Date:** ${new Date().toLocaleString()}  \n\n`;
        md += `---\n\n`;
        md += `## Source\n\n\`\`\`${langSelect.value}\n${getEditorValue()}\n\`\`\`\n\n`;
        md += `## Translation Blocks\n\n`;
        appState.state.forEach(block => {
            md += `### ${block.id}\n\n`;
            if (block.code_snippet) md += `\`\`\`\n${block.code_snippet}\n\`\`\`\n\n`;
            md += `${block.english_translation}\n\n---\n\n`;
        });
        downloadFile(md, `anuvaad-${Date.now()}.md`, 'text/markdown');
        showToast('Exported as Markdown.', 'success');
    });

    exportJson.addEventListener('click', () => {
        if (!appState.state.length) return;
        const data = {
            mode: appState.mode,
            language: langSelect.value,
            timestamp: new Date().toISOString(),
            source: getEditorValue(),
            blocks: appState.state
        };
        downloadFile(JSON.stringify(data, null, 2), `anuvaad-${Date.now()}.json`, 'application/json');
        showToast('Exported as JSON.', 'success');
    });

    exportPdf.addEventListener('click', () => {
        if (!appState.state.length) return;
        window.print();
    });
}

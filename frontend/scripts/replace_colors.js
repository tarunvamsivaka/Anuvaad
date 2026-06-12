/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// ── CLI FLAGS ── (DS-02)
const isDryRun = process.argv.includes('--dry-run');
const shouldBackup = process.argv.includes('--backup');

if (isDryRun) console.log('[DRY RUN] No files will be written.\n');

const dir = path.join(__dirname, '../src');

const replacements = [
  { regex: /bg-\[#030014\]/g, replacement: 'bg-surface-base' },
  { regex: /bg-\[#080c14\]/g, replacement: 'bg-surface-low' },
  { regex: /bg-\[#0c0f1a\]/g, replacement: 'bg-surface-mid' },
  { regex: /bg-\[#111520\]/g, replacement: 'bg-surface-high' },
  { regex: /bg-\[#161b28\]/g, replacement: 'bg-surface-overlay' },
  { regex: /bg-\[#0e1219\]/g, replacement: 'bg-surface-card' },
  { regex: /bg-\[#0c0c0f\]/g, replacement: 'bg-surface-charcoal' },
  { regex: /bg-\[#050508\]/g, replacement: 'bg-surface-card' },
  { regex: /bg-\[#08080c\]/g, replacement: 'bg-surface-card' },
  { regex: /bg-\[#05040a\]/g, replacement: 'bg-surface-card' },
  { regex: /bg-\[#0a0914\]/g, replacement: 'bg-surface-mid' },
  { regex: /bg-\[#0a0c16\]/g, replacement: 'bg-surface-mid' },
  { regex: /bg-\[#110e08\]/g, replacement: 'bg-surface-mid' },
  { regex: /bg-\[#100816\]/g, replacement: 'bg-surface-mid' },
  { regex: /bg-\[#07070a\]/g, replacement: 'bg-surface-base' },
  { regex: /bg-\[#1a1b26\]/g, replacement: 'bg-surface-mid' },
  { regex: /bg-\[#0d0d0d\]/g, replacement: 'bg-surface-card' },
  { regex: /bg-\[#1a2233\]/g, replacement: 'bg-surface-high' },
  { regex: /bg-\[#2c3852\]/g, replacement: 'bg-surface-overlay' },
  { regex: /bg-\[#030303\]/g, replacement: 'bg-surface-base' },
  // text colors
  { regex: /text-\[#24292e\]/g, replacement: 'text-text-on-brand' },
  { regex: /bg-\[#24292e\]/g, replacement: 'bg-surface-high' },
];

let totalFiles = 0;
let changedFiles = 0;

function walkDir(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    const filePath = path.join(currentDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
      totalFiles++;
      const content = fs.readFileSync(filePath, 'utf8');
      let updated = content;
      for (const r of replacements) {
        updated = updated.replace(r.regex, r.replacement);
      }
      if (updated !== content) {
        changedFiles++;
        if (isDryRun) {
          console.log(`[DRY RUN] Would update: ${filePath}`);
        } else {
          if (shouldBackup) {
            fs.writeFileSync(filePath + '.bak', content, 'utf8');
            console.log(`  Backed up: ${filePath}.bak`);
          }
          fs.writeFileSync(filePath, updated, 'utf8');
          console.log(`Updated: ${filePath}`);
        }
      }
    }
  }
}

walkDir(dir);
console.log(`\n${isDryRun ? '[DRY RUN] ' : ''}Done — ${changedFiles} of ${totalFiles} files ${isDryRun ? 'would be ' : ''}updated.`);

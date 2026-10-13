import fs from 'fs';
import path from 'path';
import { BenchmarkSuiteSummary } from './types';

/**
 * Renders a standalone, Shields.io-compatible vector SVG badge
 */
export function renderBadgeSvg(
  label: string,
  value: string,
  colorHex: string = '#10b981'
): string {
  // Compute text widths based on character counts for crisp kerning
  const labelWidth = Math.round(label.length * 6.5 + 14);
  const valueWidth = Math.round(value.length * 7.0 + 14);
  const totalWidth = labelWidth + valueWidth;
  const labelX = Math.round(labelWidth / 2);
  const valueX = Math.round(labelWidth + valueWidth / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#0f172a"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${colorHex}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelX}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelX}" y="14">${label}</text>
    <text x="${valueX}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${valueX}" y="14">${value}</text>
  </g>
</svg>`;
}

export function getScoreColor(score: number): string {
  if (score >= 95) return '#10b981'; // Emerald
  if (score >= 85) return '#eab308'; // Amber
  return '#ef4444'; // Red
}

export function getPassRateColor(rate: number): string {
  if (rate >= 100) return '#10b981'; // Emerald
  if (rate >= 95) return '#eab308'; // Amber
  return '#ef4444'; // Red
}

/**
 * Generates and saves all standard SVG badges to the target directory
 */
export function generateBadges(
  summary: BenchmarkSuiteSummary,
  outputDir: string = path.resolve(__dirname, '../results')
): string[] {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const generatedFiles: string[] = [];

  // 1. Composite Score Badge
  const scoreVal = `${summary.averageCompositeScore}%`;
  const scoreColor = getScoreColor(summary.averageCompositeScore);
  const scoreSvg = renderBadgeSvg('anuvaad score', scoreVal, scoreColor);
  const scorePath = path.join(outputDir, 'badge-score.svg');
  fs.writeFileSync(scorePath, scoreSvg, 'utf-8');
  generatedFiles.push(scorePath);

  // 2. Pass Rate Badge
  const passVal = `${summary.passRatePercentage}%`;
  const passColor = getPassRateColor(summary.passRatePercentage);
  const passSvg = renderBadgeSvg('pass rate', passVal, passColor);
  const passPath = path.join(outputDir, 'badge-pass-rate.svg');
  fs.writeFileSync(passPath, passSvg, 'utf-8');
  generatedFiles.push(passPath);

  // 3. Zero-Dollar Cloud Burn Badge
  const costSvg = renderBadgeSvg('cloud burn', '$0.00/mo', '#059669');
  const costPath = path.join(outputDir, 'badge-cost.svg');
  fs.writeFileSync(costPath, costSvg, 'utf-8');
  generatedFiles.push(costPath);

  // 4. Latency Badge
  const avgMs = summary.totalComponents > 0
    ? Math.round(summary.totalDurationMs / summary.totalComponents)
    : 0;
  const latencyVal = avgMs > 0 ? `< ${Math.max(20, Math.ceil(avgMs / 10) * 10)}ms/file` : '< 20ms/file';
  const latencySvg = renderBadgeSvg('latency', latencyVal, '#3b82f6');
  const latencyPath = path.join(outputDir, 'badge-latency.svg');
  fs.writeFileSync(latencyPath, latencySvg, 'utf-8');
  generatedFiles.push(latencyPath);

  return generatedFiles;
}

import * as parser from '@babel/parser';

export interface AstCodeRange {
  id: string;
  startLine: number;
  endLine: number;
  snippet: string;
  name?: string;
  type: string;
}

/**
 * Extracts line ranges for top-level symbols and logical blocks.
 * Uses Babel parser for JavaScript/TypeScript, and structural regex/indentation analysis
 * for other languages (Python, Go, Rust, etc.).
 */
export function extractAstLineRanges(code: string, language: string = 'typescript'): AstCodeRange[] {
  if (!code || !code.trim()) return [];

  const normalizedLang = language.toLowerCase();
  const isJsTs = ['javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx'].includes(normalizedLang);

  if (isJsTs) {
    try {
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
        errorRecovery: true,
      });

      const ranges: AstCodeRange[] = [];
      const lines = code.split('\n');

      ast.program.body.forEach((node, idx) => {
        if (!node.loc) return;
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const snippet = lines.slice(startLine - 1, endLine).join('\n');

        let name: string | undefined;
        let type: string = node.type;

        if (node.type === 'FunctionDeclaration' && node.id) {
          name = node.id.name;
          type = 'function';
        } else if (node.type === 'ClassDeclaration' && node.id) {
          name = node.id.name;
          type = 'class';
        } else if (node.type === 'VariableDeclaration') {
          const firstDecl = node.declarations[0];
          if (firstDecl && 'name' in firstDecl.id) {
            name = (firstDecl.id as { name: string }).name;
          }
          type = 'variable';
        } else if (node.type === 'ExportNamedDeclaration' && node.declaration) {
          const decl = node.declaration;
          if ('id' in decl && decl.id && 'name' in decl.id) {
            name = (decl.id as { name: string }).name;
          }
          type = 'export';
        }

        ranges.push({
          id: `ast-${idx}-${startLine}`,
          startLine,
          endLine,
          snippet,
          name,
          type,
        });
      });

      if (ranges.length > 0) {
        return ranges;
      }
    } catch {
      // Fallback to structural heuristic below if Babel parse fails
    }
  }

  // Structural heuristic for Python, Rust, Go, or unparseable JS
  return extractStructuralRanges(code, normalizedLang);
}

function extractStructuralRanges(code: string, lang: string): AstCodeRange[] {
  const lines = code.split('\n');
  const ranges: AstCodeRange[] = [];

  if (lang === 'python' || lang === 'py') {
    let currentStart = -1;
    let currentName: string | undefined;
    let currentType = 'block';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(\s*)(def|async\s+def|class)\s+([a-zA-Z_]\w*)/);

      if (match && match[1].length === 0) {
        // Top-level definition
        if (currentStart !== -1) {
          ranges.push({
            id: `py-${ranges.length}-${currentStart}`,
            startLine: currentStart,
            endLine: i,
            snippet: lines.slice(currentStart - 1, i).join('\n'),
            name: currentName,
            type: currentType,
          });
        }
        currentStart = i + 1;
        currentType = match[2].includes('class') ? 'class' : 'function';
        currentName = match[3];
      }
    }

    if (currentStart !== -1) {
      ranges.push({
        id: `py-${ranges.length}-${currentStart}`,
        startLine: currentStart,
        endLine: lines.length,
        snippet: lines.slice(currentStart - 1, lines.length).join('\n'),
        name: currentName,
        type: currentType,
      });
    }

    if (ranges.length > 0) return ranges;
  }

  // Universal block chunking (by double newline or function signatures)
  let blockStart = 1;
  for (let i = 0; i < lines.length; i++) {
    const isBoundary = lines[i].trim() === '' && i > blockStart + 2;
    if (isBoundary || i === lines.length - 1) {
      const endLine = i === lines.length - 1 ? lines.length : i;
      const snippet = lines.slice(blockStart - 1, endLine).join('\n');
      if (snippet.trim()) {
        ranges.push({
          id: `block-${ranges.length}-${blockStart}`,
          startLine: blockStart,
          endLine,
          snippet,
          type: 'block',
        });
      }
      blockStart = i + 2;
    }
  }

  return ranges;
}

/**
 * Associates each TranslationBlock with its source code startLine and endLine.
 */
export function annotateBlocksWithLineRanges<T extends { code_snippet?: string; startLine?: number; endLine?: number }>(
  sourceCode: string,
  blocks: T[],
  language: string = 'typescript'
): T[] {
  if (!sourceCode || !blocks || blocks.length === 0) return blocks;

  const lines = sourceCode.split('\n');
  const astRanges = extractAstLineRanges(sourceCode, language);

  let searchCursorLine = 0;

  return blocks.map((block) => {
    if (block.startLine && block.endLine) return block;

    const snippet = (block.code_snippet || '').trim();
    if (!snippet) {
      return block;
    }

    // 1. Check exact match in AST ranges
    const matchingAst = astRanges.find((r) => r.snippet.trim() === snippet);
    if (matchingAst) {
      return {
        ...block,
        startLine: matchingAst.startLine,
        endLine: matchingAst.endLine,
      };
    }

    // 2. Locate snippet lines within source code
    const firstSnippetLine = snippet.split('\n')[0].trim();
    for (let i = searchCursorLine; i < lines.length; i++) {
      if (lines[i].includes(firstSnippetLine)) {
        const snippetLineCount = snippet.split('\n').length;
        const startLine = i + 1;
        const endLine = Math.min(lines.length, startLine + snippetLineCount - 1);
        searchCursorLine = endLine;
        return {
          ...block,
          startLine,
          endLine,
        };
      }
    }

    return block;
  });
}

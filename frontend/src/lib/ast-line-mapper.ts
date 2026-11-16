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
  if (lines.length === 0) return ranges;

  const isPython = lang === 'python' || lang === 'py';

  if (isPython) {
    const hasTopLevelDefs = lines.some((l) => /^(def|async\s+def|class)\s+[a-zA-Z_]\w*/.test(l));
    if (hasTopLevelDefs) {
      let currentStart = -1;
      let currentName: string | undefined;
      let currentType = 'block';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s*)(def|async\s+def|class)\s+([a-zA-Z_]\w*)/);

        if (match && match[1].length === 0) {
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
  }

  let currentStart = -1;
  let currentLines: string[] = [];
  let currentType = 'statement';
  let currentName: string | undefined = undefined;
  let parenDepth = 0;

  const flushBlock = (endLine: number) => {
    if (currentStart !== -1 && currentLines.length > 0) {
      const snippet = currentLines.join('\n');
      if (snippet.trim()) {
        ranges.push({
          id: `block-${ranges.length + 1}-${currentStart}`,
          startLine: currentStart,
          endLine,
          snippet,
          name: currentName,
          type: currentType,
        });
      }
      currentStart = -1;
      currentLines = [];
      currentName = undefined;
      currentType = 'statement';
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentStart !== -1) {
        currentLines.push(line);
      }
      continue;
    }

    // Check paren/bracket balance to avoid breaking multi-line expressions
    const openParens = (line.match(/[([{]/g) || []).length;
    const closeParens = (line.match(/[)\]}]/g) || []).length;
    const netParens = openParens - closeParens;

    const isIndented = /^\s+/.test(line);

    // In Python:
    // A top-level definition or statement starts when not indented and parenDepth <= 0
    const isTopLevel = !isIndented && parenDepth <= 0;

    if (isTopLevel && currentStart !== -1) {
      flushBlock(i);
    }

    if (currentStart === -1) {
      currentStart = i + 1;
      if (isPython) {
        const defMatch = line.match(/^(\s*)(def|async\s+def|class)\s+([a-zA-Z_]\w*)/);
        const assignMatch = line.match(/^([a-zA-Z_]\w*)\s*=/);
        const ifMatch = line.match(/^(\s*)(if|elif|else|for|while|try|except|finally|with)\b/);
        const printMatch = line.match(/^(\s*)(print|console\.log|println!|fmt\.Println)\b/);
        const importMatch = line.match(/^(\s*)(import|from)\b/);

        if (defMatch) {
          currentType = defMatch[2].includes('class') ? 'class' : 'function';
          currentName = defMatch[3];
        } else if (assignMatch) {
          currentType = 'assignment';
          currentName = assignMatch[1];
        } else if (ifMatch) {
          currentType = 'control_flow';
          currentName = ifMatch[2];
        } else if (printMatch) {
          currentType = 'output';
          currentName = printMatch[2];
        } else if (importMatch) {
          currentType = 'import';
        } else {
          currentType = 'statement';
        }
      } else {
        const fnMatch = line.match(/(?:function\s+|def\s+|fn\s+|func\s+|class\s+)([a-zA-Z_]\w*)/);
        const assignMatch = line.match(/(?:const|let|var)?\s*([a-zA-Z_]\w*)\s*=/);
        if (fnMatch) {
          currentType = line.includes('class') ? 'class' : 'function';
          currentName = fnMatch[1];
        } else if (assignMatch) {
          currentType = 'assignment';
          currentName = assignMatch[1];
        } else {
          currentType = 'statement';
        }
      }
    }

    currentLines.push(line);
    parenDepth = Math.max(0, parenDepth + netParens);
  }

  flushBlock(lines.length);

  return ranges.length > 0 ? ranges : [
    {
      id: 'block-fallback-1',
      startLine: 1,
      endLine: lines.length,
      snippet: code,
      type: 'script',
    }
  ];
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

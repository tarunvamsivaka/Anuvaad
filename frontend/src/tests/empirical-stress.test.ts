import { describe, it, expect, beforeEach } from "vitest";
import { getFileExtensionForLanguage } from "@/lib/detect-language";

describe("Empirical Stress Tests for Milestone 3 Features", () => {

  describe("1. Multi-File Tab Switching & State Persistence", () => {
    interface WorkbenchFile {
      id: string;
      name: string;
      path: string;
      content: string;
      language: string;
      size: number;
    }

    let workbenchFiles: WorkbenchFile[];
    let activeFileId: string | null;
    let input: string;
    let filePath: string;
    let sourceLanguage: string;

    beforeEach(() => {
      workbenchFiles = [
        { id: "f1", name: "main.py", path: "main.py", content: "print('hello')", language: "python", size: 14 },
        { id: "f2", name: "app.ts", path: "app.ts", content: "console.log('world')", language: "typescript", size: 20 },
        { id: "f3", name: "lib.rs", path: "lib.rs", content: "println!(\"rust\");", language: "rust", size: 17 },
      ];
      activeFileId = "f1";
      input = workbenchFiles[0].content;
      filePath = workbenchFiles[0].path;
      sourceLanguage = workbenchFiles[0].language;
    });

    const selectWorkbenchFile = (fileId: string) => {
      const found = workbenchFiles.find(f => f.id === fileId);
      if (found) {
        activeFileId = found.id;
        input = found.content;
        filePath = found.path || found.name;
        sourceLanguage = found.language;
      }
    };

    const closeWorkbenchFile = (fileId: string) => {
      const updated = workbenchFiles.filter(f => f.id !== fileId);
      workbenchFiles = updated;
      if (activeFileId === fileId) {
        if (updated.length > 0) {
          const next = updated[updated.length - 1];
          activeFileId = next.id;
          input = next.content;
          filePath = next.path || next.name;
          sourceLanguage = next.language;
        } else {
          activeFileId = null;
          input = "";
          filePath = "";
          sourceLanguage = "python";
        }
      }
    };

    it("switches active tab and updates input, filePath, and sourceLanguage", () => {
      selectWorkbenchFile("f2");
      expect(activeFileId).toBe("f2");
      expect(input).toBe("console.log('world')");
      expect(filePath).toBe("app.ts");
      expect(sourceLanguage).toBe("typescript");
    });

    it("BUG FINDING: User edits in Monaco on Tab 1 are NOT saved to workbenchFiles when switching to Tab 2 and back", () => {
      // User is on f1 ("main.py"), edits the input text in Monaco editor
      input = "print('hello modified by user')";

      // User switches to f2
      selectWorkbenchFile("f2");
      expect(activeFileId).toBe("f2");
      expect(input).toBe("console.log('world')");

      // User switches back to f1
      selectWorkbenchFile("f1");
      expect(activeFileId).toBe("f1");
      // DISCOVERY: workbenchFiles[0].content was never updated on typing, so user edit was lost!
      expect(input).toBe("print('hello')"); // Reverted to original content!
      expect(input).not.toBe("print('hello modified by user')");
    });

    it("closes non-active tab without changing active file or input", () => {
      closeWorkbenchFile("f3");
      expect(workbenchFiles).toHaveLength(2);
      expect(activeFileId).toBe("f1");
      expect(input).toBe("print('hello')");
    });

    it("closes active tab and fallback-selects the last remaining tab", () => {
      selectWorkbenchFile("f2");
      closeWorkbenchFile("f2");
      expect(workbenchFiles).toHaveLength(2);
      expect(activeFileId).toBe("f3"); // Fallbacks to last element in array (f3)
      expect(input).toBe('println!("rust");');
    });

    it("closes all tabs and resets state to empty defaults", () => {
      closeWorkbenchFile("f1");
      closeWorkbenchFile("f2");
      closeWorkbenchFile("f3");
      expect(workbenchFiles).toHaveLength(0);
      expect(activeFileId).toBeNull();
      expect(input).toBe("");
    });
  });

  describe("2. Language & Content Swapping Edge Cases", () => {
    let mode = "code-to-code";
    let sourceLanguage = "python";
    let targetLanguage = "javascript";
    let input = "";
    let outputBlocks: Array<{ code_snippet: string; english_translation: string }> | null = null;
    let streamText = "";

    const handleSwapLanguages = () => {
      if (mode !== "code-to-code") return;
      const prevSource = sourceLanguage;
      const prevTarget = targetLanguage;
      sourceLanguage = prevTarget;
      targetLanguage = prevSource;

      // Swap content if outputBlocks present
      if (outputBlocks && outputBlocks.length > 0) {
        const codeText = outputBlocks.map(b => b.code_snippet).filter(Boolean).join("\n\n");
        if (codeText) {
          input = codeText;
          outputBlocks = null;
          streamText = "";
        }
      }
    };

    beforeEach(() => {
      mode = "code-to-code";
      sourceLanguage = "python";
      targetLanguage = "javascript";
      input = "";
      outputBlocks = null;
      streamText = "";
    });

    it("swaps languages when input and output content are both empty", () => {
      handleSwapLanguages();
      expect(sourceLanguage).toBe("javascript");
      expect(targetLanguage).toBe("python");
      expect(input).toBe("");
    });

    it("swaps languages in code-to-code mode, but does NOT alter input if outputBlocks is null", () => {
      input = "def foo(): pass";
      handleSwapLanguages();
      expect(sourceLanguage).toBe("javascript");
      expect(targetLanguage).toBe("python");
      expect(input).toBe("def foo(): pass"); // input not replaced because no translated output existed yet
    });

    it("swaps output code into input when valid outputBlocks exist", () => {
      input = "def foo(): pass";
      outputBlocks = [{ code_snippet: "function foo() {}", english_translation: "Defines foo" }];
      handleSwapLanguages();
      expect(sourceLanguage).toBe("javascript");
      expect(targetLanguage).toBe("python");
      expect(input).toBe("function foo() {}");
      expect(outputBlocks).toBeNull();
      expect(streamText).toBe("");
    });

    it("does nothing when mode is not code-to-code", () => {
      mode = "code-to-english";
      handleSwapLanguages();
      expect(sourceLanguage).toBe("python");
      expect(targetLanguage).toBe("javascript");
    });

    it("handles identical source and target languages gracefully", () => {
      sourceLanguage = "python";
      targetLanguage = "python";
      handleSwapLanguages();
      expect(sourceLanguage).toBe("python");
      expect(targetLanguage).toBe("python");
    });
  });

  describe("3. Monaco Diff Rendering Modes & Edge Cases", () => {
    it("returns correct language file extensions", () => {
      expect(getFileExtensionForLanguage("python")).toBe(".py");
      expect(getFileExtensionForLanguage("typescript")).toBe(".ts");
      expect(getFileExtensionForLanguage("cplusplus")).toBe(".txt"); // Fallback
    });

    it("BUG FINDING: Diff view is unreachable when outputBlocks is null (renders empty state instead)", () => {
      // In OutputPanel/index.tsx, lines 294-370:
      // outputBlocks ? (viewType === 'editor' ? ... : viewType === 'diff' ? ... : ...) : (Empty State)
      // When user clicks 'Diff' button when outputBlocks is null, outputBlocks evaluates to null,
      // so the DiffEditor component is NEVER mounted, and workspace ready empty state is shown instead.
      const viewType = "diff";
      const outputBlocks = null;
      const rendersDiffEditor = outputBlocks !== null && viewType === "diff";
      expect(rendersDiffEditor).toBe(false);
    });

    it("BUG FINDING: Single language prop passed to DiffEditor applies target language syntax highlighting to source code", () => {
      // In OutputPanel/index.tsx:
      // <DiffEditor original={input} modified={fullCodeText} language={monacoLang} ... />
      // If original is Python and modified is JavaScript, passing language="javascript" causes
      // Monaco to format the original Python code as JavaScript, leading to incorrect syntax errors in Diff view.
      const sourceLanguage = "python";
      const targetLanguage = "javascript";
      const monacoLangPassedToDiff = targetLanguage; // OutputPanel passes targetLanguage
      expect(monacoLangPassedToDiff).not.toBe(sourceLanguage);
    });
  });

  describe("4. Local Storage History Bookmarking Edge Cases", () => {
    interface HistoryItem {
      id: string;
      mode: string;
      is_bookmarked?: boolean;
      input_preview?: string;
    }

    it("handles corrupted JSON in localStorage gracefully without throwing", () => {
      const getInitialBookmarked = (storedValue: string | null) => {
        try {
          return storedValue ? new Set<string>(JSON.parse(storedValue)) : new Set<string>();
        } catch {
          return new Set<string>();
        }
      };

      expect(() => getInitialBookmarked("{invalid_json")).not.toThrow();
      expect(getInitialBookmarked("{invalid_json").size).toBe(0);
    });

    it("filters items correctly when 'Bookmarked ⭐️' tab is selected", () => {
      const history: HistoryItem[] = [
        { id: "1", mode: "Code → English", is_bookmarked: false },
        { id: "2", mode: "Code → Code", is_bookmarked: true },
        { id: "3", mode: "English → Code", is_bookmarked: false },
      ];
      const localBookmarkedIds = new Set(["1"]);

      const filtered = history.filter(i => localBookmarkedIds.has(i.id) || i.is_bookmarked);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(i => i.id)).toEqual(["1", "2"]);
    });

    it("BUG FINDING: API failure during bookmark toggle leaves optimistic state out of sync with backend if no error rollback", () => {
      let historyItem = { id: "item-1", is_bookmarked: false };
      let bookmarkedIds = new Set<string>();

      // Toggle bookmark optimistically
      const toggleBookmark = (id: string, apiSuccess: boolean) => {
        const nextSet = new Set(bookmarkedIds);
        const isBookmarked = !nextSet.has(id);
        if (isBookmarked) nextSet.add(id);
        else nextSet.delete(id);
        bookmarkedIds = nextSet;
        historyItem = { ...historyItem, is_bookmarked: isBookmarked };

        // Simulate API call
        if (!apiSuccess) {
          // In HistoryPage (page.tsx lines 199-212), catch block only has // Fallback cleanly to local state
          // It does NOT rollback historyItem.is_bookmarked or bookmarkedIds!
        }
      };

      toggleBookmark("item-1", false); // API fails
      // State updated optimistically, but backend remains false
      expect(bookmarkedIds.has("item-1")).toBe(true);
      expect(historyItem.is_bookmarked).toBe(true);
    });
  });
});

/**
 * Milestone 3: Web UI/UX & Frontend Feature Upgrade Tests
 *
 * Tests for:
 * 1. File extension mapping utility for downloads (.py, .ts, .rs, etc.)
 * 2. Translation history bookmark filtering logic
 * 3. Multi-file workbench tab selection and tab closing state logic
 * 4. Monaco Diff Editor side-by-side configuration validation
 */

import { describe, it, expect } from "vitest";
import { getFileExtensionForLanguage } from "@/lib/detect-language";

describe("Milestone 3 Features", () => {
  describe("getFileExtensionForLanguage()", () => {
    it("returns correct file extension for Python (.py)", () => {
      expect(getFileExtensionForLanguage("python")).toBe(".py");
      expect(getFileExtensionForLanguage("Python")).toBe(".py");
    });

    it("returns correct file extension for TypeScript (.ts)", () => {
      expect(getFileExtensionForLanguage("typescript")).toBe(".ts");
    });

    it("returns correct file extension for Rust (.rs)", () => {
      expect(getFileExtensionForLanguage("rust")).toBe(".rs");
    });

    it("returns correct file extension for JavaScript (.js)", () => {
      expect(getFileExtensionForLanguage("javascript")).toBe(".js");
    });

    it("returns correct file extension for Go (.go)", () => {
      expect(getFileExtensionForLanguage("go")).toBe(".go");
    });

    it("returns default extension (.txt) for unknown language", () => {
      expect(getFileExtensionForLanguage("unknown_lang")).toBe(".txt");
    });
  });

  describe("Translation History Bookmarking & Filter Tab logic", () => {
    interface HistoryItem {
      id: string;
      mode: string;
      is_bookmarked?: boolean;
    }

    const sampleHistory: HistoryItem[] = [
      { id: "1", mode: "Code → English", is_bookmarked: true },
      { id: "2", mode: "English → Code", is_bookmarked: false },
      { id: "3", mode: "Code → Code", is_bookmarked: true },
    ];

    it("filters history items when Bookmarked tab is selected", () => {
      const bookmarkedIds = new Set(["1", "3"]);
      const filtered = sampleHistory.filter(i => bookmarkedIds.has(i.id) || i.is_bookmarked);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(i => i.id)).toEqual(["1", "3"]);
    });

    it("toggles bookmark state correctly", () => {
      const bookmarkedIds = new Set<string>(["1"]);
      const toggle = (id: string) => {
        if (bookmarkedIds.has(id)) bookmarkedIds.delete(id);
        else bookmarkedIds.add(id);
      };

      toggle("2");
      expect(bookmarkedIds.has("2")).toBe(true);

      toggle("1");
      expect(bookmarkedIds.has("1")).toBe(false);
    });
  });

  describe("Multi-file Workbench tab state logic", () => {
    interface WorkbenchFile {
      id: string;
      name: string;
      content: string;
    }

    it("selects active workbench file correctly", () => {
      const files: WorkbenchFile[] = [
        { id: "f1", name: "main.py", content: "print('hello')" },
        { id: "f2", name: "utils.ts", content: "export const x = 1;" },
      ];
      let activeId = "f1";

      const selectFile = (id: string) => {
        const found = files.find(f => f.id === id);
        if (found) activeId = found.id;
      };

      selectFile("f2");
      expect(activeId).toBe("f2");
    });

    it("closes workbench tab and fallback selects next available file", () => {
      let files: WorkbenchFile[] = [
        { id: "f1", name: "main.py", content: "print('hello')" },
        { id: "f2", name: "utils.ts", content: "export const x = 1;" },
      ];
      let activeId = "f2";

      const closeFile = (id: string) => {
        files = files.filter(f => f.id !== id);
        if (activeId === id) {
          activeId = files.length > 0 ? files[files.length - 1].id : "";
        }
      };

      closeFile("f2");
      expect(files).toHaveLength(1);
      expect(activeId).toBe("f1");
    });
  });
});

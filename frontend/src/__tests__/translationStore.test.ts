import { describe, it, expect, beforeEach } from "vitest";
import { useTranslationStore } from "../stores/translationStore";

describe("TranslationStore & ZDR State", () => {
  beforeEach(() => {
    useTranslationStore.setState({
      sourceCode: "def test(): pass",
      translatedCode: "",
      isLoading: false,
      error: null,
      selectedReceipt: null,
      isReceiptModalOpen: false,
    });
  });

  it("should initialize with default python source language and models file", () => {
    const state = useTranslationStore.getState();
    expect(state.sourceLanguage).toBe("python");
    expect(state.targetLanguage).toBe("typescript");
    expect(state.activeView).toBe("repo");
  });

  it("should update source code and translated code correctly", () => {
    useTranslationStore.getState().setSourceCode("def add(a, b): return a + b");
    expect(useTranslationStore.getState().sourceCode).toBe("def add(a, b): return a + b");

    useTranslationStore.getState().setTranslatedCode("export function add(a: number, b: number) { return a + b; }");
    expect(useTranslationStore.getState().translatedCode).toBe("export function add(a: number, b: number) { return a + b; }");
  });

  it("should open and close ZDR receipt modal with audit data", () => {
    const mockReceipt = {
      audit_digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      source_code_hash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      timestamp: 1728410000,
      user_id: "test-user-1",
      ephemeral_lifecycle_ms: 12.4,
      zero_retention_guaranteed: true,
    };

    useTranslationStore.getState().openReceiptModal(mockReceipt);
    expect(useTranslationStore.getState().isReceiptModalOpen).toBe(true);
    expect(useTranslationStore.getState().selectedReceipt?.audit_digest).toBe(mockReceipt.audit_digest);

    useTranslationStore.getState().closeReceiptModal();
    expect(useTranslationStore.getState().isReceiptModalOpen).toBe(false);
  });
});

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTranslationStream } from "@/features/translate/_hooks/useTranslationStream";
import { useTranslationStore } from "@/features/translate/_store/useTranslationStore";

const { fetchEventSourceMock } = vi.hoisted(() => ({ fetchEventSourceMock: vi.fn() }));

vi.mock("@microsoft/fetch-event-source", () => ({ fetchEventSource: fetchEventSourceMock }));
vi.mock("canvas-confetti", () => ({ default: vi.fn().mockResolvedValue(true) }));

describe("English-to-code JSON endpoint integration", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchEventSourceMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    useTranslationStore.getState().setInput("Return the number 42.");
    useTranslationStore.getState().setSessionId("test-session");
    useTranslationStore.getState().setOutputBlocks(null);
    useTranslationStore.getState().setStreamText("");
    useTranslationStore.getState().setRawError("");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses JSON fetch, consumes code blocks, and sends ephemeral mode when history is not opted in", async () => {
    const blocks = [{ id: "block-1", code_snippet: "return 42", english_translation: "Returns 42" }];
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => blocks,
      headers: { get: () => null },
    });

    const { result } = renderHook(() => useTranslationStream({
      mode: "english-to-code",
      sourceLanguage: "python",
      targetLanguage: "python",
      customInstructions: "",
      activeWorkspace: null,
      isPro: false,
      session: null,
      repositoryName: "",
      filePath: "",
      selectedModel: "auto",
      skipAppHistory: true,
    }));

    await act(async () => {
      await result.current.handleTranslate();
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/generate-from-english");
    expect(fetchMock.mock.calls[0][1].headers["X-Anuvaad-Privacy-Mode"]).toBe("ephemeral");
    expect(useTranslationStore.getState().outputBlocks).toEqual(blocks);
    expect(fetchEventSourceMock).not.toHaveBeenCalled();
  });
});

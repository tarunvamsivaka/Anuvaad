/**
 * EMPIRICAL STRESS TEST SUITE for Milestone 3:
 * High-frequency streaming UI state updates, component rendering, zero console errors,
 * stream cancellation, and error boundary recovery.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, renderHook, act } from "@testing-library/react";
import React from "react";
import { useTranslationStream } from "@/features/translate/_hooks/useTranslationStream";
import { MonacoSkeleton } from "@/components/ui/monaco-skeleton";

// Mock canvas-confetti for jsdom environment (where 2D canvas context is stubbed/null)
vi.mock("canvas-confetti", () => ({
  default: vi.fn().mockResolvedValue(true),
}));

describe("Empirical Challenge: Streaming UI States & Console Error Regressions", () => {
  let consoleErrors: string[] = [];
  let consoleWarns: string[] = [];
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeEach(() => {
    consoleErrors = [];
    consoleWarns = [];
    console.error = vi.fn((...args: any[]) => {
      consoleErrors.push(args.map(a => String(a)).join(" "));
      originalError(...args);
    });
    console.warn = vi.fn((...args: any[]) => {
      consoleWarns.push(args.map(a => String(a)).join(" "));
      originalWarn(...args);
    });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    console.error = originalError;
    console.warn = originalWarn;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("handles high-frequency streaming updates without console error regressions", async () => {
    // Mock ReadableStream that emits 100 fast chunks
    const chunks = Array.from({ length: 100 }, (_, i) => `data: {"chunk": "line_${i}\\n"}\n\n`);
    chunks.push('data: {"done": true, "blocks": [{"id": "b1", "original_code": "code", "translated_code": "translated", "line_start": 1, "line_end": 10}]}\n\n');

    let chunkIdx = 0;
    const stream = new ReadableStream({
      pull(controller) {
        if (chunkIdx < chunks.length) {
          controller.enqueue(new TextEncoder().encode(chunks[chunkIdx]));
          chunkIdx++;
        } else {
          controller.close();
        }
      },
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      body: stream,
    } as Response);

    const setSessionId = vi.fn();
    const setModelUsed = vi.fn();

    const { result } = renderHook(() =>
      useTranslationStream({
        mode: "code-to-code",
        sourceLanguage: "python",
        targetLanguage: "typescript",
        input: "def test(): pass",
        customInstructions: "",
        activeWorkspace: null,
        isPro: false,
        session: null,
        sessionId: "test-session",
        setSessionId,
        repositoryName: "",
        filePath: "",
        setModelUsed,
      })
    );

    await act(async () => {
      await result.current.handleTranslate();
    });

    // Verify state transitioned back from streaming to finished
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.outputBlocks).not.toBeNull();
    expect(result.current.outputBlocks?.length).toBe(1);

    // Verify zero console errors logged during stress stream
    expect(consoleErrors).toEqual([]);
  });

  it("gracefully aborts stream on user cancellation with zero console error regressions", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"chunk": "partial... "}\n\n'));
      },
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      body: stream,
    } as Response);

    const setSessionId = vi.fn();
    const setModelUsed = vi.fn();

    const { result } = renderHook(() =>
      useTranslationStream({
        mode: "code-to-code",
        sourceLanguage: "python",
        targetLanguage: "typescript",
        input: "print('hello')",
        customInstructions: "",
        activeWorkspace: null,
        isPro: false,
        session: null,
        sessionId: "test-session-2",
        setSessionId,
        repositoryName: "",
        filePath: "",
        setModelUsed,
      })
    );

    // Start translation
    act(() => {
      void result.current.handleTranslate();
    });

    expect(result.current.isStreaming).toBe(true);

    // Cancel translation midway
    await act(async () => {
      await result.current.handleTranslate(); // Toggles cancellation
    });

    expect(result.current.isStreaming).toBe(false);
    expect(consoleErrors).toEqual([]);
  });

  it("renders MonacoSkeleton correctly during streaming/loading state", () => {
    const { container, rerender } = render(<MonacoSkeleton lines={15} />);
    expect(container.firstChild).toBeTruthy();
    const lines = container.querySelectorAll(".shrink-0.w-10 > div");
    expect(lines.length).toBe(15);

    // Dynamic rerender with different line count
    rerender(<MonacoSkeleton lines={25} />);
    const newLines = container.querySelectorAll(".shrink-0.w-10 > div");
    expect(newLines.length).toBe(25);
    expect(consoleErrors).toEqual([]);
  });
});

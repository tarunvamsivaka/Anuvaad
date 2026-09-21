import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { useWasmRunner } from "@/features/translate/_hooks/useWasmRunner";
import { SandboxBar } from "@/features/translate/_components/SandboxBar";

describe("WebAssembly Client-Side Sandbox Suite", () => {
  it("executes basic JavaScript snippet and captures stdout and return value", async () => {
    const { result } = renderHook(() => useWasmRunner());

    let execResult: any;
    await act(async () => {
      execResult = await result.current.runCode("console.log('Hello Wasm'); return 42 * 2;", "javascript");
    });

    expect(execResult.status).toBe("success");
    expect(execResult.stdout).toContain("Hello Wasm");
    expect(execResult.result).toBe("84");
    expect(execResult.error).toBeNull();
    expect(execResult.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("captures runtime errors gracefully without unhandled crashes", async () => {
    const { result } = renderHook(() => useWasmRunner());

    let execResult: any;
    await act(async () => {
      execResult = await result.current.runCode("nonExistentFunction();", "javascript");
    });

    expect(execResult.status).toBe("error");
    expect(execResult.error).toBeDefined();
    expect(execResult.stderr.length).toBeGreaterThan(0);
  });

  it("renders SandboxBar and triggers execution on button click", async () => {
    render(<SandboxBar code="console.log('Testing SandboxBar'); return true;" language="javascript" />);

    const runBtn = screen.getByRole("button", { name: /run in client sandbox/i });
    expect(runBtn).toBeInTheDocument();
    expect(screen.getByText(/In-Browser Wasm · \$0.00 Server Burn/i)).toBeInTheDocument();

    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText("SANDBOX TERMINAL OUTPUT")).toBeInTheDocument();
      expect(screen.getByText("Testing SandboxBar")).toBeInTheDocument();
    });
  });
});

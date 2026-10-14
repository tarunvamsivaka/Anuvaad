"use client";

import { useEffect } from "react";
import { create } from "zustand";

export type BackendConnectionState = "warming" | "ready" | "degraded";

interface BackendPrewarmState {
  connectionState: BackendConnectionState;
  setConnectionState: (state: BackendConnectionState) => void;
  isColdStarting: boolean;
  setIsColdStarting: (isColdStarting: boolean) => void;
  coldStartMessage: string | null;
  setColdStartMessage: (msg: string | null) => void;
}

export const useBackendPrewarmStore = create<BackendPrewarmState>((set) => ({
  connectionState: "warming",
  setConnectionState: (connectionState) => set({ connectionState }),
  isColdStarting: false,
  setIsColdStarting: (isColdStarting) => set({ isColdStarting }),
  coldStartMessage: null,
  setColdStartMessage: (coldStartMessage) => set({ coldStartMessage }),
}));

export function useBackendPrewarm() {
  const { connectionState, setConnectionState, isColdStarting, setIsColdStarting, coldStartMessage, setColdStartMessage } = useBackendPrewarmStore();

  useEffect(() => {
    // Non-blocking fire-and-forget pre-warming ping on mount
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const endpoint = apiUrl ? `${apiUrl}/health/live` : "/health/live";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    fetch(endpoint, {
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timeoutId);
        if (res.ok) {
          setConnectionState("ready");
        } else {
          setConnectionState("degraded");
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        setConnectionState("degraded");
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [setConnectionState]);

  return {
    connectionState,
    isColdStarting,
    setIsColdStarting,
    coldStartMessage,
    setColdStartMessage,
  };
}

/**
 * Creates a watchdog timer to detect Render cold-start latency (> 2500ms before first byte).
 */
export function startColdStartWatchdog(onSlowResponse: () => void): () => void {
  const timer = setTimeout(() => {
    onSlowResponse();
  }, 2500);

  return () => clearTimeout(timer);
}

import { describe, it, expect, vi } from "vitest";
import { createStreamBuffer } from "@/lib/stream-consumer";

describe("rAF Stream Buffer & State Contention Elimination", () => {
  it("triggers at most 2 flush calls when pushing 100 rapid stream chunks within 10ms", async () => {
    const onFlush = vi.fn();
    const onDone = vi.fn();

    // Mock requestAnimationFrame using a simulated frame scheduler
    let frameId = 0;
    const callbacks = new Map<number, () => void>();

    const mockRequestFrame = vi.fn((cb: () => void) => {
      frameId += 1;
      const currentId = frameId;
      callbacks.set(currentId, cb);
      return currentId;
    });

    const mockCancelFrame = vi.fn((id: number) => {
      callbacks.delete(id);
    });

    const buffer = createStreamBuffer({
      onFlush,
      onDone,
      requestFrame: mockRequestFrame,
      cancelFrame: mockCancelFrame,
    });

    // Push 100 chunks rapidly in tight succession (synchronous loop simulating 10ms network bursts)
    for (let i = 0; i < 100; i++) {
      buffer.push(`chunk-${i} `);
    }

    // Since rAF is throttled, only ONE frame should be scheduled despite 100 pushes
    expect(mockRequestFrame).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledTimes(0);

    // Simulate 1st frame flush (16.6ms tick)
    const firstFrameCb = callbacks.get(1);
    expect(firstFrameCb).toBeDefined();
    firstFrameCb?.();

    // First flush occurred, receiving the concatenated chunks
    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush.mock.calls[0][0]).toContain("chunk-0");
    expect(onFlush.mock.calls[0][0]).toContain("chunk-99");

    // Complete the stream — synchronous final flush if anything remained, then onDone
    buffer.complete();
    expect(onDone).toHaveBeenCalledTimes(1);

    // Total flushes must be <= 2
    expect(onFlush.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("performs immediate synchronous flush on complete if tokens remain in buffer", () => {
    const onFlush = vi.fn();
    const callbacks = new Map<number, () => void>();
    let id = 0;

    const buffer = createStreamBuffer({
      onFlush,
      requestFrame: (cb) => {
        id += 1;
        callbacks.set(id, cb);
        return id;
      },
      cancelFrame: (i) => callbacks.delete(i),
    });

    buffer.push("initial chunk");
    buffer.complete(); // finalize before frame tick

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith("initial chunk");
  });

  it("cancels pending frame and discards buffer when aborted", () => {
    const onFlush = vi.fn();
    const cancelFrame = vi.fn();

    const buffer = createStreamBuffer({
      onFlush,
      requestFrame: () => 42,
      cancelFrame,
    });

    buffer.push("discardable chunk");
    buffer.abort();

    expect(cancelFrame).toHaveBeenCalledWith(42);
    expect(onFlush).not.toHaveBeenCalled();
    expect(buffer.getPendingCount()).toBe(0);
  });
});

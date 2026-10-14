/**
 * High-performance rAF-batched stream consumer for SSE and ReadableStream chunks.
 * Eliminates state thrashing (80-120 re-renders/sec -> max 60 FPS / 16.6ms cadence).
 */

export interface StreamBufferOptions {
  onFlush: (bufferedChunk: string) => void;
  onDone?: () => void;
  onError?: (err: unknown) => void;
  /** Custom requestAnimationFrame implementation for testing environments */
  requestFrame?: (cb: () => void) => number;
  /** Custom cancelAnimationFrame implementation for testing environments */
  cancelFrame?: (id: number) => void;
}

export interface StreamBufferController {
  push: (chunk: string) => void;
  complete: () => void;
  abort: () => void;
  getPendingCount: () => number;
}

export function createStreamBuffer(options: StreamBufferOptions): StreamBufferController {
  const { onFlush, onDone } = options;
  const raf = options.requestFrame ?? (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (cb: () => void) => setTimeout(cb, 16) as unknown as number);
  const cancelRaf = options.cancelFrame ?? (typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : (id: number) => clearTimeout(id as unknown as NodeJS.Timeout));

  let chunkBuffer = "";
  let rafId: number | null = null;
  let isAborted = false;
  let isCompleted = false;

  const flushBuffer = () => {
    rafId = null;
    if (chunkBuffer.length > 0 && !isAborted) {
      const data = chunkBuffer;
      chunkBuffer = "";
      onFlush(data);
    }
  };

  const scheduleFlush = () => {
    if (rafId !== null || isAborted || isCompleted) return;
    rafId = raf(() => {
      flushBuffer();
    });
  };

  return {
    push(chunk: string) {
      if (isAborted || isCompleted || !chunk) return;
      chunkBuffer += chunk;
      scheduleFlush();
    },
    complete() {
      if (isCompleted || isAborted) return;
      isCompleted = true;
      if (rafId !== null) {
        cancelRaf(rafId);
        rafId = null;
      }
      // Guarantee zero dropped tokens via final synchronous flush
      if (chunkBuffer.length > 0) {
        const finalData = chunkBuffer;
        chunkBuffer = "";
        onFlush(finalData);
      }
      onDone?.();
    },
    abort() {
      isAborted = true;
      chunkBuffer = "";
      if (rafId !== null) {
        cancelRaf(rafId);
        rafId = null;
      }
    },
    getPendingCount() {
      return chunkBuffer.length;
    },
  };
}

/**
 * Consumes a ReadableStream (e.g., fetch body) with rAF throttling.
 */
export async function consumeSSEStream(
  stream: ReadableStream<Uint8Array>,
  options: StreamBufferOptions,
  signal?: AbortSignal
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  const buffer = createStreamBuffer(options);

  if (signal) {
    signal.addEventListener("abort", () => {
      buffer.abort();
      reader.cancel().catch(() => {});
    }, { once: true });
  }

  try {
    while (true) {
      if (signal?.aborted) {
        buffer.abort();
        break;
      }
      const { done, value } = await reader.read();
      if (done) {
        buffer.complete();
        break;
      }
      if (value) {
        const text = decoder.decode(value, { stream: true });
        buffer.push(text);
      }
    }
  } catch (err) {
    buffer.abort();
    options.onError?.(err);
    throw err;
  } finally {
    reader.releaseLock();
  }
}

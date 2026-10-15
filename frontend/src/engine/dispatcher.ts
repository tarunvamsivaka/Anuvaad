import { modernizeReactCode } from './index';
import { TransformOptions, TransformResult } from './types';

let workerInstance: Worker | null = null;
let currentRequestId = 0;
const pendingRequests = new Map<
  number,
  { resolve: (res: TransformResult) => void; reject: (err: any) => void }
>();

function getOrCreateWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }

  if (!workerInstance) {
    try {
      workerInstance = new Worker(
        new URL('./codemod.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerInstance.onmessage = (event: MessageEvent) => {
        const { id, success, result, error } = event.data || {};
        const pending = pendingRequests.get(id);
        if (pending) {
          pendingRequests.delete(id);
          if (success) {
            pending.resolve(result);
          } else {
            pending.reject(new Error(error));
          }
        }
      };

      workerInstance.onerror = (err) => {
        console.error('Anuvaad Web Worker error:', err);
        pendingRequests.forEach((pending) => {
          pending.reject(err);
        });
        pendingRequests.clear();
      };
    } catch (e) {
      console.warn('Could not initialize Web Worker, falling back to main-thread execution:', e);
      workerInstance = null;
    }
  }

  return workerInstance;
}

/**
 * Dispatch transformation off-thread via Web Worker if available, or locally.
 * Guarantees zero network calls and complete in-browser execution.
 */
export async function executeModernization(
  sourceCode: string,
  options: TransformOptions = {}
): Promise<TransformResult> {
  const worker = getOrCreateWorker();

  if (worker) {
    return new Promise<TransformResult>((resolve, reject) => {
      const id = ++currentRequestId;
      pendingRequests.set(id, { resolve, reject });
      worker.postMessage({ id, sourceCode, options });
    });
  }

  // Fallback to synchronous in-thread execution (e.g., in node/SSR environments)
  return Promise.resolve(modernizeReactCode(sourceCode, options));
}

import { modernizeReactCode } from './index';

// Dedicated Web Worker for off-thread AST modernization
self.onmessage = (event: MessageEvent) => {
  const { id, sourceCode, options } = event.data || {};

  try {
    const result = modernizeReactCode(sourceCode, options);
    self.postMessage({ id, success: true, result });
  } catch (err: any) {
    self.postMessage({
      id,
      success: false,
      error: err.message || 'Worker transformation failed',
    });
  }
};

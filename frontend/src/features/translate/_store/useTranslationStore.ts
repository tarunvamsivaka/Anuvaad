import { create } from 'zustand';
import { TranslationBlock } from '../_types';

interface TranslationState {
  input: string;
  setInput: (input: string) => void;

  streamText: string;
  setStreamText: (streamText: string | ((prev: string) => string)) => void;

  isStreaming: boolean;
  setIsStreaming: (isStreaming: boolean) => void;

  outputBlocks: TranslationBlock[] | null;
  setOutputBlocks: (blocks: TranslationBlock[] | null | ((prev: TranslationBlock[] | null) => TranslationBlock[] | null)) => void;

  originalBlocks: TranslationBlock[] | null;
  setOriginalBlocks: (blocks: TranslationBlock[] | null) => void;

  rawError: string;
  setRawError: (error: string) => void;

  detectedLang: string | null;
  setDetectedLang: (lang: string | null) => void;

  modelUsed: string | null;
  setModelUsed: (model: string | null) => void;

  sessionId: string;
  setSessionId: (id: string) => void;

  diffOriginalCode: string | null;
  setDiffOriginalCode: (code: string | null) => void;
}

export const useTranslationStore = create<TranslationState>((set) => ({
  input: "",
  setInput: (input) => set({ input }),

  streamText: "",
  setStreamText: (streamText) => set((state) => ({ 
    streamText: typeof streamText === 'function' ? streamText(state.streamText) : streamText 
  })),

  isStreaming: false,
  setIsStreaming: (isStreaming) => set({ isStreaming }),

  outputBlocks: null,
  setOutputBlocks: (outputBlocks) => set((state) => ({ 
    outputBlocks: typeof outputBlocks === 'function' ? outputBlocks(state.outputBlocks) : outputBlocks 
  })),

  originalBlocks: null,
  setOriginalBlocks: (originalBlocks) => set({ originalBlocks }),

  rawError: "",
  setRawError: (rawError) => set({ rawError }),

  detectedLang: null,
  setDetectedLang: (detectedLang) => set({ detectedLang }),

  modelUsed: null,
  setModelUsed: (modelUsed) => set({ modelUsed }),

  sessionId: "",
  setSessionId: (sessionId) => set({ sessionId }),

  diffOriginalCode: null,
  setDiffOriginalCode: (diffOriginalCode) => set({ diffOriginalCode }),
}));

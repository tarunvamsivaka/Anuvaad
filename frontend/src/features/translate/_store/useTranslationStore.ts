import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TranslationBlock } from '../_types';
import { annotateBlocksWithLineRanges } from '@/lib/ast-line-mapper';
import { ExplanationDepth } from '../_components/Toolbar/DepthSlider';

interface TranslationState {
  input: string;
  setInput: (input: string) => void;

  streamText: string;
  setStreamText: (streamText: string | ((prev: string) => string)) => void;

  isStreaming: boolean;
  setIsStreaming: (isStreaming: boolean) => void;

  outputBlocks: TranslationBlock[] | null;
  blockIds: string[];
  blocksById: Record<string, TranslationBlock>;
  setOutputBlocks: (blocks: TranslationBlock[] | null | ((prev: TranslationBlock[] | null) => TranslationBlock[] | null)) => void;
  updateBlockEnglish: (blockId: string, newEnglish: string) => void;

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

  activeHoveredBlockId: string | null;
  setActiveHoveredBlockId: (id: string | null) => void;

  executionEngine: "cloud" | "byok" | "offline";
  setExecutionEngine: (engine: "cloud" | "byok" | "offline") => void;

  explanationDepth: ExplanationDepth;
  setExplanationDepth: (depth: ExplanationDepth) => void;
}

function normalizeBlocks(blocks: TranslationBlock[] | null) {
  if (!blocks || !Array.isArray(blocks)) {
    return { blockIds: [], blocksById: {} };
  }
  const blockIds: string[] = [];
  const blocksById: Record<string, TranslationBlock> = {};
  blocks.forEach((b, idx) => {
    const id = b.id || `block-${idx}`;
    const blockWithId = { ...b, id };
    blockIds.push(id);
    blocksById[id] = blockWithId;
  });
  return { blockIds, blocksById };
}

export const useTranslationStore = create<TranslationState>()(
  persist(
    (set) => ({
  input: "",
  setInput: (input) => set({ input }),

  streamText: "",
  setStreamText: (streamText) => set((state) => ({ 
    streamText: typeof streamText === 'function' ? streamText(state.streamText) : streamText 
  })),

  isStreaming: false,
  setIsStreaming: (isStreaming) => set({ isStreaming }),

  outputBlocks: null,
  blockIds: [],
  blocksById: {},
  setOutputBlocks: (outputBlocks) => set((state) => {
    const rawNext = typeof outputBlocks === 'function' ? outputBlocks(state.outputBlocks) : outputBlocks;
    const nextBlocks = rawNext && Array.isArray(rawNext) && state.input
      ? annotateBlocksWithLineRanges(state.input, rawNext, state.detectedLang || "typescript")
      : rawNext;
    const { blockIds, blocksById } = normalizeBlocks(nextBlocks);
    return { outputBlocks: nextBlocks, blockIds, blocksById };
  }),

  updateBlockEnglish: (blockId, newEnglish) => set((state) => {
    const existing = state.blocksById[blockId];
    if (!existing) return state;
    const updated = { ...existing, english_translation: newEnglish };
    const nextBlocksById = { ...state.blocksById, [blockId]: updated };
    const nextBlocks = (state.outputBlocks || []).map((b) => (b.id === blockId ? updated : b));
    return {
      blocksById: nextBlocksById,
      outputBlocks: nextBlocks,
    };
  }),

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

  activeHoveredBlockId: null,
  setActiveHoveredBlockId: (activeHoveredBlockId) => set({ activeHoveredBlockId }),

  executionEngine: "cloud",
  setExecutionEngine: (executionEngine) => set({ executionEngine }),

  explanationDepth: "dev",
  setExplanationDepth: (explanationDepth) => set({ explanationDepth }),
    }),
    {
      name: "anuvaad-active-draft",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.sessionStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      partialize: (state) => ({
        input: state.input,
        detectedLang: state.detectedLang,
        sessionId: state.sessionId,
        outputBlocks: state.outputBlocks,
        originalBlocks: state.originalBlocks,
        diffOriginalCode: state.diffOriginalCode,
        explanationDepth: state.explanationDepth,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.outputBlocks) {
          const { blockIds, blocksById } = normalizeBlocks(state.outputBlocks);
          state.blockIds = blockIds;
          state.blocksById = blocksById;
        }
      },
    }
  )
);

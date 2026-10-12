import { create } from "zustand";
import { executeModernization } from "@/engine/dispatcher";
import { TransformChange } from "@/engine/types";

export interface RepoFileItem {
  path: string;
  sourceCode: string;
  translatedCode?: string;
  status: "pending" | "translating" | "completed" | "failed";
  language?: string;
  astValid?: boolean;
  stats?: {
    stateVariables: number;
    effects: number;
    methodsConverted: number;
    timeMs: number;
  };
}

interface TranslationState {
  // Modernization State
  sourceCode: string;
  translatedCode: string;
  isLoading: boolean;
  error: string | null;
  changes: TransformChange[];
  stats: {
    stateVariables: number;
    effects: number;
    methodsConverted: number;
    timeMs: number;
  } | null;

  // View & Repository Explorer State
  activeView: "editor" | "repo" | "symbols" | "audit";
  activeRepoId: string | null;
  repoName: string;
  repoFiles: Record<string, RepoFileItem>;
  selectedFilePath: string | null;
  isBatchTranslating: boolean;
  isGithubPrModalOpen: boolean;
  isByokModalOpen: boolean;
  byokApiKey: string;
  isReceiptModalOpen: boolean;
  selectedReceipt: any | null;

  // Actions
  setSourceCode: (code: string) => void;
  setTranslatedCode: (code: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (err: string | null) => void;
  runModernization: () => Promise<void>;
  setActiveView: (view: "editor" | "repo" | "symbols" | "audit") => void;
  selectFile: (path: string) => void;
  setBatchTranslating: (isTranslating: boolean) => void;
  updateFileTranslation: (path: string, translatedCode: string, astValid: boolean) => void;
  openGithubPrModal: () => void;
  closeGithubPrModal: () => void;
  openByokModal: () => void;
  closeByokModal: () => void;
  setByokApiKey: (key: string) => void;
  openReceiptModal: (receipt: any) => void;
  closeReceiptModal: () => void;
}

const DEFAULT_REACT_FILES: Record<string, RepoFileItem> = {
  "src/components/UserProfileCard.tsx": {
    path: "src/components/UserProfileCard.tsx",
    status: "completed",
    language: "typescript",
    astValid: true,
    sourceCode: `import React, { Component } from 'react';

interface UserProfileProps {
  userId: string;
  initialRole?: string;
}

interface UserProfileState {
  loading: boolean;
  userData: { name: string; email: string } | null;
  error: string | null;
}

export class UserProfileCard extends Component<UserProfileProps, UserProfileState> {
  state = {
    loading: true,
    userData: null,
    error: null,
  };

  componentDidMount() {
    console.log('Fetching user profile for:', this.props.userId);
  }

  componentWillUnmount() {
    console.log('Cleaning up profile subscription');
  }

  handleRefresh = () => {
    this.setState({ loading: true, error: null });
  };

  render() {
    const { loading, userData } = this.state;

    return (
      <div className="profile-card">
        <h3>User Profile: {this.props.userId}</h3>
        {loading ? (
          <p>Loading details...</p>
        ) : (
          <div>
            <p>Name: {userData?.name}</p>
            <button onClick={this.handleRefresh}>Refresh Profile</button>
          </div>
        )}
      </div>
    );
  }
}
`,
    translatedCode: `import React, { useState, useEffect } from 'react';

interface UserProfileProps {
  userId: string;
  initialRole?: string;
}

interface UserProfileState {
  loading: boolean;
  userData: { name: string; email: string } | null;
  error: string | null;
}

export function UserProfileCard(props: UserProfileProps) {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);

  const handleRefresh = () => {
    setLoading(true), setError(null);
  };

  useEffect(() => {
    console.log('Fetching user profile for:', props.userId);
    return () => {
      console.log('Cleaning up profile subscription');
    };
  }, []);

  return (
    <div className="profile-card">
      <h3>User Profile: {props.userId}</h3>
      {loading ? (
        <p>Loading details...</p>
      ) : (
        <div>
          <p>Name: {userData?.name}</p>
          <button onClick={handleRefresh}>Refresh Profile</button>
        </div>
      )}
    </div>
  );
}
`,
  },
  "src/components/CounterTimer.tsx": {
    path: "src/components/CounterTimer.tsx",
    status: "pending",
    language: "typescript",
    sourceCode: `import React, { Component } from 'react';

export class CounterTimer extends Component {
  state = {
    seconds: 0,
    isActive: false,
  };

  componentDidMount() {
    console.log('Timer started');
  }

  componentWillUnmount() {
    console.log('Timer cleared');
  }

  handleStart = () => {
    this.setState({ isActive: true });
  };

  render() {
    return (
      <div className="timer">
        <span>Seconds: {this.state.seconds}</span>
        <button onClick={this.handleStart}>Start</button>
      </div>
    );
  }
}
`,
  },
};

export const useTranslationStore = create<TranslationState>((set, get) => ({
  sourceCode: DEFAULT_REACT_FILES["src/components/UserProfileCard.tsx"].sourceCode,
  translatedCode: DEFAULT_REACT_FILES["src/components/UserProfileCard.tsx"].translatedCode || "",
  isLoading: false,
  error: null,
  changes: [],
  stats: {
    stateVariables: 3,
    effects: 1,
    methodsConverted: 1,
    timeMs: 4.2,
  },

  activeView: "repo",
  activeRepoId: "legacy-react-enterprise-app",
  repoName: "enterprise/legacy-react-app",
  repoFiles: DEFAULT_REACT_FILES,
  selectedFilePath: "src/components/UserProfileCard.tsx",
  isBatchTranslating: false,
  isGithubPrModalOpen: false,
  isByokModalOpen: false,
  byokApiKey: "",
  isReceiptModalOpen: false,
  selectedReceipt: null,

  setSourceCode: (code) => set({ sourceCode: code }),
  setTranslatedCode: (code) => set({ translatedCode: code }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (err) => set({ error: err }),

  runModernization: async () => {
    const { sourceCode, selectedFilePath } = get();
    if (!sourceCode.trim()) return;

    set({ isLoading: true, error: null });

    try {
      const result = await executeModernization(sourceCode);

      if (!result.success) {
        set({
          error: result.errors?.join(", ") || "AST modernization failed.",
          isLoading: false,
        });
        return;
      }

      set({
        translatedCode: result.code,
        changes: result.changes,
        stats: result.stats,
        isLoading: false,
      });

      if (selectedFilePath && get().repoFiles[selectedFilePath]) {
        const files = { ...get().repoFiles };
        files[selectedFilePath] = {
          ...files[selectedFilePath],
          translatedCode: result.code,
          status: "completed",
          astValid: true,
          stats: result.stats,
        };
        set({ repoFiles: files });
      }
    } catch (err: any) {
      set({
        error: err.message || "Failed to transform code.",
        isLoading: false,
      });
    }
  },

  setActiveView: (view) => set({ activeView: view }),
  selectFile: (path) => {
    const file = get().repoFiles[path];
    if (file) {
      set({
        selectedFilePath: path,
        sourceCode: file.sourceCode,
        translatedCode: file.translatedCode || "",
      });
    }
  },
  setBatchTranslating: (isTranslating) => set({ isBatchTranslating: isTranslating }),
  updateFileTranslation: (path, translatedCode, astValid) => {
    const files = { ...get().repoFiles };
    if (files[path]) {
      files[path] = {
        ...files[path],
        translatedCode,
        astValid,
        status: astValid ? "completed" : "failed",
      };
      set({ repoFiles: files });
    }
  },
  openGithubPrModal: () => set({ isGithubPrModalOpen: true }),
  closeGithubPrModal: () => set({ isGithubPrModalOpen: false }),
  openByokModal: () => set({ isByokModalOpen: true }),
  closeByokModal: () => set({ isByokModalOpen: false }),
  setByokApiKey: (key) => set({ byokApiKey: key }),
  openReceiptModal: (receipt) => set({ selectedReceipt: receipt, isReceiptModalOpen: true }),
  closeReceiptModal: () => set({ isReceiptModalOpen: false }),
}));

import { create } from "zustand";
import { TranslationResponse, ZdrAuditReceipt } from "@/lib/api";

export type LanguageOption =
  | "python"
  | "typescript"
  | "javascript"
  | "go"
  | "rust"
  | "java"
  | "cpp"
  | "csharp";

export interface RepoFileItem {
  path: string;
  sourceCode: string;
  translatedCode?: string;
  language: LanguageOption;
  status: "pending" | "translating" | "completed" | "failed";
  astValid?: boolean;
}

interface TranslationState {
  // Single-File Mode State
  sourceLanguage: LanguageOption;
  targetLanguage: LanguageOption;
  sourceCode: string;
  translatedCode: string;
  isLoading: boolean;
  error: string | null;
  lastResponse: TranslationResponse | null;
  selectedReceipt: ZdrAuditReceipt | null;
  isReceiptModalOpen: boolean;

  // Enterprise Repository Mode State
  activeView: "editor" | "repo" | "symbols" | "audit";
  activeRepoId: string | null;
  repoName: string;
  repoFiles: Record<string, RepoFileItem>;
  selectedFilePath: string | null;
  isBatchTranslating: boolean;
  isGithubPrModalOpen: boolean;

  // Setters
  setSourceLanguage: (lang: LanguageOption) => void;
  setTargetLanguage: (lang: LanguageOption) => void;
  setSourceCode: (code: string) => void;
  setTranslatedCode: (code: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (err: string | null) => void;
  setLastResponse: (res: TranslationResponse | null) => void;
  openReceiptModal: (receipt: ZdrAuditReceipt) => void;
  closeReceiptModal: () => void;

  // Repo Setters
  setActiveView: (view: "editor" | "repo" | "symbols" | "audit") => void;
  setRepoFiles: (files: Record<string, RepoFileItem>, repoName: string, repoId: string) => void;
  selectFile: (path: string) => void;
  setBatchTranslating: (isTranslating: boolean) => void;
  updateFileTranslation: (path: string, translatedCode: string, astValid: boolean) => void;
  openGithubPrModal: () => void;
  closeGithubPrModal: () => void;
}

const DEFAULT_REPO_FILES: Record<string, RepoFileItem> = {
  "src/models.py": {
    path: "src/models.py",
    language: "python",
    status: "completed",
    astValid: true,
    sourceCode: `class UserAccount:\n    def __init__(self, user_id: str, email: str):\n        self.user_id = user_id\n        self.email = email\n        self.is_active = True`,
    translatedCode: `export class UserAccount {\n    constructor(\n        public userId: string,\n        public email: string,\n        public isActive: boolean = true\n    ) {}\n}`,
  },
  "src/service.py": {
    path: "src/service.py",
    language: "python",
    status: "pending",
    sourceCode: `from .models import UserAccount\n\nclass AuthService:\n    def authenticate(self, account: UserAccount) -> bool:\n        return account.is_active`,
  },
  "src/main.py": {
    path: "src/main.py",
    language: "python",
    status: "pending",
    sourceCode: `from .service import AuthService\nfrom .models import UserAccount\n\ndef main():\n    user = UserAccount("usr_1", "dev@anuvaad.internal")\n    auth = AuthService()\n    print("Auth:", auth.authenticate(user))`,
  },
};

export const useTranslationStore = create<TranslationState>((set, get) => ({
  sourceLanguage: "python",
  targetLanguage: "typescript",
  sourceCode: DEFAULT_REPO_FILES["src/models.py"].sourceCode,
  translatedCode: DEFAULT_REPO_FILES["src/models.py"].translatedCode || "",
  isLoading: false,
  error: null,
  lastResponse: null,
  selectedReceipt: null,
  isReceiptModalOpen: false,

  activeView: "repo",
  activeRepoId: "demo-repo-anuvaad-core",
  repoName: "anuvaad/core-modernization",
  repoFiles: DEFAULT_REPO_FILES,
  selectedFilePath: "src/models.py",
  isBatchTranslating: false,
  isGithubPrModalOpen: false,

  setSourceLanguage: (lang) => set({ sourceLanguage: lang }),
  setTargetLanguage: (lang) => set({ targetLanguage: lang }),
  setSourceCode: (code) => set({ sourceCode: code }),
  setTranslatedCode: (code) => set({ translatedCode: code }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (err) => set({ error: err }),
  setLastResponse: (res) => set({ lastResponse: res }),
  openReceiptModal: (receipt) => set({ selectedReceipt: receipt, isReceiptModalOpen: true }),
  closeReceiptModal: () => set({ isReceiptModalOpen: false }),

  setActiveView: (view) => set({ activeView: view }),
  setRepoFiles: (files, repoName, repoId) => {
    const firstKey = Object.keys(files)[0] || null;
    set({
      repoFiles: files,
      repoName,
      activeRepoId: repoId,
      selectedFilePath: firstKey,
      sourceCode: firstKey ? files[firstKey].sourceCode : "",
      translatedCode: firstKey ? files[firstKey].translatedCode || "" : "",
    });
  },
  selectFile: (path) => {
    const file = get().repoFiles[path];
    if (file) {
      set({
        selectedFilePath: path,
        sourceCode: file.sourceCode,
        translatedCode: file.translatedCode || "",
        sourceLanguage: file.language,
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
      set({
        repoFiles: files,
        translatedCode: get().selectedFilePath === path ? translatedCode : get().translatedCode,
      });
    }
  },
  openGithubPrModal: () => set({ isGithubPrModalOpen: true }),
  closeGithubPrModal: () => set({ isGithubPrModalOpen: false }),
}));

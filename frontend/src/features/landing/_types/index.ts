export type SceneId =
  | "repository-discovery"
  | "code-confusion"
  | "recognition"
  | "understanding"
  | "repository-intelligence"
  | "english-modification"
  | "code-updates"
  | "future-vision"
  | "final-cta";

export interface SceneProps {
  id: SceneId;
  active: boolean;
  progress: number; // 0 to 1 progress for this specific scene
  globalProgress: number; // 0 to 1 progress of the entire landing page
}

export interface SceneConfig {
  id: SceneId;
  title: string;
  subtitle?: string;
  isPinned: boolean;
  scrollWeight: number; // relative weight of scroll distance
}

export interface ActiveSceneState {
  activeId: SceneId;
  activeIndex: number;
  localProgress: number; // 0 to 1
  globalProgress: number; // 0 to 1
}

import { describe, it, expect, beforeEach } from "vitest";
import { useTranslationStore } from "../stores/translationStore";

describe("TranslationStore & Modernization State", () => {
  beforeEach(() => {
    useTranslationStore.setState({
      sourceCode: "class Card extends React.Component { render() { return null; } }",
      translatedCode: "",
      isLoading: false,
      error: null,
      isByokModalOpen: false,
    });
  });

  it("should initialize with default repository files and active view", () => {
    const state = useTranslationStore.getState();
    expect(state.activeView).toBe("repo");
    expect(state.selectedFilePath).toBe("src/components/UserProfileCard.tsx");
    expect(state.repoFiles["src/components/UserProfileCard.tsx"]).toBeDefined();
  });

  it("should update source code and translated code correctly", () => {
    useTranslationStore.getState().setSourceCode("class Hello extends React.Component {}");
    expect(useTranslationStore.getState().sourceCode).toBe("class Hello extends React.Component {}");

    useTranslationStore.getState().setTranslatedCode("export function Hello() { return null; }");
    expect(useTranslationStore.getState().translatedCode).toBe("export function Hello() { return null; }");
  });

  it("should open and close BYOK modal and persist API key", () => {
    useTranslationStore.getState().openByokModal();
    expect(useTranslationStore.getState().isByokModalOpen).toBe(true);

    useTranslationStore.getState().setByokApiKey("test-byok-key-123");
    expect(useTranslationStore.getState().byokApiKey).toBe("test-byok-key-123");

    useTranslationStore.getState().closeByokModal();
    expect(useTranslationStore.getState().isByokModalOpen).toBe(false);
  });

  it("should run modernization in store and populate stats", async () => {
    const classComp = `
import React, { Component } from 'react';
class Mini extends Component {
  state = { val: 1 };
  render() { return <div>{this.state.val}</div>; }
}
`;
    useTranslationStore.getState().setSourceCode(classComp);
    await useTranslationStore.getState().runModernization();

    const state = useTranslationStore.getState();
    expect(state.translatedCode).toContain("useState(1)");
    expect(state.stats?.stateVariables).toBe(1);
    expect(state.error).toBeNull();
  });
});

/**
 * SmartPasteListener — Global paste interceptor for the translation workspace.
 *
 * Fires when the user presses Ctrl+V / Cmd+V anywhere in the translate page
 * while NOT focused inside a native input, textarea, or contenteditable element.
 * Also fires when pasting into an empty Monaco editor.
 *
 * On detection:
 *  1. Classifies the pasted text using classifyClipboardText() (< 2ms)
 *  2. Auto-sets source language and mode in the translation store
 *  3. Shows a non-intrusive toast badge: "Smart Paste: Detected {label}"
 *
 * v1.2.0 — Daily-Driver Workspace Upgrade
 */
"use client";

import { useEffect } from 'react';
import { toast } from 'sonner';
import { classifyClipboardText } from '@/lib/smart-clipboard';
import { useTranslationStore } from '../_store/useTranslationStore';

/** Returns true if the active element is a native text input the user is typing into. */
function isNativeInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function SmartPasteListener() {
  const setInput = useTranslationStore((state) => state.setInput);
  const currentInput = useTranslationStore((state) => state.input);
  const setDetectedLang = useTranslationStore((state) => state.setDetectedLang);

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      // Skip if user is focused in a native input (they're typing intentionally)
      // BUT allow if the Monaco editor is empty and has focus (class-based detection)
      if (isNativeInputFocused()) return;

      const text = event.clipboardData?.getData('text/plain');
      if (!text || !text.trim()) return;

      // Only intercept if the translate store input is empty OR focus is on body/document
      const activeEl = document.activeElement;
      const isBodyFocus = !activeEl || activeEl === document.body || activeEl === document.documentElement;
      const isMonacoEmpty = currentInput === '' || currentInput === null;

      if (!isBodyFocus && !isMonacoEmpty) return;

      const result = classifyClipboardText(text);

      // Populate the editor with the pasted text
      setInput(text);

      // Auto-set detected language
      if (result.detectedLanguage) {
        setDetectedLang(result.detectedLanguage);
      }

      // Show smart paste badge toast
      toast.info(`Smart Paste: Detected ${result.badgeLabel}`, {
        id: 'smart-paste',
        duration: 3000,
        description: result.detectedLanguage
          ? `Language set to ${result.detectedLanguage}`
          : undefined,
      });
    }

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [setInput, setDetectedLang, currentInput]);

  return null; // This component renders nothing
}

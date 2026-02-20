import { useEffect, useCallback } from 'react';

type ShortcutMap = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  handler: () => void;
  allowInInput?: boolean; // default false
};

function isInputFocused(): boolean {
  const el = document.activeElement;
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch =
          e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl
          ? e.ctrlKey || e.metaKey
          : !shortcut.meta || e.metaKey;
        const metaCheck = shortcut.meta ? e.ctrlKey || e.metaKey : true;

        if (!keyMatch) continue;
        if (shortcut.ctrl && !ctrlMatch) continue;
        if (shortcut.meta && !metaCheck) continue;

        if (!shortcut.allowInInput && isInputFocused()) continue;

        e.preventDefault();
        shortcut.handler();
        break;
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

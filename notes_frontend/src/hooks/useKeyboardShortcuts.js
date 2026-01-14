import { useEffect } from "react";

/**
 * PUBLIC_INTERFACE
 * Registers keyboard shortcuts:
 * - Cmd/Ctrl+N: create new note
 * - Cmd/Ctrl+S: save current note
 */
export function useKeyboardShortcuts({ onNewNote, onSave }) {
  useEffect(() => {
    const handler = (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      const key = (e.key || "").toLowerCase();

      if (key === "n") {
        e.preventDefault();
        onNewNote?.();
      }
      if (key === "s") {
        e.preventDefault();
        onSave?.();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNewNote, onSave]);
}

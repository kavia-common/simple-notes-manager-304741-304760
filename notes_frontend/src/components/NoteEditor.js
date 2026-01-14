import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotes } from "../context/NotesContext";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { TextArea } from "./ui/TextArea";
import { Card, CardBody } from "./ui/Card";
import "./notes.css";

function useDebouncedCallback(callback, delayMs) {
  const timer = useRef(null);

  const cancel = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const debounced = useCallback(
    (...args) => {
      cancel();
      timer.current = window.setTimeout(() => callback(...args), delayMs);
    },
    [callback, delayMs, cancel]
  );

  // Expose cancel so callers can prevent stale autosaves.
  debounced.cancel = cancel;

  return debounced;
}

/**
 * PUBLIC_INTERFACE
 * Right panel: note details + editor.
 */
export function NoteEditor({ onNavigateToNote }) {
  const { state, actions } = useNotes();
  const selected = useMemo(
    () => state.notes.find((n) => n.id === state.selectedId) || null,
    [state.notes, state.selectedId]
  );

  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [dirty, setDirty] = useState(false);

  // Monotonic counter to "invalidate" in-flight autosaves when user explicitly saves or switches notes.
  const autosaveEpochRef = useRef(0);

  useEffect(() => {
    // Always invalidate in-flight autosaves when the selected note changes or is refreshed externally.
    autosaveEpochRef.current += 1;

    // If the selection id changes, we always reset drafts to the new note.
    // If only the selected note's fields changed (e.g. background refresh), only reset drafts
    // when the user is not actively editing (dirty=false) to avoid clobbering local typing.
    setDraftTitle((prev) => {
      if (!selected?.id) return "";
      if (!dirty || prev === "" || prev === (selected?.title || "")) return selected?.title || "";
      return prev;
    });

    setDraftContent((prev) => {
      if (!selected?.id) return "";
      if (!dirty || prev === "" || prev === (selected?.content || "")) return selected?.content || "";
      return prev;
    });

    // Clear dirty only when truly switching notes; field updates should not clear user edits.
    if (!dirty || (selected?.id == null)) {
      setDirty(false);
    }
  }, [selected?.id, selected?.title, selected?.content, dirty]); // reset when selection/fields change (lint-safe, no clobber while typing)

  const debouncedAutosave = useDebouncedCallback(
    async (id, patch, epoch) => {
      // Ignore any autosave from an older epoch (selection changed or explicit save happened).
      if (epoch !== autosaveEpochRef.current) return;
      await actions.saveNote(id, patch, { source: "autosave" });
    },
    650
  );

  // Ensure no autosave is left hanging on unmount.
  useEffect(() => {
    return () => debouncedAutosave.cancel?.();
  }, [debouncedAutosave]);

  const canSave = Boolean(selected) && dirty && state.status !== "saving";

  const onChangeTitle = (v) => {
    setDraftTitle(v);
    setDirty(true);
    if (selected) {
      const epoch = autosaveEpochRef.current;
      debouncedAutosave(selected.id, { title: v, content: draftContent }, epoch);
    }
  };

  const onChangeContent = (v) => {
    setDraftContent(v);
    setDirty(true);
    if (selected) {
      const epoch = autosaveEpochRef.current;
      debouncedAutosave(selected.id, { title: draftTitle, content: v }, epoch);
    }
  };

  const onSaveNow = async () => {
    if (!selected) return;

    // Cancel any pending autosave so it won't race and "re-save" after explicit save.
    debouncedAutosave.cancel?.();
    autosaveEpochRef.current += 1;

    const ok = await actions.saveNote(selected.id, { title: draftTitle, content: draftContent }, { source: "explicit" });
    if (ok) setDirty(false);
  };

  const onDelete = async () => {
    if (!selected) return;
    const ok = window.confirm("Delete this note? This cannot be undone.");
    if (!ok) return;

    // Cancel any pending autosave for the soon-to-be deleted note.
    debouncedAutosave.cancel?.();
    autosaveEpochRef.current += 1;

    const id = selected.id;
    const deleted = await actions.deleteNote(id);
    if (!deleted) return;

    // Route must follow the new selection deterministically (or go home when empty).
    onNavigateToNote(state.selectedId);
  };

  if (!selected) {
    // Differentiate true-empty app state vs invalid route (/note/:id that doesn't exist).
    const hasNotes = state.notes.length > 0;
    const isInvalidSelection = Boolean(state.selectedId) && !selected;

    return (
      <Card className="panel">
        <CardBody>
          <div className="emptyLarge">
            <div className="emptyLargeIcon" aria-hidden="true">
              ✎
            </div>
            <div className="emptyTitle">{hasNotes ? (isInvalidSelection ? "Note not found" : "Select a note") : "No notes yet"}</div>
            <div className="emptyDesc">
              {hasNotes
                ? "Choose a note from the list, or create a new one."
                : "Create your first note to get started."}
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="panel">
      <CardBody>
        <div className="panelHeader">
          <div>
            <div className="panelTitle">Editor</div>
            <div className="panelSub">
              {state.status === "saving" ? "Saving…" : dirty ? "Unsaved changes (autosave enabled)" : "Up to date"}
            </div>
          </div>
          <div className="editorActions">
            <Button variant="ghost" onClick={onSaveNow} disabled={!canSave}>
              Save
            </Button>
            <Button variant="danger" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>

        <div className="editorGrid">
          <Input
            label="Title"
            value={draftTitle}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder="Note title"
          />
          <TextArea
            label="Content"
            value={draftContent}
            onChange={(e) => onChangeContent(e.target.value)}
            placeholder="Write your note…"
            rows={14}
            style={{ resize: "vertical", minHeight: 260 }}
          />
        </div>
      </CardBody>
    </Card>
  );
}

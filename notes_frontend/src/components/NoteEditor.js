import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNotes } from "../context/NotesContext";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { TextArea } from "./ui/TextArea";
import { Card, CardBody } from "./ui/Card";
import "./notes.css";

function useDebouncedCallback(callback, delayMs) {
  const timer = useRef(null);

  return (...args) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => callback(...args), delayMs);
  };
}

/**
 * PUBLIC_INTERFACE
 * Right panel: note details + editor.
 */
export function NoteEditor({ onNavigateToNote }) {
  const { state, actions } = useNotes();
  const selected = useMemo(() => state.notes.find((n) => n.id === state.selectedId) || null, [state.notes, state.selectedId]);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraftTitle(selected?.title || "");
    setDraftContent(selected?.content || "");
    setDirty(false);
  }, [selected?.id]); // reset when selection changes

  const debouncedAutosave = useDebouncedCallback(async (id, patch) => {
    await actions.saveNote(id, patch);
  }, 650);

  const canSave = Boolean(selected) && dirty && state.status !== "saving";

  const onChangeTitle = (v) => {
    setDraftTitle(v);
    setDirty(true);
    if (selected) debouncedAutosave(selected.id, { title: v, content: draftContent });
  };

  const onChangeContent = (v) => {
    setDraftContent(v);
    setDirty(true);
    if (selected) debouncedAutosave(selected.id, { title: draftTitle, content: v });
  };

  const onSaveNow = async () => {
    if (!selected) return;
    await actions.saveNote(selected.id, { title: draftTitle, content: draftContent });
    setDirty(false);
  };

  const onDelete = async () => {
    if (!selected) return;
    const ok = window.confirm("Delete this note? This cannot be undone.");
    if (!ok) return;
    const id = selected.id;
    await actions.deleteNote(id);
    onNavigateToNote(state.selectedId); // may now point to new selection
  };

  if (!selected) {
    return (
      <Card className="panel">
        <CardBody>
          <div className="emptyLarge">
            <div className="emptyLargeIcon" aria-hidden="true">
              ✎
            </div>
            <div className="emptyTitle">Select a note</div>
            <div className="emptyDesc">Choose a note from the list, or create a new one.</div>
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

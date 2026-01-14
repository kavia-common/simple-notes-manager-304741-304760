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

function countWords(text) {
  const raw = (text || "").trim();
  if (!raw) return 0;
  return raw.split(/\s+/).filter(Boolean).length;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Very small markdown renderer: headings, bold, italics, code fences, inline code, and links.
// No external libraries by request.
function renderBasicMarkdownToHtml(md) {
  const src = String(md || "");

  // Extract fenced blocks first, replacing with placeholders to avoid further formatting inside them.
  const fences = [];
  let temp = src.replace(/```([\s\S]*?)```/g, (_, code) => {
    const idx = fences.length;
    fences.push(code);
    return `@@FENCE_${idx}@@`;
  });

  // Escape HTML in non-code text before adding tags.
  temp = escapeHtml(temp);

  // Headings: lines starting with #..###### (simple)
  temp = temp.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  temp = temp.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  temp = temp.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  temp = temp.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  temp = temp.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  temp = temp.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Inline code
  temp = temp.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Links: [text](url)
  temp = temp.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  // Bold then italics (simple; does not support deep nesting)
  temp = temp.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  temp = temp.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Paragraphs + line breaks (keep headings as block elements already)
  const lines = temp.split(/\n/);
  const htmlLines = [];
  let buf = [];

  const flushParagraph = () => {
    if (buf.length === 0) return;
    htmlLines.push(`<p>${buf.join("<br/>")}</p>`);
    buf = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const isBlock =
      trimmed.startsWith("<h1>") ||
      trimmed.startsWith("<h2>") ||
      trimmed.startsWith("<h3>") ||
      trimmed.startsWith("<h4>") ||
      trimmed.startsWith("<h5>") ||
      trimmed.startsWith("<h6>") ||
      trimmed.startsWith("@@FENCE_");
    if (trimmed === "") {
      flushParagraph();
      continue;
    }
    if (isBlock) {
      flushParagraph();
      htmlLines.push(line);
      continue;
    }
    buf.push(line);
  }
  flushParagraph();

  let out = htmlLines.join("\n");

  // Restore fenced code blocks with <pre><code>…</code></pre> (escaped)
  out = out.replace(/@@FENCE_(\d+)@@/g, (_, idxStr) => {
    const idx = Number(idxStr);
    const code = escapeHtml(fences[idx] ?? "");
    return `<pre><code>${code}</code></pre>`;
  });

  return out;
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
  const [editorTab, setEditorTab] = useState("write"); // "write" | "preview"

  // Keep count updates low-cost: update immediately on keystroke, but avoid extra derived re-renders elsewhere.
  const charCount = draftContent.length;
  const wordCount = useMemo(() => countWords(draftContent), [draftContent]);

  const previewHtml = useMemo(() => renderBasicMarkdownToHtml(draftContent), [draftContent]);

  // Monotonic counter to "invalidate" in-flight autosaves when user explicitly saves or switches notes.
  const autosaveEpochRef = useRef(0);

  useEffect(() => {
    // Always invalidate in-flight autosaves when the selected note changes or is refreshed externally.
    autosaveEpochRef.current += 1;

    // Reset editor tab to write when switching notes.
    setEditorTab("write");

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
    if (!dirty || selected?.id == null) {
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
              {hasNotes ? "Choose a note from the list, or create a new one." : "Create your first note to get started."}
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
            <div className="panelSub">{state.status === "saving" ? "Saving…" : dirty ? "Unsaved changes (autosave enabled)" : "Up to date"}</div>
          </div>

          <div className="editorActions">
            <button
              type="button"
              className={`pinButton pinButtonLarge ${selected.isPinned ? "pinButtonActive" : ""}`}
              onClick={async () => {
                // Ensure autosave doesn't race pin update.
                debouncedAutosave.cancel?.();
                autosaveEpochRef.current += 1;
                await actions.togglePinNote?.(selected.id);
              }}
              aria-label={selected.isPinned ? "Unpin note" : "Pin note"}
              title={selected.isPinned ? "Pinned" : "Pin"}
            >
              {selected.isPinned ? "📌" : "📍"}
            </button>

            <div className="colorPicker" role="group" aria-label="Note color tag">
              {["blue", "amber", "emerald", "violet", "slate"].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`colorDot colorDot-${c} ${selected.color === c ? "colorDotActive" : ""}`}
                  aria-label={`Set note color to ${c}`}
                  title={`Color: ${c}`}
                  onClick={async () => {
                    if (!selected) return;
                    // Persist immediately; keep editor "clean" since it's metadata.
                    debouncedAutosave.cancel?.();
                    autosaveEpochRef.current += 1;
                    await actions.saveNote(selected.id, { color: c }, { source: "explicit" });
                  }}
                />
              ))}
            </div>

            <Button variant="ghost" onClick={onSaveNow} disabled={!canSave} aria-label="Save note">
              Save
            </Button>
            <Button variant="danger" onClick={onDelete} aria-label="Delete note">
              Delete
            </Button>
          </div>
        </div>

        <div className="editorTabs" role="tablist" aria-label="Editor mode">
          <button
            type="button"
            className={`editorTab ${editorTab === "write" ? "editorTabActive" : ""}`}
            role="tab"
            aria-selected={editorTab === "write"}
            onClick={() => setEditorTab("write")}
          >
            Write
          </button>
          <button
            type="button"
            className={`editorTab ${editorTab === "preview" ? "editorTabActive" : ""}`}
            role="tab"
            aria-selected={editorTab === "preview"}
            onClick={() => setEditorTab("preview")}
          >
            Preview
          </button>
          <div className="editorTabSpacer" aria-hidden="true" />
          <div className="editorCounts" aria-label="Word and character count">
            <span>{wordCount} words</span>
            <span className="editorCountsDot">•</span>
            <span>{charCount} chars</span>
          </div>
        </div>

        <div className="editorGrid">
          <Input
            label="Title"
            value={draftTitle}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder="Note title"
            aria-label="Note title"
          />

          {editorTab === "write" ? (
            <TextArea
              label="Content"
              value={draftContent}
              onChange={(e) => onChangeContent(e.target.value)}
              placeholder="Write your note…"
              rows={14}
              style={{ resize: "vertical", minHeight: 260 }}
              aria-label="Note content"
            />
          ) : (
            <div className="mdPreview" role="tabpanel" aria-label="Markdown preview">
              <div className="mdPreviewInner" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

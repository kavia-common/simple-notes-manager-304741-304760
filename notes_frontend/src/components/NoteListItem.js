import React, { useMemo } from "react";
import { formatTimestamp } from "../utils/datetime";
import { useNotes } from "../context/NotesContext";
import "./notes.css";

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text, query) {
  const raw = text || "";
  const q = (query || "").trim();
  if (!q) return raw;

  // Case-insensitive split while preserving original substrings.
  const re = new RegExp(`(${escapeRegExp(q)})`, "ig");
  const parts = raw.split(re);

  return parts.map((p, i) => {
    if (p.toLowerCase() === q.toLowerCase()) {
      return (
        <mark key={i} className="noteHighlight">
          {p}
        </mark>
      );
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

/**
 * PUBLIC_INTERFACE
 * Single note preview row in the list.
 */
export function NoteListItem({ note, query = "", isSelected, isMultiSelected = false, onSelect, onToggleSelectionKeyDown }) {
  const { actions } = useNotes();

  const preview = useMemo(() => {
    const raw = (note.content || "").trim();
    return raw.length > 80 ? `${raw.slice(0, 80)}…` : raw;
  }, [note.content]);

  const titleNode = useMemo(() => highlightText(note.title || "Untitled note", query), [note.title, query]);
  const previewNode = useMemo(() => highlightText(preview || "—", query), [preview, query]);

  const onTogglePin = async (e) => {
    // Prevent selecting the note when clicking the pin control.
    e.preventDefault();
    e.stopPropagation();
    await actions.togglePinNote?.(note.id);
  };

  return (
    <button
      type="button"
      className={`noteRow ${isSelected ? "noteRowSelected" : ""} ${isMultiSelected ? "noteRowMultiSelected" : ""}`}
      onClick={onSelect}
      onKeyDown={onToggleSelectionKeyDown}
      aria-label={`Open note: ${note.title || "Untitled note"}`}
      aria-pressed={isMultiSelected ? true : undefined}
    >
      <div className="noteRowTop">
        <div className="noteRowTitle">{titleNode}</div>

        <div className="noteRowRight">
          <span
            className={`noteColorSwatch noteColor-${note.color || "blue"}`}
            aria-label={`Color tag: ${note.color || "blue"}`}
            title={`Color: ${note.color || "blue"}`}
          />
          <button
            type="button"
            className={`pinButton ${note.isPinned ? "pinButtonActive" : ""}`}
            onClick={onTogglePin}
            aria-label={note.isPinned ? "Unpin note" : "Pin note"}
            title={note.isPinned ? "Pinned" : "Pin"}
          >
            {note.isPinned ? "📌" : "📍"}
          </button>
        </div>
      </div>

      <div className="noteRowMeta">
        <span className="noteRowPreview">{previewNode}</span>
        <span className="noteRowDot">•</span>
        <span className="noteRowTime">{formatTimestamp(note.updatedAt)}</span>
      </div>
    </button>
  );
}

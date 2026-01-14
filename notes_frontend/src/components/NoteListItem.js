import React, { useMemo } from "react";
import { formatTimestamp } from "../utils/datetime";
import "./notes.css";

/**
 * PUBLIC_INTERFACE
 * Single note preview row in the list.
 */
export function NoteListItem({ note, isSelected, onSelect }) {
  const preview = useMemo(() => {
    const raw = (note.content || "").trim();
    return raw.length > 80 ? `${raw.slice(0, 80)}…` : raw;
  }, [note.content]);

  return (
    <button type="button" className={`noteRow ${isSelected ? "noteRowSelected" : ""}`} onClick={onSelect}>
      <div className="noteRowTitle">{note.title || "Untitled note"}</div>
      <div className="noteRowMeta">
        <span className="noteRowPreview">{preview || "—"}</span>
        <span className="noteRowDot">•</span>
        <span className="noteRowTime">{formatTimestamp(note.updatedAt)}</span>
      </div>
    </button>
  );
}

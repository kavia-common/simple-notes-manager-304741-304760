import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNotes } from "../context/NotesContext";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card, CardBody } from "./ui/Card";
import { NoteListItem } from "./NoteListItem";
import "./notes.css";

const SUPPORTED_COLORS = ["blue", "amber", "emerald", "violet", "slate"];

/**
 * PUBLIC_INTERFACE
 * Left panel: list of notes with search/filter and create action.
 */
export function NoteList({ onNavigateToNote }) {
  const { state, dispatch, actions } = useNotes();

  const query = (state.filter?.query || "").trim();
  const color = state.filter?.color || "all";
  const pinnedOnly = Boolean(state.filter?.pinnedOnly);

  // Selection state is kept local to NoteList (UI concern); it is cleared on filter changes.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const lastAnchorIdRef = useRef(null);

  const clearSelection = () => {
    setSelectedIds(new Set());
    lastAnchorIdRef.current = null;
  };

  // Esc clears selection for accessibility.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // When filters change, selection should not carry across a different result set.
  useEffect(() => {
    clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, color, pinnedOnly]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return state.notes.filter((n) => {
      if (pinnedOnly && !n.isPinned) return false;
      if (color !== "all" && (n.color || "blue") !== color) return false;
      if (!q) return true;
      const t = (n.title || "").toLowerCase();
      const c = (n.content || "").toLowerCase();
      return t.includes(q) || c.includes(q);
    });
  }, [state.notes, query, color, pinnedOnly]);

  const filteredIds = useMemo(() => filtered.map((n) => n.id), [filtered]);

  const selectionCount = selectedIds.size;
  const selectedNotesArePinned = useMemo(() => {
    if (selectionCount === 0) return null;
    const idSet = selectedIds;
    const selectedNotes = state.notes.filter((n) => idSet.has(n.id));
    if (selectedNotes.length === 0) return null;
    const allPinned = selectedNotes.every((n) => Boolean(n.isPinned));
    const anyPinned = selectedNotes.some((n) => Boolean(n.isPinned));
    // If mixed, return false to default action label to "Pin" (bulk unify to pinned).
    return allPinned ? true : anyPinned ? false : false;
  }, [selectedIds, selectionCount, state.notes]);

  const toggleSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setRangeSelection = (toId) => {
    const fromId = lastAnchorIdRef.current ?? toId;
    const fromIndex = filteredIds.indexOf(fromId);
    const toIndex = filteredIds.indexOf(toId);
    if (fromIndex === -1 || toIndex === -1) {
      toggleSelection(toId);
      lastAnchorIdRef.current = toId;
      return;
    }
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    const range = filteredIds.slice(start, end + 1);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      range.forEach((rid) => next.add(rid));
      return next;
    });
  };

  const onRowActivate = (noteId, event) => {
    const isMultiKey = event?.metaKey || event?.ctrlKey;
    const isShift = Boolean(event?.shiftKey);

    if (isShift) {
      setRangeSelection(noteId);
      lastAnchorIdRef.current = noteId;
      return;
    }

    if (isMultiKey) {
      toggleSelection(noteId);
      lastAnchorIdRef.current = noteId;
      return;
    }

    // Default behavior remains: open/select note
    clearSelection();
    dispatch({ type: "SELECT_NOTE", id: noteId });
    onNavigateToNote(noteId);
  };

  const onRowToggleSelectionKeyboard = (noteId, event) => {
    // Space/Enter should toggle selection when focused (accessibility requirement)
    const key = event?.key;
    if (key !== " " && key !== "Enter") return;
    event.preventDefault();
    toggleSelection(noteId);
    lastAnchorIdRef.current = noteId;
  };

  const onBulkDelete = async () => {
    if (selectionCount === 0) return;
    const ok = window.confirm(`Delete ${selectionCount} selected note${selectionCount === 1 ? "" : "s"}? This cannot be undone.`);
    if (!ok) return;
    const ids = Array.from(selectedIds);
    const success = await actions.bulkDeleteNotes?.(ids);
    if (success) clearSelection();
  };

  const onBulkPinUnpin = async () => {
    if (selectionCount === 0) return;
    const ids = Array.from(selectedIds);

    // If all pinned -> unpin, else pin.
    const nextPinned = selectedNotesArePinned === true ? false : true;
    const success = await actions.bulkPinNotes?.(ids, nextPinned);
    if (success) clearSelection();
  };

  return (
    <Card className="panel">
      <CardBody>
        <div className="panelHeader">
          <div>
            <div className="panelTitle">Your notes</div>
            <div className="panelSub">Search, filter, and manage</div>
          </div>
          <Button
            aria-label="Create a new note"
            onClick={async () => {
              const note = await actions.createNote();
              if (note) onNavigateToNote(note.id);
            }}
          >
            New
          </Button>
        </div>

        <div style={{ marginTop: 10 }}>
          <Input
            value={state.filter?.query ?? ""}
            onChange={(e) => dispatch({ type: "PATCH_FILTER", patch: { query: e.target.value } })}
            placeholder="Search notes…"
            aria-label="Search notes"
          />
        </div>

        <div className="filtersRow" style={{ marginTop: 10 }}>
          <label className="filterLabel">
            <span className="filterLabelText">Color</span>
            <select
              className="filterSelect"
              value={color}
              onChange={(e) => dispatch({ type: "PATCH_FILTER", patch: { color: e.target.value } })}
              aria-label="Filter notes by color"
            >
              <option value="all">All</option>
              {SUPPORTED_COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="filterToggle">
            <input
              type="checkbox"
              checked={pinnedOnly}
              onChange={(e) => dispatch({ type: "PATCH_FILTER", patch: { pinnedOnly: e.target.checked } })}
            />
            <span>Only pinned</span>
          </label>
        </div>

        {selectionCount > 0 ? (
          <div className="bulkBar" role="region" aria-label="Bulk actions">
            <div className="bulkBarLeft">
              <span className="bulkCount">{selectionCount} selected</span>
              <Button variant="ghost" onClick={clearSelection} aria-label="Clear selection">
                Clear
              </Button>
            </div>

            <div className="bulkBarRight">
              <Button variant="secondary" onClick={onBulkPinUnpin} aria-label="Bulk pin or unpin selected notes">
                {selectedNotesArePinned === true ? "Unpin" : "Pin"}
              </Button>
              <Button variant="danger" onClick={onBulkDelete} aria-label="Bulk delete selected notes">
                Delete
              </Button>
            </div>
          </div>
        ) : null}

        <div className="listArea" style={{ marginTop: 12 }}>
          {state.status === "loading" ? (
            <div className="listSkeleton">
              <div className="skeleton" style={{ height: 56 }} />
              <div className="skeleton" style={{ height: 56 }} />
              <div className="skeleton" style={{ height: 56 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="emptySmall">
              <div className="emptyIcon" aria-hidden="true">
                ✦
              </div>
              <div className="emptyTitle">{state.notes.length === 0 ? "No notes yet" : "No matching notes"}</div>
              <div className="emptyDesc">
                {state.notes.length === 0
                  ? "Create your first note to get started."
                  : "Try a different search or filter, or create a new note."}
              </div>
            </div>
          ) : (
            filtered.map((n) => (
              <NoteListItem
                key={n.id}
                note={n}
                query={query}
                isSelected={n.id === state.selectedId}
                isMultiSelected={selectedIds.has(n.id)}
                onSelect={(e) => onRowActivate(n.id, e)}
                onToggleSelectionKeyDown={(e) => onRowToggleSelectionKeyboard(n.id, e)}
              />
            ))
          )}
        </div>

        <div className="hintRow">
          <span className="hintKey">Ctrl/Cmd</span>+<span className="hintKey">N</span> new
          <span className="hintSep">•</span>
          <span className="hintKey">Ctrl/Cmd</span>+<span className="hintKey">S</span> save
          <span className="hintSep">•</span>
          <span className="hintKey">Shift</span>/<span className="hintKey">Ctrl</span> click multi-select
          <span className="hintSep">•</span>
          <span className="hintKey">Esc</span> clear selection
        </div>
      </CardBody>
    </Card>
  );
}

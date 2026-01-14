import React, { useMemo } from "react";
import { useNotes } from "../context/NotesContext";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card, CardBody } from "./ui/Card";
import { NoteListItem } from "./NoteListItem";
import "./notes.css";

/**
 * PUBLIC_INTERFACE
 * Left panel: list of notes with search/filter and create action.
 */
export function NoteList({ onNavigateToNote }) {
  const { state, dispatch, actions } = useNotes();

  const query = state.filter.trim();

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return state.notes;
    return state.notes.filter((n) => {
      const t = (n.title || "").toLowerCase();
      const c = (n.content || "").toLowerCase();
      return t.includes(q) || c.includes(q);
    });
  }, [state.notes, query]);

  return (
    <Card className="panel">
      <CardBody>
        <div className="panelHeader">
          <div>
            <div className="panelTitle">Your notes</div>
            <div className="panelSub">Search, create, and manage</div>
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
            value={state.filter}
            onChange={(e) => dispatch({ type: "SET_FILTER", value: e.target.value })}
            placeholder="Search notes…"
            aria-label="Search notes"
          />
        </div>

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
                {state.notes.length === 0 ? "Create your first note to get started." : "Try a different search, or create a new note."}
              </div>
            </div>
          ) : (
            filtered.map((n) => (
              <NoteListItem
                key={n.id}
                note={n}
                query={query}
                isSelected={n.id === state.selectedId}
                onSelect={() => {
                  dispatch({ type: "SELECT_NOTE", id: n.id });
                  onNavigateToNote(n.id);
                }}
              />
            ))
          )}
        </div>

        <div className="hintRow">
          <span className="hintKey">Ctrl/Cmd</span>+<span className="hintKey">N</span> new
          <span className="hintSep">•</span>
          <span className="hintKey">Ctrl/Cmd</span>+<span className="hintKey">S</span> save
        </div>
      </CardBody>
    </Card>
  );
}

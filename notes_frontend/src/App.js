import React, { useCallback, useMemo } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { NotesProvider, useNotes } from "./context/NotesContext";
import { ToastProvider } from "./components/toast/ToastProvider";
import { Navbar } from "./components/Navbar";
import { NoteList } from "./components/NoteList";
import { NoteEditor } from "./components/NoteEditor";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import "./App.css";

/**
 * Syncs selected note with route param /note/:id.
 * If id doesn't exist, we still set selectedId so editor can show empty state appropriately.
 */
function NoteRouteSync() {
  const { id } = useParams();
  const { dispatch, state } = useNotes();

  React.useEffect(() => {
    if (id && id !== state.selectedId) {
      dispatch({ type: "SELECT_NOTE", id });
    }
    // If route is / and we have a selected note, no action here (handled by initial redirect in AppRoutes).
  }, [id, state.selectedId, dispatch]);

  return null;
}

function AppLayout() {
  const { state, dispatch, actions } = useNotes();
  const navigate = useNavigate();

  const navigateToNote = useCallback(
    (id) => {
      if (id) navigate(`/note/${encodeURIComponent(id)}`);
      else navigate(`/`);
    },
    [navigate]
  );

  const selected = useMemo(
    () => state.notes.find((n) => n.id === state.selectedId) || null,
    [state.notes, state.selectedId]
  );

  // Shortcuts:
  useKeyboardShortcuts({
    onNewNote: async () => {
      const note = await actions.createNote();
      if (note) navigateToNote(note.id);
    },
    onSave: async () => {
      if (!selected) return;
      // Best-effort "save now": since editor autosaves, we just re-save current state snapshot from store.
      await actions.saveNote(selected.id, { title: selected.title, content: selected.content });
    },
  });

  return (
    <div className="appShell">
      <Navbar onToggleListMobile={() => dispatch({ type: "TOGGLE_LIST_MOBILE" })} />

      <main className="main">
        <div className="container">
          <div className="split">
            {/* Desktop list */}
            <div className="desktopOnly">
              <NoteList onNavigateToNote={navigateToNote} />
            </div>

            <div>
              <NoteEditor onNavigateToNote={navigateToNote} />
            </div>
          </div>
        </div>

        {/* Mobile list overlay */}
        {state.isListOpenMobile ? (
          <div className="mobileListOverlay" onClick={() => dispatch({ type: "TOGGLE_LIST_MOBILE" })}>
            <div className="mobileListOverlayInner" onClick={(e) => e.stopPropagation()}>
              <NoteList onNavigateToNote={navigateToNote} />
            </div>
          </div>
        ) : null}
      </main>

      <footer className="footer">
        <div className="container footerInner">
          <span className="footerText">
            Shortcuts: <strong>Ctrl/Cmd+N</strong> new, <strong>Ctrl/Cmd+S</strong> save
          </span>
          <span className="footerTextMuted">
            {process.env.REACT_APP_NODE_ENV || "development"} • {process.env.REACT_APP_BACKEND_URL ? "Backend ready" : "Local only"}
          </span>
        </div>
      </footer>

      <NoteRouteSync />
    </div>
  );
}

function AppRoutes() {
  const { state } = useNotes();
  const firstId = state.notes[0]?.id;

  return (
    <Routes>
      <Route path="/" element={firstId ? <Navigate to={`/note/${encodeURIComponent(firstId)}`} replace /> : <AppLayout />} />
      <Route path="/note/:id" element={<AppLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// PUBLIC_INTERFACE
function App() {
  return (
    <ToastProvider>
      <NotesProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </NotesProvider>
    </ToastProvider>
  );
}

export default App;

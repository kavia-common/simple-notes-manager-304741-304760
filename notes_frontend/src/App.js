import React, { useCallback, useMemo, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { NotesProvider, useNotes } from "./context/NotesContext";
import { ToastProvider } from "./components/toast/ToastProvider";
import { Navbar } from "./components/Navbar";
import { NoteList } from "./components/NoteList";
import { NoteEditor } from "./components/NoteEditor";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import "./App.css";

/**
 * Syncs selected note with route param /note/:id and keeps route stable when selection changes.
 * - Manual navigation to /note/:id selects that id (even if missing -> editor shows "not found").
 * - If selection changes due to delete or create, this component does not override it unless
 *   the route id differs (route remains source of truth while on /note/:id).
 */
function NoteRouteSync() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dispatch, state } = useNotes();

  React.useEffect(() => {
    if (id && id !== state.selectedId) {
      dispatch({ type: "SELECT_NOTE", id });
    }
  }, [id, state.selectedId, dispatch]);

  // If the selected note becomes null (e.g., deleted last note), ensure route returns to "/".
  React.useEffect(() => {
    if (!id) return;
    if (state.selectedId == null) {
      navigate("/", { replace: true });
    }
  }, [id, state.selectedId, navigate]);

  return null;
}

function AppLayout() {
  const { state, dispatch, actions } = useNotes();
  const navigate = useNavigate();
  const overlayInnerRef = useRef(null);
  const lastFocusRef = useRef(null);

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
      await actions.saveNote(selected.id, { title: selected.title, content: selected.content }, { source: "explicit" });
    },
  });

  // Focus management + trap for mobile overlay list.
  React.useEffect(() => {
    if (!state.isListOpenMobile) return;

    lastFocusRef.current = document.activeElement;

    // Focus the overlay container to start the trap.
    window.setTimeout(() => {
      overlayInnerRef.current?.focus?.();
    }, 0);

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dispatch({ type: "TOGGLE_LIST_MOBILE" });
        return;
      }

      if (e.key !== "Tab") return;

      const root = overlayInnerRef.current;
      if (!root) return;

      // Simple focus trap: keep focus within overlay.
      const focusable = root.querySelectorAll(
        'button, [href], input, textarea, select, details, [tabindex]:not([tabindex="-1"])'
      );
      const items = Array.from(focusable).filter((el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"));
      if (items.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (active === first || active === root)) {
        e.preventDefault();
        last.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      const prev = lastFocusRef.current;
      if (prev && typeof prev.focus === "function") {
        window.setTimeout(() => prev.focus(), 0);
      }
    };
  }, [state.isListOpenMobile, dispatch]);

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
          <div
            className="mobileListOverlay"
            role="dialog"
            aria-modal="true"
            aria-label="Notes list"
            onClick={() => dispatch({ type: "TOGGLE_LIST_MOBILE" })}
          >
            <div
              className="mobileListOverlayInner"
              ref={overlayInnerRef}
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
            >
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

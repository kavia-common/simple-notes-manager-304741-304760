import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import { getNotesService } from "../services/notesService";
import { createId } from "../utils/id";
import { initialNotesState, notesReducer } from "./notesReducer";
import { useToasts } from "../components/toast/ToastProvider";

const NotesContext = createContext(null);

function makeNewNote() {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: "Untitled note",
    content: "",
    // Small, high-impact metadata:
    isPinned: false,
    color: "blue", // one of: blue, amber, emerald, violet, slate
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * PUBLIC_INTERFACE
 * Notes provider: manages notes, selection, filtering, and persistence (API or localStorage).
 */
export function NotesProvider({ children }) {
  const [state, dispatch] = useReducer(notesReducer, initialNotesState);
  const service = useMemo(() => getNotesService(), []);
  const { pushToast } = useToasts();

  const loadNotes = useCallback(async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const notes = await service.listNotes();
      dispatch({ type: "LOAD_SUCCESS", notes: Array.isArray(notes) ? notes : [] });
    } catch (e) {
      dispatch({ type: "LOAD_ERROR", error: e?.message });
      pushToast({ type: "error", title: "Load failed", message: e?.message || "Unable to load notes." });
    }
  }, [service, pushToast]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNote = useCallback(async () => {
    const note = makeNewNote();

    // Optimistic insert so UI feels instant in both API and local modes.
    dispatch({ type: "CREATE_NOTE", note });
    dispatch({ type: "SAVE_START" });

    try {
      const created = await service.createNote(note);

      // Prefer persisted response shape when available (API mode), but keep our id stable.
      if (created && created.id === note.id) {
        dispatch({ type: "UPDATE_NOTE", id: note.id, patch: created });
      }

      dispatch({ type: "SAVE_END" });
      pushToast({ type: "success", title: "Note created", message: "A new note is ready." });
      return created || note;
    } catch (e) {
      dispatch({ type: "SAVE_ERROR", error: e?.message });

      pushToast({
        type: "error",
        title: "Create failed",
        message: e?.message || "Unable to create note.",
      });

      return null;
    }
  }, [service, pushToast]);

  const saveNote = useCallback(
    async (id, patch, options = {}) => {
      const source = options?.source || "explicit"; // "explicit" | "autosave"
      const showSuccessToast = source !== "autosave";

      // Optimistic update: apply immediately.
      dispatch({ type: "UPDATE_NOTE", id, patch });
      dispatch({ type: "SAVE_START" });

      try {
        const now = new Date().toISOString();
        const payload = { ...patch, updatedAt: now };

        // Ensure updatedAt is present in UI even if persistence is slow.
        dispatch({ type: "UPDATE_NOTE", id, patch: payload });

        const updated = await service.updateNote(id, payload);

        // If the persistence layer returns a note (API + storage both do),
        // re-apply it to keep state consistent with the persisted source.
        if (updated && updated.id === id) {
          dispatch({ type: "UPDATE_NOTE", id, patch: updated });
        }

        dispatch({ type: "SAVE_END" });

        // Autosave should be quiet to avoid toast spam while typing.
        if (showSuccessToast) {
          pushToast({ type: "success", title: "Saved", message: "Your changes were saved." });
        }

        return true;
      } catch (e) {
        dispatch({ type: "SAVE_ERROR", error: e?.message });
        // Always show errors (autosave failures matter).
        pushToast({ type: "error", title: "Save failed", message: e?.message || "Unable to save note." });
        return false;
      }
    },
    [service, pushToast]
  );

  const deleteNote = useCallback(
    async (id) => {
      // Optimistic delete.
      dispatch({ type: "DELETE_NOTE", id });
      dispatch({ type: "SAVE_START" });

      try {
        const res = await service.deleteNote(id);

        // Both API and local should return {ok:true}; validate to avoid silent failures.
        if (!res || res.ok !== true) {
          throw new Error("Delete did not complete successfully.");
        }

        dispatch({ type: "SAVE_END" });
        pushToast({ type: "success", title: "Deleted", message: "Note removed." });
        return true;
      } catch (e) {
        dispatch({ type: "SAVE_ERROR", error: e?.message });
        pushToast({ type: "error", title: "Delete failed", message: e?.message || "Unable to delete note." });
        return false;
      }
    },
    [service, pushToast]
  );

  const togglePinNote = useCallback(
    async (id) => {
      const note = state.notes.find((n) => n.id === id);
      if (!note) return false;

      // Optimistic toggle for instant UI.
      dispatch({ type: "TOGGLE_PIN_NOTE", id });
      dispatch({ type: "SAVE_START" });

      try {
        const now = new Date().toISOString();

        // Persist pin change; update updatedAt so ordering stays consistent across reloads.
        const updated = await service.updateNote(id, { isPinned: !Boolean(note.isPinned), updatedAt: now });

        if (updated && updated.id === id) {
          dispatch({ type: "UPDATE_NOTE", id, patch: updated });
        }

        dispatch({ type: "SAVE_END" });
        // No toast (small action, avoid noise)
        return true;
      } catch (e) {
        dispatch({ type: "SAVE_ERROR", error: e?.message });
        pushToast({ type: "error", title: "Pin failed", message: e?.message || "Unable to pin/unpin note." });
        return false;
      }
    },
    [service, pushToast, state.notes]
  );

  const value = useMemo(
    () => ({
      state,
      dispatch,
      actions: {
        loadNotes,
        createNote,
        saveNote,
        deleteNote,
        togglePinNote,
      },
    }),
    [state, loadNotes, createNote, saveNote, deleteNote, togglePinNote]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

/**
 * PUBLIC_INTERFACE
 * Hook to access notes state/actions.
 */
export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}

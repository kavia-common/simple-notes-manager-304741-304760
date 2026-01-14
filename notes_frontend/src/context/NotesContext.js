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
    dispatch({ type: "CREATE_NOTE", note });
    dispatch({ type: "SAVE_START" });
    try {
      await service.createNote(note);
      dispatch({ type: "SAVE_END" });
      pushToast({ type: "success", title: "Note created", message: "A new note is ready." });
      return note;
    } catch (e) {
      dispatch({ type: "SAVE_ERROR", error: e?.message });
      pushToast({ type: "error", title: "Create failed", message: e?.message || "Unable to create note." });
      return null;
    }
  }, [service, pushToast]);

  const saveNote = useCallback(
    async (id, patch) => {
      dispatch({ type: "UPDATE_NOTE", id, patch });
      dispatch({ type: "SAVE_START" });
      try {
        const now = new Date().toISOString();
        const payload = { ...patch, updatedAt: now };
        dispatch({ type: "UPDATE_NOTE", id, patch: payload });
        await service.updateNote(id, payload);
        dispatch({ type: "SAVE_END" });
        pushToast({ type: "success", title: "Saved", message: "Your changes were saved." });
        return true;
      } catch (e) {
        dispatch({ type: "SAVE_ERROR", error: e?.message });
        pushToast({ type: "error", title: "Save failed", message: e?.message || "Unable to save note." });
        return false;
      }
    },
    [service, pushToast]
  );

  const deleteNote = useCallback(
    async (id) => {
      dispatch({ type: "DELETE_NOTE", id });
      dispatch({ type: "SAVE_START" });
      try {
        await service.deleteNote(id);
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

  const value = useMemo(
    () => ({
      state,
      dispatch,
      actions: {
        loadNotes,
        createNote,
        saveNote,
        deleteNote,
      },
    }),
    [state, loadNotes, createNote, saveNote, deleteNote]
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

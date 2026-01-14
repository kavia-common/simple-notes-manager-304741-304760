import * as api from "./apiNotesService";
import * as storage from "./storageNotesService";

/**
 * PUBLIC_INTERFACE
 * Returns true when the app should try to use a backend API.
 */
export function isApiEnabled() {
  return Boolean(process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL);
}

/**
 * PUBLIC_INTERFACE
 * Notes service abstraction: { listNotes, createNote, updateNote, deleteNote }
 * Defaults to localStorage when no backend URL is configured.
 */
export function getNotesService() {
  return isApiEnabled() ? api : storage;
}

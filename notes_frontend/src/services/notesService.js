import * as api from "./apiNotesService";
import * as storage from "./storageNotesService";

function hasNonEmptyEnv(name) {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * PUBLIC_INTERFACE
 * Returns true when the app should try to use a backend API.
 *
 * Selection rules:
 * - If REACT_APP_API_BASE or REACT_APP_BACKEND_URL is set (non-empty), use API mode.
 * - Otherwise, fallback to localStorage mode.
 */
export function isApiEnabled() {
  return hasNonEmptyEnv("REACT_APP_API_BASE") || hasNonEmptyEnv("REACT_APP_BACKEND_URL");
}

/**
 * PUBLIC_INTERFACE
 * Notes service abstraction: { listNotes, createNote, updateNote, deleteNote }
 * Defaults to localStorage when no backend URL is configured.
 */
export function getNotesService() {
  return isApiEnabled() ? api : storage;
}

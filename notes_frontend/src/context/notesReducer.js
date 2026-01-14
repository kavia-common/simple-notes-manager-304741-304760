/**
 * Notes state shape:
 * - notes: Note[]
 * - selectedId: string|null
 * - filter: string
 * - status: 'idle'|'loading'|'saving'|'error'
 * - error: string|null
 * - isListOpenMobile: boolean
 */

export const initialNotesState = {
  notes: [],
  selectedId: null,
  filter: "",
  status: "idle",
  error: null,
  isListOpenMobile: false,
};

/**
 * PUBLIC_INTERFACE
 * Notes reducer (pure) for unit testing and predictable state transitions.
 */
export function notesReducer(state, action) {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, status: "loading", error: null };
    case "LOAD_SUCCESS":
      return {
        ...state,
        status: "idle",
        notes: action.notes,
        selectedId: action.selectedId ?? state.selectedId ?? (action.notes[0]?.id ?? null),
        error: null,
      };
    case "LOAD_ERROR":
      return { ...state, status: "error", error: action.error || "Failed to load notes." };

    case "SET_FILTER":
      return { ...state, filter: action.value };

    case "SELECT_NOTE":
      return { ...state, selectedId: action.id, isListOpenMobile: false };

    case "TOGGLE_LIST_MOBILE":
      return { ...state, isListOpenMobile: !state.isListOpenMobile };

    case "CREATE_NOTE":
      return {
        ...state,
        notes: [action.note, ...state.notes],
        selectedId: action.note.id,
        isListOpenMobile: false,
      };

    case "UPDATE_NOTE": {
      const notes = state.notes.map((n) => (n.id === action.id ? { ...n, ...action.patch } : n));
      // keep updated note first in list (common UX)
      const updated = notes.find((n) => n.id === action.id);
      const reordered = updated
        ? [updated, ...notes.filter((n) => n.id !== action.id)]
        : notes;
      return { ...state, notes: reordered };
    }

    case "DELETE_NOTE": {
      const remaining = state.notes.filter((n) => n.id !== action.id);
      const nextSelected =
        state.selectedId === action.id ? (remaining[0]?.id ?? null) : state.selectedId;
      return { ...state, notes: remaining, selectedId: nextSelected };
    }

    case "SAVE_START":
      return { ...state, status: "saving", error: null };
    case "SAVE_END":
      return { ...state, status: "idle" };
    case "SAVE_ERROR":
      return { ...state, status: "error", error: action.error || "Failed to save." };

    default:
      return state;
  }
}

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

function getUpdatedAt(note) {
  return typeof note?.updatedAt === "string" ? note.updatedAt : "";
}

function getIsPinned(note) {
  return Boolean(note?.isPinned);
}

function sortNotesPinnedThenUpdatedDesc(notes) {
  // Pinned first, then updatedAt desc. Stable by array order when ties.
  const withIndex = notes.map((n, i) => ({ n, i }));
  withIndex.sort((a, b) => {
    const ap = getIsPinned(a.n);
    const bp = getIsPinned(b.n);
    if (ap !== bp) return ap ? -1 : 1;

    const au = getUpdatedAt(a.n);
    const bu = getUpdatedAt(b.n);
    if (au !== bu) return bu.localeCompare(au);

    return a.i - b.i;
  });
  return withIndex.map((x) => x.n);
}

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
        notes: sortNotesPinnedThenUpdatedDesc(action.notes),
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

    case "CREATE_NOTE": {
      // Insert created note, then re-sort to ensure pinned ordering stays correct.
      const next = sortNotesPinnedThenUpdatedDesc([action.note, ...state.notes]);
      return {
        ...state,
        notes: next,
        selectedId: action.note.id,
        isListOpenMobile: false,
      };
    }

    case "UPDATE_NOTE": {
      const idx = state.notes.findIndex((n) => n.id === action.id);
      if (idx === -1) return state;

      const updated = { ...state.notes[idx], ...action.patch };
      const next = [...state.notes.slice(0, idx), updated, ...state.notes.slice(idx + 1)];
      return { ...state, notes: sortNotesPinnedThenUpdatedDesc(next) };
    }

    case "TOGGLE_PIN_NOTE": {
      const idx = state.notes.findIndex((n) => n.id === action.id);
      if (idx === -1) return state;

      const updated = { ...state.notes[idx], isPinned: !Boolean(state.notes[idx]?.isPinned) };
      const next = [...state.notes.slice(0, idx), updated, ...state.notes.slice(idx + 1)];
      return { ...state, notes: sortNotesPinnedThenUpdatedDesc(next) };
    }

    case "DELETE_NOTE": {
      const remaining = state.notes.filter((n) => n.id !== action.id);
      const nextSelected = state.selectedId === action.id ? (remaining[0]?.id ?? null) : state.selectedId;
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

const STORAGE_KEY = "notes_frontend__notes_v1";

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function readAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const notes = safeParse(raw, []);
  return Array.isArray(notes) ? notes : [];
}

function writeAll(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function normalizeStoredNote(n) {
  // Backward compatible defaults for older localStorage payloads.
  return {
    ...n,
    title: typeof n?.title === "string" ? n.title : "Untitled note",
    content: typeof n?.content === "string" ? n.content : "",
    isPinned: Boolean(n?.isPinned),
    color: typeof n?.color === "string" ? n.color : "blue",
  };
}

/**
 * PUBLIC_INTERFACE
 * List all notes from localStorage.
 */
export async function listNotes() {
  const notes = readAll()
    .map(normalizeStoredNote)
    .sort((a, b) => {
      const ap = Boolean(a?.isPinned);
      const bp = Boolean(b?.isPinned);
      if (ap !== bp) return ap ? -1 : 1;
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });

  return notes;
}

/**
 * PUBLIC_INTERFACE
 * Create a note in localStorage.
 */
export async function createNote(note) {
  const notes = readAll();
  notes.push(note);
  writeAll(notes);
  return note;
}

/**
 * PUBLIC_INTERFACE
 * Update a note in localStorage by id.
 */
export async function updateNote(id, patch) {
  const notes = readAll();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) {
    const err = new Error("Note not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  notes[idx] = { ...notes[idx], ...patch };
  writeAll(notes);
  return notes[idx];
}

/**
 * PUBLIC_INTERFACE
 * Delete a note in localStorage by id.
 */
export async function deleteNote(id) {
  const notes = readAll();
  const filtered = notes.filter((n) => n.id !== id);
  writeAll(filtered);
  return { ok: true };
}

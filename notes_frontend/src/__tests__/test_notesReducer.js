import { initialNotesState, notesReducer } from "../context/notesReducer";

function makeNote(id, updatedAt = "2020-01-01T00:00:00.000Z", extra = {}) {
  return { id, title: `T-${id}`, content: `C-${id}`, updatedAt, ...extra };
}

describe("notesReducer", () => {
  test("LOAD_START sets loading and clears error", () => {
    const s0 = { ...initialNotesState, status: "error", error: "boom" };
    const s1 = notesReducer(s0, { type: "LOAD_START" });
    expect(s1.status).toBe("loading");
    expect(s1.error).toBeNull();
  });

  test("LOAD_SUCCESS uses provided selectedId when present", () => {
    const notes = [makeNote("a"), makeNote("b")];
    const s0 = { ...initialNotesState, selectedId: "a" };
    const s1 = notesReducer(s0, { type: "LOAD_SUCCESS", notes, selectedId: "b" });
    expect(s1.notes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(s1.selectedId).toBe("b");
    expect(s1.status).toBe("idle");
    expect(s1.error).toBeNull();
  });

  test("LOAD_SUCCESS falls back to existing selection when action.selectedId is nullish", () => {
    const notes = [makeNote("a"), makeNote("b")];
    const s0 = { ...initialNotesState, selectedId: "b" };
    const s1 = notesReducer(s0, { type: "LOAD_SUCCESS", notes });
    expect(s1.selectedId).toBe("b");
  });

  test("LOAD_SUCCESS selects first note when no prior selection exists", () => {
    const notes = [makeNote("a"), makeNote("b")];
    const s0 = { ...initialNotesState, selectedId: null };
    const s1 = notesReducer(s0, { type: "LOAD_SUCCESS", notes });
    expect(s1.selectedId).toBe("a");
  });

  test("LOAD_SUCCESS keeps selection null when empty list and no prior selection", () => {
    const s0 = { ...initialNotesState, selectedId: null };
    const s1 = notesReducer(s0, { type: "LOAD_SUCCESS", notes: [] });
    expect(s1.selectedId).toBeNull();
    expect(s1.notes).toEqual([]);
  });

  test("LOAD_ERROR sets status error and uses default message when missing", () => {
    const s0 = { ...initialNotesState, status: "loading" };
    const s1 = notesReducer(s0, { type: "LOAD_ERROR" });
    expect(s1.status).toBe("error");
    expect(s1.error).toBe("Failed to load notes.");
  });

  test("SET_FILTER updates filter (search input controlled)", () => {
    const s1 = notesReducer(initialNotesState, { type: "SET_FILTER", value: " hello " });
    expect(s1.filter).toBe(" hello ");
  });

  test("TOGGLE_LIST_MOBILE toggles boolean state", () => {
    const s1 = notesReducer(initialNotesState, { type: "TOGGLE_LIST_MOBILE" });
    expect(s1.isListOpenMobile).toBe(true);
    const s2 = notesReducer(s1, { type: "TOGGLE_LIST_MOBILE" });
    expect(s2.isListOpenMobile).toBe(false);
  });

  test("SELECT_NOTE sets selection and closes mobile list overlay", () => {
    const s0 = { ...initialNotesState, isListOpenMobile: true };
    const s1 = notesReducer(s0, { type: "SELECT_NOTE", id: "x" });
    expect(s1.selectedId).toBe("x");
    expect(s1.isListOpenMobile).toBe(false);
  });

  test("CREATE_NOTE inserts at top, selects created, and closes mobile list overlay", () => {
    const s0 = {
      ...initialNotesState,
      isListOpenMobile: true,
      notes: [makeNote("a"), makeNote("b")],
      selectedId: "b",
    };
    const created = makeNote("new", "2020-01-03T00:00:00.000Z");
    const s1 = notesReducer(s0, { type: "CREATE_NOTE", note: created });
    expect(s1.notes.map((n) => n.id)).toEqual(["new", "a", "b"]);
    expect(s1.selectedId).toBe("new");
    expect(s1.isListOpenMobile).toBe(false);
  });

  test("UPDATE_NOTE re-sorts with pinned-first and updatedAt desc", () => {
    const s0 = {
      ...initialNotesState,
      notes: [
        makeNote("a", "2020-01-03T00:00:00.000Z", { isPinned: false }),
        makeNote("b", "2020-01-02T00:00:00.000Z", { isPinned: true }),
        makeNote("c", "2020-01-01T00:00:00.000Z", { isPinned: true }),
      ],
      selectedId: "b",
    };

    // Update an unpinned note's updatedAt to newest; pinned notes should still stay above it.
    const s1 = notesReducer(s0, { type: "UPDATE_NOTE", id: "a", patch: { title: "A updated" } });

    expect(s1.notes.map((n) => n.id)).toEqual(["b", "c", "a"]);
    expect(s1.selectedId).toBe("b");
  });

  test("UPDATE_NOTE for missing id keeps notes array unchanged", () => {
    const s0 = { ...initialNotesState, notes: [makeNote("a"), makeNote("b")] };
    const s1 = notesReducer(s0, { type: "UPDATE_NOTE", id: "missing", patch: { title: "x" } });
    expect(s1).toEqual(s0);
  });

  test("TOGGLE_PIN_NOTE toggles pin and re-sorts pinned notes above unpinned", () => {
    const s0 = {
      ...initialNotesState,
      notes: [
        makeNote("a", "2020-01-02T00:00:00.000Z", { isPinned: false }),
        makeNote("b", "2020-01-03T00:00:00.000Z", { isPinned: false }),
      ],
    };

    const s1 = notesReducer(s0, { type: "TOGGLE_PIN_NOTE", id: "a" });
    expect(s1.notes[0].id).toBe("a");
    expect(s1.notes[0].isPinned).toBe(true);
    expect(s1.notes[1].id).toBe("b");
  });

  test("DELETE_NOTE removes note and if selected selects next (first remaining) deterministically", () => {
    const s0 = {
      ...initialNotesState,
      notes: [makeNote("a"), makeNote("b"), makeNote("c")],
      selectedId: "b",
    };
    const s1 = notesReducer(s0, { type: "DELETE_NOTE", id: "b" });
    expect(s1.notes.map((n) => n.id)).toEqual(["a", "c"]);
    expect(s1.selectedId).toBe("a"); // first remaining
  });

  test("DELETE_NOTE removes note and keeps selection when deleting non-selected note", () => {
    const s0 = {
      ...initialNotesState,
      notes: [makeNote("a"), makeNote("b"), makeNote("c")],
      selectedId: "b",
    };
    const s1 = notesReducer(s0, { type: "DELETE_NOTE", id: "a" });
    expect(s1.notes.map((n) => n.id)).toEqual(["b", "c"]);
    expect(s1.selectedId).toBe("b");
  });

  test("DELETE_NOTE selecting null when last remaining selected note is deleted", () => {
    const s0 = { ...initialNotesState, notes: [makeNote("only")], selectedId: "only" };
    const s1 = notesReducer(s0, { type: "DELETE_NOTE", id: "only" });
    expect(s1.notes).toEqual([]);
    expect(s1.selectedId).toBeNull();
  });

  test("SAVE_START, SAVE_END, SAVE_ERROR update status and error predictably", () => {
    const s0 = { ...initialNotesState, status: "idle", error: "old" };

    const s1 = notesReducer(s0, { type: "SAVE_START" });
    expect(s1.status).toBe("saving");
    expect(s1.error).toBeNull();

    const s2 = notesReducer(s1, { type: "SAVE_END" });
    expect(s2.status).toBe("idle");

    const s3 = notesReducer(s2, { type: "SAVE_ERROR", error: "" });
    expect(s3.status).toBe("error");
    expect(s3.error).toBe("Failed to save.");
  });
});

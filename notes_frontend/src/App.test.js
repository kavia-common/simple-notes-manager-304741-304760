import { notesReducer, initialNotesState } from "./context/notesReducer";

test("notesReducer creates and selects a new note", () => {
  const note = {
    id: "1",
    title: "A",
    content: "",
    updatedAt: "2020-01-01T00:00:00.000Z",
    isPinned: false,
    color: "blue",
  };
  const s1 = notesReducer(initialNotesState, { type: "CREATE_NOTE", note });
  expect(s1.notes).toHaveLength(1);
  expect(s1.selectedId).toBe("1");
});

test("notesReducer deletes selected note and selects next", () => {
  const s0 = {
    ...initialNotesState,
    notes: [
      { id: "a", title: "A", content: "", updatedAt: "2020-01-01T00:00:00.000Z" },
      { id: "b", title: "B", content: "", updatedAt: "2020-01-02T00:00:00.000Z" },
    ],
    selectedId: "a",
  };
  const s1 = notesReducer(s0, { type: "DELETE_NOTE", id: "a" });
  expect(s1.notes.map((n) => n.id)).toEqual(["b"]);
  expect(s1.selectedId).toBe("b");
});

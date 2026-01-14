function setEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe("notesService persistence mode selection", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env and reset module registry between tests so process.env changes are observed.
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  test("isApiEnabled returns false when both REACT_APP_API_BASE and REACT_APP_BACKEND_URL are unset", async () => {
    setEnv("REACT_APP_API_BASE", undefined);
    setEnv("REACT_APP_BACKEND_URL", undefined);

    const { isApiEnabled, getNotesService } = await import("../services/notesService");
    const service = getNotesService();

    expect(isApiEnabled()).toBe(false);
    // In local mode we expect storageNotesService shape (listNotes exists and uses localStorage under the hood)
    expect(service).toHaveProperty("listNotes");
    expect(service).toHaveProperty("createNote");
    expect(service).toHaveProperty("updateNote");
    expect(service).toHaveProperty("deleteNote");
  });

  test("isApiEnabled returns false when env vars are only whitespace", async () => {
    setEnv("REACT_APP_API_BASE", "   ");
    setEnv("REACT_APP_BACKEND_URL", "\n\t  ");

    const { isApiEnabled } = await import("../services/notesService");
    expect(isApiEnabled()).toBe(false);
  });

  test("isApiEnabled returns true when REACT_APP_API_BASE is set (non-empty trimmed)", async () => {
    setEnv("REACT_APP_API_BASE", " https://example.com/api ");
    setEnv("REACT_APP_BACKEND_URL", undefined);

    const { isApiEnabled, getNotesService } = await import("../services/notesService");
    const service = getNotesService();

    expect(isApiEnabled()).toBe(true);
    // API module exports the same four methods
    expect(service).toHaveProperty("listNotes");
    expect(service).toHaveProperty("createNote");
    expect(service).toHaveProperty("updateNote");
    expect(service).toHaveProperty("deleteNote");
  });

  test("isApiEnabled returns true when REACT_APP_BACKEND_URL is set (non-empty trimmed)", async () => {
    setEnv("REACT_APP_API_BASE", undefined);
    setEnv("REACT_APP_BACKEND_URL", "http://localhost:8080");

    const { isApiEnabled } = await import("../services/notesService");
    expect(isApiEnabled()).toBe(true);
  });

  test("REACT_APP_API_BASE takes precedence for base URL usage (via apiNotesService request URL)", async () => {
    // This test exercises selection indirectly by ensuring apiNotesService uses API_BASE when both are present.
    setEnv("REACT_APP_API_BASE", "http://api-base.example");
    setEnv("REACT_APP_BACKEND_URL", "http://backend.example");

    // Mock fetch to capture URL
    const fetchSpy = jest.fn(async () => ({
      ok: true,
      text: async () => "[]",
    }));
    global.fetch = fetchSpy;

    const api = await import("../services/apiNotesService");
    await api.listNotes();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("http://api-base.example/notes");
  });
});

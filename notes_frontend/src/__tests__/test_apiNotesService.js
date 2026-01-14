function setApiBase(value) {
  if (value == null) delete process.env.REACT_APP_API_BASE;
  else process.env.REACT_APP_API_BASE = value;

  // Ensure backend URL doesn't interfere unless explicitly set.
  delete process.env.REACT_APP_BACKEND_URL;
}

describe("apiNotesService (normalized responses and errors)", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    delete global.fetch;
  });

  test("listNotes throws friendly error when API base URL is not configured", async () => {
    setApiBase(undefined);

    const api = await import("../services/apiNotesService");
    await expect(api.listNotes()).rejects.toThrow("API base URL not configured");
  });

  test("network errors (fetch throws TypeError) become friendly 'Network error' message", async () => {
    setApiBase("http://example.com");
    global.fetch = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    const api = await import("../services/apiNotesService");
    await expect(api.listNotes()).rejects.toThrow(/Network error/i);
    await expect(api.listNotes()).rejects.toThrow(/GET failed/i);
  });

  test("404 response becomes friendly 'Endpoint not found (404)' message", async () => {
    setApiBase("http://example.com");
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 404,
      text: async () => "Not Found",
    }));

    const api = await import("../services/apiNotesService");
    await expect(api.listNotes()).rejects.toThrow(/Endpoint not found \(404\)/i);
  });

  test("500 response becomes friendly 'Server error (500)' message", async () => {
    setApiBase("http://example.com");
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => "Oops",
    }));

    const api = await import("../services/apiNotesService");
    await expect(api.listNotes()).rejects.toThrow(/Server error \(500\)/i);
  });

  test("listNotes validates shape: non-array response throws", async () => {
    setApiBase("http://example.com");
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ nope: true }),
    }));

    const api = await import("../services/apiNotesService");
    await expect(api.listNotes()).rejects.toThrow(/expected an array/i);
  });

  test("createNote normalizes missing fields and uses fallback id when response lacks id", async () => {
    setApiBase("http://example.com");
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ title: 123, content: null }),
    }));

    const api = await import("../services/apiNotesService");
    const created = await api.createNote({ id: "client-id", title: "x", content: "y" });

    expect(created).toEqual(
      expect.objectContaining({
        id: "client-id",
        title: "Untitled note",
        content: "",
      })
    );
  });

  test("updateNote throws friendly error when response is invalid JSON", async () => {
    setApiBase("http://example.com");
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => "<html>nope</html>",
    }));

    const api = await import("../services/apiNotesService");
    await expect(api.updateNote("a", { title: "x" })).rejects.toThrow(/Invalid response/i);
  });

  test("deleteNote accepts empty body as {ok:true}", async () => {
    setApiBase("http://example.com");
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => "",
    }));

    const api = await import("../services/apiNotesService");
    await expect(api.deleteNote("a")).resolves.toEqual({ ok: true });
  });

  test("deleteNote accepts {ok:true} as success", async () => {
    setApiBase("http://example.com");
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    }));

    const api = await import("../services/apiNotesService");
    await expect(api.deleteNote("a")).resolves.toEqual({ ok: true });
  });

  test("deleteNote rejects invalid non-empty response shape", async () => {
    setApiBase("http://example.com");
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ ok: false }),
    }));

    const api = await import("../services/apiNotesService");
    await expect(api.deleteNote("a")).rejects.toThrow(/Invalid response for deleteNote/i);
  });

  test("request strips trailing slash from base URL (no double slashes)", async () => {
    process.env.REACT_APP_API_BASE = "http://example.com/";
    delete process.env.REACT_APP_BACKEND_URL;

    const fetchSpy = jest.fn(async () => ({
      ok: true,
      text: async () => "[]",
    }));
    global.fetch = fetchSpy;

    const api = await import("../services/apiNotesService");
    await api.listNotes();

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://example.com/notes",
      expect.objectContaining({
        method: "GET",
      })
    );
  });
});

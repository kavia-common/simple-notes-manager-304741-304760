function getBaseUrl() {
  // Prefer API_BASE if provided; fallback to BACKEND_URL
  return (process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
}

function isPlainObject(v) {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function safeTrim(v) {
  return typeof v === "string" ? v.trim() : "";
}

function toFriendlyError(err, { action }) {
  const baseMsg = action ? `${action} failed` : "Request failed";

  // Fetch throws TypeError on network/CORS problems
  if (err instanceof TypeError) {
    return new Error(`${baseMsg}. Network error (check API URL / CORS).`);
  }

  const msg = safeTrim(err?.message) || baseMsg;
  const status = err?.status;

  if (status === 401 || status === 403) return new Error(`${baseMsg}. Unauthorized.`);
  if (status === 404) return new Error(`${baseMsg}. Endpoint not found (404).`);
  if (status >= 500) return new Error(`${baseMsg}. Server error (${status}).`);

  return new Error(msg);
}

async function request(path, options = {}) {
  const base = getBaseUrl();
  if (!base) {
    throw new Error("API base URL not configured");
  }

  let res;
  try {
    res = await fetch(`${base}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (e) {
    // Network/CORS, DNS, offline, etc.
    throw toFriendlyError(e, { action: options.method || "Request" });
  }

  if (!res.ok) {
    let detail = "";
    try {
      // Prefer text to avoid JSON parse failures in error payloads.
      detail = await res.text();
    } catch {
      // ignore
    }
    const err = new Error(`Request failed (${res.status})${detail ? `: ${detail}` : ""}`);
    err.status = res.status;
    throw toFriendlyError(err, { action: options.method || "Request" });
  }

  // Allow empty response bodies (e.g., delete)
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // If backend returns non-JSON (misconfigured), treat as invalid for our API mode.
    const err = new Error("Invalid response (expected JSON).");
    throw toFriendlyError(err, { action: options.method || "Request" });
  }
}

function normalizeNote(raw, fallbackId) {
  if (!isPlainObject(raw)) throw new Error("Invalid note response (expected object).");
  const id = raw.id ?? fallbackId;
  if (!id) throw new Error("Invalid note response (missing id).");

  // We keep the shape consistent with local mode.
  return {
    id: String(id),
    title: typeof raw.title === "string" ? raw.title : "Untitled note",
    content: typeof raw.content === "string" ? raw.content : "",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  };
}

/**
 * PUBLIC_INTERFACE
 * List notes from backend.
 *
 * Expected backend (suggested):
 * GET /notes -> Note[]
 */
export async function listNotes() {
  const data = await request("/notes", { method: "GET" });
  if (!Array.isArray(data)) {
    throw new Error("Invalid response for listNotes (expected an array).");
  }
  return data.map((n) => normalizeNote(n, n?.id));
}

/**
 * PUBLIC_INTERFACE
 * Create note on backend.
 *
 * Expected backend (suggested):
 * POST /notes {title, content} -> Note
 */
export async function createNote(note) {
  const data = await request("/notes", { method: "POST", body: JSON.stringify(note) });
  return normalizeNote(data, note?.id);
}

/**
 * PUBLIC_INTERFACE
 * Update note on backend.
 *
 * Expected backend (suggested):
 * PUT /notes/:id {title, content} -> Note
 */
export async function updateNote(id, patch) {
  const data = await request(`/notes/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(patch) });
  return normalizeNote(data, id);
}

/**
 * PUBLIC_INTERFACE
 * Delete note on backend.
 *
 * Expected backend (suggested):
 * DELETE /notes/:id -> {ok:true}
 */
export async function deleteNote(id) {
  const data = await request(`/notes/${encodeURIComponent(id)}`, { method: "DELETE" });

  // Accept either empty body, {ok:true}, or anything truthy indicating success
  if (data == null) return { ok: true };
  if (isPlainObject(data) && data.ok === true) return { ok: true };

  // If backend returns something else, treat as invalid to avoid silently succeeding on wrong endpoints.
  throw new Error("Invalid response for deleteNote (expected { ok: true } or empty body).");
}

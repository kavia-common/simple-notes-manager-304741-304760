function getBaseUrl() {
  // Prefer API_BASE if provided; fallback to BACKEND_URL
  return (process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
}

async function request(path, options = {}) {
  const base = getBaseUrl();
  if (!base) {
    throw new Error("API base URL not configured");
  }
  const res = await fetch(`${base}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    const err = new Error(`Request failed (${res.status})${detail ? `: ${detail}` : ""}`);
    err.status = res.status;
    throw err;
  }

  // Allow empty response bodies (e.g., delete)
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * PUBLIC_INTERFACE
 * List notes from backend.
 *
 * Expected backend (suggested):
 * GET /notes -> Note[]
 */
export async function listNotes() {
  return request("/notes", { method: "GET" });
}

/**
 * PUBLIC_INTERFACE
 * Create note on backend.
 *
 * Expected backend (suggested):
 * POST /notes {title, content} -> Note
 */
export async function createNote(note) {
  return request("/notes", { method: "POST", body: JSON.stringify(note) });
}

/**
 * PUBLIC_INTERFACE
 * Update note on backend.
 *
 * Expected backend (suggested):
 * PUT /notes/:id {title, content} -> Note
 */
export async function updateNote(id, patch) {
  return request(`/notes/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(patch) });
}

/**
 * PUBLIC_INTERFACE
 * Delete note on backend.
 *
 * Expected backend (suggested):
 * DELETE /notes/:id -> {ok:true}
 */
export async function deleteNote(id) {
  return request(`/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
}

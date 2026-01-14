/**
 * PUBLIC_INTERFACE
 * Creates a reasonably unique ID without external dependencies.
 * Suitable for client-side notes in localStorage.
 */
export function createId() {
  // Includes random component + timestamp to avoid collisions in fast inserts.
  return `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

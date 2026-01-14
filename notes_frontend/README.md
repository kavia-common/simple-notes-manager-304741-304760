# Notes Frontend (React)

A modern, responsive notes app UI (Ocean Professional theme) with a two-panel layout:
- Notes list (search + previews) on the left
- Selected note editor on the right

Includes create/edit/delete, keyboard shortcuts, mobile-friendly list overlay, and in-app toast notifications.

## Run

```bash
npm install
npm start
```

App runs on `http://localhost:3000` (CRA default).

## Features

- Create, edit, delete, list notes
- Search/filter notes by title or content
- Two-panel layout (collapses to one column on small screens)
- Mobile list overlay toggle in the top navbar
- Autosave (debounced) + explicit Save button
- Keyboard shortcuts:
  - **Ctrl/Cmd + N**: create new note
  - **Ctrl/Cmd + S**: save current note
- Toast notifications for save/delete/errors
- Minimal routing: `/note/:id` for shareable selection

## Persistence modes (env vars)

The app chooses persistence based on environment variables:

- If `REACT_APP_API_BASE` **or** `REACT_APP_BACKEND_URL` is set:
  - The app will **attempt** to use a backend API (see `src/services/apiNotesService.js`).
- Otherwise:
  - Notes are stored in `localStorage` (see `src/services/storageNotesService.js`).

### Suggested backend endpoints (optional)
If you provide a backend later, the frontend expects these endpoints by default:

- `GET /notes` -> `Note[]`
- `POST /notes` -> `Note`
- `PUT /notes/:id` -> `Note`
- `DELETE /notes/:id` -> `{ ok: true }`

You can adjust paths/behavior in `src/services/apiNotesService.js`.

## Available env vars

This project reads the following (if present):

- `REACT_APP_API_BASE`
- `REACT_APP_BACKEND_URL`
- `REACT_APP_FRONTEND_URL`
- `REACT_APP_WS_URL` (reserved for future realtime updates)
- `REACT_APP_NODE_ENV`
- `REACT_APP_FEATURE_FLAGS` (reserved)
- `REACT_APP_EXPERIMENTS_ENABLED` (reserved)

## Tests

Basic unit tests are included for the notes reducer (`src/App.test.js`).

```bash
npm test
```

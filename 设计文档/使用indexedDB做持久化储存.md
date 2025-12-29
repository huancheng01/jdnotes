# Role
Senior React Developer & Data Architect.

# Context
We have a beautiful "Linear-style" note-taking app with a Tiptap+CodeMirror editor.
Currently, the data is hardcoded (Mock Data).
We need to replace the mock data with a real client-side database using **Dexie.js** (IndexedDB wrapper).

# Goal
Implement full CRUD (Create, Read, Update, Delete) functionality. Data must persist after page reload.

# Requirements

## 1. Database Setup (`db.ts`)
- **Library:** `dexie`, `dexie-react-hooks`.
- **Schema:** Create a `NoteAppDB` class.
  - Table: `notes`.
  - Fields: `id` (auto-increment number or UUID string), `title` (string), `content` (JSON or HTML string), `createdAt` (date), `updatedAt` (date).

## 2. Refactor `App.tsx` (Data Logic)
- **Remove:** All hardcoded `mockNotes` arrays.
- **Read:** Use `useLiveQuery` from `dexie-react-hooks` to fetch the list of notes dynamically. Sort by `updatedAt` desc.
- **Create:** Wire up the Sidebar "+" button to add a new note (Default title: "Untitled", Content: "").
- **Delete:** Add a delete function (triggered via a context menu or a Delete button in the UI) to remove a note.

## 3. Auto-Save Logic (Crucial)
- In the `Editor` component, we don't want to save on *every* keystroke (performance).
- **Debounce:** Implement a debounce mechanism (e.g., 500ms or 1000ms delay).
- **Update:** When the user types in Tiptap/CodeMirror, trigger an update to the `notes` table in Dexie with the new content and update the `updatedAt` timestamp.

## 4. Search Implementation
- Wire up the Sidebar "Search Input" to filter the `useLiveQuery` results (e.g., `.filter(note => note.title.includes(searchQuery))`).

# Deliverables
1. `npm install` command.
2. `db.ts` file content.
3. Updated `App.tsx` showing how to fetch data and handle "Active Note" state (handle what happens if the active note is deleted).
4. A simple hook or utility for the Auto-Save logic.

# Note
Ensure the UI remains exactly the same; we are just swapping the engine under the hood.
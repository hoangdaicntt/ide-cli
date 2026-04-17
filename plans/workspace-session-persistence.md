# Feature: Workspace Session Persistence

## Overview
Persist the IDE session so the app can restore the previous workspace after restart. The persisted session should include:

- Open projects
- Active project
- Open files per project
- Active file per project
- Open terminal panels per project

The restore flow should reopen the same project set, rebuild each file tree from disk, reload open file contents from disk, and recreate terminal sessions for projects that had an active terminal.

## Current Project Survey
- Global workspace state lives entirely in [`src/store/store.ts`](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/store/store.ts).
- Project state currently contains:
  - `projectIds`
  - `projects`
  - `activeProjectId`
  - per-project `tree`, `openFiles`, `activeFilePath`, `terminal`, `terminalStatus`
- Renderer gets all filesystem and PTY access through the typed preload bridge in [`src/shared/ipc.ts`](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/shared/ipc.ts) and the Electron main process.
- PTY lifecycle is currently runtime-only. A project has at most one terminal instance at a time.
- Open file contents are loaded from disk when a file is opened; there is no save flow yet.

## Assumptions
- Persist only structural session state, not unsaved editor buffer contents.
- On restore, file contents should be re-read from disk, not loaded from stale cached content.
- Terminal restoration means recreating a fresh PTY for a project that previously had a terminal open. It does not include restoring shell history, running commands, or scrollback.
- If a previously opened project path no longer exists, the app should skip it and continue restoring the rest.
- Current Phase 1 still uses one terminal per project, so “danh sách terminal đang mở” maps to terminal-open status per project rather than multiple tabs per project.

## Open Questions
- If a file from the saved session no longer exists on disk, should it be silently skipped or shown as a missing tab placeholder?
  Proposed default: silently skip and continue restoring the rest.
- If a project root no longer exists, should the app show a toast/banner?
  Proposed default: skip it for now and add user feedback later.
- Do you want to persist panel widths as part of the same session feature?
  Proposed default: yes, but as a secondary task after core session restore works.

## Dependencies
- No new third-party dependency required.
- Use Electron main process and `app.getPath('userData')` for session storage.

## Architecture
- Storage location:
  - Session JSON file under Electron user data, e.g. `~/Library/Application Support/<app>/workspace-session.json`
- Main process responsibilities:
  - Expose typed IPC handlers for `session:load` and `session:save`
  - Read/write JSON atomically
  - Create the storage directory if needed
- Renderer responsibilities:
  - Convert runtime Zustand state to a serializable session snapshot
  - Rehydrate projects from session on app startup
  - Re-read project trees from disk
  - Re-open saved files by reading their current content from disk
  - Recreate PTYs for projects whose terminal was previously open
- State model:
  - Add a dedicated persisted session type separate from runtime `ProjectWorkspace`
  - Persist file paths, project paths, active IDs, and terminal-open flags
  - Do not persist transient runtime-only fields like live `terminalId`

## Data Model Proposal
- `WorkspaceSession`
  - `version: 1`
  - `activeProjectId: string | null`
  - `projects: PersistedProjectSession[]`
- `PersistedProjectSession`
  - `id: string`
  - `name: string`
  - `rootPath: string`
  - `activeFilePath: string | null`
  - `openFilePaths: string[]`
  - `hasOpenTerminal: boolean`
  - `layout?: { leftWidth?: number; rightWidth?: number }`

## Tasks
- [x] Task 1: Add persisted session types and IPC contract
  - Define serializable session types in [`src/shared/ipc.ts`](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/shared/ipc.ts) or a nearby shared module.
  - Extend the preload bridge and global window types with `loadSession()` and `saveSession(session)`.
  - Keep persisted types separate from runtime PTY metadata.

- [x] Task 2: Implement session file read/write in Electron main
  - Add helpers in [`electron/main.ts`](/Volumes/ExData/Documents/OtherProjects/ide-cli/electron/main.ts) to resolve the session file path from `app.getPath('userData')`.
  - Implement `session:load` IPC to return `null` when the file does not exist.
  - Implement `session:save` IPC to validate and write JSON safely.
  - Guard against corrupt JSON by logging and returning `null` instead of crashing.

- [x] Task 3: Refactor store serialization boundaries
  - Add helper functions in [`src/store/store.ts`](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/store/store.ts) to:
    - export runtime state to `WorkspaceSession`
    - reconstruct runtime project state from `WorkspaceSession`
  - Keep `tree`, `openFiles.content`, and `terminal.terminalId` out of persisted state.
  - Add a store-level `hydrateWorkspace()` action for startup restoration.

- [x] Task 4: Restore projects from persisted session
  - For each saved project, verify the root path still exists through IPC.
  - Re-read the directory tree from disk.
  - Recreate the `ProjectWorkspace` entry with empty runtime terminal metadata first.
  - Restore `projectIds` ordering and `activeProjectId`.

- [x] Task 5: Restore open files from persisted session
  - For each saved `openFilePaths`, re-read current file content from disk.
  - Populate `openFiles[path]` with fresh content.
  - Restore `activeFilePath` if the file still exists; otherwise clear it or fall back to the first restored file.

- [x] Task 6: Restore terminal-open state from persisted session
  - For each project with `hasOpenTerminal = true`, call the existing `ensureTerminal(projectId)` after project hydration.
  - Do not restore stale `terminalId`; let the main process create a fresh PTY.
  - Ensure terminal restore happens after the project exists in store.

- [x] Task 7: Autosave session on workspace changes
  - Add a debounced session persistence subscriber around Zustand state.
  - Save on relevant changes only:
    - project open/close
    - active project change
    - file open/close when that exists
    - active file change
    - terminal open/close
    - optional panel width changes
  - Avoid saving on every editor keystroke since unsaved content is not part of session persistence.

- [x] Task 8: Bootstrap restore on app startup
  - Trigger `loadSession()` when the renderer starts.
  - Rehydrate store before user interaction.
  - Handle partial restore failures without blocking the app.

- [x] Task 9: UX and failure handling
  - Skip missing projects/files without crashing.
  - Optionally log skipped entries to the console in Phase 1.
  - Keep the app usable if session load fails or the session file is corrupt.

## Validation
- Manual check: open multiple projects, open several files in each, keep a terminal open in some projects, quit the app, reopen, and verify the same session restores.
- Manual check: delete one previously opened file, restart the app, and verify restore continues without crash.
- Manual check: rename or remove one previously opened project folder, restart, and verify remaining projects still restore.
- Manual check: confirm restored terminal panels are interactive and tied to the correct project root.
- Manual check: close a project tab, restart, and confirm it stays closed.

## Risks
- Store hydration can race with UI effects that auto-create terminals if restore ordering is not explicit.
- Persisting runtime state directly from Zustand may accidentally include transient fields unless serialization is carefully isolated.
- If future multi-terminal support is added, the persisted schema will need to evolve from `hasOpenTerminal` to terminal descriptors.

## Notes
- Recommended implementation order:
  1. IPC session load/save
  2. persisted types + serialization helpers
  3. startup restore
  4. debounced autosave
  5. optional panel width persistence
- This feature should stay separate from future autosave of unsaved editor content. That is a different persistence problem.
- Implementation note:
  - Added `fs:path-exists` IPC to make restore logic skip missing projects/files safely without abusing failed file reads for control flow.

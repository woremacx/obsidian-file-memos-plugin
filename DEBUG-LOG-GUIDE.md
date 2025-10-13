# Debug Logging Guide

## Overview
Extensive debug logging has been added to troubleshoot why the Memos View shows "Open a file with #memos tag to view as cards" instead of displaying the file content.

## Debug Log Prefixes

### hasMemosTag() - src/utils.ts
- `[hasMemosTag] Checking file:` - File path being checked
- `[hasMemosTag] Content preview (first 200 chars):` - Content preview
- `[hasMemosTag] Frontmatter found:` - Frontmatter content
- `[hasMemosTag] Found #memos in frontmatter - returning true` - Tag found in frontmatter
- `[hasMemosTag] No frontmatter found` - No frontmatter detected
- `[hasMemosTag] Found #memos inline - returning true` - Tag found inline
- `[hasMemosTag] No #memos tag found - returning false` - No tag found

### handleFileOpen() - src/main.ts
- `[handleFileOpen] Called with file:` - File path when opened
- `[handleFileOpen] File content length:` - Content size
- `[handleFileOpen] File has #memos tag - switching to memos view` - Tag detected
- `[handleFileOpen] Active leaf found:` - Leaf availability
- `[handleFileOpen] Setting view state with file path:` - File path being passed
- `[handleFileOpen] View state set successfully` - State change complete
- `[handleFileOpen] ERROR: No active leaf found` - No leaf available
- `[handleFileOpen] File does not have #memos tag - skipping` - No tag

### activateMemosView() - src/main.ts
- `[activateMemosView] Called` - Method invoked
- `[activateMemosView] Active file:` - Current active file
- `[activateMemosView] Most recent leaf found:` - Leaf availability
- `[activateMemosView] Setting view state with:` - State object being passed
- `[activateMemosView] Revealing leaf` - Making leaf visible
- `[activateMemosView] Done` - Complete
- `[activateMemosView] ERROR: No leaf found` - No leaf available

### toggleMemosView() - src/main.ts
- `[toggleMemosView] Called` - Method invoked
- `[toggleMemosView] Active memos view leaf:` - Current view status
- `[toggleMemosView] Currently in memos view - switching to markdown` - Switching away
- `[toggleMemosView] Not in memos view - activating memos view` - Switching to memos

### MemosView.onOpen() - src/MemosView.ts
- `[MemosView.onOpen] Called` - View created
- `[MemosView.onOpen] Waiting for setState to be called with file path` - Waiting for state

### MemosView.setState() - src/MemosView.ts
- `[MemosView.setState] Called with state:` - **CRITICAL** - State received
- `[MemosView.setState] Result param:` - Second parameter
- `[MemosView.setState] State contains file path:` - File path in state
- `[MemosView.setState] File lookup result:` - File found or null
- `[MemosView.setState] File is TFile - calling renderMemosView` - Valid file
- `[MemosView.setState] renderMemosView completed` - Rendering done
- `[MemosView.setState] ERROR: File not found or not a TFile` - **ERROR** - Invalid file
- `[MemosView.setState] No file in state - trying fallback` - **WARNING** - No state
- `[MemosView.setState] Active file fallback:` - Fallback file
- `[MemosView.setState] Using active file fallback` - Using fallback
- `[MemosView.setState] No file to display - showing empty state` - **ERROR** - Showing empty

### MemosView.getState() - src/MemosView.ts
- `[MemosView.getState] Returning state:` - State being saved

### MemosView.renderMemosView() - src/MemosView.ts
- `[MemosView.renderMemosView] Called with file:` - File being rendered
- `[MemosView.renderMemosView] Container prepared` - UI container ready
- `[MemosView.renderMemosView] Previous cards cleared` - Old cards removed
- `[MemosView.renderMemosView] Current file stored:` - File stored
- `[MemosView.renderMemosView] View state loaded` - Saved state loaded
- `[MemosView.renderMemosView] File content read, length:` - Content loaded

### MemosView.loadViewState() - src/MemosView.ts
- `[MemosView.loadViewState] Called` - Method invoked
- `[MemosView.loadViewState] No current file - skipping` - No file set
- `[MemosView.loadViewState] State key:` - localStorage key
- `[MemosView.loadViewState] Found saved state:` - Saved state exists
- `[MemosView.loadViewState] Loaded card states:` - Number of cards
- `[MemosView.loadViewState] No saved state found` - No saved state

### MemosView.saveViewState() - src/MemosView.ts
- `[MemosView.saveViewState] Called` - Method invoked
- `[MemosView.saveViewState] No current file - skipping` - No file
- `[MemosView.saveViewState] Saving state with key:` - localStorage key
- `[MemosView.saveViewState] Card states count:` - Number of cards

### MemosView.onClose() - src/MemosView.ts
- `[MemosView.onClose] Called` - View closing
- `[MemosView.onClose] Cleanup complete` - Cleanup done

## Expected Flow for File with #memos Tag

When opening a file with `#memos` tag (e.g., `var/20251011_145711.md`), you should see:

1. `[handleFileOpen] Called with file: var/20251011_145711.md`
2. `[handleFileOpen] File content length: 214` (or similar)
3. `[hasMemosTag] Checking file: var/20251011_145711.md`
4. `[hasMemosTag] Content preview (first 200 chars): ---\ntitle:\ndate: 2025-10-11...`
5. `[hasMemosTag] Frontmatter found: title:\ndate: 2025-10-11...`
6. `[hasMemosTag] Found #memos in frontmatter - returning true`
7. `[handleFileOpen] File has #memos tag - switching to memos view`
8. `[handleFileOpen] Active leaf found: true`
9. `[handleFileOpen] Setting view state with file path: var/20251011_145711.md`
10. `[MemosView.setState] Called with state: {file: "var/20251011_145711.md"}`
11. `[MemosView.setState] State contains file path: var/20251011_145711.md`
12. `[MemosView.setState] File lookup result: var/20251011_145711.md`
13. `[MemosView.setState] File is TFile - calling renderMemosView`
14. `[MemosView.renderMemosView] Called with file: var/20251011_145711.md`
15. `[MemosView.renderMemosView] Container prepared`
16. ... (rendering continues)

## Problem Indicators

### If setState is NOT called:
- Missing: `[MemosView.setState] Called with state:`
- **Issue**: setViewState is not triggering setState

### If setState receives no file:
- Shows: `[MemosView.setState] No file in state - trying fallback`
- **Issue**: State object doesn't contain file property

### If file lookup fails:
- Shows: `[MemosView.setState] File lookup result: null`
- Shows: `[MemosView.setState] ERROR: File not found or not a TFile`
- **Issue**: getAbstractFileByPath is returning null

### If showing empty state:
- Shows: `[MemosView.setState] No file to display - showing empty state`
- **Issue**: Neither state file nor fallback active file is available

## Testing Instructions

1. Open Obsidian Developer Console (Ctrl+Shift+I or Cmd+Option+I)
2. Reload Obsidian to load the plugin with debug logging
3. Open the file `var/20251011_145711.md`
4. Check the console for the log sequence above
5. Identify where the flow breaks

## Current Issue

User reports:
- File `var/20251011_145711.md` is open (has #memos tag in frontmatter)
- Memos View tab shows: "Open a file with #memos tag to view as cards"
- Another tab shows the file in normal markdown view
- Console shows nothing (which is suspicious - logs should appear)

**Hypothesis**: Either:
1. The plugin is not loaded/active
2. handleFileOpen is not being triggered
3. setState is not being called
4. Logs are being suppressed somehow

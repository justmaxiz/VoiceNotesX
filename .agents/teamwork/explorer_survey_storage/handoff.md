# Handoff Report: Storage Architecture & Data Layer Modernization

**Role:** Storage Architecture Explorer  
**Directory:** `d:\relax\projects\voicenotes\.agents\teamwork\explorer_survey_storage`  
**Mission:** Survey data layer, types, Dexie database, Zustand stores, migrations, and test coverage for R1 task modernization (`startDate`, `deadline`).  
**Handoff Type:** Hard (Task complete)

---

## 1. Observation

1. **Task Types (`src/types/item.ts:1-23`)**:
   - `Item` interface currently defines:
     ```typescript
     export interface Item {
       id: string;
       type: 'task' | 'note';
       title: string;
       description?: string;
       transcriptText?: string;
       audioDuration?: number;
       audioUrl?: string;
       status: 'todo' | 'in_progress' | 'completed' | 'archived';
       priority: 'low' | 'medium' | 'high';
       dueDate?: string | null;
       dueTime?: string | null;
       isAllDay?: boolean;
       estimatedMinutes?: number;
       reminderMinutesBefore?: number | null;
       tags?: string[];
       completedAt?: string;
       categoryTag: string;
       isFocus: boolean;
       checklist?: ChecklistItem[];
       createdAt: string;
       updatedAt: string;
     }
     ```
   - Currently, there is **no `startDate`** property and **no explicit `deadline`** property on `Item`.
   - The UI and components have been using `dueDate` and `dueTime` as the de-facto deadline (`FocusHeroCard.tsx:67`: `const currentDeadline = propDeadLine || focusedTask?.dueTime || focusedTask?.dueDate || 'Сегодня'`, and `CalendarPage.tsx:360`: `<span>Дедлайн: {task.dueTime || task.dueDate}</span>`).
   - In commit `e8be178`, `AudioSession` interface was removed from `src/types/item.ts`, although it is still imported by `src/lib/db.ts:2`, `src/lib/seedData.ts:1`, and `src/lib/__tests__/db.test.ts:14`.
   - `isFocused` was used throughout components (`DashboardOverview.tsx:54`, `TasksPage.tsx:40`, `SlideOverDrawer.tsx:57`) alongside `isFocus: boolean`.

2. **Database Schema & Versioning (`src/lib/db.ts:16-21`)**:
   - Database class `VoiceNotesDB extends Dexie` is on `version(1)`:
     ```typescript
     constructor(databaseName = 'VoiceNotesDB') {
       super(databaseName)
       this.version(1).stores({
         items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate',
       })
     }
     ```
   - Dexie stores whole JavaScript objects in IndexedDB; unindexed properties are preserved without error, but indexed queries require fields declared in `stores()`.
   - Dexie migration mechanism uses `.version(2).stores(...).upgrade(async tx => { ... })`.

3. **Store & State Management (`src/store/useAppStore.ts:129-209`)**:
   - Store maintains `items: Item[]` with optimistic updates for `addItem`, `updateItem`, `deleteItem`, `toggleTask`, and `setFocusTask`.
   - Rollback logic is already implemented for database errors (e.g. `set({ items: previousItems, error: err.message })`).
   - Search indexing is integrated via `upsertSearchItem` and `removeSearchItem` in `src/lib/search.ts`.

4. **AI & Quick Capture (`src/lib/geminiStructuring.ts`, `src/lib/gemini.ts`, `QuickCaptureWidget.tsx:170-200`)**:
   - `mockLocalStructuring` heuristic extracts `due_date` from transcripts like `"завтра в 18:00"`.
   - `QuickCaptureWidget.tsx` assigns `dueDate: structured.due_date || undefined`.

5. **Existing Tests & Type Checking**:
   - `npx vitest run src/store/__tests__/useAppStore.test.ts` passes (13/13 tests).
   - `npx vitest run src/components/calendar/__tests__/CalendarPage.test.tsx` passes (3/3 tests).
   - `npx vitest run src/components/dashboard/__tests__/DashboardOverview.test.tsx` passes (5/5 tests).
   - `npx vitest run src/lib/__tests__/seedData.test.ts` passes (6/6 tests).
   - Running `npx vitest run src/lib/__tests__/db.test.ts` failed due to syntax error:
     ```
     D:/relax/projects/voicenotes/src/lib/__tests__/db.test.ts:296:2: ERROR: Unexpected "}"
     ```
     At lines 277-296 of `src/lib/__tests__/db.test.ts`, the closing bracket of a test was merged into `describe` closing bracket in commit `e8be178`, leaving lines 278-296 orphaned.
   - Running `npx tsc --noEmit` flags this syntax error:
     ```
     src/lib/__tests__/db.test.ts(296,3): error TS1128: Declaration or statement expected.
     ```

---

## 2. Logic Chain

1. **Need for `startDate` and `deadline` (R1)**:
   - *From Observation 1*: `Item` only has `dueDate` and `dueTime`, lacking start timestamp representation.
   - *Therefore*: Adding optional `startDate?: string | null` and `deadline?: string | null` to `Item` in `src/types/item.ts` directly fulfills R1 without breaking existing code.
   - *From Observation 1*: To preserve backwards compatibility with all existing screens (`CalendarPage`, `DateTimePicker`, `SlideOverDrawer`), `dueDate` and `dueTime` should remain and be synchronized with `deadline` (`dueDate = deadline.split('T')[0]`, `dueTime = deadline.split('T')[1].slice(0, 5)`).

2. **Schema Upgrade & Zero Data Loss Strategy**:
   - *From Observation 2*: Dexie manages schema upgrades safely via `this.version(2).stores(...).upgrade(async tx => { ... })`.
   - *Step-by-step*:
     1. Bump schema to `version(2)`:
        `items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate, startDate, deadline'`
     2. In `.upgrade(async tx => ...)`, iterate through `tx.table('items').toCollection().modify((item) => { ... })`.
     3. For old tasks lacking `deadline`: map `dueDate` (+ `dueTime`) into ISO string `deadline`.
     4. For old tasks lacking `startDate`: compute `startDate` by subtracting `item.estimatedMinutes || 60` from `deadline` (or fallback to `item.deadline` / `item.createdAt`).
   - *Safety*: IndexedDB executes `.upgrade()` within an isolated `versionchange` transaction. Existing user data is 100% retained.

3. **Temporal Relationship & Defaults**:
   - *Format*: ISO 8601 string (`string`) aligns with `createdAt`, `updatedAt`, `completedAt` throughout the codebase.
   - *Optionality*: Optional (`string | null`) allows backlog tasks (unscheduled) and notes (`type: 'note'`) to exist cleanly.
   - *Validation*: Invariant `startDate <= deadline`. When user changes `deadline` before `startDate`, `startDate` is clamped or adjusted by preserved duration.
   - *Defaults*: If a task is created with a `deadline` and duration `estimatedMinutes`, `startDate = new Date(deadline.getTime() - estimatedMinutes * 60000).toISOString()`.

4. **Enabling R2 (Focus Logic) and R3 (Calendar Spanning)**:
   - *For R2*: With `deadline` and `startDate` indexed, finding overdue tasks (`deadline < now`) and active tasks (`startDate <= now && now <= deadline`) becomes a clean, deterministic calculation.
   - *For R3*: Calendar timeline views (`WeekTimelineView` and `CalendarPage` Day view) can calculate `top` offset from `startDate` and `height` proportional to `deadline - startDate`.

---

## 3. Caveats

1. **Pre-existing Syntax Error in `db.test.ts`**:
   - In `src/lib/__tests__/db.test.ts:277-296`, orphaned statements exist due to a bad commit prior to our task. The fix is documented in `report.md:8.2`. Implementers should apply this fix when touching DB tests.
2. **Missing `AudioSession` in `item.ts`**:
   - In `src/types/item.ts`, `AudioSession` was deleted in commit `e8be178` but is still imported by `db.ts` and `seedData.ts`. Restoring `export interface AudioSession { ... }` in `src/types/item.ts` will ensure strict `tsc --noEmit` passes cleanly.
3. **`isFocus` vs `isFocused`**:
   - Some components access `item.isFocused` while `Item` defines `isFocus: boolean`. Adding `isFocused?: boolean` to `Item` solves TypeScript strictness across all call sites.
4. **Timezone Assumptions**:
   - ISO strings with UTC format (`.toISOString()`) or local date-times without offset (`YYYY-MM-DDTHH:mm:ss`) need to be handled consistently with `new Date(str).getTime()`.

---

## 4. Conclusion

1. **Type Definition Changes**:
   - Add `startDate?: string | null;` and `deadline?: string | null;` to `Item` and `TaskItemData` in `src/types/item.ts`.
   - Add `start_date?: string | null` and `deadline?: string | null` to `StructuredResult` in `src/types/ai.ts`.
   - Restore `AudioSession` and add `isFocused?: boolean` to `Item`.
2. **Dexie Storage Migration**:
   - In `src/lib/db.ts`, add `this.version(2).stores({ items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate, startDate, deadline' })`.
   - Add `.upgrade()` handler migrating old records without data loss.
3. **Store & CRUD**:
   - In `src/store/useAppStore.ts`, synchronize `startDate` / `deadline` with `dueDate` / `dueTime` in `addItem`, `updateItem`, and `batchRescheduleTasks`.
4. **Seed & AI Data**:
   - Update `SEED_ITEMS` in `src/lib/seedData.ts` with explicit `startDate` and `deadline`.
   - Update `mockLocalStructuring` in `src/lib/gemini.ts` and `QuickCaptureWidget.tsx` to populate both start and end timestamps.

---

## 5. Verification Method

To verify the storage architecture and migration independently:

1. **Type Check Verification**:
   - Command: `npx tsc --noEmit`
   - Invalidation condition: Should produce 0 errors once `db.test.ts` bracket and `AudioSession` in `item.ts` are restored.

2. **Store Test Verification**:
   - Command: `npx vitest run src/store/__tests__/useAppStore.test.ts`
   - Expected result: All 13 tests pass.

3. **Calendar Test Verification**:
   - Command: `npx vitest run src/components/calendar/__tests__/CalendarPage.test.tsx`
   - Expected result: All 3 tests pass.

4. **Seed Data Test Verification**:
   - Command: `npx vitest run src/lib/__tests__/seedData.test.ts`
   - Expected result: All 6 tests pass.

5. **Migration Verification Test (new test in `db.test.ts`)**:
   - Create isolated instance `const testDb = new VoiceNotesDB('MigrationTest_' + Date.now())`.
   - Insert record without `startDate`/`deadline`.
   - Retrieve record after upgrade; assert `record.deadline` matches previous `dueDate` and `record.startDate` is populated.

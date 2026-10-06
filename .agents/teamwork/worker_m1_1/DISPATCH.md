## 2026-10-06T10:42:32Z
You are the Storage Architecture Worker for Milestone 1 of the VoiceNotes AI task modernization project.
Working directory: d:\relax\projects\voicenotes\.agents\teamwork\worker_m1_1
Original request path (MANDATORY TO READ FIRST): d:\relax\projects\voicenotes\.agents\teamwork\ORIGINAL_REQUEST.md
Project blueprint path: d:\relax\projects\voicenotes\PROJECT.md
Survey findings path: d:\relax\projects\voicenotes\.agents\teamwork\explorer_survey_storage\handoff.md
User rules: Consult d:\relax\projects\voicenotes\AGENTS.md (Strict rule: NO git commits; test verification via npx tsc --noEmit and specific vitest files).

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively owned files:
- `src/types/item.ts`
- `src/types/ai.ts`
- `src/lib/db.ts`
- `src/store/useAppStore.ts`
- `src/lib/__tests__/db.test.ts`
- `src/lib/seedData.ts`
Do NOT modify calendar UI, dashboard UI, or E2E test files outside this boundary.

Mission (Milestone 1 Implementation):
1. In `src/types/item.ts`:
   - Add `startDate?: string | null;` and `deadline?: string | null;` to `Item` and `TaskItemData`.
   - Restore missing `AudioSession` interface (which was accidentally removed in a previous commit and is needed by `db.ts` and `seedData.ts`).
   - Add `isFocused?: boolean;` to `Item` for view model compatibility.
2. In `src/types/ai.ts`:
   - Add `start_date?: string | null;` and `deadline?: string | null;` to `StructuredResult`.
3. In `src/lib/db.ts`:
   - Bump database schema to `version(2)`:
     Add index `startDate, deadline` to `items` table: `'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate, startDate, deadline'`.
   - Add non-destructive `.upgrade(async tx => ...)` handler: for each item, map legacy `dueDate`/`dueTime` to `deadline` if missing, and compute `startDate = deadline - (item.estimatedMinutes || 60)` or fallback to `deadline`/`createdAt`.
4. In `src/store/useAppStore.ts`:
   - Update `addItem`, `updateItem`, and `batchRescheduleTasks` to maintain `startDate` and `deadline` and synchronize with `dueDate`/`dueTime`.
5. In `src/lib/seedData.ts`:
   - Populate `startDate` and `deadline` for sample tasks in `SEED_ITEMS`.
6. In `src/lib/__tests__/db.test.ts`:
   - Fix pre-existing syntax error at lines 277-296 (unclosed `describe` block).
   - Add unit tests verifying `startDate` and `deadline` persistence, retrieval, and schema v2 migration without data loss.
7. Verification:
   - Run `npx tsc --noEmit` and confirm 0 TypeScript errors.
   - Run `npx vitest run src/lib/__tests__/db.test.ts`.
   - Run `npx vitest run src/store/__tests__/useAppStore.test.ts`.
   - Run `npx vitest run src/lib/__tests__/seedData.test.ts`.
8. Write comprehensive handoff report to `d:\relax\projects\voicenotes\.agents\teamwork\worker_m1_1\handoff.md`.

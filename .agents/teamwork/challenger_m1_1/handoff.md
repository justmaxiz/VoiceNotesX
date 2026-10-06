# Adversarial Challenge & Verification Report: Milestone 1 Storage Architecture

**Role:** Empirical Challenger 1  
**Working Directory:** `d:\relax\projects\voicenotes\.agents\teamwork\challenger_m1_1`  
**Milestone:** Milestone 1 (Data Structure & Storage: `startDate`, `deadline`, Dexie v2 schema upgrade & indexes, store sync)  
**Target Worker:** `worker_m1_1`  
**Verdict:** **REQUEST_CHANGES**  

---

## 1. Observation

### Observation 1: Existing Suites Pass Cleanly
Running existing project tests:
1. `npx vitest run src/lib/__tests__/db.test.ts` -> 16/16 passed (including worker's new migration test).
2. `npx vitest run src/store/__tests__/useAppStore.test.ts` -> 13/13 passed.
3. `npx vitest run src/lib/__tests__/seedData.test.ts` -> 6/6 passed.
4. `npx vitest run src/components/calendar/__tests__/CalendarPage.test.tsx` -> 3/3 passed.
5. `npx vitest run src/tests/e2e/r1_storage_e2e.test.ts` -> 18/18 passed.

However, the existing test suites solely evaluated canonical 5-character times (e.g. `'10:00'`, `'14:00'`, `'09:00'`) and did not cover boundary conditions or single-digit hour inputs.

### Observation 2: Single-Digit Hour `dueTime` in `db.ts` Generates Malformed ISO Timestamps and Breaks Dexie Range Queries
In `src/lib/db.ts` lines 37-43:
```typescript
const timePart = item.dueTime
  ? item.dueTime.length === 5
    ? `${item.dueTime}:00`
    : item.dueTime
  : '23:59:59'
item.deadline = `${item.dueDate}T${timePart}.000Z`
```
When legacy data or user input contains a single-digit hour (e.g., `dueTime: "9:30"` or `"8:00"`):
- `item.dueTime.length` is `4`.
- `timePart` is NOT padded and remains `"9:30"`.
- `item.deadline` becomes `"2026-10-15T9:30.000Z"`.
- In V8 JavaScript: `new Date("2026-10-15T9:30.000Z")` produces `Invalid Date` (`getTime()` is `NaN`).
- At lines 57-59, the fallback assigns `item.startDate = item.deadline` (`"2026-10-15T9:30.000Z"`).

When running `src/tests/stress/m1_adversarial_stress.test.ts` test `STRESS-02`:
```powershell
npx vitest run src/tests/stress/m1_adversarial_stress.test.ts
```
Output:
```
FAIL  src/tests/stress/m1_adversarial_stress.test.ts > Milestone 1 Adversarial Stress Testing > Dexie v2 Schema Upgrade Edge Cases > STRESS-02: Partial/short dueTime format (e.g. "9:30", "9:00", "8:15") - check valid ISO creation
AssertionError: expected [] to include 'short-time-task-1'
```
A Dexie range query for October 15 (`db.items.where('deadline').between('2026-10-15T00:00:00.000Z', '2026-10-15T23:59:59.999Z')`) returned `[]` because in IndexedDB string comparison, the ASCII character `'9'` (ASCII 57) is greater than `'2'` (ASCII 50):
`"2026-10-15T9:30.000Z" > "2026-10-15T23:59:59.999Z"` evaluates to `true`.

### Observation 3: Single-Digit Hour in `syncTemporalFields` Silently Erases User Due Time to Midnight UTC `00:00:00`
In `src/store/useAppStore.ts` lines 96-112:
```typescript
const timePart = fields.dueTime ?? existing?.dueTime ?? '18:00'
const datePart = fields.dueDate.includes('T') ? fields.dueDate.split('T')[0] : fields.dueDate
const timeFormatted = timePart.length === 5 ? `${timePart}:00` : timePart
const combined = `${datePart}T${timeFormatted}.000Z`
const parsed = new Date(combined)
if (!isNaN(parsed.getTime())) {
  result.deadline = parsed.toISOString()
  ...
} else {
  const fallback = new Date(fields.dueDate)
  if (!isNaN(fallback.getTime())) {
    result.deadline = fallback.toISOString()
  }
}
```
When `dueTime` is `"9:30"`:
- `timeFormatted` is `"9:30"` (length 4).
- `combined` is `"2026-10-20T9:30.000Z"`.
- `new Date(combined)` is `Invalid Date`.
- Execution falls back to `new Date(fields.dueDate).toISOString()` -> `"2026-10-20T00:00:00.000Z"`.
- As captured in stress test log:
  ```
  syncTemporalFields with dueTime 9:30: {
    dueDate: '2026-10-20',
    dueTime: '9:30',
    estimatedMinutes: 60,
    deadline: '2026-10-20T00:00:00.000Z'
  }
  ```
  The user's 9:30 AM schedule was completely overwritten with 00:00 (midnight UTC).

### Observation 4: `syncTemporalFields` Logic Inversion Leaves Orphaned `startDate` on `deadline: null` Clear
In `src/store/useAppStore.ts` lines 83-91:
```typescript
if ('deadline' in fields) {
  if (fields.deadline) {
    ...
  } else {
    // deadline explicitly set to null/falsy
    if (!('dueDate' in fields)) {
      result.dueDate = null
    }
    if (!('startDate' in fields) && !existing?.startDate) {
      result.startDate = null
    }
  }
}
```
In `STRESS-09`:
When an existing item has `startDate: '2026-10-20T10:00:00.000Z'` and the caller updates `{ deadline: null }`:
- `!existing?.startDate` evaluates to `false`.
- `result.startDate` is NOT set to `null` (remains `undefined` on `result`).
- In `updateItem`, merging `{ ...current, ...syncedPatch }` preserves `current.startDate`.
- Resulting item has `deadline: null`, `dueDate: null`, but retains `startDate: '2026-10-20T10:00:00.000Z'`.
In contrast, line 117 handles clearing via `dueDate: null` correctly:
```typescript
} else {
  // dueDate is null (cleared)
  result.deadline = null
  result.dueTime = null
  result.startDate = null
}
```

### Observation 5: Migration Fallback Assigns `startDate = item.createdAt` to Notes and Unscheduled Backlog Tasks
In `src/lib/db.ts` lines 60-62:
```typescript
if (!item.startDate) {
  if (item.deadline) {
    ...
  } else if (item.createdAt) {
    item.startDate = item.createdAt
  }
}
```
When upgrading v1 records with no `dueDate` and no `deadline`:
- Notes (`type: 'note'`) receive `startDate = item.createdAt` with `deadline: undefined`.
- Unscheduled tasks (`type: 'task'` in backlog) receive `startDate = item.createdAt` with `deadline: undefined`.
- Verified in `STRESS-01`:
  `legacy-note-nodate` (`type: 'note'`) gained `startDate: '2026-09-02T12:00:00.000Z'`.

---

## 2. Logic Chain

1. *From Observation 2*: ISO 8601 requires two-digit hours `HH:mm:ss`. A naive check `item.dueTime.length === 5` fails for common single-digit hour inputs (`9:00`, `9:30`, `8:15`). The resulting concatenated timestamp (`YYYY-MM-DDT9:30.000Z`) is an invalid time value in JS.
2. *From Observation 2*: IndexedDB indexes strings using UTF-16 code point order. Because character `'9'` (code 57) > `'2'` (code 50), `"2026-10-15T9:30.000Z"` sorts *after* `"2026-10-15T23:59:59.999Z"`. Consequently, any range query targeting October 15 silently excludes the task, and any chronological query orders a morning task after 11:00 PM.
3. *From Observation 3*: In `useAppStore.syncTemporalFields`, single-digit hours fail the exact same length check, fail `!isNaN(parsed.getTime())`, and trigger a fallback to `new Date(fields.dueDate).toISOString()`, silently setting `deadline` to midnight UTC (`00:00:00.000Z`) and erasing user scheduling information.
4. *From Observation 4*: Line 88 of `useAppStore.ts` checks `!existing?.startDate`. If an item already had a start date, this condition is false, preventing `result.startDate` from being set to `null`. This creates an asymmetric behavior where clearing via `dueDate: null` clears both start and deadline, but clearing via `deadline: null` leaves an orphaned start date without a deadline.
5. *From Observation 5*: A note is not a scheduled event, and a backlog item is intentionally unscheduled. Assigning `startDate = item.createdAt` populates the `startDate` index with non-scheduled items, causing queries on `startDate` to inadvertently return notes and past-dated backlog tasks.

---

## 3. Caveats

- Milestone 2 (`src/lib/focusEngine.ts`) and Milestone 3 (`src/lib/timelineLayout.ts`) are planned and not yet implemented; tests in `r2_focus_e2e.test.ts` and `r3_calendar_e2e.test.ts` correctly skip pending modules.
- Pre-existing TypeScript issues noted by the worker in unowned dashboard UI files (`src/components/dashboard/DashboardOverview.tsx`) were not altered, preserving milestone ownership boundaries.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

While the core architecture (Dexie v2 bump, index creation, type definitions, and basic sync) is sound, Milestone 1 cannot be approved in its current state due to high-risk data corruption and query evasion bugs on boundary inputs.

### Required Changes for Worker M1:

1. **Fix `dueTime` Normalization in `src/lib/db.ts` (Lines 37-43)**:
   Ensure single-digit hours (`H:mm`) are padded to 2 digits (`HH:mm:ss`):
   ```typescript
   let timePart = '23:59:59'
   if (item.dueTime) {
     const parts = item.dueTime.split(':')
     const hh = parts[0].padStart(2, '0')
     const mm = (parts[1] || '00').padStart(2, '0')
     const ss = (parts[2] || '00').padStart(2, '0')
     timePart = `${hh}:${mm}:${ss}`
   }
   item.deadline = `${item.dueDate}T${timePart}.000Z`
   ```

2. **Fix `dueTime` Normalization in `src/store/useAppStore.ts` (Lines 96-105)**:
   Apply identical `padStart(2, '0')` normalization so that `dueTime: "9:30"` produces a valid ISO string rather than falling back to midnight UTC.

3. **Fix `deadline: null` Clear Invariant in `src/store/useAppStore.ts` (Line 88)**:
   Change:
   ```typescript
   if (!('startDate' in fields) && !existing?.startDate) {
     result.startDate = null
   }
   ```
   To:
   ```typescript
   if (!('startDate' in fields)) {
     result.startDate = null
   }
   ```
   So that clearing `deadline` clears `startDate` unless an explicit new `startDate` was provided in the patch.

4. **Refine Migration Fallback in `src/lib/db.ts` (Lines 60-62)**:
   Do NOT assign `startDate = item.createdAt` to items that lack a `deadline`. An item without a deadline is an unscheduled backlog item or a note; its `startDate` should remain `undefined` or `null`.

---

## 5. Verification Method

To verify:

1. **Run the Adversarial Stress Suite**:
   ```powershell
   npx vitest run src/tests/stress/m1_adversarial_stress.test.ts
   ```
   *Current state*: 2 tests fail (`STRESS-02` and `STRESS-09`).
   *Passing condition*: All 11 tests pass after applying the 4 fixes above.

2. **Run DB & Store Unit Suites (Regression Check)**:
   ```powershell
   npx vitest run src/lib/__tests__/db.test.ts
   npx vitest run src/store/__tests__/useAppStore.test.ts
   npx vitest run src/tests/e2e/r1_storage_e2e.test.ts
   ```
   *Expected*: All tests pass with 0 failures.

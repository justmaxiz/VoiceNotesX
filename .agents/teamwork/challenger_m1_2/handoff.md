# Adversarial Review & Handoff Report: Milestone 1 Temporal Edge Cases & Store Synchronization

**Role:** Empirical Challenger 2  
**Working Directory:** `d:\relax\projects\voicenotes\.agents\teamwork\challenger_m1_2`  
**Target:** Milestone 1 Data Structure, Dexie Schema v2, and `useAppStore` Temporal Synchronization  
**Empirical Test Suite:** `d:\relax\projects\voicenotes\src\tests\challenger2_temporal_edge_cases.test.ts` (19 test cases)  
**Verdict:** `REQUEST_CHANGES`

---

## Challenge Summary

**Overall risk assessment**: **HIGH**

While Milestone 1 established the foundation for `startDate`, `deadline`, and Dexie v2 indexing, empirical testing revealed **two HIGH-severity** and **three MEDIUM-severity** vulnerabilities in store synchronization and timezone handling. Specifically, explicit user updates can suffer silent data corruption due to nullish coalescing against deleted deadlines, Dexie IndexedDB range indexing breaks for non-UTC ISO timestamps, and `batchRescheduleTasks` suffers from unhandled fatal crashes when selected tasks are deleted.

---

## 1. Observation

### Observation 1.1: Silent Data Corruption in `syncTemporalFields` when Updating `startDate` with `deadline: null`
In `src/store/useAppStore.ts:152-168`:
```typescript
152:  const effectiveStart = result.startDate ?? existing?.startDate
153:  const effectiveDeadline = result.deadline ?? existing?.deadline
154:  if (effectiveStart && effectiveDeadline) {
155:    const sTime = new Date(effectiveStart).getTime()
156:    const dTime = new Date(effectiveDeadline).getTime()
157:    if (!isNaN(sTime) && !isNaN(dTime) && sTime > dTime) {
158:      if ('startDate' in fields && !('deadline' in fields)) {
159:        const dur = estimatedMinutes > 0 ? estimatedMinutes : 60
160:        result.deadline = new Date(sTime + dur * 60000).toISOString()
161:        result.dueDate = result.deadline.split('T')[0]
162:        result.dueTime = result.deadline.split('T')[1].substring(0, 5)
163:      } else {
164:        const dur = estimatedMinutes > 0 ? estimatedMinutes : 60
165:        result.startDate = new Date(dTime - dur * 60000).toISOString()
166:      }
167:    }
168:  }
```
When an existing item has `deadline = '2026-10-10T10:00:00.000Z'` and a caller performs:
```typescript
await useAppStore.getState().updateItem(id, {
  startDate: '2026-10-10T12:00:00.000Z',
  deadline: null,
})
```
- In line 153: In JavaScript, `result.deadline (null) ?? existing?.deadline ('10:00')` evaluates to `'2026-10-10T10:00:00.000Z'`.
- Section 5 compares `effectiveStart` (12:00) with `existing.deadline` (10:00).
- Since `12:00 > 10:00` and `'deadline' in fields` is true, line 165 executes:
  `result.startDate = new Date(dTime - 600000).toISOString() = '2026-10-10T09:00:00.000Z'`.
- **Verbatim Result**: The user's explicit request `startDate = 12:00` was overwritten and saved as `09:00` based on a dead deadline that was explicitly cleared to `null`! (Empirically verified in `src/tests/challenger2_temporal_edge_cases.test.ts:2.5`).

---

### Observation 1.2: Incomplete Cleanup on `deadline: null` Leaving Orphaned `dueTime`
In `src/store/useAppStore.ts:83-91`:
```typescript
83:    } else {
84:      // deadline explicitly set to null/falsy
85:      if (!('dueDate' in fields)) {
86:        result.dueDate = null
87:      }
88:      if (!('startDate' in fields) && !existing?.startDate) {
89:        result.startDate = null
90:      }
91:    }
```
When `updateItem(id, { deadline: null })` is called on a scheduled task (e.g. `dueTime: '10:00'`, `dueDate: '2026-10-10'`):
- `result.dueDate` is set to `null`.
- `result.dueTime` is **never set to null** (absent from lines 83-91).
- `result.startDate` is **never cleared** if `existing?.startDate` was truthy.
- **Verbatim Result**: `item` in store and IndexedDB retains `dueTime: '10:00'` as an orphaned string with `dueDate: null` and `deadline: null`. (Empirically verified in `src/tests/challenger2_temporal_edge_cases.test.ts:2.4`).

---

### Observation 1.3: Timezone Invariance Failure & Dexie Index Breakage for Non-UTC ISO Timestamps
In `src/store/useAppStore.ts:69-82`:
```typescript
69:  if ('deadline' in fields) {
70:    if (fields.deadline) {
71:      const dDate = new Date(fields.deadline)
72:      if (!isNaN(dDate.getTime())) {
73:        if (!('dueDate' in fields)) {
74:          result.dueDate = fields.deadline.includes('T') ? fields.deadline.split('T')[0] : fields.deadline
75:        }
76:        if (!('dueTime' in fields) && fields.deadline.includes('T')) {
77:          result.dueTime = fields.deadline.split('T')[1].substring(0, 5)
78:        }
79:        if (!result.startDate && !existing?.startDate) {
80:          result.startDate = new Date(dDate.getTime() - estimatedMinutes * 60000).toISOString()
81:        }
82:      }
```
When `deadline` is passed as an ISO string with a timezone offset (e.g. `'2026-10-15T18:00:00+03:00'`, which is `15:00 UTC`):
1. `result.deadline` is NOT normalized to UTC `.toISOString()`. It is stored as `'2026-10-15T18:00:00+03:00'`.
2. `result.startDate` IS generated via `new Date(...).toISOString()`, so it is stored in UTC: `'2026-10-15T14:00:00.000Z'`.
3. `result.dueTime` is sliced from the raw string as `'18:00'`. When subsequent store operations reconstruct `deadline` via line 99 (`${datePart}T${timeFormatted}.000Z`), it becomes `'2026-10-15T18:00:00.000Z'` (a 3-hour shift from the original instant!).
4. **Dexie Range Query Failure**: In IndexedDB, string indexes compare lexicographically. Running `testDb.items.where('deadline').between('2026-10-15T11:30:00.000Z', '2026-10-15T12:30:00.000Z')` finds `2026-10-15T12:00:00.000Z`, but completely misses the equivalent instant `'2026-10-15T15:00:00+03:00'`. (Empirically verified in `src/tests/challenger2_temporal_edge_cases.test.ts:5.3`).
5. **Day-Boundary Desynchronization**: For negative offsets crossing midnight (`deadline: '2026-10-15T22:00:00-05:00'` = Oct 16 03:00 UTC), `result.dueDate` is `'2026-10-15'`, while `result.startDate` is `'2026-10-16T02:00:00.000Z'`. The start date is on a day AFTER the due date! (Empirically verified in `src/tests/challenger2_temporal_edge_cases.test.ts:5.2`).

---

### Observation 1.4: Unhandled Fatal Crash in `batchRescheduleTasks` when Selected Task is Deleted
In `src/store/useAppStore.ts:337-347` (`deleteItem`):
```typescript
337:  deleteItem: async (id: string) => {
338:    const previousItems = get().items
339:    const itemToDelete = previousItems.find((i) => i.id === id)
340:    if (!itemToDelete) {
341:      throw new Error(`Item with id "${id}" not found`)
342:    }
343:    const nextItems = previousItems.filter((i) => i.id !== id)
344:    set({ items: nextItems })
345:    removeSearchItem(id)
```
And in `src/store/useAppStore.ts:483-494` (`batchRescheduleTasks`):
```typescript
483:  batchRescheduleTasks: async (dueDate: string | null) => {
484:    const selected = get().selectedTaskIds
485:    if (selected.length === 0) return
486:    for (const id of selected) {
487:      if (dueDate === null) {
488:        await get().updateItem(id, { dueDate: null, dueTime: null, deadline: null, startDate: null })
489:      } else {
490:        await get().updateItem(id, { dueDate })
491:      }
492:    }
493:    set({ selectedTaskIds: [], isSelectMode: false })
494:  },
```
- `deleteItem` does NOT remove `id` from `selectedTaskIds`.
- If an item is deleted while selected, `batchRescheduleTasks` iterates over `selected` and calls `updateItem` on the missing ID.
- `updateItem` throws `Item with id "..." not found`.
- **Verbatim Error**: `Item with id "batch-ghost-1" not found`.
- The unhandled exception aborts the loop, leaving all subsequent selected tasks un-rescheduled and the store in an inconsistent state. (Empirically verified in `src/tests/challenger2_temporal_edge_cases.test.ts:4.3`).

---

### Observation 1.5: Dexie v2 Migration Sets `startDate = createdAt` on Unscheduled Backlog Tasks
In `src/lib/db.ts:48-63`:
```typescript
48:  if (!item.startDate) {
49:    if (item.deadline) {
...
59:    } else if (item.createdAt) {
60:      item.startDate = item.createdAt
61:    }
62:  }
```
When upgrading legacy v1 tasks that had no `dueDate` and no `deadline` (backlog tasks):
- Line 60 assigns `item.startDate = item.createdAt`.
- While `item.deadline` remains `undefined`.
- **Verbatim Result**: Legacy backlog items created weeks ago are transformed into half-scheduled tasks starting at their creation timestamp, polluting temporal range queries and focus logic. (Empirically verified in `src/tests/challenger2_temporal_edge_cases.test.ts:6.1`).

---

## 2. Logic Chain

1. *From Observation 1.1*: The invariant enforcement in Section 5 was designed to ensure `startDate <= deadline`. However, by using `result.deadline ?? existing?.deadline`, it conflates "deadline is unchanged" (undefined) with "deadline was explicitly cleared" (null). When a user sets `deadline: null` and updates `startDate`, the code falsely compares against the dead deadline and overwrites the user's explicit `startDate`. This is a silent data corruption bug.
2. *From Observation 1.2*: Clearing `deadline: null` fails to nullify `dueTime`. Since `dueTime` represents the time component of the deadline/dueDate, leaving an orphaned time string creates an inconsistent item model where `dueDate === null` but `dueTime === "HH:mm"`.
3. *From Observation 1.3*: Dexie v2 indexes `deadline` and `startDate` as plain strings in IndexedDB. IndexedDB evaluates index boundaries via binary/lexicographical string comparisons. Failing to normalize incoming `deadline` strings to canonical UTC ISO (`.toISOString()`) causes non-UTC timestamps to be excluded from indexed range queries, and causes bidirectional conversions between `dueDate`/`dueTime` and `deadline` to drift by the timezone offset.
4. *From Observation 1.4*: In `useAppStore`, `deleteItem` mutates `items` without cleaning up `selectedTaskIds`. When `batchRescheduleTasks` subsequently iterates over `selectedTaskIds`, it crashes on the missing item. In contrast, `batchCompleteTasks` defensively checks `const item = get().items.find(i => i.id === id); if (item ...)`.
5. *From Observation 1.5*: A backlog task is defined by the absence of scheduling (`startDate == null` and `deadline == null`). Assigning `startDate = createdAt` during migration violates this definition and breaks the contract described in `PROJECT.md` §18 ("optional startDate?: string | null and deadline?: string | null").

---

## 3. Caveats

- Unchecked Areas: Milestone 2 Focus Engine (`src/lib/focusEngine.ts`) and Milestone 3 Calendar stretching UI (`src/lib/timelineLayout.ts`) are not yet implemented and were not evaluated.
- Assumptions Made: We assume callers to `updateItem` or `addItem` may provide valid ISO 8601 strings with timezone offsets (e.g. from external calendar sync, user locale pickers, or AI prompt responses).
- No code in `src/store/useAppStore.ts` or `src/lib/db.ts` was modified during this review turn (strictly respecting review-only constraints).

---

## 4. Conclusion & Recommended Fixes

**Verdict:** `REQUEST_CHANGES`

Milestone 1 cannot be approved in its current state because it introduces silent data corruption on temporal updates, breaks IndexedDB indexing for non-UTC timestamps, and introduces crashes in multi-select batch rescheduling.

### Actionable Fix Recommendations for Milestone 1 Worker:

#### Fix 1: In `src/store/useAppStore.ts` — Fix `syncTemporalFields`
```typescript
export function syncTemporalFields<T extends Partial<Item>>(fields: T, existing?: Item): T {
  const result: T = { ...fields }
  const estimatedMinutes =
    typeof fields.estimatedMinutes === 'number'
      ? fields.estimatedMinutes
      : typeof existing?.estimatedMinutes === 'number'
      ? existing.estimatedMinutes
      : 60

  // 1. If deadline is explicitly updated
  if ('deadline' in fields) {
    if (fields.deadline) {
      const dDate = new Date(fields.deadline)
      if (!isNaN(dDate.getTime())) {
        const canonicalIso = dDate.toISOString()
        result.deadline = canonicalIso
        if (!('dueDate' in fields)) {
          result.dueDate = canonicalIso.split('T')[0]
        }
        if (!('dueTime' in fields)) {
          result.dueTime = canonicalIso.split('T')[1].substring(0, 5)
        }
        if (!result.startDate && !existing?.startDate) {
          result.startDate = new Date(dDate.getTime() - estimatedMinutes * 60000).toISOString()
        }
      }
    } else {
      // deadline explicitly set to null/falsy
      result.deadline = null
      if (!('dueDate' in fields)) {
        result.dueDate = null
      }
      if (!('dueTime' in fields)) {
        result.dueTime = null
      }
      if (!('startDate' in fields)) {
        result.startDate = null
      }
    }
  }
  // 2. If legacy dueDate is provided/updated without explicit deadline
  else if ('dueDate' in fields) {
    if (fields.dueDate) {
      const timePart = fields.dueTime ?? existing?.dueTime ?? '18:00'
      const datePart = fields.dueDate.includes('T') ? fields.dueDate.split('T')[0] : fields.dueDate
      const timeFormatted = timePart.length === 5 ? `${timePart}:00` : timePart
      const combined = `${datePart}T${timeFormatted}.000Z`
      const parsed = new Date(combined)
      if (!isNaN(parsed.getTime())) {
        result.deadline = parsed.toISOString()
        const dur = estimatedMinutes > 0 ? estimatedMinutes : 60
        if (!result.startDate) {
          result.startDate = new Date(parsed.getTime() - dur * 60000).toISOString()
        }
      } else {
        const fallback = new Date(fields.dueDate)
        if (!isNaN(fallback.getTime())) {
          result.deadline = fallback.toISOString()
        }
      }
    } else {
      result.deadline = null
      result.dueTime = null
      result.startDate = null
    }
  }
  // 3. If dueTime is updated without dueDate/deadline
  else if ('dueTime' in fields && !('deadline' in fields)) {
    const datePart = existing?.dueDate || (existing?.deadline ? existing.deadline.split('T')[0] : null)
    if (datePart && fields.dueTime) {
      const timeFormatted = fields.dueTime.length === 5 ? `${fields.dueTime}:00` : fields.dueTime
      const combined = `${datePart}T${timeFormatted}.000Z`
      const parsed = new Date(combined)
      if (!isNaN(parsed.getTime())) {
        result.deadline = parsed.toISOString()
        const dur = estimatedMinutes > 0 ? estimatedMinutes : 60
        result.startDate = new Date(parsed.getTime() - dur * 60000).toISOString()
      }
    }
  }

  // 4. If startDate is set without deadline
  if ('startDate' in fields && fields.startDate) {
    const sDate = new Date(fields.startDate)
    if (!isNaN(sDate.getTime())) {
      result.startDate = sDate.toISOString() // Canonical UTC normalization
      const hasDeadlineInResult = 'deadline' in result ? Boolean(result.deadline) : Boolean(existing?.deadline)
      if (!hasDeadlineInResult) {
        const dur = estimatedMinutes > 0 ? estimatedMinutes : 60
        const dDate = new Date(sDate.getTime() + dur * 60000)
        result.deadline = dDate.toISOString()
        if (!('dueDate' in result)) {
          result.dueDate = result.deadline.split('T')[0]
        }
        if (!('dueTime' in result)) {
          result.dueTime = result.deadline.split('T')[1].substring(0, 5)
        }
      }
    }
  }

  // 5. Invariant check: ONLY run if both startDate AND deadline are truthy in the target state
  const targetStart = 'startDate' in result ? result.startDate : existing?.startDate
  const targetDeadline = 'deadline' in result ? result.deadline : existing?.deadline
  if (targetStart && targetDeadline) {
    const sTime = new Date(targetStart).getTime()
    const dTime = new Date(targetDeadline).getTime()
    if (!isNaN(sTime) && !isNaN(dTime) && sTime > dTime) {
      if ('startDate' in fields && !('deadline' in fields)) {
        const dur = estimatedMinutes > 0 ? estimatedMinutes : 60
        result.deadline = new Date(sTime + dur * 60000).toISOString()
        result.dueDate = result.deadline.split('T')[0]
        result.dueTime = result.deadline.split('T')[1].substring(0, 5)
      } else {
        const dur = estimatedMinutes > 0 ? estimatedMinutes : 60
        result.startDate = new Date(dTime - dur * 60000).toISOString()
      }
    }
  }

  return result
}
```

#### Fix 2: In `src/store/useAppStore.ts` — Prune `selectedTaskIds` in `deleteItem` and guard `batchRescheduleTasks`
1. In `deleteItem`:
```typescript
    const nextSelected = get().selectedTaskIds.filter((x) => x !== id)
    set({ items: nextItems, selectedTaskIds: nextSelected, isSelectMode: nextSelected.length > 0 ? get().isSelectMode : false })
```
2. In `batchRescheduleTasks`:
```typescript
    const selected = get().selectedTaskIds
    const currentItems = get().items
    const validSelected = selected.filter((id) => currentItems.some((i) => i.id === id))
    if (validSelected.length === 0) return
    for (const id of validSelected) {
      if (dueDate === null) {
        await get().updateItem(id, { dueDate: null, dueTime: null, deadline: null, startDate: null })
      } else {
        await get().updateItem(id, { dueDate })
      }
    }
    set({ selectedTaskIds: [], isSelectMode: false })
```

#### Fix 3: In `src/lib/db.ts` — Do NOT set `startDate = createdAt` for Backlog Tasks in Migration
In `src/lib/db.ts:48-63`:
```typescript
          if (!item.startDate) {
            if (item.deadline) {
              const d = new Date(item.deadline)
              if (!isNaN(d.getTime())) {
                const estMinutes =
                  typeof item.estimatedMinutes === 'number' && item.estimatedMinutes > 0
                    ? item.estimatedMinutes
                    : 60
                item.startDate = new Date(d.getTime() - estMinutes * 60000).toISOString()
              }
            }
          }
```
Remove `else if (item.createdAt) { item.startDate = item.createdAt }`. Backlog items should remain unconstrained (`startDate: null` / `undefined`).

---

## 5. Verification Method

To verify these findings independently:

1. **Run the Challenger 2 Empirical Test Suite**:
   ```powershell
   npx vitest run src/tests/challenger2_temporal_edge_cases.test.ts
   ```
   *Expected Result*: 19 tests pass, demonstrating and documenting each specific vulnerability.

2. **Run the Base Test Suites**:
   ```powershell
   npx vitest run src/lib/__tests__/db.test.ts src/store/__tests__/useAppStore.test.ts src/tests/e2e/r1_storage_e2e.test.ts
   ```
   *Expected Result*: 47 tests pass.

---

## 6. Stress Test Results Summary

| Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| `updateItem(id, { startDate: '< deadline' })` | Updates `startDate`, keeps `deadline` | `startDate` updated, `deadline` preserved | **PASS** |
| `updateItem(id, { startDate: '> deadline' })` | Pushes `deadline` forward by `estimatedMinutes` | `deadline` pushed forward, invariant holds | **PASS** |
| `updateItem(id, { deadline: '> startDate' })` | Updates `deadline`, keeps `startDate` | `deadline` updated, `startDate` preserved | **PASS** |
| `updateItem(id, { deadline: '< startDate' })` | Pulls `startDate` back by `estimatedMinutes` | `startDate` pulled back, invariant holds | **PASS** |
| `updateItem(id, { startDate: '12:00', deadline: null })` | Sets `startDate: '12:00'`, `deadline: null` | `startDate` corrupted to `09:00` via old deadline | **FAIL (Finding 1)** |
| `updateItem(id, { deadline: null })` | Clears `dueDate`, `dueTime`, `deadline`, `startDate` | Clears `dueDate`/`deadline`, leaves orphaned `dueTime` | **FAIL (Finding 2)** |
| Store ISO deadline with `+03:00` offset | Canonical UTC normalization in IndexedDB | Raw string stored; invisible to Dexie range query | **FAIL (Finding 3)** |
| Extract `dueTime` from `+03:00` and roundtrip | Preserves exact UTC instant | Shifts instant by 3 hours | **FAIL (Finding 3)** |
| Delete item while selected, then `batchRescheduleTasks` | Reschedules remaining items gracefully | Unhandled throw `Item with id "..." not found` | **FAIL (Finding 4)** |
| Dexie migration on legacy task without `dueDate` | Leaves task in backlog (`startDate: null`) | Sets `startDate = createdAt`, pseudo-scheduling it | **FAIL (Finding 5)** |

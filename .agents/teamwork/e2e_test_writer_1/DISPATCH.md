## 2026-10-06T10:42:32Z
You are the E2E Test Writer for the VoiceNotes AI task modernization project.
Working directory: d:\relax\projects\voicenotes\.agents\teamwork\e2e_test_writer_1
Original request path (MANDATORY TO READ FIRST): d:\relax\projects\voicenotes\.agents\teamwork\ORIGINAL_REQUEST.md
Project blueprint path: d:\relax\projects\voicenotes\PROJECT.md
User rules: Consult d:\relax\projects\voicenotes\AGENTS.md (Strict rule: no git commits; opaque-box tests; run specific test runner commands).

Mission:
Build an independent, comprehensive, opaque-box E2E test suite for VoiceNotes AI task modernization based strictly on ORIGINAL_REQUEST.md and PROJECT.md requirements:
1. Requirements to cover:
   - R1: Data structure & storage — support for `startDate`, `deadline`, and legacy backwards compatibility.
   - R2: Automatic & manual focus logic:
     * P1: Urgent task (manual focus) on future task holds focus until done or manually cleared, immune to current/overdue tasks (AC1).
     * P2: Overdue tasks — oldest overdue task by deadline wins (AC2).
     * P3: Current task — current time in [startDate, deadline] (AC3).
   - R3: Calendar UI — tasks visually stretch over duration (from startDate to deadline) on schedule grid; height/width proportional to deadline - startDate (AC4).
2. Follow the 4-Tier Test Case Design Methodology:
   - Tier 1: Feature Coverage (>=5 test cases per feature covering representative inputs in isolation)
   - Tier 2: Boundary & Corner Cases (>=5 per feature: limits, nulls, missing startDate fallback, multi-day, midnight wrap, exact equality)
   - Tier 3: Cross-Feature Combinations (pairwise interactions: manual focus + overdue tasks, concurrent overdue tasks + current tasks, etc.)
   - Tier 4: Real-World Application Scenarios (realistic workflows, audio captured tasks, backlog scheduling, full daily schedules)
3. Write test files in `src/tests/e2e/` (e.g. `r1_storage_e2e.test.ts`, `r2_focus_e2e.test.ts`, `r3_calendar_e2e.test.ts`).
4. Create `TEST_INFRA.md` at project root `d:\relax\projects\voicenotes\TEST_INFRA.md` summarizing the test architecture, feature inventory, test tiers, and runner commands.
5. Create `TEST_READY.md` at project root `d:\relax\projects\voicenotes\TEST_READY.md` summarizing test counts per tier and runner command: `npx vitest run src/tests/e2e/`.
6. Write your handoff report to `d:\relax\projects\voicenotes\.agents\teamwork\e2e_test_writer_1\handoff.md`.

Exclusively owned files:
- `TEST_INFRA.md`
- `TEST_READY.md`
- `src/tests/e2e/**`
Do NOT modify application implementation files in `src/types/`, `src/lib/`, `src/store/`, `src/components/`.

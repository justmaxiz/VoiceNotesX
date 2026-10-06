## 2026-10-06T10:28:15Z
You are the Focus Logic Engine Explorer for the VoiceNotes AI task system modernization project.
Working directory: d:\relax\projects\voicenotes\.agents\teamwork\explorer_survey_focus
Original request path (MANDATORY TO READ FIRST): d:\relax\projects\voicenotes\.agents\teamwork\ORIGINAL_REQUEST.md
User rules: Consult d:\relax\projects\voicenotes\AGENTS.md

Mission:
Investigate existing and needed task focus / active task selection logic in d:\relax\projects\voicenotes:
1. Search the codebase for any existing focus concepts: "focus", "currentTask", "activeTask", "urgent", "pinned", or similar in stores, components, or hooks.
2. Analyze the requirements for R2 in ORIGINAL_REQUEST.md:
   - Priority 1: Urgent task (manual focus) on future task holds focus until done or manually cleared. Check how manual focus should be toggled/persisted in state or Task entity.
   - Priority 2: Overdue tasks (deadline passed, not completed) — oldest overdue task by deadline wins.
   - Priority 3: Current task (current time in [startDate, deadline]). If multiple match, determine tie-breaking logic.
   - Default/Fallback if no task matches any priority.
3. Investigate how the active/focused task should be exposed to the UI (store selector, hook, timer/interval for time-based reactive focus updates).
4. Review Acceptance Criteria in ORIGINAL_REQUEST.md for focus logic and map out how each criterion will be implemented and tested.

Deliverable:
Write a comprehensive report to `d:\relax\projects\voicenotes\.agents\teamwork\explorer_survey_focus\report.md` and `d:\relax\projects\voicenotes\.agents\teamwork\explorer_survey_focus\handoff.md`.
Include concrete file paths, line numbers, code snippets, algorithm design, edge cases, and test strategy for R2.
When done, send a message back to the orchestrator.

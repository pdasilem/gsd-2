---
id: T03
parent: S02
milestone: M001
key_files:
  - src/resources/extensions/gsd/prompts/plan-slice.md
  - src/resources/extensions/gsd/tests/prompt-contracts.test.ts
  - src/resources/extensions/gsd/tests/plan-slice-prompt.test.ts
  - .gsd/milestones/M001/slices/S02/tasks/T03-PLAN.md
key_decisions:
  - The plan-slice prompt now uses `gsd_plan_slice` and `gsd_plan_task` as the primary numbered step (step 6) instead of a conditional afterthought (old step 8), with direct file writes explicitly labeled as a degraded fallback (step 7).
duration: ""
verification_result: passed
completed_at: 2026-03-23T16:08:41.655Z
blocker_discovered: false
---

# T03: Update plan-slice prompt to explicitly name gsd_plan_slice/gsd_plan_task as canonical write path, add prompt contract and template regression tests

**Update plan-slice prompt to explicitly name gsd_plan_slice/gsd_plan_task as canonical write path, add prompt contract and template regression tests**

## What Happened

Updated `src/resources/extensions/gsd/prompts/plan-slice.md` to replace the vague "if the tool path for this planning phase is available" language with explicit instructions naming `gsd_plan_slice` and `gsd_plan_task` as the canonical DB-backed write path for slice and task planning. The new step 6 instructs calling `gsd_plan_slice` with the full payload and `gsd_plan_task` for each task. Step 7 positions direct file writes as an explicitly degraded fallback path only used when the tools are unavailable, not the default. Removed the old step 8 that vaguely referenced "the tool path" and fixed step numbering.

Added 4 new prompt contract tests in `prompt-contracts.test.ts`: one verifying both tool names appear and the "canonical write path" language is present, one verifying direct file writes are framed as "degraded path, not the default", one verifying the prompt no longer has a bare "Write `{{outputPath}}`" as a primary numbered step, and one verifying the prompt instructs calling `gsd_plan_task` for each task.

Added 1 new template substitution test in `plan-slice-prompt.test.ts` confirming the tool names and canonical language survive variable substitution.

Also applied the task-plan pre-flight fix by adding an `## Observability Impact` section to T03-PLAN.md explaining how the prompt change makes planning actions observable via tool-call logs and how the contract tests serve as regression tripwires.

## Verification

Ran all three slice-level verification commands: (1) plan-slice.test.ts + plan-task.test.ts — 10/10 pass, (2) markdown-renderer.test.ts + auto-recovery.test.ts + prompt-contracts.test.ts filtered to planning patterns — 60/60 pass, (3) plan-slice.test.ts + plan-task.test.ts filtered to failure/cache/validation — 10/10 pass. Also ran the task-level verification command (prompt-contracts.test.ts + plan-slice-prompt.test.ts filtered to plan-slice|plan task|DB-backed) — 40/40 pass. Read back the prompt-contracts.test.ts assertions and confirmed they explicitly reference gsd_plan_slice and gsd_plan_task.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/prompt-contracts.test.ts src/resources/extensions/gsd/tests/plan-slice-prompt.test.ts --test-name-pattern="plan-slice|plan task|DB-backed"` | 0 | ✅ pass | 126ms |
| 2 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/plan-slice.test.ts src/resources/extensions/gsd/tests/plan-task.test.ts` | 0 | ✅ pass | 180ms |
| 3 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/markdown-renderer.test.ts src/resources/extensions/gsd/tests/auto-recovery.test.ts src/resources/extensions/gsd/tests/prompt-contracts.test.ts --test-name-pattern="plan-slice|plan-task|renderPlanFromDb|renderTaskPlanFromDb|task plan|DB-backed planning"` | 0 | ✅ pass | 695ms |
| 4 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/plan-slice.test.ts src/resources/extensions/gsd/tests/plan-task.test.ts --test-name-pattern="validation failed|render failed|cache|missing parent"` | 0 | ✅ pass | 180ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/resources/extensions/gsd/prompts/plan-slice.md`
- `src/resources/extensions/gsd/tests/prompt-contracts.test.ts`
- `src/resources/extensions/gsd/tests/plan-slice-prompt.test.ts`
- `.gsd/milestones/M001/slices/S02/tasks/T03-PLAN.md`

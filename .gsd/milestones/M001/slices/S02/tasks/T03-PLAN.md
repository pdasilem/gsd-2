---
estimated_steps: 4
estimated_files: 4
skills_used:
  - create-gsd-extension
  - test
---

# T03: Close prompt and contract coverage around DB-backed slice planning

**Slice:** S02 — plan_slice + plan_task tools + PLAN/task-plan renderers
**Milestone:** M001

## Description

Finish the slice by aligning the planning prompt surface with the new implementation. This task is intentionally smaller: once the renderer and handlers exist, the remaining risk is the LLM still being told to treat direct markdown writes as normal. Tighten the prompt wording and contract tests so the DB-backed slice/task planning route is the explicit expected behavior.

## Steps

1. Read the current planning prompt text in `src/resources/extensions/gsd/prompts/plan-slice.md` and the existing assertions in `src/resources/extensions/gsd/tests/prompt-contracts.test.ts` and `src/resources/extensions/gsd/tests/plan-slice-prompt.test.ts`.
2. Update `src/resources/extensions/gsd/prompts/plan-slice.md` to explicitly direct slice/task planning through `gsd_plan_slice` and `gsd_plan_task` when the tool path exists, while preserving the existing decomposition instructions and output requirements.
3. Extend prompt contract tests so they assert the new tool-backed instructions and reject regressions back to manual `PLAN.md` / task-plan writes as the intended source of truth.
4. Update prompt template tests if needed so variable substitution and template integrity still pass with the new instructions.

## Must-Haves

- [ ] `plan-slice.md` explicitly points planning at `gsd_plan_slice` / `gsd_plan_task` instead of only warning about direct `PLAN.md` writes.
- [ ] Prompt contract tests fail if the DB-backed slice/task planning tool instructions regress.
- [ ] Prompt template tests still pass after the wording change.

## Verification

- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/prompt-contracts.test.ts src/resources/extensions/gsd/tests/plan-slice-prompt.test.ts --test-name-pattern="plan-slice|plan task|DB-backed"`
- Read the relevant assertions in `src/resources/extensions/gsd/tests/prompt-contracts.test.ts` to confirm they mention `gsd_plan_slice` / `gsd_plan_task`.

## Inputs

- `src/resources/extensions/gsd/prompts/plan-slice.md` — current slice planning prompt
- `src/resources/extensions/gsd/tests/prompt-contracts.test.ts` — prompt regression contract tests
- `src/resources/extensions/gsd/tests/plan-slice-prompt.test.ts` — template substitution/integrity tests
- `src/resources/extensions/gsd/bootstrap/db-tools.ts` — canonical tool names to reference in the prompt/tests

## Expected Output

- `src/resources/extensions/gsd/prompts/plan-slice.md` — updated DB-backed slice/task planning instructions
- `src/resources/extensions/gsd/tests/prompt-contracts.test.ts` — stronger prompt contract coverage for `gsd_plan_slice` / `gsd_plan_task`
- `src/resources/extensions/gsd/tests/plan-slice-prompt.test.ts` — updated template tests if prompt wording changes affect expectations

## Observability Impact

- **Signals changed:** The planning prompt now explicitly names `gsd_plan_slice` and `gsd_plan_task` tools, so any agent following the prompt will emit structured tool calls instead of raw file writes — making planning actions observable via tool-call logs rather than implicit file-write patterns.
- **Inspection surface:** `prompt-contracts.test.ts` assertions referencing the canonical tool names serve as the regression tripwire; if the prompt text drifts back to manual-write instructions, these tests fail immediately.
- **Failure visibility:** A regression in the prompt wording (removing tool references or re-introducing manual write instructions) is caught by the contract tests before it reaches production prompt surfaces.

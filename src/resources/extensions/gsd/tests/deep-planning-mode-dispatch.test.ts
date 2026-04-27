// GSD-2 — Phase 11 Deep Planning Mode dispatch behavior contract.
// Verifies the new deep-mode dispatch rules guard correctly on prefs.planning_depth
// and on artifact presence, and that light mode behavior is unaffected.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import {
  DISPATCH_RULES,
  type DispatchContext,
} from "../auto-dispatch.ts";
import type { GSDState } from "../types.ts";
import type { GSDPreferences } from "../preferences.ts";

const WORKFLOW_PREFS_RULE_NAME = "deep: pre-planning (no workflow prefs) → workflow-preferences";
const PROJECT_RULE_NAME = "deep: pre-planning (no PROJECT) → discuss-project";
const REQUIREMENTS_RULE_NAME = "deep: pre-planning (no REQUIREMENTS) → discuss-requirements";

function makeIsolatedBase(): string {
  const base = join(tmpdir(), `gsd-deep-planning-${randomUUID()}`);
  mkdirSync(join(base, ".gsd", "milestones", "M001"), { recursive: true });
  return base;
}

function makeCtx(
  basePath: string,
  prefs: GSDPreferences | undefined,
  phase: GSDState["phase"] = "pre-planning",
): DispatchContext {
  const state: GSDState = {
    phase,
    activeMilestone: { id: "M001", title: "Test" },
    activeSlice: null,
    activeTask: null,
    recentDecisions: [],
    blockers: [],
    nextAction: "",
    registry: [{ id: "M001", title: "Test", status: "active" }],
  };
  return {
    basePath,
    mid: "M001",
    midTitle: "Test",
    state,
    prefs,
    structuredQuestionsAvailable: "false",
  };
}

function rule(name: string) {
  const r = DISPATCH_RULES.find(x => x.name === name);
  assert.ok(r, `dispatch rule "${name}" must exist`);
  return r!;
}

// ─── workflow-preferences rule ────────────────────────────────────────────

test("Phase 11: workflow-preferences does NOT dispatch in light mode", async (t) => {
  const base = makeIsolatedBase();
  t.after(() => { try { rmSync(base, { recursive: true, force: true }); } catch {} });

  const result = await rule(WORKFLOW_PREFS_RULE_NAME).match(makeCtx(base, undefined));
  assert.strictEqual(result, null);
});

test("Phase 11: workflow-preferences DOES dispatch in deep mode when config.json missing", async (t) => {
  const base = makeIsolatedBase();
  t.after(() => { try { rmSync(base, { recursive: true, force: true }); } catch {} });

  const prefs = { planning_depth: "deep" } as GSDPreferences;
  const result = await rule(WORKFLOW_PREFS_RULE_NAME).match(makeCtx(base, prefs));
  assert.ok(result && result.action === "dispatch");
  if (result.action === "dispatch") {
    assert.strictEqual(result.unitType, "workflow-preferences");
    assert.strictEqual(result.unitId, "WORKFLOW-PREFS");
  }
});

test("Phase 11: workflow-preferences does NOT dispatch when config.json has commit_policy", async (t) => {
  const base = makeIsolatedBase();
  t.after(() => { try { rmSync(base, { recursive: true, force: true }); } catch {} });

  writeFileSync(join(base, ".gsd", "config.json"), JSON.stringify({ commit_policy: "per-task" }));
  const prefs = { planning_depth: "deep" } as GSDPreferences;
  const result = await rule(WORKFLOW_PREFS_RULE_NAME).match(makeCtx(base, prefs));
  assert.strictEqual(result, null, "presence of any deep-mode key indicates already configured");
});

test("Phase 11: workflow-preferences DOES re-dispatch on malformed config.json", async (t) => {
  const base = makeIsolatedBase();
  t.after(() => { try { rmSync(base, { recursive: true, force: true }); } catch {} });

  writeFileSync(join(base, ".gsd", "config.json"), "not-json{");
  const prefs = { planning_depth: "deep" } as GSDPreferences;
  const result = await rule(WORKFLOW_PREFS_RULE_NAME).match(makeCtx(base, prefs));
  assert.ok(result && result.action === "dispatch", "malformed config treated as missing");
});

test("Phase 11: workflow-preferences does NOT dispatch when config.json has phases.skip_research", async (t) => {
  const base = makeIsolatedBase();
  t.after(() => { try { rmSync(base, { recursive: true, force: true }); } catch {} });

  writeFileSync(join(base, ".gsd", "config.json"), JSON.stringify({ phases: { skip_research: false } }));
  const prefs = { planning_depth: "deep" } as GSDPreferences;
  const result = await rule(WORKFLOW_PREFS_RULE_NAME).match(makeCtx(base, prefs));
  assert.strictEqual(result, null);
});

// ─── discuss-project rule ─────────────────────────────────────────────────

test("Phase 11: discuss-project does NOT dispatch when planning_depth is undefined (default light)", async (t) => {
  const base = makeIsolatedBase();
  t.after(() => { try { rmSync(base, { recursive: true, force: true }); } catch {} });

  const result = await rule(PROJECT_RULE_NAME).match(makeCtx(base, undefined));
  assert.strictEqual(result, null, "light mode (default) must not fire deep-mode rule");
});

test("Phase 11: discuss-project does NOT dispatch when planning_depth is 'light'", async (t) => {
  const base = makeIsolatedBase();
  t.after(() => { try { rmSync(base, { recursive: true, force: true }); } catch {} });

  const prefs = { planning_depth: "light" } as GSDPreferences;
  const result = await rule(PROJECT_RULE_NAME).match(makeCtx(base, prefs));
  assert.strictEqual(result, null, "explicit light mode must not fire deep-mode rule");
});

test("Phase 11: discuss-project DOES dispatch when planning_depth is 'deep' and PROJECT.md missing", async (t) => {
  const base = makeIsolatedBase();
  t.after(() => { try { rmSync(base, { recursive: true, force: true }); } catch {} });

  const prefs = { planning_depth: "deep" } as GSDPreferences;
  const result = await rule(PROJECT_RULE_NAME).match(makeCtx(base, prefs));
  assert.ok(result && result.action === "dispatch", "deep mode + missing PROJECT.md must dispatch");
  if (result.action === "dispatch") {
    assert.strictEqual(result.unitType, "discuss-project");
    assert.strictEqual(result.unitId, "PROJECT");
    assert.ok(result.prompt.length > 0, "prompt must be non-empty");
  }
});

test("Phase 11: discuss-project does NOT dispatch when PROJECT.md already exists", async (t) => {
  const base = makeIsolatedBase();
  t.after(() => { try { rmSync(base, { recursive: true, force: true }); } catch {} });

  writeFileSync(join(base, ".gsd", "PROJECT.md"), "# Project\n");
  const prefs = { planning_depth: "deep" } as GSDPreferences;
  const result = await rule(PROJECT_RULE_NAME).match(makeCtx(base, prefs));
  assert.strictEqual(result, null, "PROJECT.md present must fall through to next rule");
});

test("Phase 11: discuss-project does NOT dispatch in non-pre-planning phases", async (t) => {
  const base = makeIsolatedBase();
  t.after(() => { try { rmSync(base, { recursive: true, force: true }); } catch {} });

  const prefs = { planning_depth: "deep" } as GSDPreferences;
  const result = await rule(PROJECT_RULE_NAME).match(makeCtx(base, prefs, "executing"));
  assert.strictEqual(result, null, "execution phases must not fire project-level discussion");
});

test("Phase 11: discuss-project DOES dispatch in needs-discussion phase", async (t) => {
  const base = makeIsolatedBase();
  t.after(() => { try { rmSync(base, { recursive: true, force: true }); } catch {} });

  const prefs = { planning_depth: "deep" } as GSDPreferences;
  const result = await rule(PROJECT_RULE_NAME).match(makeCtx(base, prefs, "needs-discussion"));
  assert.ok(result && result.action === "dispatch", "needs-discussion is a valid entry phase");
});

// ─── discuss-requirements rule ────────────────────────────────────────────

test("Phase 11: discuss-requirements does NOT dispatch in light mode", async (t) => {
  const base = makeIsolatedBase();
  t.after(() => { try { rmSync(base, { recursive: true, force: true }); } catch {} });

  const result = await rule(REQUIREMENTS_RULE_NAME).match(makeCtx(base, undefined));
  assert.strictEqual(result, null, "light mode must not fire deep-mode requirements rule");
});

test("Phase 11: discuss-requirements does NOT dispatch when PROJECT.md missing (project rule must run first)", async (t) => {
  const base = makeIsolatedBase();
  t.after(() => { try { rmSync(base, { recursive: true, force: true }); } catch {} });

  const prefs = { planning_depth: "deep" } as GSDPreferences;
  const result = await rule(REQUIREMENTS_RULE_NAME).match(makeCtx(base, prefs));
  assert.strictEqual(result, null, "PROJECT.md missing — earlier rule handles");
});

test("Phase 11: discuss-requirements DOES dispatch when PROJECT.md exists and REQUIREMENTS.md missing", async (t) => {
  const base = makeIsolatedBase();
  t.after(() => { try { rmSync(base, { recursive: true, force: true }); } catch {} });

  writeFileSync(join(base, ".gsd", "PROJECT.md"), "# Project\n");
  const prefs = { planning_depth: "deep" } as GSDPreferences;
  const result = await rule(REQUIREMENTS_RULE_NAME).match(makeCtx(base, prefs));
  assert.ok(result && result.action === "dispatch", "deep mode + PROJECT.md present + REQUIREMENTS.md missing must dispatch");
  if (result.action === "dispatch") {
    assert.strictEqual(result.unitType, "discuss-requirements");
    assert.strictEqual(result.unitId, "REQUIREMENTS");
  }
});

test("Phase 11: discuss-requirements does NOT dispatch when REQUIREMENTS.md already exists", async (t) => {
  const base = makeIsolatedBase();
  t.after(() => { try { rmSync(base, { recursive: true, force: true }); } catch {} });

  writeFileSync(join(base, ".gsd", "PROJECT.md"), "# Project\n");
  writeFileSync(join(base, ".gsd", "REQUIREMENTS.md"), "# Requirements\n");
  const prefs = { planning_depth: "deep" } as GSDPreferences;
  const result = await rule(REQUIREMENTS_RULE_NAME).match(makeCtx(base, prefs));
  assert.strictEqual(result, null, "REQUIREMENTS.md present must fall through");
});

// ─── ordering invariant ───────────────────────────────────────────────────

test("Phase 11: deep-mode rules registered in correct order", () => {
  const workflowIdx = DISPATCH_RULES.findIndex(r => r.name === WORKFLOW_PREFS_RULE_NAME);
  const projectIdx = DISPATCH_RULES.findIndex(r => r.name === PROJECT_RULE_NAME);
  const requirementsIdx = DISPATCH_RULES.findIndex(r => r.name === REQUIREMENTS_RULE_NAME);
  const milestoneIdx = DISPATCH_RULES.findIndex(r => r.name === "pre-planning (no context) → discuss-milestone");

  assert.ok(workflowIdx >= 0, "workflow-preferences rule must be registered");
  assert.ok(projectIdx >= 0, "project rule must be registered");
  assert.ok(requirementsIdx >= 0, "requirements rule must be registered");
  assert.ok(milestoneIdx >= 0, "milestone rule must be registered");

  // Order: workflow-prefs → discuss-project → discuss-requirements → discuss-milestone
  assert.ok(workflowIdx < projectIdx, "workflow-prefs must fire before discuss-project");
  assert.ok(projectIdx < requirementsIdx, "discuss-project must fire before discuss-requirements");
  assert.ok(requirementsIdx < milestoneIdx, "discuss-requirements must fire before discuss-milestone");
});

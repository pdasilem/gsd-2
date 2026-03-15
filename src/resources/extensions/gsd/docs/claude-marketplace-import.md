# Claude Marketplace Import

This document explains how GSD imports Claude Code marketplaces and plugins, how that maps to Anthropic's documented plugin model, and what gets persisted into GSD/Pi settings.

---

## Overview

Claude Code plugins are distributed through **marketplaces**. Per Anthropic's docs, users add a marketplace source with:

```text
/plugin marketplace add <github repo or local path>
```

A marketplace contains a catalog at:

```text
.claude-plugin/marketplace.json
```

That catalog lists one or more plugins and where each plugin should be fetched from.

GSD's Claude import flow reads those marketplace catalogs, inspects the referenced plugins, and imports the parts that map cleanly into GSD/Pi today.

---

## Claude Code model vs GSD model

### Claude Code concepts

Anthropic distinguishes between:

- **Marketplace source** — where Claude fetches `marketplace.json`
- **Plugin source** — where Claude fetches each plugin listed in that marketplace
- **Installed plugin cache** — Claude copies installed plugin payloads into:

```text
~/.claude/plugins/cache
```

Claude also stores user-added marketplace sources under:

```text
~/.claude/plugins/marketplaces
```

### GSD import model

GSD treats Claude marketplaces as **plugin catalogs**, not generic npm-style packages.

For imported Claude components, GSD preserves canonical namespaced identity:

- skills: `plugin-name:skill-name`
- agents: `plugin-name:agent-name`

This avoids flattening Claude plugin components into anonymous global names.

---

## Discovery order

When GSD looks for Claude plugin/marketplace material, it prefers Claude-managed locations first:

1. `~/.claude/plugins/marketplaces`
2. `~/.claude/plugins/cache`
3. `~/.claude/plugins`

After that, GSD may still look at local clone-style convenience paths such as sibling repos or `~/repos/...` locations. Those are useful for developer workflows and examples, but they are **not** the primary Claude storage model.

---

## What the import flow does

The interactive entry point is:

```text
/gsd prefs import-claude
```

You can also choose scope explicitly:

```text
/gsd prefs import-claude global
/gsd prefs import-claude project
```

The flow is:

1. discover Claude skills and/or marketplace roots
2. identify marketplace roots by checking for `.claude-plugin/marketplace.json`
3. inspect discovered plugins and inventory components
4. let you select components to import
5. validate for canonical conflicts and shorthand ambiguity
6. persist imported resources into GSD/Pi settings

---

## What gets imported today

### Imported

- **Skills**
  - persisted into GSD/Pi skill paths
  - available for use in GSD/Pi
- **Marketplace-derived skills**
  - imported with canonical plugin namespace preserved
- **Marketplace-derived agents**
  - discovered, modeled, validated, and preserved in the import manifest

### Discovered but not fully imported into Pi-native runtime behavior

- hooks
- MCP server definitions
- LSP server definitions
- other Claude plugin metadata that does not directly map to current GSD/Pi runtime surfaces

These are still important for truthful discovery, but not all of them are currently translated into active Pi runtime behavior.

---

## Important behavior: marketplace agents are not stored as package sources

Claude plugin agent directories are usually markdown agent-definition directories, for example:

```text
.../plugins/python3-development/agents
```

These are **not** loadable Pi extension packages.

GSD therefore does **not** persist imported marketplace agent directories into:

```json
settings.packages
```

This is intentional.

### Why

If an `.../agents` directory is written into `settings.packages`, Pi can treat it like an extension/package root during startup. That leads to extension loader failures such as:

```text
Cannot find module '.../agents'
```

GSD now avoids writing those entries.

---

## Settings effects

### Skills

Imported skills are persisted into Pi skill settings and may also be added to GSD preferences depending on what you choose during import.

### Marketplace agents

Marketplace agents are preserved in the import model and validated, but GSD does **not** persist their `agents/` directories as package sources.

This prevents startup breakage and keeps the imported state aligned with Claude's plugin semantics.

---

## Namespace behavior

GSD preserves Claude plugin namespace semantics.

### Canonical references

Use canonical names when you need the authoritative unique reference:

```text
python3-development:stinkysnake
scientific-method:experiment-protocol
```

### Shorthand

GSD may allow shorthand when it is safe and unambiguous.

### Local-first resolution

If a namespaced component refers to another component by bare name, GSD tries the same plugin namespace first before broader lookup.

---

## Diagnostics

GSD distinguishes between:

- **canonical conflicts** — hard errors
- **shorthand overlaps** — warnings when canonical names are still distinct
- **alias conflicts** — warnings/errors depending on the collision shape

This keeps the operational surface honest without over-reporting valid marketplace content as broken.

---

## Testing model

GSD uses three levels of validation for this feature:

1. **Contract/unit tests** for parsing, namespacing, resolution, diagnostics, and import behavior
2. **Portable integration-style tests** that can clone marketplace repos when local examples are absent
3. **Real host validation** against the installed `gsd` binary and actual Claude-managed directories on the host machine

The test model is intentionally moving away from assumptions like `../claude_skills` always existing on the contributor's machine.

---

## Current limitations

- GSD does not yet fully translate every Claude plugin component type into active Pi runtime behavior
- marketplace-derived agents are not persisted as package roots, by design
- Claude-managed cache contents may be useful for discovery, but they should not be confused with generic package roots
- some test and discovery surfaces still carry developer-convenience fallback paths for local clone workflows

---

## References

- Anthropic: Claude Code settings
- Anthropic: Create and distribute a plugin marketplace
- Anthropic: Plugins and plugin reference

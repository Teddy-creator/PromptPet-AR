# PromptPet-AR

## Project Overview

- PromptPet-AR is a lightweight AI + WebAR demo: the user enters one prompt, the system generates a stylized 3D desktop pet or figurine, shows it on the web, and lets the user place it in phone AR.
- The goal is a narrow, delightful, shareable demo, not a general-purpose 3D generation platform.
- This repository is the primary project repository. Future product planning, implementation, commits, and uploads all happen here.

## Current Phase

- The repository now includes a locally verified `fox-base-v9` Android rollback baseline and an in-progress `fox-base-v10` portfolio-quality mother-asset line: prompt -> fox template variant -> web preview -> Android AR.
- The current job is to preserve scope clarity while improving the repo-managed fox mother asset, rather than expanding product scope or replacing the front end.
- The core chain to prove, in order, is: `Prompt -> Blender MCP -> glb -> Web Preview -> Mobile AR`.
- Future implementation should keep that chain working before expanding into polish or platform breadth.

## Repository Map

- `src/app`: App Router pages and API routes
- `src/components`: UI surfaces for the home, result, share, and preview experiences
- `src/lib/generation-service.ts`: service boundary used by routes and metadata loaders
- `src/lib/generator-adapters`: swappable generation adapters, currently `mock` plus a placeholder `blender-mcp`
- `src/lib/generation-persistence.ts`: file-backed output persistence for generation records and artifacts
- `scripts/blender-mcp-worker.mjs`: local worker that consumes `task.json`, writes adapter status, and can either copy mock assets or call a real Blender MCP HTTP tool plan
- `assets/fox-base`: repo-managed fox-base source `.blend`, exported template assets, and formal demo sample
- `public/demo`: seeded fox-base demo assets used by mock mode, preview, and metadata fallbacks
- `scripts/build-fox-base-template.py`: validates the repo-managed fox mother `.blend`, exports formal assets, and syncs demo files
- `scripts/blender-mcp-plan.fox-base.json`: default fox-base template-variant execution plan for PolyMCP-style Blender HTTP tool calls
- `scripts/blender-mcp-plan.fox-v1.json`: procedural fallback plan kept for manual recovery only
- `scripts/blender-mcp-plan.starter.json`: minimal fallback execution plan kept as a baseline
- `src/lib`: generation types, validation, style-template definitions, and supporting utilities
- `src/data`: mock metadata used by the seeded demo asset
- `public/demo`: local fox-base demo assets for preview and sharing
- [README.md](/Users/cloud/Code/PromptPet-AR/README.md): project overview, positioning, current principles
- [PRODUCT_PLAN.md](/Users/cloud/Code/PromptPet-AR/PRODUCT_PLAN.md): product promise, MVP shape, system stages, expected outputs
- [UI_FLOW.md](/Users/cloud/Code/PromptPet-AR/UI_FLOW.md): page structure, interaction priorities, UX tone
- [ROADMAP.md](/Users/cloud/Code/PromptPet-AR/ROADMAP.md): delivery order and phase boundaries
- [AGENTS.md](/Users/cloud/Code/PromptPet-AR/AGENTS.md): durable project rules for future AI collaborators

## Files To Read First

- Read [README.md](/Users/cloud/Code/PromptPet-AR/README.md) first for project scope.
- Read [PRODUCT_PLAN.md](/Users/cloud/Code/PromptPet-AR/PRODUCT_PLAN.md) before changing product behavior or system flow.
- Read [UI_FLOW.md](/Users/cloud/Code/PromptPet-AR/UI_FLOW.md) before designing UI, copy, or interaction details.
- Read [ROADMAP.md](/Users/cloud/Code/PromptPet-AR/ROADMAP.md) before proposing sequencing or milestone changes.
- Read [docs/demo-runbook.md](/Users/cloud/Code/PromptPet-AR/docs/demo-runbook.md) before demo prep, presentation prep, or changing homepage demo examples.
- Read [docs/demo-validation-2026-04-13.md](/Users/cloud/Code/PromptPet-AR/docs/demo-validation-2026-04-13.md) before changing the curated demo prompt set or claiming a prompt is fit for live demo use.
- Read [docs/quality-guardrails.md](/Users/cloud/Code/PromptPet-AR/docs/quality-guardrails.md) before changing generation semantics, parser logic, worker execution, result/share fulfillment copy, or verification flow.
- Read [docs/dynamic-custom-runtime-first.md](/Users/cloud/Code/PromptPet-AR/docs/dynamic-custom-runtime-first.md) before changing `dynamic-custom`, runtime accessory generation, homepage mode semantics, or prompt-fulfillment verification rules.
- Read [docs/superpowers/plans/prototype-traits-rollout-notes.md](/Users/cloud/Code/PromptPet-AR/docs/superpowers/plans/prototype-traits-rollout-notes.md) before changing prototype retrieval, semantic traits, compiler precedence, rollout flags, or rollback behavior.

## Source Of Truth

- `README.md`, `PRODUCT_PLAN.md`, `UI_FLOW.md`, and `ROADMAP.md` are the current source of truth.
- Do not silently expand scope beyond the current MVP described in those documents.
- Do not change the core product promise from "one sentence to a cute 3D object that can be previewed on the web and placed in AR" unless the user explicitly asks.
- If future code behavior conflicts with these docs, either update the docs intentionally or confirm with the user before drifting.

## Commands

- Install: `npm install`
- Dev: `npm run dev`
- Lint: `npm run lint`
- Type check: `npm run typecheck`
- Build: `npm run build`
- Blender MCP worker watch mode: `npm run worker:blender-mcp`
- Blender MCP worker once mode: `npm run worker:blender-mcp:once`
- Blender MCP real HTTP mode: `npm run worker:blender-mcp:poly-http`
- Do not invent alternate package managers or framework commands unless the repo actually adopts them.

## Stack Direction

- The current implementation uses `Next.js App Router + TypeScript`.
- Generation flow is now split into validation -> service -> adapter -> persistence. Keep that layering intact when adding the real Blender MCP path.
- Prefer a lightweight web frontend plus `model-viewer`-style 3D preview and a mobile AR-compatible delivery path.
- Treat Android WebAR / Scene Viewer style support and iOS Quick Look style support as desired outcomes, not proof that a specific implementation has already been chosen.
- Do not replace the current stack casually. Extend it unless the user explicitly asks for a migration.

## Working Rules

- Preserve the narrow MVP. First version is about a single lightweight object, strong visual delight, and a clean demo flow.
- Keep the scope centered on `desktop pet / cute figurine` style outputs unless the user changes direction.
- The immediate next milestone is `fox-base-v10`: preserve the Android-validated chain, improve face readability / head-body continuity / tail-root continuity, and strengthen theme-readable variants before adding new feature areas.
- Prioritize stability of the main chain over feature breadth.
- Follow the roadmap order whenever possible:
  1. prove `Blender MCP -> glb`
  2. prove `glb -> web preview`
  3. prove `web preview -> mobile AR`
- Do not jump early into broader productization such as accounts, feeds, asset libraries, advanced editing, or platform expansion unless requested.
- Match the existing project language: lightweight, charming, demo-first, mobile-friendly, and shareable.
- For live demos or portfolio presentation, treat the curated demo prompt pack as the default operator surface; do not casually replace homepage demo prompts with open-ended examples unless they have been re-run through the real chain.
- Do not describe PromptPet-AR as a general-purpose 3D generator during demo-facing work; present it as a fox-only prompt-to-3D desk-pet demo with honest fulfillment reporting.
- Treat the final rendered result page and exported assets as the real source of truth. Do not treat `task.json`, `metadata`, parser fields, or scorecards as proof that the visible result is correct.
- When the user reports a failing prompt, the exact prompt becomes the primary regression case. Do not claim a fix until that exact prompt is re-run and visually verified.
- For accessory requests, verification must include all of: visible shape, anchor placement, per-accessory color, removed defaults, and result-page explanation consistency.
- If `experimental-addon` still falls back to stable reuse or approximation, report that honestly. Do not present it as full prompt fulfillment.
- Treat `prototypeCandidates + traits + retrievalMatches` as the new primary semantic middle layer for open-noun runtime design work.
- Treat `family` as a compatibility field and compiler hint unless current evidence proves a legacy-only branch is still required.

## Quality Guardrail Rule

- Maintain [docs/quality-guardrails.md](/Users/cloud/Code/PromptPet-AR/docs/quality-guardrails.md) as a living failure-memory document.
- Re-read it before editing parser logic, worker execution, accessory generation, fulfillment summaries, or verification behavior.
- If a new non-obvious mistake is discovered during PromptPet-AR work, add the reusable lesson to that document so future sessions do not repeat it.
- Maintain [docs/dynamic-custom-runtime-first.md](/Users/cloud/Code/PromptPet-AR/docs/dynamic-custom-runtime-first.md) as the durable contract for homepage mode semantics, runtime-first accessory behavior, semantic precedence, and truthful fulfillment reporting.
- Maintain [src/data/dynamic-custom-manual-review.json](/Users/cloud/Code/PromptPet-AR/src/data/dynamic-custom-manual-review.json) at 20+ prompts, and add newly discovered user-first failures there or in automated regression when they become recurring.

## Dependency Policy

- Add new dependencies cautiously and only with clear benefit to the current phase.
- Before the core chain is proven, do not add infrastructure for databases, auth, background job systems, analytics stacks, complex animation systems, or multi-user features unless the user explicitly asks for them.
- Prefer simple, reversible choices during PoC work.

## Domain Rules

- First version should stay focused on a constrained object category rather than open-ended 3D generation.
- The currently preferred object direction is `desktop pet`.
- The currently preferred style-template direction is:
  - `cream toy feel`
  - `low-poly cartoon`
  - `dreamy glowing`
- UX should feel soft, toy-like, and intuitive rather than like a professional 3D tool.
- The most important experience moments are:
  - prompt guidance on the creation page
  - an attractive 3D result preview
  - a successful `place it in the real world` AR moment on mobile

## Edit Boundaries

- Safe to change: project docs, future implementation files, UI behavior, prompt-normalization logic, preview flow, and AR entry flow that support the agreed MVP.
- Use extra caution when changing:
  - the end-to-end asset pipeline
  - export formats such as `glb` and `usdz`
  - assumptions about Android vs iOS AR support
  - anything that changes the public product promise or roadmap order
- Do not rewrite planning documents casually once implementation starts; keep them aligned intentionally.

## Verification

- In the current phase, verify that changes remain consistent with the existing docs and do not expand scope accidentally.
- Once implementation begins, prefer verification that mirrors the roadmap:
  - generated asset opens successfully
  - web preview renders and is interactable
  - AR handoff works on the intended mobile path
- If runnable checks do not exist yet, say so clearly instead of pretending they were run.

## Definition Of Done

- For planning work:
  - relevant docs stay aligned
  - scope remains clear and intentionally narrow
  - assumptions and open questions are reported plainly
- For implementation work:
  - the requested change is implemented in this repository
  - relevant checks are run when available
  - docs are updated if behavior, commands, or architecture changed
  - remaining risks, missing validation, or platform caveats are reported clearly

## Retrospective Rule

- After any non-obvious bug fix, workaround, or environment issue involving Blender MCP, model export, preview rendering, AR handoff, or device-specific behavior, briefly evaluate whether the lesson should be preserved with [$codexception](/Users/cloud/.codex/skills/codexception/SKILL.md).
- Preserve only reusable, verified lessons.

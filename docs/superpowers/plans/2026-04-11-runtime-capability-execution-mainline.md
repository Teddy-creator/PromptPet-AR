# Runtime Capability Execution Mainline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor runtime execution so host-coupled accessories are driven by reusable capability bundles, with chest-wrap/scarf as the first acceptance sample and failure-layer-aware refinement as the stabilizer.

**Architecture:** Preserve the current semantic/parser/prototype bridge and insert a richer execution entry point: `prototype + traits + anchor context -> capability bundle -> host-conditioned design contract -> deterministic host-fit/geometry solve -> critique-driven refine controller`. Keep legacy family branches only as compatibility fallback while new capability-driven paths take over the mainline.

**Tech Stack:** Next.js, TypeScript, Node worker scripts, Blender MCP, JSON regressions, shell/tsx verification scripts

---

## File Map

- Create: `src/types/runtime-capabilities.ts`
  Runtime capability and capability-driven design contract types.
- Create: `src/lib/runtime-capability-resolver.ts`
  Maps prototype/traits/anchor context into reusable capability bundles.
- Create: `src/lib/runtime-design-contracts.ts`
  Capability-level runtime design contracts such as chest-wrap/front-readable visibility rules.
- Modify: `src/lib/prototype-runtime-packs.ts`
  Keep prototype packs focused on prototype metadata while exposing capability hints.
- Modify: `src/lib/prompt-customization.ts`
  Bind capability resolution into runtime task seeds, attachment rules, silhouette blocks, and design contracts before family fallback.
- Modify: `src/lib/generation-types.ts`
  Extend runtime task/recipe types to carry capability metadata and design contract fragments.
- Modify: `scripts/blender-mcp-worker.mjs`
  Consume capability bundles and design contracts for placement, host-fit, critique routing, and refine decisions.
- Modify: `scripts/lib/runtime-visual-critique.mjs`
  Add capability-aware readability/host-fit evaluation helpers where needed.
- Modify: `scripts/lib/runtime-stop-diagnostics.mjs`
  Promote failure-layer classification into a first-class controller signal.
- Modify: `scripts/lib/runtime-best-attempt.mjs`
  Ensure best-attempt selection respects capability-driven rebuilds and avoids later degraded snapshots.
- Modify: `scripts/run-dynamic-custom-smoke.ts`
  Add a focused smoke subset for chest-wrap capability validation.
- Modify: `package.json`
  Register new regression scripts.
- Create: `scripts/check-runtime-capability-routing.ts`
  Offline regression for capability resolution and compiler entry.
- Create: `scripts/check-chest-wrap-host-fit.ts`
  Offline regression for chest-wrap design contract, host-fit, and front-readable expectations.
- Create: `scripts/check-runtime-failure-layer-controller.ts`
  Offline regression for refine-controller escalation and rebuild decisions.
- Modify: `scripts/check-runtime-stop-diagnostics.ts`
  Expand diagnostics expectations to cover failure-layer escalation.
- Modify: `scripts/check-runtime-best-attempt.ts`
  Expand snapshot preference coverage for rebuild-aware refinement behavior.
- Modify: `README.md`
  Document the capability-driven runtime boundary and acceptance commands.
- Modify: `docs/alpha-human-acceptance.md`
  Add human acceptance checks for host-coupled chest accessories.

## Guardrails

- Do not reopen semantic/parser/provider routing unless new evidence proves they are broken.
- Do not pass scarf by weakening `qualityGate`, `precisionGate`, or visual veto logic.
- Do not add scarf-only offsets or geometry hacks unless they generalize into `host-coupled chest-wrap`.
- Do not make LLM the raw geometry executor; keep final solve deterministic.
- Do not broaden this plan into frontend work or provider switching.

### Task 1: Introduce Capability Bundles As The Runtime Entry Contract

**Files:**
- Create: `src/types/runtime-capabilities.ts`
- Create: `src/lib/runtime-capability-resolver.ts`
- Create: `scripts/check-runtime-capability-routing.ts`
- Modify: `src/lib/prototype-runtime-packs.ts`
- Modify: `src/lib/prompt-customization.ts`
- Modify: `src/lib/generation-types.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing capability-routing regression**

Create `scripts/check-runtime-capability-routing.ts` with cases such as:

```ts
expect(resolveRuntimeCapabilities({
  prototypeId: "scarf",
  traits: ["soft", "chest-safe"],
  anchor: "chest-center",
})).toEqual([
  "host-coupled",
  "chest-wrap",
  "soft-body",
  "front-readable",
  "dual-tail",
  "face-safe",
]);
```

Also assert that runtime task seeds surface capability metadata before legacy family fallback.

- [ ] **Step 2: Run the regression to verify the current gap**

Run: `tsx scripts/check-runtime-capability-routing.ts`  
Expected: FAIL because runtime tasks do not yet expose capability bundles.

- [ ] **Step 3: Add the capability types**

Create `src/types/runtime-capabilities.ts` with:

- `RuntimeCapability`
- `RuntimeCapabilityBundle`
- `RuntimeDesignContract`
- `RuntimeFailureLayer`
- `RuntimeRebuildDirective`

Keep the first bundle small and explicit. Start with only the capabilities needed for the current mainline.

- [ ] **Step 4: Implement capability resolution**

In `src/lib/runtime-capability-resolver.ts`, resolve capabilities from:

- prototype id
- traits
- resolved anchor/layout context
- runtime shape class only as compatibility metadata

Do not read raw noun strings here except as a last-resort fallback.

- [ ] **Step 5: Bind the resolver into runtime task construction**

In `src/lib/prompt-customization.ts` and `src/lib/generation-types.ts`:

- attach the capability bundle to runtime design tasks
- expose it to geometry recipe / part graph generation
- keep legacy family/runtimeShapeClass fallback for already-working paths

- [ ] **Step 6: Re-run focused regressions**

Run:

- `tsx scripts/check-runtime-capability-routing.ts`
- `npm run dynamic-custom:runtime-bridge`
- `npm run dynamic-custom:planner-topology-guard`

Expected:

- new capability regression passes
- existing bridge/topology regressions remain green
- scarf still routes to the same upstream runtime shape, but through a richer execution contract

- [ ] **Step 7: Commit**

```bash
git add src/types/runtime-capabilities.ts src/lib/runtime-capability-resolver.ts src/lib/prototype-runtime-packs.ts src/lib/prompt-customization.ts src/lib/generation-types.ts scripts/check-runtime-capability-routing.ts package.json
git commit -m "refactor: add capability-driven runtime entry contract"
```

### Task 2: Implement Host-Conditioned Chest-Wrap Design Contracts

**Files:**
- Create: `src/lib/runtime-design-contracts.ts`
- Create: `scripts/check-chest-wrap-host-fit.ts`
- Modify: `src/lib/prompt-customization.ts`
- Modify: `scripts/blender-mcp-worker.mjs`
- Modify: `scripts/lib/runtime-visual-critique.mjs`
- Modify: `scripts/run-dynamic-custom-smoke.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing chest-wrap regression**

Create `scripts/check-chest-wrap-host-fit.ts` to assert the `host-coupled + chest-wrap` bundle produces a design contract with:

- `frontFirstRead = "scarf"` or equivalent first-read target
- required visible parts `wrap-band`, `knot`, `tail-left`, `tail-right`
- protected host zones including face/eye outline exclusion
- tail emergence from knot, not from detached chest blocks

- [ ] **Step 2: Run the regression to capture current failure**

Run: `tsx scripts/check-chest-wrap-host-fit.ts`  
Expected: FAIL because chest-wrap design intent is not yet modeled as a capability-level contract.

- [ ] **Step 3: Add the chest-wrap design contract**

In `src/lib/runtime-design-contracts.ts`, define a reusable contract for `host-coupled chest-wrap` including:

- front-view readability targets
- host no-go zones
- required visible parts
- composition envelope on the chest
- tail emergence rule from knot/root

Keep the contract capability-based so future chest-wrap nouns can share it.

- [ ] **Step 4: Use the design contract during task/geometry construction**

In `src/lib/prompt-customization.ts`:

- annotate scarf runtime tasks with the chest-wrap design contract
- align attachment rules and silhouette blocks with the new contract
- avoid adding scarf-only branches that bypass the capability layer

- [ ] **Step 5: Use the contract in host-fit and critique**

In `scripts/blender-mcp-worker.mjs` and `scripts/lib/runtime-visual-critique.mjs`:

- drive placement/host-fit from the chest-wrap contract
- preserve front-view readability and required-visible-part constraints
- treat face intrusion and unreadable chest bars as contract violations, not minor polish

- [ ] **Step 6: Re-run regressions and focused smoke**

Run:

- `tsx scripts/check-chest-wrap-host-fit.ts`
- `npm run dynamic-custom:mount-face-coverage`
- `npm run dynamic-custom:stop-diagnostics`
- `BLENDER_MCP_SERVER_URL=http://127.0.0.1:8010 PROMPTPET_SMOKE_ONLY=phase12-chest-wrap npm run dynamic-custom:smoke`

Expected:

- new chest-wrap regression passes
- mount-face coverage stays green
- targeted smoke now fails, if at all, for a narrower residual reason than the current unreadable black-bar shape

- [ ] **Step 7: Commit**

```bash
git add src/lib/runtime-design-contracts.ts src/lib/prompt-customization.ts scripts/blender-mcp-worker.mjs scripts/lib/runtime-visual-critique.mjs scripts/check-chest-wrap-host-fit.ts scripts/run-dynamic-custom-smoke.ts package.json
git commit -m "feat: add host-conditioned chest-wrap execution contract"
```

### Task 3: Upgrade Refinement Into A Failure-Layer Controller

**Files:**
- Create: `scripts/check-runtime-failure-layer-controller.ts`
- Modify: `scripts/blender-mcp-worker.mjs`
- Modify: `scripts/lib/runtime-stop-diagnostics.mjs`
- Modify: `scripts/lib/runtime-best-attempt.mjs`
- Modify: `scripts/check-runtime-stop-diagnostics.ts`
- Modify: `scripts/check-runtime-best-attempt.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing refinement-controller regression**

Create `scripts/check-runtime-failure-layer-controller.ts` with cases like:

- repeated silhouette failure should escalate to geometry-contract rebuild
- repeated host-fit failure should re-run placement/visibility solve
- late degraded snapshots must not override an earlier more complete result

- [ ] **Step 2: Run the regression to confirm current controller weakness**

Run: `tsx scripts/check-runtime-failure-layer-controller.ts`  
Expected: FAIL because the current refine loop does not separate failure layers strongly enough.

- [ ] **Step 3: Promote failure layers into the controller contract**

In `scripts/lib/runtime-stop-diagnostics.mjs`, define and normalize:

- `silhouette`
- `host-fit`
- `assembly`
- `topology`
- `composition`
- `stagnation`

Map each layer to a rebuild directive or micro-tune directive.

- [ ] **Step 4: Wire failure-layer actions into the worker**

In `scripts/blender-mcp-worker.mjs`:

- use failure layer classification to choose the next repair action
- prevent repeated local nudges when the failure clearly requires rebuild/escalation
- mark repeated same-layer failures as stagnation and escalate

- [ ] **Step 5: Re-baseline best-attempt selection**

In `scripts/lib/runtime-best-attempt.mjs` and `scripts/check-runtime-best-attempt.ts`:

- ensure later degraded passes do not replace an earlier stronger scaffold
- ensure rebuild-aware passes can still supersede earlier weak attempts when they truly improve critical parts

- [ ] **Step 6: Re-run controller regressions**

Run:

- `tsx scripts/check-runtime-failure-layer-controller.ts`
- `npm run dynamic-custom:stop-diagnostics`
- `tsx scripts/check-runtime-best-attempt.ts`

Expected:

- controller regression passes
- stop diagnostics exposes the right failure layer and rebuild directive
- best-attempt logic remains stable under capability-driven refinement

- [ ] **Step 7: Commit**

```bash
git add scripts/check-runtime-failure-layer-controller.ts scripts/blender-mcp-worker.mjs scripts/lib/runtime-stop-diagnostics.mjs scripts/lib/runtime-best-attempt.mjs scripts/check-runtime-stop-diagnostics.ts scripts/check-runtime-best-attempt.ts package.json
git commit -m "refactor: drive refinement from failure-layer escalation"
```

### Task 4: Run Acceptance Sweep And Document The New Mainline

**Files:**
- Create: `src/data/runtime-capability-heldout.json`
- Create: `scripts/check-runtime-capability-sweep.ts`
- Modify: `scripts/run-dynamic-custom-smoke.ts`
- Modify: `README.md`
- Modify: `docs/alpha-human-acceptance.md`
- Modify: `package.json`

- [ ] **Step 1: Add an adjacent capability sweep corpus**

Create `src/data/runtime-capability-heldout.json` with prompts covering:

- scarf / small scarf
- neckerchief / chest ribbon with dual tails
- one adjacent chest-front soft accessory
- control cases that should stay on ear-side or rigid charm paths

The goal is to verify capability reuse, not lexical memorization.

- [ ] **Step 2: Add the sweep harness**

Create `scripts/check-runtime-capability-sweep.ts` to assert:

- expected capability bundle selection
- expected design contract family
- no regression for known rigid and ear-side cases

- [ ] **Step 3: Run the acceptance suite**

Run:

- `npm run typecheck`
- `npm run dynamic-custom:runtime-bridge`
- `npm run dynamic-custom:planner-topology-guard`
- `npm run dynamic-custom:mount-face-coverage`
- `npm run dynamic-custom:stop-diagnostics`
- `tsx scripts/check-runtime-capability-routing.ts`
- `tsx scripts/check-chest-wrap-host-fit.ts`
- `tsx scripts/check-runtime-failure-layer-controller.ts`
- `tsx scripts/check-runtime-capability-sweep.ts`
- `BLENDER_MCP_SERVER_URL=http://127.0.0.1:8010 PROMPTPET_SMOKE_ONLY=phase12-chest-wrap npm run dynamic-custom:smoke`

Expected:

- all offline regressions pass
- targeted smoke validates the new chest-wrap mainline
- failures, if any remain, are now residual implementation issues rather than the old black-bar root cause

- [ ] **Step 4: Update operator docs**

Document in `README.md` and `docs/alpha-human-acceptance.md`:

- the capability-driven runtime boundary
- which checks prove upstream semantic routing is not the blocker
- how to run chest-wrap acceptance
- what still remains in legacy fallback

- [ ] **Step 5: Commit**

```bash
git add src/data/runtime-capability-heldout.json scripts/check-runtime-capability-sweep.ts scripts/run-dynamic-custom-smoke.ts README.md docs/alpha-human-acceptance.md package.json
git commit -m "docs: rebaseline runtime acceptance around capability execution"
```

## Recommended Execution Order

1. Task 1 first
2. Task 2 second
3. Task 3 third
4. Task 4 last

## Why This Order

- Task 1 prevents the rest of the work from collapsing back into noun/family patching.
- Task 2 turns scarf into the first reusable capability sample instead of the next special case.
- Task 3 stops the refine loop from repeating the same local repair behavior after capability work lands.
- Task 4 re-baselines verification around the new mainline and prevents regression drift.

## Execution Notes

- Use scarf as the first acceptance sample, but evaluate success at the capability level.
- Keep adjacent prompts close enough to reuse the same capability, but different enough to reveal overfitting.
- If Task 2 cannot pass without a scarf-only branch, stop and revisit the capability contract before continuing.

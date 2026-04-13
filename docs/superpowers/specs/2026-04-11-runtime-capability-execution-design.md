# Runtime Capability Execution Mainline Design

## Task Brief

### Goal

Refactor the runtime execution mainline so host-coupled accessories are driven by reusable capability bundles instead of noun-specific or family-first geometry branches, using chest-wrap/scarf as the first acceptance sample.

### Context

- The semantic and prototype bridge is already landing the right concept for scarf-like prompts.
- Current evidence shows `scarf -> runtimeShapeClass=scarf -> canon-scarf-chest -> scarf-wrap-forward` is working, so the mainline semantic/parser path is not the active blocker.
- The latest real scarf generation still stops at `partial-approximation` and reads visually as a black chest bar plus two tail slabs instead of a readable scarf.
- Existing offline regressions already pass for the upstream chain:
  - `npm run dynamic-custom:runtime-bridge`
  - `npm run dynamic-custom:planner-topology-guard`
  - `npm run dynamic-custom:mount-face-coverage`
- Current failure is concentrated in the runtime worker/compiler layer:
  - geometry contract only guarantees parts exist
  - host-fit/placement is still too template-driven
  - refine loop is still too micro-tune-oriented

### Constraints

- Do not reopen the parser / prototype retrieval / semantic routing mainline.
- Do not weaken quality, precision, or visual acceptance gates just to make scarf pass.
- Do not solve this by adding more noun-specific one-off patches.
- Keep Blender MCP transport unchanged unless new evidence shows transport failure.
- Preserve current runtime bridge behavior for already-working ear-side and rigid charm cases.

### Non-goals

- Frontend redesign or UI work
- Provider switching or LLM configuration UI work
- Large-scale lexical expansion for many new nouns
- Replacing deterministic geometry solving with raw LLM coordinates
- Rewriting the entire Blender worker in one pass

### Done When

- Runtime planning/compiler can consume a capability bundle before legacy family fallback.
- A reusable `host-coupled chest-wrap` execution path exists and is not implemented as a scarf-only special case.
- The refine controller can classify failures by layer and choose between micro-tuning and rebuild/escalation.
- New regressions cover capability routing, chest-wrap host-fit, and failure-layer-aware refinement.
- Targeted scarf validation no longer fails for the same root reason of unreadable front silhouette plus face intrusion.

### Verification

Technical checks:

- `npm run typecheck`
- `npm run dynamic-custom:runtime-bridge`
- `npm run dynamic-custom:planner-topology-guard`
- `npm run dynamic-custom:mount-face-coverage`
- new capability-routing regression
- new chest-wrap host-fit regression
- new failure-layer controller regression

Behavior checks:

- Targeted chest-wrap smoke run in Blender
- One real or smoke scarf sample should progress beyond the current "black bar + two tails" visual read
- At least one adjacent host-coupled chest prompt should reuse the same capability path

Requirement checks:

- No parser/mainline rollback to family-first
- No gate weakening
- Capability abstraction, not noun patching, is the primary implementation boundary

### Assumptions

- `scarf` is the first clear acceptance sample, but the actual abstraction target is the broader host-coupled chest-wrap family.
- Existing runtime packs, prototype descriptors, and stop-diagnostics infrastructure are stable enough to serve as migration anchors.
- The current repository can accept new regression scripts and new runtime capability metadata without UI changes.

## Problem Statement

The current workflow is asymmetric.

- Upstream semantics are already high-density: noun, prototype, traits, negative lookalikes, anchor intent.
- Downstream execution is still lower-density: family/routing keys, static offsets, broad geometry heuristics, and a refine loop that mostly nudges local numbers.

This mismatch creates a predictable failure mode for host-coupled accessories:

- the system knows what the object is
- the system can list its parts
- but the system still cannot reliably make the object readable on the fox host

The scarf result is the clearest example, but the real gap is the capability class, not the noun.

## Proposed Architecture

### 1. Semantic Contract Stays Rich

Keep the current semantic contract as the authoritative upstream description:

- requested noun
- prototype candidates
- traits
- negative lookalikes
- anchor/layout intent

Do not collapse this too early into family-specific execution.

### 2. Capability Bundle Becomes The Runtime Entry Point

Insert a new execution layer that resolves runtime capability bundles from prototype + traits + anchor context.

Examples for scarf-like prompts:

- `host-coupled`
- `chest-wrap`
- `soft-body`
- `front-readable`
- `dual-tail`
- `face-safe`

Execution should consume this bundle first and only fall back to legacy family behavior when capability resolution is unavailable.

### 3. Host-Conditioned Design Contract

Add a runtime design contract for capability classes that need the host to read correctly.

For chest-wrap this contract should explicitly define:

- front-view first read target
- required visible parts
- host no-go zones
- knot/tail emergence rules
- acceptable composition envelope on the chest

The key change is that host-fit participates in the design itself rather than acting as a late placement patch.

### 4. Deterministic Solver Remains The Geometry Executor

The project should increase LLM weight in design and failure interpretation, not in raw geometry coordinates.

Recommended split:

- LLM: capability selection, design briefing, failure interpretation, next-pass strategy
- deterministic solver: transforms, host-fit solve, visibility budget, collision/placement, final execution

### 5. Failure-Layer-Aware Refine Controller

The refine loop needs a stronger controller that distinguishes:

- silhouette failure
- host-fit failure
- assembly failure
- topology failure
- composition failure
- stagnation

Each layer should map to a different next action:

- micro-tune
- re-run placement/visibility solve
- rebuild assembly relation
- rebuild geometry contract
- escalate capability strategy

## Approved Phase Order

### Phase 1: Capability Entry Refactor

Move the execution entry point from family-first routing toward prototype/traits/capability bundles while preserving legacy fallback.

### Phase 2: Chest-Wrap Capability Sample

Implement host-conditioned chest-wrap as the first reusable capability sample, with scarf as the first acceptance case.

### Phase 3: Failure-Layer Refine Upgrade

Upgrade the refine controller so repeated execution failures escalate at the correct layer instead of repeating narrow local tuning.

## Risks To Watch

- Accidentally reintroducing family-first logic under a new name
- Solving scarf with another scarf-only branch instead of a reusable capability
- Allowing critique/controller changes to hide the problem rather than expose it
- Overusing LLM for low-level geometry tasks that should remain deterministic
- Growing the implementation into a broad rewrite instead of a narrow mainline migration

## Success Criteria Summary

This work is successful when the runtime execution stack becomes more capability-driven, more host-aware, and more failure-layer-aware, and when scarf stops being a special bug to patch and instead becomes the first proof that host-coupled chest accessories can be executed through a reusable path.

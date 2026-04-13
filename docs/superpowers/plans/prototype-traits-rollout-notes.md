# Prototype Traits Rollout Notes

## Current Boundary

- `prototypeCandidates + traits + retrievalMatches` are now the primary semantic middle layer for open-noun runtime design.
- `family` is still present, but it should be treated as compatibility metadata and a compiler hint rather than the main design contract.
- Current geometry/compiler precedence is:
  1. reference-driven or prototype-specific geometry
  2. trait-driven generic fallback geometry
  3. legacy family routing

## What Is Already Landed

- semantic contract types and parser wiring
- prototype catalog and retrieval matching
- runtime task hydration from retrieval matches
- trait-driven generic fallback geometry for:
  - `open-top`
  - `has-handle`
  - `flat-face`
- offline regression coverage:
  - `npm run dynamic-custom:traits-regression`
  - `npm run dynamic-custom:traits-heldout`
  - `PATH="/tmp/codex-no-security:$PATH" npm run dynamic-custom:regression`

## Rollout Flag Strategy

These flags describe the intended rollout contract. They are rollout notes, not a claim that every flag is already fully wired in runtime today.

- `PROMPTPET_ENABLE_PROTOTYPE_TRAITS=1`
  - Intended meaning: allow semantic contracts to prefer `prototypeCandidates + traits` over legacy family-only routing.
- `PROMPTPET_ENABLE_LEGACY_FAMILY_FALLBACK=1`
  - Intended meaning: keep legacy family routing available as the final fallback so production traffic can degrade safely.

Recommended rollout posture:

- start with both flags logically enabled in local verification
- keep legacy fallback available while held-out and prompt-sweep coverage expands
- only consider stronger enforcement after held-out coverage and user acceptance both stay stable

## Rollback Path

Target rollback behavior once flags are fully wired:

- disable `PROMPTPET_ENABLE_PROTOTYPE_TRAITS`
- keep `PROMPTPET_ENABLE_LEGACY_FAMILY_FALLBACK=1`
- re-run the full regression suite before re-enabling traits mode

Honest current state:

- the semantic migration is already landed in code
- the proposed env flags above are documented rollout targets
- until every rollout toggle is fully wired, the practical rollback is release-level:
  - deploy the previous stable commit range
  - keep output schema and worker protocol unchanged
  - confirm `dynamic-custom` regressions still pass on the rollback revision

## Verification Gate

Use this command set before treating the rollout as stable:

```bash
npm run typecheck
npm run dynamic-custom:traits-regression
npm run dynamic-custom:traits-heldout
PATH="/tmp/codex-no-security:$PATH" npm run dynamic-custom:regression
```

## Residual Risks

- rollout flags are currently documented strategy, not fully-complete runtime switches
- held-out coverage is deterministic and useful, but still smaller than a true large random noun sweep
- adjacent noun support will continue to surface lexicon gaps such as `小艇`, so held-out updates should stay part of the normal migration loop

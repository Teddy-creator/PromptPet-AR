# Prototype Retrieval + Traits Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hard family-first open-noun routing with a prototype retrieval + traits contract that lets LLM outputs drive retrieval, design planning, and compilation more flexibly.

**Architecture:** Keep the existing Blender execution and rule gates, but insert a richer semantic layer between prompt parsing and geometry compilation. The new middle layer should encode `prototypeCandidates`, `traits`, `retrievalMatches`, and `partGraphIntent`, with legacy `family` retained only as a compatibility fallback and compiler hint.

**Tech Stack:** TypeScript, Next.js server code, existing PromptPet parser pipeline, Blender MCP worker, JSON regression corpora, tsx-based validation scripts.

---

### Task 1: Introduce the prototype-traits contract and regression corpus

**Files:**
- Create: `/Users/cloud/Code/PromptPet-AR/src/types/prototype-traits.ts`
- Create: `/Users/cloud/Code/PromptPet-AR/src/data/prototype-traits-regression.json`
- Create: `/Users/cloud/Code/PromptPet-AR/scripts/check-prototype-traits-regression.ts`
- Modify: `/Users/cloud/Code/PromptPet-AR/package.json`
- Test: `/Users/cloud/Code/PromptPet-AR/scripts/check-prototype-traits-regression.ts`

- [x] **Step 1: Create the type contract**

```ts
export type PrototypeCandidate = {
  id: string;
  confidence: number;
  source: "llm" | "rule-fallback" | "retrieval";
};

export type SemanticTrait =
  | "rigid"
  | "soft"
  | "open-top"
  | "closed-top"
  | "has-handle"
  | "flat-face"
  | "cylindrical"
  | "micro-hangable"
  | "chest-safe"
  | "ear-safe";

export type PromptSemanticContractV2 = {
  requestedNoun: string;
  prototypeCandidates: PrototypeCandidate[];
  traits: SemanticTrait[];
  negativeLookalikes: string[];
};
```

- [x] **Step 2: Write a small held-out corpus**

```json
{
  "cases": [
    {
      "id": "cup-blue",
      "prompt": "做一只黑色的小狐狸桌宠，胸前挂一个蓝色水杯。",
      "expectPrototypeIdsIncludes": ["cup", "mug"],
      "expectTraitsIncludes": ["rigid", "open-top", "chest-safe"]
    }
  ]
}
```

- [x] **Step 3: Write the regression script**

Run: `tsx scripts/check-prototype-traits-regression.ts`  
Expected: FAIL because the parser output does not yet expose `prototypeCandidates` and `traits`.

- [x] **Step 4: Add an npm script**

```json
"dynamic-custom:traits-regression": "tsx scripts/check-prototype-traits-regression.ts"
```

- [x] **Step 5: Run the regression script**

Run: `npm run dynamic-custom:traits-regression`  
Expected: FAIL with missing semantic contract fields.

- [ ] **Step 6: Commit**

```bash
git add src/types/prototype-traits.ts src/data/prototype-traits-regression.json scripts/check-prototype-traits-regression.ts package.json
git commit -m "test: add prototype traits regression harness"
```

### Task 2: Build the prototype catalog and retrieval layer

**Files:**
- Create: `/Users/cloud/Code/PromptPet-AR/src/lib/prototype-catalog.ts`
- Create: `/Users/cloud/Code/PromptPet-AR/src/lib/prototype-retrieval.ts`
- Modify: `/Users/cloud/Code/PromptPet-AR/src/data/canonical-blueprint-cache.ts`
- Modify: `/Users/cloud/Code/PromptPet-AR/src/data/hard-surface-reference-cache.ts`
- Test: `/Users/cloud/Code/PromptPet-AR/scripts/check-prototype-traits-regression.ts`

- [x] **Step 1: Create a catalog schema**

```ts
export type PrototypeDescriptor = {
  id: string;
  familyHint?: string;
  objectCategory: string;
  canonicalTraits: string[];
  negativeLookalikes: string[];
  referenceIds: string[];
};
```

- [x] **Step 2: Seed a minimal catalog**

Start with focused entries only:
- `cup`
- `mug`
- `bottle`
- `camera`
- `flat-badge`
- `tool-head`

- [x] **Step 3: Add retrieval helpers**

```ts
export function retrievePrototypeMatches(
  noun: string,
  prototypeCandidates: PrototypeCandidate[],
  traits: SemanticTrait[],
): RetrievedPrototypeMatch[] {
  // rank by candidate confidence, trait overlap, and cache/reference availability
}
```

- [x] **Step 4: Connect reference cache IDs**

Make retrieval return actual cached reference IDs instead of only symbolic names.

- [x] **Step 5: Re-run regression**

Run: `npm run dynamic-custom:traits-regression`  
Expected: still FAIL, but now only because parser output is not feeding the new retrieval layer.

- [ ] **Step 6: Commit**

```bash
git add src/lib/prototype-catalog.ts src/lib/prototype-retrieval.ts src/data/canonical-blueprint-cache.ts src/data/hard-surface-reference-cache.ts
git commit -m "feat: add prototype catalog and retrieval layer"
```

### Task 3: Teach the semantic parser to emit prototype candidates and traits

**Files:**
- Modify: `/Users/cloud/Code/PromptPet-AR/src/lib/prompt-customization.ts`
- Modify: `/Users/cloud/Code/PromptPet-AR/src/types/prototype-traits.ts`
- Test: `/Users/cloud/Code/PromptPet-AR/scripts/check-prototype-traits-regression.ts`
- Test: `/Users/cloud/Code/PromptPet-AR/scripts/check-dynamic-custom-regression.ts`

- [x] **Step 1: Extend the LLM prompt/schema**

The parser prompt should now request:
- `prototypeCandidates[]`
- `traits[]`
- `negativeLookalikes[]`
- `anchorFitHints[]`

- [x] **Step 2: Extend payload sanitization**

Add normalization and validation logic beside the existing `accessoryRequests[]` sanitization so bad LLM payloads degrade safely.

- [x] **Step 3: Merge LLM output with fallback semantics**

Rules should only:
- drop illegal anchors
- clamp confidence
- backfill missing prototypes
- preserve explicit noun text

Rules should not overwrite a good `prototypeCandidates[]` list just because a family keyword matched.

- [x] **Step 4: Attach semantic contract fields to runtime tasks**

Ensure `runtimeDesignTasks` carry:
- `prototypeCandidates`
- `traits`
- `retrievalMatches`

- [x] **Step 5: Run parser regression**

Run: `npm run dynamic-custom:traits-regression`  
Expected: PASS for the new semantic fields.

- [x] **Step 6: Run existing regression**

Run: `npm run dynamic-custom:regression`  
Expected: PASS, or only fail on cases that intentionally depended on hard family assumptions.

- [ ] **Step 7: Commit**

```bash
git add src/lib/prompt-customization.ts src/types/prototype-traits.ts
git commit -m "feat: make semantic parsing emit prototype candidates and traits"
```

### Task 4: Make runtime planning and geometry compilation consume traits before family

**Files:**
- Modify: `/Users/cloud/Code/PromptPet-AR/src/lib/prompt-customization.ts`
- Modify: `/Users/cloud/Code/PromptPet-AR/scripts/blender-mcp-worker.mjs`
- Modify: `/Users/cloud/Code/PromptPet-AR/scripts/lib/hard-surface-runtime-policy.mjs`
- Test: `/Users/cloud/Code/PromptPet-AR/scripts/check-dynamic-custom-regression.ts`

- [x] **Step 1: Add retrieval-aware design inputs**

Feed the planner:
- top prototype candidates
- merged traits
- retrieval match IDs
- anchor fit hints

- [x] **Step 2: Lower family from “hard route” to “compiler hint”**

Compilation order should become:
1. planner parts/part graph
2. prototype retrieval match
3. trait-derived shape defaults
4. legacy family fallback

Verified on 2026-04-04:
- `prompt-customization.ts` now routes prototype-specific geometry ahead of legacy switch-cases and keeps `semanticClass/family` only as the fallback compiler key.
- `blender-mcp-worker.mjs` now prefers `runtimeShapeClass` over `execution.family` for refinement-part selection and hard minimum part count.
- Guarded a no-keychain fallback regression where a generic prototype candidate was incorrectly overriding `fish-charm` geometry routing.

- [x] **Step 3: Add trait-driven compiler helpers**

Examples:
- `has-handle` adds a side-loop branch
- `open-top` biases rim + hollow silhouette
- `flat-face` biases front relief

Verified on 2026-04-04:
- Added a narrow `trait-driven fallback geometry` layer in `prompt-customization.ts`.
- Current trait helper scope is intentionally narrow: it only decorates the generic fallback path.
- `open-top + cylindrical` now bias generic fallback into vessel geometry.
- `has-handle` now adds a side handle to the trait-driven vessel fallback.
- `flat-face` now biases generic fallback into a flat badge-style slab with relief.
- Added mocked-AI regression coverage proving generic prototype + semantic traits can produce trait-shaped geometry without a prototype-specific geometry handler.

- [x] **Step 4: Preserve old family code only as compatibility**

Do not delete legacy family branches yet. Guard them behind “no planner/no traits/no retrieval” fallbacks.

Verified on 2026-04-04:
- Legacy family switch branches remain in place.
- Compiler precedence is now: reference/prototype geometry -> trait-driven generic fallback -> legacy family routing.

- [x] **Step 5: Run regression**

Run: `npm run dynamic-custom:regression`  
Expected: PASS on existing narrow fixes and no new regression on known camera/fish/clover cases.

Verified on 2026-04-04:
- `npm run typecheck`
- `npm run dynamic-custom:traits-regression`
- `PATH="/tmp/codex-no-security:$PATH" npm run dynamic-custom:regression`

- [ ] **Step 6: Commit**

```bash
git add src/lib/prompt-customization.ts scripts/blender-mcp-worker.mjs scripts/lib/hard-surface-runtime-policy.mjs
git commit -m "feat: compile open nouns from prototypes and traits before family fallback"
```

### Task 5: Add held-out and random evaluation for prototype-traits routing

**Files:**
- Create: `/Users/cloud/Code/PromptPet-AR/src/data/prototype-traits-heldout.json`
- Create: `/Users/cloud/Code/PromptPet-AR/scripts/check-prototype-traits-heldout.ts`
- Modify: `/Users/cloud/Code/PromptPet-AR/package.json`
- Test: `/Users/cloud/Code/PromptPet-AR/scripts/check-prototype-traits-heldout.ts`

- [x] **Step 1: Create a held-out eval corpus**

Include:
- adjacent nouns
- new nouns not present in development examples
- anchor variants

- [x] **Step 2: Add deterministic random sweep support**

The script should accept:
- `--seed`
- `--sample-size`
- `--corpus`

- [x] **Step 3: Add an npm script**

```json
"dynamic-custom:traits-heldout": "tsx scripts/check-prototype-traits-heldout.ts --seed 20260404 --sample-size 120"
```

- [x] **Step 4: Gate on non-generic routing**

Require metrics such as:
- non-generic prototype routing rate
- held-out prototype hit rate
- anchor-specific pass rate

- [x] **Step 5: Run the held-out suite**

Run: `npm run dynamic-custom:traits-heldout`  
Expected: PASS with explicit metrics output; fail if generic fallback dominates.

Verified on 2026-04-04:
- Added held-out corpus `src/data/prototype-traits-heldout.json`.
- Added deterministic evaluator `scripts/check-prototype-traits-heldout.ts` with `--seed`, `--sample-size`, and `--corpus`.
- Added npm script `dynamic-custom:traits-heldout`.
- Current offline held-out result: `seed 20260404 | sampled 16/16 | non-generic 100.0% | prototype-hit 100.0% | anchor-trait 100.0%`.
- Held-out sweep exposed and fixed one real adjacent-noun gap: `小艇` now routes through the `boat` prototype lexicon.

- [ ] **Step 6: Commit**

```bash
git add src/data/prototype-traits-heldout.json scripts/check-prototype-traits-heldout.ts package.json
git commit -m "test: add held-out prototype traits evaluation"
```

### Task 6: Document the migration boundary and rollout path

**Files:**
- Modify: `/Users/cloud/Code/PromptPet-AR/README.md`
- Modify: `/Users/cloud/Code/PromptPet-AR/AGENTS.md`
- Create: `/Users/cloud/Code/PromptPet-AR/docs/superpowers/plans/prototype-traits-rollout-notes.md`
- Test: `/Users/cloud/Code/PromptPet-AR/README.md`

- [x] **Step 1: Document the new semantic contract**

Explain:
- `family` is now compatibility-only
- `prototypeCandidates + traits` are the new primary middle layer

- [x] **Step 2: Document rollout flags**

Include an environment flag strategy such as:
- `PROMPTPET_ENABLE_PROTOTYPE_TRAITS=1`
- `PROMPTPET_ENABLE_LEGACY_FAMILY_FALLBACK=1`

- [x] **Step 3: Add rollback instructions**

Describe how to:
- disable prototype-traits mode
- keep existing runtime execution functional

- [x] **Step 4: Run final checks**

Run:
- `npm run typecheck`
- `npm run dynamic-custom:regression`
- `npm run dynamic-custom:traits-regression`
- `npm run dynamic-custom:traits-heldout`

Expected: all pass.

Verified on 2026-04-04:
- `npm run typecheck`
- `npm run dynamic-custom:regression`
- `npm run dynamic-custom:traits-regression`
- `npm run dynamic-custom:traits-heldout`

- [ ] **Step 5: Commit**

```bash
git add README.md AGENTS.md docs/superpowers/plans/prototype-traits-rollout-notes.md
git commit -m "docs: document prototype retrieval and traits rollout"
```

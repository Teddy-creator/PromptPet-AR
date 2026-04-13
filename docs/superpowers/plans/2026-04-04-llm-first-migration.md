# LLM-First Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-architect PromptPet-AR so LLMs become the primary semantic, design, and vision decision-makers, while rules remain the execution, safety, and acceptance layer.

**Architecture:** Split the current single-provider and fallback-heavy flow into three task-specific model roles: semantic, design, and vision. Keep Blender, geometry compilation, host constraints, and quality gates deterministic, but move prompt interpretation and open-noun design reasoning into explicit LLM-first contracts.

**Tech Stack:** TypeScript, Next.js, tsx validation scripts, Blender MCP worker, JSON regression corpora, environment-variable based provider routing.

---

### Task 1: Split provider routing into semantic, design, and vision clients

**Files:**
- Create: `/Users/cloud/Code/PromptPet-AR/src/lib/llm/provider-routing.ts`
- Create: `/Users/cloud/Code/PromptPet-AR/src/lib/llm/provider-types.ts`
- Modify: `/Users/cloud/Code/PromptPet-AR/src/lib/prompt-customization.ts`
- Modify: `/Users/cloud/Code/PromptPet-AR/scripts/blender-mcp-worker.mjs`
- Modify: `/Users/cloud/Code/PromptPet-AR/package.json`
- Modify: `/Users/cloud/Code/PromptPet-AR/README.md`
- Test: `/Users/cloud/Code/PromptPet-AR/src/lib/llm/provider-routing.ts`

- [x] **Step 1: Introduce provider-role config types**

```ts
export type LlmRole = "semantic" | "design" | "vision";

export type LlmProviderConfig = {
  provider: "openai" | "deepseek" | "custom";
  apiKey: string;
  baseUrl: string;
  model: string;
};
```

- [x] **Step 2: Support role-specific env vars**

Add support for:
- `SEMANTIC_API_KEY`
- `SEMANTIC_BASE_URL`
- `SEMANTIC_MODEL`
- `DESIGN_*`
- `VISION_*`

Keep `LLM_*` as a shared fallback for all roles.

- [x] **Step 3: Make prompt parser read the semantic config**

Do not reuse the worker’s vision transport config here.

- [x] **Step 4: Make render critique read the vision config**

Do not assume the same provider as semantic or design.

- [x] **Step 5: Verify config resolution**

Run: `npm run typecheck`  
Expected: PASS with no type errors.

Verified on 2026-04-06:
- Added role-aware provider routing modules for app/server and worker contexts.
- `parsePromptCustomizationRecipe()` now resolves the `semantic` role config.
- runtime accessory design planner now resolves the `design` role config.
- Blender worker render critique now resolves the `vision` role config.
- Added `npm run llm:provider-routing:check`.
- Verified:
  - `npm run llm:provider-routing:check`
  - `npm run typecheck`
  - `npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/lib/llm/provider-routing.ts src/lib/llm/provider-types.ts src/lib/prompt-customization.ts scripts/blender-mcp-worker.mjs package.json README.md
git commit -m "feat: split llm provider routing by semantic design and vision roles"
```

### Task 2: Make semantic parsing LLM-first and fallback-lite

**Files:**
- Modify: `/Users/cloud/Code/PromptPet-AR/src/lib/prompt-customization.ts`
- Modify: `/Users/cloud/Code/PromptPet-AR/src/data/dynamic-custom-regression.json`
- Create: `/Users/cloud/Code/PromptPet-AR/src/data/semantic-heldout.json`
- Create: `/Users/cloud/Code/PromptPet-AR/scripts/check-semantic-heldout.ts`
- Test: `/Users/cloud/Code/PromptPet-AR/scripts/check-semantic-heldout.ts`

- [ ] **Step 1: Change parser priority**

Refactor `parsePromptCustomizationRecipe()` so the semantic LLM output is considered primary for dynamic-custom prompts.

- [ ] **Step 2: Keep fallback only for these cases**

Fallback should only:
- preserve explicit noun text
- rescue anchors/colors when the LLM omits them
- provide a safety recipe when the provider is unavailable

- [ ] **Step 3: Add semantic held-out prompts**

Use prompts that were not used to shape the migration.

- [ ] **Step 4: Add metrics to the semantic check**

Require reporting for:
- non-generic route rate
- explicit noun preservation rate
- anchor preservation rate

- [ ] **Step 5: Run semantic held-out**

Run: `tsx scripts/check-semantic-heldout.ts`  
Expected: PASS with metrics output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/prompt-customization.ts src/data/dynamic-custom-regression.json src/data/semantic-heldout.json scripts/check-semantic-heldout.ts
git commit -m "feat: make semantic parsing llm-first for dynamic custom prompts"
```

### Task 3: Execute the prototype retrieval + traits subsystem migration

**Files:**
- Modify: `/Users/cloud/Code/PromptPet-AR/src/lib/prompt-customization.ts`
- Modify: `/Users/cloud/Code/PromptPet-AR/scripts/blender-mcp-worker.mjs`
- Create: `/Users/cloud/Code/PromptPet-AR/src/lib/prototype-catalog.ts`
- Create: `/Users/cloud/Code/PromptPet-AR/src/lib/prototype-retrieval.ts`
- Create: `/Users/cloud/Code/PromptPet-AR/src/types/prototype-traits.ts`
- Test: `/Users/cloud/Code/PromptPet-AR/docs/superpowers/plans/2026-04-04-prototype-retrieval-traits-migration.md`

- [ ] **Step 1: Follow the subsystem plan**

Implement the entire plan in:
- `/Users/cloud/Code/PromptPet-AR/docs/superpowers/plans/2026-04-04-prototype-retrieval-traits-migration.md`

- [ ] **Step 2: Re-run semantic + traits regression**

Run:
- `npm run dynamic-custom:traits-regression`
- `npm run dynamic-custom:traits-heldout`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/prompt-customization.ts scripts/blender-mcp-worker.mjs src/lib/prototype-catalog.ts src/lib/prototype-retrieval.ts src/types/prototype-traits.ts
git commit -m "feat: integrate prototype retrieval and traits into llm-first flow"
```

### Task 4: Make the design planner required for open-noun runtime generation

**Files:**
- Modify: `/Users/cloud/Code/PromptPet-AR/src/lib/prompt-customization.ts`
- Modify: `/Users/cloud/Code/PromptPet-AR/scripts/blender-mcp-worker.mjs`
- Modify: `/Users/cloud/Code/PromptPet-AR/scripts/lib/hard-surface-runtime-policy.mjs`
- Test: `/Users/cloud/Code/PromptPet-AR/scripts/run-dynamic-custom-smoke.ts`

- [ ] **Step 1: Gate open nouns through planner output**

For any open noun in `experimental-addon`, require a planner-produced design contract before treating it as implemented.

- [ ] **Step 2: Preserve explicit honest states**

If planner output is absent or malformed:
- keep the request visible
- mark it as approximate or unsupported
- do not silently collapse to a generic charm

- [ ] **Step 3: Add planner-source metadata**

Track:
- semantic provider source
- design planner source
- whether planner output was direct, merged, or fallback

- [ ] **Step 4: Run smoke**

Run: `npm run dynamic-custom:smoke`  
Expected: open-noun cases still export, and metadata clearly states whether planner-driven execution happened.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prompt-customization.ts scripts/blender-mcp-worker.mjs scripts/lib/hard-surface-runtime-policy.mjs
git commit -m "feat: require planner-backed contracts for open noun runtime generation"
```

### Task 5: Make vision critique a first-class replaceable subsystem

**Files:**
- Create: `/Users/cloud/Code/PromptPet-AR/src/lib/llm/vision-critique-contract.ts`
- Modify: `/Users/cloud/Code/PromptPet-AR/scripts/blender-mcp-worker.mjs`
- Modify: `/Users/cloud/Code/PromptPet-AR/scripts/lib/runtime-visual-critique.mjs`
- Modify: `/Users/cloud/Code/PromptPet-AR/README.md`
- Test: `/Users/cloud/Code/PromptPet-AR/scripts/blender-mcp-worker.mjs`

- [ ] **Step 1: Define a unified critique payload**

The vision model must consume:
- requested noun
- anchor context
- front / 3-4 / side views
- expected silhouette goals

- [ ] **Step 2: Define a unified critique report**

Return:
- `firstRead`
- `nounFidelity`
- `lookalikeRisk`
- `hostIntrusion`
- `repairActions`

- [ ] **Step 3: Add graceful fallback**

If the vision provider is unavailable:
- fall back to local viewport critique
- preserve the failure note in metadata

- [ ] **Step 4: Update docs**

Document that the vision provider may differ from the semantic/design provider.

- [ ] **Step 5: Run verification**

Run:
- `npm run typecheck`
- one local smoke generation using the current default startup flow

Expected: metadata records the critique source cleanly.

- [ ] **Step 6: Commit**

```bash
git add src/lib/llm/vision-critique-contract.ts scripts/blender-mcp-worker.mjs scripts/lib/runtime-visual-critique.mjs README.md
git commit -m "feat: make vision critique provider pluggable"
```

### Task 6: Surface llm-first telemetry in metadata and UI

**Files:**
- Modify: `/Users/cloud/Code/PromptPet-AR/src/lib/prompt-customization.ts`
- Modify: `/Users/cloud/Code/PromptPet-AR/src/components/result-experience.tsx`
- Modify: `/Users/cloud/Code/PromptPet-AR/src/components/share-experience.tsx`
- Modify: `/Users/cloud/Code/PromptPet-AR/src/components/home-experience.tsx`
- Test: `/Users/cloud/Code/PromptPet-AR/src/components/result-experience.tsx`

- [ ] **Step 1: Extend customization summary fields**

Add:
- semantic source
- design source
- vision source
- prototype routing summary
- trait summary

- [ ] **Step 2: Update result UI**

Show honest pipeline state such as:
- “semantic: DeepSeek”
- “design: GPT vision planner”
- “vision critique: viewport fallback”

- [ ] **Step 3: Avoid noisy UX**

Show compact labels in the UI, keep detailed traces in metadata only.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prompt-customization.ts src/components/result-experience.tsx src/components/share-experience.tsx src/components/home-experience.tsx
git commit -m "feat: expose llm-first pipeline telemetry in metadata and ui"
```

### Task 7: Build the anti-overfitting rollout gate

**Files:**
- Create: `/Users/cloud/Code/PromptPet-AR/src/data/llm-first-heldout.json`
- Create: `/Users/cloud/Code/PromptPet-AR/scripts/check-llm-first-rollout.ts`
- Modify: `/Users/cloud/Code/PromptPet-AR/package.json`
- Modify: `/Users/cloud/Code/PromptPet-AR/README.md`
- Test: `/Users/cloud/Code/PromptPet-AR/scripts/check-llm-first-rollout.ts`

- [ ] **Step 1: Define rollout metrics**

Track:
- non-generic routing rate
- planner-backed open-noun rate
- honest-unsupported rate
- false-pass rate

- [ ] **Step 2: Add a rollout script**

```json
"dynamic-custom:llm-first-rollout": "tsx scripts/check-llm-first-rollout.ts --seed 20260404 --sample-size 150"
```

- [ ] **Step 3: Fail rollout if metrics regress**

Do not allow feature enablement if:
- generic fallback rises
- held-out routing drops
- false-pass rises

- [ ] **Step 4: Run the rollout suite**

Run:
- `npm run dynamic-custom:regression`
- `npm run dynamic-custom:traits-heldout`
- `npm run dynamic-custom:llm-first-rollout`

Expected: all pass with metric output.

- [ ] **Step 5: Commit**

```bash
git add src/data/llm-first-heldout.json scripts/check-llm-first-rollout.ts package.json README.md
git commit -m "test: add llm-first rollout gate and held-out metrics"
```

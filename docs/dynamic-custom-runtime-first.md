# PromptPet-AR Dynamic Custom Runtime-First v2

## Purpose

- Keep `fox-base-v10` as the fixed golden mother asset.
- Keep public API and routes unchanged:
  - `POST /api/generations`
  - `GET /api/generations/[id]`
  - `/result/[id]`
  - `/share/[id]`
- Keep `fast-stable` as the polished showcase path.
- Make `dynamic-custom + experimental-addon` behave like bounded runtime-first local creation on top of the fixed fox body.
- Unknown accessories must no longer disappear just because there is no prebuilt library asset.

## Homepage Choices

### 1. `风格模板`

- `cream-toy`
  - Soft toy / resin / dessert-like material language.
- `low-poly`
  - Cleaner geometric material language.
- `dream-glow`
  - Dreamy night-light / glow material language.

Rule:

- Style changes material language and base mood.
- Style must not override explicit user-requested accessory shape, anchor, or color.

### 2. `生成模式`

- `fast-stable`
  - Product-grade fox showcase path.
  - Uses the polished fox mother asset plus controlled variants.
- `dynamic-custom`
  - Prompt-fulfillment path.
  - Parses natural language into structured semantics, runtime design tasks, and execution facts.

Rule:

- `fast-stable` is quality-first.
- `dynamic-custom` is prompt-first within a fixed fox body boundary.

### 3. `动态档位`

- `safe-overlay`
  - Safe colors, materials, glow, stable swaps, and honest approximations only.
  - No runtime creation of unfamiliar new shapes.
- `experimental-addon`
  - Runtime-first local creation path.
  - Explicit accessory requests should become runtime design tasks first.
  - Stable library objects are reference/fallback only and must not pretend to be live creation.

Rule:

- `experimental-addon` may be slower and more volatile.
- It must not change fox core body, head-body proportion, or species silhouette.

## Runtime-First Contract

`dynamic-custom` now uses four layers:

1. `parsedIntent`
2. `normalizedSemanticRecipe`
3. `runtimeDesignTasks`
4. `resolvedExecutionPlan`

It also materializes two formal blocks:

- `bodyCustomization`
- `accessoryCustomization`

### `bodyCustomization`

Controls:

- primary fox body color
- secondary fox body/detail color
- accent color
- glow color
- dual-tone / gradient intent

Rule:

- Body color semantics are independent from accessory color semantics.
- Prompts like `红绿色配色` must not collapse to a single color if the parser can preserve both.

### `accessoryCustomization`

Controls:

- accessory policy
- explicit accessory requests
- runtime design tasks
- geometry recipes

Rule:

- A prompt like `紫色草莓挂饰 + 蓝色小鱼挂饰` must remain two explicit requests.
- It must not collapse to “one theme + one accessory”.

## Fixed Precedence

Always resolve in this order:

1. Explicit user negations
2. Explicit user exceptions
3. Explicit user accessory requests
4. Explicit local accessory colors
5. Theme defaults
6. Style defaults

Examples:

- `不要任何配饰，除了左耳一个绿色小鱼挂饰`
  - Remove theme defaults first.
  - Keep only the explicit fish request.
- `夜灯主题，大红色主体，紫色耳环`
  - Keep night-light mood.
  - Override fox body with red.
  - Keep the earring purple without leaking into fox body.

## Runtime Design Tasks

Every explicit unfamiliar accessory request in `experimental-addon` must first become a `runtimeDesignTask`.

Each task keeps:

- `requestLabel`
- `semanticClass`
- `shapeDescription`
- `anchor`
- `instanceCount`
- `requestedColor`
- `styleHints`
- `silhouetteHints`
- `mustKeep`
- `allowApproximation`
- `runtimeDesignSource`

Hard rule:

- An explicit accessory request must not silently disappear into `unsupportedNotes`.
- If it cannot be executed, it still must remain visible in task truth and page truth.

## Geometry Recipes

`experimental-addon` uses an `AccessoryGeometryRecipe` layer instead of a pure family lookup.

Each geometry recipe defines:

- `parts`
- `basePrimitives`
- `profileCurves`
- `symmetry`
- `anchorOffsets`
- `orientationRules`
- `sizeBounds`
- `silhouetteChecks`
- `fallbackFamily`

Current runtime-first geometry targets:

- `fish-charm`
- `berry-charm`
- `cloud-charm`
- `leaf`
- `forest`
- `mushroom`
- `star`
- `bell`
- `bow`
- `tie`
- `necklace-chain`
- `earring-hoop`
- `pendant-charm`
- `dessert`
- `dessert-hang`
- `candy`
- `generic-animal-charm`
- `generic-food-charm`
- `generic-ornament`

Rule:

- The stable library is not the primary implementation path for unfamiliar accessories.
- It can only serve as reference or last-resort approximation.

## Optional AI Planning Layer

There are now two OpenAI-assisted stages when credentials are available:

1. Prompt semantic parsing
2. Accessory design planning

The second call does not generate the final model directly.

It only outputs strict JSON that may refine:

- semantic class
- silhouette hints
- profile curves
- fallback family
- primitive parts

Rule:

- Worker executes JSON geometry recipes.
- Worker must not re-guess the prompt from scratch.
- If OpenAI planning is unavailable, rule-compiled geometry recipes remain the fallback and explicit requests still stay visible.

## Runtime Attempt Budget

- `experimental-addon` uses a runtime attempt budget of `3-5 分钟`.
- This is an attempt budget, not a forced wait timer.
- If key explicit accessories are still missing or only partially created, worker should keep retrying within budget.
- If budget runs out, export still proceeds, but the final page must mark the request as `近似实现` or `未实现`.

## Truth Binding

`task.json`, `metadata.customizationSummary`, result page, and share page must describe the same execution facts.

Each accessory fulfillment row must expose:

- requested label
- requested anchor
- requested shape
- requested semantic class
- requested color
- actual label
- actual anchor
- actual shape
- actual color
- `creationSource`
- `runtimeDesignSource`
- `geometryRecipeId`
- `executionStatus`
- `approximationReason`
- `failureReason`

Allowed `creationSource` values:

- `runtime-designed`
- `runtime-generated`
- `runtime-repaired`
- `runtime-composed`
- `stable-reuse`
- `stable-reference-only`
- `approximate-fallback`
- `unfulfilled`

Hard rule:

- If the page says something was implemented or approximated, there must be a matching executed instance and a matching visible result.

## Verification

### Automated

Must pass:

- `npm run dynamic-custom:regression`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

`npm run dynamic-custom:smoke` remains required when a local app server and worker are available.

### Golden Runtime Cases

These prompts must stay in the automated corpus:

1. `做一只小狐狸桌宠，红绿色配色，胸前挂一个紫色的草莓挂饰，左耳朵挂一个蓝色的小鱼挂饰。`
2. `做一只小狐狸桌宠，主体是荧光绿，右耳一个银色耳环，胸前一个黑色云朵挂饰。`
3. `不要任何配饰，除了左耳一个绿色小鱼挂饰。`

### Manual Random Review

- Use [`src/data/dynamic-custom-manual-review.json`](/Users/cloud/Code/PromptPet-AR/src/data/dynamic-custom-manual-review.json)
- Keep at least `30` prompts.
- At least `15` must contain unfamiliar accessory words or looser natural language phrasing.
- When the user finds a new first-try failure, that prompt must move into regression or smoke on the next round.

### Page Truth

The final truth is:

- `/result/[id]`
- `/share/[id]`
- `thumbnail.png`
- `model-viewer`
- exported `model.glb`

Not enough:

- parser output alone
- scorecard text alone
- task.json alone

## Non-Negotiables

- `fox only`
- `Android first`
- no runtime modification of fox core body structure
- no silent fallback to theme defaults when the user made an explicit request
- no stable-library reuse masquerading as runtime creation
- no claiming success before the final rendered page matches the request

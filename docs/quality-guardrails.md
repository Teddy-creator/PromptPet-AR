# PromptPet-AR Quality Guardrails

## Purpose

- This is a living failure-memory document for PromptPet-AR.
- Its job is to prevent repeated mistakes in generation, verification, and user-facing claims.
- Future sessions must treat the final rendered result page, exported assets, and AR-visible output as the real source of truth, not just `task.json`, `metadata`, or parser output.

## Recent Mistakes We Must Not Repeat

### 1. Treating internal semantics as proof of success

- Mistake: A generation was considered "fixed" because `task.json`, `metadata`, and `executionScorecard` looked correct.
- Why this was wrong: The final result page still showed the wrong shape, wrong accessory placement, and wrong accessory colors.
- Rule: Never claim a generation issue is fixed until the exact reported prompt is checked on the final result page and the visible model matches the claim.

### 2. Confusing family matching with real visual fulfillment

- Mistake: Once a request resolved to `bow` or `bell`, it was treated as implemented.
- Why this was wrong: A family hit can still render as a crude placeholder or the wrong silhouette.
- Rule: "Resolved family" is not enough. Verification must confirm the visible shape is recognizably the requested thing.

### 3. Failing to verify accessory anchor placement

- Mistake: Accessory type was checked, but chest vs left-ear placement was not treated as a hard requirement.
- Why this was wrong: The system reused old stable accessory objects and produced the wrong anchor layout while still reporting success.
- Rule: Accessory verification must always include anchor position: `left-ear`, `right-ear`, `forehead`, or `chest`.

### 4. Failing to verify per-accessory color at final render time

- Mistake: Instance-level color intent was fixed in the contract layer, but final rendered output was not checked carefully enough.
- Why this was wrong: Two accessories could still collapse to one visible color in the exported result.
- Rule: For multi-accessory prompts, each accessory's final visible color must be checked independently on the actual rendered result.

### 5. Overstating what `experimental-addon` really did

- Mistake: Experimental mode was described as if it were truly doing dynamic generation, while some requests still quietly fell back to stable reused accessories.
- Why this was wrong: The user selected experimental behavior but received a fast reused result that did not really satisfy the prompt.
- Rule: Do not describe `experimental-addon` as "done" unless the execution path actually matches the advertised behavior for that request.

### 6. Letting stable reuse silently override explicit prompt intent

- Mistake: Requests like "胸前蝴蝶结" or "左耳铃铛" could still be satisfied by old stable accessory objects in their old assumptions.
- Why this was wrong: The system preserved old convenience logic instead of honoring explicit user placement and structure.
- Rule: If a prompt asks for a stable accessory on a non-default anchor, verification must ensure the request was not silently satisfied by the old default object path.

### 7. Building regressions around parser fields instead of rendered truth

- Mistake: Regression coverage focused on parser output, scorecards, and execution-plan text.
- Why this was wrong: A prompt could parse correctly while still rendering the wrong visible result.
- Rule: Parser regressions are necessary but not sufficient. High-value prompts must also be validated against final rendered outputs.

### 8. Reporting success before checking the exact user-reported case end-to-end

- Mistake: A nearby or similar prompt was used as evidence, then success was reported back to the user.
- Why this was wrong: The exact failing case remained broken.
- Rule: When the user reports a prompt failure, the exact prompt becomes the primary verification case and must pass before claiming a fix.

### 9. Not being strict enough about "implemented" vs "approximate"

- Mistake: Some results were described as implemented when they were only loosely approximated.
- Why this was wrong: It created false confidence and wasted user time during testing.
- Rule: If shape, anchor, color, or execution path is materially off, mark it as approximate or not fixed. Do not round it up to "implemented."

### 10. Not treating infra health as part of user-facing correctness

- Mistake: A missing watch worker left generations stuck in `queued`, but this was not surfaced quickly enough.
- Why this was wrong: The user experienced a broken product state even though some internal files were present.
- Rule: For any "stuck generating" report, verify dev server, MCP server, watch worker, and API status before analyzing higher-level semantics.

### 11. Letting accessory-only quality gates pass host-composition failures

- Mistake: Runtime quality checks focused on whether the accessory itself had enough parts, color, and local silhouette, but did not treat "too big on the fox", "covers the face", or "dominates the head" as blocking failures.
- Why this was wrong: `camera`, `boat`, and `fish` could all receive high internal scores while still looking obviously broken on the final result page.
- Rule: Runtime acceptance must include host-relative scale, host composition, and face-occlusion gates. Never treat accessory-local readability as sufficient proof of visible success.

### 12. Forgetting that the wrong worker backend invalidates verification

- Mistake: A restarted worker came back up in `mock-assets` mode, so generations no longer exercised the runtime geometry and quality-gate path that was being debugged.
- Why this was wrong: Smoke and manual validation can silently become meaningless if the worker is no longer using the real runtime execution backend.
- Rule: Before trusting any verification result, confirm the watch worker is running the intended backend for the current task, not just "some worker process".

### 13. Letting multiple workers share one Blender MCP scene

- Mistake: More than one `blender-mcp-worker` was allowed to watch the same output queue and talk to the same Blender MCP server.
- Why this was wrong: `clear_scene`, `import_file`, and runtime accessory creation are single-scene mutations. Two workers can interleave those calls, producing fake flakes like `fetch failed`, base-object missing, or runtime part names disappearing mid-pass.
- Rule: Treat one Blender MCP server as single-writer infrastructure. Real smoke and manual verification must run with exactly one active worker for that scene/backend combination.

## Required Verification Order

When a generation bug is being fixed, use this order:

1. Check the exact user-reported prompt.
2. Check the final result page rendering for that exact generation.
3. Check the exported `thumbnail.png`, `model.glb`, and AR-facing asset path if relevant.
4. Only then inspect `task.json`, `metadata`, parser output, and scorecards.

Do not reverse this order.

## Hard Acceptance Checklist For Prompt Fulfillment

Before saying "fixed", verify all applicable items on the final rendered result:

- Species is still the intended fox mother asset.
- Requested body color is visibly correct.
- Each requested accessory has the correct visible shape.
- Each requested accessory is attached at the correct anchor.
- Each requested accessory has the correct visible color.
- Removed default accessories are actually absent.
- The result-page fulfillment summary matches what is visibly rendered.
- If AR is part of the report, the AR asset path is the same formal asset chain as the web preview.

## Dynamic Mode Rules

- `fast-stable` is allowed to prefer polished stable outputs.
- `dynamic-custom` must prioritize prompt fulfillment over silent theme defaults.
- `experimental-addon` must not be treated as successful just because it finished quickly.
- If a request still used stable reuse or approximation, that must be reflected honestly in the result explanation.

## Maintenance Rules

- Every time a non-obvious PromptPet-AR failure is found, decide whether it belongs in this document.
- Add only reusable lessons, not one-off noise.
- If the user catches a mistake that the assistant missed, treat that as a strong signal the verification rules need tightening here.
- When changing parser, worker, accessory generation, result summaries, or verification flow, re-read this document before editing.

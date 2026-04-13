# Demo Freeze Seal-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze PromptPet-AR into a stable, presentable demo instead of continuing broad architecture work.

**Architecture:** Introduce one repo-level source of truth for the curated demo prompt pack, wire the homepage to those prompts, add a lightweight real-chain demo verification command, and document the exact operator/demo flow. This keeps the product feeling intentional without reopening the bigger execution-architecture migration.

**Tech Stack:** Next.js App Router, TypeScript, tsx scripts, existing `/api/generations` real generation flow

---

### Task 1: Freeze The Demo Prompt Pack

**Files:**
- Create: `src/data/demo-prompt-pack.ts`
- Modify: `src/components/home-experience.tsx`

- [x] Add a typed prompt-pack module with curated Chinese/English labels, prompt text, style, mode, and optional expected first-read hints.
- [x] Keep the pack small and demo-oriented: charming, visually readable, and aligned with capabilities we actually want to show.
- [x] Replace homepage freeform example chips with curated prompts from the pack.
- [x] Add one small line of copy making it clear these are recommended demo prompts, not a claim of universal support.

### Task 2: Add A Lightweight Demo Verification Command

**Files:**
- Create: `scripts/check-demo-prompt-pack.ts`
- Modify: `package.json`

- [x] Add a `tsx` script that reads the curated prompt pack, posts to `/api/generations`, polls until terminal status, and prints a concise per-prompt summary.
- [x] Support filtering by env var so one prompt can be tested quickly during iteration.
- [x] Make the summary focus on demo-relevant truth: status, stop reason, quality score, first-read result, and key readability metrics.
- [x] Exit non-zero on hard failures so the command can be used as a pre-demo sanity check.

### Task 3: Write The Demo Runbook

**Files:**
- Create: `docs/demo-runbook.md`
- Modify: `README.md`

- [x] Document the exact “how to launch, what to type, what to click, what to say” flow for showing the project live.
- [x] Keep the messaging honest: this is a fox-only prompt-to-3D-and-AR demo, not a universal 3D generator.
- [x] Include the curated prompt pack, fallback demo order, and what to do if one generation is still rendering.
- [x] Link the runbook from `README.md` so the repo has a clear demo entrypoint.

### Task 4: Verify The Seal-up Changes

**Files:**
- Verify: `src/data/demo-prompt-pack.ts`
- Verify: `src/components/home-experience.tsx`
- Verify: `scripts/check-demo-prompt-pack.ts`
- Verify: `docs/demo-runbook.md`
- Verify: `README.md`

- [x] Run `npm run typecheck`.
- [x] Run the new demo script on a narrow sample to confirm the command works against the live local stack.
- [x] Confirm the homepage still builds and the curated prompts render correctly.
- [x] Record any remaining demo caveats explicitly instead of masking them.

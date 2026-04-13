# Observable Dynamic Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `npm run dynamic-custom:regression` observable and recoverable so long runs can be monitored and archived without re-reading thread history.

**Architecture:** Keep the regression assertions unchanged. Only improve runner ergonomics around case filtering, per-case progress, and JSON report persistence so the script remains the same truth source but becomes easier to operate during demo freeze.

**Tech Stack:** TypeScript, tsx scripts, local JSON corpus, Node fs/path

---

### Task 1: Add Progress, Filtering, And Report Persistence

**Files:**
- Modify: `scripts/check-dynamic-custom-regression.ts`

- [ ] **Step 1: Add runner configuration**

Support:
- `PROMPTPET_DYNAMIC_REGRESSION_ONLY`
- `PROMPTPET_DYNAMIC_REGRESSION_PROGRESS`
- `PROMPTPET_DYNAMIC_REGRESSION_REPORT`

- [ ] **Step 2: Add per-case progress output**

Print:
- selected case count
- `[index/total] START <id>`
- `[index/total] PASS|FAIL <id> <duration>`

- [ ] **Step 3: Add JSON report persistence**

Persist:
- started/finished timestamps
- selected case count
- per-case duration and status
- full failure list

- [ ] **Step 4: Verify on a focused subset**

Run a 1-2 case filtered command and confirm:
- progress lines print immediately
- report file is written
- filtered selection works

- [ ] **Step 5: Run a full regression sweep and leave a durable report**

Run:
- `npm run dynamic-custom:regression`

Expected:
- progress is visible during the run
- a report file remains available after completion

import {
  buildRuntimeStopDiagnosticNotes,
  buildRuntimeStopDiagnostics,
  countConsecutiveExecutionFailureLayerSnapshots,
  selectDominantRuntimeController,
} from "./lib/runtime-stop-diagnostics.mjs";

type StopReason =
  | "quality-accepted"
  | "budget-exhausted"
  | "quality-plateau"
  | "hard-check-failed"
  | "partial-approximation";

type StopDecision = "accepted" | "approximate" | "failed";

type BlockingGate =
  | "hard-gate"
  | "quality-gate"
  | "precision-gate"
  | "visual-acceptance"
  | "planner-contract"
  | "legacy-fallback"
  | "render-critique"
  | "budget";

type Fixture = {
  id: string;
  input: {
    reason: StopReason;
    dominantFailureModes?: string[];
    plannerBlockedExecutionCount?: number;
    legacyFallbackBlockedExecutionCount?: number;
    renderCritiqueUnavailableExecutionCount?: number;
    renderCritiqueTimeoutExecutionCount?: number;
    acceptedExecutionCount?: number;
    approximatedExecutionCount?: number;
    unfulfilledExecutionCount?: number;
    passCount?: number;
    minimumRequiredPassCount?: number;
    softTargetPassCount?: number;
    budgetUsedMs?: number;
    runtimeAttemptBudgetMs?: number;
    qualityScore?: number;
    hardGatePassed?: boolean;
    qualityGatePassed?: boolean;
    precisionGatePassed?: boolean;
    precisionReady?: boolean;
    visualAcceptanceGatePassed?: boolean;
    plateauReason?: string;
    dominantFailureLayer?: string;
  };
  expect: {
    decision: StopDecision;
    controllerFailureLayer?: string;
    controllerDirective?: string;
    blockingGatesIncludes?: BlockingGate[];
    blockingGatesExcludes?: BlockingGate[];
    plannerBlockedExecutionCount?: number;
    legacyFallbackBlockedExecutionCount?: number;
    renderCritiqueUnavailableExecutionCount?: number;
    renderCritiqueTimeoutExecutionCount?: number;
    acceptedExecutionCount?: number;
    approximatedExecutionCount?: number;
    unfulfilledExecutionCount?: number;
    summaryIncludes?: string[];
    noteIncludes?: string[];
  };
};

function assertEqual<T>(
  failures: string[],
  id: string,
  label: string,
  actual: T,
  expected: T,
) {
  if (actual !== expected) {
    failures.push(`${id}: expected ${label}=${String(expected)}, got ${String(actual)}`);
  }
}

function assertIncludesAll(
  failures: string[],
  id: string,
  label: string,
  haystack: string[],
  needles: string[],
) {
  const missing = needles.filter((needle) => !haystack.includes(needle));

  if (missing.length > 0) {
    failures.push(
      `${id}: missing ${label} ${missing.join(", ")} from [${haystack.join(", ") || "(none)"}]`,
    );
  }
}

function assertExcludesAll(
  failures: string[],
  id: string,
  label: string,
  haystack: string[],
  needles: string[],
) {
  const present = needles.filter((needle) => haystack.includes(needle));

  if (present.length > 0) {
    failures.push(
      `${id}: expected ${label} to exclude ${present.join(", ")}, got [${haystack.join(", ")}]`,
    );
  }
}

function assertTextIncludes(
  failures: string[],
  id: string,
  label: string,
  text: string,
  fragments: string[],
) {
  const missing = fragments.filter((fragment) => !text.includes(fragment));

  if (missing.length > 0) {
    failures.push(
      `${id}: ${label} missing fragments ${missing.join(" | ")} in "${text}"`,
    );
  }
}

async function main() {
  const fixtures: Fixture[] = [
    {
      id: "quality-accepted",
      input: {
        reason: "quality-accepted",
        acceptedExecutionCount: 1,
        approximatedExecutionCount: 0,
        unfulfilledExecutionCount: 0,
        passCount: 5,
        minimumRequiredPassCount: 5,
        softTargetPassCount: 8,
        budgetUsedMs: 8420,
        runtimeAttemptBudgetMs: 16000,
        qualityScore: 0.82,
        hardGatePassed: true,
        qualityGatePassed: true,
        precisionGatePassed: true,
        precisionReady: true,
        visualAcceptanceGatePassed: true,
      },
      expect: {
        decision: "accepted",
        blockingGatesExcludes: [
          "hard-gate",
          "quality-gate",
          "precision-gate",
          "visual-acceptance",
          "planner-contract",
          "legacy-fallback",
          "render-critique",
          "budget",
        ],
        acceptedExecutionCount: 1,
        approximatedExecutionCount: 0,
        unfulfilledExecutionCount: 0,
        summaryIncludes: ["通过 1 / 近似 0 / 未满足 0", "质量分 82%"],
        noteIncludes: ["停机判定：已通过 / 原因：通过精度门槛。"],
      },
    },
    {
      id: "budget-exhausted",
      input: {
        reason: "budget-exhausted",
        acceptedExecutionCount: 0,
        approximatedExecutionCount: 1,
        unfulfilledExecutionCount: 0,
        passCount: 4,
        minimumRequiredPassCount: 5,
        softTargetPassCount: 8,
        budgetUsedMs: 16000,
        runtimeAttemptBudgetMs: 16000,
        qualityScore: 0.64,
        hardGatePassed: true,
        qualityGatePassed: false,
        precisionGatePassed: false,
        precisionReady: false,
        visualAcceptanceGatePassed: false,
        dominantFailureModes: [
          "host-scale-misaligned",
          "visual-acceptance-failed",
        ],
      },
      expect: {
        decision: "approximate",
        controllerFailureLayer: "host-fit",
        controllerDirective: "re-run-host-fit",
        blockingGatesIncludes: [
          "quality-gate",
          "precision-gate",
          "visual-acceptance",
          "budget",
        ],
        summaryIncludes: ["预算 16000/16000ms", "质量分 64%"],
        noteIncludes: ["停机判定：近似结束 / 原因：预算耗尽。"],
      },
    },
    {
      id: "quality-plateau",
      input: {
        reason: "quality-plateau",
        acceptedExecutionCount: 0,
        approximatedExecutionCount: 1,
        unfulfilledExecutionCount: 0,
        passCount: 8,
        minimumRequiredPassCount: 5,
        softTargetPassCount: 8,
        budgetUsedMs: 13070,
        runtimeAttemptBudgetMs: 16000,
        qualityScore: 0.64,
        hardGatePassed: true,
        qualityGatePassed: false,
        precisionGatePassed: false,
        precisionReady: false,
        visualAcceptanceGatePassed: false,
        dominantFailureModes: [
          "noun-fidelity-too-low",
          "silhouette-not-readable",
          "host-scale-misaligned",
          "host-composition-poor",
          "visual-acceptance-failed",
          "visual-veto",
        ],
        plateauReason:
          "已完成至少 8 轮；如果结果已经不过度压脸却仍长期 generic/unreadable，就停止继续 shrink。",
      },
      expect: {
        decision: "approximate",
        controllerFailureLayer: "stagnation",
        controllerDirective: "escalate-capability",
        blockingGatesIncludes: [
          "quality-gate",
          "precision-gate",
          "visual-acceptance",
        ],
        summaryIncludes: [
          "质量平台期停机",
          "noun-fidelity-too-low",
          "平台期说明",
        ],
        noteIncludes: [
          "平台期说明：已完成至少 8 轮；如果结果已经不过度压脸却仍长期 generic/unreadable，就停止继续 shrink。",
        ],
      },
    },
    {
      id: "partial-approximation-render-readability-silhouette",
      input: {
        reason: "partial-approximation",
        acceptedExecutionCount: 0,
        approximatedExecutionCount: 1,
        unfulfilledExecutionCount: 0,
        passCount: 6,
        minimumRequiredPassCount: 3,
        softTargetPassCount: 3,
        budgetUsedMs: 9635,
        runtimeAttemptBudgetMs: 300000,
        qualityScore: 0.67,
        hardGatePassed: true,
        qualityGatePassed: false,
        precisionGatePassed: false,
        precisionReady: false,
        visualAcceptanceGatePassed: true,
        dominantFailureLayer: "render-readability",
        dominantFailureModes: [
          "minor-polish",
          "noun-fidelity-too-low",
          "silhouette-not-readable",
          "host-scale-misaligned",
          "host-composition-poor",
        ],
      },
      expect: {
        decision: "approximate",
        controllerFailureLayer: "silhouette",
        controllerDirective: "micro-tune",
        blockingGatesIncludes: ["quality-gate", "precision-gate"],
        summaryIncludes: ["质量分 67%", "控制器判定：轮廓层 -> 继续微调。"],
        noteIncludes: ["控制器：轮廓层 -> 继续微调。"],
      },
    },
    {
      id: "partial-approximation-planner-blocked",
      input: {
        reason: "partial-approximation",
        acceptedExecutionCount: 0,
        approximatedExecutionCount: 1,
        unfulfilledExecutionCount: 0,
        passCount: 5,
        minimumRequiredPassCount: 5,
        softTargetPassCount: 8,
        budgetUsedMs: 9100,
        runtimeAttemptBudgetMs: 16000,
        qualityScore: 0.79,
        hardGatePassed: true,
        qualityGatePassed: false,
        precisionGatePassed: true,
        precisionReady: true,
        visualAcceptanceGatePassed: true,
        plannerBlockedExecutionCount: 1,
      },
      expect: {
        decision: "approximate",
        blockingGatesIncludes: ["quality-gate", "planner-contract"],
        plannerBlockedExecutionCount: 1,
        summaryIncludes: ["planner 1", "只能近似展示"],
        noteIncludes: ["当前主要阻塞：质量闸门 / planner contract。"],
      },
    },
    {
      id: "hard-check-failed",
      input: {
        reason: "hard-check-failed",
        acceptedExecutionCount: 0,
        approximatedExecutionCount: 0,
        unfulfilledExecutionCount: 1,
        passCount: 3,
        minimumRequiredPassCount: 5,
        budgetUsedMs: 6200,
        runtimeAttemptBudgetMs: 16000,
        qualityScore: 0.31,
        hardGatePassed: false,
        qualityGatePassed: false,
        precisionGatePassed: false,
        precisionReady: false,
        visualAcceptanceGatePassed: false,
        dominantFailureModes: ["shape-unreadable"],
      },
      expect: {
        decision: "failed",
        blockingGatesIncludes: [
          "hard-gate",
          "quality-gate",
          "precision-gate",
          "visual-acceptance",
        ],
        unfulfilledExecutionCount: 1,
        summaryIncludes: ["硬门槛未通过", "未满足 1"],
        noteIncludes: ["停机判定：未满足 / 原因：硬门槛未通过。"],
      },
    },
  ];

  const failures: string[] = [];

  for (const fixture of fixtures) {
    const diagnostics = buildRuntimeStopDiagnostics(fixture.input);

    if (!diagnostics) {
      failures.push(`${fixture.id}: diagnostics returned undefined`);
      continue;
    }

    const notes = buildRuntimeStopDiagnosticNotes(diagnostics);
    const notesText = notes.join(" || ");

    assertEqual(
      failures,
      fixture.id,
      "decision",
      diagnostics.decision,
      fixture.expect.decision,
    );

    if (fixture.expect.controllerFailureLayer) {
      assertEqual(
        failures,
        fixture.id,
        "controllerFailureLayer",
        diagnostics.controllerFailureLayer,
        fixture.expect.controllerFailureLayer,
      );
    }

    if (fixture.expect.controllerDirective) {
      assertEqual(
        failures,
        fixture.id,
        "controllerDirective",
        diagnostics.controllerDirective,
        fixture.expect.controllerDirective,
      );
    }

    if (fixture.expect.blockingGatesIncludes) {
      assertIncludesAll(
        failures,
        fixture.id,
        "blocking gates",
        diagnostics.blockingGates,
        fixture.expect.blockingGatesIncludes,
      );
    }

    if (fixture.expect.blockingGatesExcludes) {
      assertExcludesAll(
        failures,
        fixture.id,
        "blocking gates",
        diagnostics.blockingGates,
        fixture.expect.blockingGatesExcludes,
      );
    }

    if (typeof fixture.expect.plannerBlockedExecutionCount === "number") {
      assertEqual(
        failures,
        fixture.id,
        "plannerBlockedExecutionCount",
        diagnostics.plannerBlockedExecutionCount,
        fixture.expect.plannerBlockedExecutionCount,
      );
    }

    if (typeof fixture.expect.legacyFallbackBlockedExecutionCount === "number") {
      assertEqual(
        failures,
        fixture.id,
        "legacyFallbackBlockedExecutionCount",
        diagnostics.legacyFallbackBlockedExecutionCount,
        fixture.expect.legacyFallbackBlockedExecutionCount,
      );
    }

    if (typeof fixture.expect.renderCritiqueUnavailableExecutionCount === "number") {
      assertEqual(
        failures,
        fixture.id,
        "renderCritiqueUnavailableExecutionCount",
        diagnostics.renderCritiqueUnavailableExecutionCount,
        fixture.expect.renderCritiqueUnavailableExecutionCount,
      );
    }

    if (typeof fixture.expect.renderCritiqueTimeoutExecutionCount === "number") {
      assertEqual(
        failures,
        fixture.id,
        "renderCritiqueTimeoutExecutionCount",
        diagnostics.renderCritiqueTimeoutExecutionCount,
        fixture.expect.renderCritiqueTimeoutExecutionCount,
      );
    }

    if (typeof fixture.expect.acceptedExecutionCount === "number") {
      assertEqual(
        failures,
        fixture.id,
        "acceptedExecutionCount",
        diagnostics.acceptedExecutionCount,
        fixture.expect.acceptedExecutionCount,
      );
    }

    if (typeof fixture.expect.approximatedExecutionCount === "number") {
      assertEqual(
        failures,
        fixture.id,
        "approximatedExecutionCount",
        diagnostics.approximatedExecutionCount,
        fixture.expect.approximatedExecutionCount,
      );
    }

    if (typeof fixture.expect.unfulfilledExecutionCount === "number") {
      assertEqual(
        failures,
        fixture.id,
        "unfulfilledExecutionCount",
        diagnostics.unfulfilledExecutionCount,
        fixture.expect.unfulfilledExecutionCount,
      );
    }

    if (fixture.expect.summaryIncludes) {
      assertTextIncludes(
        failures,
        fixture.id,
        "summary",
        diagnostics.summary,
        fixture.expect.summaryIncludes,
      );
    }

    if (fixture.expect.noteIncludes) {
      assertTextIncludes(
        failures,
        fixture.id,
        "notes",
        notesText,
        fixture.expect.noteIncludes,
      );
    }
  }

  const dominantController = selectDominantRuntimeController([
    {
      controllerFailureLayer: "host-fit",
      controllerDirective: "re-run-host-fit",
      repeatedFailureCount: 2,
      dominantFailureModes: ["face-intrusion-too-high"],
    },
    {
      controllerFailureLayer: "stagnation",
      controllerDirective: "escalate-capability",
      repeatedFailureCount: 48,
      stagnationDetected: true,
      plateauReason: "same failure layer repeated without improving the visible read",
      dominantFailureModes: ["visual-veto", "host-composition-poor"],
    },
  ]);

  if (!dominantController) {
    failures.push("dominant controller aggregation returned undefined");
  } else {
    assertEqual(
      failures,
      "dominant-controller",
      "controllerFailureLayer",
      dominantController.controllerFailureLayer,
      "stagnation",
    );
    assertEqual(
      failures,
      "dominant-controller",
      "controllerDirective",
      dominantController.controllerDirective,
      "escalate-capability",
    );
    assertEqual(
      failures,
      "dominant-controller",
      "repeatedFailureCount",
      dominantController.repeatedFailureCount,
      48,
    );
    assertEqual(
      failures,
      "dominant-controller",
      "plateauReason",
      dominantController.plateauReason,
      "same failure layer repeated without improving the visible read",
    );
  }

  assertEqual(
    failures,
    "variant-phase-reset",
    "sameVariantSilhouetteCount",
    countConsecutiveExecutionFailureLayerSnapshots({
      executionId: "exec-scarf",
      failureLayer: "silhouette",
      currentVariantId: "scarf-knot-compact",
      snapshots: [
        {
          executionId: "exec-scarf",
          usedVariantId: "scarf-wrap-forward",
          qualityReport: { dominantFailureLayer: "silhouette" },
        },
        {
          executionId: "exec-scarf",
          usedVariantId: "scarf-knot-compact",
          qualityReport: { dominantFailureLayer: "silhouette" },
        },
        {
          executionId: "exec-scarf",
          usedVariantId: "scarf-knot-compact",
          qualityReport: { dominantFailureLayer: "silhouette" },
        },
      ],
    }),
    2,
  );
  assertEqual(
    failures,
    "variant-phase-reset",
    "differentVariantDoesNotBleedHistory",
    countConsecutiveExecutionFailureLayerSnapshots({
      executionId: "exec-scarf",
      failureLayer: "silhouette",
      currentVariantId: "scarf-knot-compact",
      snapshots: [
        {
          executionId: "exec-scarf",
          usedVariantId: "scarf-wrap-forward",
          qualityReport: { dominantFailureLayer: "silhouette" },
        },
        {
          executionId: "exec-scarf",
          usedVariantId: "scarf-wrap-forward",
          qualityReport: { dominantFailureLayer: "silhouette" },
        },
      ],
    }),
    0,
  );

  if (failures.length > 0) {
    console.error("[runtime-stop-diagnostics] FAIL");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `[runtime-stop-diagnostics] ${fixtures.length}/${fixtures.length} cases passed`,
  );
}

void main();

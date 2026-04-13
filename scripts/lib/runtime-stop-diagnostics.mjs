function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueStrings(values) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .filter((value) => typeof value === "string" && value.trim())
        .map((value) => value.trim()),
    ),
  ];
}

const stopReasons = new Set([
  "quality-accepted",
  "budget-exhausted",
  "quality-plateau",
  "hard-check-failed",
  "partial-approximation",
]);

const stopDecisions = new Set(["accepted", "approximate", "failed"]);

const stopBlockingGates = new Set([
  "hard-gate",
  "quality-gate",
  "precision-gate",
  "visual-acceptance",
  "planner-contract",
  "legacy-fallback",
  "render-critique",
  "budget",
]);

const stopReasonLabels = {
  "quality-accepted": "通过精度门槛",
  "budget-exhausted": "预算耗尽",
  "quality-plateau": "质量平台期停机",
  "hard-check-failed": "硬门槛未通过",
  "partial-approximation": "只能近似展示",
};

const stopDecisionLabels = {
  accepted: "已通过",
  approximate: "近似结束",
  failed: "未满足",
};

const stopBlockingGateLabels = {
  "hard-gate": "硬门槛",
  "quality-gate": "质量闸门",
  "precision-gate": "精度闸门",
  "visual-acceptance": "视觉验收",
  "planner-contract": "planner contract",
  "legacy-fallback": "legacy fallback",
  "render-critique": "render critique",
  budget: "预算",
};

export const runtimeFailureLayers = [
  "silhouette",
  "host-fit",
  "assembly",
  "topology",
  "composition",
  "stagnation",
];

const runtimeFailureLayerSet = new Set(runtimeFailureLayers);

export const runtimeRebuildDirectives = [
  "micro-tune",
  "re-run-host-fit",
  "rebuild-assembly",
  "rebuild-geometry-contract",
  "escalate-capability",
];

const runtimeRebuildDirectiveSet = new Set(runtimeRebuildDirectives);

const runtimeFailureLayerLabels = {
  silhouette: "轮廓层",
  "host-fit": "宿主贴合层",
  assembly: "装配层",
  topology: "拓扑层",
  composition: "构图层",
  stagnation: "停滞层",
};

const runtimeFailureLayerPriority = {
  composition: 1,
  silhouette: 2,
  "host-fit": 3,
  assembly: 4,
  topology: 5,
  stagnation: 6,
};

const runtimeRebuildDirectiveLabels = {
  "micro-tune": "继续微调",
  "re-run-host-fit": "重新跑 host-fit",
  "rebuild-assembly": "重建装配关系",
  "rebuild-geometry-contract": "重建几何合同",
  "escalate-capability": "升级 capability 策略",
};

const runtimeRebuildDirectivePriority = {
  "micro-tune": 1,
  "re-run-host-fit": 2,
  "rebuild-assembly": 3,
  "rebuild-geometry-contract": 4,
  "escalate-capability": 5,
};

const legacyFailureLayerToRuntimeLayer = {
  silhouette: "silhouette",
  "host-fit": "host-fit",
  assembly: "assembly",
  "anchor-projection": "host-fit",
  "attachment-cohesion": "assembly",
  "outline-compiler": "silhouette",
  "render-readability": "composition",
  "critique-timeout": "composition",
};

function normalizeCount(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0;
}

function normalizeOptionalCount(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : undefined;
}

function normalizeScore(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return Number(value.toFixed(2));
}

function normalizeBoolean(value) {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeSentenceFragment(value) {
  const normalized = normalizeString(value);

  return normalized ? normalized.replace(/[。.!?？]+$/u, "") : undefined;
}

function numberOrZero(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getSnapshotExecutionId(snapshot) {
  const executionId =
    normalizeString(snapshot?.execution?.executionId) ??
    normalizeString(snapshot?.executionId);

  return executionId;
}

function getSnapshotVariantId(snapshot) {
  const variantId =
    normalizeString(snapshot?.usedVariantId) ??
    normalizeString(snapshot?.qualityReport?.geometryRecipe?.variantId) ??
    normalizeString(snapshot?.geometryRecipe?.variantId) ??
    normalizeString(snapshot?.execution?.variantId) ??
    normalizeString(snapshot?.variantId);

  return variantId;
}

function getSnapshotDominantFailureModes(snapshot) {
  return uniqueStrings([
    ...(Array.isArray(snapshot?.qualityReport?.dominantFailureModes)
      ? snapshot.qualityReport.dominantFailureModes
      : []),
    ...(Array.isArray(snapshot?.qualityReport?.visualCritiqueReport?.dominantFailureModes)
      ? snapshot.qualityReport.visualCritiqueReport.dominantFailureModes
      : []),
  ]);
}

function inferRuntimeFailureLayerFromModes(
  dominantFailureModes,
  options = {},
) {
  const modes = uniqueStrings(dominantFailureModes).join(" ").toLowerCase();
  const preferSilhouetteForRenderReadability =
    options.preferSilhouetteForRenderReadability === true;
  const directHostFitSignal =
    /face-intrusion|host-intrusion|anchor-projection|避脸|压脸/u.test(modes);
  const hostPlacementSignal =
    /host-scale|host-composition|occlusion/u.test(modes);
  const silhouetteSignal =
    /silhouette|generic|slab|bar|token|outline|noun-fidelity|read-order/u.test(modes);

  if (directHostFitSignal) {
    return "host-fit";
  }

  if (/detached|assembly|cohesion|re-parent|漂浮|挂接|装配/u.test(modes)) {
    return "assembly";
  }

  if (/planner|legacy-fallback|topology|part-graph|critical-parts-underweight/u.test(modes)) {
    return "topology";
  }

  if (preferSilhouetteForRenderReadability && silhouetteSignal) {
    return "silhouette";
  }

  if (hostPlacementSignal) {
    return "host-fit";
  }

  if (silhouetteSignal) {
    return "silhouette";
  }

  return "composition";
}

export function normalizeRuntimeFailureLayer(
  dominantFailureLayer,
  dominantFailureModes = [],
) {
  const normalizedLayer = normalizeString(dominantFailureLayer);

  if (normalizedLayer && runtimeFailureLayerSet.has(normalizedLayer)) {
    return normalizedLayer;
  }

  if (
    normalizedLayer === "render-readability" ||
    normalizedLayer === "critique-timeout"
  ) {
    return inferRuntimeFailureLayerFromModes(
      dominantFailureModes,
      {
        preferSilhouetteForRenderReadability: normalizedLayer === "render-readability",
      },
    );
  }

  if (normalizedLayer && legacyFailureLayerToRuntimeLayer[normalizedLayer]) {
    return legacyFailureLayerToRuntimeLayer[normalizedLayer];
  }

  return inferRuntimeFailureLayerFromModes(dominantFailureModes);
}

export function getRuntimeFailureLayerFromSnapshot(snapshot) {
  const dominantFailureLayer =
    normalizeString(snapshot?.qualityReport?.visualCritiqueReport?.dominantFailureLayer) ??
    normalizeString(snapshot?.qualityReport?.dominantFailureLayer) ??
    normalizeString(snapshot?.qualityReport?.visualCritiqueReport?.controllerFailureLayer) ??
    normalizeString(snapshot?.qualityReport?.controllerFailureLayer) ??
    normalizeString(snapshot?.dominantFailureLayer);
  const dominantFailureModes = getSnapshotDominantFailureModes(snapshot);

  if (!dominantFailureLayer && dominantFailureModes.length === 0) {
    return undefined;
  }

  return normalizeRuntimeFailureLayer(dominantFailureLayer, dominantFailureModes);
}

export function countConsecutiveExecutionFailureLayerSnapshots(input = {}) {
  const executionId = normalizeString(input.executionId);
  const requestedLayer = normalizeString(input.failureLayer);
  const currentVariantId = normalizeString(input.currentVariantId);
  const currentSnapshot = isRecord(input.currentSnapshot) ? input.currentSnapshot : null;

  if (!executionId || !requestedLayer) {
    return 0;
  }

  const failureLayer = normalizeRuntimeFailureLayer(requestedLayer, []);
  const snapshots = Array.isArray(input.snapshots) ? [...input.snapshots] : [];

  if (currentSnapshot) {
    snapshots.push(currentSnapshot);
  }

  let consecutiveCount = 0;

  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    const snapshot = snapshots[index];

    if (getSnapshotExecutionId(snapshot) !== executionId) {
      continue;
    }

    if (currentVariantId) {
      const snapshotVariantId = getSnapshotVariantId(snapshot);

      if (snapshotVariantId !== currentVariantId) {
        break;
      }
    }

    const snapshotFailureLayer = getRuntimeFailureLayerFromSnapshot(snapshot);

    if (!snapshotFailureLayer) {
      break;
    }

    if (snapshotFailureLayer !== failureLayer) {
      break;
    }

    consecutiveCount += 1;
  }

  return consecutiveCount;
}

function getSnapshotQualityMetric(snapshot, metricKey) {
  return numberOrZero(snapshot?.qualityReport?.qualityMetrics?.[metricKey]);
}

function getSnapshotQualityScore(snapshot) {
  return numberOrZero(snapshot?.qualityReport?.qualityScore);
}

function getSnapshotRenderFidelity(snapshot) {
  return numberOrZero(
    snapshot?.qualityReport?.visualCritiqueReport?.renderNounFidelity ??
      snapshot?.qualityReport?.visualCritiqueReport?.nounFidelity,
  );
}

function getSnapshotCapabilityRerouteId(snapshot) {
  return (
    normalizeString(snapshot?.geometryRecipe?.capabilityRerouteId) ??
    normalizeString(snapshot?.qualityReport?.geometryRecipe?.capabilityRerouteId) ??
    normalizeString(snapshot?.runtimeDesignContract?.capabilityRerouteId) ??
    normalizeString(snapshot?.execution?.runtimeDesignContract?.capabilityRerouteId) ??
    normalizeString(snapshot?.execution?.capabilityRerouteId)
  );
}

function getMetricRange(values = []) {
  const numbers = values.filter((value) => typeof value === "number" && Number.isFinite(value));

  if (numbers.length === 0) {
    return 0;
  }

  return Math.max(...numbers) - Math.min(...numbers);
}

function buildConsecutiveExecutionSnapshotWindow(input = {}) {
  const executionId = normalizeString(input.executionId);
  const currentVariantId = normalizeString(input.currentVariantId);
  const requestedLayer = normalizeString(input.failureLayer);
  const failureLayer = requestedLayer
    ? normalizeRuntimeFailureLayer(requestedLayer, [])
    : undefined;
  const currentSnapshot = isRecord(input.currentSnapshot) ? input.currentSnapshot : null;
  const snapshots = Array.isArray(input.snapshots) ? [...input.snapshots] : [];

  if (currentSnapshot) {
    snapshots.push(currentSnapshot);
  }

  if (!executionId) {
    return [];
  }

  const window = [];

  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    const snapshot = snapshots[index];

    if (getSnapshotExecutionId(snapshot) !== executionId) {
      continue;
    }

    if (currentVariantId) {
      const snapshotVariantId = getSnapshotVariantId(snapshot);

      if (snapshotVariantId !== currentVariantId) {
        break;
      }
    }

    const snapshotFailureLayer = getRuntimeFailureLayerFromSnapshot(snapshot);

    if (!snapshotFailureLayer) {
      break;
    }

    if (failureLayer && snapshotFailureLayer !== failureLayer) {
      break;
    }

    window.unshift(snapshot);
  }

  return window;
}

export function detectExecutionSnapshotPlateau(input = {}) {
  const executionId = normalizeString(input.executionId);
  const currentVariantId = normalizeString(input.currentVariantId);
  const requestedLayer = normalizeString(input.failureLayer);

  if (!executionId || !currentVariantId || !requestedLayer) {
    return {
      stagnationDetected: false,
      plateauReason: undefined,
      stableSnapshotCount: 0,
    };
  }

  const window = buildConsecutiveExecutionSnapshotWindow({
    snapshots: input.snapshots,
    currentSnapshot: input.currentSnapshot,
    executionId,
    currentVariantId,
    failureLayer: requestedLayer,
  });

  if (window.length < 4) {
    return {
      stagnationDetected: false,
      plateauReason: undefined,
      stableSnapshotCount: window.length,
    };
  }

  const recentWindow = window.slice(-4);
  const failureModeSignatures = recentWindow.map((snapshot) =>
    JSON.stringify(getSnapshotDominantFailureModes(snapshot)),
  );
  const stableFailureModes = failureModeSignatures.every(
    (signature) => signature === failureModeSignatures[0],
  );
  const hardGateStable = recentWindow.every(
    (snapshot) => snapshot?.qualityReport?.hardGatePassed === true,
  );
  const unresolvedQuality = recentWindow.every(
    (snapshot) =>
      snapshot?.qualityAccepted !== true &&
      snapshot?.qualityReport?.qualityGatePassed !== true,
  );
  const qualityScoreRange = getMetricRange(recentWindow.map(getSnapshotQualityScore));
  const readabilityRange = getMetricRange(
    recentWindow.map((snapshot) => getSnapshotQualityMetric(snapshot, "visualReadability")),
  );
  const silhouetteRange = getMetricRange(
    recentWindow.map((snapshot) => getSnapshotQualityMetric(snapshot, "silhouetteStrength")),
  );
  const scaleFitRange = getMetricRange(
    recentWindow.map((snapshot) => getSnapshotQualityMetric(snapshot, "scaleFit")),
  );
  const hostCompositionRange = getMetricRange(
    recentWindow.map((snapshot) => getSnapshotQualityMetric(snapshot, "hostComposition")),
  );
  const renderFidelityRange = getMetricRange(recentWindow.map(getSnapshotRenderFidelity));

  const stagnationDetected =
    stableFailureModes &&
    hardGateStable &&
    unresolvedQuality &&
    qualityScoreRange <= 0.015 &&
    readabilityRange <= 0.03 &&
    silhouetteRange <= 0.03 &&
    scaleFitRange <= 0.03 &&
    hostCompositionRange <= 0.03 &&
    renderFidelityRange <= 0.025;

  if (!stagnationDetected) {
    const activeCapabilityRerouteId = getSnapshotCapabilityRerouteId(window.at(-1));
    const recentRerouteWindow =
      typeof activeCapabilityRerouteId === "string" && activeCapabilityRerouteId
        ? window.slice(-6)
        : [];
    const stableRerouteId =
      recentRerouteWindow.length >= 6 &&
      recentRerouteWindow.every(
        (snapshot) => getSnapshotCapabilityRerouteId(snapshot) === activeCapabilityRerouteId,
      );
    const rerouteFailureModeSignatures = recentRerouteWindow.map((snapshot) =>
      JSON.stringify(getSnapshotDominantFailureModes(snapshot)),
    );
    const rerouteFailureModesStable =
      stableRerouteId &&
      rerouteFailureModeSignatures.every(
        (signature) => signature === rerouteFailureModeSignatures[0],
      );
    const rerouteHardGateStable =
      stableRerouteId &&
      recentRerouteWindow.every((snapshot) => snapshot?.qualityReport?.hardGatePassed === true);
    const rerouteUnresolvedQuality =
      stableRerouteId &&
      recentRerouteWindow.every(
        (snapshot) =>
          snapshot?.qualityAccepted !== true &&
          snapshot?.qualityReport?.qualityGatePassed !== true,
      );
    const rerouteQualityScoreRange = getMetricRange(
      recentRerouteWindow.map(getSnapshotQualityScore),
    );
    const rerouteReadabilityRange = getMetricRange(
      recentRerouteWindow.map((snapshot) =>
        getSnapshotQualityMetric(snapshot, "visualReadability"),
      ),
    );
    const rerouteSilhouetteRange = getMetricRange(
      recentRerouteWindow.map((snapshot) =>
        getSnapshotQualityMetric(snapshot, "silhouetteStrength"),
      ),
    );
    const rerouteScaleFitRange = getMetricRange(
      recentRerouteWindow.map((snapshot) => getSnapshotQualityMetric(snapshot, "scaleFit")),
    );
    const rerouteHostCompositionRange = getMetricRange(
      recentRerouteWindow.map((snapshot) =>
        getSnapshotQualityMetric(snapshot, "hostComposition"),
      ),
    );
    const rerouteRenderFidelityRange = getMetricRange(
      recentRerouteWindow.map(getSnapshotRenderFidelity),
    );
    const rerouteSteadyStateDetected =
      stableRerouteId &&
      rerouteFailureModesStable &&
      rerouteHardGateStable &&
      rerouteUnresolvedQuality &&
      rerouteQualityScoreRange <= 0.03 &&
      rerouteReadabilityRange <= 0.04 &&
      rerouteSilhouetteRange <= 0.04 &&
      rerouteScaleFitRange <= 0.04 &&
      rerouteHostCompositionRange <= 0.03 &&
      rerouteRenderFidelityRange <= 0.035;

    if (!rerouteSteadyStateDetected) {
      return {
        stagnationDetected: false,
        plateauReason: undefined,
        stableSnapshotCount: window.length,
      };
    }

    const failureLayerLabel =
      runtimeFailureLayerLabels[
        normalizeRuntimeFailureLayer(
          requestedLayer,
          getSnapshotDominantFailureModes(recentRerouteWindow.at(-1)),
        )
      ] ?? requestedLayer;

    return {
      stagnationDetected: true,
      plateauReason: `同一 variant 在 capability reroute 后已连续 ${recentRerouteWindow.length} 轮停留在${failureLayerLabel}，quality/readability/silhouette/scale/host 指标只在窄幅振荡`,
      stableSnapshotCount: recentRerouteWindow.length,
    };
  }

  const failureLayerLabel =
    runtimeFailureLayerLabels[
      normalizeRuntimeFailureLayer(requestedLayer, getSnapshotDominantFailureModes(recentWindow.at(-1)))
    ] ?? requestedLayer;

  return {
    stagnationDetected: true,
    plateauReason: `同一 variant 已连续 ${window.length} 轮停留在${failureLayerLabel}，quality/readability/silhouette/scale/host 指标基本不再变化`,
    stableSnapshotCount: window.length,
  };
}

export function inferRuntimeRebuildDirective(
  failureLayer,
  repeatedFailureCount = 0,
) {
  const normalizedLayer = runtimeFailureLayerSet.has(failureLayer)
    ? failureLayer
    : "composition";
  const repeatedCount = normalizeCount(repeatedFailureCount);

  if (normalizedLayer === "stagnation") {
    return "escalate-capability";
  }

  if (normalizedLayer === "host-fit") {
    return "re-run-host-fit";
  }

  if (normalizedLayer === "assembly") {
    return "rebuild-assembly";
  }

  if (normalizedLayer === "topology") {
    return "rebuild-geometry-contract";
  }

  if (normalizedLayer === "silhouette") {
    return repeatedCount >= 1 ? "rebuild-geometry-contract" : "micro-tune";
  }

  return repeatedCount >= 2 ? "rebuild-geometry-contract" : "micro-tune";
}

export function buildRuntimeFailureLayerController(input = {}) {
  const repeatedFailureCount = normalizeCount(
    input.repeatedFailureCount ?? input.sameLayerFailureCount,
  );
  const plateauReason = normalizeSentenceFragment(input.plateauReason);
  const dominantFailureModes = uniqueStrings(input.dominantFailureModes);
  let failureLayer = normalizeRuntimeFailureLayer(
    input.dominantFailureLayer,
    dominantFailureModes,
  );
  const stagnationDetected =
    input.forceStagnation === true ||
    Boolean(plateauReason) ||
    repeatedFailureCount >= 3;

  if (stagnationDetected) {
    failureLayer = "stagnation";
  }

  const rebuildDirective = inferRuntimeRebuildDirective(
    failureLayer,
    repeatedFailureCount,
  );

  return {
    failureLayer,
    repeatedFailureCount,
    stagnationDetected,
    rebuildDirective,
    dominantFailureModes,
    plateauReason,
  };
}

function normalizeDominantRuntimeControllerCandidate(candidate) {
  if (!isRecord(candidate)) {
    return undefined;
  }

  const dominantFailureModes = uniqueStrings(candidate.dominantFailureModes);
  const controllerFailureLayer = normalizeRuntimeFailureLayer(
    candidate.controllerFailureLayer ?? candidate.dominantFailureLayer,
    dominantFailureModes,
  );
  const repeatedFailureCount = normalizeCount(
    candidate.repeatedFailureCount ?? candidate.sameLayerFailureCount,
  );
  const stagnationDetected =
    candidate.stagnationDetected === true ||
    controllerFailureLayer === "stagnation" ||
    repeatedFailureCount >= 3;
  const controllerDirective = runtimeRebuildDirectiveSet.has(candidate.controllerDirective)
    ? candidate.controllerDirective
    : inferRuntimeRebuildDirective(controllerFailureLayer, repeatedFailureCount);

  return {
    controllerFailureLayer: stagnationDetected ? "stagnation" : controllerFailureLayer,
    controllerDirective: stagnationDetected ? "escalate-capability" : controllerDirective,
    repeatedFailureCount,
    stagnationDetected,
    dominantFailureModes,
    plateauReason: normalizeSentenceFragment(candidate.plateauReason),
  };
}

function buildDominantRuntimeControllerPriority(candidate) {
  const normalized = normalizeDominantRuntimeControllerCandidate(candidate);

  if (!normalized) {
    return undefined;
  }

  return [
    normalized.stagnationDetected ? 1 : 0,
    runtimeRebuildDirectivePriority[normalized.controllerDirective] ?? 0,
    runtimeFailureLayerPriority[normalized.controllerFailureLayer] ?? 0,
    normalized.repeatedFailureCount,
    normalized.dominantFailureModes.length,
  ];
}

export function selectDominantRuntimeController(candidates = []) {
  let bestCandidate;
  let bestPriority;

  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const normalized = normalizeDominantRuntimeControllerCandidate(candidate);
    const priority = buildDominantRuntimeControllerPriority(candidate);

    if (!normalized || !priority) {
      continue;
    }

    if (!bestPriority) {
      bestCandidate = normalized;
      bestPriority = priority;
      continue;
    }

    let shouldReplace = false;

    for (let index = 0; index < priority.length; index += 1) {
      if (priority[index] === bestPriority[index]) {
        continue;
      }

      shouldReplace = priority[index] > bestPriority[index];
      break;
    }

    if (shouldReplace) {
      bestCandidate = normalized;
      bestPriority = priority;
    }
  }

  return bestCandidate;
}

function formatBudgetPair(budgetUsedMs, runtimeAttemptBudgetMs) {
  if (typeof budgetUsedMs === "number" && typeof runtimeAttemptBudgetMs === "number") {
    return `${budgetUsedMs}/${runtimeAttemptBudgetMs}ms`;
  }

  if (typeof budgetUsedMs === "number") {
    return `${budgetUsedMs}ms`;
  }

  if (typeof runtimeAttemptBudgetMs === "number") {
    return `未记录/${runtimeAttemptBudgetMs}ms`;
  }

  return "未记录";
}

function formatQualityScore(qualityScore) {
  return typeof qualityScore === "number"
    ? `${Math.round(qualityScore * 100)}%`
    : "未记录";
}

function deriveStopDecision({
  reason,
  approximatedExecutionCount,
  unfulfilledExecutionCount,
}) {
  if (reason === "quality-accepted") {
    return "accepted";
  }

  if (
    approximatedExecutionCount > 0 ||
    reason === "partial-approximation" ||
    reason === "quality-plateau"
  ) {
    return "approximate";
  }

  if (unfulfilledExecutionCount > 0 || reason === "hard-check-failed") {
    return "failed";
  }

  return "approximate";
}

function deriveBlockingGates(normalized) {
  const gates = [];

  if (normalized.hardGatePassed === false) {
    gates.push("hard-gate");
  }

  if (normalized.qualityGatePassed === false) {
    gates.push("quality-gate");
  }

  if (
    normalized.precisionGatePassed === false ||
    normalized.precisionReady === false
  ) {
    gates.push("precision-gate");
  }

  if (normalized.visualAcceptanceGatePassed === false) {
    gates.push("visual-acceptance");
  }

  if (normalized.plannerBlockedExecutionCount > 0) {
    gates.push("planner-contract");
  }

  if (normalized.legacyFallbackBlockedExecutionCount > 0) {
    gates.push("legacy-fallback");
  }

  if (
    normalized.renderCritiqueUnavailableExecutionCount > 0 ||
    normalized.renderCritiqueTimeoutExecutionCount > 0
  ) {
    gates.push("render-critique");
  }

  if (
    normalized.reason === "budget-exhausted" ||
    (typeof normalized.budgetUsedMs === "number" &&
      typeof normalized.runtimeAttemptBudgetMs === "number" &&
      normalized.budgetUsedMs >= normalized.runtimeAttemptBudgetMs)
  ) {
    gates.push("budget");
  }

  return uniqueStrings(gates).filter((value) => stopBlockingGates.has(value));
}

function buildStopDiagnosticsSummary(normalized) {
  const pieces = [
    `${stopDecisionLabels[normalized.decision]}；停止原因：${stopReasonLabels[normalized.reason]}。`,
    `通过 ${normalized.acceptedExecutionCount} / 近似 ${normalized.approximatedExecutionCount} / 未满足 ${normalized.unfulfilledExecutionCount}；执行 ${normalized.passCount} 轮${
      typeof normalized.minimumRequiredPassCount === "number"
        ? `（目标最少 ${normalized.minimumRequiredPassCount} 轮${
            typeof normalized.softTargetPassCount === "number"
              ? `，软目标 ${normalized.softTargetPassCount} 轮`
              : ""
          }）`
        : ""
    }，预算 ${formatBudgetPair(normalized.budgetUsedMs, normalized.runtimeAttemptBudgetMs)}，质量分 ${formatQualityScore(normalized.qualityScore)}。`,
  ];

  if (normalized.blockingGates.length > 0) {
    pieces.push(
      `主要阻塞：${normalized.blockingGates
        .map((gate) => stopBlockingGateLabels[gate] ?? gate)
        .join(" / ")}。`,
    );
  }

  if (normalized.dominantFailureModes.length > 0) {
    pieces.push(
      `主要失败模式：${normalized.dominantFailureModes.join(" / ")}。`,
    );
  }

  if (typeof normalized.controllerFailureLayer === "string") {
    pieces.push(
      `控制器判定：${runtimeFailureLayerLabels[normalized.controllerFailureLayer] ?? normalized.controllerFailureLayer} -> ${runtimeRebuildDirectiveLabels[normalized.controllerDirective] ?? normalized.controllerDirective}。`,
    );
  }

  if (
    normalized.plannerBlockedExecutionCount > 0 ||
    normalized.legacyFallbackBlockedExecutionCount > 0 ||
    normalized.renderCritiqueUnavailableExecutionCount > 0 ||
    normalized.renderCritiqueTimeoutExecutionCount > 0
  ) {
    pieces.push(
      `阻塞统计：planner ${normalized.plannerBlockedExecutionCount} / legacy ${normalized.legacyFallbackBlockedExecutionCount} / render critique unavailable ${normalized.renderCritiqueUnavailableExecutionCount} / timeout ${normalized.renderCritiqueTimeoutExecutionCount}。`,
    );
  }

  if (normalized.plateauReason) {
    pieces.push(`平台期说明：${normalized.plateauReason}。`);
  }

  return pieces.join(" ");
}

export function normalizeRuntimeStopDiagnostics(value) {
  if (!isRecord(value) || !stopReasons.has(value.reason)) {
    return undefined;
  }

  const controller = buildRuntimeFailureLayerController({
    dominantFailureLayer: value.dominantFailureLayer,
    dominantFailureModes: value.dominantFailureModes,
    repeatedFailureCount: value.repeatedFailureCount,
    sameLayerFailureCount: value.sameLayerFailureCount,
    plateauReason: value.plateauReason,
  });

  const normalized = {
    reason: value.reason,
    decision: stopDecisions.has(value.decision)
      ? value.decision
      : deriveStopDecision({
          reason: value.reason,
          approximatedExecutionCount: normalizeCount(value.approximatedExecutionCount),
          unfulfilledExecutionCount: normalizeCount(value.unfulfilledExecutionCount),
        }),
    dominantFailureModes: uniqueStrings(value.dominantFailureModes),
    plannerBlockedExecutionCount: normalizeCount(value.plannerBlockedExecutionCount),
    legacyFallbackBlockedExecutionCount: normalizeCount(
      value.legacyFallbackBlockedExecutionCount,
    ),
    renderCritiqueUnavailableExecutionCount: normalizeCount(
      value.renderCritiqueUnavailableExecutionCount,
    ),
    renderCritiqueTimeoutExecutionCount: normalizeCount(
      value.renderCritiqueTimeoutExecutionCount,
    ),
    acceptedExecutionCount: normalizeCount(value.acceptedExecutionCount),
    approximatedExecutionCount: normalizeCount(value.approximatedExecutionCount),
    unfulfilledExecutionCount: normalizeCount(value.unfulfilledExecutionCount),
    passCount: normalizeCount(value.passCount),
    minimumRequiredPassCount: normalizeOptionalCount(value.minimumRequiredPassCount),
    softTargetPassCount: normalizeOptionalCount(value.softTargetPassCount),
    budgetUsedMs: normalizeOptionalCount(value.budgetUsedMs),
    runtimeAttemptBudgetMs: normalizeOptionalCount(value.runtimeAttemptBudgetMs),
    qualityScore: normalizeScore(value.qualityScore),
    hardGatePassed: normalizeBoolean(value.hardGatePassed),
    qualityGatePassed: normalizeBoolean(value.qualityGatePassed),
    precisionGatePassed: normalizeBoolean(value.precisionGatePassed),
    precisionReady: normalizeBoolean(value.precisionReady),
    visualAcceptanceGatePassed: normalizeBoolean(value.visualAcceptanceGatePassed),
    plateauReason: controller.plateauReason,
    dominantFailureLayer: controller.failureLayer,
    repeatedFailureCount: controller.repeatedFailureCount,
    stagnationDetected: controller.stagnationDetected,
    controllerFailureLayer: controller.failureLayer,
    controllerDirective: controller.rebuildDirective,
  };

  const blockingGates = deriveBlockingGates(normalized);

  return {
    ...normalized,
    blockingGates,
    summary: buildStopDiagnosticsSummary({
      ...normalized,
      blockingGates,
    }),
  };
}

export function buildRuntimeStopDiagnostics(input = {}) {
  return normalizeRuntimeStopDiagnostics(input);
}

export function buildRuntimeStopDiagnosticNotes(value) {
  const normalized = normalizeRuntimeStopDiagnostics(value);

  if (!normalized) {
    return [];
  }

  const notes = [
    `停机判定：${stopDecisionLabels[normalized.decision]} / 原因：${stopReasonLabels[normalized.reason]}。`,
    `结果统计：通过 ${normalized.acceptedExecutionCount} / 近似 ${normalized.approximatedExecutionCount} / 未满足 ${normalized.unfulfilledExecutionCount}；执行 ${normalized.passCount} 轮${
      typeof normalized.minimumRequiredPassCount === "number"
        ? `（目标最少 ${normalized.minimumRequiredPassCount} 轮${
            typeof normalized.softTargetPassCount === "number"
              ? `，软目标 ${normalized.softTargetPassCount} 轮`
              : ""
          }）`
        : ""
    }，预算 ${formatBudgetPair(normalized.budgetUsedMs, normalized.runtimeAttemptBudgetMs)}，质量分 ${formatQualityScore(normalized.qualityScore)}。`,
  ];

  if (normalized.blockingGates.length > 0) {
    notes.push(
      `当前主要阻塞：${normalized.blockingGates
        .map((gate) => stopBlockingGateLabels[gate] ?? gate)
        .join(" / ")}。`,
    );
  }

  if (
    normalized.plannerBlockedExecutionCount > 0 ||
    normalized.legacyFallbackBlockedExecutionCount > 0 ||
    normalized.renderCritiqueUnavailableExecutionCount > 0 ||
    normalized.renderCritiqueTimeoutExecutionCount > 0
  ) {
    notes.push(
      `执行阻塞统计：planner ${normalized.plannerBlockedExecutionCount} / legacy ${normalized.legacyFallbackBlockedExecutionCount} / render critique unavailable ${normalized.renderCritiqueUnavailableExecutionCount} / timeout ${normalized.renderCritiqueTimeoutExecutionCount}。`,
    );
  }

  if (normalized.dominantFailureModes.length > 0) {
    notes.push(
      `主要失败模式：${normalized.dominantFailureModes.join(" / ")}。`,
    );
  }

  if (typeof normalized.controllerFailureLayer === "string") {
    notes.push(
      `控制器：${runtimeFailureLayerLabels[normalized.controllerFailureLayer] ?? normalized.controllerFailureLayer} -> ${runtimeRebuildDirectiveLabels[normalized.controllerDirective] ?? normalized.controllerDirective}。`,
    );
  }

  if (normalized.plateauReason) {
    notes.push(`平台期说明：${normalized.plateauReason}。`);
  }

  return uniqueStrings(notes);
}

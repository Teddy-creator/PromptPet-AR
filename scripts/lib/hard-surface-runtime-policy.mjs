import { buildFallbackReadOrderTargets } from "./runtime-visual-critique.mjs";

const supportedRuntimeAccessoryAnchors = new Set([
  "left-ear",
  "right-ear",
  "forehead",
  "head-top",
  "back-head",
  "chest",
  "chest-center",
  "chest-left",
  "chest-right",
  "tail-top",
  "tail-left",
  "tail-right",
  "tail-base",
]);

const genericRecoveryReads = [
  "generic-slab",
  "generic-bar",
  "generic-block",
  "generic-token",
  "generic-blob",
  "generic-unreadable",
];

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

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function lerpNumber(start, end, t) {
  return start + (end - start) * clamp01(t);
}

function lerpVector(start = [0, 0, 0], end = [0, 0, 0], t = 0) {
  const blend = clamp01(t);
  return [0, 1, 2].map((axis) =>
    Number(lerpNumber(start[axis] ?? 0, end[axis] ?? 0, blend).toFixed(4)),
  );
}

function clampNumber(value, minValue, maxValue) {
  if (!Number.isFinite(value)) {
    return minValue;
  }

  return Math.min(maxValue, Math.max(minValue, value));
}

function addVectors(...vectors) {
  return [0, 1, 2].map((axis) =>
    Number(
      vectors.reduce((sum, vector) => sum + (Array.isArray(vector) ? vector[axis] ?? 0 : 0), 0).toFixed(4),
    ),
  );
}

function scaleVector(vector = [0, 0, 0], factor = 1) {
  return [0, 1, 2].map((axis) =>
    Number((((vector[axis] ?? 0) * factor).toFixed(4))),
  );
}

function roundVector(vector = [0, 0, 0]) {
  return [0, 1, 2].map((axis) => Number(((vector[axis] ?? 0)).toFixed(4)));
}

function isEarSideRuntimeAnchor(anchor) {
  return anchor === "left-ear" || anchor === "right-ear";
}

function isBotanicalBloomRuntimeShapeClass(runtimeShapeClass) {
  return (
    runtimeShapeClass === "flower" ||
    runtimeShapeClass === "clover-charm" ||
    runtimeShapeClass === "open-botanical-ornament"
  );
}

function getExecutionRuntimeShapeClass(execution, geometryRecipe = null) {
  if (
    typeof execution?.runtimeShapeClass === "string" &&
    execution.runtimeShapeClass.trim()
  ) {
    return execution.runtimeShapeClass.trim();
  }

  if (
    isRecord(geometryRecipe) &&
    typeof geometryRecipe.runtimeShapeClass === "string" &&
    geometryRecipe.runtimeShapeClass.trim()
  ) {
    return geometryRecipe.runtimeShapeClass.trim();
  }

  return typeof execution?.family === "string" ? execution.family : "generic-ornament";
}

function getExecutionRuntimeDesignSource(execution, geometryRecipe = null) {
  if (
    isRecord(geometryRecipe) &&
    typeof geometryRecipe.runtimeDesignSource === "string" &&
    geometryRecipe.runtimeDesignSource.trim()
  ) {
    return geometryRecipe.runtimeDesignSource.trim();
  }

  if (
    typeof execution?.runtimeDesignSource === "string" &&
    execution.runtimeDesignSource.trim()
  ) {
    return execution.runtimeDesignSource.trim();
  }

  return "rule-compiler";
}

function getExecutionRuntimeDesignContract(execution, geometryRecipe = null) {
  if (isRecord(geometryRecipe?.runtimeDesignContract)) {
    return geometryRecipe.runtimeDesignContract;
  }

  if (isRecord(execution?.runtimeDesignContract)) {
    return execution.runtimeDesignContract;
  }

  if (isRecord(geometryRecipe?.structuralBlueprint?.runtimeDesignContract)) {
    return geometryRecipe.structuralBlueprint.runtimeDesignContract;
  }

  if (isRecord(execution?.structuralBlueprint?.runtimeDesignContract)) {
    return execution.structuralBlueprint.runtimeDesignContract;
  }

  return null;
}

function bundleHasCapabilities(bundle, requiredCapabilities) {
  const capabilities = Array.isArray(bundle?.capabilities)
    ? bundle.capabilities.filter((value) => typeof value === "string")
    : [];

  return requiredCapabilities.every((capability) => capabilities.includes(capability));
}

function isHostCoupledChestWrapExecution(execution, geometryRecipe = null) {
  const runtimeDesignContract = getExecutionRuntimeDesignContract(execution, geometryRecipe);
  const requiredCapabilities = ["host-coupled", "chest-wrap"];

  if (runtimeDesignContract?.capabilityClass === "host-coupled-chest-wrap") {
    return true;
  }

  if (
    Array.isArray(runtimeDesignContract?.requiredCapabilities) &&
    requiredCapabilities.every((capability) =>
      runtimeDesignContract.requiredCapabilities.includes(capability),
    )
  ) {
    return true;
  }

  return [
    execution?.capabilityBundle,
    geometryRecipe?.capabilityBundle,
    geometryRecipe?.structuralBlueprint?.capabilityBundle,
    execution?.structuralBlueprint?.capabilityBundle,
  ].some((bundle) => bundleHasCapabilities(bundle, requiredCapabilities));
}

function isChestFrontRuntimeAnchor(anchor) {
  return (
    anchor === "chest-center" ||
    anchor === "chest-left" ||
    anchor === "chest-right"
  );
}

function isHostCoupledChestRigidFrontReadableExecution(
  execution,
  geometryRecipe = null,
) {
  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(execution?.anchor);
  const runtimeDesignContract = getExecutionRuntimeDesignContract(execution, geometryRecipe);
  const requiredCapabilities = ["host-coupled", "front-readable", "rigid-body"];

  if (!isChestFrontRuntimeAnchor(normalizedAnchor)) {
    return false;
  }

  if (
    runtimeDesignContract?.capabilityClass ===
    "host-coupled-chest-rigid-front-readable"
  ) {
    return true;
  }

  if (
    Array.isArray(runtimeDesignContract?.requiredCapabilities) &&
    requiredCapabilities.every((capability) =>
      runtimeDesignContract.requiredCapabilities.includes(capability),
    ) &&
    !runtimeDesignContract.requiredCapabilities.includes("chest-wrap")
  ) {
    return true;
  }

  return [
    execution?.capabilityBundle,
    geometryRecipe?.capabilityBundle,
    geometryRecipe?.structuralBlueprint?.capabilityBundle,
    execution?.structuralBlueprint?.capabilityBundle,
  ].some((bundle) => {
    const capabilities = Array.isArray(bundle?.capabilities)
      ? bundle.capabilities.filter((value) => typeof value === "string")
      : [];

    return (
      requiredCapabilities.every((capability) => capabilities.includes(capability)) &&
      !capabilities.includes("chest-wrap")
    );
  });
}

function isChestRigidCameraFrontReadableTraitRerouted(
  execution,
  geometryRecipe = null,
) {
  if (
    !isHostCoupledChestRigidFrontReadableExecution(execution, geometryRecipe) ||
    getExecutionRuntimeShapeClass(execution, geometryRecipe) !== "camera-charm"
  ) {
    return false;
  }

  const rerouteIdCandidates = [
    getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "capabilityRerouteId"),
    geometryRecipe?.capabilityRerouteId,
    execution?.capabilityRerouteId,
    getExecutionRuntimeDesignContract(execution, geometryRecipe)?.capabilityRerouteId,
  ];
  const rerouteId = rerouteIdCandidates.find(
    (value) => typeof value === "string" && value.trim(),
  );

  if (typeof rerouteId === "string" && rerouteId.trim()) {
    return rerouteId.trim() === "chest-rigid-camera-front-readable-relief";
  }

  return (
    getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "profileVariantId") ===
      "camera-profile-front-readable-relief" ||
    getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "outlineProfile") ===
      "camera-front-readable-relief"
  );
}

function isOpenNounExecution(execution) {
  return (
    typeof execution?.requestedNoun === "string" &&
    execution.requestedNoun.trim().length > 0 &&
    (execution.familyResolutionSource === "open-noun" ||
      (typeof execution.designArchetype === "string" &&
        execution.designArchetype !== "known-family"))
  );
}

function getExecutionCriticalParts(geometryRecipe) {
  return isRecord(geometryRecipe) && Array.isArray(geometryRecipe.criticalParts)
    ? geometryRecipe.criticalParts.filter((value) => typeof value === "string")
    : [];
}

function getHostCoupledChestWrapRecoveryVariantId(
  execution,
  geometryRecipe,
  report,
  currentVariantId,
) {
  if (!isHostCoupledChestWrapExecution(execution, geometryRecipe)) {
    return null;
  }

  const variants = getExecutionBlueprintVariants(execution, geometryRecipe);
  if (variants.length < 2) {
    return null;
  }

  const normalizedCurrentVariantId =
    typeof currentVariantId === "string" ? currentVariantId.trim() : "";
  const repeatedFailureCount =
    typeof report?.repeatedFailureCount === "number" ? report.repeatedFailureCount : 0;
  const detachedTailEvidence =
    Array.isArray(report?.canonicalDetachedPartIds) &&
    report.canonicalDetachedPartIds.some(
      (partId) => typeof partId === "string" && /^(tail-|knot$)/.test(partId),
    );
  const finalReadOrder = Array.isArray(report?.finalReadOrder)
    ? report.finalReadOrder.filter((value) => typeof value === "string")
    : Array.isArray(report?.nounReadOrder)
      ? report.nounReadOrder.filter((value) => typeof value === "string")
      : [];
  const canonicalDominantSpanOwner =
    typeof report?.canonicalDominantSpanOwner === "string"
      ? report.canonicalDominantSpanOwner
      : typeof report?.dominantSpanOwner === "string"
        ? report.dominantSpanOwner
        : "";
  const flattenedPartIds = Array.isArray(report?.canonicalFlattenedPartIds)
    ? report.canonicalFlattenedPartIds.filter((value) => typeof value === "string")
    : Array.isArray(report?.flattenedPartIds)
      ? report.flattenedPartIds.filter((value) => typeof value === "string")
      : [];
  const renderNounFidelity =
    typeof report?.renderNounFidelity === "number"
      ? report.renderNounFidelity
      : typeof report?.nounFidelity === "number"
        ? report.nounFidelity
        : 0;
  const silhouetteReadability =
    typeof report?.silhouetteReadability === "number" ? report.silhouetteReadability : 0;
  const severeFaceIntrusion =
    typeof report?.faceIntrusionSeverity === "number" &&
    report.faceIntrusionSeverity > 0.24;
  const stagnationRecovery =
    report?.stagnationDetected === true ||
    report?.controllerFailureLayer === "stagnation" ||
    report?.controllerDirective === "escalate-capability" ||
    repeatedFailureCount >= 3;
  const chestBarReadabilityStall =
    report?.dominantFailureLayer === "render-readability" &&
    canonicalDominantSpanOwner === "wrap-band" &&
    finalReadOrder.length > 0 &&
    !finalReadOrder.slice(0, 2).includes("knot") &&
    flattenedPartIds.includes("wrap-band") &&
    (
      repeatedFailureCount >= 2 ||
      renderNounFidelity < 0.72 ||
      silhouetteReadability < 0.2
    );
  const contractBreak =
    detachedTailEvidence ||
    severeFaceIntrusion ||
    (
      report?.visualVeto === true &&
      report?.variantSwitchRecommended === true
    );

  if (!stagnationRecovery && !contractBreak && !chestBarReadabilityStall) {
    return null;
  }

  const compactVariant =
    variants.find(
      (variant) =>
        isRecord(variant) &&
        typeof variant.variantId === "string" &&
        variant.variantId === "scarf-knot-compact",
    ) ??
    variants.find(
      (variant) =>
        isRecord(variant) &&
        typeof variant.variantId === "string" &&
        /compact/i.test(variant.variantId),
    ) ??
    null;

  if (
    compactVariant &&
    typeof compactVariant.variantId === "string" &&
    compactVariant.variantId !== normalizedCurrentVariantId
  ) {
    return compactVariant.variantId;
  }

  return null;
}

function getPartSpanTargetsFromValue(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => isRecord(entry) && typeof entry.partId === "string")
    .map((entry) => ({
      partId: entry.partId,
      minShare:
        typeof entry.minShare === "number" ? Number(entry.minShare.toFixed(4)) : 0,
      maxShare:
        typeof entry.maxShare === "number" ? Number(entry.maxShare.toFixed(4)) : 1,
    }));
}

function getPartDepthTargetsFromValue(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => isRecord(entry) && typeof entry.partId === "string")
    .map((entry) => ({
      partId: entry.partId,
      minDepth:
        typeof entry.minDepth === "number" ? Number(entry.minDepth.toFixed(4)) : 0,
      maxDepth:
        typeof entry.maxDepth === "number" ? Number(entry.maxDepth.toFixed(4)) : 1,
    }));
}

function getAttachmentAnchorsFromValue(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry) =>
        isRecord(entry) &&
        typeof entry.anchorId === "string" &&
        typeof entry.partId === "string",
    )
    .map((entry) => ({
      anchorId: entry.anchorId,
      partId: entry.partId,
      parentPartId:
        typeof entry.parentPartId === "string" ? entry.parentPartId : undefined,
      mountFace: typeof entry.mountFace === "string" ? entry.mountFace : "center",
      preferredOffset:
        Array.isArray(entry.preferredOffset) && entry.preferredOffset.length === 3
          ? entry.preferredOffset.map((item) => Number((item ?? 0).toFixed(4)))
          : undefined,
      flushMount: entry.flushMount === true,
      embedDepth:
        typeof entry.embedDepth === "number"
          ? Number(entry.embedDepth.toFixed(4))
          : undefined,
    }));
}

function getSilhouetteKeepoutsFromValue(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => isRecord(entry) && typeof entry.keepoutId === "string")
    .map((entry) => ({
      keepoutId: entry.keepoutId,
      partId: typeof entry.partId === "string" ? entry.partId : undefined,
      behavior:
        entry.behavior === "subordinate" ||
        entry.behavior === "keep-within-root" ||
        entry.behavior === "avoid-face-outline" ||
        entry.behavior === "rooted-only"
          ? entry.behavior
          : "subordinate",
      severity: entry.severity === "hard" ? "hard" : "soft",
    }));
}

function getExecutionBlueprintVariants(execution, geometryRecipe = null) {
  const variants =
    Array.isArray(geometryRecipe?.variantCandidates) && geometryRecipe.variantCandidates.length > 0
      ? geometryRecipe.variantCandidates
      : Array.isArray(execution?.variantCandidates) && execution.variantCandidates.length > 0
        ? execution.variantCandidates
        : [];
  const runtimeShapeClass =
    typeof geometryRecipe?.runtimeShapeClass === "string"
      ? geometryRecipe.runtimeShapeClass
      : typeof execution?.runtimeShapeClass === "string"
        ? execution.runtimeShapeClass
        : "";

  if (
    variants.length === 0 ||
    !isHostCoupledChestRigidFrontReadableExecution(execution, geometryRecipe) ||
    (
      runtimeShapeClass !== "camera-charm" &&
      runtimeShapeClass !== "device-generic-charm"
    )
  ) {
    return variants;
  }

  const filteredVariants = variants.filter((variant) => {
    if (!isRecord(variant) || typeof variant.variantId !== "string") {
      return true;
    }

    const variantText = [
      variant.variantId,
      typeof variant.label === "string" ? variant.label : "",
      typeof variant.silhouetteIntent === "string" ? variant.silhouetteIntent : "",
    ]
      .join(" ")
      .trim();

    return !(/compact/i.test(variantText) || /耳侧/.test(variantText));
  });

  const chestFrontDeviceVariants =
    filteredVariants.length > 0 ? filteredVariants : variants;
  const targetReadOrder = buildFallbackReadOrderTargets(execution, geometryRecipe)
    .filter((value) => typeof value === "string" && value.trim())
    .slice(0, 2);

  if (targetReadOrder.length < 2) {
    return chestFrontDeviceVariants;
  }

  const alignedVariants = chestFrontDeviceVariants.filter((variant) => {
    if (!isRecord(variant) || !Array.isArray(variant.readOrderHints)) {
      return true;
    }

    const hintPrefix = variant.readOrderHints
      .filter((value) => typeof value === "string" && value.trim())
      .slice(0, 2);

    if (hintPrefix.length < 2) {
      return true;
    }

    return (
      hintPrefix[0] === targetReadOrder[0] &&
      hintPrefix[1] === targetReadOrder[1]
    );
  });

  return alignedVariants.length > 0 ? alignedVariants : chestFrontDeviceVariants;
}

function getExecutionVariantId(execution, geometryRecipe = null) {
  if (typeof geometryRecipe?.variantId === "string" && geometryRecipe.variantId.trim()) {
    return geometryRecipe.variantId;
  }

  if (typeof execution?.variantId === "string" && execution.variantId.trim()) {
    return execution.variantId;
  }

  return null;
}

function getActiveBlueprintVariant(execution, geometryRecipe = null) {
  const variantId = getExecutionVariantId(execution, geometryRecipe);
  const variants = getExecutionBlueprintVariants(execution, geometryRecipe);

  if (!variantId || variants.length === 0) {
    return null;
  }

  return (
    variants.find(
      (variant) =>
        isRecord(variant) &&
        typeof variant.variantId === "string" &&
        variant.variantId === variantId,
    ) ?? null
  );
}

function getEffectiveStructuralBlueprintValue(execution, geometryRecipe, key) {
  const variant = getActiveBlueprintVariant(execution, geometryRecipe);

  if (isRecord(variant) && variant[key] !== undefined) {
    return variant[key];
  }

  const structuralBlueprint = isRecord(geometryRecipe?.structuralBlueprint)
    ? geometryRecipe.structuralBlueprint
    : isRecord(execution?.structuralBlueprint)
      ? execution.structuralBlueprint
      : geometryRecipe;

  if (isRecord(structuralBlueprint) && structuralBlueprint[key] !== undefined) {
    return structuralBlueprint[key];
  }

  return undefined;
}

function getStructuralBlueprintPartSpanTargets(execution, geometryRecipe = null) {
  return getPartSpanTargetsFromValue(
    getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "partSpanTargets"),
  );
}

function getStructuralBlueprintPartDepthTargets(execution, geometryRecipe = null) {
  return getPartDepthTargetsFromValue(
    getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "partDepthTargets"),
  );
}

function getStructuralBlueprintAttachmentAnchors(execution, geometryRecipe = null) {
  return getAttachmentAnchorsFromValue(
    getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "attachmentAnchors"),
  );
}

function getStructuralBlueprintSilhouetteKeepouts(execution, geometryRecipe = null) {
  return getSilhouetteKeepoutsFromValue(
    getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "silhouetteKeepouts"),
  );
}

function getStructuralBlueprintDominantSpanOwner(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "dominantSpanOwner");
  return typeof value === "string" ? value : undefined;
}

function getStructuralBlueprintDominantContour(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "dominantContour");
  return typeof value === "string" ? value : undefined;
}

function getStructuralBlueprintSideDepthProfile(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "sideDepthProfile");
  return typeof value === "string" ? value : undefined;
}

function getStructuralBlueprintReadabilityMaterialPolicy(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "readabilityMaterialPolicy",
  );
  return isRecord(value) ? value : undefined;
}

function getStructuralBlueprintCritiqueLightingProfile(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "critiqueLightingProfile",
  );
  return isRecord(value) ? value : undefined;
}

function getStructuralBlueprintDeviceMinReadableSpan(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "deviceMinReadableSpan",
  );
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getStructuralBlueprintBoatMinReadableSpan(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "boatMinReadableSpan",
  );
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getStructuralBlueprintReliefFlushDepth(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "reliefFlushDepth",
  );
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getStructuralBlueprintAttachmentCohesionBudget(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "attachmentCohesionBudget",
  );
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getStructuralBlueprintOutlineCompilerMode(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "outlineCompilerMode",
  );
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getStructuralBlueprintOutlineProjectionVariantId(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "outlineProjectionVariantId",
  );
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getStructuralBlueprintHostFitEnvelope(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "hostFitEnvelope",
  );
  return isRecord(value) ? value : undefined;
}

function isEarSideFrontFacingSymbolExecution(execution, geometryRecipe = null) {
  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(execution?.anchor);

  if (!isEarSideRuntimeAnchor(normalizedAnchor)) {
    return false;
  }

  const mountStrategy = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "mountStrategy",
  );
  const primarySilhouette = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "primarySilhouette",
  );

  return (
    mountStrategy === "ear-side-front-facing" &&
    primarySilhouette === "symbol-badge"
  );
}

export function usesProjectedEarSideAnchorPose(execution, geometryRecipe = null) {
  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(execution?.anchor);

  if (!isEarSideRuntimeAnchor(normalizedAnchor)) {
    return false;
  }

  return (
    isHardSurfaceOpenNounExecution(execution, geometryRecipe) ||
    isEarSideFrontFacingSymbolExecution(execution, geometryRecipe)
  );
}

function getHardSurfaceMinReadableSpan(execution, geometryRecipe = null) {
  const familyPolicyId = getHardSurfaceFamilyPolicyId(execution, geometryRecipe);

  if (familyPolicyId === "hard-surface-device") {
    return getStructuralBlueprintDeviceMinReadableSpan(execution, geometryRecipe) ?? 0.05;
  }

  if (familyPolicyId === "hard-surface-boat") {
    return getStructuralBlueprintBoatMinReadableSpan(execution, geometryRecipe) ?? 0.052;
  }

  return undefined;
}

function getRuntimeRootSpanMeasure(partBlueprints, geometryRecipe = null) {
  if (!Array.isArray(partBlueprints) || partBlueprints.length === 0) {
    return 0;
  }

  const rootPartId =
    typeof geometryRecipe?.assemblyRootPartId === "string"
      ? geometryRecipe.assemblyRootPartId
      : typeof partBlueprints[0]?.partId === "string"
        ? partBlueprints[0].partId
        : null;
  const rootPart =
    (rootPartId
      ? partBlueprints.find((part) => isRecord(part) && part.partId === rootPartId)
      : null) ?? partBlueprints[0];

  return getPartSpanMeasure(rootPart);
}

export function getHardSurfaceReadabilityMaterialPolicy(execution, geometryRecipe = null) {
  if (
    !isHardSurfaceOpenNounExecution(execution, geometryRecipe) &&
    !isHostCoupledChestWrapExecution(execution, geometryRecipe)
  ) {
    return undefined;
  }

  return getStructuralBlueprintReadabilityMaterialPolicy(execution, geometryRecipe);
}

export function getHardSurfaceCritiqueLightingProfile(execution, geometryRecipe = null) {
  if (
    !isHardSurfaceOpenNounExecution(execution, geometryRecipe) &&
    !isHostCoupledChestWrapExecution(execution, geometryRecipe)
  ) {
    return undefined;
  }

  return getStructuralBlueprintCritiqueLightingProfile(execution, geometryRecipe);
}

function getRepairActionIntensity(repairActions, actionType) {
  if (!Array.isArray(repairActions)) {
    return 0;
  }

  return repairActions.reduce((maxValue, action) => {
    if (!isRecord(action) || action.actionType !== actionType) {
      return maxValue;
    }

    return Math.max(
      maxValue,
      typeof action.intensity === "number" ? action.intensity : 0.5,
    );
  }, 0);
}

function usesStructuralAttachmentPrecision(execution, geometryRecipe = null) {
  return (
    isHardSurfaceOpenNounExecution(execution, geometryRecipe) ||
    isHostCoupledChestWrapExecution(execution, geometryRecipe)
  );
}

export function getCapabilityRootEmbedStrength(
  execution,
  geometryRecipe,
  partId,
  parentPartId,
  rootPartId,
  repairActions = [],
) {
  if (!isHostCoupledChestWrapExecution(execution, geometryRecipe)) {
    return 0;
  }

  if (typeof partId !== "string" || typeof parentPartId !== "string") {
    return 0;
  }

  const tightenCohesionIntensity = getRepairActionIntensity(
    repairActions,
    "tighten-cohesion",
  );
  const reParentIntensity = getRepairActionIntensity(
    repairActions,
    "re-parent-part",
  );
  const rebuildFromRootIntensity = getRepairActionIntensity(
    repairActions,
    "rebuild-from-root",
  );
  const targetedPartIds = uniqueStrings(
    Array.isArray(repairActions)
      ? repairActions.flatMap((action) =>
          isRecord(action) &&
          (
            action.actionType === "tighten-cohesion" ||
            action.actionType === "re-parent-part" ||
            action.actionType === "rebuild-from-root"
          ) &&
          Array.isArray(action.targetPartIds)
            ? action.targetPartIds.filter((value) => typeof value === "string")
            : [],
        )
      : [],
  );
  const directTailToKnot =
    parentPartId === "knot" &&
    (partId === "tail-left" || partId === "tail-right");
  const directKnotToRoot =
    partId === "knot" &&
    parentPartId === (typeof rootPartId === "string" ? rootPartId : "wrap-band");

  if (!directTailToKnot && !directKnotToRoot) {
    return 0;
  }

  const activation = Math.max(
    reParentIntensity,
    tightenCohesionIntensity * (directTailToKnot ? 1 : 0.72),
    rebuildFromRootIntensity * (directTailToKnot ? 0.74 : 0.52),
  );

  if (activation <= 0) {
    return 0;
  }

  const targeted =
    targetedPartIds.includes(partId) || targetedPartIds.includes(parentPartId);
  if (!targeted && rebuildFromRootIntensity < 0.78) {
    return 0;
  }

  const baseStrength = directTailToKnot ? 0.16 : 0.08;
  const boostStrength =
    activation * (directTailToKnot ? 0.22 : 0.14) + (targeted ? 0.08 : 0);

  return Number(
    Math.min(directTailToKnot ? 0.42 : 0.28, baseStrength + boostStrength).toFixed(4),
  );
}

export function getCapabilityPlacementRecoveryOffset(
  execution,
  geometryRecipe,
  repairActions = [],
) {
  const chestWrapExecution = isHostCoupledChestWrapExecution(execution, geometryRecipe);
  const chestRigidExecution = isHostCoupledChestRigidFrontReadableExecution(
    execution,
    geometryRecipe,
  );

  if (!chestWrapExecution && !chestRigidExecution) {
    return [0, 0, 0];
  }

  const reAnchorIntensity = getRepairActionIntensity(repairActions, "re-anchor");
  const rebuildFromRootIntensity = getRepairActionIntensity(
    repairActions,
    "rebuild-from-root",
  );
  const reParentIntensity = getRepairActionIntensity(
    repairActions,
    "re-parent-part",
  );
  const tightenCohesionIntensity = getRepairActionIntensity(
    repairActions,
    "tighten-cohesion",
  );
  const recoveryIntensity = Math.max(
    reAnchorIntensity,
    rebuildFromRootIntensity * 0.82,
    reParentIntensity * 0.76,
    tightenCohesionIntensity * 0.62,
  );

  if (recoveryIntensity <= (chestRigidExecution ? 0.32 : 0.45)) {
    return [0, 0, 0];
  }

  const currentVariantId = getExecutionVariantId(execution, geometryRecipe) ?? "";
  const compactRecovery = /compact/i.test(currentVariantId);
  const hostFitEnvelope = getStructuralBlueprintHostFitEnvelope(
    execution,
    geometryRecipe,
  );
  const faceIntrusionBudget =
    typeof hostFitEnvelope?.faceIntrusionBudget === "number"
      ? hostFitEnvelope.faceIntrusionBudget
      : 0.08;
  const faceTightness = clamp01((0.14 - faceIntrusionBudget) / 0.08);
  const recoveryBoost = clamp01(
    recoveryIntensity * (compactRecovery ? 1 : 0.88) + faceTightness * 0.34,
  );

  if (chestRigidExecution) {
    const chestRigidCameraReliefTrait = isChestRigidCameraFrontReadableTraitRerouted(
      execution,
      geometryRecipe,
    );
    const normalizedAnchor = normalizeRuntimeAccessoryAnchor(execution.anchor);
    const side = normalizedAnchor === "chest-left" ? 1 : normalizedAnchor === "chest-right" ? -1 : 0;
    const adjustedRecoveryBoost = clamp01(
      recoveryBoost + (chestRigidCameraReliefTrait ? faceTightness * 0.1 : 0),
    );

    return [
      Number(
        (
          (chestRigidCameraReliefTrait ? 0.0006 : 0.0008) *
          side *
          adjustedRecoveryBoost
        ).toFixed(4),
      ),
      Number(
        (
          -(
            (chestRigidCameraReliefTrait ? 0.0042 : 0.0034) +
            faceTightness * (chestRigidCameraReliefTrait ? 0.0022 : 0.0016) +
            adjustedRecoveryBoost * (chestRigidCameraReliefTrait ? 0.0056 : 0.0046)
          )
        ).toFixed(4),
      ),
      Number(
        (
          -(
            (chestRigidCameraReliefTrait ? 0.0044 : 0.0032) +
            faceTightness * (chestRigidCameraReliefTrait ? 0.0024 : 0.0018) +
            adjustedRecoveryBoost * (chestRigidCameraReliefTrait ? 0.0054 : 0.0042)
          )
        ).toFixed(4),
      ),
    ];
  }

  return [
    0,
    Number(
      (
        -(
          0.003 +
          faceTightness * 0.0018 +
          recoveryBoost * (compactRecovery ? 0.0088 : 0.007)
        )
      ).toFixed(4),
    ),
    Number(
      (
        -(
          0.002 +
          faceTightness * 0.0016 +
          recoveryBoost * (compactRecovery ? 0.0054 : 0.0042)
        )
      ).toFixed(4),
    ),
  ];
}

export function normalizeRuntimeAccessoryAnchor(anchor, fallback = "chest-center") {
  if (anchor === "head") {
    return "forehead";
  }

  if (anchor === "chest") {
    return "chest-center";
  }

  return typeof anchor === "string" && supportedRuntimeAccessoryAnchors.has(anchor)
    ? anchor
    : fallback;
}

function isHardSurfaceRuntimeShapeClass(shapeClass) {
  return [
    "camera-charm",
    "boat-charm",
    "rocket-charm",
    "device-generic-charm",
    "vehicle-generic-charm",
  ].includes(shapeClass);
}

function getExecutionBlueprintFamily(execution, geometryRecipe = null) {
  if (
    isRecord(geometryRecipe) &&
    typeof geometryRecipe.blueprintFamily === "string" &&
    geometryRecipe.blueprintFamily.trim()
  ) {
    return geometryRecipe.blueprintFamily.trim();
  }

  if (
    typeof execution?.blueprintFamily === "string" &&
    execution.blueprintFamily.trim()
  ) {
    return execution.blueprintFamily.trim();
  }

  return undefined;
}

function getHardSurfaceBlueprintFamilyPolicyId(execution, geometryRecipe = null) {
  const blueprintFamily = getExecutionBlueprintFamily(execution, geometryRecipe);

  if (blueprintFamily === "hard-surface-device") {
    return "hard-surface-device";
  }

  if (blueprintFamily === "hard-surface-boat") {
    return "hard-surface-boat";
  }

  if (blueprintFamily === "hard-surface-vehicle") {
    return "hard-surface-vehicle";
  }

  return undefined;
}

export function isHardSurfaceOpenNounExecution(execution, geometryRecipe = null) {
  if (!isOpenNounExecution(execution)) {
    return false;
  }

  return typeof getHardSurfaceFamilyPolicyId(execution, geometryRecipe) === "string";
}

export function hasPlannerBackedRuntimeContract(execution, geometryRecipe = null) {
  const source = getExecutionRuntimeDesignSource(execution, geometryRecipe);
  return source === "ai-planner" || source === "hybrid";
}

export function hasConcretePlannerBackedRuntimeContract(
  execution,
  geometryRecipe = null,
) {
  if (!hasPlannerBackedRuntimeContract(execution, geometryRecipe)) {
    return false;
  }

  const runtimeDesignContract = getExecutionRuntimeDesignContract(
    execution,
    geometryRecipe,
  );

  if (!isRecord(runtimeDesignContract)) {
    return false;
  }

  return Boolean(
    (typeof runtimeDesignContract.capabilityClass === "string" &&
      runtimeDesignContract.capabilityClass.trim()) ||
      (Array.isArray(runtimeDesignContract.requiredCapabilities) &&
        runtimeDesignContract.requiredCapabilities.length > 0) ||
      (Array.isArray(runtimeDesignContract.requiredVisibleParts) &&
        runtimeDesignContract.requiredVisibleParts.length > 0) ||
      (typeof runtimeDesignContract.primaryReadTarget === "string" &&
        runtimeDesignContract.primaryReadTarget.trim()),
  );
}

export function usesOpenNounDiscoveryPolicy(execution, geometryRecipe = null) {
  return (
    isOpenNounExecution(execution) &&
    !hasConcretePlannerBackedRuntimeContract(execution, geometryRecipe)
  );
}

export function isDeviceFamilyRuntimeAccessory(family) {
  return family === "camera-charm" || family === "device-generic-charm";
}

export function getHardSurfaceFamilyPolicyId(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "familyPolicyId");
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  const blueprintFamilyPolicyId = getHardSurfaceBlueprintFamilyPolicyId(
    execution,
    geometryRecipe,
  );
  if (typeof blueprintFamilyPolicyId === "string") {
    return blueprintFamilyPolicyId;
  }

  const shapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  if (shapeClass === "camera-charm" || shapeClass === "device-generic-charm") {
    return "hard-surface-device";
  }

  if (shapeClass === "boat-charm") {
    return "hard-surface-boat";
  }

  if (shapeClass === "rocket-charm" || shapeClass === "vehicle-generic-charm") {
    return "hard-surface-vehicle";
  }

  return undefined;
}

export function getHardSurfaceRepresentationMode(execution, geometryRecipe = null) {
  const value = getEffectiveStructuralBlueprintValue(
    execution,
    geometryRecipe,
    "representationMode",
  );
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  const familyPolicyId = getHardSurfaceFamilyPolicyId(execution, geometryRecipe);
  if (familyPolicyId === "hard-surface-device" || familyPolicyId === "hard-surface-boat") {
    return "profile-relief-2_5d";
  }

  return "primitive-parts";
}

export function getHardSurfaceOutlineCompilerMode(execution, geometryRecipe = null) {
  const value = getStructuralBlueprintOutlineCompilerMode(execution, geometryRecipe);
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  const familyPolicyId = getHardSurfaceFamilyPolicyId(execution, geometryRecipe);
  if (familyPolicyId === "hard-surface-device") {
    return "device-front-facing";
  }

  if (familyPolicyId === "hard-surface-boat" || familyPolicyId === "hard-surface-vehicle") {
    return "vehicle-upright-outline";
  }

  if (getHardSurfaceRepresentationMode(execution, geometryRecipe) === "profile-relief-2_5d") {
    return "generic-profile-relief";
  }

  return undefined;
}

export function getHardSurfaceOutlineProjectionVariantId(execution, geometryRecipe = null) {
  return (
    getStructuralBlueprintOutlineProjectionVariantId(execution, geometryRecipe) ??
    getExecutionVariantId(execution, geometryRecipe) ??
    getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "profileVariantId") ??
    getEffectiveStructuralBlueprintValue(execution, geometryRecipe, "outlineProfile")
  );
}

function isCompactHardSurfaceDeviceProjectionVariant(execution, geometryRecipe = null) {
  const familyPolicyId = getHardSurfaceFamilyPolicyId(execution, geometryRecipe);
  const variantId = getHardSurfaceOutlineProjectionVariantId(execution, geometryRecipe);

  return familyPolicyId === "hard-surface-device" && /compact/i.test(String(variantId ?? ""));
}

function getExecutionRefinementStage(passIndex, targetPassCount) {
  if (targetPassCount <= 1) {
    return "blocking";
  }

  const progress = clamp01((passIndex - 1) / Math.max(1, targetPassCount - 1));

  if (progress <= 0.08) {
    return "blocking";
  }

  if (progress <= 0.24) {
    return "silhouette-forming";
  }

  if (progress <= 0.44) {
    return "assembly-rooting";
  }

  if (progress <= 0.62) {
    return "host-fit";
  }

  if (progress <= 0.84) {
    return "render-driven-rebuild";
  }

  return "final-review";
}

export function getHardSurfaceHostFitScaleClamp(
  execution,
  geometryRecipe,
  refinementStage,
  progress,
  repairActions = [],
) {
  const chestWrapExecution = isHostCoupledChestWrapExecution(
    execution,
    geometryRecipe,
  );
  const chestRigidExecution = isHostCoupledChestRigidFrontReadableExecution(
    execution,
    geometryRecipe,
  );
  const projectedSymbolBadgeExecution = isEarSideFrontFacingSymbolExecution(
    execution,
    geometryRecipe,
  );

  if (
    !chestWrapExecution &&
    !chestRigidExecution &&
    !isHardSurfaceOpenNounExecution(execution, geometryRecipe) &&
    !projectedSymbolBadgeExecution
  ) {
    return 1;
  }

  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(execution.anchor);
  const isChestAnchor = isChestFrontRuntimeAnchor(normalizedAnchor);

  if (chestWrapExecution) {
    if (!isChestAnchor) {
      return 1;
    }

    const hostFitEnvelope = getStructuralBlueprintHostFitEnvelope(
      execution,
      geometryRecipe,
    );
    const faceIntrusionBudget =
      typeof hostFitEnvelope?.faceIntrusionBudget === "number"
        ? hostFitEnvelope.faceIntrusionBudget
        : 0.08;
    const faceTightness = clamp01((0.14 - faceIntrusionBudget) / 0.08);
    const reAnchorIntensity = getRepairActionIntensity(repairActions, "re-anchor");
    const rebuildIntensity = getRepairActionIntensity(
      repairActions,
      "rebuild-from-root",
    );
    const tightenCohesionIntensity = Math.max(
      getRepairActionIntensity(repairActions, "tighten-cohesion"),
      getRepairActionIntensity(repairActions, "re-parent-part"),
    );
    const readabilityLiftIntensity = Math.max(
      getRepairActionIntensity(repairActions, "promote-critical-part"),
      getRepairActionIntensity(repairActions, "re-materialize-color-zone") * 0.76,
      getRepairActionIntensity(repairActions, "reshape-silhouette") * 0.42,
    );
    const hostFitCompression = clamp01(
      faceTightness * 0.32 +
        reAnchorIntensity * 0.3 +
        rebuildIntensity * 0.26 +
        tightenCohesionIntensity * 0.18,
    );
    const stageBias =
      refinementStage === "blocking"
        ? 1
        : refinementStage === "silhouette-forming"
          ? 0.992
          : refinementStage === "assembly-rooting"
            ? 0.982
            : refinementStage === "host-fit"
              ? 0.97
              : refinementStage === "render-driven-rebuild"
                ? 0.966
                : 0.96;
    const progressBias = lerpNumber(0.996, 0.972, progress);
    const readabilityRelief = 1 + readabilityLiftIntensity * 0.022;

    return Number(
      (
        stageBias *
        progressBias *
        readabilityRelief *
        (1 - hostFitCompression * 0.058)
      ).toFixed(4),
    );
  }

  if (chestRigidExecution) {
    if (!isChestAnchor) {
      return 1;
    }

    const chestRigidCameraReliefTrait = isChestRigidCameraFrontReadableTraitRerouted(
      execution,
      geometryRecipe,
    );
    const hostFitEnvelope = getStructuralBlueprintHostFitEnvelope(
      execution,
      geometryRecipe,
    );
    const faceIntrusionBudget =
      typeof hostFitEnvelope?.faceIntrusionBudget === "number"
        ? hostFitEnvelope.faceIntrusionBudget
        : chestRigidCameraReliefTrait
          ? 0.036
          : 0.04;
    const faceTightness = chestRigidCameraReliefTrait
      ? clamp01((0.1 - faceIntrusionBudget) / 0.08)
      : clamp01((0.12 - faceIntrusionBudget) / 0.06);
    const reAnchorIntensity = getRepairActionIntensity(repairActions, "re-anchor");
    const rebuildIntensity = getRepairActionIntensity(
      repairActions,
      "rebuild-from-root",
    );
    const tightenCohesionIntensity = Math.max(
      getRepairActionIntensity(repairActions, "tighten-cohesion"),
      getRepairActionIntensity(repairActions, "re-parent-part"),
    );
    const readabilityLiftIntensity = Math.max(
      getRepairActionIntensity(repairActions, "promote-critical-part"),
      getRepairActionIntensity(repairActions, "re-materialize-color-zone") *
        (chestRigidCameraReliefTrait ? 0.72 : 0.82),
      getRepairActionIntensity(repairActions, "reshape-silhouette") *
        (chestRigidCameraReliefTrait ? 0.44 : 0.54),
    );
    const hostFitCompression = clamp01(
      faceTightness * (chestRigidCameraReliefTrait ? 0.22 : 0.16) +
        reAnchorIntensity * (chestRigidCameraReliefTrait ? 0.28 : 0.24) +
        rebuildIntensity * (chestRigidCameraReliefTrait ? 0.22 : 0.18) +
        tightenCohesionIntensity * (chestRigidCameraReliefTrait ? 0.16 : 0.12),
    );
    const stageBias = chestRigidCameraReliefTrait
      ? refinementStage === "blocking"
        ? 1.04
        : refinementStage === "silhouette-forming"
          ? 1.05
          : refinementStage === "assembly-rooting"
            ? 1.03
            : refinementStage === "host-fit"
              ? 1.028
              : refinementStage === "render-driven-rebuild"
                ? 1.016
                : 1.008
      : refinementStage === "blocking"
        ? 1.08
        : refinementStage === "silhouette-forming"
          ? 1.1
          : refinementStage === "assembly-rooting"
            ? 1.08
            : refinementStage === "host-fit"
              ? 1.04
              : refinementStage === "render-driven-rebuild"
                ? 1.02
                : 1.01;
    const progressBias = chestRigidCameraReliefTrait
      ? lerpNumber(1.022, 0.998, progress)
      : lerpNumber(1.06, 1, progress);
    const readabilityRelief =
      1 + readabilityLiftIntensity * (chestRigidCameraReliefTrait ? 0.038 : 0.06);

    return Number(
      (
        stageBias *
        progressBias *
        readabilityRelief *
        (1 - hostFitCompression * (chestRigidCameraReliefTrait ? 0.072 : 0.06))
      ).toFixed(4),
    );
  }

  if (normalizedAnchor !== "left-ear" && normalizedAnchor !== "right-ear") {
    return 1;
  }

  const familyPolicyId = getHardSurfaceFamilyPolicyId(execution, geometryRecipe);
  const isDeviceFamily = familyPolicyId === "hard-surface-device";
  const isBoatFamily = familyPolicyId === "hard-surface-boat";
  const isProjectedSymbolFamily =
    projectedSymbolBadgeExecution && !isDeviceFamily && !isBoatFamily;
  const reAnchorIntensity = getRepairActionIntensity(repairActions, "re-anchor");
  const rebuildIntensity = getRepairActionIntensity(repairActions, "rebuild-from-root");
  const readabilityLiftIntensity = Math.max(
    getRepairActionIntensity(repairActions, "promote-critical-part"),
    getRepairActionIntensity(repairActions, "re-materialize-color-zone"),
    getRepairActionIntensity(repairActions, "reshape-silhouette") * 0.58,
  );
  const readabilityScaleBias =
    1 +
    readabilityLiftIntensity *
      (isDeviceFamily ? 0.08 : isBoatFamily ? 0.06 : isProjectedSymbolFamily ? 0.03 : 0);
  const reAnchorPenaltyStrength =
    1 -
    readabilityLiftIntensity *
      (isDeviceFamily ? 0.42 : isBoatFamily ? 0.24 : isProjectedSymbolFamily ? 0.2 : 0.16);
  const rebuildPenaltyStrength =
    1 -
    readabilityLiftIntensity *
      (isDeviceFamily ? 0.36 : isBoatFamily ? 0.18 : isProjectedSymbolFamily ? 0.14 : 0.12);

  return Number(
    (
      lerpNumber(
        isDeviceFamily ? 0.78 : isBoatFamily ? 0.96 : isProjectedSymbolFamily ? 0.86 : 0.74,
        isDeviceFamily ? 0.88 : isBoatFamily ? 1.08 : isProjectedSymbolFamily ? 0.94 : 0.88,
        progress,
      ) *
      (refinementStage === "host-fit" || refinementStage === "final-review"
        ? isDeviceFamily
          ? 0.97
          : isBoatFamily
            ? 1.04
            : isProjectedSymbolFamily
              ? 0.92
            : 0.94
        : isDeviceFamily
          ? 0.95
          : isBoatFamily
            ? 1.02
            : isProjectedSymbolFamily
              ? 0.95
            : 0.96) *
      readabilityScaleBias *
      (1 -
        reAnchorIntensity *
          (isDeviceFamily ? 0.06 : isBoatFamily ? 0.03 : isProjectedSymbolFamily ? 0.05 : 0.08) *
          reAnchorPenaltyStrength) *
      (1 -
        rebuildIntensity *
          (isDeviceFamily ? 0.05 : isBoatFamily ? 0.02 : isProjectedSymbolFamily ? 0.04 : 0.06) *
          rebuildPenaltyStrength)
    ).toFixed(4),
  );
}

export function getHardSurfaceHostFitOffset(execution, geometryRecipe, refinementStage) {
  const chestWrapExecution = isHostCoupledChestWrapExecution(
    execution,
    geometryRecipe,
  );
  const chestRigidExecution = isHostCoupledChestRigidFrontReadableExecution(
    execution,
    geometryRecipe,
  );

  if (
    !chestWrapExecution &&
    !chestRigidExecution &&
    !isHardSurfaceOpenNounExecution(execution, geometryRecipe)
  ) {
    return [0, 0, 0];
  }

  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(execution.anchor);
  const isChestAnchor = isChestFrontRuntimeAnchor(normalizedAnchor);
  if (chestWrapExecution && isChestAnchor) {
    const hostFitEnvelope = getStructuralBlueprintHostFitEnvelope(
      execution,
      geometryRecipe,
    );
    const faceIntrusionBudget =
      typeof hostFitEnvelope?.faceIntrusionBudget === "number"
        ? hostFitEnvelope.faceIntrusionBudget
        : 0.08;
    const faceTightness = clamp01((0.14 - faceIntrusionBudget) / 0.08);
    const stageBoost =
      refinementStage === "host-fit" || refinementStage === "final-review"
        ? 1
        : refinementStage === "render-driven-rebuild"
          ? 0.92
          : refinementStage === "assembly-rooting"
            ? 0.84
            : 0.72;

    return [
      0,
      Number((-(0.0014 + faceTightness * 0.0018) * stageBoost).toFixed(4)),
      Number((-(0.0024 + faceTightness * 0.0024) * stageBoost).toFixed(4)),
    ];
  }

  if (chestRigidExecution && isChestAnchor) {
    const chestRigidCameraReliefTrait = isChestRigidCameraFrontReadableTraitRerouted(
      execution,
      geometryRecipe,
    );
    const hostFitEnvelope = getStructuralBlueprintHostFitEnvelope(
      execution,
      geometryRecipe,
    );
    const faceIntrusionBudget =
      typeof hostFitEnvelope?.faceIntrusionBudget === "number"
        ? hostFitEnvelope.faceIntrusionBudget
        : chestRigidCameraReliefTrait
          ? 0.036
          : 0.04;
    const faceTightness = chestRigidCameraReliefTrait
      ? clamp01((0.1 - faceIntrusionBudget) / 0.08)
      : clamp01((0.12 - faceIntrusionBudget) / 0.06);
    const side = normalizedAnchor === "chest-left" ? 1 : normalizedAnchor === "chest-right" ? -1 : 0;
    const stageBoost = chestRigidCameraReliefTrait
      ? refinementStage === "host-fit" || refinementStage === "final-review"
        ? 1.04
        : refinementStage === "render-driven-rebuild"
          ? 0.98
          : refinementStage === "assembly-rooting"
            ? 0.92
            : 0.82
      : refinementStage === "host-fit" || refinementStage === "final-review"
        ? 1
        : refinementStage === "render-driven-rebuild"
          ? 0.94
          : refinementStage === "assembly-rooting"
            ? 0.86
            : 0.76;

    return [
      Number(((chestRigidCameraReliefTrait ? 0.0004 : 0.0006) * side * stageBoost).toFixed(4)),
      Number(
        (
          -(
            (chestRigidCameraReliefTrait ? 0.0026 : 0.0016) +
            faceTightness * (chestRigidCameraReliefTrait ? 0.0018 : 0.0012)
          ) *
          stageBoost
        ).toFixed(4),
      ),
      Number(
        (
          -(
            (chestRigidCameraReliefTrait ? 0.0048 : 0.0032) +
            faceTightness * (chestRigidCameraReliefTrait ? 0.0028 : 0.0022)
          ) *
          stageBoost
        ).toFixed(4),
      ),
    ];
  }

  const side = normalizedAnchor === "left-ear" ? 1 : normalizedAnchor === "right-ear" ? -1 : 0;
  const familyPolicyId = getHardSurfaceFamilyPolicyId(execution, geometryRecipe);
  const isDeviceFamily = familyPolicyId === "hard-surface-device";
  const isBoatFamily = familyPolicyId === "hard-surface-boat";
  const stageBoost =
    refinementStage === "host-fit" || refinementStage === "final-review"
      ? isDeviceFamily
        ? 1.02
        : isBoatFamily
          ? 0.98
          : 1.16
      : 1;

  if (normalizedAnchor === "left-ear" || normalizedAnchor === "right-ear") {
    if (isDeviceFamily) {
      return [
        Number((0.006 * side * stageBoost).toFixed(4)),
        Number((0.0007 * stageBoost).toFixed(4)),
        Number((0.0038 * stageBoost).toFixed(4)),
      ];
    }

    if (isBoatFamily) {
      return [
        Number((0.0034 * side * stageBoost).toFixed(4)),
        Number((0.0008 * stageBoost).toFixed(4)),
        Number((0.0028 * stageBoost).toFixed(4)),
      ];
    }

    return [
      Number((0.0046 * side * stageBoost).toFixed(4)),
      Number((0.0026 * stageBoost).toFixed(4)),
      Number((0.0038 * stageBoost).toFixed(4)),
    ];
  }

  return [0, 0, 0];
}

export function getHardSurfaceEarAxisScaleClamp(
  execution,
  geometryRecipe,
  refinementStage,
  repairActions = [],
  partProfile = null,
) {
  if (!isHardSurfaceOpenNounExecution(execution, geometryRecipe)) {
    return [1, 1, 1];
  }

  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(execution.anchor);

  if (normalizedAnchor !== "left-ear" && normalizedAnchor !== "right-ear") {
    return [1, 1, 1];
  }

  const hostFitWeight =
    typeof partProfile?.hostFitWeight === "number"
      ? clamp01(partProfile.hostFitWeight)
      : 0.78;
  const reAnchorIntensity = getRepairActionIntensity(repairActions, "re-anchor");
  const rebuildIntensity = getRepairActionIntensity(repairActions, "rebuild-from-root");
  const tightenCohesionIntensity = getRepairActionIntensity(
    repairActions,
    "tighten-cohesion",
  );
  const readabilityLiftIntensity = Math.max(
    getRepairActionIntensity(repairActions, "promote-critical-part"),
    getRepairActionIntensity(repairActions, "re-materialize-color-zone"),
  );
  const stageStrength =
    refinementStage === "host-fit" || refinementStage === "final-review" ? 1 : 0.84;
  const structuralStrength = clamp01(
    0.52 +
      hostFitWeight * 0.38 +
      reAnchorIntensity * 0.16 +
      rebuildIntensity * 0.2 +
      tightenCohesionIntensity * 0.1,
  );
  const familyPolicyId = getHardSurfaceFamilyPolicyId(execution, geometryRecipe);
  const deviceFamily = familyPolicyId === "hard-surface-device";
  const boatFamily = familyPolicyId === "hard-surface-boat";
  const compactDeviceProjectionVariant = isCompactHardSurfaceDeviceProjectionVariant(
    execution,
    geometryRecipe,
  );
  const xTarget =
    refinementStage === "host-fit" || refinementStage === "final-review"
      ? deviceFamily
        ? compactDeviceProjectionVariant
          ? 0.86
          : 0.9
        : boatFamily
          ? 0.98
          : 0.72
      : deviceFamily
        ? 0.94
        : boatFamily
          ? 1
          : 0.84;
  const yTarget =
    refinementStage === "host-fit" || refinementStage === "final-review"
      ? deviceFamily
        ? compactDeviceProjectionVariant
          ? 0.9
          : 1
        : boatFamily
          ? 1
          : 0.88
      : deviceFamily
        ? 1.02
        : boatFamily
          ? 1
          : 0.94;
  const zTarget =
    refinementStage === "host-fit" || refinementStage === "final-review"
      ? deviceFamily
        ? compactDeviceProjectionVariant
          ? 0.96
          : 0.92
        : boatFamily
          ? 1.04
          : 0.92
      : deviceFamily
        ? 0.96
        : boatFamily
          ? 1.02
          : 0.96;
  const blend = clamp01(structuralStrength * stageStrength);
  const readabilityBias =
    1 + readabilityLiftIntensity * (deviceFamily ? 0.08 : boatFamily ? 0.05 : 0.03);

  return [
    Number((lerpNumber(1, xTarget, blend) * readabilityBias).toFixed(4)),
    Number((lerpNumber(1, yTarget, blend * 0.78) * (1 + readabilityLiftIntensity * 0.03)).toFixed(4)),
    Number((lerpNumber(1, zTarget, blend * 0.72) * readabilityBias).toFixed(4)),
  ];
}

export function estimateRuntimePartSpan(part) {
  if (!isRecord(part)) {
    return [0, 0, 0];
  }

  const size =
    typeof part.size === "number" && Number.isFinite(part.size) ? part.size : 0.02;
  const scale = Array.isArray(part.scale) ? part.scale : [1, 1, 1];

  return [0, 1, 2].map((axis) =>
    Number((Math.max(0.0001, Math.abs(scale[axis] ?? 1)) * size).toFixed(4)),
  );
}

export function computeRuntimePartBounds(partBlueprints) {
  if (!Array.isArray(partBlueprints) || partBlueprints.length === 0) {
    return null;
  }

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (const part of partBlueprints) {
    const location = Array.isArray(part?.location) ? part.location : [0, 0, 0];
    const span = estimateRuntimePartSpan(part);

    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], (location[axis] ?? 0) - span[axis]);
      max[axis] = Math.max(max[axis], (location[axis] ?? 0) + span[axis]);
    }
  }

  return {
    min: roundVector(min),
    max: roundVector(max),
    span: [0, 1, 2].map((axis) =>
      Number((Math.max(0, (max[axis] ?? 0) - (min[axis] ?? 0))).toFixed(4)),
    ),
  };
}

function getChestWrapCompactEnvelopeTargetSpan(execution, geometryRecipe) {
  const hostFitEnvelope = getStructuralBlueprintHostFitEnvelope(execution, geometryRecipe);
  const preferredSpan = Array.isArray(hostFitEnvelope?.anchorEnvelope)
    ? hostFitEnvelope.anchorEnvelope
    : [0.04, 0.015, 0.028];
  const maxSpan = Array.isArray(hostFitEnvelope?.maxSpan)
    ? hostFitEnvelope.maxSpan
    : [0.048, 0.017, 0.034];
  const faceIntrusionBudget =
    typeof hostFitEnvelope?.faceIntrusionBudget === "number"
      ? hostFitEnvelope.faceIntrusionBudget
      : 0.08;
  const faceTightness = clamp01((0.14 - faceIntrusionBudget) / 0.08);
  const stageTargetBlend = [0.24, 0.36, 0.28];
  const faceTightnessPenalty = [0.12, 0.08, 0.14];

  return [0, 1, 2].map((axis) => {
    const preferred = Math.abs(preferredSpan[axis] ?? [0.04, 0.015, 0.028][axis]);
    const maximum = Math.abs(maxSpan[axis] ?? preferred);
    const blend = clamp01(stageTargetBlend[axis] - faceTightness * faceTightnessPenalty[axis]);
    const target = lerpNumber(preferred, maximum, blend);
    return Number(
      clampNumber(target, preferred * 0.92, maximum).toFixed(4),
    );
  });
}

function getChestWrapCompactEnvelopeInfluence(partId, rootPartId) {
  if (partId === rootPartId || partId === "wrap-band") {
    return {
      scale: [0.34, 0.42, 0.26],
      offset: [0, 0, 0],
    };
  }

  if (partId === "knot") {
    return {
      scale: [0.94, 0.82, 1],
      offset: [0.72, 0.58, 0.9],
    };
  }

  if (partId === "tail-left" || partId === "tail-right") {
    return {
      scale: [0.78, 0.64, 0.92],
      offset: [0.86, 0.54, 0.94],
    };
  }

  if (partId === "tail-fold-left" || partId === "tail-fold-right") {
    return {
      scale: [0.62, 0.48, 0.74],
      offset: [0.74, 0.48, 0.82],
    };
  }

  return {
    scale: [0.44, 0.42, 0.5],
    offset: [0.52, 0.42, 0.56],
  };
}

function rebuildExpectedParentOffsets(partBlueprints) {
  const locationByPartId = new Map(
    partBlueprints
      .filter((part) => typeof part?.partId === "string" && Array.isArray(part.location))
      .map((part) => [part.partId, part.location]),
  );

  return partBlueprints.map((part) => {
    const parentLocation =
      typeof part?.parentPartId === "string"
        ? locationByPartId.get(part.parentPartId)
        : null;

    if (!Array.isArray(part?.location) || !Array.isArray(parentLocation)) {
      return part;
    }

    return {
      ...part,
      expectedParentOffset: [0, 1, 2].map((axis) =>
        Number(((part.location[axis] ?? 0) - (parentLocation[axis] ?? 0)).toFixed(4)),
      ),
    };
  });
}

function getChestWrapCompactAuthoredOffsetMap(geometryRecipe, partGraph = null) {
  const offsetMap = new Map();

  if (Array.isArray(partGraph?.edges)) {
    for (const edge of partGraph.edges) {
      if (typeof edge?.childPartId !== "string" || !Array.isArray(edge?.localOffset)) {
        continue;
      }
      offsetMap.set(edge.childPartId, [...edge.localOffset]);
    }
  }

  const attachmentAnchors = Array.isArray(geometryRecipe?.structuralBlueprint?.attachmentAnchors)
    ? geometryRecipe.structuralBlueprint.attachmentAnchors
    : [];
  for (const anchor of attachmentAnchors) {
    if (typeof anchor?.partId !== "string" || !Array.isArray(anchor?.preferredOffset)) {
      continue;
    }
    if (!offsetMap.has(anchor.partId)) {
      offsetMap.set(anchor.partId, [...anchor.preferredOffset]);
    }
  }

  return offsetMap;
}

function getChestWrapCompactAttachmentPreserveBlend(partId) {
  if (partId === "knot") {
    return [0.18, 0.82, 0.94];
  }

  if (partId === "tail-left" || partId === "tail-right") {
    return [0.16, 0.22, 0.38];
  }

  if (partId === "tail-fold-left" || partId === "tail-fold-right") {
    return [0.1, 0.16, 0.28];
  }

  return [0, 0, 0];
}

function rebuildLocationsFromParentOffsets(partBlueprints, rootPartId) {
  const partMap = new Map(
    partBlueprints
      .filter((part) => typeof part?.partId === "string")
      .map((part) => [part.partId, part]),
  );
  const locationCache = new Map();
  const visiting = new Set();

  const resolveLocation = (partId) => {
    if (locationCache.has(partId)) {
      return locationCache.get(partId);
    }

    const part = partMap.get(partId);
    if (!part) {
      return [0, 0, 0];
    }

    if (visiting.has(partId)) {
      return Array.isArray(part.location) ? part.location : [0, 0, 0];
    }

    visiting.add(partId);
    const parentLocation =
      typeof part.parentPartId === "string" && part.partId !== rootPartId
        ? resolveLocation(part.parentPartId)
        : null;
    const nextLocation =
      parentLocation && Array.isArray(part.localOffset)
        ? addVectors(parentLocation, part.localOffset)
        : Array.isArray(part.location)
          ? roundVector(part.location)
          : [0, 0, 0];
    locationCache.set(partId, nextLocation);
    visiting.delete(partId);
    return nextLocation;
  };

  return partBlueprints.map((part) => ({
    ...part,
    location:
      typeof part?.partId === "string"
        ? resolveLocation(part.partId)
        : Array.isArray(part?.location)
          ? roundVector(part.location)
          : part?.location,
  }));
}

/**
 * Late-stage compact chest-wrap clamp that can optionally consult authored part-graph edges.
 * @param {Array<Record<string, unknown>>} partBlueprints
 * @param {Record<string, unknown> | null | undefined} execution
 * @param {Record<string, unknown> | null | undefined} geometryRecipe
 * @param {string | null | undefined} refinementStage
 * @param {Array<Record<string, unknown>>} [repairActions=[]]
 * @param {{edges?: Array<Record<string, unknown>>} | null} [partGraph=null]
 */
export function applyChestWrapCompactEnvelopeClamp(
  partBlueprints,
  execution,
  geometryRecipe,
  refinementStage,
  repairActions = [],
  partGraph = null,
) {
  const compactChestWrapProjectionVariant =
    isHostCoupledChestWrapExecution(execution, geometryRecipe) &&
    /compact/i.test(
      `${getExecutionVariantId(execution, geometryRecipe) ?? ""} ${
        getHardSurfaceOutlineProjectionVariantId(execution, geometryRecipe) ?? ""
      }`,
    );
  const lateChestWrapStage =
    refinementStage === "host-fit" ||
    refinementStage === "render-driven-rebuild" ||
    refinementStage === "final-review";

  if (
    !compactChestWrapProjectionVariant ||
    !lateChestWrapStage ||
    !Array.isArray(partBlueprints) ||
    partBlueprints.length === 0
  ) {
    return {
      partBlueprints,
      clampApplied: false,
    };
  }

  const spanBeforeBounds = computeRuntimePartBounds(partBlueprints);
  if (!spanBeforeBounds) {
    return {
      partBlueprints,
      clampApplied: false,
    };
  }

  const targetSpan = getChestWrapCompactEnvelopeTargetSpan(execution, geometryRecipe);
  const initialOverflowFactors = spanBeforeBounds.span.map((value, axis) =>
    value > (targetSpan[axis] ?? value)
      ? clampNumber((targetSpan[axis] ?? value) / Math.max(value, 0.0001), 0.18, 1)
      : 1,
  );
  if (initialOverflowFactors.every((value) => value >= 0.995)) {
    return {
      partBlueprints,
      clampApplied: false,
      targetSpan,
      spanBefore: spanBeforeBounds.span,
      spanAfter: spanBeforeBounds.span,
      overflowFactors: initialOverflowFactors,
    };
  }

  const tightenCohesionIntensity = Math.max(
    getRepairActionIntensity(repairActions, "tighten-cohesion"),
    getRepairActionIntensity(repairActions, "re-parent-part"),
  );
  const rebuildIntensity = getRepairActionIntensity(repairActions, "rebuild-from-root");
  const reshapeIntensity = getRepairActionIntensity(repairActions, "reshape-silhouette");
  const promoteIntensity = getRepairActionIntensity(repairActions, "promote-critical-part");
  const pressure = clamp01(
    0.56 +
      tightenCohesionIntensity * 0.16 +
      rebuildIntensity * 0.12 +
      reshapeIntensity * 0.08 +
      promoteIntensity * 0.08,
  );
  const stageStrength =
    refinementStage === "final-review"
      ? 1
      : refinementStage === "render-driven-rebuild"
        ? 0.96
        : 0.88;
  const clampStrength = clampNumber(pressure * stageStrength, 0.72, 1);
  const rootPartId =
    (typeof geometryRecipe?.assemblyRootPartId === "string" &&
      geometryRecipe.assemblyRootPartId) ||
    (typeof partBlueprints[0]?.partId === "string" ? partBlueprints[0].partId : "wrap-band");
  const authoredOffsetMap = getChestWrapCompactAuthoredOffsetMap(
    geometryRecipe,
    partGraph,
  );

  let nextPartBlueprints = partBlueprints.map((part) => ({
    ...part,
    location: Array.isArray(part?.location) ? [...part.location] : part?.location,
    localOffset: Array.isArray(part?.localOffset) ? [...part.localOffset] : part?.localOffset,
    scale: Array.isArray(part?.scale) ? [...part.scale] : part?.scale,
    expectedParentOffset: Array.isArray(part?.expectedParentOffset)
      ? [...part.expectedParentOffset]
      : part?.expectedParentOffset,
  }));

  for (let iteration = 0; iteration < 2; iteration += 1) {
    const bounds = computeRuntimePartBounds(nextPartBlueprints);
    if (!bounds) {
      break;
    }

    const overflowFactors = bounds.span.map((value, axis) =>
      value > (targetSpan[axis] ?? value)
        ? clampNumber((targetSpan[axis] ?? value) / Math.max(value, 0.0001), 0.18, 1)
        : 1,
    );
    if (overflowFactors.every((value) => value >= 0.995)) {
      break;
    }

    const rootPart = nextPartBlueprints.find((part) => part?.partId === rootPartId);
    const rootLocation = Array.isArray(rootPart?.location) ? rootPart.location : [0, 0, 0];

    nextPartBlueprints = nextPartBlueprints.map((part) => {
      if (!Array.isArray(part?.scale)) {
        return part;
      }

      const influence = getChestWrapCompactEnvelopeInfluence(part.partId, rootPartId);
      const nextScale = [0, 1, 2].map((axis) =>
        Number(
          (
            (part.scale[axis] ?? 1) *
            lerpNumber(1, overflowFactors[axis], influence.scale[axis] * clampStrength)
          ).toFixed(4),
        ),
      );
      const nextLocalOffset = Array.isArray(part.localOffset)
        ? [0, 1, 2].map((axis) => {
            const offsetFactor =
              part.partId === rootPartId
                ? 1
                : lerpNumber(1, overflowFactors[axis], influence.offset[axis] * clampStrength);
            return Number((((part.localOffset[axis] ?? 0) * offsetFactor).toFixed(4)));
          })
        : part.localOffset;
      const authoredOffset = authoredOffsetMap.get(part.partId);
      const attachmentPreserveBlend = getChestWrapCompactAttachmentPreserveBlend(part.partId);
      const preservedLocalOffset =
        Array.isArray(nextLocalOffset) && Array.isArray(authoredOffset)
          ? [0, 1, 2].map((axis) =>
              Number(
                lerpNumber(
                  nextLocalOffset[axis] ?? 0,
                  authoredOffset[axis] ?? nextLocalOffset[axis] ?? 0,
                  attachmentPreserveBlend[axis] * clampStrength,
                ).toFixed(4),
              ),
            )
          : nextLocalOffset;

      return {
        ...part,
        scale: nextScale,
        localOffset: preservedLocalOffset,
      };
    });

    nextPartBlueprints = rebuildLocationsFromParentOffsets(
      nextPartBlueprints.map((part) =>
        part.partId === rootPartId
          ? {
              ...part,
              location:
                Array.isArray(part.location) ? roundVector(part.location) : rootLocation,
            }
          : part,
      ),
      rootPartId,
    );
  }

  const spanAfterBounds = computeRuntimePartBounds(nextPartBlueprints);

  return {
    partBlueprints: rebuildExpectedParentOffsets(nextPartBlueprints),
    clampApplied: true,
    clampStrength: Number(clampStrength.toFixed(4)),
    targetSpan,
    spanBefore: spanBeforeBounds.span,
    spanAfter: spanAfterBounds?.span ?? spanBeforeBounds.span,
    overflowFactors: initialOverflowFactors,
  };
}

export function getHardSurfaceAssemblyOutwardShift(
  execution,
  geometryRecipe,
  refinementStage,
  partBlueprintBases = [],
  repairActions = [],
) {
  if (!isHardSurfaceOpenNounExecution(execution, geometryRecipe)) {
    return [0, 0, 0];
  }

  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(execution.anchor);

  if (normalizedAnchor !== "left-ear" && normalizedAnchor !== "right-ear") {
    return [0, 0, 0];
  }

  const rootPartId =
    (typeof geometryRecipe?.assemblyRootPartId === "string" &&
      geometryRecipe.assemblyRootPartId) ||
    (Array.isArray(partBlueprintBases) && typeof partBlueprintBases[0]?.partId === "string"
      ? partBlueprintBases[0].partId
      : null);
  const rootPart =
    (Array.isArray(partBlueprintBases)
      ? partBlueprintBases.find((part) => part.partId === rootPartId)
      : null) ??
    (Array.isArray(partBlueprintBases) ? partBlueprintBases[0] : null);

  if (!rootPart) {
    return [0, 0, 0];
  }

  const [spanX, spanY, spanZ] = estimateRuntimePartSpan(rootPart);
  const side = normalizedAnchor === "left-ear" ? 1 : -1;
  const familyPolicyId = getHardSurfaceFamilyPolicyId(execution, geometryRecipe);
  const isDeviceFamily = familyPolicyId === "hard-surface-device";
  const isBoatFamily = familyPolicyId === "hard-surface-boat";
  const reAnchorIntensity = getRepairActionIntensity(repairActions, "re-anchor");
  const rebuildIntensity = getRepairActionIntensity(repairActions, "rebuild-from-root");
  const readabilityLiftIntensity = Math.max(
    getRepairActionIntensity(repairActions, "promote-critical-part"),
    getRepairActionIntensity(repairActions, "re-materialize-color-zone"),
  );
  const hostFitBias =
    refinementStage === "host-fit" || refinementStage === "final-review"
      ? isDeviceFamily
        ? 0.82
        : isBoatFamily
          ? 0.9
          : 0.9
      : isDeviceFamily
        ? 0.78
        : isBoatFamily
          ? 0.86
          : 0.76;
  const lateralShift =
    (
      0.0012 +
      spanX *
        (isDeviceFamily
          ? 0.106 + rebuildIntensity * 0.032 + reAnchorIntensity * 0.022
          : isBoatFamily
            ? 0.08 + rebuildIntensity * 0.03 + reAnchorIntensity * 0.02
            : 0.22 + rebuildIntensity * 0.08 + reAnchorIntensity * 0.06)
    ) *
    hostFitBias *
    (1 + readabilityLiftIntensity * (isDeviceFamily ? 0.08 : isBoatFamily ? 0.05 : 0));
  const depthShift = -(
    (isDeviceFamily ? 0.0001 : isBoatFamily ? 0.0001 : 0.0003) +
    spanY *
      (isDeviceFamily
        ? 0.02 + rebuildIntensity * 0.015
        : isBoatFamily
          ? 0.02 + rebuildIntensity * 0.01
          : 0.08 + rebuildIntensity * 0.04)
  );
  const liftShift =
    (isDeviceFamily ? 0.001 : isBoatFamily ? 0.0008 : 0.0006) +
    spanZ *
      (isDeviceFamily
        ? 0.021 + reAnchorIntensity * 0.009
        : isBoatFamily
          ? 0.06 + reAnchorIntensity * 0.02
          : 0.1 + reAnchorIntensity * 0.04);

  return [
    Number((lateralShift * side).toFixed(4)),
    Number(depthShift.toFixed(4)),
    Number((liftShift * (1 + readabilityLiftIntensity * 0.05)).toFixed(4)),
  ];
}

function cloneRuntimePartBlueprint(part) {
  return {
    ...part,
    localOffset: Array.isArray(part?.localOffset) ? [...part.localOffset] : [0, 0, 0],
    scale: Array.isArray(part?.scale) ? [...part.scale] : [1, 1, 1],
    rotation: Array.isArray(part?.rotation) ? [...part.rotation] : undefined,
  };
}

function multiplyRuntimePartScale(part, factors = [1, 1, 1]) {
  if (!Array.isArray(part?.scale)) {
    return part;
  }

  part.scale = part.scale.map((value, axis) =>
    Number(((value ?? 1) * (factors[axis] ?? 1)).toFixed(4)),
  );
  return part;
}

function multiplyRuntimePartOffset(part, factors = [1, 1, 1]) {
  if (!Array.isArray(part?.localOffset)) {
    return part;
  }

  part.localOffset = part.localOffset.map((value, axis) =>
    Number(((value ?? 0) * (factors[axis] ?? 1)).toFixed(4)),
  );
  return part;
}

function addRuntimePartOffset(part, delta = [0, 0, 0]) {
  if (!Array.isArray(part?.localOffset)) {
    return part;
  }

  part.localOffset = addVectors(part.localOffset, delta);
  return part;
}

function setRuntimePartRotation(part, rotation) {
  if (!Array.isArray(rotation) || rotation.length !== 3) {
    return part;
  }

  part.rotation = roundVector(rotation);
  return part;
}

export function applyHardSurfaceOutlineCompiler(
  partBlueprintBases,
  execution,
  geometryRecipe,
  refinementStage,
  repairActions = [],
) {
  const chestWrapExecution = isHostCoupledChestWrapExecution(
    execution,
    geometryRecipe,
  );

  if (
    !Array.isArray(partBlueprintBases) ||
    partBlueprintBases.length === 0 ||
    (
      !isHardSurfaceOpenNounExecution(execution, geometryRecipe) &&
      !chestWrapExecution
    )
  ) {
    return {
      partBlueprintBases,
      outlineCompilerMode: getHardSurfaceOutlineCompilerMode(execution, geometryRecipe),
      outlineProjectionVariantId: getHardSurfaceOutlineProjectionVariantId(
        execution,
        geometryRecipe,
      ),
    };
  }

  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(execution.anchor);
  const familyPolicyId = getHardSurfaceFamilyPolicyId(execution, geometryRecipe);
  const outlineCompilerMode = getHardSurfaceOutlineCompilerMode(execution, geometryRecipe);
  const outlineProjectionVariantId = getHardSurfaceOutlineProjectionVariantId(
    execution,
    geometryRecipe,
  );
  const compactDeviceProjectionVariant =
    familyPolicyId === "hard-surface-device" && /compact/i.test(String(outlineProjectionVariantId ?? ""));
  const compactChestWrapProjectionVariant =
    chestWrapExecution && /compact/i.test(String(outlineProjectionVariantId ?? ""));
  const compilerBlend =
    refinementStage === "blocking"
      ? 0.72
      : refinementStage === "silhouette-forming"
        ? 1
        : refinementStage === "assembly-rooting"
          ? 0.9
          : refinementStage === "host-fit"
            ? 0.64
            : refinementStage === "render-driven-rebuild"
              ? 0.82
              : 0.58;
  const reshapeIntensity = getRepairActionIntensity(repairActions, "reshape-silhouette");
  const rebuildIntensity = getRepairActionIntensity(repairActions, "rebuild-from-root");
  const reAnchorIntensity = getRepairActionIntensity(repairActions, "re-anchor");
  const tightenCohesionIntensity = Math.max(
    getRepairActionIntensity(repairActions, "tighten-cohesion"),
    getRepairActionIntensity(repairActions, "re-parent-part"),
  );
  const readabilityLiftIntensity = Math.max(
    getRepairActionIntensity(repairActions, "promote-critical-part"),
    getRepairActionIntensity(repairActions, "re-materialize-color-zone"),
  );
  const outlineProjectionCompaction =
    familyPolicyId === "hard-surface-device" && isEarSideRuntimeAnchor(normalizedAnchor)
      ? clamp01(
          reAnchorIntensity * 0.54 +
            rebuildIntensity * 0.38 +
            tightenCohesionIntensity * 0.16,
        )
      : 0;
  let blend = clamp01(
    compilerBlend +
      reshapeIntensity * 0.14 +
      rebuildIntensity * 0.1 +
      tightenCohesionIntensity * 0.08,
  );
  if (outlineProjectionCompaction > 0) {
    if (refinementStage === "render-driven-rebuild") {
      blend = Math.min(
        blend,
        lerpNumber(0.74, 0.48, outlineProjectionCompaction),
      );
    } else if (refinementStage === "final-review") {
      blend = Math.min(
        blend,
        lerpNumber(0.6, 0.36, outlineProjectionCompaction),
      );
    }
  }
  const side = normalizedAnchor === "left-ear" ? 1 : normalizedAnchor === "right-ear" ? -1 : 0;
  const nextPartBlueprintBases = partBlueprintBases.map((part) =>
    cloneRuntimePartBlueprint(part),
  );
  const partMap = new Map(
    nextPartBlueprintBases
      .filter((part) => isRecord(part) && typeof part.partId === "string")
      .map((part) => [part.partId, part]),
  );

  if (familyPolicyId === "hard-surface-device") {
    const body = partMap.get("device-body");
    const screenFace = partMap.get("screen-face");
    const cameraFaceplate = partMap.get("camera-faceplate");
    const cameraLens = partMap.get("camera-lens");
    const cameraTop = partMap.get("camera-top");
    const cameraViewfinder = partMap.get("camera-viewfinder");
    const cameraDot = partMap.get("camera-dot");
    const hangSlot = partMap.get("hang-slot");

    if (body) {
      multiplyRuntimePartScale(
        body,
        lerpVector(
          [1, 1, 1],
          compactDeviceProjectionVariant
            ? [
                1.12 + readabilityLiftIntensity * 0.06,
                0.92 + readabilityLiftIntensity * 0.02,
                1.18 + reshapeIntensity * 0.06,
              ]
            : [
                1.2 + readabilityLiftIntensity * 0.08,
                1.04 + readabilityLiftIntensity * 0.06,
                1.12 + reshapeIntensity * 0.04,
              ],
          blend,
        ),
      );
    }

    for (const reliefPart of [screenFace, cameraFaceplate].filter(Boolean)) {
      multiplyRuntimePartScale(
        reliefPart,
        lerpVector(
          [1, 1, 1],
          compactDeviceProjectionVariant ? [1.12, 0.6, 1.2] : [1.18, 0.72, 1.2],
          blend,
        ),
      );
      multiplyRuntimePartOffset(
        reliefPart,
        lerpVector(
          [1, 1, 1],
          compactDeviceProjectionVariant ? [0.94, 0.76, 0.96] : [0.96, 0.84, 0.96],
          blend,
        ),
      );
      addRuntimePartOffset(
        reliefPart,
        [
          Number((0.0002 * side * blend).toFixed(4)),
          Number(
            (
              (compactDeviceProjectionVariant ? -0.0002 : -0.0003) * blend -
              0.0001 * readabilityLiftIntensity * blend
            ).toFixed(4),
          ),
          0,
        ],
      );
    }

    if (cameraLens) {
      multiplyRuntimePartScale(
        cameraLens,
        lerpVector(
          [1, 1, 1],
          compactDeviceProjectionVariant
            ? [
                1.18 + readabilityLiftIntensity * 0.08,
                1.08 + reshapeIntensity * 0.04,
                1.16 + readabilityLiftIntensity * 0.08,
              ]
            : [
                1.24 + readabilityLiftIntensity * 0.06,
                1.28 + reshapeIntensity * 0.08,
                1.18 + readabilityLiftIntensity * 0.06,
              ],
          blend,
        ),
      );
      multiplyRuntimePartOffset(
        cameraLens,
        lerpVector(
          [1, 1, 1],
          compactDeviceProjectionVariant ? [0.96, 1.04, 0.98] : [0.98, 1.12, 0.98],
          blend,
        ),
      );
      addRuntimePartOffset(
        cameraLens,
        [
          Number((0.0003 * side * blend).toFixed(4)),
          Number(
            (
              (compactDeviceProjectionVariant ? -0.0004 : -0.0006) * blend -
              0.0002 * readabilityLiftIntensity * blend
            ).toFixed(4),
          ),
          0,
        ],
      );
    }

    for (const topPart of [cameraTop, cameraViewfinder, cameraDot].filter(Boolean)) {
      multiplyRuntimePartScale(
        topPart,
        lerpVector(
          [1, 1, 1],
          compactDeviceProjectionVariant ? [1.02, 0.78, 1.04] : [0.96, 0.82, 0.9],
          blend,
        ),
      );
      multiplyRuntimePartOffset(
        topPart,
        lerpVector(
          [1, 1, 1],
          compactDeviceProjectionVariant ? [0.86, 0.42, 0.82] : [0.88, 0.46, 0.84],
          blend,
        ),
      );
      addRuntimePartOffset(
        topPart,
        [
          0,
          Number((-0.0002 * blend).toFixed(4)),
          Number(((compactDeviceProjectionVariant ? -0.0001 : -0.0002) * blend).toFixed(4)),
        ],
      );
    }

    if (hangSlot) {
      multiplyRuntimePartScale(
        hangSlot,
        lerpVector([1, 1, 1], [0.2, 0.18, 0.2], blend),
      );
      multiplyRuntimePartOffset(
        hangSlot,
        lerpVector([1, 1, 1], [0.64, 0.28, 0.78], blend),
      );
      addRuntimePartOffset(hangSlot, [0, 0, Number((-0.0006 * blend).toFixed(4))]);
    }
  }

  if (familyPolicyId === "hard-surface-boat") {
    const hull = partMap.get("boat-hull");
    const bow = partMap.get("boat-bow");
    const stern = partMap.get("boat-stern");
    const deck = partMap.get("boat-deck");
    const mast = partMap.get("boat-mast");
    const sail = partMap.get("boat-sail");
    const hangSlot = partMap.get("hang-slot");

    if (hull) {
      multiplyRuntimePartScale(
        hull,
        lerpVector(
          [1, 1, 1],
          [
            1.28 + reshapeIntensity * 0.08,
            0.96,
            1.02 + tightenCohesionIntensity * 0.08,
          ],
          blend,
        ),
      );
      multiplyRuntimePartOffset(
        hull,
        lerpVector([1, 1, 1], [1.04, 0.68, 0.9], blend),
      );
      addRuntimePartOffset(
        hull,
        [0, Number((0.0006 * blend).toFixed(4)), Number((-0.0014 * blend).toFixed(4))],
      );
    }

    for (const hullEdge of [bow, stern].filter(Boolean)) {
      multiplyRuntimePartScale(
        hullEdge,
        lerpVector([1, 1, 1], [1.16, 0.96, 0.98], blend),
      );
      multiplyRuntimePartOffset(
        hullEdge,
        lerpVector([1, 1, 1], [1.18, 0.74, 0.9], blend),
      );
    }

    if (bow) {
      addRuntimePartOffset(
        bow,
        [Number((0.0052 * blend).toFixed(4)), 0, Number((-0.0006 * blend).toFixed(4))],
      );
    }

    if (stern) {
      addRuntimePartOffset(
        stern,
        [Number((-0.0048 * blend).toFixed(4)), 0, Number((-0.0008 * blend).toFixed(4))],
      );
    }

    if (deck) {
      multiplyRuntimePartScale(
        deck,
        lerpVector([1, 1, 1], [1.1, 0.92, 0.84], blend),
      );
      multiplyRuntimePartOffset(
        deck,
        lerpVector([1, 1, 1], [1.02, 0.72, 0.9], blend),
      );
    }

    if (mast) {
      multiplyRuntimePartScale(
        mast,
        lerpVector([1, 1, 1], [0.56, 0.58, 0.76], blend),
      );
      multiplyRuntimePartOffset(
        mast,
        lerpVector([1, 1, 1], [0.68, 0.78, 0.8], blend),
      );
      addRuntimePartOffset(
        mast,
        [
          Number((-0.0002 * side * blend).toFixed(4)),
          Number((0.0006 * blend).toFixed(4)),
          Number((-0.0008 * blend).toFixed(4)),
        ],
      );
    }

    if (sail) {
      multiplyRuntimePartScale(
        sail,
        lerpVector(
          [1, 1, 1],
          [1.08 + readabilityLiftIntensity * 0.08, 0.82, 0.54],
          blend,
        ),
      );
      multiplyRuntimePartOffset(
        sail,
        lerpVector([1, 1, 1], [0.76, 0.78, 0.8], blend),
      );
      addRuntimePartOffset(
        sail,
        [
          Number((0.0008 * side * blend).toFixed(4)),
          Number((0.0004 * blend).toFixed(4)),
          Number((-0.0006 * blend).toFixed(4)),
        ],
      );
      if (Array.isArray(sail.rotation)) {
        setRuntimePartRotation(
          sail,
          lerpVector(sail.rotation, [0, 72, -54], blend),
        );
      }
    }

    if (hangSlot) {
      multiplyRuntimePartScale(
        hangSlot,
        lerpVector([1, 1, 1], [0.28, 0.24, 0.28], blend),
      );
      multiplyRuntimePartOffset(
        hangSlot,
        lerpVector([1, 1, 1], [0.72, 0.14, 0.82], blend),
      );
    }
  }

  if (chestWrapExecution) {
    const wrapBand = partMap.get("wrap-band");
    const knot = partMap.get("knot");
    const tailLeft = partMap.get("tail-left");
    const tailRight = partMap.get("tail-right");
    const tailFoldLeft = partMap.get("tail-fold-left");
    const tailFoldRight = partMap.get("tail-fold-right");
    const chestWrapBlend = clamp01(
      Math.max(
        blend,
        0.46 +
          reshapeIntensity * 0.18 +
          rebuildIntensity * 0.16 +
          readabilityLiftIntensity * 0.12,
      ),
    );
    const chestWrapReadabilityBias = clamp01(
      readabilityLiftIntensity * 0.42 +
        reshapeIntensity * 0.34 +
        tightenCohesionIntensity * 0.18,
    );

    if (wrapBand) {
      multiplyRuntimePartScale(
        wrapBand,
        lerpVector(
          [1, 1, 1],
          compactChestWrapProjectionVariant
            ? [
                0.64 + chestWrapReadabilityBias * 0.04,
                0.94,
                0.38 + chestWrapReadabilityBias * 0.02,
              ]
            : [
                0.82 + chestWrapReadabilityBias * 0.05,
                0.96,
                0.7 + chestWrapReadabilityBias * 0.05,
              ],
          chestWrapBlend,
        ),
      );
      multiplyRuntimePartOffset(
        wrapBand,
        lerpVector(
          [1, 1, 1],
          compactChestWrapProjectionVariant ? [0.9, 0.72, 0.74] : [0.96, 0.82, 0.92],
          chestWrapBlend,
        ),
      );
      addRuntimePartOffset(
        wrapBand,
        [
          0,
          Number(
            (
              -(0.0008 + chestWrapReadabilityBias * 0.0002) * chestWrapBlend
            ).toFixed(4),
          ),
          Number(
            (
              -(0.0012 + chestWrapReadabilityBias * 0.0004) * chestWrapBlend
            ).toFixed(4),
          ),
        ],
      );
    }

    if (knot) {
      multiplyRuntimePartScale(
        knot,
        lerpVector(
          [1, 1, 1],
          compactChestWrapProjectionVariant
            ? [
                1.34 + chestWrapReadabilityBias * 0.1,
                1.08,
                1.42 + chestWrapReadabilityBias * 0.1,
              ]
            : [
                1.22 + chestWrapReadabilityBias * 0.08,
                1.06,
                1.32 + chestWrapReadabilityBias * 0.1,
              ],
          chestWrapBlend,
        ),
      );
      multiplyRuntimePartOffset(
        knot,
        lerpVector(
          [1, 1, 1],
          compactChestWrapProjectionVariant ? [0.84, 1.04, 0.62] : [0.94, 1.04, 0.88],
          chestWrapBlend,
        ),
      );
      addRuntimePartOffset(
        knot,
        [
          0,
          Number((0.0003 * chestWrapBlend).toFixed(4)),
          Number(
            (
              -(0.0016 + chestWrapReadabilityBias * 0.0005) * chestWrapBlend
            ).toFixed(4),
          ),
        ],
      );
    }

    for (const [direction, tail] of [
      [-1, tailLeft],
      [1, tailRight],
    ]) {
      if (!tail) {
        continue;
      }

      multiplyRuntimePartScale(
        tail,
        lerpVector(
          [1, 1, 1],
          compactChestWrapProjectionVariant
            ? [0.9, 1.1, 1.02]
            : [0.9, 0.96, 1.02],
          chestWrapBlend,
        ),
      );
      multiplyRuntimePartOffset(
        tail,
        lerpVector(
          [1, 1, 1],
          compactChestWrapProjectionVariant ? [0.72, 1.18, 0.62] : [0.8, 1.02, 0.88],
          chestWrapBlend,
        ),
      );
      addRuntimePartOffset(
        tail,
        [
          Number((0.0018 * direction * chestWrapBlend).toFixed(4)),
          Number((-(0.0003 + chestWrapReadabilityBias * 0.0002) * chestWrapBlend).toFixed(4)),
          Number((-(0.0032 + chestWrapReadabilityBias * 0.0004) * chestWrapBlend).toFixed(4)),
        ],
      );
    }

    for (const [direction, tailFold] of [
      [-1, tailFoldLeft],
      [1, tailFoldRight],
    ]) {
      if (!tailFold) {
        continue;
      }

      multiplyRuntimePartScale(
        tailFold,
        lerpVector(
          [1, 1, 1],
          compactChestWrapProjectionVariant ? [0.78, 0.92, 0.76] : [0.92, 0.94, 0.92],
          chestWrapBlend,
        ),
      );
      multiplyRuntimePartOffset(
        tailFold,
        lerpVector(
          [1, 1, 1],
          compactChestWrapProjectionVariant ? [0.74, 1.08, 0.68] : [0.84, 1, 0.9],
          chestWrapBlend,
        ),
      );
      addRuntimePartOffset(
        tailFold,
        [
          Number((0.0011 * direction * chestWrapBlend).toFixed(4)),
          Number((-(0.0002 * chestWrapBlend)).toFixed(4)),
          Number((-(0.0012 + chestWrapReadabilityBias * 0.0003) * chestWrapBlend).toFixed(4)),
        ],
      );
    }
  }

  return {
    partBlueprintBases: nextPartBlueprintBases,
    outlineCompilerMode,
    outlineProjectionVariantId,
  };
}

function hasViewportDrivenVariantRecoveryEvidence(report, genericRead = false) {
  if (!isRecord(report)) {
    return false;
  }

  const faceIntrusionSeverity =
    typeof report.faceIntrusionSeverity === "number" ? report.faceIntrusionSeverity : 0;

  return (
    report.variantSwitchRecommended === true ||
    (
      report.visualVeto === true &&
      (
        genericRead ||
        report.representationFailureKind === "host-intrusion" ||
        faceIntrusionSeverity > 0.28
      )
    )
  );
}

function findCompactBlueprintVariantId(execution, geometryRecipe, currentVariantId = null) {
  const variants = getExecutionBlueprintVariants(execution, geometryRecipe);
  const normalizedCurrentVariantId =
    typeof currentVariantId === "string" ? currentVariantId.trim() : "";

  const compactVariant = variants.find((variant) => {
    if (!isRecord(variant) || typeof variant.variantId !== "string") {
      return false;
    }

    const variantId = variant.variantId.trim();
    if (!variantId || variantId === normalizedCurrentVariantId) {
      return false;
    }

    const label = typeof variant.label === "string" ? variant.label : "";
    const silhouetteIntent =
      typeof variant.silhouetteIntent === "string" ? variant.silhouetteIntent : "";

    return /compact/i.test(`${variantId} ${label} ${silhouetteIntent}`);
  });

  return isRecord(compactVariant) && typeof compactVariant.variantId === "string"
    ? compactVariant.variantId
    : null;
}

function getPreferredCompactHardSurfaceRecoveryVariantId(
  execution,
  geometryRecipe,
  report,
  currentVariantId = null,
) {
  if (!isRecord(report)) {
    return null;
  }

  if (isHostCoupledChestRigidFrontReadableExecution(execution, geometryRecipe)) {
    return null;
  }

  const runtimeShapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const compactVariantId = findCompactBlueprintVariantId(
    execution,
    geometryRecipe,
    currentVariantId,
  );
  const canonicalFirstRead =
    typeof report.canonicalFirstRead === "string"
      ? report.canonicalFirstRead
      : typeof report.firstReadResult === "string"
        ? report.firstReadResult
        : "";
  const faceIntrusionSeverity =
    typeof report.faceIntrusionSeverity === "number" ? report.faceIntrusionSeverity : 0;

  if (
    (runtimeShapeClass !== "camera-charm" &&
      runtimeShapeClass !== "device-generic-charm") ||
    typeof compactVariantId !== "string" ||
    compactVariantId.trim().length === 0
  ) {
    return null;
  }

  if (runtimeShapeClass === "device-generic-charm") {
    return (
      report.representationFailureKind === "host-intrusion" ||
      report.variantSwitchRecommended === true ||
      report.visualVeto === true ||
      report.dominantFailureLayer === "anchor-projection" ||
      genericRecoveryReads.includes(canonicalFirstRead) ||
      faceIntrusionSeverity > 0.28
    )
      ? compactVariantId
      : null;
  }

  return (
    report.representationFailureKind === "host-intrusion" ||
    report.visualVeto === true ||
    report.variantSwitchRecommended === true ||
    faceIntrusionSeverity > 0.28
  )
    ? compactVariantId
    : null;
}


export function projectHardSurfaceEarSideAnchorPose({
  execution,
  geometryRecipe,
  targetAnchorPosition,
  placementOffset = [0, 0, 0],
  repairActions = [],
  assemblyOutwardShift = [0, 0, 0],
}) {
  const normalizedAnchor = normalizeRuntimeAccessoryAnchor(execution?.anchor);
  const familyPolicyId = getHardSurfaceFamilyPolicyId(execution, geometryRecipe);
  const outlineCompilerMode = getHardSurfaceOutlineCompilerMode(execution, geometryRecipe);
  const outlineProjectionVariantId = getHardSurfaceOutlineProjectionVariantId(
    execution,
    geometryRecipe,
  );

  if (
    !usesProjectedEarSideAnchorPose(execution, geometryRecipe)
  ) {
    const projectedAnchorPose = addVectors(
      Array.isArray(targetAnchorPosition) ? targetAnchorPosition : [0, 0, 0],
      Array.isArray(placementOffset) ? placementOffset : [0, 0, 0],
      Array.isArray(assemblyOutwardShift) ? assemblyOutwardShift : [0, 0, 0],
    );
    return {
      projectedAnchorPose,
      anchorPlaneOffset: [0, 0, 0],
      earSideTangentOffset: [0, 0, 0],
      anchorProjectionFailureKind: undefined,
      outlineCompilerMode,
      outlineProjectionVariantId,
    };
  }

  const side = normalizedAnchor === "left-ear" ? 1 : -1;
  const isDeviceFamily = familyPolicyId === "hard-surface-device";
  const isBoatFamily = familyPolicyId === "hard-surface-boat";
  const isProjectedSymbolBadge = isEarSideFrontFacingSymbolExecution(
    execution,
    geometryRecipe,
  );
  const runtimeShapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const normalizedProjectionVariantId =
    typeof outlineProjectionVariantId === "string" ? outlineProjectionVariantId : "";
  const compactDeviceProjectionBias =
    isDeviceFamily && /compact/i.test(normalizedProjectionVariantId) ? 1 : 0;
  const compactGenericDeviceProjectionBoost =
    runtimeShapeClass === "device-generic-charm" && compactDeviceProjectionBias > 0 ? 1 : 0;
  const reAnchorIntensity = getRepairActionIntensity(repairActions, "re-anchor");
  const rebuildIntensity = getRepairActionIntensity(repairActions, "rebuild-from-root");
  const readabilityLiftIntensity = Math.max(
    getRepairActionIntensity(repairActions, "promote-critical-part"),
    getRepairActionIntensity(repairActions, "re-materialize-color-zone"),
    getRepairActionIntensity(repairActions, "reshape-silhouette") * 0.52,
  );
  const projectionEscapeIntensity = clamp01(
    reAnchorIntensity * 1.1 + rebuildIntensity * 0.32,
  );
  const basePlacementOffset = Array.isArray(placementOffset) ? placementOffset : [0, 0, 0];
  const hostFitEnvelope = getStructuralBlueprintHostFitEnvelope(
    execution,
    geometryRecipe,
  );
  const preferredYaw =
    typeof hostFitEnvelope?.preferredYaw === "number"
      ? Math.abs(hostFitEnvelope.preferredYaw)
      : 12;
  const screenFacingBias =
    typeof hostFitEnvelope?.screenFacingBias === "number"
      ? clamp01(hostFitEnvelope.screenFacingBias)
      : 0.84;
  const symbolFacingBias = clamp01((screenFacingBias - 0.68) / 0.24);
  const symbolYawBias = clamp01(preferredYaw / 18);
  const faceIntrusionBudget =
    typeof hostFitEnvelope?.faceIntrusionBudget === "number"
      ? hostFitEnvelope.faceIntrusionBudget
      : 0.18;
  const maxSpanEnvelope = Array.isArray(hostFitEnvelope?.maxSpan) ? hostFitEnvelope.maxSpan : null;
  const symbolSpanX = Math.abs(maxSpanEnvelope?.[0] ?? 0.024);
  const symbolSpanZ = Math.abs(maxSpanEnvelope?.[2] ?? 0.024);
  const symbolPlacementLoad = isProjectedSymbolBadge
    ? clamp01(
        Math.max(
          Math.abs(basePlacementOffset[0] ?? 0) / Math.max(symbolSpanX * 0.46, 0.008),
          Math.max(0, basePlacementOffset[2] ?? 0) / Math.max(symbolSpanZ * 0.34, 0.006),
        ),
      )
    : 0;
  const symbolFaceTightness = isProjectedSymbolBadge
    ? clamp01((0.18 - faceIntrusionBudget) / 0.08)
    : 0;
  const symbolProjectionCompression = isProjectedSymbolBadge
    ? clamp01(symbolFaceTightness * 0.56 + symbolPlacementLoad * 0.74)
    : 0;
  const starProjectionBias =
    isProjectedSymbolBadge && runtimeShapeClass === "star"
      ? clamp01(
          0.72 +
            symbolProjectionCompression * 0.28 +
            symbolFacingBias * 0.12 +
            symbolYawBias * 0.08,
        )
      : 0;
  const symbolResidualXFactor = lerpNumber(0.62, 0.32, symbolProjectionCompression);
  const symbolResidualYFactor = lerpNumber(0.22, 0.14, symbolProjectionCompression);
  const symbolResidualZFactor = lerpNumber(0.72, 0.44, symbolProjectionCompression);
  const symbolShoulderXFactor = lerpNumber(1, 0.56, symbolProjectionCompression);
  const symbolShoulderYFactor = lerpNumber(1, 0.72, symbolProjectionCompression);
  const symbolShoulderZFactor = lerpNumber(1, 0.62, symbolProjectionCompression);
  const symbolTangentXFactor = lerpNumber(1, 0.58, symbolProjectionCompression);
  const symbolTangentZFactor = lerpNumber(1, 0.64, symbolProjectionCompression);
  const symbolProjectedXMin = lerpNumber(0.0108, 0.0074, symbolProjectionCompression);
  const symbolProjectedXMax = lerpNumber(0.0156, 0.0126, symbolProjectionCompression);
  const symbolProjectedZMin = lerpNumber(0.0052, 0.0038, symbolProjectionCompression);
  const symbolProjectedZMax = lerpNumber(0.0094, 0.0074, symbolProjectionCompression);
  const symbolFloatingThresholdX = clampNumber(
    symbolSpanX * 0.44 + faceIntrusionBudget * 0.018,
    0.0088,
    0.0128,
  );
  const symbolFloatingThresholdZ = clampNumber(
    symbolSpanZ * 0.3 + screenFacingBias * 0.0015,
    0.0058,
    0.0086,
  );
  const deviceAttachmentShoulderOffset = isDeviceFamily
    ? (() => {
        const screenForwardBias = /screen-forward/i.test(normalizedProjectionVariantId) ? 1 : 0;
        const lensForwardBias = /lens-forward/i.test(normalizedProjectionVariantId) ? 1 : 0;

        return [
          Number(
            (
              side *
              (
                0.0074 +
                compactDeviceProjectionBias * 0.0072 +
                compactGenericDeviceProjectionBoost * 0.0018 +
                screenForwardBias * 0.0024 +
                lensForwardBias * 0.0016 +
                projectionEscapeIntensity * 0.0034
              )
            ).toFixed(4),
          ),
          Number(
              (
              0.0021 +
              compactDeviceProjectionBias * 0.0028 +
              compactGenericDeviceProjectionBoost * 0.0008 +
              screenForwardBias * 0.001 +
              projectionEscapeIntensity * 0.0022
            ).toFixed(4),
          ),
          Number(
            (
              0.0024 +
              compactDeviceProjectionBias * 0.0035 +
              compactGenericDeviceProjectionBoost * 0.0012 +
              screenForwardBias * 0.0006 +
              lensForwardBias * 0.0004 +
              projectionEscapeIntensity * 0.0018 +
              readabilityLiftIntensity * 0.0005
            ).toFixed(4),
          ),
        ];
      })()
    : isProjectedSymbolBadge
      ? [
          Number(
            (
              side *
              (
                (
                  0.0032 +
                  symbolFacingBias * 0.0018 +
                  symbolYawBias * 0.0009 +
                  starProjectionBias *
                    (0.0008 + symbolFacingBias * 0.0005 + symbolYawBias * 0.0002) +
                  projectionEscapeIntensity * 0.0016 +
                  readabilityLiftIntensity * 0.0007
                ) *
                  symbolShoulderXFactor
              )
            ).toFixed(4),
          ),
          Number(
            (
              (
                0.0005 +
                symbolFacingBias * 0.0005 +
                starProjectionBias * (0.00025 + symbolFacingBias * 0.00015) +
                projectionEscapeIntensity * 0.0006
              ) *
                symbolShoulderYFactor
            ).toFixed(4),
          ),
          Number(
            (
              (
                0.0008 +
                symbolFacingBias * 0.0008 +
                symbolYawBias * 0.0003 +
                starProjectionBias *
                  (0.00045 + symbolFacingBias * 0.00025 + symbolYawBias * 0.00015) +
                readabilityLiftIntensity * 0.0004
              ) *
                symbolShoulderZFactor
            ).toFixed(4),
          ),
        ]
    : [0, 0, 0];
  const deviceBaseResidualOffset = isDeviceFamily
    ? [
        Number((side * Math.abs(basePlacementOffset[0] ?? 0) * 0.12).toFixed(4)),
        Number(((basePlacementOffset[1] ?? 0) * 0.06).toFixed(4)),
        Number(((basePlacementOffset[2] ?? 0) * 0.06).toFixed(4)),
      ]
    : isProjectedSymbolBadge
      ? [
          Number(
            (side * Math.abs(basePlacementOffset[0] ?? 0) * symbolResidualXFactor).toFixed(4),
          ),
          Number(((basePlacementOffset[1] ?? 0) * symbolResidualYFactor).toFixed(4)),
          Number(
            (Math.max(0, basePlacementOffset[2] ?? 0) * symbolResidualZFactor).toFixed(4),
          ),
        ]
    : basePlacementOffset;
  const softenedAssemblyShift = roundVector(
    addVectors(
      scaleVector(
        assemblyOutwardShift,
        isDeviceFamily ? 0.46 : isBoatFamily ? 0.54 : isProjectedSymbolBadge ? 0.62 : 0.5,
      ),
      [
        Number(
          (
            side *
            (
              (isDeviceFamily ? 0.0006 : isProjectedSymbolBadge ? 0.0007 : 0.0004) *
                readabilityLiftIntensity +
              (isDeviceFamily ? 0.0005 : isProjectedSymbolBadge ? 0.0006 : 0.0003) *
                projectionEscapeIntensity
            )
          ).toFixed(4),
        ),
        Number(
          (
            (isDeviceFamily ? 0.0002 : isProjectedSymbolBadge ? 0.0005 : 0.0003) *
              readabilityLiftIntensity +
            (isDeviceFamily ? 0.0005 : isProjectedSymbolBadge ? 0.0007 : 0.0004) *
              projectionEscapeIntensity
          ).toFixed(4),
        ),
        Number(
          (
            (isDeviceFamily ? -0.0005 : isProjectedSymbolBadge ? 0.0002 : -0.0003) *
              projectionEscapeIntensity +
            (isDeviceFamily ? 0.0001 : isProjectedSymbolBadge ? 0.0004 : 0.0002) *
              readabilityLiftIntensity
          ).toFixed(4),
        ),
      ],
    ),
  );
  const anchorPlaneOffset = [
    0,
        Number(
      clampNumber(
          isDeviceFamily
            ? 0.0037 +
            compactDeviceProjectionBias * 0.0055 +
            compactGenericDeviceProjectionBoost * 0.0012 +
            projectionEscapeIntensity * 0.003 +
            readabilityLiftIntensity * 0.001
          : isProjectedSymbolBadge
            ? 0.0006 +
              symbolFacingBias * 0.0005 +
              symbolYawBias * 0.0002 +
              starProjectionBias * (0.00045 + symbolFacingBias * 0.00015) +
              projectionEscapeIntensity * 0.001 +
              readabilityLiftIntensity * 0.0004
          : Math.abs(basePlacementOffset[1] ?? 0) * 0.22 +
            (isBoatFamily ? 0.0012 : 0.0008) +
            projectionEscapeIntensity * (isBoatFamily ? 0.0008 : 0.0005) +
            readabilityLiftIntensity * 0.0001,
        isDeviceFamily ? 0.0028 : isProjectedSymbolBadge ? 0.0004 : 0.0004,
        isDeviceFamily
          ? compactDeviceProjectionBias > 0
            ? compactGenericDeviceProjectionBoost > 0
              ? 0.0136
              : 0.0122
            : 0.0078
          : isProjectedSymbolBadge ? 0.0026 : isBoatFamily ? 0.0026 : 0.0018,
      ).toFixed(4),
    ),
    0,
  ];
  const earSideTangentOffset = [
    Number(
      (
        side *
        clampNumber(
          isDeviceFamily
            ? 0.0092 +
              compactDeviceProjectionBias * 0.0085 +
              compactGenericDeviceProjectionBoost * 0.0024 +
              projectionEscapeIntensity * 0.0036 +
              readabilityLiftIntensity * 0.0012
            : isProjectedSymbolBadge
              ? (
                  Math.abs(basePlacementOffset[0] ?? 0) *
                    lerpNumber(0.22, 0.12, symbolProjectionCompression) +
                  0.002 +
                  symbolFacingBias * 0.0014 +
                  symbolYawBias * 0.0007 +
                  starProjectionBias *
                    (0.0008 + symbolFacingBias * 0.0005 + symbolYawBias * 0.0002) +
                  projectionEscapeIntensity * 0.0014
                ) *
                symbolTangentXFactor
            : Math.abs(basePlacementOffset[0] ?? 0) * 0.32 +
              (isBoatFamily ? 0.002 : 0.0016) +
              projectionEscapeIntensity * (isBoatFamily ? 0.0008 : 0.0005),
          isDeviceFamily
            ? compactDeviceProjectionBias > 0
              ? compactGenericDeviceProjectionBoost > 0
                ? 0.0142
                : 0.013
              : 0.0084
            : isProjectedSymbolBadge
              ? lerpNumber(0.0038, 0.0026, symbolProjectionCompression) +
                  starProjectionBias * 0.0008
              : isBoatFamily ? 0.002 : 0.0018,
          isDeviceFamily
            ? compactDeviceProjectionBias > 0
              ? compactGenericDeviceProjectionBoost > 0
                ? 0.0244
                : 0.0216
              : 0.0136
            : isProjectedSymbolBadge
              ? lerpNumber(0.0064, 0.0046, symbolProjectionCompression) +
                  starProjectionBias * 0.001
              : isBoatFamily ? 0.0042 : 0.0036,
        )
      ).toFixed(4),
    ),
    0,
    Number(
      clampNumber(
        isDeviceFamily
          ? 0.0028 +
            compactDeviceProjectionBias * 0.0037 +
            compactGenericDeviceProjectionBoost * 0.0012 +
            projectionEscapeIntensity * 0.0008 +
            readabilityLiftIntensity * 0.0007
          : isProjectedSymbolBadge
            ? (
                Math.abs(basePlacementOffset[2] ?? 0) *
                  lerpNumber(0.18, 0.11, symbolProjectionCompression) +
                0.0012 +
                symbolFacingBias * 0.0008 +
                starProjectionBias *
                  (0.0005 + symbolFacingBias * 0.00025 + symbolYawBias * 0.00015) +
                readabilityLiftIntensity * 0.0004
              ) *
              symbolTangentZFactor
          : Math.abs(basePlacementOffset[2] ?? 0) * 0.26 +
            (isBoatFamily ? 0.0006 : 0.0008) +
            readabilityLiftIntensity * 0.0001 -
            projectionEscapeIntensity * (isBoatFamily ? 0.0014 : 0.0008),
        isDeviceFamily
          ? 0.0014
          : isProjectedSymbolBadge
            ? lerpNumber(0.0016, 0.0011, symbolProjectionCompression) +
                starProjectionBias * 0.0005
            : isBoatFamily ? -0.0006 : 0,
        isDeviceFamily
          ? compactDeviceProjectionBias > 0
            ? compactGenericDeviceProjectionBoost > 0
              ? 0.0108
              : 0.0096
            : 0.0066
          : isProjectedSymbolBadge
            ? lerpNumber(0.0042, 0.0028, symbolProjectionCompression) +
                starProjectionBias * 0.0007
            : isBoatFamily ? 0.0018 : 0.0024,
      ).toFixed(4),
    ),
  ];
  const projectedOffsetPreClamp = addVectors(
    deviceBaseResidualOffset,
    anchorPlaneOffset,
    earSideTangentOffset,
    softenedAssemblyShift,
    deviceAttachmentShoulderOffset,
  );
  const projectedOffset = [
    Number(
      (
        side *
        clampNumber(
        Math.abs(projectedOffsetPreClamp[0] ?? 0),
          isDeviceFamily
            ? compactDeviceProjectionBias > 0
              ? 0.014
              : 0.0088
            : isProjectedSymbolBadge
              ? symbolProjectedXMin + starProjectionBias * 0.0006
              : isBoatFamily ? 0.0062 : 0.0058,
          isDeviceFamily
            ? compactDeviceProjectionBias > 0
              ? compactGenericDeviceProjectionBoost > 0
                ? 0.0272
                : 0.0246
              : 0.0138
            : isProjectedSymbolBadge
              ? symbolProjectedXMax + starProjectionBias * 0.001
              : isBoatFamily ? 0.0098 : 0.0092,
        )
      ).toFixed(4),
    ),
    Number(
      clampNumber(
        projectedOffsetPreClamp[1] ?? 0,
        isDeviceFamily
          ? 0.0026
          : isProjectedSymbolBadge
            ? 0.0002 + starProjectionBias * 0.0002
            : -0.0016,
        isDeviceFamily
          ? compactDeviceProjectionBias > 0
            ? compactGenericDeviceProjectionBoost > 0
              ? 0.0148
              : 0.0138
            : 0.0078
          : isProjectedSymbolBadge
            ? 0.0028 + starProjectionBias * 0.0004
            : isBoatFamily ? 0.002 : 0.0018,
      ).toFixed(4),
    ),
    Number(
      clampNumber(
        projectedOffsetPreClamp[2] ?? 0,
        isDeviceFamily
          ? 0.0018
          : isProjectedSymbolBadge
            ? symbolProjectedZMin + starProjectionBias * 0.0005
            : isBoatFamily ? -0.0004 : 0.0004,
        isDeviceFamily
          ? compactDeviceProjectionBias > 0
            ? compactGenericDeviceProjectionBoost > 0
              ? 0.014
              : 0.0126
            : 0.0072
          : isProjectedSymbolBadge
            ? symbolProjectedZMax + starProjectionBias * 0.0007
            : isBoatFamily ? 0.0032 : 0.0044,
      ).toFixed(4),
    ),
  ];
  const projectedAnchorPose = addVectors(
    Array.isArray(targetAnchorPosition) ? targetAnchorPosition : [0, 0, 0],
    projectedOffset,
  );
  const anchorProjectionFailureKind =
    reAnchorIntensity > 0.45
      ? "face-intrusion"
      : (isProjectedSymbolBadge
          ? Math.abs(projectedOffset[0] ?? 0) > symbolFloatingThresholdX ||
            Math.abs(projectedOffset[2] ?? 0) > symbolFloatingThresholdZ
          : Math.abs(projectedOffsetPreClamp[0] ?? 0) >
              (isDeviceFamily ? 0.0092 : isBoatFamily ? 0.0098 : 0.0092)) ||
          Math.abs((assemblyOutwardShift?.[0] ?? 0)) >
            (isDeviceFamily ? 0.0032 : isBoatFamily ? 0.0036 : 0.0032)
        ? "floating-off-ear"
        : readabilityLiftIntensity > 0.4
          ? "readability-on-plane"
          : undefined;

  return {
    projectedAnchorPose,
    anchorPlaneOffset,
    earSideTangentOffset,
    anchorProjectionFailureKind,
    outlineCompilerMode,
    outlineProjectionVariantId,
  };
}

export function getIdealAccessoryScaleMultiplier(family) {
  if (family === "badge") {
    return 0.74;
  }

  if (family === "star") {
    return 0.78;
  }

  if (family === "flower") {
    return 0.72;
  }

  if (family === "clover-charm") {
    return 0.74;
  }

  if (family === "open-botanical-ornament") {
    return 0.8;
  }

  if (family === "open-symbol-ornament") {
    return 0.9;
  }

  if (family === "fish-charm") {
    return 0.76;
  }

  if (family === "camera-charm") {
    return 0.76;
  }

  if (family === "boat-charm") {
    return 0.82;
  }

  if (family === "rocket-charm") {
    return 1.04;
  }

  if (family === "device-generic-charm") {
    return 0.74;
  }

  if (family === "vehicle-generic-charm") {
    return 1.08;
  }

  if (family === "berry-charm") {
    return 0.84;
  }

  if (family === "cloud-charm" || family === "cloud") {
    return 0.82;
  }

  if (family === "tie" || family === "bow") {
    return 1.03;
  }

  return 1;
}

export function getCoarseAccessoryScaleMultiplier(family) {
  if (family === "badge") {
    return 0.56;
  }

  if (family === "star") {
    return 0.6;
  }

  if (family === "flower") {
    return 0.46;
  }

  if (family === "clover-charm") {
    return 0.48;
  }

  if (family === "open-botanical-ornament") {
    return 0.58;
  }

  if (family === "open-symbol-ornament") {
    return 0.66;
  }

  if (family === "camera-charm") {
    return 0.58;
  }

  if (family === "boat-charm") {
    return 0.7;
  }

  if (
    family === "rocket-charm" ||
    family === "device-generic-charm" ||
    family === "vehicle-generic-charm"
  ) {
    return family === "device-generic-charm" ? 0.58 : 0.64;
  }

  return family === "fish-charm" ||
    family === "berry-charm" ||
    family === "cloud-charm" ||
    family === "cloud"
    ? family === "fish-charm"
      ? 0.54
      : family === "berry-charm"
        ? 0.64
        : 0.62
    : 0.88;
}

export function getRoleEmphasisMultiplier(family, role, passIndex) {
  if (family === "camera-charm") {
    if (role === "camera-lens") {
      return passIndex === 1 ? 1.14 : passIndex >= 3 ? 1.34 : 1.22;
    }

    if (role === "device-body") {
      return passIndex >= 3 ? 1.28 : 1.18;
    }

    if (role === "camera-top") {
      return passIndex >= 3 ? 0.72 : 0.82;
    }

    if (role === "camera-viewfinder" || role === "camera-button") {
      return passIndex >= 3 ? 0.62 : 0.74;
    }

    if (role === "hang-slot") {
      return passIndex >= 2 ? 0.14 : 0.22;
    }
  }

  if (family === "boat-charm") {
    if (role === "boat-sail") {
      return passIndex === 1 ? 0.94 : passIndex >= 3 ? 1.08 : 1;
    }

    if (role === "boat-mast") {
      return passIndex >= 3 ? 1.02 : 0.96;
    }

    if (role === "vehicle-body") {
      return passIndex >= 3 ? 1.08 : 1.02;
    }
  }

  if (family === "rocket-charm") {
    if (role === "rocket-fin" || role === "rocket-nozzle") {
      return passIndex === 1 ? 0.88 : passIndex >= 3 ? 1.14 : 1.04;
    }
  }

  if (family === "device-generic-charm") {
    if (role === "screen-face") {
      return passIndex === 1 ? 1.18 : passIndex >= 3 ? 1.48 : 1.32;
    }

    if (role === "device-body") {
      return passIndex >= 3 ? 1.34 : 1.22;
    }

    if (role === "device-feature") {
      return passIndex >= 3 ? 1.08 : 0.96;
    }

    if (role === "hang-slot") {
      return passIndex >= 2 ? 0.12 : 0.2;
    }
  }

  if (family === "flower") {
    if (role === "petal") {
      return passIndex === 1 ? 0.78 : passIndex === 2 ? 0.9 : 0.96;
    }

    if (role === "flower-core") {
      return passIndex >= 3 ? 1.12 : 1.04;
    }
  }

  if (family === "clover-charm") {
    if (role === "leaf") {
      return passIndex === 1 ? 0.78 : passIndex === 2 ? 0.9 : 0.96;
    }

    if (role === "stem") {
      return passIndex >= 3 ? 0.98 : 0.88;
    }
  }

  if (family === "open-botanical-ornament") {
    if (role === "leaf" || role === "petal") {
      return passIndex === 1 ? 0.84 : passIndex === 2 ? 1.05 : 1.12;
    }

    if (role === "stem") {
      return passIndex >= 3 ? 1.08 : 0.92;
    }
  }

  if (family === "open-symbol-ornament" && role === "symbol-arm") {
    return passIndex === 1 ? 0.86 : passIndex >= 3 ? 1.12 : 1.04;
  }

  if (family === "star") {
    if (role === "ray") {
      return passIndex === 1 ? 0.9 : passIndex >= 3 ? 1.18 : 1.08;
    }

    if (role === "core") {
      return passIndex >= 3 ? 0.92 : 0.98;
    }
  }

  if (family === "fish-charm") {
    if (role === "tail") {
      return passIndex === 1 ? 0.92 : passIndex === 2 ? 1.04 : 1.12;
    }

    if (role === "fin") {
      return passIndex === 1 ? 0.84 : passIndex === 2 ? 1.06 : 1.16;
    }

    if (role === "fish-body") {
      return passIndex >= 3 ? 1.05 : 1;
    }
  }

  if (family === "berry-charm") {
    if (role === "leaf") {
      return passIndex === 1 ? 0.78 : passIndex === 2 ? 1.04 : 1.14;
    }

    if (role === "berry") {
      return passIndex >= 3 ? 1.04 : 1;
    }
  }

  if (family === "cloud-charm" || family === "cloud") {
    if (role === "cloud-base") {
      return passIndex === 1 ? 0.84 : passIndex === 2 ? 1.08 : 1.16;
    }

    if (role === "cloud") {
      return passIndex >= 3 ? 1.05 : 1;
    }
  }

  if (family === "tie" && role === "blade") {
    return passIndex >= 2 ? 1.08 : 1;
  }

  if (family === "bow" && (role === "wing" || role === "tail")) {
    return passIndex >= 2 ? 1.08 : 1;
  }

  return 1;
}

function getPrecisionSpanAxes(partProfile, partId, shapeClass) {
  if (partId === "camera-lens") {
    return [0, 1];
  }

  if (partId === "boat-mast") {
    return [2];
  }

  if (partId === "boat-sail") {
    return [0, 2];
  }

  if (partId === "hang-slot" || partId === "ring") {
    return [0, 2];
  }

  if (partProfile?.profile === "lens") {
    return [0, 1];
  }

  if (partProfile?.profile === "mast") {
    return [2];
  }

  if (partProfile?.profile === "sail") {
    return [0, 2];
  }

  if (shapeClass === "camera-charm" || shapeClass === "boat-charm") {
    return [0, 2];
  }

  return [0, 2];
}

function applyScaleFactorToAxes(scale, axes, factor) {
  return scale.map((value, axis) =>
    Number((value * (axes.includes(axis) ? factor : 1)).toFixed(4)),
  );
}

export function getPreferredPrecisionOffset(
  baseOffset,
  execution,
  geometryRecipe,
  refinementStage,
  partId,
  repairActions = [],
) {
  if (
    !Array.isArray(baseOffset) ||
    !usesStructuralAttachmentPrecision(execution, geometryRecipe)
  ) {
    return baseOffset;
  }

  const attachmentAnchorMap = new Map(
    getStructuralBlueprintAttachmentAnchors(execution, geometryRecipe).map((anchor) => [
      anchor.partId,
      anchor,
    ]),
  );
  const preferredAnchor = attachmentAnchorMap.get(partId);

  if (!preferredAnchor || !Array.isArray(preferredAnchor.preferredOffset)) {
    return baseOffset;
  }

  const chestWrapExecution = isHostCoupledChestWrapExecution(
    execution,
    geometryRecipe,
  );
  const familyPolicyId = getHardSurfaceFamilyPolicyId(execution, geometryRecipe);
  const isDeviceFamily = familyPolicyId === "hard-surface-device";
  const rebuildIntensity = getRepairActionIntensity(repairActions, "rebuild-from-root");
  const reparentIntensity = getRepairActionIntensity(repairActions, "re-parent-part");
  const reAnchorIntensity = getRepairActionIntensity(repairActions, "re-anchor");
  const tightenCohesionIntensity = getRepairActionIntensity(
    repairActions,
    "tighten-cohesion",
  );
  const baseBlend =
    refinementStage === "blocking"
      ? chestWrapExecution
        ? 0.74
        : 0.84
      : refinementStage === "silhouette-forming"
        ? chestWrapExecution
          ? 0.82
          : 0.74
        : refinementStage === "assembly-rooting"
          ? chestWrapExecution
            ? 0.97
            : 0.92
          : isDeviceFamily
            ? 0.72
            : chestWrapExecution
              ? 0.88
              : 0.58;
  const blend = clamp01(
    baseBlend +
      rebuildIntensity * (chestWrapExecution ? 0.18 : 0.14) +
      reparentIntensity * (chestWrapExecution ? 0.22 : 0.18) +
      (chestWrapExecution
        ? reAnchorIntensity * 0.12 + tightenCohesionIntensity * 0.16
        : 0),
  );
  let preferredOffset = [...preferredAnchor.preferredOffset];

  if (
    isDeviceFamily &&
    (refinementStage === "host-fit" || refinementStage === "final-review")
  ) {
    const cohesionTighten = clamp01(
      rebuildIntensity * 0.3 +
        reparentIntensity * 0.24 +
        reAnchorIntensity * 0.22 +
        tightenCohesionIntensity * 0.2,
    );

    if (cohesionTighten > 0) {
      let axisTargets = [0.86, 0.94, 0.86];

      if (preferredAnchor.mountFace === "front") {
        axisTargets =
          partId === "camera-lens" ? [0.92, 0.96, 0.9] : [0.78, 0.92, 0.8];
      } else if (
        preferredAnchor.mountFace === "top" ||
        preferredAnchor.mountFace === "top-right" ||
        preferredAnchor.mountFace === "top-left"
      ) {
        axisTargets = [0.72, 0.9, 0.74];
      }

      preferredOffset = preferredOffset.map((value, axis) =>
        Number(lerpNumber(value, value * axisTargets[axis], cohesionTighten).toFixed(4)),
      );
    }
  }

  if (
    chestWrapExecution &&
    (
      refinementStage === "assembly-rooting" ||
      refinementStage === "host-fit" ||
      refinementStage === "render-driven-rebuild" ||
      refinementStage === "final-review"
    )
  ) {
    const cohesionTighten = clamp01(
      rebuildIntensity * 0.3 +
        reparentIntensity * 0.34 +
        reAnchorIntensity * 0.24 +
        tightenCohesionIntensity * 0.28,
    );
    const chestWrapReadabilityStageBias =
      refinementStage === "host-fit" || refinementStage === "final-review"
        ? 1
        : refinementStage === "render-driven-rebuild"
          ? 0.92
          : 0.84;

    if (cohesionTighten > 0) {
      let axisTargets =
        preferredAnchor.mountFace === "center"
          ? [0.78, 1.22, 1.2]
          : [0.86, 1.2, 1.18];

      preferredOffset = preferredOffset.map((value, axis) =>
        Number(lerpNumber(value, value * axisTargets[axis], cohesionTighten).toFixed(4)),
      );

      if (partId === "knot") {
        preferredOffset[1] = Number(
          (
            preferredOffset[1] +
            cohesionTighten * 0.0018 * chestWrapReadabilityStageBias
          ).toFixed(4),
        );
        preferredOffset[2] = Number(
          (
            preferredOffset[2] -
            cohesionTighten * 0.0024 * chestWrapReadabilityStageBias
          ).toFixed(4),
        );
      } else if (partId === "tail-left" || partId === "tail-right") {
        preferredOffset[0] = Number(
          (
            preferredOffset[0] *
            (1 - cohesionTighten * 0.12 * chestWrapReadabilityStageBias)
          ).toFixed(4),
        );
        preferredOffset[1] = Number(
          (
            preferredOffset[1] +
            cohesionTighten * 0.0016 * chestWrapReadabilityStageBias
          ).toFixed(4),
        );
        preferredOffset[2] = Number(
          (
            preferredOffset[2] -
            cohesionTighten * 0.0022 * chestWrapReadabilityStageBias
          ).toFixed(4),
        );
      }
    }
  }

  return lerpVector(baseOffset, preferredOffset, blend).map((value) =>
    Number((value ?? 0).toFixed(4)),
  );
}

export function applyHardSurfacePrecisionShapeToScale(
  scale,
  execution,
  geometryRecipe,
  refinementStage,
  partId,
  partProfile,
  repairActions = [],
) {
  if (
    !Array.isArray(scale) ||
    !usesStructuralAttachmentPrecision(execution, geometryRecipe)
  ) {
    return scale;
  }

  const shapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const chestWrapExecution = isHostCoupledChestWrapExecution(
    execution,
    geometryRecipe,
  );
  const chestRigidExecution = isHostCoupledChestRigidFrontReadableExecution(
    execution,
    geometryRecipe,
  );
  const compactChestWrapProjectionVariant =
    chestWrapExecution &&
    /compact/i.test(
      `${getExecutionVariantId(execution, geometryRecipe) ?? ""} ${
        getHardSurfaceOutlineProjectionVariantId(execution, geometryRecipe) ?? ""
      }`,
    );
  const readOrderTargets = buildFallbackReadOrderTargets(execution, geometryRecipe);
  const dominantSpanOwner =
    getStructuralBlueprintDominantSpanOwner(execution, geometryRecipe) ??
    readOrderTargets[0];
  const dominantContour = getStructuralBlueprintDominantContour(execution, geometryRecipe);
  const sideDepthProfile = getStructuralBlueprintSideDepthProfile(execution, geometryRecipe);
  const keepoutMap = new Map(
    getStructuralBlueprintSilhouetteKeepouts(execution, geometryRecipe)
      .filter((entry) => typeof entry.partId === "string")
      .map((entry) => [entry.partId, entry]),
  );
  const depthTargetMap = new Map(
    getStructuralBlueprintPartDepthTargets(execution, geometryRecipe).map((entry) => [
      entry.partId,
      entry,
    ]),
  );
  const isDominant = partId === dominantSpanOwner;
  const isFirstRead = partId === readOrderTargets[0];
  const isSecondRead = partId === readOrderTargets[1];
  const isAttachment = partProfile?.silhouetteRole === "attachment";
  const reAnchorIntensity = getRepairActionIntensity(repairActions, "re-anchor");
  const reshapeIntensity = getRepairActionIntensity(repairActions, "reshape-silhouette");
  const rebuildIntensity = getRepairActionIntensity(repairActions, "rebuild-from-root");
  const promoteIntensity = getRepairActionIntensity(repairActions, "promote-critical-part");
  const recolorIntensity = getRepairActionIntensity(
    repairActions,
    "re-materialize-color-zone",
  );
  const tightenCohesionIntensity = Math.max(
    getRepairActionIntensity(repairActions, "tighten-cohesion"),
    getRepairActionIntensity(repairActions, "re-parent-part"),
  );
  const reliefFlushDepth =
    getStructuralBlueprintReliefFlushDepth(execution, geometryRecipe) ?? 0;
  const attachmentCohesionBudget =
    getStructuralBlueprintAttachmentCohesionBudget(execution, geometryRecipe) ?? 0.82;
  const isDeviceLane =
    shapeClass === "camera-charm" || shapeClass === "device-generic-charm";
  const chestRigidDeviceExecution = chestRigidExecution && isDeviceLane;
  const compactDeviceProjectionVariant = isCompactHardSurfaceDeviceProjectionVariant(
    execution,
    geometryRecipe,
  );
  const deviceProjectionCompaction = isDeviceLane
    ? clamp01(
        reAnchorIntensity * 0.42 +
          rebuildIntensity * 0.36 +
          tightenCohesionIntensity * 0.14,
      ) * (chestRigidDeviceExecution ? 0.38 : 1)
    : 0;
  const shouldGuardDeviceProjection =
    refinementStage === "render-driven-rebuild" ||
    refinementStage === "host-fit" ||
    refinementStage === "final-review";
  const lateChestRigidDeviceStage =
    chestRigidDeviceExecution &&
    (
      refinementStage === "assembly-rooting" ||
      refinementStage === "host-fit" ||
      refinementStage === "render-driven-rebuild" ||
      refinementStage === "final-review"
    );
  let nextScale = [...scale];
  let xFactor = 1;
  let yFactor = 1;
  let zFactor = 1;

  switch (refinementStage) {
    case "blocking":
      if (isDominant) {
        xFactor *= 1.18;
        zFactor *= 1.12;
        yFactor *=
          sideDepthProfile === "front-loaded" || sideDepthProfile === "deep-body"
            ? 1.22
            : 1.1;
      } else if (isFirstRead) {
        xFactor *= 1.08;
        zFactor *= 1.06;
        yFactor *= 1.12;
      } else if (isAttachment) {
        xFactor *= 0.38;
        yFactor *= 0.42;
        zFactor *= 0.38;
      } else if (partProfile?.silhouetteRole === "support") {
        xFactor *= 0.62;
        yFactor *= 0.7;
        zFactor *= 0.68;
      } else {
        xFactor *= 0.78;
        yFactor *= 0.82;
        zFactor *= 0.8;
      }
      break;
    case "silhouette-forming":
      if (isDominant) {
        xFactor *= 1.12;
        zFactor *= 1.08;
        yFactor *= 1.14;
      }
      if (isFirstRead && !isDominant) {
        xFactor *= 1.12;
        zFactor *= 1.08;
        yFactor *= 1.16;
      } else if (isSecondRead) {
        xFactor *= 1.04;
        zFactor *= 1.04;
        yFactor *= 1.08;
      }
      if (isAttachment) {
        xFactor *= 0.48;
        yFactor *= 0.54;
        zFactor *= 0.48;
      }
      break;
    case "assembly-rooting":
      if (isDominant) {
        xFactor *= 1.04;
        zFactor *= 1.02;
        yFactor *= 1.08;
      }
      if (partProfile?.silhouetteRole === "support") {
        xFactor *= 0.94;
        yFactor *= 1.02;
        zFactor *= 0.98;
      }
      if (isAttachment) {
        xFactor *= 0.72;
        yFactor *= 0.78;
        zFactor *= 0.72;
      }
      break;
    case "render-driven-rebuild":
    case "host-fit":
    case "final-review":
      if (isAttachment) {
        xFactor *= 0.74;
        yFactor *= 0.8;
        zFactor *= 0.74;
      }
      if (shouldGuardDeviceProjection && isDeviceLane && (isDominant || isFirstRead)) {
        xFactor *= 1 - deviceProjectionCompaction * (compactDeviceProjectionVariant ? 0.14 : 0.11);
        yFactor *= 1 - deviceProjectionCompaction * (compactDeviceProjectionVariant ? 0.16 : 0.06);
        zFactor *= 1 - deviceProjectionCompaction * (compactDeviceProjectionVariant ? 0.08 : 0.13);
      }
      break;
    default:
      break;
  }

  if (chestWrapExecution) {
    const chestWrapAssemblyLift = clamp01(
      tightenCohesionIntensity * attachmentCohesionBudget +
        rebuildIntensity * 0.24 +
        reAnchorIntensity * 0.18,
    );
    const chestWrapReadabilityLift = clamp01(
      chestWrapAssemblyLift * 0.78 +
        reshapeIntensity * 0.24 +
        promoteIntensity * 0.34,
    );
    const lateChestWrapStage =
      refinementStage === "assembly-rooting" ||
      refinementStage === "host-fit" ||
      refinementStage === "render-driven-rebuild" ||
      refinementStage === "final-review";

    if (partId === "wrap-band") {
      if (refinementStage === "blocking") {
        xFactor *= compactChestWrapProjectionVariant ? 0.92 : 1.04;
        yFactor *= 0.96;
        zFactor *= compactChestWrapProjectionVariant ? 0.9 : 1.02;
      } else {
        xFactor *= compactChestWrapProjectionVariant ? 0.64 : 0.8;
        yFactor *= 0.9;
        zFactor *= compactChestWrapProjectionVariant ? 0.58 : 0.76;
        if (lateChestWrapStage) {
          xFactor *= 1 - chestWrapReadabilityLift * (compactChestWrapProjectionVariant ? 0.14 : 0.08);
          yFactor *= 1 - chestWrapReadabilityLift * 0.04;
          zFactor *= 1 - chestWrapReadabilityLift * (compactChestWrapProjectionVariant ? 0.16 : 0.1);
        }
      }
    } else if (partId === "knot") {
      xFactor *= refinementStage === "blocking"
        ? compactChestWrapProjectionVariant ? 1.18 : 1.04
        : compactChestWrapProjectionVariant ? 1.46 : 1.28;
      yFactor *= refinementStage === "blocking"
        ? compactChestWrapProjectionVariant ? 1.18 : 1.12
        : compactChestWrapProjectionVariant ? 1.28 : 1.22;
      zFactor *= refinementStage === "blocking"
        ? compactChestWrapProjectionVariant ? 1.2 : 1.08
        : compactChestWrapProjectionVariant ? 1.58 : 1.34;
      if (lateChestWrapStage) {
        xFactor *= 1 + chestWrapAssemblyLift * (compactChestWrapProjectionVariant ? 0.18 : 0.12) + chestWrapReadabilityLift * (compactChestWrapProjectionVariant ? 0.12 : 0.08);
        yFactor *= 1 + chestWrapAssemblyLift * (compactChestWrapProjectionVariant ? 0.12 : 0.08);
        zFactor *= 1 + chestWrapAssemblyLift * (compactChestWrapProjectionVariant ? 0.24 : 0.18) + chestWrapReadabilityLift * (compactChestWrapProjectionVariant ? 0.18 : 0.12);
      }
    } else if (partId === "tail-left" || partId === "tail-right") {
      xFactor *= refinementStage === "blocking"
        ? compactChestWrapProjectionVariant ? 0.86 : 0.92
        : compactChestWrapProjectionVariant ? 0.92 : 0.98;
      yFactor *= refinementStage === "blocking"
        ? compactChestWrapProjectionVariant ? 1.08 : 1.02
        : compactChestWrapProjectionVariant ? 1.14 : 1.08;
      zFactor *= refinementStage === "blocking"
        ? compactChestWrapProjectionVariant ? 1.04 : 0.96
        : compactChestWrapProjectionVariant ? 1.28 : 1.14;
      if (lateChestWrapStage) {
        xFactor *= 1 - chestWrapReadabilityLift * (compactChestWrapProjectionVariant ? 0.03 : 0.06);
        yFactor *= 1 + chestWrapAssemblyLift * (compactChestWrapProjectionVariant ? 0.1 : 0.06);
        zFactor *= 1 + chestWrapAssemblyLift * (compactChestWrapProjectionVariant ? 0.16 : 0.1);
      }
    }
  }

  if (shapeClass === "camera-charm") {
    if (partId === "camera-lens") {
      xFactor *= refinementStage === "blocking" ? 1.22 : 1.18;
      yFactor *= refinementStage === "blocking" ? 1.24 : 1.18;
      zFactor *= refinementStage === "blocking" ? 1.16 : 1.18;
      if (shouldGuardDeviceProjection) {
        xFactor *= 1 - deviceProjectionCompaction * 0.06;
        yFactor *= 1 - deviceProjectionCompaction * 0.03;
        zFactor *= 1 - deviceProjectionCompaction * 0.06;
      }
      if (typeof dominantContour === "string" && dominantContour.includes("lens")) {
        xFactor *= 1.04;
        zFactor *= 1.04;
      }
      if (lateChestRigidDeviceStage) {
        xFactor *= 1.1;
        yFactor *= 1.18;
        zFactor *= 1.08;
      }
      if (compactDeviceProjectionVariant) {
        xFactor *= 0.94;
        yFactor *= 0.86;
        zFactor *= 1.04;
      }
    } else if (partId === "device-body") {
      xFactor *= 1.2;
      yFactor *= sideDepthProfile === "front-loaded" ? 1.1 : 1.06;
      zFactor *= 1.32;
      if (shouldGuardDeviceProjection) {
        xFactor *= 1 - deviceProjectionCompaction * 0.07;
        yFactor *= 1 - deviceProjectionCompaction * 0.04;
        zFactor *= 1 - deviceProjectionCompaction * 0.09;
      }
      if (lateChestRigidDeviceStage) {
        xFactor *= 0.84;
        yFactor *= 0.98;
        zFactor *= 0.82;
      }
      if (compactDeviceProjectionVariant) {
        xFactor *= 0.94;
        yFactor *= 0.92;
        zFactor *= 1.06;
      }
    } else if (partId === "camera-faceplate") {
      xFactor *= 1.18;
      yFactor *= 0.42;
      zFactor *= 1.12;
      if (shouldGuardDeviceProjection) {
        xFactor *= 1 - deviceProjectionCompaction * 0.08;
        yFactor *= 1 - deviceProjectionCompaction * 0.03;
        zFactor *= 1 - deviceProjectionCompaction * 0.08;
      }
      if (lateChestRigidDeviceStage) {
        xFactor *= 0.72;
        yFactor *= 0.96;
        zFactor *= 0.74;
      }
      if (compactDeviceProjectionVariant) {
        xFactor *= 0.92;
        yFactor *= 0.9;
        zFactor *= 1.04;
      }
    } else if (
      partId === "camera-top" ||
      partId === "camera-viewfinder" ||
      partId === "camera-button"
    ) {
      xFactor *= refinementStage === "blocking" ? 0.42 : 0.56;
      yFactor *= refinementStage === "blocking" ? 0.42 : 0.54;
      zFactor *= refinementStage === "blocking" ? 0.46 : 0.62;
      if (compactDeviceProjectionVariant) {
        xFactor *= 1.12;
        yFactor *= 0.92;
        zFactor *= 1.16;
      }
    } else if (partId === "hang-slot") {
      xFactor *= 0.1;
      yFactor *= 0.12;
      zFactor *= 0.1;
    }
  } else if (shapeClass === "device-generic-charm") {
    if (partId === "device-body") {
      xFactor *= refinementStage === "blocking" ? 1.3 : 1.42;
      yFactor *= refinementStage === "blocking" ? 1.12 : 1.2;
      zFactor *= refinementStage === "blocking" ? 1.26 : 1.34;
      if (shouldGuardDeviceProjection) {
        xFactor *= 1 - deviceProjectionCompaction * 0.08;
        yFactor *= 1 - deviceProjectionCompaction * 0.05;
        zFactor *= 1 - deviceProjectionCompaction * 0.1;
      }
    } else if (partId === "screen-face") {
      xFactor *= refinementStage === "blocking" ? 1.3 : 1.42;
      yFactor *= refinementStage === "blocking" ? 0.3 : 0.38;
      zFactor *= refinementStage === "blocking" ? 1.22 : 1.3;
      if (shouldGuardDeviceProjection) {
        xFactor *= 1 - deviceProjectionCompaction * 0.09;
        yFactor *= 1 - deviceProjectionCompaction * 0.04;
        zFactor *= 1 - deviceProjectionCompaction * 0.1;
      }
    } else if (partId === "camera-dot") {
      xFactor *= 0.34;
      yFactor *= 0.26;
      zFactor *= 0.34;
    } else if (partId === "hang-slot") {
      xFactor *= 0.02;
      yFactor *= 0.04;
      zFactor *= 0.02;
    }
  } else if (shapeClass === "boat-charm") {
    if (partId === "boat-hull") {
      xFactor *= 1.12;
      yFactor *= 1.12;
      zFactor *= 1.3;
    } else if (partId === "boat-bow" || partId === "boat-stern") {
      xFactor *= 1.22;
      yFactor *= 0.84;
      zFactor *= 1.12;
    } else if (partId === "boat-deck") {
      xFactor *= 0.84;
      yFactor *= 0.7;
      zFactor *= 1;
    } else if (partId === "boat-mast") {
      xFactor *= 0.82;
      yFactor *= 0.72;
      zFactor *= refinementStage === "blocking" ? 1.18 : 1.24;
    } else if (partId === "boat-sail") {
      xFactor *= refinementStage === "blocking" ? 1.24 : 1.38;
      yFactor *= 0.52;
      zFactor *= refinementStage === "blocking" ? 1.36 : 1.54;
      if (typeof dominantContour === "string" && dominantContour.includes("sail")) {
        xFactor *= 1.04;
        zFactor *= 1.04;
      }
    } else if (partId === "hang-slot") {
      xFactor *= 0.12;
      yFactor *= 0.12;
      zFactor *= 0.1;
    }
  }

  const keepout = keepoutMap.get(partId);
  if (keepout?.behavior === "subordinate") {
    xFactor *= 0.7;
    yFactor *= 0.76;
    zFactor *= 0.7;
  } else if (keepout?.behavior === "keep-within-root") {
    xFactor *= 0.92;
    yFactor *= 0.96;
    zFactor *= 0.9;
  } else if (keepout?.behavior === "rooted-only") {
    xFactor *= 0.96;
    yFactor *= 1.02;
    zFactor *= 1.04;
  }

  const structuralBoost = clamp01(
    reshapeIntensity * 0.34 + rebuildIntensity * 0.3 + promoteIntensity * 0.18,
  );
  const readabilityBoost = clamp01(promoteIntensity * 0.28 + recolorIntensity * 0.34);
  if (isDominant || isFirstRead) {
    xFactor *= 1 + structuralBoost * 0.08;
    yFactor *= 1 + structuralBoost * 0.08;
    zFactor *= 1 + structuralBoost * 0.06;
  }

  if (
    ["camera-lens", "camera-top", "camera-viewfinder", "screen-face", "camera-dot", "boat-mast", "boat-sail"].includes(
      partId,
    )
  ) {
    const flushTighten = clamp01(
      tightenCohesionIntensity * attachmentCohesionBudget + reliefFlushDepth * 18,
    );
    xFactor *= 1 + readabilityBoost * 0.06 + flushTighten * 0.04;
    zFactor *= 1 + readabilityBoost * 0.06 + flushTighten * 0.04;
    yFactor *= Math.max(0.76, 1 - flushTighten * 0.16);
  }

  nextScale = [
    Number((nextScale[0] * xFactor).toFixed(4)),
    Number((nextScale[1] * yFactor).toFixed(4)),
    Number((nextScale[2] * zFactor).toFixed(4)),
  ];

  const depthTarget = depthTargetMap.get(partId);
  if (depthTarget) {
    const minDepth =
      refinementStage === "host-fit" || refinementStage === "final-review"
        ? depthTarget.minDepth * 0.92
        : depthTarget.minDepth;
    const maxDepth =
      refinementStage === "blocking"
        ? depthTarget.maxDepth * 1.04
        : depthTarget.maxDepth;
    nextScale[1] = Number(
      Math.max(minDepth, Math.min(maxDepth, nextScale[1] ?? minDepth)).toFixed(4),
    );
  }

  return nextScale;
}

export function getPartSpanMeasure(part) {
  const size =
    typeof part?.size === "number" && Number.isFinite(part.size) ? part.size : 0.02;
  const scale = Array.isArray(part?.scale) ? part.scale : [1, 1, 1];
  return (
    Math.max(
      Math.abs((scale[0] ?? 1) * size),
      Math.abs((scale[1] ?? 1) * size),
      Math.abs((scale[2] ?? 1) * size),
    ) * 2
  );
}

export function rebalanceRuntimePartBlueprintBasesBySpanTargets(
  partBlueprintBases,
  execution,
  geometryRecipe,
  refinementStage,
  getGeometryPartProfileMap,
) {
  if (!Array.isArray(partBlueprintBases) || partBlueprintBases.length === 0) {
    return partBlueprintBases;
  }

  const spanTargets = getStructuralBlueprintPartSpanTargets(execution, geometryRecipe);
  if (spanTargets.length === 0) {
    return partBlueprintBases;
  }

  const targetMap = new Map(spanTargets.map((entry) => [entry.partId, entry]));
  const keepoutMap = new Map(
    getStructuralBlueprintSilhouetteKeepouts(execution, geometryRecipe)
      .filter((entry) => typeof entry.partId === "string")
      .map((entry) => [entry.partId, entry]),
  );
  const shapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const dominantSpanOwner = getStructuralBlueprintDominantSpanOwner(execution, geometryRecipe);
  const profileMap =
    typeof getGeometryPartProfileMap === "function"
      ? getGeometryPartProfileMap(geometryRecipe)
      : new Map();
  const totalSpan = partBlueprintBases.reduce((sum, part) => sum + getPartSpanMeasure(part), 0);

  if (!(totalSpan > 0)) {
    return partBlueprintBases;
  }

  const stageBlend =
    refinementStage === "blocking"
      ? 0.46
      : refinementStage === "silhouette-forming"
        ? 0.62
        : refinementStage === "assembly-rooting"
          ? 0.44
          : 0.28;

  return partBlueprintBases.map((part) => {
    const target = targetMap.get(part.partId);
    if (!target || !Array.isArray(part.scale)) {
      return part;
    }

    const share = getPartSpanMeasure(part) / totalSpan;
    let factor = 1;
    if (share < target.minShare) {
      factor = Math.min(1.28, target.minShare / Math.max(share, 0.001));
    } else if (share > target.maxShare) {
      factor = Math.max(0.68, target.maxShare / Math.max(share, 0.001));
    }

    if (part.partId === dominantSpanOwner && share < target.minShare) {
      factor = Math.min(1.32, factor + 0.08);
    }

    if (keepoutMap.get(part.partId)?.behavior === "subordinate" && share > target.maxShare) {
      factor = Math.min(factor, 0.78);
    }

    factor = lerpNumber(1, factor, stageBlend);
    const axes = getPrecisionSpanAxes(profileMap.get(part.partId), part.partId, shapeClass);

    return {
      ...part,
      scale: applyScaleFactorToAxes(part.scale, axes, factor),
    };
  });
}

function cloneGeometryRecipeForVariantOverride(geometryRecipe, variantId) {
  return {
    ...geometryRecipe,
    variantId,
    representationMode: "profile-relief-2_5d",
    familyPolicyId:
      typeof geometryRecipe?.familyPolicyId === "string"
        ? geometryRecipe.familyPolicyId
        : getHardSurfaceFamilyPolicyId(null, geometryRecipe),
    profileVariantId:
      typeof geometryRecipe?.profileVariantId === "string"
        ? geometryRecipe.profileVariantId
        : variantId,
    profileCurves: Array.isArray(geometryRecipe?.profileCurves)
      ? [...geometryRecipe.profileCurves]
      : [],
    parts: Array.isArray(geometryRecipe?.parts)
      ? geometryRecipe.parts.map((part) => ({
          ...part,
          offset: Array.isArray(part.offset) ? [...part.offset] : [0, 0, 0],
          scale: Array.isArray(part.scale) ? [...part.scale] : [1, 1, 1],
          rotation: Array.isArray(part.rotation) ? [...part.rotation] : undefined,
        }))
      : [],
    silhouetteChecks: Array.isArray(geometryRecipe?.silhouetteChecks)
      ? [...geometryRecipe.silhouetteChecks]
      : [],
    sizeBounds: isRecord(geometryRecipe?.sizeBounds)
      ? { ...geometryRecipe.sizeBounds }
      : geometryRecipe?.sizeBounds,
    readOrderTargets: Array.isArray(geometryRecipe?.readOrderTargets)
      ? [...geometryRecipe.readOrderTargets]
      : [],
    structuralBlueprint: isRecord(geometryRecipe?.structuralBlueprint)
      ? {
          ...geometryRecipe.structuralBlueprint,
          partSpanTargets: Array.isArray(geometryRecipe.structuralBlueprint.partSpanTargets)
            ? geometryRecipe.structuralBlueprint.partSpanTargets.map((entry) => ({ ...entry }))
            : [],
          partDepthTargets: Array.isArray(geometryRecipe.structuralBlueprint.partDepthTargets)
            ? geometryRecipe.structuralBlueprint.partDepthTargets.map((entry) => ({ ...entry }))
            : [],
          attachmentAnchors: Array.isArray(geometryRecipe.structuralBlueprint.attachmentAnchors)
            ? geometryRecipe.structuralBlueprint.attachmentAnchors.map((entry) => ({ ...entry }))
            : [],
          silhouetteKeepouts: Array.isArray(geometryRecipe.structuralBlueprint.silhouetteKeepouts)
            ? geometryRecipe.structuralBlueprint.silhouetteKeepouts.map((entry) => ({ ...entry }))
            : [],
        }
      : geometryRecipe?.structuralBlueprint,
  };
}

function setVariantPartValues(geometryRecipe, partId, nextValues) {
  const target = Array.isArray(geometryRecipe?.parts)
    ? geometryRecipe.parts.find((part) => part.partId === partId)
    : null;

  if (!target) {
    return;
  }

  if (Array.isArray(nextValues.offset)) {
    target.offset = nextValues.offset;
  }
  if (Array.isArray(nextValues.scale)) {
    target.scale = nextValues.scale;
  }
  if (Array.isArray(nextValues.rotation)) {
    target.rotation = nextValues.rotation;
  }
  if (typeof nextValues.primitive === "string") {
    target.primitive = nextValues.primitive;
  }
}

function findRepairAction(repairActions, actionType) {
  if (!Array.isArray(repairActions)) {
    return null;
  }

  return (
    repairActions.find(
      (action) => isRecord(action) && action.actionType === actionType,
    ) ?? null
  );
}

function shouldApplyChestWrapCompactTraitReroute(
  execution,
  geometryRecipe,
  variantId,
  repairActions = [],
  capabilityRerouteId = "",
) {
  if (
    variantId !== "scarf-knot-compact" ||
    !isHostCoupledChestWrapExecution(execution, geometryRecipe)
  ) {
    return false;
  }

  const targetTraitProfile =
    typeof capabilityRerouteId === "string" && capabilityRerouteId.trim()
      ? capabilityRerouteId.trim()
      : typeof findRepairAction(repairActions, "reroute-trait-profile")?.targetTraitProfile ===
            "string"
        ? findRepairAction(repairActions, "reroute-trait-profile").targetTraitProfile.trim()
        : "";
  if (targetTraitProfile !== "chest-wrap-compact-knot-tail-front") {
    return false;
  }

  if (capabilityRerouteId === "chest-wrap-compact-knot-tail-front") {
    return true;
  }

  return (
    getRepairActionIntensity(repairActions, "rebuild-from-root") >= 0.88 &&
    getRepairActionIntensity(repairActions, "reshape-silhouette") >= 0.86 &&
    getRepairActionIntensity(repairActions, "promote-critical-part") >= 0.84 &&
    getRepairActionIntensity(repairActions, "rebalance-part-ratio") >= 0.82
  );
}

function applyChestWrapCompactTraitReroute(cloned, variantId) {
  cloned.capabilityRerouteId = "chest-wrap-compact-knot-tail-front";
  cloned.profileCurves = ["scarf-wrap", variantId, "chest-wrap-compact-knot-tail-front"];
  cloned.profileVariantId = "scarf-profile-compact-knot-tail-front";
  cloned.dominantContour = "knot-tail-front-fan";
  cloned.sideDepthProfile = "front-loaded-tail-fan";
  cloned.dominantSpanOwner = "knot";
  cloned.readOrderTargets = ["knot", "tail-left", "tail-right", "wrap-band"];
  cloned.readabilityMaterialPolicy = {
    ...(
      isRecord(cloned.readabilityMaterialPolicy)
        ? cloned.readabilityMaterialPolicy
        : {}
    ),
    bodyLift: 0.18,
    detailLift: 0.3,
    accentLift: 0.24,
    accentShadow: 0.08,
    featureContrastFloor: 0.3,
    preferLighterFeatures: true,
  };
  cloned.critiqueLightingProfile = {
    ...(
      isRecord(cloned.critiqueLightingProfile)
        ? cloned.critiqueLightingProfile
        : {}
    ),
    accessoryExposure: 0.88,
    accessoryGamma: 1.14,
    hostExposure: 0.4,
    hostGamma: 1.01,
  };
  cloned.partImportanceWeights = {
    ...(
      isRecord(cloned.partImportanceWeights) ? cloned.partImportanceWeights : {}
    ),
    "wrap-band": 0.56,
    knot: 1.14,
    "tail-left": 1.06,
    "tail-right": 1.06,
    "tail-fold-left": 0.54,
    "tail-fold-right": 0.54,
  };
  cloned.sizeBounds = {
    ...cloned.sizeBounds,
    overallScale:
      typeof cloned.sizeBounds?.overallScale === "number"
        ? Number((cloned.sizeBounds.overallScale * 0.92).toFixed(4))
        : 0.8,
    maxPartScale:
      typeof cloned.sizeBounds?.maxPartScale === "number"
        ? Number(Math.max(0.94, cloned.sizeBounds.maxPartScale - 0.06).toFixed(4))
        : 0.96,
  };
  setVariantPartValues(cloned, "wrap-band", {
    offset: [0, -0.0058, 0.0034],
    scale: [0.56, 0.15, 0.082],
  });
  setVariantPartValues(cloned, "knot", {
    offset: [0, -0.0022, -0.0104],
    scale: [0.96, 0.42, 0.54],
  });
  setVariantPartValues(cloned, "tail-left", {
    offset: [-0.0084, -0.0034, -0.0204],
    scale: [0.5, 0.24, 0.78],
    rotation: [0, 0, 18],
  });
  setVariantPartValues(cloned, "tail-right", {
    offset: [0.0084, -0.0034, -0.0204],
    scale: [0.5, 0.24, 0.78],
    rotation: [0, 0, -18],
  });
  setVariantPartValues(cloned, "tail-fold-left", {
    offset: [-0.0024, -0.0022, -0.0152],
    scale: [0.18, 0.11, 0.26],
    rotation: [0, 0, 14],
  });
  setVariantPartValues(cloned, "tail-fold-right", {
    offset: [0.0024, -0.0022, -0.0152],
    scale: [0.18, 0.11, 0.26],
    rotation: [0, 0, -14],
  });

  const existingRuntimeDesignContract = isRecord(cloned.runtimeDesignContract)
    ? cloned.runtimeDesignContract
    : {};
  cloned.runtimeDesignContract = {
    ...existingRuntimeDesignContract,
    capabilityClass:
      typeof existingRuntimeDesignContract.capabilityClass === "string"
        ? existingRuntimeDesignContract.capabilityClass
        : "host-coupled-chest-wrap",
    primaryReadTarget: "knot",
    requiredVisibleParts: uniqueStrings([
      ...(Array.isArray(existingRuntimeDesignContract.requiredVisibleParts)
        ? existingRuntimeDesignContract.requiredVisibleParts
        : []),
      "wrap-band",
      "knot",
      "tail-left",
      "tail-right",
    ]),
    capabilityRerouteId: cloned.capabilityRerouteId,
  };

  if (isRecord(cloned.structuralBlueprint)) {
    cloned.structuralBlueprint.readOrderTargets = [...cloned.readOrderTargets];
    cloned.structuralBlueprint.profileVariantId = cloned.profileVariantId;
    cloned.structuralBlueprint.outlineProjectionVariantId = variantId;
    cloned.structuralBlueprint.dominantContour = cloned.dominantContour;
    cloned.structuralBlueprint.sideDepthProfile = cloned.sideDepthProfile;
    cloned.structuralBlueprint.dominantSpanOwner = cloned.dominantSpanOwner;
    cloned.structuralBlueprint.readabilityMaterialPolicy = {
      ...cloned.readabilityMaterialPolicy,
    };
    cloned.structuralBlueprint.critiqueLightingProfile = {
      ...cloned.critiqueLightingProfile,
    };
    cloned.structuralBlueprint.partImportanceWeights = {
      ...cloned.partImportanceWeights,
    };
    cloned.structuralBlueprint.partSpanTargets = [
      { partId: "wrap-band", minShare: 0.08, maxShare: 0.16 },
      { partId: "knot", minShare: 0.18, maxShare: 0.28 },
      { partId: "tail-left", minShare: 0.18, maxShare: 0.28 },
      { partId: "tail-right", minShare: 0.18, maxShare: 0.28 },
    ];
    cloned.structuralBlueprint.partDepthTargets = [
      { partId: "wrap-band", minDepth: 0.04, maxDepth: 0.08 },
      { partId: "knot", minDepth: 0.16, maxDepth: 0.24 },
      { partId: "tail-left", minDepth: 0.08, maxDepth: 0.14 },
      { partId: "tail-right", minDepth: 0.08, maxDepth: 0.14 },
    ];
    cloned.structuralBlueprint.attachmentAnchors = [
      {
        anchorId: "scarf-knot-center",
        partId: "knot",
        parentPartId: "wrap-band",
        mountFace: "center",
        preferredOffset: [0, 0.0026, -0.0168],
        flushMount: true,
        embedDepth: 0.0018,
      },
      {
        anchorId: "scarf-tail-left",
        partId: "tail-left",
        parentPartId: "knot",
        mountFace: "bottom-left",
        preferredOffset: [-0.0076, 0.0004, -0.0224],
        flushMount: true,
        embedDepth: 0.001,
      },
      {
        anchorId: "scarf-tail-right",
        partId: "tail-right",
        parentPartId: "knot",
        mountFace: "bottom-right",
        preferredOffset: [0.0076, 0.0004, -0.0224],
        flushMount: true,
        embedDepth: 0.001,
      },
    ];
    cloned.structuralBlueprint.runtimeDesignContract = {
      ...cloned.runtimeDesignContract,
    };
    cloned.structuralBlueprint.capabilityRerouteId = cloned.capabilityRerouteId;
  }
}

function shouldApplyChestRigidCameraFrontReadableTraitReroute(
  execution,
  geometryRecipe,
  variantId,
  repairActions = [],
  capabilityRerouteId = "",
) {
  if (
    variantId !== "camera-body-lens-forward" ||
    !isHostCoupledChestRigidFrontReadableExecution(execution, geometryRecipe) ||
    getExecutionRuntimeShapeClass(execution, geometryRecipe) !== "camera-charm"
  ) {
    return false;
  }

  const targetTraitProfile =
    typeof capabilityRerouteId === "string" && capabilityRerouteId.trim()
      ? capabilityRerouteId.trim()
      : typeof findRepairAction(repairActions, "reroute-trait-profile")?.targetTraitProfile ===
            "string"
        ? findRepairAction(repairActions, "reroute-trait-profile").targetTraitProfile.trim()
        : "";

  if (!targetTraitProfile) {
    return true;
  }

  return targetTraitProfile === "chest-rigid-camera-front-readable-relief";
}

function applyChestRigidCameraFrontReadableTraitReroute(cloned, variantId) {
  cloned.capabilityRerouteId = "chest-rigid-camera-front-readable-relief";
  cloned.profileCurves = [
    "reference-device",
    variantId,
    "chest-rigid-camera-front-readable-relief",
  ];
  cloned.profileVariantId = "camera-profile-front-readable-relief";
  cloned.outlineProfile = "camera-front-readable-relief";
  cloned.reliefFeatureLayout = [
    "lens-forward-relief",
    "top-cluster-ridge",
    "front-readable-faceplate-cut",
  ];
  cloned.attachmentMask = "top-cluster-hidden-loop";
  cloned.dominantContour = "body-lens-front-readable";
  cloned.sideDepthProfile = "front-loaded";
  cloned.dominantSpanOwner = "device-body";
  cloned.readOrderTargets = [
    "device-body",
    "camera-lens",
    "camera-top",
    "camera-viewfinder",
  ];
  cloned.primarySilhouette = "camera-top-cluster-front-readable";
  cloned.readabilityMaterialPolicy = {
    bodyLift: 0.14,
    detailLift: 0.24,
    accentLift: 0.34,
    accentShadow: 0.1,
    featureContrastFloor: 0.34,
    preferLighterFeatures: true,
  };
  cloned.critiqueLightingProfile = {
    accessoryExposure: 0.92,
    accessoryGamma: 1.16,
    hostExposure: 0.4,
    hostGamma: 1.01,
  };
  cloned.partImportanceWeights = {
    ...(
      isRecord(cloned.partImportanceWeights) ? cloned.partImportanceWeights : {}
    ),
    "device-body": 0.98,
    "camera-faceplate": 0.28,
    "camera-lens": 1.04,
    "camera-top": 1,
    "camera-viewfinder": 0.84,
    "camera-button": 0.22,
    "hang-slot": 0.12,
  };
  cloned.partProfiles = [
    {
      partId: "device-body",
      profile: "block",
      silhouetteRole: "primary",
      spanBias: 1.02,
      depthBias: 1.08,
      hostFitWeight: 0.82,
    },
    {
      partId: "camera-faceplate",
      profile: "generic",
      silhouetteRole: "support",
      spanBias: 0.24,
      depthBias: 0.78,
      hostFitWeight: 0.42,
    },
    {
      partId: "camera-lens",
      profile: "lens",
      silhouetteRole: "secondary",
      spanBias: 0.92,
      depthBias: 1.4,
      hostFitWeight: 0.62,
    },
    {
      partId: "camera-top",
      profile: "top-cap",
      silhouetteRole: "secondary",
      spanBias: 0.82,
      depthBias: 1.12,
      hostFitWeight: 0.38,
    },
    {
      partId: "camera-viewfinder",
      profile: "generic",
      silhouetteRole: "support",
      spanBias: 0.74,
      depthBias: 1.08,
      hostFitWeight: 0.34,
    },
    {
      partId: "camera-button",
      profile: "generic",
      silhouetteRole: "attachment",
      spanBias: 0.18,
      depthBias: 0.72,
      hostFitWeight: 0.2,
    },
    {
      partId: "hang-slot",
      profile: "ring",
      silhouetteRole: "attachment",
      spanBias: 0.04,
      depthBias: 0.42,
      hostFitWeight: 0.16,
    },
  ];
  cloned.attachmentRules = [
    {
      partId: "device-body",
      mountFace: "center",
      edgeConstraint: "rooted-span",
      orientationConstraint: "inherit",
      allowedDrift: 0.0032,
      flushMount: false,
      spanOwnership: "primary",
    },
    {
      partId: "camera-faceplate",
      parentPartId: "device-body",
      mountFace: "front",
      edgeConstraint: "flush-mount",
      orientationConstraint: "front-facing",
      allowedDrift: 0.0022,
      flushMount: true,
      embedDepth: 0.0064,
      spanOwnership: "support",
      supportDependency: "device-body",
    },
    {
      partId: "camera-lens",
      parentPartId: "device-body",
      mountFace: "front",
      edgeConstraint: "embedded-front",
      orientationConstraint: "front-facing",
      allowedDrift: 0.0016,
      flushMount: false,
      embedDepth: 0.0026,
      spanOwnership: "secondary",
      supportDependency: "device-body",
    },
    {
      partId: "camera-top",
      parentPartId: "device-body",
      mountFace: "top-right",
      edgeConstraint: "supported-branch",
      orientationConstraint: "follow-parent",
      allowedDrift: 0.0018,
      flushMount: false,
      embedDepth: 0.0018,
      spanOwnership: "support",
      supportDependency: "device-body",
    },
    {
      partId: "camera-viewfinder",
      parentPartId: "device-body",
      mountFace: "top-left",
      edgeConstraint: "supported-branch",
      orientationConstraint: "follow-parent",
      allowedDrift: 0.0018,
      flushMount: false,
      embedDepth: 0.0016,
      spanOwnership: "support",
      supportDependency: "device-body",
    },
    {
      partId: "camera-button",
      parentPartId: "camera-top",
      mountFace: "top",
      edgeConstraint: "supported-branch",
      orientationConstraint: "upright",
      allowedDrift: 0.0016,
      flushMount: false,
      embedDepth: 0.0012,
      spanOwnership: "attachment",
      supportDependency: "camera-top",
    },
    {
      partId: "hang-slot",
      parentPartId: "device-body",
      mountFace: "top",
      edgeConstraint: "flush-mount",
      orientationConstraint: "upright",
      allowedDrift: 0.0022,
      flushMount: true,
      embedDepth: 0.0034,
      spanOwnership: "attachment",
      supportDependency: "device-body",
    },
  ];
  cloned.sizeBounds = {
    ...cloned.sizeBounds,
    overallScale:
      typeof cloned.sizeBounds?.overallScale === "number"
        ? Number((cloned.sizeBounds.overallScale * 0.94).toFixed(4))
        : 0.86,
    maxPartScale:
      typeof cloned.sizeBounds?.maxPartScale === "number"
        ? Number(Math.max(1, cloned.sizeBounds.maxPartScale - 0.02).toFixed(4))
        : 1.02,
  };
  setVariantPartValues(cloned, "device-body", {
    offset: [0, 0, 0.0034],
    scale: [0.659, 0.11, 0.62],
  });
  setVariantPartValues(cloned, "camera-faceplate", {
    offset: [0.0048, -0.0096, 0.0032],
    scale: [0.242, 0.036, 0.22],
  });
  setVariantPartValues(cloned, "camera-lens", {
    offset: [0.0058, -0.0172, 0.0024],
    scale: [0.561, 0.282, 0.44],
  });
  setVariantPartValues(cloned, "camera-top", {
    offset: [0.0018, 0.0006, 0.0188],
    scale: [0.19, 0.025, 0.14],
  });
  setVariantPartValues(cloned, "camera-viewfinder", {
    offset: [-0.0072, 0.0006, 0.0172],
    scale: [0.121, 0.021, 0.094],
  });
  setVariantPartValues(cloned, "camera-button", {
    offset: [0.0074, 0.0009, 0.0202],
    scale: [0.032, 0.014, 0.018],
  });
  setVariantPartValues(cloned, "hang-slot", {
    offset: [0.0006, 0.0002, 0.0136],
    scale: [0.0018, 0.0018, 0.0012],
  });

  const existingRuntimeDesignContract = isRecord(cloned.runtimeDesignContract)
    ? cloned.runtimeDesignContract
    : {};
  cloned.runtimeDesignContract = {
    ...existingRuntimeDesignContract,
    capabilityClass:
      typeof existingRuntimeDesignContract.capabilityClass === "string"
        ? existingRuntimeDesignContract.capabilityClass
        : "host-coupled-chest-rigid-front-readable",
    primaryReadTarget: "device-body",
    requiredVisibleParts: uniqueStrings([
      ...(Array.isArray(existingRuntimeDesignContract.requiredVisibleParts)
        ? existingRuntimeDesignContract.requiredVisibleParts
        : []),
      "device-body",
      "camera-lens",
      "camera-top",
    ]),
    capabilityRerouteId: cloned.capabilityRerouteId,
  };

  if (isRecord(cloned.structuralBlueprint)) {
    cloned.structuralBlueprint.readOrderTargets = [...cloned.readOrderTargets];
    cloned.structuralBlueprint.primarySilhouette = cloned.primarySilhouette;
    cloned.structuralBlueprint.profileVariantId = cloned.profileVariantId;
    cloned.structuralBlueprint.outlineProjectionVariantId = variantId;
    cloned.structuralBlueprint.dominantContour = cloned.dominantContour;
    cloned.structuralBlueprint.sideDepthProfile = cloned.sideDepthProfile;
    cloned.structuralBlueprint.dominantSpanOwner = cloned.dominantSpanOwner;
    cloned.structuralBlueprint.readabilityMaterialPolicy = {
      ...cloned.readabilityMaterialPolicy,
    };
    cloned.structuralBlueprint.critiqueLightingProfile = {
      ...cloned.critiqueLightingProfile,
    };
    cloned.structuralBlueprint.partImportanceWeights = {
      ...cloned.partImportanceWeights,
    };
    cloned.structuralBlueprint.partSpanTargets = [
      { partId: "device-body", minShare: 0.42, maxShare: 0.52 },
      { partId: "camera-faceplate", minShare: 0.06, maxShare: 0.14 },
      { partId: "camera-lens", minShare: 0.2, maxShare: 0.3 },
      { partId: "camera-top", minShare: 0.06, maxShare: 0.16 },
      { partId: "camera-viewfinder", minShare: 0.03, maxShare: 0.08 },
      { partId: "hang-slot", minShare: 0.01, maxShare: 0.03 },
    ];
    cloned.structuralBlueprint.partDepthTargets = [
      { partId: "device-body", minDepth: 0.14, maxDepth: 0.2 },
      { partId: "camera-faceplate", minDepth: 0.02, maxDepth: 0.05 },
      { partId: "camera-lens", minDepth: 0.26, maxDepth: 0.36 },
      { partId: "camera-top", minDepth: 0.05, maxDepth: 0.1 },
      { partId: "camera-viewfinder", minDepth: 0.03, maxDepth: 0.08 },
      { partId: "hang-slot", minDepth: 0.01, maxDepth: 0.03 },
    ];
    cloned.structuralBlueprint.attachmentAnchors = [
      {
        anchorId: "camera-lens-front",
        partId: "camera-lens",
        parentPartId: "device-body",
        mountFace: "front",
        preferredOffset: [0.0052, -0.0144, 0.0018],
        flushMount: true,
        embedDepth: 0.0028,
      },
      {
        anchorId: "camera-top-right",
        partId: "camera-top",
        parentPartId: "device-body",
        mountFace: "top-right",
        preferredOffset: [0.0018, 0.0006, 0.0182],
        flushMount: true,
        embedDepth: 0.0022,
      },
      {
        anchorId: "camera-viewfinder-left",
        partId: "camera-viewfinder",
        parentPartId: "device-body",
        mountFace: "top-left",
        preferredOffset: [-0.0068, 0.0006, 0.0166],
        flushMount: true,
        embedDepth: 0.002,
      },
      {
        anchorId: "camera-hang-top",
        partId: "hang-slot",
        parentPartId: "device-body",
        mountFace: "top",
        preferredOffset: [0, 0.0002, 0.0142],
        flushMount: true,
        embedDepth: 0.0012,
      },
    ];
    cloned.structuralBlueprint.runtimeDesignContract = {
      ...cloned.runtimeDesignContract,
    };
    cloned.structuralBlueprint.capabilityRerouteId = cloned.capabilityRerouteId;
  }
}

export function applyHardSurfaceVariantRepresentationOverrides(
  geometryRecipe,
  variantId,
  context = {},
) {
  if (
    !isRecord(geometryRecipe) ||
    !Array.isArray(geometryRecipe.parts) ||
    typeof variantId !== "string" ||
    !variantId.trim()
  ) {
    return null;
  }

  const execution = isRecord(context.execution) ? context.execution : null;
  const repairActions = Array.isArray(context.repairActions) ? context.repairActions : [];
  const capabilityRerouteId =
    typeof context.capabilityRerouteId === "string" ? context.capabilityRerouteId : "";
  const cloned = cloneGeometryRecipeForVariantOverride(geometryRecipe, variantId.trim());

  switch (variantId) {
    case "scarf-knot-compact":
      cloned.profileCurves = ["scarf-wrap", variantId];
      cloned.outlineProfile = "scarf-knot-compact";
      cloned.profileVariantId = variantId;
      cloned.representationMode = "profile-relief-2_5d";
      cloned.outlineCompilerMode = "generic-profile-relief";
      cloned.dominantContour = "knot-forward-dual-tail";
      cloned.sideDepthProfile = "front-loaded";
      cloned.dominantSpanOwner = "knot";
      cloned.readOrderTargets = ["knot", "wrap-band", "tail-left"];
      cloned.readabilityMaterialPolicy = {
        bodyLift: 0.16,
        detailLift: 0.28,
        accentLift: 0.2,
        accentShadow: 0.1,
        featureContrastFloor: 0.28,
        preferLighterFeatures: true,
      };
      cloned.critiqueLightingProfile = {
        accessoryExposure: 0.84,
        accessoryGamma: 1.12,
        hostExposure: 0.42,
        hostGamma: 1.02,
      };
      cloned.partImportanceWeights = {
        ...(
          isRecord(cloned.partImportanceWeights) ? cloned.partImportanceWeights : {}
        ),
        "wrap-band": 0.72,
        knot: 1.1,
        "tail-left": 0.98,
        "tail-right": 0.98,
        "tail-fold-left": 0.48,
        "tail-fold-right": 0.48,
      };
      cloned.sizeBounds = {
        ...cloned.sizeBounds,
        overallScale:
          typeof cloned.sizeBounds?.overallScale === "number"
            ? Number((cloned.sizeBounds.overallScale * 0.94).toFixed(4))
            : 0.86,
        maxPartScale:
          typeof cloned.sizeBounds?.maxPartScale === "number"
            ? Number(Math.max(0.98, cloned.sizeBounds.maxPartScale - 0.04).toFixed(4))
            : 1,
      };
      setVariantPartValues(cloned, "wrap-band", {
        offset: [0, -0.0052, 0.0042],
        scale: [0.62, 0.18, 0.1],
      });
      setVariantPartValues(cloned, "knot", {
        offset: [0, -0.0018, -0.0092],
        scale: [1.02, 0.46, 0.58],
      });
      setVariantPartValues(cloned, "tail-left", {
        offset: [-0.0068, -0.0026, -0.0246],
        scale: [0.4, 0.22, 0.96],
        rotation: [0, 0, 14],
      });
      setVariantPartValues(cloned, "tail-right", {
        offset: [0.0068, -0.0026, -0.0246],
        scale: [0.4, 0.22, 0.96],
        rotation: [0, 0, -14],
      });
      setVariantPartValues(cloned, "tail-fold-left", {
        offset: [-0.0018, -0.0018, -0.0174],
        scale: [0.14, 0.12, 0.34],
        rotation: [0, 0, 16],
      });
      setVariantPartValues(cloned, "tail-fold-right", {
        offset: [0.0018, -0.0018, -0.0174],
        scale: [0.14, 0.12, 0.34],
        rotation: [0, 0, -16],
      });
      if (isRecord(cloned.structuralBlueprint)) {
        cloned.structuralBlueprint.readOrderTargets = [...cloned.readOrderTargets];
        cloned.structuralBlueprint.profileVariantId = variantId;
        cloned.structuralBlueprint.outlineProjectionVariantId = variantId;
        cloned.structuralBlueprint.representationMode = cloned.representationMode;
        cloned.structuralBlueprint.outlineCompilerMode = cloned.outlineCompilerMode;
        cloned.structuralBlueprint.dominantContour = cloned.dominantContour;
        cloned.structuralBlueprint.sideDepthProfile = cloned.sideDepthProfile;
        cloned.structuralBlueprint.dominantSpanOwner = cloned.dominantSpanOwner;
        cloned.structuralBlueprint.readabilityMaterialPolicy = {
          ...cloned.readabilityMaterialPolicy,
        };
        cloned.structuralBlueprint.critiqueLightingProfile = {
          ...cloned.critiqueLightingProfile,
        };
        cloned.structuralBlueprint.partImportanceWeights = {
          ...cloned.partImportanceWeights,
        };
        cloned.structuralBlueprint.partSpanTargets = [
          { partId: "wrap-band", minShare: 0.1, maxShare: 0.24 },
          { partId: "knot", minShare: 0.2, maxShare: 0.36 },
          { partId: "tail-left", minShare: 0.14, maxShare: 0.24 },
          { partId: "tail-right", minShare: 0.14, maxShare: 0.24 },
        ];
        cloned.structuralBlueprint.attachmentAnchors = [
          {
            anchorId: "scarf-knot-center",
            partId: "knot",
            parentPartId: "wrap-band",
            mountFace: "center",
            preferredOffset: [0, 0.0032, -0.0156],
            flushMount: true,
            embedDepth: 0.0018,
          },
          {
            anchorId: "scarf-tail-left",
            partId: "tail-left",
            parentPartId: "knot",
            mountFace: "bottom-left",
            preferredOffset: [-0.0062, 0.0012, -0.0266],
            flushMount: true,
            embedDepth: 0.001,
          },
          {
            anchorId: "scarf-tail-right",
            partId: "tail-right",
            parentPartId: "knot",
            mountFace: "bottom-right",
            preferredOffset: [0.0062, 0.0012, -0.0266],
            flushMount: true,
            embedDepth: 0.001,
          },
        ];
      }
      if (
        shouldApplyChestWrapCompactTraitReroute(
          execution,
          cloned,
          variantId,
          repairActions,
          capabilityRerouteId,
        )
      ) {
        applyChestWrapCompactTraitReroute(cloned, variantId);
      }
      if (Array.isArray(cloned.variantCandidates)) {
        cloned.variantCandidates = cloned.variantCandidates.map((variant) =>
          isRecord(variant) && variant.variantId === variantId
            ? {
                ...variant,
                readOrderHints: [...cloned.readOrderTargets],
                dominantContour: cloned.dominantContour,
                sideDepthProfile: cloned.sideDepthProfile,
                dominantSpanOwner: cloned.dominantSpanOwner,
                outlineProfile: cloned.outlineProfile,
                reliefFeatureLayout: [...(cloned.reliefFeatureLayout ?? [])],
                attachmentMask: cloned.attachmentMask,
                profileVariantId: cloned.profileVariantId,
                partSpanTargets: cloned.structuralBlueprint?.partSpanTargets ?? [],
                attachmentAnchors: cloned.structuralBlueprint?.attachmentAnchors ?? [],
              }
            : variant,
        );
      }
      return cloned;
    case "camera-body-lens-forward":
      cloned.profileCurves = ["reference-device", variantId];
      cloned.outlineProfile = "camera-wide-body";
      cloned.reliefFeatureLayout = [
        "lens-forward-relief",
        "top-cluster-ridge",
        "viewfinder-corner",
      ];
      cloned.attachmentMask = "top-cluster-hidden-loop";
      cloned.profileVariantId = "camera-profile-wide";
      cloned.familyPolicyId = "hard-surface-device";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.9, maxPartScale: 1.06 };
      setVariantPartValues(cloned, "device-body", { scale: [0.92, 0.118, 0.56] });
      setVariantPartValues(cloned, "camera-faceplate", {
        offset: [0.009, -0.011, 0.004],
        scale: [0.64, 0.052, 0.44],
      });
      setVariantPartValues(cloned, "camera-lens", { offset: [0.012, -0.021, 0.002], scale: [0.44, 0.3, 0.28] });
      setVariantPartValues(cloned, "camera-top", { offset: [0.006, 0.0006, 0.014], scale: [0.088, 0.028, 0.046] });
      setVariantPartValues(cloned, "camera-viewfinder", { offset: [-0.007, 0.0006, 0.013], scale: [0.062, 0.024, 0.04] });
      setVariantPartValues(cloned, "camera-button", { offset: [0.01, 0.0008, 0.018], scale: [0.024, 0.014, 0.014] });
      setVariantPartValues(cloned, "hang-slot", { offset: [0.0008, 0.0004, 0.016], scale: [0.0022, 0.0022, 0.0016] });
      if (
        shouldApplyChestRigidCameraFrontReadableTraitReroute(
          execution,
          cloned,
          variantId,
          repairActions,
          capabilityRerouteId,
        )
      ) {
        applyChestRigidCameraFrontReadableTraitReroute(cloned, variantId);
      }
      if (Array.isArray(cloned.variantCandidates)) {
        cloned.variantCandidates = cloned.variantCandidates.map((variant) =>
          isRecord(variant) && variant.variantId === variantId
            ? {
                ...variant,
                readOrderHints: [...(cloned.readOrderTargets ?? [])],
                dominantContour: cloned.dominantContour,
                sideDepthProfile: cloned.sideDepthProfile,
                dominantSpanOwner: cloned.dominantSpanOwner,
                outlineProfile: cloned.outlineProfile,
                reliefFeatureLayout: [...(cloned.reliefFeatureLayout ?? [])],
                attachmentMask: cloned.attachmentMask,
                profileVariantId: cloned.profileVariantId,
                partSpanTargets: cloned.structuralBlueprint?.partSpanTargets ?? [],
                attachmentAnchors: cloned.structuralBlueprint?.attachmentAnchors ?? [],
              }
            : variant,
        );
      }
      return cloned;
    case "camera-body-top-cluster":
      cloned.profileCurves = ["reference-device", variantId];
      cloned.outlineProfile = "camera-top-heavy-body";
      cloned.reliefFeatureLayout = [
        "lens-forward-relief",
        "top-cluster-ridge",
        "body-shoulder-step",
      ];
      cloned.attachmentMask = "top-cluster-hidden-loop";
      cloned.profileVariantId = "camera-profile-top-cluster";
      cloned.familyPolicyId = "hard-surface-device";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.88, maxPartScale: 1.04 };
      setVariantPartValues(cloned, "device-body", { scale: [0.86, 0.118, 0.56] });
      setVariantPartValues(cloned, "camera-faceplate", {
        offset: [0.009, -0.011, 0.004],
        scale: [0.58, 0.05, 0.42],
      });
      setVariantPartValues(cloned, "camera-lens", { offset: [0.011, -0.02, 0.002], scale: [0.4, 0.28, 0.28] });
      setVariantPartValues(cloned, "camera-top", { offset: [0.007, 0.0006, 0.015], scale: [0.108, 0.03, 0.058] });
      setVariantPartValues(cloned, "camera-viewfinder", { offset: [-0.007, 0.0006, 0.014], scale: [0.068, 0.024, 0.042] });
      setVariantPartValues(cloned, "camera-button", { offset: [0.01, 0.0008, 0.019], scale: [0.026, 0.016, 0.016] });
      setVariantPartValues(cloned, "hang-slot", { offset: [0.0008, 0.0004, 0.017], scale: [0.0022, 0.0022, 0.0016] });
      return cloned;
    case "camera-compact-charm":
      cloned.profileCurves = ["reference-device", variantId];
      cloned.outlineProfile = "camera-compact-body";
      cloned.reliefFeatureLayout = ["lens-forward-relief", "compact-top-ridge"];
      cloned.attachmentMask = "top-cluster-hidden-loop";
      cloned.profileVariantId = "camera-profile-compact";
      cloned.familyPolicyId = "hard-surface-device";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.84, maxPartScale: 1.02 };
      setVariantPartValues(cloned, "device-body", { scale: [0.6, 0.102, 0.46] });
      setVariantPartValues(cloned, "camera-faceplate", {
        offset: [0.0084, -0.0108, 0.0034],
        scale: [0.38, 0.038, 0.3],
      });
      setVariantPartValues(cloned, "camera-lens", { offset: [0.0108, -0.0196, 0.0036], scale: [0.56, 0.32, 0.34] });
      setVariantPartValues(cloned, "camera-top", { offset: [0.0062, 0.0008, 0.0162], scale: [0.134, 0.034, 0.076] });
      setVariantPartValues(cloned, "camera-viewfinder", { offset: [-0.0082, 0.0008, 0.015], scale: [0.1, 0.028, 0.06] });
      setVariantPartValues(cloned, "camera-button", { offset: [0.0095, 0.0008, 0.0185], scale: [0.024, 0.014, 0.014] });
      setVariantPartValues(cloned, "hang-slot", { offset: [0.0008, 0.0004, 0.0164], scale: [0.002, 0.002, 0.0014] });
      return cloned;
    case "device-tall-phone-charm":
      cloned.profileCurves = ["reference-device", variantId];
      cloned.outlineProfile = "device-tall-rect";
      cloned.reliefFeatureLayout = [
        "screen-face-inset",
        "camera-corner-dot",
        "top-edge-notch",
      ];
      cloned.attachmentMask = "top-edge-hidden-loop";
      cloned.profileVariantId = "device-profile-tall-phone";
      cloned.familyPolicyId = "hard-surface-device";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.8, maxPartScale: 0.98 };
      setVariantPartValues(cloned, "device-body", { scale: [0.48, 0.084, 0.78] });
      setVariantPartValues(cloned, "screen-face", { offset: [0, -0.012, 0.002], scale: [0.4, 0.014, 0.62] });
      setVariantPartValues(cloned, "camera-dot", { offset: [0.012, -0.011, 0.027], scale: [0.034, 0.016, 0.034] });
      setVariantPartValues(cloned, "hang-slot", { offset: [0, 0.0003, 0.02], scale: [0.002, 0.002, 0.0014] });
      return cloned;
    case "device-screen-forward":
      cloned.profileCurves = ["reference-device", variantId];
      cloned.outlineProfile = "device-screen-rect";
      cloned.reliefFeatureLayout = ["screen-face-inset", "camera-corner-dot"];
      cloned.attachmentMask = "top-edge-hidden-loop";
      cloned.profileVariantId = "device-profile-screen-forward";
      cloned.familyPolicyId = "hard-surface-device";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.78, maxPartScale: 0.98 };
      setVariantPartValues(cloned, "device-body", { scale: [0.54, 0.084, 0.66] });
      setVariantPartValues(cloned, "screen-face", { offset: [0, -0.012, 0.002], scale: [0.46, 0.014, 0.52] });
      setVariantPartValues(cloned, "camera-dot", { offset: [0.013, -0.011, 0.024], scale: [0.034, 0.016, 0.034] });
      setVariantPartValues(cloned, "hang-slot", { offset: [0, 0.0003, 0.019], scale: [0.002, 0.002, 0.0014] });
      return cloned;
    case "device-compact-charm":
      cloned.profileCurves = ["reference-device", variantId];
      cloned.outlineProfile = "device-compact-rect";
      cloned.reliefFeatureLayout = ["screen-face-inset", "top-edge-notch"];
      cloned.attachmentMask = "top-edge-hidden-loop";
      cloned.profileVariantId = "device-profile-compact";
      cloned.familyPolicyId = "hard-surface-device";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.76, maxPartScale: 0.96 };
      setVariantPartValues(cloned, "device-body", { scale: [0.56, 0.086, 0.58] });
      setVariantPartValues(cloned, "screen-face", { offset: [0, -0.012, 0.002], scale: [0.46, 0.014, 0.46] });
      setVariantPartValues(cloned, "camera-dot", { offset: [0.012, -0.011, 0.021], scale: [0.032, 0.016, 0.032] });
      setVariantPartValues(cloned, "hang-slot", { offset: [0, 0.0003, 0.018], scale: [0.0018, 0.0018, 0.0012] });
      return cloned;
    case "boat-hull-sail-upright":
      cloned.profileCurves = ["reference-vehicle", variantId];
      cloned.outlineProfile = "boat-upright-hull";
      cloned.reliefFeatureLayout = [
        "hull-pointed-ends",
        "mast-rooted-spine",
        "sail-tri-plane",
      ];
      cloned.attachmentMask = "mast-hidden-loop";
      cloned.profileVariantId = "boat-profile-upright";
      cloned.familyPolicyId = "hard-surface-boat";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.94, maxPartScale: 1.06 };
      setVariantPartValues(cloned, "boat-hull", { primitive: "cylinder", offset: [0, 0, -0.004], rotation: [0, 90, 0], scale: [0.74, 0.16, 0.26] });
      setVariantPartValues(cloned, "boat-bow", { primitive: "cone", offset: [0.036, 0.001, -0.004], scale: [0.44, 0.12, 0.2], rotation: [0, -90, 0] });
      setVariantPartValues(cloned, "boat-stern", { primitive: "cone", offset: [-0.032, 0.001, -0.005], scale: [0.32, 0.11, 0.16], rotation: [0, 90, 0] });
      setVariantPartValues(cloned, "boat-deck", { offset: [0, 0.001, 0.003], scale: [0.36, 0.026, 0.07] });
      setVariantPartValues(cloned, "boat-mast", { offset: [0, 0.001, 0.011], scale: [0.044, 0.044, 0.58] });
      setVariantPartValues(cloned, "boat-sail", { primitive: "cone", offset: [0.004, 0.002, 0.011], scale: [0.28, 0.018, 0.6], rotation: [0, 90, -90] });
      setVariantPartValues(cloned, "hang-slot", { offset: [0, 0.0008, 0.026], scale: [0.004, 0.004, 0.0026] });
      return cloned;
    case "boat-hull-sail-compact":
      cloned.profileCurves = ["reference-vehicle", variantId];
      cloned.outlineProfile = "boat-compact-hull";
      cloned.reliefFeatureLayout = [
        "compact-hull-profile",
        "mast-rooted-spine",
        "sail-tri-plane",
      ];
      cloned.attachmentMask = "mast-hidden-loop";
      cloned.profileVariantId = "boat-profile-compact";
      cloned.familyPolicyId = "hard-surface-boat";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.96, maxPartScale: 1.06 };
      setVariantPartValues(cloned, "boat-hull", { primitive: "cylinder", offset: [0, 0, -0.004], rotation: [0, 90, 0], scale: [0.78, 0.17, 0.24] });
      setVariantPartValues(cloned, "boat-bow", { primitive: "cone", offset: [0.036, 0.001, -0.004], scale: [0.46, 0.13, 0.2], rotation: [0, -90, 0] });
      setVariantPartValues(cloned, "boat-stern", { primitive: "cone", offset: [-0.032, 0.001, -0.005], scale: [0.34, 0.12, 0.16], rotation: [0, 90, 0] });
      setVariantPartValues(cloned, "boat-deck", { offset: [0, 0.001, 0.003], scale: [0.4, 0.028, 0.07] });
      setVariantPartValues(cloned, "boat-mast", { offset: [0, 0.001, 0.009], scale: [0.044, 0.044, 0.5] });
      setVariantPartValues(cloned, "boat-sail", { primitive: "cone", offset: [0.004, 0.002, 0.01], scale: [0.32, 0.02, 0.52], rotation: [0, 0, -20] });
      setVariantPartValues(cloned, "hang-slot", { offset: [0, 0.0008, 0.025], scale: [0.004, 0.004, 0.0026] });
      return cloned;
    case "boat-hull-mast-minimal":
      cloned.profileCurves = ["reference-vehicle", variantId];
      cloned.outlineProfile = "boat-rooted-hull";
      cloned.reliefFeatureLayout = ["hull-pointed-ends", "mast-rooted-spine", "sail-tri-plane"];
      cloned.attachmentMask = "mast-hidden-loop";
      cloned.profileVariantId = "boat-profile-rooted";
      cloned.familyPolicyId = "hard-surface-boat";
      cloned.sizeBounds = { ...cloned.sizeBounds, overallScale: 0.88, maxPartScale: 1.02 };
      setVariantPartValues(cloned, "boat-hull", { primitive: "cylinder", offset: [0, 0, -0.004], rotation: [0, 90, 0], scale: [0.72, 0.16, 0.24] });
      setVariantPartValues(cloned, "boat-bow", { primitive: "cone", offset: [0.034, 0.001, -0.004], scale: [0.42, 0.11, 0.2], rotation: [0, -90, 0] });
      setVariantPartValues(cloned, "boat-stern", { primitive: "cone", offset: [-0.03, 0.001, -0.005], scale: [0.3, 0.1, 0.16], rotation: [0, 90, 0] });
      setVariantPartValues(cloned, "boat-deck", { offset: [0, 0.001, 0.003], scale: [0.34, 0.024, 0.07] });
      setVariantPartValues(cloned, "boat-mast", { offset: [-0.001, 0.001, 0.012], scale: [0.048, 0.048, 0.58] });
      setVariantPartValues(cloned, "boat-sail", { primitive: "cone", offset: [0.003, 0.002, 0.012], scale: [0.2, 0.018, 0.48], rotation: [0, 90, -90] });
      setVariantPartValues(cloned, "hang-slot", { offset: [-0.001, 0.001, 0.03], scale: [0.006, 0.006, 0.004] });
      return cloned;
    default:
      return null;
  }
}

export function shouldSwitchBlueprintVariant(
  execution,
  qualityReport,
  geometryRecipe,
  passIndex,
) {
  if (passIndex < 2 || getExecutionBlueprintVariants(execution, geometryRecipe).length < 2) {
    return false;
  }

  const report = qualityReport?.visualCritiqueReport;
  if (!isRecord(report)) {
    return false;
  }

  const currentVariantId =
    typeof geometryRecipe?.variantId === "string"
      ? geometryRecipe.variantId
      : typeof execution?.variantId === "string"
        ? execution.variantId
        : null;
  const chestWrapRecoveryVariantId = getHostCoupledChestWrapRecoveryVariantId(
    execution,
    geometryRecipe,
    report,
    currentVariantId,
  );
  if (chestWrapRecoveryVariantId) {
    return true;
  }

  const firstRead = typeof report.firstReadResult === "string" ? report.firstReadResult : "";
  const genericRead = /generic|slab|bar|token|badge|blob|block/i.test(firstRead);
  const runtimeShapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const detachedAssemblyEvidence =
    report.representationFailureKind === "detached-assembly" ||
    typeof report.attachmentFailureKind === "string" ||
    (Array.isArray(report.canonicalDetachedPartIds) &&
      report.canonicalDetachedPartIds.length > 0);
  const faceIntrusionRecoveryNeeded =
    typeof report.faceIntrusionSeverity === "number" &&
    report.faceIntrusionSeverity > 0.28;
  const botanicalVariantRecovery =
    isBotanicalBloomRuntimeShapeClass(runtimeShapeClass) &&
    (
      report.variantSwitchRecommended === true ||
      genericRead ||
      detachedAssemblyEvidence ||
      faceIntrusionRecoveryNeeded
    );
  const viewportDrivenVariantRecovery = hasViewportDrivenVariantRecoveryEvidence(
    report,
    genericRead,
  );
  const compactHardSurfaceRecoveryVariantId =
    getPreferredCompactHardSurfaceRecoveryVariantId(
    execution,
    geometryRecipe,
    report,
  );

  if (botanicalVariantRecovery) {
    return true;
  }

  if (
    detachedAssemblyEvidence ||
    (
      report.dominantFailureLayer === "anchor-projection" &&
      !compactHardSurfaceRecoveryVariantId
    )
  ) {
    return false;
  }

  if (
    report.dominantFailureLayer === "critique-timeout" &&
    !viewportDrivenVariantRecovery
  ) {
    return false;
  }

  if (
    report.representationFailureKind === "generic-flat-token" ||
    report.representationFailureKind === "generic-rect-plate"
  ) {
    return true;
  }

  if (report.variantSwitchRecommended === true) {
    return true;
  }

  if (
    report.visualVeto === true &&
    (
      isHardSurfaceOpenNounExecution(execution, geometryRecipe) ||
      genericRead ||
      report.dominantFailureLayer === "silhouette" ||
      report.dominantFailureLayer === "render-readability" ||
      report.dominantFailureLayer === "outline-compiler"
    )
  ) {
    return true;
  }

  return genericRead;
}

export function syncPartGraphLocalOffsetsWithGeometryRecipe(
  partGraph,
  geometryRecipe,
) {
  if (
    !isRecord(partGraph) ||
    !Array.isArray(partGraph.edges) ||
    !isRecord(geometryRecipe) ||
    !Array.isArray(geometryRecipe.parts)
  ) {
    return partGraph;
  }

  const partOffsetMap = new Map(
    geometryRecipe.parts
      .filter(
        (part) =>
          isRecord(part) &&
          typeof part.partId === "string" &&
          Array.isArray(part.offset) &&
          part.offset.length === 3,
      )
      .map((part) => [part.partId, roundVector(part.offset)]),
  );

  const nextEdges = partGraph.edges.map((edge) => {
    if (
      !isRecord(edge) ||
      typeof edge.childPartId !== "string" ||
      typeof edge.parentPartId !== "string"
    ) {
      return edge;
    }

    const childOffset = partOffsetMap.get(edge.childPartId);

    if (!Array.isArray(childOffset)) {
      return edge;
    }

    const parentOffset = partOffsetMap.get(edge.parentPartId) ?? [0, 0, 0];
    const derivedLocalOffset = roundVector([
      (childOffset[0] ?? 0) - (parentOffset[0] ?? 0),
      (childOffset[1] ?? 0) - (parentOffset[1] ?? 0),
      (childOffset[2] ?? 0) - (parentOffset[2] ?? 0),
    ]);

    return {
      ...edge,
      localOffset: derivedLocalOffset,
    };
  });

  return {
    ...partGraph,
    edges: nextEdges,
  };
}

export function getHardSurfaceProgressivePartIds(
  execution,
  geometryRecipe,
  passIndex,
  targetPassCount,
  repairActions = [],
) {
  if (!isHardSurfaceOpenNounExecution(execution, geometryRecipe)) {
    return null;
  }

  const allPartIds = Array.isArray(geometryRecipe?.parts)
    ? geometryRecipe.parts
        .map((part) => (typeof part?.partId === "string" ? part.partId : null))
        .filter((partId) => typeof partId === "string")
    : [];

  if (allPartIds.length === 0) {
    return null;
  }

  const shapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const refinementStage = getExecutionRefinementStage(passIndex, targetPassCount);
  const forcedPartIds = Array.isArray(repairActions)
    ? repairActions.flatMap((action) =>
        isRecord(action) && Array.isArray(action.targetPartIds)
          ? action.targetPartIds.filter((value) => typeof value === "string")
          : [],
      )
    : [];
  let stagedPartIds = [];

  if (shapeClass === "camera-charm") {
    if (refinementStage === "blocking") {
      stagedPartIds = ["device-body", "camera-lens"];
    } else if (refinementStage === "silhouette-forming") {
      stagedPartIds = [
        "device-body",
        "camera-faceplate",
        "camera-lens",
        "camera-top",
        "camera-viewfinder",
      ];
    } else {
      stagedPartIds = allPartIds;
    }
  } else if (shapeClass === "boat-charm") {
    if (refinementStage === "blocking") {
      stagedPartIds = ["boat-hull", "boat-mast"];
    } else if (refinementStage === "silhouette-forming") {
      stagedPartIds = [
        "boat-hull",
        "boat-bow",
        "boat-stern",
        "boat-mast",
        "boat-sail",
      ];
    } else {
      stagedPartIds = allPartIds;
    }
  } else if (shapeClass === "rocket-charm") {
    if (refinementStage === "blocking") {
      stagedPartIds = ["rocket-body", "rocket-nose"];
    } else if (refinementStage === "silhouette-forming") {
      stagedPartIds = ["rocket-body", "rocket-nose", "rocket-fin-left", "rocket-fin-right"];
    } else {
      stagedPartIds = allPartIds;
    }
  } else if (shapeClass === "device-generic-charm") {
    stagedPartIds =
      refinementStage === "blocking"
        ? ["device-body", "screen-face"]
        : allPartIds;
  } else if (shapeClass === "vehicle-generic-charm") {
    stagedPartIds =
      refinementStage === "blocking"
        ? ["vehicle-body", "vehicle-front"]
        : allPartIds;
  } else {
    stagedPartIds = uniqueStrings([
      ...getExecutionCriticalParts(geometryRecipe),
      ...buildFallbackReadOrderTargets(execution, geometryRecipe),
      typeof geometryRecipe?.assemblyRootPartId === "string"
        ? geometryRecipe.assemblyRootPartId
        : undefined,
    ]);
  }

  return uniqueStrings([...stagedPartIds, ...forcedPartIds]).filter((partId) =>
    allPartIds.includes(partId),
  );
}

export function getPreferredRecoveryVariantId(
  execution,
  geometryRecipe,
  currentVariantId,
  qualityReport,
) {
  const report = qualityReport?.visualCritiqueReport;
  if (!isRecord(report)) {
    return null;
  }

  const chestWrapRecoveryVariantId = getHostCoupledChestWrapRecoveryVariantId(
    execution,
    geometryRecipe,
    report,
    currentVariantId,
  );
  if (chestWrapRecoveryVariantId) {
    return chestWrapRecoveryVariantId;
  }

  const canonicalFirstRead =
    typeof report.canonicalFirstRead === "string"
      ? report.canonicalFirstRead
      : typeof report.firstReadResult === "string"
        ? report.firstReadResult
        : "";
  const runtimeShapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const faceIntrusionSeverity =
    typeof report.faceIntrusionSeverity === "number" ? report.faceIntrusionSeverity : 0;
  const normalizedCurrentVariantId =
    typeof currentVariantId === "string" ? currentVariantId.trim() : "";
  const compactVariantId =
    /compact/i.test(normalizedCurrentVariantId)
      ? normalizedCurrentVariantId
      : getPreferredCompactHardSurfaceRecoveryVariantId(
          execution,
          geometryRecipe,
          report,
          currentVariantId,
        );
  const shouldPreferCompactHardSurfaceRecovery =
    typeof compactVariantId === "string" && compactVariantId.trim().length > 0;

  if (genericRecoveryReads.includes(canonicalFirstRead)) {
    if (
      report.dominantFailureLayer === "anchor-projection" &&
      !shouldPreferCompactHardSurfaceRecovery
    ) {
      return currentVariantId ?? null;
    }

    if (runtimeShapeClass === "boat-charm") {
      return "boat-hull-sail-upright";
    }

    if (runtimeShapeClass === "camera-charm") {
      if (shouldPreferCompactHardSurfaceRecovery) {
        return compactVariantId;
      }

      const detachedPartIds = Array.isArray(report.canonicalDetachedPartIds)
        ? report.canonicalDetachedPartIds.filter((value) => typeof value === "string")
        : [];
      if (
        detachedPartIds.some((partId) =>
          ["camera-lens", "camera-top", "camera-viewfinder", "hang-slot"].includes(partId),
        )
      ) {
        return "camera-body-lens-forward";
      }

      if (report.dominantFailureLayer === "critique-timeout") {
        return null;
      }

      return "camera-body-lens-forward";
    }

    if (runtimeShapeClass === "device-generic-charm") {
      if (shouldPreferCompactHardSurfaceRecovery) {
        return compactVariantId;
      }

      return "device-screen-forward";
    }
  }

  if (
    report.representationFailureKind === "generic-flat-token" ||
    report.representationFailureKind === "generic-rect-plate"
  ) {
    if (
      report.dominantFailureLayer === "anchor-projection" &&
      !shouldPreferCompactHardSurfaceRecovery
    ) {
      return currentVariantId ?? null;
    }

    if (runtimeShapeClass === "boat-charm") {
      return "boat-hull-sail-upright";
    }

    if (runtimeShapeClass === "camera-charm") {
      if (shouldPreferCompactHardSurfaceRecovery) {
        return compactVariantId;
      }

      return "camera-body-lens-forward";
    }

    if (runtimeShapeClass === "device-generic-charm") {
      if (shouldPreferCompactHardSurfaceRecovery) {
        return compactVariantId;
      }

      return "device-screen-forward";
    }
  }

  return null;
}

export function buildCapabilityEscalationBootstrapRepairActions(
  execution,
  geometryRecipe,
  qualityReport,
  currentVariantId,
) {
  const report = isRecord(qualityReport?.visualCritiqueReport)
    ? qualityReport.visualCritiqueReport
    : qualityReport;
  if (!isRecord(report)) {
    return [];
  }

  const stagnationActive =
    report.stagnationDetected === true ||
    report.controllerFailureLayer === "stagnation" ||
    report.controllerDirective === "escalate-capability";
  if (!stagnationActive) {
    return [];
  }

  if (isHostCoupledChestWrapExecution(execution, geometryRecipe)) {
    const normalizedCurrentVariantId =
      typeof currentVariantId === "string" && currentVariantId.trim()
        ? currentVariantId.trim()
        : typeof geometryRecipe?.variantId === "string" && geometryRecipe.variantId.trim()
          ? geometryRecipe.variantId.trim()
          : typeof execution?.variantId === "string" && execution.variantId.trim()
            ? execution.variantId.trim()
            : "";
    const compactVariantActive = /compact/i.test(normalizedCurrentVariantId);
    const flattenedTargets = uniqueStrings([
      ...(Array.isArray(report.canonicalFlattenedPartIds)
        ? report.canonicalFlattenedPartIds
        : []),
      ...(Array.isArray(report.flattenedPartIds) ? report.flattenedPartIds : []),
    ]);
    const detachedTargets = uniqueStrings([
      ...(Array.isArray(report.canonicalDetachedPartIds)
        ? report.canonicalDetachedPartIds
        : []),
      ...(Array.isArray(report.detachedPartIds) ? report.detachedPartIds : []),
    ]);
    const primaryTargets = uniqueStrings([
      "wrap-band",
      "knot",
      "tail-left",
      "tail-right",
      ...flattenedTargets,
      ...detachedTargets,
    ]);
    const knotTailTargets = uniqueStrings([
      "knot",
      "tail-left",
      "tail-right",
      ...flattenedTargets.filter((partId) => /^(tail-|knot$)/.test(partId)),
      ...detachedTargets.filter((partId) => /^(tail-|knot$)/.test(partId)),
    ]);

    return [
      {
        actionType: "rebuild-from-root",
        source: "hybrid",
        reason: compactVariantActive
          ? "compact chest-wrap 已进入停滞，需要清空上一轮微调惯性，按 capability bootstrap 重新起步。"
          : "host-coupled chest-wrap 已进入停滞，需要按 capability bootstrap 重启根部合同。",
        targetPartIds: primaryTargets.length > 0 ? primaryTargets : undefined,
        intensity: compactVariantActive ? 0.94 : 0.9,
      },
      {
        actionType: "reroute-trait-profile",
        source: "capability",
        reason:
          "compact chest-wrap 已进入停滞，需要切到另一套 knot-tail-front compact traits，而不是继续在同一读法上加压。",
        targetTraitProfile: "chest-wrap-compact-knot-tail-front",
        intensity: compactVariantActive ? 0.92 : 0.88,
      },
      {
        actionType: "re-anchor",
        source: "structural",
        reason: "停滞后的 chest-wrap 先重新压回胸前安全包络，避免 host-fit 与 silhouette 同时漂移。",
        intensity: compactVariantActive ? 0.88 : 0.84,
      },
      {
        actionType: "tighten-cohesion",
        source: "hybrid",
        reason: "停滞后的 chest-wrap 先把 knot / tails 收回同一 rooted assembly，再重写前表面轮廓。",
        targetPartIds: knotTailTargets.length > 0 ? knotTailTargets : undefined,
        intensity: compactVariantActive ? 0.86 : 0.82,
      },
      {
        actionType: "reshape-silhouette",
        source: "hybrid",
        reason: "停滞说明当前胸前主轮廓已锁死，需要强制重写 knot / wrap-band / tails 的读形关系。",
        targetPartIds: primaryTargets.length > 0 ? primaryTargets : undefined,
        intensity: compactVariantActive ? 0.9 : 0.86,
      },
      {
        actionType: "promote-critical-part",
        source: "hybrid",
        reason: "停滞后的 chest-wrap 需要把 knot 和 tails 再次抬回首读，避免 wrap-band 重新抢占主跨度。",
        targetPartIds:
          (knotTailTargets.length > 0 ? knotTailTargets : primaryTargets).length > 0
            ? (knotTailTargets.length > 0 ? knotTailTargets : primaryTargets)
            : undefined,
        intensity: compactVariantActive ? 0.88 : 0.84,
      },
      {
        actionType: "rebalance-part-ratio",
        source: "hybrid",
        reason: "停滞后的 chest-wrap 需要重新分配 wrap-band 与 knot 的体量占比，换一套主次节奏。",
        targetPartIds: ["wrap-band", "knot"],
        intensity: compactVariantActive ? 0.86 : 0.82,
      },
    ];
  }

  if (isHostCoupledChestRigidFrontReadableExecution(execution, geometryRecipe)) {
    const runtimeShapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
    if (runtimeShapeClass === "camera-charm") {
      const flattenedTargets = uniqueStrings([
        ...(Array.isArray(report.canonicalFlattenedPartIds)
          ? report.canonicalFlattenedPartIds
          : []),
        ...(Array.isArray(report.flattenedPartIds) ? report.flattenedPartIds : []),
      ]);
      const detachedTargets = uniqueStrings([
        ...(Array.isArray(report.canonicalDetachedPartIds)
          ? report.canonicalDetachedPartIds
          : []),
        ...(Array.isArray(report.detachedPartIds) ? report.detachedPartIds : []),
      ]);
      const primaryTargets = uniqueStrings([
        "device-body",
        "camera-faceplate",
        "camera-lens",
        "camera-top",
        "camera-viewfinder",
        ...flattenedTargets,
        ...detachedTargets,
      ]);
      const reliefTargets = uniqueStrings([
        "camera-faceplate",
        "camera-lens",
        "camera-top",
        ...flattenedTargets.filter((partId) =>
          ["camera-faceplate", "camera-lens", "camera-top", "camera-viewfinder"].includes(
            partId,
          ),
        ),
      ]);

      return [
        {
          actionType: "rebuild-from-root",
          source: "hybrid",
          reason:
            "停滞后的 chest-rigid camera 需要重启 front-readable 合同，不能继续沿 chest badge slab 的几何惯性微调。",
          targetPartIds: primaryTargets.length > 0 ? primaryTargets : undefined,
          intensity: 0.9,
        },
        {
          actionType: "reroute-trait-profile",
          source: "capability",
          reason:
            "停滞后的 chest-rigid camera 需要切到 front-readable camera relief traits，主动压低 faceplate slab 并抬高 lens 首读。",
          targetTraitProfile: "chest-rigid-camera-front-readable-relief",
          intensity: 0.88,
        },
        {
          actionType: "re-anchor",
          source: "structural",
          reason: "停滞后的 chest-rigid camera 先重新贴回胸前安全包络，避免继续压脸换取首读。",
          intensity: 0.84,
        },
        {
          actionType: "tighten-cohesion",
          source: "hybrid",
          reason: "停滞后的 chest-rigid camera 先把 top/viewfinder 收回 rooted assembly，再重写前视 relief。",
          targetPartIds: reliefTargets.length > 0 ? reliefTargets : undefined,
          intensity: 0.82,
        },
        {
          actionType: "reshape-silhouette",
          source: "hybrid",
          reason: "停滞说明当前胸前主轮廓已经锁死成 slab，需要强制重写 body / faceplate / lens 的前视关系。",
          targetPartIds: primaryTargets.length > 0 ? primaryTargets : undefined,
          intensity: 0.86,
        },
        {
          actionType: "promote-critical-part",
          source: "hybrid",
          reason: "停滞后的 chest-rigid camera 需要把 lens 和 top 再次抬回首读，避免 body / faceplate 抢占轮廓。",
          targetPartIds:
            (reliefTargets.length > 0 ? reliefTargets : primaryTargets).length > 0
              ? (reliefTargets.length > 0 ? reliefTargets : primaryTargets)
              : undefined,
          intensity: 0.84,
        },
        {
          actionType: "rebalance-part-ratio",
          source: "capability",
          reason: "停滞后的 chest-rigid camera 需要重新分配 body / faceplate / lens 的体量占比，切离胸牌化稳定点。",
          targetPartIds: ["device-body", "camera-faceplate", "camera-lens", "camera-top"],
          intensity: 0.86,
        },
      ];
    }
  }

  return [];
}

function partMatchesCriticalPart(part, criticalPart) {
  if (!isRecord(part) || typeof criticalPart !== "string") {
    return false;
  }

  const partId = typeof part.partId === "string" ? part.partId : "";
  const role = typeof part.role === "string" ? part.role : "";

  return (
    partId === criticalPart ||
    partId.startsWith(`${criticalPart}-`) ||
    criticalPart.startsWith(`${partId}-`) ||
    role === criticalPart ||
    role.includes(criticalPart)
  );
}

export function buildRuntimeRepairActions(
  execution,
  geometryRecipe,
  partBlueprints,
  partGraph,
  qualityMetrics,
) {
  const actions = [];
  const shapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const criticalParts = getExecutionCriticalParts(geometryRecipe);
  const presentPartIds = new Set(
    Array.isArray(partBlueprints)
      ? partBlueprints
          .map((part) => (typeof part.partId === "string" ? part.partId : null))
          .filter((value) => typeof value === "string")
      : [],
  );

  const missingCriticalParts = criticalParts.filter(
    (criticalPart) => !presentPartIds.has(criticalPart),
  );
  const minReadableSpan = getHardSurfaceMinReadableSpan(execution, geometryRecipe);
  const rootSpanMeasure = getRuntimeRootSpanMeasure(partBlueprints, geometryRecipe);
  const belowMinReadableSpan =
    typeof minReadableSpan === "number" && minReadableSpan > 0
      ? rootSpanMeasure > 0 && rootSpanMeasure < minReadableSpan
      : false;
  const likelyOversizedHardSurface =
    qualityMetrics.scaleFit < 0.46 &&
    (
      qualityMetrics.faceIntrusionSeverity > 0.14 ||
      qualityMetrics.hostComposition < 0.62
    );
  const likelyUndersizedReadableLoss =
    (
      qualityMetrics.scaleFit < 0.68 ||
      belowMinReadableSpan
    ) &&
    qualityMetrics.faceIntrusionSeverity < 0.14 &&
    qualityMetrics.hostComposition >= 0.62;
  const readabilityPlateauRisk =
    belowMinReadableSpan &&
    qualityMetrics.faceIntrusionSeverity < 0.14 &&
    qualityMetrics.hostComposition >= 0.62;
  const projectionFirstDeviceRepair =
    likelyOversizedHardSurface &&
    (shapeClass === "camera-charm" || shapeClass === "device-generic-charm");

  if (missingCriticalParts.length > 0) {
    actions.push({
      actionType: "insert-missing-part",
      reason: `补齐缺失关键部件：${missingCriticalParts.join(" / ")}`,
      source: "structural",
      targetPartIds: missingCriticalParts,
      intensity: 0.92,
    });
  }

  if (shapeClass === "camera-charm") {
    const chestRigidFrontReadableExecution =
      isHostCoupledChestRigidFrontReadableExecution(execution, geometryRecipe);
    const chestRigidReadableSlabRisk =
      chestRigidFrontReadableExecution &&
      (
        qualityMetrics.visualReadability < 0.74 ||
        qualityMetrics.silhouetteStrength < 0.72 ||
        qualityMetrics.hostComposition < 0.64 ||
        qualityMetrics.faceIntrusionSeverity > 0.14
      );
    if (qualityMetrics.dominantSpanOwner && qualityMetrics.dominantSpanOwner !== "device-body") {
      actions.push({
        actionType: "rebuild-from-root",
        reason: "camera 当前不是机身主导轮廓，需要围绕 device-body 重建整体结构。",
        source: "structural",
        targetPartIds: [
          "device-body",
          "camera-faceplate",
          "camera-lens",
          "camera-top",
          "camera-viewfinder",
        ],
        intensity: 0.82,
      });
      actions.push({
        actionType: "rebalance-part-ratio",
        reason: "相机主次比例失衡，需要把主轮廓重新还给机身。",
        source: "hybrid",
        targetPartIds: ["device-body", "hang-slot"],
        intensity: 0.76,
      });
    }

    if (chestRigidReadableSlabRisk) {
      actions.push({
        actionType: "rebalance-part-ratio",
        reason: "胸前刚性相机当前仍在 body / faceplate slab 稳定点，需要压低 faceplate 并抬高 lens/front relief。",
        source: "capability",
        targetPartIds: ["device-body", "camera-faceplate", "camera-lens", "camera-top"],
        intensity:
          qualityMetrics.visualReadability < 0.6 || qualityMetrics.hostComposition < 0.56
            ? 0.88
            : 0.82,
      });
      actions.push({
        actionType: "reshape-silhouette",
        reason: "胸前刚性相机当前前视轮廓仍偏 badge slab，需要重写 front-readable camera relief。",
        source: "capability",
        targetPartIds: ["device-body", "camera-faceplate", "camera-lens", "camera-top"],
        intensity: qualityMetrics.silhouetteStrength < 0.6 ? 0.86 : 0.78,
      });
    }

    if (qualityMetrics.nounFidelity < 0.8 && !projectionFirstDeviceRepair) {
      actions.push({
        actionType: "promote-critical-part",
        reason: "镜头辨识度还不够，需要让 lens 更先被读到。",
        source: "hybrid",
        targetPartIds: ["camera-lens"],
        intensity: 0.8,
      });
    }

    if (qualityMetrics.cohesionScore < 0.86) {
      actions.push({
        actionType: "re-parent-part",
        reason: "camera 顶部结构仍像漂浮件，需要重新贴回机身顶部。",
        source: "structural",
        targetPartIds: ["camera-top", "camera-viewfinder"],
        intensity: 0.76,
      });
    }

    if (likelyOversizedHardSurface) {
      actions.push({
        actionType: "rebuild-from-root",
        reason: chestRigidFrontReadableExecution
          ? "胸前刚性件当前主要问题是贴脸与正读退化，需要先缩回胸前正读安全包络再重建主轮廓。"
          : "相机当前主要问题是 oversized face intrusion，需要先缩回耳侧饰品级体量再重建主轮廓。",
        source: "hybrid",
        targetPartIds: ["device-body", "camera-lens", "camera-top"],
        intensity: 0.84,
      });
    } else if (likelyUndersizedReadableLoss || qualityMetrics.visualReadability < 0.76) {
      actions.push({
        actionType: "promote-critical-part",
        reason: "设备家族当前太小或不可读，需要抬高机身与镜头首读。",
        source: "hybrid",
        targetPartIds: ["device-body", "camera-lens"],
        intensity: 0.78,
      });
      actions.push({
        actionType: "re-materialize-color-zone",
        reason: "camera 正面与镜头对比不足，需要做 readability lift。",
        source: "hybrid",
        targetPartIds: ["device-body", "camera-lens", "camera-top"],
        intensity: belowMinReadableSpan ? 0.82 : 0.72,
      });
    }
  }

  if (shapeClass === "device-generic-charm") {
    const chestRigidFrontReadableExecution =
      isHostCoupledChestRigidFrontReadableExecution(execution, geometryRecipe);
    if (qualityMetrics.dominantSpanOwner && qualityMetrics.dominantSpanOwner !== "device-body") {
      actions.push({
        actionType: "rebuild-from-root",
        reason: "device 当前不是机身主导轮廓，需要围绕 device-body 重建整体结构。",
        source: "structural",
        targetPartIds: ["device-body", "screen-face", "camera-dot", "hang-slot"],
        intensity: 0.8,
      });
      actions.push({
        actionType: "rebalance-part-ratio",
        reason: "设备主次比例失衡，需要让机身重新成为主轮廓。",
        source: "hybrid",
        targetPartIds: ["device-body", "screen-face", "hang-slot"],
        intensity: 0.72,
      });
    }

    if (qualityMetrics.nounFidelity < 0.8 && !projectionFirstDeviceRepair) {
      actions.push({
        actionType: "promote-critical-part",
        reason: "设备正面特征还不够明显，需要让 screen-face 更早进入首读。",
        source: "hybrid",
        targetPartIds: ["device-body", "screen-face"],
        intensity: 0.76,
      });
    }

    if (qualityMetrics.cohesionScore < 0.84) {
      actions.push({
        actionType: "re-parent-part",
        reason: "设备正面层或角落特征仍像漂浮件，需要重新贴回机身前表面。",
        source: "structural",
        targetPartIds: ["screen-face", "camera-dot"],
        intensity: 0.72,
      });
    }

    if (qualityMetrics.silhouetteStrength < 0.78) {
      actions.push({
        actionType: "reshape-silhouette",
        reason: "设备轮廓仍像 generic plate，需要加强机身和屏幕的主次分区。",
        source: "hybrid",
        targetPartIds: ["device-body", "screen-face"],
        intensity: 0.78,
      });
    }

    if (likelyOversizedHardSurface) {
      actions.push({
        actionType: "rebuild-from-root",
        reason: chestRigidFrontReadableExecution
          ? "胸前刚性设备当前主要问题是贴脸与正读退化，需要先缩回胸前正读安全包络再重建主轮廓。"
          : "设备当前主要问题是 oversized flat token，需要先缩回耳侧饰品级体量再重建主轮廓。",
        source: "hybrid",
        targetPartIds: ["device-body", "screen-face", "camera-dot"],
        intensity: 0.84,
      });
    } else if (
      likelyUndersizedReadableLoss ||
      qualityMetrics.visualReadability < 0.76 ||
      qualityMetrics.hostComposition < 0.72
    ) {
      actions.push({
        actionType: "promote-critical-part",
        reason: "设备家族当前太小、太暗或首读不稳，需要提升机身与正面屏的可见性。",
        source: "hybrid",
        targetPartIds: ["device-body", "screen-face"],
        intensity: 0.8,
      });
      actions.push({
        actionType: "re-materialize-color-zone",
        reason: "设备正面在 critique 图里太暗或对比不足，需要抬高 body / screen-face 的可读性。",
        source: "hybrid",
        targetPartIds: ["device-body", "screen-face", "camera-dot"],
        intensity: belowMinReadableSpan ? 0.84 : 0.74,
      });
    }
  }

  if (shapeClass === "boat-charm") {
    if (qualityMetrics.dominantSpanOwner && qualityMetrics.dominantSpanOwner !== "boat-hull") {
      actions.push({
        actionType: "rebuild-from-root",
        reason: "boat 当前不是 hull 主导轮廓，需要围绕船身重建整体。",
        source: "structural",
        targetPartIds: ["boat-hull", "boat-bow", "boat-stern", "boat-mast", "boat-sail"],
        intensity: 0.84,
      });
    }

    if (qualityMetrics.cohesionScore < 0.86) {
      actions.push({
        actionType: "re-parent-part",
        reason: "小船的桅杆或帆仍像脱离结构，需要重新 rooted 到 hull/mast。",
        source: "structural",
        targetPartIds: ["boat-mast", "boat-sail"],
        intensity: 0.8,
      });
    }

    if (qualityMetrics.silhouetteStrength < 0.78) {
      actions.push({
        actionType: "reshape-silhouette",
        reason: "船体仍像长条板，需要重塑 hull 的纵向读取和帆面三角感。",
        source: "hybrid",
        targetPartIds: ["boat-hull", "boat-sail"],
        intensity: 0.8,
      });
    }

    if (likelyUndersizedReadableLoss || qualityMetrics.visualReadability < 0.72) {
      actions.push({
        actionType: "promote-critical-part",
        reason: "小船当前过小或首读太弱，需要抬高 hull / sail 的可读体量。",
        source: "hybrid",
        targetPartIds: ["boat-hull", "boat-sail", "boat-mast"],
        intensity: 0.78,
      });
      actions.push({
        actionType: "re-materialize-color-zone",
        reason: "小船当前帆面/船体对比不足，需要做 readability lift。",
        source: "hybrid",
        targetPartIds: ["boat-hull", "boat-sail", "boat-mast"],
        intensity: belowMinReadableSpan ? 0.82 : 0.72,
      });
    }
  }

  if (qualityMetrics.lookalikeRisk > 0.4 && !projectionFirstDeviceRepair) {
    actions.push({
      actionType: "split-merged-part",
      reason: "当前轮廓仍太像 generic token，需要拉开结构分区。",
      source: "visual",
      targetRoles: ["part", "token", "leaf", "wing"],
      intensity: 0.72,
    });
  }

  if (
    qualityMetrics.visualReadability < 0.82 ||
    qualityMetrics.silhouetteStrength < 0.8
  ) {
    if (projectionFirstDeviceRepair) {
      // When device charms are already oversized/intruding, projection recovery
      // must win over more silhouette expansion; otherwise we re-inflate the root.
    } else {
    actions.push({
      actionType: "reshape-silhouette",
      reason: "front / 3/4 / side 的可读性仍不足，需要加强轮廓。",
      source: "hybrid",
      targetPartIds: criticalParts,
      intensity: 0.78,
    });
    }
  }

  if (qualityMetrics.nounFidelity < 0.8 && !projectionFirstDeviceRepair) {
    actions.push({
      actionType: "rebalance-part-ratio",
      reason: "关键部件权重不够，需要放大语义部件。",
      source: "hybrid",
      targetRoles: Array.from(
        new Set(
          (geometryRecipe?.parts ?? [])
            .filter((part) =>
              criticalParts.some((criticalPart) => partMatchesCriticalPart(part, criticalPart)),
            )
            .map((part) => part.role),
        ),
      ),
      intensity: 0.74,
    });
    actions.push({
      actionType: "promote-critical-part",
      reason: "当前 noun fidelity 还不够，需要提升关键部件权重。",
      source: "hybrid",
      targetPartIds: criticalParts,
      intensity: 0.68,
    });
  }

  if (qualityMetrics.anchorAccuracy < 0.76) {
    actions.push({
      actionType: "re-anchor",
      reason: "挂点仍偏离目标锚点。",
      source: "visual",
      intensity: 0.8,
    });
    actions.push({
      actionType: "re-orient",
      reason: "当前朝向还不够利于读形。",
      source: "visual",
      intensity: 0.56,
    });
  }

  if (
    qualityMetrics.scaleFit < 0.78 ||
    qualityMetrics.occlusionRisk < 0.82 ||
    qualityMetrics.hostComposition < 0.8 ||
    qualityMetrics.faceIntrusionSeverity > 0.28
  ) {
    if (readabilityPlateauRisk) {
      actions.push({
        actionType: "re-materialize-color-zone",
        reason: "当前已经不过度压脸但可读体量不足，不再继续 shrink，转入 readability plateau 修复。",
        source: "hybrid",
        intensity: 0.82,
      });
    } else {
      actions.push({
        actionType: "re-anchor",
        reason: "当前宿主构图不自然，挂件需要离脸更远并重新贴合锚点。",
        source: "hybrid",
        intensity: 0.82,
    });
    actions.push({
      actionType: "reshape-silhouette",
      reason: "当前体量或朝向过于压脸，需要收紧并重塑轮廓。",
      source: "hybrid",
      targetPartIds: criticalParts,
      intensity: 0.74,
    });
      actions.push({
        actionType: "rebuild-from-root",
        reason: "当前挂件体量或挡脸风险过高，需要缩小后围绕 root 重新装配。",
        source: "hybrid",
        intensity: 0.78,
      });
    }
  }

  if (qualityMetrics.colorIsolation < 0.98) {
    actions.push({
      actionType: "re-materialize-color-zone",
      reason: "实例颜色需要保持独立材质隔离。",
      source: "structural",
      intensity: 0.7,
    });
  }

  if (qualityMetrics.cohesionScore < 0.82) {
    actions.push({
      actionType: "tighten-cohesion",
      reason: "部件之间还像散件，需要收紧 parent-relative 结构。",
      source: "structural",
      intensity: 0.76,
    });
  }

  const partGraphEdgeCount =
    isRecord(partGraph) && Array.isArray(partGraph.edges) ? partGraph.edges.length : 0;

  if (partGraphEdgeCount > 0 && qualityMetrics.cohesionScore < 0.74) {
    actions.push({
      actionType: "re-parent-part",
      reason: "当前部件依附关系不稳定，需要重新按装配图挂接。",
      source: "structural",
      intensity: 0.72,
    });
    actions.push({
      actionType: "rebuild-from-root",
      reason: "当前整体还是散，需要从 assembly root 重建。",
      source: "hybrid",
      intensity: 0.68,
    });
  }

  return actions;
}

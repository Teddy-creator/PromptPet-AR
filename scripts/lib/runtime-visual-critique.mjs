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

function trimStringArray(values, limit = 4) {
  return Array.isArray(values)
    ? values.filter((entry) => typeof entry === "string").slice(0, limit)
    : [];
}

function trimVectorTuple(value) {
  return Array.isArray(value) && value.length === 3
    ? value.map((entry) =>
        typeof entry === "number" && Number.isFinite(entry)
          ? Number(entry.toFixed(4))
          : 0,
      )
    : undefined;
}

function sanitizeRuntimeDesignContract(value) {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    contractId:
      typeof value.contractId === "string" ? value.contractId : undefined,
    capabilityClass:
      typeof value.capabilityClass === "string" ? value.capabilityClass : undefined,
    primaryReadTarget:
      typeof value.primaryReadTarget === "string"
        ? value.primaryReadTarget
        : undefined,
    requiredVisibleParts: trimStringArray(value.requiredVisibleParts, 6),
    hostNoGoZones: trimStringArray(value.hostNoGoZones, 5),
    compositionEnvelope:
      typeof value.compositionEnvelope === "string"
        ? value.compositionEnvelope
        : undefined,
    targetAttachmentPose:
      typeof value.targetAttachmentPose === "string"
        ? value.targetAttachmentPose
        : undefined,
    anchorReferenceOffset: trimVectorTuple(value.anchorReferenceOffset),
    desiredPlacementOffset: trimVectorTuple(value.desiredPlacementOffset),
    anchorFitPolicy: isRecord(value.anchorFitPolicy)
      ? {
          blendWeights: trimVectorTuple(value.anchorFitPolicy.blendWeights),
          maxDeltas: trimVectorTuple(value.anchorFitPolicy.maxDeltas),
        }
      : undefined,
    hostFitEnvelope: isRecord(value.hostFitEnvelope)
      ? {
          anchorEnvelope: trimVectorTuple(value.hostFitEnvelope.anchorEnvelope),
          maxSpan: trimVectorTuple(value.hostFitEnvelope.maxSpan),
          preferredYaw:
            typeof value.hostFitEnvelope.preferredYaw === "number"
              ? Number(value.hostFitEnvelope.preferredYaw.toFixed(4))
              : undefined,
          screenFacingBias:
            typeof value.hostFitEnvelope.screenFacingBias === "number"
              ? Number(value.hostFitEnvelope.screenFacingBias.toFixed(4))
              : undefined,
          faceIntrusionBudget:
            typeof value.hostFitEnvelope.faceIntrusionBudget === "number"
              ? Number(value.hostFitEnvelope.faceIntrusionBudget.toFixed(4))
              : undefined,
        }
      : undefined,
    faceKeepoutZones: Array.isArray(value.faceKeepoutZones)
      ? value.faceKeepoutZones
          .filter((entry) => isRecord(entry) && typeof entry.zoneId === "string")
          .slice(0, 4)
          .map((entry) => ({
            zoneId: entry.zoneId,
            severity: entry.severity === "hard" ? "hard" : "soft",
          }))
      : [],
    partRootingRules: Array.isArray(value.partRootingRules)
      ? value.partRootingRules
          .filter(
            (entry) =>
              isRecord(entry) &&
              typeof entry.partId === "string" &&
              typeof entry.parentPartId === "string",
          )
          .slice(0, 4)
          .map((entry) => ({
            partId: entry.partId,
            parentPartId: entry.parentPartId,
            rule:
              entry.rule === "emerge-from-parent" ? "emerge-from-parent" : "rooted-to-parent",
          }))
      : [],
    criticalViewGoals: trimStringArray(value.criticalViewGoals, 5),
    notes: trimStringArray(value.notes, 4),
  };
}

const visionCritiqueSources = new Set([
  "blueprint-projection",
  "viewport-capture",
  "render-hybrid",
]);
const visionCritiqueTransportModes = new Set([
  "local-hybrid",
  "responses-api",
  "chat-completions",
  "viewport-fallback",
  "blueprint-fallback",
]);
const visionCritiqueTransportEndpoints = new Set([
  "local-hybrid",
  "responses",
  "chat/completions",
  "viewport-capture",
  "blueprint-projection",
]);
const visionCritiquePolicies = new Set(["required", "viewport-fallback-allowed"]);
const visionCritiqueViewNames = new Set([
  "front",
  "three-quarter",
  "side",
  "host-front",
  "host-three-quarter",
]);

function sanitizeVisionCritiqueViewName(viewName) {
  return visionCritiqueViewNames.has(viewName) ? viewName : null;
}

function sanitizeVisionCritiqueViews(critiqueViews) {
  return (Array.isArray(critiqueViews) ? critiqueViews : [])
    .map((entry) => {
      const view = sanitizeVisionCritiqueViewName(entry?.view);
      if (!view) {
        return null;
      }

      return {
        view,
        purpose: view.startsWith("host-") ? "host-composition" : "accessory-detail",
        filePath:
          typeof entry?.filePath === "string" && entry.filePath.trim()
            ? entry.filePath.trim()
            : undefined,
      };
    })
    .filter((entry) => isRecord(entry));
}

function normalizeVisionCritiqueSource(source, renderCritiqueAvailable = false) {
  if (visionCritiqueSources.has(source)) {
    return source;
  }

  return renderCritiqueAvailable === true ? "render-hybrid" : "viewport-capture";
}

function normalizeVisionCritiqueEndpoint(endpoint, source) {
  if (visionCritiqueTransportEndpoints.has(endpoint)) {
    return endpoint;
  }

  if (source === "blueprint-projection") {
    return "blueprint-projection";
  }

  if (source === "viewport-capture") {
    return "viewport-capture";
  }

  return "local-hybrid";
}

function normalizeVisionCritiqueMode(mode, endpoint, source) {
  if (visionCritiqueTransportModes.has(mode)) {
    return mode;
  }

  if (endpoint === "responses") {
    return "responses-api";
  }

  if (endpoint === "chat/completions") {
    return "chat-completions";
  }

  if (source === "blueprint-projection") {
    return "blueprint-fallback";
  }

  if (source === "viewport-capture") {
    return "viewport-fallback";
  }

  return "local-hybrid";
}

function normalizeVisionCritiquePolicy(policy) {
  return visionCritiquePolicies.has(policy) ? policy : "required";
}

export function buildVisionCritiquePayloadContract(critiqueInput, critiqueViews = []) {
  const base = isRecord(critiqueInput) ? critiqueInput : {};
  const expectedSilhouetteGoals = uniqueStrings([
    ...trimStringArray(base.expectedSilhouetteGoals, 6),
    ...trimStringArray(base.criticalViewGoals, 6),
    isRecord(base.structuralBlueprint) &&
    typeof base.structuralBlueprint.primarySilhouette === "string"
      ? base.structuralBlueprint.primarySilhouette
      : null,
    isRecord(base.structuralBlueprint) &&
    typeof base.structuralBlueprint.dominantContour === "string"
      ? base.structuralBlueprint.dominantContour
      : null,
    isRecord(base.structuralBlueprint) &&
    typeof base.structuralBlueprint.outlineProfile === "string"
      ? base.structuralBlueprint.outlineProfile
      : null,
  ]).slice(0, 6);

  return {
    ...base,
    criticalParts: trimStringArray(base.criticalParts, 6),
    readOrderTargets: trimStringArray(base.readOrderTargets, 5),
    criticalViewGoals: trimStringArray(base.criticalViewGoals, 6),
    expectedSilhouetteGoals,
    negativeLookalikes: trimStringArray(base.negativeLookalikes, 6),
    runtimeDesignContract: sanitizeRuntimeDesignContract(base.runtimeDesignContract),
    views: sanitizeVisionCritiqueViews(critiqueViews),
  };
}

export function buildVisionCritiqueTransport(options = {}) {
  const renderCritiqueAvailable = options?.renderCritiqueAvailable === true;
  const source = normalizeVisionCritiqueSource(options?.source, renderCritiqueAvailable);
  const endpoint = normalizeVisionCritiqueEndpoint(options?.endpoint, source);

  return {
    source,
    provider:
      options?.provider === "openai" || options?.provider === "deepseek"
        ? options.provider
        : "local",
    endpoint,
    mode: normalizeVisionCritiqueMode(options?.mode, endpoint, source),
    model:
      typeof options?.model === "string" && options.model.trim()
        ? options.model.trim()
        : undefined,
    renderCritiqueAvailable,
    renderCritiquePolicy: normalizeVisionCritiquePolicy(options?.renderCritiquePolicy),
    failureNote:
      typeof options?.failureNote === "string" && options.failureNote.trim()
        ? options.failureNote.trim()
        : undefined,
    capturedViews: sanitizeVisionCritiqueViews(options?.capturedViews).map((entry) => entry.view),
    transportViews: sanitizeVisionCritiqueViews(options?.transportViews).map((entry) => entry.view),
  };
}

export function attachVisionCritiqueTransport(report, transport) {
  const normalizedTransport = buildVisionCritiqueTransport(transport);

  return {
    ...report,
    source: normalizedTransport.source,
    renderCritiquePolicy: normalizedTransport.renderCritiquePolicy,
    critiqueFailureNote:
      normalizedTransport.failureNote ??
      (typeof report?.critiqueFailureNote === "string" ? report.critiqueFailureNote : undefined),
    critiqueTransport: normalizedTransport,
  };
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

function isEarSideHardSurfaceExecution(execution, geometryRecipe = null) {
  return (
    isOpenNounExecution(execution) &&
    (execution?.anchor === "left-ear" || execution?.anchor === "right-ear") &&
    ["camera-charm", "device-generic-charm", "boat-charm", "vehicle-generic-charm"].includes(
      getExecutionRuntimeShapeClass(execution, geometryRecipe),
    )
  );
}

function isProjectionAwareEarSideExecution(execution, geometryRecipe = null, report = null) {
  if (isEarSideHardSurfaceExecution(execution, geometryRecipe)) {
    return true;
  }

  if (execution?.anchor !== "left-ear" && execution?.anchor !== "right-ear") {
    return false;
  }

  return (
    report?.targetAttachmentPose === "ear-side-front-facing" ||
    report?.targetAttachmentPose === "ear-side-upright-hull"
  );
}

function isDeviceLikeRuntimeShapeClass(runtimeShapeClass) {
  return runtimeShapeClass === "camera-charm" || runtimeShapeClass === "device-generic-charm";
}

function isBoatLikeRuntimeShapeClass(runtimeShapeClass) {
  return runtimeShapeClass === "boat-charm" || runtimeShapeClass === "vehicle-generic-charm";
}

function getRenderCritiquePolicy(report) {
  return report?.renderCritiquePolicy === "viewport-fallback-allowed"
    ? "viewport-fallback-allowed"
    : "required";
}

export function allowsViewportCritiqueAcceptance(report, renderCritiqueAvailable) {
  return (
    renderCritiqueAvailable !== true &&
    report?.source === "viewport-capture" &&
    getRenderCritiquePolicy(report) === "viewport-fallback-allowed"
  );
}

function hasBlockingRenderCritiqueFailure(report, renderCritiqueAvailable) {
  if (
    renderCritiqueAvailable === true ||
    allowsViewportCritiqueAcceptance(report, renderCritiqueAvailable)
  ) {
    return false;
  }

  const diagnosticText = uniqueStrings([
    report?.dominantFailureMode,
    report?.summary,
    report?.visualVetoReason,
    ...(Array.isArray(report?.cohesionIssues) ? report.cohesionIssues : []),
  ]).join(" ");

  return /render-critique|critique.*timeout|timeout|不可用|unavailable|failed/i.test(
    diagnosticText,
  );
}

function isCritiqueTimeoutMode(report, renderCritiqueAvailable) {
  return hasBlockingRenderCritiqueFailure(report, renderCritiqueAvailable);
}

function getRenderCritiqueTimeoutMs() {
  const value = Number(
    process.env.VISION_RENDER_CRITIQUE_TIMEOUT_MS ??
      process.env.LLM_RENDER_CRITIQUE_TIMEOUT_MS ??
      process.env.DEEPSEEK_RENDER_CRITIQUE_TIMEOUT_MS ??
      process.env.OPENAI_RENDER_CRITIQUE_TIMEOUT_MS ??
      "20000",
  );
  return Number.isFinite(value) && value >= 5000 ? value : 20000;
}

export function shouldPreferChatCompletionsForRenderCritique(config) {
  const baseUrl =
    typeof config?.baseUrl === "string" ? config.baseUrl.replace(/\/+$/, "") : "";

  if (!baseUrl) {
    return false;
  }

  return !/^https:\/\/api\.openai\.com\/v1$/i.test(baseUrl);
}

export function getRenderCritiqueTransportTimeoutMs(config, critiqueViews = []) {
  const baseTimeoutMs = getRenderCritiqueTimeoutMs();

  if (shouldPreferChatCompletionsForRenderCritique(config)) {
    return Math.max(
      baseTimeoutMs,
      Array.isArray(critiqueViews) && critiqueViews.length > 0 ? 24000 : 18000,
    );
  }

  return baseTimeoutMs;
}

export function selectRenderCritiqueViewsForTransport(config, critiqueViews) {
  if (!Array.isArray(critiqueViews) || critiqueViews.length === 0) {
    return [];
  }

  if (!shouldPreferChatCompletionsForRenderCritique(config)) {
    return critiqueViews;
  }

  const prioritizedViews = ["front", "host-front", "three-quarter", "side"];
  const selected = [];
  const maxViews = critiqueViews.length <= 1 ? critiqueViews.length : 1;

  for (const viewName of prioritizedViews) {
    const match = critiqueViews.find((entry) => entry?.view === viewName);
    if (match) {
      selected.push(match);
    }
    if (selected.length >= maxViews) {
      break;
    }
  }

  for (const entry of critiqueViews) {
    if (selected.length >= maxViews) {
      break;
    }
    if (!selected.includes(entry)) {
      selected.push(entry);
    }
  }

  return selected;
}

export function buildCompactRenderCritiqueInput(critiqueInput) {
  if (!isRecord(critiqueInput)) {
    return critiqueInput;
  }

  const trimMetrics = isRecord(critiqueInput.currentMetrics)
    ? {
        scaleFit: critiqueInput.currentMetrics.scaleFit,
        hostComposition: critiqueInput.currentMetrics.hostComposition,
        silhouetteStrength: critiqueInput.currentMetrics.silhouetteStrength,
        nounFidelity: critiqueInput.currentMetrics.nounFidelity,
        criticalPartsPresent: critiqueInput.currentMetrics.criticalPartsPresent,
        cohesionScore: critiqueInput.currentMetrics.cohesionScore,
        lookalikeRisk: critiqueInput.currentMetrics.lookalikeRisk,
        faceIntrusionSeverity: critiqueInput.currentMetrics.faceIntrusionSeverity,
        dominantSpanOwner: critiqueInput.currentMetrics.dominantSpanOwner,
        partAttachmentCredibility: critiqueInput.currentMetrics.partAttachmentCredibility,
      }
    : {};
  const trimHostContext = isRecord(critiqueInput.hostContext)
    ? {
        region: critiqueInput.hostContext.region,
        preferredSpan: critiqueInput.hostContext.preferredSpan,
        maxSpan: critiqueInput.hostContext.maxSpan,
        faceIntrusionBudget: critiqueInput.hostContext.faceIntrusionBudget,
        eyeKeepout: critiqueInput.hostContext.eyeKeepout === true,
        preferredYaw: critiqueInput.hostContext.preferredYaw,
        screenFacingBias: critiqueInput.hostContext.screenFacingBias,
        currentSpan: critiqueInput.hostContext.currentSpan,
        projectedAnchorPose: critiqueInput.hostContext.projectedAnchorPose,
        anchorPlaneOffset: critiqueInput.hostContext.anchorPlaneOffset,
        earSideTangentOffset: critiqueInput.hostContext.earSideTangentOffset,
        anchorProjectionFailureKind:
          critiqueInput.hostContext.anchorProjectionFailureKind,
      }
    : {};
  const trimStructuralBlueprint = isRecord(critiqueInput.structuralBlueprint)
    ? {
        representationMode: critiqueInput.structuralBlueprint.representationMode,
        familyPolicyId: critiqueInput.structuralBlueprint.familyPolicyId,
        primarySilhouette: critiqueInput.structuralBlueprint.primarySilhouette,
        dominantContour: critiqueInput.structuralBlueprint.dominantContour,
        sideDepthProfile: critiqueInput.structuralBlueprint.sideDepthProfile,
        dominantSpanOwner: critiqueInput.structuralBlueprint.dominantSpanOwner,
        outlineProfile: critiqueInput.structuralBlueprint.outlineProfile,
        attachmentMask: critiqueInput.structuralBlueprint.attachmentMask,
        readabilityMaterialPolicy:
          critiqueInput.structuralBlueprint.readabilityMaterialPolicy,
        critiqueLightingProfile: critiqueInput.structuralBlueprint.critiqueLightingProfile,
        deviceMinReadableSpan:
          critiqueInput.structuralBlueprint.deviceMinReadableSpan,
        boatMinReadableSpan: critiqueInput.structuralBlueprint.boatMinReadableSpan,
        reliefFlushDepth: critiqueInput.structuralBlueprint.reliefFlushDepth,
        attachmentCohesionBudget:
          critiqueInput.structuralBlueprint.attachmentCohesionBudget,
        outlineCompilerMode: critiqueInput.structuralBlueprint.outlineCompilerMode,
        outlineProjectionVariantId:
          critiqueInput.structuralBlueprint.outlineProjectionVariantId,
      }
    : undefined;
  const trimRuntimeDesignContract = sanitizeRuntimeDesignContract(
    critiqueInput.runtimeDesignContract,
  );

  return {
    requestedNoun: critiqueInput.requestedNoun,
    requestedLabel: critiqueInput.requestedLabel,
    anchor: critiqueInput.anchor,
    designArchetype: critiqueInput.designArchetype,
    runtimeShapeClass: critiqueInput.runtimeShapeClass,
    blueprintFamily: critiqueInput.blueprintFamily,
    variantId: critiqueInput.variantId,
    expectedDominantSpanOwner:
      critiqueInput.runtimeShapeClass === "camera-charm" ||
      critiqueInput.runtimeShapeClass === "device-generic-charm"
        ? "device-body"
        : critiqueInput.runtimeShapeClass === "boat-charm"
          ? "boat-hull"
          : critiqueInput.runtimeShapeClass === "fish-charm"
            ? "body"
            : critiqueInput.runtimeShapeClass === "rocket-charm"
              ? "rocket-body"
              : critiqueInput.runtimeShapeClass === "vehicle-generic-charm"
                ? "vehicle-body"
                : undefined,
    criticalParts: trimStringArray(critiqueInput.criticalParts, 5),
    readOrderTargets: trimStringArray(critiqueInput.readOrderTargets, 4),
    criticalViewGoals: trimStringArray(critiqueInput.criticalViewGoals, 4),
    expectedSilhouetteGoals: trimStringArray(critiqueInput.expectedSilhouetteGoals, 4),
    negativeLookalikes: trimStringArray(critiqueInput.negativeLookalikes, 4),
    views: sanitizeVisionCritiqueViews(critiqueInput.views),
    currentMetrics: trimMetrics,
    hostContext: trimHostContext,
    structuralBlueprint: trimStructuralBlueprint,
    runtimeDesignContract: trimRuntimeDesignContract,
    existingRepairActions: Array.isArray(critiqueInput.existingRepairActions)
      ? critiqueInput.existingRepairActions
          .filter((entry) => isRecord(entry) && typeof entry.actionType === "string")
          .slice(0, 3)
          .map((entry) => ({
            actionType: entry.actionType,
            source: entry.source,
            targetPartIds: trimStringArray(entry.targetPartIds, 3),
          }))
      : [],
  };
}

export function mergeRenderRepairActions(baseActions, critiqueActions) {
  const merged = [];
  const seen = new Set();

  for (const action of [
    ...(Array.isArray(baseActions) ? baseActions : []),
    ...(Array.isArray(critiqueActions) ? critiqueActions : []),
  ]) {
    if (!isRecord(action) || typeof action.actionType !== "string") {
      continue;
    }

    const key = JSON.stringify({
      actionType: action.actionType,
      source: action.source,
      targetPartIds: Array.isArray(action.targetPartIds)
        ? [...action.targetPartIds].sort()
        : [],
      targetRoles: Array.isArray(action.targetRoles)
        ? [...action.targetRoles].sort()
        : [],
    });

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(action);
  }

  return merged;
}

export function inferDominantFailureLayerFromReport(report) {
  if (!isRecord(report)) {
    return "render-readability";
  }

  if (report.dominantFailureLayer === "critique-timeout") {
    return "critique-timeout";
  }

  if (report.dominantFailureLayer === "anchor-projection") {
    return "anchor-projection";
  }

  if (report.dominantFailureLayer === "outline-compiler") {
    return "outline-compiler";
  }

  if (report.dominantFailureLayer === "attachment-cohesion") {
    return "attachment-cohesion";
  }

  if (report.representationFailureKind === "generic-flat-token") {
    return "silhouette";
  }

  if (report.representationFailureKind === "generic-rect-plate") {
    return "silhouette";
  }

  if (report.representationFailureKind === "detached-assembly") {
    return "assembly";
  }

  if (typeof report.attachmentFailureKind === "string") {
    return "assembly";
  }

  if (report.representationFailureKind === "host-intrusion") {
    return "host-fit";
  }

  if (report.representationFailureKind === "low-contrast-unreadable") {
    return "render-readability";
  }

  if (typeof report.readabilityFailureKind === "string") {
    return "render-readability";
  }

  if (
    typeof report.dominantFailureLayer === "string" &&
    [
      "silhouette",
      "assembly",
      "host-fit",
      "render-readability",
      "anchor-projection",
      "outline-compiler",
      "attachment-cohesion",
      "critique-timeout",
    ].includes(
      report.dominantFailureLayer,
    )
  ) {
    return report.dominantFailureLayer;
  }

  if (
    typeof report.faceIntrusionSeverity === "number" &&
    report.faceIntrusionSeverity > 0.28
  ) {
    return "host-fit";
  }

  if (Array.isArray(report.hostIntrusionZones) && report.hostIntrusionZones.length > 0) {
    return "host-fit";
  }

  if (
    typeof report.partAttachmentCredibility === "number" &&
    report.partAttachmentCredibility < 0.76
  ) {
    return "assembly";
  }

  if (Array.isArray(report.detachedPartIds) && report.detachedPartIds.length > 0) {
    return "assembly";
  }

  if (
    Array.isArray(report.flattenedStructureParts) &&
    report.flattenedStructureParts.length > 0
  ) {
    return "silhouette";
  }

  if (Array.isArray(report.flattenedPartIds) && report.flattenedPartIds.length > 0) {
    return "silhouette";
  }

  return "render-readability";
}

export function inferNextPassPriorityFromFailureLayer(layer) {
  switch (layer) {
    case "silhouette":
    case "outline-compiler":
      return "silhouette-forming";
    case "assembly":
    case "attachment-cohesion":
      return "assembly-rooting";
    case "host-fit":
    case "anchor-projection":
      return "host-fit";
    case "critique-timeout":
      return "render-driven-rebuild";
    default:
      return "render-driven-rebuild";
  }
}

function hasBlockingRefinementSignal(report, visualAcceptanceGatePassed) {
  if (!isRecord(report)) {
    return false;
  }

  if (visualAcceptanceGatePassed === false || report.visualVeto === true) {
    return true;
  }

  if (
    typeof report.representationFailureKind === "string" ||
    typeof report.readabilityFailureKind === "string" ||
    typeof report.attachmentFailureKind === "string" ||
    typeof report.anchorProjectionFailureKind === "string"
  ) {
    return true;
  }

  if (
    (Array.isArray(report.flattenedPartIds) && report.flattenedPartIds.length > 0) ||
    (Array.isArray(report.detachedPartIds) && report.detachedPartIds.length > 0) ||
    (Array.isArray(report.hostIntrusionZones) && report.hostIntrusionZones.length > 0)
  ) {
    return true;
  }

  return (
    typeof report.faceIntrusionSeverity === "number" &&
    report.faceIntrusionSeverity > 0.28
  );
}

function normalizeNextPassPriority(report, canonicalFailureLayer, visualAcceptanceGatePassed) {
  const inferredPriority = inferNextPassPriorityFromFailureLayer(canonicalFailureLayer);
  const reportedPriority =
    typeof report?.nextPassPriority === "string" ? report.nextPassPriority : undefined;

  if (reportedPriority !== "final-review") {
    return reportedPriority ?? inferredPriority;
  }

  return hasBlockingRefinementSignal(report, visualAcceptanceGatePassed)
    ? inferredPriority
    : "final-review";
}

export function inferRebuildDirectiveFromFailureLayer(layer) {
  switch (layer) {
    case "silhouette":
    case "outline-compiler":
      return "silhouette-forming";
    case "assembly":
    case "attachment-cohesion":
      return "assembly-rooting";
    case "host-fit":
    case "anchor-projection":
      return "host-fit";
    case "critique-timeout":
      return "render-driven-rebuild";
    default:
      return "render-driven-rebuild";
  }
}

export function inferTargetDepthProfile(runtimeShapeClass) {
  if (runtimeShapeClass === "camera-charm") {
    return "front-loaded";
  }

  if (runtimeShapeClass === "boat-charm") {
    return "balanced";
  }

  return "balanced";
}

export function buildFallbackReadOrderTargets(execution, geometryRecipe) {
  const requestedTargets = Array.isArray(geometryRecipe?.readOrderTargets)
    ? geometryRecipe.readOrderTargets
    : Array.isArray(execution?.readOrderTargets)
      ? execution.readOrderTargets
      : [];

  if (requestedTargets.length > 0) {
    return requestedTargets.filter((value) => typeof value === "string");
  }

  const shapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  if (shapeClass === "camera-charm") {
    return ["device-body", "camera-lens", "camera-top"];
  }

  if (shapeClass === "boat-charm") {
    return ["boat-hull", "boat-mast", "boat-sail"];
  }

  if (shapeClass === "rocket-charm") {
    return ["rocket-body", "rocket-nose", "rocket-fin"];
  }

  if (shapeClass === "device-generic-charm") {
    return ["device-body", "screen-face", "camera-dot"];
  }

  return [];
}

export function getCanonicalTargetReadLabels(execution, geometryRecipe = null) {
  const requestedNoun =
    typeof execution?.requestedNoun === "string" && execution.requestedNoun.trim()
      ? execution.requestedNoun.trim()
      : typeof geometryRecipe?.requestedNoun === "string" && geometryRecipe.requestedNoun.trim()
        ? geometryRecipe.requestedNoun.trim()
        : "";
  const runtimeShapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const labels = new Set();

  if (requestedNoun) {
    labels.add(requestedNoun);
    labels.add(requestedNoun.toLowerCase());
  }

  switch (runtimeShapeClass) {
    case "camera-charm":
      labels.add("相机");
      labels.add("camera");
      break;
    case "boat-charm":
      labels.add("小船");
      labels.add("船");
      labels.add("boat");
      break;
    case "fish-charm":
      labels.add("小鱼");
      labels.add("鱼");
      labels.add("fish");
      break;
    case "flower":
      labels.add("小花");
      labels.add("花");
      labels.add("flower");
      break;
    case "clover-charm":
      labels.add("四叶草");
      labels.add("clover");
      break;
    case "rocket-charm":
      labels.add("火箭");
      labels.add("rocket");
      break;
    case "device-generic-charm":
      if (
        /手机|phone|smartphone|电话/i.test(requestedNoun) ||
        geometryRecipe?.referenceId === "ref-phone-compact"
      ) {
        labels.add("手机");
        labels.add("phone");
        labels.add("smartphone");
      }
      labels.add("设备");
      labels.add("device");
      break;
    case "vehicle-generic-charm":
      labels.add("载具");
      labels.add("vehicle");
      break;
    default:
      break;
  }

  return [...labels].filter((value) => typeof value === "string" && value.length > 0);
}

export function getCanonicalTargetReadLabel(execution, geometryRecipe = null) {
  return getCanonicalTargetReadLabels(execution, geometryRecipe)[0] ?? execution?.shapeLabel;
}

export function getExpectedDominantSpanOwnerForVisualAcceptance(
  execution,
  geometryRecipe = null,
) {
  switch (getExecutionRuntimeShapeClass(execution, geometryRecipe)) {
    case "camera-charm":
      return "device-body";
    case "boat-charm":
      return "boat-hull";
    case "fish-charm":
      return "body";
    case "rocket-charm":
      return "rocket-body";
    case "device-generic-charm":
      return "device-body";
    case "vehicle-generic-charm":
      return "vehicle-body";
    default:
      return undefined;
  }
}

function getCritiquePartSynonyms(runtimeShapeClass) {
  switch (runtimeShapeClass) {
    case "camera-charm":
      return [
        { pattern: /device[-\s]?body|机身|body/i, partId: "device-body" },
        { pattern: /camera[-\s]?lens|镜头|lens/i, partId: "camera-lens" },
        { pattern: /camera[-\s]?top|top cluster|top cap|顶部/i, partId: "camera-top" },
        { pattern: /viewfinder|取景器/i, partId: "camera-viewfinder" },
        { pattern: /hang[-\s]?slot|loop|ring|挂环|挂点/i, partId: "hang-slot" },
      ];
    case "boat-charm":
      return [
        { pattern: /boat[-\s]?hull|hull|船体/i, partId: "boat-hull" },
        { pattern: /boat[-\s]?mast|mast|桅杆/i, partId: "boat-mast" },
        { pattern: /boat[-\s]?sail|sail|帆面|船帆/i, partId: "boat-sail" },
        { pattern: /boat[-\s]?deck|deck|甲板/i, partId: "boat-deck" },
        { pattern: /hang[-\s]?slot|loop|ring|挂环|挂点/i, partId: "hang-slot" },
      ];
    case "device-generic-charm":
      return [
        { pattern: /device[-\s]?body|phone[-\s]?body|手机机身|机身|body/i, partId: "device-body" },
        { pattern: /screen[-\s]?face|screen|display|屏幕|屏幕面|正面屏/i, partId: "screen-face" },
        { pattern: /camera[-\s]?dot|camera corner|corner dot|摄像头点|镜头点/i, partId: "camera-dot" },
        { pattern: /hang[-\s]?slot|loop|ring|挂环|挂点/i, partId: "hang-slot" },
      ];
    case "fish-charm":
      return [
        { pattern: /body|鱼身/i, partId: "body" },
        { pattern: /tail|尾巴|鱼尾/i, partId: "tail" },
        { pattern: /fin[-\s]?top|上鳍|背鳍/i, partId: "fin-top" },
        { pattern: /fin[-\s]?bottom|下鳍|腹鳍/i, partId: "fin-bottom" },
        { pattern: /ring|loop|挂环|挂点/i, partId: "ring" },
      ];
    default:
      return [];
  }
}

export function extractCanonicalPartIdFromText(rawValue, execution, geometryRecipe = null) {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return undefined;
  }

  const text = rawValue.trim();
  const lower = text.toLowerCase();
  const knownPartIds = Array.isArray(geometryRecipe?.parts)
    ? geometryRecipe.parts
        .map((part) => (typeof part?.partId === "string" ? part.partId : null))
        .filter((partId) => typeof partId === "string")
    : [];
  const indexedMatches = [];

  for (const partId of knownPartIds) {
    const index = lower.indexOf(partId.toLowerCase());
    if (index >= 0) {
      indexedMatches.push({ partId, index });
    }
  }

  for (const entry of getCritiquePartSynonyms(
    getExecutionRuntimeShapeClass(execution, geometryRecipe),
  )) {
    const match = text.match(entry.pattern);
    if (match && typeof match.index === "number") {
      indexedMatches.push({ partId: entry.partId, index: match.index });
    }
  }

  if (indexedMatches.length === 0) {
    return undefined;
  }

  indexedMatches.sort((left, right) => left.index - right.index);
  return indexedMatches[0]?.partId;
}

export function canonicalizeCritiquePartIds(values, execution, geometryRecipe = null) {
  if (!Array.isArray(values)) {
    return [];
  }

  return uniqueStrings(
    values.flatMap((value) => {
      if (typeof value !== "string" || !value.trim()) {
        return [];
      }

      const canonicalPartId = extractCanonicalPartIdFromText(
        value,
        execution,
        geometryRecipe,
      );
      return canonicalPartId ? [canonicalPartId] : [];
    }),
  );
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function classifyGenericFirstRead(text) {
  if (typeof text !== "string" || !text.trim()) {
    return null;
  }

  const genericPatterns = [
    ["generic-slab", /(slab|plate|badge|flat badge|flat plate|牌子|牌片|板块|板子|薄板|徽章块|片状)/i],
    [
      "generic-bar",
      /(bar|stick|rod|long rectangle|long bar|blue rod|blue stick|长条|条状|方条|细杆|蓝杆|蓝条|长杆|棍|棒)/i,
    ],
    ["generic-token", /(token|pendant|tag|吊牌|吊坠|token charm|徽章|挂牌)/i],
    [
      "generic-block",
      /(block|cube|box|brick|rectangular prism|积木块|积木|长方体|方块|方盒|盒子|块状|盒条|盒块|随机块状)/i,
    ],
    ["generic-blob", /(blob|random|lump|一坨|球团|团块|乱块|随机团|random blob)/i],
  ];

  for (const [label, pattern] of genericPatterns) {
    if (pattern.test(text)) {
      return label;
    }
  }

  return null;
}

function getCritiqueDiagnosticText(report) {
  if (!isRecord(report)) {
    return "";
  }

  return uniqueStrings([
    report.summary,
    report.visualVetoReason,
    report.dominantFailureMode,
    report.rootSilhouetteFailure,
    report.assemblyFailure,
    report.hostFitFailure,
    report.readOrderFailure,
  ]).join(" ");
}

export function inferReadabilityFailureKind(execution, geometryRecipe, report) {
  if (!isRecord(report)) {
    return undefined;
  }

  const criticalParts = getExecutionCriticalParts(geometryRecipe);
  const detachedPartIds = Array.isArray(report.canonicalDetachedPartIds)
    ? report.canonicalDetachedPartIds
    : Array.isArray(report.detachedPartIds)
      ? report.detachedPartIds
      : [];
  const detachedCriticalParts = detachedPartIds.filter(
    (partId) =>
      criticalParts.includes(partId) && partId !== "hang-slot" && partId !== "ring",
  );
  const diagnosticText = getCritiqueDiagnosticText(report);
  const faceIntrusionSeverity =
    typeof report.faceIntrusionSeverity === "number" ? report.faceIntrusionSeverity : 0;

  if (detachedCriticalParts.length > 0 || faceIntrusionSeverity > 0.28) {
    return undefined;
  }

  if (/small|tiny|too small|偏小|太小|小到看不清|小得读不清/i.test(diagnosticText)) {
    return "too-small-to-read";
  }

  if (/too dim|dim|too dark|dark blob|太暗|发黑|黑块|暗到/i.test(diagnosticText)) {
    return "too-dim";
  }

  if (
    /low contrast|contrast|unreadable|看不清|不可读|读不清|对比不足/i.test(
      diagnosticText,
    ) ||
    report.canonicalFirstRead === "generic-unreadable" ||
    (typeof report.lookalikeRisk === "number" &&
      report.lookalikeRisk > 0.58 &&
      typeof report.silhouetteReadability === "number" &&
      report.silhouetteReadability < 0.68)
  ) {
    return "low-contrast";
  }

  return undefined;
}

export function inferAttachmentFailureKind(execution, geometryRecipe, report) {
  if (!isRecord(report)) {
    return undefined;
  }

  const criticalParts = getExecutionCriticalParts(geometryRecipe);
  const detachedPartIds = Array.isArray(report.canonicalDetachedPartIds)
    ? report.canonicalDetachedPartIds
    : Array.isArray(report.detachedPartIds)
      ? report.detachedPartIds
      : [];
  const detachedCriticalParts = detachedPartIds.filter(
    (partId) =>
      criticalParts.includes(partId) && partId !== "hang-slot" && partId !== "ring",
  );

  if (
    detachedCriticalParts.some((partId) =>
      ["camera-lens", "camera-top", "camera-viewfinder", "screen-face", "camera-dot"].includes(
        partId,
      ),
    )
  ) {
    return "floating-relief";
  }

  if (
    detachedCriticalParts.some((partId) => ["boat-mast", "boat-sail"].includes(partId))
  ) {
    return "weak-rooting";
  }

  if (detachedCriticalParts.length > 0) {
    return "detached-critical-part";
  }

  if (
    typeof report.partAttachmentCredibility === "number" &&
    report.partAttachmentCredibility < 0.72
  ) {
    return "detached-critical-part";
  }

  return undefined;
}

export function inferAnchorProjectionFailureKind(execution, geometryRecipe, report) {
  if (
    !isRecord(report) ||
    !isEarSideHardSurfaceExecution(execution, geometryRecipe)
  ) {
    return undefined;
  }

  const runtimeShapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);
  const hostIntrusionZones = Array.isArray(report.hostIntrusionZones)
    ? report.hostIntrusionZones
    : Array.isArray(report.hostInterferenceZones)
      ? report.hostInterferenceZones
      : [];
  const faceIntrusionSeverity =
    typeof report.faceIntrusionSeverity === "number" ? report.faceIntrusionSeverity : 0;
  const detachedPartIds = Array.isArray(report.canonicalDetachedPartIds)
    ? report.canonicalDetachedPartIds
    : Array.isArray(report.detachedPartIds)
      ? report.detachedPartIds
      : [];
  const canonicalDominantSpanOwner =
    typeof report.canonicalDominantSpanOwner === "string"
      ? report.canonicalDominantSpanOwner
      : typeof report.dominantSpanOwner === "string"
        ? report.dominantSpanOwner
        : undefined;
  const expectedDominantSpanOwner =
    runtimeShapeClass === "camera-charm" || runtimeShapeClass === "device-generic-charm"
      ? "device-body"
      : runtimeShapeClass === "boat-charm"
        ? "boat-hull"
        : runtimeShapeClass === "vehicle-generic-charm"
          ? "vehicle-body"
          : undefined;
  const genericRead =
    typeof report.canonicalFirstRead === "string" &&
    /^generic-/.test(report.canonicalFirstRead);

  if (
    faceIntrusionSeverity > 0.28 ||
    hostIntrusionZones.some((zone) => /eye|nose|face/i.test(zone))
  ) {
    return "face-intrusion";
  }

  if (
    detachedPartIds.length === 0 &&
    expectedDominantSpanOwner &&
    canonicalDominantSpanOwner === expectedDominantSpanOwner &&
    genericRead
  ) {
    return "floating-off-ear";
  }

  if (
    detachedPartIds.length === 0 &&
    expectedDominantSpanOwner &&
    canonicalDominantSpanOwner === expectedDominantSpanOwner &&
    typeof report.readabilityFailureKind === "string"
  ) {
    return "readability-on-plane";
  }

  return undefined;
}

export function inferRepresentationFailureKind(execution, geometryRecipe, report) {
  if (!isRecord(report)) {
    return undefined;
  }

  const canonicalFirstRead =
    typeof report.canonicalFirstRead === "string"
      ? report.canonicalFirstRead
      : typeof report.firstReadResult === "string"
        ? report.firstReadResult
        : "";
  const rawFirstRead =
    typeof report.rawFirstReadResult === "string"
      ? report.rawFirstReadResult
      : typeof report.firstReadResult === "string"
        ? report.firstReadResult
        : "";
  const genericRead =
    classifyGenericFirstRead(canonicalFirstRead) ?? classifyGenericFirstRead(rawFirstRead);
  const intrusionZones = Array.isArray(report.hostIntrusionZones)
    ? report.hostIntrusionZones
    : Array.isArray(report.hostInterferenceZones)
      ? report.hostInterferenceZones
      : [];
  const readabilityFailureKind =
    typeof report.readabilityFailureKind === "string"
      ? report.readabilityFailureKind
      : inferReadabilityFailureKind(execution, geometryRecipe, report);
  const attachmentFailureKind =
    typeof report.attachmentFailureKind === "string"
      ? report.attachmentFailureKind
      : inferAttachmentFailureKind(execution, geometryRecipe, report);

  if (
    typeof report.faceIntrusionSeverity === "number" &&
    report.faceIntrusionSeverity > 0.28
  ) {
    return "host-intrusion";
  }

  if (intrusionZones.some((zone) => /eye|nose|face/i.test(zone))) {
    return "host-intrusion";
  }

  if (attachmentFailureKind) {
    return "detached-assembly";
  }

  if (genericRead === "generic-token") {
    return readabilityFailureKind ? "low-contrast-unreadable" : "generic-flat-token";
  }

  if (
    genericRead === "generic-slab" ||
    genericRead === "generic-block" ||
    genericRead === "generic-bar"
  ) {
    return readabilityFailureKind ? "low-contrast-unreadable" : "generic-rect-plate";
  }

  if (
    readabilityFailureKind ||
    canonicalFirstRead === "generic-unreadable" ||
    (typeof report.lookalikeRisk === "number" && report.lookalikeRisk > 0.58) ||
    (typeof report.silhouetteReadability === "number" && report.silhouetteReadability < 0.64)
  ) {
    return "low-contrast-unreadable";
  }

  return undefined;
}

function inferCanonicalFailureLayer(
  execution,
  geometryRecipe,
  report,
  renderCritiqueAvailable,
) {
  const runtimeShapeClass = getExecutionRuntimeShapeClass(execution, geometryRecipe);

  if (isCritiqueTimeoutMode(report, renderCritiqueAvailable)) {
    return "critique-timeout";
  }

  if (
    isBoatLikeRuntimeShapeClass(runtimeShapeClass) &&
    (
      report.representationFailureKind === "generic-flat-token" ||
      report.representationFailureKind === "generic-rect-plate" ||
      report.canonicalFirstRead === "generic-block" ||
      report.canonicalFirstRead === "generic-bar" ||
      report.canonicalFirstRead === "generic-slab"
    )
  ) {
    return "outline-compiler";
  }

  if (
    isProjectionAwareEarSideExecution(execution, geometryRecipe, report) &&
    typeof report.anchorProjectionFailureKind === "string"
  ) {
    return "anchor-projection";
  }

  if (typeof report.attachmentFailureKind === "string") {
    return "attachment-cohesion";
  }

  if (
    report.representationFailureKind === "host-intrusion" &&
    isProjectionAwareEarSideExecution(execution, geometryRecipe, report)
  ) {
    return "anchor-projection";
  }

  if (
    report.representationFailureKind === "generic-flat-token" ||
    report.representationFailureKind === "generic-rect-plate"
  ) {
    return "silhouette";
  }

  if (report.representationFailureKind === "detached-assembly") {
    return "assembly";
  }

  if (report.representationFailureKind === "low-contrast-unreadable") {
    return "render-readability";
  }

  return inferDominantFailureLayerFromReport(report);
}

function hasNegatedTargetRead(text, targetLabels) {
  if (typeof text !== "string" || !text.trim() || !Array.isArray(targetLabels)) {
    return false;
  }

  return targetLabels.some((label) => {
    if (typeof label !== "string" || !label.trim()) {
      return false;
    }

    const escaped = escapeRegExp(label.trim());
    return [
      new RegExp(`(?:不像|不太像|不是|并非|读不成|看不成|无法读成|没读成)\\s*${escaped}`, "i"),
      new RegExp(`(?:not|isn't|is not|doesn't look like|does not look like|rather than|instead of)\\s+[^.。,，;；]{0,24}${escaped}`, "i"),
      new RegExp(`${escaped}[^.。,，;；]{0,16}(?:但|可是|却|however|but)[^.。,，;；]{0,24}(?:不像|不是|读不成|看不成|not|isn't|doesn't)`, "i"),
    ].some((pattern) => pattern.test(text));
  });
}

export function canonicalizeFirstReadResult(execution, geometryRecipe, rawValue) {
  const text = typeof rawValue === "string" ? rawValue.trim() : "";
  const targetLabels = getCanonicalTargetReadLabels(execution, geometryRecipe);
  const lower = text.toLowerCase();
  const genericRead = classifyGenericFirstRead(text);

  if (genericRead) {
    return genericRead;
  }

  if (hasNegatedTargetRead(text, targetLabels)) {
    return "generic-unreadable";
  }

  if (targetLabels.some((label) => lower.includes(label.toLowerCase()))) {
    return getCanonicalTargetReadLabel(execution, geometryRecipe);
  }

  switch (getExecutionRuntimeShapeClass(execution, geometryRecipe)) {
    case "camera-charm":
      return /(camera|相机|照相机|拍立得)/i.test(text)
        ? getCanonicalTargetReadLabel(execution, geometryRecipe)
        : text || "generic-unreadable";
    case "boat-charm":
      return /(boat|ship|小船|船)/i.test(text)
        ? getCanonicalTargetReadLabel(execution, geometryRecipe)
        : text || "generic-unreadable";
    case "fish-charm":
      return /(fish|小鱼|鱼)/i.test(text)
        ? getCanonicalTargetReadLabel(execution, geometryRecipe)
        : text || "generic-unreadable";
    default:
      return text || getCanonicalTargetReadLabel(execution, geometryRecipe);
  }
}

export function buildVisualAcceptanceGate(
  execution,
  geometryRecipe,
  report,
  renderCritiqueAvailable,
) {
  const failures = [];
  const canonicalFirstRead =
    typeof report.canonicalFirstRead === "string"
      ? report.canonicalFirstRead
      : typeof report.firstReadResult === "string"
        ? report.firstReadResult
        : undefined;
  const expectedDominantSpanOwner = getExpectedDominantSpanOwnerForVisualAcceptance(
    execution,
    geometryRecipe,
  );
  const canonicalDominantSpanOwner =
    typeof report.canonicalDominantSpanOwner === "string"
      ? report.canonicalDominantSpanOwner
      : typeof report.dominantSpanOwner === "string"
        ? report.dominantSpanOwner
        : undefined;
  const canonicalDetachedPartIds = Array.isArray(report.canonicalDetachedPartIds)
    ? report.canonicalDetachedPartIds
    : Array.isArray(report.detachedPartIds)
      ? report.detachedPartIds
      : [];
  const criticalParts = getExecutionCriticalParts(geometryRecipe);
  const attachmentPartId =
    typeof geometryRecipe?.attachmentPartId === "string"
      ? geometryRecipe.attachmentPartId
      : undefined;
  const detachableCriticalParts = criticalParts.filter(
    (partId) => partId !== attachmentPartId && partId !== "hang-slot" && partId !== "ring",
  );
  const detachedCriticalParts = detachableCriticalParts.filter((partId) =>
    canonicalDetachedPartIds.includes(partId),
  );
  const firstReadGeneric =
    typeof canonicalFirstRead === "string" && /^generic-/.test(canonicalFirstRead);
  const targetReadLabels = getCanonicalTargetReadLabels(execution, geometryRecipe).map((label) =>
    label.toLowerCase(),
  );
  const targetReadMatched =
    typeof canonicalFirstRead === "string" &&
    targetReadLabels.includes(canonicalFirstRead.toLowerCase());
  const severeFaceIntrusion =
    typeof report.faceIntrusionSeverity === "number" && report.faceIntrusionSeverity > 0.28;
  const intrusionZones = Array.isArray(report.hostIntrusionZones)
    ? report.hostIntrusionZones
    : [];

  if (
    isOpenNounExecution(execution) &&
    renderCritiqueAvailable !== true &&
    !allowsViewportCritiqueAcceptance(report, renderCritiqueAvailable)
  ) {
    failures.push("render critique 不可用，不能通过视觉验收。");
  }

  if (firstReadGeneric) {
    failures.push(`主视图首读仍像 ${canonicalFirstRead}。`);
  }

  if (
    isOpenNounExecution(execution) &&
    typeof canonicalFirstRead === "string" &&
    canonicalFirstRead &&
    !firstReadGeneric &&
    !targetReadMatched
  ) {
    failures.push(`主视图首读没有读到目标 noun：${canonicalFirstRead}。`);
  }

  if (
    expectedDominantSpanOwner &&
    canonicalDominantSpanOwner &&
    canonicalDominantSpanOwner !== expectedDominantSpanOwner
  ) {
    failures.push(
      `主轮廓错误：当前由 ${canonicalDominantSpanOwner} 主导，预期应为 ${expectedDominantSpanOwner}。`,
    );
  }

  if (detachedCriticalParts.length > 0) {
    failures.push(`关键部件脱离：${detachedCriticalParts.join(" / ")}。`);
  }

  if (typeof report.readabilityFailureKind === "string") {
    failures.push(`当前可读性仍不足：${report.readabilityFailureKind}。`);
  }

  if (
    severeFaceIntrusion ||
    intrusionZones.some((zone) => /eye|nose|face/i.test(zone))
  ) {
    failures.push("挂件仍明显侵入眼区/脸部主轮廓。");
  }

  if (report.visualVeto === true) {
    failures.push(report.visualVetoReason ?? "render critique 已触发视觉否决。");
  }

  return {
    visualAcceptanceGatePassed: failures.length === 0,
    visualFailureReasons: uniqueStrings(failures),
  };
}

export function canonicalizeVisualCritiqueReport(
  execution,
  geometryRecipe,
  report,
  renderCritiqueAvailable,
) {
  const canonicalCritiqueTransport = buildVisionCritiqueTransport(
    isRecord(report?.critiqueTransport)
      ? {
          ...report.critiqueTransport,
          source:
            typeof report.critiqueTransport.source === "string"
              ? report.critiqueTransport.source
              : report?.source,
          renderCritiqueAvailable,
          renderCritiquePolicy:
            typeof report.critiqueTransport.renderCritiquePolicy === "string"
              ? report.critiqueTransport.renderCritiquePolicy
              : report?.renderCritiquePolicy,
          failureNote:
            typeof report.critiqueTransport.failureNote === "string"
              ? report.critiqueTransport.failureNote
              : report?.critiqueFailureNote,
        }
      : {
          source: report?.source,
          renderCritiqueAvailable,
          renderCritiquePolicy: report?.renderCritiquePolicy,
          failureNote: report?.critiqueFailureNote,
        },
  );
  const rawFirstReadResult =
    typeof report?.firstReadResult === "string" && report.firstReadResult.trim()
      ? report.firstReadResult.trim()
      : undefined;
  const rawDominantSpanOwnerText =
    typeof report?.dominantSpanOwner === "string" && report.dominantSpanOwner.trim()
      ? report.dominantSpanOwner.trim()
      : undefined;
  const canonicalFirstRead = canonicalizeFirstReadResult(
    execution,
    geometryRecipe,
    rawFirstReadResult,
  );
  const canonicalDominantSpanOwner = extractCanonicalPartIdFromText(
    rawDominantSpanOwnerText,
    execution,
    geometryRecipe,
  );
  const canonicalDetachedPartIds = canonicalizeCritiquePartIds(
    report?.detachedPartIds,
    execution,
    geometryRecipe,
  );
  const canonicalFlattenedPartIds = canonicalizeCritiquePartIds(
    Array.isArray(report?.flattenedPartIds) && report.flattenedPartIds.length > 0
      ? report.flattenedPartIds
      : report?.flattenedStructureParts,
    execution,
    geometryRecipe,
  );
  const readabilityFailureKind = inferReadabilityFailureKind(
    execution,
    geometryRecipe,
    {
      ...report,
      canonicalFirstRead,
      canonicalDetachedPartIds,
    },
  );
  const attachmentFailureKind = inferAttachmentFailureKind(
    execution,
    geometryRecipe,
    {
      ...report,
      canonicalDetachedPartIds,
    },
  );
  const anchorProjectionFailureKind = inferAnchorProjectionFailureKind(
    execution,
    geometryRecipe,
    {
      ...report,
      canonicalFirstRead,
      canonicalDominantSpanOwner,
      canonicalDetachedPartIds,
      readabilityFailureKind,
      attachmentFailureKind,
    },
  );
  const visualAcceptance = buildVisualAcceptanceGate(
    execution,
    geometryRecipe,
    {
      ...report,
      canonicalFirstRead,
      canonicalDominantSpanOwner,
      canonicalDetachedPartIds,
      canonicalFlattenedPartIds,
      readabilityFailureKind,
      attachmentFailureKind,
      anchorProjectionFailureKind,
    },
    renderCritiqueAvailable,
  );
  const representationFailureKind = inferRepresentationFailureKind(
    execution,
    geometryRecipe,
    {
      ...report,
      canonicalFirstRead,
      canonicalDominantSpanOwner,
      canonicalDetachedPartIds,
      canonicalFlattenedPartIds,
      readabilityFailureKind,
      attachmentFailureKind,
      anchorProjectionFailureKind,
    },
  );
  const canonicalFailureLayer = inferCanonicalFailureLayer(
    execution,
    geometryRecipe,
    {
      ...report,
      canonicalFirstRead,
      canonicalDominantSpanOwner,
      canonicalDetachedPartIds,
      canonicalFlattenedPartIds,
      readabilityFailureKind,
      attachmentFailureKind,
      anchorProjectionFailureKind,
      representationFailureKind,
    },
    renderCritiqueAvailable,
  );
  const canonicalNextPassPriority =
    normalizeNextPassPriority(
      {
        ...report,
        representationFailureKind,
        readabilityFailureKind,
        attachmentFailureKind,
        anchorProjectionFailureKind,
        canonicalDetachedPartIds,
        canonicalFlattenedPartIds,
        detachedPartIds: canonicalDetachedPartIds,
        flattenedPartIds: canonicalFlattenedPartIds,
        dominantFailureLayer: canonicalFailureLayer,
      },
      canonicalFailureLayer,
      visualAcceptance.visualAcceptanceGatePassed,
    );
  const canonicalRebuildDirective =
    typeof report?.rebuildDirective === "string"
      ? report.rebuildDirective
      : inferRebuildDirectiveFromFailureLayer(canonicalFailureLayer);
  const shouldForceVisualVeto =
    (typeof canonicalFirstRead === "string" && /^generic-/.test(canonicalFirstRead)) ||
    Boolean(
      readabilityFailureKind &&
        (
          canonicalFirstRead === "generic-unreadable" ||
          (typeof report?.renderNounFidelity === "number" && report.renderNounFidelity < 0.72) ||
          (typeof report?.silhouetteReadability === "number" &&
            report.silhouetteReadability < 0.68)
        ),
    );
  const outlineCompilerMode =
    typeof report?.outlineCompilerMode === "string"
      ? report.outlineCompilerMode
      : isDeviceLikeRuntimeShapeClass(getExecutionRuntimeShapeClass(execution, geometryRecipe))
        ? "device-front-facing"
        : isBoatLikeRuntimeShapeClass(getExecutionRuntimeShapeClass(execution, geometryRecipe))
          ? "vehicle-upright-outline"
          : undefined;
  const outlineProjectionVariantId =
    typeof report?.outlineProjectionVariantId === "string"
      ? report.outlineProjectionVariantId
      : typeof report?.variantId === "string"
        ? report.variantId
        : undefined;
  let canonicalVisualVetoReason = report.visualVetoReason ?? undefined;
  if (!canonicalVisualVetoReason) {
    if (canonicalFailureLayer === "critique-timeout") {
      canonicalVisualVetoReason = "render critique 仍不可用，当前结果不能按视觉通过处理。";
    } else if (canonicalFailureLayer === "anchor-projection") {
      canonicalVisualVetoReason = "耳侧投影仍不自然，挂件还在贴脸或漂出耳侧投影面。";
    } else if (canonicalFailureLayer === "outline-compiler") {
      canonicalVisualVetoReason =
        "主轮廓仍没编译成可读 outline，当前首读仍像 generic 板块/长条。";
    } else if (canonicalFailureLayer === "attachment-cohesion") {
      canonicalVisualVetoReason = "关键 relief 或 rooted assembly 仍不够贴合，当前不能通过。";
    } else if (representationFailureKind === "generic-flat-token") {
      canonicalVisualVetoReason = "主视图首读仍像 flat token，需要切 profile variant。";
    } else if (representationFailureKind === "generic-rect-plate") {
      canonicalVisualVetoReason =
        "主视图首读仍像 rect plate/slab，需要回到 root profile 重建。";
    } else if (attachmentFailureKind === "floating-relief") {
      canonicalVisualVetoReason =
        "关键 relief 件仍像漂浮片，需要先把 front/top relief 收回主体表面。";
    } else if (attachmentFailureKind === "weak-rooting") {
      canonicalVisualVetoReason =
        "桅杆/帆的 rooted assembly 仍不可信，需要先修 attachment cohesion。";
    } else if (representationFailureKind === "detached-assembly") {
      canonicalVisualVetoReason =
        "关键部件看起来仍像 detached assembly，需要回到 rooted assembly。";
    } else if (representationFailureKind === "host-intrusion") {
      canonicalVisualVetoReason = "挂件仍明显侵入狐狸脸部构图，当前不能通过。";
    } else if (readabilityFailureKind === "too-small-to-read") {
      canonicalVisualVetoReason = "当前耳侧挂件已经不过度压脸，但体量过小导致首读不稳定。";
    } else if (readabilityFailureKind === "too-dim") {
      canonicalVisualVetoReason = "当前主体或关键件在 critique 图里太暗，仍不可验收。";
    } else if (representationFailureKind === "low-contrast-unreadable") {
      canonicalVisualVetoReason = "主轮廓或前表面对比不足，当前首读不可接受。";
    }
  }

  return {
    ...report,
    source: canonicalCritiqueTransport.source,
    renderCritiquePolicy: canonicalCritiqueTransport.renderCritiquePolicy,
    critiqueFailureNote:
      canonicalCritiqueTransport.failureNote ??
      (typeof report?.critiqueFailureNote === "string" ? report.critiqueFailureNote : undefined),
    critiqueTransport: canonicalCritiqueTransport,
    rawFirstReadResult,
    firstReadResult: canonicalFirstRead,
    canonicalFirstRead,
    rawDominantSpanOwnerText,
    dominantSpanOwner: canonicalDominantSpanOwner ?? rawDominantSpanOwnerText,
    canonicalDominantSpanOwner,
    detachedPartIds: canonicalDetachedPartIds,
    flattenedPartIds: canonicalFlattenedPartIds,
      canonicalDetachedPartIds,
    canonicalFlattenedPartIds,
    representationFailureKind,
    readabilityFailureKind,
    attachmentFailureKind,
    anchorProjectionFailureKind,
    projectedAnchorPose:
      Array.isArray(report?.projectedAnchorPose) && report.projectedAnchorPose.length === 3
        ? report.projectedAnchorPose
        : undefined,
    anchorPlaneOffset:
      Array.isArray(report?.anchorPlaneOffset) && report.anchorPlaneOffset.length === 3
        ? report.anchorPlaneOffset
        : undefined,
    earSideTangentOffset:
      Array.isArray(report?.earSideTangentOffset) && report.earSideTangentOffset.length === 3
        ? report.earSideTangentOffset
        : undefined,
    outlineCompilerMode,
    outlineProjectionVariantId,
    dominantFailureLayer: canonicalFailureLayer,
    rebuildDirective: canonicalRebuildDirective,
    nextPassPriority: canonicalNextPassPriority,
    visualVeto: report.visualVeto === true || shouldForceVisualVeto,
    visualAcceptanceGatePassed: visualAcceptance.visualAcceptanceGatePassed,
    visualFailureReasons: visualAcceptance.visualFailureReasons,
    visualVetoReason: canonicalVisualVetoReason,
    variantSwitchRecommended:
      report.variantSwitchRecommended === true ||
      representationFailureKind === "generic-flat-token" ||
      representationFailureKind === "generic-rect-plate",
  };
}

export function buildRepresentationDrivenRepairActions(report) {
  if (!isRecord(report)) {
    return [];
  }

  if (report.dominantFailureLayer === "anchor-projection") {
    return [
      {
        actionType: "re-anchor",
        source: "visual",
        reason: "当前主问题是耳侧投影不自然，需要先回耳侧投影/host-fit。",
        intensity: 0.84,
      },
      {
        actionType: "re-orient",
        source: "visual",
        reason: "需要继续沿耳侧投影面调整朝向，减少贴脸和耳外漂浮。",
        intensity: 0.74,
      },
    ];
  }

  if (report.dominantFailureLayer === "attachment-cohesion") {
    return [
      {
        actionType: "re-parent-part",
        source: "structural",
        reason: "当前主问题是 relief/rooted assembly 不够贴合，需要先修装配收口。",
        intensity: 0.82,
      },
      {
        actionType: "tighten-cohesion",
        source: "hybrid",
        reason: "需要把关键件重新压回主体或支撑骨架。",
        intensity: 0.76,
      },
    ];
  }

  if (report.dominantFailureLayer === "critique-timeout") {
    return [];
  }

  if (typeof report.representationFailureKind !== "string") {
    return [];
  }

  switch (report.representationFailureKind) {
    case "generic-flat-token":
      return [
        {
          actionType: "reshape-silhouette",
          source: "hybrid",
          reason: "当前仍像 flat token，需要切换到更强的 profile-relief 主轮廓。",
          intensity: 0.82,
        },
        {
          actionType: "rebuild-from-root",
          source: "structural",
          reason: "需要围绕 root profile 重建，而不是继续只调 offset。",
          intensity: 0.8,
        },
      ];
    case "generic-rect-plate":
      return [
        {
          actionType: "reshape-silhouette",
          source: "hybrid",
          reason: "当前仍像 rect plate/slab，需要重做主轮廓和 relief 布局。",
          intensity: 0.84,
        },
        {
          actionType: "rebalance-part-ratio",
          source: "hybrid",
          reason: "需要把 dominant span 重新还给主体件，避免 plate 感。",
          intensity: 0.76,
        },
        {
          actionType: "rebuild-from-root",
          source: "structural",
          reason: "当前表示仍过平，需要回到 root profile 重建。",
          intensity: 0.82,
        },
      ];
    case "detached-assembly":
      return [
        {
          actionType: "re-parent-part",
          source: "structural",
          reason: "关键子件像 detached assembly，需要重新 rooted 到父结构。",
          intensity: 0.82,
        },
        {
          actionType: "tighten-cohesion",
          source: "hybrid",
          reason: "需要继续收紧装配整体性。",
          intensity: 0.76,
        },
      ];
    case "host-intrusion":
      return [
        {
          actionType: "re-anchor",
          source: "visual",
          reason: "当前主要问题是 host intrusion，需要先回 host-fit。",
          intensity: 0.82,
        },
        {
          actionType: "re-orient",
          source: "visual",
          reason: "需要重新调整朝向，降低对眼区/脸部的侵入。",
          intensity: 0.72,
        },
      ];
    case "low-contrast-unreadable":
      return [
        {
          actionType: "re-materialize-color-zone",
          source: "hybrid",
          reason: "当前可读性主要受材质对比限制，需要先抬高主体和关键件明度差。",
          intensity: 0.76,
        },
        {
          actionType: "promote-critical-part",
          source: "hybrid",
          reason: "当前主轮廓或正面特征可读性太弱，需要抬高首读件。",
          intensity: 0.76,
        },
        {
          actionType: "reshape-silhouette",
          source: "hybrid",
          reason: "当前对比和轮廓读形不足，需要做 readability lift。",
          intensity: 0.74,
        },
      ];
    default:
      return [];
  }
}

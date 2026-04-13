import assert from "node:assert/strict";

import {
  applyChestWrapCompactEnvelopeClamp,
  buildCapabilityEscalationBootstrapRepairActions,
  buildRuntimeRepairActions,
  applyHardSurfaceOutlineCompiler,
  getCapabilityPlacementRecoveryOffset,
  getHardSurfaceProgressivePartIds,
  getHardSurfaceReadabilityMaterialPolicy,
  getHardSurfaceCritiqueLightingProfile,
  getHardSurfaceHostFitScaleClamp,
  getHardSurfaceHostFitOffset,
  getPreferredRecoveryVariantId,
  getRoleEmphasisMultiplier,
  getPreferredPrecisionOffset,
  applyHardSurfacePrecisionShapeToScale,
  applyHardSurfaceVariantRepresentationOverrides,
  hasConcretePlannerBackedRuntimeContract,
  isHardSurfaceOpenNounExecution,
  projectHardSurfaceEarSideAnchorPose,
  usesOpenNounDiscoveryPolicy,
} from "./lib/hard-surface-runtime-policy.mjs";
import { buildFallbackReadOrderTargets } from "./lib/runtime-visual-critique.mjs";

function main() {
  const flowerExecution: any = {
    requestedNoun: "小花",
    familyResolutionSource: "openai",
    designArchetype: "botanical-charm",
    runtimeShapeClass: "flower",
    blueprintFamily: "canonical-botanical",
  };
  const flowerGeometryRecipe: any = {
    runtimeShapeClass: "flower",
    blueprintFamily: "canonical-botanical",
    parts: [
      { partId: "core" },
      { partId: "petal-left" },
      { partId: "petal-right" },
      { partId: "petal-top" },
      { partId: "petal-bottom" },
      { partId: "petal-top-left" },
      { partId: "petal-top-right" },
    ],
    criticalParts: ["core", "petal-top"],
    readOrderTargets: ["core", "petal-top"],
    assemblyRootPartId: "core",
  };

  assert.equal(
    isHardSurfaceOpenNounExecution(flowerExecution, flowerGeometryRecipe),
    false,
    "canonical botanical open nouns should not be treated as hard-surface executions",
  );
  assert.equal(
    getHardSurfaceProgressivePartIds(flowerExecution, flowerGeometryRecipe, 1, 8, []),
    null,
    "botanical open nouns should defer part selection to graph/family routing",
  );

  const cameraExecution: any = {
    requestedNoun: "相机",
    familyResolutionSource: "openai",
    designArchetype: "tool-charm",
    runtimeShapeClass: "camera-charm",
    blueprintFamily: "hard-surface-device",
  };
  const cameraGeometryRecipe: any = {
    runtimeShapeClass: "camera-charm",
    blueprintFamily: "hard-surface-device",
    familyPolicyId: "hard-surface-device",
    parts: [
      { partId: "device-body" },
      { partId: "camera-faceplate" },
      { partId: "camera-lens" },
      { partId: "camera-top" },
      { partId: "camera-viewfinder" },
    ],
  };

  assert.equal(
    isHardSurfaceOpenNounExecution(cameraExecution, cameraGeometryRecipe),
    true,
    "camera open nouns should keep hard-surface execution behavior",
  );
  assert.equal(
    usesOpenNounDiscoveryPolicy(cameraExecution, cameraGeometryRecipe),
    true,
    "plain hard-surface camera open nouns should stay on discovery policy before a concrete runtime contract exists",
  );
  assert.deepEqual(
    getHardSurfaceProgressivePartIds(cameraExecution, cameraGeometryRecipe, 1, 8, []),
    ["device-body", "camera-lens"],
    "camera hard-surface progressive selection should keep the blocking-stage silhouette pair",
  );

  const chestRigidCameraExecution: any = {
    anchor: "chest-center",
    requestedNoun: "小相机",
    familyResolutionSource: "open-noun",
    designArchetype: "device-charm",
    runtimeShapeClass: "camera-charm",
    capabilityBundle: {
      capabilities: [
        "host-coupled",
        "front-readable",
        "rigid-body",
        "flat-face-readable",
        "ear-side-hang",
        "micro-hang",
      ],
    },
    runtimeDesignContract: {
      capabilityClass: "host-coupled-chest-rigid-front-readable",
      requiredCapabilities: ["host-coupled", "front-readable", "rigid-body"],
      desiredPlacementOffset: [0, 0.0022, -0.0062],
      hostFitEnvelope: {
        anchorEnvelope: [0.036, 0.02, 0.036],
        maxSpan: [0.044, 0.024, 0.044],
        preferredYaw: 0,
        screenFacingBias: 0.99,
        faceIntrusionBudget: 0.04,
        eyeKeepout: true,
        earClearance: 0.016,
      },
    },
  };
  const chestRigidCameraGeometryRecipe: any = {
    runtimeShapeClass: "camera-charm",
    familyPolicyId: "hard-surface-device",
    runtimeDesignSource: "hybrid",
    capabilityBundle: chestRigidCameraExecution.capabilityBundle,
    structuralBlueprint: {
      familyPolicyId: "hard-surface-device",
      dominantSpanOwner: "device-body",
      dominantContour: "body-lens-forward",
      sideDepthProfile: "front-loaded",
      reliefFlushDepth: 0.0094,
      attachmentCohesionBudget: 0.96,
      hostFitEnvelope:
        chestRigidCameraExecution.runtimeDesignContract.hostFitEnvelope,
      attachmentAnchors: [
        {
          anchorId: "camera-lens-front",
          partId: "camera-lens",
          parentPartId: "device-body",
          mountFace: "front",
          preferredOffset: [0.006, -0.013, 0.002],
          flushMount: true,
          embedDepth: 0.0028,
        },
      ],
      runtimeDesignContract: {
        ...chestRigidCameraExecution.runtimeDesignContract,
        primaryReadTarget: "device-body",
        requiredVisibleParts: ["device-body", "camera-lens", "camera-top"],
      },
      partDepthTargets: [
        { partId: "device-body", minDepth: 0.17, maxDepth: 0.24 },
        { partId: "camera-lens", minDepth: 0.34, maxDepth: 0.56 },
      ],
      silhouetteKeepouts: [
        {
          keepoutId: "camera-hang-subordinate",
          partId: "hang-slot",
          behavior: "subordinate",
        },
      ],
    },
    runtimeDesignContract: {
      ...chestRigidCameraExecution.runtimeDesignContract,
      primaryReadTarget: "device-body",
      requiredVisibleParts: ["device-body", "camera-lens", "camera-top"],
    },
  };
  assert.equal(
    hasConcretePlannerBackedRuntimeContract(
      chestRigidCameraExecution,
      chestRigidCameraGeometryRecipe,
    ),
    true,
    "planner-backed chest rigid camera contracts should be treated as concrete runtime contracts once capability/read-order fields are present",
  );
  assert.equal(
    usesOpenNounDiscoveryPolicy(
      chestRigidCameraExecution,
      chestRigidCameraGeometryRecipe,
    ),
    false,
    "planner-backed chest rigid camera contracts should stop using discovery open-noun policy once the runtime contract is concrete",
  );
  const chestRigidRepairActions = [
    { actionType: "re-anchor", intensity: 0.82 },
    { actionType: "rebuild-from-root", intensity: 0.86 },
    { actionType: "tighten-cohesion", intensity: 0.74 },
    { actionType: "promote-critical-part", intensity: 0.62 },
    { actionType: "reshape-silhouette", intensity: 0.68 },
  ];
  const chestRigidClampBaseline = getHardSurfaceHostFitScaleClamp(
    chestRigidCameraExecution,
    chestRigidCameraGeometryRecipe,
    "host-fit",
    0.72,
    [],
  );
  const chestRigidClampRecovered = getHardSurfaceHostFitScaleClamp(
    chestRigidCameraExecution,
    chestRigidCameraGeometryRecipe,
    "host-fit",
    0.72,
    chestRigidRepairActions,
  );
  const chestRigidHostFitOffset = getHardSurfaceHostFitOffset(
    chestRigidCameraExecution,
    chestRigidCameraGeometryRecipe,
    "host-fit",
  );
  const chestRigidRecoveryOffset = getCapabilityPlacementRecoveryOffset(
    chestRigidCameraExecution,
    chestRigidCameraGeometryRecipe,
    chestRigidRepairActions,
  );
  assert.ok(
    chestRigidClampBaseline > 1,
    "contract-backed chest rigid cameras should scale toward the chest readable envelope instead of falling through a no-op host-fit clamp",
  );
  assert.ok(
    Math.abs(chestRigidClampRecovered - chestRigidClampBaseline) >= 0.005 &&
      chestRigidClampRecovered > 1,
    "chest rigid camera host-fit clamp should stay in a chest-readable scale band and actually react to repair pressure instead of falling through to ear-side micro-hang sizing",
  );
  assert.ok(
    chestRigidHostFitOffset[1] < 0 && chestRigidHostFitOffset[2] < -0.003,
    "chest rigid camera host-fit offset should actively drop and pull the rigid piece away from the face plane",
  );
  assert.ok(
    chestRigidRecoveryOffset[1] < -0.006 &&
      chestRigidRecoveryOffset[2] < -0.006,
    "chest rigid camera recovery offset should become strongly contract-driven once host-fit repair pressure accumulates",
  );
  assert.equal(
    getPreferredRecoveryVariantId(
      chestRigidCameraExecution,
      {
        ...chestRigidCameraGeometryRecipe,
        variantCandidates: [
          {
            variantId: "camera-body-lens-forward",
            label: "body-lens-forward",
            silhouetteIntent: "机身先读出，再读镜头前凸和顶部 cluster。",
          },
          {
            variantId: "camera-body-top-cluster",
            label: "body-top-cluster",
            silhouetteIntent: "机身和顶部 cluster 同时可读，镜头仍保持前出。",
          },
          {
            variantId: "camera-compact-charm",
            label: "compact-charm",
            silhouetteIntent: "收紧为耳侧饰品级 2.5D 相机吊件，避免压脸。",
          },
        ],
      },
      "camera-body-top-cluster",
      {
        visualCritiqueReport: {
          canonicalFirstRead: "generic-slab",
          firstReadResult: "generic slab",
          representationFailureKind: "generic-flat-token",
          dominantFailureLayer: "silhouette",
          variantSwitchRecommended: true,
          visualVeto: true,
          faceIntrusionSeverity: 0.33,
        },
      },
    ),
    "camera-body-lens-forward",
    "chest rigid front-readable device executions should recover within front-readable camera variants instead of switching into ear-side compact charms",
  );
  const genericHostFitCameraScaleBody = applyHardSurfacePrecisionShapeToScale(
    [1, 1, 1],
    {
      ...chestRigidCameraExecution,
      capabilityBundle: { capabilities: ["host-coupled", "front-readable"] },
      runtimeDesignContract: undefined,
    },
    {
      ...chestRigidCameraGeometryRecipe,
      runtimeDesignSource: undefined,
      runtimeDesignContract: undefined,
      capabilityBundle: { capabilities: ["host-coupled", "front-readable"] },
      structuralBlueprint: {
        ...chestRigidCameraGeometryRecipe.structuralBlueprint,
        runtimeDesignContract: undefined,
      },
    },
    "host-fit",
    "device-body",
    { silhouetteRole: "body" },
    chestRigidRepairActions,
  );
  const genericHostFitCameraScaleLens = applyHardSurfacePrecisionShapeToScale(
    [1, 1, 1],
    {
      ...chestRigidCameraExecution,
      capabilityBundle: { capabilities: ["host-coupled", "front-readable"] },
      runtimeDesignContract: undefined,
    },
    {
      ...chestRigidCameraGeometryRecipe,
      runtimeDesignSource: undefined,
      runtimeDesignContract: undefined,
      capabilityBundle: { capabilities: ["host-coupled", "front-readable"] },
      structuralBlueprint: {
        ...chestRigidCameraGeometryRecipe.structuralBlueprint,
        runtimeDesignContract: undefined,
      },
    },
    "host-fit",
    "camera-lens",
    { silhouetteRole: "feature" },
    chestRigidRepairActions,
  );
  const genericHostFitCameraScaleFaceplate = applyHardSurfacePrecisionShapeToScale(
    [1, 1, 1],
    {
      ...chestRigidCameraExecution,
      capabilityBundle: { capabilities: ["host-coupled", "front-readable"] },
      runtimeDesignContract: undefined,
    },
    {
      ...chestRigidCameraGeometryRecipe,
      runtimeDesignSource: undefined,
      runtimeDesignContract: undefined,
      capabilityBundle: { capabilities: ["host-coupled", "front-readable"] },
      structuralBlueprint: {
        ...chestRigidCameraGeometryRecipe.structuralBlueprint,
        runtimeDesignContract: undefined,
      },
    },
    "host-fit",
    "camera-faceplate",
    { silhouetteRole: "secondary" },
    chestRigidRepairActions,
  );
  const chestRigidHostFitCameraScaleBody = applyHardSurfacePrecisionShapeToScale(
    [1, 1, 1],
    chestRigidCameraExecution,
    chestRigidCameraGeometryRecipe,
    "host-fit",
    "device-body",
    { silhouetteRole: "body" },
    chestRigidRepairActions,
  );
  const chestRigidHostFitCameraScaleLens = applyHardSurfacePrecisionShapeToScale(
    [1, 1, 1],
    chestRigidCameraExecution,
    chestRigidCameraGeometryRecipe,
    "host-fit",
    "camera-lens",
    { silhouetteRole: "feature" },
    chestRigidRepairActions,
  );
  const chestRigidHostFitCameraScaleFaceplate = applyHardSurfacePrecisionShapeToScale(
    [1, 1, 1],
    chestRigidCameraExecution,
    chestRigidCameraGeometryRecipe,
    "host-fit",
    "camera-faceplate",
    { silhouetteRole: "secondary" },
    chestRigidRepairActions,
  );
  assert.ok(
    chestRigidHostFitCameraScaleBody[0] < genericHostFitCameraScaleBody[0] &&
      chestRigidHostFitCameraScaleBody[2] < genericHostFitCameraScaleBody[2],
    "chest rigid host-fit precision shaping should shrink the camera body slab more aggressively than generic device shaping",
  );
  assert.ok(
    chestRigidHostFitCameraScaleLens[0] / chestRigidHostFitCameraScaleBody[0] >
      genericHostFitCameraScaleLens[0] / genericHostFitCameraScaleBody[0] &&
      chestRigidHostFitCameraScaleLens[2] / chestRigidHostFitCameraScaleBody[2] >
      genericHostFitCameraScaleLens[2] / genericHostFitCameraScaleBody[2],
    "chest rigid host-fit precision shaping should make the camera lens stand out more strongly against the body slab instead of flattening both together",
  );
  assert.ok(
    chestRigidHostFitCameraScaleFaceplate[0] / chestRigidHostFitCameraScaleBody[0] <
      genericHostFitCameraScaleFaceplate[0] / genericHostFitCameraScaleBody[0] &&
      chestRigidHostFitCameraScaleFaceplate[2] / chestRigidHostFitCameraScaleBody[2] <
        genericHostFitCameraScaleFaceplate[2] / genericHostFitCameraScaleBody[2],
    "chest rigid host-fit precision shaping should suppress the camera faceplate slab more aggressively than generic device shaping",
  );

  const chestRigidCameraVariantOverride = applyHardSurfaceVariantRepresentationOverrides(
    {
      ...chestRigidCameraGeometryRecipe,
      variantId: "camera-body-lens-forward",
      parts: [
        {
          partId: "device-body",
          size: 0.038,
          scale: [0.92, 0.118, 0.56],
          offset: [0, 0, 0.004],
        },
        {
          partId: "camera-faceplate",
          size: 0.028,
          scale: [0.64, 0.052, 0.44],
          offset: [0.009, -0.011, 0.004],
        },
        {
          partId: "camera-lens",
          size: 0.022,
          scale: [0.44, 0.3, 0.28],
          offset: [0.012, -0.021, 0.002],
        },
        {
          partId: "camera-top",
          size: 0.015,
          scale: [0.088, 0.028, 0.046],
          offset: [0.006, 0.0006, 0.014],
        },
        {
          partId: "camera-viewfinder",
          size: 0.009,
          scale: [0.062, 0.024, 0.04],
          offset: [-0.007, 0.0006, 0.013],
        },
        {
          partId: "camera-button",
          size: 0.005,
          scale: [0.024, 0.014, 0.014],
          offset: [0.01, 0.0008, 0.018],
        },
        {
          partId: "hang-slot",
          size: 0.006,
          scale: [0.0022, 0.0022, 0.0016],
          offset: [0.0008, 0.0004, 0.016],
        },
      ],
      variantCandidates: [
        {
          variantId: "camera-body-lens-forward",
          readOrderHints: ["device-body", "camera-lens", "camera-top"],
        },
      ],
    },
    "camera-body-lens-forward",
    {
      execution: chestRigidCameraExecution,
      repairActions: chestRigidRepairActions,
    },
  );
  assert.equal(
    chestRigidCameraVariantOverride?.capabilityRerouteId,
    "chest-rigid-camera-front-readable-relief",
    "chest rigid camera lens-forward variants should reroute into a front-readable camera relief trait instead of keeping the wide chest-badge default",
  );
  const chestRigidSpanTargets =
    chestRigidCameraVariantOverride?.structuralBlueprint?.partSpanTargets ?? [];
  assert.ok(
    chestRigidSpanTargets.some(
      (entry: any) =>
        entry.partId === "camera-faceplate" && entry.maxShare <= 0.14,
    ),
    "chest rigid camera relief traits should explicitly cap the faceplate span so it cannot dominate the chest read",
  );
  assert.ok(
    chestRigidSpanTargets.some(
      (entry: any) =>
        entry.partId === "camera-viewfinder" &&
        entry.minShare >= 0.03 &&
        entry.maxShare <= 0.08,
    ),
    "chest rigid camera relief traits should reserve readable span for the top-left viewfinder cluster instead of flattening it away",
  );
  const getPartSpanMeasure = (part: any) =>
    Math.max(
      Math.abs((part.scale?.[0] ?? 1) * (part.size ?? 0.02)),
      Math.abs((part.scale?.[1] ?? 1) * (part.size ?? 0.02)),
      Math.abs((part.scale?.[2] ?? 1) * (part.size ?? 0.02)),
    ) * 2;
  const chestRigidParts = chestRigidCameraVariantOverride?.parts ?? [];
  const lensSpan = getPartSpanMeasure(
    chestRigidParts.find((part: any) => part.partId === "camera-lens"),
  );
  const faceplateSpan = getPartSpanMeasure(
    chestRigidParts.find((part: any) => part.partId === "camera-faceplate"),
  );
  assert.ok(
    lensSpan > faceplateSpan,
    "chest rigid camera relief traits should make the lens span stronger than the faceplate slab at the blueprint level",
  );
  const reroutedPartProfiles = chestRigidCameraVariantOverride?.partProfiles ?? [];
  assert.ok(
    reroutedPartProfiles.some(
      (entry: any) =>
        entry.partId === "camera-top" &&
        entry.silhouetteRole === "secondary" &&
        entry.spanBias >= 0.8,
    ),
    "rerouted chest rigid camera traits should promote camera-top into a real silhouette-bearing part instead of leaving it at a weak support bias",
  );
  assert.ok(
    reroutedPartProfiles.some(
      (entry: any) =>
        entry.partId === "camera-viewfinder" &&
        entry.spanBias >= 0.7 &&
        entry.depthBias >= 1,
    ),
    "rerouted chest rigid camera traits should keep the viewfinder cluster visible enough to break the body slab silhouette",
  );
  const reroutedAttachmentRules = chestRigidCameraVariantOverride?.attachmentRules ?? [];
  assert.ok(
    reroutedAttachmentRules.some(
      (entry: any) =>
        entry.partId === "camera-lens" &&
        entry.edgeConstraint === "embedded-front" &&
        entry.flushMount === false,
    ),
    "rerouted chest rigid camera traits should let the lens stay forward-readable instead of collapsing it into a flush front badge",
  );
  assert.ok(
    reroutedAttachmentRules.some(
      (entry: any) =>
        entry.partId === "camera-top" &&
        entry.edgeConstraint === "supported-branch" &&
        entry.flushMount === false,
    ),
    "rerouted chest rigid camera traits should branch the top cluster out of the body silhouette instead of keeping it as a fully flush mount",
  );
  const reroutedClampRecovered = getHardSurfaceHostFitScaleClamp(
    chestRigidCameraExecution,
    chestRigidCameraVariantOverride,
    "host-fit",
    0.72,
    chestRigidRepairActions,
  );
  const reroutedHostFitOffset = getHardSurfaceHostFitOffset(
    chestRigidCameraExecution,
    chestRigidCameraVariantOverride,
    "host-fit",
  );
  const reroutedRecoveryOffset = getCapabilityPlacementRecoveryOffset(
    chestRigidCameraExecution,
    chestRigidCameraVariantOverride,
    chestRigidRepairActions,
  );
  assert.ok(
    reroutedClampRecovered < chestRigidClampRecovered,
    "rerouted chest rigid camera traits should use a more conservative host-fit scale clamp than the generic chest-rigid envelope",
  );
  assert.ok(
    reroutedHostFitOffset[1] < chestRigidHostFitOffset[1] &&
      reroutedHostFitOffset[2] < chestRigidHostFitOffset[2],
    "rerouted chest rigid camera traits should drop farther down and back during host-fit to avoid face intrusion",
  );
  assert.ok(
    reroutedRecoveryOffset[1] < chestRigidRecoveryOffset[1] &&
      reroutedRecoveryOffset[2] < chestRigidRecoveryOffset[2],
    "rerouted chest rigid camera traits should apply a stronger recovery pull once host-fit pressure accumulates",
  );

  const chestRigidCameraRepairActions = buildRuntimeRepairActions(
    chestRigidCameraExecution,
    chestRigidCameraGeometryRecipe,
    [
      { partId: "device-body", role: "device-body" },
      { partId: "camera-faceplate", role: "device-body" },
      { partId: "camera-lens", role: "camera-lens" },
      { partId: "camera-top", role: "camera-top" },
      { partId: "camera-viewfinder", role: "camera-viewfinder" },
    ],
    null,
    {
      dominantSpanOwner: "device-body",
      nounFidelity: 0.83,
      cohesionScore: 0.88,
      scaleFit: 0.31,
      visualReadability: 0.44,
      silhouetteStrength: 0.52,
      hostComposition: 0.49,
      faceIntrusionSeverity: 0.62,
    } as any,
  );
  assert.ok(
    chestRigidCameraRepairActions.some(
      (action: any) =>
        action.actionType === "rebalance-part-ratio" &&
        action.targetPartIds?.includes("camera-faceplate"),
    ),
    "chest rigid camera runtime repair planning should rebalance faceplate/lens ratios even when device-body is still the dominant span owner",
  );
  const chestRigidCameraBootstrapActions =
    buildCapabilityEscalationBootstrapRepairActions(
      chestRigidCameraExecution,
      chestRigidCameraGeometryRecipe,
      {
        visualCritiqueReport: {
          stagnationDetected: true,
          controllerFailureLayer: "stagnation",
          controllerDirective: "escalate-capability",
          canonicalFlattenedPartIds: ["camera-faceplate", "camera-lens"],
          canonicalDetachedPartIds: [],
        },
      },
      "camera-body-lens-forward",
    );
  assert.ok(
    chestRigidCameraBootstrapActions.some(
      (action: any) =>
        action.actionType === "reroute-trait-profile" &&
        action.targetTraitProfile ===
          "chest-rigid-camera-front-readable-relief",
    ),
    "stagnating chest rigid cameras should escalate into the front-readable camera relief trait instead of reusing the same wide-body slab profile",
  );

  const chestRigidBadgeExecution: any = {
    anchor: "chest-center",
    requestedNoun: "校徽",
    familyResolutionSource: "known-family",
    designArchetype: "symbol-charm",
    runtimeShapeClass: "badge",
    capabilityBundle: {
      capabilities: [
        "host-coupled",
        "front-readable",
        "rigid-body",
        "flat-face-readable",
      ],
    },
    runtimeDesignContract: {
      capabilityClass: "host-coupled-chest-rigid-front-readable",
      requiredCapabilities: ["host-coupled", "front-readable", "rigid-body"],
      hostFitEnvelope: {
        anchorEnvelope: [0.034, 0.016, 0.034],
        maxSpan: [0.04, 0.02, 0.04],
        preferredYaw: 0,
        screenFacingBias: 0.995,
        faceIntrusionBudget: 0.035,
        eyeKeepout: true,
        earClearance: 0.016,
      },
    },
  };
  const chestRigidBadgeGeometryRecipe: any = {
    runtimeShapeClass: "badge",
    capabilityBundle: chestRigidBadgeExecution.capabilityBundle,
    structuralBlueprint: {
      hostFitEnvelope:
        chestRigidBadgeExecution.runtimeDesignContract.hostFitEnvelope,
    },
  };
  assert.equal(
    isHardSurfaceOpenNounExecution(
      chestRigidBadgeExecution,
      chestRigidBadgeGeometryRecipe,
    ),
    false,
    "known-family chest badges should not rely on open-noun detection to receive host-fit behavior",
  );
  assert.ok(
    getHardSurfaceHostFitScaleClamp(
      chestRigidBadgeExecution,
      chestRigidBadgeGeometryRecipe,
      "host-fit",
      0.72,
      [],
    ) > 1,
    "contract-backed chest rigid badges should still receive chest-front host-fit scaling even when they are not open-noun executions",
  );

  const baseProjectedEarSideArgs = {
    targetAnchorPosition: [0.0262, -0.0149, 0.0879],
    placementOffset: [0.0107, -0.0004, 0.0068],
    repairActions: [],
    assemblyOutwardShift: [0, 0, 0],
  };
  const openSymbolExecution: any = {
    anchor: "left-ear",
    requestedNoun: "符号",
    family: "open-symbol-ornament",
    familyResolutionSource: "open-noun",
    designArchetype: "symbol-charm",
    runtimeShapeClass: "open-symbol-ornament",
  };
  const openSymbolGeometryRecipe: any = {
    runtimeShapeClass: "open-symbol-ornament",
    structuralBlueprint: {
      mountStrategy: "ear-side-front-facing",
      primarySilhouette: "symbol-badge",
      hostFitEnvelope: {
        anchorEnvelope: [0.024, 0.016, 0.024],
        maxSpan: [0.029, 0.018, 0.028],
        preferredYaw: 12,
        screenFacingBias: 0.84,
        faceIntrusionBudget: 0.18,
        eyeKeepout: true,
        earClearance: 0.011,
      },
    },
  };
  const starExecution: any = {
    ...openSymbolExecution,
    requestedNoun: "星",
    family: "star",
    familyResolutionSource: "known-family",
    runtimeShapeClass: "star",
  };
  const starGeometryRecipe: any = {
    ...openSymbolGeometryRecipe,
    runtimeShapeClass: "star",
    structuralBlueprint: {
      ...openSymbolGeometryRecipe.structuralBlueprint,
      hostFitEnvelope: {
        anchorEnvelope: [0.024, 0.016, 0.024],
        maxSpan: [0.029, 0.018, 0.03],
        preferredYaw: 16,
        screenFacingBias: 0.92,
        faceIntrusionBudget: 0.18,
        eyeKeepout: true,
        earClearance: 0.012,
      },
    },
  };
  const openSymbolPose = projectHardSurfaceEarSideAnchorPose({
    execution: openSymbolExecution,
    geometryRecipe: openSymbolGeometryRecipe,
    ...baseProjectedEarSideArgs,
  });
  const starPose = projectHardSurfaceEarSideAnchorPose({
    execution: starExecution,
    geometryRecipe: starGeometryRecipe,
    ...baseProjectedEarSideArgs,
  });

  assert.ok(
    Math.abs(starPose.earSideTangentOffset[0]) > Math.abs(openSymbolPose.earSideTangentOffset[0]),
    "star ear-side symbol projection should push farther outward than generic open symbols",
  );
  assert.ok(
    starPose.anchorPlaneOffset[1] > openSymbolPose.anchorPlaneOffset[1],
    "star ear-side symbol projection should lift slightly higher than generic open symbols",
  );
  assert.ok(
    starPose.earSideTangentOffset[2] > openSymbolPose.earSideTangentOffset[2],
    "star ear-side symbol projection should tilt farther forward than generic open symbols",
  );
  assert.ok(
    Math.abs(starPose.projectedAnchorPose[0]) > Math.abs(openSymbolPose.projectedAnchorPose[0]),
    "star projected pose should sit farther from the face on the ear-side axis",
  );
  assert.ok(
    starPose.projectedAnchorPose[1] > openSymbolPose.projectedAnchorPose[1],
    "star projected pose should keep a slightly higher final anchor pose",
  );
  assert.ok(
    starPose.projectedAnchorPose[2] > openSymbolPose.projectedAnchorPose[2],
    "star projected pose should keep a slightly more forward final anchor pose",
  );
  assert.ok(
    getHardSurfaceHostFitScaleClamp(starExecution, starGeometryRecipe, "final-review", 1, []) < 1,
    "projected ear-side symbol families should receive host-fit scale clamping in final review",
  );
  assert.ok(
    getRoleEmphasisMultiplier("star", "ray", 3) > 1,
    "star rays should receive late-pass emphasis so the silhouette can reopen in review passes",
  );
  assert.ok(
    getRoleEmphasisMultiplier("star", "ray", 3) >
      getRoleEmphasisMultiplier("star", "core", 3),
    "star late-pass emphasis should favor rays over the core to keep the center from dominating first read",
  );
  assert.ok(
    getRoleEmphasisMultiplier("star", "ray", 1) <
      getRoleEmphasisMultiplier("star", "ray", 3),
    "star ray emphasis should strengthen across passes rather than staying flat",
  );

  const scarfExecution: any = {
    anchor: "chest-center",
    requestedNoun: "围巾",
    familyResolutionSource: "known-family",
    designArchetype: "soft-accessory",
    runtimeShapeClass: "scarf",
    capabilityBundle: {
      capabilities: ["host-coupled", "chest-wrap", "soft-body", "front-readable", "dual-tail", "face-safe"],
    },
    runtimeDesignContract: {
      capabilityClass: "host-coupled-chest-wrap",
      requiredCapabilities: ["host-coupled", "chest-wrap"],
      hostFitEnvelope: {
        anchorEnvelope: [0.04, 0.015, 0.028],
        maxSpan: [0.048, 0.017, 0.034],
        preferredYaw: 0,
        screenFacingBias: 0.98,
        faceIntrusionBudget: 0.06,
        eyeKeepout: true,
        earClearance: 0.016,
      },
    },
  };
  const scarfGeometryRecipe: any = {
    runtimeShapeClass: "scarf",
    capabilityBundle: scarfExecution.capabilityBundle,
    structuralBlueprint: {
      dominantSpanOwner: "wrap-band",
      dominantContour: "wrap-band-with-dual-tails",
      sideDepthProfile: "thin-slab",
      reliefFlushDepth: 0.0034,
      attachmentCohesionBudget: 0.97,
      hostFitEnvelope: {
        anchorEnvelope: [0.04, 0.015, 0.028],
        maxSpan: [0.048, 0.017, 0.034],
        preferredYaw: 0,
        screenFacingBias: 0.98,
        faceIntrusionBudget: 0.06,
        eyeKeepout: true,
        earClearance: 0.016,
      },
      attachmentAnchors: [
        {
          anchorId: "scarf-knot-center",
          partId: "knot",
          parentPartId: "wrap-band",
          mountFace: "center",
          preferredOffset: [0, 0.0016, -0.008],
          flushMount: true,
          embedDepth: 0.0018,
        },
        {
          anchorId: "scarf-tail-left",
          partId: "tail-left",
          parentPartId: "knot",
          mountFace: "bottom-left",
          preferredOffset: [-0.01, 0.001, -0.018],
          flushMount: true,
          embedDepth: 0.001,
        },
      ],
      partDepthTargets: [
        { partId: "knot", minDepth: 0.1, maxDepth: 0.18 },
        { partId: "tail-left", minDepth: 0.06, maxDepth: 0.14 },
      ],
      silhouetteKeepouts: [
        { keepoutId: "scarf-wrap-rooted", partId: "wrap-band", behavior: "rooted-only" },
        { keepoutId: "scarf-knot-subordinate", partId: "knot", behavior: "keep-within-root" },
      ],
    },
  };
  const scarfRepairActions = [
    { actionType: "re-anchor", intensity: 0.82 },
    { actionType: "rebuild-from-root", intensity: 0.9 },
    { actionType: "re-parent-part", intensity: 0.86 },
    { actionType: "tighten-cohesion", intensity: 0.82 },
    { actionType: "reshape-silhouette", intensity: 0.78 },
    { actionType: "promote-critical-part", intensity: 0.68 },
  ];

  const knotOffset = getPreferredPrecisionOffset(
    [0, -0.003, 0.001],
    scarfExecution,
    scarfGeometryRecipe,
    "host-fit",
    "knot",
    scarfRepairActions,
  );
  assert.ok(
    knotOffset[1] > -0.003 && knotOffset[2] < 0.001,
    "chest-wrap knot precision offset should move toward the contract anchor in host-fit",
  );

  const tailOffset = getPreferredPrecisionOffset(
    [-0.012, -0.002, -0.015],
    scarfExecution,
    scarfGeometryRecipe,
    "host-fit",
    "tail-left",
    scarfRepairActions,
  );
  assert.ok(
    tailOffset[0] > -0.009 &&
      tailOffset[1] > -0.002 &&
      tailOffset[2] < -0.015,
    "chest-wrap tail precision offset should tighten inward under the knot instead of drifting outward like detached bars",
  );

  const scarfClampBaseline = getHardSurfaceHostFitScaleClamp(
    scarfExecution,
    scarfGeometryRecipe,
    "host-fit",
    0.72,
    [],
  );
  const scarfClampRecovered = getHardSurfaceHostFitScaleClamp(
    scarfExecution,
    scarfGeometryRecipe,
    "host-fit",
    0.72,
    scarfRepairActions,
  );
  const scarfRecoveryOffset = getCapabilityPlacementRecoveryOffset(
    scarfExecution,
    scarfGeometryRecipe,
    scarfRepairActions,
  );
  const scarfHostFitOffset = getHardSurfaceHostFitOffset(
    scarfExecution,
    scarfGeometryRecipe,
    "host-fit",
  );
  assert.ok(
    scarfClampRecovered < scarfClampBaseline && scarfClampRecovered < 1,
    "chest-wrap host-fit scale clamp should respond to recovery pressure",
  );
  assert.ok(
    scarfRecoveryOffset[1] <= -0.011 && scarfRecoveryOffset[2] <= -0.0065,
    "chest-wrap recovery offset should drop the assembly lower and farther from the face when detached/host-fit pressure is active",
  );
  assert.ok(
    scarfHostFitOffset[1] <= -0.003 && scarfHostFitOffset[2] <= -0.0045,
    "chest-wrap host-fit offset should keep the wrap below the chin line instead of drifting back toward the face",
  );

  const knotScale = applyHardSurfacePrecisionShapeToScale(
    [0.68, 0.34, 0.28],
    scarfExecution,
    scarfGeometryRecipe,
    "host-fit",
    "knot",
    { silhouetteRole: "secondary", profile: "block", hostFitWeight: 0.9 },
    scarfRepairActions,
  );
  const wrapBandScale = applyHardSurfacePrecisionShapeToScale(
    [0.92, 0.28, 0.2],
    scarfExecution,
    scarfGeometryRecipe,
    "host-fit",
    "wrap-band",
    { silhouetteRole: "primary", profile: "block", hostFitWeight: 0.96 },
    scarfRepairActions,
  );
  assert.ok(
    knotScale[0] > 0.8 &&
      knotScale[1] <= 0.18 &&
      knotScale[1] >= 0.1 &&
      knotScale[2] > 0.34,
    "chest-wrap knot should stay within host-fit depth limits while emerging far enough to read in front of the wrap",
  );
  assert.ok(
    wrapBandScale[0] < 0.78 && wrapBandScale[2] < 0.18,
    "chest-wrap wrap-band should compress during host-fit so it does not dominate as a flat chest bar",
  );

  const scarfCompactVariant = applyHardSurfaceVariantRepresentationOverrides(
    {
      ...scarfGeometryRecipe,
      parts: [
        { partId: "wrap-band", offset: [0, -0.004, 0.008], scale: [0.92, 0.28, 0.2] },
        { partId: "knot", offset: [0, -0.003, 0.001], scale: [0.68, 0.34, 0.28] },
        { partId: "tail-left", offset: [-0.012, -0.002, -0.015], scale: [0.38, 0.2, 0.68] },
        { partId: "tail-right", offset: [0.012, -0.002, -0.015], scale: [0.38, 0.2, 0.68] },
      ],
      readOrderTargets: ["wrap-band", "tail-left", "tail-right"],
    },
    "scarf-knot-compact",
  );
  assert.ok(
    scarfCompactVariant &&
      scarfCompactVariant.profileVariantId === "scarf-knot-compact" &&
      scarfCompactVariant.readOrderTargets?.[0] === "knot" &&
      scarfCompactVariant.structuralBlueprint?.readOrderTargets?.[0] === "knot",
    "scarf compact variant override should switch both geometry and structural blueprint read order to let the knot take first-read pressure before the wrap band",
  );
  const compactWrapBand = scarfCompactVariant?.parts?.find(
    (part: any) => part.partId === "wrap-band",
  );
  const compactKnot = scarfCompactVariant?.parts?.find(
    (part: any) => part.partId === "knot",
  );
  const compactTailLeft = scarfCompactVariant?.parts?.find(
    (part: any) => part.partId === "tail-left",
  );
  assert.ok(
    compactWrapBand?.scale?.[0] < 0.9 &&
      compactKnot?.scale?.[2] > 0.3 &&
      compactTailLeft?.offset?.[0] > -0.01,
    "scarf compact variant override should compress the wrap, push the knot forward, and pull tails inward",
  );
  assert.ok(
    scarfCompactVariant?.partImportanceWeights?.["wrap-band"] < scarfCompactVariant?.partImportanceWeights?.knot,
    "scarf compact variant override should down-rank the wrap-band relative to the knot so readability repair does not keep promoting a flat chest bar",
  );
  assert.equal(
    scarfCompactVariant?.representationMode,
    "profile-relief-2_5d",
    "scarf compact variant override should promote the representation mode into profile relief so the outline compiler can actually reshape the chest silhouette",
  );
  assert.equal(
    scarfCompactVariant?.structuralBlueprint?.dominantSpanOwner,
    "knot",
    "scarf compact variant override should hand the dominant span owner to the knot so rebuild pressure stops promoting the wrap-band chest bar",
  );
  assert.deepEqual(
    buildFallbackReadOrderTargets(
      { ...scarfExecution, readOrderTargets: ["wrap-band", "tail-left", "tail-right"] },
      scarfCompactVariant,
    ),
    ["knot", "wrap-band", "tail-left"],
    "active compact geometry read order should override stale execution read order after a variant switch and hand first-read pressure to the knot",
  );
  const scarfReadabilityPolicy = getHardSurfaceReadabilityMaterialPolicy(
    scarfExecution,
    scarfCompactVariant,
  );
  const scarfCritiqueLighting = getHardSurfaceCritiqueLightingProfile(
    scarfExecution,
    scarfCompactVariant,
  );
  assert.ok(
    scarfReadabilityPolicy?.featureContrastFloor >= 0.28 &&
      scarfReadabilityPolicy?.preferLighterFeatures === true,
    "chest-wrap compact variants should expose their readability material policy so render-driven color repair can actually increase knot/edge contrast",
  );
  assert.ok(
    scarfCritiqueLighting?.accessoryExposure > scarfCritiqueLighting?.hostExposure,
    "chest-wrap compact variants should expose critique lighting so the accessory is lit ahead of the host chest plane",
  );
  const chestWrapCompactBootstrap = buildCapabilityEscalationBootstrapRepairActions(
    {
      ...scarfExecution,
      variantId: "scarf-knot-compact",
    },
    {
      ...scarfGeometryRecipe,
      variantId: "scarf-knot-compact",
    },
    {
      visualCritiqueReport: {
        controllerFailureLayer: "stagnation",
        controllerDirective: "escalate-capability",
        stagnationDetected: true,
        canonicalFlattenedPartIds: ["wrap-band"],
        canonicalDetachedPartIds: ["tail-left", "tail-right"],
      },
    },
    "scarf-knot-compact",
  );
  const scarfCompactRerouted = applyHardSurfaceVariantRepresentationOverrides(
    {
      ...scarfGeometryRecipe,
      parts: [
        { partId: "wrap-band", offset: [0, -0.004, 0.008], scale: [0.92, 0.28, 0.2] },
        { partId: "knot", offset: [0, -0.003, 0.001], scale: [0.68, 0.34, 0.28] },
        { partId: "tail-left", offset: [-0.012, -0.002, -0.015], scale: [0.38, 0.2, 0.68] },
        { partId: "tail-right", offset: [0.012, -0.002, -0.015], scale: [0.38, 0.2, 0.68] },
      ],
      readOrderTargets: ["wrap-band", "tail-left", "tail-right"],
    },
    "scarf-knot-compact",
    {
      execution: {
        ...scarfExecution,
        variantId: "scarf-knot-compact",
      },
      repairActions: chestWrapCompactBootstrap,
    },
  );
  const compactWrapSpanTarget = scarfCompactVariant?.structuralBlueprint?.partSpanTargets?.find(
    (entry: any) => entry.partId === "wrap-band",
  );
  const reroutedWrapSpanTarget =
    scarfCompactRerouted?.structuralBlueprint?.partSpanTargets?.find(
      (entry: any) => entry.partId === "wrap-band",
    );
  const compactTailSpanTarget = scarfCompactVariant?.structuralBlueprint?.partSpanTargets?.find(
    (entry: any) => entry.partId === "tail-left",
  );
  const reroutedTailSpanTarget =
    scarfCompactRerouted?.structuralBlueprint?.partSpanTargets?.find(
      (entry: any) => entry.partId === "tail-left",
    );
  assert.ok(
    scarfCompactRerouted?.capabilityRerouteId === "chest-wrap-compact-knot-tail-front" &&
      scarfCompactRerouted?.profileVariantId === "scarf-profile-compact-knot-tail-front",
    "stagnation-triggered chest-wrap compact reroute should keep the same variant id but switch into an alternate compact trait profile",
  );
  assert.deepEqual(
    buildFallbackReadOrderTargets(
      { ...scarfExecution, readOrderTargets: ["wrap-band", "tail-left", "tail-right"] },
      scarfCompactRerouted,
    ),
    ["knot", "tail-left", "tail-right", "wrap-band"],
    "stagnation-triggered chest-wrap compact reroute should promote a knot-plus-tail read order instead of returning to wrap-band-first pressure",
  );
  assert.ok(
    reroutedWrapSpanTarget?.maxShare < compactWrapSpanTarget?.maxShare &&
      reroutedTailSpanTarget?.minShare > compactTailSpanTarget?.minShare,
    "stagnation-triggered chest-wrap compact reroute should shrink wrap-band span ownership and hand more silhouette budget to the tails",
  );
  assert.equal(
    scarfCompactRerouted?.runtimeDesignContract?.primaryReadTarget,
    "knot",
    "stagnation-triggered chest-wrap compact reroute should sync the runtime design contract to the new first-read target",
  );
  const scarfOutlineCompiled = applyHardSurfaceOutlineCompiler(
    [
      { partId: "wrap-band", scale: [0.92, 0.28, 0.2], localOffset: [0, -0.004, 0.008] },
      { partId: "knot", scale: [0.68, 0.34, 0.28], localOffset: [0, -0.003, 0.001] },
      { partId: "tail-left", scale: [0.38, 0.2, 0.68], localOffset: [-0.012, -0.002, -0.015] },
      { partId: "tail-right", scale: [0.38, 0.2, 0.68], localOffset: [0.012, -0.002, -0.015] },
      { partId: "tail-fold-left", scale: [0.2, 0.16, 0.4], localOffset: [-0.004, -0.002, -0.012] },
      { partId: "tail-fold-right", scale: [0.2, 0.16, 0.4], localOffset: [0.004, -0.002, -0.012] },
    ],
    scarfExecution,
    scarfCompactVariant,
    "render-driven-rebuild",
    scarfRepairActions,
  );
  const compiledWrapBand = scarfOutlineCompiled.partBlueprintBases.find(
    (part: any) => part.partId === "wrap-band",
  );
  const compiledKnot = scarfOutlineCompiled.partBlueprintBases.find(
    (part: any) => part.partId === "knot",
  );
  const compiledTailLeft = scarfOutlineCompiled.partBlueprintBases.find(
    (part: any) => part.partId === "tail-left",
  );
  assert.equal(
    scarfOutlineCompiled.outlineProjectionVariantId,
    "scarf-knot-compact",
    "chest-wrap outline compiler should keep the compact outline projection variant active after the recovery switch",
  );
  assert.ok(
    compiledWrapBand?.scale?.[0] < 0.7 &&
      compiledWrapBand?.scale?.[2] < 0.12 &&
      compiledKnot?.scale?.[2] > 0.4 &&
      compiledKnot?.localOffset?.[2] < 0 &&
      compiledTailLeft?.localOffset?.[0] < -0.009 &&
      compiledTailLeft?.localOffset?.[1] < -0.0024 &&
      compiledTailLeft?.localOffset?.[2] < -0.012,
    "chest-wrap outline compiler should keep the compact wrap shallow, preserve a forward-readable knot, and spread the tails outward/downward without reintroducing the deep chest-bar slab",
  );
  const scarfCompactEnvelopeClamp = applyChestWrapCompactEnvelopeClamp(
    [
      {
        partId: "wrap-band",
        size: 0.02,
        location: [0, -0.004, 0.001],
        localOffset: [0, -0.004, 0.001],
        scale: [0.17, 0.098, 0.019],
      },
      {
        partId: "knot",
        parentPartId: "wrap-band",
        size: 0.02,
        location: [0, 0.001, -0.012],
        localOffset: [0, 0.005, -0.013],
        scale: [2.58, 0.85, 2.324],
      },
      {
        partId: "tail-left",
        parentPartId: "knot",
        size: 0.02,
        location: [-0.003, 0.003, -0.033],
        localOffset: [-0.003, 0.002, -0.021],
        scale: [0.238, 0.233, 1.52],
      },
      {
        partId: "tail-right",
        parentPartId: "knot",
        size: 0.02,
        location: [0.003, 0.003, -0.033],
        localOffset: [0.003, 0.002, -0.021],
        scale: [0.238, 0.233, 1.52],
      },
    ],
    scarfExecution,
    scarfCompactVariant,
    "final-review",
    scarfRepairActions,
    {
      edges: [
        {
          parentPartId: "wrap-band",
          childPartId: "knot",
          localOffset: [0, 0.0034, -0.0134],
          allowedDrift: 0.0032,
          mountFace: "center",
          spanOwnership: "secondary",
          flushMount: true,
        },
        {
          parentPartId: "knot",
          childPartId: "tail-left",
          localOffset: [-0.0068, -0.0008, -0.0154],
          allowedDrift: 0.0038,
          mountFace: "bottom-left",
          spanOwnership: "secondary",
        },
        {
          parentPartId: "knot",
          childPartId: "tail-right",
          localOffset: [0.0068, -0.0008, -0.0154],
          allowedDrift: 0.0038,
          mountFace: "bottom-right",
          spanOwnership: "secondary",
        },
      ],
    },
  );
  const clampedKnot = scarfCompactEnvelopeClamp.partBlueprints.find(
    (part: any) => part.partId === "knot",
  );
  const clampedWrapBand = scarfCompactEnvelopeClamp.partBlueprints.find(
    (part: any) => part.partId === "wrap-band",
  );
  const compactTargetSpan = Array.isArray(scarfCompactEnvelopeClamp.targetSpan)
    ? scarfCompactEnvelopeClamp.targetSpan
    : null;
  assert.equal(
    scarfCompactEnvelopeClamp.clampApplied,
    true,
    "chest-wrap compact envelope clamp should activate when late-stage knot/tail growth blows past the host chest envelope",
  );
  assert.ok(
    Array.isArray(scarfCompactEnvelopeClamp.spanBefore) &&
      Array.isArray(scarfCompactEnvelopeClamp.spanAfter) &&
      Array.isArray(compactTargetSpan) &&
      scarfCompactEnvelopeClamp.spanAfter[0] <= compactTargetSpan[0] * 1.08 &&
      scarfCompactEnvelopeClamp.spanAfter[1] <= compactTargetSpan[1] * 1.1 &&
      scarfCompactEnvelopeClamp.spanAfter[2] < scarfCompactEnvelopeClamp.spanBefore[2] * 0.4,
    "chest-wrap compact envelope clamp should pull the final assembly sharply back toward the chest envelope instead of letting late-stage boosts keep expanding outward",
  );
  assert.ok(
    scarfCompactEnvelopeClamp.spanAfter[0] < scarfCompactEnvelopeClamp.spanBefore[0] &&
      scarfCompactEnvelopeClamp.spanAfter[2] < scarfCompactEnvelopeClamp.spanBefore[2],
    "chest-wrap compact envelope clamp should shrink the width and drop span that were previously blowing past the chest envelope",
  );
  assert.ok(
    clampedKnot?.scale?.[0] < 2.58 &&
      clampedKnot?.scale?.[2] < 2.324 &&
      clampedKnot?.localOffset?.[2] < -0.01 &&
      clampedWrapBand?.scale?.[0] > 0.1,
    "chest-wrap compact envelope clamp should cut the knot's late-stage overgrowth without collapsing the wrap-band into invisibility or pulling the knot off its rooted attachment depth",
  );
  assert.equal(
    getPreferredRecoveryVariantId(
      scarfExecution,
      {
        ...scarfGeometryRecipe,
        variantCandidates: [
          { variantId: "scarf-wrap-forward" },
          { variantId: "scarf-knot-compact" },
        ],
      },
      "scarf-wrap-forward",
      {
        visualCritiqueReport: {
        dominantFailureLayer: "render-readability",
        dominantSpanOwner: "wrap-band",
        finalReadOrder: ["wrap-band", "tail-left", "tail-right"],
        flattenedPartIds: ["wrap-band", "tail-left"],
        },
      },
    ),
    "scarf-knot-compact",
    "chest-wrap recovery should switch to compact when wrap-forward still collapses into a chest bar and the knot never enters the leading read order",
  );
  assert.equal(
    getPreferredRecoveryVariantId(
      scarfExecution,
      {
        ...scarfGeometryRecipe,
        variantCandidates: [
          { variantId: "scarf-wrap-forward" },
          { variantId: "scarf-knot-compact" },
        ],
      },
      "scarf-wrap-forward",
      {
        visualCritiqueReport: {
          dominantFailureLayer: "render-readability",
          dominantSpanOwner: "wrap-band",
          finalReadOrder: ["wrap-band", "tail-left", "tail-right"],
          flattenedPartIds: ["wrap-band"],
          renderNounFidelity: 0.76,
          silhouetteReadability: 0.21,
          repeatedFailureCount: 1,
          visualVeto: true,
          variantSwitchRecommended: false,
        },
      },
    ),
    null,
    "chest-wrap recovery should not bail out of a still-improving wrap-forward scaffold before the readability stall has actually repeated or collapsed below the compact-trigger threshold",
  );

  console.log("[hard-surface-runtime-policy] all cases passed");
}

main();

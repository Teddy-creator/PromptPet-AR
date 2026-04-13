import type {
  PromptSemanticContractV2,
  PrototypeCandidate,
  RetrievedPrototypeMatch,
  SemanticTrait,
} from "../types/prototype-traits";
import type {
  RuntimeCapability,
  RuntimeCapabilityBundle,
  RuntimeDesignContract,
} from "../types/runtime-capabilities";
import type {
  LlmRequestConfig,
  PersistedLlmRequestConfig,
} from "./llm/provider-types";
import type {
  VisionCritiquePolicy,
  VisionCritiqueSource,
  VisionCritiqueTransport,
} from "./llm/vision-critique-contract";

export const styleTemplates = [
  "cream-toy",
  "low-poly",
  "dream-glow",
] as const;

export type StyleTemplate = (typeof styleTemplates)[number];

export const generationModes = [
  "fast-stable",
  "dynamic-custom",
] as const;

export type GenerationMode = (typeof generationModes)[number];

export const customizationProfiles = [
  "safe-overlay",
  "experimental-addon",
] as const;

export type CustomizationProfile = (typeof customizationProfiles)[number];

export const generationStatuses = [
  "queued",
  "rendering",
  "exporting",
  "ready",
  "failed",
] as const;

export type GenerationStatus = (typeof generationStatuses)[number];

export const generatorAdapterKeys = ["mock", "blender-mcp"] as const;

export type GeneratorAdapterKey = (typeof generatorAdapterKeys)[number];

export type GenerationLlmConfig = LlmRequestConfig;
export type PersistedGenerationLlmConfig = PersistedLlmRequestConfig;
export type PromptCustomizationRuntimeCapability = RuntimeCapability;
export type PromptCustomizationRuntimeCapabilityBundle = RuntimeCapabilityBundle;
export type PromptCustomizationRuntimeDesignContract = RuntimeDesignContract;

export type CustomizationParserSource = "openai" | "deepseek" | "rule-fallback";

export type PromptCustomizationColorSlot =
  | "bodyColor"
  | "detailColor"
  | "accentColor"
  | "glowColor"
  | "accessoryColor";

export type PromptCustomizationColorOverride = {
  slot: PromptCustomizationColorSlot;
  label: string;
  hex: string;
  sourceText: string;
  requestedText?: string;
  resolutionSource?: "preset" | "direct-value" | "named-semantic" | "ai-approximation";
  approximationReason?: string;
};

export type PromptCustomizationLocalTweak = {
  label: string;
  level: string;
  factor: number;
  supported: boolean;
  sourceText?: string;
};

export type PromptCustomizationAccessoryAnchor =
  | "left-ear"
  | "right-ear"
  | "forehead"
  | "head-top"
  | "back-head"
  | "chest"
  | "chest-center"
  | "chest-left"
  | "chest-right"
  | "tail-top"
  | "tail-left"
  | "tail-right"
  | "tail-base";

export type PromptCustomizationAnchorResolutionSource =
  | "explicit-match"
  | "curve-mapped"
  | "stable-fallback"
  | "approximate";

export type PromptCustomizationFamilyResolutionSource =
  | "known-family"
  | "open-noun"
  | "suffix-fallback"
  | "openai";

export type PromptCustomizationAccessoryFamily =
  | "bell"
  | "scarf"
  | "flower"
  | "clover-charm"
  | "crown"
  | "tag"
  | "tie"
  | "badge"
  | "bow"
  | "pendant"
  | "necklace-chain"
  | "earring-hoop"
  | "pendant-charm"
  | "star"
  | "cloud"
  | "leaf"
  | "forest"
  | "mushroom"
  | "dessert"
  | "candy"
  | "dessert-hang"
  | "charm-token"
  | "fish-charm"
  | "berry-charm"
  | "cloud-charm"
  | "candle-charm"
  | "key-charm"
  | "feather-charm"
  | "open-botanical-ornament"
  | "open-symbol-ornament"
  | "generic-animal-charm"
  | "generic-food-charm"
  | "generic-ornament";

export type PromptCustomizationAccessoryExecutionMode =
  | "theme-default"
  | "stable-replace"
  | "stable-add"
  | "runtime-generated"
  | "approximate-fallback"
  | "remove-default"
  | "deferred";

export type PromptCustomizationGeneratedAccessoryKind =
  | "tie"
  | "badge"
  | "bow"
  | "pendant"
  | "necklace-chain"
  | "earring-hoop"
  | "pendant-charm"
  | "flower"
  | "clover-charm"
  | "star"
  | "cloud"
  | "leaf"
  | "forest"
  | "mushroom"
  | "dessert"
  | "candy"
  | "dessert-hang"
  | "charm-token"
  | "fish-charm"
  | "berry-charm"
  | "cloud-charm"
  | "candle-charm"
  | "key-charm"
  | "feather-charm"
  | "open-botanical-ornament"
  | "open-symbol-ornament"
  | "generic-animal-charm"
  | "generic-food-charm"
  | "generic-ornament";

export type PromptCustomizationCreationSource =
  | "runtime-designed"
  | "runtime-generated"
  | "runtime-repaired"
  | "runtime-composed"
  | "stable-reuse"
  | "stable-reference-only"
  | "approximate-fallback"
  | "unfulfilled";

export type PromptCustomizationExecutionStatus =
  | "implemented"
  | "approximated"
  | "unfulfilled";

export type PromptCustomizationAccessoryInstance = {
  instanceId: string;
  anchor: PromptCustomizationAccessoryAnchor;
  ordinal: number;
  required: boolean;
  colorIntent?: PromptCustomizationColorOverride;
};

export type PromptCustomizationAccessorySemanticClass =
  | "stable-accessory"
  | "tie"
  | "badge"
  | "bow"
  | "pendant"
  | "bell"
  | "flower"
  | "clover-charm"
  | "star"
  | "cloud-charm"
  | "leaf"
  | "forest"
  | "mushroom"
  | "dessert"
  | "candy"
  | "dessert-hang"
  | "necklace-chain"
  | "earring-hoop"
  | "pendant-charm"
  | "fish-charm"
  | "berry-charm"
  | "candle-charm"
  | "key-charm"
  | "feather-charm"
  | "open-botanical-ornament"
  | "open-symbol-ornament"
  | "generic-animal-charm"
  | "generic-food-charm"
  | "generic-ornament";

export type PromptCustomizationRuntimeDesignSource =
  | "rule-compiler"
  | "ai-planner"
  | "hybrid";

export type PromptCustomizationDesignArchetype =
  | "known-family"
  | "device-charm"
  | "vehicle-charm"
  | "tool-charm"
  | "botanical-charm"
  | "symbol-charm"
  | "creature-charm"
  | "food-charm"
  | "generic-ornament";

export type PromptCustomizationNounFidelityStatus =
  | "passed"
  | "approximated"
  | "missing";

export type PromptCustomizationStopReason =
  | "quality-accepted"
  | "budget-exhausted"
  | "quality-plateau"
  | "hard-check-failed"
  | "partial-approximation";

export type PromptCustomizationStopDecision =
  | "accepted"
  | "approximate"
  | "failed";

export type PromptCustomizationStopFailureLayer =
  | PromptCustomizationFailureLayer
  | "topology"
  | "composition"
  | "stagnation";

export type PromptCustomizationStopControllerDirective =
  | "micro-tune"
  | "re-run-host-fit"
  | "rebuild-assembly"
  | "rebuild-geometry-contract"
  | "escalate-capability";

export type PromptCustomizationStopBlockingGate =
  | "hard-gate"
  | "quality-gate"
  | "precision-gate"
  | "visual-acceptance"
  | "planner-contract"
  | "legacy-fallback"
  | "render-critique"
  | "budget";

export type PromptCustomizationStopDiagnostics = {
  reason: PromptCustomizationStopReason;
  decision: PromptCustomizationStopDecision;
  blockingGates: PromptCustomizationStopBlockingGate[];
  dominantFailureModes: string[];
  plannerBlockedExecutionCount: number;
  legacyFallbackBlockedExecutionCount: number;
  renderCritiqueUnavailableExecutionCount: number;
  renderCritiqueTimeoutExecutionCount: number;
  acceptedExecutionCount: number;
  approximatedExecutionCount: number;
  unfulfilledExecutionCount: number;
  passCount: number;
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
  dominantFailureLayer?: PromptCustomizationStopFailureLayer;
  repeatedFailureCount?: number;
  stagnationDetected?: boolean;
  controllerFailureLayer?: PromptCustomizationStopFailureLayer;
  controllerDirective?: PromptCustomizationStopControllerDirective;
  summary: string;
};

export type PromptCustomizationQualityMetrics = {
  shapeReadability: number;
  visualReadability: number;
  anchorAccuracy: number;
  colorIsolation: number;
  occlusionRisk: number;
  scaleFit: number;
  hostComposition: number;
  silhouetteStrength: number;
  lookalikeRisk: number;
  nounFidelity: number;
  criticalPartsPresent: number;
  archetypeMatch: number;
  cohesionScore: number;
};

export type PromptCustomizationPrecisionReport = {
  precisionGatePassed: boolean;
  precisionReady: boolean;
  dominantFailureModes: string[];
};

export type PromptCustomizationObjectCategory =
  | "device"
  | "vehicle"
  | "tool"
  | "botanical"
  | "symbol"
  | "creature"
  | "food"
  | "ornament";

export type PromptCustomizationRepairActionType =
  | "insert-missing-part"
  | "split-merged-part"
  | "reshape-silhouette"
  | "rebalance-part-ratio"
  | "re-anchor"
  | "re-orient"
  | "re-materialize-color-zone"
  | "tighten-cohesion"
  | "re-parent-part"
  | "rebuild-from-root"
  | "promote-critical-part";

export type PromptCustomizationRuntimeShapeClass =
  | PromptCustomizationAccessoryFamily
  | "known-family"
  | "camera-charm"
  | "boat-charm"
  | "rocket-charm"
  | "device-generic-charm"
  | "vehicle-generic-charm";

export type PromptCustomizationReferenceSourceMode =
  | "cached-reference"
  | "cached-3d-asset"
  | "canonical-blueprint"
  | "legacy-fallback";

export type PromptCustomizationReferenceSourceKind =
  | "three-view"
  | "multi-view"
  | "silhouette-only";

export type PromptCustomizationHardSurfaceBlueprintFamily =
  | "hard-surface-device"
  | "hard-surface-vehicle";

export type PromptCustomizationCanonicalBlueprintFamily =
  | PromptCustomizationHardSurfaceBlueprintFamily
  | "canonical-creature"
  | "canonical-botanical"
  | "canonical-symbol"
  | "canonical-food"
  | "canonical-ornament";

export type PromptCustomizationDepthProfile =
  | "balanced"
  | "front-loaded"
  | "rear-loaded"
  | "thin-slab"
  | "deep-body";

export type PromptCustomizationRepresentationMode =
  | "primitive-parts"
  | "profile-relief-2_5d";

export type PromptCustomizationRepresentationFailureKind =
  | "generic-flat-token"
  | "generic-rect-plate"
  | "detached-assembly"
  | "host-intrusion"
  | "low-contrast-unreadable";

export type PromptCustomizationAnchorProjectionFailureKind =
  | "face-intrusion"
  | "floating-off-ear"
  | "readability-on-plane";

export type PromptCustomizationOutlineCompilerMode =
  | "device-front-facing"
  | "vehicle-upright-outline"
  | "generic-profile-relief";

export type PromptCustomizationReadabilityFailureKind =
  | "too-dim"
  | "low-contrast"
  | "too-small-to-read";

export type PromptCustomizationAttachmentFailureKind =
  | "detached-critical-part"
  | "floating-relief"
  | "weak-rooting";

export type PromptCustomizationReadabilityMaterialPolicy = {
  bodyLift: number;
  detailLift: number;
  accentLift: number;
  accentShadow: number;
  featureContrastFloor: number;
  preferLighterFeatures?: boolean;
};

export type PromptCustomizationCritiqueLightingProfile = {
  accessoryExposure: number;
  accessoryGamma: number;
  hostExposure: number;
  hostGamma: number;
};

export type PromptCustomizationFamilyPolicyId =
  | "hard-surface-device"
  | "hard-surface-boat"
  | "hard-surface-vehicle";

export type PromptCustomizationBlueprintVariant = {
  variantId: string;
  label: string;
  silhouetteIntent: string;
  readOrderHints: string[];
  negativeLookalikes: string[];
  preferredForRuntimeShapeClass?: PromptCustomizationRuntimeShapeClass;
  representationMode?: PromptCustomizationRepresentationMode;
  familyPolicyId?: PromptCustomizationFamilyPolicyId;
  dominantContour?: string;
  sideDepthProfile?: PromptCustomizationDepthProfile;
  partSpanTargets?: PromptCustomizationPartSpanTarget[];
  partDepthTargets?: PromptCustomizationPartDepthTarget[];
  attachmentAnchors?: PromptCustomizationAttachmentAnchor[];
  silhouetteKeepouts?: PromptCustomizationSilhouetteKeepout[];
  dominantSpanOwner?: string;
  outlineProfile?: string;
  reliefFeatureLayout?: string[];
  attachmentMask?: string;
  profileVariantId?: string;
  readabilityMaterialPolicy?: PromptCustomizationReadabilityMaterialPolicy;
  critiqueLightingProfile?: PromptCustomizationCritiqueLightingProfile;
  deviceMinReadableSpan?: number;
  boatMinReadableSpan?: number;
  reliefFlushDepth?: number;
  attachmentCohesionBudget?: number;
  outlineCompilerMode?: PromptCustomizationOutlineCompilerMode;
  outlineProjectionVariantId?: string;
};

export type PromptCustomizationReferenceAssetRecord = {
  referenceId: string;
  requestedNoun: string;
  normalizedNoun: string;
  objectCategory: PromptCustomizationObjectCategory;
  imagePaths: string[];
  sourceKind: PromptCustomizationReferenceSourceKind;
  referenceConfidence: number;
  blueprintFamily: PromptCustomizationCanonicalBlueprintFamily;
  representationMode?: PromptCustomizationRepresentationMode;
  familyPolicyId?: PromptCustomizationFamilyPolicyId;
  matchTokens: string[];
};

export type PromptCustomizationReferenceDerivedBlueprint = {
  referenceId: string;
  requestedNoun: string;
  blueprintFamily: PromptCustomizationCanonicalBlueprintFamily;
  representationMode?: PromptCustomizationRepresentationMode;
  familyPolicyId?: PromptCustomizationFamilyPolicyId;
  dominantSilhouette: string;
  criticalParts: string[];
  readOrderTargets: string[];
  depthProfile: PromptCustomizationDepthProfile;
  attachmentPose: string;
  negativeLookalikes: string[];
  variantCandidates: PromptCustomizationBlueprintVariant[];
  sourceKind: PromptCustomizationReferenceSourceKind;
  dominantContour?: string;
  sideDepthProfile?: PromptCustomizationDepthProfile;
  partSpanTargets?: PromptCustomizationPartSpanTarget[];
  partDepthTargets?: PromptCustomizationPartDepthTarget[];
  attachmentAnchors?: PromptCustomizationAttachmentAnchor[];
  silhouetteKeepouts?: PromptCustomizationSilhouetteKeepout[];
  dominantSpanOwner?: string;
  outlineProfile?: string;
  reliefFeatureLayout?: string[];
  attachmentMask?: string;
  profileVariantId?: string;
  readabilityMaterialPolicy?: PromptCustomizationReadabilityMaterialPolicy;
  critiqueLightingProfile?: PromptCustomizationCritiqueLightingProfile;
  deviceMinReadableSpan?: number;
  boatMinReadableSpan?: number;
  reliefFlushDepth?: number;
  attachmentCohesionBudget?: number;
  outlineCompilerMode?: PromptCustomizationOutlineCompilerMode;
  outlineProjectionVariantId?: string;
};

export type PromptCustomizationPrimarySilhouette =
  | "compact-device"
  | "longitudinal-hull"
  | "rocket-spine"
  | "fish-body"
  | "botanical-bloom"
  | "symbol-badge"
  | "tool-handle"
  | "generic-ornament";

export type PromptCustomizationSymmetryPolicy =
  | "inherit-recipe"
  | "strict-bilateral"
  | "soft-bilateral"
  | "radial"
  | "none";

export type PromptCustomizationDeformationPolicy =
  | "preserve-blocking"
  | "front-protrusion"
  | "supported-upright"
  | "tail-emphasis"
  | "soft-bloom"
  | "host-clearance"
  | "span-separation";

export type PromptCustomizationPartSilhouetteRole =
  | "primary"
  | "secondary"
  | "support"
  | "attachment";

export type PromptCustomizationSilhouetteTemplate =
  | "camera-front-lens"
  | "boat-hull-mast-sail"
  | "fish-body-tail"
  | "rocket-body-fin"
  | "device-screen-face"
  | "five-point-star"
  | "generic-ornament";

export type PromptCustomizationRefinementStage =
  | "blocking"
  | "silhouette-forming"
  | "assembly-rooting"
  | "host-fit"
  | "render-driven-rebuild"
  | "final-review";

export type PromptCustomizationFailureLayer =
  | "silhouette"
  | "assembly"
  | "host-fit"
  | "render-readability"
  | "anchor-projection"
  | "outline-compiler"
  | "attachment-cohesion"
  | "critique-timeout";

export type PromptCustomizationSilhouetteBlock = {
  blockId: string;
  ownerPartId?: string;
  semanticRole:
    | "root-mass"
    | "front-protrusion"
    | "top-cluster"
    | "support-stem"
    | "sail-plane"
    | "attachment-loop"
    | "generic";
  profile:
    | "body-mass"
    | "front-bulge"
    | "top-ridge"
    | "upright-stem"
    | "tri-plane"
    | "loop"
    | "generic";
  stage: PromptCustomizationRefinementStage;
  spanPriority: number;
  depthPriority: number;
};

export type PromptCustomizationAssemblySegment = {
  segmentId: string;
  ownerPartId?: string;
  parentSegmentId?: string;
  relation:
    | "rooted-mass"
    | "front-mounted"
    | "top-mounted"
    | "supported-upright"
    | "free-hang"
    | "bridged";
  stage: PromptCustomizationRefinementStage;
  continuityWeight: number;
};

export type PromptCustomizationMountStrategy =
  | "ear-side-top-hook"
  | "ear-side-drop"
  | "ear-side-front-facing"
  | "chest-forward"
  | "tail-follow"
  | "generic-runtime";

export type PromptCustomizationHostFitEnvelope = {
  anchorEnvelope: [number, number, number];
  maxSpan: [number, number, number];
  preferredYaw?: number;
  screenFacingBias?: number;
  faceIntrusionBudget?: number;
  eyeKeepout?: boolean;
  earClearance?: number;
};

export type PromptCustomizationPartSpanTarget = {
  partId: string;
  minShare: number;
  maxShare: number;
};

export type PromptCustomizationPartDepthTarget = {
  partId: string;
  minDepth: number;
  maxDepth: number;
};

export type PromptCustomizationAttachmentAnchor = {
  anchorId: string;
  partId: string;
  parentPartId?: string;
  mountFace: string;
  preferredOffset?: [number, number, number];
  flushMount?: boolean;
  embedDepth?: number;
};

export type PromptCustomizationFaceKeepoutZone = {
  zoneId: string;
  label: string;
  severity: "hard" | "soft";
};

export type PromptCustomizationSilhouetteKeepout = {
  keepoutId: string;
  partId?: string;
  behavior:
    | "subordinate"
    | "keep-within-root"
    | "avoid-face-outline"
    | "rooted-only";
  severity: "hard" | "soft";
};

export type PromptCustomizationAssemblyTensionProfile = {
  cohesionBias: number;
  attachmentCredibilityBias: number;
  rebuildPriority: number;
};

export type PromptCustomizationAttachmentConstraint =
  | "flush-mount"
  | "embedded-front"
  | "supported-branch"
  | "free-hang"
  | "side-balance"
  | "rooted-span";

export type PromptCustomizationOrientationConstraint =
  | "inherit"
  | "front-facing"
  | "upright"
  | "follow-parent"
  | "host-tangent";

export type PromptCustomizationPartProfile = {
  partId: string;
  profile:
    | "block"
    | "lens"
    | "top-cap"
    | "mast"
    | "sail"
    | "hull"
    | "body"
    | "tail"
    | "fin"
    | "ring"
    | "nose"
    | "tool-head"
    | "tool-handle"
    | "generic";
  silhouetteRole: PromptCustomizationPartSilhouetteRole;
  spanBias?: number;
  depthBias?: number;
  hostFitWeight?: number;
};

export type PromptCustomizationAttachmentRule = {
  partId: string;
  parentPartId?: string;
  mountFace: string;
  edgeConstraint: PromptCustomizationAttachmentConstraint;
  orientationConstraint: PromptCustomizationOrientationConstraint;
  allowedDrift: number;
  flushMount?: boolean;
  embedDepth?: number;
  spanOwnership: PromptCustomizationPartSilhouetteRole;
  supportDependency?: string;
};

export type PromptCustomizationStructuralBlueprint = {
  blueprintId: string;
  requestedNoun?: string;
  runtimeShapeClass?: PromptCustomizationRuntimeShapeClass;
  sourceMode?: PromptCustomizationReferenceSourceMode;
  referenceConfidence?: number;
  referenceId?: string;
  referenceSourceKind?: PromptCustomizationReferenceSourceKind;
  blueprintFamily?: PromptCustomizationCanonicalBlueprintFamily;
  representationMode?: PromptCustomizationRepresentationMode;
  familyPolicyId?: PromptCustomizationFamilyPolicyId;
  capabilityBundle?: PromptCustomizationRuntimeCapabilityBundle;
  runtimeDesignContract?: PromptCustomizationRuntimeDesignContract;
  variantCandidates?: PromptCustomizationBlueprintVariant[];
  primarySilhouette: PromptCustomizationPrimarySilhouette;
  silhouetteTemplate?: PromptCustomizationSilhouetteTemplate;
  silhouetteBlocks?: PromptCustomizationSilhouetteBlock[];
  assemblySegments?: PromptCustomizationAssemblySegment[];
  mountStrategy?: PromptCustomizationMountStrategy;
  readOrderTargets?: string[];
  criticalViewGoals?: string[];
  hostFitEnvelope?: PromptCustomizationHostFitEnvelope;
  partSpanTargets?: PromptCustomizationPartSpanTarget[];
  partDepthTargets?: PromptCustomizationPartDepthTarget[];
  attachmentAnchors?: PromptCustomizationAttachmentAnchor[];
  faceKeepoutZones?: PromptCustomizationFaceKeepoutZone[];
  silhouetteKeepouts?: PromptCustomizationSilhouetteKeepout[];
  assemblyTensionProfile?: PromptCustomizationAssemblyTensionProfile;
  dominantContour?: string;
  sideDepthProfile?: PromptCustomizationDepthProfile;
  dominantSpanOwner?: string;
  outlineProfile?: string;
  reliefFeatureLayout?: string[];
  attachmentMask?: string;
  profileVariantId?: string;
  readabilityMaterialPolicy?: PromptCustomizationReadabilityMaterialPolicy;
  critiqueLightingProfile?: PromptCustomizationCritiqueLightingProfile;
  deviceMinReadableSpan?: number;
  boatMinReadableSpan?: number;
  reliefFlushDepth?: number;
  attachmentCohesionBudget?: number;
  outlineCompilerMode?: PromptCustomizationOutlineCompilerMode;
  outlineProjectionVariantId?: string;
  partProfiles: PromptCustomizationPartProfile[];
  attachmentRules: PromptCustomizationAttachmentRule[];
  partImportanceWeights: Record<string, number>;
  symmetryPolicy: PromptCustomizationSymmetryPolicy;
  deformationPolicy: PromptCustomizationDeformationPolicy[];
};

export type PromptCustomizationRepairAction = {
  actionType: PromptCustomizationRepairActionType;
  reason: string;
  source: "structural" | "visual" | "hybrid";
  targetPartIds?: string[];
  targetRoles?: string[];
  intensity?: number;
};

export type PromptCustomizationReferencePack = {
  sourceMode: PromptCustomizationReferenceSourceMode;
  referenceId?: string;
  referenceSourceKind?: PromptCustomizationReferenceSourceKind;
  blueprintFamily?: PromptCustomizationCanonicalBlueprintFamily;
  variantCandidates?: PromptCustomizationBlueprintVariant[];
  referenceConfidence?: number;
};

export type PromptCustomizationCompilerIntent = {
  mountStrategy?: PromptCustomizationMountStrategy;
  readOrderTargets?: string[];
  criticalViewGoals?: string[];
  deformationPolicy?: PromptCustomizationDeformationPolicy[];
};

export type PromptCustomizationNounDesignBrief = {
  briefId: string;
  taskId: string;
  requestId: string;
  requestedNoun: string;
  nounSpan?: string;
  nounGloss?: string;
  objectCategory?: PromptCustomizationObjectCategory;
  designArchetype: PromptCustomizationDesignArchetype;
  runtimeShapeClass?: PromptCustomizationRuntimeShapeClass;
  designConfidence?: number;
  mustDistinctFromFallback: boolean;
  sourceMode?: PromptCustomizationReferenceSourceMode;
  referenceConfidence?: number;
  referencePack?: PromptCustomizationReferencePack;
  referenceId?: string;
  referenceSourceKind?: PromptCustomizationReferenceSourceKind;
  blueprintFamily?: PromptCustomizationCanonicalBlueprintFamily;
  representationMode?: PromptCustomizationRepresentationMode;
  familyPolicyId?: PromptCustomizationFamilyPolicyId;
  capabilityBundle?: PromptCustomizationRuntimeCapabilityBundle;
  runtimeDesignContract?: PromptCustomizationRuntimeDesignContract;
  variantCandidates?: PromptCustomizationBlueprintVariant[];
  variantId?: string;
  canonicalBlueprint?: PromptCustomizationReferenceDerivedBlueprint;
  referenceDerivedBlueprint?: PromptCustomizationReferenceDerivedBlueprint;
  shapeIntent: string;
  criticalParts: string[];
  optionalParts: string[];
  partGraphIntent: string;
  silhouetteGoals: string[];
  negativeLookalikes: string[];
  repairPriorities: string[];
  hangingStrategy: string;
  assemblyRootPartId?: string;
  attachmentPartId?: string;
  silhouetteBlocks?: PromptCustomizationSilhouetteBlock[];
  assemblySegments?: PromptCustomizationAssemblySegment[];
  mountStrategy?: PromptCustomizationMountStrategy;
  readOrderTargets?: string[];
  criticalViewGoals?: string[];
  compilerIntent?: PromptCustomizationCompilerIntent;
  structuralBlueprint?: PromptCustomizationStructuralBlueprint;
  primarySilhouette?: PromptCustomizationPrimarySilhouette;
  outlineProfile?: string;
  reliefFeatureLayout?: string[];
  attachmentMask?: string;
  profileVariantId?: string;
  partProfiles?: PromptCustomizationPartProfile[];
  attachmentRules?: PromptCustomizationAttachmentRule[];
  partImportanceWeights?: Record<string, number>;
  symmetryPolicy?: PromptCustomizationSymmetryPolicy;
  deformationPolicy?: PromptCustomizationDeformationPolicy[];
  runtimeDesignSource: PromptCustomizationRuntimeDesignSource;
};

export type PromptCustomizationAccessoryPartGraphNode = {
  nodeId: string;
  partId: string;
  semanticLabel: string;
  role: string;
  required: boolean;
  stageIndex: number;
  importance: number;
};

export type PromptCustomizationAccessoryPartGraphEdge = {
  fromNodeId: string;
  toNodeId: string;
  parentPartId?: string;
  childPartId?: string;
  relation:
    | "hangs-from"
    | "attached-to"
    | "mirrors"
    | "balances"
    | "layers-over"
    | "extends-from";
  required: boolean;
  mountFace?: string;
  localOffset?: [number, number, number];
  rotationMode?: "inherit" | "align-parent" | "face-camera" | "fixed";
  maxDrift?: number;
  allowedDrift?: number;
  cohesionWeight?: number;
  edgeConstraint?: PromptCustomizationAttachmentConstraint;
  orientationConstraint?: PromptCustomizationOrientationConstraint;
  flushMount?: boolean;
  embedDepth?: number;
  spanOwnership?: PromptCustomizationPartSilhouetteRole;
  supportDependency?: string;
};

export type PromptCustomizationAccessoryPartGraph = {
  graphId: string;
  briefId: string;
  taskId: string;
  requestId: string;
  requestedNoun?: string;
  designArchetype: PromptCustomizationDesignArchetype;
  runtimeShapeClass?: PromptCustomizationRuntimeShapeClass;
  capabilityBundle?: PromptCustomizationRuntimeCapabilityBundle;
  rootPartId?: string;
  attachmentPartId?: string;
  nodes: PromptCustomizationAccessoryPartGraphNode[];
  edges: PromptCustomizationAccessoryPartGraphEdge[];
  stages: string[];
};

export type PromptCustomizationVisualCritiqueReport = {
  reportId: string;
  executionId: string;
  requestId: string;
  requestedNoun?: string;
  designArchetype?: PromptCustomizationDesignArchetype;
  runtimeShapeClass?: PromptCustomizationRuntimeShapeClass;
  source: VisionCritiqueSource;
  renderCritiquePolicy?: VisionCritiquePolicy;
  critiqueFailureNote?: string;
  critiqueTransport?: VisionCritiqueTransport;
  viewScores: Array<{
    view: "front" | "three-quarter" | "side";
    readability: number;
    silhouette: number;
    anchorFit: number;
  }>;
  lookalikeRisk: number;
  criticalPartsPresent: number;
  nounFidelity: number;
  renderNounFidelity?: number;
  criticalPartsVisible?: number;
  silhouetteReadability?: number;
  cohesionScore?: number;
  cohesionIssues?: string[];
  dominantFailureMode?: string;
  oversizeParts?: string[];
  hiddenCriticalParts?: string[];
  flattenedStructureParts?: string[];
  flattenedPartIds?: string[];
  detachedPartIds?: string[];
  hostInterferenceZones?: string[];
  hostIntrusionZones?: string[];
  silhouetteBreakpoints?: string[];
  dominantSpanOwner?: string;
  faceIntrusionSeverity?: number;
  partAttachmentCredibility?: number;
  nounReadOrder?: string[];
  finalReadOrder?: string[];
  firstReadPart?: string;
  dominantFailureLayer?: PromptCustomizationFailureLayer;
  rootSilhouetteFailure?: string;
  assemblyFailure?: string;
  hostFitFailure?: string;
  readOrderFailure?: string;
  rebuildDirective?: PromptCustomizationRefinementStage;
  targetRootSpan?: [number, number, number];
  targetDepthProfile?: PromptCustomizationDepthProfile;
  targetAttachmentPose?: string;
  nextPassPriority?: PromptCustomizationRefinementStage;
  rawFirstReadResult?: string;
  firstReadResult?: string;
  canonicalFirstRead?: string;
  rawDominantSpanOwnerText?: string;
  canonicalDominantSpanOwner?: string;
  canonicalDetachedPartIds?: string[];
  canonicalFlattenedPartIds?: string[];
  representationFailureKind?: PromptCustomizationRepresentationFailureKind;
  readabilityFailureKind?: PromptCustomizationReadabilityFailureKind;
  attachmentFailureKind?: PromptCustomizationAttachmentFailureKind;
  anchorProjectionFailureKind?: PromptCustomizationAnchorProjectionFailureKind;
  projectedAnchorPose?: [number, number, number];
  anchorPlaneOffset?: [number, number, number];
  earSideTangentOffset?: [number, number, number];
  outlineCompilerMode?: PromptCustomizationOutlineCompilerMode;
  outlineProjectionVariantId?: string;
  visualVeto?: boolean;
  visualVetoReason?: string;
  visualAcceptanceGatePassed?: boolean;
  visualFailureReasons?: string[];
  variantSwitchRecommended?: boolean;
  repairIntensityHints?: Array<{
    actionType: PromptCustomizationRepairActionType;
    intensity: number;
  }>;
  actualApproximationLabel?: string;
  repairActions: PromptCustomizationRepairAction[];
  summary: string;
};

export type PromptCustomizationGeometryPrimitive =
  | "sphere"
  | "cube"
  | "cylinder"
  | "cone"
  | "torus"
  | "icosphere";

export type PromptCustomizationGeometryMaterialZone =
  | "body"
  | "detail"
  | "accent"
  | "glow"
  | "accessory";

export type PromptCustomizationGeometryRecipePart = {
  partId: string;
  primitive: PromptCustomizationGeometryPrimitive;
  role: string;
  size: number;
  offset: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  materialZone?: PromptCustomizationGeometryMaterialZone;
};

export type PromptCustomizationGeometryRecipe = {
  recipeId: string;
  taskId: string;
  requestId: string;
  nounDesignBriefId?: string;
  partGraphId?: string;
  displayLabel: string;
  requestedNoun?: string;
  designArchetype: PromptCustomizationDesignArchetype;
  runtimeShapeClass?: PromptCustomizationRuntimeShapeClass;
  sourceMode?: PromptCustomizationReferenceSourceMode;
  referenceConfidence?: number;
  referencePack?: PromptCustomizationReferencePack;
  referenceId?: string;
  referenceSourceKind?: PromptCustomizationReferenceSourceKind;
  blueprintFamily?: PromptCustomizationCanonicalBlueprintFamily;
  representationMode?: PromptCustomizationRepresentationMode;
  familyPolicyId?: PromptCustomizationFamilyPolicyId;
  capabilityBundle?: PromptCustomizationRuntimeCapabilityBundle;
  runtimeDesignContract?: PromptCustomizationRuntimeDesignContract;
  variantCandidates?: PromptCustomizationBlueprintVariant[];
  variantId?: string;
  canonicalBlueprint?: PromptCustomizationReferenceDerivedBlueprint;
  referenceDerivedBlueprint?: PromptCustomizationReferenceDerivedBlueprint;
  shapeIntent: string;
  criticalParts: string[];
  optionalParts: string[];
  silhouetteGoals: string[];
  negativeLookalikes: string[];
  hangingStrategy: string;
  assemblyRootPartId?: string;
  attachmentPartId?: string;
  silhouetteBlocks?: PromptCustomizationSilhouetteBlock[];
  assemblySegments?: PromptCustomizationAssemblySegment[];
  mountStrategy?: PromptCustomizationMountStrategy;
  readOrderTargets?: string[];
  criticalViewGoals?: string[];
  compilerIntent?: PromptCustomizationCompilerIntent;
  structuralBlueprint?: PromptCustomizationStructuralBlueprint;
  primarySilhouette?: PromptCustomizationPrimarySilhouette;
  outlineProfile?: string;
  reliefFeatureLayout?: string[];
  attachmentMask?: string;
  profileVariantId?: string;
  partProfiles?: PromptCustomizationPartProfile[];
  attachmentRules?: PromptCustomizationAttachmentRule[];
  partImportanceWeights?: Record<string, number>;
  symmetryPolicy?: PromptCustomizationSymmetryPolicy;
  deformationPolicy?: PromptCustomizationDeformationPolicy[];
  family: PromptCustomizationAccessoryFamily;
  semanticClass: PromptCustomizationAccessorySemanticClass;
  runtimeDesignSource: PromptCustomizationRuntimeDesignSource;
  basePrimitives: PromptCustomizationGeometryPrimitive[];
  profileCurves: string[];
  symmetry: "none" | "bilateral" | "radial";
  parts: PromptCustomizationGeometryRecipePart[];
  partHierarchy: Array<{
    parentId: string;
    childId: string;
  }>;
  anchorOffsets: [number, number, number];
  orientationRules: string[];
  materialZones: PromptCustomizationGeometryMaterialZone[];
  sizeBounds: {
    overallScale: number;
    maxPartScale: number;
    minPartCount: number;
  };
  silhouetteChecks: string[];
  approximationLabel?: string;
  fallbackFamily?: PromptCustomizationAccessoryFamily;
};

export type PromptCustomizationBodyCustomization = {
  paletteMode: "theme-default" | "single-tone" | "dual-tone" | "gradient" | "zoned";
  primaryColor?: PromptCustomizationColorOverride;
  secondaryColor?: PromptCustomizationColorOverride;
  accentColor?: PromptCustomizationColorOverride;
  glowColor?: PromptCustomizationColorOverride;
  requestedColorTexts?: string[];
  colorResolutionSource?: PromptCustomizationColorOverride["resolutionSource"];
  colorApproximationReason?: string;
  requestedDescription: string[];
  segmentationHints: string[];
  materialStyleHints: string[];
};

export type PromptCustomizationRuntimeDesignTask = {
  taskId: string;
  requestId: string;
  requestLabel: string;
  requestedNoun?: string;
  prototypeCandidates?: PrototypeCandidate[];
  traits?: SemanticTrait[];
  retrievalMatches?: RetrievedPrototypeMatch[];
  nounSpan?: string;
  nounGloss?: string;
  objectCategory?: PromptCustomizationObjectCategory;
  designConfidence?: number;
  mustDistinctFromFallback: boolean;
  sourceMode?: PromptCustomizationReferenceSourceMode;
  referenceConfidence?: number;
  referencePack?: PromptCustomizationReferencePack;
  referenceId?: string;
  referenceSourceKind?: PromptCustomizationReferenceSourceKind;
  blueprintFamily?: PromptCustomizationCanonicalBlueprintFamily;
  representationMode?: PromptCustomizationRepresentationMode;
  familyPolicyId?: PromptCustomizationFamilyPolicyId;
  capabilityBundle?: PromptCustomizationRuntimeCapabilityBundle;
  runtimeDesignContract?: PromptCustomizationRuntimeDesignContract;
  variantCandidates?: PromptCustomizationBlueprintVariant[];
  variantId?: string;
  canonicalBlueprint?: PromptCustomizationReferenceDerivedBlueprint;
  referenceDerivedBlueprint?: PromptCustomizationReferenceDerivedBlueprint;
  designArchetype: PromptCustomizationDesignArchetype;
  runtimeShapeClass?: PromptCustomizationRuntimeShapeClass;
  shapeIntent: string;
  criticalParts: string[];
  optionalParts: string[];
  partGraphIntent: string;
  silhouetteGoals: string[];
  negativeLookalikes: string[];
  repairPriorities: string[];
  hangingStrategy: string;
  assemblyRootPartId?: string;
  attachmentPartId?: string;
  silhouetteBlocks?: PromptCustomizationSilhouetteBlock[];
  assemblySegments?: PromptCustomizationAssemblySegment[];
  mountStrategy?: PromptCustomizationMountStrategy;
  readOrderTargets?: string[];
  criticalViewGoals?: string[];
  compilerIntent?: PromptCustomizationCompilerIntent;
  structuralBlueprint?: PromptCustomizationStructuralBlueprint;
  primarySilhouette?: PromptCustomizationPrimarySilhouette;
  outlineProfile?: string;
  reliefFeatureLayout?: string[];
  attachmentMask?: string;
  profileVariantId?: string;
  partProfiles?: PromptCustomizationPartProfile[];
  attachmentRules?: PromptCustomizationAttachmentRule[];
  partImportanceWeights?: Record<string, number>;
  symmetryPolicy?: PromptCustomizationSymmetryPolicy;
  deformationPolicy?: PromptCustomizationDeformationPolicy[];
  family: PromptCustomizationAccessoryFamily;
  semanticClass: PromptCustomizationAccessorySemanticClass;
  shapeDescription: string;
  anchor: PromptCustomizationAccessoryAnchor;
  requestedAnchorPhrase?: string;
  anchorResolutionSource?: PromptCustomizationAnchorResolutionSource;
  instanceCount: number;
  requestedColor?: PromptCustomizationColorOverride;
  requestedColorText?: string;
  styleHints: string[];
  silhouetteHints: string[];
  mustKeep: boolean;
  allowApproximation: boolean;
  designNotes: string[];
  runtimeDesignSource: PromptCustomizationRuntimeDesignSource;
  nounDesignBriefId?: string;
};

export type PromptCustomizationAccessoryCustomization = {
  policy: PromptCustomizationAccessoryPolicy;
  requests: PromptCustomizationAccessoryRequest[];
  runtimeDesignTasks: PromptCustomizationRuntimeDesignTask[];
  nounDesignBriefs: PromptCustomizationNounDesignBrief[];
  partGraphs: PromptCustomizationAccessoryPartGraph[];
  geometryRecipes: PromptCustomizationGeometryRecipe[];
};

export type PromptCustomizationAccessoryPolicy = {
  removeDefaultAccessories: boolean;
  keepThemeDefaultAccessories: boolean;
  exceptionOnly: boolean;
  removedDefaultAccessoryKeys: string[];
  keptThemeDefaultAccessoryKeys: string[];
};

export type PromptCustomizationGeneratedAccessory = {
  kind: PromptCustomizationGeneratedAccessoryKind;
  label: string;
  anchor: PromptCustomizationAccessoryAnchor;
  sourceText: string;
  requestedAnchorPhrase?: string;
  anchorResolutionSource?: PromptCustomizationAnchorResolutionSource;
};

export type PromptCustomizationAccessoryRequest = {
  requestId: string;
  requestedLabel?: string;
  requestedNoun?: string;
  nounSpan?: string;
  nounGloss?: string;
  objectCategory?: PromptCustomizationObjectCategory;
  designConfidence?: number;
  mustDistinctFromFallback?: boolean;
  runtimeShapeClass?: PromptCustomizationRuntimeShapeClass;
  assemblyRootPartId?: string;
  attachmentPartId?: string;
  label: string;
  shapeLabel: string;
  family: PromptCustomizationAccessoryFamily;
  familyGuess?: PromptCustomizationAccessoryFamily;
  familyResolutionSource?: PromptCustomizationFamilyResolutionSource;
  semanticClass?: PromptCustomizationAccessorySemanticClass;
  anchor: PromptCustomizationAccessoryAnchor;
  requestedAnchorPhrase?: string;
  anchorResolutionSource?: PromptCustomizationAnchorResolutionSource;
  shapeDescription?: string;
  sourceText: string;
  priority: number;
  instances: PromptCustomizationAccessoryInstance[];
  colorIntent?: PromptCustomizationColorOverride;
  requestedColor?: PromptCustomizationColorOverride;
  styleIntent?: string;
  shapeHint?: string;
  requestedText?: string;
  executionMode: PromptCustomizationAccessoryExecutionMode;
  resolvedLabel?: string;
  allowApproximation?: boolean;
  mustKeep?: boolean;
  notes?: string[];
};

export type PromptCustomizationResolvedAccessoryExecution = {
  executionId: string;
  requestId: string;
  instanceId: string;
  nounDesignBriefId?: string;
  partGraphId?: string;
  family: PromptCustomizationAccessoryFamily;
  familyGuess?: PromptCustomizationAccessoryFamily;
  familyResolutionSource?: PromptCustomizationFamilyResolutionSource;
  requestedSemanticClass?: PromptCustomizationAccessorySemanticClass;
  requestedLabel?: string;
  requestedNoun?: string;
  sourceMode?: PromptCustomizationReferenceSourceMode;
  referenceConfidence?: number;
  referencePack?: PromptCustomizationReferencePack;
  referenceId?: string;
  referenceSourceKind?: PromptCustomizationReferenceSourceKind;
  designArchetype?: PromptCustomizationDesignArchetype;
  runtimeShapeClass?: PromptCustomizationRuntimeShapeClass;
  blueprintFamily?: PromptCustomizationCanonicalBlueprintFamily;
  capabilityBundle?: PromptCustomizationRuntimeCapabilityBundle;
  runtimeDesignContract?: PromptCustomizationRuntimeDesignContract;
  variantId?: string;
  assemblyRootPartId?: string;
  attachmentPartId?: string;
  primarySilhouette?: PromptCustomizationPrimarySilhouette;
  criticalParts?: string[];
  negativeLookalikes?: string[];
  readOrderTargets?: string[];
  criticalViewGoals?: string[];
  compilerIntent?: PromptCustomizationCompilerIntent;
  shapeLabel: string;
  anchor: PromptCustomizationAccessoryAnchor;
  requestedAnchorPhrase?: string;
  anchorResolutionSource?: PromptCustomizationAnchorResolutionSource;
  colorIntent?: PromptCustomizationColorOverride;
  requestedColorText?: string;
  executionMode: PromptCustomizationAccessoryExecutionMode;
  fallbackFamily?: PromptCustomizationAccessoryFamily;
  fallbackLabel?: string;
  resolvedLabel?: string;
  actualGeneratedLabel?: string;
  runtimeDesignTaskId?: string;
  runtimeDesignSource?: PromptCustomizationRuntimeDesignSource;
  geometryRecipeId?: string;
  fromThemeDefault?: boolean;
  notes?: string[];
  creationSource: PromptCustomizationCreationSource;
  executionStatus: PromptCustomizationExecutionStatus;
  nounFidelityStatus?: PromptCustomizationNounFidelityStatus;
  approximationReason?: string;
  failureReason?: string;
  dominantFailureLayer?: PromptCustomizationFailureLayer;
  finalReadOrder?: string[];
  anchorProjectionFailureKind?: PromptCustomizationAnchorProjectionFailureKind;
  projectedAnchorPose?: [number, number, number];
  anchorPlaneOffset?: [number, number, number];
  earSideTangentOffset?: [number, number, number];
  rawFirstReadResult?: string;
  firstReadResult?: string;
  canonicalFirstRead?: string;
  rawDominantSpanOwnerText?: string;
  canonicalDominantSpanOwner?: string;
  canonicalDetachedPartIds?: string[];
  canonicalFlattenedPartIds?: string[];
  visualVetoReason?: string;
  visualAcceptanceGatePassed?: boolean;
  visualFailureReasons?: string[];
  runtimeNodePrefix?: string;
  exportedNodeNames?: string[];
  exportedPartIds?: string[];
};

export type PromptCustomizationResolvedExecutionPlan = {
  removeDefaultAccessories: string[];
  keepThemeDefaults: string[];
  addAccessories: PromptCustomizationResolvedAccessoryExecution[];
  repairPassAllowed: boolean;
  repairPassTriggered: boolean;
};

export type PromptCustomizationExecutionScorecard = {
  requestedTheme: string;
  resolvedTheme: string;
  bodyPaletteIntent: string[];
  detailPaletteIntent: string[];
  requestedAccessoryCount: number;
  executedAccessoryCount: number;
  removedDefaultAccessories: string[];
  keptThemeDefaults: string[];
  approximatedAccessoryFamilies: string[];
  requestedAccessories: string[];
  executedAccessories: string[];
  approximatedAccessories: string[];
  unsupportedAccessories: string[];
  runtimeDesignedAccessories: string[];
  runtimeGeneratedAccessories: string[];
  implemented: string[];
  approximated: string[];
  unsupported: string[];
};

export type PromptCustomizationParsedIntent = {
  segments: string[];
  themeHints: string[];
  colorHints: string[];
  accessoryHints: string[];
  negationHints: string[];
};

export type PromptCustomizationNormalizedSemanticRecipe = {
  requestedTheme: string;
  resolvedTheme: string;
  bodyPaletteIntent: string[];
  detailPaletteIntent: string[];
  accessoryPolicy: PromptCustomizationAccessoryPolicy;
  accessoryRequests: PromptCustomizationAccessoryRequest[];
};

export type PromptCustomizationAccessoryOperation =
  | {
      type: "keep-default";
      label: string;
      accessoryKey?: string;
    }
  | {
      type: "remove-default";
      label: string;
      accessoryKey?: string;
      targetLabel?: string;
      sourceText?: string;
    }
  | {
      type: "replace-with-supported";
      label: string;
      accessoryKey: string;
      sourceText?: string;
    }
  | {
      type: "generate-simple-accessory";
      label: string;
      accessoryKey?: string;
      sourceText?: string;
    };

export type PromptCustomizationRecipe = {
  mode: GenerationMode;
  customizationProfile: CustomizationProfile;
  parserSource: CustomizationParserSource;
  designPlannerSource?: CustomizationParserSource;
  parsedIntent: PromptCustomizationParsedIntent;
  normalizedSemanticRecipe: PromptCustomizationNormalizedSemanticRecipe;
  semanticContractsV2?: PromptSemanticContractV2[];
  bodyCustomization: PromptCustomizationBodyCustomization;
  accessoryCustomization: PromptCustomizationAccessoryCustomization;
  runtimeDesignTasks: PromptCustomizationRuntimeDesignTask[];
  nounDesignBriefs: PromptCustomizationNounDesignBrief[];
  partGraphs: PromptCustomizationAccessoryPartGraph[];
  geometryRecipes: PromptCustomizationGeometryRecipe[];
  visualCritiqueReports: PromptCustomizationVisualCritiqueReport[];
  requestedTheme: string;
  resolvedTheme: string;
  themeSlot: string;
  themeLabel: string;
  themeReason: string;
  bodyPaletteIntent: string[];
  detailPaletteIntent: string[];
  colorOverrides: Partial<
    Record<PromptCustomizationColorSlot, PromptCustomizationColorOverride>
  >;
  accessoryPolicy: PromptCustomizationAccessoryPolicy;
  accessoryOperation: PromptCustomizationAccessoryOperation;
  generatedAccessory?: PromptCustomizationGeneratedAccessory;
  accessoryRequests: PromptCustomizationAccessoryRequest[];
  resolvedExecutionPlan: PromptCustomizationResolvedExecutionPlan;
  localTweaks: {
    earSize?: PromptCustomizationLocalTweak;
    tailFluff?: PromptCustomizationLocalTweak;
    eyeSize?: PromptCustomizationLocalTweak;
    glowIntensity?: PromptCustomizationLocalTweak;
  };
  negations: string[];
  unsupportedRequests: string[];
  unsupportedNotes: string[];
  executedCustomizations: string[];
  deferredCustomizations: string[];
  experimentalWarnings: string[];
  confidence: number;
  runtimeAttemptBudgetMs?: number;
  budgetUsedMs?: number;
  refinementPassCount?: number;
  qualityScore?: number;
  qualityGatePassed?: boolean;
  precisionGatePassed?: boolean;
  precisionReady?: boolean;
  visualAcceptanceGatePassed?: boolean;
  stopReason?: PromptCustomizationStopReason;
  stopDiagnostics?: PromptCustomizationStopDiagnostics;
  critiqueSource?: VisionCritiqueSource;
  structureRepairCount?: number;
  renderCritiqueAvailable?: boolean;
  sourceModes?: PromptCustomizationReferenceSourceMode[];
  referenceUsed?: boolean;
  blueprintFamilies?: string[];
  variantIds?: string[];
  rawFirstReadResults?: string[];
  firstReadResults?: string[];
  canonicalFirstReads?: string[];
  rawDominantSpanOwnerTexts?: string[];
  visualVetoReasons?: string[];
  faceIntrusionSeverity?: number;
  dominantSpanOwner?: string;
  canonicalDominantSpanOwner?: string;
  dominantFailureLayer?: PromptCustomizationFailureLayer;
  rebuildCountByLayer?: Partial<Record<PromptCustomizationFailureLayer, number>>;
  finalReadOrder?: string[];
  precisionFailureSummary?: string;
  plateauReason?: string;
  qualityMetrics?: PromptCustomizationQualityMetrics;
  dominantFailureModes?: string[];
  visualFailureReasons?: string[];
  fromThemeDefaults: string[];
  fromPromptOverrides: string[];
  executionScorecard: PromptCustomizationExecutionScorecard;
};

export type GenerationCustomizationSummary = {
  mode: GenerationMode;
  modeLabel: string;
  customizationProfile: CustomizationProfile;
  customizationProfileLabel: string;
  parserSource: CustomizationParserSource;
  parserLabel: string;
  designPlannerSource?: CustomizationParserSource;
  designPlannerModes?: PromptCustomizationRuntimeDesignSource[];
  requestedTheme: string;
  resolvedTheme: string;
  themeLabel: string;
  themeReason: string;
  bodyPaletteIntent: string[];
  detailPaletteIntent: string[];
  fromThemeDefaults: string[];
  fromPromptOverrides: string[];
  colorOverrides: string[];
  accessorySummary: string;
  requestedAccessoryCount: number;
  executedAccessoryCount: number;
  runtimeDesignTaskCount: number;
  nounDesignBriefCount: number;
  partGraphCount: number;
  geometryRecipeCount: number;
  visualCritiqueCount: number;
  runtimeAttemptBudgetMs?: number;
  budgetUsedMs?: number;
  refinementPassCount?: number;
  qualityScore?: number;
  qualityGatePassed?: boolean;
  precisionGatePassed?: boolean;
  precisionReady?: boolean;
  visualAcceptanceGatePassed?: boolean;
  stopReason?: PromptCustomizationStopReason;
  stopDiagnostics?: PromptCustomizationStopDiagnostics;
  critiqueSource?: VisionCritiqueSource;
  structureRepairCount?: number;
  renderCritiqueAvailable?: boolean;
  sourceModes?: PromptCustomizationReferenceSourceMode[];
  referenceUsed?: boolean;
  blueprintFamilies?: string[];
  variantIds?: string[];
  rawFirstReadResults?: string[];
  firstReadResults?: string[];
  canonicalFirstReads?: string[];
  rawDominantSpanOwnerTexts?: string[];
  visualVetoReasons?: string[];
  faceIntrusionSeverity?: number;
  dominantSpanOwner?: string;
  canonicalDominantSpanOwner?: string;
  dominantFailureLayer?: PromptCustomizationFailureLayer;
  rebuildCountByLayer?: Partial<Record<PromptCustomizationFailureLayer, number>>;
  finalReadOrder?: string[];
  precisionFailureSummary?: string;
  plateauReason?: string;
  qualityMetrics?: PromptCustomizationQualityMetrics;
  dominantFailureModes?: string[];
  visualFailureReasons?: string[];
  removedDefaultAccessories: string[];
  keptThemeDefaults: string[];
  approximatedAccessoryFamilies: string[];
  repairPassTriggered: boolean;
  requestedAccessories: string[];
  executedAccessories: string[];
  approximatedAccessories: string[];
  unsupportedAccessories: string[];
  localTweaks: string[];
  negations: string[];
  unsupportedRequests: string[];
  unsupportedNotes: string[];
  executedCustomizations: string[];
  deferredCustomizations: string[];
  experimentalWarnings: string[];
  confidence: number;
  executionScorecard: PromptCustomizationExecutionScorecard;
  accessoryFulfillmentRows: Array<{
    requestId: string;
    instanceId: string;
    source: "prompt";
    status: "implemented" | "approximated" | "unsupported";
    executionStatus: PromptCustomizationExecutionStatus;
    creationSource: PromptCustomizationCreationSource;
    requestedLabel: string;
    normalizedRequestedLabel?: string;
    requestedNoun?: string;
    nounGloss?: string;
    objectCategory?: PromptCustomizationObjectCategory;
    designConfidence?: number;
    sourceMode?: PromptCustomizationReferenceSourceMode;
    referenceConfidence?: number;
    designArchetype?: PromptCustomizationDesignArchetype;
    runtimeShapeClass?: PromptCustomizationRuntimeShapeClass;
    capabilities?: PromptCustomizationRuntimeCapability[];
    referenceId?: string;
    referenceSourceKind?: PromptCustomizationReferenceSourceKind;
    blueprintFamily?: PromptCustomizationCanonicalBlueprintFamily;
    variantId?: string;
    primarySilhouette?: PromptCustomizationPrimarySilhouette;
    criticalParts?: string[];
    negativeLookalikes?: string[];
    readOrderTargets?: string[];
    criticalViewGoals?: string[];
    familyGuess?: PromptCustomizationAccessoryFamily;
    familyResolutionSource?: PromptCustomizationFamilyResolutionSource;
    nounFidelityStatus?: PromptCustomizationNounFidelityStatus;
    requestedAnchor: string;
    requestedAnchorPhrase?: string;
    resolvedAnchor?: string;
    requestedShape: string;
    requestedSemanticClass?: string;
    requestedColor?: string;
    requestedColorText?: string;
    actualLabel: string;
    actualGeneratedLabel?: string;
    actualAnchor: string;
    actualShape: string;
    runtimeDesignSource?: PromptCustomizationRuntimeDesignSource;
    geometryRecipeId?: string;
    resolvedAnchorKey?: PromptCustomizationAccessoryAnchor;
    instanceOrdinal?: number;
    actualColor?: string;
    approximationReason?: string;
    failureReason?: string;
    dominantFailureLayer?: PromptCustomizationFailureLayer;
    anchorProjectionFailureKind?: PromptCustomizationAnchorProjectionFailureKind;
    projectedAnchorPose?: [number, number, number];
    anchorPlaneOffset?: [number, number, number];
    earSideTangentOffset?: [number, number, number];
    finalReadOrder?: string[];
    rawFirstReadResult?: string;
    firstReadResult?: string;
    canonicalFirstRead?: string;
    rawDominantSpanOwnerText?: string;
    canonicalDominantSpanOwner?: string;
    canonicalDetachedPartIds?: string[];
    canonicalFlattenedPartIds?: string[];
    visualVetoReason?: string;
    visualAcceptanceGatePassed?: boolean;
    visualFailureReasons?: string[];
    runtimeNodePrefix?: string;
    exportedNodeNames?: string[];
    exportedPartIds?: string[];
    notes: string[];
  }>;
};

export type GenerationMetadata = {
  originalPrompt: string;
  structuredPrompt: string;
  styleLabel: string;
  exportedAt: string;
  modelSize: string;
  thumbnailPath: string;
  outputFiles: string[];
  notes: string[];
  generationMode?: GenerationMode;
  customizationProfile?: CustomizationProfile;
  customizationSummary?: GenerationCustomizationSummary;
};

export type GenerationArtifacts = {
  metadataUrl: string;
  promptUrl: string;
  taskUrl: string;
};

export type GenerationArLinks = {
  androidUrl: string;
  iosUrl: string;
};

export type GenerationRecord = {
  id: string;
  prompt: string;
  style: StyleTemplate;
  name: string;
  status: GenerationStatus;
  modelUrl: string;
  posterUrl: string;
  metadata: GenerationMetadata;
  ar: GenerationArLinks;
  artifacts: GenerationArtifacts;
  createdAt: string;
  sharePath: string;
};

export type GenerationTaskManifest = {
  version: 1;
  generationId: string;
  adapterKey: GeneratorAdapterKey;
  requestedAt: string;
  input: {
    prompt: string;
    style: StyleTemplate;
    generationMode: GenerationMode;
    customizationProfile?: CustomizationProfile;
    llmConfig?: PersistedGenerationLlmConfig;
  };
  delivery: {
    name: string;
    modelUrl: string;
    posterUrl: string;
    sharePath: string;
    ar: GenerationArLinks;
  };
  artifacts: GenerationArtifacts & {
    generationFile: string;
    metadataFile: string;
    promptFile: string;
    taskFile: string;
    statusFile: string;
    modelFile: string;
    usdFile: string;
    posterFile: string;
    usdzFile: string;
  };
  adapterState: Record<string, unknown>;
  handoff: {
    nextAdapter: "blender-mcp";
    boundary: string;
    recipe: {
      archetype: string;
      templateVersion: string;
      generatorMode: string;
      generationMode?: GenerationMode;
      customizationProfile?: CustomizationProfile;
      llmConfig?: PersistedGenerationLlmConfig;
      cameraPreset: string;
      posePreset?: string;
      arPlacementPreset?: string;
      themeSlot?: string;
      themeLabel?: string;
      accessory?: string;
      accessoryLabel?: string;
      eyeMood?: string;
      assetContractFile?: string;
      templateAssetFile?: string;
      stageAssetFile?: string;
      exportScaleFactor?: number;
      exportScale?: [number, number, number];
      exportFacingRotation?: [number, number, number];
      stageCameraLocation?: [number, number, number];
      stageCameraRotation?: [number, number, number];
      stageCameraFocalLength?: number;
      renderExposure?: number;
      renderGamma?: number;
      customizations?: PromptCustomizationRecipe;
    };
    notes: string[];
  };
};

export type CreateGenerationInput = {
  prompt: string;
  style: StyleTemplate;
  generationMode: GenerationMode;
  customizationProfile?: CustomizationProfile;
  llmConfig?: GenerationLlmConfig;
};

export type PersistedGenerationRecord = Omit<GenerationRecord, "status"> & {
  createdAtMs: number;
  adapterKey: GeneratorAdapterKey;
  adapterState: Record<string, unknown>;
  generationMode?: GenerationMode;
  customizationProfile?: CustomizationProfile;
  llmConfig?: PersistedGenerationLlmConfig;
  customizations?: PromptCustomizationRecipe;
};

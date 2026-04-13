import type { SemanticTrait } from "./prototype-traits";

export const runtimeCapabilities = [
  "host-coupled",
  "chest-wrap",
  "soft-body",
  "front-readable",
  "dual-tail",
  "face-safe",
  "ear-side-hang",
  "micro-hang",
  "rigid-body",
  "flat-face-readable",
  "botanical-radial",
  "symbol-radial",
] as const;

export type RuntimeCapability = (typeof runtimeCapabilities)[number];

export const runtimeCapabilityAnchorClasses = [
  "chest-front",
  "ear-side",
  "head",
  "tail",
  "other",
] as const;

export type RuntimeCapabilityAnchorClass =
  (typeof runtimeCapabilityAnchorClasses)[number];

export type RuntimeCapabilityResolutionSource =
  | "prototype-pack"
  | "runtime-shape-fallback"
  | "trait-anchor-derived"
  | "legacy-family-fallback";

export type RuntimeCapabilityBundle = {
  bundleId: string;
  prototypeId?: string;
  runtimeShapeClass?: string;
  family?: string;
  anchor?: string;
  anchorClass: RuntimeCapabilityAnchorClass;
  traitHints: SemanticTrait[];
  capabilities: RuntimeCapability[];
  resolutionSource: RuntimeCapabilityResolutionSource;
};

export type RuntimeDesignContract = {
  contractId: string;
  capabilityClass: string;
  requiredCapabilities: RuntimeCapability[];
  primaryReadTarget?: string;
  requiredVisibleParts?: string[];
  hostNoGoZones?: string[];
  compositionEnvelope?: string;
  targetAttachmentPose?: string;
  anchorReferenceOffset?: [number, number, number];
  desiredPlacementOffset?: [number, number, number];
  anchorFitPolicy?: {
    blendWeights: [number, number, number];
    maxDeltas: [number, number, number];
  };
  hostFitEnvelope?: {
    anchorEnvelope: [number, number, number];
    maxSpan: [number, number, number];
    preferredYaw?: number;
    screenFacingBias?: number;
    faceIntrusionBudget?: number;
    eyeKeepout?: boolean;
    earClearance?: number;
  };
  faceKeepoutZones?: Array<{
    zoneId: string;
    label: string;
    severity: "hard" | "soft";
  }>;
  partRootingRules?: Array<{
    partId: string;
    parentPartId: string;
    rule: "rooted-to-parent" | "emerge-from-parent";
  }>;
  criticalViewGoals?: string[];
  notes?: string[];
};

export type RuntimeFailureLayer =
  | "silhouette"
  | "host-fit"
  | "assembly"
  | "topology"
  | "composition"
  | "stagnation";

export type RuntimeRebuildDirective =
  | "micro-tune"
  | "re-run-host-fit"
  | "rebuild-assembly"
  | "rebuild-geometry-contract"
  | "escalate-capability";

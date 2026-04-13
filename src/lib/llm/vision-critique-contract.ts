export const visionCritiqueSources = [
  "blueprint-projection",
  "viewport-capture",
  "render-hybrid",
] as const;

export type VisionCritiqueSource = (typeof visionCritiqueSources)[number];

export const visionCritiquePolicies = [
  "required",
  "viewport-fallback-allowed",
] as const;

export type VisionCritiquePolicy = (typeof visionCritiquePolicies)[number];

export const visionCritiqueViewNames = [
  "front",
  "three-quarter",
  "side",
  "host-front",
  "host-three-quarter",
] as const;

export type VisionCritiqueViewName = (typeof visionCritiqueViewNames)[number];

export type VisionCritiqueView = {
  view: VisionCritiqueViewName;
  purpose: "accessory-detail" | "host-composition";
  filePath?: string;
};

export type VisionCritiqueRepairAction = {
  actionType: string;
  source?: "structural" | "visual" | "hybrid";
  targetPartIds?: string[];
  targetRoles?: string[];
  intensity?: number;
  reason?: string;
};

export type VisionCritiqueInputContract = {
  requestedNoun?: string;
  requestedLabel?: string;
  anchor?: string;
  designArchetype?: string;
  runtimeShapeClass?: string;
  blueprintFamily?: string;
  variantId?: string;
  expectedDominantSpanOwner?: string;
  criticalParts?: string[];
  readOrderTargets?: string[];
  criticalViewGoals?: string[];
  expectedSilhouetteGoals?: string[];
  negativeLookalikes?: string[];
  currentMetrics?: Record<string, unknown>;
  hostContext?: Record<string, unknown>;
  structuralBlueprint?: Record<string, unknown>;
  existingRepairActions?: VisionCritiqueRepairAction[];
  views: VisionCritiqueView[];
};

export const visionCritiqueTransportModes = [
  "local-hybrid",
  "responses-api",
  "chat-completions",
  "viewport-fallback",
  "blueprint-fallback",
] as const;

export type VisionCritiqueTransportMode =
  (typeof visionCritiqueTransportModes)[number];

export const visionCritiqueTransportEndpoints = [
  "local-hybrid",
  "responses",
  "chat/completions",
  "viewport-capture",
  "blueprint-projection",
] as const;

export type VisionCritiqueTransportEndpoint =
  (typeof visionCritiqueTransportEndpoints)[number];

export type VisionCritiqueTransport = {
  source: VisionCritiqueSource;
  provider: "openai" | "deepseek" | "local";
  endpoint: VisionCritiqueTransportEndpoint;
  mode: VisionCritiqueTransportMode;
  model?: string;
  renderCritiqueAvailable: boolean;
  renderCritiquePolicy?: VisionCritiquePolicy;
  failureNote?: string;
  capturedViews?: VisionCritiqueViewName[];
  transportViews?: VisionCritiqueViewName[];
};

import type {
  PromptCustomizationAccessoryAnchor,
  PromptCustomizationAccessoryFamily,
  PromptCustomizationRuntimeShapeClass,
} from "./generation-types";
import type { SemanticTrait } from "../types/prototype-traits";
import type {
  RuntimeCapability,
  RuntimeCapabilityAnchorClass,
  RuntimeCapabilityBundle,
  RuntimeCapabilityResolutionSource,
} from "../types/runtime-capabilities";
import {
  getPrototypeRuntimePack,
  getPrototypeRuntimePackByRuntimeShapeClass,
} from "./prototype-runtime-packs";

type RuntimeCapabilityResolverInput = {
  prototypeId?: string | null;
  traits?: SemanticTrait[] | null;
  anchor?: PromptCustomizationAccessoryAnchor | null;
  runtimeShapeClass?: PromptCustomizationRuntimeShapeClass | null;
  family?: PromptCustomizationAccessoryFamily | null;
};

const capabilityOrder: RuntimeCapability[] = [
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
];

function uniqueCapabilities(values: Array<RuntimeCapability | null | undefined>) {
  const seen = new Set<RuntimeCapability>();
  const next: RuntimeCapability[] = [];

  for (const capability of values) {
    if (!capability || seen.has(capability)) {
      continue;
    }

    seen.add(capability);
    next.push(capability);
  }

  return next.sort(
    (left, right) =>
      capabilityOrder.indexOf(left) - capabilityOrder.indexOf(right),
  );
}

function normalizePrototypeId(prototypeId: string | null | undefined) {
  return typeof prototypeId === "string" && prototypeId.trim()
    ? prototypeId.trim().toLowerCase()
    : undefined;
}

function normalizeAnchor(anchor: PromptCustomizationAccessoryAnchor | null | undefined) {
  return typeof anchor === "string" && anchor.trim() ? anchor.trim() : undefined;
}

function classifyAnchor(
  anchor: PromptCustomizationAccessoryAnchor | null | undefined,
): RuntimeCapabilityAnchorClass {
  switch (anchor) {
    case "chest":
    case "chest-center":
    case "chest-left":
    case "chest-right":
      return "chest-front";
    case "left-ear":
    case "right-ear":
      return "ear-side";
    case "forehead":
    case "head-top":
    case "back-head":
      return "head";
    case "tail-top":
    case "tail-left":
    case "tail-right":
    case "tail-base":
      return "tail";
    default:
      return "other";
  }
}

function resolveCapabilitySource(
  fromPrototypePack: boolean,
  fromRuntimeShapePack: boolean,
  capabilities: RuntimeCapability[],
): RuntimeCapabilityResolutionSource {
  if (fromPrototypePack) {
    return "prototype-pack";
  }

  if (fromRuntimeShapePack) {
    return "runtime-shape-fallback";
  }

  if (capabilities.length > 0) {
    return "trait-anchor-derived";
  }

  return "legacy-family-fallback";
}

export function resolveRuntimeCapabilityBundle(
  input: RuntimeCapabilityResolverInput,
): RuntimeCapabilityBundle | undefined {
  const prototypeId = normalizePrototypeId(input.prototypeId);
  const runtimeShapeClass =
    typeof input.runtimeShapeClass === "string" && input.runtimeShapeClass.trim()
      ? (input.runtimeShapeClass.trim() as PromptCustomizationRuntimeShapeClass)
      : undefined;
  const family =
    typeof input.family === "string" && input.family.trim()
      ? input.family.trim()
      : undefined;
  const anchor = normalizeAnchor(input.anchor);
  const anchorClass = classifyAnchor(input.anchor);
  const traitHints = Array.isArray(input.traits) ? [...input.traits] : [];
  const prototypePack = getPrototypeRuntimePack(prototypeId);
  const runtimeShapePack =
    prototypePack ?? getPrototypeRuntimePackByRuntimeShapeClass(runtimeShapeClass);
  const hasPrototypePack = prototypePack !== null;
  const hasRuntimeShapePack = !hasPrototypePack && runtimeShapePack !== null;
  const packCapabilities = runtimeShapePack?.capabilityHints ?? [];
  const derivedCapabilities: RuntimeCapability[] = [];

  if (anchorClass === "ear-side") {
    derivedCapabilities.push("ear-side-hang");
  }

  if (anchorClass === "chest-front" && traitHints.includes("chest-safe")) {
    derivedCapabilities.push("host-coupled", "front-readable", "face-safe");
  }

  if (traitHints.includes("soft")) {
    derivedCapabilities.push("soft-body");
  }

  if (traitHints.includes("rigid")) {
    derivedCapabilities.push("rigid-body");
  }

  if (traitHints.includes("flat-face")) {
    derivedCapabilities.push("flat-face-readable");
  }

  if (traitHints.includes("micro-hangable")) {
    derivedCapabilities.push("micro-hang");
  }

  if (
    runtimeShapeClass === "scarf" ||
    family === "scarf" ||
    prototypeId === "scarf"
  ) {
    derivedCapabilities.push(
      "host-coupled",
      "chest-wrap",
      "soft-body",
      "front-readable",
      "dual-tail",
      "face-safe",
    );
  }

  const capabilities = uniqueCapabilities([
    ...packCapabilities,
    ...derivedCapabilities,
  ]);

  if (!prototypeId && !runtimeShapeClass && !family && !anchor) {
    return undefined;
  }

  const primaryIdentity =
    prototypeId ?? runtimeShapeClass ?? family ?? anchorClass;

  return {
    bundleId: `${primaryIdentity}:${anchorClass}`,
    prototypeId,
    runtimeShapeClass,
    family,
    anchor,
    anchorClass,
    traitHints,
    capabilities,
    resolutionSource: resolveCapabilitySource(
      hasPrototypePack,
      hasRuntimeShapePack,
      capabilities,
    ),
  };
}

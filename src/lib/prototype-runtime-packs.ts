import type {
  PromptCustomizationAccessoryFamily,
  PromptCustomizationDesignArchetype,
  PromptCustomizationRuntimeShapeClass,
} from "./generation-types";
import type { SemanticTrait } from "../types/prototype-traits";
import type { RuntimeCapability } from "../types/runtime-capabilities";

export type PrototypeRuntimePack = {
  prototypeId: string;
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass;
  designArchetype: PromptCustomizationDesignArchetype;
  routingKey: PromptCustomizationRuntimeShapeClass | PromptCustomizationAccessoryFamily;
  fallbackFamily: PromptCustomizationAccessoryFamily;
  criticalParts: string[];
  silhouetteTemplate: string;
  attachmentStrategy: string;
  traitConstraints?: SemanticTrait[];
  capabilityHints?: RuntimeCapability[];
};

const prototypeRuntimePacks: PrototypeRuntimePack[] = [
  {
    prototypeId: "flat-badge",
    runtimeShapeClass: "badge",
    designArchetype: "symbol-charm",
    routingKey: "badge",
    fallbackFamily: "generic-ornament",
    criticalParts: ["ring", "token", "accent"],
    silhouetteTemplate: "flat-badge-face",
    attachmentStrategy: "chest-pin",
    traitConstraints: ["rigid", "flat-face", "chest-safe"],
    capabilityHints: ["host-coupled", "front-readable", "flat-face-readable"],
  },
  {
    prototypeId: "camera",
    runtimeShapeClass: "camera-charm",
    designArchetype: "device-charm",
    routingKey: "camera-charm",
    fallbackFamily: "generic-ornament",
    criticalParts: ["device-body", "lens", "hang-slot"],
    silhouetteTemplate: "camera-compact",
    attachmentStrategy: "ear-side-forward",
    traitConstraints: ["rigid", "flat-face", "micro-hangable"],
    capabilityHints: [
      "ear-side-hang",
      "micro-hang",
      "rigid-body",
      "flat-face-readable",
      "front-readable",
    ],
  },
  {
    prototypeId: "boat",
    runtimeShapeClass: "boat-charm",
    designArchetype: "vehicle-charm",
    routingKey: "boat-charm",
    fallbackFamily: "generic-ornament",
    criticalParts: ["hull", "mast", "sail"],
    silhouetteTemplate: "boat-hull-sail",
    attachmentStrategy: "ear-side-forward",
    traitConstraints: ["rigid", "micro-hangable"],
    capabilityHints: ["ear-side-hang", "micro-hang", "rigid-body", "front-readable"],
  },
  {
    prototypeId: "rocket",
    runtimeShapeClass: "rocket-charm",
    designArchetype: "vehicle-charm",
    routingKey: "rocket-charm",
    fallbackFamily: "generic-ornament",
    criticalParts: ["body", "nose", "fin-left", "fin-right"],
    silhouetteTemplate: "rocket-forward-spine",
    attachmentStrategy: "ear-side-drop",
    traitConstraints: ["rigid", "micro-hangable"],
    capabilityHints: ["ear-side-hang", "micro-hang", "rigid-body", "front-readable"],
  },
  {
    prototypeId: "tool-head",
    runtimeShapeClass: "device-generic-charm",
    designArchetype: "tool-charm",
    routingKey: "device-generic-charm",
    fallbackFamily: "generic-ornament",
    criticalParts: ["hang-slot", "tool-body", "tool-head"],
    silhouetteTemplate: "tool-functional-head",
    attachmentStrategy: "ear-side-drop",
    traitConstraints: ["rigid", "micro-hangable"],
    capabilityHints: ["ear-side-hang", "micro-hang", "rigid-body", "front-readable"],
  },
  {
    prototypeId: "flower",
    runtimeShapeClass: "flower",
    designArchetype: "botanical-charm",
    routingKey: "flower",
    fallbackFamily: "flower",
    criticalParts: ["core", "petal-left", "petal-right", "petal-top", "petal-bottom"],
    silhouetteTemplate: "flower-layered-petal",
    attachmentStrategy: "ear-side-bloom",
    traitConstraints: ["soft", "ear-safe", "micro-hangable"],
    capabilityHints: ["ear-side-hang", "micro-hang", "soft-body", "botanical-radial"],
  },
  {
    prototypeId: "scarf",
    runtimeShapeClass: "scarf",
    designArchetype: "known-family",
    routingKey: "scarf",
    fallbackFamily: "scarf",
    criticalParts: ["wrap-band", "knot", "tail-left", "tail-right"],
    silhouetteTemplate: "chest-scarf-wrap",
    attachmentStrategy: "chest-wrap-forward",
    traitConstraints: ["soft", "chest-safe"],
    capabilityHints: [
      "host-coupled",
      "chest-wrap",
      "soft-body",
      "front-readable",
      "dual-tail",
      "face-safe",
    ],
  },
  {
    prototypeId: "clover-charm",
    runtimeShapeClass: "clover-charm",
    designArchetype: "botanical-charm",
    routingKey: "clover-charm",
    fallbackFamily: "flower",
    criticalParts: ["core", "leaf-left", "leaf-right", "leaf-top", "leaf-bottom", "stem"],
    silhouetteTemplate: "four-leaf-clover",
    attachmentStrategy: "ear-side-clover",
    traitConstraints: ["flat-face", "ear-safe", "micro-hangable"],
    capabilityHints: [
      "ear-side-hang",
      "micro-hang",
      "flat-face-readable",
      "botanical-radial",
    ],
  },
  {
    prototypeId: "star",
    runtimeShapeClass: "star",
    designArchetype: "symbol-charm",
    routingKey: "star",
    fallbackFamily: "star",
    criticalParts: ["core", "ray-1", "ray-2", "ray-3", "ray-4", "ray-5"],
    silhouetteTemplate: "five-point-star",
    attachmentStrategy: "ear-side-forward",
    traitConstraints: ["flat-face", "ear-safe", "micro-hangable"],
    capabilityHints: [
      "ear-side-hang",
      "micro-hang",
      "flat-face-readable",
      "symbol-radial",
    ],
  },
];

export function getPrototypeRuntimePack(prototypeId: string | null | undefined) {
  if (typeof prototypeId !== "string" || !prototypeId.trim()) {
    return null;
  }

  const normalized = prototypeId.trim().toLowerCase();
  return prototypeRuntimePacks.find((entry) => entry.prototypeId === normalized) ?? null;
}

export function getPrototypeRuntimePackByRuntimeShapeClass(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass | null | undefined,
) {
  if (typeof runtimeShapeClass !== "string" || !runtimeShapeClass.trim()) {
    return null;
  }

  const normalized = runtimeShapeClass.trim().toLowerCase();
  return prototypeRuntimePacks.find((entry) => entry.runtimeShapeClass === normalized) ?? null;
}

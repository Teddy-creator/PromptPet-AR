import type {
  PromptCustomizationBlueprintVariant,
  PromptCustomizationReferenceDerivedBlueprint,
  PromptCustomizationReferenceSourceMode,
  PromptCustomizationRuntimeShapeClass,
} from "../lib/generation-types";

type CanonicalBlueprintEntry = {
  referenceId: string;
  runtimeShapeClasses: PromptCustomizationRuntimeShapeClass[];
  dominantSilhouette: string;
  criticalParts: string[];
  readOrderTargets: string[];
  depthProfile: PromptCustomizationReferenceDerivedBlueprint["depthProfile"];
  attachmentPose: string;
  negativeLookalikes: string[];
  variantCandidates: PromptCustomizationBlueprintVariant[];
  blueprintFamily: PromptCustomizationReferenceDerivedBlueprint["blueprintFamily"];
  referenceConfidence: number;
};

const fishVariants: PromptCustomizationBlueprintVariant[] = [
  {
    variantId: "fish-compact-charm",
    label: "compact-charm",
    silhouetteIntent: "压缩成耳侧饰品级的小鱼挂件，避免压脸。",
    readOrderHints: ["body", "tail", "nose"],
    negativeLookalikes: ["generic puff", "random pebble", "badge"],
    preferredForRuntimeShapeClass: "fish-charm",
  },
  {
    variantId: "fish-body-tail-forward",
    label: "body-tail-forward",
    silhouetteIntent: "先读鱼身，再读鱼尾和上下鳍。",
    readOrderHints: ["body", "tail", "fin-top"],
    negativeLookalikes: ["generic blob", "round token", "flat badge"],
    preferredForRuntimeShapeClass: "fish-charm",
  },
];

const flowerVariants: PromptCustomizationBlueprintVariant[] = [
  {
    variantId: "flower-wide-petal",
    label: "wide-petal",
    silhouetteIntent: "先读花心，再读横向展开的主花瓣。",
    readOrderHints: ["core", "petal-left", "petal-right"],
    negativeLookalikes: ["generic puff", "ball cluster", "round token"],
    preferredForRuntimeShapeClass: "flower",
  },
  {
    variantId: "flower-layered-petal",
    label: "layered-petal",
    silhouetteIntent: "花瓣层次更明显，适合耳侧小花装饰。",
    readOrderHints: ["core", "petal-top", "petal-bottom"],
    negativeLookalikes: ["plain sphere", "blob", "badge"],
    preferredForRuntimeShapeClass: "flower",
  },
];

const cloverVariants: PromptCustomizationBlueprintVariant[] = [
  {
    variantId: "clover-wide-leaf",
    label: "wide-leaf",
    silhouetteIntent: "先读四叶轮廓，再读短茎和挂点。",
    readOrderHints: ["leaf-top", "leaf-left", "leaf-right"],
    negativeLookalikes: ["flower ball", "red blob", "generic token"],
    preferredForRuntimeShapeClass: "clover-charm",
  },
  {
    variantId: "clover-compact-charm",
    label: "compact-clover",
    silhouetteIntent: "收紧成耳侧四叶草小件，保留四片叶可读性。",
    readOrderHints: ["core", "leaf-top", "stem"],
    negativeLookalikes: ["round flower", "generic badge", "random blob"],
    preferredForRuntimeShapeClass: "clover-charm",
  },
];

const berryVariants: PromptCustomizationBlueprintVariant[] = [
  {
    variantId: "berry-crown-round",
    label: "crown-round",
    silhouetteIntent: "先读主体莓果，再读叶冠和侧面果粒。",
    readOrderHints: ["berry-main", "leaf-crown", "berry-side-left"],
    negativeLookalikes: ["plain sphere", "generic token", "round bead"],
    preferredForRuntimeShapeClass: "berry-charm",
  },
  {
    variantId: "berry-drop-compact",
    label: "drop-compact",
    silhouetteIntent: "更适合挂件的水滴型莓果轮廓。",
    readOrderHints: ["berry-main", "berry-side-right", "leaf-crown"],
    negativeLookalikes: ["flat badge", "blob", "random bead"],
    preferredForRuntimeShapeClass: "berry-charm",
  },
];

const cloudVariants: PromptCustomizationBlueprintVariant[] = [
  {
    variantId: "cloud-wide-puff",
    label: "wide-puff",
    silhouetteIntent: "先读中心云团，再读左右云团和底部云层。",
    readOrderHints: ["center-puff", "left-puff", "right-puff"],
    negativeLookalikes: ["single blob", "generic token", "flat badge"],
    preferredForRuntimeShapeClass: "cloud",
  },
  {
    variantId: "cloud-compact-puff",
    label: "compact-puff",
    silhouetteIntent: "压缩为耳侧可读的多团云朵挂饰。",
    readOrderHints: ["center-puff", "base-puff", "ring"],
    negativeLookalikes: ["round blob", "badge", "random puff"],
    preferredForRuntimeShapeClass: "cloud",
  },
];

const botanicalVariants: PromptCustomizationBlueprintVariant[] = [
  {
    variantId: "botanical-leaf-forward",
    label: "leaf-forward",
    silhouetteIntent: "先读主叶片或花瓣，再读连接结构。",
    readOrderHints: ["core", "leaf-left", "leaf-right"],
    negativeLookalikes: ["generic token", "round blob", "plain pendant"],
  },
  {
    variantId: "botanical-compact-stem",
    label: "compact-stem",
    silhouetteIntent: "收紧轮廓，保留叶片/花瓣和短茎。",
    readOrderHints: ["core", "petal-top", "stem"],
    negativeLookalikes: ["badge", "ball cluster", "generic charm"],
  },
];

const symbolVariants: PromptCustomizationBlueprintVariant[] = [
  {
    variantId: "symbol-cross-compact",
    label: "cross-compact",
    silhouetteIntent: "先读中心核，再读四向符号臂。",
    readOrderHints: ["core", "arm-top", "arm-left"],
    negativeLookalikes: ["generic token", "plain block", "badge"],
  },
  {
    variantId: "symbol-star-compact",
    label: "star-compact",
    silhouetteIntent: "适合星形或徽章类耳侧小件。",
    readOrderHints: ["core", "arm-top", "arm-right"],
    negativeLookalikes: ["blob", "round token", "generic ornament"],
  },
];

const starVariants: PromptCustomizationBlueprintVariant[] = [
  {
    variantId: "symbol-star-compact",
    label: "star-compact",
    silhouetteIntent: "先读中心核，再读五向星芒，保持五角星 first read。",
    readOrderHints: ["core", "ray-1", "ray-2"],
    negativeLookalikes: ["blob", "round token", "generic ornament"],
    preferredForRuntimeShapeClass: "star",
  },
  {
    variantId: "symbol-cross-compact",
    label: "cross-compact",
    silhouetteIntent: "退化时仍保持中心核和横向张开的符号感。",
    readOrderHints: ["core", "ray-1", "ray-5"],
    negativeLookalikes: ["generic token", "plain block", "badge"],
    preferredForRuntimeShapeClass: "star",
  },
];

const scarfVariants: PromptCustomizationBlueprintVariant[] = [
  {
    variantId: "scarf-wrap-forward",
    label: "wrap-forward",
    silhouetteIntent: "先读围巾横向包裹，再读胸前两条垂落尾片。",
    readOrderHints: ["wrap-band", "tail-left", "tail-right"],
    negativeLookalikes: ["black orb", "generic token", "necktie"],
    preferredForRuntimeShapeClass: "scarf",
  },
  {
    variantId: "scarf-knot-compact",
    label: "knot-compact",
    silhouetteIntent: "围巾结更紧凑，但必须保留两条可读垂片。",
    readOrderHints: ["wrap-band", "knot", "tail-left"],
    negativeLookalikes: ["badge block", "plain cube", "single drop"],
    preferredForRuntimeShapeClass: "scarf",
  },
];

const foodVariants: PromptCustomizationBlueprintVariant[] = [
  {
    variantId: "food-drop-charm",
    label: "drop-charm",
    silhouetteIntent: "先读主体甜点块，再读顶部装饰和挂点。",
    readOrderHints: ["token", "ring", "drop"],
    negativeLookalikes: ["generic sphere", "plain badge", "random block"],
  },
  {
    variantId: "food-layered-charm",
    label: "layered-charm",
    silhouetteIntent: "适合糖果/甜点的分层挂件轮廓。",
    readOrderHints: ["token", "charm", "link"],
    negativeLookalikes: ["blob", "flat token", "generic bar"],
  },
];

const ornamentVariants: PromptCustomizationBlueprintVariant[] = [
  {
    variantId: "ornament-drop-clean",
    label: "drop-clean",
    silhouetteIntent: "先读主体件，再读挂点和支撑段。",
    readOrderHints: ["token", "ring", "link"],
    negativeLookalikes: ["generic slab", "random block", "plain bar"],
  },
  {
    variantId: "ornament-compact-loop",
    label: "compact-loop",
    silhouetteIntent: "强调小挂件感，避免像压在脸上的块状物。",
    readOrderHints: ["ring", "token", "link"],
    negativeLookalikes: ["large slab", "badge", "box token"],
  },
];

const canonicalBlueprintEntries: CanonicalBlueprintEntry[] = [
  {
    referenceId: "canon-fish-ear-side",
    runtimeShapeClasses: ["fish-charm"],
    blueprintFamily: "canonical-creature",
    dominantSilhouette: "fish-body-with-separated-tail",
    criticalParts: ["body", "tail", "fin-top", "fin-bottom", "nose"],
    readOrderTargets: ["body", "tail", "fin-top"],
    depthProfile: "balanced",
    attachmentPose: "ear-side-forward",
    negativeLookalikes: ["generic blob", "round token", "flat badge"],
    variantCandidates: fishVariants,
    referenceConfidence: 0.9,
  },
  {
    referenceId: "canon-flower-ear-side",
    runtimeShapeClasses: ["flower"],
    blueprintFamily: "canonical-botanical",
    dominantSilhouette: "flower-core-with-layered-petals",
    criticalParts: ["core", "petal-left", "petal-right", "petal-top", "petal-bottom"],
    readOrderTargets: ["core", "petal-left", "petal-right"],
    depthProfile: "balanced",
    attachmentPose: "ear-side-bloom",
    negativeLookalikes: ["ball cluster", "generic puff", "round token"],
    variantCandidates: flowerVariants,
    referenceConfidence: 0.88,
  },
  {
    referenceId: "canon-clover-ear-side",
    runtimeShapeClasses: ["clover-charm"],
    blueprintFamily: "canonical-botanical",
    dominantSilhouette: "four-leaf-clover-with-short-stem",
    criticalParts: ["core", "leaf-left", "leaf-right", "leaf-top", "leaf-bottom", "stem"],
    readOrderTargets: ["leaf-top", "leaf-left", "leaf-right"],
    depthProfile: "balanced",
    attachmentPose: "ear-side-clover",
    negativeLookalikes: ["flower ball", "red blob", "generic token"],
    variantCandidates: cloverVariants,
    referenceConfidence: 0.91,
  },
  {
    referenceId: "canon-berry-ear-side",
    runtimeShapeClasses: ["berry-charm"],
    blueprintFamily: "canonical-food",
    dominantSilhouette: "berry-main-with-leaf-crown",
    criticalParts: ["berry-main", "berry-side-left", "berry-side-right", "leaf-crown"],
    readOrderTargets: ["berry-main", "leaf-crown", "berry-side-left"],
    depthProfile: "front-loaded",
    attachmentPose: "ear-side-drop",
    negativeLookalikes: ["plain sphere", "generic bead", "round token"],
    variantCandidates: berryVariants,
    referenceConfidence: 0.87,
  },
  {
    referenceId: "canon-cloud-ear-side",
    runtimeShapeClasses: ["cloud", "cloud-charm"],
    blueprintFamily: "canonical-ornament",
    dominantSilhouette: "multi-puff-cloud",
    criticalParts: ["center-puff", "left-puff", "right-puff", "base-puff", "ring"],
    readOrderTargets: ["center-puff", "left-puff", "right-puff"],
    depthProfile: "thin-slab",
    attachmentPose: "ear-side-cloud",
    negativeLookalikes: ["single blob", "flat badge", "generic token"],
    variantCandidates: cloudVariants,
    referenceConfidence: 0.86,
  },
  {
    referenceId: "canon-botanical-generic",
    runtimeShapeClasses: ["leaf", "mushroom", "open-botanical-ornament"],
    blueprintFamily: "canonical-botanical",
    dominantSilhouette: "compact-botanical-with-stem",
    criticalParts: ["core", "leaf-left", "leaf-right", "petal-top", "stem"],
    readOrderTargets: ["core", "leaf-left", "petal-top"],
    depthProfile: "balanced",
    attachmentPose: "ear-side-drop",
    negativeLookalikes: ["generic token", "plain pendant", "blob"],
    variantCandidates: botanicalVariants,
    referenceConfidence: 0.82,
  },
  {
    referenceId: "canon-star-ear-side",
    runtimeShapeClasses: ["star"],
    blueprintFamily: "canonical-symbol",
    dominantSilhouette: "compact-star-with-radial-rays",
    criticalParts: ["core", "ray-1", "ray-2", "ray-3", "ray-4", "ray-5"],
    readOrderTargets: ["core", "ray-1", "ray-2"],
    depthProfile: "thin-slab",
    attachmentPose: "ear-side-front-facing",
    negativeLookalikes: ["generic token", "badge block", "plain cube"],
    variantCandidates: starVariants,
    referenceConfidence: 0.84,
  },
  {
    referenceId: "canon-symbol-generic",
    runtimeShapeClasses: ["open-symbol-ornament", "badge"],
    blueprintFamily: "canonical-symbol",
    dominantSilhouette: "compact-symbol-with-radiating-arms",
    criticalParts: ["core", "arm-top", "arm-left", "arm-right", "arm-bottom"],
    readOrderTargets: ["core", "arm-top", "arm-left"],
    depthProfile: "thin-slab",
    attachmentPose: "ear-side-front-facing",
    negativeLookalikes: ["generic token", "badge block", "plain cube"],
    variantCandidates: symbolVariants,
    referenceConfidence: 0.8,
  },
  {
    referenceId: "canon-food-generic",
    runtimeShapeClasses: ["dessert", "candy", "dessert-hang", "generic-food-charm"],
    blueprintFamily: "canonical-food",
    dominantSilhouette: "compact-food-drop",
    criticalParts: ["token", "link", "ring"],
    readOrderTargets: ["token", "ring", "link"],
    depthProfile: "balanced",
    attachmentPose: "ear-side-drop",
    negativeLookalikes: ["generic sphere", "flat token", "random block"],
    variantCandidates: foodVariants,
    referenceConfidence: 0.76,
  },
  {
    referenceId: "canon-scarf-chest",
    runtimeShapeClasses: ["scarf"],
    blueprintFamily: "canonical-ornament",
    dominantSilhouette: "wrapped-scarf-with-dual-tails",
    criticalParts: ["wrap-band", "knot", "tail-left", "tail-right"],
    readOrderTargets: ["wrap-band", "tail-left", "tail-right"],
    depthProfile: "thin-slab",
    attachmentPose: "chest-forward-wrap",
    negativeLookalikes: ["black orb", "generic token", "necktie"],
    variantCandidates: scarfVariants,
    referenceConfidence: 0.85,
  },
  {
    referenceId: "canon-ornament-generic",
    runtimeShapeClasses: [
      "tie",
      "bow",
      "bell",
      "necklace-chain",
      "earring-hoop",
      "pendant-charm",
      "candle-charm",
      "key-charm",
      "feather-charm",
      "generic-animal-charm",
      "generic-ornament",
    ],
    blueprintFamily: "canonical-ornament",
    dominantSilhouette: "compact-drop-ornament",
    criticalParts: ["token", "ring", "link"],
    readOrderTargets: ["token", "ring", "link"],
    depthProfile: "balanced",
    attachmentPose: "ear-side-drop",
    negativeLookalikes: ["large slab", "box token", "random block"],
    variantCandidates: ornamentVariants,
    referenceConfidence: 0.72,
  },
];

function cloneVariants(variants: PromptCustomizationBlueprintVariant[]) {
  return variants.map((variant) => ({
    ...variant,
    readOrderHints: [...variant.readOrderHints],
    negativeLookalikes: [...variant.negativeLookalikes],
  }));
}

export function resolveCanonicalBlueprint(options: {
  runtimeShapeClass?: PromptCustomizationRuntimeShapeClass;
  requestedNoun?: string;
}) {
  if (!options.runtimeShapeClass) {
    return null;
  }

  const entry = canonicalBlueprintEntries.find((candidate) =>
    candidate.runtimeShapeClasses.includes(options.runtimeShapeClass as PromptCustomizationRuntimeShapeClass),
  );

  if (!entry) {
    return null;
  }

  const requestedNoun = options.requestedNoun?.trim() || entry.referenceId;

  return {
    sourceMode: "canonical-blueprint" as PromptCustomizationReferenceSourceMode,
    referenceConfidence: entry.referenceConfidence,
    blueprint: {
      referenceId: entry.referenceId,
      requestedNoun,
      blueprintFamily: entry.blueprintFamily,
      dominantSilhouette: entry.dominantSilhouette,
      criticalParts: [...entry.criticalParts],
      readOrderTargets: [...entry.readOrderTargets],
      depthProfile: entry.depthProfile,
      attachmentPose: entry.attachmentPose,
      negativeLookalikes: [...entry.negativeLookalikes],
      variantCandidates: cloneVariants(entry.variantCandidates),
      sourceKind: "silhouette-only" as const,
    },
  };
}

export function resolveCanonicalBlueprintByReferenceId(
  referenceId: string,
  requestedNoun?: string,
) {
  const entry = canonicalBlueprintEntries.find((candidate) => candidate.referenceId === referenceId);

  if (!entry) {
    return null;
  }

  return {
    sourceMode: "canonical-blueprint" as PromptCustomizationReferenceSourceMode,
    referenceConfidence: entry.referenceConfidence,
    blueprint: {
      referenceId: entry.referenceId,
      requestedNoun: requestedNoun?.trim() || entry.referenceId,
      blueprintFamily: entry.blueprintFamily,
      dominantSilhouette: entry.dominantSilhouette,
      criticalParts: [...entry.criticalParts],
      readOrderTargets: [...entry.readOrderTargets],
      depthProfile: entry.depthProfile,
      attachmentPose: entry.attachmentPose,
      negativeLookalikes: [...entry.negativeLookalikes],
      variantCandidates: cloneVariants(entry.variantCandidates),
      sourceKind: "silhouette-only" as const,
    },
  };
}

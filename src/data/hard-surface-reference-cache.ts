import type {
  PromptCustomizationBlueprintVariant,
  PromptCustomizationHardSurfaceBlueprintFamily,
  PromptCustomizationObjectCategory,
  PromptCustomizationReferenceAssetRecord,
  PromptCustomizationReferenceDerivedBlueprint,
  PromptCustomizationRuntimeShapeClass,
} from "../lib/generation-types";

type HardSurfaceReferenceCacheEntry = PromptCustomizationReferenceAssetRecord & {
  dominantSilhouette: string;
  criticalParts: string[];
  readOrderTargets: string[];
  depthProfile: PromptCustomizationReferenceDerivedBlueprint["depthProfile"];
  attachmentPose: string;
  negativeLookalikes: string[];
  variantCandidates: PromptCustomizationBlueprintVariant[];
  dominantContour?: PromptCustomizationReferenceDerivedBlueprint["dominantContour"];
  sideDepthProfile?: PromptCustomizationReferenceDerivedBlueprint["sideDepthProfile"];
  partSpanTargets?: PromptCustomizationReferenceDerivedBlueprint["partSpanTargets"];
  partDepthTargets?: PromptCustomizationReferenceDerivedBlueprint["partDepthTargets"];
  attachmentAnchors?: PromptCustomizationReferenceDerivedBlueprint["attachmentAnchors"];
  silhouetteKeepouts?: PromptCustomizationReferenceDerivedBlueprint["silhouetteKeepouts"];
  dominantSpanOwner?: PromptCustomizationReferenceDerivedBlueprint["dominantSpanOwner"];
  outlineProfile?: PromptCustomizationReferenceDerivedBlueprint["outlineProfile"];
  reliefFeatureLayout?: PromptCustomizationReferenceDerivedBlueprint["reliefFeatureLayout"];
  attachmentMask?: PromptCustomizationReferenceDerivedBlueprint["attachmentMask"];
  profileVariantId?: PromptCustomizationReferenceDerivedBlueprint["profileVariantId"];
};

const cameraVariants: PromptCustomizationBlueprintVariant[] = [
  {
    variantId: "camera-body-lens-forward",
    label: "body-lens-forward",
    silhouetteIntent: "机身先读出，再读镜头前凸和顶部 cluster。",
    readOrderHints: ["device-body", "camera-lens", "camera-top"],
    negativeLookalikes: ["generic slab", "silver badge", "flat token"],
    preferredForRuntimeShapeClass: "camera-charm",
    representationMode: "profile-relief-2_5d",
    familyPolicyId: "hard-surface-device",
    dominantContour: "body-lens-forward",
    sideDepthProfile: "front-loaded",
    dominantSpanOwner: "device-body",
    partSpanTargets: [
      { partId: "device-body", minShare: 0.56, maxShare: 0.72 },
      { partId: "camera-lens", minShare: 0.22, maxShare: 0.3 },
      { partId: "camera-top", minShare: 0.08, maxShare: 0.14 },
      { partId: "hang-slot", minShare: 0.02, maxShare: 0.06 },
    ],
    partDepthTargets: [
      { partId: "device-body", minDepth: 0.18, maxDepth: 0.26 },
      { partId: "camera-lens", minDepth: 0.24, maxDepth: 0.34 },
      { partId: "camera-top", minDepth: 0.08, maxDepth: 0.12 },
      { partId: "hang-slot", minDepth: 0.02, maxDepth: 0.05 },
    ],
    attachmentAnchors: [
      {
        anchorId: "camera-lens-front",
        partId: "camera-lens",
        parentPartId: "device-body",
        mountFace: "front",
        preferredOffset: [0.006, -0.013, 0.002],
        flushMount: true,
        embedDepth: 0.0026,
      },
      {
        anchorId: "camera-top-right",
        partId: "camera-top",
        parentPartId: "device-body",
        mountFace: "top-right",
        preferredOffset: [0.0048, 0.0004, 0.0142],
        flushMount: true,
        embedDepth: 0.0022,
      },
      {
        anchorId: "camera-viewfinder-left",
        partId: "camera-viewfinder",
        parentPartId: "device-body",
        mountFace: "top-left",
        preferredOffset: [-0.0058, 0.0004, 0.0138],
        flushMount: true,
        embedDepth: 0.002,
      },
      {
        anchorId: "camera-hang-top",
        partId: "hang-slot",
        parentPartId: "device-body",
        mountFace: "top",
        preferredOffset: [0, 0.0002, 0.0152],
        flushMount: true,
        embedDepth: 0.0012,
      },
    ],
    silhouetteKeepouts: [
      { keepoutId: "camera-hang-subordinate", partId: "hang-slot", behavior: "subordinate", severity: "hard" },
      { keepoutId: "camera-top-within-root", partId: "camera-top", behavior: "keep-within-root", severity: "soft" },
      { keepoutId: "camera-viewfinder-within-root", partId: "camera-viewfinder", behavior: "keep-within-root", severity: "soft" },
    ],
    outlineProfile: "camera-wide-body",
    reliefFeatureLayout: ["lens-forward-relief", "top-cluster-ridge", "viewfinder-corner"],
    attachmentMask: "top-cluster-hidden-loop",
    profileVariantId: "camera-profile-wide",
  },
  {
    variantId: "camera-body-top-cluster",
    label: "body-top-cluster",
    silhouetteIntent: "机身和顶部 cluster 同时可读，镜头仍保持前出。",
    readOrderHints: ["device-body", "camera-top", "camera-lens"],
    negativeLookalikes: ["flat box", "detached cube", "generic plate"],
    preferredForRuntimeShapeClass: "camera-charm",
    representationMode: "profile-relief-2_5d",
    familyPolicyId: "hard-surface-device",
    dominantContour: "body-top-cluster",
    sideDepthProfile: "deep-body",
    dominantSpanOwner: "device-body",
    partSpanTargets: [
      { partId: "device-body", minShare: 0.56, maxShare: 0.7 },
      { partId: "camera-lens", minShare: 0.2, maxShare: 0.28 },
      { partId: "camera-top", minShare: 0.1, maxShare: 0.16 },
    ],
    partDepthTargets: [
      { partId: "device-body", minDepth: 0.18, maxDepth: 0.26 },
      { partId: "camera-lens", minDepth: 0.22, maxDepth: 0.32 },
      { partId: "camera-top", minDepth: 0.08, maxDepth: 0.12 },
    ],
    outlineProfile: "camera-top-heavy-body",
    reliefFeatureLayout: ["lens-forward-relief", "top-cluster-ridge", "body-shoulder-step"],
    attachmentMask: "top-cluster-hidden-loop",
    profileVariantId: "camera-profile-top-cluster",
  },
  {
    variantId: "camera-compact-charm",
    label: "compact-charm",
    silhouetteIntent: "收紧为耳侧饰品级 2.5D 相机吊件，避免压脸。",
    readOrderHints: ["camera-lens", "device-body", "camera-top"],
    negativeLookalikes: ["thin badge", "token charm", "random block"],
    preferredForRuntimeShapeClass: "camera-charm",
    representationMode: "profile-relief-2_5d",
    familyPolicyId: "hard-surface-device",
    dominantContour: "compact-body-lens",
    sideDepthProfile: "front-loaded",
    dominantSpanOwner: "device-body",
    partSpanTargets: [
      { partId: "device-body", minShare: 0.42, maxShare: 0.58 },
      { partId: "camera-lens", minShare: 0.28, maxShare: 0.4 },
      { partId: "camera-top", minShare: 0.12, maxShare: 0.22 },
    ],
    partDepthTargets: [
      { partId: "device-body", minDepth: 0.12, maxDepth: 0.16 },
      { partId: "camera-lens", minDepth: 0.3, maxDepth: 0.46 },
      { partId: "camera-top", minDepth: 0.12, maxDepth: 0.18 },
    ],
    silhouetteKeepouts: [
      { keepoutId: "camera-compact-hang-subordinate", partId: "hang-slot", behavior: "subordinate", severity: "hard" },
    ],
    outlineProfile: "camera-compact-body",
    reliefFeatureLayout: ["lens-forward-relief", "compact-top-ridge"],
    attachmentMask: "top-cluster-hidden-loop",
    profileVariantId: "camera-profile-compact",
  },
];

const boatVariants: PromptCustomizationBlueprintVariant[] = [
  {
    variantId: "boat-hull-sail-compact",
    label: "hull-sail-compact",
    silhouetteIntent: "压缩整体宽度，但必须先读到船体，再读到 rooted sail。",
    readOrderHints: ["boat-hull", "boat-sail", "boat-mast"],
    negativeLookalikes: ["blue slab", "long rectangle", "detached mast", "blue bar"],
    preferredForRuntimeShapeClass: "boat-charm",
    representationMode: "profile-relief-2_5d",
    familyPolicyId: "hard-surface-boat",
    dominantContour: "compact-hull-sail",
    sideDepthProfile: "balanced",
    dominantSpanOwner: "boat-hull",
    partSpanTargets: [
      { partId: "boat-hull", minShare: 0.52, maxShare: 0.68 },
      { partId: "boat-mast", minShare: 0.08, maxShare: 0.16 },
      { partId: "boat-sail", minShare: 0.18, maxShare: 0.3 },
    ],
    partDepthTargets: [
      { partId: "boat-hull", minDepth: 0.12, maxDepth: 0.18 },
      { partId: "boat-sail", minDepth: 0.08, maxDepth: 0.16 },
    ],
    attachmentAnchors: [
      {
        anchorId: "boat-mast-root-compact",
        partId: "boat-mast",
        parentPartId: "boat-hull",
        mountFace: "centerline",
        preferredOffset: [-0.001, 0.001, 0.01],
      },
      {
        anchorId: "boat-sail-plane-compact",
        partId: "boat-sail",
        parentPartId: "boat-mast",
        mountFace: "side",
        preferredOffset: [0.003, 0.002, 0.01],
        flushMount: true,
      },
    ],
    outlineProfile: "boat-compact-hull",
    reliefFeatureLayout: ["compact-hull-profile", "mast-rooted-spine", "sail-tri-plane"],
    attachmentMask: "mast-hidden-loop",
    profileVariantId: "boat-profile-compact",
  },
  {
    variantId: "boat-hull-sail-upright",
    label: "hull-sail-upright",
    silhouetteIntent: "先读 hull，再读 sail 和 mast 的竖向关系。",
    readOrderHints: ["boat-hull", "boat-sail", "boat-mast"],
    negativeLookalikes: ["long bar", "blue rod", "flat badge"],
    preferredForRuntimeShapeClass: "boat-charm",
    representationMode: "profile-relief-2_5d",
    familyPolicyId: "hard-surface-boat",
    dominantContour: "upright-hull-sail",
    sideDepthProfile: "balanced",
    dominantSpanOwner: "boat-hull",
    partSpanTargets: [
      { partId: "boat-hull", minShare: 0.52, maxShare: 0.72 },
      { partId: "boat-mast", minShare: 0.08, maxShare: 0.16 },
      { partId: "boat-sail", minShare: 0.24, maxShare: 0.38 },
      { partId: "hang-slot", minShare: 0.02, maxShare: 0.06 },
    ],
    partDepthTargets: [
      { partId: "boat-hull", minDepth: 0.16, maxDepth: 0.22 },
      { partId: "boat-mast", minDepth: 0.05, maxDepth: 0.08 },
      { partId: "boat-sail", minDepth: 0.06, maxDepth: 0.12 },
    ],
    attachmentAnchors: [
      {
        anchorId: "boat-mast-root",
        partId: "boat-mast",
        parentPartId: "boat-hull",
        mountFace: "centerline",
        preferredOffset: [0, 0.001, 0.012],
      },
      {
        anchorId: "boat-sail-side",
        partId: "boat-sail",
        parentPartId: "boat-mast",
        mountFace: "side",
        preferredOffset: [0.003, 0.002, 0.012],
        flushMount: true,
      },
      {
        anchorId: "boat-hang-top",
        partId: "hang-slot",
        parentPartId: "boat-mast",
        mountFace: "top",
        preferredOffset: [0, 0.001, 0.03],
      },
    ],
    silhouetteKeepouts: [
      { keepoutId: "boat-hang-subordinate", partId: "hang-slot", behavior: "subordinate", severity: "hard" },
      { keepoutId: "boat-mast-rooted", partId: "boat-mast", behavior: "rooted-only", severity: "hard" },
      { keepoutId: "boat-sail-rooted", partId: "boat-sail", behavior: "rooted-only", severity: "hard" },
    ],
    outlineProfile: "boat-upright-hull",
    reliefFeatureLayout: ["hull-pointed-ends", "mast-rooted-spine", "sail-tri-plane"],
    attachmentMask: "mast-hidden-loop",
    profileVariantId: "boat-profile-upright",
  },
  {
    variantId: "boat-hull-mast-minimal",
    label: "hull-mast-minimal",
    silhouetteIntent: "保留 rooted mast，但必须让 sail 重新回到主轮廓读取里。",
    readOrderHints: ["boat-hull", "boat-sail", "boat-mast"],
    negativeLookalikes: ["blue stick", "badge token", "flat plate", "blue long bar"],
    preferredForRuntimeShapeClass: "boat-charm",
    representationMode: "profile-relief-2_5d",
    familyPolicyId: "hard-surface-boat",
    dominantContour: "rooted-hull-sail-relief",
    sideDepthProfile: "balanced",
    dominantSpanOwner: "boat-hull",
    partSpanTargets: [
      { partId: "boat-hull", minShare: 0.52, maxShare: 0.68 },
      { partId: "boat-mast", minShare: 0.08, maxShare: 0.14 },
      { partId: "boat-sail", minShare: 0.18, maxShare: 0.28 },
    ],
    partDepthTargets: [
      { partId: "boat-hull", minDepth: 0.12, maxDepth: 0.18 },
      { partId: "boat-mast", minDepth: 0.04, maxDepth: 0.08 },
      { partId: "boat-sail", minDepth: 0.08, maxDepth: 0.16 },
    ],
    attachmentAnchors: [
      {
        anchorId: "boat-mast-root-rooted",
        partId: "boat-mast",
        parentPartId: "boat-hull",
        mountFace: "centerline",
        preferredOffset: [-0.001, 0.001, 0.011],
      },
      {
        anchorId: "boat-sail-plane-rooted",
        partId: "boat-sail",
        parentPartId: "boat-mast",
        mountFace: "side",
        preferredOffset: [0.003, 0.002, 0.011],
        flushMount: true,
      },
      {
        anchorId: "boat-hang-top-rooted",
        partId: "hang-slot",
        parentPartId: "boat-mast",
        mountFace: "top",
        preferredOffset: [0, 0.001, 0.029],
      },
    ],
    silhouetteKeepouts: [
      { keepoutId: "boat-hang-subordinate-rooted", partId: "hang-slot", behavior: "subordinate", severity: "hard" },
      { keepoutId: "boat-mast-rooted-rooted", partId: "boat-mast", behavior: "rooted-only", severity: "hard" },
      { keepoutId: "boat-sail-rooted-rooted", partId: "boat-sail", behavior: "rooted-only", severity: "hard" },
    ],
    outlineProfile: "boat-rooted-hull",
    reliefFeatureLayout: ["hull-pointed-ends", "mast-rooted-spine", "sail-tri-plane"],
    attachmentMask: "mast-hidden-loop",
    profileVariantId: "boat-profile-rooted",
  },
];

const deviceVariants: PromptCustomizationBlueprintVariant[] = [
  {
    variantId: "device-tall-phone-charm",
    label: "tall-phone",
    silhouetteIntent: "先读到更像手机的正面轮廓，再读屏幕面和右上角小特征。",
    readOrderHints: ["device-body", "screen-face", "camera-dot"],
    negativeLookalikes: ["generic token", "badge pendant", "flat brick"],
    preferredForRuntimeShapeClass: "device-generic-charm",
    representationMode: "profile-relief-2_5d",
    familyPolicyId: "hard-surface-device",
    dominantContour: "device-tall-rect",
    sideDepthProfile: "thin-slab",
    dominantSpanOwner: "device-body",
    partSpanTargets: [
      { partId: "device-body", minShare: 0.6, maxShare: 0.76 },
      { partId: "screen-face", minShare: 0.26, maxShare: 0.42 },
      { partId: "camera-dot", minShare: 0.012, maxShare: 0.032 },
      { partId: "hang-slot", minShare: 0.002, maxShare: 0.01 },
    ],
    partDepthTargets: [
      { partId: "device-body", minDepth: 0.12, maxDepth: 0.18 },
      { partId: "screen-face", minDepth: 0.01, maxDepth: 0.018 },
      { partId: "camera-dot", minDepth: 0.008, maxDepth: 0.016 },
      { partId: "hang-slot", minDepth: 0.004, maxDepth: 0.01 },
    ],
    attachmentAnchors: [
      {
        anchorId: "device-screen-front-tall",
        partId: "screen-face",
        parentPartId: "device-body",
        mountFace: "front",
        preferredOffset: [0, -0.009, 0.002],
        flushMount: true,
        embedDepth: 0.0024,
      },
      {
        anchorId: "device-camera-corner-tall",
        partId: "camera-dot",
        parentPartId: "device-body",
        mountFace: "front",
        preferredOffset: [0.01, -0.009, 0.02],
        flushMount: true,
        embedDepth: 0.0018,
      },
      {
        anchorId: "device-hang-top-tall",
        partId: "hang-slot",
        parentPartId: "device-body",
        mountFace: "top",
        preferredOffset: [0, 0.0002, 0.016],
        flushMount: true,
        embedDepth: 0.0014,
      },
    ],
    silhouetteKeepouts: [
      { keepoutId: "device-hang-subordinate-tall", partId: "hang-slot", behavior: "subordinate", severity: "hard" },
      { keepoutId: "device-screen-within-root-tall", partId: "screen-face", behavior: "keep-within-root", severity: "soft" },
      { keepoutId: "device-dot-within-root-tall", partId: "camera-dot", behavior: "keep-within-root", severity: "soft" },
    ],
    outlineProfile: "device-tall-rect",
    reliefFeatureLayout: ["screen-face-inset", "camera-corner-dot", "top-edge-notch"],
    attachmentMask: "top-edge-hidden-loop",
    profileVariantId: "device-profile-tall-phone",
  },
  {
    variantId: "device-screen-forward",
    label: "screen-forward",
    silhouetteIntent: "设备正面必须先读成一个屏幕主导的前表面，而不是窄条或吊牌。",
    readOrderHints: ["device-body", "screen-face", "hang-slot"],
    negativeLookalikes: ["generic slab", "thick badge", "random plate"],
    preferredForRuntimeShapeClass: "device-generic-charm",
    representationMode: "profile-relief-2_5d",
    familyPolicyId: "hard-surface-device",
    dominantContour: "device-screen-forward",
    sideDepthProfile: "thin-slab",
    dominantSpanOwner: "device-body",
    partSpanTargets: [
      { partId: "device-body", minShare: 0.6, maxShare: 0.76 },
      { partId: "screen-face", minShare: 0.28, maxShare: 0.44 },
      { partId: "camera-dot", minShare: 0.012, maxShare: 0.034 },
      { partId: "hang-slot", minShare: 0.002, maxShare: 0.012 },
    ],
    partDepthTargets: [
      { partId: "device-body", minDepth: 0.12, maxDepth: 0.18 },
      { partId: "screen-face", minDepth: 0.01, maxDepth: 0.018 },
      { partId: "camera-dot", minDepth: 0.008, maxDepth: 0.018 },
      { partId: "hang-slot", minDepth: 0.004, maxDepth: 0.01 },
    ],
    attachmentAnchors: [
      {
        anchorId: "device-screen-front",
        partId: "screen-face",
        parentPartId: "device-body",
        mountFace: "front",
        preferredOffset: [0, -0.0095, 0.002],
        flushMount: true,
        embedDepth: 0.0024,
      },
      {
        anchorId: "device-camera-corner",
        partId: "camera-dot",
        parentPartId: "device-body",
        mountFace: "front",
        preferredOffset: [0.01, -0.0095, 0.02],
        flushMount: true,
        embedDepth: 0.0018,
      },
      {
        anchorId: "device-hang-top",
        partId: "hang-slot",
        parentPartId: "device-body",
        mountFace: "top",
        preferredOffset: [0, 0.0002, 0.0165],
        flushMount: true,
        embedDepth: 0.0014,
      },
    ],
    silhouetteKeepouts: [
      { keepoutId: "device-hang-subordinate", partId: "hang-slot", behavior: "subordinate", severity: "hard" },
      { keepoutId: "device-screen-within-root", partId: "screen-face", behavior: "keep-within-root", severity: "soft" },
      { keepoutId: "device-dot-within-root", partId: "camera-dot", behavior: "keep-within-root", severity: "soft" },
    ],
    outlineProfile: "device-screen-rect",
    reliefFeatureLayout: ["screen-face-inset", "camera-corner-dot"],
    attachmentMask: "top-edge-hidden-loop",
    profileVariantId: "device-profile-screen-forward",
  },
  {
    variantId: "device-compact-charm",
    label: "compact-device",
    silhouetteIntent: "压缩成饰品级设备挂件，但仍要先读到前表面，不许退化成盒条。",
    readOrderHints: ["device-body", "screen-face", "camera-dot"],
    negativeLookalikes: ["box token", "flat brick", "generic pendant"],
    preferredForRuntimeShapeClass: "device-generic-charm",
    representationMode: "profile-relief-2_5d",
    familyPolicyId: "hard-surface-device",
    dominantContour: "device-compact-rect",
    sideDepthProfile: "thin-slab",
    dominantSpanOwner: "device-body",
    partSpanTargets: [
      { partId: "device-body", minShare: 0.58, maxShare: 0.74 },
      { partId: "screen-face", minShare: 0.24, maxShare: 0.38 },
      { partId: "camera-dot", minShare: 0.012, maxShare: 0.03 },
      { partId: "hang-slot", minShare: 0.002, maxShare: 0.01 },
    ],
    partDepthTargets: [
      { partId: "device-body", minDepth: 0.108, maxDepth: 0.156 },
      { partId: "screen-face", minDepth: 0.014, maxDepth: 0.024 },
      { partId: "camera-dot", minDepth: 0.008, maxDepth: 0.016 },
      { partId: "hang-slot", minDepth: 0.006, maxDepth: 0.014 },
    ],
    attachmentAnchors: [
      {
        anchorId: "device-screen-front-compact",
        partId: "screen-face",
        parentPartId: "device-body",
        mountFace: "front",
        preferredOffset: [0, -0.012, 0.002],
        flushMount: true,
        embedDepth: 0.0012,
      },
      {
        anchorId: "device-camera-corner-compact",
        partId: "camera-dot",
        parentPartId: "device-body",
        mountFace: "front",
        preferredOffset: [0.011, -0.012, 0.022],
        flushMount: true,
        embedDepth: 0.0008,
      },
      {
        anchorId: "device-hang-top-compact",
        partId: "hang-slot",
        parentPartId: "device-body",
        mountFace: "top",
        preferredOffset: [0, 0.0003, 0.02],
        flushMount: true,
        embedDepth: 0.0006,
      },
    ],
    silhouetteKeepouts: [
      { keepoutId: "device-hang-subordinate-compact", partId: "hang-slot", behavior: "subordinate", severity: "hard" },
      { keepoutId: "device-screen-within-root-compact", partId: "screen-face", behavior: "keep-within-root", severity: "soft" },
    ],
    outlineProfile: "device-compact-rect",
    reliefFeatureLayout: ["screen-face-inset", "top-edge-notch"],
    attachmentMask: "top-edge-hidden-loop",
    profileVariantId: "device-profile-compact",
  },
];

const vehicleVariants: PromptCustomizationBlueprintVariant[] = [
  {
    variantId: "vehicle-forward-spine",
    label: "forward-spine",
    silhouetteIntent: "主体和前后指向先读出，再读支撑或尾部结构。",
    readOrderHints: ["vehicle-body", "vehicle-front", "vehicle-rear"],
    negativeLookalikes: ["long bar", "thick rod", "generic block"],
    preferredForRuntimeShapeClass: "vehicle-generic-charm",
  },
  {
    variantId: "vehicle-compact-upright",
    label: "compact-upright",
    silhouetteIntent: "适合耳侧饰品的竖向 compact vehicle silhouette。",
    readOrderHints: ["vehicle-body", "vehicle-front", "hang-slot"],
    negativeLookalikes: ["box token", "flat slab", "badge"],
    preferredForRuntimeShapeClass: "vehicle-generic-charm",
  },
];

const hardSurfaceReferenceCache: HardSurfaceReferenceCacheEntry[] = [
  {
    referenceId: "ref-camera-compact",
    requestedNoun: "相机",
    normalizedNoun: "相机",
    objectCategory: "device",
    imagePaths: [
      "/reference-blueprints/camera-front.svg",
      "/reference-blueprints/camera-side.svg",
    ],
    sourceKind: "multi-view",
    referenceConfidence: 0.95,
    blueprintFamily: "hard-surface-device",
    representationMode: "profile-relief-2_5d",
    familyPolicyId: "hard-surface-device",
    matchTokens: ["相机", "camera", "照相机", "拍立得"],
    dominantSilhouette: "compact-device-with-front-lens",
    criticalParts: ["device-body", "camera-lens", "camera-top", "hang-slot"],
    readOrderTargets: ["device-body", "camera-lens", "camera-top"],
    depthProfile: "front-loaded",
    attachmentPose: "ear-side-front-facing",
    negativeLookalikes: ["generic slab", "badge block", "silver token"],
    variantCandidates: cameraVariants,
    dominantContour: "body-lens-forward",
    sideDepthProfile: "front-loaded",
    partSpanTargets: [
      { partId: "device-body", minShare: 0.52, maxShare: 0.72 },
      { partId: "camera-lens", minShare: 0.2, maxShare: 0.32 },
      { partId: "camera-top", minShare: 0.08, maxShare: 0.18 },
      { partId: "hang-slot", minShare: 0.02, maxShare: 0.06 },
    ],
    partDepthTargets: [
      { partId: "device-body", minDepth: 0.17, maxDepth: 0.24 },
      { partId: "camera-lens", minDepth: 0.34, maxDepth: 0.56 },
      { partId: "camera-top", minDepth: 0.1, maxDepth: 0.18 },
      { partId: "hang-slot", minDepth: 0.04, maxDepth: 0.08 },
    ],
    attachmentAnchors: cameraVariants[0]?.attachmentAnchors,
    silhouetteKeepouts: cameraVariants[0]?.silhouetteKeepouts,
    dominantSpanOwner: "device-body",
    outlineProfile: "camera-wide-body",
    reliefFeatureLayout: ["lens-forward-relief", "top-cluster-ridge", "viewfinder-corner"],
    attachmentMask: "top-cluster-hidden-loop",
    profileVariantId: "camera-profile-wide",
  },
  {
    referenceId: "ref-boat-charm",
    requestedNoun: "小船",
    normalizedNoun: "小船",
    objectCategory: "vehicle",
    imagePaths: [
      "/reference-blueprints/boat-front.svg",
      "/reference-blueprints/boat-side.svg",
    ],
    sourceKind: "multi-view",
    referenceConfidence: 0.94,
    blueprintFamily: "hard-surface-vehicle",
    representationMode: "profile-relief-2_5d",
    familyPolicyId: "hard-surface-boat",
    matchTokens: ["小船", "船", "boat", "ship"],
    dominantSilhouette: "compact-hull-with-readable-sail",
    criticalParts: ["boat-hull", "boat-mast", "boat-sail", "hang-slot"],
    readOrderTargets: ["boat-hull", "boat-sail", "boat-mast"],
    depthProfile: "balanced",
    attachmentPose: "ear-side-upright-hull",
    negativeLookalikes: ["long bar", "blue rod", "flat token"],
    variantCandidates: [boatVariants[1], boatVariants[0]].filter(
      (variant): variant is PromptCustomizationBlueprintVariant => Boolean(variant),
    ),
    dominantContour: "upright-hull-sail",
    sideDepthProfile: "balanced",
    partSpanTargets: [
      { partId: "boat-hull", minShare: 0.5, maxShare: 0.72 },
      { partId: "boat-mast", minShare: 0.08, maxShare: 0.16 },
      { partId: "boat-sail", minShare: 0.24, maxShare: 0.38 },
      { partId: "hang-slot", minShare: 0.02, maxShare: 0.06 },
    ],
    partDepthTargets: [
      { partId: "boat-hull", minDepth: 0.15, maxDepth: 0.22 },
      { partId: "boat-mast", minDepth: 0.05, maxDepth: 0.08 },
      { partId: "boat-sail", minDepth: 0.06, maxDepth: 0.12 },
    ],
    attachmentAnchors: boatVariants[1]?.attachmentAnchors,
    silhouetteKeepouts: boatVariants[1]?.silhouetteKeepouts,
    dominantSpanOwner: "boat-hull",
    outlineProfile: "boat-upright-hull",
    reliefFeatureLayout: ["hull-pointed-ends", "mast-rooted-spine", "sail-tri-plane"],
    attachmentMask: "mast-hidden-loop",
    profileVariantId: "boat-profile-upright",
  },
  {
    referenceId: "ref-phone-compact",
    requestedNoun: "手机",
    normalizedNoun: "手机",
    objectCategory: "device",
    imagePaths: [
      "/reference-blueprints/device-front.svg",
      "/reference-blueprints/device-side.svg",
    ],
    sourceKind: "multi-view",
    referenceConfidence: 0.9,
    blueprintFamily: "hard-surface-device",
    representationMode: "profile-relief-2_5d",
    familyPolicyId: "hard-surface-device",
    matchTokens: ["手机", "phone", "电话", "smartphone"],
    dominantSilhouette: "rect-device-with-screen-face",
    criticalParts: ["device-body", "screen-face", "hang-slot"],
    readOrderTargets: ["device-body", "screen-face", "camera-dot"],
    depthProfile: "thin-slab",
    attachmentPose: "ear-side-front-facing",
    negativeLookalikes: ["generic slab", "plain plate", "token badge"],
    variantCandidates: [deviceVariants[1], deviceVariants[0], deviceVariants[2]].filter(
      (variant): variant is PromptCustomizationBlueprintVariant => Boolean(variant),
    ),
    dominantContour: "device-screen-forward",
    sideDepthProfile: "thin-slab",
    partSpanTargets: deviceVariants[1]?.partSpanTargets,
    partDepthTargets: deviceVariants[1]?.partDepthTargets,
    attachmentAnchors: deviceVariants[1]?.attachmentAnchors,
    silhouetteKeepouts: deviceVariants[1]?.silhouetteKeepouts,
    dominantSpanOwner: "device-body",
    outlineProfile: "device-screen-rect",
    reliefFeatureLayout: ["screen-face-inset", "camera-corner-dot"],
    attachmentMask: "top-edge-hidden-loop",
    profileVariantId: "device-profile-screen-forward",
  },
  {
    referenceId: "ref-rocket-compact",
    requestedNoun: "火箭",
    normalizedNoun: "火箭",
    objectCategory: "vehicle",
    imagePaths: [
      "/reference-blueprints/vehicle-front.svg",
      "/reference-blueprints/vehicle-side.svg",
    ],
    sourceKind: "multi-view",
    referenceConfidence: 0.9,
    blueprintFamily: "hard-surface-vehicle",
    matchTokens: ["火箭", "rocket", "飞船"],
    dominantSilhouette: "rocket-spine-with-nose-and-fin",
    criticalParts: ["rocket-body", "rocket-nose", "rocket-fin", "rocket-nozzle"],
    readOrderTargets: ["rocket-body", "rocket-nose", "rocket-fin"],
    depthProfile: "front-loaded",
    attachmentPose: "ear-side-top-hook",
    negativeLookalikes: ["long bar", "cylinder token", "generic spike"],
    variantCandidates: vehicleVariants,
  },
  {
    referenceId: "ref-tool-compact",
    requestedNoun: "工具",
    normalizedNoun: "工具",
    objectCategory: "tool",
    imagePaths: [
      "/reference-blueprints/device-front.svg",
      "/reference-blueprints/device-side.svg",
    ],
    sourceKind: "silhouette-only",
    referenceConfidence: 0.82,
    blueprintFamily: "hard-surface-device",
    matchTokens: ["工具", "tool", "锤", "剪刀", "扳手"],
    dominantSilhouette: "compact-tool-with-handle-and-head",
    criticalParts: ["tool-body", "tool-head", "hang-slot"],
    readOrderTargets: ["tool-body", "tool-head", "hang-slot"],
    depthProfile: "balanced",
    attachmentPose: "ear-side-drop",
    negativeLookalikes: ["generic slab", "badge token", "random block"],
    variantCandidates: deviceVariants,
  },
];

function scoreReferenceMatch(entry: HardSurfaceReferenceCacheEntry, normalizedNoun: string) {
  if (!normalizedNoun) {
    return 0;
  }

  if (entry.normalizedNoun === normalizedNoun) {
    return 3;
  }

  if (entry.matchTokens.includes(normalizedNoun)) {
    return 2;
  }

  if (entry.matchTokens.some((token) => normalizedNoun.includes(token) || token.includes(normalizedNoun))) {
    return 1;
  }

  return 0;
}

export function resolveHardSurfaceReferenceAsset(options: {
  normalizedNoun?: string;
  runtimeShapeClass?: PromptCustomizationRuntimeShapeClass;
  objectCategory?: PromptCustomizationObjectCategory;
}) {
  const normalizedNoun = options.normalizedNoun?.trim().toLowerCase() ?? "";
  const ranked = hardSurfaceReferenceCache
    .map((entry) => {
      let score = scoreReferenceMatch(entry, normalizedNoun);
      if (
        options.runtimeShapeClass === "camera-charm" &&
        entry.referenceId === "ref-camera-compact"
      ) {
        score += 2;
      }
      if (
        options.runtimeShapeClass === "boat-charm" &&
        entry.referenceId === "ref-boat-charm"
      ) {
        score += 2;
      }
      if (
        options.runtimeShapeClass === "rocket-charm" &&
        entry.referenceId === "ref-rocket-compact"
      ) {
        score += 2;
      }
      if (
        options.runtimeShapeClass === "device-generic-charm" &&
        entry.blueprintFamily === "hard-surface-device"
      ) {
        score += 1;
      }
      if (
        options.runtimeShapeClass === "vehicle-generic-charm" &&
        entry.blueprintFamily === "hard-surface-vehicle"
      ) {
        score += 1;
      }
      if (options.objectCategory && entry.objectCategory === options.objectCategory) {
        score += 0.5;
      }

      return { entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.entry;
}

export function resolveHardSurfaceReferenceAssetById(referenceId: string) {
  return hardSurfaceReferenceCache.find((entry) => entry.referenceId === referenceId);
}

export function buildReferenceDerivedBlueprint(
  entry: HardSurfaceReferenceCacheEntry,
  requestedNoun: string,
): PromptCustomizationReferenceDerivedBlueprint {
  return {
    referenceId: entry.referenceId,
    requestedNoun,
    blueprintFamily: entry.blueprintFamily,
    representationMode: entry.representationMode,
    familyPolicyId: entry.familyPolicyId,
    dominantSilhouette: entry.dominantSilhouette,
    criticalParts: [...entry.criticalParts],
    readOrderTargets: [...entry.readOrderTargets],
    depthProfile: entry.depthProfile,
    attachmentPose: entry.attachmentPose,
    negativeLookalikes: [...entry.negativeLookalikes],
    variantCandidates: entry.variantCandidates.map((variant) => ({
      ...variant,
      readOrderHints: [...variant.readOrderHints],
      negativeLookalikes: [...variant.negativeLookalikes],
      partSpanTargets: Array.isArray(variant.partSpanTargets)
        ? variant.partSpanTargets.map((target) => ({ ...target }))
        : undefined,
      partDepthTargets: Array.isArray(variant.partDepthTargets)
        ? variant.partDepthTargets.map((target) => ({ ...target }))
        : undefined,
      attachmentAnchors: Array.isArray(variant.attachmentAnchors)
        ? variant.attachmentAnchors.map((anchor) => ({
            ...anchor,
            preferredOffset: Array.isArray(anchor.preferredOffset)
              ? [...anchor.preferredOffset]
              : undefined,
          }))
        : undefined,
      silhouetteKeepouts: Array.isArray(variant.silhouetteKeepouts)
        ? variant.silhouetteKeepouts.map((keepout) => ({ ...keepout }))
        : undefined,
      outlineProfile: variant.outlineProfile,
      reliefFeatureLayout: Array.isArray(variant.reliefFeatureLayout)
        ? [...variant.reliefFeatureLayout]
        : undefined,
      attachmentMask: variant.attachmentMask,
      profileVariantId: variant.profileVariantId,
      representationMode: variant.representationMode,
      familyPolicyId: variant.familyPolicyId,
    })),
    sourceKind: entry.sourceKind,
    dominantContour: entry.dominantContour,
    sideDepthProfile: entry.sideDepthProfile,
    partSpanTargets: Array.isArray(entry.partSpanTargets)
      ? entry.partSpanTargets.map((target) => ({ ...target }))
      : undefined,
    partDepthTargets: Array.isArray(entry.partDepthTargets)
      ? entry.partDepthTargets.map((target) => ({ ...target }))
      : undefined,
    attachmentAnchors: Array.isArray(entry.attachmentAnchors)
      ? entry.attachmentAnchors.map((anchor) => ({
          ...anchor,
          preferredOffset: Array.isArray(anchor.preferredOffset)
            ? [...anchor.preferredOffset]
            : undefined,
        }))
      : undefined,
    silhouetteKeepouts: Array.isArray(entry.silhouetteKeepouts)
      ? entry.silhouetteKeepouts.map((keepout) => ({ ...keepout }))
      : undefined,
    dominantSpanOwner: entry.dominantSpanOwner,
    outlineProfile: entry.outlineProfile,
    reliefFeatureLayout: Array.isArray(entry.reliefFeatureLayout)
      ? [...entry.reliefFeatureLayout]
      : undefined,
    attachmentMask: entry.attachmentMask,
    profileVariantId: entry.profileVariantId,
    outlineCompilerMode:
      entry.familyPolicyId === "hard-surface-device"
        ? "device-front-facing"
        : entry.familyPolicyId === "hard-surface-boat" ||
            entry.familyPolicyId === "hard-surface-vehicle"
          ? "vehicle-upright-outline"
          : undefined,
    outlineProjectionVariantId: entry.profileVariantId,
  };
}

export function getBlueprintFamilyFallback(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass | undefined,
  objectCategory: PromptCustomizationObjectCategory | undefined,
): PromptCustomizationHardSurfaceBlueprintFamily | undefined {
  if (
    runtimeShapeClass === "camera-charm" ||
    runtimeShapeClass === "device-generic-charm" ||
    objectCategory === "device" ||
    objectCategory === "tool"
  ) {
    return "hard-surface-device";
  }

  if (
    runtimeShapeClass === "boat-charm" ||
    runtimeShapeClass === "rocket-charm" ||
    runtimeShapeClass === "vehicle-generic-charm" ||
    objectCategory === "vehicle"
  ) {
    return "hard-surface-vehicle";
  }

  return undefined;
}

export { hardSurfaceReferenceCache };

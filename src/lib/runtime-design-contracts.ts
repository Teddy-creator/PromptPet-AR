import type { PromptCustomizationAccessoryAnchor } from "./generation-types";
import type {
  RuntimeCapability,
  RuntimeCapabilityBundle,
  RuntimeDesignContract,
} from "../types/runtime-capabilities";

type ResolveRuntimeDesignContractInput = {
  capabilityBundle?: RuntimeCapabilityBundle | null;
  requestedNoun?: string | null;
  anchor?: PromptCustomizationAccessoryAnchor | string | null;
};

const chestWrapRequiredCapabilities: RuntimeCapability[] = [
  "host-coupled",
  "chest-wrap",
];
const chestRigidFrontRequiredCapabilities: RuntimeCapability[] = [
  "host-coupled",
  "front-readable",
  "rigid-body",
];

function uniqueStrings(values: Array<string | null | undefined>) {
  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim()),
    ),
  ];
}

function hasRequiredCapabilities(
  capabilityBundle: RuntimeCapabilityBundle | null | undefined,
  requiredCapabilities: RuntimeCapability[],
) {
  if (!capabilityBundle) {
    return false;
  }

  return requiredCapabilities.every((capability) =>
    capabilityBundle.capabilities.includes(capability),
  );
}

function normalizeChestWrapPrimaryReadTarget(requestedNoun: string | null | undefined) {
  const normalized =
    typeof requestedNoun === "string" && requestedNoun.trim()
      ? requestedNoun.trim()
      : "";

  if (!normalized) {
    return "scarf";
  }

  if (/围巾|scarf/i.test(normalized)) {
    return "scarf";
  }

  return normalized;
}

function normalizeChestRigidPrimaryReadTarget(requestedNoun: string | null | undefined) {
  const normalized =
    typeof requestedNoun === "string" && requestedNoun.trim()
      ? requestedNoun.trim()
      : "";

  return normalized || "rigid-chest-accessory";
}

function isChestFrontAnchor(
  anchor: PromptCustomizationAccessoryAnchor | string | null | undefined,
) {
  return (
    anchor === "chest" ||
    anchor === "chest-center" ||
    anchor === "chest-left" ||
    anchor === "chest-right"
  );
}

function isChestRigidFrontReadableCandidate(
  capabilityBundle: RuntimeCapabilityBundle | null | undefined,
) {
  if (!capabilityBundle) {
    return false;
  }

  return (
    capabilityBundle.anchorClass === "chest-front" &&
    hasRequiredCapabilities(
      capabilityBundle,
      chestRigidFrontRequiredCapabilities,
    ) &&
    !capabilityBundle.capabilities.includes("chest-wrap")
  );
}

function resolveChestRigidFrontProfile(
  capabilityBundle: RuntimeCapabilityBundle | null | undefined,
) {
  const runtimeShapeClass = capabilityBundle?.runtimeShapeClass;

  if (
    runtimeShapeClass === "camera-charm" ||
    runtimeShapeClass === "device-generic-charm"
  ) {
    return {
      profileId: "device-front",
      compositionEnvelope:
        "胸前正面先读到 device-body / front face，主体保持居中贴胸，不得退化成耳侧微型吊件或 generic slab。",
      anchorReferenceOffset: [0, 0.0046, 0.0026] as [number, number, number],
      desiredPlacementOffset: [0, 0.0022, -0.0062] as [number, number, number],
      anchorFitPolicy: {
        blendWeights: [0.9, 0.98, 0.92] as [number, number, number],
        maxDeltas: [0.03, 0.024, 0.028] as [number, number, number],
      },
      hostFitEnvelope: {
        anchorEnvelope: [0.036, 0.02, 0.036] as [number, number, number],
        maxSpan: [0.044, 0.024, 0.044] as [number, number, number],
        preferredYaw: 0,
        screenFacingBias: 0.99,
        faceIntrusionBudget: 0.04,
        eyeKeepout: true,
        earClearance: 0.016,
      },
      notes: [
        "胸前刚性件允许比 ear-side micro-hang 更大的 front span，但必须保持 face-safe。",
        "host-fit 不能再沿用耳侧设备的小型挂件包络，否则只会在 generic slab 与压脸之间来回震荡。",
      ],
    };
  }

  if (
    runtimeShapeClass === "badge" ||
    capabilityBundle?.capabilities.includes("flat-face-readable")
  ) {
    return {
      profileId: "flat-front",
      compositionEnvelope:
        "胸前正面先读到 flat front piece 的主体面，轮廓应贴胸居中，不得变成耳侧挂牌或压扁 token。",
      anchorReferenceOffset: [0, 0.0042, 0.0022] as [number, number, number],
      desiredPlacementOffset: [0, 0.0024, -0.0066] as [number, number, number],
      anchorFitPolicy: {
        blendWeights: [0.92, 0.98, 0.9] as [number, number, number],
        maxDeltas: [0.028, 0.022, 0.026] as [number, number, number],
      },
      hostFitEnvelope: {
        anchorEnvelope: [0.034, 0.016, 0.034] as [number, number, number],
        maxSpan: [0.04, 0.02, 0.04] as [number, number, number],
        preferredYaw: 0,
        screenFacingBias: 0.995,
        faceIntrusionBudget: 0.035,
        eyeKeepout: true,
        earClearance: 0.016,
      },
      notes: [
        "胸前 flat-face 件必须优先保住 front face 的首读，不允许被挂点或边角抢掉轮廓。",
      ],
    };
  }

  return {
    profileId: "generic-rigid-front",
    compositionEnvelope:
      "胸前正面先读到主体 front-readable 轮廓，整体保持居中贴胸，不得退化成 generic slab 或耳侧吊件比例。",
    anchorReferenceOffset: [0, 0.0044, 0.0024] as [number, number, number],
    desiredPlacementOffset: [0, 0.0022, -0.006] as [number, number, number],
    anchorFitPolicy: {
      blendWeights: [0.9, 0.97, 0.9] as [number, number, number],
      maxDeltas: [0.029, 0.023, 0.027] as [number, number, number],
    },
    hostFitEnvelope: {
      anchorEnvelope: [0.035, 0.018, 0.035] as [number, number, number],
      maxSpan: [0.042, 0.022, 0.042] as [number, number, number],
      preferredYaw: 0,
      screenFacingBias: 0.985,
      faceIntrusionBudget: 0.04,
      eyeKeepout: true,
      earClearance: 0.016,
    },
    notes: [
      "胸前 rigid/front-readable 件必须优先满足 front-readable，再做微调。",
    ],
  };
}

function buildChestWrapRuntimeDesignContract(
  requestedNoun: string | null | undefined,
): RuntimeDesignContract {
  return {
    contractId: "host-coupled-chest-wrap/v1",
    capabilityClass: "host-coupled-chest-wrap",
    requiredCapabilities: chestWrapRequiredCapabilities,
    primaryReadTarget: normalizeChestWrapPrimaryReadTarget(requestedNoun),
    requiredVisibleParts: ["wrap-band", "knot", "tail-left", "tail-right"],
    hostNoGoZones: ["eye-band", "face-core", "nose-zone"],
    compositionEnvelope:
      "胸前正面先读到 wrap-band 与中心 knot，双尾从 knot 下方落下，整体不得退化成一条黑色胸条。",
    targetAttachmentPose: "chest-forward",
    anchorReferenceOffset: [0, 0.0042, 0.0018],
    desiredPlacementOffset: [0, 0.0018, -0.0048],
    anchorFitPolicy: {
      blendWeights: [0.82, 0.92, 0.76],
      maxDeltas: [0.028, 0.018, 0.022],
    },
    hostFitEnvelope: {
      anchorEnvelope: [0.04, 0.015, 0.028],
      maxSpan: [0.048, 0.017, 0.034],
      preferredYaw: 0,
      screenFacingBias: 0.98,
      faceIntrusionBudget: 0.06,
      eyeKeepout: true,
      earClearance: 0.016,
    },
    faceKeepoutZones: [
      { zoneId: "eye-band", label: "眼睛区域", severity: "hard" },
      { zoneId: "face-core", label: "面部主轮廓", severity: "hard" },
      { zoneId: "nose-zone", label: "鼻口区域", severity: "soft" },
    ],
    partRootingRules: [
      { partId: "knot", parentPartId: "wrap-band", rule: "rooted-to-parent" },
      { partId: "tail-left", parentPartId: "knot", rule: "emerge-from-parent" },
      { partId: "tail-right", parentPartId: "knot", rule: "emerge-from-parent" },
    ],
    criticalViewGoals: [
      "front / 3/4 第一眼必须读成 scarf，而不是 chest bar。",
      "knot 必须保持可读，并作为双尾的共同根部。",
      "tail-left / tail-right 必须从 knot 下缘出现，且不得侵入 face-outline。",
    ],
    notes: uniqueStrings([
      "host-fit 先服务 front-readable，再做细小偏移微调。",
      "face-safe 是 hard constraint，不允许用压缩到胸前黑条的方式换取不遮脸。",
    ]),
  };
}

function buildChestRigidFrontRuntimeDesignContract(
  requestedNoun: string | null | undefined,
  capabilityBundle: RuntimeCapabilityBundle | null | undefined,
): RuntimeDesignContract {
  const profile = resolveChestRigidFrontProfile(capabilityBundle);

  return {
    contractId: `host-coupled-chest-rigid-front-readable/v1:${profile.profileId}`,
    capabilityClass: "host-coupled-chest-rigid-front-readable",
    requiredCapabilities: chestRigidFrontRequiredCapabilities,
    primaryReadTarget: normalizeChestRigidPrimaryReadTarget(requestedNoun),
    hostNoGoZones: ["eye-band", "face-core", "nose-zone"],
    compositionEnvelope: profile.compositionEnvelope,
    targetAttachmentPose: "chest-forward-readable",
    anchorReferenceOffset: profile.anchorReferenceOffset,
    desiredPlacementOffset: profile.desiredPlacementOffset,
    anchorFitPolicy: profile.anchorFitPolicy,
    hostFitEnvelope: profile.hostFitEnvelope,
    faceKeepoutZones: [
      { zoneId: "eye-band", label: "眼睛区域", severity: "hard" },
      { zoneId: "face-core", label: "面部主轮廓", severity: "hard" },
      { zoneId: "nose-zone", label: "鼻口区域", severity: "hard" },
    ],
    criticalViewGoals: [
      "front / 3/4 第一眼必须先读到主体正面，而不是挂点、侧边或 generic slab。",
      "胸前刚性件必须保持 screen-facing / front-readable，不得沿 ear-side micro-hang 的比例退化。",
      "face-safe 是 hard constraint，不能靠侵入眼区、鼻口区来换取首读。",
    ],
    notes: uniqueStrings([
      "胸前 rigid/front-readable contract 用于 badge / camera / device 等正面可读件。",
      ...profile.notes,
    ]),
  };
}

export function resolveRuntimeDesignContract(
  input: ResolveRuntimeDesignContractInput,
): RuntimeDesignContract | undefined {
  if (!isChestFrontAnchor(input.anchor)) {
    return undefined;
  }

  if (!hasRequiredCapabilities(input.capabilityBundle, chestWrapRequiredCapabilities)) {
    if (isChestRigidFrontReadableCandidate(input.capabilityBundle)) {
      return buildChestRigidFrontRuntimeDesignContract(
        input.requestedNoun,
        input.capabilityBundle,
      );
    }

    return undefined;
  }

  return buildChestWrapRuntimeDesignContract(input.requestedNoun);
}

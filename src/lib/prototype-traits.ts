import type {
  PromptCustomizationAccessoryAnchor,
  PromptCustomizationAccessoryFamily,
  PromptCustomizationAccessoryRequest,
  PromptCustomizationObjectCategory,
  PromptCustomizationRuntimeDesignTask,
  PromptCustomizationRuntimeShapeClass,
} from "./generation-types";
import type {
  PromptSemanticContractV2,
  PrototypeCandidate,
  SemanticTrait,
} from "../types/prototype-traits";

type SemanticRuntimeTaskInput = Pick<
  PromptCustomizationRuntimeDesignTask,
  | "requestId"
  | "requestedNoun"
  | "runtimeShapeClass"
  | "objectCategory"
  | "negativeLookalikes"
> | null;

type SemanticRequestInput = Pick<
  PromptCustomizationAccessoryRequest,
  | "requestId"
  | "requestedNoun"
  | "requestedLabel"
  | "shapeLabel"
  | "label"
  | "family"
  | "anchor"
  | "objectCategory"
  | "sourceText"
>;

type PrototypeLexiconEntry = {
  id: string;
  confidence: number;
  tokens: string[];
  traits: SemanticTrait[];
  aliases?: Array<{
    id: string;
    confidence: number;
  }>;
};

const nounPrototypeLexicon: PrototypeLexiconEntry[] = [
  {
    id: "cup",
    confidence: 0.92,
    tokens: ["水杯", "杯子", "杯", "cup"],
    traits: ["rigid", "open-top", "cylindrical"],
    aliases: [{ id: "mug", confidence: 0.74 }],
  },
  {
    id: "mug",
    confidence: 0.94,
    tokens: ["马克杯", "茶缸", "mug"],
    traits: ["rigid", "open-top", "cylindrical", "has-handle"],
    aliases: [{ id: "cup", confidence: 0.76 }],
  },
  {
    id: "bottle",
    confidence: 0.92,
    tokens: ["水瓶", "香水瓶", "药瓶", "瓶子", "瓶", "bottle"],
    traits: ["rigid", "closed-top", "cylindrical"],
  },
  {
    id: "camera",
    confidence: 0.96,
    tokens: ["相机", "照相机", "拍立得", "单反", "胶卷机", "camera"],
    traits: ["rigid", "flat-face"],
  },
  {
    id: "flat-badge",
    confidence: 0.95,
    tokens: ["徽章", "胸章", "校徽", "徽记", "badge"],
    traits: ["rigid", "flat-face"],
  },
  {
    id: "scarf",
    confidence: 0.95,
    tokens: ["围巾", "小围巾", "围脖", "领巾", "披肩", "scarf"],
    traits: ["soft", "chest-safe"],
  },
  {
    id: "boat",
    confidence: 0.94,
    tokens: ["小船", "船", "小艇", "艇", "独木舟", "舟", "boat", "ship"],
    traits: ["rigid"],
  },
  {
    id: "rocket",
    confidence: 0.94,
    tokens: ["火箭", "飞船", "rocket"],
    traits: ["rigid"],
  },
  {
    id: "tool-head",
    confidence: 0.84,
    tokens: ["钥匙", "锤", "锚", "剪刀", "扳手", "工具", "key", "tool"],
    traits: ["rigid"],
  },
  {
    id: "flower",
    confidence: 0.95,
    tokens: ["小花", "花朵", "花", "雏菊", "flower"],
    traits: ["soft"],
  },
  {
    id: "clover-charm",
    confidence: 0.96,
    tokens: ["四叶草", "苜蓿", "clover"],
    traits: ["flat-face"],
  },
  {
    id: "star",
    confidence: 0.96,
    tokens: ["星星", "五角星", "星形", "星", "star"],
    traits: ["flat-face", "ear-safe"],
  },
];

const runtimeShapePrototypeMap: Partial<
  Record<PromptCustomizationRuntimeShapeClass, PrototypeCandidate[]>
> = {
  "camera-charm": [
    {
      id: "camera",
      confidence: 0.93,
      source: "rule-fallback",
    },
  ],
  "boat-charm": [
    {
      id: "boat",
      confidence: 0.93,
      source: "rule-fallback",
    },
  ],
  "rocket-charm": [
    {
      id: "rocket",
      confidence: 0.93,
      source: "rule-fallback",
    },
  ],
  badge: [
    {
      id: "flat-badge",
      confidence: 0.92,
      source: "rule-fallback",
    },
  ],
  scarf: [
    {
      id: "scarf",
      confidence: 0.93,
      source: "rule-fallback",
    },
  ],
  flower: [
    {
      id: "flower",
      confidence: 0.93,
      source: "rule-fallback",
    },
  ],
  "clover-charm": [
    {
      id: "clover-charm",
      confidence: 0.93,
      source: "rule-fallback",
    },
  ],
  star: [
    {
      id: "star",
      confidence: 0.93,
      source: "rule-fallback",
    },
  ],
};

const familyPrototypeMap: Partial<
  Record<PromptCustomizationAccessoryFamily, PrototypeCandidate[]>
> = {
  badge: [
    {
      id: "flat-badge",
      confidence: 0.92,
      source: "rule-fallback",
    },
  ],
  scarf: [
    {
      id: "scarf",
      confidence: 0.92,
      source: "rule-fallback",
    },
  ],
  flower: [
    {
      id: "flower",
      confidence: 0.92,
      source: "rule-fallback",
    },
  ],
  "clover-charm": [
    {
      id: "clover-charm",
      confidence: 0.92,
      source: "rule-fallback",
    },
  ],
  star: [
    {
      id: "star",
      confidence: 0.92,
      source: "rule-fallback",
    },
  ],
};

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function uniqueTraits(values: Array<SemanticTrait | null | undefined>) {
  return [...new Set(values.filter((value): value is SemanticTrait => Boolean(value)))];
}

function mergePrototypeCandidate(
  candidateMap: Map<string, PrototypeCandidate>,
  candidate: PrototypeCandidate,
) {
  const existing = candidateMap.get(candidate.id);

  if (!existing || candidate.confidence > existing.confidence) {
    candidateMap.set(candidate.id, candidate);
  }
}

function buildSemanticSourceText(
  request: SemanticRequestInput,
  task: SemanticRuntimeTaskInput,
) {
  return uniqueStrings([
    task?.requestedNoun,
    request.requestedNoun,
    request.requestedLabel,
    request.shapeLabel,
    request.label,
    request.sourceText,
  ]).join(" ");
}

function hasAnyToken(text: string, tokens: string[]) {
  const normalizedText = normalizeText(text);

  return tokens.some((token) => normalizedText.includes(normalizeText(token)));
}

function inferPrototypeCandidates(
  request: SemanticRequestInput,
  task: SemanticRuntimeTaskInput,
): PrototypeCandidate[] {
  const candidateMap = new Map<string, PrototypeCandidate>();
  const normalizedText = buildSemanticSourceText(request, task);

  const runtimeShapeClass = task?.runtimeShapeClass;
  if (runtimeShapeClass) {
    for (const candidate of runtimeShapePrototypeMap[runtimeShapeClass] ?? []) {
      mergePrototypeCandidate(candidateMap, candidate);
    }
  }

  for (const candidate of familyPrototypeMap[request.family] ?? []) {
    mergePrototypeCandidate(candidateMap, candidate);
  }

  for (const entry of nounPrototypeLexicon) {
    if (!hasAnyToken(normalizedText, entry.tokens)) {
      continue;
    }

    mergePrototypeCandidate(candidateMap, {
      id: entry.id,
      confidence: entry.confidence,
      source: "retrieval",
    });

    for (const alias of entry.aliases ?? []) {
      mergePrototypeCandidate(candidateMap, {
        id: alias.id,
        confidence: alias.confidence,
        source: "retrieval",
      });
    }
  }

  if (candidateMap.size === 0) {
    mergePrototypeCandidate(candidateMap, {
      id: "generic-ornament",
      confidence: 0.35,
      source: "rule-fallback",
    });
  }

  return [...candidateMap.values()].sort((left, right) => right.confidence - left.confidence);
}

function inferAnchorTraits(anchor: PromptCustomizationAccessoryAnchor) {
  if (
    anchor === "chest" ||
    anchor === "chest-center" ||
    anchor === "chest-left" ||
    anchor === "chest-right"
  ) {
    return ["chest-safe"] as SemanticTrait[];
  }

  if (
    anchor === "left-ear" ||
    anchor === "right-ear" ||
    anchor === "forehead" ||
    anchor === "head-top" ||
    anchor === "back-head"
  ) {
    return ["ear-safe", "micro-hangable"] as SemanticTrait[];
  }

  if (
    anchor === "tail-top" ||
    anchor === "tail-left" ||
    anchor === "tail-right" ||
    anchor === "tail-base"
  ) {
    return ["micro-hangable"] as SemanticTrait[];
  }

  return [];
}

function inferTraitsFromPrototypeIds(
  prototypeIds: string[],
  normalizedText: string,
) {
  const traits: SemanticTrait[] = [];

  if (prototypeIds.includes("cup")) {
    traits.push("rigid", "open-top", "cylindrical");
  }

  if (prototypeIds.includes("mug")) {
    traits.push("rigid", "open-top", "cylindrical");
    if (hasAnyToken(normalizedText, ["马克杯", "mug", "把手"])) {
      traits.push("has-handle");
    }
  }

  if (prototypeIds.includes("bottle")) {
    traits.push("rigid", "closed-top", "cylindrical");
  }

  if (prototypeIds.includes("camera") || prototypeIds.includes("flat-badge")) {
    traits.push("rigid", "flat-face");
  }

  if (
    prototypeIds.includes("boat") ||
    prototypeIds.includes("rocket") ||
    prototypeIds.includes("tool-head")
  ) {
    traits.push("rigid");
  }

  if (prototypeIds.includes("flower")) {
    traits.push("soft");
  }

  if (prototypeIds.includes("scarf")) {
    traits.push("soft", "chest-safe");
  }

  if (prototypeIds.includes("clover-charm")) {
    traits.push("flat-face");
  }

  return traits;
}

function inferTraitsFromCategory(
  objectCategory: PromptCustomizationObjectCategory | undefined,
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass | undefined,
  family: PromptCustomizationAccessoryFamily,
) {
  const traits: SemanticTrait[] = [];

  if (
    objectCategory === "device" ||
    objectCategory === "vehicle" ||
    objectCategory === "tool"
  ) {
    traits.push("rigid");
  }

  if (
    family === "badge" ||
    runtimeShapeClass === "badge" ||
    runtimeShapeClass === "camera-charm"
  ) {
    traits.push("flat-face");
  }

  return traits;
}

function buildNegativeLookalikes(
  request: SemanticRequestInput,
  task: SemanticRuntimeTaskInput,
  requestedNoun: string,
) {
  return uniqueStrings([
    ...(task?.negativeLookalikes ?? []),
    `${requestedNoun} 不能退化成 generic ornament`,
    request.family === "badge" ? "普通圆章" : null,
  ]);
}

export function buildPromptSemanticContractV2(
  request: SemanticRequestInput,
  task: SemanticRuntimeTaskInput,
): PromptSemanticContractV2 {
  const requestedNoun =
    task?.requestedNoun ??
    request.requestedNoun ??
    request.requestedLabel ??
    request.shapeLabel ??
    request.label;
  const prototypeCandidates = inferPrototypeCandidates(request, task);
  const normalizedText = buildSemanticSourceText(request, task);
  const prototypeIds = prototypeCandidates.map((candidate) => candidate.id);
  const objectCategory = task?.objectCategory ?? request.objectCategory;
  const runtimeShapeClass = task?.runtimeShapeClass;

  return {
    requestId: request.requestId,
    requestedNoun,
    prototypeCandidates,
    traits: uniqueTraits([
      ...inferAnchorTraits(request.anchor),
      ...inferTraitsFromPrototypeIds(prototypeIds, normalizedText),
      ...inferTraitsFromCategory(objectCategory, runtimeShapeClass, request.family),
    ]),
    negativeLookalikes: buildNegativeLookalikes(request, task, requestedNoun),
  };
}

export function buildPromptSemanticContractsV2(
  accessoryRequests: PromptCustomizationAccessoryRequest[],
  runtimeDesignTasks: PromptCustomizationRuntimeDesignTask[],
) {
  const taskMap = new Map(runtimeDesignTasks.map((task) => [task.requestId, task]));

  return accessoryRequests
    .filter((request) => request.requestId !== "theme-default-request")
    .map((request) => buildPromptSemanticContractV2(request, taskMap.get(request.requestId) ?? null));
}

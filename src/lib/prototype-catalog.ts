import type {
  PromptCustomizationAccessoryFamily,
  PromptCustomizationObjectCategory,
  PromptCustomizationRuntimeShapeClass,
} from "./generation-types";
import type { SemanticTrait } from "../types/prototype-traits";

export type PrototypeDescriptor = {
  id: string;
  familyHint?: PromptCustomizationAccessoryFamily;
  objectCategory: PromptCustomizationObjectCategory;
  canonicalTraits: SemanticTrait[];
  negativeLookalikes: string[];
  referenceIds: string[];
  matchTokens: string[];
  runtimeShapeClasses?: PromptCustomizationRuntimeShapeClass[];
};

export const prototypeCatalog: PrototypeDescriptor[] = [
  {
    id: "cup",
    objectCategory: "ornament",
    canonicalTraits: ["rigid", "open-top", "cylindrical"],
    negativeLookalikes: ["generic token", "plain capsule", "flat badge"],
    referenceIds: ["canon-ornament-generic"],
    matchTokens: ["水杯", "杯子", "杯", "cup"],
  },
  {
    id: "mug",
    objectCategory: "ornament",
    canonicalTraits: ["rigid", "open-top", "cylindrical", "has-handle"],
    negativeLookalikes: ["generic token", "plain capsule", "flat badge"],
    referenceIds: ["canon-ornament-generic"],
    matchTokens: ["马克杯", "茶缸", "mug", "杯"],
  },
  {
    id: "bottle",
    objectCategory: "ornament",
    canonicalTraits: ["rigid", "closed-top", "cylindrical"],
    negativeLookalikes: ["generic token", "plain tube", "flat badge"],
    referenceIds: ["canon-ornament-generic"],
    matchTokens: ["水瓶", "香水瓶", "药瓶", "瓶子", "瓶", "bottle"],
  },
  {
    id: "camera",
    objectCategory: "device",
    canonicalTraits: ["rigid", "flat-face", "micro-hangable"],
    negativeLookalikes: ["generic slab", "badge block", "silver token"],
    referenceIds: ["ref-camera-compact"],
    matchTokens: ["相机", "照相机", "拍立得", "单反", "胶卷机", "camera"],
    runtimeShapeClasses: ["camera-charm"],
  },
  {
    id: "boat",
    objectCategory: "vehicle",
    canonicalTraits: ["rigid", "micro-hangable"],
    negativeLookalikes: ["long bar", "blue rod", "flat badge"],
    referenceIds: ["ref-boat-charm"],
    matchTokens: ["小船", "小艇", "独木舟", "舟", "船", "boat", "ship"],
    runtimeShapeClasses: ["boat-charm"],
  },
  {
    id: "rocket",
    objectCategory: "vehicle",
    canonicalTraits: ["rigid", "micro-hangable"],
    negativeLookalikes: ["generic slab", "plain capsule", "flat badge"],
    referenceIds: ["ref-rocket-compact"],
    matchTokens: ["火箭", "飞船", "rocket"],
    runtimeShapeClasses: ["rocket-charm"],
  },
  {
    id: "flower",
    familyHint: "flower",
    objectCategory: "botanical",
    canonicalTraits: ["soft", "ear-safe", "micro-hangable"],
    negativeLookalikes: ["ball cluster", "generic puff", "round token"],
    referenceIds: ["canon-flower-ear-side"],
    matchTokens: ["小花", "花", "雏菊", "flower"],
    runtimeShapeClasses: ["flower"],
  },
  {
    id: "clover-charm",
    familyHint: "clover-charm",
    objectCategory: "botanical",
    canonicalTraits: ["flat-face", "ear-safe", "micro-hangable"],
    negativeLookalikes: ["flower ball", "red blob", "generic token"],
    referenceIds: ["canon-clover-ear-side"],
    matchTokens: ["四叶草", "苜蓿", "clover"],
    runtimeShapeClasses: ["clover-charm"],
  },
  {
    id: "star",
    familyHint: "star",
    objectCategory: "symbol",
    canonicalTraits: ["flat-face", "ear-safe", "micro-hangable"],
    negativeLookalikes: ["generic token", "round badge", "plain bar"],
    referenceIds: ["canon-star-ear-side"],
    matchTokens: ["星星", "五角星", "星形", "星", "star"],
    runtimeShapeClasses: ["star"],
  },
  {
    id: "flat-badge",
    familyHint: "badge",
    objectCategory: "symbol",
    canonicalTraits: ["rigid", "flat-face", "chest-safe"],
    negativeLookalikes: ["普通圆章", "generic token", "badge block"],
    referenceIds: ["canon-symbol-generic"],
    matchTokens: ["徽章", "胸章", "校徽", "徽记", "badge"],
    runtimeShapeClasses: ["badge"],
  },
  {
    id: "scarf",
    familyHint: "scarf",
    objectCategory: "ornament",
    canonicalTraits: ["soft", "chest-safe"],
    negativeLookalikes: ["black orb", "generic token", "necktie"],
    referenceIds: ["canon-scarf-chest"],
    matchTokens: ["围巾", "小围巾", "围脖", "领巾", "披肩", "scarf"],
    runtimeShapeClasses: ["scarf"],
  },
  {
    id: "tool-head",
    objectCategory: "tool",
    canonicalTraits: ["rigid", "micro-hangable"],
    negativeLookalikes: ["generic slab", "badge token", "random block"],
    referenceIds: ["ref-tool-compact"],
    matchTokens: ["工具", "tool", "钥匙", "锤", "锚", "剪刀", "扳手"],
    runtimeShapeClasses: ["device-generic-charm"],
  },
  {
    id: "generic-ornament",
    familyHint: "generic-ornament",
    objectCategory: "ornament",
    canonicalTraits: ["micro-hangable"],
    negativeLookalikes: ["large slab", "box token", "random block"],
    referenceIds: ["canon-ornament-generic"],
    matchTokens: [],
    runtimeShapeClasses: ["generic-ornament"],
  },
];

export function getPrototypeDescriptor(id: string) {
  return prototypeCatalog.find((entry) => entry.id === id) ?? null;
}

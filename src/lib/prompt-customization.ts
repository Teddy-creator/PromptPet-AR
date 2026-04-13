import "server-only";

import {
  detectFoxThemeSlot,
  getFoxAccessoryLabel,
  getFoxThemeDefaultAccessory,
  getFoxThemeLabel,
} from "./fox-theme-variants";
import {
  buildReferenceDerivedBlueprint,
  getBlueprintFamilyFallback,
  resolveHardSurfaceReferenceAssetById,
  resolveHardSurfaceReferenceAsset,
} from "../data/hard-surface-reference-cache";
import {
  resolveCanonicalBlueprint,
  resolveCanonicalBlueprintByReferenceId,
} from "../data/canonical-blueprint-cache";
import { buildPromptSemanticContractsV2 } from "./prototype-traits";
import { attachRetrievalMatchesToSemanticContracts } from "./prototype-retrieval";
import { getPrototypeDescriptor } from "./prototype-catalog";
import { getPrototypeRuntimePack } from "./prototype-runtime-packs";
import { resolveRuntimeCapabilityBundle } from "./runtime-capability-resolver";
import { resolveRuntimeDesignContract } from "./runtime-design-contracts";
import {
  prototypeCandidateSources,
  semanticTraits,
} from "../types/prototype-traits";
import {
  applyLlmRequestConfigToEnv,
  getAiProviderLabel,
  resolveLlmProviderConfig,
  shouldUseResponsesApi,
} from "./llm/provider-routing";
import type {
  CreateGenerationInput,
  CustomizationProfile,
  CustomizationParserSource,
  GenerationCustomizationSummary,
  GenerationMode,
  PromptCustomizationAssemblySegment,
  PromptCustomizationAccessoryCustomization,
  PromptCustomizationAccessoryAnchor,
  PromptCustomizationAccessoryFamily,
  PromptCustomizationAccessoryPartGraph,
  PromptCustomizationAttachmentRule,
  PromptCustomizationDesignArchetype,
  PromptCustomizationDeformationPolicy,
  PromptCustomizationFamilyResolutionSource,
  PromptCustomizationAccessoryInstance,
  PromptCustomizationAccessoryOperation,
  PromptCustomizationAccessoryPolicy,
  PromptCustomizationAccessoryRequest,
  PromptCustomizationAccessorySemanticClass,
  PromptCustomizationNounDesignBrief,
  PromptCustomizationObjectCategory,
  PromptCustomizationBodyCustomization,
  PromptCustomizationColorOverride,
  PromptCustomizationColorSlot,
  PromptCustomizationCompilerIntent,
  PromptCustomizationCanonicalBlueprintFamily,
  PromptCustomizationCreationSource,
  PromptCustomizationExecutionScorecard,
  PromptCustomizationExecutionStatus,
  PromptCustomizationGeometryRecipe,
  PromptCustomizationGeneratedAccessory,
  PromptCustomizationGeneratedAccessoryKind,
  PromptCustomizationLocalTweak,
  PromptCustomizationMountStrategy,
  PromptCustomizationNormalizedSemanticRecipe,
  PromptCustomizationPartProfile,
  PromptCustomizationParsedIntent,
  PromptCustomizationPrimarySilhouette,
  PromptCustomizationRecipe,
  PromptCustomizationRefinementStage,
  PromptCustomizationResolvedAccessoryExecution,
  PromptCustomizationResolvedExecutionPlan,
  PromptCustomizationRepairActionType,
  PromptCustomizationRuntimeDesignSource,
  PromptCustomizationRuntimeDesignContract,
  PromptCustomizationRuntimeDesignTask,
  PromptCustomizationRuntimeCapabilityBundle,
  PromptCustomizationRuntimeShapeClass,
  PromptCustomizationReferencePack,
  PromptCustomizationSilhouetteBlock,
  PromptCustomizationStructuralBlueprint,
  PromptCustomizationSymmetryPolicy,
  PromptCustomizationReferenceDerivedBlueprint,
  PromptCustomizationReferenceSourceMode,
  StyleTemplate,
} from "./generation-types";
import type { LlmProvider, LlmProviderConfig } from "./llm/provider-types";
import type {
  PromptSemanticContractV2,
  PrototypeCandidate,
  SemanticTrait,
} from "../types/prototype-traits";

const generationModeLabels: Record<GenerationMode, string> = {
  "fast-stable": "快速稳定模式",
  "dynamic-custom": "动态定制模式",
};

const customizationProfileLabels: Record<CustomizationProfile, string> = {
  "safe-overlay": "稳定定制",
  "experimental-addon": "实验定制",
};

const parserSourceLabels: Record<CustomizationParserSource, string> = {
  openai: "OpenAI 结构化解析",
  deepseek: "DeepSeek 结构化解析",
  "rule-fallback": "规则回退解析",
};

const themeKeywords: Record<string, string[]> = {
  "night-glow": ["夜", "月光", "星光", "发光", "霓虹", "glow", "aurora", "梦幻"],
  "cream-toy": ["奶油", "玩具", "盲盒", "树脂", "软萌", "cream", "toy"],
  "forest-scout": ["森林", "巡游", "探险", "冒险", "forest", "scout", "moss"],
  "lucky-charm": ["幸运", "守护", "开运", "护符", "lucky", "charm"],
  "strawberry-sweet": ["草莓", "甜点", "莓果", "甜", "strawberry", "berry"],
};

type ColorPreset = {
  label: string;
  keywords: string[];
  colors: Record<PromptCustomizationColorSlot, string>;
};

const colorPresets: ColorPreset[] = [
  {
    label: "亮橙色",
    keywords: ["亮橙", "暖橙"],
    colors: {
      bodyColor: "#FFA03A",
      detailColor: "#FFF5E8",
      accentColor: "#C36B18",
      glowColor: "#FFD08A",
      accessoryColor: "#E07B1F",
    },
  },
  {
    label: "荧光橙",
    keywords: ["荧光橙", "亮橘", "neon orange"],
    colors: {
      bodyColor: "#FF8F1F",
      detailColor: "#FFF4E5",
      accentColor: "#C85B0B",
      glowColor: "#FFD089",
      accessoryColor: "#E06E18",
    },
  },
  {
    label: "橙色",
    keywords: ["橙色", "橘色", "orange"],
    colors: {
      bodyColor: "#F28A2E",
      detailColor: "#FFF3E7",
      accentColor: "#B85A1E",
      glowColor: "#FFB46D",
      accessoryColor: "#D46C24",
    },
  },
  {
    label: "橘红色",
    keywords: ["橘红色", "橘红", "橙红色", "橙红", "orange-red", "coral"],
    colors: {
      bodyColor: "#F06A2A",
      detailColor: "#FFF2E8",
      accentColor: "#B5331F",
      glowColor: "#FF9A5C",
      accessoryColor: "#C53B21",
    },
  },
  {
    label: "紫红色",
    keywords: ["紫红色", "紫红", "洋红", "玫红", "magenta", "fuchsia"],
    colors: {
      bodyColor: "#C04578",
      detailColor: "#FFF1F6",
      accentColor: "#6D1B41",
      glowColor: "#FF9DCA",
      accessoryColor: "#9C2A60",
    },
  },
  {
    label: "大红色",
    keywords: ["大红色", "正红色", "正红", "深红", "红色", "red", "crimson"],
    colors: {
      bodyColor: "#E14836",
      detailColor: "#FFF1EE",
      accentColor: "#99131D",
      glowColor: "#FF7A74",
      accessoryColor: "#B31E2A",
    },
  },
  {
    label: "蓝白色",
    keywords: ["蓝白", "蓝白色", "azure", "blue-white"],
    colors: {
      bodyColor: "#8FBFE6",
      detailColor: "#FAFCFF",
      accentColor: "#587BAC",
      glowColor: "#A9E7FF",
      accessoryColor: "#5B84BD",
    },
  },
  {
    label: "蓝色",
    keywords: ["蓝色", "蓝", "blue"],
    colors: {
      bodyColor: "#5F90DA",
      detailColor: "#F3F7FF",
      accentColor: "#315A97",
      glowColor: "#9DC8FF",
      accessoryColor: "#426CB2",
    },
  },
  {
    label: "银灰色",
    keywords: ["银灰", "银灰色", "银色", "silver", "gray", "grey"],
    colors: {
      bodyColor: "#B8BEC6",
      detailColor: "#F2F3F5",
      accentColor: "#6F7885",
      glowColor: "#D6DEFF",
      accessoryColor: "#7E8695",
    },
  },
  {
    label: "玫瑰粉",
    keywords: ["玫瑰粉", "粉色", "rose", "pink"],
    colors: {
      bodyColor: "#DB9DA4",
      detailColor: "#F8E4E2",
      accentColor: "#8D4E5E",
      glowColor: "#FFB0C8",
      accessoryColor: "#B76173",
    },
  },
  {
    label: "荧光粉",
    keywords: ["荧光粉", "亮粉", "neon pink"],
    colors: {
      bodyColor: "#FF74C8",
      detailColor: "#FFF1FA",
      accentColor: "#B7337F",
      glowColor: "#FFC5F1",
      accessoryColor: "#E34FB3",
    },
  },
  {
    label: "莓果粉",
    keywords: ["莓果粉", "草莓粉", "berry-pink", "strawberry-pink"],
    colors: {
      bodyColor: "#DEA1AC",
      detailColor: "#FFF2F5",
      accentColor: "#B45E72",
      glowColor: "#FFC0D7",
      accessoryColor: "#ED819D",
    },
  },
  {
    label: "奶油白",
    keywords: ["奶油白", "奶白", "乳白", "cream white", "ivory"],
    colors: {
      bodyColor: "#F5EBDD",
      detailColor: "#FFF9F1",
      accentColor: "#D8C5AF",
      glowColor: "#FFF6D9",
      accessoryColor: "#E7D4BE",
    },
  },
  {
    label: "薰衣草紫",
    keywords: ["紫色", "薰衣草紫", "lavender", "violet"],
    colors: {
      bodyColor: "#B59DDC",
      detailColor: "#F5ECFB",
      accentColor: "#7658B8",
      glowColor: "#D7B8FF",
      accessoryColor: "#8B6DCE",
    },
  },
  {
    label: "荧光绿",
    keywords: ["荧光绿", "亮绿", "霓虹绿", "青柠绿", "lime green", "neon green"],
    colors: {
      bodyColor: "#71D84E",
      detailColor: "#F4FFF0",
      accentColor: "#2E8B38",
      glowColor: "#C5FF8A",
      accessoryColor: "#4ECA54",
    },
  },
  {
    label: "绿色",
    keywords: ["绿色", "翠绿", "green"],
    colors: {
      bodyColor: "#55B36F",
      detailColor: "#F2FBF4",
      accentColor: "#2C7042",
      glowColor: "#A8F3B8",
      accessoryColor: "#37A15A",
    },
  },
  {
    label: "褐色",
    keywords: ["褐色", "棕色", "咖啡色", "brown"],
    colors: {
      bodyColor: "#7A543A",
      detailColor: "#F6EFE8",
      accentColor: "#4B2F1E",
      glowColor: "#C18A60",
      accessoryColor: "#5F402E",
    },
  },
  {
    label: "朱褐色",
    keywords: ["朱褐色", "朱褐", "红褐色", "红褐"],
    colors: {
      bodyColor: "#8A4B33",
      detailColor: "#F6EEE8",
      accentColor: "#552C1D",
      glowColor: "#D29B77",
      accessoryColor: "#6A3D2B",
    },
  },
  {
    label: "灰褐色",
    keywords: ["灰褐色", "灰褐", "灰棕色", "灰棕", "taupe"],
    colors: {
      bodyColor: "#807068",
      detailColor: "#F4EFEC",
      accentColor: "#554740",
      glowColor: "#C7B4A7",
      accessoryColor: "#6A5A53",
    },
  },
  {
    label: "烟粉",
    keywords: ["烟粉", "烟粉色", "dusty pink", "mauve pink"],
    colors: {
      bodyColor: "#C7929B",
      detailColor: "#FBF1F3",
      accentColor: "#865964",
      glowColor: "#F6C4D0",
      accessoryColor: "#A96F7B",
    },
  },
  {
    label: "灰粉色",
    keywords: ["灰粉色", "灰粉", "dusty rose"],
    colors: {
      bodyColor: "#C5A0A6",
      detailColor: "#FBF2F4",
      accentColor: "#86646A",
      glowColor: "#F2C5CF",
      accessoryColor: "#A57C83",
    },
  },
  {
    label: "薄荷绿",
    keywords: ["薄荷绿", "mint", "sage"],
    colors: {
      bodyColor: "#9AB89A",
      detailColor: "#F1F5EE",
      accentColor: "#5A7A63",
      glowColor: "#B9F0CF",
      accessoryColor: "#557458",
    },
  },
  {
    label: "黑色",
    keywords: ["黑色", "纯黑", "乌黑", "black"],
    colors: {
      bodyColor: "#2B242A",
      detailColor: "#F5EDF2",
      accentColor: "#120E13",
      glowColor: "#7E6C78",
      accessoryColor: "#1B1519",
    },
  },
];

const supportedAccessoryDirectives: Array<{
  accessoryKey: string;
  label: string;
  family: PromptCustomizationAccessoryRequest["family"];
  defaultAnchor: PromptCustomizationAccessoryAnchor;
  keywords: string[];
}> = [
  {
    accessoryKey: "accessoryTie",
    label: "小领带",
    family: "tie",
    defaultAnchor: "chest",
    keywords: ["领带", "necktie", "tie"],
  },
  {
    accessoryKey: "accessoryBadge",
    label: "小徽章",
    family: "badge",
    defaultAnchor: "chest",
    keywords: ["徽章", "badge", "勋章", "胸针"],
  },
  {
    accessoryKey: "accessoryBow",
    label: "蝴蝶结",
    family: "bow",
    defaultAnchor: "left-ear",
    keywords: ["蝴蝶结", "bow"],
  },
  {
    accessoryKey: "accessoryPendant",
    label: "小吊坠",
    family: "pendant",
    defaultAnchor: "chest",
    keywords: ["吊坠", "挂坠", "pendant", "坠子", "小吊饰"],
  },
  {
    accessoryKey: "accessoryBell",
    label: "小铃铛",
    family: "bell",
    defaultAnchor: "chest",
    keywords: ["铃铛", "bell", "开运", "护符"],
  },
  {
    accessoryKey: "accessoryScarf",
    label: "小围巾",
    family: "scarf",
    defaultAnchor: "chest",
    keywords: ["围巾", "scarf", "披肩"],
  },
  {
    accessoryKey: "accessoryFlower",
    label: "耳边小花",
    family: "flower",
    defaultAnchor: "left-ear",
    keywords: ["小花", "flower", "雏菊"],
  },
  {
    accessoryKey: "accessoryCrown",
    label: "星冠",
    family: "crown",
    defaultAnchor: "forehead",
    keywords: ["皇冠", "星冠", "crown", "tiara"],
  },
  {
    accessoryKey: "accessoryTag",
    label: "小吊牌",
    family: "tag",
    defaultAnchor: "chest",
    keywords: ["吊牌", "tag"],
  },
];

const bodyColorScopeKeywords = [
  "狐狸",
  "小狐狸",
  "狐",
  "主体",
  "本体",
  "身体",
  "全身",
  "毛色",
  "毛",
  "配色",
  "主配色",
  "颜色",
  "色调",
];

const accessoryColorScopeKeywords = [
  "星冠",
  "皇冠",
  "冠",
  "铃铛",
  "围巾",
  "小花",
  "吊牌",
  "领带",
  "徽章",
  "蝴蝶结",
  "吊坠",
  "挂坠",
  "项链",
  "链子",
  "小项链",
  "挂链",
  "颈链",
  "颈圈",
  "耳环",
  "耳坠",
  "耳饰",
  "小耳环",
  "耳圈",
  "挂饰",
  "配饰",
  "挂件",
  "饰品",
  "装饰",
  "小装饰",
  "装饰物",
  "装饰件",
  "云朵",
  "云朵挂饰",
  "云朵装饰",
  "蜡烛",
  "钥匙",
  "羽毛",
];

const glowColorScopeKeywords = [
  "尾巴末端",
  "尾巴尖",
  "尾尖",
  "尾巴",
  "发光",
  "光晕",
  "夜灯",
  "月光",
];

const generatedAccessoryDirectives: Array<{
  kind: PromptCustomizationGeneratedAccessoryKind;
  label: string;
  defaultAnchor: PromptCustomizationAccessoryAnchor;
  keywords: string[];
}> = [
  {
    kind: "necklace-chain",
    label: "小项链",
    defaultAnchor: "chest",
    keywords: ["项链", "链子", "小项链", "挂链", "颈链", "颈圈", "necklace", "chain"],
  },
  {
    kind: "pendant-charm",
    label: "吊坠挂件",
    defaultAnchor: "chest",
    keywords: ["吊饰", "坠饰", "小吊饰", "挂坠", "pendant charm"],
  },
  {
    kind: "fish-charm",
    label: "小鱼挂饰",
    defaultAnchor: "left-ear",
    keywords: [
      "小鱼挂饰",
      "鱼形挂件",
      "鱼挂饰",
      "鱼形装饰",
      "鱼形挂饰",
      "小鱼装饰",
      "小鱼耳饰",
      "鱼形耳饰",
      "鱼耳饰",
      "fish charm",
    ],
  },
  {
    kind: "earring-hoop",
    label: "耳环",
    defaultAnchor: "right-ear",
    keywords: ["耳环", "耳坠", "耳饰", "小耳环", "耳圈", "earring", "hoop"],
  },
  {
    kind: "berry-charm",
    label: "草莓挂饰",
    defaultAnchor: "chest",
    keywords: [
      "草莓挂饰",
      "草莓挂件",
      "莓果挂件",
      "莓果挂饰",
      "草莓形挂件",
      "berry charm",
      "strawberry charm",
    ],
  },
  {
    kind: "flower",
    label: "花朵装饰",
    defaultAnchor: "left-ear",
    keywords: ["花朵装饰", "花形装饰", "花朵挂件"],
  },
  {
    kind: "clover-charm",
    label: "四叶草",
    defaultAnchor: "right-ear",
    keywords: ["四叶草", "四叶草挂饰", "四叶草装饰", "clover"],
  },
  {
    kind: "star",
    label: "星形装饰",
    defaultAnchor: "forehead",
    keywords: ["星形装饰", "星星装饰", "五角星装饰", "star accessory"],
  },
  {
    kind: "cloud",
    label: "云朵挂饰",
    defaultAnchor: "left-ear",
    keywords: [
      "云朵挂饰",
      "云朵形状挂饰",
      "云朵形挂饰",
      "云朵形状的挂饰",
      "云朵形装饰",
      "云朵装饰",
      "云形挂饰",
      "云形装饰",
      "cloud accessory",
    ],
  },
  {
    kind: "candle-charm",
    label: "小蜡烛",
    defaultAnchor: "left-ear",
    keywords: ["小蜡烛", "蜡烛挂饰", "蜡烛挂件", "蜡烛装饰", "candle charm", "candle"],
  },
  {
    kind: "key-charm",
    label: "钥匙挂饰",
    defaultAnchor: "chest-center",
    keywords: ["钥匙挂饰", "钥匙挂件", "钥匙装饰", "小钥匙", "key charm", "key"],
  },
  {
    kind: "feather-charm",
    label: "羽毛挂饰",
    defaultAnchor: "back-head",
    keywords: ["羽毛挂饰", "羽毛挂件", "羽毛装饰", "小羽毛", "feather charm", "feather"],
  },
  {
    kind: "open-botanical-ornament",
    label: "植物系挂件",
    defaultAnchor: "left-ear",
    keywords: ["植物挂件", "植物装饰", "花草挂件", "植物 ornament"],
  },
  {
    kind: "open-symbol-ornament",
    label: "图形挂件",
    defaultAnchor: "left-ear",
    keywords: ["图形挂件", "符号挂件", "图案装饰", "symbol ornament"],
  },
  {
    kind: "leaf",
    label: "叶片装饰",
    defaultAnchor: "left-ear",
    keywords: ["叶子装饰", "叶片装饰", "叶形装饰", "leaf accessory"],
  },
  {
    kind: "forest",
    label: "森林形装饰",
    defaultAnchor: "left-ear",
    keywords: [
      "森林形装饰",
      "森林形状装饰",
      "森林形状",
      "树形装饰",
      "松树装饰",
      "森林挂件",
      "森林徽记",
    ],
  },
  {
    kind: "mushroom",
    label: "蘑菇装饰",
    defaultAnchor: "left-ear",
    keywords: ["蘑菇装饰", "蘑菇挂件", "mushroom accessory"],
  },
  {
    kind: "dessert",
    label: "甜点装饰",
    defaultAnchor: "chest",
    keywords: ["甜点装饰", "蛋糕装饰", "草莓甜点装饰", "dessert accessory", "莓果甜点装饰"],
  },
  {
    kind: "candy",
    label: "糖果挂件",
    defaultAnchor: "left-ear",
    keywords: ["糖果挂件", "糖果形状挂件", "糖果装饰", "candy accessory", "candy charm"],
  },
  {
    kind: "dessert-hang",
    label: "甜点挂件",
    defaultAnchor: "chest",
    keywords: ["甜点挂件", "草莓挂件", "奶油挂件", "dessert hang", "dessert charm"],
  },
];

const noAccessoryPhrases = [
  "不要配饰",
  "不要任何配饰",
  "什么配饰都不要",
  "什么装饰都不要",
  "不要其他任何装饰",
  "不要其他装饰",
  "不要挂件",
  "不要饰品",
  "无配饰",
  "没有配饰",
  "不带配饰",
  "不要任何挂饰",
];

const negationPrefixes = [
  "不要",
  "不要带",
  "别带",
  "不带",
  "不要挂",
  "别挂",
  "去掉",
  "拿掉",
  "取消",
  "没有",
  "无",
];

const colorNegationPrefixes = [
  "不要",
  "别",
  "不想要",
  "不要用",
  "别用",
  "不要做成",
  "不要变成",
  "不要是",
  "别是",
];

const accessorySemanticClassByFamily: Record<
  PromptCustomizationAccessoryFamily,
  PromptCustomizationAccessorySemanticClass
> = {
  bell: "bell",
  scarf: "stable-accessory",
  flower: "flower",
  "clover-charm": "clover-charm",
  crown: "stable-accessory",
  tag: "stable-accessory",
  tie: "tie",
  badge: "badge",
  bow: "bow",
  pendant: "pendant",
  "necklace-chain": "necklace-chain",
  "earring-hoop": "earring-hoop",
  "pendant-charm": "pendant-charm",
  star: "star",
  cloud: "cloud-charm",
  leaf: "leaf",
  forest: "forest",
  mushroom: "mushroom",
  dessert: "dessert",
  candy: "candy",
  "dessert-hang": "dessert-hang",
  "charm-token": "generic-ornament",
  "fish-charm": "fish-charm",
  "berry-charm": "berry-charm",
  "cloud-charm": "cloud-charm",
  "candle-charm": "candle-charm",
  "key-charm": "open-symbol-ornament",
  "feather-charm": "open-botanical-ornament",
  "open-botanical-ornament": "open-botanical-ornament",
  "open-symbol-ornament": "open-symbol-ornament",
  "generic-animal-charm": "generic-animal-charm",
  "generic-food-charm": "generic-food-charm",
  "generic-ornament": "generic-ornament",
};

type OpenAiCustomizationPayload = {
  themeSlot?: string;
  themeReason?: string;
  colorOverrides?: Partial<
    Record<PromptCustomizationColorSlot, PromptCustomizationColorOverride>
  >;
  accessoryRequests?: Array<{
    requestedLabel?: string;
    requestedNoun?: string;
    nounSpan?: string;
    nounGloss?: string;
    objectCategory?: PromptCustomizationObjectCategory;
    designConfidence?: number;
    mustDistinctFromFallback?: boolean;
    requestedAnchorPhrase?: string;
    requestedColorText?: string;
    familyGuess?: PromptCustomizationAccessoryFamily;
    familyResolutionSource?: PromptCustomizationFamilyResolutionSource;
    prototypeCandidates?: PrototypeCandidate[];
    traits?: SemanticTrait[];
    negativeLookalikes?: string[];
    mustKeep?: boolean;
    allowApproximation?: boolean;
  }>;
  accessoryOperation?: {
    type?: PromptCustomizationAccessoryOperation["type"];
    accessoryKey?: string;
    label?: string;
    sourceText?: string;
  };
  generatedAccessory?: {
    kind?: PromptCustomizationGeneratedAccessoryKind;
    label?: string;
    anchor?: PromptCustomizationAccessoryAnchor;
    sourceText?: string;
  } | null;
  localTweaks?: Partial<
    Record<
      "earSize" | "tailFluff" | "eyeSize" | "glowIntensity",
      PromptCustomizationLocalTweak
    >
  >;
  negations?: string[];
  unsupportedRequests?: string[];
  unsupportedNotes?: string[];
  confidence?: number;
};

type OpenAiAccessoryDesignPayload = {
  plans?: Array<{
    taskId?: string;
    designArchetype?: PromptCustomizationDesignArchetype;
    semanticClass?: PromptCustomizationAccessorySemanticClass;
    shapeDescription?: string;
    criticalParts?: string[];
    optionalParts?: string[];
    partGraphIntent?: string;
    profileCurves?: string[];
    silhouetteHints?: string[];
    negativeLookalikes?: string[];
    repairPriorities?: string[];
    hangingStrategy?: string;
    fallbackFamily?: PromptCustomizationAccessoryFamily;
    parts?: Array<{
      partId?: string;
      primitive?: PromptCustomizationGeometryRecipe["parts"][number]["primitive"];
      role?: string;
      size?: number;
      offset?: [number, number, number];
      scale?: [number, number, number];
      rotation?: [number, number, number];
    }>;
  }>;
  notes?: string[];
};

type OpenAiAccessoryRequestEntry = NonNullable<
  OpenAiCustomizationPayload["accessoryRequests"]
>[number];

const openAiThemeSlotEnum = [
  "night-glow",
  "cream-toy",
  "forest-scout",
  "lucky-charm",
  "strawberry-sweet",
] as const;

const openAiAccessoryKeyEnum = [
  "accessoryBell",
  "accessoryScarf",
  "accessoryFlower",
  "accessoryCrown",
  "accessoryTag",
  "accessoryTie",
  "accessoryBadge",
  "accessoryBow",
  "accessoryPendant",
] as const;

const openAiGeneratedAccessoryKindEnum = [
  "tie",
  "badge",
  "bow",
  "pendant",
  "necklace-chain",
  "earring-hoop",
  "pendant-charm",
  "flower",
  "clover-charm",
  "star",
  "cloud",
  "leaf",
  "forest",
  "mushroom",
  "dessert",
  "candy",
  "dessert-hang",
  "charm-token",
  "fish-charm",
  "berry-charm",
  "cloud-charm",
  "candle-charm",
  "key-charm",
  "feather-charm",
  "open-botanical-ornament",
  "open-symbol-ornament",
  "generic-animal-charm",
  "generic-food-charm",
  "generic-ornament",
] as const;

const openAiAccessoryAnchorEnum = [
  "left-ear",
  "right-ear",
  "forehead",
  "head-top",
  "back-head",
  "chest",
  "chest-center",
  "chest-left",
  "chest-right",
  "tail-top",
  "tail-left",
  "tail-right",
  "tail-base",
  "head",
] as const;

const openAiAccessorySemanticClassEnum = [
  "stable-accessory",
  "tie",
  "badge",
  "bow",
  "pendant",
  "bell",
  "flower",
  "clover-charm",
  "star",
  "cloud-charm",
  "leaf",
  "forest",
  "mushroom",
  "dessert",
  "candy",
  "dessert-hang",
  "necklace-chain",
  "earring-hoop",
  "pendant-charm",
  "fish-charm",
  "berry-charm",
  "candle-charm",
  "key-charm",
  "feather-charm",
  "open-botanical-ornament",
  "open-symbol-ornament",
  "generic-animal-charm",
  "generic-food-charm",
  "generic-ornament",
] as const;

const openAiObjectCategoryEnum = [
  "device",
  "vehicle",
  "tool",
  "botanical",
  "symbol",
  "creature",
  "food",
  "ornament",
] as const;

const openAiGeometryPrimitiveEnum = [
  "sphere",
  "cube",
  "cylinder",
  "cone",
  "torus",
  "icosphere",
] as const;

const openAiNullableStringSchema = {
  type: ["string", "null"],
} as const;

const openAiNullableNumberSchema = {
  type: ["number", "null"],
} as const;

const openAiNullableStringArraySchema = {
  type: ["array", "null"],
  items: { type: "string" },
} as const;

const openAiNullableVector3Schema = {
  type: ["array", "null"],
  items: { type: "number" },
  minItems: 3,
  maxItems: 3,
} as const;

const openAiAccessoryDesignPartRequiredKeys = [
  "partId",
  "primitive",
  "role",
  "size",
  "offset",
  "scale",
  "rotation",
] as const;

const openAiAccessoryDesignPlanRequiredKeys = [
  "taskId",
  "designArchetype",
  "semanticClass",
  "shapeDescription",
  "criticalParts",
  "optionalParts",
  "partGraphIntent",
  "profileCurves",
  "silhouetteHints",
  "negativeLookalikes",
  "repairPriorities",
  "hangingStrategy",
  "fallbackFamily",
  "parts",
] as const;

const openAiAccessoryDesignSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    plans: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          taskId: openAiNullableStringSchema,
          designArchetype: {
            type: ["string", "null"],
            enum: [
              "known-family",
              "device-charm",
              "vehicle-charm",
              "tool-charm",
              "botanical-charm",
              "symbol-charm",
              "creature-charm",
              "food-charm",
              "generic-ornament",
              null,
            ],
          },
          semanticClass: {
            type: ["string", "null"],
            enum: [...openAiAccessorySemanticClassEnum, null],
          },
          shapeDescription: openAiNullableStringSchema,
          criticalParts: openAiNullableStringArraySchema,
          optionalParts: openAiNullableStringArraySchema,
          partGraphIntent: openAiNullableStringSchema,
          profileCurves: openAiNullableStringArraySchema,
          silhouetteHints: openAiNullableStringArraySchema,
          negativeLookalikes: openAiNullableStringArraySchema,
          repairPriorities: openAiNullableStringArraySchema,
          hangingStrategy: openAiNullableStringSchema,
          fallbackFamily: {
            type: ["string", "null"],
            enum: [...openAiGeneratedAccessoryKindEnum, null],
          },
          parts: {
            type: ["array", "null"],
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                partId: openAiNullableStringSchema,
                primitive: {
                  type: ["string", "null"],
                  enum: [...openAiGeometryPrimitiveEnum, null],
                },
                role: openAiNullableStringSchema,
                size: openAiNullableNumberSchema,
                offset: openAiNullableVector3Schema,
                scale: openAiNullableVector3Schema,
                rotation: openAiNullableVector3Schema,
              },
              required: [...openAiAccessoryDesignPartRequiredKeys],
            },
          },
        },
        required: [...openAiAccessoryDesignPlanRequiredKeys],
      },
    },
    notes: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["plans", "notes"],
} as const;

const openAiColorOverrideSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    label: { type: "string" },
    hex: { type: "string" },
    sourceText: { type: "string" },
    requestedText: { type: "string" },
    resolutionSource: {
      type: "string",
      enum: [
        "preset",
        "direct-value",
        "named-semantic",
        "ai-approximation",
      ],
    },
    approximationReason: { type: "string" },
  },
} as const;

const openAiCustomizationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    themeSlot: {
      type: "string",
      enum: [...openAiThemeSlotEnum],
    },
    themeReason: {
      type: "string",
    },
    colorOverrides: {
      type: "object",
      additionalProperties: false,
      properties: {
        bodyColor: openAiColorOverrideSchema,
        detailColor: openAiColorOverrideSchema,
        accentColor: openAiColorOverrideSchema,
        glowColor: openAiColorOverrideSchema,
        accessoryColor: openAiColorOverrideSchema,
      },
    },
    accessoryRequests: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          requestedLabel: { type: "string" },
          requestedNoun: { type: "string" },
          nounSpan: { type: "string" },
          nounGloss: { type: "string" },
          objectCategory: {
            type: "string",
            enum: [...openAiObjectCategoryEnum],
          },
          designConfidence: { type: "number" },
          mustDistinctFromFallback: { type: "boolean" },
          requestedAnchorPhrase: { type: "string" },
          requestedColorText: { type: "string" },
          familyGuess: { type: "string" },
          familyResolutionSource: {
            type: "string",
            enum: ["known-family", "open-noun", "suffix-fallback", "openai"],
          },
          prototypeCandidates: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                confidence: { type: "number" },
              },
            },
          },
          traits: {
            type: "array",
            items: {
              type: "string",
              enum: [...semanticTraits],
            },
          },
          negativeLookalikes: {
            type: "array",
            items: { type: "string" },
          },
          mustKeep: { type: "boolean" },
          allowApproximation: { type: "boolean" },
        },
      },
    },
    accessoryOperation: {
      type: "object",
      additionalProperties: false,
      properties: {
        type: {
          type: "string",
          enum: [
            "keep-default",
            "remove-default",
            "replace-with-supported",
            "generate-simple-accessory",
          ],
        },
        accessoryKey: {
          type: "string",
          enum: [...openAiAccessoryKeyEnum],
        },
        label: { type: "string" },
        sourceText: { type: "string" },
      },
    },
    generatedAccessory: {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: {
          type: "string",
          enum: [...openAiGeneratedAccessoryKindEnum],
        },
        label: { type: "string" },
        anchor: {
          type: "string",
          enum: [...openAiAccessoryAnchorEnum],
        },
        sourceText: { type: "string" },
      },
    },
    localTweaks: {
      type: "object",
      additionalProperties: false,
      properties: {
        earSize: {
          type: "object",
          additionalProperties: false,
          properties: {
            level: { type: "string", enum: ["larger", "smaller"] },
            sourceText: { type: "string" },
          },
        },
        tailFluff: {
          type: "object",
          additionalProperties: false,
          properties: {
            level: { type: "string", enum: ["larger", "smaller"] },
            sourceText: { type: "string" },
          },
        },
        eyeSize: {
          type: "object",
          additionalProperties: false,
          properties: {
            level: { type: "string", enum: ["larger", "smaller"] },
            sourceText: { type: "string" },
          },
        },
        glowIntensity: {
          type: "object",
          additionalProperties: false,
          properties: {
            level: { type: "string", enum: ["stronger", "weaker"] },
            sourceText: { type: "string" },
          },
        },
      },
    },
    negations: {
      type: "array",
      items: { type: "string" },
    },
    unsupportedRequests: {
      type: "array",
      items: { type: "string" },
    },
    unsupportedNotes: {
      type: "array",
      items: { type: "string" },
    },
    confidence: {
      type: "number",
    },
  },
} as const;

type PromptCustomizationRecipeDraft = Omit<
  PromptCustomizationRecipe,
  | "confidence"
  | "bodyCustomization"
  | "accessoryCustomization"
  | "runtimeDesignTasks"
  | "nounDesignBriefs"
  | "partGraphs"
  | "geometryRecipes"
  | "visualCritiqueReports"
  | "fromThemeDefaults"
  | "fromPromptOverrides"
  | "executedCustomizations"
  | "deferredCustomizations"
  | "experimentalWarnings"
  | "executionScorecard"
  | "runtimeAttemptBudgetMs"
  | "accessoryPolicy"
  | "resolvedExecutionPlan"
  | "accessoryRequests"
  | "parsedIntent"
  | "normalizedSemanticRecipe"
> &
  Partial<
    Pick<
      PromptCustomizationRecipe,
      | "bodyCustomization"
      | "accessoryCustomization"
      | "runtimeDesignTasks"
      | "nounDesignBriefs"
      | "partGraphs"
      | "geometryRecipes"
      | "visualCritiqueReports"
      | "runtimeAttemptBudgetMs"
      | "accessoryPolicy"
      | "resolvedExecutionPlan"
      | "accessoryRequests"
      | "parsedIntent"
      | "normalizedSemanticRecipe"
    >
  >;

type PromptCustomizationRecipeCore = Omit<
  PromptCustomizationRecipe,
  | "confidence"
  | "bodyCustomization"
  | "accessoryCustomization"
  | "runtimeDesignTasks"
  | "nounDesignBriefs"
  | "partGraphs"
  | "geometryRecipes"
  | "visualCritiqueReports"
  | "fromThemeDefaults"
  | "fromPromptOverrides"
  | "executedCustomizations"
  | "deferredCustomizations"
  | "experimentalWarnings"
  | "executionScorecard"
  | "runtimeAttemptBudgetMs"
  | "parsedIntent"
  | "normalizedSemanticRecipe"
> &
  Partial<
    Pick<
      PromptCustomizationRecipe,
      | "bodyCustomization"
      | "accessoryCustomization"
      | "runtimeDesignTasks"
      | "nounDesignBriefs"
      | "partGraphs"
      | "geometryRecipes"
      | "visualCritiqueReports"
      | "runtimeAttemptBudgetMs"
      | "parsedIntent"
      | "normalizedSemanticRecipe"
    >
  >;

function normalizePrompt(prompt: string) {
  return prompt.toLowerCase();
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())).map((value) => value.trim()))];
}

function findAllMatchingColorPresets(normalizedText: string) {
  const matches = colorPresets
    .flatMap((preset) =>
      preset.keywords
        .filter((keyword) => normalizedText.includes(keyword))
        .map((keyword) => ({
          preset,
          keyword,
          index: normalizedText.indexOf(keyword),
        })),
    )
    .sort((left, right) => left.index - right.index);

  const seenLabels = new Set<string>();

  return matches.filter((entry) => {
    if (seenLabels.has(entry.preset.label)) {
      return false;
    }

    seenLabels.add(entry.preset.label);
    return true;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampConfidence(value: number) {
  return Math.min(1, Math.max(0, Number(value.toFixed(2))));
}

function resolveCustomizationProfile(
  input: Pick<CreateGenerationInput, "generationMode" | "customizationProfile">,
): CustomizationProfile {
  if (input.generationMode !== "dynamic-custom") {
    return "safe-overlay";
  }

  return input.customizationProfile ?? "safe-overlay";
}

function hasKeyword(normalizedPrompt: string, keywords: string[]) {
  return keywords.some((keyword) => normalizedPrompt.includes(keyword));
}

function findNegatedPhrase(normalizedPrompt: string, keywords: string[]) {
  for (const keyword of keywords) {
    for (const prefix of negationPrefixes) {
      const candidates = [
        `${prefix}${keyword}`,
        `${prefix}小${keyword}`,
        `${prefix}一个${keyword}`,
        `${prefix}任何${keyword}`,
      ];

      const matched = candidates.find((candidate) => normalizedPrompt.includes(candidate));

      if (matched) {
        return matched;
      }
    }
  }

  return null;
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);

  if (!match) {
    return null;
  }

  const normalized =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((segment) => `${segment}${segment}`)
          .join("")
      : match[1];

  return `#${normalized.toUpperCase()}`;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex);

  if (!normalized) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((value) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function mixHex(baseHex: string, targetHex: string, weight: number) {
  const base = hexToRgb(baseHex);
  const target = hexToRgb(targetHex);

  if (!base || !target) {
    return normalizeHexColor(baseHex) ?? baseHex;
  }

  return rgbToHex(
    base.r + (target.r - base.r) * weight,
    base.g + (target.g - base.g) * weight,
    base.b + (target.b - base.b) * weight,
  );
}

function buildColorOverride(
  slot: PromptCustomizationColorSlot,
  label: string,
  hex: string,
  sourceText: string,
  options?: {
    requestedText?: string;
    resolutionSource?: PromptCustomizationColorOverride["resolutionSource"];
    approximationReason?: string;
  },
): PromptCustomizationColorOverride {
  return {
    slot,
    label,
    hex,
    sourceText,
    ...(options?.requestedText ? { requestedText: options.requestedText } : {}),
    ...(options?.resolutionSource
      ? { resolutionSource: options.resolutionSource }
      : {}),
    ...(options?.approximationReason
      ? { approximationReason: options.approximationReason }
      : {}),
  };
}

function buildPaletteFromBaseColor(
  baseHex: string,
  label: string,
  sourceText: string,
  options?: {
    requestedText?: string;
    resolutionSource?: PromptCustomizationColorOverride["resolutionSource"];
    approximationReason?: string;
  },
) {
  const normalized = normalizeHexColor(baseHex);

  if (!normalized) {
    return {};
  }

  const colors: Record<PromptCustomizationColorSlot, string> = {
    bodyColor: normalized,
    detailColor: mixHex(normalized, "#FFF7F1", 0.76),
    accentColor: mixHex(normalized, "#3A1A1A", 0.34),
    glowColor: mixHex(normalized, "#FFF4EA", 0.3),
    accessoryColor: mixHex(normalized, "#4D1F1F", 0.22),
  };

  return Object.fromEntries(
    Object.entries(colors).map(([slot, hex]) => [
      slot,
      buildColorOverride(
        slot as PromptCustomizationColorSlot,
        label,
        hex,
        sourceText,
        options,
      ),
    ]),
  ) as Partial<Record<PromptCustomizationColorSlot, PromptCustomizationColorOverride>>;
}

const semanticColorBaseHexByToken: Record<string, string> = {
  朱: "#B95A34",
  红: "#D94C3A",
  橙: "#E98B2A",
  橘: "#E98B2A",
  黄: "#D8B43F",
  绿: "#55B36F",
  青: "#3AB7A0",
  蓝: "#6A9DD8",
  紫: "#9A76D6",
  粉: "#D699B4",
  棕: "#7A543A",
  褐: "#6F4A35",
  咖: "#6D4C41",
  灰: "#9A9490",
  银: "#B8BEC6",
  金: "#D0A84E",
  黑: "#2B242A",
  白: "#F6F2EE",
  烟: "#BFA5AE",
};

function extractRgbFunctionColor(normalizedPrompt: string) {
  const rgbMatch = normalizedPrompt.match(
    /rgba?\(\s*(\d{1,3})\s*[,，]\s*(\d{1,3})\s*[,，]\s*(\d{1,3})(?:\s*[,，]\s*(\d*\.?\d+))?\s*\)/i,
  );

  if (!rgbMatch) {
    return null;
  }

  const red = Number(rgbMatch[1]);
  const green = Number(rgbMatch[2]);
  const blue = Number(rgbMatch[3]);

  if ([red, green, blue].some((value) => !Number.isFinite(value) || value < 0 || value > 255)) {
    return null;
  }

  return rgbToHex(red, green, blue);
}

const colorLikeExplicitPatternSource =
  "(奶油白|朱褐色|灰褐色|灰棕色|烟粉色|烟粉|灰粉色|青柠绿|荧光橙|亮橙色|橘红色|紫红色|大红色|银灰色|蓝白色|荧光绿|荧光粉|玫瑰粉|薄荷绿|褐色|棕色|咖啡色|黑色|白色|银色|金色|蓝色|绿色|紫色|粉色|橙色|橘色|黄色)";
const colorLikeGenericPatternSource =
  "((?:偏灰的|偏|带一点|带些|烟|灰|浅|深|暗|亮|荧光|霓虹|奶油|朱)?(?:灰|烟|朱|红|橙|橘|黄|绿|青|蓝|紫|粉|棕|褐|咖|黑|白|银|金){1,4}色?)";
const colorLikeExplicitRegex = new RegExp(colorLikeExplicitPatternSource, "u");
const colorLikeGenericRegex = new RegExp(colorLikeGenericPatternSource, "u");

type ColorLikeMatch = {
  text: string;
  index: number;
  end: number;
};

function extractColorLikeText(normalizedText: string) {
  const explicitMatch = normalizedText.match(colorLikeExplicitRegex);

  if (explicitMatch?.[1]) {
    return explicitMatch[1];
  }

  const genericMatch = normalizedText.match(colorLikeGenericRegex);

  return genericMatch?.[1] ?? null;
}

function collectColorLikeMatches(normalizedText: string): ColorLikeMatch[] {
  const explicitMatches = Array.from(
    normalizedText.matchAll(new RegExp(colorLikeExplicitPatternSource, "gu")),
  )
    .map((match) => {
      const text = match[1];
      const index = match.index;

      if (typeof text !== "string" || typeof index !== "number") {
        return null;
      }

      return {
        text,
        index,
        end: index + text.length,
      } satisfies ColorLikeMatch;
    })
    .filter((entry): entry is ColorLikeMatch => entry !== null);

  if (explicitMatches.length > 0) {
    return explicitMatches;
  }

  return Array.from(
    normalizedText.matchAll(new RegExp(colorLikeGenericPatternSource, "gu")),
  )
    .map((match) => {
      const text = match[1];
      const index = match.index;

      if (typeof text !== "string" || typeof index !== "number") {
        return null;
      }

      return {
        text,
        index,
        end: index + text.length,
      } satisfies ColorLikeMatch;
    })
    .filter((entry): entry is ColorLikeMatch => entry !== null);
}

function collectKeywordMatches(normalizedText: string, keywords: string[]) {
  const matches: Array<{ keyword: string; index: number; end: number }> = [];

  for (const keyword of Array.from(new Set(keywords)).sort((left, right) => right.length - left.length)) {
    let searchIndex = normalizedText.indexOf(keyword);

    while (searchIndex >= 0) {
      matches.push({
        keyword,
        index: searchIndex,
        end: searchIndex + keyword.length,
      });
      searchIndex = normalizedText.indexOf(keyword, searchIndex + keyword.length);
    }
  }

  return matches.sort(
    (left, right) => left.index - right.index || right.keyword.length - left.keyword.length,
  );
}

function findScopedColorLikeText(normalizedText: string, keywords: string[]) {
  const colorMatches = collectColorLikeMatches(normalizedText);

  if (colorMatches.length === 0) {
    return null;
  }

  const keywordMatches = collectKeywordMatches(normalizedText, keywords);

  if (keywordMatches.length === 0) {
    return null;
  }

  let bestMatch: { text: string; score: number } | null = null;

  for (const keyword of keywordMatches) {
    for (const color of colorMatches) {
      const gapBefore = keyword.index - color.end;
      const gapAfter = color.index - keyword.end;
      let score = Number.POSITIVE_INFINITY;

      if (gapBefore >= 0 && gapBefore <= 4) {
        score = gapBefore;
      } else if (gapAfter >= 0 && gapAfter <= 6) {
        score = 20 + gapAfter;
      } else if (gapBefore >= 0 && gapBefore <= 10) {
        score = 40 + gapBefore;
      } else if (gapAfter >= 0 && gapAfter <= 10) {
        score = 60 + gapAfter;
      }

      if (!Number.isFinite(score)) {
        continue;
      }

      if (!bestMatch || score < bestMatch.score) {
        bestMatch = {
          text: color.text,
          score,
        };
      }
    }
  }

  return bestMatch?.text ?? null;
}

function resolveSemanticNamedColor(
  normalizedText: string,
): {
  label: string;
  hex: string;
  requestedText: string;
  approximationReason?: string;
} | null {
  const requestedText = extractColorLikeText(normalizedText);

  if (!requestedText) {
    return null;
  }

  const matchedTokens = Object.entries(semanticColorBaseHexByToken)
    .filter(([token]) => requestedText.includes(token))
    .map(([token, hex]) => ({
      token,
      hex,
      weight:
        token === "灰" || token === "烟"
          ? requestedText.includes("偏灰") || requestedText.includes("烟")
            ? 0.55
            : 0.45
          : token === "紫" && requestedText.includes("带一点")
            ? 0.28
            : token === "黑" && requestedText.length > 2
              ? 0.4
              : 1,
    }));

  if (matchedTokens.length === 0) {
    return null;
  }

  const weightedBase = matchedTokens.reduce(
    (accumulator, entry) => {
      const rgb = hexToRgb(entry.hex);

      if (!rgb) {
        return accumulator;
      }

      accumulator.r += rgb.r * entry.weight;
      accumulator.g += rgb.g * entry.weight;
      accumulator.b += rgb.b * entry.weight;
      accumulator.weight += entry.weight;
      return accumulator;
    },
    { r: 0, g: 0, b: 0, weight: 0 },
  );

  if (weightedBase.weight <= 0) {
    return null;
  }

  let resolvedHex = rgbToHex(
    weightedBase.r / weightedBase.weight,
    weightedBase.g / weightedBase.weight,
    weightedBase.b / weightedBase.weight,
  );

  if (requestedText.includes("荧光") || requestedText.includes("霓虹")) {
    resolvedHex = mixHex(resolvedHex, "#FFF8F2", 0.12);
  } else if (requestedText.includes("亮")) {
    resolvedHex = mixHex(resolvedHex, "#FFF8F2", 0.08);
  }

  if (requestedText.includes("浅")) {
    resolvedHex = mixHex(resolvedHex, "#FFF8F2", 0.2);
  }

  if (requestedText.includes("深") || requestedText.includes("暗")) {
    resolvedHex = mixHex(resolvedHex, "#1E1717", 0.16);
  }

  if (requestedText.includes("灰") || requestedText.includes("烟")) {
    resolvedHex = mixHex(resolvedHex, "#B7B0AA", requestedText.includes("灰褐") ? 0.12 : 0.18);
  }

  return {
    label: requestedText,
    hex: resolvedHex,
    requestedText,
    approximationReason:
      colorPresets.some((preset) => preset.label === requestedText) ? undefined : "按开放命名色语义近似解析为最接近的可执行颜色。",
  };
}

function findFlexibleColorPalette(normalizedText: string) {
  const presetMatch = findBestMatchingColorPresetMatch(normalizedText);
  const preset = presetMatch?.preset ?? null;

  if (preset) {
    const requestedText = extractColorLikeText(normalizedText);
    const sourceText = requestedText ?? presetMatch?.keyword ?? preset.label;

    return {
      palette: Object.fromEntries(
        Object.entries(preset.colors).map(([slot, hex]) => [
          slot,
          buildColorOverride(
            slot as PromptCustomizationColorSlot,
            preset.label,
            hex,
            sourceText,
            {
              requestedText: sourceText,
              resolutionSource: "preset",
            },
          ),
        ]),
      ) as Partial<Record<PromptCustomizationColorSlot, PromptCustomizationColorOverride>>,
      preset,
      sourceText,
      resolutionSource: "preset" as const,
      approximationReason: undefined,
    };
  }

  const hexMatch = normalizedText.match(/#([0-9a-f]{3}|[0-9a-f]{6})/i);
  const rgbHex = extractRgbFunctionColor(normalizedText);
  const directHex = rgbHex ?? (hexMatch ? hexMatch[0].toUpperCase() : null);

  if (directHex) {
    return {
      palette: buildPaletteFromBaseColor(directHex, directHex, directHex, {
        requestedText: directHex,
        resolutionSource: "direct-value",
      }),
      preset: null,
      sourceText: directHex,
      resolutionSource: "direct-value" as const,
      approximationReason: undefined,
    };
  }

  const semanticColor = resolveSemanticNamedColor(normalizedText);

  if (!semanticColor) {
    return null;
  }

  return {
    palette: buildPaletteFromBaseColor(
      semanticColor.hex,
      semanticColor.label,
      semanticColor.requestedText,
      {
        requestedText: semanticColor.requestedText,
        resolutionSource: "named-semantic",
        approximationReason: semanticColor.approximationReason,
      },
    ),
    preset: null,
    sourceText: semanticColor.requestedText,
    resolutionSource: "named-semantic" as const,
      approximationReason: semanticColor.approximationReason,
    };
}

function findScopedFlexibleColorPalette(normalizedText: string, keywords: string[]) {
  const scopedColorText = findScopedColorLikeText(normalizedText, keywords);

  if (!scopedColorText) {
    return null;
  }

  return findFlexibleColorPalette(scopedColorText);
}

function splitPromptIntoSegments(normalizedPrompt: string) {
  return normalizedPrompt
    .split(/[，,、。；;！!？?\n]+/u)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function findBestMatchingColorPresetMatch(normalizedText: string) {
  const requestedText = extractColorLikeText(normalizedText);

  const matches = findAllMatchingColorPresets(normalizedText).sort((left, right) => {
    const leftExact =
      requestedText !== null &&
      (left.keyword === requestedText || left.preset.label === requestedText);
    const rightExact =
      requestedText !== null &&
      (right.keyword === requestedText || right.preset.label === requestedText);

    if (leftExact !== rightExact) {
      return leftExact ? -1 : 1;
    }

    if (left.keyword.length !== right.keyword.length) {
      return right.keyword.length - left.keyword.length;
    }

    if (left.preset.label.length !== right.preset.label.length) {
      return right.preset.label.length - left.preset.label.length;
    }

    return left.index - right.index;
  });

  return matches[0] ?? null;
}

function isNegatedColorSegment(normalizedSegment: string) {
  return (
    hasKeyword(normalizedSegment, colorNegationPrefixes) &&
    Boolean(findFlexibleColorPalette(normalizedSegment))
  );
}

function mergeColorOverrides(
  ...sources: Array<
    Partial<Record<PromptCustomizationColorSlot, PromptCustomizationColorOverride>>
  >
) {
  return sources.reduce<
    Partial<Record<PromptCustomizationColorSlot, PromptCustomizationColorOverride>>
  >((accumulator, source) => ({ ...accumulator, ...source }), {});
}

function detectCompositeBodyPalette(
  normalizedPrompt: string,
): Partial<Record<PromptCustomizationColorSlot, PromptCustomizationColorOverride>> {
  for (const segment of splitPromptIntoSegments(normalizedPrompt)) {
    if (isNegatedColorSegment(segment)) {
      continue;
    }

    if (
      !hasKeyword(segment, [
        "配色",
        "双色",
        "渐变",
        "双拼",
        "撞色",
        "主色",
      ])
    ) {
      continue;
    }

    if (segment.includes("红绿") || segment.includes("绿红")) {
      const redPreset = colorPresets.find((preset) => preset.label === "大红色");
      const greenPreset = colorPresets.find((preset) => preset.label === "绿色");

      if (redPreset && greenPreset) {
        return {
          bodyColor: buildColorOverride(
            "bodyColor",
            segment.startsWith("绿") ? greenPreset.label : redPreset.label,
            segment.startsWith("绿")
              ? greenPreset.colors.bodyColor
              : redPreset.colors.bodyColor,
            segment.includes("红绿") ? "红绿色配色" : "绿红色配色",
          ),
          detailColor: buildColorOverride(
            "detailColor",
            segment.startsWith("绿") ? redPreset.label : greenPreset.label,
            segment.startsWith("绿")
              ? redPreset.colors.detailColor
              : greenPreset.colors.detailColor,
            segment.includes("红绿") ? "红绿色配色" : "绿红色配色",
          ),
          accentColor: buildColorOverride(
            "accentColor",
            segment.startsWith("绿") ? redPreset.label : greenPreset.label,
            segment.startsWith("绿")
              ? redPreset.colors.accentColor
              : greenPreset.colors.accentColor,
            segment.includes("红绿") ? "红绿色配色" : "绿红色配色",
          ),
          glowColor: buildColorOverride(
            "glowColor",
            segment.startsWith("绿") ? greenPreset.label : redPreset.label,
            segment.startsWith("绿")
              ? greenPreset.colors.glowColor
              : redPreset.colors.glowColor,
            segment.includes("红绿") ? "红绿色配色" : "绿红色配色",
          ),
        };
      }
    }

    const matches = findAllMatchingColorPresets(segment);

    if (matches.length < 2) {
      continue;
    }

    const [primary, secondary] = matches;
    const sourceText = `${primary.keyword} + ${secondary.keyword}`;

    return {
      bodyColor: buildColorOverride(
        "bodyColor",
        primary.preset.label,
        primary.preset.colors.bodyColor,
        sourceText,
      ),
      detailColor: buildColorOverride(
        "detailColor",
        secondary.preset.label,
        secondary.preset.colors.detailColor,
        sourceText,
      ),
      accentColor: buildColorOverride(
        "accentColor",
        secondary.preset.label,
        secondary.preset.colors.accentColor,
        sourceText,
      ),
      glowColor: buildColorOverride(
        "glowColor",
        primary.preset.label,
        primary.preset.colors.glowColor,
        sourceText,
      ),
    };
  }

  return {};
}

function detectScopedColorOverrides(normalizedPrompt: string) {
  const scopedOverrides: Partial<
    Record<PromptCustomizationColorSlot, PromptCustomizationColorOverride>
  > = {};

  for (const segment of splitPromptIntoSegments(normalizedPrompt)) {
    if (isNegatedColorSegment(segment)) {
      continue;
    }

    const compositePalette = detectCompositeBodyPalette(segment);

    if (
      Object.keys(compositePalette).length > 0 &&
      hasKeyword(segment, bodyColorScopeKeywords)
    ) {
      Object.assign(scopedOverrides, compositePalette);
      continue;
    }

    if (hasKeyword(segment, bodyColorScopeKeywords)) {
      const bodyFlexibleColor =
        findScopedFlexibleColorPalette(segment, bodyColorScopeKeywords) ??
        findFlexibleColorPalette(segment);

      if (bodyFlexibleColor?.palette.bodyColor) {
        scopedOverrides.bodyColor = bodyFlexibleColor.palette.bodyColor;
      }
      if (bodyFlexibleColor?.palette.detailColor) {
        scopedOverrides.detailColor = bodyFlexibleColor.palette.detailColor;
      }
      if (bodyFlexibleColor?.palette.accentColor) {
        scopedOverrides.accentColor = bodyFlexibleColor.palette.accentColor;
      }
    }

    if (hasKeyword(segment, accessoryColorScopeKeywords)) {
      const accessoryFlexibleColor =
        findScopedFlexibleColorPalette(segment, accessoryColorScopeKeywords) ??
        findFlexibleColorPalette(segment);

      if (accessoryFlexibleColor?.palette.accessoryColor) {
        scopedOverrides.accessoryColor = accessoryFlexibleColor.palette.accessoryColor;
      }
    }

    if (hasKeyword(segment, glowColorScopeKeywords)) {
      const glowFlexibleColor =
        findScopedFlexibleColorPalette(segment, glowColorScopeKeywords) ??
        findFlexibleColorPalette(segment);

      if (glowFlexibleColor?.palette.glowColor) {
        scopedOverrides.glowColor = glowFlexibleColor.palette.glowColor;
      }
    }
  }

  return scopedOverrides;
}

function getScopedColorOverridesByScope(normalizedPrompt: string) {
  const bodyOverrides: Partial<
    Record<PromptCustomizationColorSlot, PromptCustomizationColorOverride>
  > = {};
  const accessoryOverrides: Partial<
    Record<PromptCustomizationColorSlot, PromptCustomizationColorOverride>
  > = {};
  const glowOverrides: Partial<
    Record<PromptCustomizationColorSlot, PromptCustomizationColorOverride>
  > = {};

  for (const segment of splitPromptIntoSegments(normalizedPrompt)) {
    if (isNegatedColorSegment(segment)) {
      continue;
    }

    const compositePalette = detectCompositeBodyPalette(segment);

    if (
      Object.keys(compositePalette).length > 0 &&
      hasKeyword(segment, bodyColorScopeKeywords)
    ) {
      Object.assign(bodyOverrides, compositePalette);
      continue;
    }

    if (hasKeyword(segment, bodyColorScopeKeywords)) {
      const bodyFlexibleColor =
        findScopedFlexibleColorPalette(segment, bodyColorScopeKeywords) ??
        findFlexibleColorPalette(segment);

      if (bodyFlexibleColor) {
        Object.assign(bodyOverrides, bodyFlexibleColor.palette);
      }
    }

    if (hasKeyword(segment, accessoryColorScopeKeywords)) {
      const accessoryFlexibleColor =
        findScopedFlexibleColorPalette(segment, accessoryColorScopeKeywords) ??
        findFlexibleColorPalette(segment);

      if (accessoryFlexibleColor?.palette.accessoryColor) {
        accessoryOverrides.accessoryColor = accessoryFlexibleColor.palette.accessoryColor;
      }
    }

    if (hasKeyword(segment, glowColorScopeKeywords)) {
      const glowFlexibleColor =
        findScopedFlexibleColorPalette(segment, glowColorScopeKeywords) ??
        findFlexibleColorPalette(segment);

      if (glowFlexibleColor?.palette.glowColor) {
        glowOverrides.glowColor = glowFlexibleColor.palette.glowColor;
      }
    }
  }

  return {
    bodyOverrides,
    accessoryOverrides,
    glowOverrides,
  };
}

function detectColorOverrides(normalizedPrompt: string) {
  if (isNegatedColorSegment(normalizedPrompt)) {
    return {};
  }

  const compositePalette = detectCompositeBodyPalette(normalizedPrompt);

  if (Object.keys(compositePalette).length > 0) {
    return compositePalette;
  }

  const flexibleColor = findFlexibleColorPalette(normalizedPrompt);

  return flexibleColor?.palette ?? {};
}

function createTweak(
  label: string,
  level: string,
  factor: number,
  supported: boolean,
  sourceText?: string,
): PromptCustomizationLocalTweak {
  return {
    label,
    level,
    factor,
    supported,
    sourceText,
  };
}

function detectLocalTweaks(normalizedPrompt: string) {
  const localTweaks: PromptCustomizationRecipe["localTweaks"] = {};
  const unsupportedNotes: string[] = [];

  if (
    hasKeyword(normalizedPrompt, ["大耳朵", "耳朵大", "耳朵更大", "耳朵再大一点"])
  ) {
    localTweaks.earSize = createTweak("耳朵更大", "larger", 1, false, "大耳朵");
    unsupportedNotes.push("当前 fox-base-v10 母体还没有暴露独立耳朵对象，所以耳朵大小只能记录需求，暂不做真实执行。");
  } else if (hasKeyword(normalizedPrompt, ["小耳朵", "耳朵小", "耳朵再小一点"])) {
    localTweaks.earSize = createTweak("耳朵更小", "smaller", 1, false, "小耳朵");
    unsupportedNotes.push("当前 fox-base-v10 母体还没有暴露独立耳朵对象，所以耳朵大小只能记录需求，暂不做真实执行。");
  }

  if (
    hasKeyword(normalizedPrompt, ["尾巴更蓬", "大尾巴", "蓬松", "fluff", "fluffy"])
  ) {
    localTweaks.tailFluff = createTweak("尾巴更蓬", "larger", 1.08, false, "尾巴更蓬");
  } else if (
    hasKeyword(normalizedPrompt, ["尾巴小", "尾巴收一点", "尾巴更收", "slim tail"])
  ) {
    localTweaks.tailFluff = createTweak("尾巴更收", "smaller", 0.94, false, "尾巴更收");
  }

  if (
    hasKeyword(normalizedPrompt, ["大眼", "眼睛大", "无辜", "温柔", "big eyes"])
  ) {
    localTweaks.eyeSize = createTweak("眼睛更大", "larger", 1.08, false, "大眼");
  } else if (
    hasKeyword(normalizedPrompt, ["小眼", "眼睛小", "警觉", "机灵", "sharp"])
  ) {
    localTweaks.eyeSize = createTweak("眼睛更收", "smaller", 0.96, false, "眼睛更收");
  }

  if (
    hasKeyword(normalizedPrompt, [
      "不要发光",
      "别发光",
      "无发光",
      "不发光",
      "低发光",
      "发光弱一点",
      "光弱一点",
      "弱一点",
      "不要太亮",
      "别太亮",
      "暗一点",
    ])
  ) {
    localTweaks.glowIntensity = createTweak("发光更弱", "weaker", 0.72, true, "不要发光");
  } else if (
    hasKeyword(normalizedPrompt, ["发光", "夜灯", "glow", "霓虹", "更亮", "亮一点"])
  ) {
    localTweaks.glowIntensity = createTweak("发光更强", "stronger", 1.24, true, "发光");
  }

  return {
    localTweaks,
    unsupportedNotes,
  };
}

function detectUnsupportedRequests(normalizedPrompt: string) {
  const notes: string[] = [];
  const requests: string[] = [];

  if (
    hasKeyword(normalizedPrompt, ["猫", "狗", "兔", "熊猫", "龙", "独角兽", "马", "pony"]) &&
    !normalizedPrompt.includes("狐狸")
  ) {
    requests.push("换物种");
    notes.push("当前公开能力仍固定为 fox，不会在这一轮切成别的动物。");
  }

  if (hasKeyword(normalizedPrompt, ["两只", "双人", "多角色", "一群", "一家"])) {
    requests.push("多角色");
    notes.push("当前 generation 仍固定为单只 fox 桌宠，不支持一次生成多角色。");
  }

  if (hasKeyword(normalizedPrompt, ["动画", "跳舞", "奔跑", "飞", "姿势", "动作"])) {
    requests.push("动作或动画");
    notes.push("当前只做静态桌宠导出，不接动作系统、动画和多姿态。");
  }

  if (hasKeyword(normalizedPrompt, ["场景", "树林", "树木", "蘑菇", "房间", "背景"])) {
    requests.push("场景搭建");
    notes.push("当前只生成 fox 本体，不会把场景、树木或地台一起做进正式资产。");
  }

  return {
    unsupportedRequests: uniqueStrings(requests),
    unsupportedNotes: uniqueStrings(notes),
  };
}

function detectNegations(
  normalizedPrompt: string,
  themeSlot: string,
  defaultAccessoryKey: string,
) {
  const negations: string[] = [];

  for (const phrase of noAccessoryPhrases) {
    if (normalizedPrompt.includes(phrase)) {
      negations.push(phrase);
    }
  }

  for (const directive of supportedAccessoryDirectives) {
    const match = findNegatedPhrase(normalizedPrompt, directive.keywords);

    if (match) {
      negations.push(match);
    }
  }

  for (const directive of generatedAccessoryDirectives) {
    const match = findNegatedPhrase(normalizedPrompt, directive.keywords);

    if (match) {
      negations.push(match);
    }
  }

  if (defaultAccessoryKey === "accessoryBell" && normalizedPrompt.includes("不要铃铛")) {
    negations.push("不要铃铛");
  }

  if (
    defaultAccessoryKey === getFoxThemeDefaultAccessory(themeSlot as never) &&
    hasKeyword(normalizedPrompt, ["无配饰", "不要配饰"])
  ) {
    negations.push("无配饰");
  }

  return uniqueStrings(negations);
}

function resolveAccessoryAnchor(
  normalizedPrompt: string,
  defaultAnchor: PromptCustomizationAccessoryAnchor,
): PromptCustomizationAccessoryAnchor {
  if (
    hasKeyword(normalizedPrompt, ["左耳", "左耳旁", "左耳边", "左耳朵", "左侧耳边"])
  ) {
    return "left-ear";
  }

  if (
    hasKeyword(normalizedPrompt, ["右耳", "右耳旁", "右耳边", "右耳朵", "右侧耳边"])
  ) {
    return "right-ear";
  }

  if (
    hasKeyword(normalizedPrompt, ["额头", "头顶", "前额", "眉心", "forehead"])
  ) {
    return "forehead";
  }

  if (
    hasKeyword(normalizedPrompt, ["胸前", "胸口", "领口", "脖子", "颈前", "胸针位"])
  ) {
    return "chest";
  }

  return defaultAnchor;
}

function getAccessoryFamilyFromKey(
  accessoryKey: string | undefined,
): PromptCustomizationAccessoryRequest["family"] {
  if (accessoryKey === "accessoryBell") {
    return "bell";
  }

  if (accessoryKey === "accessoryScarf") {
    return "scarf";
  }

  if (accessoryKey === "accessoryFlower") {
    return "flower";
  }

  if (accessoryKey === "accessoryCrown") {
    return "crown";
  }

  if (accessoryKey === "accessoryTie") {
    return "tie";
  }

  if (accessoryKey === "accessoryBadge") {
    return "badge";
  }

  if (accessoryKey === "accessoryBow") {
    return "bow";
  }

  if (accessoryKey === "accessoryPendant") {
    return "pendant";
  }

  return "tag";
}

function getDefaultAnchorForAccessoryKey(
  accessoryKey: string | undefined,
): PromptCustomizationAccessoryAnchor {
  return supportedAccessoryDirectives.find(
    (directive) => directive.accessoryKey === accessoryKey,
  )?.defaultAnchor ?? "chest";
}

function getDefaultAnchorForAccessoryFamily(
  family: PromptCustomizationAccessoryFamily,
): PromptCustomizationAccessoryAnchor {
  const stableAccessory = familyToStableAccessory[family];

  if (stableAccessory) {
    return getDefaultAnchorForAccessoryKey(stableAccessory.accessoryKey);
  }

  return getGeneratedFamilyDefaultAnchor(
    family as PromptCustomizationGeneratedAccessoryKind,
  );
}

function getGeneratedAccessoryFallback(
  kind: PromptCustomizationGeneratedAccessoryKind,
  anchor: PromptCustomizationAccessoryAnchor,
) {
  if (kind === "necklace-chain") {
    return {
      accessoryKey: "accessoryPendant",
      label: "小吊坠",
    } as const;
  }

  if (kind === "earring-hoop") {
    return isChestAccessoryAnchor(anchor)
      ? ({
          accessoryKey: "accessoryPendant",
          label: "小吊坠",
        } as const)
      : ({
          accessoryKey: "accessoryFlower",
          label: "耳边小花",
        } as const);
  }

  if (kind === "pendant-charm") {
    return {
      accessoryKey: "accessoryPendant",
      label: "小吊坠",
    } as const;
  }

  if (kind === "candy") {
    if (anchor === "left-ear" || anchor === "right-ear") {
      return {
        accessoryKey: "accessoryBow",
        label: "蝴蝶结",
      } as const;
    }

    return {
      accessoryKey: "accessoryPendant",
      label: "小吊坠",
    } as const;
  }

  if (kind === "dessert-hang") {
    return {
      accessoryKey: "accessoryPendant",
      label: "小吊坠",
    } as const;
  }

  if (kind === "fish-charm" || kind === "generic-animal-charm") {
    return isChestAccessoryAnchor(anchor)
      ? ({
          accessoryKey: "accessoryPendant",
          label: "小吊坠",
        } as const)
      : ({
          accessoryKey: "accessoryFlower",
          label: "耳边小花",
        } as const);
  }

  if (
    kind === "berry-charm" ||
    kind === "clover-charm" ||
    kind === "candle-charm" ||
    kind === "key-charm" ||
    kind === "feather-charm" ||
    kind === "open-botanical-ornament" ||
    kind === "open-symbol-ornament" ||
    kind === "generic-food-charm" ||
    kind === "generic-ornament" ||
    kind === "charm-token"
  ) {
    if (anchor === "forehead" || anchor === "head-top") {
      return {
        accessoryKey: "accessoryCrown",
        label: "星冠",
      } as const;
    }

    if (isTailAccessoryAnchor(anchor)) {
      return {
        accessoryKey: "accessoryTag",
        label: "小吊牌",
      } as const;
    }

    return {
      accessoryKey: "accessoryPendant",
      label: "小吊坠",
    } as const;
  }

  if (kind === "cloud") {
    if (anchor === "left-ear" || anchor === "right-ear") {
      return {
        accessoryKey: "accessoryFlower",
        label: "耳边小花",
      } as const;
    }

    return {
      accessoryKey: "accessoryPendant",
      label: "小吊坠",
    } as const;
  }

  if (kind === "star" || anchor === "forehead" || anchor === "head-top") {
    return {
      accessoryKey: "accessoryCrown",
      label: "星冠",
    } as const;
  }

  if (isChestAccessoryAnchor(anchor)) {
    return {
      accessoryKey: "accessoryTag",
      label: "小吊牌",
    } as const;
  }

  return {
    accessoryKey: "accessoryFlower",
    label: "耳边小花",
  } as const;
}

const stableAccessoryFamilies = new Set<PromptCustomizationAccessoryFamily>([
  "bell",
  "scarf",
  "flower",
  "crown",
  "tag",
  "tie",
  "badge",
  "bow",
  "pendant",
]);

const runtimeAccessoryFamilies = new Set<PromptCustomizationAccessoryFamily>([
  "necklace-chain",
  "earring-hoop",
  "pendant-charm",
  "star",
  "flower",
  "clover-charm",
  "cloud",
  "leaf",
  "forest",
  "mushroom",
  "dessert",
  "candy",
  "dessert-hang",
  "charm-token",
  "fish-charm",
  "berry-charm",
  "cloud-charm",
  "candle-charm",
  "key-charm",
  "feather-charm",
  "open-botanical-ornament",
  "open-symbol-ornament",
  "generic-animal-charm",
  "generic-food-charm",
  "generic-ornament",
]);

const familyToStableAccessory: Partial<
  Record<
    PromptCustomizationAccessoryFamily,
    {
      accessoryKey: string;
      label: string;
    }
  >
> = {
  bell: { accessoryKey: "accessoryBell", label: "小铃铛" },
  scarf: { accessoryKey: "accessoryScarf", label: "小围巾" },
  flower: { accessoryKey: "accessoryFlower", label: "耳边小花" },
  crown: { accessoryKey: "accessoryCrown", label: "星冠" },
  tag: { accessoryKey: "accessoryTag", label: "小吊牌" },
  tie: { accessoryKey: "accessoryTie", label: "小领带" },
  badge: { accessoryKey: "accessoryBadge", label: "小徽章" },
  bow: { accessoryKey: "accessoryBow", label: "蝴蝶结" },
  pendant: { accessoryKey: "accessoryPendant", label: "小吊坠" },
};

function buildEmptyAccessoryPolicy(): PromptCustomizationAccessoryPolicy {
  return {
    removeDefaultAccessories: false,
    keepThemeDefaultAccessories: true,
    exceptionOnly: false,
    removedDefaultAccessoryKeys: [],
    keptThemeDefaultAccessoryKeys: [],
  };
}

function buildEmptyResolvedExecutionPlan(): PromptCustomizationResolvedExecutionPlan {
  return {
    removeDefaultAccessories: [],
    keepThemeDefaults: [],
    addAccessories: [],
    repairPassAllowed: true,
    repairPassTriggered: false,
  };
}

function getAccessorySemanticClass(
  family: PromptCustomizationAccessoryFamily,
): PromptCustomizationAccessorySemanticClass {
  return accessorySemanticClassByFamily[family] ?? "generic-ornament";
}

type RuntimeTaskRequestSeed = Pick<
  PromptCustomizationAccessoryRequest,
  | "requestedNoun"
  | "requestedLabel"
  | "shapeLabel"
  | "label"
  | "anchor"
  | "requestedAnchorPhrase"
  | "shapeDescription"
>;

function buildRuntimeTaskRequestSeed(
  task: Pick<
    PromptCustomizationRuntimeDesignTask,
    "requestLabel" | "requestedNoun" | "anchor" | "requestedAnchorPhrase"
  >,
): RuntimeTaskRequestSeed {
  const requestLabel = task.requestedNoun ?? task.requestLabel;

  return {
    requestedNoun: task.requestedNoun,
    requestedLabel: requestLabel,
    shapeLabel: requestLabel,
    label: requestLabel,
    anchor: task.anchor,
    requestedAnchorPhrase: task.requestedAnchorPhrase,
    shapeDescription: undefined,
  };
}

function resolveRuntimeTaskSemanticClass(
  task: Pick<
    PromptCustomizationRuntimeDesignTask,
    "runtimeShapeClass" | "family" | "semanticClass"
  >,
): PromptCustomizationAccessorySemanticClass {
  const runtimeShapeClass = task.runtimeShapeClass;

  if (
    runtimeShapeClass &&
    runtimeShapeClass in accessorySemanticClassByFamily
  ) {
    return getAccessorySemanticClass(
      runtimeShapeClass as PromptCustomizationAccessoryFamily,
    );
  }

  return task.semanticClass ?? getAccessorySemanticClass(task.family);
}

function buildBodyCustomization(
  recipe: Pick<
    PromptCustomizationRecipeCore,
    "colorOverrides" | "themeLabel" | "bodyPaletteIntent" | "detailPaletteIntent"
  >,
): PromptCustomizationBodyCustomization {
  const colorLabels = uniqueStrings([
    recipe.colorOverrides.bodyColor?.label,
    recipe.colorOverrides.detailColor?.label,
    recipe.colorOverrides.accentColor?.label,
  ]);
  const paletteMode =
    colorLabels.length >= 2
      ? recipe.bodyPaletteIntent.some((entry) =>
            hasKeyword(entry, ["渐变", "双色", "双拼", "撞色"])
          )
        ? "gradient"
        : "dual-tone"
      : recipe.colorOverrides.bodyColor
        ? "single-tone"
        : "theme-default";

  return {
    paletteMode,
    primaryColor: recipe.colorOverrides.bodyColor,
    secondaryColor: recipe.colorOverrides.detailColor,
    accentColor: recipe.colorOverrides.accentColor,
    glowColor: recipe.colorOverrides.glowColor,
    requestedColorTexts: uniqueStrings([
      recipe.colorOverrides.bodyColor?.requestedText,
      recipe.colorOverrides.detailColor?.requestedText,
      recipe.colorOverrides.accentColor?.requestedText,
    ]),
    colorResolutionSource:
      recipe.colorOverrides.bodyColor?.resolutionSource ??
      recipe.colorOverrides.detailColor?.resolutionSource,
    colorApproximationReason:
      recipe.colorOverrides.bodyColor?.approximationReason ??
      recipe.colorOverrides.detailColor?.approximationReason,
    requestedDescription:
      colorLabels.length > 0
        ? colorLabels.map((label) => `主体色：${label}`)
        : [`沿用 ${recipe.themeLabel} 默认主体配色`],
    segmentationHints:
      paletteMode === "dual-tone" || paletteMode === "gradient"
        ? ["主体保持第一主色，细节与强调区使用第二主色。"]
        : ["主体、细节和强调区保持同一家族配色。"],
    materialStyleHints: recipe.detailPaletteIntent,
  };
}

function inferRuntimeDesignArchetype(
  request: PromptCustomizationAccessoryRequest,
): PromptCustomizationDesignArchetype {
  const requestedNoun =
    request.requestedNoun ??
    normalizeRequestedNoun(request.requestedLabel ?? request.shapeLabel ?? request.label) ??
    request.shapeLabel;

  if (
    request.family !== "generic-ornament" &&
    request.family !== "open-botanical-ornament" &&
    request.family !== "open-symbol-ornament" &&
    request.family !== "generic-animal-charm" &&
    request.family !== "generic-food-charm"
  ) {
    return "known-family";
  }

  if (requestedNoun && hasKeyword(requestedNoun, ["手机", "相机", "拍立得", "电话", "camera", "phone"])) {
    return "device-charm";
  }

  if (requestedNoun && hasKeyword(requestedNoun, ["火箭", "飞船", "小船", "船", "rocket", "boat", "ship"])) {
    return "vehicle-charm";
  }

  if (requestedNoun && hasKeyword(requestedNoun, ["钥匙", "锤", "锚", "剪刀", "工具", "key", "tool"])) {
    return "tool-charm";
  }

  if (
    request.family === "open-botanical-ornament" ||
    (requestedNoun && hasKeyword(requestedNoun, ["花", "叶", "草", "藤", "芽", "羽毛", "苔", "瓣"]))
  ) {
    return "botanical-charm";
  }

  if (
    request.family === "open-symbol-ornament" ||
    (requestedNoun && hasKeyword(requestedNoun, ["星", "云", "心", "月", "徽", "符", "图", "标", "章"]))
  ) {
    return "symbol-charm";
  }

  if (
    request.family === "generic-animal-charm" ||
    (requestedNoun && hasKeyword(requestedNoun, ["鱼", "鸟", "猫", "狗", "龙", "兽", "动物"]))
  ) {
    return "creature-charm";
  }

  if (
    request.family === "generic-food-charm" ||
    (requestedNoun && hasKeyword(requestedNoun, ["草莓", "莓", "糖", "甜点", "蛋糕", "果", "食物"]))
  ) {
    return "food-charm";
  }

  return "generic-ornament";
}

function inferObjectCategoryFromArchetype(
  designArchetype: PromptCustomizationDesignArchetype,
): PromptCustomizationObjectCategory {
  if (designArchetype === "device-charm") {
    return "device";
  }

  if (designArchetype === "vehicle-charm") {
    return "vehicle";
  }

  if (designArchetype === "tool-charm") {
    return "tool";
  }

  if (designArchetype === "botanical-charm") {
    return "botanical";
  }

  if (designArchetype === "symbol-charm") {
    return "symbol";
  }

  if (designArchetype === "creature-charm") {
    return "creature";
  }

  if (designArchetype === "food-charm") {
    return "food";
  }

  return "ornament";
}

function inferRuntimeShapeClass(
  request: PromptCustomizationAccessoryRequest,
  designArchetype: PromptCustomizationDesignArchetype,
): PromptCustomizationRuntimeShapeClass {
  if (request.runtimeShapeClass) {
    return request.runtimeShapeClass;
  }

  const requestedNoun =
    request.requestedNoun ??
    normalizeRequestedNoun(request.requestedLabel ?? request.shapeLabel ?? request.label) ??
    request.shapeLabel;

  if (designArchetype === "device-charm") {
    return hasKeyword(requestedNoun, ["相机", "camera", "拍立得"])
      ? "camera-charm"
      : "device-generic-charm";
  }

  if (designArchetype === "vehicle-charm") {
    if (hasKeyword(requestedNoun, ["小船", "船", "boat", "ship"])) {
      return "boat-charm";
    }

    if (hasKeyword(requestedNoun, ["火箭", "rocket", "飞船"])) {
      return "rocket-charm";
    }

    return "vehicle-generic-charm";
  }

  if (designArchetype === "tool-charm") {
    return "device-generic-charm";
  }

  return request.family;
}

function inferAssemblyRootPartId(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
  criticalParts: string[],
) {
  switch (runtimeShapeClass) {
    case "scarf":
      return "wrap-band";
    case "camera-charm":
    case "device-generic-charm":
      return "device-body";
    case "boat-charm":
      return "boat-hull";
    case "rocket-charm":
      return "rocket-body";
    case "vehicle-generic-charm":
      return "vehicle-body";
    case "fish-charm":
      return "body";
    case "berry-charm":
      return "berry-main";
    case "star":
      return "core";
    case "cloud":
    case "cloud-charm":
      return "center-puff";
    case "flower":
    case "clover-charm":
    case "open-botanical-ornament":
    case "open-symbol-ornament":
      return "core";
    case "tie":
      return "knot";
    case "bow":
      return "knot";
    case "bell":
      return "body";
    case "necklace-chain":
      return "charm";
    case "earring-hoop":
      return "hoop";
    case "pendant-charm":
      return "token";
    case "candle-charm":
      return "wax-body";
    case "key-charm":
      return "shaft";
    case "feather-charm":
      return "stem";
    case "generic-animal-charm":
      return "body";
    case "generic-food-charm":
      return "berry-main";
    default:
      break;
  }

  return (
    criticalParts.find((partId) =>
      ["body", "core", "device-body", "vehicle-body", "boat-hull", "rocket-body", "token"].includes(
        partId,
      ),
    ) ??
    criticalParts[0] ??
    "token"
  );
}

function inferAttachmentPartId(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
  criticalParts: string[],
  optionalParts: string[],
) {
  switch (runtimeShapeClass) {
    case "scarf":
      return "wrap-band";
    case "camera-charm":
    case "device-generic-charm":
    case "boat-charm":
    case "rocket-charm":
    case "vehicle-generic-charm":
      return "hang-slot";
    case "star":
      return "core";
    case "fish-charm":
    case "berry-charm":
    case "clover-charm":
    case "cloud":
    case "cloud-charm":
    case "candle-charm":
    case "key-charm":
    case "feather-charm":
    case "open-botanical-ornament":
    case "open-symbol-ornament":
    case "generic-animal-charm":
    case "generic-food-charm":
    case "generic-ornament":
      return "ring";
    case "necklace-chain":
      return "bead-3";
    case "earring-hoop":
      return "hoop";
    case "pendant-charm":
      return "ring";
    default:
      break;
  }

  return (
    [...criticalParts, ...optionalParts].find((partId) =>
      ["hang-slot", "ring", "hoop", "bead-3", "bead-1", "token"].includes(partId),
    ) ??
    inferAssemblyRootPartId(runtimeShapeClass, criticalParts)
  );
}

function buildRequestedNounGloss(
  request: PromptCustomizationAccessoryRequest,
  designArchetype: PromptCustomizationDesignArchetype,
) {
  const requestedNoun =
    request.requestedNoun ??
    normalizeRequestedNoun(request.requestedLabel ?? request.shapeLabel ?? request.label) ??
    request.shapeLabel;

  if (request.nounGloss) {
    return request.nounGloss;
  }

  if (designArchetype === "device-charm") {
    return `${requestedNoun}，属于设备类挂件，重点读出平面主体和辨识面。`;
  }

  if (designArchetype === "vehicle-charm") {
    return `${requestedNoun}，属于交通工具类挂件，重点读出主体、前后指向和附属结构。`;
  }

  if (designArchetype === "tool-charm") {
    return `${requestedNoun}，属于工具类挂件，重点读出柄部、功能头和挂点。`;
  }

  if (designArchetype === "botanical-charm") {
    return `${requestedNoun}，属于植物类挂件，重点读出叶片/花瓣与连接结构。`;
  }

  if (designArchetype === "symbol-charm") {
    return `${requestedNoun}，属于图形符号类挂件，重点读出轮廓分区。`;
  }

  if (designArchetype === "creature-charm") {
    return `${requestedNoun}，属于生物类挂件，重点读出主体和附属器官。`;
  }

  if (designArchetype === "food-charm") {
    return `${requestedNoun}，属于食物类挂件，重点读出主体和点缀层次。`;
  }

  return `${requestedNoun}，需要保持原 noun，不要塌成 generic ornament。`;
}

function buildRuntimeOptionalParts(
  request: RuntimeTaskRequestSeed,
  semanticClass: PromptCustomizationAccessorySemanticClass,
  designArchetype: PromptCustomizationDesignArchetype,
) {
  const requestedNoun =
    request.requestedNoun ??
    normalizeRequestedNoun(request.requestedLabel ?? request.shapeLabel ?? request.label) ??
    request.shapeLabel;

  if (requestedNoun && hasKeyword(requestedNoun, ["围巾", "小围巾", "围脖", "领巾", "披肩", "scarf"])) {
    return ["tail-fold-left", "tail-fold-right"];
  }

  switch (semanticClass) {
    case "fish-charm":
      return ["nose", "fin-bottom"];
    case "berry-charm":
      return ["berry-side-left", "berry-side-right", "leaf-side"];
    case "flower":
      return ["petal-top-left", "petal-top-right"];
    case "clover-charm":
      return ["ring", "stem"];
    case "star":
      return [];
    case "cloud-charm":
      return ["ring", "base-puff"];
    case "candle-charm":
      return ["ring", "wax-top"];
    default:
      break;
  }

  if (designArchetype === "device-charm") {
    return hasKeyword(requestedNoun, ["相机", "camera"])
      ? ["hang-slot", "device-body"]
      : ["camera-dot", "hang-slot"];
  }

  if (designArchetype === "vehicle-charm") {
    return hasKeyword(requestedNoun, ["小船", "船", "boat", "ship"])
      ? ["boat-deck", "hang-slot"]
      : ["hang-slot", "vehicle-rear"];
  }

  if (designArchetype === "tool-charm") {
    return ["hang-slot"];
  }

  if (designArchetype === "botanical-charm") {
    return ["stem", "hang-slot"];
  }

  if (designArchetype === "symbol-charm") {
    return ["hang-slot", "symbol-arm"];
  }

  if (designArchetype === "creature-charm") {
    return ["hang-slot", "ear-right"];
  }

  if (designArchetype === "food-charm") {
    return ["hang-slot", "cream"];
  }

  return ["accent"];
}

function buildRuntimeNegativeLookalikes(
  request: RuntimeTaskRequestSeed,
  designArchetype: PromptCustomizationDesignArchetype,
) {
  const requestedNoun =
    request.requestedNoun ??
    normalizeRequestedNoun(request.requestedLabel ?? request.shapeLabel ?? request.label) ??
    request.shapeLabel;
  const base = ["generic token", "单个球团", "普通徽章块"];

  if (requestedNoun && hasKeyword(requestedNoun, ["围巾", "小围巾", "围脖", "领巾", "披肩", "scarf"])) {
    return uniqueStrings([...base, "black orb", "necktie", `${requestedNoun} 不能退化成 generic ornament`]);
  }

  if (designArchetype === "device-charm") {
    return uniqueStrings([...base, "铃铛替代物", `${requestedNoun} 不能看起来像普通牌子`]);
  }

  if (designArchetype === "vehicle-charm") {
    return uniqueStrings([...base, "铃铛替代物", `${requestedNoun} 不能看起来像普通圆球`]);
  }

  if (designArchetype === "tool-charm") {
    return uniqueStrings([...base, `${requestedNoun} 不能看起来像普通吊坠`]);
  }

  if (designArchetype === "botanical-charm") {
    return uniqueStrings([...base, "普通圆花球", `${requestedNoun} 不能看起来像 generic 花团`]);
  }

  if (designArchetype === "symbol-charm") {
    return uniqueStrings([...base, "普通圆章", `${requestedNoun} 不能看起来像 generic 图标坠子`]);
  }

  if (requestedNoun && hasKeyword(requestedNoun, ["星", "star"])) {
    return uniqueStrings([...base, "普通圆章", `${requestedNoun} 不能塌成圆 token 或十字块。`]);
  }

  return uniqueStrings([...base, `${requestedNoun} 不能退化成 generic ornament`]);
}

function buildRuntimeRepairPriorities(
  designArchetype: PromptCustomizationDesignArchetype,
): string[] {
  const structuralActions: PromptCustomizationRepairActionType[] = [
    "insert-missing-part",
    "reshape-silhouette",
    "rebalance-part-ratio",
    "re-anchor",
    "re-orient",
  ];

  if (designArchetype === "symbol-charm" || designArchetype === "botanical-charm") {
    structuralActions.splice(1, 0, "split-merged-part");
  }

  return structuralActions.map((value) => value);
}

function buildRuntimeHangingStrategy(
  request: RuntimeTaskRequestSeed,
  designArchetype: PromptCustomizationDesignArchetype,
) {
  if (isChestAccessoryAnchor(request.anchor)) {
    return "胸前挂件优先正面朝前，挂点在上方，避免挡住脸和下巴轮廓。";
  }

  if (request.anchor === "back-head") {
    return "挂点贴后脑表面，主体向外翻，避免穿进头部。";
  }

  if (request.anchor === "tail-top" || request.anchor === "tail-left" || request.anchor === "tail-right" || request.anchor === "tail-base") {
    return "挂点顺尾巴表面法线，保持略微外翻和 3/4 视角可读。";
  }

  if (designArchetype === "vehicle-charm" || designArchetype === "device-charm") {
    return "耳侧挂点保持上部连接，主体下垂并略微向外偏，优先 3/4 视角可读。";
  }

  return "挂点贴合锚点表面，主体略微离开皮毛，优先 front / 3/4 视角可读。";
}

function buildRuntimePartGraphIntent(
  request: RuntimeTaskRequestSeed,
  criticalParts: string[],
  optionalParts: string[],
) {
  const requestedNoun =
    request.requestedNoun ??
    normalizeRequestedNoun(request.requestedLabel ?? request.shapeLabel ?? request.label) ??
    request.shapeLabel;

  return `${requestedNoun} 先保住 ${criticalParts.join(" / ")} 这些关键部件，再补 ${optionalParts.join(" / ")} 这些次级部件。`;
}

function buildRuntimeCriticalParts(
  request: RuntimeTaskRequestSeed,
  semanticClass: PromptCustomizationAccessorySemanticClass,
  designArchetype: PromptCustomizationDesignArchetype,
) {
  const requestedNoun =
    request.requestedNoun ??
    normalizeRequestedNoun(request.requestedLabel ?? request.shapeLabel ?? request.label) ??
    request.shapeLabel;

  if (requestedNoun && hasKeyword(requestedNoun, ["围巾", "小围巾", "围脖", "领巾", "披肩", "scarf"])) {
    return ["wrap-band", "knot", "tail-left", "tail-right"];
  }

  switch (semanticClass) {
    case "fish-charm":
      return ["ring", "body", "tail", "fin-top"];
    case "berry-charm":
      return ["ring", "berry-main", "leaf-crown"];
    case "flower":
      return ["core", "petal-left", "petal-right", "petal-top", "petal-bottom"];
    case "clover-charm":
      return ["core", "leaf-left", "leaf-right", "leaf-top", "leaf-bottom", "stem"];
    case "star":
      return ["core", "ray-1", "ray-2", "ray-3", "ray-4", "ray-5"];
    case "cloud-charm":
      return ["ring", "center-puff", "left-puff", "right-puff", "base-puff"];
    case "candle-charm":
      return ["wax-body", "wick", "flame"];
    case "tie":
      return ["knot", "collar-left", "collar-right", "blade-main"];
    case "bow":
      return ["knot", "left-wing", "right-wing", "left-tail", "right-tail"];
    case "bell":
      return ["ring", "cap", "body", "clapper"];
    case "necklace-chain":
      return ["bead-1", "bead-5", "charm"];
    case "earring-hoop":
      return ["hoop", "bead"];
    case "pendant-charm":
      return ["ring", "link", "token"];
    default:
      break;
  }

  if (designArchetype === "device-charm") {
    if (requestedNoun && hasKeyword(requestedNoun, ["相机", "camera"])) {
      return ["device-body", "camera-lens", "camera-top", "hang-slot"];
    }

    return ["device-body", "screen-face", "hang-slot"];
  }

  if (designArchetype === "vehicle-charm") {
    if (requestedNoun && hasKeyword(requestedNoun, ["火箭", "rocket", "飞船"])) {
      return ["rocket-body", "rocket-nose", "rocket-fin", "rocket-nozzle"];
    }

    if (requestedNoun && hasKeyword(requestedNoun, ["小船", "船", "boat", "ship"])) {
      return ["boat-hull", "boat-sail", "boat-mast"];
    }

    return ["vehicle-body", "vehicle-front", "vehicle-rear", "hang-slot"];
  }

  if (designArchetype === "tool-charm") {
    return ["tool-body", "tool-head", "hang-slot"];
  }

  if (designArchetype === "botanical-charm") {
    return ["core", "leaf-left", "leaf-right", "stem"];
  }

  if (designArchetype === "symbol-charm") {
    return ["symbol-core", "symbol-arm", "hang-slot"];
  }

  if (designArchetype === "creature-charm") {
    return ["animal-body", "tail", "ear-left", "hang-slot"];
  }

  if (designArchetype === "food-charm") {
    return ["berry-main", "cream", "hang-slot"];
  }

  return ["ring", "token", "accent"];
}

function buildRuntimeShapeIntent(
  request: RuntimeTaskRequestSeed,
  semanticClass: PromptCustomizationAccessorySemanticClass,
  designArchetype: PromptCustomizationDesignArchetype,
) {
  const baseLabel =
    request.requestedNoun ?? request.shapeLabel ?? request.label;

  if (baseLabel && hasKeyword(baseLabel, ["围巾", "小围巾", "围脖", "领巾", "披肩", "scarf"])) {
    return `${baseLabel} 需要先读成胸前围巾，保留横向包裹的围巾带、中心结和两条下垂尾片。`;
  }

  switch (semanticClass) {
    case "fish-charm":
      return `${baseLabel} 需要清晰读成小鱼挂饰，保留鱼身、尾鳍和吊环。`;
    case "berry-charm":
      return `${baseLabel} 需要先读成莓果/草莓挂饰，保留果体、叶冠和吊环。`;
    case "flower":
      return `${baseLabel} 需要先读成花朵，保留花心和花瓣层次。`;
    case "clover-charm":
      return `${baseLabel} 需要先读成四叶草，保留四片叶与短茎。`;
    case "star":
      return `${baseLabel} 需要先读成五角星，保留中心核与五向星芒。`;
    case "cloud-charm":
      return `${baseLabel} 需要先读成云朵挂饰，保留多团云层轮廓。`;
    case "candle-charm":
      return `${baseLabel} 需要先读成蜡烛，保留蜡柱、烛芯和火焰。`;
    default:
      break;
  }

  if (designArchetype === "device-charm") {
    return `${baseLabel} 需要保持设备类挂件轮廓，不能塌成 generic token。`;
  }

  if (designArchetype === "vehicle-charm") {
    return `${baseLabel} 需要保持交通工具类挂件轮廓，不能塌成普通圆球。`;
  }

  if (designArchetype === "tool-charm") {
    return `${baseLabel} 需要保持工具类挂件轮廓和可读挂点。`;
  }

  if (designArchetype === "botanical-charm") {
    return `${baseLabel} 需要保持植物类轮廓与连接结构。`;
  }

  if (designArchetype === "symbol-charm") {
    return `${baseLabel} 需要保持符号类轮廓和结构分区。`;
  }

  if (designArchetype === "creature-charm") {
    return `${baseLabel} 需要保持生物类挂件轮廓。`;
  }

  if (designArchetype === "food-charm") {
    return `${baseLabel} 需要保持食物类挂件轮廓。`;
  }

  return `${baseLabel} 需要在 ${request.requestedAnchorPhrase ?? getAccessoryAnchorLabel(request.anchor)} 形成可读挂件轮廓。`;
}

function buildRuntimeSilhouetteGoals(
  request: RuntimeTaskRequestSeed,
  designArchetype: PromptCustomizationDesignArchetype,
) {
  const requestedNoun = request.requestedNoun ?? request.shapeLabel;
  const baseGoals = [
    `${requestedNoun} 要先读出来`,
    isChestAccessoryAnchor(request.anchor)
      ? "胸前挂件要正向朝前"
      : isTailAccessoryAnchor(request.anchor)
        ? "尾部挂件要避免贴得太死，并在 3/4 视角可读"
        : "头部挂件要从 3/4 视角可读",
  ];

  if (designArchetype === "device-charm") {
    return uniqueStrings([...baseGoals, "设备类挂件要保留平面主体和辨识面。"]);
  }

  if (designArchetype === "vehicle-charm") {
    return uniqueStrings([...baseGoals, "交通工具挂件要保留前后指向和附属结构。"]);
  }

  if (requestedNoun && hasKeyword(requestedNoun, ["围巾", "小围巾", "围脖", "领巾", "披肩", "scarf"])) {
    return uniqueStrings([
      ...baseGoals,
      "围巾必须先读到横向包裹和双尾下垂，不要塌成黑色球团或领带。",
    ]);
  }

  if (requestedNoun && hasKeyword(requestedNoun, ["星", "star"])) {
    return uniqueStrings([...baseGoals, "星形挂件要保持五向张开的轮廓，不要塌成圆 token。"]);
  }

  return uniqueStrings(baseGoals);
}

function buildRuntimeDesignDescription(
  request: RuntimeTaskRequestSeed,
  shapeIntent: string,
  criticalParts: string[],
) {
  if (request.shapeDescription) {
    return request.shapeDescription;
  }

  return `${shapeIntent} 关键部件：${criticalParts.join(" / ")}。`;
}

function createAttachmentRule(
  partId: string,
  parentPartId: string | undefined,
  mountFace: string,
  edgeConstraint: PromptCustomizationAttachmentRule["edgeConstraint"],
  orientationConstraint: PromptCustomizationAttachmentRule["orientationConstraint"],
  allowedDrift: number,
  options?: {
    flushMount?: boolean;
    embedDepth?: number;
    spanOwnership?: PromptCustomizationAttachmentRule["spanOwnership"];
    supportDependency?: string;
  },
): PromptCustomizationAttachmentRule {
  return {
    partId,
    ...(parentPartId ? { parentPartId } : {}),
    mountFace,
    edgeConstraint,
    orientationConstraint,
    allowedDrift,
    ...(typeof options?.flushMount === "boolean"
      ? { flushMount: options.flushMount }
      : {}),
    ...(typeof options?.embedDepth === "number"
      ? { embedDepth: options.embedDepth }
      : {}),
    spanOwnership: options?.spanOwnership ?? "support",
    ...(options?.supportDependency ? { supportDependency: options.supportDependency } : {}),
  };
}

function buildRuntimePrimarySilhouette(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
  designArchetype: PromptCustomizationDesignArchetype,
): PromptCustomizationPrimarySilhouette {
  switch (runtimeShapeClass) {
    case "camera-charm":
    case "device-generic-charm":
      return "compact-device";
    case "boat-charm":
      return "longitudinal-hull";
    case "rocket-charm":
      return "rocket-spine";
    case "fish-charm":
      return "fish-body";
    case "flower":
    case "clover-charm":
    case "open-botanical-ornament":
      return "botanical-bloom";
    case "star":
    case "open-symbol-ornament":
      return "symbol-badge";
    default:
      return designArchetype === "tool-charm" ? "tool-handle" : "generic-ornament";
  }
}

function buildRuntimePartProfiles(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
  criticalParts: string[],
  optionalParts: string[],
  attachmentPartId: string | undefined,
): PromptCustomizationPartProfile[] {
  const configuredProfiles: Partial<Record<string, PromptCustomizationPartProfile>> = {};
  const registerProfile = (
    partId: string,
    profile: PromptCustomizationPartProfile["profile"],
    silhouetteRole: PromptCustomizationPartProfile["silhouetteRole"],
    spanBias?: number,
    depthBias?: number,
    hostFitWeight?: number,
  ) => {
    configuredProfiles[partId] = {
      partId,
      profile,
      silhouetteRole,
      ...(typeof spanBias === "number" ? { spanBias } : {}),
      ...(typeof depthBias === "number" ? { depthBias } : {}),
      ...(typeof hostFitWeight === "number" ? { hostFitWeight } : {}),
    };
  };

  switch (runtimeShapeClass) {
    case "scarf":
      registerProfile("wrap-band", "block", "primary", 0.9, 1.02, 0.96);
      registerProfile("knot", "block", "secondary", 0.72, 1.08, 0.9);
      registerProfile("tail-left", "tail", "secondary", 0.82, 0.92, 0.86);
      registerProfile("tail-right", "tail", "secondary", 0.82, 0.92, 0.86);
      registerProfile("tail-fold-left", "generic", "support", 0.28, 0.56, 0.68);
      registerProfile("tail-fold-right", "generic", "support", 0.28, 0.56, 0.68);
      break;
    case "camera-charm":
      registerProfile("device-body", "block", "primary", 1.22, 1.2, 1);
      registerProfile("camera-faceplate", "block", "secondary", 0.54, 0.82, 0.82);
      registerProfile("camera-lens", "lens", "secondary", 0.8, 1.3, 0.9);
      registerProfile("camera-top", "top-cap", "support", 0.34, 0.78, 0.74);
      registerProfile("camera-viewfinder", "top-cap", "support", 0.24, 0.72, 0.7);
      registerProfile("camera-button", "top-cap", "attachment", 0.16, 0.62, 0.64);
      registerProfile("hang-slot", "ring", "attachment", 0.12, 0.5, 0.48);
      break;
    case "boat-charm":
      registerProfile("boat-hull", "hull", "primary", 1.28, 1.12, 1);
      registerProfile("boat-bow", "nose", "support", 0.32, 0.76, 0.72);
      registerProfile("boat-stern", "nose", "support", 0.28, 0.7, 0.7);
      registerProfile("boat-deck", "block", "support", 0.36, 0.7, 0.82);
      registerProfile("boat-mast", "mast", "support", 0.24, 1.08, 0.7);
      registerProfile("boat-sail", "sail", "secondary", 0.74, 0.96, 0.76);
      registerProfile("hang-slot", "ring", "attachment", 0.1, 0.48, 0.46);
      break;
    case "rocket-charm":
      registerProfile("rocket-body", "body", "primary", 1.12, 1.18, 1);
      registerProfile("rocket-nose", "nose", "secondary", 0.46, 1.12, 0.78);
      registerProfile("rocket-fin-left", "fin", "support", 0.34, 0.76, 0.7);
      registerProfile("rocket-fin-right", "fin", "support", 0.34, 0.76, 0.7);
      registerProfile("rocket-nozzle", "nose", "support", 0.28, 0.82, 0.72);
      registerProfile("hang-slot", "ring", "attachment", 0.16, 0.5, 0.48);
      break;
    case "fish-charm":
      registerProfile("body", "body", "primary", 1.18, 1.04, 1);
      registerProfile("tail", "tail", "secondary", 0.7, 0.92, 0.8);
      registerProfile("fin-top", "fin", "support", 0.32, 0.82, 0.72);
      registerProfile("fin-bottom", "fin", "support", 0.28, 0.78, 0.7);
      registerProfile("nose", "nose", "support", 0.22, 0.74, 0.68);
      registerProfile("ring", "ring", "attachment", 0.18, 0.54, 0.5);
      break;
    case "device-generic-charm":
      registerProfile("device-body", "block", "primary", 1.2, 1.08, 1);
      registerProfile("screen-face", "block", "secondary", 0.84, 0.94, 0.84);
      registerProfile("camera-dot", "lens", "support", 0.1, 0.58, 0.52);
      registerProfile("hang-slot", "ring", "attachment", 0.1, 0.38, 0.4);
      break;
    case "star":
      registerProfile("core", "generic", "primary", 0.48, 0.42, 0.92);
      registerProfile("ray-1", "generic", "secondary", 0.74, 0.26, 0.9);
      registerProfile("ray-2", "generic", "secondary", 0.7, 0.24, 0.88);
      registerProfile("ray-3", "generic", "support", 0.66, 0.22, 0.84);
      registerProfile("ray-4", "generic", "support", 0.66, 0.22, 0.84);
      registerProfile("ray-5", "generic", "secondary", 0.7, 0.24, 0.88);
      break;
    case "vehicle-generic-charm":
      registerProfile("vehicle-body", "body", "primary", 1.12, 1.04, 1);
      registerProfile("vehicle-front", "nose", "secondary", 0.42, 0.92, 0.76);
      registerProfile("vehicle-rear", "block", "support", 0.34, 0.82, 0.72);
      registerProfile("hang-slot", "ring", "attachment", 0.18, 0.52, 0.48);
      break;
    default:
      break;
  }

  return uniqueStrings([
    ...criticalParts,
    ...optionalParts,
    attachmentPartId,
  ]).map((partId) => {
    const configured = configuredProfiles[partId];

    if (configured) {
      return configured;
    }

    const isAttachment =
      partId === attachmentPartId ||
      ["hang-slot", "ring", "hoop", "bead-3"].includes(partId);
    const isPrimary =
      partId === criticalParts[0] ||
      ["body", "device-body", "boat-hull", "rocket-body", "vehicle-body", "core"].includes(
        partId,
      );
    const isSecondary = !isPrimary && criticalParts.includes(partId);

    return {
      partId,
      profile: isAttachment ? "ring" : "generic",
      silhouetteRole: isAttachment
        ? "attachment"
        : isPrimary
          ? "primary"
          : isSecondary
            ? "secondary"
            : "support",
    };
  });
}

function buildRuntimeAttachmentRules(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
  partProfiles: PromptCustomizationPartProfile[],
  assemblyRootPartId: string | undefined,
): PromptCustomizationAttachmentRule[] {
  const rules: PromptCustomizationAttachmentRule[] = [];
  const addRootRule = (partId: string | undefined) => {
    if (!partId) {
      return;
    }

    rules.push(
      createAttachmentRule(partId, undefined, "center", "rooted-span", "inherit", 0.004, {
        spanOwnership: "primary",
      }),
    );
  };

  addRootRule(assemblyRootPartId);

  switch (runtimeShapeClass) {
    case "scarf":
      rules.push(
        createAttachmentRule("knot", "wrap-band", "center", "flush-mount", "host-tangent", 0.0032, {
          flushMount: true,
          embedDepth: 0.0024,
          spanOwnership: "secondary",
          supportDependency: "wrap-band",
        }),
        createAttachmentRule("tail-left", "knot", "bottom-left", "supported-branch", "follow-parent", 0.0038, {
          spanOwnership: "secondary",
          supportDependency: "knot",
        }),
        createAttachmentRule("tail-right", "knot", "bottom-right", "supported-branch", "follow-parent", 0.0038, {
          spanOwnership: "secondary",
          supportDependency: "knot",
        }),
        createAttachmentRule(
          "tail-fold-left",
          "tail-left",
          "lower-span",
          "supported-branch",
          "follow-parent",
          0.0042,
          {
            spanOwnership: "support",
            supportDependency: "tail-left",
          },
        ),
        createAttachmentRule(
          "tail-fold-right",
          "tail-right",
          "lower-span",
          "supported-branch",
          "follow-parent",
          0.0042,
          {
            spanOwnership: "support",
            supportDependency: "tail-right",
          },
        ),
      );
      break;
    case "camera-charm":
      rules.push(
        createAttachmentRule("camera-faceplate", "device-body", "front", "flush-mount", "front-facing", 0.003, {
          flushMount: true,
          embedDepth: 0.0052,
          spanOwnership: "secondary",
          supportDependency: "device-body",
        }),
        createAttachmentRule("camera-lens", "device-body", "front", "embedded-front", "front-facing", 0.0022, {
          flushMount: true,
          embedDepth: 0.0072,
          spanOwnership: "secondary",
          supportDependency: "device-body",
        }),
        createAttachmentRule("camera-top", "device-body", "top-right", "flush-mount", "follow-parent", 0.0026, {
          flushMount: true,
          embedDepth: 0.0074,
          spanOwnership: "support",
          supportDependency: "device-body",
        }),
        createAttachmentRule("camera-viewfinder", "device-body", "top-left", "flush-mount", "follow-parent", 0.0026, {
          flushMount: true,
          embedDepth: 0.0074,
          spanOwnership: "support",
          supportDependency: "device-body",
        }),
        createAttachmentRule("camera-button", "camera-top", "top", "flush-mount", "upright", 0.0024, {
          flushMount: true,
          embedDepth: 0.0032,
          spanOwnership: "attachment",
          supportDependency: "camera-top",
        }),
        createAttachmentRule("hang-slot", "device-body", "top", "flush-mount", "upright", 0.0032, {
          flushMount: true,
          embedDepth: 0.0058,
          spanOwnership: "attachment",
          supportDependency: "device-body",
        }),
      );
      break;
    case "boat-charm":
      rules.push(
        createAttachmentRule("boat-bow", "boat-hull", "front", "flush-mount", "follow-parent", 0.0028, {
          flushMount: true,
          spanOwnership: "support",
          supportDependency: "boat-hull",
        }),
        createAttachmentRule("boat-stern", "boat-hull", "rear", "flush-mount", "follow-parent", 0.0028, {
          flushMount: true,
          spanOwnership: "support",
          supportDependency: "boat-hull",
        }),
        createAttachmentRule("boat-deck", "boat-hull", "top", "flush-mount", "follow-parent", 0.0028, {
          flushMount: true,
          embedDepth: 0.0044,
          spanOwnership: "support",
          supportDependency: "boat-hull",
        }),
        createAttachmentRule("boat-mast", "boat-hull", "centerline", "supported-branch", "upright", 0.0026, {
          flushMount: true,
          embedDepth: 0.0034,
          spanOwnership: "support",
          supportDependency: "boat-hull",
        }),
        createAttachmentRule("boat-sail", "boat-mast", "side", "supported-branch", "upright", 0.0026, {
          flushMount: true,
          embedDepth: 0.0046,
          spanOwnership: "secondary",
          supportDependency: "boat-mast",
        }),
        createAttachmentRule("hang-slot", "boat-mast", "top", "free-hang", "upright", 0.0038, {
          spanOwnership: "attachment",
          supportDependency: "boat-mast",
        }),
      );
      break;
    case "rocket-charm":
      rules.push(
        createAttachmentRule("rocket-nose", "rocket-body", "front", "embedded-front", "front-facing", 0.004, {
          flushMount: true,
          embedDepth: 0.002,
          spanOwnership: "secondary",
          supportDependency: "rocket-body",
        }),
        createAttachmentRule("rocket-fin-left", "rocket-body", "rear-left", "side-balance", "follow-parent", 0.005, {
          spanOwnership: "support",
          supportDependency: "rocket-body",
        }),
        createAttachmentRule("rocket-fin-right", "rocket-body", "rear-right", "side-balance", "follow-parent", 0.005, {
          spanOwnership: "support",
          supportDependency: "rocket-body",
        }),
        createAttachmentRule("rocket-nozzle", "rocket-body", "rear", "flush-mount", "follow-parent", 0.0045, {
          flushMount: true,
          spanOwnership: "support",
          supportDependency: "rocket-body",
        }),
        createAttachmentRule("hang-slot", "rocket-body", "top", "free-hang", "upright", 0.0055, {
          spanOwnership: "attachment",
          supportDependency: "rocket-body",
        }),
      );
      break;
    case "device-generic-charm":
      rules.push(
        createAttachmentRule("screen-face", "device-body", "front", "flush-mount", "front-facing", 0.0022, {
          flushMount: true,
          embedDepth: 0.0078,
          spanOwnership: "secondary",
          supportDependency: "device-body",
        }),
        createAttachmentRule("camera-dot", "device-body", "top-right", "flush-mount", "front-facing", 0.002, {
          flushMount: true,
          embedDepth: 0.0052,
          spanOwnership: "support",
          supportDependency: "device-body",
        }),
        createAttachmentRule("hang-slot", "device-body", "top", "flush-mount", "upright", 0.003, {
          flushMount: true,
          embedDepth: 0.0056,
          spanOwnership: "attachment",
          supportDependency: "device-body",
        }),
      );
      break;
    case "fish-charm":
      rules.push(
        createAttachmentRule("tail", "body", "rear", "side-balance", "follow-parent", 0.0045, {
          spanOwnership: "secondary",
          supportDependency: "body",
        }),
        createAttachmentRule("fin-top", "body", "top", "supported-branch", "follow-parent", 0.005, {
          spanOwnership: "support",
          supportDependency: "body",
        }),
        createAttachmentRule("fin-bottom", "body", "bottom", "supported-branch", "follow-parent", 0.005, {
          spanOwnership: "support",
          supportDependency: "body",
        }),
        createAttachmentRule("nose", "body", "front", "embedded-front", "front-facing", 0.004, {
          embedDepth: 0.001,
          spanOwnership: "support",
          supportDependency: "body",
        }),
        createAttachmentRule("ring", "body", "top", "free-hang", "upright", 0.0055, {
          spanOwnership: "attachment",
          supportDependency: "body",
        }),
      );
      break;
    case "star":
      rules.push(
        createAttachmentRule("ray-1", "core", "top", "supported-branch", "follow-parent", 0.0048, {
          spanOwnership: "secondary",
          supportDependency: "core",
        }),
        createAttachmentRule("ray-2", "core", "upper-right", "supported-branch", "follow-parent", 0.0048, {
          spanOwnership: "secondary",
          supportDependency: "core",
        }),
        createAttachmentRule("ray-3", "core", "lower-right", "supported-branch", "follow-parent", 0.0048, {
          spanOwnership: "support",
          supportDependency: "core",
        }),
        createAttachmentRule("ray-4", "core", "lower-left", "supported-branch", "follow-parent", 0.0048, {
          spanOwnership: "support",
          supportDependency: "core",
        }),
        createAttachmentRule("ray-5", "core", "upper-left", "supported-branch", "follow-parent", 0.0048, {
          spanOwnership: "secondary",
          supportDependency: "core",
        }),
      );
      break;
    default:
      break;
  }

  for (const profile of partProfiles) {
    if (
      rules.some((rule) => rule.partId === profile.partId) ||
      profile.partId === assemblyRootPartId
    ) {
      continue;
    }

    rules.push(
      createAttachmentRule(
        profile.partId,
        assemblyRootPartId,
        profile.silhouetteRole === "attachment" ? "top" : "center",
        profile.silhouetteRole === "attachment" ? "free-hang" : "supported-branch",
        profile.silhouetteRole === "attachment" ? "upright" : "follow-parent",
        profile.silhouetteRole === "attachment" ? 0.006 : 0.008,
        {
          spanOwnership: profile.silhouetteRole,
          supportDependency: assemblyRootPartId,
        },
      ),
    );
  }

  return rules;
}

function buildRuntimePartImportanceWeights(
  partProfiles: PromptCustomizationPartProfile[],
): Record<string, number> {
  return Object.fromEntries(
    partProfiles.map((profile) => [
      profile.partId,
      Number(
        (
          profile.silhouetteRole === "primary"
            ? 1
            : profile.silhouetteRole === "secondary"
              ? 0.84
              : profile.silhouetteRole === "support"
                ? 0.66
                : 0.44
        ).toFixed(2),
      ),
    ]),
  );
}

function buildRuntimeSymmetryPolicy(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
  designArchetype: PromptCustomizationDesignArchetype,
): PromptCustomizationSymmetryPolicy {
  if (runtimeShapeClass === "scarf") {
    return "soft-bilateral";
  }

  if (runtimeShapeClass === "rocket-charm" || runtimeShapeClass === "camera-charm") {
    return "strict-bilateral";
  }

  if (
    runtimeShapeClass === "boat-charm" ||
    runtimeShapeClass === "fish-charm" ||
    designArchetype === "device-charm" ||
    designArchetype === "vehicle-charm"
  ) {
    return "soft-bilateral";
  }

  if (runtimeShapeClass === "star") {
    return "radial";
  }

  return "inherit-recipe";
}

function buildRuntimeDeformationPolicy(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
  designArchetype: PromptCustomizationDesignArchetype,
): PromptCustomizationDeformationPolicy[] {
  if (runtimeShapeClass === "scarf") {
    return ["preserve-blocking", "span-separation", "host-clearance"];
  }

  if (runtimeShapeClass === "camera-charm") {
    return ["preserve-blocking", "front-protrusion", "host-clearance"];
  }

  if (runtimeShapeClass === "boat-charm") {
    return ["preserve-blocking", "supported-upright", "span-separation", "host-clearance"];
  }

  if (runtimeShapeClass === "fish-charm") {
    return ["preserve-blocking", "tail-emphasis", "span-separation", "host-clearance"];
  }

  if (runtimeShapeClass === "rocket-charm") {
    return ["preserve-blocking", "front-protrusion", "supported-upright", "host-clearance"];
  }

  if (designArchetype === "tool-charm") {
    return ["preserve-blocking", "host-clearance"];
  }

  if (designArchetype === "botanical-charm") {
    return ["soft-bloom", "host-clearance"];
  }

  if (runtimeShapeClass === "star") {
    return ["preserve-blocking", "span-separation", "host-clearance"];
  }

  return ["preserve-blocking", "host-clearance"];
}

function buildRuntimeSilhouetteTemplate(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["silhouetteTemplate"] {
  switch (runtimeShapeClass) {
    case "camera-charm":
      return "camera-front-lens";
    case "boat-charm":
      return "boat-hull-mast-sail";
    case "fish-charm":
      return "fish-body-tail";
    case "rocket-charm":
      return "rocket-body-fin";
    case "device-generic-charm":
      return "device-screen-face";
    case "star":
      return "five-point-star";
    default:
      return "generic-ornament";
  }
}

function buildRuntimeSilhouetteBlocks(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationSilhouetteBlock[] {
  const stage = (
    value: PromptCustomizationRefinementStage,
  ): PromptCustomizationRefinementStage => value;

  switch (runtimeShapeClass) {
    case "scarf":
      return [
        {
          blockId: "scarf-wrap-band",
          ownerPartId: "wrap-band",
          semanticRole: "root-mass",
          profile: "body-mass",
          stage: stage("blocking"),
          spanPriority: 1,
          depthPriority: 0.38,
        },
        {
          blockId: "scarf-center-knot",
          ownerPartId: "knot",
          semanticRole: "generic",
          profile: "generic",
          stage: stage("assembly-rooting"),
          spanPriority: 0.42,
          depthPriority: 0.54,
        },
        {
          blockId: "scarf-dual-tails",
          ownerPartId: "tail-left",
          semanticRole: "generic",
          profile: "generic",
          stage: stage("silhouette-forming"),
          spanPriority: 0.76,
          depthPriority: 0.22,
        },
      ];
    case "camera-charm":
      return [
        {
          blockId: "camera-root-mass",
          ownerPartId: "device-body",
          semanticRole: "root-mass",
          profile: "body-mass",
          stage: stage("blocking"),
          spanPriority: 1,
          depthPriority: 0.88,
        },
        {
          blockId: "camera-front-lens",
          ownerPartId: "camera-lens",
          semanticRole: "front-protrusion",
          profile: "front-bulge",
          stage: stage("silhouette-forming"),
          spanPriority: 0.84,
          depthPriority: 1,
        },
        {
          blockId: "camera-top-cluster",
          ownerPartId: "camera-top",
          semanticRole: "top-cluster",
          profile: "top-ridge",
          stage: stage("assembly-rooting"),
          spanPriority: 0.42,
          depthPriority: 0.4,
        },
        {
          blockId: "camera-hang-loop",
          ownerPartId: "hang-slot",
          semanticRole: "attachment-loop",
          profile: "loop",
          stage: stage("host-fit"),
          spanPriority: 0.12,
          depthPriority: 0.1,
        },
      ];
    case "boat-charm":
      return [
        {
          blockId: "boat-root-hull",
          ownerPartId: "boat-hull",
          semanticRole: "root-mass",
          profile: "body-mass",
          stage: stage("blocking"),
          spanPriority: 1,
          depthPriority: 0.72,
        },
        {
          blockId: "boat-sail-plane",
          ownerPartId: "boat-sail",
          semanticRole: "sail-plane",
          profile: "tri-plane",
          stage: stage("silhouette-forming"),
          spanPriority: 0.7,
          depthPriority: 0.54,
        },
        {
          blockId: "boat-support-mast",
          ownerPartId: "boat-mast",
          semanticRole: "support-stem",
          profile: "upright-stem",
          stage: stage("assembly-rooting"),
          spanPriority: 0.34,
          depthPriority: 0.36,
        },
        {
          blockId: "boat-hang-loop",
          ownerPartId: "hang-slot",
          semanticRole: "attachment-loop",
          profile: "loop",
          stage: stage("host-fit"),
          spanPriority: 0.1,
          depthPriority: 0.08,
        },
      ];
    case "rocket-charm":
      return [
        {
          blockId: "rocket-root-body",
          ownerPartId: "rocket-body",
          semanticRole: "root-mass",
          profile: "body-mass",
          stage: stage("blocking"),
          spanPriority: 1,
          depthPriority: 0.9,
        },
        {
          blockId: "rocket-front-nose",
          ownerPartId: "rocket-nose",
          semanticRole: "front-protrusion",
          profile: "front-bulge",
          stage: stage("silhouette-forming"),
          spanPriority: 0.56,
          depthPriority: 0.96,
        },
        {
          blockId: "rocket-hang-loop",
          ownerPartId: "hang-slot",
          semanticRole: "attachment-loop",
          profile: "loop",
          stage: stage("host-fit"),
          spanPriority: 0.1,
          depthPriority: 0.08,
        },
      ];
    case "device-generic-charm":
      return [
        {
          blockId: "device-root-mass",
          ownerPartId: "device-body",
          semanticRole: "root-mass",
          profile: "body-mass",
          stage: stage("blocking"),
          spanPriority: 1,
          depthPriority: 0.82,
        },
        {
          blockId: "device-front-face",
          ownerPartId: "screen-face",
          semanticRole: "front-protrusion",
          profile: "front-bulge",
          stage: stage("silhouette-forming"),
          spanPriority: 0.7,
          depthPriority: 0.92,
        },
        {
          blockId: "device-top-hang",
          ownerPartId: "hang-slot",
          semanticRole: "attachment-loop",
          profile: "loop",
          stage: stage("host-fit"),
          spanPriority: 0.1,
          depthPriority: 0.08,
        },
      ];
    case "star":
      return [
        {
          blockId: "star-root-core",
          ownerPartId: "core",
          semanticRole: "root-mass",
          profile: "body-mass",
          stage: stage("blocking"),
          spanPriority: 0.72,
          depthPriority: 0.52,
        },
        {
          blockId: "star-ray-crown",
          ownerPartId: "ray-1",
          semanticRole: "generic",
          profile: "generic",
          stage: stage("silhouette-forming"),
          spanPriority: 1,
          depthPriority: 0.42,
        },
      ];
    case "vehicle-generic-charm":
      return [
        {
          blockId: "vehicle-root-mass",
          ownerPartId: "vehicle-body",
          semanticRole: "root-mass",
          profile: "body-mass",
          stage: stage("blocking"),
          spanPriority: 1,
          depthPriority: 0.8,
        },
        {
          blockId: "vehicle-support-stem",
          ownerPartId: "vehicle-front",
          semanticRole: "support-stem",
          profile: "upright-stem",
          stage: stage("assembly-rooting"),
          spanPriority: 0.42,
          depthPriority: 0.48,
        },
      ];
    default:
      return [];
  }
}

function buildRuntimeAssemblySegments(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationAssemblySegment[] {
  switch (runtimeShapeClass) {
    case "scarf":
      return [
        {
          segmentId: "scarf-rooted-wrap",
          ownerPartId: "wrap-band",
          relation: "rooted-mass",
          stage: "blocking",
          continuityWeight: 1,
        },
        {
          segmentId: "scarf-mounted-knot",
          ownerPartId: "knot",
          parentSegmentId: "scarf-rooted-wrap",
          relation: "front-mounted",
          stage: "assembly-rooting",
          continuityWeight: 0.88,
        },
        {
          segmentId: "scarf-left-tail",
          ownerPartId: "tail-left",
          parentSegmentId: "scarf-mounted-knot",
          relation: "bridged",
          stage: "silhouette-forming",
          continuityWeight: 0.84,
        },
        {
          segmentId: "scarf-right-tail",
          ownerPartId: "tail-right",
          parentSegmentId: "scarf-mounted-knot",
          relation: "bridged",
          stage: "silhouette-forming",
          continuityWeight: 0.84,
        },
      ];
    case "camera-charm":
      return [
        {
          segmentId: "camera-rooted-body",
          ownerPartId: "device-body",
          relation: "rooted-mass",
          stage: "blocking",
          continuityWeight: 1,
        },
        {
          segmentId: "camera-front-mounted-lens",
          ownerPartId: "camera-lens",
          parentSegmentId: "camera-rooted-body",
          relation: "front-mounted",
          stage: "silhouette-forming",
          continuityWeight: 0.92,
        },
        {
          segmentId: "camera-top-mounted-cluster",
          ownerPartId: "camera-top",
          parentSegmentId: "camera-rooted-body",
          relation: "top-mounted",
          stage: "assembly-rooting",
          continuityWeight: 0.86,
        },
        {
          segmentId: "camera-free-hang",
          ownerPartId: "hang-slot",
          parentSegmentId: "camera-top-mounted-cluster",
          relation: "free-hang",
          stage: "host-fit",
          continuityWeight: 0.62,
        },
      ];
    case "boat-charm":
      return [
        {
          segmentId: "boat-rooted-hull",
          ownerPartId: "boat-hull",
          relation: "rooted-mass",
          stage: "blocking",
          continuityWeight: 1,
        },
        {
          segmentId: "boat-upright-mast",
          ownerPartId: "boat-mast",
          parentSegmentId: "boat-rooted-hull",
          relation: "supported-upright",
          stage: "assembly-rooting",
          continuityWeight: 0.9,
        },
        {
          segmentId: "boat-bridged-sail",
          ownerPartId: "boat-sail",
          parentSegmentId: "boat-upright-mast",
          relation: "bridged",
          stage: "silhouette-forming",
          continuityWeight: 0.82,
        },
        {
          segmentId: "boat-free-hang",
          ownerPartId: "hang-slot",
          parentSegmentId: "boat-upright-mast",
          relation: "free-hang",
          stage: "host-fit",
          continuityWeight: 0.58,
        },
      ];
    case "rocket-charm":
      return [
        {
          segmentId: "rocket-rooted-body",
          ownerPartId: "rocket-body",
          relation: "rooted-mass",
          stage: "blocking",
          continuityWeight: 1,
        },
        {
          segmentId: "rocket-front-mounted-nose",
          ownerPartId: "rocket-nose",
          parentSegmentId: "rocket-rooted-body",
          relation: "front-mounted",
          stage: "silhouette-forming",
          continuityWeight: 0.88,
        },
      ];
    case "device-generic-charm":
      return [
        {
          segmentId: "device-rooted-body",
          ownerPartId: "device-body",
          relation: "rooted-mass",
          stage: "blocking",
          continuityWeight: 1,
        },
        {
          segmentId: "device-front-screen",
          ownerPartId: "screen-face",
          parentSegmentId: "device-rooted-body",
          relation: "front-mounted",
          stage: "silhouette-forming",
          continuityWeight: 0.88,
        },
        {
          segmentId: "device-free-hang",
          ownerPartId: "hang-slot",
          parentSegmentId: "device-rooted-body",
          relation: "free-hang",
          stage: "host-fit",
          continuityWeight: 0.58,
        },
      ];
    default:
      return [];
  }
}

function buildRuntimeMountStrategy(
  anchor: PromptCustomizationAccessoryAnchor,
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
  designArchetype: PromptCustomizationDesignArchetype,
): PromptCustomizationMountStrategy {
  if (isChestAccessoryAnchor(anchor)) {
    return "chest-forward";
  }

  if (isTailAccessoryAnchor(anchor)) {
    return "tail-follow";
  }

  if (runtimeShapeClass === "camera-charm" || designArchetype === "device-charm") {
    return "ear-side-front-facing";
  }

  if (
    runtimeShapeClass === "star" ||
    runtimeShapeClass === "badge" ||
    runtimeShapeClass === "open-symbol-ornament" ||
    designArchetype === "symbol-charm"
  ) {
    return "ear-side-front-facing";
  }

  if (runtimeShapeClass === "boat-charm" || designArchetype === "vehicle-charm") {
    return "ear-side-top-hook";
  }

  return "ear-side-drop";
}

function buildRuntimeReadOrderTargets(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
  criticalParts: string[],
): string[] {
  switch (runtimeShapeClass) {
    case "camera-charm":
      return ["device-body", "camera-lens", "camera-top"];
    case "boat-charm":
      return ["boat-hull", "boat-sail", "boat-mast"];
    case "rocket-charm":
      return ["rocket-body", "rocket-nose", "rocket-fin-left"];
    case "fish-charm":
      return ["body", "tail", "fin-top"];
    case "star":
      return ["core", "ray-1", "ray-2"];
    case "device-generic-charm":
      return ["device-body", "screen-face", "camera-dot"];
    case "vehicle-generic-charm":
      return ["vehicle-body", "vehicle-front", "vehicle-rear"];
    default:
      return criticalParts.slice(0, 3);
  }
}

function buildRuntimeCriticalViewGoals(
  anchor: PromptCustomizationAccessoryAnchor,
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): string[] {
  const anchorGoal = isChestAccessoryAnchor(anchor)
    ? "胸前视图 first read 要先读到主轮廓。"
    : isTailAccessoryAnchor(anchor)
      ? "尾侧 3/4 视图必须还能读出请求 noun。"
      : "耳侧 front / 3/4 视图 first read 必须先读到主轮廓。";

  switch (runtimeShapeClass) {
    case "scarf":
      return [
        anchorGoal,
        "围巾必须先读到横向包裹带，再读中心结和两条下垂尾片。",
        "围巾尾片必须 rooted 到中心结，不能看起来像黑色球团或领带主片。",
      ];
    case "camera-charm":
      return [
        anchorGoal,
        "front 视图必须先读到 device-body，再读到 camera-lens 前出段。",
        "top cluster 不能像漂浮碎块。",
      ];
    case "boat-charm":
      return [
        anchorGoal,
        "front / 3/4 视图必须先读到 boat-hull，再读到 sail-plane。",
        "mast 必须 rooted 到 hull，不得像独立细杆。",
      ];
    case "rocket-charm":
      return [
        anchorGoal,
        "rocket-body 必须先读到，再读 nose/fin。",
      ];
    case "device-generic-charm":
      return [
        anchorGoal,
        "front / 3/4 视图必须先读到 device-body，再读到 screen-face。",
        "hang-slot 和 camera-dot 只能辅助，不得抢主轮廓。",
      ];
    case "star":
      return [
        anchorGoal,
        "front / 3/4 视图必须先读到五角星轮廓，而不是中心圆核。",
        "所有 ray 必须 rooted 到 core，不得像散开的独立碎片。",
      ];
    default:
      return [anchorGoal];
  }
}

function buildRuntimeHostFitEnvelope(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["hostFitEnvelope"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return {
        anchorEnvelope: [0.042, 0.016, 0.03],
        maxSpan: [0.052, 0.018, 0.038],
        preferredYaw: 0,
        screenFacingBias: 0.96,
        faceIntrusionBudget: 0.08,
        eyeKeepout: true,
        earClearance: 0.016,
      };
    case "fish-charm":
      return {
        anchorEnvelope: [0.022, 0.016, 0.026],
        maxSpan: [0.027, 0.018, 0.03],
        preferredYaw: 12,
        screenFacingBias: 0.82,
        faceIntrusionBudget: 0.16,
        eyeKeepout: true,
        earClearance: 0.01,
      };
    case "flower":
      return {
        anchorEnvelope: [0.024, 0.016, 0.022],
        maxSpan: [0.028, 0.018, 0.026],
        preferredYaw: 8,
        screenFacingBias: 0.76,
        faceIntrusionBudget: 0.18,
        eyeKeepout: true,
        earClearance: 0.011,
      };
    case "clover-charm":
      return {
        anchorEnvelope: [0.024, 0.016, 0.024],
        maxSpan: [0.029, 0.018, 0.028],
        preferredYaw: 10,
        screenFacingBias: 0.78,
        faceIntrusionBudget: 0.18,
        eyeKeepout: true,
        earClearance: 0.011,
      };
    case "star":
      return {
        anchorEnvelope: [0.024, 0.016, 0.024],
        maxSpan: [0.029, 0.018, 0.03],
        preferredYaw: 16,
        screenFacingBias: 0.92,
        faceIntrusionBudget: 0.18,
        eyeKeepout: true,
        earClearance: 0.012,
      };
    case "camera-charm":
      return {
        anchorEnvelope: [0.022, 0.014, 0.024],
        maxSpan: [0.026, 0.016, 0.028],
        preferredYaw: 18,
        screenFacingBias: 0.92,
        faceIntrusionBudget: 0.08,
        eyeKeepout: true,
        earClearance: 0.014,
      };
    case "boat-charm":
      return {
        anchorEnvelope: [0.03, 0.018, 0.032],
        maxSpan: [0.035, 0.021, 0.036],
        preferredYaw: 18,
        screenFacingBias: 0.86,
        faceIntrusionBudget: 0.1,
        eyeKeepout: true,
        earClearance: 0.013,
      };
    case "rocket-charm":
      return {
        anchorEnvelope: [0.03, 0.02, 0.034],
        maxSpan: [0.03, 0.022, 0.038],
        preferredYaw: 18,
        screenFacingBias: 0.86,
        faceIntrusionBudget: 0.18,
        eyeKeepout: true,
        earClearance: 0.008,
      };
    case "device-generic-charm":
      return {
        anchorEnvelope: [0.021, 0.014, 0.025],
        maxSpan: [0.025, 0.016, 0.029],
        preferredYaw: 20,
        screenFacingBias: 0.92,
        faceIntrusionBudget: 0.08,
        eyeKeepout: true,
        earClearance: 0.014,
      };
    default:
      return {
        anchorEnvelope: [0.032, 0.024, 0.034],
        maxSpan: [0.036, 0.026, 0.038],
        preferredYaw: 14,
        screenFacingBias: 0.8,
        faceIntrusionBudget: 0.22,
        eyeKeepout: true,
        earClearance: 0.007,
      };
  }
}

function buildRuntimePartSpanTargets(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["partSpanTargets"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return [
        { partId: "wrap-band", minShare: 0.24, maxShare: 0.42 },
        { partId: "knot", minShare: 0.12, maxShare: 0.24 },
        { partId: "tail-left", minShare: 0.16, maxShare: 0.28 },
        { partId: "tail-right", minShare: 0.16, maxShare: 0.28 },
      ];
    case "flower":
      return [
        { partId: "core", minShare: 0.12, maxShare: 0.24 },
        { partId: "petal-left", minShare: 0.12, maxShare: 0.22 },
        { partId: "petal-right", minShare: 0.12, maxShare: 0.22 },
        { partId: "petal-top", minShare: 0.1, maxShare: 0.2 },
        { partId: "petal-bottom", minShare: 0.08, maxShare: 0.18 },
      ];
    case "clover-charm":
      return [
        { partId: "core", minShare: 0.08, maxShare: 0.18 },
        { partId: "leaf-left", minShare: 0.12, maxShare: 0.24 },
        { partId: "leaf-right", minShare: 0.12, maxShare: 0.24 },
        { partId: "leaf-top", minShare: 0.12, maxShare: 0.24 },
        { partId: "leaf-bottom", minShare: 0.1, maxShare: 0.22 },
        { partId: "stem", minShare: 0.04, maxShare: 0.12 },
        { partId: "ring", minShare: 0.02, maxShare: 0.08 },
      ];
    case "star":
      return [
        { partId: "core", minShare: 0.1, maxShare: 0.22 },
        { partId: "ray-1", minShare: 0.12, maxShare: 0.22 },
        { partId: "ray-2", minShare: 0.12, maxShare: 0.2 },
        { partId: "ray-3", minShare: 0.1, maxShare: 0.18 },
        { partId: "ray-4", minShare: 0.1, maxShare: 0.18 },
        { partId: "ray-5", minShare: 0.12, maxShare: 0.2 },
      ];
    case "camera-charm":
      return [
        { partId: "device-body", minShare: 0.5, maxShare: 0.72 },
        { partId: "camera-lens", minShare: 0.18, maxShare: 0.32 },
        { partId: "camera-top", minShare: 0.08, maxShare: 0.18 },
        { partId: "hang-slot", minShare: 0.02, maxShare: 0.08 },
      ];
    case "boat-charm":
      return [
        { partId: "boat-hull", minShare: 0.6, maxShare: 0.82 },
        { partId: "boat-mast", minShare: 0.08, maxShare: 0.18 },
        { partId: "boat-sail", minShare: 0.16, maxShare: 0.3 },
        { partId: "hang-slot", minShare: 0.02, maxShare: 0.08 },
      ];
    case "fish-charm":
      return [
        { partId: "body", minShare: 0.52, maxShare: 0.72 },
        { partId: "tail", minShare: 0.16, maxShare: 0.28 },
        { partId: "ring", minShare: 0.02, maxShare: 0.08 },
      ];
    case "device-generic-charm":
      return [
        { partId: "device-body", minShare: 0.58, maxShare: 0.76 },
        { partId: "screen-face", minShare: 0.24, maxShare: 0.4 },
        { partId: "camera-dot", minShare: 0.03, maxShare: 0.08 },
        { partId: "hang-slot", minShare: 0.02, maxShare: 0.05 },
      ];
    default:
      return [];
  }
}

function buildRuntimePartDepthTargets(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["partDepthTargets"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return [
        { partId: "wrap-band", minDepth: 0.1, maxDepth: 0.18 },
        { partId: "knot", minDepth: 0.1, maxDepth: 0.18 },
        { partId: "tail-left", minDepth: 0.06, maxDepth: 0.14 },
        { partId: "tail-right", minDepth: 0.06, maxDepth: 0.14 },
      ];
    case "flower":
      return [
        { partId: "core", minDepth: 0.08, maxDepth: 0.14 },
        { partId: "petal-left", minDepth: 0.04, maxDepth: 0.1 },
        { partId: "petal-right", minDepth: 0.04, maxDepth: 0.1 },
        { partId: "petal-top", minDepth: 0.04, maxDepth: 0.1 },
        { partId: "petal-bottom", minDepth: 0.04, maxDepth: 0.1 },
      ];
    case "clover-charm":
      return [
        { partId: "core", minDepth: 0.07, maxDepth: 0.12 },
        { partId: "leaf-left", minDepth: 0.04, maxDepth: 0.09 },
        { partId: "leaf-right", minDepth: 0.04, maxDepth: 0.09 },
        { partId: "leaf-top", minDepth: 0.04, maxDepth: 0.09 },
        { partId: "leaf-bottom", minDepth: 0.04, maxDepth: 0.09 },
        { partId: "stem", minDepth: 0.03, maxDepth: 0.07 },
        { partId: "ring", minDepth: 0.03, maxDepth: 0.06 },
      ];
    case "star":
      return [
        { partId: "core", minDepth: 0.06, maxDepth: 0.12 },
        { partId: "ray-1", minDepth: 0.015, maxDepth: 0.06 },
        { partId: "ray-2", minDepth: 0.015, maxDepth: 0.06 },
        { partId: "ray-3", minDepth: 0.015, maxDepth: 0.055 },
        { partId: "ray-4", minDepth: 0.015, maxDepth: 0.055 },
        { partId: "ray-5", minDepth: 0.015, maxDepth: 0.06 },
      ];
    case "camera-charm":
      return [
        { partId: "device-body", minDepth: 0.17, maxDepth: 0.24 },
        { partId: "camera-lens", minDepth: 0.34, maxDepth: 0.56 },
        { partId: "camera-top", minDepth: 0.1, maxDepth: 0.18 },
        { partId: "camera-viewfinder", minDepth: 0.08, maxDepth: 0.16 },
        { partId: "hang-slot", minDepth: 0.04, maxDepth: 0.08 },
      ];
    case "boat-charm":
      return [
        { partId: "boat-hull", minDepth: 0.15, maxDepth: 0.22 },
        { partId: "boat-deck", minDepth: 0.08, maxDepth: 0.14 },
        { partId: "boat-mast", minDepth: 0.05, maxDepth: 0.08 },
        { partId: "boat-sail", minDepth: 0.06, maxDepth: 0.12 },
        { partId: "hang-slot", minDepth: 0.04, maxDepth: 0.08 },
      ];
    case "fish-charm":
      return [
        { partId: "body", minDepth: 0.36, maxDepth: 0.54 },
        { partId: "tail", minDepth: 0.14, maxDepth: 0.24 },
        { partId: "ring", minDepth: 0.04, maxDepth: 0.08 },
      ];
    case "device-generic-charm":
      return [
        { partId: "device-body", minDepth: 0.12, maxDepth: 0.18 },
        { partId: "screen-face", minDepth: 0.03, maxDepth: 0.08 },
        { partId: "camera-dot", minDepth: 0.04, maxDepth: 0.08 },
        { partId: "hang-slot", minDepth: 0.03, maxDepth: 0.06 },
      ];
    default:
      return [];
  }
}

function buildRuntimeAttachmentAnchors(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["attachmentAnchors"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return [
        {
          anchorId: "scarf-knot-center",
          partId: "knot",
          parentPartId: "wrap-band",
          mountFace: "center",
          preferredOffset: [0, 0.0016, -0.008],
          flushMount: true,
          embedDepth: 0.0018,
        },
        {
          anchorId: "scarf-tail-left",
          partId: "tail-left",
          parentPartId: "knot",
          mountFace: "bottom-left",
          preferredOffset: [-0.01, 0.001, -0.018],
          flushMount: true,
          embedDepth: 0.001,
        },
        {
          anchorId: "scarf-tail-right",
          partId: "tail-right",
          parentPartId: "knot",
          mountFace: "bottom-right",
          preferredOffset: [0.01, 0.001, -0.018],
          flushMount: true,
          embedDepth: 0.001,
        },
      ];
    case "flower":
      return [
        {
          anchorId: "flower-petal-left",
          partId: "petal-left",
          parentPartId: "core",
          mountFace: "center",
          preferredOffset: [-0.012, 0, 0.002],
          flushMount: true,
          embedDepth: 0.0012,
        },
        {
          anchorId: "flower-petal-right",
          partId: "petal-right",
          parentPartId: "core",
          mountFace: "center",
          preferredOffset: [0.012, 0, 0.002],
          flushMount: true,
          embedDepth: 0.0012,
        },
        {
          anchorId: "flower-petal-top",
          partId: "petal-top",
          parentPartId: "core",
          mountFace: "center",
          preferredOffset: [0, 0, 0.014],
          flushMount: true,
          embedDepth: 0.0012,
        },
        {
          anchorId: "flower-petal-bottom",
          partId: "petal-bottom",
          parentPartId: "core",
          mountFace: "center",
          preferredOffset: [0, 0, -0.012],
          flushMount: true,
          embedDepth: 0.0012,
        },
        {
          anchorId: "flower-petal-top-left",
          partId: "petal-top-left",
          parentPartId: "core",
          mountFace: "center",
          preferredOffset: [-0.01, 0, 0.01],
          flushMount: true,
          embedDepth: 0.001,
        },
        {
          anchorId: "flower-petal-top-right",
          partId: "petal-top-right",
          parentPartId: "core",
          mountFace: "center",
          preferredOffset: [0.01, 0, 0.01],
          flushMount: true,
          embedDepth: 0.001,
        },
      ];
    case "clover-charm":
      return [
        {
          anchorId: "clover-leaf-left",
          partId: "leaf-left",
          parentPartId: "core",
          mountFace: "center",
          preferredOffset: [-0.012, 0, 0.002],
          flushMount: true,
          embedDepth: 0.0011,
        },
        {
          anchorId: "clover-leaf-right",
          partId: "leaf-right",
          parentPartId: "core",
          mountFace: "center",
          preferredOffset: [0.012, 0, 0.002],
          flushMount: true,
          embedDepth: 0.0011,
        },
        {
          anchorId: "clover-leaf-top",
          partId: "leaf-top",
          parentPartId: "core",
          mountFace: "center",
          preferredOffset: [0, 0, 0.014],
          flushMount: true,
          embedDepth: 0.0011,
        },
        {
          anchorId: "clover-leaf-bottom",
          partId: "leaf-bottom",
          parentPartId: "core",
          mountFace: "center",
          preferredOffset: [0, 0, -0.011],
          flushMount: true,
          embedDepth: 0.0011,
        },
        {
          anchorId: "clover-stem-root",
          partId: "stem",
          parentPartId: "core",
          mountFace: "bottom",
          preferredOffset: [0.004, 0, -0.015],
          flushMount: true,
          embedDepth: 0.001,
        },
        {
          anchorId: "clover-ring-top",
          partId: "ring",
          parentPartId: "core",
          mountFace: "top",
          preferredOffset: [0.002, 0, 0.018],
        },
      ];
    case "camera-charm":
      return [
        {
          anchorId: "camera-lens-front",
          partId: "camera-lens",
          parentPartId: "device-body",
          mountFace: "front",
          preferredOffset: [0.006, -0.013, 0.002],
          flushMount: true,
          embedDepth: 0.0028,
        },
        {
          anchorId: "camera-top-right",
          partId: "camera-top",
          parentPartId: "device-body",
          mountFace: "top-right",
          preferredOffset: [0.0048, 0.0004, 0.0142],
          flushMount: true,
          embedDepth: 0.0024,
        },
        {
          anchorId: "camera-viewfinder-left",
          partId: "camera-viewfinder",
          parentPartId: "device-body",
          mountFace: "top-left",
          preferredOffset: [-0.0058, 0.0004, 0.0138],
          flushMount: true,
          embedDepth: 0.0022,
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
      ];
    case "boat-charm":
      return [
        {
          anchorId: "boat-mast-root",
          partId: "boat-mast",
          parentPartId: "boat-hull",
          mountFace: "centerline",
          preferredOffset: [0, 0.001, 0.011],
          flushMount: true,
          embedDepth: 0.0014,
        },
        {
          anchorId: "boat-sail-side",
          partId: "boat-sail",
          parentPartId: "boat-mast",
          mountFace: "side",
          preferredOffset: [0.003, 0.0012, 0.0104],
          flushMount: true,
          embedDepth: 0.0022,
        },
        {
          anchorId: "boat-hang-top",
          partId: "hang-slot",
          parentPartId: "boat-mast",
          mountFace: "top",
          preferredOffset: [0, 0.001, 0.027],
        },
      ];
    case "fish-charm":
      return [
        {
          anchorId: "fish-tail-rear",
          partId: "tail",
          parentPartId: "body",
          mountFace: "rear",
          preferredOffset: [-0.018, 0, 0],
        },
        {
          anchorId: "fish-fin-top",
          partId: "fin-top",
          parentPartId: "body",
          mountFace: "top",
          preferredOffset: [-0.002, 0, 0.01],
          flushMount: true,
          embedDepth: 0.001,
        },
        {
          anchorId: "fish-fin-bottom",
          partId: "fin-bottom",
          parentPartId: "body",
          mountFace: "bottom",
          preferredOffset: [0.003, 0, -0.009],
          flushMount: true,
          embedDepth: 0.001,
        },
        {
          anchorId: "fish-ring-top",
          partId: "ring",
          parentPartId: "body",
          mountFace: "top",
          preferredOffset: [0, 0.002, 0.016],
        },
      ];
    case "device-generic-charm":
      return [
        {
          anchorId: "device-screen-front",
          partId: "screen-face",
          parentPartId: "device-body",
          mountFace: "front",
          preferredOffset: [0, -0.0095, 0.002],
          flushMount: true,
          embedDepth: 0.0026,
        },
        {
          anchorId: "device-camera-corner",
          partId: "camera-dot",
          parentPartId: "device-body",
          mountFace: "top-right",
          preferredOffset: [0.01, -0.0095, 0.02],
          flushMount: true,
          embedDepth: 0.002,
        },
        {
          anchorId: "device-hang-top",
          partId: "hang-slot",
          parentPartId: "device-body",
          mountFace: "top",
          preferredOffset: [0, 0.0002, 0.0165],
          flushMount: true,
          embedDepth: 0.0012,
        },
      ];
    default:
      return [];
  }
}

function buildRuntimeSilhouetteKeepouts(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["silhouetteKeepouts"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return [
        {
          keepoutId: "scarf-wrap-rooted",
          partId: "wrap-band",
          behavior: "rooted-only",
          severity: "hard",
        },
        {
          keepoutId: "scarf-knot-subordinate",
          partId: "knot",
          behavior: "keep-within-root",
          severity: "soft",
        },
      ];
    case "flower":
      return [
        {
          keepoutId: "flower-core-visible",
          partId: "core",
          behavior: "keep-within-root",
          severity: "soft",
        },
      ];
    case "clover-charm":
      return [
        {
          keepoutId: "clover-ring-subordinate",
          partId: "ring",
          behavior: "subordinate",
          severity: "hard",
        },
      ];
    case "camera-charm":
      return [
        {
          keepoutId: "camera-hang-subordinate",
          partId: "hang-slot",
          behavior: "subordinate",
          severity: "hard",
        },
        {
          keepoutId: "camera-top-within-root",
          partId: "camera-top",
          behavior: "keep-within-root",
          severity: "soft",
        },
        {
          keepoutId: "camera-viewfinder-within-root",
          partId: "camera-viewfinder",
          behavior: "keep-within-root",
          severity: "soft",
        },
      ];
    case "boat-charm":
      return [
        {
          keepoutId: "boat-hang-subordinate",
          partId: "hang-slot",
          behavior: "subordinate",
          severity: "hard",
        },
        {
          keepoutId: "boat-mast-rooted",
          partId: "boat-mast",
          behavior: "rooted-only",
          severity: "hard",
        },
        {
          keepoutId: "boat-sail-rooted",
          partId: "boat-sail",
          behavior: "rooted-only",
          severity: "hard",
        },
      ];
    case "fish-charm":
      return [
        {
          keepoutId: "fish-ring-subordinate",
          partId: "ring",
          behavior: "subordinate",
          severity: "soft",
        },
      ];
    case "device-generic-charm":
      return [
        {
          keepoutId: "device-hang-subordinate",
          partId: "hang-slot",
          behavior: "subordinate",
          severity: "hard",
        },
        {
          keepoutId: "device-screen-within-root",
          partId: "screen-face",
          behavior: "keep-within-root",
          severity: "soft",
        },
        {
          keepoutId: "device-dot-within-root",
          partId: "camera-dot",
          behavior: "keep-within-root",
          severity: "soft",
        },
      ];
    default:
      return [];
  }
}

function buildRuntimeDominantContour(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["dominantContour"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return "wrap-band-with-dual-tails";
    case "camera-charm":
      return "body-lens-forward";
    case "boat-charm":
      return "hull-upright-sail";
    case "fish-charm":
      return "body-tail";
    case "rocket-charm":
      return "body-nose-forward";
    case "device-generic-charm":
      return "device-front-face";
    case "vehicle-generic-charm":
      return "vehicle-forward-spine";
    default:
      return undefined;
  }
}

function buildRuntimeSideDepthProfile(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["sideDepthProfile"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return "thin-slab";
    case "camera-charm":
      return "front-loaded";
    case "boat-charm":
    case "fish-charm":
      return "balanced";
    case "rocket-charm":
      return "front-loaded";
    case "device-generic-charm":
      return "thin-slab";
    case "vehicle-generic-charm":
      return "balanced";
    default:
      return undefined;
  }
}

function buildRuntimeDominantSpanOwner(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["dominantSpanOwner"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return "wrap-band";
    case "camera-charm":
      return "device-body";
    case "boat-charm":
      return "boat-hull";
    case "fish-charm":
      return "body";
    case "rocket-charm":
      return "rocket-body";
    case "device-generic-charm":
      return "device-body";
    case "vehicle-generic-charm":
      return "vehicle-body";
    default:
      return undefined;
  }
}

function buildRuntimeOutlineProfile(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["outlineProfile"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return "scarf-wrap-forward";
    case "camera-charm":
      return "camera-wide-body";
    case "boat-charm":
      return "boat-upright-hull";
    case "fish-charm":
      return "fish-body-compact";
    case "device-generic-charm":
      return "device-screen-rect";
    default:
      return undefined;
  }
}

function buildRuntimeReliefFeatureLayout(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["reliefFeatureLayout"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return ["wrap-band-arc", "knot-center", "dual-tail-drop"];
    case "camera-charm":
      return ["lens-forward-relief", "top-cluster-ridge", "viewfinder-corner"];
    case "boat-charm":
      return ["hull-pointed-ends", "mast-rooted-spine", "sail-tri-plane"];
    case "fish-charm":
      return ["tail-split", "fin-ridge"];
    case "device-generic-charm":
      return ["screen-face-inset", "camera-corner-dot"];
    default:
      return undefined;
  }
}

function buildRuntimeAttachmentMask(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["attachmentMask"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return "wrap-hidden-root";
    case "camera-charm":
      return "top-cluster-hidden-loop";
    case "boat-charm":
      return "mast-hidden-loop";
    case "fish-charm":
      return "ring-subordinate";
    case "device-generic-charm":
      return "top-edge-hidden-loop";
    default:
      return undefined;
  }
}

function buildRuntimeProfileVariantId(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["profileVariantId"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return "scarf-wrap-forward";
    case "camera-charm":
      return "camera-profile-wide";
    case "boat-charm":
      return "boat-profile-upright";
    case "fish-charm":
      return "fish-profile-default";
    case "device-generic-charm":
      return "device-profile-screen-forward";
    default:
      return undefined;
  }
}

function buildRuntimeReadabilityMaterialPolicy(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["readabilityMaterialPolicy"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return {
        bodyLift: 0.12,
        detailLift: 0.18,
        accentLift: 0.12,
        accentShadow: 0.18,
        featureContrastFloor: 0.22,
        preferLighterFeatures: false,
      };
    case "camera-charm":
      return {
        bodyLift: 0.26,
        detailLift: 0.42,
        accentLift: 0.24,
        accentShadow: 0.1,
        featureContrastFloor: 0.34,
        preferLighterFeatures: true,
      };
    case "boat-charm":
      return {
        bodyLift: 0.1,
        detailLift: 0.22,
        accentLift: 0.18,
        accentShadow: 0.12,
        featureContrastFloor: 0.16,
        preferLighterFeatures: true,
      };
    case "device-generic-charm":
      return {
        bodyLift: 0.28,
        detailLift: 0.46,
        accentLift: 0.28,
        accentShadow: 0.08,
        featureContrastFloor: 0.38,
        preferLighterFeatures: true,
      };
    default:
      return undefined;
  }
}

function buildRuntimeCritiqueLightingProfile(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["critiqueLightingProfile"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return {
        accessoryExposure: 0.78,
        accessoryGamma: 1.08,
        hostExposure: 0.46,
        hostGamma: 1.04,
      };
    case "camera-charm":
      return {
        accessoryExposure: 0.92,
        accessoryGamma: 1.18,
        hostExposure: 0.48,
        hostGamma: 1.08,
      };
    case "boat-charm":
      return {
        accessoryExposure: 0.6,
        accessoryGamma: 1.1,
        hostExposure: 0.4,
        hostGamma: 1.05,
      };
    case "device-generic-charm":
      return {
        accessoryExposure: 0.96,
        accessoryGamma: 1.18,
        hostExposure: 0.5,
        hostGamma: 1.08,
      };
    default:
      return undefined;
  }
}

function buildRuntimeDeviceMinReadableSpan(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["deviceMinReadableSpan"] {
  switch (runtimeShapeClass) {
    case "camera-charm":
      return 0.056;
    case "device-generic-charm":
      return 0.058;
    default:
      return undefined;
  }
}

function buildRuntimeBoatMinReadableSpan(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["boatMinReadableSpan"] {
  return runtimeShapeClass === "boat-charm" ? 0.052 : undefined;
}

function buildRuntimeReliefFlushDepth(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["reliefFlushDepth"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return 0.0034;
    case "camera-charm":
      return 0.0094;
    case "boat-charm":
      return 0.0046;
    case "device-generic-charm":
      return 0.0086;
    default:
      return undefined;
  }
}

function buildRuntimeAttachmentCohesionBudget(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["attachmentCohesionBudget"] {
  switch (runtimeShapeClass) {
    case "scarf":
      return 0.97;
    case "camera-charm":
      return 0.96;
    case "boat-charm":
      return 0.96;
    case "device-generic-charm":
      return 0.96;
    default:
      return undefined;
  }
}

function buildRuntimeOutlineCompilerMode(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["outlineCompilerMode"] {
  switch (runtimeShapeClass) {
    case "camera-charm":
    case "device-generic-charm":
      return "device-front-facing";
    case "boat-charm":
    case "rocket-charm":
    case "vehicle-generic-charm":
      return "vehicle-upright-outline";
    default:
      return undefined;
  }
}

function buildRuntimeOutlineProjectionVariantId(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["outlineProjectionVariantId"] {
  return buildRuntimeProfileVariantId(runtimeShapeClass);
}

function buildRuntimeRepresentationMode(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["representationMode"] {
  switch (runtimeShapeClass) {
    case "camera-charm":
    case "boat-charm":
    case "device-generic-charm":
      return "profile-relief-2_5d";
    default:
      return "primitive-parts";
  }
}

function buildRuntimeFamilyPolicyId(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["familyPolicyId"] {
  switch (runtimeShapeClass) {
    case "camera-charm":
    case "device-generic-charm":
      return "hard-surface-device";
    case "boat-charm":
      return "hard-surface-boat";
    case "rocket-charm":
    case "vehicle-generic-charm":
      return "hard-surface-vehicle";
    default:
      return undefined;
  }
}

function buildRuntimeFaceKeepoutZones(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["faceKeepoutZones"] {
  const shared = [
    { zoneId: "eye-band", label: "眼睛区域", severity: "hard" as const },
    { zoneId: "face-core", label: "面部主轮廓", severity: "soft" as const },
  ];

  if (runtimeShapeClass === "camera-charm" || runtimeShapeClass === "boat-charm") {
    return [
      ...shared,
      { zoneId: "nose-zone", label: "鼻口区域", severity: "hard" as const },
    ];
  }

  return shared;
}

function buildRuntimeAssemblyTensionProfile(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
): PromptCustomizationStructuralBlueprint["assemblyTensionProfile"] {
  switch (runtimeShapeClass) {
    case "camera-charm":
      return {
        cohesionBias: 0.92,
        attachmentCredibilityBias: 0.9,
        rebuildPriority: 0.88,
      };
    case "boat-charm":
      return {
        cohesionBias: 0.94,
        attachmentCredibilityBias: 0.92,
        rebuildPriority: 0.9,
      };
    case "rocket-charm":
      return {
        cohesionBias: 0.9,
        attachmentCredibilityBias: 0.86,
        rebuildPriority: 0.84,
      };
    default:
      return {
        cohesionBias: 0.82,
        attachmentCredibilityBias: 0.8,
        rebuildPriority: 0.74,
      };
  }
}

function mergeRuntimeFaceKeepoutZones(
  baseZones: PromptCustomizationStructuralBlueprint["faceKeepoutZones"],
  runtimeDesignContract?: PromptCustomizationRuntimeDesignContract,
): PromptCustomizationStructuralBlueprint["faceKeepoutZones"] {
  const merged = [
    ...(Array.isArray(baseZones) ? baseZones : []),
    ...(Array.isArray(runtimeDesignContract?.faceKeepoutZones)
      ? runtimeDesignContract.faceKeepoutZones
      : []),
  ];

  return merged.reduce<NonNullable<PromptCustomizationStructuralBlueprint["faceKeepoutZones"]>>(
    (zones, zone) => {
      if (!zone || zones.some((entry) => entry.zoneId === zone.zoneId)) {
        return zones;
      }

      zones.push(zone);
      return zones;
    },
    [],
  );
}

function buildRuntimeStructuralBlueprint(
  taskSeed: {
    requestId: string;
    requestedNoun?: string;
    designArchetype: PromptCustomizationDesignArchetype;
    runtimeShapeClass: PromptCustomizationRuntimeShapeClass;
    anchor: PromptCustomizationAccessoryAnchor;
    capabilityBundle?: PromptCustomizationRuntimeCapabilityBundle;
    runtimeDesignContract?: PromptCustomizationRuntimeDesignContract;
  },
  criticalParts: string[],
  optionalParts: string[],
  assemblyRootPartId: string | undefined,
  attachmentPartId: string | undefined,
): PromptCustomizationStructuralBlueprint {
  const primarySilhouette = buildRuntimePrimarySilhouette(
    taskSeed.runtimeShapeClass,
    taskSeed.designArchetype,
  );
  const partProfiles = buildRuntimePartProfiles(
    taskSeed.runtimeShapeClass,
    criticalParts,
    optionalParts,
    attachmentPartId,
  );
  const attachmentRules = buildRuntimeAttachmentRules(
    taskSeed.runtimeShapeClass,
    partProfiles,
    assemblyRootPartId,
  );

  return {
    blueprintId: `blueprint-${taskSeed.requestId}`,
    ...(taskSeed.requestedNoun ? { requestedNoun: taskSeed.requestedNoun } : {}),
    runtimeShapeClass: taskSeed.runtimeShapeClass,
    capabilityBundle: taskSeed.capabilityBundle,
    runtimeDesignContract: taskSeed.runtimeDesignContract,
    primarySilhouette,
    silhouetteTemplate: buildRuntimeSilhouetteTemplate(taskSeed.runtimeShapeClass),
    silhouetteBlocks: buildRuntimeSilhouetteBlocks(taskSeed.runtimeShapeClass),
    assemblySegments: buildRuntimeAssemblySegments(taskSeed.runtimeShapeClass),
    mountStrategy: buildRuntimeMountStrategy(
      taskSeed.anchor,
      taskSeed.runtimeShapeClass,
      taskSeed.designArchetype,
    ),
    readOrderTargets: uniqueStrings([
      ...buildRuntimeReadOrderTargets(taskSeed.runtimeShapeClass, criticalParts),
      ...(taskSeed.runtimeDesignContract?.requiredVisibleParts ?? []),
    ]),
    criticalViewGoals: uniqueStrings([
      ...buildRuntimeCriticalViewGoals(taskSeed.anchor, taskSeed.runtimeShapeClass),
      ...(taskSeed.runtimeDesignContract?.criticalViewGoals ?? []),
      taskSeed.runtimeDesignContract?.compositionEnvelope,
    ]),
    hostFitEnvelope:
      taskSeed.runtimeDesignContract?.hostFitEnvelope ??
      buildRuntimeHostFitEnvelope(taskSeed.runtimeShapeClass),
    partSpanTargets: buildRuntimePartSpanTargets(taskSeed.runtimeShapeClass),
    partDepthTargets: buildRuntimePartDepthTargets(taskSeed.runtimeShapeClass),
    attachmentAnchors: buildRuntimeAttachmentAnchors(taskSeed.runtimeShapeClass),
    faceKeepoutZones: mergeRuntimeFaceKeepoutZones(
      buildRuntimeFaceKeepoutZones(taskSeed.runtimeShapeClass),
      taskSeed.runtimeDesignContract,
    ),
    silhouetteKeepouts: buildRuntimeSilhouetteKeepouts(taskSeed.runtimeShapeClass),
    assemblyTensionProfile: buildRuntimeAssemblyTensionProfile(taskSeed.runtimeShapeClass),
    representationMode: buildRuntimeRepresentationMode(taskSeed.runtimeShapeClass),
    familyPolicyId: buildRuntimeFamilyPolicyId(taskSeed.runtimeShapeClass),
    dominantContour: buildRuntimeDominantContour(taskSeed.runtimeShapeClass),
    sideDepthProfile: buildRuntimeSideDepthProfile(taskSeed.runtimeShapeClass),
    dominantSpanOwner: buildRuntimeDominantSpanOwner(taskSeed.runtimeShapeClass),
    outlineProfile: buildRuntimeOutlineProfile(taskSeed.runtimeShapeClass),
    reliefFeatureLayout: buildRuntimeReliefFeatureLayout(taskSeed.runtimeShapeClass),
    attachmentMask: buildRuntimeAttachmentMask(taskSeed.runtimeShapeClass),
    profileVariantId: buildRuntimeProfileVariantId(taskSeed.runtimeShapeClass),
    readabilityMaterialPolicy: buildRuntimeReadabilityMaterialPolicy(taskSeed.runtimeShapeClass),
    critiqueLightingProfile: buildRuntimeCritiqueLightingProfile(taskSeed.runtimeShapeClass),
    deviceMinReadableSpan: buildRuntimeDeviceMinReadableSpan(taskSeed.runtimeShapeClass),
    boatMinReadableSpan: buildRuntimeBoatMinReadableSpan(taskSeed.runtimeShapeClass),
    reliefFlushDepth: buildRuntimeReliefFlushDepth(taskSeed.runtimeShapeClass),
    attachmentCohesionBudget: buildRuntimeAttachmentCohesionBudget(
      taskSeed.runtimeShapeClass,
    ),
    outlineCompilerMode: buildRuntimeOutlineCompilerMode(taskSeed.runtimeShapeClass),
    outlineProjectionVariantId: buildRuntimeOutlineProjectionVariantId(
      taskSeed.runtimeShapeClass,
    ),
    partProfiles,
    attachmentRules,
    partImportanceWeights: buildRuntimePartImportanceWeights(partProfiles),
    symmetryPolicy: buildRuntimeSymmetryPolicy(
      taskSeed.runtimeShapeClass,
      taskSeed.designArchetype,
    ),
    deformationPolicy: buildRuntimeDeformationPolicy(
      taskSeed.runtimeShapeClass,
      taskSeed.designArchetype,
    ),
  };
}

function isEarSideUnifiedReferenceEligible(
  recipe: Pick<
    PromptCustomizationRecipeCore,
    "mode" | "customizationProfile"
  >,
  request: PromptCustomizationAccessoryRequest,
) {
  return (
    recipe.mode === "dynamic-custom" &&
    recipe.customizationProfile === "experimental-addon" &&
    (request.anchor === "left-ear" || request.anchor === "right-ear")
  );
}

function buildCompilerIntent(
  blueprint: Pick<
    PromptCustomizationStructuralBlueprint,
    "mountStrategy" | "readOrderTargets" | "criticalViewGoals" | "deformationPolicy"
  >,
): PromptCustomizationCompilerIntent {
  return {
    mountStrategy: blueprint.mountStrategy,
    readOrderTargets: blueprint.readOrderTargets,
    criticalViewGoals: blueprint.criticalViewGoals,
    deformationPolicy: blueprint.deformationPolicy,
  };
}

function resolveReferencePackForRuntimeTask(
  recipe: Pick<
    PromptCustomizationRecipeCore,
    "mode" | "customizationProfile"
  >,
  request: PromptCustomizationAccessoryRequest,
  designArchetype: PromptCustomizationDesignArchetype,
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
  objectCategory: PromptCustomizationObjectCategory,
  requestedNoun: string | undefined,
): {
  sourceMode?: PromptCustomizationReferenceSourceMode;
  referenceConfidence?: number;
  referencePack?: PromptCustomizationReferencePack;
  canonicalBlueprint?: PromptCustomizationReferenceDerivedBlueprint;
} {
  if (!isEarSideUnifiedReferenceEligible(recipe, request)) {
    return {};
  }

  const hardSurfaceReferenceAsset = isEarSideHardSurfaceReferenceEligible(
    recipe,
    request,
    designArchetype,
    runtimeShapeClass,
  )
    ? resolveHardSurfaceReferenceAsset({
        normalizedNoun: requestedNoun,
        runtimeShapeClass,
        objectCategory,
      })
    : undefined;

  if (hardSurfaceReferenceAsset) {
    const canonicalBlueprint = buildReferenceDerivedBlueprint(
      hardSurfaceReferenceAsset,
      requestedNoun ?? request.shapeLabel,
    );

    return {
      sourceMode: "cached-reference",
      referenceConfidence: hardSurfaceReferenceAsset.referenceConfidence,
      referencePack: {
        sourceMode: "cached-reference",
        referenceId: canonicalBlueprint.referenceId,
        referenceSourceKind: canonicalBlueprint.sourceKind,
        blueprintFamily: canonicalBlueprint.blueprintFamily,
        variantCandidates: canonicalBlueprint.variantCandidates,
        referenceConfidence: hardSurfaceReferenceAsset.referenceConfidence,
      },
      canonicalBlueprint,
    };
  }

  const canonicalBlueprintMatch = resolveCanonicalBlueprint({
    runtimeShapeClass,
    requestedNoun: requestedNoun ?? request.shapeLabel,
  });

  if (canonicalBlueprintMatch) {
    return {
      sourceMode: canonicalBlueprintMatch.sourceMode,
      referenceConfidence: canonicalBlueprintMatch.referenceConfidence,
      referencePack: {
        sourceMode: canonicalBlueprintMatch.sourceMode,
        referenceId: canonicalBlueprintMatch.blueprint.referenceId,
        referenceSourceKind: canonicalBlueprintMatch.blueprint.sourceKind,
        blueprintFamily: canonicalBlueprintMatch.blueprint.blueprintFamily,
        variantCandidates: canonicalBlueprintMatch.blueprint.variantCandidates,
        referenceConfidence: canonicalBlueprintMatch.referenceConfidence,
      },
      canonicalBlueprint: canonicalBlueprintMatch.blueprint,
    };
  }

  return {
    sourceMode: "legacy-fallback",
    referenceConfidence: 0.36,
    referencePack: {
      sourceMode: "legacy-fallback",
      referenceConfidence: 0.36,
    },
  };
}

function buildRuntimeDesignTasks(
  recipe: Pick<
    PromptCustomizationRecipeCore,
    "mode" | "customizationProfile" | "themeLabel"
  >,
  requests: PromptCustomizationAccessoryRequest[],
): PromptCustomizationRuntimeDesignTask[] {
  if (recipe.mode !== "dynamic-custom") {
    return [];
  }

  return requests
    .filter((request) => request.requestId !== "theme-default-request")
    .map((request) => {
      const semanticClass =
        request.semanticClass ?? getAccessorySemanticClass(request.family);
      const designArchetype = inferRuntimeDesignArchetype(request);
      const criticalParts = buildRuntimeCriticalParts(
        request,
        semanticClass,
        designArchetype,
      );
      const optionalParts = buildRuntimeOptionalParts(
        request,
        semanticClass,
        designArchetype,
      );
      const shapeIntent = buildRuntimeShapeIntent(
        request,
        semanticClass,
        designArchetype,
      );
      const silhouetteGoals = buildRuntimeSilhouetteGoals(
        request,
        designArchetype,
      );
      const requestedNoun =
        request.requestedNoun ??
        normalizeRequestedNoun(request.requestedLabel ?? request.shapeLabel ?? request.label);
      const requestedColor =
        request.instances.find((instance) => instance.colorIntent)?.colorIntent ??
        request.colorIntent;
      const negativeLookalikes = buildRuntimeNegativeLookalikes(
        request,
        designArchetype,
      );
      const repairPriorities = buildRuntimeRepairPriorities(designArchetype);
      const hangingStrategy = buildRuntimeHangingStrategy(
        request,
        designArchetype,
      );
      const partGraphIntent = buildRuntimePartGraphIntent(
        request,
        criticalParts,
        optionalParts,
      );
      const objectCategory =
        request.objectCategory ?? inferObjectCategoryFromArchetype(designArchetype);
      const designConfidence =
        typeof request.designConfidence === "number"
          ? clampConfidence(request.designConfidence)
          : request.familyResolutionSource === "open-noun"
            ? 0.74
            : designArchetype === "known-family"
              ? 0.92
              : 0.82;
      const runtimeShapeClass = inferRuntimeShapeClass(
        request,
        designArchetype,
      );
      const capabilityBundle = resolveRuntimeCapabilityBundle({
        anchor: request.anchor,
        runtimeShapeClass,
        family: request.family,
      });
      const runtimeDesignContract = resolveRuntimeDesignContract({
        capabilityBundle,
        requestedNoun,
        anchor: request.anchor,
      });
      const referenceResolution = resolveReferencePackForRuntimeTask(
        recipe,
        request,
        designArchetype,
        runtimeShapeClass,
        objectCategory,
        requestedNoun,
      );
      const referenceDerivedBlueprint = referenceResolution.canonicalBlueprint;
      const blueprintFamily =
        referenceDerivedBlueprint?.blueprintFamily ??
        getBlueprintFamilyFallback(runtimeShapeClass, objectCategory);
      const assemblyRootPartId = inferAssemblyRootPartId(
        runtimeShapeClass,
        criticalParts,
      );
      const attachmentPartId = inferAttachmentPartId(
        runtimeShapeClass,
        criticalParts,
        optionalParts,
      );
      const structuralBlueprint = buildRuntimeStructuralBlueprint(
        {
          requestId: request.requestId,
          requestedNoun,
          designArchetype,
          runtimeShapeClass,
          anchor: request.anchor,
          capabilityBundle,
          runtimeDesignContract,
        },
        criticalParts,
        optionalParts,
        assemblyRootPartId,
        attachmentPartId,
      );
      const referenceAwareBlueprint = buildReferenceAwareStructuralBlueprint(
        structuralBlueprint,
        referenceDerivedBlueprint,
        referenceResolution.sourceMode,
        referenceResolution.referenceConfidence,
        blueprintFamily,
      );
      const compilerIntent = buildCompilerIntent(referenceAwareBlueprint);
      const nounDesignBriefId = `brief-${request.requestId}`;

      return {
        taskId: `design-${request.requestId}`,
        requestId: request.requestId,
        requestLabel: request.shapeLabel,
        requestedNoun,
        nounSpan: request.nounSpan ?? requestedNoun,
        nounGloss: buildRequestedNounGloss(request, designArchetype),
        objectCategory,
        designConfidence,
        mustDistinctFromFallback:
          request.mustDistinctFromFallback ??
          request.familyResolutionSource === "open-noun",
        sourceMode: referenceResolution.sourceMode,
        referenceConfidence: referenceResolution.referenceConfidence,
        referencePack: referenceResolution.referencePack,
        referenceId: referenceDerivedBlueprint?.referenceId,
        referenceSourceKind: referenceDerivedBlueprint?.sourceKind,
        blueprintFamily,
        representationMode: referenceAwareBlueprint.representationMode,
        familyPolicyId: referenceAwareBlueprint.familyPolicyId,
        capabilityBundle,
        runtimeDesignContract,
        variantCandidates: referenceDerivedBlueprint?.variantCandidates,
        variantId: referenceDerivedBlueprint?.variantCandidates[0]?.variantId,
        canonicalBlueprint: referenceDerivedBlueprint,
        referenceDerivedBlueprint,
        designArchetype,
        runtimeShapeClass,
        shapeIntent,
        criticalParts,
        optionalParts,
        partGraphIntent,
        silhouetteGoals,
        negativeLookalikes: buildReferenceAwareNegativeLookalikes(
          negativeLookalikes,
          referenceDerivedBlueprint,
        ),
        repairPriorities,
        hangingStrategy,
        assemblyRootPartId,
        attachmentPartId,
        silhouetteBlocks: referenceAwareBlueprint.silhouetteBlocks,
        assemblySegments: referenceAwareBlueprint.assemblySegments,
        mountStrategy: referenceAwareBlueprint.mountStrategy,
        readOrderTargets: referenceAwareBlueprint.readOrderTargets,
        criticalViewGoals: referenceAwareBlueprint.criticalViewGoals,
        compilerIntent,
        structuralBlueprint: referenceAwareBlueprint,
        primarySilhouette: referenceAwareBlueprint.primarySilhouette,
        outlineProfile: referenceAwareBlueprint.outlineProfile,
        reliefFeatureLayout: referenceAwareBlueprint.reliefFeatureLayout,
        attachmentMask: referenceAwareBlueprint.attachmentMask,
        profileVariantId: referenceAwareBlueprint.profileVariantId,
        partProfiles: referenceAwareBlueprint.partProfiles,
        attachmentRules: referenceAwareBlueprint.attachmentRules,
        partImportanceWeights: referenceAwareBlueprint.partImportanceWeights,
        symmetryPolicy: referenceAwareBlueprint.symmetryPolicy,
        deformationPolicy: referenceAwareBlueprint.deformationPolicy,
        family: request.family,
        semanticClass,
        shapeDescription: buildRuntimeDesignDescription(
          request,
          shapeIntent,
          criticalParts,
        ),
        anchor: request.anchor,
        requestedAnchorPhrase: request.requestedAnchorPhrase,
        anchorResolutionSource: request.anchorResolutionSource,
        instanceCount: request.instances.length,
        ...(requestedColor ? { requestedColor } : {}),
        ...(requestedColor?.requestedText
          ? { requestedColorText: requestedColor.requestedText }
          : requestedColor?.label
            ? { requestedColorText: requestedColor.label }
            : {}),
        styleHints: [recipe.themeLabel, request.styleIntent ?? recipe.themeLabel],
        silhouetteHints: silhouetteGoals,
        mustKeep: request.mustKeep ?? true,
        allowApproximation: request.allowApproximation ?? true,
        designNotes: uniqueStrings([
          request.shapeHint,
          request.requestedText,
          referenceResolution.sourceMode === "cached-reference" && referenceDerivedBlueprint
            ? `命中本地参考缓存 ${referenceDerivedBlueprint.referenceId}，先按 ${blueprintFamily} 参考蓝图生成，再在 runtime 中切 variant 精修。`
            : null,
          referenceResolution.sourceMode === "canonical-blueprint" && referenceDerivedBlueprint
            ? `命中 canonical blueprint ${referenceDerivedBlueprint.referenceId}，统一走 2.5D charm compiler 主线。`
            : null,
          referenceResolution.sourceMode === "legacy-fallback"
            ? "当前没有可用 reference pack，先降级为 legacy fallback；最终只能近似实现或未实现。"
            : null,
          recipe.customizationProfile === "experimental-addon"
            ? "实验定制优先现场生成，而不是先找稳定库替身。"
            : "稳定定制只会把该请求记入正式设计任务，执行时仍以安全覆盖为主。",
        ]),
        runtimeDesignSource: "rule-compiler",
        nounDesignBriefId,
      };
    });
}

function createGeometryPart(
  partId: string,
  primitive: PromptCustomizationGeometryRecipe["parts"][number]["primitive"],
  role: string,
  size: number,
  offset: [number, number, number],
  scale: [number, number, number],
  rotation?: [number, number, number],
  materialZone: PromptCustomizationGeometryRecipe["parts"][number]["materialZone"] = "accessory",
): PromptCustomizationGeometryRecipe["parts"][number] {
  return {
    partId,
    primitive,
    role,
    size,
    offset,
    scale,
    ...(rotation ? { rotation } : {}),
    materialZone,
  };
}

function buildNounDesignBriefs(
  tasks: PromptCustomizationRuntimeDesignTask[],
): PromptCustomizationNounDesignBrief[] {
  return tasks.map((task) => ({
    briefId: task.nounDesignBriefId ?? `brief-${task.requestId}`,
    taskId: task.taskId,
    requestId: task.requestId,
    requestedNoun: task.requestedNoun ?? task.requestLabel,
    nounSpan: task.nounSpan,
    nounGloss: task.nounGloss,
    objectCategory: task.objectCategory,
    designArchetype: task.designArchetype,
    runtimeShapeClass: task.runtimeShapeClass,
    designConfidence: task.designConfidence,
    mustDistinctFromFallback: task.mustDistinctFromFallback,
    sourceMode: task.sourceMode,
    referenceConfidence: task.referenceConfidence,
    referencePack: task.referencePack,
    referenceId: task.referenceId,
    referenceSourceKind: task.referenceSourceKind,
    blueprintFamily: task.blueprintFamily,
    representationMode: task.representationMode,
    familyPolicyId: task.familyPolicyId,
    capabilityBundle: task.capabilityBundle,
    runtimeDesignContract: task.runtimeDesignContract,
    variantCandidates: task.variantCandidates,
    variantId: task.variantId,
    canonicalBlueprint: task.canonicalBlueprint,
    referenceDerivedBlueprint: task.referenceDerivedBlueprint,
    shapeIntent: task.shapeIntent,
    criticalParts: task.criticalParts,
    optionalParts: task.optionalParts,
    partGraphIntent: task.partGraphIntent,
    silhouetteGoals: task.silhouetteGoals,
    negativeLookalikes: task.negativeLookalikes,
    repairPriorities: task.repairPriorities,
    hangingStrategy: task.hangingStrategy,
    assemblyRootPartId: task.assemblyRootPartId,
    attachmentPartId: task.attachmentPartId,
    silhouetteBlocks: task.silhouetteBlocks,
    assemblySegments: task.assemblySegments,
    mountStrategy: task.mountStrategy,
    readOrderTargets: task.readOrderTargets,
    criticalViewGoals: task.criticalViewGoals,
    compilerIntent: task.compilerIntent,
    structuralBlueprint: task.structuralBlueprint,
    primarySilhouette: task.primarySilhouette,
    outlineProfile: task.outlineProfile,
    reliefFeatureLayout: task.reliefFeatureLayout,
    attachmentMask: task.attachmentMask,
    profileVariantId: task.profileVariantId,
    partProfiles: task.partProfiles,
    attachmentRules: task.attachmentRules,
    partImportanceWeights: task.partImportanceWeights,
    symmetryPolicy: task.symmetryPolicy,
    deformationPolicy: task.deformationPolicy,
    runtimeDesignSource: task.runtimeDesignSource,
  }));
}

function buildPartGraphStageIndex(
  partId: string,
  criticalParts: string[],
  optionalParts: string[],
) {
  if (criticalParts.includes(partId)) {
    return Math.max(1, criticalParts.indexOf(partId) + 1);
  }

  if (optionalParts.includes(partId)) {
    return criticalParts.length + Math.max(1, optionalParts.indexOf(partId) + 1);
  }

  return criticalParts.length + optionalParts.length + 1;
}

function buildPartGraphImportance(
  partId: string,
  criticalParts: string[],
  optionalParts: string[],
) {
  if (criticalParts.includes(partId)) {
    return 1;
  }

  if (optionalParts.includes(partId)) {
    return 0.68;
  }

  return 0.4;
}

function buildRuntimePartHierarchy(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
  partIds: string[],
  rootPartId: string,
  attachmentPartId: string,
) {
  const available = new Set(partIds);
  const addIfAvailable = (
    edges: Array<{ parentId: string; childId: string }>,
    parentId: string,
    childId: string,
  ) => {
    if (
      available.has(parentId) &&
      available.has(childId) &&
      parentId !== childId
    ) {
      edges.push({ parentId, childId });
    }
  };

  const edges: Array<{ parentId: string; childId: string }> = [];

  switch (runtimeShapeClass) {
    case "scarf":
      addIfAvailable(edges, "wrap-band", "knot");
      addIfAvailable(edges, "knot", "tail-left");
      addIfAvailable(edges, "knot", "tail-right");
      addIfAvailable(edges, "tail-left", "tail-fold-left");
      addIfAvailable(edges, "tail-right", "tail-fold-right");
      break;
    case "camera-charm":
      addIfAvailable(edges, "device-body", "camera-faceplate");
      addIfAvailable(edges, "device-body", "camera-lens");
      addIfAvailable(edges, "device-body", "camera-top");
      addIfAvailable(edges, "device-body", "camera-viewfinder");
      addIfAvailable(edges, "camera-top", "camera-button");
      addIfAvailable(edges, "camera-top", "hang-slot");
      break;
    case "boat-charm":
      addIfAvailable(edges, "boat-hull", "boat-bow");
      addIfAvailable(edges, "boat-hull", "boat-stern");
      addIfAvailable(edges, "boat-hull", "boat-deck");
      addIfAvailable(edges, "boat-hull", "boat-mast");
      addIfAvailable(edges, "boat-mast", "boat-sail");
      addIfAvailable(edges, "boat-mast", "hang-slot");
      break;
    case "rocket-charm":
      addIfAvailable(edges, "rocket-body", "rocket-nose");
      addIfAvailable(edges, "rocket-body", "rocket-fin-left");
      addIfAvailable(edges, "rocket-body", "rocket-fin-right");
      addIfAvailable(edges, "rocket-body", "rocket-nozzle");
      addIfAvailable(edges, "rocket-body", "hang-slot");
      break;
    case "device-generic-charm":
      addIfAvailable(edges, "device-body", "screen-face");
      addIfAvailable(edges, "device-body", "camera-dot");
      addIfAvailable(edges, "device-body", "hang-slot");
      break;
    case "vehicle-generic-charm":
      addIfAvailable(edges, "vehicle-body", "vehicle-front");
      addIfAvailable(edges, "vehicle-body", "vehicle-rear");
      addIfAvailable(edges, "vehicle-body", "hang-slot");
      break;
    case "fish-charm":
      addIfAvailable(edges, "body", "tail");
      addIfAvailable(edges, "body", "fin-top");
      addIfAvailable(edges, "body", "fin-bottom");
      addIfAvailable(edges, "body", "nose");
      addIfAvailable(edges, "body", "ring");
      break;
    case "berry-charm":
      addIfAvailable(edges, "berry-main", "berry-side-left");
      addIfAvailable(edges, "berry-main", "berry-side-right");
      addIfAvailable(edges, "berry-main", "leaf-crown");
      addIfAvailable(edges, "leaf-crown", "leaf-side");
      addIfAvailable(edges, "leaf-crown", "ring");
      break;
    case "cloud":
    case "cloud-charm":
      addIfAvailable(edges, "center-puff", "left-puff");
      addIfAvailable(edges, "center-puff", "right-puff");
      addIfAvailable(edges, "center-puff", "base-puff");
      addIfAvailable(edges, "center-puff", "ring");
      break;
    case "flower":
      addIfAvailable(edges, "core", "petal-left");
      addIfAvailable(edges, "core", "petal-right");
      addIfAvailable(edges, "core", "petal-top");
      addIfAvailable(edges, "core", "petal-bottom");
      addIfAvailable(edges, "core", "petal-top-left");
      addIfAvailable(edges, "core", "petal-top-right");
      break;
    case "clover-charm":
      addIfAvailable(edges, "core", "leaf-left");
      addIfAvailable(edges, "core", "leaf-right");
      addIfAvailable(edges, "core", "leaf-top");
      addIfAvailable(edges, "core", "leaf-bottom");
      addIfAvailable(edges, "core", "stem");
      addIfAvailable(edges, "core", "ring");
      break;
    case "candle-charm":
      addIfAvailable(edges, "wax-body", "wax-top");
      addIfAvailable(edges, "wax-top", "wick");
      addIfAvailable(edges, "wick", "flame");
      addIfAvailable(edges, "wax-top", "ring");
      break;
    case "key-charm":
      addIfAvailable(edges, "shaft", "tooth-top");
      addIfAvailable(edges, "shaft", "tooth-bottom");
      addIfAvailable(edges, "shaft", "ring");
      break;
    case "feather-charm":
      addIfAvailable(edges, "stem", "vane-main");
      addIfAvailable(edges, "vane-main", "vane-tip");
      addIfAvailable(edges, "stem", "ring");
      break;
    case "open-botanical-ornament":
      addIfAvailable(edges, "core", "leaf-left");
      addIfAvailable(edges, "core", "leaf-right");
      addIfAvailable(edges, "core", "petal-top");
      addIfAvailable(edges, "core", "stem");
      addIfAvailable(edges, "core", "ring");
      break;
    case "open-symbol-ornament":
      addIfAvailable(edges, "core", "arm-top");
      addIfAvailable(edges, "core", "arm-left");
      addIfAvailable(edges, "core", "arm-right");
      addIfAvailable(edges, "core", "arm-bottom");
      addIfAvailable(edges, "core", "ring");
      break;
    default:
      break;
  }

  if (edges.length > 0) {
    return edges;
  }

  return partIds
    .filter((partId) => partId !== rootPartId)
    .map((partId) => ({
      parentId:
        partId === attachmentPartId && attachmentPartId !== rootPartId
          ? rootPartId
          : rootPartId,
      childId: partId,
    }));
}

function buildReferenceDrivenGeometryRecipe(
  task: PromptCustomizationRuntimeDesignTask,
) {
  if (!task.referenceId || !task.blueprintFamily) {
    return null;
  }

  const variantId = task.variantId ?? task.variantCandidates?.[0]?.variantId;
  const runtimeShapeClass = task.runtimeShapeClass;

  if (task.blueprintFamily === "hard-surface-device") {
    if (runtimeShapeClass === "camera-charm") {
      const preset = getCameraGeometryVariantPreset(variantId);

      return {
        profileCurves: ["reference-device", variantId ?? "camera-body-lens-forward"],
        outlineProfile:
          task.outlineProfile ?? task.structuralBlueprint?.outlineProfile ?? "camera-wide-body",
        reliefFeatureLayout:
          task.reliefFeatureLayout ??
          task.structuralBlueprint?.reliefFeatureLayout ??
          ["lens-forward-relief", "top-cluster-ridge", "viewfinder-corner"],
        attachmentMask:
          task.attachmentMask ?? task.structuralBlueprint?.attachmentMask ?? "top-cluster-hidden-loop",
        profileVariantId:
          task.profileVariantId ?? task.structuralBlueprint?.profileVariantId ?? variantId,
        symmetry: "bilateral" as const,
        parts: [
          createGeometryPart("device-body", "cube", "device-body", 0.038, [0, 0, 0.004], preset.deviceBodyScale),
          createGeometryPart(
            "camera-faceplate",
            "cube",
            "device-body",
            0.028,
            preset.faceplateOffset,
            preset.faceplateScale,
            undefined,
            "detail",
          ),
          createGeometryPart(
            "camera-lens",
            "cylinder",
            "camera-lens",
            0.022,
            preset.lensOffset,
            preset.lensScale,
            [90, 0, 0],
            "accent",
          ),
          createGeometryPart(
            "camera-top",
            "cube",
            "camera-top",
            0.015,
            preset.topOffset,
            preset.topScale,
            undefined,
            "accent",
          ),
          createGeometryPart(
            "camera-button",
            "sphere",
            "camera-button",
            0.005,
            preset.buttonOffset,
            preset.buttonScale,
            undefined,
            "accent",
          ),
          createGeometryPart(
            "camera-viewfinder",
            "cube",
            "camera-viewfinder",
            0.009,
            preset.viewfinderOffset,
            preset.viewfinderScale,
            undefined,
            "accent",
          ),
          createGeometryPart(
            "hang-slot",
            "torus",
            "hang-slot",
            0.006,
            preset.hangOffset,
            preset.hangScale,
            [90, 0, 0],
            "accent",
          ),
        ],
        silhouetteChecks: [
          "相机挂件第一眼必须读到机身，而不是银色板块。",
          "镜头必须前出，顶部 cluster 必须贴住机身上沿。",
        ],
        fallbackFamily: "generic-ornament" as const,
      };
    }

    if (runtimeShapeClass === "device-generic-charm") {
      const deviceBodyScale =
        variantId === "device-compact-charm"
          ? ([0.54, 0.095, 0.94] as [number, number, number])
          : ([0.58, 0.1, 1.02] as [number, number, number]);
      const screenScale =
        variantId === "device-compact-charm"
          ? ([0.44, 0.018, 0.76] as [number, number, number])
          : ([0.48, 0.02, 0.84] as [number, number, number]);
      const cameraDotScale =
        variantId === "device-compact-charm"
          ? ([0.15, 0.12, 0.15] as [number, number, number])
          : ([0.18, 0.14, 0.18] as [number, number, number]);
      const hangScale =
        variantId === "device-compact-charm"
          ? ([0.026, 0.026, 0.014] as [number, number, number])
          : ([0.03, 0.03, 0.016] as [number, number, number]);
      const hangOffset =
        variantId === "device-compact-charm"
          ? ([0, 0.001, 0.034] as [number, number, number])
          : ([0, 0.001, 0.037] as [number, number, number]);

      return {
        profileCurves: ["reference-device", variantId ?? "device-screen-forward"],
        outlineProfile:
          task.outlineProfile ?? task.structuralBlueprint?.outlineProfile ?? "device-screen-rect",
        reliefFeatureLayout:
          task.reliefFeatureLayout ??
          task.structuralBlueprint?.reliefFeatureLayout ??
          ["screen-face-inset", "camera-corner-dot"],
        attachmentMask:
          task.attachmentMask ?? task.structuralBlueprint?.attachmentMask ?? "top-edge-hidden-loop",
        profileVariantId:
          task.profileVariantId ?? task.structuralBlueprint?.profileVariantId ?? variantId,
        symmetry: "bilateral" as const,
        parts: [
          createGeometryPart("device-body", "cube", "device-body", 0.032, [0, 0, 0.004], deviceBodyScale),
          createGeometryPart(
            "screen-face",
            "cube",
            "screen-face",
            0.026,
            [0, -0.018, 0.004],
            screenScale,
            undefined,
            "detail",
          ),
          createGeometryPart(
            "camera-dot",
            "sphere",
            "device-feature",
            0.005,
            [0.012, -0.018, 0.029],
            cameraDotScale,
            undefined,
            "accent",
          ),
          createGeometryPart(
            "hang-slot",
            "torus",
            "hang-slot",
            0.006,
            hangOffset,
            hangScale,
            [90, 0, 0],
            "accent",
          ),
        ],
        silhouetteChecks: [
          "设备挂件必须先读到机身，再读到屏幕/功能面。",
          "挂环不能比机身或屏幕更显眼。",
        ],
        fallbackFamily: "generic-ornament" as const,
      };
    }
  }

  if (task.blueprintFamily === "hard-surface-vehicle") {
    if (runtimeShapeClass === "boat-charm") {
      const hullScale =
        variantId === "boat-hull-mast-minimal"
          ? ([0.62, 0.12, 0.22] as [number, number, number])
          : variantId === "boat-hull-sail-compact"
            ? ([0.72, 0.15, 0.22] as [number, number, number])
            : ([0.68, 0.14, 0.22] as [number, number, number]);
      const sailScale =
        variantId === "boat-hull-mast-minimal"
          ? ([0.2, 0.025, 0.4] as [number, number, number])
          : variantId === "boat-hull-sail-compact"
            ? ([0.32, 0.04, 0.48] as [number, number, number])
            : ([0.24, 0.026, 0.48] as [number, number, number]);
      const mastScale =
        variantId === "boat-hull-sail-compact"
          ? ([0.05, 0.05, 0.42] as [number, number, number])
          : ([0.052, 0.052, 0.56] as [number, number, number]);

      return {
        profileCurves: ["reference-vehicle", variantId ?? "boat-hull-sail-upright"],
        outlineProfile:
          task.outlineProfile ?? task.structuralBlueprint?.outlineProfile ?? "boat-upright-hull",
        reliefFeatureLayout:
          task.reliefFeatureLayout ??
          task.structuralBlueprint?.reliefFeatureLayout ??
          ["hull-pointed-ends", "mast-rooted-spine", "sail-tri-plane"],
        attachmentMask:
          task.attachmentMask ?? task.structuralBlueprint?.attachmentMask ?? "mast-hidden-loop",
        profileVariantId:
          task.profileVariantId ?? task.structuralBlueprint?.profileVariantId ?? variantId,
        symmetry: "bilateral" as const,
        parts: [
          createGeometryPart("boat-hull", "cylinder", "vehicle-body", 0.036, [0, 0, -0.004], hullScale, [0, 90, 0]),
          createGeometryPart("boat-bow", "cone", "vehicle-front", 0.024, [0.034, 0.001, -0.004], [0.46, 0.14, 0.2], [0, -90, 0]),
          createGeometryPart("boat-stern", "cone", "vehicle-rear", 0.022, [-0.031, 0.001, -0.005], [0.32, 0.12, 0.16], [0, 90, 0]),
          createGeometryPart("boat-deck", "cube", "vehicle-rear", 0.018, [0, 0.001, 0.003], [0.4, 0.04, 0.07], undefined, "detail"),
          createGeometryPart("boat-mast", "cylinder", "boat-mast", 0.018, [-0.002, 0.001, 0.009], mastScale),
          createGeometryPart("boat-sail", "cone", "boat-sail", 0.024, [0.006, 0.004, 0.01], sailScale, [0, 0, -26], "detail"),
          createGeometryPart("hang-slot", "torus", "hang-slot", 0.005, [-0.002, 0.001, 0.032], [0.038, 0.038, 0.022], [90, 0, 0]),
        ],
        silhouetteChecks: [
          "小船挂件必须先读到 hull，而不是蓝色长条。",
          "mast 和 sail 必须 rooted 成一个整体。",
        ],
        fallbackFamily: "generic-ornament" as const,
      };
    }

    if (runtimeShapeClass === "rocket-charm") {
      return {
        profileCurves: ["reference-vehicle", variantId ?? "vehicle-forward-spine"],
        symmetry: "bilateral" as const,
        parts: [
          createGeometryPart("rocket-body", "cylinder", "vehicle-body", 0.032, [0, 0, 0.004], [0.22, 0.22, 0.84]),
          createGeometryPart("rocket-nose", "cone", "vehicle-front", 0.018, [0, 0, 0.038], [0.18, 0.18, 0.28], [180, 0, 0]),
          createGeometryPart("rocket-fin-left", "cone", "rocket-fin", 0.014, [-0.014, 0, -0.016], [0.1, 0.1, 0.22], [0, 34, 120]),
          createGeometryPart("rocket-fin-right", "cone", "rocket-fin", 0.014, [0.014, 0, -0.016], [0.1, 0.1, 0.22], [0, -34, -120]),
          createGeometryPart("rocket-nozzle", "cone", "rocket-nozzle", 0.012, [0, 0, -0.03], [0.14, 0.14, 0.18], [0, 0, 0]),
          createGeometryPart("hang-slot", "torus", "hang-slot", 0.01, [0, 0.001, 0.052], [0.16, 0.16, 0.08], [90, 0, 0]),
        ],
        silhouetteChecks: ["火箭挂件必须先读到机身和尖头，再读尾翼。"],
        fallbackFamily: "generic-ornament" as const,
      };
    }

    if (runtimeShapeClass === "vehicle-generic-charm") {
      return {
        profileCurves: ["reference-vehicle", variantId ?? "vehicle-forward-spine"],
        symmetry: "bilateral" as const,
        parts: [
          createGeometryPart("vehicle-body", "cube", "vehicle-body", 0.032, [0, 0, 0.002], [0.8, 0.14, 0.58]),
          createGeometryPart("vehicle-front", "cone", "vehicle-front", 0.016, [0.022, 0, 0.008], [0.14, 0.14, 0.22], [0, -90, 0]),
          createGeometryPart("vehicle-rear", "cube", "vehicle-rear", 0.014, [-0.022, 0, -0.004], [0.18, 0.1, 0.14]),
          createGeometryPart("hang-slot", "torus", "hang-slot", 0.01, [0, 0.001, 0.032], [0.16, 0.16, 0.08], [90, 0, 0]),
        ],
        silhouetteChecks: ["交通工具挂件必须先读出主体和前后方向，不要退化成细杆。"],
        fallbackFamily: "generic-ornament" as const,
      };
    }
  }

  return null;
}

function buildArchetypeGeometryRecipe(
  task: PromptCustomizationRuntimeDesignTask,
) {
  const runtimeShapeClass = task.runtimeShapeClass;

  if (task.designArchetype === "device-charm") {
    if (runtimeShapeClass === "camera-charm") {
      const preset = getCameraGeometryVariantPreset("camera-body-lens-forward");

      return {
        profileCurves: ["reference-device", "camera-body-lens-forward"],
        symmetry: "bilateral" as const,
        parts: [
          createGeometryPart("device-body", "cube", "device-body", 0.038, [0, 0, 0.004], preset.deviceBodyScale),
          createGeometryPart(
            "camera-faceplate",
            "cube",
            "camera-faceplate",
            0.028,
            preset.faceplateOffset,
            preset.faceplateScale,
          ),
          createGeometryPart(
            "camera-lens",
            "cylinder",
            "camera-lens",
            0.022,
            preset.lensOffset,
            preset.lensScale,
            [90, 0, 0],
          ),
          createGeometryPart("camera-top", "cube", "camera-top", 0.015, preset.topOffset, preset.topScale),
          createGeometryPart(
            "camera-button",
            "sphere",
            "camera-button",
            0.005,
            preset.buttonOffset,
            preset.buttonScale,
          ),
          createGeometryPart(
            "camera-viewfinder",
            "cube",
            "camera-viewfinder",
            0.009,
            preset.viewfinderOffset,
            preset.viewfinderScale,
          ),
          createGeometryPart(
            "hang-slot",
            "torus",
            "hang-slot",
            0.006,
            preset.hangOffset,
            preset.hangScale,
            [90, 0, 0],
          ),
        ],
        silhouetteChecks: ["相机挂件要读出机身、镜头、顶部结构和挂点。"],
        fallbackFamily: "generic-ornament" as const,
      };
    }

    return {
      profileCurves: ["flat-device"],
      symmetry: "bilateral" as const,
      parts: [
        createGeometryPart("device-body", "cube", "device-body", 0.034, [0, 0, 0.004], [0.78, 0.14, 1.08]),
        createGeometryPart("screen-face", "cube", "screen-face", 0.028, [0, 0.006, 0.005], [0.68, 0.028, 0.9]),
        createGeometryPart("camera-dot", "sphere", "device-feature", 0.006, [0.012, 0.004, 0.024], [0.18, 0.18, 0.18]),
        createGeometryPart("hang-slot", "torus", "hang-slot", 0.008, [0, 0.001, 0.026], [0.08, 0.08, 0.04], [90, 0, 0]),
      ],
      silhouetteChecks: ["设备挂件要读出机身平面和辨识面。"],
      fallbackFamily: "generic-ornament" as const,
    };
  }

  if (task.designArchetype === "vehicle-charm") {
    if (runtimeShapeClass === "rocket-charm") {
      return {
        profileCurves: ["rocket-silhouette"],
        symmetry: "bilateral" as const,
        parts: [
          createGeometryPart("rocket-body", "cylinder", "vehicle-body", 0.034, [0, 0, 0.004], [0.28, 0.28, 0.92]),
          createGeometryPart("rocket-nose", "cone", "vehicle-front", 0.02, [0, 0, 0.042], [0.22, 0.22, 0.38]),
          createGeometryPart("rocket-fin-left", "cone", "rocket-fin", 0.018, [-0.016, 0, -0.018], [0.14, 0.14, 0.24], [0, 36, 124]),
          createGeometryPart("rocket-fin-right", "cone", "rocket-fin", 0.018, [0.016, 0, -0.018], [0.14, 0.14, 0.24], [0, -36, -124]),
          createGeometryPart("rocket-nozzle", "cone", "rocket-nozzle", 0.016, [0, 0, -0.036], [0.18, 0.18, 0.24], [180, 0, 0]),
          createGeometryPart("hang-slot", "torus", "hang-slot", 0.014, [0, 0.002, 0.056], [0.22, 0.22, 0.12], [90, 0, 0]),
        ],
        silhouetteChecks: ["火箭挂件要读出机身、尖头、尾翼和喷口。"],
        fallbackFamily: "generic-ornament" as const,
      };
    }

    if (runtimeShapeClass === "boat-charm") {
      return {
        profileCurves: ["boat-silhouette"],
        symmetry: "bilateral" as const,
        parts: [
          createGeometryPart("boat-hull", "cube", "vehicle-body", 0.04, [0, 0, -0.008], [1.08, 0.22, 0.28]),
          createGeometryPart("boat-deck", "cube", "vehicle-rear", 0.024, [-0.002, 0.001, 0.003], [0.78, 0.12, 0.1]),
          createGeometryPart("boat-mast", "cylinder", "boat-mast", 0.024, [0, 0.001, 0.02], [0.07, 0.07, 0.72]),
          createGeometryPart("boat-sail", "cone", "boat-sail", 0.026, [0.01, 0.002, 0.018], [0.22, 0.05, 0.66], [0, 0, -86]),
          createGeometryPart("hang-slot", "torus", "hang-slot", 0.006, [0, 0.001, 0.036], [0.07, 0.07, 0.036], [90, 0, 0]),
        ],
        silhouetteChecks: ["小船挂件要读出船身、桅杆和帆。"],
        fallbackFamily: "generic-ornament" as const,
      };
    }

    return {
      profileCurves: ["generic-vehicle"],
      symmetry: "bilateral" as const,
      parts: [
        createGeometryPart("vehicle-body", "cube", "vehicle-body", 0.032, [0, 0, 0.002], [0.86, 0.2, 0.5]),
        createGeometryPart("vehicle-front", "cone", "vehicle-front", 0.018, [0.028, 0, 0.004], [0.16, 0.16, 0.22], [0, -90, 0]),
        createGeometryPart("vehicle-rear", "cube", "vehicle-rear", 0.016, [-0.028, 0, 0], [0.22, 0.16, 0.18]),
        createGeometryPart("hang-slot", "torus", "hang-slot", 0.014, [0, 0.002, 0.034], [0.22, 0.22, 0.12], [90, 0, 0]),
      ],
      silhouetteChecks: ["交通工具挂件要读出主体和前后指向。"],
      fallbackFamily: "generic-ornament" as const,
    };
  }

  if (task.designArchetype === "tool-charm") {
    return {
      profileCurves: ["tool-silhouette"],
      symmetry: "none" as const,
      parts: [
        createGeometryPart("hang-slot", "torus", "hang-slot", 0.014, [0, 0.002, 0.028], [0.22, 0.22, 0.12], [90, 0, 0]),
        createGeometryPart("tool-body", "cylinder", "tool-body", 0.026, [0, 0, 0], [0.16, 0.16, 0.76]),
        createGeometryPart("tool-head", "cube", "tool-head", 0.018, [0.012, 0, 0.028], [0.38, 0.14, 0.18]),
      ],
      silhouetteChecks: ["工具挂件要读出柄和功能头部。"],
      fallbackFamily: "generic-ornament" as const,
    };
  }

  return null;
}

function getPrimaryPrototypeId(task: PromptCustomizationRuntimeDesignTask) {
  const primary = task.prototypeCandidates?.[0]?.id;

  return typeof primary === "string" && primary.trim() ? primary.trim().toLowerCase() : undefined;
}

function buildRuntimeCapabilityBundleForTask(
  task: Pick<
    PromptCustomizationRuntimeDesignTask,
    "prototypeCandidates" | "traits" | "anchor" | "runtimeShapeClass" | "family"
  >,
) {
  return resolveRuntimeCapabilityBundle({
    prototypeId: task.prototypeCandidates?.[0]?.id,
    traits: task.traits,
    anchor: task.anchor,
    runtimeShapeClass: task.runtimeShapeClass,
    family: task.family,
  });
}

function buildPrototypeDrivenGeometryRecipe(
  task: PromptCustomizationRuntimeDesignTask,
  prototypeId: string | undefined,
  mode: "reference" | "fallback",
) {
  if (!prototypeId) {
    return null;
  }

  if (prototypeId === "flat-badge") {
    return {
      profileCurves:
        mode === "reference" ? ["reference-symbol", "flat-badge"] : ["badge-flat", "flat-badge"],
      outlineProfile:
        task.outlineProfile ?? task.structuralBlueprint?.outlineProfile ?? "symbol-badge-flat",
      symmetry: "bilateral" as const,
      parts: [
        createGeometryPart(
          "ring",
          "torus",
          "hang-ring",
          0.012,
          [0, 0.0015, 0.026],
          [0.18, 0.18, 0.08],
          [90, 0, 0],
        ),
        createGeometryPart(
          "token",
          "cube",
          "badge-face",
          0.034,
          [0, 0, 0.002],
          [0.86, 0.08, 0.86],
          undefined,
          "accessory",
        ),
        createGeometryPart(
          "accent",
          "cube",
          "badge-relief",
          0.018,
          [0, -0.006, 0.01],
          [0.42, 0.03, 0.28],
          undefined,
          "detail",
        ),
      ],
      silhouetteChecks: [
        "徽章必须先读到扁平正面，而不是普通球体。",
        "徽章 relief 只能作为次级读取，不能抢过主体轮廓。",
      ],
      fallbackFamily: "generic-ornament" as const,
    };
  }

  if (prototypeId === "star") {
    return {
      profileCurves:
        mode === "reference"
          ? ["reference-symbol", "star-radial"]
          : ["symbol-radial", "star-radial"],
      outlineProfile:
        task.outlineProfile ?? task.structuralBlueprint?.outlineProfile ?? "star-radial-spikes",
      reliefFeatureLayout:
        task.reliefFeatureLayout ??
        task.structuralBlueprint?.reliefFeatureLayout ??
        ["small-core", "long-radial-rays"],
      attachmentMask:
        task.attachmentMask ?? task.structuralBlueprint?.attachmentMask ?? "top-ray-hidden-loop",
      profileVariantId:
        task.profileVariantId ??
        task.structuralBlueprint?.profileVariantId ??
        task.variantId ??
        "symbol-star-compact",
      symmetry: "radial" as const,
      parts: [
        createGeometryPart("core", "icosphere", "core", 0.018, [0, 0, 0], [0.34, 0.12, 0.34]),
        createGeometryPart("ray-1", "cone", "ray", 0.04, [0, 0, 0.028], [0.18, 0.05, 0.48], [90, 0, 0]),
        createGeometryPart("ray-2", "cone", "ray", 0.038, [0.027, 0, 0.009], [0.17, 0.05, 0.44], [90, 0, 72]),
        createGeometryPart("ray-3", "cone", "ray", 0.036, [0.016, 0, -0.022], [0.16, 0.05, 0.4], [90, 0, 144]),
        createGeometryPart("ray-4", "cone", "ray", 0.036, [-0.016, 0, -0.022], [0.16, 0.05, 0.4], [90, 0, 216]),
        createGeometryPart("ray-5", "cone", "ray", 0.038, [-0.027, 0, 0.009], [0.17, 0.05, 0.44], [90, 0, 288]),
      ],
      silhouetteChecks: [
        "星形挂件必须先读到五角星外轮廓，不要先读成圆章或 badge slab。",
        "中心核只能做连接，不得盖过五向星芒。",
      ],
      fallbackFamily: "star" as const,
    };
  }

  if (prototypeId === "cup" || prototypeId === "mug") {
    const isMug = prototypeId === "mug";

    return {
      profileCurves:
        mode === "reference"
          ? ["reference-ornament", prototypeId]
          : ["vessel-outline", prototypeId],
      outlineProfile:
        task.outlineProfile ?? task.structuralBlueprint?.outlineProfile ?? "vessel-open-top",
      symmetry: isMug ? ("none" as const) : ("bilateral" as const),
      parts: [
        createGeometryPart(
          "ring",
          "torus",
          "hang-ring",
          0.012,
          [0, 0.0015, 0.03],
          [0.16, 0.16, 0.08],
          [90, 0, 0],
        ),
        createGeometryPart(
          "token",
          "cylinder",
          "vessel-body",
          0.034,
          [0, 0, 0],
          [0.48, 0.48, 0.78],
          undefined,
          "accessory",
        ),
        createGeometryPart(
          "accent",
          "torus",
          isMug ? "handle" : "cup-rim",
          0.018,
          isMug ? [0.024, 0, 0.004] : [0, 0, 0.022],
          isMug ? [0.18, 0.1, 0.24] : [0.42, 0.42, 0.08],
          [90, 0, 0],
          "detail",
        ),
      ],
      silhouetteChecks: [
        "杯类挂件必须先读到开口容器轮廓，而不是普通圆柱或 token。",
        isMug ? "马克杯需要读到侧面把手。" : "水杯需要读到开口 rim。",
      ],
      fallbackFamily: "generic-ornament" as const,
    };
  }

  if (prototypeId === "bottle") {
    return {
      profileCurves:
        mode === "reference" ? ["reference-ornament", "bottle"] : ["bottle-outline"],
      outlineProfile:
        task.outlineProfile ?? task.structuralBlueprint?.outlineProfile ?? "bottle-closed-top",
      symmetry: "bilateral" as const,
      parts: [
        createGeometryPart(
          "ring",
          "torus",
          "hang-ring",
          0.012,
          [0, 0.0015, 0.038],
          [0.16, 0.16, 0.08],
          [90, 0, 0],
        ),
        createGeometryPart(
          "token",
          "cylinder",
          "bottle-body",
          0.038,
          [0, 0, -0.002],
          [0.34, 0.34, 0.94],
          undefined,
          "accessory",
        ),
        createGeometryPart(
          "accent",
          "cube",
          "bottle-cap",
          0.014,
          [0, 0, 0.032],
          [0.22, 0.22, 0.16],
          undefined,
          "detail",
        ),
      ],
      silhouetteChecks: [
        "瓶类挂件必须读到细长主体和顶部封口，不要退化成普通圆柱。",
      ],
      fallbackFamily: "generic-ornament" as const,
    };
  }

  if (prototypeId === "scarf") {
    const compactVariant = task.variantId === "scarf-knot-compact";
    const wrapScale = compactVariant
      ? ([0.82, 0.24, 0.18] as [number, number, number])
      : ([0.92, 0.28, 0.2] as [number, number, number]);
    const knotScale = compactVariant
      ? ([0.56, 0.3, 0.24] as [number, number, number])
      : ([0.68, 0.34, 0.28] as [number, number, number]);
    const tailScale = compactVariant
      ? ([0.32, 0.18, 0.6] as [number, number, number])
      : ([0.38, 0.2, 0.68] as [number, number, number]);

    return {
      profileCurves:
        mode === "reference"
          ? ["reference-ornament", task.variantId ?? "scarf-wrap-forward"]
          : ["scarf-wrap", task.variantId ?? "scarf-wrap-forward"],
      outlineProfile:
        task.outlineProfile ?? task.structuralBlueprint?.outlineProfile ?? "scarf-wrap-forward",
      reliefFeatureLayout:
        task.reliefFeatureLayout ??
        task.structuralBlueprint?.reliefFeatureLayout ??
        ["wrap-band-arc", "knot-center", "dual-tail-drop"],
      attachmentMask:
        task.attachmentMask ?? task.structuralBlueprint?.attachmentMask ?? "wrap-hidden-root",
      profileVariantId:
        task.profileVariantId ??
        task.structuralBlueprint?.profileVariantId ??
        task.variantId ??
        "scarf-wrap-forward",
      symmetry: "bilateral" as const,
      parts: [
        createGeometryPart(
          "wrap-band",
          "cube",
          "scarf-wrap",
          0.04,
          [0, -0.004, 0.008],
          wrapScale,
          undefined,
          "accessory",
        ),
        createGeometryPart(
          "knot",
          "cube",
          "knot",
          compactVariant ? 0.024 : 0.026,
          [0, -0.003, 0.001],
          knotScale,
          undefined,
          "detail",
        ),
        createGeometryPart(
          "tail-left",
          "cube",
          "tail",
          compactVariant ? 0.026 : 0.03,
          [-0.012, -0.002, -0.015],
          tailScale,
          [0, 0, 12],
          "accessory",
        ),
        createGeometryPart(
          "tail-right",
          "cube",
          "tail",
          compactVariant ? 0.026 : 0.03,
          [0.012, -0.002, -0.015],
          tailScale,
          [0, 0, -12],
          "accessory",
        ),
        createGeometryPart(
          "tail-fold-left",
          "cube",
          "tail-fold",
          0.016,
          [-0.015, -0.003, -0.029],
          [0.18, 0.08, 0.26],
          [0, 0, 18],
          "detail",
        ),
        createGeometryPart(
          "tail-fold-right",
          "cube",
          "tail-fold",
          0.016,
          [0.015, -0.003, -0.029],
          [0.18, 0.08, 0.26],
          [0, 0, -18],
          "detail",
        ),
      ],
      silhouetteChecks: [
        "围巾必须先读到横向包裹带和两条下垂尾片，不能像黑色球团或普通吊牌。",
        "中心结只能做连接，不得盖过 wrap-band 的主轮廓。",
      ],
      fallbackFamily: "scarf" as const,
    };
  }

  return null;
}

function getGeometryCompilerHint(task: PromptCustomizationRuntimeDesignTask) {
  const primaryPrototypeId = getPrimaryPrototypeId(task);
  const prototypePack = getPrototypeRuntimePack(primaryPrototypeId);

  return {
    runtimeShapeClass: task.runtimeShapeClass ?? task.family,
    primaryPrototypeId,
    prototypePack,
    routingKey:
      prototypePack?.routingKey ??
      task.runtimeShapeClass ??
      task.semanticClass ??
      task.family,
  };
}

function resolveGeometryFallbackFamily(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
  family: PromptCustomizationAccessoryFamily,
): PromptCustomizationAccessoryFamily {
  switch (runtimeShapeClass) {
    case "known-family":
      return family;
    case "fish-charm":
      return "generic-animal-charm";
    case "berry-charm":
      return "generic-food-charm";
    case "clover-charm":
    case "open-botanical-ornament":
      return "flower";
    case "open-symbol-ornament":
    case "generic-animal-charm":
    case "generic-food-charm":
    case "camera-charm":
    case "boat-charm":
    case "rocket-charm":
    case "device-generic-charm":
    case "vehicle-generic-charm":
      return "generic-ornament";
    default:
      return runtimeShapeClass;
  }
}

function isSpecificKnownAccessoryFamily(
  family: PromptCustomizationAccessoryFamily,
) {
  return (
    family !== "generic-ornament" &&
    family !== "open-botanical-ornament" &&
    family !== "open-symbol-ornament" &&
    family !== "generic-animal-charm" &&
    family !== "generic-food-charm"
  );
}

function normalizeAccessoryFamilyForRuntimeShapeClass(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
  family: PromptCustomizationAccessoryFamily,
): PromptCustomizationAccessoryFamily {
  if (runtimeShapeClass in accessorySemanticClassByFamily) {
    const normalizedFamily = runtimeShapeClass as PromptCustomizationAccessoryFamily;

    if (isSpecificKnownAccessoryFamily(normalizedFamily)) {
      return normalizedFamily;
    }
  }

  return family;
}

function normalizeDesignArchetypeForRuntimeShapeClass(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
  family: PromptCustomizationAccessoryFamily,
  designArchetype: PromptCustomizationDesignArchetype,
): PromptCustomizationDesignArchetype {
  return isSpecificKnownAccessoryFamily(
    normalizeAccessoryFamilyForRuntimeShapeClass(runtimeShapeClass, family),
  )
    ? "known-family"
    : designArchetype;
}

function hasSemanticTrait(
  task: PromptCustomizationRuntimeDesignTask,
  trait: SemanticTrait,
) {
  return task.traits?.includes(trait) ?? false;
}

function isSpecificRuntimeShapeClass(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass | undefined,
) {
  return Boolean(
    runtimeShapeClass &&
      runtimeShapeClass !== "generic-ornament" &&
      runtimeShapeClass !== "open-symbol-ornament" &&
      runtimeShapeClass !== "open-botanical-ornament" &&
      runtimeShapeClass !== "generic-animal-charm" &&
      runtimeShapeClass !== "generic-food-charm",
  );
}

function buildTraitDrivenFallbackGeometryRecipe(
  task: PromptCustomizationRuntimeDesignTask,
) {
  if (isSpecificRuntimeShapeClass(task.runtimeShapeClass)) {
    return null;
  }

  if (task.runtimeShapeClass !== "generic-ornament" && task.family !== "generic-ornament") {
    return null;
  }

  if (hasSemanticTrait(task, "flat-face")) {
    return {
      profileCurves: ["trait-flat-face", "trait-badge-face"],
      symmetry: "bilateral" as const,
      parts: [
        createGeometryPart(
          "ring",
          "torus",
          "hang-ring",
          0.012,
          [0, 0.0015, 0.026],
          [0.18, 0.18, 0.08],
          [90, 0, 0],
        ),
        createGeometryPart(
          "token",
          "cube",
          "badge-face",
          0.034,
          [0, 0, 0.002],
          [0.88, 0.08, 0.82],
          undefined,
          "accessory",
        ),
        createGeometryPart(
          "accent",
          "cube",
          "badge-relief",
          0.018,
          [0, -0.006, 0.01],
          [0.44, 0.03, 0.24],
          undefined,
          "detail",
        ),
      ],
      silhouetteChecks: [
        "flat-face trait 必须把 generic ornament 拉向扁平正面读取。",
        "主体先读平面轮廓，局部 relief 只能做次级读取。",
      ],
    };
  }

  const wantsOpenTop = hasSemanticTrait(task, "open-top");
  const wantsHandle = hasSemanticTrait(task, "has-handle");
  const wantsCylindrical = hasSemanticTrait(task, "cylindrical");

  if (!wantsOpenTop && !(wantsHandle && wantsCylindrical)) {
    return null;
  }

  const parts = [
    createGeometryPart(
      "ring",
      "torus",
      "hang-ring",
      0.012,
      [0, 0.0015, 0.03],
      [0.16, 0.16, 0.08],
      [90, 0, 0],
    ),
    createGeometryPart(
      "token",
      "cylinder",
      "vessel-body",
      0.034,
      [0, 0, 0],
      [0.48, 0.48, 0.78],
      undefined,
      "accessory",
    ),
  ];

  if (wantsOpenTop) {
    parts.push(
      createGeometryPart(
        "rim",
        "torus",
        "cup-rim",
        0.016,
        [0, 0, 0.022],
        [0.42, 0.42, 0.08],
        [90, 0, 0],
        "detail",
      ),
    );
  }

  if (wantsHandle) {
    parts.push(
      createGeometryPart(
        "accent",
        "torus",
        "handle",
        0.018,
        [0.024, 0, 0.004],
        [0.18, 0.1, 0.24],
        [90, 0, 0],
        "detail",
      ),
    );
  } else {
    parts.push(
      createGeometryPart(
        "accent",
        "sphere",
        "accent",
        0.012,
        [0.014, 0.001, 0.004],
        [0.44, 0.44, 0.44],
        undefined,
        "detail",
      ),
    );
  }

  return {
    profileCurves: uniqueStrings([
      "trait-vessel",
      wantsOpenTop ? "trait-open-top" : undefined,
      wantsHandle ? "trait-side-handle" : undefined,
    ]),
    symmetry: wantsHandle ? ("none" as const) : ("bilateral" as const),
    parts,
    silhouetteChecks: uniqueStrings([
      "open-top / cylindrical traits 必须把 generic ornament 拉向容器轮廓。",
      wantsOpenTop ? "容器顶部要读到 rim，而不是封口 token。" : undefined,
      wantsHandle ? "has-handle trait 必须在侧面读到把手。" : undefined,
    ]),
  };
}

type CameraGeometryVariantPreset = {
  deviceBodyScale: [number, number, number];
  faceplateOffset: [number, number, number];
  faceplateScale: [number, number, number];
  lensOffset: [number, number, number];
  lensScale: [number, number, number];
  topOffset: [number, number, number];
  topScale: [number, number, number];
  viewfinderOffset: [number, number, number];
  viewfinderScale: [number, number, number];
  buttonOffset: [number, number, number];
  buttonScale: [number, number, number];
  hangOffset: [number, number, number];
  hangScale: [number, number, number];
};

const cameraGeometryVariantPresets: Record<string, CameraGeometryVariantPreset> = {
  "camera-body-lens-forward": {
    deviceBodyScale: [0.92, 0.118, 0.56],
    faceplateOffset: [0.009, -0.011, 0.004],
    faceplateScale: [0.64, 0.052, 0.44],
    lensOffset: [0.012, -0.021, 0.002],
    lensScale: [0.44, 0.3, 0.28],
    topOffset: [0.006, 0.0006, 0.014],
    topScale: [0.088, 0.028, 0.046],
    viewfinderOffset: [-0.007, 0.0006, 0.013],
    viewfinderScale: [0.062, 0.024, 0.04],
    buttonOffset: [0.01, 0.0008, 0.018],
    buttonScale: [0.024, 0.014, 0.014],
    hangOffset: [0.0008, 0.0004, 0.016],
    hangScale: [0.0022, 0.0022, 0.0016],
  },
  "camera-body-top-cluster": {
    deviceBodyScale: [0.86, 0.118, 0.56],
    faceplateOffset: [0.009, -0.011, 0.004],
    faceplateScale: [0.58, 0.05, 0.42],
    lensOffset: [0.011, -0.02, 0.002],
    lensScale: [0.4, 0.28, 0.28],
    topOffset: [0.007, 0.0006, 0.015],
    topScale: [0.108, 0.03, 0.058],
    viewfinderOffset: [-0.007, 0.0006, 0.014],
    viewfinderScale: [0.068, 0.024, 0.042],
    buttonOffset: [0.01, 0.0008, 0.019],
    buttonScale: [0.026, 0.016, 0.016],
    hangOffset: [0.0008, 0.0004, 0.017],
    hangScale: [0.0022, 0.0022, 0.0016],
  },
  "camera-compact-charm": {
    deviceBodyScale: [0.6, 0.102, 0.46],
    faceplateOffset: [0.0084, -0.0108, 0.0034],
    faceplateScale: [0.38, 0.038, 0.3],
    lensOffset: [0.0108, -0.0196, 0.0036],
    lensScale: [0.56, 0.32, 0.34],
    topOffset: [0.0062, 0.0008, 0.0162],
    topScale: [0.134, 0.034, 0.076],
    viewfinderOffset: [-0.0082, 0.0008, 0.015],
    viewfinderScale: [0.1, 0.028, 0.06],
    buttonOffset: [0.0095, 0.0008, 0.0185],
    buttonScale: [0.024, 0.014, 0.014],
    hangOffset: [0.0008, 0.0004, 0.0164],
    hangScale: [0.002, 0.002, 0.0014],
  },
};

function getCameraGeometryVariantPreset(
  variantId: string | null | undefined,
): CameraGeometryVariantPreset {
  if (variantId && cameraGeometryVariantPresets[variantId]) {
    return cameraGeometryVariantPresets[variantId];
  }

  return cameraGeometryVariantPresets["camera-body-lens-forward"];
}

function buildGeometryRecipeForTask(
  task: PromptCustomizationRuntimeDesignTask,
): PromptCustomizationGeometryRecipe {
  const recipeId = `geo-${task.taskId}`;
  const partGraphId = `graph-${task.taskId}`;
  const geometryCompilerHint = getGeometryCompilerHint(task);
  const runtimeShapeClass = geometryCompilerHint.runtimeShapeClass;
  const normalizedFamily = normalizeAccessoryFamilyForRuntimeShapeClass(
    runtimeShapeClass,
    task.family,
  );
  const referenceGeometry = buildReferenceDrivenGeometryRecipe(task);
  const prototypeReferenceGeometry =
    referenceGeometry ??
    ((task.blueprintFamily === "canonical-ornament" ||
      task.blueprintFamily === "canonical-symbol") &&
    geometryCompilerHint.primaryPrototypeId
      ? buildPrototypeDrivenGeometryRecipe(
          task,
          geometryCompilerHint.primaryPrototypeId,
          "reference",
        )
      : null);
  const archetypeGeometry =
    prototypeReferenceGeometry ?? buildArchetypeGeometryRecipe(task);
  const fallbackFamily =
    archetypeGeometry?.fallbackFamily ??
    geometryCompilerHint.prototypePack?.fallbackFamily ??
    resolveGeometryFallbackFamily(runtimeShapeClass, normalizedFamily);
  let profileCurves = ["soft-low-poly"];
  let symmetry: PromptCustomizationGeometryRecipe["symmetry"] = "bilateral";
  let parts = [
    createGeometryPart("ring", "torus", "hang-ring", 0.018, [0, 0.002, 0.02], [0.28, 0.28, 0.12], [90, 0, 0]),
    createGeometryPart("token", "sphere", "token", 0.03, [0, 0, -0.004], [0.82, 0.72, 0.82]),
  ];
  let silhouetteChecks = ["挂件整体轮廓必须一眼可读。"];

  if (archetypeGeometry) {
    profileCurves = archetypeGeometry.profileCurves;
    symmetry = archetypeGeometry.symmetry;
    parts = archetypeGeometry.parts;
    silhouetteChecks = archetypeGeometry.silhouetteChecks;
  } else {
  const prototypeFallbackGeometry = buildPrototypeDrivenGeometryRecipe(
    task,
    geometryCompilerHint.primaryPrototypeId,
    "fallback",
  );
  const traitFallbackGeometry = buildTraitDrivenFallbackGeometryRecipe(task);

  if (prototypeFallbackGeometry) {
      profileCurves = prototypeFallbackGeometry.profileCurves;
      symmetry = prototypeFallbackGeometry.symmetry;
      parts = prototypeFallbackGeometry.parts;
      silhouetteChecks = prototypeFallbackGeometry.silhouetteChecks;
    } else if (traitFallbackGeometry) {
      profileCurves = traitFallbackGeometry.profileCurves;
      symmetry = traitFallbackGeometry.symmetry;
      parts = traitFallbackGeometry.parts;
      silhouetteChecks = traitFallbackGeometry.silhouetteChecks;
    } else {
  switch (geometryCompilerHint.routingKey) {
    case "necklace-chain":
      profileCurves = ["soft-chain"];
      parts = [
        createGeometryPart("bead-1", "sphere", "chain", 0.012, [-0.042, 0.001, 0.014], [0.44, 0.44, 0.44]),
        createGeometryPart("bead-2", "sphere", "chain", 0.012, [-0.022, 0.001, 0.006], [0.44, 0.44, 0.44]),
        createGeometryPart("bead-3", "sphere", "chain", 0.012, [0, 0.001, 0.002], [0.44, 0.44, 0.44]),
        createGeometryPart("bead-4", "sphere", "chain", 0.012, [0.022, 0.001, 0.006], [0.44, 0.44, 0.44]),
        createGeometryPart("bead-5", "sphere", "chain", 0.012, [0.042, 0.001, 0.014], [0.44, 0.44, 0.44]),
        createGeometryPart("drop", "cylinder", "link", 0.012, [0, 0.002, -0.016], [0.12, 0.54, 0.12]),
        createGeometryPart("charm", "sphere", "charm", 0.022, [0, 0.002, -0.032], [0.72, 0.72, 0.78]),
      ];
      silhouetteChecks = ["项链需要形成可读的链条弧线和胸前吊坠。"];
      break;
    case "earring-hoop":
      profileCurves = ["clean-hoop"];
      parts = [
        createGeometryPart("hoop", "torus", "hoop", 0.026, [0, 0, 0], [0.52, 0.52, 0.16], [90, 0, 0]),
        createGeometryPart("bead", "sphere", "bead", 0.01, [0, 0.001, -0.018], [0.52, 0.52, 0.52]),
      ];
      silhouetteChecks = ["耳环需要先读成吊环，而不是普通球体。"];
      break;
    case "pendant-charm":
      parts = [
        createGeometryPart("ring", "torus", "hang-ring", 0.014, [0, 0.001, 0.014], [0.34, 0.34, 0.14], [90, 0, 0]),
        createGeometryPart("link", "cylinder", "link", 0.01, [0, 0.001, 0.002], [0.1, 0.52, 0.1]),
        createGeometryPart("token", "sphere", "token", 0.026, [0, 0.001, -0.018], [0.68, 0.68, 0.78]),
      ];
      silhouetteChecks = ["吊坠挂件需要形成挂环、连接段和主体。"];
      break;
    case "scarf":
      profileCurves = ["scarf-wrap", "scarf-wrap-forward"];
      parts = [
        createGeometryPart("wrap-band", "cube", "scarf-wrap", 0.04, [0, -0.004, 0.008], [0.9, 0.26, 0.19]),
        createGeometryPart("knot", "cube", "knot", 0.026, [0, -0.003, 0.001], [0.64, 0.32, 0.28]),
        createGeometryPart("tail-left", "cube", "tail", 0.03, [-0.012, -0.002, -0.015], [0.38, 0.2, 0.68], [0, 0, 12]),
        createGeometryPart("tail-right", "cube", "tail", 0.03, [0.012, -0.002, -0.015], [0.38, 0.2, 0.68], [0, 0, -12]),
      ];
      silhouetteChecks = ["围巾挂件需要形成横向包裹带、中心结和双尾下垂。"];
      break;
    case "tie":
      parts = [
        createGeometryPart("knot", "cube", "knot", 0.032, [0, 0.002, 0.012], [0.54, 0.3, 0.3]),
        createGeometryPart("collar-left", "cube", "wing", 0.022, [-0.008, 0.001, 0.008], [0.24, 0.48, 0.12], [0, 0, 28]),
        createGeometryPart("collar-right", "cube", "wing", 0.022, [0.008, 0.001, 0.008], [0.24, 0.48, 0.12], [0, 0, -28]),
        createGeometryPart("blade-main", "cone", "blade", 0.072, [0, 0.003, -0.004], [0.18, 0.14, 0.58], [180, 0, 0]),
        createGeometryPart("blade-back", "cone", "blade", 0.046, [0.004, 0.002, 0.001], [0.14, 0.1, 0.34], [180, 0, 8]),
      ];
      silhouetteChecks = ["领带需要清晰区分结、两侧领口和下垂主片。"];
      break;
    case "bow":
      parts = [
        createGeometryPart("left-wing", "sphere", "wing", 0.032, [-0.013, 0, 0.003], [0.92, 0.28, 0.54]),
        createGeometryPart("right-wing", "sphere", "wing", 0.032, [0.013, 0, 0.003], [0.92, 0.28, 0.54]),
        createGeometryPart("knot", "cube", "knot", 0.02, [0, 0, 0.002], [0.52, 0.34, 0.36]),
        createGeometryPart("left-tail", "cube", "tail", 0.022, [-0.006, 0, -0.008], [0.2, 0.44, 0.56], [0, 0, 18]),
        createGeometryPart("right-tail", "cube", "tail", 0.022, [0.006, 0, -0.008], [0.2, 0.44, 0.56], [0, 0, -18]),
      ];
      silhouetteChecks = ["蝴蝶结需要有中心结、双翼和尾片。"];
      break;
    case "bell":
      parts = [
        createGeometryPart("ring", "torus", "hang-ring", 0.012, [0, 0, 0.0085], [0.34, 0.34, 0.12], [90, 0, 0]),
        createGeometryPart("cap", "cylinder", "cap", 0.014, [0, 0, 0.0045], [0.22, 0.22, 0.14]),
        createGeometryPart("body", "sphere", "bell-body", 0.028, [0, 0, -0.005], [0.62, 0.62, 0.8]),
        createGeometryPart("clapper", "sphere", "clapper", 0.008, [0, 0, -0.011], [0.5, 0.5, 0.5]),
      ];
      silhouetteChecks = ["铃铛需要挂环、顶盖和鼓起的主体。"];
      break;
    case "cloud-charm":
      parts = [
        createGeometryPart("ring", "torus", "hang-ring", 0.016, [0, 0.002, 0.022], [0.28, 0.28, 0.12], [90, 0, 0]),
        createGeometryPart("left-puff", "sphere", "cloud", 0.026, [-0.02, 0, -0.002], [0.78, 0.52, 0.58]),
        createGeometryPart("center-puff", "sphere", "cloud", 0.034, [0, 0, 0.004], [0.9, 0.58, 0.68]),
        createGeometryPart("right-puff", "sphere", "cloud", 0.026, [0.02, 0, -0.002], [0.78, 0.52, 0.58]),
        createGeometryPart("base-puff", "sphere", "cloud-base", 0.03, [0, 0, -0.014], [1.18, 0.34, 0.42]),
      ];
      silhouetteChecks = ["云朵挂饰需要形成多团云层轮廓。"];
      break;
    case "candle-charm":
      parts = [
        createGeometryPart("ring", "torus", "hang-ring", 0.014, [0, 0.002, 0.026], [0.22, 0.22, 0.12], [90, 0, 0]),
        createGeometryPart("wax-body", "cylinder", "wax-body", 0.034, [0, 0, 0], [0.38, 0.38, 0.94]),
        createGeometryPart("wax-top", "sphere", "wax-top", 0.016, [0, 0, 0.028], [0.44, 0.44, 0.2]),
        createGeometryPart("wick", "cylinder", "wick", 0.008, [0, 0, 0.048], [0.08, 0.08, 0.28]),
        createGeometryPart("flame", "cone", "flame", 0.016, [0, 0, 0.068], [0.2, 0.2, 0.46], [180, 0, 0]),
      ];
      silhouetteChecks = ["蜡烛挂饰需要有蜡烛主体、烛芯和火焰。"];
      break;
    case "fish-charm":
      parts = [
        createGeometryPart("ring", "torus", "hang-ring", 0.01, [0, 0.002, 0.022], [0.16, 0.16, 0.08], [90, 0, 0]),
        createGeometryPart("body", "icosphere", "fish-body", 0.034, [0, 0, 0], [1.18, 0.46, 0.62]),
        createGeometryPart("tail", "cone", "tail", 0.026, [-0.042, 0, 0], [0.2, 0.54, 0.34], [0, 90, -90]),
        createGeometryPart("fin-top", "cone", "fin", 0.014, [-0.002, 0, 0.018], [0.12, 0.12, 0.24], [0, 0, -10]),
        createGeometryPart("fin-bottom", "cone", "fin", 0.012, [0.004, 0, -0.014], [0.1, 0.1, 0.2], [180, 0, 0]),
        createGeometryPart("nose", "sphere", "nose", 0.01, [0.038, 0, 0.001], [0.28, 0.22, 0.22]),
      ];
      silhouetteChecks = ["小鱼挂饰需要清晰鱼身、尾鳍和上下鳍。"];
      break;
    case "berry-charm":
      parts = [
        createGeometryPart("ring", "torus", "hang-ring", 0.014, [0, 0.002, 0.026], [0.24, 0.24, 0.12], [90, 0, 0]),
        createGeometryPart("berry-main", "sphere", "berry", 0.028, [0, 0, 0.006], [0.84, 0.84, 0.92]),
        createGeometryPart("berry-side-left", "sphere", "berry", 0.018, [-0.016, 0, -0.012], [0.74, 0.74, 0.74]),
        createGeometryPart("berry-side-right", "sphere", "berry", 0.018, [0.016, 0, -0.012], [0.74, 0.74, 0.74]),
        createGeometryPart("leaf-crown", "cone", "leaf", 0.024, [0, 0.002, 0.03], [0.26, 0.26, 0.3], [0, 0, 180]),
        createGeometryPart("leaf-side", "cone", "leaf", 0.018, [0.014, 0.002, 0.022], [0.18, 0.18, 0.24], [0, 0, 160]),
      ];
      silhouetteChecks = ["莓果挂饰需要先读成草莓/莓果，而不是普通圆球。"];
      break;
    case "flower":
      parts = [
        createGeometryPart("core", "sphere", "flower-core", 0.016, [0, 0, 0.002], [0.42, 0.42, 0.3]),
        createGeometryPart("petal-left", "sphere", "petal", 0.024, [-0.024, 0, 0.004], [0.68, 0.22, 0.5], [0, 0, 18]),
        createGeometryPart("petal-right", "sphere", "petal", 0.024, [0.024, 0, 0.004], [0.68, 0.22, 0.5], [0, 0, -18]),
        createGeometryPart("petal-top", "sphere", "petal", 0.024, [0, 0, 0.028], [0.5, 0.22, 0.68]),
        createGeometryPart("petal-bottom", "sphere", "petal", 0.024, [0, 0, -0.022], [0.5, 0.22, 0.62]),
        createGeometryPart("petal-top-left", "sphere", "petal", 0.02, [-0.017, 0, 0.02], [0.44, 0.18, 0.42], [0, 0, 36]),
        createGeometryPart("petal-top-right", "sphere", "petal", 0.02, [0.017, 0, 0.02], [0.44, 0.18, 0.42], [0, 0, -36]),
      ];
      silhouetteChecks = ["花朵装饰要读出花心和分层花瓣，不要退化成普通球团。"];
      break;
    case "clover-charm":
      parts = [
        createGeometryPart("ring", "torus", "hang-ring", 0.014, [0, 0.002, 0.024], [0.24, 0.24, 0.12], [90, 0, 0]),
        createGeometryPart("core", "sphere", "clover-core", 0.012, [0, 0, 0.002], [0.34, 0.34, 0.24]),
        createGeometryPart("leaf-left", "sphere", "leaf", 0.022, [-0.017, 0, 0.01], [0.78, 0.22, 0.58], [0, 0, 18]),
        createGeometryPart("leaf-right", "sphere", "leaf", 0.022, [0.017, 0, 0.01], [0.78, 0.22, 0.58], [0, 0, -18]),
        createGeometryPart("leaf-top", "sphere", "leaf", 0.022, [0, 0, 0.026], [0.62, 0.22, 0.74]),
        createGeometryPart("leaf-bottom", "sphere", "leaf", 0.022, [0, 0, -0.016], [0.6, 0.22, 0.68]),
        createGeometryPart("stem", "cylinder", "stem", 0.018, [0.007, 0, -0.026], [0.08, 0.44, 0.08], [0, 0, -32]),
      ];
      silhouetteChecks = ["四叶草挂饰要形成四片叶和短茎，不要看起来像普通花球或红球。"];
      break;
    case "open-botanical-ornament":
      parts = [
        createGeometryPart("ring", "torus", "hang-ring", 0.014, [0, 0.002, 0.024], [0.24, 0.24, 0.12], [90, 0, 0]),
        createGeometryPart("core", "sphere", "botanical-core", 0.014, [0, 0, 0.004], [0.44, 0.44, 0.3]),
        createGeometryPart("leaf-left", "sphere", "leaf", 0.024, [-0.018, 0, 0.008], [0.74, 0.18, 0.62], [0, 0, 20]),
        createGeometryPart("leaf-right", "sphere", "leaf", 0.024, [0.018, 0, 0.008], [0.74, 0.18, 0.62], [0, 0, -20]),
        createGeometryPart("petal-top", "sphere", "petal", 0.022, [0, 0, 0.026], [0.56, 0.18, 0.72]),
        createGeometryPart("stem", "cylinder", "stem", 0.02, [0.006, 0, -0.022], [0.08, 0.46, 0.08], [0, 0, -24]),
      ];
      silhouetteChecks = ["植物系挂件要有叶片或花瓣和连接结构，不要退化成通用吊坠。"];
      break;
    case "open-symbol-ornament":
      parts = [
        createGeometryPart("ring", "torus", "hang-ring", 0.014, [0, 0.002, 0.024], [0.24, 0.24, 0.12], [90, 0, 0]),
        createGeometryPart("core", "sphere", "symbol-core", 0.016, [0, 0, 0.002], [0.42, 0.42, 0.3]),
        createGeometryPart("arm-top", "cube", "symbol-arm", 0.016, [0, 0, 0.026], [0.18, 0.14, 0.44]),
        createGeometryPart("arm-left", "cube", "symbol-arm", 0.016, [-0.024, 0, 0.004], [0.44, 0.14, 0.18], [0, 0, 18]),
        createGeometryPart("arm-right", "cube", "symbol-arm", 0.016, [0.024, 0, 0.004], [0.44, 0.14, 0.18], [0, 0, -18]),
        createGeometryPart("arm-bottom", "cube", "symbol-arm", 0.016, [0, 0, -0.02], [0.22, 0.14, 0.34]),
      ];
      silhouetteChecks = ["图形挂件要有清楚的符号分区，不要退化成单个 token。"];
      break;
    case "leaf":
      parts = [
        createGeometryPart("leaf-main", "sphere", "leaf", 0.046, [0, 0, 0], [0.66, 0.18, 0.98], [20, 0, 24]),
        createGeometryPart("leaf-stem", "cylinder", "stem", 0.03, [-0.01, 0.001, -0.014], [0.08, 0.46, 0.08], [0, 12, 62]),
      ];
      silhouetteChecks = ["叶片装饰要有长椭圆叶面和茎。"];
      break;
    case "forest":
      parts = [
        createGeometryPart("pine-main", "cone", "tree", 0.068, [0, 0.001, 0.01], [0.52, 0.52, 0.88], [180, 0, 0]),
        createGeometryPart("pine-small", "cone", "tree", 0.048, [0.03, 0.001, -0.008], [0.42, 0.42, 0.66], [180, 0, -10]),
        createGeometryPart("berry", "sphere", "berry", 0.018, [-0.026, 0.004, -0.018], [0.92, 0.92, 0.92]),
        createGeometryPart("leaf", "sphere", "leaf", 0.024, [-0.008, 0.001, -0.004], [0.64, 0.16, 0.92], [16, 0, 38]),
      ];
      silhouetteChecks = ["森林形装饰要同时读到树形和点缀物。"];
      break;
    case "mushroom":
      parts = [
        createGeometryPart("stem", "cylinder", "stem", 0.022, [0, 0, -0.022], [0.32, 0.72, 0.32]),
        createGeometryPart("cap", "sphere", "cap", 0.048, [0, 0, 0.008], [0.82, 0.82, 0.5]),
        createGeometryPart("spot-left", "sphere", "spot", 0.012, [-0.016, 0.002, 0.018], [0.8, 0.8, 0.8]),
        createGeometryPart("spot-right", "sphere", "spot", 0.012, [0.016, 0.002, 0.014], [0.8, 0.8, 0.8]),
      ];
      silhouetteChecks = ["蘑菇装饰要有菌盖和菌柄。"];
      break;
    case "star":
      symmetry = "radial";
      parts = [
        createGeometryPart("core", "sphere", "core", 0.022, [0, 0, 0], [0.45, 0.45, 0.45]),
        createGeometryPart("ray-1", "cone", "ray", 0.034, [0, 0, 0.038], [0.18, 0.18, 0.42], [90, 0, 0]),
        createGeometryPart("ray-2", "cone", "ray", 0.034, [0.036, 0, 0.012], [0.18, 0.18, 0.42], [90, 0, 72]),
        createGeometryPart("ray-3", "cone", "ray", 0.034, [0.022, 0, -0.028], [0.18, 0.18, 0.42], [90, 0, 144]),
        createGeometryPart("ray-4", "cone", "ray", 0.034, [-0.022, 0, -0.028], [0.18, 0.18, 0.42], [90, 0, 216]),
        createGeometryPart("ray-5", "cone", "ray", 0.034, [-0.036, 0, 0.012], [0.18, 0.18, 0.42], [90, 0, 288]),
      ];
      silhouetteChecks = ["星形装饰要形成五角星轮廓。"];
      break;
    case "dessert":
    case "dessert-hang":
    case "generic-food-charm":
      parts = [
        createGeometryPart("ring", "torus", "hang-ring", 0.016, [0, 0.002, 0.024], [0.24, 0.24, 0.12], [90, 0, 0]),
        createGeometryPart("berry-main", "sphere", "dessert", 0.03, [0, 0, 0.004], [0.84, 0.84, 0.84]),
        createGeometryPart("berry-side", "sphere", "dessert", 0.022, [0.026, 0.002, -0.012], [0.9, 0.9, 0.9]),
        createGeometryPart("cream", "cone", "cream", 0.034, [-0.004, 0.001, 0.03], [0.42, 0.42, 0.52], [0, 0, 180]),
        createGeometryPart("candy-star", "sphere", "topping", 0.014, [-0.03, 0.002, -0.012], [0.78, 0.24, 0.78]),
      ];
      silhouetteChecks = ["甜点挂件要形成莓果 + 奶油的组合轮廓。"];
      break;
    case "candy":
      parts = [
        createGeometryPart("core", "sphere", "candy", 0.034, [0, 0, 0], [0.86, 0.62, 0.62]),
        createGeometryPart("left-wrap", "cone", "wrap", 0.024, [-0.034, 0, 0], [0.22, 0.22, 0.36], [0, 90, 0]),
        createGeometryPart("right-wrap", "cone", "wrap", 0.024, [0.034, 0, 0], [0.22, 0.22, 0.36], [0, -90, 0]),
      ];
      silhouetteChecks = ["糖果挂件要形成糖纸两端。"];
      break;
    case "generic-animal-charm":
      parts = [
        createGeometryPart("ring", "torus", "hang-ring", 0.014, [0, 0.002, 0.024], [0.24, 0.24, 0.12], [90, 0, 0]),
        createGeometryPart("body", "sphere", "animal-body", 0.03, [0, 0, 0], [0.84, 0.7, 0.82]),
        createGeometryPart("tail", "cone", "tail", 0.022, [-0.028, 0, -0.002], [0.2, 0.24, 0.32], [0, 90, -90]),
        createGeometryPart("ear-left", "cone", "ear", 0.016, [0.012, 0, 0.022], [0.16, 0.16, 0.2]),
        createGeometryPart("ear-right", "cone", "ear", 0.016, [-0.004, 0, 0.022], [0.16, 0.16, 0.2]),
      ];
      silhouetteChecks = ["动物挂饰要至少具备主体和附属特征。"];
      break;
    default:
      if (hasKeyword(task.requestLabel, ["钥匙", "key"])) {
        parts = [
          createGeometryPart("ring", "torus", "key-ring", 0.022, [0, 0, 0.026], [0.42, 0.42, 0.14], [90, 0, 0]),
          createGeometryPart("shaft", "cylinder", "shaft", 0.026, [0, 0, -0.004], [0.16, 0.16, 0.76]),
          createGeometryPart("tooth-top", "cube", "tooth", 0.012, [0.012, 0, -0.032], [0.16, 0.24, 0.18]),
          createGeometryPart("tooth-bottom", "cube", "tooth", 0.012, [-0.008, 0, -0.038], [0.18, 0.18, 0.16]),
        ];
        silhouetteChecks = ["钥匙挂饰需要有钥匙圈、柄和钥匙齿。"];
        break;
      }

      if (hasKeyword(task.requestLabel, ["羽毛", "feather"])) {
        parts = [
          createGeometryPart("stem", "cylinder", "stem", 0.028, [0, 0, -0.01], [0.08, 0.08, 0.92], [8, 0, 12]),
          createGeometryPart("vane-main", "sphere", "vane", 0.034, [0.008, 0, 0.01], [0.36, 0.12, 1.08], [10, 0, 24]),
          createGeometryPart("vane-tip", "sphere", "vane", 0.022, [-0.008, 0, 0.03], [0.24, 0.1, 0.62], [18, 0, 36]),
          createGeometryPart("ring", "torus", "hang-ring", 0.012, [0, 0.002, 0.044], [0.2, 0.2, 0.12], [90, 0, 0]),
        ];
        silhouetteChecks = ["羽毛挂饰需要有羽轴和羽片轮廓。"];
        break;
      }

      parts = [
        createGeometryPart("ring", "torus", "hang-ring", 0.016, [0, 0.002, 0.022], [0.28, 0.28, 0.12], [90, 0, 0]),
        createGeometryPart("token", "sphere", "token", 0.03, [0, 0, -0.004], [0.82, 0.72, 0.82]),
        createGeometryPart("accent", "sphere", "accent", 0.016, [0.018, 0.002, 0.01], [0.5, 0.5, 0.5]),
      ];
      silhouetteChecks = ["通用挂件至少要形成悬挂点和主体。"];
      break;
  }
  }
  }

  const partIds = parts.map((part) => part.partId);
  const assemblyRootPartId =
    task.assemblyRootPartId ??
    inferAssemblyRootPartId(runtimeShapeClass, partIds);
  const attachmentPartId =
    task.attachmentPartId ??
    inferAttachmentPartId(runtimeShapeClass, partIds, []);
  const partHierarchy = buildRuntimePartHierarchy(
    runtimeShapeClass,
    partIds,
    assemblyRootPartId,
    attachmentPartId,
  );

  return {
    recipeId,
    taskId: task.taskId,
    requestId: task.requestId,
    nounDesignBriefId: task.nounDesignBriefId,
    partGraphId,
    displayLabel: task.requestLabel,
    requestedNoun: task.requestedNoun,
    designArchetype: task.designArchetype,
    runtimeShapeClass,
    sourceMode: task.sourceMode,
    referenceConfidence: task.referenceConfidence,
    referencePack: task.referencePack,
    referenceId: task.referenceId,
    referenceSourceKind: task.referenceSourceKind,
    blueprintFamily: task.blueprintFamily,
    representationMode: task.representationMode,
    familyPolicyId: task.familyPolicyId,
    capabilityBundle: task.capabilityBundle,
    runtimeDesignContract: task.runtimeDesignContract,
    variantCandidates: task.variantCandidates,
    variantId: task.variantId,
    canonicalBlueprint: task.canonicalBlueprint,
    referenceDerivedBlueprint: task.referenceDerivedBlueprint,
    shapeIntent: task.shapeIntent,
    criticalParts: task.criticalParts,
    optionalParts: task.optionalParts,
    silhouetteGoals: task.silhouetteGoals,
    negativeLookalikes: task.negativeLookalikes,
    hangingStrategy: task.hangingStrategy,
    assemblyRootPartId,
    attachmentPartId,
    silhouetteBlocks: task.silhouetteBlocks,
    assemblySegments: task.assemblySegments,
    mountStrategy: task.mountStrategy,
    readOrderTargets: task.readOrderTargets,
    criticalViewGoals: task.criticalViewGoals,
    compilerIntent: task.compilerIntent,
    structuralBlueprint: task.structuralBlueprint,
    primarySilhouette: task.primarySilhouette,
    partProfiles: task.partProfiles,
    attachmentRules: task.attachmentRules,
    partImportanceWeights: task.partImportanceWeights,
    symmetryPolicy: task.symmetryPolicy,
    deformationPolicy: task.deformationPolicy,
    family: normalizedFamily,
    semanticClass: task.semanticClass,
    runtimeDesignSource: task.runtimeDesignSource,
    basePrimitives: uniqueStrings(parts.map((part) => part.primitive)) as PromptCustomizationGeometryRecipe["basePrimitives"],
    profileCurves,
    symmetry,
    parts,
    partHierarchy,
    anchorOffsets: [0, 0, 0],
    orientationRules: [
      isChestAccessoryAnchor(task.anchor)
        ? "face-forward-on-chest"
        : isTailAccessoryAnchor(task.anchor)
          ? "follow-tail-surface"
          : "follow-anchor-normal",
    ],
    materialZones: uniqueStrings(
      parts.map((part) => part.materialZone ?? "accessory"),
    ) as PromptCustomizationGeometryRecipe["materialZones"],
    sizeBounds: {
      overallScale: task.sourceMode && task.sourceMode !== "legacy-fallback" ? 0.92 : 1,
      maxPartScale: task.sourceMode && task.sourceMode !== "legacy-fallback" ? 1.05 : 1.2,
      minPartCount: parts.length,
    },
    silhouetteChecks,
    approximationLabel:
      fallbackFamily !== task.family ? task.requestLabel : undefined,
    fallbackFamily: fallbackFamily !== task.family ? fallbackFamily : undefined,
  };
}

function buildGeometryRecipes(
  tasks: PromptCustomizationRuntimeDesignTask[],
): PromptCustomizationGeometryRecipe[] {
  return tasks.map((task) => buildGeometryRecipeForTask(task));
}

function inferPartGraphRelation(role: string, childPartId: string) {
  if (childPartId === "hang-slot" || childPartId === "ring" || role.includes("hang")) {
    return "hangs-from" as const;
  }

  if (
    role.includes("tail") ||
    role.includes("fin") ||
    role.includes("stem") ||
    role.includes("sail") ||
    role.includes("wing")
  ) {
    return "extends-from" as const;
  }

  if (role.includes("leaf") || role.includes("petal")) {
    return "balances" as const;
  }

  if (
    role.includes("lens") ||
    role.includes("screen") ||
    role.includes("button") ||
    role.includes("viewfinder")
  ) {
    return "layers-over" as const;
  }

  return "attached-to" as const;
}

function inferPartGraphMountFace(parentPartId: string, childPartId: string, role: string) {
  if (childPartId === "camera-lens") {
    return "front";
  }

  if (childPartId === "camera-top" || childPartId === "camera-button") {
    return "top-right";
  }

  if (childPartId === "camera-viewfinder") {
    return "top-left";
  }

  if (childPartId === "boat-deck") {
    return "top";
  }

  if (childPartId === "boat-mast") {
    return "centerline";
  }

  if (childPartId === "boat-sail") {
    return "side";
  }

  if (childPartId === "rocket-nose") {
    return "front";
  }

  if (
    childPartId === "rocket-fin-left" ||
    childPartId === "rocket-fin-right" ||
    childPartId === "rocket-nozzle"
  ) {
    return "rear";
  }

  if (childPartId === "hang-slot" || childPartId === "ring" || role.includes("hang")) {
    return "top";
  }

  if (role.includes("leaf") || role.includes("petal")) {
    return "around";
  }

  if (role.includes("tail") || role.includes("fin") || role.includes("sail")) {
    return "side";
  }

  return "center";
}

function inferPartGraphRotationMode(childPartId: string, role: string) {
  if (childPartId === "hang-slot" || childPartId === "ring") {
    return "align-parent" as const;
  }

  if (role.includes("screen") || role.includes("lens")) {
    return "face-camera" as const;
  }

  return "inherit" as const;
}

function buildAccessoryPartGraphs(
  nounDesignBriefs: PromptCustomizationNounDesignBrief[],
  geometryRecipes: PromptCustomizationGeometryRecipe[],
): PromptCustomizationAccessoryPartGraph[] {
  const briefMap = new Map(nounDesignBriefs.map((brief) => [brief.requestId, brief]));

  return geometryRecipes.map((geometryRecipe) => {
    const brief = briefMap.get(geometryRecipe.requestId);
    const structuralBlueprint =
      brief?.structuralBlueprint ?? geometryRecipe.structuralBlueprint;
    const attachmentRuleMap = new Map(
      (structuralBlueprint?.attachmentRules ?? geometryRecipe.attachmentRules ?? []).map(
        (rule) => [rule.partId, rule],
      ),
    );
    const criticalParts = brief?.criticalParts ?? geometryRecipe.criticalParts;
    const optionalParts = brief?.optionalParts ?? geometryRecipe.optionalParts;
    const nodes = geometryRecipe.parts.map((part) => ({
      nodeId: `${geometryRecipe.partGraphId ?? `graph-${geometryRecipe.taskId}`}:${part.partId}`,
      partId: part.partId,
      semanticLabel: part.partId,
      role: part.role,
      required: criticalParts.includes(part.partId),
      stageIndex: buildPartGraphStageIndex(part.partId, criticalParts, optionalParts),
      importance: buildPartGraphImportance(part.partId, criticalParts, optionalParts),
    }));
    const nodeByPartId = new Map(nodes.map((node) => [node.partId, node]));
    const partById = new Map(geometryRecipe.parts.map((part) => [part.partId, part]));
    const rootPartId =
      geometryRecipe.assemblyRootPartId ??
      brief?.assemblyRootPartId ??
      nodes[0]?.partId;
    const attachmentPartId =
      geometryRecipe.attachmentPartId ??
      brief?.attachmentPartId ??
      rootPartId;
    const edges = (geometryRecipe.partHierarchy.length > 0
      ? geometryRecipe.partHierarchy
      : buildRuntimePartHierarchy(
          geometryRecipe.runtimeShapeClass ?? geometryRecipe.family,
          geometryRecipe.parts.map((part) => part.partId),
          rootPartId ?? nodes[0]?.partId ?? "token",
          attachmentPartId ?? rootPartId ?? nodes[0]?.partId ?? "token",
        ))
      .flatMap((edge) => {
        const parentNode = nodeByPartId.get(edge.parentId);
        const childNode = nodeByPartId.get(edge.childId);
        const parentPart = partById.get(edge.parentId);
        const childPart = partById.get(edge.childId);

        if (!parentNode || !childNode || !childPart) {
          return [];
        }

        const parentOffset = Array.isArray(parentPart?.offset) ? parentPart.offset : [0, 0, 0];
        const childOffset = Array.isArray(childPart.offset) ? childPart.offset : [0, 0, 0];
        const attachmentRule = attachmentRuleMap.get(edge.childId);
        const orientationConstraint = attachmentRule?.orientationConstraint;
        const relation =
          attachmentRule?.edgeConstraint === "free-hang"
            ? "hangs-from"
            : attachmentRule?.edgeConstraint === "flush-mount" ||
                attachmentRule?.edgeConstraint === "embedded-front" ||
                attachmentRule?.edgeConstraint === "rooted-span"
              ? "layers-over"
              : attachmentRule?.edgeConstraint === "supported-branch" ||
                  attachmentRule?.edgeConstraint === "side-balance"
                ? "extends-from"
                : inferPartGraphRelation(childNode.role, edge.childId);
        const rotationMode =
          orientationConstraint === "front-facing"
            ? ("face-camera" as const)
            : orientationConstraint === "upright"
              ? ("fixed" as const)
              : orientationConstraint === "follow-parent"
                ? ("align-parent" as const)
                : inferPartGraphRotationMode(edge.childId, childNode.role);
        const spanOwnership =
          attachmentRule?.spanOwnership ??
          (childNode.required ? "secondary" : "support");
        const cohesionWeight =
          spanOwnership === "primary"
            ? 0.96
            : spanOwnership === "secondary"
              ? 0.92
              : spanOwnership === "attachment"
                ? 0.72
                : childNode.required
                  ? 0.88
                  : 0.78;

        return [
          {
            fromNodeId: parentNode.nodeId,
            toNodeId: childNode.nodeId,
            parentPartId: edge.parentId,
            childPartId: edge.childId,
            relation,
            required: childNode.required,
            mountFace:
              attachmentRule?.mountFace ??
              inferPartGraphMountFace(edge.parentId, edge.childId, childNode.role),
            localOffset: [
              Number(((childOffset[0] ?? 0) - (parentOffset[0] ?? 0)).toFixed(4)),
              Number(((childOffset[1] ?? 0) - (parentOffset[1] ?? 0)).toFixed(4)),
              Number(((childOffset[2] ?? 0) - (parentOffset[2] ?? 0)).toFixed(4)),
            ] as [number, number, number],
            rotationMode,
            maxDrift: attachmentRule?.allowedDrift ?? (childNode.required ? 0.006 : 0.012),
            allowedDrift: attachmentRule?.allowedDrift,
            cohesionWeight,
            edgeConstraint: attachmentRule?.edgeConstraint,
            orientationConstraint,
            flushMount: attachmentRule?.flushMount,
            embedDepth: attachmentRule?.embedDepth,
            spanOwnership,
            supportDependency: attachmentRule?.supportDependency,
          },
        ];
      });

    return {
      graphId: geometryRecipe.partGraphId ?? `graph-${geometryRecipe.taskId}`,
      briefId: brief?.briefId ?? geometryRecipe.nounDesignBriefId ?? `brief-${geometryRecipe.requestId}`,
      taskId: geometryRecipe.taskId,
      requestId: geometryRecipe.requestId,
      requestedNoun: geometryRecipe.requestedNoun,
      designArchetype: geometryRecipe.designArchetype,
      runtimeShapeClass: geometryRecipe.runtimeShapeClass,
      capabilityBundle:
        brief?.capabilityBundle ??
        geometryRecipe.capabilityBundle,
      rootPartId,
      attachmentPartId,
      nodes,
      edges,
      stages: uniqueStrings([
        "保住关键部件",
        optionalParts.length > 0 ? "补次级部件" : undefined,
        "修轮廓与挂点",
      ]),
    };
  });
}

function attachRuntimeDesignFacts(
  resolvedExecutionPlan: PromptCustomizationResolvedExecutionPlan,
  runtimeDesignTasks: PromptCustomizationRuntimeDesignTask[],
  nounDesignBriefs: PromptCustomizationNounDesignBrief[],
  partGraphs: PromptCustomizationAccessoryPartGraph[],
  geometryRecipes: PromptCustomizationGeometryRecipe[],
): PromptCustomizationResolvedExecutionPlan {
  const taskMap = new Map(runtimeDesignTasks.map((task) => [task.requestId, task]));
  const briefMap = new Map(nounDesignBriefs.map((brief) => [brief.requestId, brief]));
  const partGraphMap = new Map(partGraphs.map((graph) => [graph.requestId, graph]));
  const recipeMap = new Map(geometryRecipes.map((recipe) => [recipe.requestId, recipe]));

  return {
    ...resolvedExecutionPlan,
    addAccessories: resolvedExecutionPlan.addAccessories.map((execution) => {
      const task = taskMap.get(execution.requestId);
      const brief = briefMap.get(execution.requestId);
      const partGraph = partGraphMap.get(execution.requestId);
      const geometryRecipe = recipeMap.get(execution.requestId);

      if (!task) {
        return execution;
      }

      return {
        ...execution,
        family: geometryRecipe?.family ?? task.family,
        requestedSemanticClass:
          geometryRecipe?.semanticClass ??
          task.semanticClass,
        requestedLabel: task.requestLabel,
        requestedNoun: task.requestedNoun,
        sourceMode:
          geometryRecipe?.sourceMode ??
          brief?.sourceMode ??
          task.sourceMode,
        referenceConfidence:
          geometryRecipe?.referenceConfidence ??
          brief?.referenceConfidence ??
          task.referenceConfidence,
        referencePack:
          geometryRecipe?.referencePack ??
          brief?.referencePack ??
          task.referencePack,
        referenceId: geometryRecipe?.referenceId ?? brief?.referenceId ?? task.referenceId,
        referenceSourceKind:
          geometryRecipe?.referenceSourceKind ??
          brief?.referenceSourceKind ??
          task.referenceSourceKind,
        designArchetype: task.designArchetype,
        runtimeShapeClass:
          geometryRecipe?.runtimeShapeClass ??
          brief?.runtimeShapeClass ??
          task.runtimeShapeClass,
        capabilityBundle:
          geometryRecipe?.capabilityBundle ??
          brief?.capabilityBundle ??
          task.capabilityBundle,
        runtimeDesignContract:
          geometryRecipe?.runtimeDesignContract ??
          brief?.runtimeDesignContract ??
          task.runtimeDesignContract,
        blueprintFamily:
          geometryRecipe?.blueprintFamily ??
          brief?.blueprintFamily ??
          task.blueprintFamily,
        variantId:
          geometryRecipe?.variantId ??
          brief?.variantId ??
          task.variantId,
        assemblyRootPartId:
          geometryRecipe?.assemblyRootPartId ??
          brief?.assemblyRootPartId ??
          task.assemblyRootPartId,
        attachmentPartId:
          geometryRecipe?.attachmentPartId ??
          brief?.attachmentPartId ??
          task.attachmentPartId,
        primarySilhouette:
          geometryRecipe?.primarySilhouette ??
          brief?.primarySilhouette ??
          task.primarySilhouette,
        nounDesignBriefId: brief?.briefId ?? task.nounDesignBriefId,
        partGraphId: partGraph?.graphId ?? geometryRecipe?.partGraphId,
        criticalParts: brief?.criticalParts ?? task.criticalParts,
        negativeLookalikes: brief?.negativeLookalikes ?? task.negativeLookalikes,
        readOrderTargets:
          geometryRecipe?.readOrderTargets ??
          brief?.readOrderTargets ??
          task.readOrderTargets,
        criticalViewGoals:
          geometryRecipe?.criticalViewGoals ??
          brief?.criticalViewGoals ??
          task.criticalViewGoals,
        compilerIntent:
          geometryRecipe?.compilerIntent ??
          brief?.compilerIntent ??
          task.compilerIntent,
        requestedAnchorPhrase: task.requestedAnchorPhrase,
        anchorResolutionSource: task.anchorResolutionSource,
        requestedColorText: task.requestedColorText,
        runtimeDesignTaskId: task.taskId,
        runtimeDesignSource: geometryRecipe?.runtimeDesignSource ?? task.runtimeDesignSource,
        geometryRecipeId: geometryRecipe?.recipeId,
        creationSource:
          execution.executionMode === "runtime-generated"
            ? "runtime-designed"
            : execution.creationSource,
      };
    }),
  };
}

function buildAccessoryCustomization(
  policy: PromptCustomizationAccessoryPolicy,
  requests: PromptCustomizationAccessoryRequest[],
  runtimeDesignTasks: PromptCustomizationRuntimeDesignTask[],
  nounDesignBriefs: PromptCustomizationNounDesignBrief[],
  partGraphs: PromptCustomizationAccessoryPartGraph[],
  geometryRecipes: PromptCustomizationGeometryRecipe[],
): PromptCustomizationAccessoryCustomization {
  return {
    policy,
    requests,
    runtimeDesignTasks,
    nounDesignBriefs,
    partGraphs,
    geometryRecipes,
  };
}

function detectAccessoryAnchorsFromSegment(
  segment: string,
  defaultAnchor: PromptCustomizationAccessoryAnchor,
) {
  if (
    hasKeyword(segment, ["左右耳", "双耳", "两耳", "耳朵两边", "两边耳朵"])
  ) {
    return ["left-ear", "right-ear"] as PromptCustomizationAccessoryAnchor[];
  }

  const anchors: PromptCustomizationAccessoryAnchor[] = [];

  if (hasKeyword(segment, ["左耳", "左耳旁", "左耳边", "左耳朵", "左侧耳边"])) {
    anchors.push("left-ear");
  }

  if (hasKeyword(segment, ["右耳", "右耳旁", "右耳边", "右耳朵", "右侧耳边"])) {
    anchors.push("right-ear");
  }

  if (hasKeyword(segment, ["头后面", "脑后", "后脑勺", "头后"])) {
    anchors.push("back-head");
  }

  if (hasKeyword(segment, ["头顶", "脑袋顶上", "head-top"])) {
    anchors.push("head-top");
  }

  if (hasKeyword(segment, ["额头", "头顶", "前额", "眉心", "forehead"])) {
    anchors.push("forehead");
  }

  if (hasKeyword(segment, ["左胸前", "左胸口", "左侧胸前"])) {
    anchors.push("chest-left");
  }

  if (hasKeyword(segment, ["右胸前", "右胸口", "右侧胸前"])) {
    anchors.push("chest-right");
  }

  if (hasKeyword(segment, ["胸前", "胸口", "领口", "脖子", "颈前", "胸针位"])) {
    anchors.push("chest-center");
  }

  if (hasKeyword(segment, ["尾巴上面", "尾巴顶部", "尾巴尖上", "tail-top"])) {
    anchors.push("tail-top");
  }

  if (hasKeyword(segment, ["尾巴左边", "尾巴左侧", "左侧尾巴"])) {
    anchors.push("tail-left");
  }

  if (hasKeyword(segment, ["尾巴右边", "尾巴右侧", "右侧尾巴"])) {
    anchors.push("tail-right");
  }

  if (hasKeyword(segment, ["尾巴根部", "尾巴底部", "尾巴基部", "tail-base"])) {
    anchors.push("tail-base");
  }

  return anchors.length > 0 ? anchors : [defaultAnchor];
}

function detectRequestedAnchorPhrase(
  segment: string,
  resolvedAnchor: PromptCustomizationAccessoryAnchor,
) {
  const anchorPhrasePatterns: Array<[RegExp, string]> = [
    [/(左右耳|双耳|两耳|耳朵两边|两边耳朵)/u, "左右耳"],
    [/(左耳旁|左耳边|左耳朵|左耳)/u, "左耳"],
    [/(右耳旁|右耳边|右耳朵|右耳)/u, "右耳"],
    [/(头后面|脑后|后脑勺|头后)/u, "头后面"],
    [/(头顶|脑袋顶上)/u, "头顶"],
    [/(额头|前额|眉心)/u, "额头"],
    [/(左胸前|左胸口|左侧胸前)/u, "左胸前"],
    [/(右胸前|右胸口|右侧胸前)/u, "右胸前"],
    [/(胸前|胸口|领口|脖子前面|脖子|颈前|胸针位)/u, "胸前"],
    [/(尾巴上面|尾巴顶部|尾巴尖上)/u, "尾巴上面"],
    [/(尾巴左边|尾巴左侧|左侧尾巴)/u, "尾巴左边"],
    [/(尾巴右边|尾巴右侧|右侧尾巴)/u, "尾巴右边"],
    [/(尾巴根部|尾巴底部|尾巴基部)/u, "尾巴根部"],
  ];

  for (const [pattern, label] of anchorPhrasePatterns) {
    if (pattern.test(segment)) {
      return label;
    }
  }

  return getAccessoryAnchorLabel(resolvedAnchor);
}

function detectAccessoryRepeatCount(
  segment: string,
  anchorCount: number,
) {
  if (anchorCount > 1) {
    return 1;
  }

  if (
    hasKeyword(segment, [
      "两个",
      "2个",
      "两枚",
      "两只",
      "一对",
      "两颗",
      "两串",
      "两个小",
    ])
  ) {
    return 2;
  }

  if (hasKeyword(segment, ["三个", "3个", "三枚", "三颗"])) {
    return 3;
  }

  return 1;
}

const genericDecorationKeywords = [
  "挂件",
  "挂饰",
  "装饰",
  "配饰",
  "饰物",
  "饰品",
  "徽记",
  "项链",
  "链子",
  "小项链",
  "挂链",
  "颈链",
  "耳环",
  "耳坠",
  "耳饰",
  "小耳环",
];

const genericAccessoryShapeKeywords = [
  "项链",
  "链子",
  "小项链",
  "挂链",
  "颈链",
  "耳环",
  "耳坠",
  "耳饰",
  "小耳环",
  "耳圈",
  "糖果",
  "甜点",
  "蛋糕",
  "草莓",
  "森林",
  "树",
  "松树",
  "树苗",
  "浆果",
  "叶片",
  "叶子",
  "树叶",
  "蘑菇",
  "星形",
  "星星",
  "五角星",
  "云朵",
  "云形",
  "云团",
  "花朵",
  "花形",
  "小花",
];

function hasAccessoryAnchorCue(segment: string) {
  return hasKeyword(segment, [
    "左右耳",
    "双耳",
    "两耳",
    "左耳",
    "右耳",
    "耳旁",
    "耳边",
    "耳侧",
    "耳朵旁边",
    "额头",
    "头顶",
    "前额",
    "眉心",
    "胸前",
    "胸口",
    "领口",
    "脖子",
    "颈前",
    "胸针位",
  ]);
}

function hasGenericDecorationCue(segment: string) {
  return hasKeyword(segment, genericDecorationKeywords);
}

function hasGenericAccessoryShapeCue(segment: string) {
  return hasKeyword(segment, genericAccessoryShapeKeywords);
}

function isThemeOnlyAccessorySegment(segment: string) {
  return (
    segment.includes("主题") &&
    !hasAccessoryAnchorCue(segment) &&
    !hasGenericDecorationCue(segment) &&
    !supportedAccessoryDirectives.some((directive) =>
      hasKeyword(segment, directive.keywords),
    ) &&
    !generatedAccessoryDirectives.some((directive) =>
      hasKeyword(segment, directive.keywords),
    )
  );
}

function isAccessoryColorOnlySegment(segment: string) {
  return (
    Boolean(findFlexibleColorPalette(segment)) &&
    hasGenericDecorationCue(segment) &&
    !hasAccessoryAnchorCue(segment) &&
    !hasGenericAccessoryShapeCue(segment) &&
    !supportedAccessoryDirectives.some((directive) =>
      hasKeyword(segment, directive.keywords),
    ) &&
    !generatedAccessoryDirectives.some((directive) =>
      hasKeyword(segment, directive.keywords),
    )
  );
}

function isNegatedGenericDecorationSegment(segment: string) {
  return (
    hasGenericDecorationCue(segment) &&
    (noAccessoryPhrases.some((phrase) => segment.includes(phrase)) ||
      findNegatedPhrase(segment, genericDecorationKeywords) !== null ||
      /(?:不要|不带|去掉|拿掉|取消|别带|别挂)[^，,。；;！？!?]{0,8}(?:其他|别的|任何)?[^，,。；;！？!?]{0,4}(?:装饰|配饰|挂件|挂饰|饰物|饰品|徽记)/u.test(
        segment,
      ))
  );
}

function buildAccessoryInstances(
  anchors: PromptCustomizationAccessoryAnchor[],
  repeatCount: number,
  colorIntent: PromptCustomizationColorOverride | undefined,
  requestIndex: number,
): PromptCustomizationAccessoryInstance[] {
  const instances: PromptCustomizationAccessoryInstance[] = [];
  const perAnchorOrdinals = new Map<PromptCustomizationAccessoryAnchor, number>();

  for (const anchor of anchors) {
    for (let repeat = 0; repeat < repeatCount; repeat += 1) {
      const nextOrdinal = (perAnchorOrdinals.get(anchor) ?? 0) + 1;
      perAnchorOrdinals.set(anchor, nextOrdinal);
      instances.push({
        instanceId: `acc-${requestIndex}-${anchor}-${nextOrdinal}`,
        anchor,
        ordinal: nextOrdinal,
        required: true,
        ...(colorIntent ? { colorIntent } : {}),
      });
    }
  }

  return instances;
}

function getSegmentAccessoryColorIntent(
  segment: string,
  fallback: PromptCustomizationColorOverride | undefined,
) {
  if (isNegatedColorSegment(segment)) {
    return fallback;
  }

  const flexibleColor =
    findScopedFlexibleColorPalette(segment, accessoryColorScopeKeywords) ??
    findFlexibleColorPalette(segment);

  if (!flexibleColor?.palette.accessoryColor) {
    return fallback;
  }

  return {
    ...flexibleColor.palette.accessoryColor,
    slot: "accessoryColor",
  } satisfies PromptCustomizationColorOverride;
}

function detectGenericAccessoryFamily(
  segment: string,
): PromptCustomizationGeneratedAccessoryKind | null {
  if (hasKeyword(segment, ["四叶草", "苜蓿", "clover"])) {
    return "clover-charm";
  }

  if (
    hasKeyword(segment, [
      "小鱼",
      "鱼形",
      "鱼挂",
      "鱼挂饰",
      "鱼挂件",
      "小鱼耳饰",
      "鱼形耳饰",
      "鱼耳饰",
      "fish",
    ])
  ) {
    return "fish-charm";
  }

  if (hasKeyword(segment, ["草莓挂", "草莓挂饰", "草莓挂件", "莓果挂", "莓果挂饰", "berry"])) {
    return "berry-charm";
  }

  if (hasKeyword(segment, ["糖果", "candy", "糖纸", "棒棒糖"])) {
    return "candy";
  }

  if (
    hasKeyword(segment, [
      "项链",
      "链子",
      "小项链",
      "挂链",
      "颈链",
      "颈圈",
      "necklace",
      "chain",
    ])
  ) {
    return "necklace-chain";
  }

  if (
    hasKeyword(segment, [
      "耳环",
      "耳坠",
      "耳饰",
      "小耳环",
      "耳圈",
      "earring",
      "hoop",
    ])
  ) {
    return "earring-hoop";
  }

  if (hasKeyword(segment, ["吊饰", "坠饰", "小吊饰", "pendant charm"])) {
    return "pendant-charm";
  }

  if (hasKeyword(segment, ["甜点挂", "甜点挂件", "奶油挂件", "草莓挂件"])) {
    return "dessert-hang";
  }

  if (hasKeyword(segment, ["甜点", "蛋糕"]) || /奶油(?!白|色|风|感|系|款)/u.test(segment)) {
    return "dessert";
  }

  if (hasKeyword(segment, ["云朵", "云形", "云团", "cloud"])) {
    return "cloud";
  }

  if (hasKeyword(segment, ["蜡烛", "烛台", "小蜡烛", "candle"])) {
    return "candle-charm";
  }

  if (hasKeyword(segment, ["钥匙", "小钥匙", "key"])) {
    return "key-charm";
  }

  if (hasKeyword(segment, ["羽毛", "羽饰", "feather"])) {
    return "feather-charm";
  }

  if (hasKeyword(segment, ["森林", "树", "松树", "树苗", "浆果"])) {
    return "forest";
  }

  if (hasKeyword(segment, ["叶片", "叶子", "树叶"])) {
    return "leaf";
  }

  if (hasKeyword(segment, ["蘑菇", "mushroom"])) {
    return "mushroom";
  }

  if (hasKeyword(segment, ["星形", "星星", "五角星"])) {
    return "star";
  }

  if (hasKeyword(segment, ["花朵", "花形", "小花"])) {
    return "flower";
  }

  if (
    hasKeyword(segment, [
      "花冠",
      "花簇",
      "花束",
      "花苞",
      "藤蔓",
      "草芽",
      "草穗",
      "植物",
      "花草",
      "叶簇",
    ])
  ) {
    return "open-botanical-ornament";
  }

  if (hasKeyword(segment, ["徽记", "徽记形", "图腾", "符号", "图案", "标记"])) {
    return "open-symbol-ornament";
  }

  if (hasKeyword(segment, ["动物", "海豚", "小鸟", "兔子"])) {
    return "generic-animal-charm";
  }

  if (hasKeyword(segment, ["食物", "水果", "糖豆", "布丁"])) {
    return "generic-food-charm";
  }

  if (hasKeyword(segment, ["挂件", "装饰", "配饰"])) {
    return "generic-ornament";
  }

  return null;
}

function getGeneratedFamilyDefaultAnchor(
  family: PromptCustomizationGeneratedAccessoryKind,
) {
  return (
    generatedAccessoryDirectives.find((directive) => directive.kind === family)
      ?.defaultAnchor ?? "chest-center"
  );
}

function isChestAccessoryAnchor(anchor: PromptCustomizationAccessoryAnchor) {
  return anchor === "chest" || anchor === "chest-center" || anchor === "chest-left" || anchor === "chest-right";
}

function isTailAccessoryAnchor(anchor: PromptCustomizationAccessoryAnchor) {
  return (
    anchor === "tail-top" ||
    anchor === "tail-left" ||
    anchor === "tail-right" ||
    anchor === "tail-base"
  );
}

function getStableOverlayAnchor(anchor: PromptCustomizationAccessoryAnchor) {
  if (
    anchor === "left-ear" ||
    anchor === "right-ear" ||
    anchor === "forehead" ||
    anchor === "chest-center" ||
    anchor === "chest"
  ) {
    return anchor === "chest" ? "chest-center" : anchor;
  }

  if (anchor === "head-top" || anchor === "back-head") {
    return "forehead";
  }

  if (anchor === "chest-left" || anchor === "chest-right") {
    return "chest-center";
  }

  return "chest-center";
}

function normalizeRequestedAnchor(
  anchor: PromptCustomizationAccessoryAnchor,
  customizationProfile: CustomizationProfile,
) {
  if (customizationProfile === "experimental-addon") {
    return {
      resolvedAnchor: anchor === "chest" ? ("chest-center" as const) : anchor,
      anchorResolutionSource: "explicit-match" as const,
    };
  }

  const stableAnchor = getStableOverlayAnchor(anchor);

  return {
    resolvedAnchor: stableAnchor,
    anchorResolutionSource:
      stableAnchor === anchor || (anchor === "chest" && stableAnchor === "chest-center")
        ? ("explicit-match" as const)
        : ("stable-fallback" as const),
  };
}

function detectGenericAccessoryLabel(
  segment: string,
  family: PromptCustomizationGeneratedAccessoryKind,
) {
  const familyLabels = {
    "necklace-chain": "小项链",
    "earring-hoop": "耳环",
    "pendant-charm": "吊坠挂件",
    "fish-charm": "小鱼挂饰",
    "berry-charm": "草莓挂饰",
    "clover-charm": "四叶草",
    candy: "糖果挂件",
    "dessert-hang": "甜点挂件",
    dessert: "甜点装饰",
    cloud: "云朵挂饰",
    "cloud-charm": "云朵挂饰",
    "candle-charm": "小蜡烛",
    "key-charm": "钥匙挂饰",
    "feather-charm": "羽毛挂饰",
    "open-botanical-ornament": "植物系挂件",
    "open-symbol-ornament": "图形挂件",
    forest: "森林形装饰",
    leaf: "叶片装饰",
    mushroom: "蘑菇装饰",
    star: "星形装饰",
    flower: "花朵装饰",
    "generic-animal-charm": "动物挂饰",
    "generic-food-charm": "食物挂饰",
    "generic-ornament": "装饰挂件",
    "charm-token": "装饰挂件",
    tie: "小领带",
    badge: "小徽章",
    bow: "蝴蝶结",
    pendant: "小吊坠",
  } as const satisfies Record<PromptCustomizationGeneratedAccessoryKind, string>;

  const shapeMatch = segment.match(
    /(?:左右耳|左耳|右耳|额头|头顶|头后面|胸前|胸口|脖子|颈前|尾巴上面|尾巴旁边|尾巴根部)?[^，,。；;！？!?]{0,10}?(四叶草|项链|链子|耳环|耳坠|耳饰|糖果|甜点|森林|叶片|叶子|蘑菇|星形|星星|花朵|云朵|云形|小鱼|鱼形|鱼|草莓|莓果|蜡烛|钥匙|羽毛)[^，,。；;！？!?]{0,8}(?:挂件|挂饰|装饰|配饰|项链|链子|耳环|耳坠|耳饰)?/u,
  );

  if (shapeMatch?.[1]) {
    if (shapeMatch[1].includes("四叶草")) {
      return "四叶草";
    }

    if (shapeMatch[1].includes("项链") || shapeMatch[1].includes("链子")) {
      return "小项链";
    }

    if (
      shapeMatch[1].includes("耳环") ||
      shapeMatch[1].includes("耳坠") ||
      shapeMatch[1].includes("耳饰")
    ) {
      return "耳环";
    }

    if (shapeMatch[1].includes("糖果")) {
      return "糖果挂件";
    }

    if (shapeMatch[1].includes("鱼")) {
      return "小鱼挂饰";
    }

    if (shapeMatch[1].includes("莓") || shapeMatch[1].includes("草莓")) {
      return "草莓挂饰";
    }

    if (shapeMatch[1].includes("甜点")) {
      return family === "dessert-hang" ? "甜点挂件" : "甜点装饰";
    }

    if (shapeMatch[1].includes("云")) {
      return "云朵挂饰";
    }

    if (shapeMatch[1].includes("蜡烛")) {
      return "小蜡烛";
    }

    if (shapeMatch[1].includes("森林")) {
      return "森林形装饰";
    }

    if (shapeMatch[1].includes("叶")) {
      return "叶片装饰";
    }

    if (shapeMatch[1].includes("蘑菇")) {
      return "蘑菇装饰";
    }

    if (shapeMatch[1].includes("星")) {
      return "星形装饰";
    }

    if (shapeMatch[1].includes("花")) {
      return "花朵装饰";
    }
  }

  return familyLabels[family];
}

function buildRequestedThemeLabel(
  normalizedPrompt: string,
  style: StyleTemplate,
) {
  const resolvedThemeSlot = detectFoxThemeSlot(normalizedPrompt, style);
  const hasExplicitThemeKeyword = openAiThemeSlotEnum.some((slot) =>
    themeKeywords[slot].some((keyword) => normalizedPrompt.includes(keyword)),
  );

  return hasExplicitThemeKeyword
    ? getFoxThemeLabel(resolvedThemeSlot)
    : `未显式指定主题，沿用 ${getFoxThemeLabel(resolvedThemeSlot)} 默认主题`;
}

function detectOpenRuntimeAccessoryFamilyFromLabel(label: string) {
  if (hasKeyword(label, ["四叶草", "苜蓿", "clover"])) {
    return "clover-charm" as const;
  }

  if (hasKeyword(label, ["蜡烛", "烛台", "candle"])) {
    return "candle-charm" as const;
  }

  if (hasKeyword(label, ["钥匙", "key"])) {
    return "key-charm" as const;
  }

  if (hasKeyword(label, ["羽毛", "羽饰", "feather"])) {
    return "feather-charm" as const;
  }

  if (hasKeyword(label, ["鱼", "小鱼", "fish"])) {
    return "fish-charm" as const;
  }

  if (hasKeyword(label, ["花", "草", "叶", "藤", "芽", "苔", "瓣", "羽毛"])) {
    return "open-botanical-ornament" as const;
  }

  if (hasKeyword(label, ["徽", "记", "符", "图", "纹", "标", "章"])) {
    return "open-symbol-ornament" as const;
  }

  return "generic-ornament" as const;
}

function normalizeRequestedNoun(label: string | null | undefined) {
  if (typeof label !== "string" || !label.trim()) {
    return undefined;
  }

  const normalized = sanitizeAccessoryRequestedLabel(label)
    .replace(/(?:挂件|挂饰|装饰|配饰|饰品|饰物)$/gu, "")
    .replace(/(?:形状|形)$/gu, "")
    .trim();

  return normalized || sanitizeAccessoryRequestedLabel(label) || undefined;
}

function isEarSideHardSurfaceReferenceEligible(
  recipe: Pick<PromptCustomizationRecipeCore, "mode" | "customizationProfile">,
  request: PromptCustomizationAccessoryRequest,
  designArchetype: PromptCustomizationDesignArchetype,
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
) {
  if (
    recipe.mode !== "dynamic-custom" ||
    recipe.customizationProfile !== "experimental-addon"
  ) {
    return false;
  }

  if (request.anchor !== "left-ear" && request.anchor !== "right-ear") {
    return false;
  }

  return (
    runtimeShapeClass === "camera-charm" ||
    runtimeShapeClass === "boat-charm" ||
    runtimeShapeClass === "rocket-charm" ||
    runtimeShapeClass === "device-generic-charm" ||
    runtimeShapeClass === "vehicle-generic-charm" ||
    designArchetype === "tool-charm"
  );
}

function buildReferenceAwareNegativeLookalikes(
  baseNegativeLookalikes: string[],
  referenceBlueprint?: PromptCustomizationReferenceDerivedBlueprint,
) {
  return uniqueStrings([
    ...baseNegativeLookalikes,
    ...(referenceBlueprint?.negativeLookalikes ?? []),
    ...(
      referenceBlueprint?.variantCandidates.flatMap(
        (variant) => variant.negativeLookalikes,
      ) ?? []
    ),
  ]);
}

function buildReferenceAwareStructuralBlueprint(
  structuralBlueprint: PromptCustomizationStructuralBlueprint,
  referenceBlueprint: PromptCustomizationReferenceDerivedBlueprint | undefined,
  sourceMode: PromptCustomizationReferenceSourceMode | undefined,
  referenceConfidence: number | undefined,
  blueprintFamily: PromptCustomizationCanonicalBlueprintFamily | undefined,
) {
  if (!referenceBlueprint && !blueprintFamily && !sourceMode) {
    return structuralBlueprint;
  }

  return {
    ...structuralBlueprint,
    sourceMode,
    referenceConfidence,
    referenceId: referenceBlueprint?.referenceId,
    referenceSourceKind: referenceBlueprint?.sourceKind,
    blueprintFamily,
    representationMode:
      referenceBlueprint?.representationMode ??
      structuralBlueprint.representationMode,
    familyPolicyId:
      referenceBlueprint?.familyPolicyId ?? structuralBlueprint.familyPolicyId,
    variantCandidates: referenceBlueprint?.variantCandidates,
    readOrderTargets:
      referenceBlueprint?.readOrderTargets ?? structuralBlueprint.readOrderTargets,
    partSpanTargets:
      referenceBlueprint?.partSpanTargets ?? structuralBlueprint.partSpanTargets,
    partDepthTargets:
      referenceBlueprint?.partDepthTargets ?? structuralBlueprint.partDepthTargets,
    attachmentAnchors:
      referenceBlueprint?.attachmentAnchors ?? structuralBlueprint.attachmentAnchors,
    silhouetteKeepouts:
      referenceBlueprint?.silhouetteKeepouts ?? structuralBlueprint.silhouetteKeepouts,
    dominantContour:
      referenceBlueprint?.dominantContour ?? structuralBlueprint.dominantContour,
    sideDepthProfile:
      referenceBlueprint?.sideDepthProfile ?? structuralBlueprint.sideDepthProfile,
    dominantSpanOwner:
      referenceBlueprint?.dominantSpanOwner ?? structuralBlueprint.dominantSpanOwner,
    outlineProfile:
      referenceBlueprint?.outlineProfile ?? structuralBlueprint.outlineProfile,
    reliefFeatureLayout:
      referenceBlueprint?.reliefFeatureLayout ?? structuralBlueprint.reliefFeatureLayout,
    attachmentMask:
      referenceBlueprint?.attachmentMask ?? structuralBlueprint.attachmentMask,
    profileVariantId:
      referenceBlueprint?.profileVariantId ?? structuralBlueprint.profileVariantId,
    readabilityMaterialPolicy:
      referenceBlueprint?.readabilityMaterialPolicy ??
      structuralBlueprint.readabilityMaterialPolicy,
    critiqueLightingProfile:
      referenceBlueprint?.critiqueLightingProfile ??
      structuralBlueprint.critiqueLightingProfile,
    deviceMinReadableSpan:
      referenceBlueprint?.deviceMinReadableSpan ??
      structuralBlueprint.deviceMinReadableSpan,
    boatMinReadableSpan:
      referenceBlueprint?.boatMinReadableSpan ??
      structuralBlueprint.boatMinReadableSpan,
    reliefFlushDepth:
      referenceBlueprint?.reliefFlushDepth ?? structuralBlueprint.reliefFlushDepth,
    attachmentCohesionBudget:
      referenceBlueprint?.attachmentCohesionBudget ??
      structuralBlueprint.attachmentCohesionBudget,
    outlineCompilerMode:
      referenceBlueprint?.outlineCompilerMode ??
      structuralBlueprint.outlineCompilerMode,
    outlineProjectionVariantId:
      referenceBlueprint?.outlineProjectionVariantId ??
      structuralBlueprint.outlineProjectionVariantId,
  };
}

function rebuildRuntimeTaskContract(
  task: PromptCustomizationRuntimeDesignTask,
): PromptCustomizationRuntimeDesignTask {
  const runtimeShapeClass = task.runtimeShapeClass ?? task.family;
  const normalizedFamily = normalizeAccessoryFamilyForRuntimeShapeClass(
    runtimeShapeClass,
    task.family,
  );
  const designArchetype = normalizeDesignArchetypeForRuntimeShapeClass(
    runtimeShapeClass,
    normalizedFamily,
    task.designArchetype,
  );
  const requestSeed = buildRuntimeTaskRequestSeed(task);
  const semanticClass = resolveRuntimeTaskSemanticClass({
    runtimeShapeClass,
    family: normalizedFamily,
    semanticClass: task.semanticClass,
  });
  const capabilityBundle = buildRuntimeCapabilityBundleForTask({
    ...task,
    family: normalizedFamily,
    runtimeShapeClass,
  });
  const runtimeDesignContract = resolveRuntimeDesignContract({
    capabilityBundle,
    requestedNoun: task.requestedNoun,
    anchor: task.anchor,
  });
  const criticalParts = buildRuntimeCriticalParts(
    requestSeed,
    semanticClass,
    designArchetype,
  );
  const optionalParts = buildRuntimeOptionalParts(
    requestSeed,
    semanticClass,
    designArchetype,
  );
  const shapeIntent = buildRuntimeShapeIntent(
    requestSeed,
    semanticClass,
    designArchetype,
  );
  const silhouetteGoals = buildRuntimeSilhouetteGoals(
    requestSeed,
    designArchetype,
  );
  const repairPriorities = buildRuntimeRepairPriorities(designArchetype);
  const hangingStrategy = buildRuntimeHangingStrategy(
    requestSeed,
    designArchetype,
  );
  const partGraphIntent = buildRuntimePartGraphIntent(
    requestSeed,
    criticalParts,
    optionalParts,
  );
  const assemblyRootPartId = inferAssemblyRootPartId(
    runtimeShapeClass,
    criticalParts,
  );
  const attachmentPartId = inferAttachmentPartId(
    runtimeShapeClass,
    criticalParts,
    optionalParts,
  );
  const structuralBlueprint = buildReferenceAwareStructuralBlueprint(
    buildRuntimeStructuralBlueprint(
      {
        requestId: task.requestId,
        requestedNoun: task.requestedNoun,
        designArchetype,
        runtimeShapeClass,
        anchor: task.anchor,
        capabilityBundle,
        runtimeDesignContract,
      },
      criticalParts,
      optionalParts,
      assemblyRootPartId,
      attachmentPartId,
    ),
    task.referenceDerivedBlueprint ?? task.canonicalBlueprint,
    task.sourceMode,
    task.referenceConfidence,
    task.referenceDerivedBlueprint?.blueprintFamily ??
      task.blueprintFamily ??
      getBlueprintFamilyFallback(runtimeShapeClass, task.objectCategory),
  );
  const negativeLookalikes = buildReferenceAwareNegativeLookalikes(
    uniqueStrings([
      ...(task.negativeLookalikes ?? []),
      ...buildRuntimeNegativeLookalikes(requestSeed, designArchetype),
    ]),
    task.referenceDerivedBlueprint ?? task.canonicalBlueprint,
  );

  return {
    ...task,
    family: normalizedFamily,
    designArchetype,
    runtimeShapeClass,
    semanticClass,
    blueprintFamily:
      structuralBlueprint.blueprintFamily ??
      task.referenceDerivedBlueprint?.blueprintFamily ??
      task.blueprintFamily,
    representationMode:
      structuralBlueprint.representationMode ?? task.representationMode,
    familyPolicyId:
      structuralBlueprint.familyPolicyId ?? task.familyPolicyId,
    capabilityBundle,
    runtimeDesignContract,
    shapeIntent,
    criticalParts,
    optionalParts,
    partGraphIntent,
    silhouetteGoals,
    negativeLookalikes,
    repairPriorities,
    hangingStrategy,
    assemblyRootPartId,
    attachmentPartId,
    silhouetteBlocks: structuralBlueprint.silhouetteBlocks,
    assemblySegments: structuralBlueprint.assemblySegments,
    mountStrategy: structuralBlueprint.mountStrategy,
    readOrderTargets: structuralBlueprint.readOrderTargets,
    criticalViewGoals: structuralBlueprint.criticalViewGoals,
    compilerIntent: buildCompilerIntent(structuralBlueprint),
    structuralBlueprint,
    primarySilhouette: structuralBlueprint.primarySilhouette,
    outlineProfile: structuralBlueprint.outlineProfile,
    reliefFeatureLayout: structuralBlueprint.reliefFeatureLayout,
    attachmentMask: structuralBlueprint.attachmentMask,
    profileVariantId: structuralBlueprint.profileVariantId,
    partProfiles: structuralBlueprint.partProfiles,
    attachmentRules: structuralBlueprint.attachmentRules,
    partImportanceWeights: structuralBlueprint.partImportanceWeights,
    symmetryPolicy: structuralBlueprint.symmetryPolicy,
    deformationPolicy: structuralBlueprint.deformationPolicy,
    shapeDescription: buildRuntimeDesignDescription(
      requestSeed,
      shapeIntent,
      criticalParts,
    ),
    silhouetteHints: silhouetteGoals,
  };
}

function buildReferenceResolutionFromRetrievalMatches(
  retrievalMatches: PromptSemanticContractV2["retrievalMatches"],
  requestedNoun: string | undefined,
): {
  sourceMode?: PromptCustomizationReferenceSourceMode;
  referenceConfidence?: number;
  referencePack?: PromptCustomizationReferencePack;
  canonicalBlueprint?: PromptCustomizationReferenceDerivedBlueprint;
} | null {
  for (const match of retrievalMatches ?? []) {
    for (const referenceId of match.referenceIds) {
      const hardSurfaceReferenceAsset = resolveHardSurfaceReferenceAssetById(referenceId);

      if (hardSurfaceReferenceAsset) {
        const canonicalBlueprint = buildReferenceDerivedBlueprint(
          hardSurfaceReferenceAsset,
          requestedNoun ?? referenceId,
        );

        return {
          sourceMode: "cached-reference",
          referenceConfidence: hardSurfaceReferenceAsset.referenceConfidence,
          referencePack: {
            sourceMode: "cached-reference",
            referenceId: canonicalBlueprint.referenceId,
            referenceSourceKind: canonicalBlueprint.sourceKind,
            blueprintFamily: canonicalBlueprint.blueprintFamily,
            variantCandidates: canonicalBlueprint.variantCandidates,
            referenceConfidence: hardSurfaceReferenceAsset.referenceConfidence,
          },
          canonicalBlueprint,
        };
      }

      const canonicalBlueprintMatch = resolveCanonicalBlueprintByReferenceId(
        referenceId,
        requestedNoun ?? referenceId,
      );

      if (canonicalBlueprintMatch) {
        return {
          sourceMode: canonicalBlueprintMatch.sourceMode,
          referenceConfidence: canonicalBlueprintMatch.referenceConfidence,
          referencePack: {
            sourceMode: canonicalBlueprintMatch.sourceMode,
            referenceId: canonicalBlueprintMatch.blueprint.referenceId,
            referenceSourceKind: canonicalBlueprintMatch.blueprint.sourceKind,
            blueprintFamily: canonicalBlueprintMatch.blueprint.blueprintFamily,
            variantCandidates: canonicalBlueprintMatch.blueprint.variantCandidates,
            referenceConfidence: canonicalBlueprintMatch.referenceConfidence,
          },
          canonicalBlueprint: canonicalBlueprintMatch.blueprint,
        };
      }
    }
  }

  return null;
}

function shouldHydrateReferenceFromSemanticRetrieval(
  task: PromptCustomizationRuntimeDesignTask,
  runtimeRoutingPromotion: Pick<
    PromptCustomizationRuntimeDesignTask,
    "designArchetype" | "runtimeShapeClass" | "objectCategory"
  > | null = null,
) {
  const shouldRefreshPromotedPrototypeReference = (() => {
    if (!runtimeRoutingPromotion) {
      return false;
    }

    const primaryPrototypeId = getPrimaryPrototypeId(task);
    const descriptor = primaryPrototypeId
      ? getPrototypeDescriptor(primaryPrototypeId)
      : null;
    const preferredReferenceIds = descriptor?.referenceIds.filter(
      (referenceId): referenceId is string =>
        typeof referenceId === "string" && referenceId.trim().length > 0,
    );

    if (!preferredReferenceIds || preferredReferenceIds.length === 0) {
      return false;
    }

    const currentReferenceId =
      typeof task.referenceId === "string" ? task.referenceId.trim() : "";

    return !currentReferenceId || !preferredReferenceIds.includes(currentReferenceId);
  })();

  return (
    !task.referenceId ||
    !task.sourceMode ||
    task.sourceMode === "legacy-fallback" ||
    task.referencePack?.sourceMode === "legacy-fallback" ||
    shouldRefreshPromotedPrototypeReference
  );
}

function resolvePrototypePromotedDesignArchetype(
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass,
  objectCategory: PromptCustomizationObjectCategory,
): PromptCustomizationDesignArchetype {
  const normalizedFamily = normalizeAccessoryFamilyForRuntimeShapeClass(
    runtimeShapeClass,
    "generic-ornament",
  );

  if (normalizedFamily === runtimeShapeClass && isSpecificKnownAccessoryFamily(normalizedFamily)) {
    return "known-family";
  }

  if (runtimeShapeClass === "camera-charm") {
    return "device-charm";
  }

  if (
    runtimeShapeClass === "boat-charm" ||
    runtimeShapeClass === "rocket-charm" ||
    runtimeShapeClass === "vehicle-generic-charm"
  ) {
    return "vehicle-charm";
  }

  if (runtimeShapeClass === "device-generic-charm") {
    return objectCategory === "tool" ? "tool-charm" : "device-charm";
  }

  if (runtimeShapeClass === "badge") {
    return "symbol-charm";
  }

  switch (objectCategory) {
    case "device":
      return "device-charm";
    case "vehicle":
      return "vehicle-charm";
    case "tool":
      return "tool-charm";
    case "botanical":
      return "botanical-charm";
    case "symbol":
      return "symbol-charm";
    case "creature":
      return "creature-charm";
    case "food":
      return "food-charm";
    default:
      return "generic-ornament";
  }
}

function shouldPromoteRuntimeTaskFromPrototype(
  task: PromptCustomizationRuntimeDesignTask,
) {
  return (
    task.designArchetype !== "known-family" &&
    (
      task.runtimeShapeClass === "generic-ornament" ||
      task.runtimeShapeClass === "open-symbol-ornament" ||
      task.runtimeShapeClass === "open-botanical-ornament" ||
      task.runtimeShapeClass === "generic-animal-charm" ||
      task.runtimeShapeClass === "generic-food-charm"
    )
  );
}

function shouldOverrideKnownFamilyWithPrototype(
  task: PromptCustomizationRuntimeDesignTask,
  semanticContract: PromptSemanticContractV2,
  primaryPrototypeId: string,
  promotedRuntimeShapeClass: PromptCustomizationRuntimeShapeClass,
  objectCategory: PromptCustomizationObjectCategory,
) {
  if (task.designArchetype !== "known-family") {
    return false;
  }

  if (!runtimeAccessoryFamilies.has(task.family) || stableAccessoryFamilies.has(task.family)) {
    return false;
  }

  if (task.runtimeShapeClass === promotedRuntimeShapeClass) {
    return false;
  }

  return Boolean(
    semanticContract.retrievalMatches?.some(
      (match) =>
        match.prototypeId === primaryPrototypeId &&
        match.objectCategory === objectCategory &&
        match.score >= 0.85,
    ),
  );
}

function resolvePrototypeRuntimeRoutingPromotion(
  task: PromptCustomizationRuntimeDesignTask,
  semanticContract: PromptSemanticContractV2,
) {
  const primaryPrototypeId = semanticContract.prototypeCandidates.find(
    (candidate) => typeof candidate.id === "string" && candidate.id.trim(),
  )?.id;

  if (!primaryPrototypeId) {
    return null;
  }

  const descriptor = getPrototypeDescriptor(primaryPrototypeId);

  if (!descriptor || !Array.isArray(descriptor.runtimeShapeClasses)) {
    return null;
  }

  const promotedRuntimeShapeClass = descriptor.runtimeShapeClasses.find(
    (candidate): candidate is PromptCustomizationRuntimeShapeClass =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );

  if (!promotedRuntimeShapeClass) {
    return null;
  }

  if (
    !shouldPromoteRuntimeTaskFromPrototype(task) &&
    !shouldOverrideKnownFamilyWithPrototype(
      task,
      semanticContract,
      primaryPrototypeId,
      promotedRuntimeShapeClass,
      descriptor.objectCategory,
    )
  ) {
    return null;
  }

  return {
    designArchetype: resolvePrototypePromotedDesignArchetype(
      promotedRuntimeShapeClass,
      descriptor.objectCategory,
    ),
    runtimeShapeClass: promotedRuntimeShapeClass,
    objectCategory: descriptor.objectCategory,
  } satisfies Pick<
    PromptCustomizationRuntimeDesignTask,
    "designArchetype" | "runtimeShapeClass" | "objectCategory"
  >;
}

function shouldPromoteReferenceBackedRuntimeDesignSource(
  task: PromptCustomizationRuntimeDesignTask,
) {
  if (task.runtimeDesignSource !== "rule-compiler") {
    return false;
  }

  if (!isSpecificRuntimeShapeClass(task.runtimeShapeClass)) {
    return false;
  }

  const sourceMode =
    task.sourceMode ??
    task.referencePack?.sourceMode;
  const isReferenceBacked =
    sourceMode === "cached-reference" || sourceMode === "canonical-blueprint";

  if (!isReferenceBacked) {
    return false;
  }

  return Boolean(
    task.referenceDerivedBlueprint ||
      task.canonicalBlueprint ||
      (typeof task.referenceId === "string" && task.referenceId.trim()),
  );
}

function promoteReferenceBackedRuntimeDesignSource(
  task: PromptCustomizationRuntimeDesignTask,
): PromptCustomizationRuntimeDesignTask {
  return shouldPromoteReferenceBackedRuntimeDesignSource(task)
    ? {
        ...task,
        runtimeDesignSource: "hybrid",
      }
    : task;
}

function hydrateRuntimeTaskFromSemanticContract(
  task: PromptCustomizationRuntimeDesignTask,
  semanticContract: PromptSemanticContractV2,
) {
  const baseTask = {
    ...task,
    prototypeCandidates: semanticContract.prototypeCandidates,
    traits: semanticContract.traits,
    negativeLookalikes: uniqueStrings([
      ...semanticContract.negativeLookalikes,
      ...task.negativeLookalikes,
    ]),
    retrievalMatches: semanticContract.retrievalMatches,
  };
  const runtimeRoutingPromotion = resolvePrototypeRuntimeRoutingPromotion(
    baseTask,
    semanticContract,
  );
  const promotedTask = promoteReferenceBackedRuntimeDesignSource(
    rebuildRuntimeTaskContract(
      runtimeRoutingPromotion
        ? {
            ...baseTask,
            ...runtimeRoutingPromotion,
          }
        : baseTask,
    ),
  );

  if (!shouldHydrateReferenceFromSemanticRetrieval(promotedTask, runtimeRoutingPromotion)) {
    return promotedTask;
  }

  const retrievalResolution = buildReferenceResolutionFromRetrievalMatches(
    semanticContract.retrievalMatches,
    promotedTask.requestedNoun ?? semanticContract.requestedNoun,
  );

  if (!retrievalResolution) {
    return promotedTask;
  }

  const referenceDerivedBlueprint = retrievalResolution.canonicalBlueprint;
  const blueprintFamily =
    referenceDerivedBlueprint?.blueprintFamily ??
    promotedTask.blueprintFamily ??
    getBlueprintFamilyFallback(
      promotedTask.runtimeShapeClass,
      promotedTask.objectCategory,
    );
  const structuralBlueprint = promotedTask.structuralBlueprint
    ? buildReferenceAwareStructuralBlueprint(
        promotedTask.structuralBlueprint,
        referenceDerivedBlueprint,
        retrievalResolution.sourceMode,
        retrievalResolution.referenceConfidence,
        blueprintFamily,
      )
    : baseTask.structuralBlueprint;
  const compilerIntent = structuralBlueprint
    ? buildCompilerIntent(structuralBlueprint)
    : promotedTask.compilerIntent;
  const retrievalReferenceId =
    referenceDerivedBlueprint?.referenceId ??
    retrievalResolution.referencePack?.referenceId;

  return promoteReferenceBackedRuntimeDesignSource(
    rebuildRuntimeTaskContract({
      ...promotedTask,
      sourceMode: retrievalResolution.sourceMode ?? promotedTask.sourceMode,
      referenceConfidence:
        retrievalResolution.referenceConfidence ?? promotedTask.referenceConfidence,
      referencePack: retrievalResolution.referencePack ?? promotedTask.referencePack,
      referenceId: referenceDerivedBlueprint?.referenceId ?? promotedTask.referenceId,
      referenceSourceKind:
        referenceDerivedBlueprint?.sourceKind ?? promotedTask.referenceSourceKind,
      blueprintFamily,
      representationMode:
        structuralBlueprint?.representationMode ??
        referenceDerivedBlueprint?.representationMode ??
        promotedTask.representationMode,
      familyPolicyId:
        structuralBlueprint?.familyPolicyId ??
        referenceDerivedBlueprint?.familyPolicyId ??
        baseTask.familyPolicyId,
      variantCandidates:
        referenceDerivedBlueprint?.variantCandidates ?? baseTask.variantCandidates,
      variantId:
        referenceDerivedBlueprint?.variantCandidates[0]?.variantId ?? baseTask.variantId,
      canonicalBlueprint: referenceDerivedBlueprint ?? baseTask.canonicalBlueprint,
      referenceDerivedBlueprint:
        referenceDerivedBlueprint ?? baseTask.referenceDerivedBlueprint,
      structuralBlueprint,
      compilerIntent,
      designNotes: uniqueStrings([
        ...baseTask.designNotes,
        retrievalReferenceId
          ? `语义检索命中 ${retrievalReferenceId}，当前优先按 retrieval reference 补齐 planner reference pack。`
          : undefined,
      ]),
      runtimeDesignSource:
        baseTask.runtimeDesignSource === "rule-compiler"
          ? "hybrid"
          : baseTask.runtimeDesignSource,
    }),
  );
}

function buildExplicitAccessoryRequestedLabel(
  segment: string,
  requestedNoun: string | undefined,
  genericFamily: PromptCustomizationGeneratedAccessoryKind | null,
) {
  if (!requestedNoun) {
    return null;
  }

  if (genericFamily && genericFamily !== "generic-ornament") {
    return detectGenericAccessoryLabel(segment, genericFamily);
  }

  const sanitizedSegment = sanitizeAccessoryRequestedLabel(segment);
  const escapedRequestedNoun = requestedNoun.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const suffixMatch = sanitizedSegment.match(
    new RegExp(
      `${escapedRequestedNoun}(?:形状|形)?(挂件|挂饰|装饰|配饰|饰品|饰物)`,
      "u",
    ),
  );

  if (suffixMatch?.[1]) {
    return `${requestedNoun}${suffixMatch[1]}`;
  }

  return requestedNoun;
}

function resolveAccessoryFamilyGuess(
  requestedNoun: string | undefined,
  genericFamily: PromptCustomizationAccessoryFamily | null,
): {
  family: PromptCustomizationAccessoryFamily;
  familyResolutionSource: PromptCustomizationFamilyResolutionSource;
} {
  if (genericFamily && genericFamily !== "generic-ornament") {
    return {
      family: genericFamily,
      familyResolutionSource: "known-family",
    };
  }

  if (requestedNoun) {
    return {
      family: detectOpenRuntimeAccessoryFamilyFromLabel(requestedNoun),
      familyResolutionSource: "open-noun",
    };
  }

  if (genericFamily) {
    return {
      family: genericFamily,
      familyResolutionSource: "suffix-fallback",
    };
  }

  return {
    family: "generic-ornament",
    familyResolutionSource: "suffix-fallback",
  };
}

function sanitizeAccessoryRequestedLabel(label: string) {
  return label
    .replace(
      /^(?:其中|同时|还有|再|要|想要|希望|做成|做个|做一只|做一只小狐狸桌宠|做一只小狐狸|做个小狐狸|做(?=\s)|小狐狸桌宠|狐狸桌宠|狐狸|桌宠|耳边|耳旁|旁边|边上|这边|那边|有个|有一|有|挂着|戴着|带着|配着|系着|挂一个|挂上一个|放一个|加一个|来一个|做一个|搞一个|弄一个|配一个|戴一个|除了|是)+/gu,
      "",
    )
    .replace(/^(?:一个|一枚|一只|一朵|一团|一串|一把|个|枚|只|朵|团|串|把)\s*/gu, "")
    .replace(/^(?:的)+/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function extractOpenRuntimeAccessoryLabel(segment: string) {
  const explicitShape = detectGenericAccessoryLabel(segment, "generic-ornament");

  if (explicitShape !== "装饰挂件") {
    return explicitShape;
  }

  let candidate = segment
    .replace(
      /(左右耳|左耳|右耳|额头|头顶|头后面|后脑勺|脑后|胸前|胸口|脖子前面|脖子|颈前|左胸前|右胸前|尾巴上面|尾巴顶部|尾巴旁边|尾巴边上|尾巴根部|尾巴底部)/gu,
      " ",
    )
    .replace(
      /(挂一个|挂上一个|搭上一个|放一个|加一个|来一个|做一个|有一个|搞一个|弄一个|别一个|戴一个|配一个)/gu,
      " ",
    )
    .replace(/(挂着|带着|戴着|配着|系着)/gu, " ")
    .replace(/(一个|一枚|一只|一朵|一团|一串|一把|一个小|一枚小)/gu, " ")
    .replace(/(挂件|挂饰|装饰|配饰|饰品|饰物|耳饰|耳环|耳坠)/gu, " ")
    .replace(/的/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  const detectedColor = extractColorLikeText(candidate);
  if (detectedColor) {
    candidate = candidate.replace(detectedColor, "").replace(/\s+/gu, " ").trim();
  }

  candidate = sanitizeAccessoryRequestedLabel(
    candidate
      .replace(/^(?:小狐狸|狐狸|桌宠|其中|同时|还有|再|要|有|放|挂|搭上|搭着)/gu, "")
      .trim(),
  );

  return candidate || null;
}

function buildPaletteIntent(
  themeLabel: string,
  colorOverrides: Partial<
    Record<PromptCustomizationColorSlot, PromptCustomizationColorOverride>
  >,
) {
  const bodyPaletteIntent = uniqueStrings([
    colorOverrides.bodyColor
      ? `主体：${colorOverrides.bodyColor.label}`
      : `主体沿用 ${themeLabel} 默认配色`,
    colorOverrides.detailColor
      ? `细节：${colorOverrides.detailColor.label}`
      : null,
    colorOverrides.accentColor
      ? `强调：${colorOverrides.accentColor.label}`
      : null,
  ]);

  const detailPaletteIntent = uniqueStrings([
    colorOverrides.accessoryColor
      ? `配件：${colorOverrides.accessoryColor.label}`
      : "配件沿用主题默认色",
    colorOverrides.glowColor
      ? `发光：${colorOverrides.glowColor.label}`
      : null,
  ]);

  return {
    bodyPaletteIntent,
    detailPaletteIntent,
  };
}

function buildParsedIntentFromPrompt(
  normalizedPrompt: string,
): PromptCustomizationParsedIntent {
  const segments = splitPromptIntoSegments(normalizedPrompt);

  return {
    segments,
    themeHints: uniqueStrings(
      Object.entries(themeKeywords).flatMap(([, keywords]) =>
        keywords.filter((keyword) => normalizedPrompt.includes(keyword)),
      ),
    ),
    colorHints: uniqueStrings(
      segments.map((segment) => extractColorLikeText(segment) ?? undefined),
    ),
    accessoryHints: uniqueStrings(
      [
        ...supportedAccessoryDirectives.flatMap((directive) =>
          directive.keywords.filter((keyword) => normalizedPrompt.includes(keyword)),
        ),
        ...generatedAccessoryDirectives.flatMap((directive) =>
          directive.keywords.filter((keyword) => normalizedPrompt.includes(keyword)),
        ),
      ],
    ),
    negationHints: uniqueStrings(
      [
        ...noAccessoryPhrases.filter((phrase) => normalizedPrompt.includes(phrase)),
        ...segments.filter((segment) =>
          negationPrefixes.some((prefix) => segment.includes(prefix)),
        ),
      ],
    ),
  };
}

function buildEmptyParsedIntent(): PromptCustomizationParsedIntent {
  return {
    segments: [],
    themeHints: [],
    colorHints: [],
    accessoryHints: [],
    negationHints: [],
  };
}

function buildNormalizedSemanticRecipeFromRecipe(
  recipe: Pick<
    PromptCustomizationRecipeDraft,
    "requestedTheme" | "resolvedTheme" | "bodyPaletteIntent" | "detailPaletteIntent"
  >,
  accessoryPolicy: PromptCustomizationAccessoryPolicy,
  accessoryRequests: PromptCustomizationAccessoryRequest[],
): PromptCustomizationNormalizedSemanticRecipe {
  return {
    requestedTheme: recipe.requestedTheme,
    resolvedTheme: recipe.resolvedTheme,
    bodyPaletteIntent: recipe.bodyPaletteIntent,
    detailPaletteIntent: recipe.detailPaletteIntent,
    accessoryPolicy,
    accessoryRequests,
  };
}

function detectAccessoryOperation(
  normalizedPrompt: string,
  themeSlot: string,
  generationMode: GenerationMode,
) {
  const defaultAccessoryKey = getFoxThemeDefaultAccessory(themeSlot as never);
  const defaultAccessoryLabel = getFoxAccessoryLabel(defaultAccessoryKey as never);
  const wantsNoAccessory = noAccessoryPhrases.some((phrase) =>
    normalizedPrompt.includes(phrase),
  );

  const matchedSupported = supportedAccessoryDirectives.find((directive) => {
    const negated = findNegatedPhrase(normalizedPrompt, directive.keywords);

    return !negated && hasKeyword(normalizedPrompt, directive.keywords);
  });

  if (matchedSupported) {
    if (matchedSupported.accessoryKey === defaultAccessoryKey) {
      return {
        operation: {
          type: "keep-default",
          label: matchedSupported.label,
          accessoryKey: matchedSupported.accessoryKey,
        } satisfies PromptCustomizationAccessoryOperation,
      };
    }

    return {
      operation: {
        type: "replace-with-supported",
        label: matchedSupported.label,
        accessoryKey: matchedSupported.accessoryKey,
        sourceText: matchedSupported.label,
      } satisfies PromptCustomizationAccessoryOperation,
    };
  }

  const matchedGenerated = generatedAccessoryDirectives.find((directive) => {
    const negated = findNegatedPhrase(normalizedPrompt, directive.keywords);

    return !negated && hasKeyword(normalizedPrompt, directive.keywords);
  });

  if (matchedGenerated) {
    const resolvedAnchor = resolveAccessoryAnchor(
      normalizedPrompt,
      matchedGenerated.defaultAnchor,
    );
    const fallbackAccessory = getGeneratedAccessoryFallback(
      matchedGenerated.kind,
      resolvedAnchor,
    );

    if (generationMode === "dynamic-custom") {
      return {
        operation: {
          type: "generate-simple-accessory",
          label: matchedGenerated.label,
          accessoryKey: fallbackAccessory.accessoryKey,
          sourceText: matchedGenerated.label,
        } satisfies PromptCustomizationAccessoryOperation,
        generatedAccessory: {
          kind: matchedGenerated.kind,
          label: matchedGenerated.label,
          anchor: resolvedAnchor,
          sourceText: matchedGenerated.label,
        } satisfies PromptCustomizationGeneratedAccessory,
      };
    }

    return {
      operation: {
        type: "replace-with-supported",
        label: fallbackAccessory.label,
        accessoryKey: fallbackAccessory.accessoryKey,
        sourceText: matchedGenerated.label,
      } satisfies PromptCustomizationAccessoryOperation,
    };
  }

  const defaultDirective = supportedAccessoryDirectives.find(
    (directive) => directive.accessoryKey === defaultAccessoryKey,
  );
  const defaultNegation = defaultDirective
    ? findNegatedPhrase(normalizedPrompt, defaultDirective.keywords)
    : null;

  if (wantsNoAccessory || defaultNegation) {
    return {
      operation: {
        type: "remove-default",
        label: "无配饰",
        accessoryKey: defaultAccessoryKey,
        targetLabel: defaultAccessoryLabel,
        sourceText: defaultNegation ?? "无配饰",
      } satisfies PromptCustomizationAccessoryOperation,
    };
  }

  return {
    operation: {
      type: "keep-default",
      label: defaultAccessoryLabel,
      accessoryKey: defaultAccessoryKey,
    } satisfies PromptCustomizationAccessoryOperation,
  };
}

function hasExplicitAccessoryKeyword(normalizedPrompt: string) {
  return hasKeyword(
    normalizedPrompt,
    supportedAccessoryDirectives.flatMap((directive) => directive.keywords),
  );
}

function detectGenericAccessoryFallback(normalizedPrompt: string, themeSlot: string) {
  const mentionsGenericDecoration = hasKeyword(normalizedPrompt, [
    "装饰",
    "小装饰",
    "装饰物",
    "装饰件",
  ]);
  const mentionsEarSidePlacement = hasKeyword(normalizedPrompt, [
    "左耳",
    "右耳",
    "耳旁",
    "耳边",
    "耳侧",
    "耳朵旁边",
  ]);

  if (
    !mentionsGenericDecoration ||
    !mentionsEarSidePlacement ||
    hasExplicitAccessoryKeyword(normalizedPrompt)
  ) {
    return null;
  }

  const defaultAccessoryKey = getFoxThemeDefaultAccessory(themeSlot as never);

  if (defaultAccessoryKey === "accessoryFlower") {
    return {
      operation: {
        type: "keep-default",
        label: "耳边小花",
        accessoryKey: "accessoryFlower",
      } satisfies PromptCustomizationAccessoryOperation,
    };
  }

  return {
    operation: {
      type: "replace-with-supported",
      label: "耳边小花",
      accessoryKey: "accessoryFlower",
      sourceText: "耳旁装饰",
    } satisfies PromptCustomizationAccessoryOperation,
  };
}

function collectExplicitAccessoryRequests(
  normalizedPrompt: string,
  recipe: PromptCustomizationRecipeDraft,
) {
  const segments = splitPromptIntoSegments(normalizedPrompt);
  const requests: PromptCustomizationAccessoryRequest[] = [];
  const seenKeys = new Set<string>();
  let requestIndex = 0;

  for (const segment of segments) {
    if (
      noAccessoryPhrases.some((phrase) => segment.includes(phrase)) &&
      !segment.includes("除了")
    ) {
      continue;
    }

    const stableDirective = supportedAccessoryDirectives.find((directive) => {
      const negated = findNegatedPhrase(segment, directive.keywords);
      return !negated && hasKeyword(segment, directive.keywords);
    });
    const generatedDirective = generatedAccessoryDirectives.find((directive) => {
      const negated = findNegatedPhrase(segment, directive.keywords);
      return !negated && hasKeyword(segment, directive.keywords);
    });
    const genericFamily = detectGenericAccessoryFamily(segment);
    const openRuntimeLabel = extractOpenRuntimeAccessoryLabel(segment);
    const literalLabel =
      openRuntimeLabel ??
      (genericFamily ? detectGenericAccessoryLabel(segment, genericFamily) : null);
    const requestedNoun = normalizeRequestedNoun(literalLabel);

    if (
      isThemeOnlyAccessorySegment(segment) ||
      isAccessoryColorOnlySegment(segment) ||
      isNegatedGenericDecorationSegment(segment)
    ) {
      continue;
    }

    if (
      !stableDirective &&
      !generatedDirective &&
      !hasKeyword(segment, accessoryColorScopeKeywords) &&
      !hasGenericDecorationCue(segment) &&
      !hasAccessoryAnchorCue(segment)
    ) {
      continue;
    }

    const segmentColorIntent = getSegmentAccessoryColorIntent(
      segment,
      recipe.colorOverrides.accessoryColor,
    );
    const isExceptionSegment = segment.includes("除了");

    const requestCandidate = (() => {
      if (stableDirective) {
        return {
          family: stableDirective.family,
          label: stableDirective.label,
          shapeLabel: stableDirective.label,
          defaultAnchor: stableDirective.defaultAnchor,
          sourceText: stableDirective.label,
          requestedNoun: normalizeRequestedNoun(stableDirective.label),
          familyGuess: stableDirective.family,
          familyResolutionSource: "known-family" as const,
        } as const;
      }

      if (generatedDirective) {
        return {
          family: generatedDirective.kind,
          label: generatedDirective.label,
          shapeLabel: generatedDirective.label,
          defaultAnchor: generatedDirective.defaultAnchor,
          sourceText: generatedDirective.label,
          requestedNoun: normalizeRequestedNoun(generatedDirective.label),
          familyGuess: generatedDirective.kind,
          familyResolutionSource: "known-family" as const,
        } as const;
      }

      if (requestedNoun) {
        const resolvedFamily = resolveAccessoryFamilyGuess(requestedNoun, genericFamily);
        const explicitLabel =
          buildExplicitAccessoryRequestedLabel(
            segment,
            requestedNoun,
            genericFamily,
          ) ?? requestedNoun;

        return {
          family: resolvedFamily.family,
          label: explicitLabel,
          shapeLabel: explicitLabel,
          defaultAnchor:
            detectAccessoryAnchorsFromSegment(
              segment,
              genericFamily ? getDefaultAnchorForAccessoryFamily(genericFamily) : "chest-center",
            )[0] ?? "chest-center",
          sourceText: explicitLabel,
          requestedNoun,
          familyGuess: resolvedFamily.family,
          familyResolutionSource: resolvedFamily.familyResolutionSource,
        } as const;
      }

      if (!hasGenericDecorationCue(segment) && !hasAccessoryAnchorCue(segment)) {
        return null;
      }

      if (!genericFamily) {
        return null;
      }

      return {
        family: genericFamily,
        label: detectGenericAccessoryLabel(segment, genericFamily),
        shapeLabel: detectGenericAccessoryLabel(segment, genericFamily),
        defaultAnchor: getGeneratedFamilyDefaultAnchor(genericFamily),
        sourceText: detectGenericAccessoryLabel(segment, genericFamily),
        requestedNoun: normalizeRequestedNoun(
          detectGenericAccessoryLabel(segment, genericFamily),
        ),
        familyGuess: genericFamily,
        familyResolutionSource: "suffix-fallback" as const,
      } as const;
    })();

    if (!requestCandidate) {
      continue;
    }

    const anchors = detectAccessoryAnchorsFromSegment(
      segment,
      requestCandidate.defaultAnchor,
    );
    const sanitizedLabel =
      sanitizeAccessoryRequestedLabel(requestCandidate.label) || requestCandidate.label;
    const normalizedAnchors = anchors.map((anchor) =>
      normalizeRequestedAnchor(anchor, recipe.customizationProfile).resolvedAnchor,
    );
    const anchorResolution = normalizeRequestedAnchor(
      anchors[0] ?? requestCandidate.defaultAnchor,
      recipe.customizationProfile,
    );
    const repeatCount = detectAccessoryRepeatCount(segment, anchors.length);
    const instances = buildAccessoryInstances(
      normalizedAnchors,
      repeatCount,
      segmentColorIntent,
      requestIndex,
    );
    const dedupeKey = [
      requestCandidate.family,
      sanitizedLabel,
      ...instances.map((instance) => `${instance.anchor}:${instance.ordinal}`),
    ].join("|");

    if (seenKeys.has(dedupeKey)) {
      continue;
    }

    seenKeys.add(dedupeKey);
    requests.push({
      requestId: `req-${requestIndex}`,
      requestedLabel: sanitizedLabel,
      requestedNoun: requestCandidate.requestedNoun,
      nounSpan: requestCandidate.label,
      label: sanitizedLabel,
      shapeLabel: sanitizeAccessoryRequestedLabel(requestCandidate.shapeLabel) || requestCandidate.shapeLabel,
      family: requestCandidate.family,
      familyGuess: requestCandidate.familyGuess,
      familyResolutionSource: requestCandidate.familyResolutionSource,
      semanticClass: getAccessorySemanticClass(requestCandidate.family),
      anchor: instances[0]?.anchor ?? anchorResolution.resolvedAnchor,
      requestedAnchorPhrase: detectRequestedAnchorPhrase(
        segment,
        anchorResolution.resolvedAnchor,
      ),
      anchorResolutionSource: anchorResolution.anchorResolutionSource,
      shapeDescription:
        requestCandidate.family === "generic-ornament" ||
        requestCandidate.family === "open-botanical-ornament" ||
        requestCandidate.family === "open-symbol-ornament"
          ? `${requestCandidate.requestedNoun ?? sanitizedLabel} 需要保持请求物的识别轮廓，不要退化成普通圆球。`
          : undefined,
      sourceText: requestCandidate.sourceText,
      priority: isExceptionSegment ? 1000 : 600,
      instances,
      ...(segmentColorIntent ? { colorIntent: segmentColorIntent } : {}),
      ...(segmentColorIntent ? { requestedColor: segmentColorIntent } : {}),
      styleIntent: recipe.themeLabel,
      shapeHint: sanitizedLabel,
      requestedText: segment.trim(),
      allowApproximation: true,
      mustKeep: true,
      executionMode: stableAccessoryFamilies.has(requestCandidate.family)
        ? "stable-add"
        : recipe.customizationProfile === "experimental-addon"
          ? "runtime-generated"
          : "approximate-fallback",
      resolvedLabel: sanitizedLabel,
      notes: isExceptionSegment
        ? ["这条配件请求来自“除了……”例外语义，会压过主题默认件。"]
        : [],
    });
    requestIndex += 1;
  }

  return requests;
}

function buildAccessoryPolicy(
  normalizedPrompt: string,
  recipe: PromptCustomizationRecipeDraft,
  requests: PromptCustomizationAccessoryRequest[],
): PromptCustomizationAccessoryPolicy {
  const defaultAccessoryKey = getFoxThemeDefaultAccessory(recipe.themeSlot as never);
  const defaultAccessoryFamily = getAccessoryFamilyFromKey(defaultAccessoryKey);
  const defaultDirective = supportedAccessoryDirectives.find(
    (directive) => directive.accessoryKey === defaultAccessoryKey,
  );
  const defaultNegated = recipe.negations.some((entry) =>
    entry.includes(getFoxAccessoryLabel(defaultAccessoryKey as never)) ||
    noAccessoryPhrases.some((phrase) => entry.includes(phrase)) ||
    defaultDirective?.keywords.some((keyword) => entry.includes(keyword)),
  );
  const explicitExceptionOnly =
    noAccessoryPhrases.some((phrase) => normalizedPrompt.includes(phrase)) &&
    normalizedPrompt.includes("除了");
  const explicitRequests = requests.length > 0;
  const defaultAccessoryRequested = requests.some(
    (request) => request.family === defaultAccessoryFamily,
  );
  const removeDefaultAccessories =
    explicitExceptionOnly ||
    defaultNegated ||
    (explicitRequests && !defaultAccessoryRequested);
  const keepThemeDefaultAccessories =
    !removeDefaultAccessories && !explicitRequests;

  return {
    removeDefaultAccessories,
    keepThemeDefaultAccessories,
    exceptionOnly: explicitExceptionOnly,
    removedDefaultAccessoryKeys: removeDefaultAccessories ? [defaultAccessoryKey] : [],
    keptThemeDefaultAccessoryKeys: keepThemeDefaultAccessories
      ? [defaultAccessoryKey]
      : [],
  };
}

function buildThemeDefaultAccessoryRequest(
  recipe: PromptCustomizationRecipeDraft,
): PromptCustomizationAccessoryRequest {
  const defaultAccessoryKey = getFoxThemeDefaultAccessory(recipe.themeSlot as never);
  const defaultAnchor = getDefaultAnchorForAccessoryKey(defaultAccessoryKey);

  return {
    requestId: "theme-default-request",
    label: getFoxAccessoryLabel(defaultAccessoryKey as never),
    shapeLabel: getFoxAccessoryLabel(defaultAccessoryKey as never),
    family: getAccessoryFamilyFromKey(defaultAccessoryKey),
    semanticClass: "stable-accessory",
    anchor: defaultAnchor,
    sourceText: getFoxAccessoryLabel(defaultAccessoryKey as never),
    priority: 100,
    instances: buildAccessoryInstances(
      [defaultAnchor],
      1,
      recipe.colorOverrides.accessoryColor,
      -1,
    ),
    ...(recipe.colorOverrides.accessoryColor
      ? { colorIntent: recipe.colorOverrides.accessoryColor }
      : {}),
    styleIntent: recipe.themeLabel,
    executionMode: "theme-default",
    requestedText: recipe.themeLabel,
    allowApproximation: false,
    mustKeep: true,
    resolvedLabel: getFoxAccessoryLabel(defaultAccessoryKey as never),
  };
}

function resolveExecutionCreationSource(
  executionMode: PromptCustomizationResolvedAccessoryExecution["executionMode"],
  family: PromptCustomizationAccessoryFamily,
): PromptCustomizationCreationSource {
  if (executionMode === "runtime-generated") {
    return family === "necklace-chain" || family === "earring-hoop"
      ? "runtime-generated"
      : "runtime-composed";
  }

  if (
    executionMode === "theme-default" ||
    executionMode === "stable-add" ||
    executionMode === "stable-replace"
  ) {
    return "stable-reuse";
  }

  if (executionMode === "approximate-fallback") {
    return "approximate-fallback";
  }

  return "unfulfilled";
}

function resolveExecutionStatus(
  executionMode: PromptCustomizationResolvedAccessoryExecution["executionMode"],
): PromptCustomizationExecutionStatus {
  if (executionMode === "approximate-fallback") {
    return "approximated";
  }

  if (executionMode === "deferred" || executionMode === "remove-default") {
    return "unfulfilled";
  }

  return "implemented";
}

function buildResolvedExecutionPlan(
  recipe: PromptCustomizationRecipeDraft,
  policy: PromptCustomizationAccessoryPolicy,
  explicitRequests: PromptCustomizationAccessoryRequest[],
): PromptCustomizationResolvedExecutionPlan {
  const defaultAccessoryKey = getFoxThemeDefaultAccessory(recipe.themeSlot as never);
  const requests = [
    ...(policy.keepThemeDefaultAccessories
      ? [buildThemeDefaultAccessoryRequest(recipe)]
      : []),
    ...explicitRequests,
  ];
  const addAccessories: PromptCustomizationResolvedAccessoryExecution[] = [];
  const approximatedAccessoryFamilies = new Set<string>();

  for (const request of requests) {
    for (const instance of request.instances) {
      const isStableFamily = stableAccessoryFamilies.has(request.family);
      const defaultAnchor = getDefaultAnchorForAccessoryFamily(request.family);
      const isExplicitRuntimeFirstRequest =
        recipe.customizationProfile === "experimental-addon" &&
        request.requestId !== "theme-default-request";
      const executionMode = request.executionMode === "theme-default"
        ? "theme-default"
        : isExplicitRuntimeFirstRequest
          ? "runtime-generated"
          : isStableFamily
            ? "stable-add"
            : recipe.customizationProfile === "experimental-addon"
              ? "runtime-generated"
              : "approximate-fallback";
      const fallback =
        !isStableFamily || executionMode === "approximate-fallback"
          ? getGeneratedAccessoryFallback(
              request.family as PromptCustomizationGeneratedAccessoryKind,
              instance.anchor,
            )
          : null;
      const creationSource = resolveExecutionCreationSource(
        executionMode,
        request.family,
      );
      const executionStatus = resolveExecutionStatus(executionMode);

      if (executionMode === "approximate-fallback" && fallback) {
        approximatedAccessoryFamilies.add(request.family);
      }

      addAccessories.push({
        executionId: `${request.requestId}:${instance.instanceId}`,
        requestId: request.requestId,
        instanceId: instance.instanceId,
        family: request.family,
        familyGuess: request.familyGuess ?? request.family,
        familyResolutionSource: request.familyResolutionSource,
        requestedSemanticClass:
          request.semanticClass ?? getAccessorySemanticClass(request.family),
        requestedLabel: request.requestedLabel ?? request.label,
        requestedNoun: request.requestedNoun,
        shapeLabel: request.shapeLabel,
        anchor: instance.anchor,
        requestedAnchorPhrase:
          request.requestedAnchorPhrase ?? getAccessoryAnchorLabel(instance.anchor),
        anchorResolutionSource: request.anchorResolutionSource,
        colorIntent: instance.colorIntent ?? request.colorIntent,
        requestedColorText:
          instance.colorIntent?.requestedText ??
          request.requestedColor?.requestedText ??
          request.colorIntent?.requestedText ??
          request.requestedColor?.label ??
          request.colorIntent?.label,
        executionMode,
        ...(fallback
          ? {
              fallbackFamily: getAccessoryFamilyFromKey(fallback.accessoryKey),
              fallbackLabel: fallback.label,
            }
          : {}),
        resolvedLabel:
          executionMode === "approximate-fallback" && fallback
            ? fallback.label
            : request.label,
        fromThemeDefault: request.requestId === "theme-default-request",
        notes: uniqueStrings([
          ...(request.notes ?? []),
          isExplicitRuntimeFirstRequest
            ? "实验定制下显式配件请求默认先进入 runtime 现场创作，不先回稳定库找替身。"
            : instance.anchor !== defaultAnchor
              ? "当前锚点偏离该配件默认挂点，执行时会优先校准到显式锚点。"
              : null,
        ]),
        creationSource,
        executionStatus,
        nounFidelityStatus:
          request.requestedNoun || request.familyResolutionSource === "open-noun"
            ? "approximated"
            : undefined,
        approximationReason:
          executionMode === "approximate-fallback" && fallback
            ? `${request.shapeLabel} 当前先用 ${fallback.label} 做近似。`
            : undefined,
        failureReason:
          executionStatus === "unfulfilled"
            ? `${request.shapeLabel} 当前没有稳定执行。`
            : undefined,
      });
    }
  }

  return {
    removeDefaultAccessories: policy.removeDefaultAccessories
      ? [defaultAccessoryKey]
      : [],
    keepThemeDefaults: policy.keepThemeDefaultAccessories ? [defaultAccessoryKey] : [],
    addAccessories,
    repairPassAllowed: recipe.mode === "dynamic-custom",
    repairPassTriggered: false,
  };
}

function deriveLegacyAccessoryFields(
  recipe: PromptCustomizationRecipeDraft,
  requests: PromptCustomizationAccessoryRequest[],
  executionPlan: PromptCustomizationResolvedExecutionPlan,
  policy: PromptCustomizationAccessoryPolicy,
) {
  const defaultAccessoryKey = getFoxThemeDefaultAccessory(recipe.themeSlot as never);

  if (policy.removeDefaultAccessories && executionPlan.addAccessories.length === 0) {
    return {
      accessoryOperation: {
        type: "remove-default",
        label: "无配饰",
        accessoryKey: defaultAccessoryKey,
        targetLabel: getFoxAccessoryLabel(defaultAccessoryKey as never),
        sourceText: "无配饰",
      } satisfies PromptCustomizationAccessoryOperation,
      generatedAccessory: undefined,
    };
  }

  if (requests.length === 0 && policy.keepThemeDefaultAccessories) {
    return {
      accessoryOperation: {
        type: "keep-default",
        label: getFoxAccessoryLabel(defaultAccessoryKey as never),
        accessoryKey: defaultAccessoryKey,
      } satisfies PromptCustomizationAccessoryOperation,
      generatedAccessory: undefined,
    };
  }

  if (requests.length === 1 && requests[0].instances.length === 1) {
    const request = requests[0];
    const stableFallback = familyToStableAccessory[request.family];

    if (stableAccessoryFamilies.has(request.family) && stableFallback) {
      return {
        accessoryOperation: {
          type: request.family === getAccessoryFamilyFromKey(defaultAccessoryKey)
            ? "keep-default"
            : "replace-with-supported",
          label: request.label,
          accessoryKey: stableFallback.accessoryKey,
          sourceText: request.sourceText,
        } satisfies PromptCustomizationAccessoryOperation,
        generatedAccessory: undefined,
      };
    }

    const fallback = getGeneratedAccessoryFallback(
      request.family as PromptCustomizationGeneratedAccessoryKind,
      request.instances[0].anchor,
    );

    return {
      accessoryOperation: {
        type: "generate-simple-accessory",
        label: request.label,
        accessoryKey: fallback.accessoryKey,
        sourceText: request.sourceText,
      } satisfies PromptCustomizationAccessoryOperation,
      generatedAccessory: {
        kind: request.family as PromptCustomizationGeneratedAccessoryKind,
        label: request.label,
        anchor: request.instances[0].anchor,
        sourceText: request.sourceText,
      } satisfies PromptCustomizationGeneratedAccessory,
    };
  }

  const firstExecution = executionPlan.addAccessories[0];
  const firstFallback =
    firstExecution?.fallbackLabel && firstExecution.fallbackFamily
      ? familyToStableAccessory[firstExecution.fallbackFamily] ??
        getGeneratedAccessoryFallback(
          firstExecution.family as PromptCustomizationGeneratedAccessoryKind,
          firstExecution.anchor,
        )
      : firstExecution
        ? getGeneratedAccessoryFallback(
            firstExecution.family as PromptCustomizationGeneratedAccessoryKind,
            firstExecution.anchor,
          )
        : null;

  if (!firstExecution) {
    return {
      accessoryOperation: {
        type: "keep-default",
        label: getFoxAccessoryLabel(defaultAccessoryKey as never),
        accessoryKey: defaultAccessoryKey,
      } satisfies PromptCustomizationAccessoryOperation,
      generatedAccessory: undefined,
    };
  }

  if (runtimeAccessoryFamilies.has(firstExecution.family)) {
    return {
      accessoryOperation: {
        type: "generate-simple-accessory",
        label:
          executionPlan.addAccessories.length > 1
            ? "多实例配件组合"
            : firstExecution.shapeLabel,
        ...(firstFallback ? { accessoryKey: firstFallback.accessoryKey } : {}),
        sourceText:
          executionPlan.addAccessories.length > 1
            ? "多实例配件组合"
            : requests[0]?.sourceText,
      } satisfies PromptCustomizationAccessoryOperation,
      generatedAccessory: {
        kind: firstExecution.family as PromptCustomizationGeneratedAccessoryKind,
        label: firstExecution.shapeLabel,
        anchor: firstExecution.anchor,
        sourceText: requests[0]?.sourceText ?? firstExecution.shapeLabel,
      } satisfies PromptCustomizationGeneratedAccessory,
    };
  }

  return {
    accessoryOperation: {
      type: "replace-with-supported",
      label:
        executionPlan.addAccessories.length > 1
          ? "多实例配件组合"
          : firstExecution.shapeLabel,
      accessoryKey:
        firstFallback?.accessoryKey ??
        familyToStableAccessory[firstExecution.family]?.accessoryKey ??
        defaultAccessoryKey,
      sourceText:
        executionPlan.addAccessories.length > 1
          ? "多实例配件组合"
          : requests[0]?.sourceText,
    } satisfies PromptCustomizationAccessoryOperation,
    generatedAccessory: undefined,
  };
}

function applyCanonicalAccessoryContract(
  normalizedPrompt: string,
  recipe: PromptCustomizationRecipeDraft,
) {
  const explicitRequests =
    Array.isArray(recipe.accessoryRequests) && recipe.accessoryRequests.length > 0
      ? resolveAccessoryRequests({
          accessoryRequests: recipe.accessoryRequests,
          customizationProfile: recipe.customizationProfile,
          colorOverrides: recipe.colorOverrides,
          themeLabel: recipe.themeLabel,
        })
      : collectExplicitAccessoryRequests(normalizedPrompt, recipe);
  const accessoryPolicy = buildAccessoryPolicy(
    normalizedPrompt,
    recipe,
    explicitRequests,
  );
  const resolvedExecutionPlan = buildResolvedExecutionPlan(
    recipe,
    accessoryPolicy,
    explicitRequests,
  );
  const legacyFields = deriveLegacyAccessoryFields(
    recipe,
    explicitRequests,
    resolvedExecutionPlan,
    accessoryPolicy,
  );

  return {
    ...recipe,
    accessoryPolicy,
    accessoryRequests: explicitRequests,
    resolvedExecutionPlan,
    accessoryOperation: legacyFields.accessoryOperation,
    generatedAccessory: legacyFields.generatedAccessory,
  } satisfies PromptCustomizationRecipeDraft;
}

function buildThemeReason(normalizedPrompt: string, themeSlot: string, style: StyleTemplate) {
  const matchedKeywords = themeKeywords[themeSlot]?.find((keyword) =>
    normalizedPrompt.includes(keyword),
  );

  if (matchedKeywords) {
    return `根据 prompt 中的“${matchedKeywords}”归到 ${getFoxThemeLabel(themeSlot as never)} 主题。`;
  }

  if (style === "dream-glow" && themeSlot === "night-glow") {
    return "当前没有更强主题词，沿用 dream-glow 对应的夜灯精灵默认主题。";
  }

  if (style === "low-poly" && themeSlot === "forest-scout") {
    return "当前没有更强主题词，沿用 low-poly 对应的森林巡游默认主题。";
  }

  return "当前没有更强主题词，沿用 cream-toy 对应的奶油玩具默认主题。";
}

function buildRecipeConfidence(
  recipe: PromptCustomizationRecipeCore,
) {
  let confidence =
    recipe.parserSource === "openai" || recipe.parserSource === "deepseek"
      ? 0.92
      : 0.78;

  if (Object.keys(recipe.colorOverrides).length > 0) {
    confidence += 0.04;
  }

  if (recipe.accessoryOperation.type !== "keep-default") {
    confidence += 0.04;
  }

  if (Object.keys(recipe.localTweaks).length > 0) {
    confidence += 0.02;
  }

  confidence -= recipe.unsupportedRequests.length * 0.08;
  confidence -= recipe.unsupportedNotes.length * 0.04;

  return clampConfidence(confidence);
}

function buildThemeDefaults(themeLabel: string, defaultAccessoryKey: string) {
  return [
    `主题槽位：${themeLabel}`,
    `主题默认配饰：${getFoxAccessoryLabel(defaultAccessoryKey as never)}`,
  ];
}

function promoteGeneratedAccessoryToStable(
  kind: PromptCustomizationGeneratedAccessoryKind,
) {
  if (kind === "tie") {
    return { accessoryKey: "accessoryTie", label: "小领带" } as const;
  }

  if (kind === "badge") {
    return { accessoryKey: "accessoryBadge", label: "小徽章" } as const;
  }

  if (kind === "bow") {
    return { accessoryKey: "accessoryBow", label: "蝴蝶结" } as const;
  }

  if (kind === "pendant") {
    return { accessoryKey: "accessoryPendant", label: "小吊坠" } as const;
  }

  return null;
}

function buildPromptOverrides(recipe: PromptCustomizationRecipeCore) {
  const overrides: string[] = [];

  const colorOverride = recipe.colorOverrides.bodyColor;
  const accessoryColorOverride = recipe.colorOverrides.accessoryColor;
  const glowColorOverride = recipe.colorOverrides.glowColor;

  if (colorOverride) {
    overrides.push(`主体配色覆盖为 ${colorOverride.label}`);
  }

  if (
    accessoryColorOverride &&
    accessoryColorOverride.label !== colorOverride?.label
  ) {
    overrides.push(`配饰配色覆盖为 ${accessoryColorOverride.label}`);
  }

  if (
    glowColorOverride &&
    glowColorOverride.label !== colorOverride?.label &&
    glowColorOverride.label !== accessoryColorOverride?.label
  ) {
    overrides.push(`发光点配色覆盖为 ${glowColorOverride.label}`);
  }

  if (recipe.accessoryPolicy.removeDefaultAccessories) {
    const removedLabels = recipe.resolvedExecutionPlan.removeDefaultAccessories.map(
      (key) => getFoxAccessoryLabel(key as never),
    );
    if (removedLabels.length > 0) {
      overrides.push(`移除默认配饰：${removedLabels.join(" / ")}`);
    }
  }

  for (const request of recipe.accessoryRequests) {
    const requestExecutions = recipe.resolvedExecutionPlan.addAccessories.filter(
      (execution) => execution.requestId === request.requestId,
    );
    const requestCount = request.instances.length;
    const countSuffix = requestCount > 1 ? ` x${requestCount}` : "";
    const anchorSummary = uniqueStrings(
      request.instances.map((instance) => getAccessoryAnchorLabel(instance.anchor)),
    ).join(" / ");

    if (requestExecutions.some((execution) => execution.executionMode === "runtime-generated")) {
      overrides.push(`实验小件：${request.shapeLabel}${countSuffix}${anchorSummary ? `（${anchorSummary}）` : ""}`);
      continue;
    }

    if (requestExecutions.some((execution) => execution.executionStatus === "approximated")) {
      const fallbackLabels = uniqueStrings(
        requestExecutions.map((execution) => execution.fallbackLabel ?? execution.resolvedLabel),
      );
      overrides.push(
        `近似配件：${request.shapeLabel}${countSuffix} -> ${fallbackLabels.join(" / ")}`,
      );
      continue;
    }

    if (requestExecutions.length > 0) {
      overrides.push(`新增配件：${request.shapeLabel}${countSuffix}${anchorSummary ? `（${anchorSummary}）` : ""}`);
    }
  }

  if (recipe.localTweaks.tailFluff?.supported) {
    overrides.push(recipe.localTweaks.tailFluff.label);
  }

  if (recipe.localTweaks.eyeSize?.supported) {
    overrides.push(recipe.localTweaks.eyeSize.label);
  }

  if (recipe.localTweaks.glowIntensity?.supported) {
    overrides.push(recipe.localTweaks.glowIntensity.label);
  }

  if (recipe.localTweaks.earSize && !recipe.localTweaks.earSize.supported) {
    overrides.push("记录了耳朵大小偏好（当前暂不执行）");
  }

  return uniqueStrings(overrides);
}

function resolveAccessoryRequests(
  recipe: Pick<
    PromptCustomizationRecipeCore,
    "accessoryRequests" | "customizationProfile" | "colorOverrides" | "themeLabel"
  >,
) {
  return (recipe.accessoryRequests ?? []).map((request) => {
    const anchorResolution = normalizeRequestedAnchor(
      request.anchor,
      recipe.customizationProfile,
    );

    return {
      ...request,
      nounSpan:
        request.nounSpan ??
        request.requestedNoun ??
        normalizeRequestedNoun(request.requestedLabel ?? request.shapeLabel ?? request.label),
      nounGloss:
        request.nounGloss ??
        request.requestedNoun ??
        normalizeRequestedNoun(request.requestedLabel ?? request.shapeLabel ?? request.label),
      objectCategory:
        request.objectCategory ??
        inferObjectCategoryFromArchetype(inferRuntimeDesignArchetype(request)),
      designConfidence:
        typeof request.designConfidence === "number"
          ? clampConfidence(request.designConfidence)
          : undefined,
      mustDistinctFromFallback:
        request.mustDistinctFromFallback ??
        request.familyResolutionSource === "open-noun",
      anchor: anchorResolution.resolvedAnchor,
      anchorResolutionSource:
        request.anchorResolutionSource ?? anchorResolution.anchorResolutionSource,
      executionMode:
        request.executionMode === "runtime-generated" &&
        recipe.customizationProfile !== "experimental-addon"
          ? "approximate-fallback"
          : request.executionMode,
      colorIntent: request.colorIntent ?? recipe.colorOverrides.accessoryColor,
      requestedColor: request.requestedColor ?? request.colorIntent ?? recipe.colorOverrides.accessoryColor,
      styleIntent: request.styleIntent ?? recipe.themeLabel,
      instances: request.instances.map((instance) => {
        const normalizedInstanceAnchor = normalizeRequestedAnchor(
          instance.anchor,
          recipe.customizationProfile,
        ).resolvedAnchor;

        return {
          ...instance,
          anchor: normalizedInstanceAnchor,
          colorIntent:
            instance.colorIntent ??
            request.colorIntent ??
            recipe.colorOverrides.accessoryColor,
        };
      }),
    };
  });
}

function getAccessoryAnchorLabel(anchor: PromptCustomizationAccessoryAnchor) {
  if (anchor === "left-ear") {
    return "左耳";
  }

  if (anchor === "right-ear") {
    return "右耳";
  }

  if (anchor === "forehead") {
    return "额头";
  }

  if (anchor === "head-top") {
    return "头顶";
  }

  if (anchor === "back-head") {
    return "头后面";
  }

  if (anchor === "chest-left") {
    return "左胸前";
  }

  if (anchor === "chest-right") {
    return "右胸前";
  }

  if (anchor === "tail-top") {
    return "尾巴上面";
  }

  if (anchor === "tail-left") {
    return "尾巴左边";
  }

  if (anchor === "tail-right") {
    return "尾巴右边";
  }

  if (anchor === "tail-base") {
    return "尾巴根部";
  }

  return "胸前";
}

function buildExecutionScorecard(
  recipe: PromptCustomizationRecipeCore,
  executedCustomizations: string[],
  deferredCustomizations: string[],
) {
  const accessoryRequests = resolveAccessoryRequests(recipe);
  const resolvedExecutionPlan = recipe.resolvedExecutionPlan;
  const requestedAccessories = accessoryRequests.flatMap((request) =>
    request.instances.map((instance) => {
      const colorLabel =
        instance.colorIntent?.label ?? request.colorIntent?.label;
      return `${getAccessoryAnchorLabel(instance.anchor)} · ${request.shapeLabel}${colorLabel ? ` · ${colorLabel}` : ""}`;
    }),
  );
  const executedAccessories: string[] = [];
  const approximatedAccessories: string[] = [];
  const unsupportedAccessories: string[] = [];
  const runtimeDesignedAccessories: string[] = [];
  const runtimeGeneratedAccessories: string[] = [];
  const approximatedAccessoryFamilies = new Set<string>();
  const implemented: string[] = [
    `主题：${recipe.themeLabel}`,
    recipe.colorOverrides.bodyColor
      ? `主体颜色：${recipe.colorOverrides.bodyColor.label}`
      : `主体颜色：沿用 ${recipe.themeLabel} 默认配色`,
  ];
  const approximated: string[] = [];
  const unsupported: string[] = [];
  const executedAccessoryCount = resolvedExecutionPlan.addAccessories.filter(
    (execution) => execution.executionStatus !== "unfulfilled",
  ).length;

  if (recipe.colorOverrides.accessoryColor) {
    implemented.push(`配件颜色：${recipe.colorOverrides.accessoryColor.label}`);
  }

  if (recipe.colorOverrides.glowColor) {
    implemented.push(`发光颜色：${recipe.colorOverrides.glowColor.label}`);
  }

  if (resolvedExecutionPlan.removeDefaultAccessories.length > 0) {
    implemented.push(
      `移除默认配饰：${resolvedExecutionPlan.removeDefaultAccessories
        .map((key) => getFoxAccessoryLabel(key as never))
        .join(" / ")}`,
    );
  }

  if (resolvedExecutionPlan.keepThemeDefaults.length > 0) {
    implemented.push(
      `保留主题默认件：${resolvedExecutionPlan.keepThemeDefaults
        .map((key) => getFoxAccessoryLabel(key as never))
        .join(" / ")}`,
    );
  }

  for (const execution of resolvedExecutionPlan.addAccessories) {
    const anchorLabel = getAccessoryAnchorLabel(execution.anchor);
    const resolvedLabel = execution.resolvedLabel ?? execution.shapeLabel;

    if (execution.executionStatus === "implemented") {
      executedAccessories.push(`${anchorLabel} · ${resolvedLabel}`);
      if (
        execution.creationSource === "runtime-designed" ||
        execution.creationSource === "runtime-generated" ||
        execution.creationSource === "runtime-repaired" ||
        execution.creationSource === "runtime-composed"
      ) {
        runtimeDesignedAccessories.push(`${anchorLabel} · ${resolvedLabel}`);
      }
      if (
        execution.creationSource === "runtime-generated" ||
        execution.creationSource === "runtime-repaired" ||
        execution.creationSource === "runtime-composed"
      ) {
        runtimeGeneratedAccessories.push(`${anchorLabel} · ${resolvedLabel}`);
      }
      implemented.push(`配件位置：${anchorLabel}`);
      implemented.push(`配件形状：${resolvedLabel}`);
      implemented.push(`创建来源：${execution.creationSource}`);
      if (execution.colorIntent) {
        implemented.push(`配件颜色：${execution.colorIntent.label}`);
      }
      continue;
    }

    if (execution.executionStatus === "approximated") {
      approximatedAccessoryFamilies.add(execution.family);
      approximatedAccessories.push(
        `${anchorLabel} · ${execution.shapeLabel} -> ${resolvedLabel}`,
      );
      implemented.push(`配件位置：${anchorLabel}`);
      if (execution.colorIntent) {
        implemented.push(`配件颜色：${execution.colorIntent.label}`);
      }
      approximated.push(`配件形状：${execution.shapeLabel} -> ${resolvedLabel}`);
      if (execution.approximationReason) {
        approximated.push(execution.approximationReason);
      }
      continue;
    }

    unsupportedAccessories.push(`${anchorLabel} · ${execution.shapeLabel}`);
    unsupported.push(
      execution.failureReason ?? `配件形状：${execution.shapeLabel}`,
    );
  }

  unsupported.push(...recipe.unsupportedRequests.map((entry) => `超范围：${entry}`));
  unsupported.push(...deferredCustomizations);

  return {
    requestedTheme: recipe.requestedTheme,
    resolvedTheme: recipe.resolvedTheme,
    bodyPaletteIntent: recipe.bodyPaletteIntent,
    detailPaletteIntent: recipe.detailPaletteIntent,
    requestedAccessoryCount: requestedAccessories.length,
    executedAccessoryCount,
    removedDefaultAccessories: resolvedExecutionPlan.removeDefaultAccessories.map(
      (key) => getFoxAccessoryLabel(key as never),
    ),
    keptThemeDefaults: resolvedExecutionPlan.keepThemeDefaults.map((key) =>
      getFoxAccessoryLabel(key as never),
    ),
    approximatedAccessoryFamilies: [...approximatedAccessoryFamilies],
    requestedAccessories: uniqueStrings(requestedAccessories),
    executedAccessories: uniqueStrings(executedAccessories),
    approximatedAccessories: uniqueStrings(approximatedAccessories),
    unsupportedAccessories: uniqueStrings(unsupportedAccessories),
    runtimeDesignedAccessories: uniqueStrings(runtimeDesignedAccessories),
    runtimeGeneratedAccessories: uniqueStrings(runtimeGeneratedAccessories),
    implemented: uniqueStrings([...implemented, ...executedCustomizations]),
    approximated: uniqueStrings(approximated),
    unsupported: uniqueStrings(unsupported),
  } satisfies PromptCustomizationExecutionScorecard;
}

function buildExecutionBreakdown(recipe: PromptCustomizationRecipeCore) {
  const executedCustomizations: string[] = [];
  const deferredCustomizations: string[] = [];
  const experimentalWarnings: string[] = [];
  const bodyColorOverride = recipe.colorOverrides.bodyColor;
  const detailColorOverride = recipe.colorOverrides.detailColor;
  const accentColorOverride = recipe.colorOverrides.accentColor;
  const accessoryColorOverride = recipe.colorOverrides.accessoryColor;
  const glowColorOverride = recipe.colorOverrides.glowColor;

  if (bodyColorOverride) {
    executedCustomizations.push(`主体颜色：${bodyColorOverride.label}`);
  }

  if (detailColorOverride && detailColorOverride.label !== bodyColorOverride?.label) {
    executedCustomizations.push(`主体细节颜色：${detailColorOverride.label}`);
  }

  if (
    accentColorOverride &&
    accentColorOverride.label !== bodyColorOverride?.label &&
    accentColorOverride.label !== detailColorOverride?.label
  ) {
    executedCustomizations.push(`主体强调颜色：${accentColorOverride.label}`);
  }

  if (
    accessoryColorOverride &&
    accessoryColorOverride.label !== bodyColorOverride?.label
  ) {
    executedCustomizations.push(`配饰颜色：${accessoryColorOverride.label}`);
  }

  if (
    glowColorOverride &&
    glowColorOverride.label !== bodyColorOverride?.label &&
    glowColorOverride.label !== accessoryColorOverride?.label
  ) {
    executedCustomizations.push(`发光点颜色：${glowColorOverride.label}`);
  }

  if (recipe.resolvedExecutionPlan.removeDefaultAccessories.length > 0) {
    executedCustomizations.push(
      `移除默认配饰：${recipe.resolvedExecutionPlan.removeDefaultAccessories
        .map((key) => getFoxAccessoryLabel(key as never))
        .join(" / ")}`,
    );
  }

  if (recipe.resolvedExecutionPlan.keepThemeDefaults.length > 0) {
    executedCustomizations.push(
      `保留主题默认件：${recipe.resolvedExecutionPlan.keepThemeDefaults
        .map((key) => getFoxAccessoryLabel(key as never))
        .join(" / ")}`,
    );
  }

  for (const execution of recipe.resolvedExecutionPlan.addAccessories) {
    const anchorLabel = getAccessoryAnchorLabel(execution.anchor);
    const resolvedLabel = execution.resolvedLabel ?? execution.shapeLabel;
    const executionColorLabel = execution.colorIntent?.label;

    if (execution.executionStatus === "approximated") {
      executedCustomizations.push(
        `近似配件：${anchorLabel} · ${execution.shapeLabel} -> ${resolvedLabel}`,
      );
      if (executionColorLabel) {
        executedCustomizations.push(`配件颜色：${executionColorLabel}`);
      }
      continue;
    }

    if (
      execution.creationSource === "runtime-designed" ||
      execution.creationSource === "runtime-generated" ||
      execution.creationSource === "runtime-repaired" ||
      execution.creationSource === "runtime-composed"
    ) {
      executedCustomizations.push(
        `实验附加小件：${anchorLabel} · ${execution.shapeLabel}`,
      );
      if (executionColorLabel) {
        executedCustomizations.push(`配件颜色：${executionColorLabel}`);
      }
      continue;
    }

    if (
      execution.executionMode === "theme-default" &&
      execution.fromThemeDefault
    ) {
      executedCustomizations.push(`主题默认件：${anchorLabel} · ${resolvedLabel}`);
      if (executionColorLabel) {
        executedCustomizations.push(`配件颜色：${executionColorLabel}`);
      }
      continue;
    }

    if (execution.executionStatus === "implemented") {
      executedCustomizations.push(`替换为支持配饰：${resolvedLabel}`);
      executedCustomizations.push(`稳定配件：${anchorLabel} · ${resolvedLabel}`);
      if (executionColorLabel) {
        executedCustomizations.push(`配件颜色：${executionColorLabel}`);
      }
      continue;
    }

    if (execution.executionStatus === "unfulfilled") {
      deferredCustomizations.push(
        execution.failureReason ??
          `${anchorLabel} · ${execution.shapeLabel} 已被理解，但当前暂未执行。`,
      );
    }
  }

  if (
    recipe.customizationProfile === "experimental-addon" &&
    recipe.resolvedExecutionPlan.addAccessories.some(
      (execution) => execution.executionMode === "runtime-generated",
    )
  ) {
    experimentalWarnings.push(
      "当前结果启用了实验定制，会新增附加小件，但不会改变 fox-base-v10 主体结构。",
    );
    experimentalWarnings.push(
      "实验定制优先验证 prompt 定制感，不保证当前结果达到作品集级成品度。",
    );
  }

  if (recipe.resolvedExecutionPlan.repairPassTriggered) {
    experimentalWarnings.push("这次导出前触发了一次自动修复，以补齐缺失的配件实例或默认件移除。");
  }

  if (recipe.localTweaks.glowIntensity) {
    executedCustomizations.push(`材质发光：${recipe.localTweaks.glowIntensity.label}`);
  }

  for (const tweakKey of ["earSize", "tailFluff", "eyeSize"] as const) {
    const tweak = recipe.localTweaks[tweakKey];

    if (tweak) {
      deferredCustomizations.push(
        `${tweak.label} 已被理解，但当前先不改变 fox-base-v10 母体结构。`,
      );
    }
  }

  return {
    executedCustomizations: uniqueStrings(executedCustomizations),
    deferredCustomizations: uniqueStrings(deferredCustomizations),
    experimentalWarnings: uniqueStrings(experimentalWarnings),
    executionScorecard: buildExecutionScorecard(
      recipe,
      uniqueStrings(executedCustomizations),
      uniqueStrings(deferredCustomizations),
    ),
  };
}

function normalizeAccessoryColorContract(
  recipe: PromptCustomizationRecipeCore,
): PromptCustomizationRecipeCore {
  const executionColorOverrides = recipe.resolvedExecutionPlan.addAccessories
    .map((execution) => execution.colorIntent)
    .filter(
      (value): value is PromptCustomizationColorOverride =>
        Boolean(value && typeof value.label === "string" && typeof value.hex === "string"),
    );

  if (executionColorOverrides.length === 0) {
    return recipe;
  }

  const uniqueAccessoryColors = uniqueStrings(
    executionColorOverrides.map((value) => value.label),
  );
  const nextColorOverrides = {
    ...recipe.colorOverrides,
  };

  if (uniqueAccessoryColors.length === 1) {
    const [onlyColor] = executionColorOverrides;

    if (
      onlyColor &&
      nextColorOverrides.accessoryColor?.label !== onlyColor.label
    ) {
      nextColorOverrides.accessoryColor = onlyColor;
    }
  } else {
    delete nextColorOverrides.accessoryColor;
  }

  return {
    ...recipe,
    colorOverrides: nextColorOverrides,
    detailPaletteIntent: uniqueStrings([
      uniqueAccessoryColors.length > 1
        ? `配件按实例颜色执行：${uniqueAccessoryColors.join(" / ")}`
        : nextColorOverrides.accessoryColor
          ? `配件：${nextColorOverrides.accessoryColor.label}`
          : recipe.detailPaletteIntent[0] ?? "配件沿用主题默认色",
      nextColorOverrides.glowColor
        ? `发光：${nextColorOverrides.glowColor.label}`
        : null,
    ]),
  };
}

function finalizeRecipe(
  partial: PromptCustomizationRecipeDraft,
  normalizedPrompt?: string,
) {
  let canonical: PromptCustomizationRecipeCore;
  const hasExplicitAccessoryRequests =
    Array.isArray(partial.accessoryRequests) &&
    partial.accessoryRequests.length > 0;
  const hasNonThemeExecutionEntries =
    isRecord(partial.resolvedExecutionPlan) &&
    Array.isArray(partial.resolvedExecutionPlan.addAccessories) &&
    partial.resolvedExecutionPlan.addAccessories.some(
      (entry) => !isRecord(entry) || entry.fromThemeDefault !== true,
    );

  if (
    partial.accessoryPolicy &&
    partial.resolvedExecutionPlan &&
    partial.accessoryRequests &&
    (hasExplicitAccessoryRequests || !hasNonThemeExecutionEntries)
  ) {
    canonical = {
      ...partial,
      accessoryPolicy: partial.accessoryPolicy,
      accessoryRequests: resolveAccessoryRequests({
        accessoryRequests: partial.accessoryRequests,
        customizationProfile: partial.customizationProfile,
        colorOverrides: partial.colorOverrides,
        themeLabel: partial.themeLabel,
      }),
      resolvedExecutionPlan: partial.resolvedExecutionPlan,
    };
  } else if (normalizedPrompt) {
    canonical = applyCanonicalAccessoryContract(normalizedPrompt, {
      ...partial,
      accessoryPolicy: partial.accessoryPolicy ?? buildEmptyAccessoryPolicy(),
      accessoryRequests: partial.accessoryRequests ?? [],
      resolvedExecutionPlan:
        partial.resolvedExecutionPlan ?? buildEmptyResolvedExecutionPlan(),
    });
  } else {
    canonical = {
      ...partial,
      accessoryPolicy: partial.accessoryPolicy ?? buildEmptyAccessoryPolicy(),
      accessoryRequests: resolveAccessoryRequests({
        accessoryRequests: partial.accessoryRequests ?? [],
        customizationProfile: partial.customizationProfile,
        colorOverrides: partial.colorOverrides,
        themeLabel: partial.themeLabel,
      }),
      resolvedExecutionPlan:
        partial.resolvedExecutionPlan ?? buildEmptyResolvedExecutionPlan(),
    };
  }

  canonical = normalizeAccessoryColorContract(canonical);
  const parsedIntent =
    canonical.parsedIntent ??
    (normalizedPrompt
      ? buildParsedIntentFromPrompt(normalizedPrompt)
      : buildEmptyParsedIntent());
  const normalizedSemanticRecipe =
    canonical.normalizedSemanticRecipe ??
    buildNormalizedSemanticRecipeFromRecipe(
      canonical,
      canonical.accessoryPolicy,
      canonical.accessoryRequests,
    );
  canonical = {
    ...canonical,
    parsedIntent,
    normalizedSemanticRecipe,
  };

  let runtimeDesignTasks =
    canonical.runtimeDesignTasks ??
    buildRuntimeDesignTasks(canonical, canonical.accessoryRequests);
  let semanticContractsV2 =
    canonical.semanticContractsV2 ??
    buildPromptSemanticContractsV2(canonical.accessoryRequests, runtimeDesignTasks);
  semanticContractsV2 = attachRetrievalMatchesToSemanticContracts(semanticContractsV2);
  const semanticContractMap = new Map(
    semanticContractsV2.map((contract) => [contract.requestId, contract]),
  );
  runtimeDesignTasks = runtimeDesignTasks.map((task) => {
    const semanticContract = semanticContractMap.get(task.requestId);

    if (!semanticContract) {
      return task;
    }

    return hydrateRuntimeTaskFromSemanticContract(task, semanticContract);
  });
  const nounDesignBriefs =
    canonical.nounDesignBriefs ?? buildNounDesignBriefs(runtimeDesignTasks);
  const geometryRecipes =
    canonical.geometryRecipes ?? buildGeometryRecipes(runtimeDesignTasks);
  const partGraphs =
    canonical.partGraphs ??
    buildAccessoryPartGraphs(nounDesignBriefs, geometryRecipes);
  const resolvedExecutionPlan = attachRuntimeDesignFacts(
    canonical.resolvedExecutionPlan,
    runtimeDesignTasks,
    nounDesignBriefs,
    partGraphs,
    geometryRecipes,
  );
  const bodyCustomization =
    canonical.bodyCustomization ?? buildBodyCustomization(canonical);
  const accessoryCustomization =
    canonical.accessoryCustomization ??
    buildAccessoryCustomization(
      canonical.accessoryPolicy,
      canonical.accessoryRequests,
      runtimeDesignTasks,
      nounDesignBriefs,
      partGraphs,
      geometryRecipes,
    );
  const runtimeAttemptBudgetMs =
    canonical.runtimeAttemptBudgetMs ??
    (canonical.customizationProfile === "experimental-addon" ? 300000 : 45000);

  canonical = {
    ...canonical,
    semanticContractsV2,
    bodyCustomization,
    accessoryCustomization,
    runtimeDesignTasks,
    nounDesignBriefs,
    partGraphs,
    geometryRecipes,
    resolvedExecutionPlan,
    runtimeAttemptBudgetMs,
    visualCritiqueReports: canonical.visualCritiqueReports ?? [],
  };

  const defaultAccessoryKey = getFoxThemeDefaultAccessory(canonical.themeSlot as never);
  const executionBreakdown = buildExecutionBreakdown(canonical);

  return {
    ...canonical,
    semanticContractsV2,
    bodyCustomization,
    accessoryCustomization,
    runtimeDesignTasks,
    nounDesignBriefs,
    partGraphs,
    geometryRecipes,
    parsedIntent,
    normalizedSemanticRecipe,
    runtimeAttemptBudgetMs,
    visualCritiqueReports: canonical.visualCritiqueReports ?? [],
    confidence: buildRecipeConfidence(canonical),
    fromThemeDefaults: buildThemeDefaults(canonical.themeLabel, defaultAccessoryKey),
    fromPromptOverrides: buildPromptOverrides(canonical),
    executedCustomizations: executionBreakdown.executedCustomizations,
    deferredCustomizations: executionBreakdown.deferredCustomizations,
    experimentalWarnings: executionBreakdown.experimentalWarnings,
    executionScorecard: executionBreakdown.executionScorecard,
  } satisfies PromptCustomizationRecipe;
}

function reconcilePromptSpecificOverrides(
  recipe: PromptCustomizationRecipe,
  fallback: PromptCustomizationRecipe,
  normalizedPrompt: string,
) {
  const { bodyOverrides, accessoryOverrides, glowOverrides } =
    getScopedColorOverridesByScope(normalizedPrompt);

  let colorOverrides = {
    ...recipe.colorOverrides,
  };

  const accessoryColorLabel = accessoryOverrides.accessoryColor?.label;
  const hasBodyScopedOverrides = Object.keys(bodyOverrides).length > 0;
  const hasGlowScopedOverrides = Object.keys(glowOverrides).length > 0;

  if (accessoryColorLabel && !hasBodyScopedOverrides) {
    const bodyLooksLikeAccessoryLeak =
      colorOverrides.bodyColor?.label === accessoryColorLabel;
    const detailLooksLikeAccessoryLeak =
      colorOverrides.detailColor?.label === accessoryColorLabel;
    const accentLooksLikeAccessoryLeak =
      colorOverrides.accentColor?.label === accessoryColorLabel;
    const glowLooksLikeAccessoryLeak =
      !hasGlowScopedOverrides &&
      colorOverrides.glowColor?.label === accessoryColorLabel;

    if (bodyLooksLikeAccessoryLeak) {
      delete colorOverrides.bodyColor;
    }

    if (detailLooksLikeAccessoryLeak) {
      delete colorOverrides.detailColor;
    }

    if (accentLooksLikeAccessoryLeak) {
      delete colorOverrides.accentColor;
    }

    if (glowLooksLikeAccessoryLeak) {
      delete colorOverrides.glowColor;
    }
  }

  colorOverrides = mergeColorOverrides(
    colorOverrides,
    bodyOverrides,
    accessoryOverrides,
    glowOverrides,
  );

  let accessoryOperation = recipe.accessoryOperation;
  const accessoryRequests = recipe.accessoryRequests;
  const genericAccessoryFallback = detectGenericAccessoryFallback(
    normalizedPrompt,
    recipe.themeSlot,
  );

  if (genericAccessoryFallback && !recipe.generatedAccessory) {
    accessoryOperation = genericAccessoryFallback.operation;
  }

  const unsupportedRequests = [...recipe.unsupportedRequests];
  const unsupportedNotes = [...recipe.unsupportedNotes];

  if (
    hasKeyword(normalizedPrompt, ["森林形状", "树形", "叶子形", "蘑菇形"]) &&
    hasKeyword(normalizedPrompt, ["装饰", "小装饰", "装饰物", "装饰件"])
  ) {
    if (
      recipe.customizationProfile === "experimental-addon" &&
      recipe.generatedAccessory?.kind === "forest"
    ) {
      unsupportedNotes.push(
        "这次会优先走实验 family 生成来贴近森林形装饰；如果效果仍不稳定，会在结果页里标成近似实现。",
      );
    } else {
      unsupportedRequests.push("森林形状装饰");
      unsupportedNotes.push(
        "当前稳定母体还没有“森林形状”的正式配饰件；这次会优先保留耳旁小装饰位置和主题配色。",
      );
    }
  }

  return finalizeRecipe(
    {
      ...recipe,
      colorOverrides,
      accessoryOperation,
      accessoryRequests,
      unsupportedRequests: uniqueStrings([
        ...fallback.unsupportedRequests,
        ...unsupportedRequests,
      ]),
      unsupportedNotes: uniqueStrings([
        ...fallback.unsupportedNotes,
        ...unsupportedNotes,
      ]),
    },
    normalizedPrompt,
  );
}

function buildRuleFallbackRecipe(
  prompt: string,
  style: StyleTemplate,
  generationMode: GenerationMode,
  customizationProfile?: CustomizationProfile,
): PromptCustomizationRecipe {
  const normalizedPrompt = normalizePrompt(prompt);
  const themeSlot = detectFoxThemeSlot(prompt, style);
  const themeLabel = getFoxThemeLabel(themeSlot);
  const accessory = detectAccessoryOperation(normalizedPrompt, themeSlot, generationMode);
  const scopedColorOverrides = detectScopedColorOverrides(normalizedPrompt);
  const unscopedPrompt = splitPromptIntoSegments(normalizedPrompt)
    .filter(
      (segment) =>
        !hasKeyword(segment, bodyColorScopeKeywords) &&
        !hasKeyword(segment, accessoryColorScopeKeywords) &&
        !hasKeyword(segment, glowColorScopeKeywords),
    )
    .join(" ");
  const colorOverrides = mergeColorOverrides(
    detectColorOverrides(unscopedPrompt),
    scopedColorOverrides,
  );
  const unsupported = detectUnsupportedRequests(normalizedPrompt);
  const localTweakResult = detectLocalTweaks(normalizedPrompt);
  const defaultAccessoryKey = getFoxThemeDefaultAccessory(themeSlot);
  const negations = detectNegations(normalizedPrompt, themeSlot, defaultAccessoryKey);
  const paletteIntent = buildPaletteIntent(themeLabel, colorOverrides);

  return finalizeRecipe(
    {
      mode: generationMode,
      customizationProfile:
        generationMode === "dynamic-custom"
          ? customizationProfile ?? "safe-overlay"
          : "safe-overlay",
      parserSource: "rule-fallback",
      requestedTheme: buildRequestedThemeLabel(normalizedPrompt, style),
      resolvedTheme: themeLabel,
      themeSlot,
      themeLabel,
      themeReason: buildThemeReason(normalizedPrompt, themeSlot, style),
      bodyPaletteIntent: paletteIntent.bodyPaletteIntent,
      detailPaletteIntent: paletteIntent.detailPaletteIntent,
      colorOverrides,
      accessoryOperation: accessory.operation,
      generatedAccessory: accessory.generatedAccessory,
      accessoryRequests: [],
      localTweaks: localTweakResult.localTweaks,
      negations,
      unsupportedRequests: unsupported.unsupportedRequests,
      unsupportedNotes: uniqueStrings([
        ...unsupported.unsupportedNotes,
        ...localTweakResult.unsupportedNotes,
      ]),
    },
    normalizedPrompt,
  );
}

function getSemanticLlmConfig(input?: CreateGenerationInput) {
  return resolveLlmProviderConfig("semantic", {
    env: applyLlmRequestConfigToEnv(process.env, input?.llmConfig),
  });
}

function getDesignLlmConfig(input?: CreateGenerationInput) {
  return resolveLlmProviderConfig("design", {
    env: applyLlmRequestConfigToEnv(process.env, input?.llmConfig),
  });
}

function extractOpenAiText(payload: unknown) {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload.output)) {
    return null;
  }

  const parts: string[] = [];

  for (const item of payload.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (!isRecord(contentItem)) {
        continue;
      }

      const text =
        typeof contentItem.text === "string"
          ? contentItem.text
          : typeof contentItem.output_text === "string"
            ? contentItem.output_text
            : null;

      if (text) {
        parts.push(text);
      }
    }
  }

  return parts.length > 0 ? parts.join("\n").trim() : null;
}

function parseJsonText(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)```/i);
  const candidate = fenced?.[1] ?? text;

  return JSON.parse(candidate) as unknown;
}

function getOpenAiFailureNote(
  status: number,
  rawText: string,
  provider: LlmProvider = "openai",
) {
  const providerLabel = getAiProviderLabel(provider);

  if (status === 401) {
    return `${providerLabel} API key 无效、已过期，或当前 keychain 条目不是可用的 API key；已回退到规则解析。`;
  }

  if (status === 429) {
    return `${providerLabel} 解析触发了速率或额度限制；已回退到规则解析。`;
  }

  if (status >= 500) {
    return `${providerLabel} 解析服务暂时不可用；已回退到规则解析。`;
  }

  const compact = rawText.replace(/\s+/g, " ").trim();
  return compact
    ? `${providerLabel} 解析暂时不可用，当前回退到规则解析（HTTP ${status}: ${compact.slice(0, 140)}）。`
    : `${providerLabel} 解析暂时不可用，当前回退到规则解析（HTTP ${status}）。`;
}

function describeOpenAiEmptyPayload(payload: unknown) {
  if (!isRecord(payload)) {
    return null;
  }

  const details: string[] = [];

  if (typeof payload.id === "string" && payload.id.trim()) {
    details.push(`id=${payload.id.trim()}`);
  }

  if (typeof payload.model === "string" && payload.model.trim()) {
    details.push(`model=${payload.model.trim()}`);
  }

  if (Array.isArray(payload.choices) && payload.choices.length > 0) {
    const firstChoice = payload.choices[0];

    if (isRecord(firstChoice) && isRecord(firstChoice.message)) {
      if (firstChoice.message.content === null) {
        details.push("assistant.content=null");
      }

      if (firstChoice.message.reasoning_content === null) {
        details.push("reasoning_content=null");
      }
    }

    if (isRecord(firstChoice) && typeof firstChoice.finish_reason === "string") {
      details.push(`finish_reason=${firstChoice.finish_reason}`);
    }
  }

  if (Array.isArray(payload.output) && payload.output.length === 0) {
    details.push("output=[]");
  }

  if (typeof payload.status === "string" && payload.status.trim()) {
    details.push(`status=${payload.status.trim()}`);
  }

  if (isRecord(payload.usage)) {
    const completionTokens = payload.usage.completion_tokens;

    if (typeof completionTokens === "number" && Number.isFinite(completionTokens)) {
      details.push(`completion_tokens=${completionTokens}`);
    }
  }

  return details.length > 0 ? details.join(", ") : null;
}

function buildOpenAiEmptyOutputNote(
  provider: LlmProvider,
  surfaceLabel: string,
  payload: unknown,
) {
  const providerLabel = getAiProviderLabel(provider);
  const details = describeOpenAiEmptyPayload(payload);

  return details
    ? `${providerLabel} ${surfaceLabel} 返回 200 但正文为空（${details}）。当前网关可能不兼容该输出模式。`
    : `${providerLabel} ${surfaceLabel} 返回 200 但正文为空。当前网关可能不兼容该输出模式。`;
}

const promptCustomizationResponsesTimeoutMs = 10_000;
const promptCustomizationStructuredChatTimeoutMs = 8_000;
const promptCustomizationFallbackChatTimeoutMs = 3_000;

function getPromptCustomizationTransportTimeoutMs(
  config: Pick<LlmProviderConfig, "baseUrl" | "provider">,
  requestLabel: "responses" | "json_schema" | "structured_json" | "json_object" | "plain_text_json",
) {
  if (requestLabel === "responses") {
    return promptCustomizationResponsesTimeoutMs;
  }

  if (requestLabel === "json_schema" || requestLabel === "structured_json") {
    return promptCustomizationStructuredChatTimeoutMs;
  }

  return promptCustomizationFallbackChatTimeoutMs;
}

async function fetchWithPromptCustomizationDeadline(
  url: string,
  options: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error(`deadline-exceeded:${timeoutMs}`));
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function isPromptCustomizationTimeoutError(error: unknown) {
  return error instanceof Error && /deadline-exceeded|timeout/i.test(error.message);
}

function normalizeOpenAiColorOverrides(
  value: unknown,
): Partial<Record<PromptCustomizationColorSlot, PromptCustomizationColorOverride>> {
  if (!isRecord(value)) {
    return {};
  }

  const slots: PromptCustomizationColorSlot[] = [
    "bodyColor",
    "detailColor",
    "accentColor",
    "glowColor",
    "accessoryColor",
  ];

  const overrides: Partial<Record<PromptCustomizationColorSlot, PromptCustomizationColorOverride>> = {};

  for (const slot of slots) {
    const entry = value[slot];

    if (!isRecord(entry)) {
      continue;
    }

    const hex = typeof entry.hex === "string" ? normalizeHexColor(entry.hex) : null;

    if (!hex) {
      continue;
    }

    overrides[slot] = {
      slot,
      label:
        typeof entry.label === "string" && entry.label.trim()
          ? entry.label.trim()
          : hex,
      hex,
      sourceText:
        typeof entry.sourceText === "string" && entry.sourceText.trim()
          ? entry.sourceText.trim()
          : hex,
      requestedText:
        typeof entry.requestedText === "string" && entry.requestedText.trim()
          ? entry.requestedText.trim()
          : undefined,
      resolutionSource:
        entry.resolutionSource === "preset" ||
        entry.resolutionSource === "direct-value" ||
        entry.resolutionSource === "named-semantic" ||
        entry.resolutionSource === "ai-approximation"
          ? entry.resolutionSource
          : undefined,
      approximationReason:
        typeof entry.approximationReason === "string" && entry.approximationReason.trim()
          ? entry.approximationReason.trim()
          : undefined,
    };
  }

  return overrides;
}

function buildAccessoryColorIntentFromText(colorText: string | undefined) {
  if (typeof colorText !== "string" || !colorText.trim()) {
    return undefined;
  }

  const palette = findFlexibleColorPalette(normalizePrompt(colorText));
  return palette?.palette.accessoryColor;
}

function normalizeOpenAiPrototypeCandidates(value: unknown): PrototypeCandidate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const candidateMap = new Map<string, PrototypeCandidate>();

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== "string") {
      continue;
    }

    const id = entry.id.trim().toLowerCase();

    if (!id) {
      continue;
    }

    const nextCandidate = {
      id,
      confidence:
        typeof entry.confidence === "number"
          ? clampConfidence(entry.confidence)
          : 0.76,
      source: "llm" as const,
    } satisfies PrototypeCandidate;
    const existing = candidateMap.get(id);

    if (!existing || nextCandidate.confidence > existing.confidence) {
      candidateMap.set(id, nextCandidate);
    }
  }

  return [...candidateMap.values()].sort((left, right) => right.confidence - left.confidence);
}

function normalizeOpenAiSemanticTraits(value: unknown): SemanticTrait[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value)].filter(
    (entry): entry is SemanticTrait =>
      typeof entry === "string" &&
      semanticTraits.includes(entry as (typeof semanticTraits)[number]),
  );
}

function normalizeOpenAiNegativeLookalikes(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
  );
}

function mergeSemanticPrototypeCandidates(
  primary: PrototypeCandidate[],
  fallback: PrototypeCandidate[],
) {
  const candidateMap = new Map<string, PrototypeCandidate>();

  for (const candidate of [...primary, ...fallback]) {
    const normalizedCandidate = {
      ...candidate,
      id: candidate.id.trim().toLowerCase(),
      confidence: clampConfidence(candidate.confidence),
      source: prototypeCandidateSources.includes(candidate.source)
        ? candidate.source
        : ("rule-fallback" as const),
    } satisfies PrototypeCandidate;
    const existing = candidateMap.get(normalizedCandidate.id);

    if (!existing || normalizedCandidate.confidence > existing.confidence) {
      candidateMap.set(normalizedCandidate.id, normalizedCandidate);
    }
  }

  return [...candidateMap.values()].sort((left, right) => right.confidence - left.confidence);
}

function buildOpenAiSemanticContracts(
  requests: OpenAiCustomizationPayload["accessoryRequests"],
  mergedAccessoryRequests: PromptCustomizationAccessoryRequest[],
) {
  if (!Array.isArray(requests) || requests.length === 0) {
    return [];
  }

  return mergedAccessoryRequests
    .filter((request) => request.requestId !== "theme-default-request")
    .flatMap((request, index) => {
      const entry = requests[index];

      if (!entry) {
        return [];
      }

      const prototypeCandidates = normalizeOpenAiPrototypeCandidates(
        entry.prototypeCandidates,
      );
      const traits = normalizeOpenAiSemanticTraits(entry.traits);
      const negativeLookalikes = normalizeOpenAiNegativeLookalikes(
        entry.negativeLookalikes,
      );

      if (
        prototypeCandidates.length === 0 &&
        traits.length === 0 &&
        negativeLookalikes.length === 0
      ) {
        return [];
      }

      return [
        {
          requestId: request.requestId,
          requestedNoun:
            request.requestedNoun ??
            request.requestedLabel ??
            request.shapeLabel ??
            request.label,
          prototypeCandidates,
          traits,
          negativeLookalikes,
        } satisfies PromptSemanticContractV2,
      ];
    });
}

function mergeSemanticContractsWithFallback(
  primaryContracts: PromptSemanticContractV2[],
  fallbackContracts: PromptSemanticContractV2[],
) {
  const primaryMap = new Map(primaryContracts.map((contract) => [contract.requestId, contract]));

  return fallbackContracts.map((fallbackContract) => {
    const primaryContract = primaryMap.get(fallbackContract.requestId);

    if (!primaryContract) {
      return fallbackContract;
    }

    return {
      requestId: fallbackContract.requestId,
      requestedNoun: fallbackContract.requestedNoun,
      prototypeCandidates: mergeSemanticPrototypeCandidates(
        primaryContract.prototypeCandidates,
        fallbackContract.prototypeCandidates,
      ),
      traits: [
        ...new Set<SemanticTrait>([
          ...primaryContract.traits,
          ...fallbackContract.traits,
        ]),
      ],
      negativeLookalikes: uniqueStrings([
        ...primaryContract.negativeLookalikes,
        ...fallbackContract.negativeLookalikes,
      ]),
    } satisfies PromptSemanticContractV2;
  });
}

function normalizeOpenAiAccessoryRequests(
  requests: OpenAiCustomizationPayload["accessoryRequests"],
  fallback: PromptCustomizationRecipe,
) {
  if (!Array.isArray(requests) || requests.length === 0) {
    return [];
  }

  return requests.map((entry, index) => {
    const rawLabel = sanitizeAccessoryRequestedLabel(
      entry.requestedLabel ?? entry.requestedNoun ?? `未命名配件-${index + 1}`,
    );
    const requestedNoun =
      normalizeRequestedNoun(entry.requestedNoun ?? rawLabel) ?? rawLabel;
    const familyGuess =
      entry.familyGuess ??
      resolveAccessoryFamilyGuess(requestedNoun, null).family;
    const familyResolutionSource =
      entry.familyResolutionSource ?? "openai";
    const defaultAnchor = getDefaultAnchorForAccessoryFamily(familyGuess);
    const resolvedAnchor = resolveAccessoryAnchor(
      entry.requestedAnchorPhrase ?? rawLabel,
      defaultAnchor,
    );
    const anchorResolution = normalizeRequestedAnchor(
      resolvedAnchor,
      fallback.customizationProfile,
    );
    const colorIntent = buildAccessoryColorIntentFromText(entry.requestedColorText);
    const instances = buildAccessoryInstances(
      [anchorResolution.resolvedAnchor],
      1,
      colorIntent,
      index,
    );

    return {
      requestId: `openai-req-${index}`,
      requestedLabel: rawLabel,
      requestedNoun,
      nounSpan: entry.nounSpan ?? rawLabel,
      nounGloss: entry.nounGloss ?? requestedNoun,
      objectCategory: entry.objectCategory,
      designConfidence: entry.designConfidence,
      mustDistinctFromFallback: entry.mustDistinctFromFallback ?? familyResolutionSource === "open-noun",
      label: rawLabel,
      shapeLabel: rawLabel,
      family: familyGuess,
      familyGuess,
      familyResolutionSource,
      semanticClass: getAccessorySemanticClass(familyGuess),
      anchor: anchorResolution.resolvedAnchor,
      requestedAnchorPhrase:
        entry.requestedAnchorPhrase ??
        detectRequestedAnchorPhrase(
          entry.requestedAnchorPhrase ?? rawLabel,
          anchorResolution.resolvedAnchor,
        ),
      anchorResolutionSource: anchorResolution.anchorResolutionSource,
      sourceText: rawLabel,
      priority: 700,
      instances,
      ...(colorIntent ? { colorIntent } : {}),
      ...(colorIntent ? { requestedColor: colorIntent } : {}),
      styleIntent: fallback.themeLabel,
      shapeHint: requestedNoun,
      requestedText: rawLabel,
      executionMode: stableAccessoryFamilies.has(familyGuess)
        ? "stable-add"
        : fallback.customizationProfile === "experimental-addon"
          ? "runtime-generated"
          : "approximate-fallback",
      resolvedLabel: rawLabel,
      allowApproximation: entry.allowApproximation ?? true,
      mustKeep: entry.mustKeep ?? true,
      notes: ["这条配件请求来自 AI accessoryRequests[] 结构化合同。"],
    } satisfies PromptCustomizationAccessoryRequest;
  });
}

function isLowFidelityAccessoryLabel(label: string | undefined) {
  if (typeof label !== "string" || !label.trim()) {
    return true;
  }

  const normalizedLabel = sanitizeAccessoryRequestedLabel(label);

  return (
    /^未命名配件-\d+$/u.test(normalizedLabel) ||
    normalizedLabel === "未命名配件" ||
    normalizedLabel === "装饰挂件" ||
    normalizedLabel === "挂件" ||
    normalizedLabel === "挂饰" ||
    normalizedLabel === "装饰" ||
    normalizedLabel === "配饰" ||
    normalizedLabel === "饰物" ||
    normalizedLabel === "饰品"
  );
}

type AccessoryRequestContractMergeResult = {
  requests: PromptCustomizationAccessoryRequest[];
  rescuedFallbackFields: boolean;
  rescuedMissingRequests: boolean;
};

function cloneAccessoryInstances(instances: PromptCustomizationAccessoryInstance[]) {
  return instances.map((instance) => ({
    ...instance,
    ...(instance.colorIntent ? { colorIntent: instance.colorIntent } : {}),
  }));
}

function buildFallbackRescuedInstances(
  openAiInstances: PromptCustomizationAccessoryInstance[],
  fallbackInstances: PromptCustomizationAccessoryInstance[],
  options: {
    rescueAnchor: boolean;
    rescueColor: boolean;
  },
) {
  if (!options.rescueAnchor && !options.rescueColor) {
    return cloneAccessoryInstances(openAiInstances);
  }

  const mergedInstances: PromptCustomizationAccessoryInstance[] = [];
  const total = Math.max(openAiInstances.length, fallbackInstances.length);

  for (let index = 0; index < total; index += 1) {
    const openAiInstance = openAiInstances[index];
    const fallbackInstance = fallbackInstances[index];

    if (!openAiInstance && fallbackInstance) {
      mergedInstances.push({
        ...fallbackInstance,
        ...(fallbackInstance.colorIntent
          ? { colorIntent: fallbackInstance.colorIntent }
          : {}),
      });
      continue;
    }

    if (!openAiInstance) {
      continue;
    }

    mergedInstances.push({
      ...openAiInstance,
      ...(options.rescueAnchor && fallbackInstance
        ? { anchor: fallbackInstance.anchor }
        : {}),
      ...(options.rescueColor &&
      !openAiInstance.colorIntent &&
      fallbackInstance?.colorIntent
        ? { colorIntent: fallbackInstance.colorIntent }
        : {}),
    });
  }

  return mergedInstances;
}

function mergeSingleAccessoryRequestContract(
  openAiRequest: PromptCustomizationAccessoryRequest | undefined,
  openAiEntry: OpenAiAccessoryRequestEntry | undefined,
  fallbackRequest: PromptCustomizationAccessoryRequest | undefined,
) {
  if (!fallbackRequest) {
    return {
      request: openAiRequest,
      rescuedFallbackFields: false,
      rescuedMissingRequest: false,
    };
  }

  if (!openAiRequest) {
    return {
      request: fallbackRequest,
      rescuedFallbackFields: false,
      rescuedMissingRequest: true,
    };
  }

  const openAiLabel =
    openAiRequest.requestedLabel ?? openAiRequest.shapeLabel ?? openAiRequest.label;
  const fallbackLabel =
    fallbackRequest.requestedLabel ?? fallbackRequest.shapeLabel ?? fallbackRequest.label;
  const openAiHasSpecificLiteral =
    !isLowFidelityAccessoryLabel(openAiLabel) &&
    !isLowFidelityAccessoryLabel(openAiRequest.requestedNoun);
  const fallbackHasSpecificLiteral =
    !isLowFidelityAccessoryLabel(fallbackLabel) ||
    !isLowFidelityAccessoryLabel(fallbackRequest.requestedNoun);
  const rescueLiteral = !openAiHasSpecificLiteral && fallbackHasSpecificLiteral;
  const rescueAnchor =
    (!openAiEntry?.requestedAnchorPhrase || !openAiEntry.requestedAnchorPhrase.trim()) &&
    fallbackRequest.anchor !== openAiRequest.anchor;
  const rescueColor =
    (!openAiEntry?.requestedColorText || !openAiEntry.requestedColorText.trim()) &&
    !openAiRequest.requestedColor &&
    !openAiRequest.colorIntent &&
    Boolean(fallbackRequest.requestedColor ?? fallbackRequest.colorIntent);
  const rescueSemanticShape =
    rescueLiteral &&
    (fallbackRequest.family !== openAiRequest.family ||
      fallbackRequest.familyGuess !== openAiRequest.familyGuess ||
      fallbackRequest.semanticClass !== openAiRequest.semanticClass ||
      fallbackRequest.runtimeShapeClass !== openAiRequest.runtimeShapeClass ||
      fallbackRequest.objectCategory !== openAiRequest.objectCategory);

  const mergedInstances = buildFallbackRescuedInstances(
    openAiRequest.instances,
    fallbackRequest.instances,
    {
      rescueAnchor,
      rescueColor,
    },
  );

  const mergedRequest = {
    ...openAiRequest,
    instances: mergedInstances,
    ...(rescueLiteral
      ? {
          requestedLabel: fallbackRequest.requestedLabel ?? fallbackLabel,
          requestedNoun:
            fallbackRequest.requestedNoun ??
            normalizeRequestedNoun(fallbackLabel) ??
            openAiRequest.requestedNoun,
          nounSpan:
            fallbackRequest.nounSpan ??
            fallbackRequest.requestedLabel ??
            fallbackRequest.shapeLabel ??
            fallbackRequest.label,
          nounGloss:
            fallbackRequest.nounGloss ??
            fallbackRequest.requestedNoun ??
            normalizeRequestedNoun(fallbackLabel) ??
            openAiRequest.nounGloss,
          label: fallbackRequest.label,
          shapeLabel: fallbackRequest.shapeLabel,
          sourceText: fallbackRequest.sourceText,
          shapeHint:
            fallbackRequest.shapeHint ??
            fallbackRequest.requestedNoun ??
            normalizeRequestedNoun(fallbackLabel) ??
            openAiRequest.shapeHint,
          requestedText: fallbackRequest.requestedText ?? openAiRequest.requestedText,
          resolvedLabel: fallbackRequest.resolvedLabel ?? fallbackRequest.label,
          family: fallbackRequest.family,
          familyGuess: fallbackRequest.familyGuess,
          familyResolutionSource:
            fallbackRequest.familyResolutionSource ??
            openAiRequest.familyResolutionSource,
          semanticClass: fallbackRequest.semanticClass,
          runtimeShapeClass:
            fallbackRequest.runtimeShapeClass ?? openAiRequest.runtimeShapeClass,
          objectCategory:
            fallbackRequest.objectCategory ?? openAiRequest.objectCategory,
          designConfidence:
            typeof fallbackRequest.designConfidence === "number"
              ? fallbackRequest.designConfidence
              : openAiRequest.designConfidence,
          executionMode: fallbackRequest.executionMode,
        }
      : {}),
    ...(rescueAnchor
      ? {
          anchor: fallbackRequest.anchor,
          requestedAnchorPhrase:
            fallbackRequest.requestedAnchorPhrase ?? openAiRequest.requestedAnchorPhrase,
          anchorResolutionSource:
            fallbackRequest.anchorResolutionSource ?? openAiRequest.anchorResolutionSource,
        }
      : {}),
    ...(rescueColor
      ? {
          colorIntent: fallbackRequest.colorIntent ?? fallbackRequest.requestedColor,
          requestedColor: fallbackRequest.requestedColor ?? fallbackRequest.colorIntent,
        }
      : {}),
    notes: uniqueStrings([
      ...(openAiRequest.notes ?? []),
      rescueLiteral ? "AI noun 标签较弱，已按显式 prompt 文本补全 literal noun。" : null,
      rescueSemanticShape
        ? "AI 形状语义较弱，已按显式 prompt 文本补全 family / semantic class / runtime shape。"
        : null,
      rescueAnchor ? "AI 未给出显式挂点，已按 prompt 文本补全锚点。" : null,
      rescueColor ? "AI 未给出显式配件颜色，已按 prompt 文本补全颜色。" : null,
    ]),
  } satisfies PromptCustomizationAccessoryRequest;

  return {
    request: mergedRequest,
    rescuedFallbackFields:
      rescueLiteral || rescueSemanticShape || rescueAnchor || rescueColor,
    rescuedMissingRequest: false,
  };
}

function mergeAccessoryRequestContracts(
  openAiRequests: PromptCustomizationAccessoryRequest[],
  openAiEntries: OpenAiCustomizationPayload["accessoryRequests"],
  fallbackRequests: PromptCustomizationAccessoryRequest[],
): AccessoryRequestContractMergeResult {
  if (openAiRequests.length === 0) {
    return {
      requests: fallbackRequests,
      rescuedFallbackFields: false,
      rescuedMissingRequests: fallbackRequests.length > 0,
    };
  }

  if (fallbackRequests.length === 0) {
    return {
      requests: openAiRequests,
      rescuedFallbackFields: false,
      rescuedMissingRequests: false,
    };
  }

  let rescuedFallbackFields = false;
  let rescuedMissingRequests = false;
  const mergedRequests: PromptCustomizationAccessoryRequest[] = [];
  const total = Math.max(openAiRequests.length, fallbackRequests.length);

  for (let index = 0; index < total; index += 1) {
    const mergedResult = mergeSingleAccessoryRequestContract(
      openAiRequests[index],
      openAiEntries?.[index],
      fallbackRequests[index],
    );

    if (!mergedResult.request) {
      continue;
    }

    rescuedFallbackFields ||= mergedResult.rescuedFallbackFields;
    rescuedMissingRequests ||= mergedResult.rescuedMissingRequest;
    mergedRequests.push(mergedResult.request);
  }

  return {
    requests: mergedRequests,
    rescuedFallbackFields,
    rescuedMissingRequests,
  };
}

function normalizeOpenAiGeneratedAccessoryAnchor(
  anchor: unknown,
): PromptCustomizationAccessoryAnchor | undefined {
  if (anchor === "head") {
    return "forehead";
  }

  if (anchor === "chest") {
    return "chest-center";
  }

  return typeof anchor === "string" &&
    openAiAccessoryAnchorEnum.includes(anchor as (typeof openAiAccessoryAnchorEnum)[number])
    ? (anchor as PromptCustomizationAccessoryAnchor)
    : undefined;
}

function normalizeOpenAiLocalTweak(
  value: unknown,
  kind: "earSize" | "tailFluff" | "eyeSize" | "glowIntensity",
): PromptCustomizationLocalTweak | undefined {
  if (!isRecord(value) || typeof value.level !== "string") {
    return undefined;
  }

  const sourceText =
    typeof value.sourceText === "string" && value.sourceText.trim()
      ? value.sourceText.trim()
      : undefined;

  if (kind === "glowIntensity") {
    if (value.level === "stronger") {
      return createTweak("发光更强", "stronger", 1.24, true, sourceText);
    }

    if (value.level === "weaker") {
      return createTweak("发光更弱", "weaker", 0.72, true, sourceText);
    }

    return undefined;
  }

  if (value.level === "larger") {
    return createTweak(
      kind === "tailFluff"
        ? "尾巴更蓬"
        : kind === "eyeSize"
          ? "眼睛更大"
          : "耳朵更大",
      "larger",
      kind === "tailFluff" ? 1.08 : kind === "eyeSize" ? 1.08 : 1,
      false,
      sourceText,
    );
  }

  if (value.level === "smaller") {
    return createTweak(
      kind === "tailFluff"
        ? "尾巴更收"
        : kind === "eyeSize"
          ? "眼睛更收"
          : "耳朵更小",
      "smaller",
      kind === "tailFluff" ? 0.94 : kind === "eyeSize" ? 0.96 : 1,
      false,
      sourceText,
    );
  }

  return undefined;
}

function sanitizeOpenAiPayload(value: unknown): OpenAiCustomizationPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    themeSlot: typeof value.themeSlot === "string" ? value.themeSlot : undefined,
    themeReason:
      typeof value.themeReason === "string" ? value.themeReason : undefined,
    colorOverrides: normalizeOpenAiColorOverrides(value.colorOverrides),
    accessoryRequests: Array.isArray(value.accessoryRequests)
      ? value.accessoryRequests
          .filter((entry) => isRecord(entry))
          .map((entry) => ({
            requestedLabel:
              typeof entry.requestedLabel === "string"
                ? entry.requestedLabel
                : undefined,
            requestedNoun:
              typeof entry.requestedNoun === "string"
                ? entry.requestedNoun
                : undefined,
            nounSpan:
              typeof entry.nounSpan === "string" ? entry.nounSpan : undefined,
            nounGloss:
              typeof entry.nounGloss === "string" ? entry.nounGloss : undefined,
            objectCategory:
              typeof entry.objectCategory === "string"
                ? (entry.objectCategory as PromptCustomizationObjectCategory)
                : undefined,
            designConfidence:
              typeof entry.designConfidence === "number"
                ? clampConfidence(entry.designConfidence)
                : undefined,
            mustDistinctFromFallback:
              typeof entry.mustDistinctFromFallback === "boolean"
                ? entry.mustDistinctFromFallback
                : undefined,
            requestedAnchorPhrase:
              typeof entry.requestedAnchorPhrase === "string"
                ? entry.requestedAnchorPhrase
                : undefined,
            requestedColorText:
              typeof entry.requestedColorText === "string"
                ? entry.requestedColorText
                : undefined,
            familyGuess:
              typeof entry.familyGuess === "string"
                ? (entry.familyGuess as PromptCustomizationAccessoryFamily)
                : undefined,
            familyResolutionSource:
              entry.familyResolutionSource === "known-family" ||
              entry.familyResolutionSource === "open-noun" ||
              entry.familyResolutionSource === "suffix-fallback" ||
              entry.familyResolutionSource === "openai"
                ? entry.familyResolutionSource
                : undefined,
            prototypeCandidates: normalizeOpenAiPrototypeCandidates(
              entry.prototypeCandidates,
            ),
            traits: normalizeOpenAiSemanticTraits(entry.traits),
            negativeLookalikes: normalizeOpenAiNegativeLookalikes(
              entry.negativeLookalikes,
            ),
            mustKeep:
              typeof entry.mustKeep === "boolean" ? entry.mustKeep : undefined,
            allowApproximation:
              typeof entry.allowApproximation === "boolean"
                ? entry.allowApproximation
                : undefined,
          }))
      : undefined,
    accessoryOperation: isRecord(value.accessoryOperation)
      ? {
          type:
            typeof value.accessoryOperation.type === "string"
              ? (value.accessoryOperation.type as PromptCustomizationAccessoryOperation["type"])
              : undefined,
          accessoryKey:
            typeof value.accessoryOperation.accessoryKey === "string"
              ? value.accessoryOperation.accessoryKey
              : undefined,
          label:
            typeof value.accessoryOperation.label === "string"
              ? value.accessoryOperation.label
              : undefined,
          sourceText:
            typeof value.accessoryOperation.sourceText === "string"
              ? value.accessoryOperation.sourceText
              : undefined,
        }
      : undefined,
    generatedAccessory:
      isRecord(value.generatedAccessory) && typeof value.generatedAccessory.kind === "string"
        ? {
            kind: value.generatedAccessory.kind as PromptCustomizationGeneratedAccessoryKind,
            label:
              typeof value.generatedAccessory.label === "string"
                ? value.generatedAccessory.label
                : undefined,
            anchor: normalizeOpenAiGeneratedAccessoryAnchor(
              value.generatedAccessory.anchor,
            ),
            sourceText:
              typeof value.generatedAccessory.sourceText === "string"
                ? value.generatedAccessory.sourceText
                : undefined,
          }
        : value.generatedAccessory === null
          ? null
          : undefined,
    localTweaks: isRecord(value.localTweaks)
      ? {
          earSize: normalizeOpenAiLocalTweak(value.localTweaks.earSize, "earSize"),
          tailFluff: normalizeOpenAiLocalTweak(value.localTweaks.tailFluff, "tailFluff"),
          eyeSize: normalizeOpenAiLocalTweak(value.localTweaks.eyeSize, "eyeSize"),
          glowIntensity: normalizeOpenAiLocalTweak(
            value.localTweaks.glowIntensity,
            "glowIntensity",
          ),
        }
      : undefined,
    negations: Array.isArray(value.negations)
      ? value.negations.filter((entry): entry is string => typeof entry === "string")
      : undefined,
    unsupportedRequests: Array.isArray(value.unsupportedRequests)
      ? value.unsupportedRequests.filter((entry): entry is string => typeof entry === "string")
      : undefined,
    unsupportedNotes: Array.isArray(value.unsupportedNotes)
      ? value.unsupportedNotes.filter((entry): entry is string => typeof entry === "string")
      : undefined,
    confidence:
      typeof value.confidence === "number" ? clampConfidence(value.confidence) : undefined,
  };
}

function normalizeVectorTuple(value: unknown) {
  if (!Array.isArray(value) || value.length !== 3) {
    return null;
  }

  const numbers = value.map((entry) =>
    typeof entry === "number" && Number.isFinite(entry) ? Number(entry.toFixed(4)) : NaN,
  );

  return numbers.every((entry) => Number.isFinite(entry))
    ? (numbers as [number, number, number])
    : null;
}

function sanitizeOpenAiAccessoryDesignPayload(
  value: unknown,
): OpenAiAccessoryDesignPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    plans: Array.isArray(value.plans)
      ? value.plans
          .filter((entry) => isRecord(entry))
          .map((entry) => ({
            taskId: typeof entry.taskId === "string" ? entry.taskId : undefined,
            designArchetype:
              typeof entry.designArchetype === "string"
                ? (entry.designArchetype as PromptCustomizationDesignArchetype)
                : undefined,
            semanticClass:
              typeof entry.semanticClass === "string"
                ? (entry.semanticClass as PromptCustomizationAccessorySemanticClass)
                : undefined,
            shapeDescription:
              typeof entry.shapeDescription === "string"
                ? entry.shapeDescription
                : undefined,
            criticalParts: Array.isArray(entry.criticalParts)
              ? entry.criticalParts.filter((part): part is string => typeof part === "string")
              : undefined,
            optionalParts: Array.isArray(entry.optionalParts)
              ? entry.optionalParts.filter((part): part is string => typeof part === "string")
              : undefined,
            partGraphIntent:
              typeof entry.partGraphIntent === "string"
                ? entry.partGraphIntent
                : undefined,
            profileCurves: Array.isArray(entry.profileCurves)
              ? entry.profileCurves.filter((curve): curve is string => typeof curve === "string")
              : undefined,
            silhouetteHints: Array.isArray(entry.silhouetteHints)
              ? entry.silhouetteHints.filter((hint): hint is string => typeof hint === "string")
              : undefined,
            negativeLookalikes: Array.isArray(entry.negativeLookalikes)
              ? entry.negativeLookalikes.filter((hint): hint is string => typeof hint === "string")
              : undefined,
            repairPriorities: Array.isArray(entry.repairPriorities)
              ? entry.repairPriorities.filter((hint): hint is string => typeof hint === "string")
              : undefined,
            hangingStrategy:
              typeof entry.hangingStrategy === "string"
                ? entry.hangingStrategy
                : undefined,
            fallbackFamily:
              typeof entry.fallbackFamily === "string"
                ? (entry.fallbackFamily as PromptCustomizationAccessoryFamily)
                : undefined,
            parts: Array.isArray(entry.parts)
              ? entry.parts
                  .filter((part) => isRecord(part))
                  .map((part) => ({
                    partId: typeof part.partId === "string" ? part.partId : undefined,
                    primitive:
                      typeof part.primitive === "string"
                        ? (part.primitive as PromptCustomizationGeometryRecipe["parts"][number]["primitive"])
                        : undefined,
                    role: typeof part.role === "string" ? part.role : undefined,
                    size:
                      typeof part.size === "number" && Number.isFinite(part.size)
                        ? Number(part.size.toFixed(4))
                        : undefined,
                    offset: normalizeVectorTuple(part.offset) ?? undefined,
                    scale: normalizeVectorTuple(part.scale) ?? undefined,
                    rotation: normalizeVectorTuple(part.rotation) ?? undefined,
                  }))
              : undefined,
          }))
      : undefined,
    notes: Array.isArray(value.notes)
      ? value.notes.filter((note): note is string => typeof note === "string")
      : undefined,
  };
}

function buildOpenAiAccessoryDesignInstruction() {
  return "You are the runtime accessory design planner for PromptPet-AR. You do not redesign the fox body. You only convert explicit accessory requests into structured low-poly runtime design hints. Preserve the fixed fox silhouette and respect each resolved curve anchor, including left-ear, right-ear, forehead, head-top, back-head, chest-center, chest-left, chest-right, tail-top, tail-left, tail-right and tail-base. Each task may already include capabilityBundle, prototypeCandidates, traits, and retrievalMatches; treat them as the preferred semantic contract unless they clearly contradict the literal requested noun. For each task, keep the literal requested noun, choose the best internal design archetype, describe the critical parts, optional parts, part-graph intent, hanging strategy, negative lookalikes, repair priorities, and simple low-poly parts. Prioritize noun fidelity over generic family reuse. The result must stay anchored, color-separated and legible from front / 3-4 / side views. Prefer simple readable low-poly shapes. Fish should read as fish, berry/strawberry as berry, cloud as cloud, candle as candle, key as key, feather as feather, forest as clustered forest motif, and other ornaments as the closest readable charm without pretending a generic token fully implements the noun. Do not silently drop any task. If unsure, keep the task and provide an approximate fallback family.";
}

function buildOpenAiAccessoryDesignInput(recipe: PromptCustomizationRecipe) {
  return {
    themeLabel: recipe.themeLabel,
    customizationProfile: recipe.customizationProfile,
    runtimeAttemptBudgetMs: recipe.runtimeAttemptBudgetMs ?? 300000,
    bodyCustomization: recipe.bodyCustomization,
    runtimeDesignTasks: recipe.runtimeDesignTasks.map((task) => ({
      taskId: task.taskId,
      requestLabel: task.requestLabel,
      requestedNoun: task.requestedNoun,
      capabilityBundle: task.capabilityBundle,
      prototypeCandidates: task.prototypeCandidates,
      traits: task.traits,
      retrievalMatches: task.retrievalMatches?.map((match) => ({
        prototypeId: match.prototypeId,
        score: match.score,
        matchedTraits: match.matchedTraits,
        referenceIds: match.referenceIds,
      })),
      nounSpan: task.nounSpan,
      nounGloss: task.nounGloss,
      objectCategory: task.objectCategory,
      designArchetype: task.designArchetype,
      designConfidence: task.designConfidence,
      mustDistinctFromFallback: task.mustDistinctFromFallback,
      family: task.family,
      semanticClass: task.semanticClass,
      shapeIntent: task.shapeIntent,
      shapeDescription: task.shapeDescription,
      criticalParts: task.criticalParts,
      optionalParts: task.optionalParts,
      partGraphIntent: task.partGraphIntent,
      anchor: task.anchor,
      requestedAnchorPhrase: task.requestedAnchorPhrase,
      anchorResolutionSource: task.anchorResolutionSource,
      instanceCount: task.instanceCount,
      requestedColor: task.requestedColor?.label,
      requestedColorText: task.requestedColorText,
      styleHints: task.styleHints,
      silhouetteHints: task.silhouetteHints,
      silhouetteGoals: task.silhouetteGoals,
      negativeLookalikes: task.negativeLookalikes,
      repairPriorities: task.repairPriorities,
      hangingStrategy: task.hangingStrategy,
      allowApproximation: task.allowApproximation,
    })),
  };
}

function hasPlannerContractPayload(
  plan: NonNullable<OpenAiAccessoryDesignPayload["plans"]>[number] | undefined,
) {
  if (!plan) {
    return false;
  }

  return Boolean(
    typeof plan.designArchetype === "string" ||
      typeof plan.shapeDescription === "string" ||
      typeof plan.partGraphIntent === "string" ||
      typeof plan.hangingStrategy === "string" ||
      (Array.isArray(plan.criticalParts) && plan.criticalParts.length > 0) ||
      (Array.isArray(plan.optionalParts) && plan.optionalParts.length > 0) ||
      (Array.isArray(plan.parts) && plan.parts.length > 0),
  );
}

function resolvePlannerGeometrySource(
  plan: NonNullable<OpenAiAccessoryDesignPayload["plans"]>[number] | undefined,
  plannedPartCount: number,
  fallbackPartCount: number,
): PromptCustomizationRuntimeDesignSource {
  if (!hasPlannerContractPayload(plan)) {
    return "rule-compiler";
  }

  const requiredPartCount = Math.max(2, Math.floor(fallbackPartCount / 2));
  return plannedPartCount >= requiredPartCount ? "ai-planner" : "hybrid";
}

function shouldPreserveStableRuntimeTopology(
  geometryRecipe: PromptCustomizationGeometryRecipe,
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass | undefined,
) {
  return (
    isSpecificRuntimeShapeClass(runtimeShapeClass) &&
    (
      geometryRecipe.sourceMode === "canonical-blueprint" ||
      geometryRecipe.sourceMode === "cached-reference"
    )
  );
}

function mergePlannerPartsIntoStableTopology(
  geometryRecipe: PromptCustomizationGeometryRecipe,
  plannedParts: PromptCustomizationGeometryRecipe["parts"],
  runtimeShapeClass: PromptCustomizationRuntimeShapeClass | undefined,
) {
  const preserveStableGeometry = shouldPreserveStableRuntimeTopology(
    geometryRecipe,
    runtimeShapeClass,
  );

  if (
    !preserveStableGeometry ||
    !Array.isArray(geometryRecipe.parts) ||
    geometryRecipe.parts.length === 0 ||
    !Array.isArray(plannedParts) ||
    plannedParts.length === 0
  ) {
    return {
      nextParts: plannedParts,
      matchedPlannerPartIds: plannedParts.map((part) => part.partId),
      preservedStableGeometry: false,
    };
  }

  const plannerPartMap = new Map(
    plannedParts.map((part) => [part.partId, part] as const),
  );
  const matchedPlannerPartIds = geometryRecipe.parts
    .map((part) => part.partId)
    .filter((partId) => plannerPartMap.has(partId));

  return {
    nextParts: geometryRecipe.parts,
    matchedPlannerPartIds,
    preservedStableGeometry: true,
  };
}

function normalizePlannerPartIdList(
  plannerPartIds: string[] | undefined,
  basePartIds: string[],
  matchedPlannerPartIds: string[],
) {
  if (!Array.isArray(plannerPartIds) || plannerPartIds.length === 0) {
    return null;
  }

  const matchedSet = new Set(matchedPlannerPartIds);
  const filtered = uniqueStrings(plannerPartIds).filter((partId) => matchedSet.has(partId));

  if (filtered.length === 0) {
    return basePartIds;
  }

  return filtered;
}

function mergeOpenAiAccessoryDesignPlans(
  recipe: PromptCustomizationRecipe,
  payload: OpenAiAccessoryDesignPayload,
  normalizedPrompt: string,
  plannerSource: CustomizationParserSource,
) {
  const planMap = new Map(
    (payload.plans ?? [])
      .filter((plan): plan is NonNullable<OpenAiAccessoryDesignPayload["plans"]>[number] & {
        taskId: string;
      } => typeof plan.taskId === "string")
      .map((plan) => [plan.taskId, plan]),
  );

  const runtimeDesignTasks = recipe.runtimeDesignTasks.map((task) => {
    const plan = planMap.get(task.taskId);

    if (!plan) {
      return task;
    }

    const mergedTask = {
      ...task,
      designArchetype: plan.designArchetype ?? task.designArchetype,
      semanticClass: plan.semanticClass ?? task.semanticClass,
      shapeDescription: plan.shapeDescription ?? task.shapeDescription,
      criticalParts:
        Array.isArray(plan.criticalParts) && plan.criticalParts.length > 0
          ? uniqueStrings(plan.criticalParts)
          : task.criticalParts,
      optionalParts:
        Array.isArray(plan.optionalParts) && plan.optionalParts.length > 0
          ? uniqueStrings(plan.optionalParts)
          : task.optionalParts,
      partGraphIntent: plan.partGraphIntent ?? task.partGraphIntent,
      silhouetteHints: uniqueStrings([
        ...task.silhouetteHints,
        ...(plan.silhouetteHints ?? []),
      ]),
      negativeLookalikes: uniqueStrings([
        ...task.negativeLookalikes,
        ...(plan.negativeLookalikes ?? []),
      ]),
      repairPriorities:
        Array.isArray(plan.repairPriorities) && plan.repairPriorities.length > 0
          ? uniqueStrings(plan.repairPriorities)
          : task.repairPriorities,
      hangingStrategy: plan.hangingStrategy ?? task.hangingStrategy,
      runtimeDesignSource: hasPlannerContractPayload(plan)
        ? ("hybrid" as PromptCustomizationRuntimeDesignSource)
        : task.runtimeDesignSource,
    };

    const preserveStableTaskContract =
      isSpecificRuntimeShapeClass(mergedTask.runtimeShapeClass) &&
      (
        mergedTask.sourceMode === "canonical-blueprint" ||
        mergedTask.sourceMode === "cached-reference"
      );

    if (!preserveStableTaskContract) {
      return mergedTask;
    }

    const rebuiltTask = rebuildRuntimeTaskContract(mergedTask);

    return {
      ...rebuiltTask,
      shapeDescription: plan.shapeDescription ?? rebuiltTask.shapeDescription,
      silhouetteHints: uniqueStrings([
        ...rebuiltTask.silhouetteHints,
        ...(plan.silhouetteHints ?? []),
      ]),
      negativeLookalikes: uniqueStrings([
        ...rebuiltTask.negativeLookalikes,
        ...(plan.negativeLookalikes ?? []),
      ]),
      repairPriorities:
        Array.isArray(plan.repairPriorities) && plan.repairPriorities.length > 0
          ? uniqueStrings(plan.repairPriorities)
          : rebuiltTask.repairPriorities,
      hangingStrategy: plan.hangingStrategy ?? rebuiltTask.hangingStrategy,
    };
  });
  const runtimeTaskMap = new Map(runtimeDesignTasks.map((task) => [task.taskId, task]));

  const geometryRecipes = recipe.geometryRecipes.map((geometryRecipe) => {
    const plan = planMap.get(geometryRecipe.taskId);
    const mergedTask = runtimeTaskMap.get(geometryRecipe.taskId);

    if (!plan) {
      return geometryRecipe;
    }

    const plannedParts =
      plan.parts
        ?.filter(
          (part): part is NonNullable<NonNullable<typeof plan.parts>[number]> & {
            partId: string;
            primitive: PromptCustomizationGeometryRecipe["parts"][number]["primitive"];
            role: string;
            size: number;
            offset: [number, number, number];
            scale: [number, number, number];
          } =>
            typeof part.partId === "string" &&
            typeof part.primitive === "string" &&
            typeof part.role === "string" &&
            typeof part.size === "number" &&
            Array.isArray(part.offset) &&
            Array.isArray(part.scale),
        )
        .map((part) => ({
          partId: part.partId,
          primitive: part.primitive,
          role: part.role,
          size: part.size,
          offset: part.offset,
          scale: part.scale,
          ...(part.rotation ? { rotation: part.rotation } : {}),
          materialZone: "accessory" as const,
        })) ?? [];
    const runtimeShapeClass =
      mergedTask?.runtimeShapeClass ?? geometryRecipe.runtimeShapeClass;
    const { nextParts, matchedPlannerPartIds, preservedStableGeometry } =
      mergePlannerPartsIntoStableTopology(
      geometryRecipe,
      plannedParts,
      runtimeShapeClass,
      );
    const plannerGeometrySource = preservedStableGeometry
      ? ("hybrid" as PromptCustomizationRuntimeDesignSource)
      : resolvePlannerGeometrySource(
          plan,
          matchedPlannerPartIds.length > 0 ? matchedPlannerPartIds.length : plannedParts.length,
          geometryRecipe.parts.length,
        );
    const assemblyRootPartId =
      mergedTask?.assemblyRootPartId ??
      geometryRecipe.assemblyRootPartId ??
      inferAssemblyRootPartId(
        runtimeShapeClass ?? geometryRecipe.family,
        nextParts.map((part) => part.partId),
      );
    const attachmentPartId =
      mergedTask?.attachmentPartId ??
      geometryRecipe.attachmentPartId ??
      inferAttachmentPartId(
        runtimeShapeClass ?? geometryRecipe.family,
        nextParts.map((part) => part.partId),
        [],
      );

    const normalizedCriticalParts = preservedStableGeometry
      ? geometryRecipe.criticalParts
      : normalizePlannerPartIdList(
          Array.isArray(plan.criticalParts) ? uniqueStrings(plan.criticalParts) : undefined,
          geometryRecipe.criticalParts,
          matchedPlannerPartIds,
        );
    const normalizedOptionalParts = preservedStableGeometry
      ? geometryRecipe.optionalParts
      : normalizePlannerPartIdList(
          Array.isArray(plan.optionalParts) ? uniqueStrings(plan.optionalParts) : undefined,
          geometryRecipe.optionalParts,
          matchedPlannerPartIds,
        );

    return {
      ...geometryRecipe,
      designArchetype: plan.designArchetype ?? geometryRecipe.designArchetype,
      semanticClass: plan.semanticClass ?? geometryRecipe.semanticClass,
      runtimeShapeClass,
      runtimeDesignSource:
        plannerGeometrySource === "rule-compiler"
          ? geometryRecipe.runtimeDesignSource
          : plannerGeometrySource,
      criticalParts: normalizedCriticalParts ?? geometryRecipe.criticalParts,
      optionalParts: normalizedOptionalParts ?? geometryRecipe.optionalParts,
      profileCurves: uniqueStrings([
        ...geometryRecipe.profileCurves,
        ...(plan.profileCurves ?? []),
      ]),
      parts: nextParts,
      assemblyRootPartId,
      attachmentPartId,
      partHierarchy: buildRuntimePartHierarchy(
        runtimeShapeClass ?? geometryRecipe.family,
        nextParts.map((part) => part.partId),
        assemblyRootPartId,
        attachmentPartId,
      ),
      basePrimitives: uniqueStrings(nextParts.map((part) => part.primitive)) as PromptCustomizationGeometryRecipe["basePrimitives"],
      sizeBounds: {
        ...geometryRecipe.sizeBounds,
        minPartCount: nextParts.length,
      },
      silhouetteChecks: uniqueStrings([
        ...geometryRecipe.silhouetteChecks,
        ...(plan.silhouetteHints ?? []),
      ]),
      negativeLookalikes: uniqueStrings([
        ...geometryRecipe.negativeLookalikes,
        ...(plan.negativeLookalikes ?? []),
      ]),
      hangingStrategy: plan.hangingStrategy ?? geometryRecipe.hangingStrategy,
      fallbackFamily: plan.fallbackFamily ?? geometryRecipe.fallbackFamily,
    };
  });
  const nounDesignBriefs = buildNounDesignBriefs(runtimeDesignTasks);
  const partGraphs = buildAccessoryPartGraphs(nounDesignBriefs, geometryRecipes);

  return finalizeRecipe(
    {
      ...recipe,
      designPlannerSource: plannerSource,
      runtimeDesignTasks,
      nounDesignBriefs,
      geometryRecipes,
      partGraphs,
      accessoryCustomization: undefined,
      unsupportedNotes: uniqueStrings([
        ...recipe.unsupportedNotes,
        ...(payload.notes ?? []),
      ]),
    },
    normalizedPrompt,
  );
}

function mergeOpenAiRecipe(
  fallback: PromptCustomizationRecipe,
  openAiPayload: OpenAiCustomizationPayload,
  normalizedPrompt: string,
  parserSource: LlmProvider = "openai",
) {
  const providerLabel = getAiProviderLabel(parserSource);
  const normalizedOpenAiAccessoryRequests = normalizeOpenAiAccessoryRequests(
    openAiPayload.accessoryRequests,
    fallback,
  );
  const accessoryMergeResult = mergeAccessoryRequestContracts(
    normalizedOpenAiAccessoryRequests,
    openAiPayload.accessoryRequests,
    fallback.accessoryRequests,
  );
  const mergedAccessoryRequests = accessoryMergeResult.requests;
  const fallbackSemanticContracts = buildPromptSemanticContractsV2(
    mergedAccessoryRequests,
    [],
  );
  const mergedSemanticContracts = mergeSemanticContractsWithFallback(
    buildOpenAiSemanticContracts(
      openAiPayload.accessoryRequests,
      mergedAccessoryRequests,
    ),
    fallbackSemanticContracts,
  );
  const themeSlot =
    typeof openAiPayload.themeSlot === "string" && openAiPayload.themeSlot in themeKeywords
      ? openAiPayload.themeSlot
      : fallback.themeSlot;
  const themeLabel = getFoxThemeLabel(themeSlot as never);
  const themeReason = (() => {
    const candidate =
      typeof openAiPayload.themeReason === "string" && openAiPayload.themeReason.trim()
        ? openAiPayload.themeReason.trim()
        : fallback.themeReason;

    const otherThemeLabels = Object.keys(themeKeywords)
      .filter((slot) => slot !== themeSlot)
      .map((slot) => getFoxThemeLabel(slot as never));

    return otherThemeLabels.some((label) => candidate.includes(label))
      ? `当前结果最终落在 ${themeLabel} 主题槽位；颜色、配饰和局部细节继续按 prompt 的动态覆盖执行。`
      : candidate;
  })();
  const accessoryOperation = (() => {
    const operation = openAiPayload.accessoryOperation;
    const stableGeneratedAccessory =
      openAiPayload.generatedAccessory?.kind
        ? promoteGeneratedAccessoryToStable(openAiPayload.generatedAccessory.kind)
        : null;

    if (!operation?.type) {
      return fallback.accessoryOperation;
    }

    if (operation.type === "keep-default") {
      return {
        type: "keep-default",
        label:
          typeof operation.label === "string" && operation.label.trim()
            ? operation.label.trim()
            : fallback.accessoryOperation.label,
        accessoryKey:
          typeof operation.accessoryKey === "string"
            ? operation.accessoryKey
            : fallback.accessoryOperation.type === "keep-default"
              ? fallback.accessoryOperation.accessoryKey
              : undefined,
      } satisfies PromptCustomizationAccessoryOperation;
    }

    if (operation.type === "remove-default") {
      return {
        type: "remove-default",
        label: "无配饰",
        accessoryKey:
          typeof operation.accessoryKey === "string"
            ? operation.accessoryKey
            : fallback.accessoryOperation.type === "keep-default"
              ? fallback.accessoryOperation.accessoryKey
              : undefined,
        targetLabel:
          typeof operation.label === "string" && operation.label.trim()
            ? operation.label.trim()
            : undefined,
        sourceText: operation.sourceText,
      } satisfies PromptCustomizationAccessoryOperation;
    }

    if (operation.type === "replace-with-supported" && typeof operation.accessoryKey === "string") {
      return {
        type: "replace-with-supported",
        label:
          typeof operation.label === "string" && operation.label.trim()
            ? operation.label.trim()
            : getFoxAccessoryLabel(operation.accessoryKey as never),
        accessoryKey: operation.accessoryKey,
        sourceText: operation.sourceText,
      } satisfies PromptCustomizationAccessoryOperation;
    }

    if (operation.type === "generate-simple-accessory") {
      if (stableGeneratedAccessory) {
        return {
          type: "replace-with-supported",
          label:
            typeof operation.label === "string" && operation.label.trim()
              ? operation.label.trim()
              : stableGeneratedAccessory.label,
          accessoryKey: stableGeneratedAccessory.accessoryKey,
          sourceText: operation.sourceText,
        } satisfies PromptCustomizationAccessoryOperation;
      }

      return {
        type: "generate-simple-accessory",
        label:
          typeof operation.label === "string" && operation.label.trim()
            ? operation.label.trim()
            : fallback.accessoryOperation.label,
        accessoryKey:
          typeof operation.accessoryKey === "string"
            ? operation.accessoryKey
            : fallback.accessoryOperation.type === "generate-simple-accessory"
              ? fallback.accessoryOperation.accessoryKey
              : undefined,
        sourceText: operation.sourceText,
      } satisfies PromptCustomizationAccessoryOperation;
    }

    return fallback.accessoryOperation;
  })();

  const resolvedGeneratedAccessory =
    accessoryOperation.type === "generate-simple-accessory"
      ? openAiPayload.generatedAccessory && openAiPayload.generatedAccessory.kind
        ? (() => {
            const normalizedAnchor =
              openAiPayload.generatedAccessory.anchor ?? "chest-center";

            return {
            kind: openAiPayload.generatedAccessory.kind,
            label:
              typeof openAiPayload.generatedAccessory.label === "string" &&
              openAiPayload.generatedAccessory.label.trim()
                ? openAiPayload.generatedAccessory.label.trim()
                : fallback.generatedAccessory?.label ?? fallback.accessoryOperation.label,
            anchor: normalizedAnchor,
            sourceText:
              typeof openAiPayload.generatedAccessory.sourceText === "string" &&
              openAiPayload.generatedAccessory.sourceText.trim()
                ? openAiPayload.generatedAccessory.sourceText.trim()
                : fallback.generatedAccessory?.sourceText ?? fallback.accessoryOperation.label,
          };
        })()
        : fallback.generatedAccessory
      : undefined;

  const mergedColorOverrides =
    openAiPayload.colorOverrides && Object.keys(openAiPayload.colorOverrides).length > 0
      ? {
          ...fallback.colorOverrides,
          ...openAiPayload.colorOverrides,
        }
      : fallback.colorOverrides;
  const paletteIntent = buildPaletteIntent(themeLabel, mergedColorOverrides);

  const merged = finalizeRecipe(
    {
      ...fallback,
      bodyCustomization: undefined,
      accessoryCustomization: undefined,
      normalizedSemanticRecipe: undefined,
      resolvedExecutionPlan: undefined,
      runtimeDesignTasks: undefined,
      nounDesignBriefs: undefined,
      partGraphs: undefined,
      geometryRecipes: undefined,
      visualCritiqueReports: [],
      parserSource,
      requestedTheme: fallback.requestedTheme,
      resolvedTheme: themeLabel,
      themeSlot,
      themeLabel,
      themeReason,
      bodyPaletteIntent: paletteIntent.bodyPaletteIntent,
      detailPaletteIntent: paletteIntent.detailPaletteIntent,
      colorOverrides: mergedColorOverrides,
      accessoryOperation,
      generatedAccessory: resolvedGeneratedAccessory,
      accessoryRequests: mergedAccessoryRequests,
      semanticContractsV2: mergedSemanticContracts,
      localTweaks: {
        ...fallback.localTweaks,
        ...(openAiPayload.localTweaks ?? {}),
      },
      negations: uniqueStrings([
        ...fallback.negations,
        ...(openAiPayload.negations ?? []),
      ]),
      unsupportedRequests: uniqueStrings([
        ...fallback.unsupportedRequests,
        ...(openAiPayload.unsupportedRequests ?? []),
      ]),
      unsupportedNotes: uniqueStrings([
        ...fallback.unsupportedNotes,
        ...(openAiPayload.unsupportedNotes ?? []),
        accessoryMergeResult.rescuedFallbackFields
          ? `${providerLabel} accessoryRequests[] 的低保真字段已按规则解析补全 noun / family / semantic class / runtime shape / 锚点 / 颜色，其余语义仍以 AI 合同为主。`
          : undefined,
        accessoryMergeResult.rescuedMissingRequests
          ? `${providerLabel} accessoryRequests[] 漏掉了部分显式请求，这次按规则解析补回缺失条目。`
          : undefined,
      ]),
    },
    normalizedPrompt,
  );

  if (typeof openAiPayload.confidence === "number") {
    return {
      ...merged,
      confidence: clampConfidence(openAiPayload.confidence),
    } satisfies PromptCustomizationRecipe;
  }

  return merged;
}

function buildOpenAiCustomizationInstruction() {
  return "You are a structured customization parser for PromptPet-AR. Always keep the species as fox. Parse the prompt into formal semantics instead of collapsing it into one vague accessory guess. Supported theme slots: night-glow, cream-toy, forest-scout, lucky-charm, strawberry-sweet. Supported stable accessories: accessoryBell, accessoryScarf, accessoryFlower, accessoryCrown, accessoryTag, accessoryTie, accessoryBadge, accessoryBow, accessoryPendant. Runtime-first accessory families: necklace-chain, earring-hoop, pendant-charm, flower, clover-charm, star, cloud, leaf, forest, mushroom, dessert, candy, dessert-hang, fish-charm, berry-charm, cloud-charm, candle-charm, key-charm, feather-charm, open-botanical-ornament, open-symbol-ornament, generic-animal-charm, generic-food-charm, generic-ornament, charm-token. Supported local tweaks: earSize, tailFluff, eyeSize, glowIntensity. Respect this precedence: explicit negations first, then explicit exceptions, then explicit new accessories, then local accessory colors, then theme defaults, then style defaults. Support natural language, not just preset keywords. Return accessoryRequests[] as the primary accessory contract whenever the prompt contains explicit accessories, and preserve literal requested nouns like 手机 / 火箭 / 相机 / 小船 instead of rewriting them to generic labels. For each explicit accessory request, also keep nounSpan, nounGloss, objectCategory, designConfidence, and whether it must stay distinct from fallback. For each explicit accessory request, also return prototypeCandidates[] as ranked prototype ids plus confidence, traits[] chosen from rigid/soft/open-top/closed-top/has-handle/flat-face/cylindrical/micro-hangable/chest-safe/ear-safe, and negativeLookalikes[] for the main visual confusions that must be avoided. Treat phrases like 奶油白 / 朱褐色 / 灰褐色 / 烟粉 / 灰粉色 / 荧光绿 / 亮绿 / 霓虹绿 / 青柠绿 / 荧光橙 / 亮橙色 / 紫红色 / 黑色 / 蓝色 as real color intents. Treat 红绿色配色 / 双色 / 渐变双色 / A和B配色 / A+B配色 / A/B配色 as body dual-tone or gradient requests. Treat 项链 / 链子 / 小项链 / 挂链 / 颈链 as necklace-chain chest accessories. Treat 耳环 / 耳坠 / 耳饰 / 小耳环 as earring-hoop ear-side accessories. Treat 小鱼挂饰 / 鱼形挂件 / 鱼挂饰 as fish-charm. Treat 草莓挂饰 / 莓果挂件 as berry-charm. Treat 四叶草 / 四叶草挂饰 / 四叶草装饰 as clover-charm. Treat 云朵挂饰 / 云朵形状挂饰 / 云朵形装饰 as cloud accessories. Treat 蜡烛 / 蜡烛挂饰 as candle-charm. Treat 钥匙 / 钥匙挂饰 as key-charm. Treat 羽毛 / 羽毛挂饰 as feather-charm. Preserve explicit position phrases and map them to curve anchors such as left-ear, right-ear, forehead, head-top, back-head, chest-center, chest-left, chest-right, tail-top, tail-left, tail-right and tail-base. Support multi-instance requests such as left-ear plus right-ear or two on the chest by preserving each instance separately instead of collapsing them into one accessory. If the user says '不要任何配饰，除了...' or similar, preserve that as remove-defaults plus explicit exception accessories. Respect explicit color scope: fox/body requests belong to bodyColor/detailColor/accentColor; accessory requests belong to the specific accessory instance color; tail-tip or glow requests belong to glowColor. Never let an accessory color overwrite the whole fox body when the prompt assigns different colors to body and accessory. The customizationProfile controls execution later: safe-overlay means open color semantics plus stable anchors/materials/supported swaps or approximations only; experimental-addon means explicit accessories must stay visible as runtime design tasks instead of disappearing into defaults, and curve anchors beyond the stable set remain allowed. Explicit shape nouns such as 四叶草 must stay as named requests instead of collapsing into generic-ornament. Neither profile may change the fox core body structure. If a request exceeds scope, still preserve it as explicit accessory intent and put any limitation into unsupportedRequests or unsupportedNotes instead of pretending it is supported.";
}

function buildOpenAiCustomizationInput(
  input: CreateGenerationInput,
  fallback: PromptCustomizationRecipe,
) {
  return {
    prompt: input.prompt,
    style: input.style,
    generationMode: input.generationMode,
    customizationProfile: resolveCustomizationProfile(input),
    fallbackThemeSlot: fallback.themeSlot,
    fallbackThemeLabel: fallback.themeLabel,
    fallbackAccessoryOperation: fallback.accessoryOperation,
    fallbackGeneratedAccessory: fallback.generatedAccessory ?? null,
    fallbackSemanticContractsV2: (fallback.semanticContractsV2 ?? []).map((contract) => ({
      requestId: contract.requestId,
      requestedNoun: contract.requestedNoun,
      prototypeCandidates: contract.prototypeCandidates,
      traits: contract.traits,
      negativeLookalikes: contract.negativeLookalikes,
    })),
    currentSupportScope: {
      species: "fox",
      semanticTraits: [...semanticTraits],
      colorScopes: [
        "bodyColor/detailColor/accentColor for fox body requests",
        "accessoryColor for crown, bell, scarf, flower, tag, tie, badge, bow, pendant",
        "glowColor for tail-tip or glow-specific requests",
      ],
      generatedAccessories: [
        "tie",
        "badge",
        "bow",
        "pendant",
        "necklace-chain",
        "earring-hoop",
        "pendant-charm",
        "flower",
        "star",
        "cloud",
        "leaf",
        "forest",
        "mushroom",
        "dessert",
        "candy",
        "dessert-hang",
        "fish-charm",
        "berry-charm",
        "cloud-charm",
        "candle-charm",
        "key-charm",
        "feather-charm",
        "generic-animal-charm",
        "generic-food-charm",
        "generic-ornament",
        "charm-token",
      ],
      experimentalAccessoryFamilies: [
        "necklace-chain",
        "earring-hoop",
        "pendant-charm",
        "flower",
        "star",
        "cloud",
        "leaf",
        "forest",
        "mushroom",
        "dessert",
        "candy",
        "dessert-hang",
        "fish-charm",
        "berry-charm",
        "cloud-charm",
        "candle-charm",
        "key-charm",
        "feather-charm",
        "generic-animal-charm",
        "generic-food-charm",
        "generic-ornament",
        "charm-token",
      ],
      curveAnchors: [
        "left-ear",
        "right-ear",
        "forehead",
        "head-top",
        "back-head",
        "chest-center",
        "chest-left",
        "chest-right",
        "tail-top",
        "tail-left",
        "tail-right",
        "tail-base",
      ],
      supportedReplacementAccessories: [
        "accessoryBell",
        "accessoryScarf",
        "accessoryFlower",
        "accessoryCrown",
        "accessoryTag",
        "accessoryTie",
        "accessoryBadge",
        "accessoryBow",
        "accessoryPendant",
      ],
      supportedLocalTweaks: [
        "earSize",
        "tailFluff",
        "eyeSize",
        "glowIntensity",
      ],
    },
  };
}

function buildOpenAiFallbackWithNote(
  fallback: PromptCustomizationRecipe,
  note: string,
) {
  return finalizeRecipe({
    mode: fallback.mode,
    customizationProfile: fallback.customizationProfile,
    parserSource: fallback.parserSource,
    requestedTheme: fallback.requestedTheme,
    resolvedTheme: fallback.resolvedTheme,
    themeSlot: fallback.themeSlot,
    themeLabel: fallback.themeLabel,
    themeReason: fallback.themeReason,
    bodyPaletteIntent: fallback.bodyPaletteIntent,
    detailPaletteIntent: fallback.detailPaletteIntent,
    colorOverrides: fallback.colorOverrides,
    accessoryPolicy: fallback.accessoryPolicy,
    accessoryOperation: fallback.accessoryOperation,
    generatedAccessory: fallback.generatedAccessory,
    accessoryRequests: fallback.accessoryRequests,
    resolvedExecutionPlan: fallback.resolvedExecutionPlan,
    localTweaks: fallback.localTweaks,
    negations: fallback.negations,
    unsupportedRequests: fallback.unsupportedRequests,
    unsupportedNotes: uniqueStrings([...fallback.unsupportedNotes, note]),
  });
}

function extractChatCompletionText(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return null;
  }

  const firstChoice = payload.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    return null;
  }

  const content = firstChoice.message.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const parts: string[] = [];

  for (const item of content) {
    if (!isRecord(item)) {
      continue;
    }

    const text =
      typeof item.text === "string"
        ? item.text
        : typeof item.content === "string"
          ? item.content
          : null;

    if (text && text.trim()) {
      parts.push(text.trim());
    }
  }

  return parts.length > 0 ? parts.join("\n").trim() : null;
}

async function tryParseWithOpenAiResponses(
  config: LlmProviderConfig,
  input: CreateGenerationInput,
  fallback: PromptCustomizationRecipe,
) {
  const providerLabel = getAiProviderLabel(config.provider);
  const timeoutMs = getPromptCustomizationTransportTimeoutMs(config, "responses");

  try {
    const response = await fetchWithPromptCustomizationDeadline(
      `${config.baseUrl.replace(/\/+$/, "")}/responses`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          store: false,
          instructions: buildOpenAiCustomizationInstruction(),
          input: JSON.stringify(buildOpenAiCustomizationInput(input, fallback)),
          text: {
            format: {
              type: "json_schema",
              name: "promptpet_customization_recipe",
              strict: true,
              schema: openAiCustomizationSchema,
            },
          },
          max_output_tokens: 500,
        }),
      },
      timeoutMs,
    );

    if (!response.ok) {
      const rawText = await response.text();
      return {
        recipe: null,
        failureNote: getOpenAiFailureNote(response.status, rawText, config.provider),
      };
    }

    const payload = (await response.json()) as unknown;
    const openAiPayloadDirect =
      isRecord(payload) && isRecord(payload.output_parsed)
        ? sanitizeOpenAiPayload(payload.output_parsed)
        : null;

    if (openAiPayloadDirect) {
      return {
        recipe: mergeOpenAiRecipe(
          fallback,
          openAiPayloadDirect,
          normalizePrompt(input.prompt),
          config.provider,
        ),
        failureNote: null,
      };
    }

    const text = extractOpenAiText(payload);

      if (!text) {
        return {
          recipe: null,
          failureNote: `${buildOpenAiEmptyOutputNote(
            config.provider,
            "Responses API",
            payload,
          )} 准备尝试 chat/completions 回退。`,
        };
      }

    const openAiPayload = sanitizeOpenAiPayload(parseJsonText(text));

      if (!openAiPayload) {
        return {
          recipe: null,
          failureNote: `${providerLabel} Responses API 返回了不符合当前合同的结果，准备尝试 chat/completions 回退。`,
        };
      }

    return {
        recipe: mergeOpenAiRecipe(
          fallback,
          openAiPayload,
          normalizePrompt(input.prompt),
          config.provider,
        ),
        failureNote: null,
      };
  } catch (error) {
    return {
      recipe: null,
      failureNote:
        isPromptCustomizationTimeoutError(error)
          ? `${providerLabel} Responses API 请求超时（>${timeoutMs}ms），准备尝试 chat/completions 回退。`
          : error instanceof Error && error.message
            ? `${providerLabel} Responses API 请求失败：${error.message}`
            : `${providerLabel} Responses API 请求失败，准备尝试 chat/completions 回退。`,
    };
  }
}

async function tryParseWithOpenAiChatCompletions(
  config: LlmProviderConfig,
  input: CreateGenerationInput,
  fallback: PromptCustomizationRecipe,
) {
  const providerLabel = getAiProviderLabel(config.provider);
  const urls = [
    `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`,
  ];
  const limitCompatibleFallbackMatrix =
    config.provider === "openai" && !shouldUseResponsesApi(config);

  const requestBodies =
    config.provider === "deepseek"
      ? [
          {
            label: "json_object",
            body: {
              model: config.model,
              store: false,
              messages: [
                {
                  role: "system",
                  content: `${buildOpenAiCustomizationInstruction()} Return a single JSON object only.`,
                },
                {
                  role: "user",
                  content: JSON.stringify(buildOpenAiCustomizationInput(input, fallback)),
                },
              ],
              response_format: {
                type: "json_object",
              },
              max_completion_tokens: 500,
            },
          },
        ]
      : limitCompatibleFallbackMatrix
        ? [
            {
              label: "json_schema",
              body: {
                model: config.model,
                store: false,
                messages: [
                  {
                    role: "system",
                    content: buildOpenAiCustomizationInstruction(),
                  },
                  {
                    role: "user",
                    content: JSON.stringify(buildOpenAiCustomizationInput(input, fallback)),
                  },
                ],
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "promptpet_customization_recipe",
                    strict: true,
                    schema: openAiCustomizationSchema,
                  },
                },
                max_completion_tokens: 500,
              },
            },
          ]
      : [
          {
            label: "json_schema",
            body: {
              model: config.model,
              store: false,
              messages: [
                {
                  role: "system",
                  content: buildOpenAiCustomizationInstruction(),
                },
                {
                  role: "user",
                  content: JSON.stringify(buildOpenAiCustomizationInput(input, fallback)),
                },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "promptpet_customization_recipe",
                  strict: true,
                  schema: openAiCustomizationSchema,
                },
              },
              max_completion_tokens: 500,
            },
          },
          {
            label: "json_object",
            body: {
              model: config.model,
              store: false,
              messages: [
                {
                  role: "system",
                  content: `${buildOpenAiCustomizationInstruction()} Return a single JSON object only.`,
                },
                {
                  role: "user",
                  content: JSON.stringify(buildOpenAiCustomizationInput(input, fallback)),
                },
              ],
              response_format: {
                type: "json_object",
              },
              max_completion_tokens: 500,
            },
          },
          {
            label: "plain_text_json",
            body: {
              model: config.model,
              store: false,
              messages: [
                {
                  role: "system",
                  content: `${buildOpenAiCustomizationInstruction()} Return a single JSON object only. No markdown fences.`,
                },
                {
                  role: "user",
                  content: JSON.stringify(buildOpenAiCustomizationInput(input, fallback)),
                },
              ],
              max_completion_tokens: 500,
            },
          },
        ];

  let lastFailureNote: string | null = null;

  for (const url of urls) {
    for (const request of requestBodies) {
      const timeoutMs = getPromptCustomizationTransportTimeoutMs(
        config,
        request.label as "json_schema" | "json_object" | "plain_text_json",
      );
      try {
        const response = await fetchWithPromptCustomizationDeadline(
          url,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(request.body),
          },
          timeoutMs,
        );

        const rawText = await response.text();

        if (!response.ok) {
          lastFailureNote = `${providerLabel} chat/completions (${request.label}) 不可用：${getOpenAiFailureNote(
            response.status,
            rawText,
            config.provider,
          )}`;
          continue;
        }

        let payload: unknown = null;

        try {
          payload = JSON.parse(rawText) as unknown;
        } catch {
          lastFailureNote = `${providerLabel} chat/completions (${request.label}) 返回了非 JSON 响应。`;
          continue;
        }

        const text = extractChatCompletionText(payload);

        if (!text) {
          lastFailureNote = buildOpenAiEmptyOutputNote(
            config.provider,
            `chat/completions (${request.label})`,
            payload,
          );
          continue;
        }

        const openAiPayload = sanitizeOpenAiPayload(parseJsonText(text));

        if (!openAiPayload) {
          lastFailureNote = `${providerLabel} chat/completions (${request.label}) 返回了不符合当前合同的 JSON。`;
          continue;
        }

        return {
          recipe: mergeOpenAiRecipe(
            fallback,
            openAiPayload,
            normalizePrompt(input.prompt),
            config.provider,
          ),
          failureNote: null,
        };
      } catch (error) {
        lastFailureNote =
          isPromptCustomizationTimeoutError(error)
            ? `${providerLabel} chat/completions (${request.label}) 请求超时（>${timeoutMs}ms）。`
            : error instanceof Error && error.message
              ? `${providerLabel} chat/completions (${request.label}) 请求失败：${error.message}`
              : `${providerLabel} chat/completions (${request.label}) 请求失败。`;
      }
    }
  }

  return {
    recipe: null,
    failureNote:
      lastFailureNote ?? `${providerLabel} chat/completions 回退不可用，当前继续使用规则解析。`,
  };
}

async function tryParseWithOpenAi(
  input: CreateGenerationInput,
  fallback: PromptCustomizationRecipe,
) {
  const config = getSemanticLlmConfig(input);

  if (!config || input.generationMode !== "dynamic-custom") {
    return fallback;
  }

  const responsesAttempt = shouldUseResponsesApi(config)
    ? await tryParseWithOpenAiResponses(
        config,
        input,
        fallback,
      )
    : {
        recipe: null,
        failureNote: null,
      };

  if (responsesAttempt.recipe) {
    return responsesAttempt.recipe;
  }

  const chatAttempt = await tryParseWithOpenAiChatCompletions(
    config,
    input,
    fallback,
  );

  if (chatAttempt.recipe) {
    return chatAttempt.recipe;
  }

  let nextRecipe = fallback;

  if (responsesAttempt.failureNote) {
    nextRecipe = buildOpenAiFallbackWithNote(nextRecipe, responsesAttempt.failureNote);
  }

  if (chatAttempt.failureNote) {
    nextRecipe = buildOpenAiFallbackWithNote(nextRecipe, chatAttempt.failureNote);
  }

  return nextRecipe;
}

async function tryPlanRuntimeDesignsWithOpenAiResponses(
  config: LlmProviderConfig,
  recipe: PromptCustomizationRecipe,
) {
  const providerLabel = getAiProviderLabel(config.provider);
  const timeoutMs = getPromptCustomizationTransportTimeoutMs(config, "responses");

  try {
    const response = await fetchWithPromptCustomizationDeadline(
      `${config.baseUrl.replace(/\/+$/, "")}/responses`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          store: false,
          instructions: buildOpenAiAccessoryDesignInstruction(),
          input: JSON.stringify(buildOpenAiAccessoryDesignInput(recipe)),
          text: {
            format: {
              type: "json_schema",
              name: "promptpet_accessory_designs",
              strict: true,
              schema: openAiAccessoryDesignSchema,
            },
          },
          max_output_tokens: 1000,
        }),
      },
      timeoutMs,
    );

    if (!response.ok) {
      const rawText = await response.text();
      return {
        payload: null,
        failureNote: getOpenAiFailureNote(response.status, rawText, config.provider),
      };
    }

    const payload = (await response.json()) as unknown;
    const parsed =
      isRecord(payload) && isRecord(payload.output_parsed)
        ? sanitizeOpenAiAccessoryDesignPayload(payload.output_parsed)
        : null;

    if (parsed) {
      return {
        payload: parsed,
        failureNote: null,
      };
    }

    const text = extractOpenAiText(payload);

    if (!text) {
      return {
        payload: null,
        failureNote: buildOpenAiEmptyOutputNote(
          config.provider,
          "accessory design planner Responses API",
          payload,
        ),
      };
    }

    return {
      payload: sanitizeOpenAiAccessoryDesignPayload(parseJsonText(text)),
      failureNote: null,
    };
  } catch (error) {
    return {
      payload: null,
      failureNote:
        isPromptCustomizationTimeoutError(error)
          ? `${providerLabel} accessory design planner 请求超时（>${timeoutMs}ms）。`
          : error instanceof Error && error.message
            ? `${providerLabel} accessory design planner 请求失败：${error.message}`
            : `${providerLabel} accessory design planner 请求失败。`,
    };
  }
}

async function tryPlanRuntimeDesignsWithOpenAiChatCompletions(
  config: LlmProviderConfig,
  recipe: PromptCustomizationRecipe,
) {
  const providerLabel = getAiProviderLabel(config.provider);
  const limitCompatibleFallbackMatrix =
    config.provider === "openai" && !shouldUseResponsesApi(config);
  const responseFormat =
    config.provider === "deepseek"
      ? {
          type: "json_object",
        }
      : {
          type: "json_schema",
          json_schema: {
            name: "promptpet_accessory_designs",
            strict: true,
            schema: openAiAccessoryDesignSchema,
          },
        };
  const requestBodies = limitCompatibleFallbackMatrix
    ? [
        {
          label: "structured_json",
          body: {
            model: config.model,
            store: false,
            messages: [
              {
                role: "system",
                content: `${buildOpenAiAccessoryDesignInstruction()} Return strict JSON only.`,
              },
              {
                role: "user",
                content: JSON.stringify(buildOpenAiAccessoryDesignInput(recipe)),
              },
            ],
            response_format: responseFormat,
            max_completion_tokens: 1000,
          },
        },
      ]
    : [
        {
          label: "structured_json",
          body: {
            model: config.model,
            store: false,
            messages: [
              {
                role: "system",
                content: `${buildOpenAiAccessoryDesignInstruction()} Return strict JSON only.`,
              },
              {
                role: "user",
                content: JSON.stringify(buildOpenAiAccessoryDesignInput(recipe)),
              },
            ],
            response_format: responseFormat,
            max_completion_tokens: 1000,
          },
        },
        {
          label: "plain_text_json",
          body: {
            model: config.model,
            store: false,
            messages: [
              {
                role: "system",
                content: `${buildOpenAiAccessoryDesignInstruction()} Return strict JSON only. No markdown fences.`,
              },
              {
                role: "user",
                content: JSON.stringify(buildOpenAiAccessoryDesignInput(recipe)),
              },
            ],
            max_completion_tokens: 1000,
          },
        },
      ];

  let lastFailureNote: string | null = null;

  for (const request of requestBodies) {
    const timeoutMs = getPromptCustomizationTransportTimeoutMs(
      config,
      request.label as "structured_json" | "plain_text_json",
    );
    try {
      const response = await fetchWithPromptCustomizationDeadline(
        `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request.body),
        },
        timeoutMs,
      );

      const rawText = await response.text();

      if (!response.ok) {
        lastFailureNote = `${providerLabel} accessory design planner chat/completions (${request.label}) 不可用：${getOpenAiFailureNote(
          response.status,
          rawText,
          config.provider,
        )}`;
        continue;
      }

      const payload = JSON.parse(rawText) as unknown;
      const text = extractChatCompletionText(payload);

      if (!text) {
        lastFailureNote = buildOpenAiEmptyOutputNote(
          config.provider,
          `accessory design planner chat/completions (${request.label})`,
          payload,
        );
        continue;
      }

      return {
        payload: sanitizeOpenAiAccessoryDesignPayload(parseJsonText(text)),
        failureNote: null,
      };
    } catch (error) {
      lastFailureNote =
        isPromptCustomizationTimeoutError(error)
          ? `${providerLabel} accessory design planner chat/completions (${request.label}) 请求超时（>${timeoutMs}ms）。`
          : error instanceof Error && error.message
            ? `${providerLabel} accessory design planner chat/completions (${request.label}) 失败：${error.message}`
            : `${providerLabel} accessory design planner chat/completions (${request.label}) 失败。`;
    }
  }

  return {
    payload: null,
    failureNote:
      lastFailureNote ?? `${providerLabel} accessory design planner chat/completions 不可用。`,
  };
}

async function maybePlanRuntimeDesignsWithOpenAi(
  input: CreateGenerationInput,
  recipe: PromptCustomizationRecipe,
) {
  if (
    input.generationMode !== "dynamic-custom" ||
    resolveCustomizationProfile(input) !== "experimental-addon" ||
    recipe.runtimeDesignTasks.length === 0
  ) {
    return recipe;
  }

  const config = getDesignLlmConfig(input);

  if (!config) {
    return finalizeRecipe(
      {
        ...recipe,
        designPlannerSource: "rule-fallback",
      },
      normalizePrompt(input.prompt),
    );
  }

  const responsesAttempt = shouldUseResponsesApi(config)
    ? await tryPlanRuntimeDesignsWithOpenAiResponses(
        config,
        recipe,
      )
    : {
        payload: null,
        failureNote: null,
      };

  if (responsesAttempt.payload) {
    return mergeOpenAiAccessoryDesignPlans(
      recipe,
      responsesAttempt.payload,
      normalizePrompt(input.prompt),
      config.provider,
    );
  }

  const chatAttempt = await tryPlanRuntimeDesignsWithOpenAiChatCompletions(
    config,
    recipe,
  );

  if (chatAttempt.payload) {
    return mergeOpenAiAccessoryDesignPlans(
      recipe,
      chatAttempt.payload,
      normalizePrompt(input.prompt),
      config.provider,
    );
  }

  return finalizeRecipe(
    {
      ...recipe,
      designPlannerSource: "rule-fallback",
      unsupportedNotes: uniqueStrings([
        ...recipe.unsupportedNotes,
        responsesAttempt.failureNote,
        chatAttempt.failureNote,
      ]),
    },
    normalizePrompt(input.prompt),
  );
}

export function getGenerationModeLabel(mode: GenerationMode) {
  return generationModeLabels[mode];
}

export function getCustomizationProfileLabel(profile: CustomizationProfile) {
  return customizationProfileLabels[profile];
}

export function getCustomizationParserLabel(source: CustomizationParserSource) {
  return parserSourceLabels[source];
}

export function buildCustomizationSummary(
  recipe: PromptCustomizationRecipe,
): GenerationCustomizationSummary {
  const accessoryFulfillmentRows = resolveAccessoryRequests(recipe).flatMap(
    (request) =>
      request.instances.map((instance) => {
        const execution = recipe.resolvedExecutionPlan.addAccessories.find(
          (entry) =>
            entry.requestId === request.requestId &&
            entry.instanceId === instance.instanceId,
        );
        const requestedAnchor = getAccessoryAnchorLabel(instance.anchor);
        const requestedColor =
          instance.colorIntent?.label ?? request.colorIntent?.label;
        const requestedColorText =
          instance.colorIntent?.requestedText ??
          request.requestedColor?.requestedText ??
          request.colorIntent?.requestedText;
        const actualAnchor = execution
          ? getAccessoryAnchorLabel(execution.anchor)
          : requestedAnchor;
        const actualShape = execution?.resolvedLabel ?? execution?.shapeLabel ?? "未实现";
        const actualColor = execution?.colorIntent?.label;
        const status =
          !execution || execution.executionStatus === "unfulfilled"
            ? ("unsupported" as const)
            : execution.executionStatus === "approximated"
              ? ("approximated" as const)
              : ("implemented" as const);
        const instanceOrdinalMatch = instance.instanceId.match(/(?:-|:)(\d+)$/);
        const instanceOrdinal = instanceOrdinalMatch
          ? Number(instanceOrdinalMatch[1])
          : 1;

        return {
          requestId: request.requestId,
          instanceId: instance.instanceId,
          source: "prompt" as const,
          status,
          executionStatus: execution?.executionStatus ?? "unfulfilled",
          creationSource: execution?.creationSource ?? "unfulfilled",
          requestedLabel: `${requestedAnchor} · ${request.shapeLabel}`,
          normalizedRequestedLabel: request.requestedLabel ?? request.shapeLabel,
          ...(request.requestedNoun ? { requestedNoun: request.requestedNoun } : {}),
          ...(request.nounGloss ? { nounGloss: request.nounGloss } : {}),
          ...(request.objectCategory ? { objectCategory: request.objectCategory } : {}),
          ...(typeof request.designConfidence === "number"
            ? { designConfidence: clampConfidence(request.designConfidence) }
            : {}),
          ...(execution?.sourceMode ? { sourceMode: execution.sourceMode } : {}),
          ...(typeof execution?.referenceConfidence === "number"
            ? { referenceConfidence: clampConfidence(execution.referenceConfidence) }
            : {}),
          requestedAnchor,
          requestedAnchorPhrase: request.requestedAnchorPhrase,
          resolvedAnchor: actualAnchor,
          resolvedAnchorKey: execution?.anchor ?? instance.anchor,
          instanceOrdinal,
          requestedShape: request.shapeLabel,
          requestedSemanticClass: request.semanticClass,
          ...(execution?.designArchetype ? { designArchetype: execution.designArchetype } : {}),
          ...(execution?.runtimeShapeClass
            ? { runtimeShapeClass: execution.runtimeShapeClass }
            : {}),
          ...(execution?.capabilityBundle?.capabilities?.length
            ? { capabilities: execution.capabilityBundle.capabilities }
            : {}),
          ...(execution?.referenceId ? { referenceId: execution.referenceId } : {}),
          ...(execution?.referenceSourceKind
            ? { referenceSourceKind: execution.referenceSourceKind }
            : {}),
          ...(execution?.blueprintFamily
            ? { blueprintFamily: execution.blueprintFamily }
            : {}),
          ...(execution?.variantId ? { variantId: execution.variantId } : {}),
          ...(execution?.primarySilhouette
            ? { primarySilhouette: execution.primarySilhouette }
            : {}),
          ...(execution?.criticalParts ? { criticalParts: execution.criticalParts } : {}),
          ...(execution?.negativeLookalikes
            ? { negativeLookalikes: execution.negativeLookalikes }
            : {}),
          ...(execution?.readOrderTargets
            ? { readOrderTargets: execution.readOrderTargets }
            : {}),
          ...(execution?.criticalViewGoals
            ? { criticalViewGoals: execution.criticalViewGoals }
            : {}),
          ...(execution?.familyGuess ? { familyGuess: execution.familyGuess } : {}),
          ...(execution?.familyResolutionSource
            ? { familyResolutionSource: execution.familyResolutionSource }
            : {}),
          ...(execution?.nounFidelityStatus
            ? { nounFidelityStatus: execution.nounFidelityStatus }
            : {}),
          ...(requestedColor ? { requestedColor } : {}),
          ...(requestedColorText ? { requestedColorText } : {}),
          actualLabel: `${actualAnchor} · ${actualShape}`,
          ...(execution?.actualGeneratedLabel
            ? { actualGeneratedLabel: execution.actualGeneratedLabel }
            : {}),
          actualAnchor,
          actualShape,
          runtimeDesignSource: execution?.runtimeDesignSource,
          geometryRecipeId: execution?.geometryRecipeId,
          ...(actualColor ? { actualColor } : {}),
          approximationReason: execution?.approximationReason,
          failureReason: execution?.failureReason,
          ...(execution?.dominantFailureLayer
            ? { dominantFailureLayer: execution.dominantFailureLayer }
            : {}),
          ...(execution?.finalReadOrder
            ? { finalReadOrder: execution.finalReadOrder }
            : {}),
          ...(execution?.rawFirstReadResult
            ? { rawFirstReadResult: execution.rawFirstReadResult }
            : {}),
          ...(execution?.firstReadResult
            ? { firstReadResult: execution.firstReadResult }
            : {}),
          ...(execution?.canonicalFirstRead
            ? { canonicalFirstRead: execution.canonicalFirstRead }
            : {}),
          ...(execution?.rawDominantSpanOwnerText
            ? { rawDominantSpanOwnerText: execution.rawDominantSpanOwnerText }
            : {}),
          ...(execution?.canonicalDominantSpanOwner
            ? { canonicalDominantSpanOwner: execution.canonicalDominantSpanOwner }
            : {}),
          ...(execution?.canonicalDetachedPartIds
            ? { canonicalDetachedPartIds: execution.canonicalDetachedPartIds }
            : {}),
          ...(execution?.canonicalFlattenedPartIds
            ? { canonicalFlattenedPartIds: execution.canonicalFlattenedPartIds }
            : {}),
          ...(execution?.visualVetoReason
            ? { visualVetoReason: execution.visualVetoReason }
            : {}),
          ...(typeof execution?.visualAcceptanceGatePassed === "boolean"
            ? { visualAcceptanceGatePassed: execution.visualAcceptanceGatePassed }
            : {}),
          ...(execution?.visualFailureReasons
            ? { visualFailureReasons: execution.visualFailureReasons }
            : {}),
          ...(execution?.runtimeNodePrefix
            ? { runtimeNodePrefix: execution.runtimeNodePrefix }
            : {}),
          ...(execution?.exportedNodeNames
            ? { exportedNodeNames: execution.exportedNodeNames }
            : {}),
          ...(execution?.exportedPartIds
            ? { exportedPartIds: execution.exportedPartIds }
            : {}),
          notes: uniqueStrings([
            ...(request.notes ?? []),
            ...(execution?.notes ?? []),
            execution?.approximationReason,
            execution?.failureReason,
          ]),
        };
      }),
  );
  const colorOverrides = [
    recipe.colorOverrides.bodyColor
      ? `主体：${recipe.colorOverrides.bodyColor.label}`
      : null,
    recipe.colorOverrides.detailColor &&
    recipe.colorOverrides.detailColor.label !== recipe.colorOverrides.bodyColor?.label
      ? `主体细节：${recipe.colorOverrides.detailColor.label}`
      : null,
    recipe.colorOverrides.accentColor &&
    recipe.colorOverrides.accentColor.label !== recipe.colorOverrides.bodyColor?.label &&
    recipe.colorOverrides.accentColor.label !== recipe.colorOverrides.detailColor?.label
      ? `主体强调：${recipe.colorOverrides.accentColor.label}`
      : null,
    recipe.colorOverrides.accessoryColor &&
    recipe.colorOverrides.accessoryColor.label !== recipe.colorOverrides.bodyColor?.label
      ? `配饰：${recipe.colorOverrides.accessoryColor.label}`
      : null,
    recipe.colorOverrides.glowColor &&
    recipe.colorOverrides.glowColor.label !== recipe.colorOverrides.bodyColor?.label &&
    recipe.colorOverrides.glowColor.label !==
      recipe.colorOverrides.accessoryColor?.label
      ? `发光点：${recipe.colorOverrides.glowColor.label}`
      : null,
  ].filter((value): value is string => Boolean(value));
  const localTweaks = Object.values(recipe.localTweaks)
    .filter((value): value is PromptCustomizationLocalTweak => Boolean(value))
    .map((value) => value.label);
  const hasRuntimeGeneratedAccessories = recipe.resolvedExecutionPlan.addAccessories.some(
    (execution) => execution.executionMode === "runtime-generated",
  );
  const hasApproximateAccessories = recipe.resolvedExecutionPlan.addAccessories.some(
    (execution) => execution.executionMode === "approximate-fallback",
  );
  const accessorySummary =
    hasRuntimeGeneratedAccessories
      ? "实验附加小件：按实例执行"
      : hasApproximateAccessories
        ? "近似配件：按实例回退"
        : recipe.accessoryOperation.type === "remove-default"
      ? `移除默认配饰${recipe.accessoryOperation.targetLabel ? `：${recipe.accessoryOperation.targetLabel}` : ""}`
      : recipe.accessoryOperation.type === "replace-with-supported"
        ? `替换为支持配饰：${recipe.accessoryOperation.label}`
      : recipe.accessoryOperation.type === "generate-simple-accessory"
        ? recipe.customizationProfile === "experimental-addon"
          ? `实验附加小件：${recipe.accessoryOperation.label}`
          : recipe.accessoryOperation.accessoryKey
            ? `近似配件：${recipe.accessoryOperation.label} -> ${getFoxAccessoryLabel(recipe.accessoryOperation.accessoryKey as never)}`
            : `已理解小件需求：${recipe.accessoryOperation.label}（稳定定制暂未执行）`
        : `沿用主题默认配饰：${recipe.accessoryOperation.label}`;
  const dominantFailureModes = uniqueStrings(
    recipe.dominantFailureModes?.length
      ? recipe.dominantFailureModes
      : recipe.visualCritiqueReports
          .map((report) => report.dominantFailureMode)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  const precisionGatePassed =
    typeof recipe.precisionGatePassed === "boolean"
      ? recipe.precisionGatePassed
      : recipe.qualityGatePassed === true && dominantFailureModes.length === 0;
  const precisionReady =
    typeof recipe.precisionReady === "boolean"
      ? recipe.precisionReady
      : precisionGatePassed;

  return {
    mode: recipe.mode,
    modeLabel: getGenerationModeLabel(recipe.mode),
    customizationProfile: recipe.customizationProfile,
    customizationProfileLabel: getCustomizationProfileLabel(
      recipe.customizationProfile,
    ),
    parserSource: recipe.parserSource,
    parserLabel: getCustomizationParserLabel(recipe.parserSource),
    designPlannerSource: recipe.designPlannerSource,
    designPlannerModes: uniqueStrings(
      accessoryFulfillmentRows
        .map((row) => row.runtimeDesignSource)
        .filter(
          (
            value,
          ): value is NonNullable<(typeof accessoryFulfillmentRows)[number]["runtimeDesignSource"]> =>
            typeof value === "string",
        ),
    ) as PromptCustomizationRuntimeDesignSource[],
    requestedTheme: recipe.requestedTheme,
    resolvedTheme: recipe.resolvedTheme,
    themeLabel: recipe.themeLabel,
    themeReason: recipe.themeReason,
    bodyPaletteIntent: recipe.bodyPaletteIntent,
    detailPaletteIntent: recipe.detailPaletteIntent,
    fromThemeDefaults: recipe.fromThemeDefaults,
    fromPromptOverrides: recipe.fromPromptOverrides,
    colorOverrides,
    accessorySummary,
    requestedAccessoryCount: recipe.executionScorecard.requestedAccessoryCount,
    executedAccessoryCount: recipe.executionScorecard.executedAccessoryCount,
    runtimeDesignTaskCount: recipe.runtimeDesignTasks.length,
    nounDesignBriefCount: recipe.nounDesignBriefs.length,
    partGraphCount: recipe.partGraphs.length,
    geometryRecipeCount: recipe.geometryRecipes.length,
    visualCritiqueCount: recipe.visualCritiqueReports.length,
    runtimeAttemptBudgetMs: recipe.runtimeAttemptBudgetMs,
    removedDefaultAccessories: recipe.executionScorecard.removedDefaultAccessories,
    keptThemeDefaults: recipe.executionScorecard.keptThemeDefaults,
    approximatedAccessoryFamilies:
      recipe.executionScorecard.approximatedAccessoryFamilies,
    repairPassTriggered: recipe.resolvedExecutionPlan.repairPassTriggered,
    requestedAccessories: recipe.executionScorecard.requestedAccessories,
    executedAccessories: recipe.executionScorecard.executedAccessories,
    approximatedAccessories: recipe.executionScorecard.approximatedAccessories,
    unsupportedAccessories: recipe.executionScorecard.unsupportedAccessories,
    localTweaks,
    negations: recipe.negations,
    unsupportedRequests: recipe.unsupportedRequests,
    unsupportedNotes: recipe.unsupportedNotes,
    executedCustomizations: recipe.executedCustomizations,
    deferredCustomizations: recipe.deferredCustomizations,
    experimentalWarnings: recipe.experimentalWarnings,
    confidence: recipe.confidence,
    executionScorecard: recipe.executionScorecard,
    accessoryFulfillmentRows,
    budgetUsedMs: recipe.budgetUsedMs,
    refinementPassCount: recipe.refinementPassCount,
    qualityScore: recipe.qualityScore,
    qualityGatePassed: recipe.qualityGatePassed,
    precisionGatePassed,
    precisionReady,
    visualAcceptanceGatePassed:
      typeof recipe.visualAcceptanceGatePassed === "boolean"
        ? recipe.visualAcceptanceGatePassed
        : accessoryFulfillmentRows.every(
            (row) => row.executionStatus !== "implemented" || row.visualAcceptanceGatePassed === true,
          ),
    stopReason: recipe.stopReason,
    stopDiagnostics: recipe.stopDiagnostics,
    critiqueSource:
      recipe.critiqueSource ??
      recipe.visualCritiqueReports.find((report) => report.source === "render-hybrid")
        ?.source ??
      recipe.visualCritiqueReports.find((report) => report.source === "viewport-capture")
        ?.source ??
      recipe.visualCritiqueReports[0]?.source,
    structureRepairCount:
      typeof recipe.structureRepairCount === "number"
        ? recipe.structureRepairCount
        : recipe.visualCritiqueReports.reduce(
            (count, report) =>
              count +
              (Array.isArray(report.repairActions)
                ? report.repairActions.filter(
                    (action) =>
                      action.source === "structural" ||
                      action.actionType === "tighten-cohesion" ||
                      action.actionType === "re-parent-part" ||
                      action.actionType === "rebuild-from-root",
                  ).length
                : 0),
            0,
          ),
    renderCritiqueAvailable:
      typeof recipe.renderCritiqueAvailable === "boolean"
        ? recipe.renderCritiqueAvailable
        : recipe.runtimeDesignTasks.length === 0
          ? true
          : recipe.visualCritiqueReports.some((report) => report.source === "render-hybrid"),
    sourceModes:
      recipe.sourceModes?.length
        ? recipe.sourceModes
        : (uniqueStrings(
            accessoryFulfillmentRows
              .map((row) => row.sourceMode)
              .filter(
                (
                  value,
                ): value is NonNullable<(typeof accessoryFulfillmentRows)[number]["sourceMode"]> =>
                  typeof value === "string",
              ),
          ) as NonNullable<GenerationCustomizationSummary["sourceModes"]>),
    referenceUsed:
      typeof recipe.referenceUsed === "boolean"
        ? recipe.referenceUsed
        : accessoryFulfillmentRows.some((row) => typeof row.referenceId === "string"),
    blueprintFamilies:
      recipe.blueprintFamilies?.length
        ? recipe.blueprintFamilies
        : uniqueStrings(
            accessoryFulfillmentRows
              .map((row) => row.blueprintFamily)
              .filter(
                (
                  value,
                ): value is NonNullable<(typeof accessoryFulfillmentRows)[number]["blueprintFamily"]> =>
                  typeof value === "string",
              ),
          ),
    variantIds:
      recipe.variantIds?.length
        ? recipe.variantIds
        : uniqueStrings(
            accessoryFulfillmentRows
              .map((row) => row.variantId)
              .filter((value): value is string => typeof value === "string"),
          ),
    rawFirstReadResults:
      recipe.rawFirstReadResults?.length
        ? recipe.rawFirstReadResults
        : uniqueStrings(
            accessoryFulfillmentRows
              .map((row) => row.rawFirstReadResult)
              .filter((value): value is string => typeof value === "string"),
          ),
    firstReadResults:
      recipe.firstReadResults?.length
        ? recipe.firstReadResults
        : uniqueStrings(
            accessoryFulfillmentRows
              .map((row) => row.firstReadResult)
              .filter((value): value is string => typeof value === "string"),
          ),
    canonicalFirstReads:
      recipe.canonicalFirstReads?.length
        ? recipe.canonicalFirstReads
        : uniqueStrings(
            accessoryFulfillmentRows
              .map((row) => row.canonicalFirstRead)
              .filter((value): value is string => typeof value === "string"),
          ),
    rawDominantSpanOwnerTexts:
      recipe.rawDominantSpanOwnerTexts?.length
        ? recipe.rawDominantSpanOwnerTexts
        : uniqueStrings(
            accessoryFulfillmentRows
              .map((row) => row.rawDominantSpanOwnerText)
              .filter((value): value is string => typeof value === "string"),
          ),
    visualVetoReasons:
      recipe.visualVetoReasons?.length
        ? recipe.visualVetoReasons
        : uniqueStrings(
            accessoryFulfillmentRows
              .map((row) => row.visualVetoReason)
              .filter((value): value is string => typeof value === "string"),
          ),
    visualFailureReasons:
      recipe.visualFailureReasons?.length
        ? recipe.visualFailureReasons
        : uniqueStrings(
            accessoryFulfillmentRows
              .flatMap((row) => row.visualFailureReasons ?? [])
              .filter((value): value is string => typeof value === "string"),
          ),
    faceIntrusionSeverity:
      typeof recipe.faceIntrusionSeverity === "number"
        ? recipe.faceIntrusionSeverity
        : recipe.visualCritiqueReports.length > 0
          ? recipe.visualCritiqueReports.reduce((maxValue, report) => {
              if (typeof report.faceIntrusionSeverity !== "number") {
                return maxValue;
              }

              return Math.max(maxValue, report.faceIntrusionSeverity);
            }, 0)
          : undefined,
    dominantSpanOwner:
      typeof recipe.dominantSpanOwner === "string"
        ? recipe.dominantSpanOwner
        : recipe.visualCritiqueReports.find(
            (report) =>
              typeof report.dominantSpanOwner === "string" && report.dominantSpanOwner,
          )?.dominantSpanOwner,
    canonicalDominantSpanOwner:
      typeof recipe.canonicalDominantSpanOwner === "string"
        ? recipe.canonicalDominantSpanOwner
        : recipe.visualCritiqueReports.find(
            (report) =>
              typeof report.canonicalDominantSpanOwner === "string" &&
              report.canonicalDominantSpanOwner,
          )?.canonicalDominantSpanOwner,
    dominantFailureLayer:
      typeof recipe.dominantFailureLayer === "string"
        ? recipe.dominantFailureLayer
        : recipe.visualCritiqueReports.find(
            (report) =>
              typeof report.dominantFailureLayer === "string" &&
              report.dominantFailureLayer,
          )?.dominantFailureLayer,
    rebuildCountByLayer:
      recipe.rebuildCountByLayer &&
      Object.values(recipe.rebuildCountByLayer).some(
        (value) => typeof value === "number" && value > 0,
      )
        ? recipe.rebuildCountByLayer
        : undefined,
    finalReadOrder:
      Array.isArray(recipe.finalReadOrder) && recipe.finalReadOrder.length > 0
        ? recipe.finalReadOrder
        : recipe.visualCritiqueReports.find(
            (report) => Array.isArray(report.finalReadOrder) && report.finalReadOrder.length > 0,
          )?.finalReadOrder,
    precisionFailureSummary:
      typeof recipe.precisionFailureSummary === "string"
        ? recipe.precisionFailureSummary
        : undefined,
    plateauReason:
      typeof recipe.plateauReason === "string" ? recipe.plateauReason : undefined,
    qualityMetrics: recipe.qualityMetrics,
    dominantFailureModes,
  };
}

export function buildStructuredCustomizationPrompt({
  prompt,
  styleLabel,
  templateVersion,
  generatorMode,
  cameraPreset,
  posePreset,
  arPlacementPreset,
  recipe,
}: {
  prompt: string;
  styleLabel: string;
  templateVersion: string;
  generatorMode: string;
  cameraPreset: string;
  posePreset?: string;
  arPlacementPreset?: string;
  recipe: PromptCustomizationRecipe;
}) {
  const themeDefaults =
    recipe.fromThemeDefaults.length > 0
      ? recipe.fromThemeDefaults.join(" + ")
      : "无";
  const overrides =
    recipe.fromPromptOverrides.length > 0
      ? recipe.fromPromptOverrides.join(" + ")
      : "无";
  const negations = recipe.negations.length > 0 ? recipe.negations.join(" + ") : "无";
  const unsupported =
    recipe.unsupportedRequests.length > 0
      ? recipe.unsupportedRequests.join(" + ")
      : "无";

  return `对象: 已支持物种模板变体生成; 当前物种: fox; 模板: ${templateVersion}; 生成链路: ${generatorMode}; 请求模式: ${getGenerationModeLabel(recipe.mode)}; 定制档位: ${getCustomizationProfileLabel(recipe.customizationProfile)}; 风格: ${styleLabel}; 主题槽位: ${recipe.themeSlot}; 主题标签: ${recipe.themeLabel}; 解析来源: ${getCustomizationParserLabel(recipe.parserSource)}; 主题继承: ${themeDefaults}; Prompt 覆盖: ${overrides}; 否定词: ${negations}; 超范围要求: ${unsupported}; 文本归一化: ${prompt}; 相机预设: ${cameraPreset}; 姿态预设: ${posePreset ?? "默认"}; Android 摆放预设: ${arPlacementPreset ?? "默认"}; 输出: model.glb + model.usdz + thumbnail.png + metadata.json;`;
}

export function buildCustomizationNotes(recipe: PromptCustomizationRecipe) {
  const notes = [
    `${getGenerationModeLabel(recipe.mode)} / ${getCustomizationProfileLabel(recipe.customizationProfile)} 已启用；当前解析来源为 ${getCustomizationParserLabel(recipe.parserSource)}。`,
    `主题默认继承：${recipe.fromThemeDefaults.join(" / ") || "无"}`,
    recipe.fromPromptOverrides.length > 0
      ? `Prompt 动态覆盖：${recipe.fromPromptOverrides.join(" / ")}`
      : "当前没有额外 prompt 覆盖，沿用主题默认配置。",
  ];

  if (recipe.negations.length > 0) {
    notes.push(`检测到否定词：${recipe.negations.join(" / ")}`);
  }

  if (recipe.unsupportedNotes.length > 0) {
    notes.push(...recipe.unsupportedNotes);
  }

  if (recipe.executedCustomizations.length > 0) {
    notes.push(`本次实际执行：${recipe.executedCustomizations.join(" / ")}`);
  }

  if (recipe.deferredCustomizations.length > 0) {
    notes.push(`当前延后执行：${recipe.deferredCustomizations.join(" / ")}`);
  }

  if (recipe.experimentalWarnings.length > 0) {
    notes.push(...recipe.experimentalWarnings);
  }

  if (recipe.executionScorecard.approximated.length > 0) {
    notes.push(`近似实现：${recipe.executionScorecard.approximated.join(" / ")}`);
  }

  if (recipe.executionScorecard.unsupported.length > 0) {
    notes.push(`未实现：${recipe.executionScorecard.unsupported.join(" / ")}`);
  }

  return notes;
}

export function derivePromptCustomizationFallback(
  input: CreateGenerationInput,
) {
  return buildRuleFallbackRecipe(
    input.prompt,
    input.style,
    input.generationMode,
    resolveCustomizationProfile(input),
  );
}

export async function parsePromptCustomizationRecipe(
  input: CreateGenerationInput,
) {
  const fallback = derivePromptCustomizationFallback(input);
  const parsedRecipe = await tryParseWithOpenAi(input, fallback);
  const reconciled = reconcilePromptSpecificOverrides(
    parsedRecipe,
    fallback,
    normalizePrompt(input.prompt),
  );
  return maybePlanRuntimeDesignsWithOpenAi(input, reconciled);
}

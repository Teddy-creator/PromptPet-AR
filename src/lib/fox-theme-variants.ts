import {
  currentTemplateVersion,
  foxBaseDemoModelUrl,
  foxBaseDemoPosterUrl,
  foxBaseDemoUsdzUrl,
} from "./fox-base-contract";
import type { StyleTemplate } from "./generation-types";

export const foxThemeSlots = [
  "night-glow",
  "forest-scout",
  "lucky-charm",
  "strawberry-sweet",
  "cream-toy",
] as const;

export type FoxThemeSlot = (typeof foxThemeSlots)[number];

export function isFoxThemeSlot(value: string): value is FoxThemeSlot {
  return (foxThemeSlots as readonly string[]).includes(value);
}

export const foxAccessoryKeys = [
  "accessoryBell",
  "accessoryScarf",
  "accessoryFlower",
  "accessoryCrown",
  "accessoryTag",
  "accessoryTie",
  "accessoryBadge",
  "accessoryBow",
  "accessoryPendant",
  "accessoryNone",
] as const;

export type FoxAccessoryKey = (typeof foxAccessoryKeys)[number];

export const foxEyeMoods = ["neutral", "gentle", "alert"] as const;

export type FoxEyeMood = (typeof foxEyeMoods)[number];

const demoAssetVersion = "20260326-v10a";

function withDemoAssetVersion(url: string) {
  return `${url}?v=${demoAssetVersion}`;
}

function buildThemeAssetUrl(theme: string, extension: "glb" | "usdz") {
  return withDemoAssetVersion(`/demo/${currentTemplateVersion}-${theme}.${extension}`);
}

function buildThemePosterUrl(theme: string) {
  return `/demo/${currentTemplateVersion}-${theme}-poster.png`;
}

type FoxThemeConfig = {
  label: string;
  keywords: string[];
  displayName: string;
  defaultAccessory: FoxAccessoryKey;
  demoAssets: {
    modelUrl: string;
    posterUrl: string;
    usdzUrl: string;
  };
};

const foxThemeConfig: Record<FoxThemeSlot, FoxThemeConfig> = {
  "night-glow": {
    label: "夜灯精灵",
    keywords: ["夜", "月光", "星光", "发光", "霓虹", "glow", "aurora", "梦幻"],
    displayName: "夜灯小狐",
    defaultAccessory: "accessoryCrown",
    demoAssets: {
      modelUrl: buildThemeAssetUrl("night-glow", "glb"),
      posterUrl: buildThemePosterUrl("night-glow"),
      usdzUrl: buildThemeAssetUrl("night-glow", "usdz"),
    },
  },
  "cream-toy": {
    label: "奶油玩具",
    keywords: ["奶油", "玩具", "盲盒", "树脂", "软萌", "cream", "toy"],
    displayName: "奶油小狐",
    defaultAccessory: "accessoryTag",
    demoAssets: {
      modelUrl: buildThemeAssetUrl("cream-toy", "glb"),
      posterUrl: buildThemePosterUrl("cream-toy"),
      usdzUrl: buildThemeAssetUrl("cream-toy", "usdz"),
    },
  },
  "forest-scout": {
    label: "森林巡游",
    keywords: ["森林", "巡游", "探险", "冒险", "forest", "scout", "moss"],
    displayName: "森巡小狐",
    defaultAccessory: "accessoryScarf",
    demoAssets: {
      modelUrl: buildThemeAssetUrl("forest-scout", "glb"),
      posterUrl: buildThemePosterUrl("forest-scout"),
      usdzUrl: buildThemeAssetUrl("forest-scout", "usdz"),
    },
  },
  "lucky-charm": {
    label: "幸运守护",
    keywords: ["幸运", "守护", "开运", "护符", "lucky", "charm"],
    displayName: "招福小狐",
    defaultAccessory: "accessoryBell",
    demoAssets: {
      modelUrl: foxBaseDemoModelUrl,
      posterUrl: foxBaseDemoPosterUrl,
      usdzUrl: foxBaseDemoUsdzUrl,
    },
  },
  "strawberry-sweet": {
    label: "草莓甜点",
    keywords: ["草莓", "甜点", "莓果", "甜", "strawberry", "berry"],
    displayName: "莓莓小狐",
    defaultAccessory: "accessoryFlower",
    demoAssets: {
      modelUrl: buildThemeAssetUrl("strawberry-sweet", "glb"),
      posterUrl: buildThemePosterUrl("strawberry-sweet"),
      usdzUrl: buildThemeAssetUrl("strawberry-sweet", "usdz"),
    },
  },
};

const accessoryLabels: Record<FoxAccessoryKey, string> = {
  accessoryBell: "小铃铛",
  accessoryScarf: "小围巾",
  accessoryFlower: "耳边小花",
  accessoryCrown: "星冠",
  accessoryTag: "小吊牌",
  accessoryTie: "小领带",
  accessoryBadge: "小徽章",
  accessoryBow: "蝴蝶结",
  accessoryPendant: "小吊坠",
  accessoryNone: "无配饰",
};

const accessoryKeywordOverrides: Array<{
  key: FoxAccessoryKey;
  label: string;
  keywords: string[];
}> = [
  {
    key: "accessoryTie",
    label: "小领带",
    keywords: ["领带", "necktie", "tie"],
  },
  {
    key: "accessoryBadge",
    label: "小徽章",
    keywords: ["徽章", "badge", "勋章", "胸针"],
  },
  {
    key: "accessoryBow",
    label: "蝴蝶结",
    keywords: ["蝴蝶结", "bow"],
  },
  {
    key: "accessoryPendant",
    label: "小吊坠",
    keywords: ["吊坠", "挂坠", "pendant"],
  },
  {
    key: "accessoryBell",
    label: "小铃铛",
    keywords: ["铃铛", "bell", "开运", "护符"],
  },
  {
    key: "accessoryScarf",
    label: "小围巾",
    keywords: ["围巾", "scarf", "披肩"],
  },
  {
    key: "accessoryFlower",
    label: "耳边小花",
    keywords: ["小花", "花", "flower", "雏菊"],
  },
  {
    key: "accessoryCrown",
    label: "星冠",
    keywords: ["皇冠", "星冠", "crown", "tiara"],
  },
  {
    key: "accessoryTag",
    label: "小吊牌",
    keywords: ["吊牌", "tag"],
  },
];

function matchesKeywords(prompt: string, keywords: string[]) {
  return keywords.some((keyword) => prompt.includes(keyword));
}

function countThemeKeywordScore(prompt: string, keywords: string[]) {
  return keywords.reduce((score, keyword) => {
    if (!prompt.includes(keyword)) {
      return score;
    }

    return score + Math.max(keyword.length, 1);
  }, 0);
}

const negationPrefixes = [
  "不要",
  "别",
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

const noAccessoryPhrases = [
  "不要配饰",
  "不要任何配饰",
  "什么配饰都不要",
  "什么装饰都不要",
  "不要挂件",
  "不要饰品",
  "无配饰",
  "没有配饰",
  "不带配饰",
  "不要任何挂饰",
];

function hasNegatedKeyword(prompt: string, keywords: string[]) {
  return keywords.some((keyword) =>
    negationPrefixes.some((prefix) =>
      [
        `${prefix}${keyword}`,
        `${prefix}小${keyword}`,
        `${prefix}一个${keyword}`,
        `${prefix}任何${keyword}`,
      ].some((phrase) => prompt.includes(phrase)),
    ),
  );
}

function wantsNoAccessory(prompt: string) {
  return noAccessoryPhrases.some((phrase) => prompt.includes(phrase));
}

export function detectFoxThemeSlot(
  prompt: string,
  style: StyleTemplate,
): FoxThemeSlot {
  const normalized = prompt.toLowerCase();
  const explicitThemePatterns: Array<[FoxThemeSlot, string[]]> = [
    ["night-glow", ["夜灯主题", "夜灯风", "梦幻发光主题", "夜光主题"]],
    ["forest-scout", ["森林巡游主题", "森林主题", "巡游主题", "森林探险主题"]],
    ["lucky-charm", ["幸运守护主题", "幸运主题", "守护主题", "开运主题"]],
    ["strawberry-sweet", ["草莓甜点主题", "甜点主题", "莓果主题", "草莓主题"]],
    ["cream-toy", ["奶油玩具主题", "奶油主题", "玩具主题"]],
  ];

  for (const [themeSlot, patterns] of explicitThemePatterns) {
    if (patterns.some((pattern) => normalized.includes(pattern))) {
      return themeSlot;
    }
  }

  let bestTheme: FoxThemeSlot | null = null;
  let bestScore = 0;

  for (const theme of foxThemeSlots) {
    const score = countThemeKeywordScore(normalized, foxThemeConfig[theme].keywords);

    if (score > bestScore) {
      bestTheme = theme;
      bestScore = score;
    }
  }

  if (bestTheme) {
    return bestTheme;
  }

  if (style === "dream-glow") {
    return "night-glow";
  }

  if (style === "low-poly") {
    return "forest-scout";
  }

  return "cream-toy";
}

export function getFoxThemeLabel(theme: FoxThemeSlot) {
  return foxThemeConfig[theme].label;
}

export function getFoxThemeDisplayName(theme: FoxThemeSlot) {
  return foxThemeConfig[theme].displayName;
}

export function getFoxThemeDemoAssets(theme: FoxThemeSlot) {
  return foxThemeConfig[theme].demoAssets;
}

export function getFoxThemeDefaultAccessory(theme: FoxThemeSlot) {
  return foxThemeConfig[theme].defaultAccessory;
}

export function getFoxAccessoryLabel(accessory: FoxAccessoryKey) {
  return accessoryLabels[accessory];
}

function detectFoxAccessoryDirective(
  prompt: string,
  theme: FoxThemeSlot,
): { key: FoxAccessoryKey; label: string } {
  const normalized = prompt.toLowerCase();
  const defaultAccessory = getFoxThemeDefaultAccessory(theme);

  if (wantsNoAccessory(normalized)) {
    return {
      key: "accessoryNone",
      label: getFoxAccessoryLabel("accessoryNone"),
    };
  }

  const matched = accessoryKeywordOverrides.find(({ keywords }) =>
    !hasNegatedKeyword(normalized, keywords) &&
    matchesKeywords(normalized, keywords),
  );

  if (matched) {
    return {
      key: matched.key,
      label: matched.label,
    };
  }

  const defaultKeywords =
    accessoryKeywordOverrides
      .filter(({ key }) => key === defaultAccessory)
      .flatMap(({ keywords }) => keywords) ?? [];

  if (defaultKeywords.length > 0 && hasNegatedKeyword(normalized, defaultKeywords)) {
    return {
      key: "accessoryNone",
      label: getFoxAccessoryLabel("accessoryNone"),
    };
  }

  return {
    key: defaultAccessory,
    label: getFoxAccessoryLabel(defaultAccessory),
  };
}

export function detectFoxEyeMood(prompt: string): FoxEyeMood {
  const normalized = prompt.toLowerCase();

  if (
    normalized.includes("大眼") ||
    normalized.includes("眼睛大") ||
    normalized.includes("无辜") ||
    normalized.includes("温柔")
  ) {
    return "gentle";
  }

  if (
    normalized.includes("警觉") ||
    normalized.includes("机灵") ||
    normalized.includes("酷") ||
    normalized.includes("sharp")
  ) {
    return "alert";
  }

  return "neutral";
}

export function deriveFoxDisplayName(
  prompt: string,
  style: StyleTemplate,
): string {
  const theme = detectFoxThemeSlot(prompt, style);
  return getFoxThemeDisplayName(theme);
}

export function deriveFoxPromptVariant(
  prompt: string,
  style: StyleTemplate,
) {
  const themeSlot = detectFoxThemeSlot(prompt, style);
  const accessoryDirective = detectFoxAccessoryDirective(prompt, themeSlot);

  return {
    themeSlot,
    themeLabel: getFoxThemeLabel(themeSlot),
    accessoryKey: accessoryDirective.key,
    accessoryLabel: accessoryDirective.label,
    eyeMood: detectFoxEyeMood(prompt),
  };
}

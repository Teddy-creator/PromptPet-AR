import type {
  CustomizationProfile,
  GenerationMode,
  StyleTemplate,
} from "@/lib/generation-types";

export type DemoPromptPackEntry = {
  id: string;
  shortLabelZh: string;
  shortLabelEn: string;
  promptZh: string;
  promptEn: string;
  style: StyleTemplate;
  generationMode: GenerationMode;
  customizationProfile?: CustomizationProfile;
  expectedFirstReads?: string[];
  demoUse: "homepage-chip" | "operator-demo";
};

export const demoPromptPack: DemoPromptPackEntry[] = [
  {
    id: "left-ear-fish",
    shortLabelZh: "左耳小鱼",
    shortLabelEn: "Ear Fish",
    promptZh: "不要任何配饰，除了左耳一个绿色小鱼挂饰。",
    promptEn: "No accessories except a small green fish charm on the left ear.",
    style: "low-poly",
    generationMode: "dynamic-custom",
    customizationProfile: "experimental-addon",
    expectedFirstReads: ["小鱼", "fish"],
    demoUse: "homepage-chip",
  },
  {
    id: "ear-flower-clover",
    shortLabelZh: "双耳花饰",
    shortLabelEn: "Flower Ears",
    promptZh:
      "做一只草莓甜点主题的小狐狸桌宠，莓果粉和奶油白配色，左耳旁边有一朵绿色小花，右耳朵有个红色的四叶草。",
    promptEn:
      "Create a strawberry dessert fox desk pet in berry pink and cream white, with a green flower near the left ear and a red clover on the right ear.",
    style: "low-poly",
    generationMode: "dynamic-custom",
    customizationProfile: "experimental-addon",
    expectedFirstReads: ["小花", "四叶草", "flower", "clover"],
    demoUse: "operator-demo",
  },
  {
    id: "chest-black-scarf",
    shortLabelZh: "黑色围巾",
    shortLabelEn: "Black Scarf",
    promptZh: "做一只胸前系着黑色小围巾、适合桌面摆放的小狐狸桌宠。",
    promptEn:
      "Create a small fox desk pet with a black scarf tied around its chest, made for display on a desk.",
    style: "cream-toy",
    generationMode: "dynamic-custom",
    customizationProfile: "experimental-addon",
    expectedFirstReads: ["围巾", "scarf"],
    demoUse: "homepage-chip",
  },
  {
    id: "chest-gold-badge",
    shortLabelZh: "金色校徽",
    shortLabelEn: "Gold Badge",
    promptZh: "做一只胸前别着金色校徽、奶油色、适合桌面摆放的小狐狸桌宠。",
    promptEn:
      "Create a cream-colored fox desk pet with a gold badge pinned to its chest, suitable for desk display.",
    style: "cream-toy",
    generationMode: "dynamic-custom",
    customizationProfile: "experimental-addon",
    expectedFirstReads: ["校徽", "badge"],
    demoUse: "homepage-chip",
  },
  {
    id: "chest-camera",
    shortLabelZh: "胸前相机",
    shortLabelEn: "Chest Camera",
    promptZh: "做一只胸前挂着小相机、奶油色、适合桌面摆放的小狐狸桌宠",
    promptEn:
      "Create a cream-colored fox desk pet for tabletop display with a small camera hanging on its chest.",
    style: "cream-toy",
    generationMode: "dynamic-custom",
    customizationProfile: "experimental-addon",
    expectedFirstReads: ["小相机", "camera"],
    demoUse: "operator-demo",
  },
  {
    id: "right-ear-camera",
    shortLabelZh: "耳侧相机",
    shortLabelEn: "Ear Camera",
    promptZh: "做一只小狐狸桌宠，右耳一个银色相机挂件。",
    promptEn: "Create a fox desk pet with a silver camera charm on the right ear.",
    style: "cream-toy",
    generationMode: "dynamic-custom",
    customizationProfile: "experimental-addon",
    expectedFirstReads: ["相机", "camera"],
    demoUse: "homepage-chip",
  },
];

export const homepageDemoPromptIds = [
  "chest-black-scarf",
  "chest-gold-badge",
  "right-ear-camera",
] as const;

export const homepageDemoPrompts = homepageDemoPromptIds
  .map((id) => demoPromptPack.find((entry) => entry.id === id))
  .filter((entry): entry is DemoPromptPackEntry => Boolean(entry));

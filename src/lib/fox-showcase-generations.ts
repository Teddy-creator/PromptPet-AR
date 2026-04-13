import type { StyleTemplate } from "./generation-types";
import type { FoxThemeSlot } from "./fox-theme-variants";

export type FoxShowcaseGeneration = {
  id: string;
  title: string;
  prompt: string;
  style: StyleTemplate;
  themeSlot: FoxThemeSlot;
  blurb: string;
};

export const foxShowcaseGenerations: FoxShowcaseGeneration[] = [
  {
    id: "fox-base-demo",
    title: "招福小狐",
    prompt:
      "做一只幸运守护主题的小狐狸桌宠，暖沙奶油配色，胸前挂一个小铃铛，像书桌角落的开运盲盒",
    style: "cream-toy",
    themeSlot: "lucky-charm",
    blurb: "暖沙奶油 + 小铃铛，最适合做 Android 桌宠 Demo 的默认样本。",
  },
  {
    id: "fox-cream-demo",
    title: "奶油小狐",
    prompt:
      "做一只奶油玩具主题的小狐狸桌宠，奶白和焦糖配色，胸前挂一个小吊牌，像高质感盲盒摆件",
    style: "cream-toy",
    themeSlot: "cream-toy",
    blurb: "更像收藏级树脂玩具，重点看柔和材质和吊牌小件。",
  },
  {
    id: "fox-forest-demo",
    title: "森巡小狐",
    prompt:
      "做一只森林巡游主题的小狐狸桌宠，苔绿和奶白配色，围一条小围巾，像迷你探险队吉祥物",
    style: "low-poly",
    themeSlot: "forest-scout",
    blurb: "更偏轻量游戏吉祥物，重点看围巾和偏清爽的轮廓气质。",
  },
  {
    id: "fox-night-demo",
    title: "夜灯小狐",
    prompt:
      "做一只夜灯精灵主题的小狐狸桌宠，月雾紫和奶白配色，戴一个很小的星冠，尾巴末端像小夜灯一样发亮",
    style: "dream-glow",
    themeSlot: "night-glow",
    blurb: "更偏发光演示，重点看尾巴末端和小星冠的夜灯感。",
  },
  {
    id: "fox-strawberry-demo",
    title: "莓莓小狐",
    prompt:
      "做一只草莓甜点主题的小狐狸桌宠，莓果粉和奶油白配色，左耳旁边别一朵小花，像甜品店吉祥物",
    style: "cream-toy",
    themeSlot: "strawberry-sweet",
    blurb: "更偏甜点系桌宠，重点看粉色体系和耳边小花。",
  },
];

export const demoGenerationId = foxShowcaseGenerations[0].id;

export function getFoxShowcaseGenerationById(id: string) {
  return foxShowcaseGenerations.find((generation) => generation.id === id) ?? null;
}

import type { StyleTemplate } from "./generation-types";

export const styleTemplateDetails: Record<
  StyleTemplate,
  {
    label: string;
    summary: string;
    mood: string;
  }
> = {
  "cream-toy": {
    label: "奶油玩具感",
    summary: "像高质感盲盒树脂，最适合铃铛、草莓和暖沙奶油这类主题件。",
    mood: "温柔 / 收藏感 / 更像可爱桌宠成品",
  },
  "low-poly": {
    label: "低模卡通感",
    summary: "把结构读得更清楚，适合森林巡游、围巾和徽章类主题。",
    mood: "清爽 / 冒险感 / 更像轻量游戏吉祥物",
  },
  "dream-glow": {
    label: "梦幻发光感",
    summary: "保留尾巴末端和眼睛的发光余地，适合夜灯和星尘主题。",
    mood: "发光 / 星尘 / 更像会呼吸的小精灵",
  },
};

export const examplePrompts = [
  "做一只幸运守护主题的小狐狸桌宠，暖沙奶油配色，胸前挂一个小铃铛，像书桌角落的开运盲盒",
  "做一只森林巡游主题的小狐狸桌宠，苔绿和奶白配色，围一条小围巾，像迷你探险队吉祥物",
  "做一只梦幻发光感的小狐狸桌宠，尾巴末端像月光小夜灯一样发亮，额头戴一个很小的星冠",
  "做一只草莓甜点主题的小狐狸桌宠，莓果粉和奶油白配色，左耳旁边有一朵小花",
];

export function isStyleTemplate(value: string): value is StyleTemplate {
  return value in styleTemplateDetails;
}

# PromptPet-AR 阶段路线图

## 已完成检查点

### 阶段 0：收敛范围

- 已锁定第一物种为 `fox`
- 已锁定三套风格模板
- 已锁定 `Android first`，iPhone 保持兼容

### 阶段 1：生成链路 PoC

- 已跑通 Blender MCP -> `glb`
- 已从 procedural 基线切到 repo 内模板化生成路线

### 阶段 2：网页预览

- 已有首页、结果页、分享页
- 已稳定接入 `model-viewer` 预览

### 阶段 3：手机 AR

- Android Scene Viewer 已可验收
- iPhone Quick Look 已具备兼容入口与 `usdz` 产物位

### 阶段 4：分享体验

- 分享页已具备首版可演示体验
- 当前已形成 `fox-base-v3` Android-first Demo 检查点

## 当前阶段

### 阶段 5：`fox-base-v10` 作品集质感主线

目标：

- 把主路线正式固定为“仓库内母体资产 + 代码变体化”
- 把狐狸做得更像桌宠成品，而不是继续横向扩功能
- 优先提高脸部可读性、头身连续性、尾巴根部关系、主题可读性和 Android 观感一致性
- 先用 5 组固定主题样本证明“这不像同一只狐狸只换了一句文案”

完成标准：

- 不看文案也能先读出“狐狸”
- `model-viewer` 旋转时不再明显暴露程序拼件感
- Web 预览、海报、Android AR 的资产观感更一致
- Android 真机展示时更像桌面摆件，而不是粗糙原型
- 首页 showcase、分享页和 mock API 能稳定返回 `招福 / 奶油 / 森巡 / 夜灯 / 草莓` 这 5 条主题种子

## 当前最建议的节奏

1. 先保留 `fox-base-v9` 作为 Android 可回退检查点
2. 再进入 `fox-base-v10` 母体资产打磨与 Android 作品集展示校准
3. 最后再考虑网站包装、录屏叙事和上线展示

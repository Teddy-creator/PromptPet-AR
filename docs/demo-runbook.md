# PromptPet-AR Demo Runbook

这份 runbook 只服务于一个目标：把 PromptPet-AR 当成一个小而完整的 demo 稳定展示出来。

它不是“万能 3D 生成器”操作手册。
它是“一句 prompt 生成小狐狸桌宠，并支持网页预览与 AR 放置”的展示流程。

## Demo 定位

- 这是一个 `fox-only` 的轻量 AI + 3D + WebAR demo。
- 最适合展示的是：
  - 一句话输入
  - 真实生成状态
  - 结果页兑现说明
  - 网页旋转预览
  - 手机 AR 放置入口
- 不要把它讲成“开放世界 3D 生成平台”。

推荐说法：

> 这是一个我做的 prompt-to-3D 小 demo。用户输入一句中文描述，系统会在固定的小狐狸母体上做主题和配件定制，生成网页可预览的 3D 桌宠，并可以继续放到 AR 场景里。

## 启动

优先用一键命令：

```bash
open /Users/cloud/Code/PromptPet-AR/start.command
```

或在终端里：

```bash
cd /Users/cloud/Code/PromptPet-AR
npm run dev:all
```

当前默认本地开发 provider 是 `DeepSeek`。

打开：

- [http://localhost:3000](http://localhost:3000)

## 推荐演示顺序

### 1. 首页

演示要点：

- 输入一句 prompt
- 支持风格模板
- 支持快速稳定 / 动态定制
- 支持高级 LLM 设置和 BYOK

首页的 prompt chips 已经换成更适合 demo 的推荐语句。

### 2. 结果页

重点讲：

- 系统不是假装“全都满分实现”
- 结果页会诚实区分已实现、近似实现、未实现
- 可以看到 parser / 执行路径 / fulfillment

### 3. 3D 预览

重点讲：

- 用户可以在网页里直接看 3D 结果
- 这个环节比纯图片 demo 更有说服力

### 4. AR 入口

重点讲：

- 结果不是只停在网页卡片
- 可以进一步放进现实空间

## Demo Prompt Pack

这组 prompt 是当前推荐的演示集合。

### 最稳的 live demo trio

这 3 条最适合首页直接点，也最适合现场演示：

1. `做一只胸前系着黑色小围巾、适合桌面摆放的小狐狸桌宠。`
2. `做一只胸前别着金色校徽、奶油色、适合桌面摆放的小狐狸桌宠。`
3. `做一只小狐狸桌宠，右耳一个银色相机挂件。`

2026-04-13 这轮整包真实复跑里，这 3 条是最适合 live demo 的：

- `耳侧相机`：`quality-accepted`，质量分 0.92
- `黑色围巾`：`quality-plateau`，但可读性与整体观感稳定
- `金色校徽`：首读稳定，胸前 rigid 的读图效果最好

### 扩展演示 3 条

这些适合第二轮讲“系统能力边界”时再展示：

1. `做一只胸前挂着小相机、奶油色、适合桌面摆放的小狐狸桌宠`
2. `不要任何配饰，除了左耳一个绿色小鱼挂饰。`
3. `做一只草莓甜点主题的小狐狸桌宠，莓果粉和奶油白配色，左耳旁边有一朵绿色小花，右耳朵有个红色的四叶草。`

## Demo 前的快速检查

如果你在正式展示前只想做一轮快速 sanity check：

```bash
cd /Users/cloud/Code/PromptPet-AR
PROMPTPET_DEMO_ONLY=right-ear-camera npm run demo:prompt-pack
```

如果你想整包跑：

```bash
cd /Users/cloud/Code/PromptPet-AR
npm run demo:prompt-pack
```

脚本会打印每条 prompt 的：

- generation id
- status
- stop reason
- quality score
- first read
- 关键可读性指标

这轮已经完成过一次整包真实复跑，快照见：

- [Demo Validation Snapshot](./demo-validation-2026-04-13.md)

如果你在 `npm run build` 时看到 Turbopack 提示 `output/mock-generations` 匹配了很多文件，这通常只是本地历史生成工件积累太多带来的性能警告，不代表 demo 坏了。

如果你想让本地 build 更清爽，可以先自行清理旧工件目录，再重新 build。

## 展示时的边界

建议主动把边界说清楚：

- 目前主要支持狐狸桌宠
- 更适合 cute accessory / charm / badge / scarf 这类 bounded customization
- 它强调“真实链路”和“诚实结果”，不是拿 mock 图冒充成功

不建议说：

- 任何词都能稳定生成
- 它已经是通用 3D 生成产品
- 所有复杂配件都能高精度满分落地

## 如果现场生成不够理想

不要硬扛。

更稳的处理方式：

1. 先展示已经跑好的 generation 结果页
2. 再说明这个系统的重点是：
   - prompt parsing
   - runtime customization
   - truthful fulfillment
   - web preview + AR chain
3. 如果要继续现场跑，优先顺序是：
   - `右耳银色相机挂件`
   - `胸前黑色小围巾`
   - `胸前金色校徽`
   - 然后再试 `胸前小相机`

## 最适合拿来讲的亮点

- 不是单纯文生图，而是 prompt-to-3D + web preview + AR
- 不是只做静态模板替换，而是有 runtime accessory generation
- 前端支持切换 provider/model/baseUrl/apiKey
- 结果页会诚实表达“已实现 / 近似 / 未实现”

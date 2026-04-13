# Alpha Human Acceptance

这份清单用于当前 alpha 阶段的真人验收。目标不是覆盖所有内部脚本，而是验证用户真正能感知到的主链路是否成立。

## 验收目标

- 能一条命令拉起当前默认开发链路
- 首页可以切换 LLM provider / model / baseUrl / apiKey
- 发起一次生成后，结果页能清楚展示兑现、近似、未实现和 AI 执行路径
- 分享页能保留适合外发的关键兑现信息
- 生成工件里不落盘 raw API key

## 验收前准备

1. 在本机准备至少一套可用的 LLM 环境变量。
   当前默认推荐：

```bash
export DEEPSEEK_API_KEY=your_api_key
export DEEPSEEK_BASE_URL=https://api.deepseek.com
export DEEPSEEK_MODEL=deepseek-chat
```

2. 如果你要验证 OpenAI-compatible 路径，也可以额外准备：

```bash
export OPENAI_COMPAT_API_KEY=your_api_key
export OPENAI_COMPAT_BASE_URL=https://api.xcode.best/v1
export OPENAI_COMPAT_MODEL=gpt-5.4
```

3. 确认依赖已安装：

```bash
npm install
```

## Step 1: 一键启动

运行：

```bash
npm run dev:all
```

如果你这轮要验 operator 级的 OpenAI-compatible 预设，也可以改跑：

```bash
npm run dev:all:xcode
```

预期：

- 启动脚本默认打印 `Provider preset: DeepSeek (default local-dev)`
- 前端默认 LLM 显示为 `deepseek / https://api.deepseek.com / deepseek-chat`
- Next dev server、worker、Blender MCP 本地链路按当前默认脚本拉起

如果你只想先确认启动配置，不真启动全部服务，可以运行：

```bash
PROMPTPET_START_DRY_RUN=1 npm run dev:all
```

## Step 2: 首页检查

1. 打开 [http://localhost:3000](http://localhost:3000)
2. 找到首页 LLM 设置面板
3. 验证默认值是否为：
   - provider: `deepseek`
   - baseUrl: `https://api.deepseek.com`
   - model: `deepseek-chat`
4. 在不刷新页面的情况下，把 provider 改成你要测试的目标
5. 可以按两种路径各验一次：
   - 路径 A：保持 DeepSeek 默认
   - 路径 B：切到 OpenAI-compatible，并填写自己的 `baseUrl / model / apiKey`

预期：

- 面板可编辑
- 输入的值刷新后仍在浏览器里保留
- API key 只显示在当前浏览器输入框中，不出现在页面其他位置

## Step 3: 发起一次生成

建议 prompt：

```text
做一只胸前挂着小相机、奶油色、适合桌面摆放的小狐狸桌宠
```

点击生成，等待进入结果页。

预期：

- 页面能正常跳到结果页
- 生成状态能从排队进入结果
- 不会因为首页填写了自定义 `llmConfig` 而直接报错

## Step 4: 结果页验收

在结果页重点看这几块：

- Hero 区的 mode / profile / parser 标签
- `Fulfillment` 面板
- `逐请求兑现`
- metadata 区

重点确认：

1. 页面能看到：
   - `已实现`
   - `近似实现`
   - `未实现`
2. 页面能看到：
   - `验收结论`
   - `评审路径`
   - `AI 执行路径`
3. 如果有配件请求，`逐请求兑现` 里每一行至少能看懂：
   - 请求了什么
   - 最后落地了什么
   - 位置是否被重新解析
   - 来源是现场生成、稳定复用还是近似回退

当前版本里，`AI 执行路径` 的目标是让人一眼看懂：

- 解析阶段用了哪一路
- 执行阶段是稳定母体复用、规则编译、AI planner，还是混合路径

## Step 5: 分享页验收

在结果页点击“打开分享页”。

预期：

- 分享页保留主题、执行摘要、兑现说明
- 分享页能看到 `本次 AI 执行路径`
- 分享页的内容比结果页更轻，但仍然能看懂这次是不是近似实现、失败在哪里

## Step 6: 检查 API key 未落盘

生成完成后，在仓库根目录运行：

```bash
LATEST_DIR="$(ls -td output/mock-generations/* | head -n 1)"
echo "$LATEST_DIR"
rg -n '"apiKey"|sk-' "$LATEST_DIR"
```

预期：

- 第一条命令会打印最近一次 generation 目录
- `rg` 不应搜到任何 `apiKey` 或类似 `sk-...` 的 raw key

你也可以打开：

- `generation.json`
- `metadata.json`
- `task.json`

预期：

- 最多只会看到 `provider / baseUrl / model`
- 不应看到 raw API key

## Step 7: 可选的轻量脚本验证

如果你想在真人验收前先做一轮轻量脚本确认，可以运行：

```bash
npm run llm:client-config:check
npm run llm:provider-routing:check
npm run typecheck
PROMPTPET_DEMO_ONLY=right-ear-camera npm run demo:prompt-pack
PROMPTPET_START_DRY_RUN=1 npm run dev:all
```

预期：

- 所有命令通过
- 默认开发 provider 仍然是 DeepSeek

## Step 8: Runtime Capability 主线验收

如果你这轮想验的是 runtime execution 主线，而不是前端/provider，可以先跑：

```bash
npm run dynamic-custom:capability-routing
npm run dynamic-custom:chest-wrap-host-fit
npm run dynamic-custom:failure-layer-controller
npm run dynamic-custom:capability-sweep
```

预期：

- `围巾 / 领巾 / 丝巾` 会复用同一个 `host-coupled chest-wrap` capability path
- `校徽` 这种胸前 rigid 控制样本不会被误判成 chest-wrap
- `相机挂件` 这种耳侧 rigid 控制样本不会串到 host-coupled path
- refine loop 的停机说明会带出 failure layer / rebuild directive，而不是只有一个模糊的 stop reason

如果本机已经有 Blender MCP HTTP server，再补一条定向 smoke：

```bash
BLENDER_MCP_SERVER_URL=http://127.0.0.1:8010 \
PROMPTPET_SMOKE_ONLY=phase12-chest-wrap \
npm run dynamic-custom:smoke
```

真人看图时重点确认：

- 第一眼读到的是胸前 wrap-band + knot + 双尾，而不是黑色胸条
- knot 仍然是双尾根部，不是两个 detached chest blocks
- 配件没有为了避脸而退化成“贴胸前的一条窄黑条”

## Task 4 Prompt Pack

这轮 final alpha 的最小代表性 prompt pack 固定为：

- `右耳银色相机挂件`
- `胸前黑色小围巾`
- `胸前金色校徽`
- `做一只胸前挂着小相机、奶油色、适合桌面摆放的小狐狸桌宠`
- `左耳绿色小鱼挂饰`
- `双耳花饰：绿色小花 + 红色四叶草`

建议至少覆盖：

- `相机挂件` 耳侧 rigid 控制样本
- `围巾` chest-wrap 主线样本
- `校徽` 胸前 rigid 控制样本
- 一条胸前 `小相机` 的真实 mixed prompt
- 一条耳侧单件样本和一条多件装饰样本，证明 prompt-to-runtime customization 不是只支持单一件

2026-04-13 整包真实复跑结果：

- 最稳的 live demo trio：
  - `右耳银色相机挂件`
  - `胸前黑色小围巾`
  - `胸前金色校徽`
- 可作为扩展能力展示：
  - `胸前小相机`
  - `左耳绿色小鱼挂饰`
  - `绿色小花 + 红色四叶草`

## 当前已知说明

- DeepSeek 当前已可用于文本解析和 design planner。
- DeepSeek 不支持当前的 `image_url` render critique payload，所以视觉评审可能退回本地 `viewport-capture`；这是当前诚实设计的一部分，不算假通过。
- 当前重点是“结果页 / 分享页能诚实表达落地程度”，不是伪装成所有词都能满分实现。
- `xcode.best / gpt-5.4` 的浏览器 BYOK 路径在 2026-04-12 的 Task 3 实测中可以成功创建 generation，且不会把 raw API key 落盘；但当前会在 `json_schema / structured_json` 合同下回退到规则解析，所以暂时不建议把它当 parser / planner 默认主路径。

## 2026-04-12 Task 3 验收记录

- 测试路径 A：显式 DeepSeek 本地预设
  - 结果：`POST /api/generations` 成功，metadata 记录为 `DeepSeek 结构化解析`，design planner source 为 `deepseek`
  - 持久化检查：`generation.json / metadata.json / task.json` 未出现 `apiKey` 字段，也未出现 raw key
- 测试路径 B：浏览器 BYOK，`provider=openai / baseUrl=https://api.xcode.best/v1 / model=gpt-5.4`
  - 结果：`POST /api/generations` 成功，`generation.json` 只保留 `provider / baseUrl / model`
  - 当前行为：parser 与 design planner 最终诚实回退到 `rule-fallback`
  - 观测到的失败模式：`json_schema` 返回 HTTP 400，accessory design planner chat/completions 超时
- 当前结论：
  - DeepSeek 仍是当前 alpha 的默认 parser / planner 主路径
  - OpenAI-compatible BYOK 已具备“请求级切换 + 不泄漏 key”的产品边界，但网关兼容性仍需后续继续验收

## 2026-04-12 Task 4 脚本侧验收记录

- 已通过：
  - `npm run typecheck`
  - `npm run build`
  - `npm run dynamic-custom:capability-routing`
  - `npm run dynamic-custom:chest-wrap-host-fit`
  - `npm run dynamic-custom:failure-layer-controller`
  - `npm run dynamic-custom:capability-sweep`
- 当前脚本侧结论：
  - capability bundle 编译主线通过
  - `host-coupled chest-wrap` 合同通过
  - failure-layer controller 通过
  - capability sweep 在代表性控制样本上通过
- 当前仍待真人验收：
  - 首页真实操作一遍 DeepSeek 默认链路
  - 浏览器 BYOK 切一遍 OpenAI-compatible 路径，并确认结果页诚实显示回退
  - 用上面的 prompt pack 做最终视觉可读性判断

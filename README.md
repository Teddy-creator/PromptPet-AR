# PromptPet-AR

当前状态：截至 2026-03-26，这个仓库已经冻结 `fox-base-v9` 作为 Android 可用回退基线，并切到 `fox-base-v10` 作品集质感主线。当前仓库内已经有 `Next.js + TypeScript` 前端壳、mock 演示模式、已在本机跑通的 Blender MCP 本地生成链路，以及已接好的 Android Scene Viewer / iPhone Quick Look 入口。

## 一句话

PromptPet-AR 是一个轻量 AI + WebAR Demo：用户输入一句描述，系统通过 Blender MCP 驱动 repo 内 `fox-base-v10` 高质量母体做有限、可读的主题变体，并支持网页预览与手机 AR 放置。

## 项目定位

- 它不是万能 3D 生成器。
- 它是一个“支持物种定制”的惊艳型演示项目，当前已支持 `fox`。
- 它更适合作品集、录屏展示和后续延展，而不是一开始就追求完整商业产品。

## 当前检查点

- 当前主链路已经具备：`一句话 -> fox-base-v10 变体 -> Web 预览 -> Android AR`
- 当前首页主按钮已经接回真实 `POST /api/generations`，不再只跳固定 demo id
- 当前结果页会对 `queued / rendering / exporting / ready / failed` 做诚实展示；分享页也会对未完成 generation 明确提示“尚未可分享”
- 当前首页与分享链路已经补齐 5 组可读主题样本：`招福小狐 / 奶油小狐 / 森巡小狐 / 夜灯小狐 / 莓莓小狐`
- 当前重点已经从“先把链路接通”切到“先把单只狐狸做得更像作品集成品”
- 当前优先级固定为：模型可读性 > 海报观感 > Android 展示稳定性 > 网站包装

## 这个项目最打动人的地方

- 输入一句描述，就能看到一只 3D 小狐狸桌宠被生成出来。
- 网页里能旋转查看。
- 手机上可以直接放到现实桌面里，当前优先围绕 Android 演示。
- 整条链路非常适合录成短视频或写进 README。

## 当前建议范围

- 聚焦 `已支持物种 fox / 桌宠摆件`
- 聚焦 `单个轻量模型`
- 聚焦 `网页预览 + Android-first 手机 AR`

先不做复杂角色、复杂动画和多人互动。

## 文档导航

- [产品与 MVP 细化](./PRODUCT_PLAN.md)
- [页面与交互设计](./UI_FLOW.md)
- [阶段路线图](./ROADMAP.md)
- [项目协作说明](./AGENTS.md)
- [Alpha 真人验收清单](./docs/alpha-human-acceptance.md)
- [Demo Runbook](./docs/demo-runbook.md)
- [Demo Validation Snapshot](./docs/demo-validation-2026-04-13.md)
- [prototype retrieval + traits rollout notes](./docs/superpowers/plans/prototype-traits-rollout-notes.md)

## 当前实现范围

- 首页创建页：品牌 hero、风格模板、示例 prompt、真实提交入口、共享 LLM 设置面板
- 首页 showcase：5 组固定主题狐狸样本，直接连到对应分享页
- 结果页：真实生成状态轮询、诚实状态页、下载入口、分享页跳转、Android AR / iPhone Quick Look 入口
- 分享页：轻量落地页版本；`ready` 时展示正式分享内容，未完成时给出明确状态说明和回跳路径
- 动态 metadata：结果页和分享页会根据生成内容输出独立标题、描述和封面图
- API：`POST /api/generations`、`GET /api/generations/[id]`
- 工件接口：`GET /api/generations/[id]/metadata`、`GET /api/generations/[id]/prompt`、`GET /api/generations/[id]/task`
- 输出资产接口：`GET /api/generations/[id]/model`、`GET /api/generations/[id]/poster`、`GET /api/generations/[id]/usdz`
- AR 入口接口：`GET /api/generations/[id]/ar/android`、`GET /api/generations/[id]/ar/ios`
- 资产：仓库内母体 `.blend`、正式导出样本、mock 元数据
- 输出目录：`output/mock-generations/<id>/`
- 如果本地历史 generation 积累很多，`npm run build` 可能会对 `output/mock-generations` 给出 Turbopack 性能警告；这通常不影响 demo 正常运行，只是提醒本地工件过多。

## 本地启动

```bash
npm install
npm run dev
```

然后打开 [http://localhost:3000](http://localhost:3000)。

## 前端真实链路

- 首页主按钮现在会创建真实 generation，并跳转到 `/result/<id>`
- 首页高级 LLM 设置会把 `provider / model / baseUrl / apiKey` 作为请求级 `llmConfig` 发送给后端
- 页面里填写的 API key 只保存在当前浏览器本地，不会落进 `generation.json`、`task.json`、`metadata.json`
- 结果页会对 `queued / rendering / exporting / ready / failed` 做诚实展示；非终态时会自动轮询 `/api/generations/[id]`
- 分享页只在 `ready` 状态下展示真正可分享的完成态；如果 generation 还没完成，会明确提示去结果页查看实时进度

## AI Provider 配置

- 仓库当前默认开发 provider 已切到 `DeepSeek`；本地一键启动、`npm run dev:all` 和首页默认预设都会优先走 `deepseek-chat`。
- `xcode.best / gpt-5.4` 仍然保留，但现在是显式可选 fallback，不再是默认开发路径。
- 不要把真实 API key 提交进仓库；本地开发、CI 和线上部署都应该各自配置自己的环境变量。
- 如果你要走仓库内置的 operator 预设：
  - `npm run dev:all` = DeepSeek 本地默认开发链路
  - `npm run dev:all:xcode` = OpenAI-compatible 本地预设链路
- 如果你是别人拉仓库或后续网页真实用户，更推荐直接用首页高级 LLM 设置做浏览器本地 BYOK。
- 推荐的默认本地开发变量：

```bash
DEEPSEEK_API_KEY=your_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
LLM_PROVIDER=deepseek
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
NEXT_PUBLIC_DEFAULT_LLM_PROVIDER=deepseek
NEXT_PUBLIC_DEFAULT_LLM_BASE_URL=https://api.deepseek.com
NEXT_PUBLIC_DEFAULT_LLM_MODEL=deepseek-chat
```

- 如果你要显式切回 `OpenAI-compatible` 网关，例如 `xcode.best / gpt-5.4`，可以这样配：

```bash
OPENAI_COMPAT_API_KEY=your_api_key
OPENAI_COMPAT_BASE_URL=https://api.xcode.best/v1
OPENAI_COMPAT_MODEL=gpt-5.4
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.xcode.best/v1
OPENAI_MODEL=gpt-5.4
NEXT_PUBLIC_DEFAULT_LLM_PROVIDER=openai
NEXT_PUBLIC_DEFAULT_LLM_BASE_URL=https://api.xcode.best/v1
NEXT_PUBLIC_DEFAULT_LLM_MODEL=gpt-5.4
```

- 首页现在支持用户直接在页面上填写共享的 `provider / model / baseUrl / apiKey`：
  - 适合本地验证时切模型
  - 适合别人拉仓库后直接 BYOK
  - 适合未来网页上线后的自助配置
- 页面里填写的 API key 只会保存在当前浏览器的本地存储，并随当前生成请求发送到后端；它不会写进 `generation.json`、`task.json`、`metadata.json` 或仓库文件。
- 2026-04-12 的 Task 3 实测结论：
  - DeepSeek 预设链路在 `DEEPSEEK_API_KEY + LLM_* = deepseek` 条件下，已命中 `DeepSeek 结构化解析` 与 `deepseek` design planner。
  - `provider=openai / baseUrl=https://api.xcode.best/v1 / model=gpt-5.4` 的浏览器 BYOK 路径会成功创建 generation，且只持久化 `provider / baseUrl / model`，不会落盘 raw API key。
  - 但当前 `xcode.best / gpt-5.4` 在我们的 `json_schema / structured_json` 合同下会回退到规则解析，典型表现是 `json_schema` 返回 HTTP 400，accessory design planner chat/completions 超时；因此它现在更适合作为显式 fallback，而不是默认 parser / planner 主路径。
- 如果你要把不同阶段拆给不同 provider，后端也支持按角色单独配置：

```bash
SEMANTIC_API_KEY=your_semantic_key
SEMANTIC_BASE_URL=https://api.xcode.best/v1
SEMANTIC_MODEL=gpt-5.4

DESIGN_API_KEY=your_design_key
DESIGN_BASE_URL=https://api.xcode.best/v1
DESIGN_MODEL=gpt-5.4

VISION_API_KEY=your_vision_key
VISION_BASE_URL=https://api.xcode.best/v1
VISION_MODEL=gpt-5.4
```

- 当前解析顺序是：
  - `semantic parser` 读 `SEMANTIC_*`
  - `design planner` 读 `DESIGN_*`
  - `vision critique` 读 `VISION_*`
  - 如果对应角色没配，再回退到共享的 `LLM_*`
  - 仍然兼容 `DEEPSEEK_*` 与 `OPENAI_*`

- 也支持通用覆盖变量：`LLM_PROVIDER`、`LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`
- 如果你想让首页请求默认带上同一套 provider / baseUrl / model，也可以配置：
  - `NEXT_PUBLIC_DEFAULT_LLM_PROVIDER`
  - `NEXT_PUBLIC_DEFAULT_LLM_BASE_URL`
  - `NEXT_PUBLIC_DEFAULT_LLM_MODEL`
- `DEEPSEEK_*` 与 `OPENAI_*` 变量仍保留兼容；但当前默认开发链路已经切到 `DeepSeek + LLM_* + NEXT_PUBLIC_DEFAULT_*`
- 首页生成请求现在会把用户填写的 `llmConfig` 一起带给 `/api/generations`；当前持久化只会保留 `provider/baseUrl/model`，不会把请求里的 API key 落盘
- 如果你只想更安全地给自己本地开发使用，优先用 `.env.local` 或启动脚本；前端设置面板主要是为“切模型”和“外部用户自配 key”服务
- 如果你想检查前端 LLM 草稿的清洗和序列化合同，可以运行：`npm run llm:client-config:check`
- 如果你想检查角色路由是否按预期解析，可以运行：`npm run llm:provider-routing:check`
- 可直接复制 [.env.example](./.env.example) 作为本地参考模板
- 当前 DeepSeek 已验证可用于文本解析与 design planner；但它不接受我们现有的 `image_url` render critique payload，所以 worker 在 DeepSeek 下会自动退回本地 `viewport-capture` 评审，而不是继续发坏请求
- `vision critique` 现在是独立子系统：它会把统一的 payload contract、最终 report、transport mode 和 fallback failure note 一起写进 `visualCritiqueReports[*]`
- 如果 `vision critique` 没走远端模型，metadata 里会明确留下：
  - `source=viewport-capture` 或 `source=blueprint-projection`
  - `critiqueTransport.mode=viewport-fallback` 或 `critiqueTransport.mode=blueprint-fallback`
  - `critiqueFailureNote` 说明为什么没有完成远端 render critique

## Prototype Traits 迁移说明

- 当前 `dynamic-custom` 的中间语义层已经开始从 `family-first` 迁移到 `prototypeCandidates + traits + retrievalMatches`。
- `family` 仍然保留，但现在主要用于兼容旧分支和 compiler hint，不再是开放名词建模的唯一主路由。
- 当前几何编译优先级已经变成：`reference / prototype geometry -> trait-driven generic fallback -> legacy family fallback`。
- rollout flags、回退策略和验收命令集中记录在 [prototype-traits-rollout-notes](./docs/superpowers/plans/prototype-traits-rollout-notes.md)；那份说明里的 flags 目前是 rollout strategy，不表示所有开关都已经在运行时完全接线。

常用检查：

```bash
npm run lint
npm run typecheck
npm run build
```

如果你要跑当前主线的 prototype/traits 验证，推荐至少执行：

```bash
npm run dynamic-custom:traits-regression
npm run dynamic-custom:runtime-bridge
npm run dynamic-custom:semantic-heldout
```

如果你要验证当前 runtime capability mainline 是否真的把问题收敛到了 execution 层，可以再执行这一组：

```bash
npm run dynamic-custom:capability-routing
npm run dynamic-custom:chest-wrap-host-fit
npm run dynamic-custom:failure-layer-controller
npm run dynamic-custom:capability-sweep
```

这组检查分别覆盖：

- `capability-routing`：确认上游已经把 `prototype + traits + anchor` 编译成 capability bundle，而不是继续靠 family 特判
- `chest-wrap-host-fit`：确认 `host-coupled chest-wrap` 合同已经进了 task / brief / geometry / execution
- `failure-layer-controller`：确认 refine loop 会按 failure layer 升级，而不是反复做同层微调
- `capability-sweep`：确认 `围巾 / 领巾 / 丝巾` 共用同一条 chest-wrap 主线，同时 `校徽 / 相机挂件` 这些控制样本不会串到 chest-wrap

如果本机已经启动了 Blender MCP HTTP server，还可以补跑胸前 chest-wrap 的定向 smoke：

```bash
BLENDER_MCP_SERVER_URL=http://127.0.0.1:8010 \
PROMPTPET_SMOKE_ONLY=phase12-chest-wrap \
npm run dynamic-custom:smoke
```

当前 runtime capability mainline 的边界是：

```text
prototype + traits + anchor
-> capability bundle
-> runtime design contract
-> deterministic host-fit / geometry solve
-> failure-layer controller
```

如果 scarf 仍然失败，这个边界能帮助我们判断问题是否还在 execution，而不是误回 parser / provider。

如果你要跑 `prototype-traits-heldout` 长 sweep，请显式给它一套 `SEMANTIC_*`，避免吃到 ambient provider 漂移：

```bash
SEMANTIC_PROVIDER=deepseek \
SEMANTIC_API_KEY=$DEEPSEEK_API_KEY \
SEMANTIC_BASE_URL=${DEEPSEEK_BASE_URL:-https://api.deepseek.com} \
SEMANTIC_MODEL=${DEEPSEEK_MODEL:-deepseek-chat} \
npx tsx scripts/check-prototype-traits-heldout.ts --seed 20260404 --sample-size 26
```

如果你想一条命令拉起 `Blender MCP + Web + worker`，并使用当前默认的 `DeepSeek`：

```bash
npm run dev:all
```

如果你想显式指定 `xcode.best / gpt-5.4` 启动脚本，也可以：

```bash
npm run dev:all:xcode
```

如果你想显式指定 DeepSeek 启动脚本：

```bash
npm run dev:all:deepseek
```

这两套启动脚本都会顺手导出 `NEXT_PUBLIC_DEFAULT_LLM_*`，让前端首页预设和后端运行时默认路由保持一致。

macOS 上也可以直接双击仓库根目录的 [`start.command`](/Users/cloud/Code/PromptPet-AR/start.command)。

如果要跑 Blender MCP 文件协议版开发链路：

```bash
GENERATION_ADAPTER=blender-mcp npm run dev
```

然后另开一个终端：

```bash
npm run worker:blender-mcp
```

如果你已经启动了真正的 Blender MCP HTTP server：

```bash
BLENDER_MCP_SERVER_URL=http://127.0.0.1:8010 npm run worker:blender-mcp:poly-http
```

本仓库也提供了本地安装与启动辅助命令：

```bash
npm run blender:mcp:install-addon
npm run blender:mcp:start
```

## Mock 说明

- 当前机器已经安装 Blender 5.1，并已接通本地 Blender MCP HTTP server。
- mock 生成接口仍然保留，作为演示模式和故障回退路径使用。
- 当前仓库里的演示 `glb/usdz/poster` 已切到仓库内 `fox-base-v10` 母体资产导出样本，不再使用临时占位模型。
- 当前 mock 种子已内置 5 条主题样本路由，便于直接验收“同一只 fox 母体的多主题可读变体”。
- 当前阶段已经可以把同一份结果分别接到 Android Scene Viewer 与 iPhone Quick Look；真实链路会在 `GLB + thumbnail` 之外继续补出 `model.usdz`。
- 每次创建新的 generation 时，仓库内的输出目录都会生成 `generation.json`、`metadata.json`、`prompt.txt`、`task.json`；真实链路与 mock 链路共用这一套输出结构。

## Adapter 切换

- 当前默认适配器是 `mock`
- 启用真实链路时使用环境变量：`GENERATION_ADAPTER=blender-mcp`
- `blender-mcp` 现在已经可以接受生成请求、落盘任务协议，并由外部 worker 真实调用本地 Blender MCP
- `blender-mcp` 在 `queued/rendering` 阶段会先复用同主题 demo 资产做占位预览，并把 `theme/accessory/eyeMood` 写进 `task.json`
- 它会先写出 `task.json` 与 `adapter-status.json`，等待外部 worker 接管
- 当前真实链路的默认 recipe 已经切到仓库内 `fox-base-v10` 母体资产合同
- 当前阶段继续保持公开 API 不变，只升级内部母体资产、镜头和桌宠质感

## Blender MCP 文件协议

- 当 `GENERATION_ADAPTER=blender-mcp` 时，新 generation 不再返回 `503`，而是以 `queued` 状态入队
- 当前输出目录约定如下：
  - `generation.json`
  - `metadata.json`
  - `prompt.txt`
  - `task.json`
  - `adapter-status.json`
  - `model.glb`
  - `model.usd`（内部中间产物）
  - `model.usdz`
  - `thumbnail.png`
- 外部 Blender worker 至少需要更新 `adapter-status.json`
- 当状态推进到 `ready` 时，worker 至少需要写入 `model.glb` 和 `thumbnail.png`；如果本机 USD 工具链可用，还会继续写出 `model.usdz`
- Web 端会为每个 generation 自动补齐稳定的 Android/iPhone AR 入口 URL，旧记录即使历史上没有写入也不需要回填
- Web 端会自动轮询 generation 状态，并在就绪后改用本地输出资产接口提供预览和封面

## 本地 Worker

- 仓库内现在自带一个本地 mock worker：`scripts/blender-mcp-worker.mjs`
- 它会扫描 `output/mock-generations/*/task.json`
- 对 `adapterKey = blender-mcp` 的任务写入阶段状态，并按执行后端产出文件
- 常用命令：

```bash
npm run worker:blender-mcp
npm run worker:blender-mcp:once
npm run worker:blender-mcp:poly-http
BLENDER_MCP_SERVER_URL=http://127.0.0.1:8010 npm run worker:blender-mcp:poly-http:once
BLENDER_MCP_SERVER_URL=http://127.0.0.1:8010 npm run worker:blender-mcp:poly-http:procedural
BLENDER_MCP_SERVER_URL=http://127.0.0.1:8010 npm run worker:blender-mcp:poly-http:starter
npm run fox-base:build
node scripts/blender-mcp-worker.mjs --once --id <generation-id>
npm run dynamic-custom:smoke
```

- 当前支持两个执行后端：
  - `mock-assets`：复制仓库内 fox-base 正式演示资产，适合本地演示
  - `poly-http-plan`：通过 `POST /mcp/invoke/{tool_name}` 真正调用 Blender MCP HTTP tools
- `mock-assets` 现在也会按 prompt 命中的主题槽位复制对应 demo 样本，而不是永远只复制默认 lucky-charm 狐狸
- 这还不是最终的复杂宠物建模执行器，但已经把“任务单 -> 外部 worker -> 写回状态与产物 -> 页面自动更新”这段真实链路跑通了

## 真实 Blender MCP 替换方法

- 当前 worker 的真实调用入口已经内置在 `scripts/blender-mcp-worker.mjs`
- 本地 Blender addon 安装脚本：`scripts/blender-install-mcp-addon.py`
- 本地 Blender server 启动脚本：`scripts/blender-start-mcp-server.py`
- fox-base 母体资产校验/导出脚本：`scripts/build-fox-base-template.py`
- 默认使用的执行计划文件是 `scripts/blender-mcp-plan.fox-base.json`
- `scripts/blender-mcp-plan.fox-v1.json` 仍然保留，作为 procedural 手动回退基线
- 旧的 `scripts/blender-mcp-plan.starter.json` 仍然保留，作为最小回退基线
- 安装与启动脚本现在会自动补丁 upstream addon 的 PolyMCP 兼容问题，并只在缺失时安装 Blender Python 依赖
- `fox-base-v10` 的目标不是开放物种生成，而是稳定导出一只更接近桌宠成品、适合录屏展示、并且更有主题可读性的桌面小狐狸
- 当前真实计划基于 PolyMCP Blender server 的公开工具名：
  - `clear_scene`
  - `import_file`
  - `transform_object`
  - `create_material`
  - `assign_material`
  - `set_optimal_camera_for_all`
  - `render_image`
  - `delete_objects`
  - `export_file`
- 当前 `fox-base-v10` 的海报渲染会额外导入仓库内 `assets/fox-base/export/fox-base-poster-stage-v10.glb`，利用稳定可导入的 `SUN/SPOT` 灯光和地台完成首图渲染，然后在正式导出前删除这些舞台对象
- 如果 `render_image` 没有直接写出海报，worker 还会自动尝试 `capture_viewport_image` 作为兜底
- `npm run dynamic-custom:smoke` 现在默认会自启一个 `GENERATION_ADAPTER=blender-mcp` 的专用 Next dev server，并启动 `poly-http-plan` worker；如果本地没有真实 Blender MCP server，它会直接报环境未满足，而不会再静默拿 mock 预览资产冒充通过
- 如果你的 Blender MCP server 工具名不同，先打开：
  - `http://127.0.0.1:8010/mcp/list_tools`
- 然后把 `scripts/blender-mcp-plan.fox-base.json` 里的 `tool` 名称和 `kwargs` 改成你实际 server 支持的那一套
- worker 会自动把这些步骤渲染成真实参数：
  - `{{prompt}}`
  - `{{style}}`
  - `{{styleLabel}}`
  - `{{recipe.templateVersion}}`
  - `{{objects.body}}`
  - `{{palette.bodyColor}}`
  - `{{artifacts.modelFile}}`
  - `{{artifacts.posterFile}}`
- 也就是说，后面真正替换时，优先改的是执行计划，而不是前端页面或 API
- 一个推荐的本地联调顺序是：

```bash
npm run blender:mcp:install-addon
npm run blender:mcp:start
npm run fox-base:build
GENERATION_ADAPTER=blender-mcp npm run dev
BLENDER_MCP_SERVER_URL=http://127.0.0.1:8010 npm run worker:blender-mcp:poly-http
```

## 当前关键原则

- 先做“有惊喜感的窄场景”，不要做“大而全”。
- 先把 `Prompt -> Blender MCP -> glb -> Web Preview -> AR` 跑通。
- 先以 Android WebAR + iOS Quick Look 为目标，不死磕统一底层技术。
- 尽量靠固定风格模板提高成功率，而不是完全自由生成。
- 一句话当前只影响已支持物种的风格与细节，不承诺任意动物自由建模。

## 推荐的第一步

如果后面要继续推进，最先该明确的是两件事：

1. 第一版到底只做哪一类对象。
2. 第一版到底固定哪几套风格模板。

我当前最推荐：

- 对象类型：`桌面小宠物`
- 风格方向：`奶油玩具感 / 低模卡通 / 发光梦幻感`

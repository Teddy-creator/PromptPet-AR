# PromptPet-AR

输入一句话，生成一只可网页预览、可 AR 放置的小狐狸桌宠。

<p align="center">
  <img alt="Type Demo" src="https://img.shields.io/badge/Type-Demo-CB7A5C?style=flat-square" />
  <img alt="Scope Fox-first" src="https://img.shields.io/badge/Scope-Fox--first-9F6B53?style=flat-square" />
  <img alt="Platform Web and AR" src="https://img.shields.io/badge/Platform-Web%20%2B%20AR-6D7E6B?style=flat-square" />
  <img alt="LLM BYOK" src="https://img.shields.io/badge/LLM-BYOK-5E748C?style=flat-square" />
</p>

## Features

- 一句话生成一只 fox-first 小狐狸桌宠
- 网页内 3D 预览
- Android Scene Viewer 与 iPhone Quick Look 入口
- 支持 DeepSeek、OpenAI-compatible 中转和前端 BYOK
- 公开仓库与私有开发仓库分离，历史更干净

## 简介

PromptPet-AR 是一个 fox-first 的 AI + WebAR 小 demo。
它把一句自然语言 prompt 编译成一个有边界的狐狸桌宠变体，再通过浏览器和手机 AR 展示出来。

## 操作指南

1. 复制 `.env.example` 为 `.env.local`。
2. 按下面的 LLM 配置填好你的 key 和 base URL。
3. 运行 `npm run dev:all`，或直接打开 `start.command`。
4. 打开 [http://localhost:3000](http://localhost:3000)。
5. 在首页输入一句 prompt，提交后等待结果页变成 `ready`。
6. 先在网页里确认 3D 预览，再把结果页发到手机上打开 AR。

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev:all
```

Open [http://localhost:3000](http://localhost:3000). On macOS, you can also open [`start.command`](./start.command).

## 使用路径

1. 用 `npm run dev:all` 或 `start.command` 启动完整链路。
2. 在首页输入 prompt 并提交。
3. 等结果页进入 `ready`。
4. 先在网页里看 3D 预览和导出结果。
5. 再把结果页发到手机上打开 AR。

### Android

Android 走 Google Scene Viewer。  
如果自动拉起失败，先试标准入口，再试兼容入口。

这条路径需要手机支持 AR，并且 `Google Play Services for AR` 可用。

### iPhone

iPhone 走 Quick Look。  
如果结果带有有效的 `USDZ`，Safari 会尝试直接打开。

### Local Dev Note

`localhost:3000` 只指向你的电脑，不指向手机。
本地开发要给手机看 AR，最好用可访问的部署地址，或者把站点暴露到局域网。

## LLM / BYOK

PromptPet-AR 不附带平台密钥。  
你可以在 `.env.local` 里配置，或者直接用前端 LLM 设置。

### 方案 A: DeepSeek

```bash
LLM_PROVIDER=deepseek
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
DEEPSEEK_API_KEY=your_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
NEXT_PUBLIC_DEFAULT_LLM_PROVIDER=deepseek
NEXT_PUBLIC_DEFAULT_LLM_BASE_URL=https://api.deepseek.com
NEXT_PUBLIC_DEFAULT_LLM_MODEL=deepseek-chat
```

### 方案 B: OpenAI-compatible 中转

```bash
LLM_PROVIDER=openai
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://api.xcode.best/v1
LLM_MODEL=gpt-5.4
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

### 前端 BYOK

如果你只是想先看效果，也可以在首页的高级 LLM 设置里直接填 provider、model、base URL 和 API key。

完整模板见 [`.env.example`](./.env.example)。

## Boundaries

- Fox-first demo，不是通用 text-to-3D 系统
- 只做有边界的配件和主题变化，不做开放式建模
- 目标是一个完整、好展示的小 demo，不是通用生产管线

## Tech Stack

- Next.js
- React
- TypeScript
- Blender + MCP worker
- `@google/model-viewer`
- Android Scene Viewer
- iPhone Quick Look

## Repo Layout

- `src/` - app, pages, components, API routes
- `scripts/` - worker, checks, and local tooling
- `public/demo/` - showcase assets
- `docs/` - runbooks and validation notes

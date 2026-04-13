import { NextResponse } from "next/server";

import { getExternalOrigin } from "@/lib/request-origin";
import { buildSceneViewerIntentUrl } from "@/lib/scene-viewer";
import { getGenerationById } from "@/lib/generation-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildAndroidLaunchPage(
  primaryIntentUrl: string,
  compatibilityIntentUrl: string,
  shareUrl: string,
  title: string,
) {
  const safePrimaryIntentUrl = escapeHtml(primaryIntentUrl);
  const safeCompatibilityIntentUrl = escapeHtml(compatibilityIntentUrl);
  const safeShareUrl = escapeHtml(shareUrl);
  const safeTitle = escapeHtml(title);
  const primaryIntentScriptUrl = JSON.stringify(primaryIntentUrl);

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>打开 Android AR</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f2e3d8;
        --card: rgba(255, 251, 247, 0.92);
        --ink: #5d2e46;
        --accent: #b87d6d;
        --accent-strong: #9b6658;
        --muted: rgba(93, 46, 70, 0.72);
        --line: rgba(93, 46, 70, 0.12);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at top, rgba(212, 165, 165, 0.42), transparent 48%),
          linear-gradient(180deg, #f7eee6 0%, var(--bg) 100%);
        color: var(--ink);
        font-family: "Manrope", "Helvetica Neue", Arial, sans-serif;
      }

      main {
        width: min(100%, 480px);
        padding: 32px 24px;
        border: 1px solid var(--line);
        border-radius: 28px;
        background: var(--card);
        box-shadow: 0 24px 70px rgba(93, 46, 70, 0.14);
      }

      h1 {
        margin: 0 0 12px;
        font-family: "Fraunces", Georgia, serif;
        font-size: clamp(32px, 8vw, 44px);
        line-height: 1.02;
      }

      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.65;
        font-size: 15px;
      }

      .actions {
        display: grid;
        gap: 12px;
        margin-top: 24px;
      }

      .status {
        margin-top: 14px;
        font-size: 14px;
      }

      .button,
      .buttonAlt,
      .link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        padding: 0 20px;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 700;
        text-align: center;
      }

      .button {
        background: var(--accent);
        color: #fff7f2;
      }

      .buttonAlt {
        border: 1px solid rgba(184, 125, 109, 0.28);
        background: rgba(255, 255, 255, 0.78);
        color: var(--ink);
      }

      .link {
        border: 1px solid var(--line);
        color: var(--ink);
        background: rgba(255, 255, 255, 0.52);
      }

      .label {
        display: inline-block;
        margin-bottom: 10px;
        color: var(--muted);
        font-size: 12px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .tips {
        margin-top: 18px;
        padding-top: 16px;
        border-top: 1px solid var(--line);
        font-size: 14px;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <main>
      <span class="label">Android AR</span>
      <h1>${safeTitle}</h1>
      <p>页面打开后会自动尝试拉起 Scene Viewer。要是没有成功，就手动点下面的标准入口；如果还不行，再试兼容入口。</p>
      <p class="status" id="status">正在准备 Android AR 入口...</p>
      <div class="actions">
        <a class="button" id="primary-launch" href="${safePrimaryIntentUrl}">立即打开 Android AR</a>
        <a class="buttonAlt" href="${safeCompatibilityIntentUrl}">兼容入口</a>
        <a class="link" href="${safeShareUrl}">返回分享页</a>
      </div>
      <p class="tips">如果页面一直停在这里，通常是手机不支持 Scene Viewer、Google Play Services for AR 未就绪，或当前浏览器拦住了系统跳转。</p>
    </main>
    <script>
      (function () {
        const status = document.getElementById("status");
        const launch = document.getElementById("primary-launch");
        let handedOff = false;

        const noteFallback = () => {
          if (handedOff) {
            return;
          }

          if (status) {
            status.textContent = "如果没有自动拉起，请点“立即打开 Android AR”；若仍失败，再试兼容入口。";
          }
        };

        window.addEventListener("pagehide", function () {
          handedOff = true;
        });

        document.addEventListener("visibilitychange", function () {
          if (document.visibilityState === "hidden") {
            handedOff = true;
          }
        });

        window.addEventListener("load", function () {
          if (status) {
            status.textContent = "正在尝试拉起 Scene Viewer...";
          }

          window.setTimeout(function () {
            window.location.replace(${primaryIntentScriptUrl});
          }, 120);

          window.setTimeout(noteFallback, 1800);
        });

        launch?.addEventListener("click", function () {
          handedOff = true;
        });
      })();
    </script>
  </body>
</html>`;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const generation = await getGenerationById(id);

  if (!generation) {
    return NextResponse.json(
      { error: "没有找到这个召唤结果。" },
      { status: 404 },
    );
  }

  const origin = getExternalOrigin(request);
  const shareUrl = new URL(generation.sharePath, origin).toString();

  if (generation.status !== "ready" || !generation.modelUrl) {
    return NextResponse.json(
      {
        error: "这只小狐狸还没有准备好 Android AR 入口。",
        status: generation.status,
        shareUrl,
      },
      { status: 409 },
    );
  }

  const modelUrl = new URL(generation.modelUrl, origin).toString();
  const sceneViewerIntentUrl = buildSceneViewerIntentUrl({
    modelUrl,
    title: generation.name,
    fallbackUrl: shareUrl,
  });
  const compatibilityIntentUrl = buildSceneViewerIntentUrl({
    modelUrl,
    title: generation.name,
    fallbackUrl: shareUrl,
    mode: "ar_only",
    intentVersion: "1.0",
    packageName: "com.google.ar.core",
    disableOcclusion: false,
  });
  const html = buildAndroidLaunchPage(
    sceneViewerIntentUrl,
    compatibilityIntentUrl,
    shareUrl,
    generation.name,
  );

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

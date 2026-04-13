import { NextResponse } from "next/server";

import { getGenerationById } from "@/lib/generation-service";
import { getExternalOrigin } from "@/lib/request-origin";
import { resolveUsdzSourcePath } from "@/lib/generation-usdz";

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

function wantsHtml(request: Request) {
  return request.headers.get("accept")?.includes("text/html") ?? false;
}

async function hasUsdzFile(id: string) {
  return (await resolveUsdzSourcePath(id)) !== null;
}

function renderStatusPage(options: {
  title: string;
  heading: string;
  body: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  posterUrl?: string;
  quickLookHref?: string;
}) {
  const posterMarkup = options.posterUrl
    ? `<img src="${escapeHtml(options.posterUrl)}" alt="" />`
    : "";
  const quickLookMarkup = options.quickLookHref
    ? `<a id="quick-look-link" class="action primary quicklook" rel="ar" href="${escapeHtml(
        options.quickLookHref,
      )}">${posterMarkup}<span>${escapeHtml(options.primaryLabel)}</span></a>`
    : `<a class="action primary" href="${escapeHtml(options.primaryHref)}">${escapeHtml(
        options.primaryLabel,
      )}</a>`;
  const secondaryMarkup =
    options.secondaryHref && options.secondaryLabel
      ? `<a class="action secondary" href="${escapeHtml(options.secondaryHref)}">${escapeHtml(
          options.secondaryLabel,
        )}</a>`
      : "";
  const quickLookScript = options.quickLookHref
    ? `<script>
      window.addEventListener("load", function () {
        document.getElementById("quick-look-link")?.click();
      });
    </script>`
    : "";

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.title)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #e8d5c4;
        --panel: rgba(255, 247, 241, 0.92);
        --accent: #b87d6d;
        --text: #5d2e46;
        --soft: rgba(93, 46, 70, 0.74);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 1.5rem;
        background:
          radial-gradient(circle at top, rgba(212, 165, 165, 0.36), transparent 42%),
          linear-gradient(160deg, #f6e8db, var(--bg));
        color: var(--text);
        font-family: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(100%, 36rem);
        padding: 1.6rem;
        border-radius: 2rem;
        background: var(--panel);
        box-shadow: 0 24px 80px rgba(93, 46, 70, 0.16);
      }
      .eyebrow {
        font-size: 0.84rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--soft);
      }
      h1 {
        margin: 0.65rem 0 0;
        font-family: "Fraunces", "Times New Roman", serif;
        font-size: clamp(2rem, 7vw, 3.4rem);
        line-height: 0.94;
      }
      p {
        margin: 1rem 0 0;
        color: var(--soft);
        line-height: 1.75;
      }
      .actions {
        display: grid;
        gap: 0.85rem;
        margin-top: 1.4rem;
      }
      .action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        min-height: 3.2rem;
        padding: 0.95rem 1.25rem;
        border-radius: 999px;
        text-decoration: none;
      }
      .primary {
        background: var(--accent);
        color: #fff7f1;
      }
      .secondary {
        border: 1px solid rgba(93, 46, 70, 0.12);
        color: var(--text);
        background: rgba(255, 247, 241, 0.72);
      }
      .quicklook {
        flex-direction: column;
        border-radius: 1.5rem;
      }
      .quicklook img {
        width: min(100%, 14rem);
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: 1.2rem;
      }
      .note {
        margin-top: 1rem;
        font-size: 0.94rem;
      }
    </style>
  </head>
  <body>
    <main>
      <span class="eyebrow">iPhone AR</span>
      <h1>${escapeHtml(options.heading)}</h1>
      <p>${escapeHtml(options.body)}</p>
      <div class="actions">
        ${quickLookMarkup}
        ${secondaryMarkup}
      </div>
      <p class="note">Android Scene Viewer 和 iPhone Quick Look 都会沿用同一条结果入口；如果这一条结果没有打包出 USDZ，会自动回到说明页。</p>
    </main>
    ${quickLookScript}
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
  const resultUrl = new URL(`/result/${generation.id}`, origin).toString();
  const usdzUrl = new URL(`/api/generations/${generation.id}/usdz`, origin).toString();
  const posterUrl = new URL(generation.posterUrl, origin).toString();
  const readyForQuickLook =
    generation.status === "ready" && (await hasUsdzFile(generation.id));

  if (readyForQuickLook) {
    if (!wantsHtml(request)) {
      return NextResponse.json({
        status: "ready",
        iosUrl: usdzUrl,
      });
    }

    return new Response(
      renderStatusPage({
        title: `${generation.name} · Quick Look`,
        heading: `把 ${generation.name} 放进 iPhone 里的现实空间`,
        body: "如果 Safari 没有自动弹出 Quick Look，请再点一次下面的按钮。",
        primaryHref: usdzUrl,
        primaryLabel: "在 Quick Look 里打开",
        secondaryHref: shareUrl,
        secondaryLabel: "返回分享页",
        posterUrl,
        quickLookHref: usdzUrl,
      }),
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (!wantsHtml(request)) {
    return NextResponse.json(
      {
        error: "这一条结果当前还没有可用的 USDZ 文件，暂时不能进入 iPhone Quick Look。",
        status: generation.status,
        shareUrl,
        resultUrl,
      },
      { status: 409 },
    );
  }

  return new Response(
    renderStatusPage({
      title: `${generation.name} · iPhone AR`,
      heading:
        generation.status === "ready"
          ? "这次结果还没有成功打包 Quick Look 版本"
          : "iPhone Quick Look 正在准备中",
      body:
        generation.status === "ready"
          ? "网页预览和 Android AR 仍然可用，但这一条结果还没有拿到 model.usdz，所以 iPhone 会先停在说明页。你可以先继续看 3D 结果，或者稍后重新生成一次。"
          : "这只小狐狸还在生成中，iPhone Quick Look 会在模型和 USDZ 都准备好之后自动可用。",
      primaryHref: resultUrl,
      primaryLabel: "回到结果页",
      secondaryHref: shareUrl,
      secondaryLabel: "打开分享页",
    }),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

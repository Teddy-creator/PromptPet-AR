"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LanguageToggle } from "@/components/language-toggle";
import { ModelViewerStage } from "@/components/model-viewer-stage";
import { useSiteLanguage } from "@/components/site-language";
import {
  getGenerationRequest,
  normalizeGenerationClientError,
  shouldPollGeneration,
} from "@/lib/generation-client";
import type { GenerationRecord, GenerationStatus } from "@/lib/generation-types";

import styles from "./result-experience.module.css";

type ResultExperienceProps = {
  id: string;
  initialGeneration?: GenerationRecord | null;
};

type RuntimeCard = {
  title: string;
  body: string;
};

const motionEase = [0.16, 1, 0.3, 1] as const;
const pollIntervalMs = 2500;
const pollRetryMs = 4000;

function joinLines(values: string[]) {
  return values.length > 0 ? values.join(" / ") : null;
}

function formatAiPathLocalized(
  generation: GenerationRecord,
  t: (zh: string, en: string) => string,
) {
  const summary = generation.metadata.customizationSummary;
  const plannerModes = summary?.designPlannerModes?.length
    ? Array.from(new Set(summary.designPlannerModes)).join(" + ")
    : null;

  return joinLines(
    [
      summary?.parserLabel
        ? `${t("解析", "Parser")}: ${summary.parserLabel}`
        : `${t("解析", "Parser")}: ${t("规则回退", "Rule fallback")}`,
      summary?.designPlannerSource
        ? `${t("执行", "Execution")}: ${summary.designPlannerSource}${plannerModes ? ` · ${plannerModes}` : ""}`
        : generation.metadata.generationMode === "dynamic-custom"
          ? `${t("执行", "Execution")}: ${t("动态定制静态展示", "Dynamic custom static fallback")}`
          : `${t("执行", "Execution")}: ${t("稳定母体复用", "Stable base reuse")}`,
    ].filter(Boolean) as string[],
  );
}

function formatReviewPath(
  generation: GenerationRecord,
  t: (zh: string, en: string) => string,
) {
  const summary = generation.metadata.customizationSummary;
  return (
    joinLines([
      summary?.critiqueSource
        ? `${t("评审", "Review")}: ${summary.critiqueSource}`
        : `${t("评审", "Review")}: ${t("静态预览", "Static preview")}`,
      typeof summary?.renderCritiqueAvailable === "boolean"
        ? `render critique ${summary.renderCritiqueAvailable ? t("可用", "available") : t("不可用", "unavailable")}`
        : null,
    ].filter(Boolean) as string[]) ?? t("静态预览", "Static preview")
  );
}

function formatAcceptance(
  generation: GenerationRecord,
  t: (zh: string, en: string) => string,
) {
  const summary = generation.metadata.customizationSummary;
  if (!summary) {
    return t("当前缺少最终验收摘要。", "Final acceptance summary is not available yet.");
  }

  return (
    joinLines(
      [
        typeof summary.qualityScore === "number"
          ? `${Math.round(summary.qualityScore * 100)}%`
          : null,
        typeof summary.qualityGatePassed === "boolean"
          ? `${t("诚实闸门", "Honesty gate")} ${summary.qualityGatePassed ? t("通过", "passed") : t("未通过", "not passed")}`
          : null,
        typeof summary.precisionGatePassed === "boolean"
          ? `${t("精度闸门", "Precision gate")} ${summary.precisionGatePassed ? t("通过", "passed") : t("未通过", "not passed")}`
          : null,
      ].filter(Boolean) as string[],
    ) ?? t("当前缺少最终验收摘要。", "Final acceptance summary is not available yet.")
  );
}

function styleLabel(style: GenerationRecord["style"], t: (zh: string, en: string) => string) {
  if (style === "cream-toy") {
    return t("奶油玩具感", "Cream Toy");
  }
  if (style === "low-poly") {
    return t("低模卡通感", "Low Poly");
  }
  return t("梦幻发光感", "Dream Glow");
}

function modeLabel(
  mode: GenerationRecord["metadata"]["generationMode"],
  t: (zh: string, en: string) => string,
) {
  return mode === "dynamic-custom"
    ? t("动态定制", "Dynamic Custom")
    : t("快速稳定", "Fast Stable");
}

function profileLabel(
  generation: GenerationRecord,
  t: (zh: string, en: string) => string,
) {
  const summary = generation.metadata.customizationSummary;
  if (summary?.customizationProfileLabel) {
    return summary.customizationProfileLabel;
  }
  return generation.metadata.generationMode === "dynamic-custom"
    ? t("稳定定制", "Safe Overlay")
    : null;
}

function statusLabel(
  status: GenerationStatus,
  t: (zh: string, en: string) => string,
) {
  switch (status) {
    case "queued":
      return t("排队中", "Queued");
    case "rendering":
      return t("生成中", "Rendering");
    case "exporting":
      return t("导出中", "Exporting");
    case "failed":
      return t("生成失败", "Failed");
    case "ready":
      return t("已完成", "Ready");
    default:
      return status;
  }
}

function statusSummary(
  status: GenerationStatus,
  t: (zh: string, en: string) => string,
) {
  switch (status) {
    case "queued":
      return t("请求已接收，正在等待开始处理。", "Request accepted and waiting to start.");
    case "rendering":
      return t("模型生成中，尚未进入最终验收。", "Model generation is in progress.");
    case "exporting":
      return t(
        "正在整理 poster、模型和 AR 交付文件。",
        "Poster, model, and AR delivery files are being prepared.",
      );
    case "failed":
      return t("本次生成未完成，请返回首页调整后重试。", "This generation did not complete.");
    case "ready":
      return t("最终验收已产出，可以进入查看和分享。", "Final acceptance is ready.");
    default:
      return t("状态未知。", "Unknown status.");
  }
}

function reviewSummary(
  generation: GenerationRecord,
  t: (zh: string, en: string) => string,
) {
  if (generation.status === "ready") {
    return formatReviewPath(generation, t);
  }

  if (generation.status === "failed") {
    return t("生成未完成，暂无最终评审路径。", "Generation did not complete.");
  }

  return t("生成完成后会补齐最终评审路径。", "Final review path will appear when ready.");
}

function acceptanceSummary(
  generation: GenerationRecord,
  t: (zh: string, en: string) => string,
) {
  if (generation.status === "ready") {
    return formatAcceptance(generation, t);
  }

  return statusSummary(generation.status, t);
}

function buildRuntimeCards(
  generation: GenerationRecord,
  t: (zh: string, en: string) => string,
): RuntimeCard[] {
  switch (generation.status) {
    case "queued":
      return [
        {
          title: t("当前阶段", "Current Stage"),
          body: t("请求已进入队列，正在等待生成器开始处理。", "Request is queued."),
        },
        {
          title: t("刷新方式", "Refresh"),
          body: t("这个页面会自动刷新状态，不需要手动刷新。", "This page refreshes automatically."),
        },
        {
          title: t("下一步", "Next"),
          body: t("开始生成后，这里会自动切到“生成中”。", "This page will switch to rendering automatically."),
        },
      ];
    case "rendering":
      return [
        {
          title: t("当前阶段", "Current Stage"),
          body: t("母体与定制逻辑正在出图和组装。", "The model is being generated and assembled."),
        },
        {
          title: t("你现在能做什么", "What You Can Do"),
          body: t("保持这个页面打开即可，我们会继续自动同步。", "Keep this page open and we will keep syncing."),
        },
        {
          title: t("下一步", "Next"),
          body: t("生成完成后会进入导出阶段，准备 poster / GLB / AR 入口。", "Next comes export and delivery prep."),
        },
      ];
    case "exporting":
      return [
        {
          title: t("当前阶段", "Current Stage"),
          body: t("模型已经生成，正在整理 poster、GLB 和 AR 交付文件。", "The model is generated and delivery files are being prepared."),
        },
        {
          title: t("分享入口", "Share Access"),
          body: t("分享页会在导出完成后开放。", "Share view opens after export is done."),
        },
        {
          title: t("下一步", "Next"),
          body: t("交付文件准备完成后，这个页面会自动切到“已完成”。", "This page will switch to ready automatically."),
        },
      ];
    case "failed":
      return [
        {
          title: t("当前状态", "Current Status"),
          body: t("这次生成没有成功完成。", "This generation did not complete."),
        },
        {
          title: t("建议动作", "Suggested Action"),
          body: t("返回首页调整提示词、模式或 LLM 设置后重试。", "Go back home and try again with adjusted settings."),
        },
        {
          title: t("说明", "Note"),
          body: t("在失败状态下，分享与 AR 入口不会开放。", "Share and AR stay unavailable on failure."),
        },
      ];
    default:
      return [];
  }
}

function getStatusBadgeClass(status: GenerationStatus) {
  if (status === "ready") {
    return styles.statusReady;
  }

  if (status === "failed") {
    return styles.statusFailed;
  }

  return styles.statusPending;
}

export function ResultExperience({
  id,
  initialGeneration,
}: ResultExperienceProps) {
  const { t } = useSiteLanguage();
  const [generation, setGeneration] = useState(initialGeneration);
  const [pollError, setPollError] = useState("");

  useEffect(() => {
    setGeneration(initialGeneration);
    setPollError("");
  }, [initialGeneration]);

  useEffect(() => {
    if (!generation || !shouldPollGeneration(generation.status)) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const nextGeneration = await getGenerationRequest(generation.id);

        if (cancelled) {
          return;
        }

        setGeneration(nextGeneration);
        setPollError("");

        if (shouldPollGeneration(nextGeneration.status)) {
          timeoutId = setTimeout(poll, pollIntervalMs);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setPollError(
          normalizeGenerationClientError(
            error,
            t("状态同步失败，本页会继续自动重试。", "Status sync failed. Retrying."),
          ),
        );
        timeoutId = setTimeout(poll, pollRetryMs);
      }
    };

    timeoutId = setTimeout(poll, pollIntervalMs);

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [generation, t]);

  if (!generation) {
    return (
      <main className={styles.page}>
        <LanguageToggle />
        <div className={styles.emptyState}>
          <h1>{t("结果还没有准备好。", "This result is not ready yet.")}</h1>
          <p>
            {t(
              "我们暂时没有读到这个生成记录。你可以返回首页重新发起，或稍后再打开这个结果链接。",
              "We could not read this generation record yet. You can retry from home or open this result link later.",
            )}
          </p>
          <div className={styles.actionRow}>
            <Link href="/" className={styles.primaryAction}>
              {t("返回首页", "Back Home")}
            </Link>
            <Link href={`/share/${id}`} className={styles.secondaryAction}>
              {t("试试分享页", "Try Share Page")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isReady = generation.status === "ready";
  const isFailed = generation.status === "failed";
  const isPending = shouldPollGeneration(generation.status);
  const summary = generation.metadata.customizationSummary;
  const requestRows = isReady ? summary?.accessoryFulfillmentRows?.slice(0, 3) ?? [] : [];
  const aiPath =
    formatAiPathLocalized(generation, t) ??
    t("执行路径未记录", "Execution path not recorded");
  const reviewPath = reviewSummary(generation, t);
  const acceptance = acceptanceSummary(generation, t);
  const runtimeCards = buildRuntimeCards(generation, t);
  const implementedItems =
    summary?.executionScorecard.implemented?.slice(0, 4) ??
    summary?.executedCustomizations?.slice(0, 4) ??
    [t("基础狐狸形态", "Basic fox form"), t("3D 输出资产", "3D output assets")];
  const approximatedItems = summary?.executionScorecard.approximated?.slice(0, 4) ?? [
    t("局部纹理细节", "Local texture details"),
    t("小配件细化", "Accessory refinement"),
  ];
  const unsupportedItems = summary?.executionScorecard.unsupported?.slice(0, 4) ?? [
    t("实时动画", "Real-time animation"),
  ];

  return (
    <main className={styles.page}>
      <LanguageToggle />
      <div className={styles.frame}>
        <motion.section
          className={styles.hero}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: motionEase }}
        >
          <div className={styles.heroHeader}>
            <div className={styles.heroIntro}>
              <div className={styles.brandPill}>
                <span className={styles.brandMark}>✦</span>
                <span>PromptPet-AR</span>
              </div>
              <h1 className={styles.title}>{generation.name}</h1>
              <p className={styles.promptLine}>
                {t("原始提示词：", "Original prompt: ")}
                <span>{generation.prompt}</span>
              </p>
              <div className={styles.badges}>
                <span>{styleLabel(generation.style, t)}</span>
                <span>{modeLabel(generation.metadata.generationMode, t)}</span>
                {profileLabel(generation, t) ? (
                  <span>{profileLabel(generation, t)}</span>
                ) : null}
                <span className={`${styles.statusBadge} ${getStatusBadgeClass(generation.status)}`}>
                  {statusLabel(generation.status, t)}
                </span>
              </div>
            </div>
            <div className={styles.actionRow}>
              {isReady ? (
                <>
                  <a href={generation.ar.androidUrl} className={styles.primaryAction}>
                    <span className={styles.actionIcon}>AR</span>
                    <span>{t("放到现实里", "Place in AR")}</span>
                  </a>
                  <a href={generation.modelUrl} className={styles.secondaryAction} download>
                    <span className={styles.actionIcon}>↓</span>
                    <span>{t("下载 GLB", "Download GLB")}</span>
                  </a>
                  <Link href="/" className={styles.secondaryAction}>
                    {t("重新生成", "Regenerate")}
                  </Link>
                  <Link href={generation.sharePath} className={styles.secondaryAction}>
                    <span className={styles.actionIcon}>↗</span>
                    <span>{t("打开分享页", "Open Share")}</span>
                  </Link>
                </>
              ) : null}

              {isPending ? (
                <>
                  <button type="button" className={styles.primaryAction} disabled>
                    <span className={styles.actionIcon}>·</span>
                    <span>{statusLabel(generation.status, t)}</span>
                  </button>
                  <Link href="/" className={styles.secondaryAction}>
                    {t("返回首页调整", "Back Home")}
                  </Link>
                  <button type="button" className={styles.secondaryAction} disabled>
                    {t("分享页将在完成后开放", "Share opens when ready")}
                  </button>
                </>
              ) : null}

              {isFailed ? (
                <>
                  <Link href="/" className={styles.primaryAction}>
                    {t("返回首页重试", "Retry From Home")}
                  </Link>
                  <button type="button" className={styles.secondaryAction} disabled>
                    {t("本次生成未完成", "Generation not completed")}
                  </button>
                </>
              ) : null}
            </div>

            {isPending || pollError ? (
              <p className={styles.statusLine}>
                {pollError ||
                  t(
                    "结果页会自动刷新，不需要手动刷新浏览器。",
                    "This page refreshes automatically while generation is running.",
                  )}
              </p>
            ) : null}
          </div>

          <div className={styles.previewCard}>
            <div className={styles.previewGlow} />
            {isReady && generation.modelUrl ? (
              <ModelViewerStage
                modelUrl={generation.modelUrl}
                posterUrl={generation.posterUrl}
                title={generation.name}
                autoRotate
              />
            ) : (
              <img
                src={generation.posterUrl}
                alt={generation.name}
                className={styles.previewImage}
                loading="eager"
              />
            )}
          </div>
        </motion.section>

        <section className={styles.metricsGrid}>
          <article className={styles.metricCard}>
            <h2>{t("当前结论", "Current Summary")}</h2>
            <p>{acceptance}</p>
          </article>
          <article className={styles.metricCard}>
            <h2>{t("评审路径", "Review Path")}</h2>
            <p>{reviewPath}</p>
          </article>
          <article className={styles.metricCard}>
            <h2>{t("AI 执行路径", "AI Execution Path")}</h2>
            <p>{aiPath}</p>
          </article>
        </section>

        {!isReady ? (
          <section className={styles.runtimeSection}>
            <div className={styles.sectionHeader}>
              <h2>{t("当前状态", "Current Status")}</h2>
              <p>{statusSummary(generation.status, t)}</p>
            </div>
            <div className={styles.runtimeGrid}>
              {runtimeCards.map((card) => (
                <article key={card.title} className={styles.runtimeCard}>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {isReady ? (
          <section className={styles.fulfillmentSection}>
            <div className={styles.sectionHeader}>
              <h2>{t("兑现说明", "Fulfillment")}</h2>
              <p>
                {t(
                  "这一页已经接入真实结果数据，因此这里展示的是当前生成链路给出的实际兑现情况。",
                  "This page now uses live generation data, so the fulfillment layer reflects the actual runtime output.",
                )}
              </p>
            </div>

            <div className={styles.fulfillmentColumns}>
              <article className={styles.fulfillmentColumn}>
                <h3>{t("已实现", "Implemented")}</h3>
                <ul>
                  {implementedItems.map((item) => (
                    <li key={item}>
                      <span className={styles.itemIcon}>●</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
              <article className={styles.fulfillmentColumn}>
                <h3>{t("近似实现", "Approximated")}</h3>
                <ul>
                  {approximatedItems.map((item) => (
                    <li key={item}>
                      <span className={styles.itemIcon}>◐</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
              <article className={styles.fulfillmentColumn}>
                <h3>{t("未实现", "Unsupported")}</h3>
                <ul>
                  {unsupportedItems.map((item) => (
                    <li key={item}>
                      <span className={styles.itemIcon}>○</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </section>
        ) : null}

        {isReady && requestRows.length > 0 ? (
          <section className={styles.requestSection}>
            <div className={styles.sectionHeader}>
              <h2>{t("逐请求兑现", "Per-request Fulfillment")}</h2>
              <p>
                {t(
                  "这里保留最关键的几条兑现记录，方便检查本次定制的落地诚实度。",
                  "A few key fulfillment rows remain here so you can inspect how honestly this generation landed.",
                )}
              </p>
            </div>
            <div className={styles.requestGrid}>
              {requestRows.map((row) => (
                <article key={row.instanceId} className={styles.requestCard}>
                  <div className={styles.requestHead}>
                    <strong>{row.requestedLabel}</strong>
                    <span>{row.status}</span>
                  </div>
                  <p>
                    {t("落地结果：", "Outcome: ")}
                    {row.actualLabel}
                  </p>
                  <p>
                    {t("来源：", "Source: ")}
                    {row.creationSource}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { LanguageToggle } from "@/components/language-toggle";
import { useSiteLanguage } from "@/components/site-language";
import type { GenerationRecord, GenerationStatus } from "@/lib/generation-types";

import styles from "./share-experience.module.css";

type ShareExperienceProps = {
  id: string;
  initialGeneration?: GenerationRecord | null;
};

const motionEase = [0.16, 1, 0.3, 1] as const;

function styleLabel(style: GenerationRecord["style"], t: (zh: string, en: string) => string) {
  if (style === "cream-toy") {
    return t("奶油玩具感", "Cream Toy");
  }
  if (style === "low-poly") {
    return t("低模卡通感", "Low Poly");
  }
  return t("梦幻发光感", "Dream Glow");
}

function statusLabel(status: GenerationStatus, t: (zh: string, en: string) => string) {
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

function getStatusBadgeClass(status: GenerationStatus) {
  if (status === "ready") {
    return styles.statusReady;
  }

  if (status === "failed") {
    return styles.statusFailed;
  }

  return styles.statusPending;
}

function shareSummary(generation: GenerationRecord, t: (zh: string, en: string) => string) {
  if (generation.status !== "ready") {
    if (generation.status === "failed") {
      return t("这次生成未完成，所以分享件还不能作为最终结果对外展示。", "This generation did not complete.");
    }

    return t("分享件仍在准备中，完成后才会进入最终展示状态。", "The share asset is still being prepared.");
  }

  const summary = generation.metadata.customizationSummary;
  if (!summary) {
    return t("已生成桌宠分享页。", "Desk-pet share view generated.");
  }

  return (
    [summary.themeLabel, summary.accessorySummary, summary.executedCustomizations?.[0]]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" / ") || t("已生成桌宠分享页。", "Desk-pet share view generated.")
  );
}

function aiPath(
  generation: GenerationRecord,
  t: (zh: string, en: string) => string,
) {
  const summary = generation.metadata.customizationSummary;
  return (
    [
      summary?.parserLabel ? `${t("解析", "Parser")}: ${summary.parserLabel}` : null,
      summary?.designPlannerSource
        ? `${t("执行", "Execution")}: ${summary.designPlannerSource}`
        : null,
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" / ") ||
    `${t("解析", "Parser")}: ${t("规则回退", "Rule fallback")} / ${t("执行", "Execution")}: ${t("静态展示", "Static presentation")}`
  );
}

function arSummary(generation: GenerationRecord, t: (zh: string, en: string) => string) {
  if (generation.status === "ready") {
    return t("可进入移动端 AR 查看", "Ready for mobile AR viewing");
  }

  if (generation.status === "failed") {
    return t("本次生成未完成，AR 入口不会开放。", "AR access stays unavailable for failed generations.");
  }

  return t("导出完成后才会开放 AR 入口。", "AR access opens after export is complete.");
}

export function ShareExperience({
  id,
  initialGeneration,
}: ShareExperienceProps) {
  const { t } = useSiteLanguage();

  if (!initialGeneration) {
    return (
      <main className={styles.page}>
        <LanguageToggle />
        <div className={styles.emptyState}>
          <h1>{t("这个分享页还没有准备好。", "This share page is not ready yet.")}</h1>
          <div className={styles.actionRow}>
            <Link href="/" className={styles.primaryAction}>
              {t("返回首页", "Back Home")}
            </Link>
            <Link href={`/result/${id}`} className={styles.secondaryAction}>
              {t("查看结果页", "View Result")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const generation = initialGeneration;
  const summary = generation.metadata.customizationSummary;
  const isReady = generation.status === "ready";
  const isFailed = generation.status === "failed";

  return (
    <main className={styles.page}>
      <LanguageToggle />
      <div className={styles.frame}>
        <motion.section
          className={styles.hero}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: motionEase }}
        >
          <div className={styles.posterWrap}>
            <div className={styles.posterGlow} />
            <img
              src={generation.posterUrl}
              alt={generation.name}
              className={styles.posterImage}
              loading="eager"
            />
          </div>

          <div className={styles.copyColumn}>
            <div className={styles.brandPill}>
              <span className={styles.brandMark}>✦</span>
              <span>PromptPet-AR</span>
            </div>
            <h1 className={styles.title}>{generation.name}</h1>
            <p className={styles.promptLine}>{generation.prompt}</p>
            <div className={styles.badges}>
              <span>{styleLabel(generation.style, t)}</span>
              <span>
                {generation.metadata.generationMode === "dynamic-custom"
                  ? t("动态定制", "Dynamic Custom")
                  : t("快速稳定", "Fast Stable")}
              </span>
              <span>{t("分享页", "Share View")}</span>
              <span className={`${styles.statusBadge} ${getStatusBadgeClass(generation.status)}`}>
                {statusLabel(generation.status, t)}
              </span>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryIcon}>●</span>
                <div>
                  <strong>{t("生成摘要", "Generation Summary")}</strong>
                  <p>{shareSummary(generation, t)}</p>
                </div>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryIcon}>●</span>
                <div>
                  <strong>{t("AR 状态", "AR Status")}</strong>
                  <p>{arSummary(generation, t)}</p>
                </div>
              </div>
              <div className={styles.metaLine}>
                <span>{t("AI 执行路径：", "AI execution path: ")}</span>
                <code>{aiPath(generation, t)}</code>
              </div>
              {isReady && summary?.executionScorecard ? (
                <div className={styles.metaLine}>
                  <span>{t("兑现概览：", "Fulfillment: ")}</span>
                  <code>
                    {t("已实现", "Implemented")}{" "}
                    {summary.executionScorecard.implemented.length} ·{" "}
                    {t("近似实现", "Approximated")}{" "}
                    {summary.executionScorecard.approximated.length} ·{" "}
                    {t("未实现", "Unsupported")}{" "}
                    {summary.executionScorecard.unsupported.length}
                  </code>
                </div>
              ) : null}
              {!isReady ? (
                <div className={styles.metaLine}>
                  <span>{t("当前说明：", "Current note: ")}</span>
                  <code>
                    {isFailed
                      ? t("请返回首页重试，或去结果页查看这次失败状态。", "Retry from home or review the failed result page.")
                      : t("请前往结果页查看实时进度，分享件完成后会自动具备完整意义。", "Use the result page for live progress until sharing is ready.")}
                  </code>
                </div>
              ) : null}
            </div>

            <div className={styles.actionRow}>
              {isReady ? (
                <>
                  <a href={generation.ar.androidUrl} className={styles.primaryAction}>
                    <span className={styles.actionIcon}>AR</span>
                    <span>{t("在 AR 中查看", "View in AR")}</span>
                  </a>
                  <Link href={`/result/${generation.id}`} className={styles.secondaryAction}>
                    <span>{t("查看完整结果", "View Full Result")}</span>
                    <span className={styles.actionIcon}>→</span>
                  </Link>
                </>
              ) : null}

              {!isReady ? (
                <>
                  <Link href={`/result/${generation.id}`} className={styles.primaryAction}>
                    {t("查看结果页", "View Result Page")}
                  </Link>
                  {isFailed ? (
                    <Link href="/" className={styles.secondaryAction}>
                      {t("返回首页重试", "Retry From Home")}
                    </Link>
                  ) : (
                    <button type="button" className={styles.secondaryAction} disabled>
                      {t("分享件准备中", "Share asset pending")}
                    </button>
                  )}
                </>
              ) : null}
            </div>

            <p className={styles.attribution}>
              {t("由 PromptPet-AR 生成", "Generated by PromptPet-AR")}
            </p>
          </div>
        </motion.section>
      </div>
    </main>
  );
}

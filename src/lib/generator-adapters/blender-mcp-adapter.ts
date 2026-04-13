import "server-only";

import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { getGeneratedAssetUrls } from "../generation-artifacts";
import { resolveGenerationArEntryUrls } from "../generation-artifacts";
import {
  currentArPlacementPreset,
  currentCameraPreset,
  currentPosePreset,
  currentTemplateVersion,
  supportedSpeciesLine,
} from "../fox-base-contract";
import {
  deriveFoxDisplayName,
  getFoxThemeDisplayName,
  getFoxThemeDemoAssets,
  isFoxThemeSlot,
} from "../fox-theme-variants";
import { getOutputDirectory } from "../generation-persistence";
import {
  buildCustomizationNotes,
  buildCustomizationSummary,
  buildStructuredCustomizationPrompt,
  getCustomizationProfileLabel,
  getGenerationModeLabel,
} from "../prompt-customization";
import type {
  GenerationMetadata,
  GenerationStatus,
  PersistedGenerationRecord,
  PromptCustomizationRecipe,
  StyleTemplate,
} from "../generation-types";
import { generationStatuses } from "../generation-types";
import { styleTemplateDetails } from "../style-templates";

import {
  readAdapterStatusSignal,
  writeAdapterStatusSignal,
} from "./adapter-status-file";
import type { GeneratorAdapter } from "./types";

function isGenerationStatus(value: unknown): value is GenerationStatus {
  return (
    typeof value === "string" &&
    generationStatuses.includes(value as GenerationStatus)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deriveName(
  prompt: string,
  style: StyleTemplate,
  themeSlot?: string,
) {
  if (themeSlot && isFoxThemeSlot(themeSlot)) {
    return getFoxThemeDisplayName(themeSlot);
  }

  return deriveFoxDisplayName(prompt, style);
}

function buildPendingMetadata(
  prompt: string,
  style: StyleTemplate,
  createdAtMs: number,
  generationMode: "fast-stable" | "dynamic-custom",
  customizations: Parameters<typeof buildCustomizationSummary>[0],
): GenerationMetadata {
  const styleLabel = styleTemplateDetails[style].label;
  const demoAssets = getFoxThemeDemoAssets(customizations.themeSlot as never);

  return {
    originalPrompt: prompt,
    structuredPrompt: buildStructuredCustomizationPrompt({
      prompt,
      styleLabel,
      templateVersion: currentTemplateVersion,
      generatorMode: "template-variant",
      cameraPreset: currentCameraPreset,
      posePreset: currentPosePreset,
      arPlacementPreset: currentArPlacementPreset,
      recipe: customizations,
    }),
    styleLabel,
    exportedAt: new Date(createdAtMs).toISOString(),
    modelSize: "待导出",
    thumbnailPath: demoAssets.posterUrl,
    outputFiles: [
      "model.glb",
      "model.usdz",
      "thumbnail.png",
      "metadata.json",
      "adapter-status.json",
    ],
    generationMode,
    customizationProfile:
      generationMode === "dynamic-custom"
        ? customizations.customizationProfile
        : undefined,
    customizationSummary: buildCustomizationSummary(customizations),
    notes: [
      "当前 generation 已经提交给 blender-mcp 适配器，等待 fox-base worker 接管。",
      `${supportedSpeciesLine} 当前真实链路固定为 ${currentTemplateVersion} 母体资产；这次请求走的是 ${getGenerationModeLabel(generationMode)}${generationMode === "dynamic-custom" ? ` / ${getCustomizationProfileLabel(customizations.customizationProfile)}` : ""}，主题为 ${customizations.themeLabel}。`,
      "结果页在导出完成前会先复用同主题 demo 资产作为占位预览，这样等待态和最终成片不会像两套东西。",
      "真实 worker 应更新 adapter-status.json，并在 ready 时写入 model.glb 与 thumbnail.png。",
      "Android 演示是当前主验收目标；如果本机 USD 工具链可用，worker 还会继续补出 model.usdz，供 iPhone Quick Look 使用。",
      ...buildCustomizationNotes(customizations),
    ],
  };
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadMetadataFromOutput(
  id: string,
  fallback: GenerationMetadata,
): Promise<GenerationMetadata> {
  try {
    const filePath = path.join(getOutputDirectory(id), "metadata.json");
    const file = await readFile(filePath, "utf8");
    const payload = JSON.parse(file);

    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      return fallback;
    }

    return {
      originalPrompt:
        typeof payload.originalPrompt === "string"
          ? payload.originalPrompt
          : fallback.originalPrompt,
      structuredPrompt:
        typeof payload.structuredPrompt === "string"
          ? payload.structuredPrompt
          : fallback.structuredPrompt,
      styleLabel:
        typeof payload.styleLabel === "string"
          ? payload.styleLabel
          : fallback.styleLabel,
      exportedAt:
        typeof payload.exportedAt === "string"
          ? payload.exportedAt
          : fallback.exportedAt,
      modelSize:
        typeof payload.modelSize === "string"
          ? payload.modelSize
          : fallback.modelSize,
      thumbnailPath:
        typeof payload.thumbnailPath === "string"
          ? payload.thumbnailPath
          : fallback.thumbnailPath,
      outputFiles: Array.isArray(payload.outputFiles)
        ? payload.outputFiles.filter(
            (value: unknown): value is string => typeof value === "string",
          )
        : fallback.outputFiles,
      notes: Array.isArray(payload.notes)
        ? payload.notes.filter(
            (value: unknown): value is string => typeof value === "string",
          )
        : fallback.notes,
    generationMode:
      payload.generationMode === "dynamic-custom" ||
      payload.generationMode === "fast-stable"
          ? payload.generationMode
          : fallback.generationMode,
      customizationProfile:
        payload.customizationProfile === "safe-overlay" ||
        payload.customizationProfile === "experimental-addon"
          ? payload.customizationProfile
          : fallback.customizationProfile,
      customizationSummary: isRecord(payload.customizationSummary)
        ? (payload.customizationSummary as GenerationMetadata["customizationSummary"])
        : fallback.customizationSummary,
    };
  } catch {
    return fallback;
  }
}

async function loadCustomizationsFromTaskFile(
  id: string,
  fallback: PersistedGenerationRecord["customizations"],
): Promise<PersistedGenerationRecord["customizations"]> {
  try {
    const filePath = path.join(getOutputDirectory(id), "task.json");
    const file = await readFile(filePath, "utf8");
    const payload = JSON.parse(file);

    if (
      !isRecord(payload) ||
      !isRecord(payload.handoff) ||
      !isRecord(payload.handoff.recipe) ||
      !isRecord(payload.handoff.recipe.customizations)
    ) {
      return fallback;
    }

    return payload.handoff.recipe.customizations as PromptCustomizationRecipe;
  } catch {
    return fallback;
  }
}

export const blenderMcpAdapter: GeneratorAdapter = {
  key: "blender-mcp",
  async create(context) {
    const ar = resolveGenerationArEntryUrls(context.id);
    const demoAssets = getFoxThemeDemoAssets(context.customizations.themeSlot as never);
    const name = deriveName(
      context.prompt,
      context.style,
      context.customizations.themeSlot,
    );

    await writeAdapterStatusSignal(context.id, {
      version: 1,
      adapterKey: "blender-mcp",
      status: "queued",
      updatedAt: new Date(context.createdAtMs).toISOString(),
      message: `任务已进入 Blender MCP 队列，等待 fox-base 外部 worker 接管。当前主题：${context.customizations.themeLabel}。`,
      name,
      ar,
    });

    return {
      name,
      modelUrl: demoAssets.modelUrl,
      posterUrl: demoAssets.posterUrl,
      metadata: buildPendingMetadata(
        context.prompt,
        context.style,
        context.createdAtMs,
        context.generationMode,
        context.customizations,
      ),
      ar,
      adapterState: {
        protocol: "adapter-status-v1",
        status: "queued",
        message: `任务已进入 Blender MCP 队列，等待 fox-base 外部 worker 接管。当前主题：${context.customizations.themeLabel}。`,
        themeSlot: context.customizations.themeSlot,
        themeLabel: context.customizations.themeLabel,
        accessory:
          context.customizations.accessoryOperation.accessoryKey ?? "",
        accessoryLabel: context.customizations.accessoryOperation.label,
        generationMode: context.generationMode,
        customizationProfile: context.customizationProfile,
      },
    };
  },
  async getStatus(record: PersistedGenerationRecord) {
    if (typeof record.adapterState.errorMessage === "string") {
      return "failed";
    }

    if (isGenerationStatus(record.adapterState.status)) {
      return record.adapterState.status;
    }

    return "queued";
  },
  async syncRecord(record) {
    const signal = await readAdapterStatusSignal(record.id);

    if (!signal) {
      return {
        record,
        changed: false,
      };
    }

    const outputDirectory = getOutputDirectory(record.id);
    const modelFilePath = path.join(outputDirectory, "model.glb");
    const posterFilePath = path.join(outputDirectory, "thumbnail.png");
    const hasModel = await fileExists(modelFilePath);
    const hasPoster = await fileExists(posterFilePath);

    let nextStatus = signal.errorMessage ? "failed" : signal.status;

    if (nextStatus === "ready" && (!hasModel || !hasPoster)) {
      nextStatus = hasModel ? "exporting" : "rendering";
    }

    const nextAr = resolveGenerationArEntryUrls(record.id, signal.ar ?? record.ar);
    const nextRecord: PersistedGenerationRecord = {
      ...record,
      name: signal.name ?? record.name,
      ar: nextAr,
      adapterState: {
        ...record.adapterState,
        protocol: "adapter-status-v1",
        status: nextStatus,
        updatedAt: signal.updatedAt,
        message: signal.message ?? record.adapterState.message,
        errorMessage: signal.errorMessage ?? record.adapterState.errorMessage,
      },
    };

    if (nextStatus === "ready") {
      const metadata = await loadMetadataFromOutput(record.id, record.metadata);
      const customizations = await loadCustomizationsFromTaskFile(
        record.id,
        record.customizations,
      );
      const generatedUrls = getGeneratedAssetUrls(record.id);

      nextRecord.modelUrl = generatedUrls.modelUrl;
      nextRecord.posterUrl = generatedUrls.posterUrl;
      nextRecord.metadata = metadata;
      nextRecord.customizations = customizations;
    }

    const changed =
      JSON.stringify(nextRecord) !== JSON.stringify(record);

    return {
      record: nextRecord,
      changed,
    };
  },
};

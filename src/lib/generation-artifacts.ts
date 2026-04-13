import "server-only";

import path from "node:path";

import type {
  GenerationArLinks,
  GenerationArtifacts,
  GenerationTaskManifest,
  PersistedGenerationRecord,
} from "./generation-types";
import {
  currentArPlacementPreset,
  currentCameraPreset,
  currentPosePreset,
  currentTemplateVersion,
  foxBaseContract,
} from "./fox-base-contract";
import { deriveFoxPromptVariant } from "./fox-theme-variants";
import {
  buildCustomizationNotes,
  derivePromptCustomizationFallback,
  getCustomizationProfileLabel,
  getGenerationModeLabel,
} from "./prompt-customization";

const outputRootSegments = ["output", "mock-generations"] as const;

export function getArtifactsForId(id: string): GenerationArtifacts {
  return {
    metadataUrl: `/api/generations/${id}/metadata`,
    promptUrl: `/api/generations/${id}/prompt`,
    taskUrl: `/api/generations/${id}/task`,
  };
}

export function getGeneratedAssetUrls(id: string) {
  return {
    modelUrl: `/api/generations/${id}/model`,
    posterUrl: `/api/generations/${id}/poster`,
    usdzUrl: `/api/generations/${id}/usdz`,
  };
}

export function getGenerationArEntryUrls(id: string): GenerationArLinks {
  return {
    androidUrl: `/api/generations/${id}/ar/android`,
    iosUrl: `/api/generations/${id}/ar/ios`,
  };
}

export function resolveGenerationArEntryUrls(
  id: string,
  value?: Partial<GenerationArLinks> | null,
): GenerationArLinks {
  const defaults = getGenerationArEntryUrls(id);

  if (!value) {
    return defaults;
  }

  return {
    androidUrl:
      typeof value.androidUrl === "string" && value.androidUrl
        ? value.androidUrl
        : defaults.androidUrl,
    iosUrl:
      typeof value.iosUrl === "string" && value.iosUrl
        ? value.iosUrl
        : defaults.iosUrl,
  };
}

export function getOutputRelativeDirectory(id: string) {
  return path.posix.join(...outputRootSegments, id);
}

export function getArtifactFilePaths(id: string) {
  const outputDirectory = getOutputRelativeDirectory(id);

  return {
    generationFile: path.posix.join(outputDirectory, "generation.json"),
    metadataFile: path.posix.join(outputDirectory, "metadata.json"),
    promptFile: path.posix.join(outputDirectory, "prompt.txt"),
    taskFile: path.posix.join(outputDirectory, "task.json"),
    statusFile: path.posix.join(outputDirectory, "adapter-status.json"),
    modelFile: path.posix.join(outputDirectory, "model.glb"),
    usdFile: path.posix.join(outputDirectory, "model.usd"),
    posterFile: path.posix.join(outputDirectory, "thumbnail.png"),
    usdzFile: path.posix.join(outputDirectory, "model.usdz"),
  };
}

function describeRoleOverride(role: "semantic" | "design" | "vision") {
  const prefix = role.toUpperCase();
  const provider = process.env[`${prefix}_PROVIDER`]?.trim();
  const baseUrl = process.env[`${prefix}_BASE_URL`]?.trim();
  const model = process.env[`${prefix}_MODEL`]?.trim();
  const apiKey = process.env[`${prefix}_API_KEY`]?.trim();

  if (!provider && !baseUrl && !model && !apiKey) {
    return null;
  }

  return `${role}=${provider ?? "auto"} / ${baseUrl ?? "env-default"} / ${model ?? "env-default"}`;
}

function buildRoleOverrideNotes() {
  const overrides = [
    describeRoleOverride("semantic"),
    describeRoleOverride("design"),
    describeRoleOverride("vision"),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return overrides.length > 0
    ? [`当前运行态角色覆盖：${overrides.join(" ; ")}。`]
    : [];
}

export function buildGenerationTaskManifest(
  record: PersistedGenerationRecord,
): GenerationTaskManifest {
  const generationMode = record.generationMode ?? "fast-stable";
  const customizationProfile =
    generationMode === "dynamic-custom"
      ? record.customizationProfile ??
        record.customizations?.customizationProfile ??
        "safe-overlay"
      : undefined;
  const customizations =
    record.customizations ??
    derivePromptCustomizationFallback({
      prompt: record.prompt,
      style: record.style,
      generationMode,
      customizationProfile,
    });
  const promptVariant = deriveFoxPromptVariant(record.prompt, record.style);
  const deliveryAr = resolveGenerationArEntryUrls(record.id, record.ar);
  const deliveryUrls =
    record.adapterKey === "blender-mcp"
      ? getGeneratedAssetUrls(record.id)
      : {
          modelUrl: record.modelUrl,
          posterUrl: record.posterUrl,
        };

  return {
    version: 1,
    generationId: record.id,
    adapterKey: record.adapterKey,
    requestedAt: record.createdAt,
    input: {
      prompt: record.prompt,
      style: record.style,
      generationMode,
      ...(customizationProfile ? { customizationProfile } : {}),
      ...(record.llmConfig ? { llmConfig: record.llmConfig } : {}),
    },
    delivery: {
      name: record.name,
      modelUrl: deliveryUrls.modelUrl,
      posterUrl: deliveryUrls.posterUrl,
      sharePath: record.sharePath,
      ar: deliveryAr,
    },
    artifacts: {
      ...record.artifacts,
      ...getArtifactFilePaths(record.id),
    },
    adapterState: record.adapterState,
    handoff: {
      nextAdapter: "blender-mcp",
      boundary:
        "保持当前页面路由与 GenerationRecord API 形状不变，只替换已支持物种的母体资产与 adapter 实现。",
      recipe: {
        archetype: foxBaseContract.recipeDefaults.archetype,
        templateVersion: currentTemplateVersion,
        generatorMode: foxBaseContract.generatorMode,
        generationMode,
        ...(customizationProfile ? { customizationProfile } : {}),
        ...(record.llmConfig ? { llmConfig: record.llmConfig } : {}),
        cameraPreset: currentCameraPreset,
        posePreset: currentPosePreset,
        arPlacementPreset: currentArPlacementPreset,
        themeSlot: customizations.themeSlot,
        themeLabel: customizations.themeLabel,
        accessory:
          customizations.accessoryOperation.accessoryKey ??
          promptVariant.accessoryKey,
        accessoryLabel: customizations.accessoryOperation.label,
        eyeMood: promptVariant.eyeMood,
        assetContractFile: foxBaseContract.assetContractFile,
        templateAssetFile:
          foxBaseContract.exportFiles.runtimeTemplateFile ??
          foxBaseContract.exportFiles.modelFile,
        stageAssetFile: foxBaseContract.exportFiles.stageFile,
        exportScaleFactor: foxBaseContract.recipeDefaults.exportScaleFactor,
        exportScale: [
          foxBaseContract.recipeDefaults.exportScaleFactor,
          foxBaseContract.recipeDefaults.exportScaleFactor,
          foxBaseContract.recipeDefaults.exportScaleFactor,
        ],
        exportFacingRotation: foxBaseContract.recipeDefaults.exportFacingRotation,
        stageCameraLocation: foxBaseContract.recipeDefaults.stageCameraLocation,
        stageCameraRotation: foxBaseContract.recipeDefaults.stageCameraRotation,
        stageCameraFocalLength:
          foxBaseContract.recipeDefaults.stageCameraFocalLength,
        renderExposure: foxBaseContract.recipeDefaults.renderExposure,
        renderGamma: foxBaseContract.recipeDefaults.renderGamma,
        customizations,
      },
      notes: [
        "task.json 用来描述这次生成请求的输入、输出工件与适配器边界。",
        `当前真实链路固定为 ${currentTemplateVersion} 母体资产；本次请求走的是 ${getGenerationModeLabel(generationMode)}${customizationProfile ? ` / ${getCustomizationProfileLabel(customizationProfile)}` : ""}，并被归到 ${customizations.themeLabel} 主题。`,
        ...(record.llmConfig
          ? [
              `本次 LLM 路由覆盖：${record.llmConfig.provider ?? "auto"} / ${record.llmConfig.baseUrl ?? "env-default"} / ${record.llmConfig.model ?? "env-default"}。`,
            ]
          : []),
        ...buildRoleOverrideNotes(),
        "prompt 会优先影响主题、配色、小配饰、眼睛气质和尾巴末端效果，不再重塑母体结构。",
        "外部生成器应写入 adapter-status.json，并在 ready 时产出 model.glb 与 thumbnail.png。",
        "如果当前环境支持 iPhone Quick Look，还应额外写出 model.usdz；model.usd 只作为内部中间产物，不暴露给公开接口。",
        ...buildCustomizationNotes(customizations),
      ],
    },
  };
}

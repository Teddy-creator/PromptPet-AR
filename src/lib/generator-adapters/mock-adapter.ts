import mockMetadata from "@/data/mock-generation-metadata.json";

import {
  currentArPlacementPreset,
  currentCameraPreset,
  currentPosePreset,
  currentTemplateVersion,
} from "../fox-base-contract";
import {
  deriveFoxDisplayName,
  detectFoxThemeSlot,
  getFoxThemeDisplayName,
  getFoxThemeDemoAssets,
  getFoxThemeLabel,
  isFoxThemeSlot,
} from "../fox-theme-variants";
import { resolveGenerationArEntryUrls } from "../generation-artifacts";
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
  StyleTemplate,
} from "../generation-types";
import { styleTemplateDetails } from "../style-templates";
import type {
  GeneratorAdapter,
  GeneratorAdapterCreateContext,
  GeneratorAdapterCreateResult,
} from "./types";

const lifecycle: Array<{
  untilMs: number;
  status: GenerationStatus;
}> = [
  { untilMs: 1200, status: "queued" },
  { untilMs: 2800, status: "rendering" },
  { untilMs: 4700, status: "exporting" },
  { untilMs: Number.POSITIVE_INFINITY, status: "ready" },
];

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

function buildMetadata(
  prompt: string,
  style: StyleTemplate,
  createdAtMs: number,
  customizations: GeneratorAdapterCreateContext["customizations"],
  generationMode: GeneratorAdapterCreateContext["generationMode"],
): GenerationMetadata {
  const styleLabel = styleTemplateDetails[style].label;
  const themeSlot = customizations.themeSlot || detectFoxThemeSlot(prompt, style);
  const themeLabel = getFoxThemeLabel(themeSlot as never);
  const demoAssets = getFoxThemeDemoAssets(themeSlot as never);

  return {
    ...mockMetadata,
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
    exportedAt: new Date(createdAtMs + 4700).toISOString(),
    thumbnailPath: demoAssets.posterUrl,
    generationMode,
    customizationProfile:
      generationMode === "dynamic-custom"
        ? customizations.customizationProfile
        : undefined,
    customizationSummary: buildCustomizationSummary(customizations),
    notes: [
      `${getGenerationModeLabel(generationMode)}${generationMode === "dynamic-custom" ? ` / ${getCustomizationProfileLabel(customizations.customizationProfile)}` : ""} 当前使用 mock 资产演示；结果会先复用 ${themeLabel} 主题样本。`,
      `当前结果使用仓库内 ${currentTemplateVersion} 可读变体母体导出样本作为 mock 演示素材。`,
      "真实 Blender MCP 接入后将继续沿用同一套 GenerationRecord 结构，并复用同一份母体资产合同。",
      ...buildCustomizationNotes(customizations),
    ],
  };
}

function deriveGenerationStatus(createdAtMs: number): GenerationStatus {
  const age = Date.now() - createdAtMs;
  const step = lifecycle.find(({ untilMs }) => age < untilMs);

  return step?.status ?? "ready";
}

export const mockAdapter: GeneratorAdapter = {
  key: "mock",
  async create(
    context: GeneratorAdapterCreateContext,
  ): Promise<GeneratorAdapterCreateResult> {
    const ar = resolveGenerationArEntryUrls(context.id);
    const themeSlot =
      context.customizations.themeSlot &&
      isFoxThemeSlot(context.customizations.themeSlot)
        ? context.customizations.themeSlot
        : detectFoxThemeSlot(context.prompt, context.style);
    const demoAssets = getFoxThemeDemoAssets(themeSlot);

    return {
      name: deriveName(context.prompt, context.style, context.customizations.themeSlot),
      modelUrl: demoAssets.modelUrl,
      posterUrl: demoAssets.posterUrl,
      metadata: buildMetadata(
        context.prompt,
        context.style,
        context.createdAtMs,
        context.customizations,
        context.generationMode,
      ),
      ar,
      adapterState: {
        lifecycle: "timed-mock",
        themeSlot,
        generationMode: context.generationMode,
        customizationProfile: context.customizationProfile,
      },
    };
  },
  async getStatus(record: PersistedGenerationRecord) {
    return deriveGenerationStatus(record.createdAtMs);
  },
};

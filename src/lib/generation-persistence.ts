import "server-only";

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildGenerationTaskManifest,
  getArtifactsForId,
} from "./generation-artifacts";
import type {
  CustomizationProfile,
  GenerationArtifacts,
  GeneratorAdapterKey,
  GenerationMode,
  PersistedGenerationLlmConfig,
  PromptCustomizationRecipe,
  PersistedGenerationRecord,
} from "./generation-types";
import {
  customizationProfiles,
  generationModes,
  generatorAdapterKeys,
} from "./generation-types";
import { isStyleTemplate } from "./style-templates";

const outputRoot = path.join(process.cwd(), "output", "mock-generations");

type PersistedGenerationCandidate = Partial<PersistedGenerationRecord> &
  Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGeneratorAdapterKey(value: unknown): value is GeneratorAdapterKey {
  return (
    typeof value === "string" &&
    generatorAdapterKeys.includes(value as GeneratorAdapterKey)
  );
}

function isGenerationMode(value: unknown): value is GenerationMode {
  return (
    typeof value === "string" &&
    generationModes.includes(value as GenerationMode)
  );
}

function isCustomizationProfile(value: unknown): value is CustomizationProfile {
  return (
    typeof value === "string" &&
    customizationProfiles.includes(value as CustomizationProfile)
  );
}

function normalizePersistedLlmConfig(value: unknown): PersistedGenerationLlmConfig | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const provider =
    value.provider === "openai" || value.provider === "deepseek"
      ? value.provider
      : undefined;
  const baseUrl =
    typeof value.baseUrl === "string" && value.baseUrl.trim()
      ? value.baseUrl.trim()
      : undefined;
  const model =
    typeof value.model === "string" && value.model.trim()
      ? value.model.trim()
      : undefined;

  const normalized = {
    ...(provider ? { provider } : {}),
    ...(baseUrl ? { baseUrl } : {}),
    ...(model ? { model } : {}),
  } satisfies PersistedGenerationLlmConfig;

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeArtifacts(id: string, value: unknown): GenerationArtifacts {
  const defaults = getArtifactsForId(id);

  if (!isRecord(value)) {
    return defaults;
  }

  return {
    metadataUrl:
      typeof value.metadataUrl === "string"
        ? value.metadataUrl
        : defaults.metadataUrl,
    promptUrl:
      typeof value.promptUrl === "string" ? value.promptUrl : defaults.promptUrl,
    taskUrl: typeof value.taskUrl === "string" ? value.taskUrl : defaults.taskUrl,
  };
}

function normalizePersistedGenerationRecord(
  value: unknown,
): PersistedGenerationRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = value as PersistedGenerationCandidate;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.prompt !== "string" ||
    typeof candidate.style !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.modelUrl !== "string" ||
    typeof candidate.posterUrl !== "string" ||
    typeof candidate.createdAt !== "string" ||
    !isStyleTemplate(candidate.style) ||
    !isRecord(candidate.metadata)
  ) {
    return null;
  }

  const createdAtMs =
    typeof candidate.createdAtMs === "number" && Number.isFinite(candidate.createdAtMs)
      ? candidate.createdAtMs
      : Date.parse(candidate.createdAt);
  const safeCreatedAtMs = Number.isFinite(createdAtMs) ? createdAtMs : Date.now();
  const ar = isRecord(candidate.ar)
    ? {
        androidUrl:
          typeof candidate.ar.androidUrl === "string"
            ? candidate.ar.androidUrl
            : "",
        iosUrl: typeof candidate.ar.iosUrl === "string" ? candidate.ar.iosUrl : "",
      }
    : {
        androidUrl: "",
        iosUrl: "",
      };

  return {
    id: candidate.id,
    prompt: candidate.prompt,
    style: candidate.style,
    name: candidate.name,
    modelUrl: candidate.modelUrl,
    posterUrl: candidate.posterUrl,
    metadata: candidate.metadata as PersistedGenerationRecord["metadata"],
    ar,
    artifacts: normalizeArtifacts(candidate.id, candidate.artifacts),
    createdAt:
      typeof candidate.createdAt === "string" && candidate.createdAt
        ? candidate.createdAt
        : new Date(safeCreatedAtMs).toISOString(),
    createdAtMs: safeCreatedAtMs,
    sharePath:
      typeof candidate.sharePath === "string" && candidate.sharePath
        ? candidate.sharePath
        : `/share/${candidate.id}`,
    adapterKey: isGeneratorAdapterKey(candidate.adapterKey)
      ? candidate.adapterKey
      : "mock",
    adapterState: isRecord(candidate.adapterState) ? candidate.adapterState : {},
    generationMode: isGenerationMode(candidate.generationMode)
      ? candidate.generationMode
      : undefined,
    customizationProfile: isCustomizationProfile(candidate.customizationProfile)
      ? candidate.customizationProfile
      : undefined,
    llmConfig: normalizePersistedLlmConfig(candidate.llmConfig),
    customizations: isRecord(candidate.customizations)
      ? (candidate.customizations as PromptCustomizationRecipe)
      : undefined,
  };
}

export function getOutputDirectory(id: string) {
  return path.join(outputRoot, id);
}

export async function saveGenerationRecord(record: PersistedGenerationRecord) {
  const outputDirectory = getOutputDirectory(record.id);
  const taskManifest = buildGenerationTaskManifest(record);

  await mkdir(outputDirectory, { recursive: true });

  await Promise.all([
    writeFile(
      path.join(outputDirectory, "generation.json"),
      JSON.stringify(record, null, 2),
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, "metadata.json"),
      JSON.stringify(record.metadata, null, 2),
      "utf8",
    ),
    writeFile(path.join(outputDirectory, "prompt.txt"), `${record.prompt}\n`, "utf8"),
    writeFile(
      path.join(outputDirectory, "task.json"),
      JSON.stringify(taskManifest, null, 2),
      "utf8",
    ),
  ]);
}

export async function loadGenerationRecord(id: string) {
  try {
    const outputDirectory = getOutputDirectory(id);
    const generationFilePath = path.join(outputDirectory, "generation.json");
    const taskFilePath = path.join(outputDirectory, "task.json");
    const file = await readFile(generationFilePath, "utf8");
    const normalized = normalizePersistedGenerationRecord(JSON.parse(file));

    if (!normalized) {
      return null;
    }

    const pendingWrites: Array<Promise<void>> = [];
    const normalizedFile = JSON.stringify(normalized, null, 2);

    if (normalizedFile.trim() !== file.trim()) {
      pendingWrites.push(writeFile(generationFilePath, normalizedFile, "utf8"));
    }

    try {
      await access(taskFilePath);
    } catch {
      pendingWrites.push(
        writeFile(
          taskFilePath,
          JSON.stringify(buildGenerationTaskManifest(normalized), null, 2),
          "utf8",
        ),
      );
    }

    if (pendingWrites.length > 0) {
      await Promise.all(pendingWrites);
    }

    return normalized;
  } catch {
    return null;
  }
}

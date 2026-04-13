import "server-only";

import {
  buildGenerationTaskManifest,
  getArtifactsForId,
  resolveGenerationArEntryUrls,
} from "@/lib/generation-artifacts";
import { currentTemplateVersion } from "@/lib/fox-base-contract";
import {
  deriveFoxDisplayName,
  detectFoxThemeSlot,
  getFoxThemeDemoAssets,
  getFoxThemeLabel,
} from "@/lib/fox-theme-variants";
import { foxShowcaseGenerations } from "@/lib/fox-showcase-generations";
import {
  derivePromptCustomizationFallback,
  parsePromptCustomizationRecipe,
} from "@/lib/prompt-customization";

import {
  loadGenerationRecord,
  saveGenerationRecord,
} from "./generation-persistence";
import type {
  CreateGenerationInput,
  GenerationRecord,
  PersistedGenerationLlmConfig,
} from "./generation-types";
import {
  getActiveGeneratorAdapter,
  resolveAdapterStatus,
  syncAdapterRecord,
} from "./generator-adapters";
import { mockAdapter } from "./generator-adapters/mock-adapter";

let demoSeedPromise: Promise<void> | null = null;
const demoTemplateVersion = currentTemplateVersion;
const legacyGenerationAliases: Record<string, string> = {
  "petal-pony-demo": "fox-base-demo",
};

function sanitizePersistedLlmConfig(
  llmConfig: CreateGenerationInput["llmConfig"],
): PersistedGenerationLlmConfig | undefined {
  if (!llmConfig) {
    return undefined;
  }

  const sanitized = {
    ...(typeof llmConfig.provider === "string" ? { provider: llmConfig.provider } : {}),
    ...(typeof llmConfig.baseUrl === "string" && llmConfig.baseUrl.trim()
      ? { baseUrl: llmConfig.baseUrl.trim() }
      : {}),
    ...(typeof llmConfig.model === "string" && llmConfig.model.trim()
      ? { model: llmConfig.model.trim() }
      : {}),
  } satisfies PersistedGenerationLlmConfig;

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function resolveGenerationLookupId(id: string) {
  return legacyGenerationAliases[id] ?? id;
}

function getDemoSeedInput(
  seed: (typeof foxShowcaseGenerations)[number],
  createdAtMs: number,
) {
  const generationMode = "fast-stable" as const;

  return {
    id: seed.id,
    prompt: seed.prompt,
    style: seed.style,
    generationMode,
    customizationProfile: undefined,
    createdAtMs,
    customizations: derivePromptCustomizationFallback({
      prompt: seed.prompt,
      style: seed.style,
      generationMode,
    }),
  };
}

function mockRecordNeedsRefresh(
  record: Awaited<ReturnType<typeof loadGenerationRecord>>,
  seed: (typeof foxShowcaseGenerations)[number],
) {
  if (!record || record.adapterKey !== "mock") {
    return false;
  }

  const expectedThemeSlot = detectFoxThemeSlot(seed.prompt, seed.style);
  const expectedThemeLabel = getFoxThemeLabel(expectedThemeSlot);
  const expectedName = deriveFoxDisplayName(seed.prompt, seed.style);
  const expectedAssets = getFoxThemeDemoAssets(expectedThemeSlot);

  return (
    record.prompt !== seed.prompt ||
    record.style !== seed.style ||
    record.generationMode !== "fast-stable" ||
    !record.customizations ||
    record.name !== expectedName ||
    record.name.includes("小马") ||
    record.modelUrl !== expectedAssets.modelUrl ||
    record.posterUrl !== expectedAssets.posterUrl ||
    record.metadata.thumbnailPath.includes("/mock/") ||
    record.metadata.thumbnailPath !== expectedAssets.posterUrl ||
    !record.metadata.outputFiles.includes("model.usdz") ||
    record.metadata.generationMode !== "fast-stable" ||
    record.metadata.originalPrompt !== seed.prompt ||
    record.metadata.structuredPrompt.includes("小马") ||
    !record.metadata.structuredPrompt.includes(demoTemplateVersion) ||
    !record.metadata.structuredPrompt.includes(expectedThemeSlot) ||
    !record.metadata.structuredPrompt.includes(expectedThemeLabel)
  );
}

async function shouldRebuildDemoRecord(
  record: Awaited<ReturnType<typeof loadGenerationRecord>>,
  seed: (typeof foxShowcaseGenerations)[number],
) {
  if (!record) {
    return true;
  }

  if (record.adapterKey !== "mock") {
    return true;
  }

  const status = await resolveAdapterStatus(record);

  if (status !== "ready") {
    return true;
  }

  return mockRecordNeedsRefresh(record, seed);
}

async function buildDemoPersistedRecord(
  seed: (typeof foxShowcaseGenerations)[number],
  createdAtMs: number,
) {
  const demoInput = getDemoSeedInput(seed, createdAtMs);
  const built = await mockAdapter.create(demoInput);

  return {
    id: seed.id,
    prompt: seed.prompt,
    style: seed.style,
    name: built.name,
    modelUrl: built.modelUrl,
    posterUrl: built.posterUrl,
    metadata: built.metadata,
    ar: resolveGenerationArEntryUrls(seed.id, built.ar),
    artifacts: getArtifactsForId(seed.id),
    createdAt: new Date(createdAtMs).toISOString(),
    createdAtMs,
    sharePath: `/share/${seed.id}`,
    adapterKey: "mock" as const,
    adapterState: built.adapterState ?? {},
    generationMode: demoInput.generationMode,
    customizationProfile: demoInput.customizationProfile,
    customizations: demoInput.customizations,
  };
}

async function ensureDemoGenerationSeeded() {
  if (!demoSeedPromise) {
    demoSeedPromise = (async () => {
      for (const [index, seed] of foxShowcaseGenerations.entries()) {
        const existing = await loadGenerationRecord(seed.id);

        if (!(await shouldRebuildDemoRecord(existing, seed))) {
          continue;
        }

        const createdAtMs =
          existing?.createdAtMs ?? Date.now() - (12000 + index * 800);

        await saveGenerationRecord(
          await buildDemoPersistedRecord(seed, createdAtMs),
        );
      }
    })();
  }

  await demoSeedPromise;
}

function hydrateGenerationStatus(record: Awaited<ReturnType<typeof loadGenerationRecord>>) {
  if (!record) {
    return null;
  }

  return resolveAdapterStatus(record);
}

async function getPersistedGenerationById(id: string) {
  await ensureDemoGenerationSeeded();
  const lookupId = resolveGenerationLookupId(id);
  const record = await loadGenerationRecord(lookupId);

  if (!record) {
    return null;
  }

  const synced = await syncAdapterRecord(record);

  if (synced.changed) {
    await saveGenerationRecord(synced.record);
  }

  return synced.record;
}

export async function createGeneration(
  input: CreateGenerationInput,
  forcedId?: string,
  forcedCreatedAtMs?: number,
) {
  const id = forcedId ?? crypto.randomUUID();
  const createdAtMs = forcedCreatedAtMs ?? Date.now();
  const activeAdapter = getActiveGeneratorAdapter();
  const customizations = await parsePromptCustomizationRecipe(input);
  const built = await activeAdapter.create({
    ...input,
    id,
    createdAtMs,
    customizations,
  });
  const resolvedAr = resolveGenerationArEntryUrls(id, built.ar);
  const persisted = {
    id,
    prompt: input.prompt,
    style: input.style,
    name: built.name,
    modelUrl: built.modelUrl,
    posterUrl: built.posterUrl,
    metadata: built.metadata,
    ar: resolvedAr,
    artifacts: getArtifactsForId(id),
    createdAt: new Date(createdAtMs).toISOString(),
    createdAtMs,
    sharePath: `/share/${id}`,
    adapterKey: activeAdapter.key,
    adapterState: built.adapterState ?? {},
    generationMode: input.generationMode,
    customizationProfile: input.customizationProfile,
    llmConfig: sanitizePersistedLlmConfig(input.llmConfig),
    customizations,
  } as const;

  await saveGenerationRecord(persisted);

  return {
    id,
    status: "queued" as const,
  };
}

export async function getGenerationById(id: string): Promise<GenerationRecord | null> {
  const record = await getPersistedGenerationById(id);

  if (!record) {
    return null;
  }

  const status = await hydrateGenerationStatus(record);

  if (!status) {
    return null;
  }

  return {
    id: record.id,
    prompt: record.prompt,
    style: record.style,
    name: record.name,
    status,
    modelUrl: record.modelUrl,
    posterUrl: record.posterUrl,
    metadata: record.metadata,
    ar: resolveGenerationArEntryUrls(record.id, record.ar),
    artifacts: record.artifacts,
    createdAt: record.createdAt,
    sharePath: record.sharePath,
  };
}

export async function getGenerationMetadataById(id: string) {
  const generation = await getGenerationById(id);

  return generation?.metadata ?? null;
}

export async function getGenerationPromptById(id: string) {
  const generation = await getGenerationById(id);

  return generation?.prompt ?? null;
}

export async function getGenerationTaskById(id: string) {
  const record = await getPersistedGenerationById(id);

  if (!record) {
    return null;
  }

  return buildGenerationTaskManifest(record);
}

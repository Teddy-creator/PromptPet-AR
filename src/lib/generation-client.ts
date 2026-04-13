import type {
  CreateGenerationInput,
  CustomizationProfile,
  GenerationRecord,
  GenerationStatus,
  GenerationMode,
  StyleTemplate,
} from "./generation-types";
import { buildGenerationRequestLlmConfig } from "./llm/client-config";

export type HomeStyleChoice = "cream" | "lowpoly" | "dream";
export type HomeModeChoice = "fast" | "dynamic";
export type HomeProfileChoice = "safe" | "experimental";

export type CreateGenerationDraft = {
  prompt: string;
  style: HomeStyleChoice;
  mode: HomeModeChoice;
  profile?: HomeProfileChoice;
  llmDraft?: unknown;
};

export type GenerationCreateResponse = {
  id: string;
  status: Extract<GenerationStatus, "queued">;
};

type FetchLike = typeof fetch;

const defaultGenerationClientError = "生成请求失败，请稍后再试。";

const styleChoiceMap: Record<HomeStyleChoice, StyleTemplate> = {
  cream: "cream-toy",
  lowpoly: "low-poly",
  dream: "dream-glow",
};

const modeChoiceMap: Record<HomeModeChoice, GenerationMode> = {
  fast: "fast-stable",
  dynamic: "dynamic-custom",
};

const profileChoiceMap: Record<HomeProfileChoice, CustomizationProfile> = {
  safe: "safe-overlay",
  experimental: "experimental-addon",
};

export function buildCreateGenerationPayload(
  input: CreateGenerationDraft,
): CreateGenerationInput {
  const llmConfig = buildGenerationRequestLlmConfig(input.llmDraft);
  const generationMode = modeChoiceMap[input.mode];

  return {
    prompt: input.prompt.trim(),
    style: styleChoiceMap[input.style],
    generationMode,
    ...(generationMode === "dynamic-custom"
      ? {
          customizationProfile: profileChoiceMap[input.profile ?? "safe"],
        }
      : {}),
    ...(llmConfig ? { llmConfig } : {}),
  };
}

export function shouldPollGeneration(status: GenerationStatus) {
  return status === "queued" || status === "rendering" || status === "exporting";
}

export function normalizeGenerationClientError(
  error: unknown,
  fallbackMessage = defaultGenerationClientError,
) {
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "object" && error !== null) {
    if ("error" in error && typeof error.error === "string" && error.error.trim()) {
      return error.error.trim();
    }

    if (
      "message" in error &&
      typeof error.message === "string" &&
      error.message.trim()
    ) {
      return error.message.trim();
    }
  }

  return fallbackMessage;
}

async function readGenerationClientError(
  response: Response,
  fallbackMessage: string,
) {
  try {
    return normalizeGenerationClientError(await response.json(), fallbackMessage);
  } catch {
    try {
      const text = await response.text();
      return normalizeGenerationClientError(text, fallbackMessage);
    } catch {
      return fallbackMessage;
    }
  }
}

export async function createGenerationRequest(
  input: CreateGenerationDraft,
  fetchImpl: FetchLike = fetch,
) {
  const response = await fetchImpl("/api/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildCreateGenerationPayload(input)),
  });

  if (!response.ok) {
    throw new Error(await readGenerationClientError(response, defaultGenerationClientError));
  }

  return (await response.json()) as GenerationCreateResponse;
}

export async function getGenerationRequest(
  id: string,
  fetchImpl: FetchLike = fetch,
) {
  const response = await fetchImpl(`/api/generations/${encodeURIComponent(id)}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      await readGenerationClientError(response, "读取生成结果失败，请稍后再试。"),
    );
  }

  return (await response.json()) as GenerationRecord;
}

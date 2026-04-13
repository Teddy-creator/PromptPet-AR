import type { GenerationLlmConfig } from "../generation-types";
import type { LlmProvider } from "./provider-types";

const deepSeekBaseUrlPattern = /^https:\/\/api\.deepseek\.com(?:\/v1)?$/i;

type ClientEnv = Record<string, string | undefined>;

export type ClientLlmProviderChoice = LlmProvider | "";

export type ClientLlmDraft = {
  provider: ClientLlmProviderChoice;
  baseUrl: string;
  model: string;
  apiKey: string;
};

export type StoredClientLlmDraft = Partial<ClientLlmDraft>;

export const clientLlmStorageKey = "promptpet.home.llm-config";

export const clientLlmProviderOptions = ["deepseek", "openai"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeClientText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeClientProvider(value: unknown): ClientLlmProviderChoice {
  return value === "openai" || value === "deepseek" ? value : "";
}

export function normalizeClientBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export function inferClientProviderFromBaseUrl(baseUrl: string): LlmProvider {
  return deepSeekBaseUrlPattern.test(normalizeClientBaseUrl(baseUrl))
    ? "deepseek"
    : "openai";
}

export function coerceClientLlmDraft(value: unknown): ClientLlmDraft {
  if (!isRecord(value)) {
    return {
      provider: "",
      baseUrl: "",
      model: "",
      apiKey: "",
    };
  }

  const baseUrlRaw = normalizeClientText(value.baseUrl);
  const baseUrl = baseUrlRaw ? normalizeClientBaseUrl(baseUrlRaw) : "";
  const explicitProvider = normalizeClientProvider(value.provider);

  return {
    provider: baseUrl ? inferClientProviderFromBaseUrl(baseUrl) : explicitProvider,
    baseUrl,
    model: normalizeClientText(value.model),
    apiKey: normalizeClientText(value.apiKey),
  };
}

export function getClientLlmEnvDefaults(env: ClientEnv = process.env): ClientLlmDraft {
  return coerceClientLlmDraft({
    provider: env.NEXT_PUBLIC_DEFAULT_LLM_PROVIDER,
    baseUrl: env.NEXT_PUBLIC_DEFAULT_LLM_BASE_URL,
    model: env.NEXT_PUBLIC_DEFAULT_LLM_MODEL,
  });
}

export function buildInitialClientLlmDraft(options?: {
  envDefaults?: ClientLlmDraft;
  storedDraft?: unknown;
}): ClientLlmDraft {
  const envDefaults = options?.envDefaults
    ? coerceClientLlmDraft(options.envDefaults)
    : getClientLlmEnvDefaults();
  const storedDraft = coerceClientLlmDraft(options?.storedDraft);

  return coerceClientLlmDraft({
    provider: storedDraft.provider || envDefaults.provider,
    baseUrl: storedDraft.baseUrl || envDefaults.baseUrl,
    model: storedDraft.model || envDefaults.model,
    apiKey: storedDraft.apiKey,
  });
}

export function buildGenerationRequestLlmConfig(
  value: unknown,
): GenerationLlmConfig | undefined {
  const draft = coerceClientLlmDraft(value);
  const llmConfig = {
    ...(draft.provider ? { provider: draft.provider } : {}),
    ...(draft.baseUrl ? { baseUrl: draft.baseUrl } : {}),
    ...(draft.model ? { model: draft.model } : {}),
    ...(draft.apiKey ? { apiKey: draft.apiKey } : {}),
  } satisfies GenerationLlmConfig;

  return Object.keys(llmConfig).length > 0 ? llmConfig : undefined;
}

export function serializeClientLlmDraft(
  value: unknown,
): StoredClientLlmDraft | undefined {
  const llmConfig = buildGenerationRequestLlmConfig(value);

  if (!llmConfig) {
    return undefined;
  }

  return {
    ...(llmConfig.provider ? { provider: llmConfig.provider } : {}),
    ...(llmConfig.baseUrl ? { baseUrl: llmConfig.baseUrl } : {}),
    ...(llmConfig.model ? { model: llmConfig.model } : {}),
    ...(llmConfig.apiKey ? { apiKey: llmConfig.apiKey } : {}),
  };
}

import {
  inferAiProviderFromBaseUrl,
  normalizeProviderBaseUrl,
} from "./llm-provider-routing.mjs";

/**
 * @typedef {Record<string, string | undefined>} EnvShape
 */

/**
 * @typedef {{
 *   provider: "openai" | "deepseek";
 *   apiKey: string;
 *   baseUrl: string;
 *   model: string;
 *   source: string;
 * }} SmokeResolvedLlmConfig
 */

/**
 * @typedef {{
 *   provider: "openai" | "deepseek";
 *   baseUrl: string;
 *   model: string;
 * }} SmokePersistedLlmConfig
 */

/**
 * @param {EnvShape | undefined | null} env
 * @param {string} key
 */
function readEnvValue(env, key) {
  const value = env?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const smokeConfigCandidates = [
  {
    source: "PROMPTPET_SMOKE_LLM_*",
    providerKey: "PROMPTPET_SMOKE_LLM_PROVIDER",
    apiKeyKey: "PROMPTPET_SMOKE_LLM_API_KEY",
    baseUrlKey: "PROMPTPET_SMOKE_LLM_BASE_URL",
    modelKey: "PROMPTPET_SMOKE_LLM_MODEL",
  },
  {
    source: "LLM_*",
    providerKey: null,
    apiKeyKey: "LLM_API_KEY",
    baseUrlKey: "LLM_BASE_URL",
    modelKey: "LLM_MODEL",
  },
  {
    source: "OPENAI_COMPAT_*",
    providerKey: null,
    apiKeyKey: "OPENAI_COMPAT_API_KEY",
    baseUrlKey: "OPENAI_COMPAT_BASE_URL",
    modelKey: "OPENAI_COMPAT_MODEL",
    fallbackProvider: "openai",
  },
  {
    source: "OPENAI_*",
    providerKey: null,
    apiKeyKey: "OPENAI_API_KEY",
    baseUrlKey: "OPENAI_BASE_URL",
    modelKey: "OPENAI_MODEL",
    fallbackProvider: "openai",
  },
];

/**
 * @param {{
 *   source: string;
 *   providerKey: string | null;
 *   apiKeyKey: string;
 *   baseUrlKey: string;
 *   modelKey: string;
 *   fallbackProvider?: "openai" | "deepseek";
 * }} candidate
 * @param {EnvShape} env
 * @returns {SmokeResolvedLlmConfig | null}
 */
function buildCandidateConfig(candidate, env) {
  const apiKey = readEnvValue(env, candidate.apiKeyKey);
  const baseUrl = readEnvValue(env, candidate.baseUrlKey);
  const model = readEnvValue(env, candidate.modelKey);

  if (!apiKey || !baseUrl || !model) {
    return null;
  }

  const normalizedBaseUrl = normalizeProviderBaseUrl(baseUrl);
  const explicitProvider = candidate.providerKey
    ? readEnvValue(env, candidate.providerKey)
    : null;
  const provider =
    explicitProvider === "openai" || explicitProvider === "deepseek"
      ? explicitProvider
      : candidate.fallbackProvider ?? inferAiProviderFromBaseUrl(normalizedBaseUrl);

  return {
    provider,
    apiKey,
    baseUrl: normalizedBaseUrl,
    model,
    source: candidate.source,
  };
}

/**
 * @param {EnvShape} [env=process.env]
 * @returns {SmokeResolvedLlmConfig}
 */
export function resolveSmokeLlmConfig(env = process.env) {
  const allowDeepSeek = env.PROMPTPET_SMOKE_ALLOW_DEEPSEEK === "1";

  for (const candidate of smokeConfigCandidates) {
    const resolved = buildCandidateConfig(candidate, env);

    if (!resolved) {
      continue;
    }

    if (resolved.provider === "deepseek" && !allowDeepSeek) {
      continue;
    }

    return resolved;
  }

  throw new Error(
    allowDeepSeek
      ? "未找到可用的 smoke LLM 配置。请设置 PROMPTPET_SMOKE_LLM_*、LLM_*、OPENAI_COMPAT_* 或 OPENAI_*。"
      : "未找到 OpenAI-compatible 的 smoke LLM 配置。请设置 PROMPTPET_SMOKE_LLM_*、LLM_*、OPENAI_COMPAT_* 或 OPENAI_*；当前不会再默认掉回 DeepSeek。",
  );
}

/**
 * @param {EnvShape} [baseEnv=process.env]
 * @param {SmokeResolvedLlmConfig | null | undefined} llmConfig
 * @returns {EnvShape}
 */
export function buildSmokeManagedChildEnv(baseEnv = process.env, llmConfig) {
  if (!llmConfig || typeof llmConfig !== "object") {
    return { ...baseEnv };
  }

  const nextEnv = {
    ...baseEnv,
    LLM_API_KEY: llmConfig.apiKey,
    LLM_BASE_URL: llmConfig.baseUrl,
    LLM_MODEL: llmConfig.model,
    SEMANTIC_API_KEY: llmConfig.apiKey,
    SEMANTIC_BASE_URL: llmConfig.baseUrl,
    SEMANTIC_MODEL: llmConfig.model,
    DESIGN_API_KEY: llmConfig.apiKey,
    DESIGN_BASE_URL: llmConfig.baseUrl,
    DESIGN_MODEL: llmConfig.model,
    VISION_API_KEY: llmConfig.apiKey,
    VISION_BASE_URL: llmConfig.baseUrl,
    VISION_MODEL: llmConfig.model,
  };

  if (llmConfig.provider === "openai") {
    nextEnv.OPENAI_API_KEY = llmConfig.apiKey;
    nextEnv.OPENAI_BASE_URL = llmConfig.baseUrl;
    nextEnv.OPENAI_MODEL = llmConfig.model;
    nextEnv.OPENAI_CUSTOMIZATION_BASE_URL = llmConfig.baseUrl;
    nextEnv.OPENAI_CUSTOMIZATION_MODEL = llmConfig.model;
    nextEnv.DEEPSEEK_API_KEY = "";
    nextEnv.DEEPSEEK_BASE_URL = "";
    nextEnv.DEEPSEEK_MODEL = "";
  } else {
    nextEnv.DEEPSEEK_API_KEY = llmConfig.apiKey;
    nextEnv.DEEPSEEK_BASE_URL = llmConfig.baseUrl;
    nextEnv.DEEPSEEK_MODEL = llmConfig.model;
    nextEnv.OPENAI_API_KEY = "";
    nextEnv.OPENAI_BASE_URL = "";
    nextEnv.OPENAI_MODEL = "";
    nextEnv.OPENAI_CUSTOMIZATION_BASE_URL = "";
    nextEnv.OPENAI_CUSTOMIZATION_MODEL = "";
  }

  return nextEnv;
}

/**
 * @param {SmokeResolvedLlmConfig | null | undefined} llmConfig
 * @returns {SmokePersistedLlmConfig | undefined}
 */
export function buildSmokePersistedLlmConfig(llmConfig) {
  if (!llmConfig || typeof llmConfig !== "object") {
    return undefined;
  }

  return {
    provider: llmConfig.provider,
    baseUrl: llmConfig.baseUrl,
    model: llmConfig.model,
  };
}

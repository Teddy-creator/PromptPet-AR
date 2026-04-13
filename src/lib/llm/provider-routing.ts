import { execFileSync } from "node:child_process";

import type {
  LlmCredentialSource,
  LlmProvider,
  LlmProviderConfig,
  LlmRequestConfig,
  LlmRole,
  ResolvedLlmCredential,
} from "./provider-types";

const openAiBaseUrlPattern = /^https:\/\/api\.openai\.com\/v1$/i;
const deepSeekBaseUrlPattern = /^https:\/\/api\.deepseek\.com(?:\/v1)?$/i;

const cachedKeychainCredentials = new Map<string, ResolvedLlmCredential | null>();
const roleApiKeyEnvNames: Record<LlmRole, Extract<LlmCredentialSource, `${string}_API_KEY`>> = {
  semantic: "SEMANTIC_API_KEY",
  design: "DESIGN_API_KEY",
  vision: "VISION_API_KEY",
};
const roleBaseUrlEnvNames: Record<LlmRole, `${string}_BASE_URL`> = {
  semantic: "SEMANTIC_BASE_URL",
  design: "DESIGN_BASE_URL",
  vision: "VISION_BASE_URL",
};
const roleProviderEnvNames: Record<LlmRole, `${string}_PROVIDER`> = {
  semantic: "SEMANTIC_PROVIDER",
  design: "DESIGN_PROVIDER",
  vision: "VISION_PROVIDER",
};
const roleModelEnvNames: Record<LlmRole, `${string}_MODEL`> = {
  semantic: "SEMANTIC_MODEL",
  design: "DESIGN_MODEL",
  vision: "VISION_MODEL",
};

type RoutingEnv = Record<string, string | undefined>;

function readEnvValue(env: RoutingEnv, key: string) {
  const value = env[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeProvider(provider: string | null | undefined): LlmProvider | null {
  return provider === "openai" || provider === "deepseek" ? provider : null;
}

function inferProviderHintFromBaseUrl(baseUrl: string | null) {
  return baseUrl ? inferAiProviderFromBaseUrl(baseUrl) : null;
}

function isProviderCompatible(
  targetProvider: LlmProvider | null,
  candidateProvider: LlmProvider | null,
) {
  return !targetProvider || !candidateProvider || targetProvider === candidateProvider;
}

function getRoleProviderHint(role: LlmRole, env: RoutingEnv) {
  return (
    normalizeProvider(readEnvValue(env, roleProviderEnvNames[role])) ??
    inferProviderHintFromBaseUrl(readEnvValue(env, roleBaseUrlEnvNames[role]))
  );
}

function getSharedProviderHint(env: RoutingEnv) {
  return (
    normalizeProvider(readEnvValue(env, "LLM_PROVIDER")) ??
    inferProviderHintFromBaseUrl(readEnvValue(env, "LLM_BASE_URL"))
  );
}

function resolveRequestedProvider(role: LlmRole, env: RoutingEnv) {
  const roleProviderHint = getRoleProviderHint(role, env);

  if (roleProviderHint) {
    return roleProviderHint;
  }

  const sharedProviderHint = getSharedProviderHint(env);

  if (sharedProviderHint) {
    return sharedProviderHint;
  }

  if (readEnvValue(env, "OPENAI_COMPAT_API_KEY")) {
    return "openai";
  }

  const openAiKey = readEnvValue(env, "OPENAI_API_KEY");
  const deepSeekKey = readEnvValue(env, "DEEPSEEK_API_KEY");

  if (openAiKey && !deepSeekKey) {
    return "openai";
  }

  if (deepSeekKey) {
    return "deepseek";
  }

  if (openAiKey) {
    return "openai";
  }

  return null;
}

function getCredentialSourceOrder(
  role: LlmRole,
  env: RoutingEnv,
  requestedProvider: LlmProvider | null,
): LlmCredentialSource[] {
  const roleApiKey = roleApiKeyEnvNames[role];
  const roleProviderHint = getRoleProviderHint(role, env);
  const sharedProviderHint = getSharedProviderHint(env);
  const sources: LlmCredentialSource[] = [];

  const pushSource = (source: LlmCredentialSource) => {
    if (!sources.includes(source)) {
      sources.push(source);
    }
  };

  if (requestedProvider === "openai") {
    if (roleProviderHint !== "deepseek") {
      pushSource(roleApiKey);
    }

    if (sharedProviderHint === "openai") {
      pushSource("LLM_API_KEY");
    }

    pushSource("OPENAI_COMPAT_API_KEY");
    pushSource("OPENAI_API_KEY");

    if (sharedProviderHint === null) {
      pushSource("LLM_API_KEY");
    }

    return sources;
  }

  if (requestedProvider === "deepseek") {
    if (roleProviderHint !== "openai") {
      pushSource(roleApiKey);
    }

    if (sharedProviderHint === "deepseek") {
      pushSource("LLM_API_KEY");
    }

    pushSource("DEEPSEEK_API_KEY");

    if (sharedProviderHint === null) {
      pushSource("LLM_API_KEY");
    }

    return sources;
  }

  pushSource(roleApiKey);
  pushSource("LLM_API_KEY");
  pushSource("OPENAI_COMPAT_API_KEY");
  pushSource("DEEPSEEK_API_KEY");
  pushSource("OPENAI_API_KEY");

  return sources;
}

export function applyLlmRequestConfigToEnv(
  env: RoutingEnv,
  llmConfig?: LlmRequestConfig | null,
): RoutingEnv {
  if (!llmConfig) {
    return env;
  }

  const nextEnv = { ...env };
  const baseUrl =
    typeof llmConfig.baseUrl === "string" && llmConfig.baseUrl.trim()
      ? normalizeProviderBaseUrl(llmConfig.baseUrl.trim())
      : null;
  const requestedProvider =
    inferProviderHintFromBaseUrl(baseUrl) ?? normalizeProvider(llmConfig.provider);
  const model =
    typeof llmConfig.model === "string" && llmConfig.model.trim()
      ? llmConfig.model.trim()
      : null;
  const apiKey =
    typeof llmConfig.apiKey === "string" && llmConfig.apiKey.trim()
      ? llmConfig.apiKey.trim()
      : null;

  if (apiKey) {
    nextEnv.LLM_API_KEY = apiKey;
  }

  if (requestedProvider) {
    nextEnv.LLM_PROVIDER = requestedProvider;
  }

  if (baseUrl) {
    nextEnv.LLM_BASE_URL = baseUrl;
  } else if (requestedProvider === "deepseek") {
    nextEnv.LLM_BASE_URL = normalizeProviderBaseUrl(
      env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    );
  } else if (requestedProvider === "openai") {
    nextEnv.LLM_BASE_URL = normalizeProviderBaseUrl(
      env.OPENAI_COMPAT_BASE_URL ??
        env.OPENAI_CUSTOMIZATION_BASE_URL ??
        env.OPENAI_BASE_URL ??
        "https://api.openai.com/v1",
    );
  }

  if (model) {
    nextEnv.LLM_MODEL = model;
  }

  return nextEnv;
}

function getOpenAiCompatBaseUrl(env: RoutingEnv) {
  return (
    readEnvValue(env, "OPENAI_COMPAT_BASE_URL") ??
    readEnvValue(env, "OPENAI_CUSTOMIZATION_BASE_URL") ??
    readEnvValue(env, "OPENAI_BASE_URL")
  );
}

function getOpenAiStandardBaseUrl(env: RoutingEnv) {
  return (
    readEnvValue(env, "OPENAI_BASE_URL") ??
    readEnvValue(env, "OPENAI_COMPAT_BASE_URL") ??
    readEnvValue(env, "OPENAI_CUSTOMIZATION_BASE_URL")
  );
}

function getOpenAiCompatModel(env: RoutingEnv) {
  return (
    readEnvValue(env, "OPENAI_COMPAT_MODEL") ??
    readEnvValue(env, "OPENAI_CUSTOMIZATION_MODEL") ??
    readEnvValue(env, "OPENAI_MODEL") ??
    "gpt-4.1-mini"
  );
}

function getOpenAiStandardModel(env: RoutingEnv) {
  return (
    readEnvValue(env, "OPENAI_MODEL") ??
    readEnvValue(env, "OPENAI_COMPAT_MODEL") ??
    readEnvValue(env, "OPENAI_CUSTOMIZATION_MODEL") ??
    "gpt-4.1-mini"
  );
}

export function normalizeProviderBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export function inferAiProviderFromBaseUrl(baseUrl: string): LlmProvider {
  const normalizedBaseUrl = normalizeProviderBaseUrl(baseUrl);

  if (deepSeekBaseUrlPattern.test(normalizedBaseUrl)) {
    return "deepseek";
  }

  return "openai";
}

export function getAiProviderLabel(provider: LlmProvider) {
  return provider === "deepseek" ? "DeepSeek" : "OpenAI";
}

export function shouldUseResponsesApi(
  config: Pick<LlmProviderConfig, "baseUrl" | "provider"> | null | undefined,
) {
  const baseUrl =
    typeof config?.baseUrl === "string"
      ? normalizeProviderBaseUrl(config.baseUrl)
      : "";
  const provider =
    config?.provider ?? (baseUrl ? inferAiProviderFromBaseUrl(baseUrl) : "openai");

  return provider === "openai" && openAiBaseUrlPattern.test(baseUrl);
}

function readKeychainCredential(
  role: LlmRole,
  env: RoutingEnv,
  requestedProvider: LlmProvider | null,
) {
  const cacheKey = `${role}:${requestedProvider ?? "auto"}` as const;

  if (cachedKeychainCredentials.has(cacheKey)) {
    return cachedKeychainCredentials.get(cacheKey) ?? null;
  }

  if (process.platform !== "darwin") {
    cachedKeychainCredentials.set(cacheKey, null);
    return null;
  }

  const currentUser = env.USER;
  const sources = getCredentialSourceOrder(role, env, requestedProvider);

  try {
    for (const source of sources) {
      const candidates = [
        currentUser
          ? ["find-generic-password", "-a", currentUser, "-s", source, "-w"]
          : null,
        ["find-generic-password", "-s", source, "-w"],
      ].filter((value): value is string[] => Array.isArray(value));

      for (const args of candidates) {
        try {
          const value = execFileSync("security", args, {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            timeout: 2000,
          }).trim();

          if (value) {
            const resolved = {
              apiKey: value,
              source,
            } satisfies ResolvedLlmCredential;
            cachedKeychainCredentials.set(cacheKey, resolved);
            return resolved;
          }
        } catch {}
      }
    }
  } catch {}

  cachedKeychainCredentials.set(cacheKey, null);
  return null;
}

function resolveCredential(
  role: LlmRole,
  env: RoutingEnv,
  allowKeychain: boolean,
  requestedProvider: LlmProvider | null,
) {
  const roleApiKey = roleApiKeyEnvNames[role];
  const explicitCandidates = getCredentialSourceOrder(role, env, requestedProvider).map(
    (source) => ({
      source,
      apiKey: source === roleApiKey ? env[roleApiKey] : env[source],
    }),
  );

  for (const candidate of explicitCandidates) {
    if (typeof candidate.apiKey === "string" && candidate.apiKey.trim()) {
      return {
        apiKey: candidate.apiKey.trim(),
        source: candidate.source,
      } satisfies ResolvedLlmCredential;
    }
  }

  return allowKeychain ? readKeychainCredential(role, env, requestedProvider) : null;
}

function resolveBaseUrl(
  role: LlmRole,
  credential: ResolvedLlmCredential,
  env: RoutingEnv,
  requestedProvider: LlmProvider | null,
) {
  const roleBaseUrl = readEnvValue(env, roleBaseUrlEnvNames[role]);
  const sharedBaseUrl = readEnvValue(env, "LLM_BASE_URL");

  if (
    roleBaseUrl &&
    isProviderCompatible(requestedProvider, inferProviderHintFromBaseUrl(roleBaseUrl))
  ) {
    return normalizeProviderBaseUrl(roleBaseUrl);
  }

  if (
    sharedBaseUrl &&
    isProviderCompatible(requestedProvider, inferProviderHintFromBaseUrl(sharedBaseUrl))
  ) {
    return normalizeProviderBaseUrl(sharedBaseUrl);
  }

  if (credential.source === "DEEPSEEK_API_KEY") {
    return normalizeProviderBaseUrl(
      env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    );
  }

  if (credential.source === "OPENAI_COMPAT_API_KEY") {
    return normalizeProviderBaseUrl(
      getOpenAiCompatBaseUrl(env) ?? "https://api.openai.com/v1",
    );
  }

  if (credential.source === "OPENAI_API_KEY") {
    return normalizeProviderBaseUrl(
      getOpenAiStandardBaseUrl(env) ??
        getOpenAiCompatBaseUrl(env) ??
        "https://api.openai.com/v1",
    );
  }

  if (requestedProvider === "openai") {
    return normalizeProviderBaseUrl(
      getOpenAiCompatBaseUrl(env) ??
        getOpenAiStandardBaseUrl(env) ??
        "https://api.openai.com/v1",
    );
  }

  if (requestedProvider === "deepseek") {
    return normalizeProviderBaseUrl(
      env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    );
  }

  if (env.DEEPSEEK_BASE_URL) {
    return normalizeProviderBaseUrl(env.DEEPSEEK_BASE_URL);
  }

  if (getOpenAiCompatBaseUrl(env)) {
    return normalizeProviderBaseUrl(getOpenAiCompatBaseUrl(env)!);
  }

  return "https://api.deepseek.com";
}

function resolveModel(
  role: LlmRole,
  provider: LlmProvider,
  credential: ResolvedLlmCredential,
  env: RoutingEnv,
  requestedProvider: LlmProvider | null,
) {
  const roleModel = readEnvValue(env, roleModelEnvNames[role]);
  const sharedModel = readEnvValue(env, "LLM_MODEL");

  if (roleModel && isProviderCompatible(requestedProvider, getRoleProviderHint(role, env))) {
    return roleModel;
  }

  if (sharedModel && isProviderCompatible(requestedProvider, getSharedProviderHint(env))) {
    return sharedModel;
  }

  if (provider === "deepseek") {
    return env.DEEPSEEK_MODEL ?? "deepseek-chat";
  }

  if (credential.source === "OPENAI_API_KEY") {
    return getOpenAiStandardModel(env);
  }

  return getOpenAiCompatModel(env);
}

export function resolveLlmProviderConfig(
  role: LlmRole,
  options?: {
    env?: RoutingEnv;
    allowKeychain?: boolean;
  },
): LlmProviderConfig | null {
  const env = options?.env ?? process.env;
  const allowKeychain = options?.allowKeychain !== false;
  const requestedProvider = resolveRequestedProvider(role, env);
  const credential = resolveCredential(role, env, allowKeychain, requestedProvider);

  if (!credential) {
    return null;
  }

  const baseUrl = resolveBaseUrl(role, credential, env, requestedProvider);
  const provider = inferAiProviderFromBaseUrl(baseUrl);

  return {
    role,
    provider,
    apiKey: credential.apiKey,
    baseUrl,
    model: resolveModel(role, provider, credential, env, requestedProvider),
    credentialSource: credential.source,
  };
}

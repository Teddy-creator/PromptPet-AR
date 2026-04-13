import assert from "node:assert/strict";

import {
  applyLlmRequestConfigToEnv,
  resolveLlmProviderConfig,
  shouldUseResponsesApi,
} from "../src/lib/llm/provider-routing";

function main() {
  const semanticConfig = resolveLlmProviderConfig("semantic", {
    allowKeychain: false,
    env: {
      SEMANTIC_API_KEY: "semantic-key",
      SEMANTIC_BASE_URL: "https://api.openai.com/v1",
      SEMANTIC_MODEL: "gpt-4.1-mini",
      LLM_API_KEY: "shared-key",
      LLM_BASE_URL: "https://api.deepseek.com",
      LLM_MODEL: "deepseek-chat",
    },
  });

  assert.ok(semanticConfig, "semantic config should resolve");
  assert.equal(semanticConfig.provider, "openai");
  assert.equal(semanticConfig.apiKey, "semantic-key");
  assert.equal(semanticConfig.baseUrl, "https://api.openai.com/v1");
  assert.equal(semanticConfig.model, "gpt-4.1-mini");
  assert.equal(semanticConfig.credentialSource, "SEMANTIC_API_KEY");
  assert.equal(shouldUseResponsesApi(semanticConfig), true);

  const designConfig = resolveLlmProviderConfig("design", {
    allowKeychain: false,
    env: {
      LLM_API_KEY: "shared-key",
      LLM_BASE_URL: "https://api.deepseek.com",
      LLM_MODEL: "deepseek-chat",
    },
  });

  assert.ok(designConfig, "design config should resolve");
  assert.equal(designConfig.provider, "deepseek");
  assert.equal(designConfig.apiKey, "shared-key");
  assert.equal(designConfig.baseUrl, "https://api.deepseek.com");
  assert.equal(designConfig.model, "deepseek-chat");
  assert.equal(designConfig.credentialSource, "LLM_API_KEY");
  assert.equal(shouldUseResponsesApi(designConfig), false);

  const visionConfig = resolveLlmProviderConfig("vision", {
    allowKeychain: false,
    env: {
      VISION_API_KEY: "vision-key",
      VISION_BASE_URL: "https://api.xcode.best/v1",
      VISION_MODEL: "gpt-5.2",
    },
  });

  assert.ok(visionConfig, "vision config should resolve");
  assert.equal(visionConfig.provider, "openai");
  assert.equal(visionConfig.apiKey, "vision-key");
  assert.equal(visionConfig.baseUrl, "https://api.xcode.best/v1");
  assert.equal(visionConfig.model, "gpt-5.2");
  assert.equal(visionConfig.credentialSource, "VISION_API_KEY");
  assert.equal(shouldUseResponsesApi(visionConfig), false);

  const providerSpecificFallback = resolveLlmProviderConfig("semantic", {
    allowKeychain: false,
    env: {
      DEEPSEEK_API_KEY: "deepseek-key",
      DEEPSEEK_MODEL: "deepseek-reasoner",
    },
  });

  assert.ok(providerSpecificFallback, "provider-specific fallback should resolve");
  assert.equal(providerSpecificFallback.provider, "deepseek");
  assert.equal(providerSpecificFallback.apiKey, "deepseek-key");
  assert.equal(providerSpecificFallback.baseUrl, "https://api.deepseek.com");
  assert.equal(providerSpecificFallback.model, "deepseek-reasoner");
  assert.equal(providerSpecificFallback.credentialSource, "DEEPSEEK_API_KEY");

  const compatFallback = resolveLlmProviderConfig("semantic", {
    allowKeychain: false,
    env: {
      OPENAI_COMPAT_API_KEY: "compat-key",
      OPENAI_COMPAT_BASE_URL: "https://api.xcode.best/v1",
      OPENAI_COMPAT_MODEL: "gpt-5.4",
      DEEPSEEK_API_KEY: "deepseek-key",
      DEEPSEEK_MODEL: "deepseek-chat",
    },
  });

  assert.ok(compatFallback, "compat fallback should resolve");
  assert.equal(compatFallback.provider, "openai");
  assert.equal(compatFallback.apiKey, "compat-key");
  assert.equal(compatFallback.baseUrl, "https://api.xcode.best/v1");
  assert.equal(compatFallback.model, "gpt-5.4");
  assert.equal(compatFallback.credentialSource, "OPENAI_COMPAT_API_KEY");

  const requestScopedEnv = applyLlmRequestConfigToEnv(
    {
      LLM_API_KEY: "shared-key",
      LLM_BASE_URL: "https://api.deepseek.com",
      LLM_MODEL: "deepseek-chat",
    },
    {
      provider: "openai",
      baseUrl: "https://api.xcode.best/v1",
      model: "gpt-5.4",
    },
  );

  const requestScopedConfig = resolveLlmProviderConfig("semantic", {
    allowKeychain: false,
    env: requestScopedEnv,
  });

  assert.ok(requestScopedConfig, "request-scoped config should resolve");
  assert.equal(requestScopedConfig.provider, "openai");
  assert.equal(requestScopedConfig.baseUrl, "https://api.xcode.best/v1");
  assert.equal(requestScopedConfig.model, "gpt-5.4");
  assert.equal(requestScopedConfig.apiKey, "shared-key");
  assert.equal(shouldUseResponsesApi(requestScopedConfig), false);

  assert.equal(requestScopedEnv.LLM_PROVIDER, "openai");

  const dirtyOpenAiEnv = applyLlmRequestConfigToEnv(
    {
      DEEPSEEK_API_KEY: "deepseek-key",
      OPENAI_COMPAT_API_KEY: "compat-key",
      OPENAI_COMPAT_BASE_URL: "https://api.xcode.best/v1",
      OPENAI_COMPAT_MODEL: "gpt-5.4",
    },
    {
      provider: "openai",
      baseUrl: "https://api.xcode.best/v1",
      model: "gpt-5.4",
    },
  );
  const dirtyOpenAiConfig = resolveLlmProviderConfig("semantic", {
    allowKeychain: false,
    env: dirtyOpenAiEnv,
  });

  assert.ok(dirtyOpenAiConfig, "dirty openai request should resolve");
  assert.equal(dirtyOpenAiConfig.provider, "openai");
  assert.equal(dirtyOpenAiConfig.apiKey, "compat-key");
  assert.equal(dirtyOpenAiConfig.baseUrl, "https://api.xcode.best/v1");
  assert.equal(dirtyOpenAiConfig.model, "gpt-5.4");
  assert.equal(dirtyOpenAiConfig.credentialSource, "OPENAI_COMPAT_API_KEY");

  const missingOpenAiCredential = resolveLlmProviderConfig("semantic", {
    allowKeychain: false,
    env: applyLlmRequestConfigToEnv(
      {
        DEEPSEEK_API_KEY: "deepseek-key",
      },
      {
        provider: "openai",
        baseUrl: "https://api.xcode.best/v1",
        model: "gpt-5.4",
      },
    ),
  });

  assert.equal(
    missingOpenAiCredential,
    null,
    "openai request should not silently fall back to deepseek credentials",
  );

  const deepSeekScopedEnv = applyLlmRequestConfigToEnv(
    {
      OPENAI_COMPAT_API_KEY: "compat-key",
      OPENAI_COMPAT_BASE_URL: "https://api.xcode.best/v1",
      OPENAI_COMPAT_MODEL: "gpt-5.4",
      DEEPSEEK_API_KEY: "deepseek-key",
      DEEPSEEK_MODEL: "deepseek-reasoner",
    },
    {
      provider: "deepseek",
    },
  );
  const deepSeekScopedConfig = resolveLlmProviderConfig("semantic", {
    allowKeychain: false,
    env: deepSeekScopedEnv,
  });

  assert.ok(deepSeekScopedConfig, "deepseek request should resolve");
  assert.equal(deepSeekScopedConfig.provider, "deepseek");
  assert.equal(deepSeekScopedConfig.apiKey, "deepseek-key");
  assert.equal(deepSeekScopedConfig.baseUrl, "https://api.deepseek.com");
  assert.equal(deepSeekScopedConfig.model, "deepseek-reasoner");
  assert.equal(deepSeekScopedConfig.credentialSource, "DEEPSEEK_API_KEY");

  const roleForcedDeepSeekEnv = applyLlmRequestConfigToEnv(
    {
      SEMANTIC_PROVIDER: "deepseek",
      SEMANTIC_API_KEY: "semantic-deepseek-key",
      SEMANTIC_BASE_URL: "https://api.deepseek.com",
      SEMANTIC_MODEL: "deepseek-chat",
      OPENAI_COMPAT_API_KEY: "compat-key",
      OPENAI_COMPAT_BASE_URL: "https://api.xcode.best/v1",
      OPENAI_COMPAT_MODEL: "gpt-5.4",
    },
    {
      provider: "openai",
      baseUrl: "https://api.xcode.best/v1",
      model: "gpt-5.4",
    },
  );
  const roleForcedDeepSeekConfig = resolveLlmProviderConfig("semantic", {
    allowKeychain: false,
    env: roleForcedDeepSeekEnv,
  });

  assert.ok(roleForcedDeepSeekConfig, "role-forced deepseek config should resolve");
  assert.equal(roleForcedDeepSeekConfig.provider, "deepseek");
  assert.equal(roleForcedDeepSeekConfig.apiKey, "semantic-deepseek-key");
  assert.equal(roleForcedDeepSeekConfig.baseUrl, "https://api.deepseek.com");
  assert.equal(roleForcedDeepSeekConfig.model, "deepseek-chat");
  assert.equal(roleForcedDeepSeekConfig.credentialSource, "SEMANTIC_API_KEY");

  console.log("LLM provider routing checks passed.");
}

main();

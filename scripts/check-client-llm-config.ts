import assert from "node:assert/strict";

import {
  buildGenerationRequestLlmConfig,
  buildInitialClientLlmDraft,
  getClientLlmEnvDefaults,
  serializeClientLlmDraft,
} from "../src/lib/llm/client-config";

function main() {
  const envDefaults = getClientLlmEnvDefaults({
    NEXT_PUBLIC_DEFAULT_LLM_PROVIDER: "deepseek",
    NEXT_PUBLIC_DEFAULT_LLM_BASE_URL: "https://api.deepseek.com/",
    NEXT_PUBLIC_DEFAULT_LLM_MODEL: " deepseek-chat ",
  });

  assert.deepEqual(envDefaults, {
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
    apiKey: "",
  });

  const initialDraft = buildInitialClientLlmDraft({
    envDefaults,
    storedDraft: {
      provider: "openai",
      baseUrl: " https://api.xcode.best/v1/ ",
      model: " gpt-5.4 ",
      apiKey: " sk-test ",
    },
  });

  assert.deepEqual(initialDraft, {
    provider: "openai",
    baseUrl: "https://api.xcode.best/v1",
    model: "gpt-5.4",
    apiKey: "sk-test",
  });

  assert.deepEqual(
    buildGenerationRequestLlmConfig({
      provider: "",
      baseUrl: " https://api.xcode.best/v1/ ",
      model: " gpt-5.4 ",
      apiKey: " sk-openai ",
    }),
    {
      provider: "openai",
      baseUrl: "https://api.xcode.best/v1",
      model: "gpt-5.4",
      apiKey: "sk-openai",
    },
  );

  assert.equal(
    buildGenerationRequestLlmConfig({
      provider: "",
      baseUrl: "  ",
      model: "",
      apiKey: "   ",
    }),
    undefined,
  );

  assert.deepEqual(
    serializeClientLlmDraft({
      provider: "deepseek",
      baseUrl: " https://api.deepseek.com/ ",
      model: " deepseek-chat ",
      apiKey: " secret-value ",
    }),
    {
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-chat",
      apiKey: "secret-value",
    },
  );

  assert.equal(
    serializeClientLlmDraft({
      provider: "",
      baseUrl: " ",
      model: "",
      apiKey: "",
    }),
    undefined,
  );

  console.log("client llm config check: ok");
}

main();

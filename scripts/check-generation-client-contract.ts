import assert from "node:assert/strict";

import {
  buildCreateGenerationPayload,
  normalizeGenerationClientError,
  shouldPollGeneration,
} from "../src/lib/generation-client";

function main() {
  assert.deepEqual(
    buildCreateGenerationPayload({
      prompt: "戴着小围巾在读书的狐狸",
      style: "cream",
      mode: "fast",
      profile: "safe",
      llmDraft: {
        provider: "",
        baseUrl: " ",
        model: "",
        apiKey: "   ",
      },
    }),
    {
      prompt: "戴着小围巾在读书的狐狸",
      style: "cream-toy",
      generationMode: "fast-stable",
    },
  );

  assert.deepEqual(
    buildCreateGenerationPayload({
      prompt: "胸前挂相机的狐狸桌宠",
      style: "dream",
      mode: "dynamic",
      profile: "experimental",
      llmDraft: {
        provider: "",
        baseUrl: " https://api.deepseek.com/ ",
        model: " deepseek-chat ",
        apiKey: " sk-test ",
      },
    }),
    {
      prompt: "胸前挂相机的狐狸桌宠",
      style: "dream-glow",
      generationMode: "dynamic-custom",
      customizationProfile: "experimental-addon",
      llmConfig: {
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com",
        model: "deepseek-chat",
        apiKey: "sk-test",
      },
    },
  );

  assert.equal(shouldPollGeneration("queued"), true);
  assert.equal(shouldPollGeneration("rendering"), true);
  assert.equal(shouldPollGeneration("exporting"), true);
  assert.equal(shouldPollGeneration("ready"), false);
  assert.equal(shouldPollGeneration("failed"), false);

  assert.equal(
    normalizeGenerationClientError(
      new Error("生成队列暂时拥挤，请稍后再试。"),
    ),
    "生成队列暂时拥挤，请稍后再试。",
  );

  assert.equal(
    normalizeGenerationClientError({
      error: "LLM provider 不在当前支持范围里。",
    }),
    "LLM provider 不在当前支持范围里。",
  );

  assert.equal(
    normalizeGenerationClientError({ unexpected: true }),
    "生成请求失败，请稍后再试。",
  );

  console.log("generation client contract check: ok");
}

main();

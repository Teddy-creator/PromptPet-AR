import {
  customizationProfiles,
  generationModes,
  type CreateGenerationInput,
  type CustomizationProfile,
  type GenerationLlmConfig,
  type GenerationMode,
} from "./generation-types";
import type { LlmProvider } from "./llm/provider-types";
import { isStyleTemplate } from "./style-templates";

function isGenerationMode(value: string): value is GenerationMode {
  return generationModes.includes(value as GenerationMode);
}

function isCustomizationProfile(value: string): value is CustomizationProfile {
  return customizationProfiles.includes(value as CustomizationProfile);
}

function isLlmProvider(value: string): value is LlmProvider {
  return value === "openai" || value === "deepseek";
}

function normalizeLlmConfig(value: unknown) {
  if (value == null) {
    return {
      ok: true as const,
      llmConfig: undefined,
    };
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      ok: false as const,
      error: "LLM 配置格式不正确。",
    };
  }

  const payload = value as Record<string, unknown>;
  const providerRaw =
    typeof payload.provider === "string" ? payload.provider.trim() : "";
  const baseUrlRaw =
    typeof payload.baseUrl === "string" ? payload.baseUrl.trim() : "";
  const modelRaw = typeof payload.model === "string" ? payload.model.trim() : "";
  const apiKeyRaw = typeof payload.apiKey === "string" ? payload.apiKey.trim() : "";

  if (providerRaw && !isLlmProvider(providerRaw)) {
    return {
      ok: false as const,
      error: "LLM provider 不在当前支持范围里。",
    };
  }

  const provider = isLlmProvider(providerRaw) ? providerRaw : undefined;

  if (baseUrlRaw) {
    try {
      const parsed = new URL(baseUrlRaw);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("unsupported protocol");
      }
    } catch {
      return {
        ok: false as const,
        error: "LLM base URL 不合法。",
      };
    }
  }

  const llmConfig: GenerationLlmConfig = {
    ...(provider ? { provider } : {}),
    ...(baseUrlRaw ? { baseUrl: baseUrlRaw } : {}),
    ...(modelRaw ? { model: modelRaw } : {}),
    ...(apiKeyRaw ? { apiKey: apiKeyRaw } : {}),
  };

  return {
    ok: true as const,
    llmConfig:
      Object.keys(llmConfig).length > 0
        ? llmConfig
        : undefined,
  };
}

export function validateGenerationInput(payload: Record<string, unknown>) {
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  const style = typeof payload.style === "string" ? payload.style : "";
  const generationModeRaw =
    typeof payload.generationMode === "string" ? payload.generationMode : "";
  const generationMode = generationModeRaw || "fast-stable";
  const customizationProfileRaw =
    typeof payload.customizationProfile === "string"
      ? payload.customizationProfile
      : "";
  const customizationProfile =
    generationMode === "dynamic-custom"
      ? customizationProfileRaw || "safe-overlay"
      : undefined;
  const normalizedLlmConfig = normalizeLlmConfig(payload.llmConfig);

  if (!normalizedLlmConfig.ok) {
    return {
      ok: false as const,
      status: 400,
      error: normalizedLlmConfig.error,
    };
  }

  if (!prompt) {
    return {
      ok: false as const,
      status: 400,
      error: "先写一句描述，我们才能开始召唤。",
    };
  }

  if (prompt.length < 8) {
    return {
      ok: false as const,
      status: 400,
      error: "这句描述还太短了，再多给一点画面感。",
    };
  }

  if (!isStyleTemplate(style)) {
    return {
      ok: false as const,
      status: 400,
      error: "风格模板不在当前首轮支持范围里。",
    };
  }

  if (!isGenerationMode(generationMode)) {
    return {
      ok: false as const,
      status: 400,
      error: "生成模式不在当前支持范围里。",
    };
  }

  if (
    typeof customizationProfile === "string" &&
    !isCustomizationProfile(customizationProfile)
  ) {
    return {
      ok: false as const,
      status: 400,
      error: "定制档位不在当前支持范围里。",
    };
  }

  return {
    ok: true as const,
    data: {
      prompt,
      style,
      generationMode,
      ...(customizationProfile
        ? { customizationProfile }
        : {}),
      ...(normalizedLlmConfig.llmConfig
        ? { llmConfig: normalizedLlmConfig.llmConfig }
        : {}),
    } satisfies CreateGenerationInput,
  };
}

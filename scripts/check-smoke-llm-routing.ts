import {
  buildSmokeManagedChildEnv,
  buildSmokePersistedLlmConfig,
  resolveSmokeLlmConfig,
} from "./lib/smoke-llm-routing.mjs";

type EnvShape = Record<string, string | undefined>;

function assertEqual(
  failures: string[],
  id: string,
  label: string,
  actual: unknown,
  expected: unknown,
) {
  if (actual !== expected) {
    failures.push(`${id}: expected ${label}=${String(expected)}, got ${String(actual)}`);
  }
}

function assertIncludesConfig(
  failures: string[],
  id: string,
  env: EnvShape,
  expected: {
    apiKey: string;
    baseUrl: string;
    model: string;
  },
) {
  const checks: Array<[string, string | undefined, string]> = [
    ["LLM_API_KEY", env.LLM_API_KEY, expected.apiKey],
    ["LLM_BASE_URL", env.LLM_BASE_URL, expected.baseUrl],
    ["LLM_MODEL", env.LLM_MODEL, expected.model],
    ["SEMANTIC_API_KEY", env.SEMANTIC_API_KEY, expected.apiKey],
    ["SEMANTIC_BASE_URL", env.SEMANTIC_BASE_URL, expected.baseUrl],
    ["SEMANTIC_MODEL", env.SEMANTIC_MODEL, expected.model],
    ["DESIGN_API_KEY", env.DESIGN_API_KEY, expected.apiKey],
    ["DESIGN_BASE_URL", env.DESIGN_BASE_URL, expected.baseUrl],
    ["DESIGN_MODEL", env.DESIGN_MODEL, expected.model],
    ["VISION_API_KEY", env.VISION_API_KEY, expected.apiKey],
    ["VISION_BASE_URL", env.VISION_BASE_URL, expected.baseUrl],
    ["VISION_MODEL", env.VISION_MODEL, expected.model],
  ];

  for (const [label, actual, value] of checks) {
    assertEqual(failures, id, label, actual, value);
  }
}

async function main() {
  const failures: string[] = [];

  const llmPreferredEnv: EnvShape = {
    LLM_API_KEY: "llm-key",
    LLM_BASE_URL: "https://api.xcode.best/v1",
    LLM_MODEL: "gpt-5.4",
    DEEPSEEK_API_KEY: "deepseek-key",
    DEEPSEEK_BASE_URL: "https://api.deepseek.com",
    DEEPSEEK_MODEL: "deepseek-chat",
  };
  const llmPreferred = resolveSmokeLlmConfig(llmPreferredEnv);

  assertEqual(failures, "llm-preferred", "provider", llmPreferred.provider, "openai");
  assertEqual(
    failures,
    "llm-preferred",
    "baseUrl",
    llmPreferred.baseUrl,
    "https://api.xcode.best/v1",
  );
  assertEqual(failures, "llm-preferred", "model", llmPreferred.model, "gpt-5.4");
  assertEqual(failures, "llm-preferred", "source", llmPreferred.source, "LLM_*");

  const compatEnv: EnvShape = {
    OPENAI_COMPAT_API_KEY: "compat-key",
    OPENAI_COMPAT_BASE_URL: "https://api.xcode.best/v1",
    OPENAI_COMPAT_MODEL: "gpt-5.4",
    DEEPSEEK_API_KEY: "deepseek-key",
    DEEPSEEK_BASE_URL: "https://api.deepseek.com",
    DEEPSEEK_MODEL: "deepseek-chat",
  };
  const compatResolved = resolveSmokeLlmConfig(compatEnv);

  assertEqual(failures, "compat-fallback", "provider", compatResolved.provider, "openai");
  assertEqual(
    failures,
    "compat-fallback",
    "source",
    compatResolved.source,
    "OPENAI_COMPAT_*",
  );

  try {
    resolveSmokeLlmConfig({
      DEEPSEEK_API_KEY: "deepseek-key",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com",
      DEEPSEEK_MODEL: "deepseek-chat",
    });
    failures.push("deepseek-only: expected resolveSmokeLlmConfig to throw");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("OpenAI-compatible")) {
      failures.push(`deepseek-only: unexpected error message "${message}"`);
    }
  }

  const managedEnv = buildSmokeManagedChildEnv(
    {
      DEEPSEEK_API_KEY: "ambient-deepseek",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com",
      DEEPSEEK_MODEL: "deepseek-chat",
    },
    compatResolved,
  ) as EnvShape;

  assertIncludesConfig(failures, "managed-env", managedEnv, {
    apiKey: "compat-key",
    baseUrl: "https://api.xcode.best/v1",
    model: "gpt-5.4",
  });
  assertEqual(failures, "managed-env", "OPENAI_API_KEY", managedEnv.OPENAI_API_KEY, "compat-key");
  assertEqual(
    failures,
    "managed-env",
    "OPENAI_BASE_URL",
    managedEnv.OPENAI_BASE_URL,
    "https://api.xcode.best/v1",
  );
  assertEqual(failures, "managed-env", "OPENAI_MODEL", managedEnv.OPENAI_MODEL, "gpt-5.4");
  assertEqual(failures, "managed-env", "DEEPSEEK_API_KEY", managedEnv.DEEPSEEK_API_KEY, "");

  const persisted = buildSmokePersistedLlmConfig(compatResolved);
  assertEqual(failures, "persisted-config", "provider", persisted?.provider, "openai");
  assertEqual(
    failures,
    "persisted-config",
    "baseUrl",
    persisted?.baseUrl,
    "https://api.xcode.best/v1",
  );
  assertEqual(failures, "persisted-config", "model", persisted?.model, "gpt-5.4");

  if (failures.length > 0) {
    console.error("[smoke-llm-routing] FAIL");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("[smoke-llm-routing] all cases passed");
}

void main();

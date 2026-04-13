import Module from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";

type CorpusEntry = {
  id: string;
  prompt: string;
  style: "cream-toy" | "low-poly" | "dream-glow";
  generationMode: "dynamic-custom";
  customizationProfile: "safe-overlay" | "experimental-addon";
  expect: {
    contractRequestedNounIncludes: string;
    prototypeIdsIncludes?: string[];
    traitsIncludes?: string[];
    negativeLookalikesIncludes?: string[];
    retrievalReferenceIdsIncludes?: string[];
    runtimeReferenceIdsIncludes?: string[];
    runtimeSourceModesIncludes?: string[];
  };
};

type CorpusFile = {
  cases: CorpusEntry[];
};

function includesAll(haystack: string[], needles: string[]) {
  return needles.every((needle) => haystack.some((value) => value.includes(needle)));
}

function collectContractFailures(
  failures: string[],
  entry: CorpusEntry,
  recipe: {
    semanticContractsV2?: Array<{
      requestedNoun: string;
      prototypeCandidates: Array<{ id: string; source?: string }>;
      traits: string[];
      negativeLookalikes: string[];
      retrievalMatches?: Array<{ referenceIds: string[] }>;
    }>;
    runtimeDesignTasks?: Array<{
      requestedNoun?: string;
      requestLabel?: string;
      referenceId?: string;
      sourceMode?: string;
    }>;
  },
) {
  const contract = (recipe.semanticContractsV2 ?? []).find((candidate) =>
    candidate.requestedNoun.includes(entry.expect.contractRequestedNounIncludes),
  );

  if (!contract) {
    failures.push(
      `${entry.id}: missing semantic contract for noun containing "${entry.expect.contractRequestedNounIncludes}"`,
    );
    return;
  }

  const prototypeIds = contract.prototypeCandidates.map((candidate) => candidate.id);
  const traits = contract.traits;
  const negativeLookalikes = contract.negativeLookalikes;
  const retrievalReferenceIds = (contract.retrievalMatches ?? []).flatMap(
    (match) => match.referenceIds,
  );
  const runtimeTask = (recipe.runtimeDesignTasks ?? []).find((candidate) =>
    (candidate.requestedNoun ?? candidate.requestLabel ?? "").includes(
      entry.expect.contractRequestedNounIncludes,
    ),
  );

  if (
    entry.expect.prototypeIdsIncludes &&
    !includesAll(prototypeIds, entry.expect.prototypeIdsIncludes)
  ) {
    failures.push(
      `${entry.id}: expected prototype ids ${entry.expect.prototypeIdsIncludes.join(", ")}, got ${prototypeIds.join(", ") || "(none)"}`,
    );
  }

  if (entry.expect.traitsIncludes && !includesAll(traits, entry.expect.traitsIncludes)) {
    failures.push(
      `${entry.id}: expected traits ${entry.expect.traitsIncludes.join(", ")}, got ${traits.join(", ") || "(none)"}`,
    );
  }

  if (
    entry.expect.negativeLookalikesIncludes &&
    !includesAll(negativeLookalikes, entry.expect.negativeLookalikesIncludes)
  ) {
    failures.push(
      `${entry.id}: expected negative lookalikes ${entry.expect.negativeLookalikesIncludes.join(", ")}, got ${negativeLookalikes.join(", ") || "(none)"}`,
    );
  }

  if (
    entry.expect.retrievalReferenceIdsIncludes &&
    !includesAll(retrievalReferenceIds, entry.expect.retrievalReferenceIdsIncludes)
  ) {
    failures.push(
      `${entry.id}: expected retrieval reference ids ${entry.expect.retrievalReferenceIdsIncludes.join(", ")}, got ${retrievalReferenceIds.join(", ") || "(none)"}`,
    );
  }

  if (entry.expect.runtimeReferenceIdsIncludes) {
    const runtimeReferenceIds = runtimeTask?.referenceId ? [runtimeTask.referenceId] : [];

    if (!includesAll(runtimeReferenceIds, entry.expect.runtimeReferenceIdsIncludes)) {
      failures.push(
        `${entry.id}: expected runtime reference ids ${entry.expect.runtimeReferenceIdsIncludes.join(", ")}, got ${runtimeReferenceIds.join(", ") || "(none)"}`,
      );
    }
  }

  if (entry.expect.runtimeSourceModesIncludes) {
    const runtimeSourceModes = runtimeTask?.sourceMode ? [runtimeTask.sourceMode] : [];

    if (!includesAll(runtimeSourceModes, entry.expect.runtimeSourceModesIncludes)) {
      failures.push(
        `${entry.id}: expected runtime source modes ${entry.expect.runtimeSourceModesIncludes.join(", ")}, got ${runtimeSourceModes.join(", ") || "(none)"}`,
      );
    }
  }
}

async function runMockedAiSemanticContractCase(
  parsePromptCustomizationRecipe: typeof import("../src/lib/prompt-customization").parsePromptCustomizationRecipe,
  failures: string[],
) {
  const mockEntry: CorpusEntry = {
    id: "mocked-ai-semantic-contract",
    prompt: "做一只小狐狸桌宠，胸前挂一个蓝色水杯。",
    style: "cream-toy",
    generationMode: "dynamic-custom",
    customizationProfile: "safe-overlay",
    expect: {
      contractRequestedNounIncludes: "水杯",
      prototypeIdsIncludes: ["cup", "mug"],
      traitsIncludes: ["rigid", "open-top", "cylindrical", "chest-safe"],
      negativeLookalikesIncludes: [
        "水杯 不能看起来像普通圆章",
        "水杯 不能退化成 generic ornament",
      ],
      retrievalReferenceIdsIncludes: ["canon-ornament-generic"],
      runtimeReferenceIdsIncludes: ["canon-ornament-generic"],
      runtimeSourceModesIncludes: ["canonical-blueprint"],
    },
  };
  const previousEnv = {
    LLM_API_KEY: process.env.LLM_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_COMPAT_API_KEY: process.env.OPENAI_COMPAT_API_KEY,
    OPENAI_COMPAT_BASE_URL: process.env.OPENAI_COMPAT_BASE_URL,
    OPENAI_COMPAT_MODEL: process.env.OPENAI_COMPAT_MODEL,
    DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL,
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
  };
  const originalFetch = globalThis.fetch;

  process.env.LLM_API_KEY = "";
  process.env.OPENAI_API_KEY = "";
  process.env.OPENAI_COMPAT_API_KEY = "";
  process.env.OPENAI_COMPAT_BASE_URL = "";
  process.env.OPENAI_COMPAT_MODEL = "";
  process.env.DEEPSEEK_API_KEY = "mock-deepseek-key";
  process.env.DEEPSEEK_BASE_URL = "https://api.deepseek.com";
  process.env.DEEPSEEK_MODEL = "deepseek-chat";

  globalThis.fetch = (async (input) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (!url.includes("/chat/completions")) {
      throw new Error(`Unexpected mocked fetch URL: ${url}`);
    }

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                accessoryRequests: [
                  {
                    requestedLabel: "蓝色水杯",
                    requestedNoun: "水杯",
                    nounSpan: "水杯",
                    nounGloss: "杯状容器",
                    objectCategory: "ornament",
                    designConfidence: 0.96,
                    requestedAnchorPhrase: "胸前",
                    familyGuess: "generic-ornament",
                    familyResolutionSource: "openai",
                    prototypeCandidates: [
                      { id: "cup", confidence: 0.98 },
                      { id: "mug", confidence: 0.77 },
                    ],
                    traits: ["rigid", "open-top", "cylindrical", "chest-safe"],
                    negativeLookalikes: ["水杯 不能看起来像普通圆章"],
                    mustKeep: true,
                    allowApproximation: true,
                  },
                ],
              }),
            },
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }) as typeof fetch;

  try {
    const recipe = await parsePromptCustomizationRecipe({
      prompt: mockEntry.prompt,
      style: mockEntry.style,
      generationMode: mockEntry.generationMode,
      customizationProfile: mockEntry.customizationProfile,
    });

    collectContractFailures(failures, mockEntry, recipe);

    if (recipe.parserSource !== "deepseek") {
      failures.push(
        `${mockEntry.id}: expected parserSource deepseek, got ${recipe.parserSource}`,
      );
    }

    const task = recipe.runtimeDesignTasks.find((candidate) =>
      candidate.requestedNoun?.includes("水杯"),
    );

    if (!task) {
      failures.push(`${mockEntry.id}: missing runtime task for 水杯`);
      return;
    }

    const llmPrototypeIds = (task.prototypeCandidates ?? [])
      .filter((candidate) => candidate.source === "llm")
      .map((candidate) => candidate.id);

    if (!includesAll(llmPrototypeIds, ["cup", "mug"])) {
      failures.push(
        `${mockEntry.id}: expected runtime task to keep llm prototype ids cup,mug, got ${llmPrototypeIds.join(", ") || "(none)"}`,
      );
    }

    if (
      !includesAll(task.negativeLookalikes ?? [], ["水杯 不能看起来像普通圆章"])
    ) {
      failures.push(
        `${mockEntry.id}: expected runtime task to keep mocked AI negative lookalikes, got ${(task.negativeLookalikes ?? []).join(", ") || "(none)"}`,
      );
    }

    if (task.referenceId !== "canon-ornament-generic") {
      failures.push(
        `${mockEntry.id}: expected mocked AI runtime task to hydrate canon-ornament-generic, got ${task.referenceId ?? "(none)"}`,
      );
    }

    if (task.sourceMode !== "canonical-blueprint") {
      failures.push(
        `${mockEntry.id}: expected mocked AI runtime task sourceMode canonical-blueprint, got ${task.sourceMode ?? "(none)"}`,
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
    process.env.LLM_API_KEY = previousEnv.LLM_API_KEY;
    process.env.DEEPSEEK_API_KEY = previousEnv.DEEPSEEK_API_KEY;
    process.env.OPENAI_API_KEY = previousEnv.OPENAI_API_KEY;
    process.env.OPENAI_COMPAT_API_KEY = previousEnv.OPENAI_COMPAT_API_KEY;
    process.env.OPENAI_COMPAT_BASE_URL = previousEnv.OPENAI_COMPAT_BASE_URL;
    process.env.OPENAI_COMPAT_MODEL = previousEnv.OPENAI_COMPAT_MODEL;
    process.env.DEEPSEEK_BASE_URL = previousEnv.DEEPSEEK_BASE_URL;
    process.env.DEEPSEEK_MODEL = previousEnv.DEEPSEEK_MODEL;
  }
}

async function runMockedAiTraitFallbackGeometryCase(
  parsePromptCustomizationRecipe: typeof import("../src/lib/prompt-customization").parsePromptCustomizationRecipe,
  failures: string[],
) {
  const previousEnv = {
    LLM_API_KEY: process.env.LLM_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_COMPAT_API_KEY: process.env.OPENAI_COMPAT_API_KEY,
    OPENAI_COMPAT_BASE_URL: process.env.OPENAI_COMPAT_BASE_URL,
    OPENAI_COMPAT_MODEL: process.env.OPENAI_COMPAT_MODEL,
    DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL,
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
  };
  const originalFetch = globalThis.fetch;

  process.env.LLM_API_KEY = "";
  process.env.OPENAI_API_KEY = "";
  process.env.OPENAI_COMPAT_API_KEY = "";
  process.env.OPENAI_COMPAT_BASE_URL = "";
  process.env.OPENAI_COMPAT_MODEL = "";
  process.env.DEEPSEEK_API_KEY = "mock-deepseek-key";
  process.env.DEEPSEEK_BASE_URL = "https://api.deepseek.com";
  process.env.DEEPSEEK_MODEL = "deepseek-chat";

  globalThis.fetch = (async (input) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (!url.includes("/chat/completions")) {
      throw new Error(`Unexpected mocked fetch URL: ${url}`);
    }

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                accessoryRequests: [
                  {
                    requestedLabel: "蓝色容器挂件",
                    requestedNoun: "容器挂件",
                    nounSpan: "容器挂件",
                    nounGloss: "带开口的小型容器",
                    objectCategory: "ornament",
                    designConfidence: 0.88,
                    requestedAnchorPhrase: "胸前",
                    familyGuess: "generic-ornament",
                    familyResolutionSource: "openai",
                    traits: [
                      "rigid",
                      "open-top",
                      "cylindrical",
                      "has-handle",
                      "chest-safe",
                    ],
                    negativeLookalikes: ["容器挂件 不能退化成普通圆球"],
                    mustKeep: true,
                    allowApproximation: true,
                  },
                  {
                    requestedLabel: "平面徽记挂件",
                    requestedNoun: "平面徽记",
                    nounSpan: "平面徽记",
                    nounGloss: "扁平的符号徽记",
                    objectCategory: "symbol",
                    designConfidence: 0.86,
                    requestedAnchorPhrase: "胸前",
                    familyGuess: "generic-ornament",
                    familyResolutionSource: "openai",
                    traits: ["rigid", "flat-face", "chest-safe"],
                    negativeLookalikes: ["平面徽记 不能看起来像普通圆球"],
                    mustKeep: true,
                    allowApproximation: true,
                  },
                ],
              }),
            },
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }) as typeof fetch;

  try {
    const recipe = await parsePromptCustomizationRecipe({
      prompt: "做一只小狐狸桌宠，胸前挂一个蓝色容器挂件，再加一个平面徽记挂件。",
      style: "low-poly",
      generationMode: "dynamic-custom",
      customizationProfile: "experimental-addon",
    });

    const vesselGeometry = recipe.geometryRecipes.find((candidate) =>
      (candidate.requestedNoun ?? candidate.displayLabel).includes("容器"),
    );
    const flatFaceGeometry = recipe.geometryRecipes.find((candidate) =>
      (candidate.requestedNoun ?? candidate.displayLabel).includes("平面徽记"),
    );

    if (!vesselGeometry) {
      failures.push("mocked-ai-trait-vessel: missing geometry recipe for 容器挂件");
    } else {
      const partIds = vesselGeometry.parts.map((part) => part.partId);
      const roleLabels = vesselGeometry.parts.map((part) => part.role);

      if (!includesAll(vesselGeometry.profileCurves, ["trait-vessel", "trait-open-top", "trait-side-handle"])) {
        failures.push(
          `mocked-ai-trait-vessel: expected profile curves trait-vessel/open-top/side-handle, got ${vesselGeometry.profileCurves.join(", ") || "(none)"}`,
        );
      }

      if (!includesAll(partIds, ["ring", "token", "rim", "accent"])) {
        failures.push(
          `mocked-ai-trait-vessel: expected part ids ring/token/rim/accent, got ${partIds.join(", ") || "(none)"}`,
        );
      }

      if (!includesAll(roleLabels, ["vessel-body", "cup-rim", "handle"])) {
        failures.push(
          `mocked-ai-trait-vessel: expected roles vessel-body/cup-rim/handle, got ${roleLabels.join(", ") || "(none)"}`,
        );
      }
    }

    if (!flatFaceGeometry) {
      failures.push("mocked-ai-trait-flat-face: missing geometry recipe for 平面徽记");
    } else {
      const partIds = flatFaceGeometry.parts.map((part) => part.partId);
      const roleLabels = flatFaceGeometry.parts.map((part) => part.role);
      const primitives = flatFaceGeometry.parts.map((part) => part.primitive);

      if (!includesAll(flatFaceGeometry.profileCurves, ["reference-symbol", "flat-badge"])) {
        failures.push(
          `mocked-ai-trait-flat-face: expected profile curves reference-symbol/flat-badge, got ${flatFaceGeometry.profileCurves.join(", ") || "(none)"}`,
        );
      }

      if (!includesAll(partIds, ["ring", "token", "accent"])) {
        failures.push(
          `mocked-ai-trait-flat-face: expected part ids ring/token/accent, got ${partIds.join(", ") || "(none)"}`,
        );
      }

      if (!includesAll(roleLabels, ["badge-face", "badge-relief"])) {
        failures.push(
          `mocked-ai-trait-flat-face: expected roles badge-face/badge-relief, got ${roleLabels.join(", ") || "(none)"}`,
        );
      }

      if (!includesAll(primitives, ["cube"])) {
        failures.push(
          `mocked-ai-trait-flat-face: expected cube primitive in flat-face geometry, got ${primitives.join(", ") || "(none)"}`,
        );
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
    process.env.LLM_API_KEY = previousEnv.LLM_API_KEY;
    process.env.DEEPSEEK_API_KEY = previousEnv.DEEPSEEK_API_KEY;
    process.env.OPENAI_API_KEY = previousEnv.OPENAI_API_KEY;
    process.env.OPENAI_COMPAT_API_KEY = previousEnv.OPENAI_COMPAT_API_KEY;
    process.env.OPENAI_COMPAT_BASE_URL = previousEnv.OPENAI_COMPAT_BASE_URL;
    process.env.OPENAI_COMPAT_MODEL = previousEnv.OPENAI_COMPAT_MODEL;
    process.env.DEEPSEEK_BASE_URL = previousEnv.DEEPSEEK_BASE_URL;
    process.env.DEEPSEEK_MODEL = previousEnv.DEEPSEEK_MODEL;
  }
}

async function main() {
  process.env.LLM_API_KEY = "";
  process.env.DEEPSEEK_API_KEY = "";
  process.env.OPENAI_API_KEY = "";

  const moduleLoader = Module as unknown as {
    _load: (...args: unknown[]) => unknown;
  };
  const originalLoad = moduleLoader._load;

  moduleLoader._load = function patchedLoad(...args: unknown[]) {
    const [request] = args;

    if (request === "server-only") {
      return {};
    }

    if (request === "node:child_process") {
      return {
        execFileSync() {
          throw new Error("Keychain disabled for regression");
        },
      };
    }

    return originalLoad(...args);
  };

  const { parsePromptCustomizationRecipe } = await import(
    "../src/lib/prompt-customization"
  );

  const corpusPath = path.join(
    process.cwd(),
    "src",
    "data",
    "prototype-traits-regression.json",
  );
  const corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as CorpusFile;
  const failures: string[] = [];

  for (const entry of corpus.cases) {
    const recipe = await parsePromptCustomizationRecipe({
      prompt: entry.prompt,
      style: entry.style,
      generationMode: entry.generationMode,
      customizationProfile: entry.customizationProfile,
    });
    collectContractFailures(failures, entry, recipe);
  }

  await runMockedAiSemanticContractCase(parsePromptCustomizationRecipe, failures);
  await runMockedAiTraitFallbackGeometryCase(parsePromptCustomizationRecipe, failures);

  if (failures.length > 0) {
    console.error("Prototype traits regression failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `Prototype traits regression passed (${corpus.cases.length} corpus + 2 mocked-AI cases).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

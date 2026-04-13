import Module from "node:module";

type BridgeCase = {
  id: string;
  prompt: string;
  style: "cream-toy" | "low-poly" | "dream-glow";
  generationMode: "dynamic-custom";
  customizationProfile: "safe-overlay" | "experimental-addon";
  mockPayload: {
    accessoryRequests: Array<Record<string, unknown>>;
  };
  expect: {
    requestedNounIncludes: string;
    runtimeShapeClass: string;
    referenceId: string;
    geometryPartsInclude: string[];
    geometryPartsExclude?: string[];
    criticalPartsInclude?: string[];
    criticalPartsExclude?: string[];
    readOrderTargets?: string[];
    assemblyRootPartId?: string;
    variantId?: string;
  };
};

function includesAll(haystack: string[], needles: string[]) {
  return needles.every((needle) => haystack.includes(needle));
}

function createMockSemanticFetch(entry: BridgeCase) {
  const responsesPayload = {
    output_parsed: entry.mockPayload,
  };
  const chatPayload = {
    choices: [
      {
        message: {
          content: JSON.stringify(entry.mockPayload),
        },
      },
    ],
  };

  return async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith("/responses")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return responsesPayload;
        },
        async text() {
          return JSON.stringify(responsesPayload);
        },
      } satisfies Pick<Response, "ok" | "status" | "json" | "text">;
    }

    if (url.endsWith("/chat/completions")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return chatPayload;
        },
        async text() {
          return JSON.stringify(chatPayload);
        },
      } satisfies Pick<Response, "ok" | "status" | "json" | "text">;
    }

    throw new Error(`Unexpected fetch URL during prototype runtime bridge check: ${url}`);
  };
}

const bridgeCases: BridgeCase[] = [
  {
    id: "prototype-bridge-flower-ear",
    prompt: "做一只小狐狸桌宠，左耳一个绿色小花挂件。",
    style: "cream-toy",
    generationMode: "dynamic-custom",
    customizationProfile: "experimental-addon",
    mockPayload: {
      accessoryRequests: [
        {
          requestedLabel: "小花挂件",
          requestedNoun: "小花",
          nounSpan: "小花",
          nounGloss: "small flower",
          objectCategory: "flower",
          designConfidence: 0.96,
          requestedAnchorPhrase: "左耳",
          familyGuess: "open-botanical-ornament",
          familyResolutionSource: "openai",
          prototypeCandidates: [
            { id: "flower", confidence: 0.98 },
          ],
          traits: ["soft", "ear-safe", "micro-hangable"],
          mustKeep: true,
          allowApproximation: true,
        },
      ],
    },
    expect: {
      requestedNounIncludes: "小花",
      runtimeShapeClass: "flower",
      referenceId: "canon-flower-ear-side",
      geometryPartsInclude: ["core", "petal-left", "petal-right", "petal-top", "petal-bottom"],
      geometryPartsExclude: ["leaf-left", "leaf-right"],
    },
  },
  {
    id: "prototype-bridge-clover-ear",
    prompt: "做一只小狐狸桌宠，右耳一个红色四叶草挂件。",
    style: "low-poly",
    generationMode: "dynamic-custom",
    customizationProfile: "experimental-addon",
    mockPayload: {
      accessoryRequests: [
        {
          requestedLabel: "四叶草挂件",
          requestedNoun: "四叶草",
          nounSpan: "四叶草",
          nounGloss: "four-leaf clover",
          objectCategory: "plant-symbol",
          designConfidence: 0.97,
          requestedAnchorPhrase: "右耳",
          familyGuess: "generic-ornament",
          familyResolutionSource: "openai",
          prototypeCandidates: [
            { id: "clover-charm", confidence: 0.99 },
          ],
          traits: ["flat-face", "ear-safe", "micro-hangable"],
          mustKeep: true,
          allowApproximation: true,
        },
      ],
    },
    expect: {
      requestedNounIncludes: "四叶草",
      runtimeShapeClass: "clover-charm",
      referenceId: "canon-clover-ear-side",
      geometryPartsInclude: ["core", "leaf-left", "leaf-right", "leaf-top", "leaf-bottom", "stem"],
    },
  },
  {
    id: "prototype-bridge-scarf-chest",
    prompt: "做一只小狐狸桌宠，胸前系一个黑色小围巾。",
    style: "cream-toy",
    generationMode: "dynamic-custom",
    customizationProfile: "experimental-addon",
    mockPayload: {
      accessoryRequests: [
        {
          requestedLabel: "小围巾",
          requestedNoun: "围巾",
          nounSpan: "小围巾",
          nounGloss: "small scarf",
          objectCategory: "ornament",
          designConfidence: 0.96,
          requestedAnchorPhrase: "胸前",
          familyGuess: "generic-ornament",
          familyResolutionSource: "openai",
          prototypeCandidates: [{ id: "scarf", confidence: 0.99 }],
          traits: ["soft", "chest-safe"],
          mustKeep: true,
          allowApproximation: true,
        },
      ],
    },
    expect: {
      requestedNounIncludes: "围巾",
      runtimeShapeClass: "scarf",
      referenceId: "canon-scarf-chest",
      variantId: "scarf-wrap-forward",
      assemblyRootPartId: "wrap-band",
      geometryPartsInclude: ["wrap-band", "knot", "tail-left", "tail-right"],
      geometryPartsExclude: ["ring", "token", "accent"],
      criticalPartsInclude: ["wrap-band", "knot", "tail-left", "tail-right"],
      criticalPartsExclude: ["ring", "token", "accent"],
      readOrderTargets: ["wrap-band", "tail-left", "tail-right"],
    },
  },
  {
    id: "runtime-bridge-star-ear",
    prompt: "做一只小狐狸桌宠，左耳一个金色星星挂件。",
    style: "cream-toy",
    generationMode: "dynamic-custom",
    customizationProfile: "experimental-addon",
    mockPayload: {
      accessoryRequests: [
        {
          requestedLabel: "星星挂件",
          requestedNoun: "星星",
          nounSpan: "星星",
          nounGloss: "star charm",
          objectCategory: "symbol",
          designConfidence: 0.95,
          requestedAnchorPhrase: "左耳",
          familyGuess: "star",
          familyResolutionSource: "openai",
          prototypeCandidates: [{ id: "generic-ornament", confidence: 0.4 }],
          traits: ["flat-face", "ear-safe", "micro-hangable"],
          mustKeep: true,
          allowApproximation: true,
        },
      ],
    },
    expect: {
      requestedNounIncludes: "星",
      runtimeShapeClass: "star",
      referenceId: "canon-star-ear-side",
      variantId: "symbol-star-compact",
      assemblyRootPartId: "core",
      geometryPartsInclude: ["core", "ray-1", "ray-2", "ray-3", "ray-4", "ray-5"],
      criticalPartsInclude: ["core", "ray-1", "ray-2", "ray-3", "ray-4", "ray-5"],
      criticalPartsExclude: ["ring", "token", "accent"],
      readOrderTargets: ["core", "ray-1", "ray-2"],
    },
  },
];

async function main() {
  process.env.SEMANTIC_API_KEY = "prototype-runtime-bridge-key";
  process.env.SEMANTIC_BASE_URL = "https://api.openai.com/v1";
  process.env.SEMANTIC_MODEL = "gpt-4.1-mini";
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
          throw new Error("Keychain disabled for prototype runtime bridge check");
        },
      };
    }

    return originalLoad(...args);
  };

  const { parsePromptCustomizationRecipe } = await import(
    "../src/lib/prompt-customization"
  );
  const failures: string[] = [];

  for (const entry of bridgeCases) {
    globalThis.fetch = createMockSemanticFetch(entry) as typeof fetch;

    const recipe = await parsePromptCustomizationRecipe({
      prompt: entry.prompt,
      style: entry.style,
      generationMode: entry.generationMode,
      customizationProfile: entry.customizationProfile,
    });

    const runtimeTask = recipe.runtimeDesignTasks.find((candidate) =>
      (candidate.requestedNoun ?? candidate.requestLabel ?? "").includes(
        entry.expect.requestedNounIncludes,
      ),
    );
    const geometryRecipe = recipe.geometryRecipes.find((candidate) =>
      (candidate.requestedNoun ?? candidate.displayLabel).includes(
        entry.expect.requestedNounIncludes,
      ),
    );

    if (!runtimeTask) {
      failures.push(`${entry.id}: missing runtime task`);
      continue;
    }

    if (runtimeTask.runtimeShapeClass !== entry.expect.runtimeShapeClass) {
      failures.push(
        `${entry.id}: expected runtime shape class ${entry.expect.runtimeShapeClass}, got ${runtimeTask.runtimeShapeClass ?? "(none)"}`,
      );
    }

    if (runtimeTask.referenceId !== entry.expect.referenceId) {
      failures.push(
        `${entry.id}: expected runtime reference ${entry.expect.referenceId}, got ${runtimeTask.referenceId ?? "(none)"}`,
      );
    }

    if (entry.expect.variantId && runtimeTask.variantId !== entry.expect.variantId) {
      failures.push(
        `${entry.id}: expected runtime variant ${entry.expect.variantId}, got ${runtimeTask.variantId ?? "(none)"}`,
      );
    }

    if (
      entry.expect.assemblyRootPartId &&
      runtimeTask.assemblyRootPartId !== entry.expect.assemblyRootPartId
    ) {
      failures.push(
        `${entry.id}: expected runtime assembly root ${entry.expect.assemblyRootPartId}, got ${runtimeTask.assemblyRootPartId ?? "(none)"}`,
      );
    }

    if (
      entry.expect.readOrderTargets &&
      !includesAll(runtimeTask.readOrderTargets ?? [], entry.expect.readOrderTargets)
    ) {
      failures.push(
        `${entry.id}: expected runtime read-order ${entry.expect.readOrderTargets.join(", ")}, got ${(runtimeTask.readOrderTargets ?? []).join(", ") || "(none)"}`,
      );
    }

    if (
      entry.expect.criticalPartsInclude &&
      !includesAll(runtimeTask.criticalParts, entry.expect.criticalPartsInclude)
    ) {
      failures.push(
        `${entry.id}: expected runtime critical parts ${entry.expect.criticalPartsInclude.join(", ")}, got ${runtimeTask.criticalParts.join(", ") || "(none)"}`,
      );
    }

    if (
      entry.expect.criticalPartsExclude &&
      entry.expect.criticalPartsExclude.some((partId) => runtimeTask.criticalParts.includes(partId))
    ) {
      failures.push(
        `${entry.id}: expected runtime critical parts to exclude ${entry.expect.criticalPartsExclude.join(", ")}, got ${runtimeTask.criticalParts.join(", ") || "(none)"}`,
      );
    }

    if (!geometryRecipe) {
      failures.push(`${entry.id}: missing geometry recipe`);
      continue;
    }

    if (geometryRecipe.referenceId !== entry.expect.referenceId) {
      failures.push(
        `${entry.id}: expected geometry reference ${entry.expect.referenceId}, got ${geometryRecipe.referenceId ?? "(none)"}`,
      );
    }

    if (entry.expect.variantId && geometryRecipe.variantId !== entry.expect.variantId) {
      failures.push(
        `${entry.id}: expected geometry variant ${entry.expect.variantId}, got ${geometryRecipe.variantId ?? "(none)"}`,
      );
    }

    const partIds = geometryRecipe.parts.map((part) => part.partId);

    if (!includesAll(partIds, entry.expect.geometryPartsInclude)) {
      failures.push(
        `${entry.id}: expected geometry parts ${entry.expect.geometryPartsInclude.join(", ")}, got ${partIds.join(", ") || "(none)"}`,
      );
    }

    if (
      entry.expect.geometryPartsExclude &&
      entry.expect.geometryPartsExclude.some((partId) => partIds.includes(partId))
    ) {
      failures.push(
        `${entry.id}: expected geometry to avoid parts ${entry.expect.geometryPartsExclude.join(", ")}, got ${partIds.join(", ")}`,
      );
    }
  }

  if (failures.length > 0) {
    console.error("[prototype-runtime-bridge] FAIL");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("[prototype-runtime-bridge] all cases passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

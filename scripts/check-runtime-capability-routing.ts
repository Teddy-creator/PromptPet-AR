import Module from "node:module";

type CapabilityCase = {
  id: string;
  prompt: string;
  style: "cream-toy" | "low-poly" | "dream-glow";
  mockPayload: {
    accessoryRequests: Array<Record<string, unknown>>;
  };
  expect: {
    runtimeShapeClass: string;
    capabilities: string[];
    resolutionSource: string;
  };
};

function createMockSemanticFetch(entry: CapabilityCase) {
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

    throw new Error(`Unexpected fetch URL during runtime capability routing check: ${url}`);
  };
}

const cases: CapabilityCase[] = [
  {
    id: "runtime-capability-scarf",
    prompt: "做一只小狐狸桌宠，胸前系一个黑色小围巾。",
    style: "cream-toy",
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
      runtimeShapeClass: "scarf",
      capabilities: [
        "host-coupled",
        "chest-wrap",
        "soft-body",
        "front-readable",
        "dual-tail",
        "face-safe",
      ],
      resolutionSource: "prototype-pack",
    },
  },
  {
    id: "runtime-capability-flower",
    prompt: "做一只小狐狸桌宠，左耳一个绿色小花挂件。",
    style: "cream-toy",
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
          prototypeCandidates: [{ id: "flower", confidence: 0.98 }],
          traits: ["soft", "ear-safe", "micro-hangable"],
          mustKeep: true,
          allowApproximation: true,
        },
      ],
    },
    expect: {
      runtimeShapeClass: "flower",
      capabilities: ["ear-side-hang", "micro-hang", "soft-body", "botanical-radial"],
      resolutionSource: "prototype-pack",
    },
  },
];

function includesAll(haystack: string[], needles: string[]) {
  return needles.every((needle) => haystack.includes(needle));
}

async function main() {
  process.env.SEMANTIC_API_KEY = "runtime-capability-routing-key";
  process.env.SEMANTIC_BASE_URL = "https://api.openai.com/v1";
  process.env.SEMANTIC_MODEL = "gpt-4.1-mini";
  process.env.LLM_API_KEY = "";
  process.env.DEEPSEEK_API_KEY = "";
  process.env.OPENAI_API_KEY = "";

  const moduleLoader = Module as unknown as {
    _load: (...args: unknown[]) => unknown;
  };
  const originalLoad = moduleLoader._load;
  const originalFetch = globalThis.fetch;

  moduleLoader._load = function patchedLoad(...args: unknown[]) {
    const [request] = args;

    if (request === "server-only") {
      return {};
    }

    if (request === "node:child_process") {
      return {
        execFileSync() {
          throw new Error("Keychain disabled for runtime capability routing check");
        },
      };
    }

    return originalLoad(...args);
  };

  try {
    const { parsePromptCustomizationRecipe } = await import(
      "../src/lib/prompt-customization"
    );
    const failures: string[] = [];

    for (const entry of cases) {
      globalThis.fetch = createMockSemanticFetch(entry) as typeof fetch;

      const recipe = await parsePromptCustomizationRecipe({
        prompt: entry.prompt,
        style: entry.style,
        generationMode: "dynamic-custom",
        customizationProfile: "experimental-addon",
      });

      const task = recipe.runtimeDesignTasks.find(
        (candidate) => candidate.runtimeShapeClass === entry.expect.runtimeShapeClass,
      );
      const brief = recipe.nounDesignBriefs.find(
        (candidate) => candidate.runtimeShapeClass === entry.expect.runtimeShapeClass,
      );
      const graph = recipe.partGraphs.find(
        (candidate) => candidate.runtimeShapeClass === entry.expect.runtimeShapeClass,
      );
      const geometryRecipe = recipe.geometryRecipes.find(
        (candidate) => candidate.runtimeShapeClass === entry.expect.runtimeShapeClass,
      );

      if (!task?.capabilityBundle) {
        failures.push(`${entry.id}: missing runtime task capabilityBundle`);
        continue;
      }

      if (!includesAll(task.capabilityBundle.capabilities, entry.expect.capabilities)) {
        failures.push(
          `${entry.id}: capabilityBundle missing expected capabilities ${entry.expect.capabilities.join(", ")}`,
        );
      }

      if (task.capabilityBundle.resolutionSource !== entry.expect.resolutionSource) {
        failures.push(
          `${entry.id}: expected resolutionSource=${entry.expect.resolutionSource}, got ${task.capabilityBundle.resolutionSource}`,
        );
      }

      if (!brief?.capabilityBundle) {
        failures.push(`${entry.id}: nounDesignBrief did not inherit capabilityBundle`);
      }

      if (!graph?.capabilityBundle) {
        failures.push(`${entry.id}: partGraph did not inherit capabilityBundle`);
      }

      if (!geometryRecipe?.capabilityBundle) {
        failures.push(`${entry.id}: geometryRecipe did not inherit capabilityBundle`);
      }

      if (!geometryRecipe?.structuralBlueprint?.capabilityBundle) {
        failures.push(`${entry.id}: structuralBlueprint did not keep capabilityBundle`);
      }
    }

    if (failures.length > 0) {
      console.error("[runtime-capability-routing] FAIL");
      for (const failure of failures) {
        console.error(`- ${failure}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log("[runtime-capability-routing] all cases passed");
  } finally {
    moduleLoader._load = originalLoad;
    globalThis.fetch = originalFetch;
  }
}

void main();

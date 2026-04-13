import fs from "node:fs/promises";
import Module from "node:module";

type ChestWrapCase = {
  id: string;
  prompt: string;
  style: "cream-toy" | "low-poly" | "dream-glow";
  mockPayload: {
    accessoryRequests: Array<Record<string, unknown>>;
  };
};

function createMockSemanticFetch(entry: ChestWrapCase) {
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

    throw new Error(`Unexpected fetch URL during chest-wrap host-fit check: ${url}`);
  };
}

function includesAll(haystack: string[], needles: string[]) {
  return needles.every((needle) => haystack.includes(needle));
}

function hasRootingRule(
  rules: Array<{ partId?: string; parentPartId?: string; rule?: string }> | undefined,
  partId: string,
  parentPartId: string,
  rule: string,
) {
  return (
    rules?.some(
      (entry) =>
        entry.partId === partId &&
        entry.parentPartId === parentPartId &&
        entry.rule === rule,
    ) ?? false
  );
}

async function main() {
  process.env.SEMANTIC_API_KEY = "chest-wrap-host-fit-key";
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
          throw new Error("Keychain disabled for chest-wrap host-fit check");
        },
      };
    }

    return originalLoad(...args);
  };

  const entry: ChestWrapCase = {
    id: "chest-wrap-scarf",
    prompt: "做一只小狐狸桌宠，胸前系一个黑色小围巾。",
    style: "cream-toy",
    mockPayload: {
      accessoryRequests: [
        {
          requestedLabel: "黑色小围巾",
          requestedNoun: "围巾",
          nounSpan: "小围巾",
          nounGloss: "small scarf",
          objectCategory: "ornament",
          designConfidence: 0.98,
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
  };

  try {
    globalThis.fetch = createMockSemanticFetch(entry) as typeof fetch;
    const { parsePromptCustomizationRecipe } = await import(
      "../src/lib/prompt-customization"
    );
    const recipe = await parsePromptCustomizationRecipe({
      prompt: entry.prompt,
      style: entry.style,
      generationMode: "dynamic-custom",
      customizationProfile: "experimental-addon",
    });
    const failures: string[] = [];

    const task = recipe.runtimeDesignTasks.find(
      (candidate) => candidate.runtimeShapeClass === "scarf",
    );
    const brief = recipe.nounDesignBriefs.find(
      (candidate) => candidate.runtimeShapeClass === "scarf",
    );
    const geometryRecipe = recipe.geometryRecipes.find(
      (candidate) => candidate.runtimeShapeClass === "scarf",
    );
    const execution = recipe.resolvedExecutionPlan.addAccessories.find(
      (candidate) => candidate.runtimeShapeClass === "scarf",
    );
    const contract =
      geometryRecipe?.runtimeDesignContract ??
      brief?.runtimeDesignContract ??
      task?.runtimeDesignContract;

    if (!contract) {
      failures.push("missing runtimeDesignContract on scarf runtime path");
    } else {
      if (contract.capabilityClass !== "host-coupled-chest-wrap") {
        failures.push(
          `expected capabilityClass=host-coupled-chest-wrap, got ${contract.capabilityClass}`,
        );
      }

      if (
        !includesAll(contract.requiredCapabilities ?? [], [
          "host-coupled",
          "chest-wrap",
        ])
      ) {
        failures.push("contract missing host-coupled + chest-wrap capabilities");
      }

      if (contract.primaryReadTarget !== "scarf") {
        failures.push(
          `expected primaryReadTarget=scarf, got ${contract.primaryReadTarget ?? "undefined"}`,
        );
      }

      if (
        !includesAll(contract.requiredVisibleParts ?? [], [
          "wrap-band",
          "knot",
          "tail-left",
          "tail-right",
        ])
      ) {
        failures.push("contract missing required visible parts for chest-wrap");
      }

      if (
        !includesAll(contract.hostNoGoZones ?? [], ["eye-band", "face-core", "nose-zone"])
      ) {
        failures.push("contract missing face/eye protected host zones");
      }

      if (
        !hasRootingRule(contract.partRootingRules, "knot", "wrap-band", "rooted-to-parent")
      ) {
        failures.push("contract missing knot -> wrap-band rooting rule");
      }

      if (
        !hasRootingRule(contract.partRootingRules, "tail-left", "knot", "emerge-from-parent")
      ) {
        failures.push("contract missing tail-left emergence-from-knot rule");
      }

      if (
        !hasRootingRule(contract.partRootingRules, "tail-right", "knot", "emerge-from-parent")
      ) {
        failures.push("contract missing tail-right emergence-from-knot rule");
      }
    }

    if (!geometryRecipe?.runtimeDesignContract) {
      failures.push("geometryRecipe did not inherit runtimeDesignContract");
    }

    if (!geometryRecipe?.structuralBlueprint?.runtimeDesignContract) {
      failures.push("structuralBlueprint did not keep runtimeDesignContract");
    }

    if (!execution?.runtimeDesignContract) {
      failures.push("resolved execution did not inherit runtimeDesignContract");
    }

    if (
      geometryRecipe?.structuralBlueprint?.hostFitEnvelope?.faceIntrusionBudget !==
      contract?.hostFitEnvelope?.faceIntrusionBudget
    ) {
      failures.push("structuralBlueprint hostFitEnvelope did not align to chest-wrap contract");
    }

    const structuralZones =
      geometryRecipe?.structuralBlueprint?.faceKeepoutZones?.map((zone) => zone.zoneId) ?? [];
    if (!includesAll(structuralZones, ["eye-band", "face-core", "nose-zone"])) {
      failures.push(
        `structuralBlueprint faceKeepoutZones missing contract zones: ${structuralZones.join(", ")}`,
      );
    }

    const workerSource = await fs.readFile(
      new URL("./blender-mcp-worker.mjs", import.meta.url),
      "utf8",
    );
    if (!workerSource.includes("getExecutionRuntimeDesignContract(")) {
      failures.push("worker does not resolve runtimeDesignContract");
    }
    if (!workerSource.includes("getExecutionHostFitEnvelope(")) {
      failures.push("worker host-fit path is not contract-aware");
    }
    if (!workerSource.includes("runtimeDesignContract,")) {
      failures.push("worker critique payload is missing runtimeDesignContract");
    }

    const critiqueSource = await fs.readFile(
      new URL("./lib/runtime-visual-critique.mjs", import.meta.url),
      "utf8",
    );
    if (!critiqueSource.includes("sanitizeRuntimeDesignContract")) {
      failures.push("runtime-visual-critique is not sanitizing runtimeDesignContract");
    }

    if (failures.length > 0) {
      console.error("[check-chest-wrap-host-fit] FAIL");
      for (const failure of failures) {
        console.error(`- ${failure}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log("[check-chest-wrap-host-fit] passed");
  } finally {
    moduleLoader._load = originalLoad;
    globalThis.fetch = originalFetch;
  }
}

void main();
